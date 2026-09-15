package handlers

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"strings"

	"github.com/openpost/backend/internal/ai"
	"github.com/openpost/backend/internal/models"
	"github.com/openpost/backend/internal/services/autovideo"
	"github.com/openpost/backend/internal/services/mediastore"
	"github.com/uptrace/bun"
)

const maxAutoVideoMediaBytes int64 = 25 * 1024 * 1024

var (
	errAutoVideoMediaInvalid     = errors.New("invalid Auto Video media source")
	errAutoVideoMediaUnavailable = errors.New("Auto Video media source unavailable")
)

func resolveAutoVideoMediaSource(
	ctx context.Context,
	db *bun.DB,
	storage mediastore.BlobStorage,
	workspaceID string,
	source autovideo.Source,
) (autovideo.Source, []ai.MultimodalPart, error) {
	mediaID := strings.TrimSpace(source.MediaID)
	if mediaID == "" {
		return source, nil, nil
	}
	if db == nil || storage == nil {
		return source, nil, errAutoVideoMediaUnavailable
	}

	var attachment models.MediaAttachment
	err := db.NewSelect().Model(&attachment).
		Where("id = ?", mediaID).
		Where("workspace_id = ?", strings.TrimSpace(workspaceID)).
		Scan(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return source, nil, errAutoVideoMediaInvalid
	}
	if err != nil {
		return source, nil, fmt.Errorf("load Auto Video media source: %w", errAutoVideoMediaUnavailable)
	}
	if attachment.ProcessingStatus != "ready" || attachment.Size <= 0 || attachment.Size > maxAutoVideoMediaBytes {
		return source, nil, errAutoVideoMediaInvalid
	}

	mimeType := strings.ToLower(strings.TrimSpace(attachment.MimeType))
	kind := strings.ToLower(strings.TrimSpace(source.Kind))
	if kind == "media" {
		switch {
		case strings.HasPrefix(mimeType, "image/"):
			kind = "image"
		case strings.HasPrefix(mimeType, "video/"):
			kind = "video"
		case mimeType == "application/pdf":
			kind = "pdf"
		default:
			return source, nil, errAutoVideoMediaInvalid
		}
	}
	if (kind == "image" && !strings.HasPrefix(mimeType, "image/")) ||
		(kind == "video" && !strings.HasPrefix(mimeType, "video/")) ||
		(kind == "pdf" && mimeType != "application/pdf") {
		return source, nil, errAutoVideoMediaInvalid
	}

	reader, err := storage.Open(ctx, attachment.FilePath)
	if err != nil {
		return source, nil, fmt.Errorf("open Auto Video media source: %w", errAutoVideoMediaUnavailable)
	}
	defer reader.Close()
	data, err := io.ReadAll(io.LimitReader(reader, maxAutoVideoMediaBytes+1))
	if err != nil {
		return source, nil, fmt.Errorf("read Auto Video media source: %w", errAutoVideoMediaUnavailable)
	}
	if int64(len(data)) == 0 || int64(len(data)) > maxAutoVideoMediaBytes {
		return source, nil, errAutoVideoMediaInvalid
	}

	filename := strings.TrimSpace(attachment.OriginalFilename)
	if filename == "" {
		filename = mediaID
	}
	source.Kind = kind
	source.MediaID = mediaID
	source.MIMEType = mimeType
	if strings.TrimSpace(source.Label) == "" {
		source.Label = filename
	}
	if strings.TrimSpace(source.Value) == "" {
		source.Value = "Attached " + kind + " source: " + filename
	}

	part := ai.MultimodalPart{SourceID: source.ID}
	switch kind {
	case "image":
		part.Image = &ai.Image{Data: data, MIMEType: mimeType, Detail: ai.ImageDetailAuto}
	case "video":
		part.Video = &ai.Video{Data: data, MIMEType: mimeType}
	case "pdf":
		part.File = &ai.File{Data: data, MIMEType: mimeType, Filename: filename}
	default:
		return source, nil, errAutoVideoMediaInvalid
	}
	return source, []ai.MultimodalPart{part}, nil
}
