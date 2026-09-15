# PeerTube

PeerTube connections use instance credentials and select one owned video channel as the OpenPost destination.

## Configuration

Configure an instance-scoped PeerTube provider app through `OPENPOST_PROVIDER_APPS` or the instance-admin provider app API. OpenPost exchanges the supplied instance credentials for a token and does not retain the password.

## Publishing behavior

PeerTube publishing requires a video, an explicit title, and a resolved channel. Uploads use PeerTube's resumable protocol, checkpoint offsets before retries, and apply optional thumbnails and captions as durable post-upload stages. A publication remains pending while the instance transcodes it and becomes published only after provider reconciliation.

For setup details, see the [PeerTube self-hosting integration guide](../../../apps/docs/content/docs/self-hosting/integrations/peertube.mdx).
