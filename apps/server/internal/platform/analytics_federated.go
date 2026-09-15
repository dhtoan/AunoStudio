package platform

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

func (m *MastodonAdapter) AnalyticsSupport() AnalyticsSupport {
	return AnalyticsSupport{Account: true, Content: true}
}

func (m *MastodonAdapter) FetchAccountAnalytics(ctx context.Context, accessToken string, input AccountAnalyticsRequest) (AnalyticsValues, error) {
	return compatFetchAccountAnalytics(ctx, m.compat.instanceURL, accessToken, "mastodon", input.AccountID)
}

func (m *MastodonAdapter) FetchContentAnalytics(ctx context.Context, accessToken string, input ContentAnalyticsRequest) (AnalyticsValues, error) {
	return compatFetchContentAnalytics(ctx, m.compat.instanceURL, accessToken, "mastodon", input)
}

func (b *BlueskyAdapter) AnalyticsSupport() AnalyticsSupport {
	return AnalyticsSupport{Account: true, Content: true}
}

func (b *BlueskyAdapter) FetchAccountAnalytics(ctx context.Context, _ string, input AccountAnalyticsRequest) (AnalyticsValues, error) {
	query := url.Values{"actor": {input.AccountID}}
	body, err := DoRequest(ctx, http.MethodGet, "https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?"+query.Encode(), nil, nil)
	if err != nil {
		return nil, fmt.Errorf("bluesky account analytics: %w", err)
	}
	var response struct {
		FollowersCount *int64 `json:"followersCount"`
		FollowsCount   *int64 `json:"followsCount"`
		PostsCount     *int64 `json:"postsCount"`
	}
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, fmt.Errorf("decoding bluesky account analytics: %w", err)
	}
	values := AnalyticsValues{}
	addOptionalMetric(values, MetricFollowers, response.FollowersCount)
	addOptionalMetric(values, MetricFollowing, response.FollowsCount)
	addOptionalMetric(values, MetricPosts, response.PostsCount)
	return values, nil
}

func (b *BlueskyAdapter) FetchContentAnalytics(ctx context.Context, _ string, input ContentAnalyticsRequest) (AnalyticsValues, error) {
	uris := make([]string, 0, len(input.ExternalIDs))
	for _, externalID := range uniqueNonEmpty(input.ExternalIDs) {
		uri := blueskyExternalURI(externalID)
		if uri != "" {
			uris = append(uris, uri)
		}
	}
	if len(uris) == 0 {
		return nil, NewAnalyticsError(AnalyticsStatusNotFound, "missing_external_uri")
	}
	total := AnalyticsValues{}
	found := 0
	for start := 0; start < len(uris); start += 25 {
		end := min(start+25, len(uris))
		query := url.Values{}
		for _, uri := range uris[start:end] {
			query.Add("uris", uri)
		}
		body, err := DoRequest(ctx, http.MethodGet, "https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?"+query.Encode(), nil, nil)
		if err != nil {
			return nil, fmt.Errorf("bluesky content analytics: %w", err)
		}
		var response struct {
			Posts []struct {
				LikeCount   *int64 `json:"likeCount"`
				RepostCount *int64 `json:"repostCount"`
				QuoteCount  *int64 `json:"quoteCount"`
				ReplyCount  *int64 `json:"replyCount"`
			} `json:"posts"`
		}
		if err := json.Unmarshal(body, &response); err != nil {
			return nil, fmt.Errorf("decoding bluesky content analytics: %w", err)
		}
		found += len(response.Posts)
		for _, post := range response.Posts {
			addOptionalMetric(total, MetricLikes, post.LikeCount)
			addOptionalMetric(total, MetricReposts, post.RepostCount)
			addOptionalMetric(total, MetricQuotes, post.QuoteCount)
			addOptionalMetric(total, MetricComments, post.ReplyCount)
		}
	}
	if found == 0 {
		return nil, NewAnalyticsError(AnalyticsStatusNotFound, "content_not_found")
	}
	subtractOwnReplies(total, input.OwnReplyCount)
	return total, nil
}

func blueskyExternalURI(externalID string) string {
	externalID = strings.TrimSpace(externalID)
	if strings.HasPrefix(externalID, "at://") {
		return externalID
	}
	var ref struct {
		URI string `json:"uri"`
	}
	if json.Unmarshal([]byte(externalID), &ref) == nil {
		return strings.TrimSpace(ref.URI)
	}
	return ""
}
