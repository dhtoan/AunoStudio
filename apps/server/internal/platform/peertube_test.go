package platform

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

type fakePeerTube struct {
	t           *testing.T
	uploaded    []byte
	videoState  int
	videoSeen   int
	chunks      int
	thumbnail   bool
	captionLang string
}

func newFakePeerTube(t *testing.T) (*httptest.Server, *fakePeerTube) {
	fake := &fakePeerTube{t: t, videoState: 2}
	mux := http.NewServeMux()
	mux.HandleFunc("/api/v1/oauth-clients/local", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"client_id":"cid","client_secret":"csec"}`))
	})
	mux.HandleFunc("/api/v1/users/token", func(w http.ResponseWriter, r *http.Request) {
		_ = r.ParseForm()
		if r.Form.Get("client_id") != "cid" {
			http.Error(w, "bad client", http.StatusUnauthorized)
			return
		}
		_, _ = w.Write([]byte(`{"access_token":"atok","refresh_token":"rtok","expires_in":14399,"token_type":"Bearer"}`))
	})
	mux.HandleFunc("/api/v1/users/me", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"id":42,"username":"rodrigo","account":{"name":"rodrigo","displayName":"Rodrigo"}}`))
	})
	mux.HandleFunc("/api/v1/accounts/rodrigo/video-channels", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"data":[{"id":3,"name":"demos","displayName":"Demos"}]}`))
	})
	mux.HandleFunc("/api/v1/video-channels/demos", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"id":3,"name":"demos","displayName":"Demos","followersCount":12}`))
	})
	mux.HandleFunc("/api/v1/videos/upload-resumable", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			var metadata map[string]any
			if err := json.NewDecoder(r.Body).Decode(&metadata); err != nil {
				http.Error(w, "bad metadata", http.StatusBadRequest)
				return
			}
			if metadata["name"] != "Launch demo" || metadata["channelId"] != float64(3) {
				http.Error(w, "unexpected metadata", http.StatusBadRequest)
				return
			}
			w.Header().Set("Location", "/api/v1/videos/upload-resumable?upload_id=abc")
			w.WriteHeader(http.StatusCreated)
			return
		}
		if r.Method == http.MethodPut {
			chunk, _ := io.ReadAll(r.Body)
			fake.uploaded = append(fake.uploaded, chunk...)
			fake.chunks++
			contentRange := r.Header.Get("Content-Range")
			total := int64(0)
			if parts := strings.Split(strings.TrimPrefix(contentRange, "bytes "), "/"); len(parts) == 2 {
				total, _ = strconv.ParseInt(parts[1], 10, 64)
			}
			if int64(len(fake.uploaded)) < total {
				w.Header().Set("Range", "bytes=0-"+strconv.Itoa(len(fake.uploaded)-1))
				w.WriteHeader(308)
				return
			}
			_, _ = w.Write([]byte(`{"video":{"uuid":"video-uuid-1","id":99}}`))
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	})
	mux.HandleFunc("/api/v1/videos/video-uuid-1", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			fake.thumbnail = true
			w.WriteHeader(http.StatusNoContent)
			return
		}
		fake.videoSeen++
		_, _ = w.Write([]byte(`{"id":99,"uuid":"video-uuid-1","shortUUID":"short1","name":"Launch demo","state":{"id":` + strconv.Itoa(fake.videoState) + `,"label":"` + map[int]string{1: "Published", 2: "To transcode"}[fake.videoState] + `"},"views":50,"likes":4,"dislikes":1}`))
	})
	mux.HandleFunc("/api/v1/videos/video-uuid-1/captions", func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseMultipartForm(1 << 20); err != nil {
			http.Error(w, "bad captions", http.StatusBadRequest)
			return
		}
		fake.captionLang = r.FormValue("language")
		_, _ = w.Write([]byte(`{}`))
	})
	mux.HandleFunc("/api/v1/videos/video-uuid-1/comment-threads", func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte(`{"total":1,"data":[{"comment":{"id":11,"url":"https://example/c/11","text":"<p>Great demo</p>","threadId":11,"createdAt":"2026-09-01T10:00:00Z","updatedAt":"2026-09-01T10:00:00Z","isDeleted":false,"account":{"name":"viewer","displayName":"Viewer"}},"children":[]}]}`))
	})
	mux.HandleFunc("/api/v1/videos/video-uuid-1/comments/11", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			_, _ = w.Write([]byte(`{"comment":{"id":12}}`))
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	})
	mux.HandleFunc("/api/v1/videos/video-uuid-1/comments/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	})
	return httptest.NewServer(mux), fake
}

func TestPeerTubeLoginAndChannelSelection(t *testing.T) {
	server, _ := newFakePeerTube(t)
	defer server.Close()

	adapter := NewPeerTubeAdapter(server.URL)
	token, profile, err := adapter.Login(t.Context(), "rodrigo", "secret")
	require.NoError(t, err)
	require.Equal(t, "atok", token.AccessToken)
	require.Equal(t, "rtok", token.RefreshToken)
	require.Equal(t, "rodrigo", profile.Username)

	options, err := adapter.ListAccountSelections(t.Context(), token)
	require.NoError(t, err)
	require.Len(t, options, 1)
	require.Equal(t, "demos", options[0].ID)
	require.Equal(t, "channel", options[0].Kind)

	selected, err := adapter.SelectAccount(t.Context(), token, "demos")
	require.NoError(t, err)
	require.Equal(t, "demos", selected.AccountID)
	require.Equal(t, server.URL, selected.InstanceURL)
}

func TestPeerTubeResumableUploadAndPublish(t *testing.T) {
	server, fake := newFakePeerTube(t)
	defer server.Close()

	adapter := NewPeerTubeAdapter(server.URL)
	media := bytes.Repeat([]byte("v"), 9*1024*1024)
	uuid, err := adapter.UploadMediaWithMetadata(t.Context(), "atok", "demos", UploadMediaRequest{
		MimeType: "video/mp4",
		Filename: "demo.mp4",
		Size:     int64(len(media)),
		Title:    "Launch demo",
		Settings: map[string]interface{}{
			"privacy":  "public",
			"language": "en",
			"tags":     "demo, launch",
		},
		Reader:            bytes.NewReader(media),
		ThumbnailReader:   bytes.NewReader([]byte("jpeg-bytes")),
		CaptionReader:     bytes.NewReader([]byte("WEBVTT")),
		ThumbnailFilename: "thumb.jpg",
		CaptionFilename:   "captions.vtt",
		ThumbnailMimeType: "image/jpeg",
		CaptionMimeType:   "text/vtt",
	})
	require.NoError(t, err)
	require.Equal(t, "video-uuid-1", uuid)
	require.Len(t, fake.uploaded, len(media), "all bytes must reach the server")
	require.GreaterOrEqual(t, fake.chunks, 2, "large files must upload in chunks")
	require.True(t, fake.thumbnail, "thumbnail must be applied after upload")
	require.Equal(t, "en", fake.captionLang)

	// Still transcoding: pending with reconcile-only safety, never a re-upload.
	// The durable write fence turns the pending result into a scheduled
	// reconcile; Publish itself reports no terminal error.
	result, err := adapter.Publish(t.Context(), "atok", "demos", &PublishRequest{
		PlatformMediaIDs: []string{uuid},
		Settings:         map[string]interface{}{"channel": "demos"},
	})
	require.NoError(t, err)
	require.Equal(t, PublishSubmissionPending, result.SubmissionState)
	require.Equal(t, PublishRetryReconcileOnly, result.RetrySafety)
	require.Equal(t, uuid, result.ProviderReference)

	fake.videoState = 1
	reconciled, err := adapter.ReconcilePublish(t.Context(), "atok", "demos", uuid)
	require.NoError(t, err)
	require.Equal(t, PublishSubmissionAccepted, reconciled.SubmissionState)
	require.Equal(t, "video-uuid-1", reconciled.ExternalID)
	require.Equal(t, server.URL+"/w/short1", reconciled.ExternalURL)
}

func TestPeerTubeRequiresTitleAndChannel(t *testing.T) {
	adapter := NewPeerTubeAdapter("https://tube.example")
	_, err := adapter.UploadMediaWithMetadata(t.Context(), "atok", "", UploadMediaRequest{
		MimeType: "video/mp4", Reader: bytes.NewReader([]byte("x")),
		Settings: map[string]interface{}{},
	})
	require.ErrorContains(t, err, "channel")
}

func TestPeerTubeComments(t *testing.T) {
	server, _ := newFakePeerTube(t)
	defer server.Close()

	adapter := NewPeerTubeAdapter(server.URL)
	comments, err := adapter.ListComments(t.Context(), "atok", "demos", "video-uuid-1")
	require.NoError(t, err)
	require.Len(t, comments, 1)
	require.Equal(t, "Great demo", comments[0].Text)
	require.True(t, comments[0].CanReply)
	require.True(t, comments[0].CanDelete)
	require.False(t, comments[0].IsOurs)

	replyID, err := adapter.ReplyToComment(t.Context(), "atok", "demos", comments[0].ID, "Thanks!")
	require.NoError(t, err)
	require.Equal(t, "peertube:video-uuid-1:12", replyID)
	require.NoError(t, adapter.DeleteComment(t.Context(), "atok", "demos", replyID))
}

func TestPeerTubeAnalytics(t *testing.T) {
	server, _ := newFakePeerTube(t)
	defer server.Close()

	adapter := NewPeerTubeAdapter(server.URL)
	account, err := adapter.FetchAccountAnalytics(t.Context(), "atok", AccountAnalyticsRequest{AccountID: "demos"})
	require.NoError(t, err)
	require.Equal(t, int64(12), account[MetricFollowers])

	content, err := adapter.FetchContentAnalytics(t.Context(), "atok", ContentAnalyticsRequest{ExternalIDs: []string{"video-uuid-1"}})
	require.NoError(t, err)
	require.Equal(t, int64(50), content[MetricViews])
	require.Equal(t, int64(4), content[MetricLikes])
	_, hasDislikes := content["dislikes"]
	require.False(t, hasDislikes, "dislikes must not be relabelled")
}

func TestPeerTubeValidation(t *testing.T) {
	issues := validatePeerTubeMedia([]MediaItem{{ID: "m1", MimeType: "image/jpeg"}})
	require.Len(t, issues, 1)
	require.Equal(t, "error", issues[0].Severity)

	adapter := NewPeerTubeAdapter("https://tube.example")
	require.Error(t, adapter.ValidatePublishingTarget(t.Context(), "tok", "", map[string]interface{}{}))
	require.NoError(t, adapter.ValidatePublishingTarget(t.Context(), "tok", "demos", map[string]interface{}{}))
}
