export default async function decorate(block) {
  const slides = [...block.children];
  if (slides.length === 0) return;

  slides.forEach((slide, i) => {
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
