// Search backed by /query-index.json. Reads ?q= from the URL and renders a
// search field + live results. Optionally scoped to a path prefix authored in
// the block (e.g. a cell containing "/products/") to make a product finder.

let indexCache;
async function loadIndex() {
  if (indexCache) return indexCache;
  try {
    const resp = await fetch('/query-index.json?limit=5000');
    const json = await resp.json();
    indexCache = Array.isArray(json.data) ? json.data : [];
  } catch (e) {
    indexCache = [];
  }
  return indexCache;
}

function esc(s) {
  return (s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

function highlight(text, q) {
  const src = text || '';
  if (!q) return esc(src);
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
  let out = '';
  let last = 0;
  let m = re.exec(src);
  while (m) {
    if (m.index === re.lastIndex) { re.lastIndex += 1; m = re.exec(src); continue; }
    out += `${esc(src.slice(last, m.index))}<mark>${esc(m[0])}</mark>`;
    last = m.index + m[0].length;
    m = re.exec(src);
  }
  return out + esc(src.slice(last));
}

function resultCard(r, q) {
  return `<a class="search-result" href="${esc(r.path)}">
    <span class="search-result-title">${highlight(r.title || r.path, q)}</span>
    <span class="search-result-path">${esc(r.path)}</span>
    ${r.description ? `<span class="search-result-desc">${highlight(r.description, q)}</span>` : ''}
  </a>`;
}

export default async function decorate(block) {
  // optional path scope authored in the block (e.g. "/products/")
  const cfg = block.textContent.trim();
  const scope = /^\/\S+/.test(cfg) ? cfg.split(/\s+/)[0] : '';
  const noun = scope ? 'products' : 'results';
  const placeholder = scope ? 'Search products' : 'Search DuPont';

  const params = new URLSearchParams(window.location.search);
  const initial = (params.get('q') || '').trim();

  block.innerHTML = `
    <div class="search-field">
      <input type="search" class="search-input" placeholder="${placeholder}" aria-label="${placeholder}" value="${esc(initial)}">
    </div>
    <div class="search-results" aria-live="polite"></div>`;
  const input = block.querySelector('.search-input');
  const out = block.querySelector('.search-results');

  const run = async (query) => {
    const q = query.trim();
    const url = new URL(window.location);
    if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
    window.history.replaceState({}, '', url);

    const data = await loadIndex();
    const pool = scope ? data.filter((r) => (r.path || '').startsWith(scope)) : data;

    if (!q) {
      if (!scope) { out.innerHTML = ''; return; }
      // browse mode: list everything in scope
      out.innerHTML = `<p class="search-count">${pool.length} ${noun}</p>`
        + pool.slice(0, 50).map((r) => resultCard(r, '')).join('');
      return;
    }

    const needle = q.toLowerCase();
    const matches = pool.filter((r) => `${r.title || ''} ${r.description || ''} ${r.path || ''}`
      .toLowerCase().includes(needle));
    out.innerHTML = `<p class="search-count">${matches.length} ${noun.replace(/s$/, '')}${matches.length === 1 ? '' : 's'} for “${esc(q)}”</p>`
      + matches.slice(0, 50).map((r) => resultCard(r, q)).join('');
  };

  let debounce;
  input.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(() => run(input.value), 180); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { clearTimeout(debounce); run(input.value); } });

  run(initial); // browse-all when scoped and empty; results when q present
  input.focus();
}
