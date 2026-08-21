export default async function decorate(block) {
  // Each authored row holds a single labelled link cell. EDS's
  // decorateButtons() converts the standalone anchors into `.button`
  // elements wrapped in `.button-container`. Nothing structural to
  // rebuild here — the grid layout is handled entirely in CSS — but we
  // flag each link card for styling hooks and accessibility.
  block.querySelectorAll('a').forEach((a) => {
    a.classList.add('explore-links-item');
    if (!a.getAttribute('aria-label')) {
      a.setAttribute('aria-label', a.textContent.trim());
    }
  });
}
