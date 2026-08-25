# edge-functions

An [AEM Edge Function](https://experienceleague.adobe.com/en/docs/experience-manager-cloud-service/content/implementing/developing/edge-functions)
that returns the visitor's geolocation (derived from their IP by Fastly) for
client-side personalization — read by `scripts/geo.js` at the site root and
exposed as `window.swGeo` / a `sw-geo` cookie for blocks and Target to use.

Structure and conventions follow Adobe's official
[aem-edge-functions-boilerplate](https://github.com/adobe/aem-edge-functions-boilerplate).

## What it does

`GET /api/geo` → JSON:

```json
{
  "country": "US",
  "region": "CA",
  "city": "Oakland",
  "continent": "NA",
  "latitude": 37.8,
  "longitude": -122.27
}
```

It also mirrors `country`/`region` onto `X-Geo-Country`/`X-Geo-Region`
response headers and a short-lived `sw-geo` cookie, so a page navigation
doesn't need to wait on the fetch to have *something* to personalize on for
the next page.

## Setup (one-time, per Cloud Manager environment)

```
npm install -g @adobe/aio-cli
aio plugins:install @adobe/aio-cli-plugin-aem-edge-functions
aio login
aio aem edge-functions setup
```

Requires the **AEM Administrator** product profile to deploy.

From this directory:

```
npm install
```

## Configuration

- `config/edgeFunctions.yaml` — declares the `southwest-geo` function.
- `config/cdn.yaml` — routes `/api/geo` to it via a CDN origin selector.
  **If the site's Cloud Manager config pipeline already has its own
  `cdn.yaml`, merge the `route-geo-to-edge-function` rule into it instead
  of shipping two files** — only one `cdn.yaml` is applied per pipeline.

Commit both to the environment's config-pipeline repo and trigger the
pipeline to provision the function and routing.

## Local development

```
npm install
aio aem edge-functions serve
```

Serves at `http://127.0.0.1:7676` — try `curl http://127.0.0.1:7676/api/geo`.

Note: Fastly's local dev server resolves geolocation for a real public IP,
not `127.0.0.1` — see the
[Fastly Compute serve docs](https://www.fastly.com/documentation/reference/cli/compute/serve/)
for overriding the test client IP.

## Build, deploy, test

```
aio aem edge-functions build
aio aem edge-functions deploy southwest-geo
npm run test
aio aem edge-functions tail-logs southwest-geo   # remote debugging
```

## Caveats

- This code was written against Adobe's published boilerplate/API and
  **has not been deployed or run against a live Fastly/Cloud Manager
  environment** — building and deploying requires the `aio` CLI logged
  into this project's actual Adobe org, which isn't available here.
  Double-check the build/deploy steps against your environment before
  relying on this in production.
