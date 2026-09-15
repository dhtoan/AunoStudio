# Pixelfed

Pixelfed connections use the Mastodon-compatible client API while preserving Pixelfed's provider identity and photo-first capabilities.

## Configuration

Operators may allow per-instance dynamic app registration or preconfigure instance credentials with `PIXELFED_SERVERS`, `OPENPOST_PROVIDER_APPS`, or the instance-admin provider app API. The default authorization redirect is `urn:ietf:wg:oauth:2.0:oob`.

## Publishing behavior

OpenPost publishes photos and albums, preserves per-image alt text and sensitive-media settings, and warns that video support varies by Pixelfed instance and version. Polls, quotes, interaction policies, and focal points are not advertised as available Pixelfed features.

For the connection workflow, see the [Pixelfed self-hosting integration guide](../../../apps/docs/content/docs/self-hosting/integrations/pixelfed.mdx).
