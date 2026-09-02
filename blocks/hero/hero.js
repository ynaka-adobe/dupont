/**
 * Ensures a slide has a dedicated image cell as its first child and a
 * content cell as its last child. Authors sometimes place the image and
 * the heading/text in the same column instead of two separate columns;
 * split that single cell so the CSS's image/content layout still works.
 * @param {HTMLElement} slide
 */
function normalizeSlide(slide) {
  if (slide.children.length >= 2) return;
  const cell = slide.firstElementChild;
  const picture = cell?.querySelector('picture');
  if (!picture) return;
  const imgWrapper = picture.closest('p') || picture;
  const imgCell = document.createElement('div');
  imgCell.append(imgWrapper);
  slide.insertBefore(imgCell, cell);
}

// Persona-tailored CTA labels — default (no persona) keeps the authored label.
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

// Tailor each slide's CTA to the active persona: swap the label and carry the
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

export default async function decorate(block) {
  const slides = [...block.children];
  if (slides.length === 0) return;

  personalizeCtas(block);

  slides.forEach((slide, i) => {
    normalizeSlide(slide);
    slide.classList.add('hero-slide');
    if (i === 0) slide.classList.add('hero-slide-active');
  });

  let current = 0;

  const setActive = (index) => {
    const next = (index + slides.length) % slides.length;
    slides[current].classList.remove('hero-slide-active');
    slides[next].classList.add('hero-slide-active');
    dots.forEach((d, i) => d.classList.toggle('hero-dot-active', i === next));
    current = next;
  };

  // Only build carousel controls when there is more than one slide
  const dots = [];
  if (slides.length > 1) {
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'hero-nav hero-prev';
    prev.setAttribute('aria-label', 'Previous slide');
    prev.innerHTML = '&#8249;';
    prev.addEventListener('click', () => setActive(current - 1));

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'hero-nav hero-next';
    next.setAttribute('aria-label', 'Next slide');
    next.innerHTML = '&#8250;';
    next.addEventListener('click', () => setActive(current + 1));

    const dotsWrap = document.createElement('div');
    dotsWrap.className = 'hero-dots';
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'hero-dot';
      if (i === 0) dot.classList.add('hero-dot-active');
      dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
      dot.addEventListener('click', () => setActive(i));
      dots.push(dot);
      dotsWrap.append(dot);
    });

    block.append(prev, next, dotsWrap);
  }
}
