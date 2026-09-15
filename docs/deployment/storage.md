# Auno Studio storage configurations

Auno Studio reuses the OpenPost `BlobStorage` boundary. Application and editor code should work with media/project asset identities rather than hard-coded filesystem paths.

## Local storage — default

```dotenv
OPENPOST_STORAGE_DRIVER=local
OPENPOST_MEDIA_PATH=/data/media
OPENPOST_MEDIA_URL=/media
```

Use this for the default one-container aaPanel installation. Keep `/data` on a persistent named volume or mounted backup path.

## Amazon S3

```dotenv
OPENPOST_STORAGE_DRIVER=s3
OPENPOST_S3_ENDPOINT=
OPENPOST_S3_REGION=us-east-1
OPENPOST_S3_BUCKET=auno-studio
OPENPOST_S3_ACCESS_KEY_ID=...
OPENPOST_S3_SECRET_ACCESS_KEY=...
OPENPOST_S3_PUBLIC_BASE_URL=https://cdn.example.com
OPENPOST_S3_FORCE_PATH_STYLE=false
```

## Cloudflare R2

```dotenv
OPENPOST_STORAGE_DRIVER=s3
OPENPOST_S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
OPENPOST_S3_REGION=auto
OPENPOST_S3_BUCKET=auno-studio
OPENPOST_S3_ACCESS_KEY_ID=...
OPENPOST_S3_SECRET_ACCESS_KEY=...
OPENPOST_S3_PUBLIC_BASE_URL=https://media.example.com
OPENPOST_S3_FORCE_PATH_STYLE=false
```

## MinIO

```dotenv
OPENPOST_STORAGE_DRIVER=s3
OPENPOST_S3_ENDPOINT=https://minio.internal.example.com
OPENPOST_S3_REGION=us-east-1
OPENPOST_S3_BUCKET=auno-studio
OPENPOST_S3_ACCESS_KEY_ID=...
OPENPOST_S3_SECRET_ACCESS_KEY=...
OPENPOST_S3_PUBLIC_BASE_URL=https://media.example.com
OPENPOST_S3_FORCE_PATH_STYLE=true
```

Keep the MinIO management endpoint private. Only the media origin intended for browser/provider access should be public.

## Project assets versus workspace media

Generated narration, music, temporary AI images, derived proxies, and source files required only by one video should remain Project Assets first. Do not automatically flood the reusable Media Library. Users can explicitly save/promote an asset to workspace Media when they want to reuse it across projects or publications.
