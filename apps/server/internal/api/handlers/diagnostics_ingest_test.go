package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humaecho"
	"github.com/labstack/echo/v4"
	"github.com/openpost/backend/internal/diagnostics"
	"github.com/stretchr/testify/require"
)

func newIngestTestAPI(ingester *diagnostics.Ingester) *echo.Echo {
	e := echo.New()
	group := e.Group("/api/v1")
	api := humaecho.NewWithGroup(e, group, huma.DefaultConfig("Test", "1.0.0"))
	NewIngestHandler(ingester).RegisterRoutes(api)
	return e
}

func ingestTestBody(t *testing.T) []byte {
	t.Helper()
	now := time.Date(2026, time.September, 1, 12, 0, 0, 0, time.UTC)
	body, err := json.Marshal(diagnostics.Report{
		InstallationID: "abcdef0123456789abcdef0123456789",
		Version:        "4.32.0",
		Revision:       "abc123",
		Surface:        diagnostics.SurfaceBackend,
		Operation:      "/api/v1/publications",
		ErrorCode:      diagnostics.CodeAPI5xx,
		HTTPStatus:     http.StatusInternalServerError,
		DBDriver:       "sqlite",
		StorageDriver:  "local",
		FirstSeen:      now,
		LastSeen:       now,
	})
	require.NoError(t, err)
	return body
}

func TestIngestHandlerDisabledWithoutReceiver(t *testing.T) {
	e := newIngestTestAPI(diagnostics.NewIngester(diagnostics.IngestConfig{}))
	request := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/api/v1/diagnostics/ingest", bytes.NewReader(ingestTestBody(t)))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	e.ServeHTTP(recorder, request)
	require.Equal(t, http.StatusServiceUnavailable, recorder.Code)
}

func TestIngestHandlerAcceptsAnonymousValidReport(t *testing.T) {
	e := newIngestTestAPI(diagnostics.NewIngester(diagnostics.IngestConfig{
		Enabled:           true,
		DiscordWebhookURL: "https://discord.example/hooks",
	}))
	request := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/api/v1/diagnostics/ingest", bytes.NewReader(ingestTestBody(t)))
	request.Header.Set("Content-Type", "application/json")
	recorder := httptest.NewRecorder()
	e.ServeHTTP(recorder, request)
	require.Equal(t, http.StatusOK, recorder.Code, recorder.Body.String())
	require.Contains(t, recorder.Body.String(), `"accepted":true`)
}

func TestIngestHandlerRejectsInvalidReport(t *testing.T) {
	e := newIngestTestAPI(diagnostics.NewIngester(diagnostics.IngestConfig{
		Enabled:           true,
		DiscordWebhookURL: "https://discord.example/hooks",
	}))
	post := func(body string) int {
		request := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/api/v1/diagnostics/ingest", bytes.NewBufferString(body))
		request.Header.Set("Content-Type", "application/json")
		recorder := httptest.NewRecorder()
		e.ServeHTTP(recorder, request)
		return recorder.Code
	}
	// Missing installation_id fails schema validation.
	require.Equal(t, http.StatusUnprocessableEntity, post(`{"surface":"backend","operation":"boom","error_code":"api_5xx"}`))
	// Unknown error codes fail report validation.
	require.Equal(t, http.StatusBadRequest, post(`{"installation_id":"abcdef0123456789abcdef0123456789","version":"4.32.0","revision":"abc123","surface":"backend","operation":"boom","error_code":"whatever happened"}`))
}

func TestIngestHandlerEnforcesQuota(t *testing.T) {
	e := newIngestTestAPI(diagnostics.NewIngester(diagnostics.IngestConfig{
		Enabled:           true,
		DiscordWebhookURL: "https://discord.example/hooks",
		PerMinute:         1,
	}))
	post := func() int {
		request := httptest.NewRequestWithContext(context.Background(), http.MethodPost, "/api/v1/diagnostics/ingest", bytes.NewReader(ingestTestBody(t)))
		request.Header.Set("Content-Type", "application/json")
		recorder := httptest.NewRecorder()
		e.ServeHTTP(recorder, request)
		return recorder.Code
	}
	require.Equal(t, http.StatusOK, post())
	require.Equal(t, http.StatusTooManyRequests, post())
}
