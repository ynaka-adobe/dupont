# Support ticket: Managed CDN custom domain returns HTTP 500

## Summary
Custom (managed CDN) domains on Edge Delivery Services sites under the `ynaka-adobe` org are returning `HTTP 500` with an empty body on every request, while the underlying site content is healthy and reachable via the default `aem.live` domain.

## Affected sites
- **Org:** `ynaka-adobe`
- **Site:** `dupont` — domain `dupont.ynaka-adobe.com`
- **Site:** `vwr` — domain `vwr.ynaka-adobe.com`
(Same symptom on both, suggesting an org-wide or infrastructure-level issue rather than a per-site misconfiguration.)

## Observed behavior
```
curl -sI https://dupont.ynaka-adobe.com/
HTTP/2 500
fastly-restarts: 2
x-skyint-fetch-pass: true
content-length: 0
```
Consistent across repeated requests; not intermittent.

## What's confirmed working (ruling out DNS/cert/config)
1. **DNS is correct** — `dupont.ynaka-adobe.com` CNAMEs to `cdn.adobeaemcloud.com`, and `_acme-challenge.dupont.ynaka-adobe.com` correctly delegates to `cm-verify.adobe.com` for cert validation.
2. **TLS cert is valid** — the CDN edge serves a Let's Encrypt cert with `CN=dupont.ynaka-adobe.com` (issued 2026-09-02, valid to 2026-12-01, `Verify return code: 0 (ok)`), confirming the edge does recognize this specific hostname.
3. **Site config is correct** — `GET https://admin.hlx.page/config/ynaka-adobe/sites/dupont.json` shows:
   ```json
   "cdn": {
     "prod": {
       "type": "managed",
       "host": "dupont.ynaka-adobe.com"
     }
   }
   ```
4. **Underlying content is healthy** — `https://main--dupont--ynaka-adobe.aem.live/` returns `200 OK` directly.
5. **Re-syncing the config had no effect** — re-POSTed the identical `cdn.prod` config via `https://admin.hlx.page/config/ynaka-adobe/sites/dupont/cdn/prod.json`; the write succeeded (`lastModified` updated) but did not trigger a purge log entry and did not change the domain's behavior (still 500 after retries with delay).

## Conclusion
TLS terminates correctly and the edge recognizes the hostname, but the CDN edge cannot successfully fetch from the site's origin/content-bus — pointing to a broken mapping between the managed-CDN distribution and the content-bus origin for this domain, on Adobe's infrastructure side. This is outside what's fixable via the public `admin.hlx.page` config API.

## Ask
Please investigate the managed-CDN → content-bus origin mapping for `dupont.ynaka-adobe.com` (and `vwr.ynaka-adobe.com`) and re-provision/re-activate it as needed.

## Contact
- Yuji Nakata (ynaka@adobe.com)
- Org: `ynaka-adobe`
