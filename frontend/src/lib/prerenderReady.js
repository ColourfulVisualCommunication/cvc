/**
 * Tells the prerender script (scripts/prerender.js) that this page's data
 * has actually landed in the DOM. Puppeteer's networkidle0 alone isn't
 * enough here: parsing/executing the JS bundle takes long enough that the
 * idle-timer can already have elapsed before React even starts its own
 * fetch, so the page gets captured mid-loading-state instead of with real
 * content. Every public page calls this once it's done fetching (or
 * immediately, if it never fetches anything).
 */
export function markPrerenderReady() {
  if (typeof window !== "undefined") window.__PRERENDER_READY__ = true;
}
