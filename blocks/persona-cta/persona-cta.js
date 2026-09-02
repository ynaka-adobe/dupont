// Persona-tailored copy + CTA. Authored as a table, one row per persona
// (`1`-`4` or `default`). Rows are flexible / backward-compatible by cell count:
//   3 cells:  persona | label | href                        (CTA only)
//   4 cells:  persona | heading | label | href              (heading + CTA)
//   5 cells:  persona | heading | body | label | href       (heading + body + CTA)
// Reads window.demoProfile / ?p and renders the matching row, falling back to
// the `default` row (label "Learn more") when there's no persona.

function getPersona() {
  const d = window.demoProfile || {};
  if (d.persona !== undefined && d.persona !== null && d.persona !== '') return String(d.persona);
  return new URLSearchParams(window.location.search).get('p') || undefined;
}

function parseRow(row) {
  const cells = [...row.children];
  if (cells.length < 3) return null;
  const n = cells.length;
  const key = (cells[0].textContent || '').trim().toLowerCase();
  const linkEl = cells[n - 1].querySelector('a');
  const href = (linkEl?.getAttribute('href') || cells[n - 1].textContent || '').trim();
  const label = (cells[n - 2].textContent || '').trim();
  const heading = n >= 4 ? (cells[1].textContent || '').trim() : '';
  const body = n >= 5 ? (cells[2].textContent || '').trim() : '';
  if (!key || !href) return null;
  return {
    key, heading, body, label: label || 'Learn more', href,
  };
}

export default function decorate(block) {
  const map = {};
  let def = null;
  [...block.children].forEach((row) => {
    const entry = parseRow(row);
    if (!entry) return;
    if (entry.key === 'default') def = entry; else map[entry.key] = entry;
  });
  if (!def) def = { heading: '', body: '', label: 'Learn more', href: map['1']?.href || '#' };

  const persona = getPersona();
  const chosen = (persona && map[persona]) ? map[persona] : def;

  const frag = document.createDocumentFragment();
  if (chosen.heading) {
    const h = document.createElement('h3');
    h.className = 'persona-cta-heading';
    h.textContent = chosen.heading;
    frag.append(h);
  }
  if (chosen.body) {
    const p = document.createElement('p');
    p.className = 'persona-cta-body';
    p.textContent = chosen.body;
    frag.append(p);
  }
  const a = document.createElement('a');
  a.className = 'persona-cta-link';
  a.href = chosen.href;
  a.textContent = chosen.label;
  if (persona && map[persona]) a.dataset.persona = persona;
  frag.append(a);

  block.replaceChildren(frag);
}
