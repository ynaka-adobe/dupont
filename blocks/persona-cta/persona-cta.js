// Persona-tailored CTA. Authored as rows: persona | label | href.
// Reads the visitor's persona (window.demoProfile, set by head.html from ?p /
// cookie) and renders the matching button; falls back to the `default` row
// (label "Learn more") when there's no persona or no matching row — so with no
// persona it looks exactly like a normal CTA.

function getPersona() {
  const d = window.demoProfile || {};
  if (d.persona !== undefined && d.persona !== null && d.persona !== '') return String(d.persona);
  const p = new URLSearchParams(window.location.search).get('p');
  return p || undefined;
}

export default function decorate(block) {
  const map = {};
  let def = null;

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const key = (cells[0]?.textContent || '').trim().toLowerCase();
    const label = (cells[1]?.textContent || '').trim();
    const linkEl = cells[2]?.querySelector('a');
    const href = (linkEl?.getAttribute('href') || cells[2]?.textContent || '').trim();
    if (!key || !href) return;
    const entry = { label: label || 'Learn more', href };
    if (key === 'default') def = entry; else map[key] = entry;
  });

  if (!def) def = { label: 'Learn more', href: map['1']?.href || '#' };
  const persona = getPersona();
  const chosen = (persona && map[persona]) ? map[persona] : def;

  const a = document.createElement('a');
  a.className = 'button persona-cta-link';
  a.href = chosen.href;
  a.textContent = chosen.label;
  if (persona && map[persona]) a.dataset.persona = persona;
  block.replaceChildren(a);
}
