# PieFed

PieFed connections use instance credentials and publish through the connected instance's native alpha API to local or federated communities.

## Configuration

Configure an instance-scoped PieFed provider app through `OPENPOST_PROVIDER_APPS` or the instance-admin provider app API. OpenPost exchanges the supplied credentials for a JWT and does not retain the password.

## Publishing behavior

Every post requires a community and an independently authored title. Optional body text, links, one uploaded image, NSFW state, and language are preserved. OpenPost resolves the community immediately before publishing and keeps PieFed's endpoint names and wire fields separate from Lemmy's.

For setup details, see the [PieFed self-hosting integration guide](../../../apps/docs/content/docs/self-hosting/integrations/piefed.mdx).
