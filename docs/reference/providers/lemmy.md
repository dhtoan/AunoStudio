# Lemmy

Lemmy connections use instance credentials and publish through the connected instance's v3 API to local or federated communities.

## Configuration

Configure an instance-scoped Lemmy provider app through `OPENPOST_PROVIDER_APPS` or the instance-admin provider app API. OpenPost exchanges the supplied credentials for a JWT and does not retain the password. Lemmy 1.x uses the incompatible v4 API and is rejected until that contract is supported.

## Publishing behavior

Every post requires a community and an independently authored title. Optional body text, links, one uploaded image, NSFW state, and language are preserved. OpenPost resolves the community immediately before publishing and rejects moderator-only destinations for accounts that cannot post there.

For setup details, see the [Lemmy self-hosting integration guide](../../../apps/docs/content/docs/self-hosting/integrations/lemmy.mdx).
