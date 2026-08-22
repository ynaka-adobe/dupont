// Faceted product finder. Reads /products-index.json (product taxonomy) and
// renders facet filters + a live-filtered, searchable result list.

const FACETS = [
  ['industries', 'Industries'],
  ['industrySegments', 'Industry Segments'],
  ['technologies', 'Technologies and Solutions'],
  ['applications', 'Applications'],
  ['productLines', 'Product Lines'],
  ['brands', 'Brands'],
  ['type', 'Type'],
  ['solutions', 'Solutions'],
];

let dataCache;
async function loadData() {
  if (dataCache) return dataCache;
  try {
    const resp = await fetch('/products-index.json?limit=2000');
    const json = await resp.json();
    dataCache = (json.data || []).map((row) => {
      const o = { path: row.path, title: row.title || row.path };
      FACETS.forEach(([k]) => {
        o[k] = (row[k] || '').split('|').map((s) => s.trim()).filter(Boolean);
      });
      return o;
    });
  } catch (e) {
    dataCache = [];
  }
  return dataCache;
}

function esc(s) {
  return (s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export default async function decorate(block) {
  const params = new URLSearchParams(window.location.search);
  const state = { q: (params.get('q') || '').trim(), sel: {} };
  FACETS.forEach(([k]) => { state.sel[k] = new Set(); });

  block.innerHTML = `
    <div class="pf-layout">
      <aside class="pf-facets">
        <div class="pf-facets-head">
          <span>Filters</span>
          <button type="button" class="pf-clear" hidden>Clear all</button>
        </div>
        <div class="pf-facet-groups"></div>
      </aside>
      <section class="pf-main">
        <div class="pf-field">
          <input type="search" class="pf-input" placeholder="Search products" aria-label="Search products" value="${esc(state.q)}">
        </div>
        <p class="pf-count"></p>
        <div class="pf-results" aria-live="polite"></div>
      </section>
    </div>`;

  const groupsEl = block.querySelector('.pf-facet-groups');
  const clearBtn = block.querySelector('.pf-clear');
  const input = block.querySelector('.pf-input');
  const countEl = block.querySelector('.pf-count');
  const resultsEl = block.querySelector('.pf-results');

  const data = await loadData();

  const textMatch = (p) => {
    if (!state.q) return true;
    const hay = `${p.title} ${p.path} ${FACETS.map(([k]) => p[k].join(' ')).join(' ')}`.toLowerCase();
    return hay.includes(state.q.toLowerCase());
  };
  const facetMatch = (p, exceptKey) => FACETS.every(([k]) => {
    if (k === exceptKey) return true;
    const sel = state.sel[k];
    if (!sel.size) return true;
    return p[k].some((v) => sel.has(v));
  });
  const filtered = (exceptKey) => data.filter((p) => textMatch(p) && facetMatch(p, exceptKey));

  const totalSelected = () => FACETS.reduce((n, [k]) => n + state.sel[k].size, 0);

  const renderFacets = () => {
    groupsEl.innerHTML = FACETS.map(([key, label]) => {
      const pool = filtered(key);
      const counts = new Map();
      pool.forEach((p) => p[key].forEach((v) => counts.set(v, (counts.get(v) || 0) + 1)));
      // always include already-selected values even if count 0
      state.sel[key].forEach((v) => { if (!counts.has(v)) counts.set(v, 0); });
      const values = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      if (!values.length) return '';
      const opts = values.slice(0, 15).map(([v, c]) => `<label class="pf-opt">
        <input type="checkbox" data-facet="${esc(key)}" value="${esc(v)}" ${state.sel[key].has(v) ? 'checked' : ''}>
        <span class="pf-opt-label">${esc(v)}</span><span class="pf-opt-count">${c}</span>
      </label>`).join('');
      const more = values.length > 15 ? `<p class="pf-more">+${values.length - 15} more</p>` : '';
      return `<details class="pf-group" open><summary>${esc(label)}</summary>${opts}${more}</details>`;
    }).join('');
    clearBtn.hidden = totalSelected() === 0;
  };

  const renderResults = () => {
    const items = filtered(null);
    const label = state.q ? `${items.length} product${items.length === 1 ? '' : 's'} for “${esc(state.q)}”` : `${items.length} products`;
    countEl.textContent = label;
    resultsEl.innerHTML = items.slice(0, 60).map((p) => `<a class="pf-result" href="${esc(p.path)}">
      <span class="pf-result-title">${esc(p.title)}</span>
      ${p.brands.length ? `<span class="pf-result-brand">${esc(p.brands.join(', '))}</span>` : ''}
    </a>`).join('') || '<p class="pf-empty">No products match your filters.</p>';
  };

  const syncUrl = () => {
    const url = new URL(window.location);
    if (state.q) url.searchParams.set('q', state.q); else url.searchParams.delete('q');
    window.history.replaceState({}, '', url);
  };

  const rerender = () => { renderFacets(); renderResults(); syncUrl(); };

  groupsEl.addEventListener('change', (e) => {
    const cb = e.target.closest('input[type="checkbox"]');
    if (!cb) return;
    const set = state.sel[cb.dataset.facet];
    if (cb.checked) set.add(cb.value); else set.delete(cb.value);
    rerender();
  });
  clearBtn.addEventListener('click', () => {
    FACETS.forEach(([k]) => state.sel[k].clear());
    rerender();
  });
  let debounce;
  input.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.q = input.value.trim(); rerender(); }, 180);
  });

  rerender();
}
