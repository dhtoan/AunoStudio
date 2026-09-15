package handlers

import (
	"context"
	"strings"
	"testing"
	"time"

	"github.com/openpost/backend/internal/capabilities"
	"github.com/openpost/backend/internal/models"
	"github.com/openpost/backend/internal/platform"
	"github.com/openpost/backend/internal/services/providerreadiness"
	"github.com/stretchr/testify/require"
)

type capabilityResolverTokenSource struct{}

func (capabilityResolverTokenSource) GetValidAccessToken(context.Context, string) (string, error) {
	return "access-token|access-secret", nil
}

type xCapabilityResolverAdapter struct {
	platform.Adapter
	result platform.AccountCapabilityResult
}

func (a xCapabilityResolverAdapter) ResolveAccountPublishingCapabilities(context.Context, string, platform.AccountCapabilityInput) (platform.AccountCapabilityResult, error) {
	return a.result, nil
}

func TestAccountCapabilityTTLAndExpiry(t *testing.T) {
	require.Equal(t, 5*time.Minute, accountCapabilityTTL(capabilities.ProviderTikTok))
	require.Equal(t, 15*time.Minute, accountCapabilityTTL(capabilities.ProviderYouTube))
	require.Equal(t, time.Hour, accountCapabilityTTL(capabilities.ProviderMastodon))

	handler := NewCapabilityResolverHandler(nil, nil, nil, nil)
	result := platform.AccountCapabilityResult{Revision: "revision-1"}
	handler.storeAccountCapability("account|profile|direct", result, time.Now().UTC().Add(time.Minute))
	cached, _, ok := handler.cachedAccountCapability("account|profile|direct")
	require.True(t, ok)
	require.Equal(t, result.Revision, cached.Revision)

	handler.storeAccountCapability("expired", result, time.Now().UTC().Add(-time.Second))
	_, _, ok = handler.cachedAccountCapability("expired")
	require.False(t, ok)
}

func TestDynamicCapabilityFailureOnlyBlocksRequiredActiveChoice(t *testing.T) {
	resolved := capabilities.ResolvedCapability{
		Compatible: true,
		Capability: capabilities.Capability{
			Provider: capabilities.ProviderTikTok,
			Settings: []capabilities.SettingDefinition{{
				Key:           "privacy_level",
				Label:         "Privacy",
				Required:      true,
				OptionsSource: "tiktok_privacy_levels",
				Dependencies: []capabilities.SettingCondition{{
					Key:      "content_posting_method",
					Operator: "equals",
					Value:    "DIRECT_POST",
				}},
			}},
		},
	}
	handler := NewCapabilityResolverHandler(nil, nil, nil, nil)

	upload := resolved
	handler.addDynamicCapabilityFailure(&upload, map[string]any{"content_posting_method": "UPLOAD"}, "creator state unavailable")
	require.True(t, upload.Compatible)
	require.Equal(t, "warning", upload.Issues[0].Severity)
	require.Equal(t, "dynamic_options_unavailable", upload.Issues[0].Code)

	direct := resolved
	handler.addDynamicCapabilityFailure(&direct, map[string]any{"content_posting_method": "DIRECT_POST"}, "creator state unavailable")
	require.False(t, direct.Compatible)
	require.Equal(t, "error", direct.Issues[0].Severity)
	require.Equal(t, "required_dynamic_options_unavailable", direct.Issues[0].Code)

	cacheUpload := accountCapabilitySettingsKey(map[string]any{"content_posting_method": "UPLOAD", "community_id": "one"})
	require.Equal(t, cacheUpload, accountCapabilitySettingsKey(map[string]any{"community_id": "one", "content_posting_method": "UPLOAD"}))
	require.NotEqual(t, cacheUpload, accountCapabilitySettingsKey(map[string]any{"content_posting_method": "UPLOAD", "community_id": "two"}))
	require.NotEqual(t, cacheUpload, accountCapabilitySettingsKey(map[string]any{"content_posting_method": "DIRECT_POST", "community_id": "one"}))
}

func TestXAccountCapabilityResolutionFailsClosedAndUpgradesVerifiedPremium(t *testing.T) {
	segments := []capabilities.ResolveSegment{{
		ID:   "segment-1",
		Body: strings.Repeat("x", 500),
	}}
	account := models.SocialAccount{ID: "x-account", Platform: capabilities.ProviderX}

	standard := capabilities.Resolve(capabilities.ProviderX, capabilities.ResolveInput{
		Intent:   capabilities.IntentPost,
		Segments: segments,
	})
	handler := NewCapabilityResolverHandler(nil, nil, nil, nil)
	handler.mergeAccountCapability(t.Context(), account, "", "", nil, segments, &standard)
	require.Equal(t, platform.XStandardTextLimit, standard.TextLimit)
	require.False(t, standard.Compatible)
	require.Contains(t, capabilityIssueCodes(standard.Issues), "text_too_long")

	premium := capabilities.Resolve(capabilities.ProviderX, capabilities.ResolveInput{
		Intent:   capabilities.IntentPost,
		Segments: segments,
	})
	handler = NewCapabilityResolverHandler(nil, nil, map[string]platform.Adapter{
		capabilities.ProviderX: xCapabilityResolverAdapter{
			result: platform.XPublishingCapabilities(platform.XSubscriptionTypePremium),
		},
	}, capabilityResolverTokenSource{})
	handler.mergeAccountCapability(t.Context(), account, "", "", nil, segments, &premium)
	require.Equal(t, platform.XPremiumTextLimit, premium.TextLimit)
	require.True(t, premium.Compatible)
	require.NotContains(t, capabilityIssueCodes(premium.Issues), "text_too_long")
}

func TestDynamicDiscordCapabilityKeepsSavedChannelAndCanonicalReadinessContract(t *testing.T) {
	segments := []capabilities.ResolveSegment{{ID: "segment-1", Body: "A normal update"}}
	settings := map[string]any{"channel_id": "channel-1"}
	account := models.SocialAccount{
		ID: "discord-account", Platform: capabilities.ProviderDiscord,
		CapabilityState: `{"connection_type":"bot"}`,
	}
	resolved := capabilities.Resolve(account.Platform, capabilities.ResolveInput{
		CreationPreset: capabilities.IntentPost,
		Segments:       segments,
		Settings:       settings,
	})
	provider := xCapabilityResolverAdapter{result: platform.AccountCapabilityResult{
		Constraints: map[string]any{"text_limit": 1000},
		Options: map[string][]platform.DestinationOption{
			"discord_channels": {{Value: "channel-1", Label: "#updates"}},
		},
	}}
	handler := NewCapabilityResolverHandler(nil, nil, map[string]platform.Adapter{
		"discord:bot": provider,
	}, capabilityResolverTokenSource{})
	readiness := providerreadiness.NewService(nil, providerreadiness.ServiceOptions{})
	handler.SetProviderReadiness(readiness)
	handler.mergeAccountCapability(t.Context(), account, "en-US", "US", settings, segments, &resolved)

	require.Equal(t, 1000, resolved.TextLimit)
	require.True(t, resolved.Compatible)
	canonical, found := capabilities.FindOutput(account.Platform, resolved.OutputProfile)
	require.True(t, found)
	operation := providerreadiness.OperationPublishImmediate
	policyMode := providerreadiness.PublicationPolicyMode(account, canonical, settings)
	expected := readiness.DecideAccountPublication(
		t.Context(), account, canonical, operation, providerreadiness.ExecutionIntentProduction, policyMode,
	)
	actual := handler.publicationReadiness(t.Context(), account, resolved.Capability, operation, settings)
	require.NotEmpty(t, expected.ContractDigest)
	require.Equal(t, expected.ContractDigest, actual.ContractDigest)
	require.Equal(t, expected.State, actual.State)
	require.NotContains(t, capabilityIssueCodes(resolved.Issues), "setting_required")
}

func capabilityIssueCodes(issues []capabilities.ValidationIssue) []string {
	codes := make([]string, 0, len(issues))
	for _, issue := range issues {
		codes = append(codes, issue.Code)
	}
	return codes
}
