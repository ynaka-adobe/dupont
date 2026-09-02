// Persona-tailored CTA labels for card "Learn more" links. Default (no persona)
// keeps whatever the author wrote (e.g. "Learn more").
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

// Tailor each card's CTA to the active persona: swap the label and carry the
// persona param to the destination so it persists on navigation.
function personalizeCtas(block) {
  const pid = personaId();
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
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else div.className = 'cards-card-body';
    });
    ul.append(li);
  });
  block.replaceChildren(ul);
  personalizeCtas(block);
}
