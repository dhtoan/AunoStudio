# The caller supplies the validated, canonical frontend directory as a named
# BuildKit context. The frontend is built outside this image and embedded into
# the Go binary at the existing OpenPost boundary.
FROM frontend_artifact AS frontend-builder

FROM golang:1.26.6-alpine@sha256:3889b425f035be855a72fb4755265311293b6d414521f0a519d819df32222d83 AS backend-builder

ARG VERSION=dev
ARG COMMIT=unknown

RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app

COPY apps/server/go.mod apps/server/go.sum ./apps/server/
RUN --mount=type=cache,target=/go/pkg/mod \
    cd apps/server && go mod download

COPY apps/server/ ./apps/server/
COPY --from=frontend-builder / ./apps/server/cmd/openpost/public

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    cd apps/server && CGO_ENABLED=1 GOOS=linux go build -buildvcs=false -ldflags="-s -w -X main.version=${VERSION} -X main.commit=${COMMIT}" -o openpost ./cmd/openpost

FROM alpine:3.24.1@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b AS runtime

ARG TARGETARCH
RUN test "${TARGETARCH}" = "amd64" || { \
      echo "Auno Studio's published container currently supports linux/amd64 only; received ${TARGETARCH:-unknown}." >&2; \
      exit 1; \
    }

ARG VERSION=dev
ARG COMMIT=unknown
LABEL org.opencontainers.image.title="Auno Studio" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${COMMIT}" \
      org.opencontainers.image.source="https://github.com/dhtoan/AunoStudio" \
      org.opencontainers.image.base.name="docker.io/library/alpine:3.24.1" \
      org.opencontainers.image.base.digest="sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b"

RUN apk add --no-cache ca-certificates ffmpeg tzdata sqlite \
    'libcrypto3>=3.5.8-r0' 'libssl3>=3.5.8-r0'

RUN adduser -D -u 1000 openpost

WORKDIR /app

COPY --from=backend-builder /app/apps/server/openpost .

RUN mkdir -p /data/media /data/db /data/exports /data/thumbnails /data/temp /data/backups && \
    chown -R openpost:openpost /data

USER openpost

ENV OPENPOST_PORT=8080
ENV OPENPOST_EDITION=selfhost
ENV OPENPOST_DATABASE_DRIVER=sqlite
ENV OPENPOST_DATABASE_PATH=/data/db/auno-studio.db
ENV OPENPOST_STORAGE_DRIVER=local
ENV OPENPOST_MEDIA_PATH=/data/media
ENV OPENPOST_DIAGNOSTICS_STATE_FILE=/data/diagnostics-installation-id
ENV OPENPOST_TELEMETRY_ENABLED=false
ENV OPENPOST_UPDATE_CHECK_ENABLED=false

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/v1/health || exit 1

STOPSIGNAL SIGTERM

CMD ["./openpost", "all"]
