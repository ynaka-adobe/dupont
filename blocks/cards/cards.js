// Persona-tailored card CTA labels + optional per-persona body copy.
// Default (no persona) keeps the authored label and description.
const PERSONA_LABELS = {
  1: 'View specifications',
  2: 'See innovation & ROI',
  3: 'Sustainability & compliance',
  4: 'Explore & learn',
};

function personaId() {
  const d = window.demoProfile || {};
  if (d.persona !== undefined && d.persona !== null && d.persona !== '') return String(d.persona);
  return new URLSearchParams(window.location.search).get('p') || '';
}

// An optional extra card cell holds per-persona copy, one line each:
//   1: Technical-focused blurb
//   2: Business-focused blurb  ... (also accepts "1 text", "1. text", "1) text")
function parseOverrides(cell) {
  const map = {};
  cell.querySelectorAll('p, li').forEach((el) => {
    const m = (el.textContent || '').trim().match(/^(\d+)\s*[:.)-]?\s+(.+)$/s);
    if (m) map[m[1]] = m[2].trim();
  });
  return map;
}

function isImageCell(div) {
  return div.children.length === 1 && !!div.querySelector('picture');
}

// Swap each card's CTA label per persona and carry the persona param onward.
function personalizeCtas(block, pid) {
  if (!pid) return;
  const label = PERSONA_LABELS[pid];
  block.querySelectorAll('a').forEach((a) => {
    if (label) a.textContent = label;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('/') && !href.includes('?') && !href.includes('#')) {
      a.setAttribute('href', `${href}?p=${pid}`);
    }
  });
}

export default function decorate(block) {
  const pid = personaId();
  const ul = document.createElement('ul');

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    const nonImage = cells.filter((d) => !isImageCell(d));
    // 2+ non-image cells → the last one is the persona-overrides column.
    let overrides = null;
    if (nonImage.length >= 2) {
      const ovCell = nonImage[nonImage.length - 1];
      overrides = parseOverrides(ovCell);
      ovCell.remove();
    }

    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      div.className = isImageCell(div) ? 'cards-card-image' : 'cards-card-body';
    });

    // Replace the card's description (first non-CTA paragraph) for this persona.
    if (pid && overrides && overrides[pid]) {
      const body = li.querySelector('.cards-card-body');
      const desc = body && [...body.querySelectorAll('p')].find((p) => !p.querySelector('a'));
      if (desc) desc.textContent = overrides[pid];
    }

    ul.append(li);
  });

  block.replaceChildren(ul);
  personalizeCtas(block, pid);
}
