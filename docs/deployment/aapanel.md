# Deploy Auno Studio on aaPanel

Auno Studio Web 2.0 keeps the OpenPost single-binary self-host model and exposes the app only on loopback. aaPanel/Nginx owns the public domain and TLS certificate.

## Default deployment

The default profile uses:

- one `auno-studio` container;
- SQLite at `/data/db/auno-studio.db`;
- local media at `/data/media`;
- a named Docker volume for `/data`;
- no public database or AI-worker ports;
- no GPU requirement.

From the repository root:

```bash
cp deploy/aapanel/.env.example deploy/aapanel/.env
```

Edit `deploy/aapanel/.env` and set the real public domain plus independent production secrets. Generate secrets locally, for example:

```bash
openssl rand -base64 48
```

Start the app:

```bash
docker compose -f deploy/aapanel/docker-compose.yml up -d
```

The app binds to `127.0.0.1:8080` by default. Change `AUNO_HOST_PORT` if that port is already used.

## aaPanel reverse proxy

1. Create the site/domain in aaPanel.
2. Enable SSL/TLS for the domain.
3. Add a reverse proxy to `http://127.0.0.1:8080` (or your `AUNO_HOST_PORT`).
4. Preserve the original `Host`, `X-Forwarded-Proto`, and client forwarding headers.
5. Do not expose PostgreSQL, optional AI workers, or storage administration ports publicly.
6. Set `OPENPOST_APP_URL` and `OPENPOST_PUBLIC_URL` to the exact HTTPS public origin before connecting OAuth providers or passkeys.

The `OPENPOST_*` configuration prefix is intentionally retained for backend compatibility with the imported OpenPost foundation. Product-facing branding is Auno Studio.

## Optional PostgreSQL

Use the Postgres override when the installation needs an external database topology:

```bash
docker compose \
  -f deploy/aapanel/docker-compose.yml \
  -f deploy/aapanel/docker-compose.postgres.yml \
  --profile postgres up -d
```

Set a strong `POSTGRES_PASSWORD` in `deploy/aapanel/.env` first. PostgreSQL remains private on the Docker network; the production manifests do not publish port 5432.

## Optional S3-compatible storage

Set:

```dotenv
OPENPOST_STORAGE_DRIVER=s3
OPENPOST_S3_ENDPOINT=
OPENPOST_S3_REGION=
OPENPOST_S3_BUCKET=
OPENPOST_S3_ACCESS_KEY_ID=
OPENPOST_S3_SECRET_ACCESS_KEY=
OPENPOST_S3_PUBLIC_BASE_URL=
OPENPOST_S3_FORCE_PATH_STYLE=false
```

For Cloudflare R2 or MinIO, use their S3-compatible endpoint. MinIO commonly needs `OPENPOST_S3_FORCE_PATH_STYLE=true`.

## Updates

Use pinned Auno Studio image tags for production rather than relying permanently on `latest`:

```dotenv
AUNO_IMAGE_TAG=2.0.0-alpha.1
```

Before an update, back up `/data` and all encryption/signing secrets. Pull the new image, recreate the container, then keep the previous image tag available for rollback until the new release is accepted.
