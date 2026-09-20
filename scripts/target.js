import { decorateBlock, getMetadata, loadBlock } from './aem.js';

/** AEM Universal Editor iframe; skip Target so at.js does not fight UE/CSP. */
export function isUePreviewHost(hostname = window.location.hostname) {
  return /\.(?:stage-ue|ue)\.da\.live$/.test(hostname);
}

/**
 * @param {unknown} e
 * @param {Element} [el]
 */
function logTargetError(e, el) {
  // eslint-disable-next-line no-console
  console.error('[target]', e, el);
}

/**
 * Target offers are injected as raw HTML, so EDS block decoration never runs on
 * them. Find the block roots in freshly injected content and decorate + load
 * them the same way `decorateBlocks`/`loadBlock` would for authored content.
 *
 * `decorateBlocks` is not usable here because it only matches
 * `div.section > div > div`, and injected offer content has no `.section`
 * ancestor.
 * @param {Element} [container] element whose innerHTML was just replaced
 * @returns {Promise<void>}
 */
export async function decorateOfferContent(container) {
  if (!container || typeof container.querySelectorAll !== 'function') return;

  const candidates = [...container.querySelectorAll('div[class]')].filter((el) => {
    const blockName = el.classList[0];
    if (!blockName) return false;
    if (el.classList.contains('block')) return false;
    if (blockName === 'section' || blockName.endsWith('-wrapper')) return false;
    // decorateBlock writes to block.parentElement without a null check.
    return !!el.parentElement;
  });

  // Never decorate a block nested inside another block: the inner divs of an
  // offer's hero are content, not blocks of their own.
  const roots = candidates.filter((el) => {
    if (candidates.some((other) => other !== el && other.contains(el))) return false;
    return !el.parentElement.closest('.block');
  });

  await Promise.all(roots.map(async (el) => {
    try {
      decorateBlock(el);
      await loadBlock(el);
    } catch (e) {
      logTargetError(e, el);
    }
  }));
}

export async function loadTarget() {
  if (isUePreviewHost()) return;
  const targetMeta = getMetadata('target');
  if (!targetMeta) return;

  const serverDomain = getMetadata('target-server-domain')?.trim();
  window.targetGlobalSettings = {
    secureOnly: true,
    overrideMboxEdgeServer: false,
    ...(serverDomain ? { serverDomain } : {}),
  };

  try {
    await import('../deps/at/at.js');
    const pageLoadRequest = { execute: { pageLoad: {} } };
    const offers = await window.adobe.target.getOffers({
      request: pageLoadRequest,
    });

    if (typeof window.adobe.target.applyOffers === 'function') {
      await window.adobe.target.applyOffers({
        request: pageLoadRequest,
        response: offers,
      });
    } else {
      const options = offers?.execute?.pageLoad?.options || [];
      await Promise.all(options.map(async (opt) => {
        const payload = opt?.content?.[0];
        if (!payload) return;
        const { cssSelector, content } = payload;
        if (!cssSelector || content == null) return;
        const el = document.querySelector(cssSelector);
        if (!el) return;
        // outerHTML replaces the node, so decorate from the surviving parent.
        const parent = el.parentElement;
        el.outerHTML = content;
        await decorateOfferContent(parent);
      }));
    }
  } catch (e) {
    logTargetError(e, document.body);
  }
}

/**
 * at.js getOffer responses come back in several shapes: a bare array of
 * actions, or an object wrapping them under `actions`.
 * @param {unknown} offers
 * @returns {Array<Record<string, unknown>>}
 */
function toTargetActions(offers) {
  if (Array.isArray(offers)) return offers.filter((a) => a && typeof a === 'object');
  if (offers && typeof offers === 'object' && Array.isArray(offers.actions)) {
    return offers.actions.filter((a) => a && typeof a === 'object');
  }
  return [];
}

/**
 * Fallback renderer for action-form offers when applyOffer does not paint.
 * Only handles `setContent` against the already matched element.
 * @param {Element} el
 * @param {unknown} offers
 * @returns {Promise<boolean>} whether content was applied
 */
async function applySetContentActions(el, offers) {
  const actions = toTargetActions(offers);
  let applied = false;
  actions.forEach((action) => {
    if (action.action !== 'setContent' || typeof action.content !== 'string') return;
    // Content originates from the Target delivery response for this mbox.
    el.innerHTML = action.content;
    applied = true;
  });
  if (applied) await decorateOfferContent(el);
  return applied;
}

/**
 * Legacy mbox flow (getOffer + applyOffer). Runs after blocks render.
 * Opt-in via meta target-mbox-hero and optional target-mbox-hero-selector.
 */
export async function applyTargetHeroMboxIfConfigured() {
  if (isUePreviewHost()) return;
  const mbox = getMetadata('target-mbox-hero')?.trim();
  if (!mbox) return;

  const selectorList = (getMetadata('target-mbox-hero-selector')?.trim()
    || '.hero-promo, .hero.block .hero-inner')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const t = window.adobe?.target;
  if (!t?.getOffer || !t?.applyOffer) return;

  const resolveSelector = () => {
    for (let i = 0; i < selectorList.length; i += 1) {
      const el = document.querySelector(selectorList[i]);
      if (el) return { el, selector: selectorList[i] };
    }
    return null;
  };

  await new Promise((resolve) => {
    t.getOffer({
      mbox,
      success(offers) {
        const match = resolveSelector();
        if (!match) {
          resolve();
          return;
        }
        try {
          t.applyOffer({ mbox, selector: match.selector, offer: offers });
        } catch (e) {
          logTargetError(e, match.el);
        }
        // applyOffer silently ignores some action-form payloads; if the
        // target element is still empty, render setContent actions directly.
        const current = document.querySelector(match.selector) || match.el;
        if (current && !current.innerHTML.trim()) {
          applySetContentActions(current, offers).then(resolve, resolve);
          return;
        }
        resolve();
      },
      error: resolve,
    });
  });
}
