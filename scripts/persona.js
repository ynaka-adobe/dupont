// Shared persona helpers for blocks that personalize or filter authored rows.
// head.html sets window.demoProfile from ?p= or the demoProfile cookie.

// A persona-filter cell holds nothing but persona tokens, e.g. "1", "1, 3", "2 4".
const FILTER_RE = /^[1-4](\s*[,\s]\s*[1-4])*$/;

// Valid demo personas are 1-4. Anything else (0, 7, 'abc', NaN) means
// "no persona", which shows unfiltered content rather than filtering
// every row away.
const VALID_PERSONA_RE = /^[1-4]$/;

/**
 * @returns {string} active persona id, or '' when no persona is active.
 * Invalid or out-of-range personas (e.g. ?p=0, ?p=9, ?p=abc) also return '',
 * so consumers fall back to showing unfiltered content.
 */
export function personaId() {
  const d = window.demoProfile || {};
  const raw = (d.persona !== undefined && d.persona !== null && d.persona !== '')
    ? String(d.persona)
    : (new URLSearchParams(window.location.search).get('p') || '');
  const trimmed = raw.trim();
  return VALID_PERSONA_RE.test(trimmed) ? trimmed : '';
}

/**
 * Finds the optional trailing persona-filter cell of a row.
 * Matched on content, not position, so it is never confused with an
 * authored copy column (e.g. the cards per-persona overrides cell).
 * @param {HTMLElement[]} cells candidate cells, in authored order
 * @returns {HTMLElement|null}
 */
export function findPersonaFilterCell(cells) {
  const last = cells[cells.length - 1];
  if (!last) return null;
  return FILTER_RE.test((last.textContent || '').trim()) ? last : null;
}

/**
 * @param {HTMLElement} cell persona-filter cell
 * @param {string} pid active persona id
 * @returns {boolean} whether the row should stay in the DOM
 */
export function matchesPersona(cell, pid) {
  // No active persona means no filtering at all — every row shows.
  if (!pid) return true;
  const tokens = (cell.textContent || '').trim().split(/[,\s]+/).filter(Boolean);
  // An empty cell is untagged, so it always shows.
  return tokens.length === 0 || tokens.includes(String(pid));
}
