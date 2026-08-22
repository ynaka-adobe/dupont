/* Edge function: persona-decision  (AEM Edge Delivery / Fastly Compute JS)
 * Resolves persona/loggedIn/region from the ?p= query param (first hit) or the
 * demoProfile cookie (repeat hits), DECIDES the experience AT THE EDGE, injects
 * it into the page HTML server-side, and persists the resolved profile cookie.
 *
 * The Target Delivery API call is STUBBED (see decide()) so this is deployable
 * and testable without Target credentials. Swap decide() for a real
 * {tenant}.tt.omtrdc.net/rest/v1/delivery call passing profileParameters.
 */
const PERSONA = {
  1: { name: 'Technical Evaluator', color: '#0072ce' },
  2: { name: 'Business Decision Maker', color: '#e1261c' },
  3: { name: 'Procurement Manager', color: '#00884a' },
  4: { name: 'Industry Researcher', color: '#6a1b9a' },
};
const ORIGIN = 'https://main--dupont--ynaka-adobe.aem.live';

addEventListener('fetch', (event) => event.respondWith(handleRequest(event)));

async function handleRequest(event) {
  const req = event.request;
  const url = new URL(req.url);
  const profile = resolveProfile(req, url);

  // Fetch the underlying page from the content origin.
  // 'origin' must be declared as a backend/origin selector for this function.
  const originResp = await fetch(ORIGIN + url.pathname, { backend: 'origin' });
  let html = await originResp.text();

  if (profile.persona) {
    const decision = await decide(url.pathname, profile);
    html = injectExperience(html, decision, profile);
  }

  const headers = new Headers(originResp.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('x-persona', String(profile.persona || ''));
  headers.append(
    'set-cookie',
    `demoProfile=${encodeURIComponent(JSON.stringify(profile))}; Path=/; Max-Age=2592000; SameSite=Lax`,
  );
  return new Response(html, { status: originResp.status, headers });
}

function resolveProfile(req, url) {
  const cookies = parseCookies(req.headers.get('cookie') || '');
  let profile = {};
  try { profile = JSON.parse(cookies.demoProfile || '{}'); } catch (e) { profile = {}; }
  const p = url.searchParams.get('p'); if (p) profile.persona = parseInt(p, 10);
  const li = url.searchParams.get('li'); if (li !== null) profile.loggedIn = (li === '1' || li === 'true');
  const region = url.searchParams.get('region'); if (region) profile.region = region.toUpperCase();
  return profile;
}

/* STUB — replace with Adobe Target server-side Delivery API:
 *   POST https://<tenant>.tt.omtrdc.net/rest/v1/delivery?client=<tenant>&sessionId=<sid>
 *   body.execute.pageLoad.profileParameters = { persona, loggedIn, region }
 *   then map returned options into injectExperience().
 */
async function decide(path, profile) {
  const meta = PERSONA[profile.persona] || { name: 'Default', color: '#333333' };
  return { persona: profile.persona, label: meta.name, color: meta.color };
}

function injectExperience(html, decision, profile) {
  const banner = `<div data-edge-persona style="position:sticky;top:0;z-index:10000;`
    + `background:${decision.color};color:#fff;font:600 14px/1.4 system-ui,sans-serif;`
    + `padding:8px 16px;text-align:center">`
    + `Edge decision &#8594; Persona ${decision.persona}: ${escapeHtml(decision.label)}`
    + `${profile.loggedIn ? ' &#183; logged in' : ' &#183; guest'}`
    + `${profile.region ? ' &#183; ' + escapeHtml(profile.region) : ''}`
    + `</div>`;
  return html.replace(/<body[^>]*>/i, (m) => m + banner);
}

function parseCookies(str) {
  const out = {};
  str.split(';').forEach((c) => {
    const i = c.indexOf('=');
    if (i > -1) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
