import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const isNavDrop = focused.className === 'nav-drop';
  if (isNavDrop && (e.code === 'Enter' || e.code === 'Space')) {
    const dropExpanded = focused.getAttribute('aria-expanded') === 'true';
    // eslint-disable-next-line no-use-before-define
    toggleAllNavSections(focused.closest('.nav-sections'));
    focused.setAttribute('aria-expanded', dropExpanded ? 'false' : 'true');
  }
}

function focusNavSection() {
  document.activeElement.addEventListener('keydown', openOnKeydown);
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections.querySelectorAll('.nav-sections .default-content-wrapper > ul > li').forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  // enable nav dropdown keyboard accessibility
  if (navSections) {
    const navDrops = navSections.querySelectorAll('.nav-drop');
    if (isDesktop.matches) {
      navDrops.forEach((drop) => {
        if (!drop.hasAttribute('tabindex')) {
          drop.setAttribute('tabindex', 0);
          drop.addEventListener('focus', focusNavSection);
        }
      });
    } else {
      navDrops.forEach((drop) => {
        drop.removeAttribute('tabindex');
        drop.removeEventListener('focus', focusNavSection);
      });
    }
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

// query-index is fetched once and cached for the header search
let searchIndexCache;
async function loadSearchIndex() {
  if (searchIndexCache) return searchIndexCache;
  try {
    const resp = await fetch('/query-index.json?limit=5000');
    const json = await resp.json();
    searchIndexCache = Array.isArray(json.data) ? json.data : [];
  } catch (e) {
    searchIndexCache = [];
  }
  return searchIndexCache;
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// escape + wrap case-insensitive matches of `q` in <mark>
function highlightMatch(text, q) {
  const src = text || '';
  if (!q) return escapeHtml(src);
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
  let out = '';
  let last = 0;
  let m = re.exec(src);
  while (m) {
    if (m.index === re.lastIndex) { re.lastIndex += 1; m = re.exec(src); continue; }
    out += `${escapeHtml(src.slice(last, m.index))}<mark>${escapeHtml(m[0])}</mark>`;
    last = m.index + m[0].length;
    m = re.exec(src);
  }
  return out + escapeHtml(src.slice(last));
}

/**
 * Turns the "Search" tool link into a live search box backed by /query-index.json.
 * @param {Element} nav the decorated nav element
 */
function decorateSearch(nav) {
  const tools = nav.querySelector('.nav-tools');
  if (!tools) return;
  const searchLink = [...tools.querySelectorAll('a')].find(
    (a) => /(^|\/)search(\/|$)/i.test(a.getAttribute('href') || '')
      || a.textContent.trim().toLowerCase() === 'search',
  );
  if (!searchLink) return;

  const box = document.createElement('div');
  box.className = 'nav-search';
  box.innerHTML = `
    <input type="search" class="nav-search-input" placeholder="Search DuPont" aria-label="Search" hidden>
    <div class="nav-search-results" role="listbox" hidden></div>`;
  const input = box.querySelector('.nav-search-input');
  const results = box.querySelector('.nav-search-results');
  searchLink.after(box);

  let active = -1; // index of keyboard-highlighted result

  const setActive = (i) => {
    const opts = [...results.querySelectorAll('.nav-search-result')];
    active = i;
    opts.forEach((el, n) => el.classList.toggle('active', n === active));
    if (opts[active]) opts[active].scrollIntoView({ block: 'nearest' });
  };

  const render = (items, q) => {
    active = -1;
    if (!q) { results.hidden = true; results.innerHTML = ''; return; }
    if (!items.length) {
      results.innerHTML = `<p class="nav-search-empty">No results for “${escapeHtml(q)}”</p>`;
    } else {
      results.innerHTML = items.map((r) => `<a class="nav-search-result" href="${escapeHtml(r.path)}">
        <span class="nav-search-title">${highlightMatch(r.title || r.path, q)}</span>
        ${r.description ? `<span class="nav-search-desc">${highlightMatch(r.description, q)}</span>` : ''}
      </a>`).join('');
    }
    results.hidden = false;
  };

  let debounce;
  const doSearch = async () => {
    const q = input.value.trim();
    if (!q) { render([], ''); return; }
    const data = await loadSearchIndex();
    const needle = q.toLowerCase();
    const matches = data.filter((r) => `${r.title || ''} ${r.description || ''} ${r.path || ''}`
      .toLowerCase().includes(needle)).slice(0, 10);
    render(matches, q);
  };

  const goToResults = () => {
    const q = input.value.trim();
    if (q) window.location.href = `/search?q=${encodeURIComponent(q)}`;
  };

  input.addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(doSearch, 180); });
  input.addEventListener('keydown', (e) => {
    const opts = [...results.querySelectorAll('.nav-search-result')];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (opts.length) setActive((active + 1) % opts.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (opts.length) setActive((active - 1 + opts.length) % opts.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(debounce);
      if (active >= 0 && opts[active]) opts[active].click();
      else goToResults();
    } else if (e.key === 'Escape') {
      input.hidden = true;
      results.hidden = true;
    }
  });

  searchLink.addEventListener('click', (e) => {
    e.preventDefault();
    const willShow = input.hidden;
    input.hidden = !willShow;
    if (willShow) { input.focus(); loadSearchIndex(); } else { results.hidden = true; }
  });

  document.addEventListener('click', (e) => {
    if (!box.contains(e.target) && e.target !== searchLink) {
      input.hidden = true;
      results.hidden = true;
    }
  });
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const classes = ['brand', 'sections', 'tools'];
  classes.forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  // tag with a brand variant class derived from the nav fragment
  // (e.g. /nav-water -> "nav-variant-water") so a section can be styled distinctly
  const navName = navPath.split('/').pop();
  if (navName && navName !== 'nav' && navName.startsWith('nav-')) {
    const variant = `nav-variant-${navName.slice('nav-'.length)}`;
    nav.classList.add(variant);
    block.classList.add(variant);
  }

  // optional top utility bar: a 4th authored section becomes a full-width
  // strip rendered above the main nav row (see navWrapper assembly below)
  const navTop = nav.children[3];
  if (navTop) navTop.classList.add('nav-top');

  // enable the header search box (backed by /query-index.json)
  decorateSearch(nav);

  const navBrand = nav.querySelector('.nav-brand');
  const brandLink = navBrand.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container').className = '';
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.querySelectorAll(':scope .default-content-wrapper > ul > li').forEach((navSection) => {
      if (navSection.querySelector('ul')) navSection.classList.add('nav-drop');
      navSection.addEventListener('click', () => {
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
      if (navSection.classList.contains('nav-drop')) {
        let closeTimer = null;
        const open = () => {
          if (!isDesktop.matches) return;
          clearTimeout(closeTimer);
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', 'true');
        };
        const scheduleClose = () => {
          if (!isDesktop.matches) return;
          clearTimeout(closeTimer);
          closeTimer = setTimeout(() => navSection.setAttribute('aria-expanded', 'false'), 200);
        };
        navSection.addEventListener('mouseenter', open);
        navSection.addEventListener('mouseleave', scheduleClose);
        const dropPanel = navSection.querySelector('ul');
        if (dropPanel) {
          dropPanel.addEventListener('mouseenter', open);
          dropPanel.addEventListener('mouseleave', scheduleClose);
        }
      }
    });
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  if (navTop) navWrapper.append(navTop); // full-width strip above the nav
  navWrapper.append(nav);
  block.append(navWrapper);
}
