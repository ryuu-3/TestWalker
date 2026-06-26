/*
 * TestWalker i18n engine
 * - Language dictionaries register themselves via TW_I18N.register(lang, dict)
 *   (loaded as plain <script> so it works under file:// without fetch/CORS).
 * - t(key, vars) returns a translated string; {var} tokens are interpolated.
 * - apply(root) localizes static markup via data-i18n* attributes:
 *     data-i18n        -> textContent
 *     data-i18n-html   -> innerHTML
 *     data-i18n-ph     -> placeholder attribute
 *     data-i18n-title  -> title attribute
 */
window.TW_I18N = (function () {
  "use strict";

  const STORAGE_KEY = "testwalker:lang";
  const FALLBACK = "en";
  const dicts = {};
  const meta = {};            // lang -> display name (from dict.__name__)
  let current = "ja";

  function register(lang, dict) {
    dicts[lang] = dict;
    meta[lang] = (dict && dict.__name__) || lang;
  }

  function has(lang) { return Object.prototype.hasOwnProperty.call(dicts, lang); }

  function langs() {
    return Object.keys(dicts).map(code => ({ code, name: meta[code] }));
  }

  function getLang() { return current; }

  function setLang(lang) {
    if (has(lang)) current = lang;
    try { localStorage.setItem(STORAGE_KEY, current); } catch (e) {}
    return current;
  }

  function t(key, vars) {
    let s = dicts[current] && dicts[current][key];
    if (s == null) s = dicts[FALLBACK] && dicts[FALLBACK][key];
    if (s == null) s = key;
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, (m, k) =>
        Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m);
    }
    return s;
  }

  function apply(root) {
    const r = root || document;
    r.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.getAttribute("data-i18n")); });
    r.querySelectorAll("[data-i18n-html]").forEach(el => { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
    r.querySelectorAll("[data-i18n-ph]").forEach(el => { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
    r.querySelectorAll("[data-i18n-title]").forEach(el => { el.setAttribute("title", t(el.getAttribute("data-i18n-title"))); });
    document.documentElement.lang = current;
  }

  // Resolve initial language: saved choice > browser language > first registered.
  function init() {
    let chosen = null;
    try { chosen = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (!chosen || !has(chosen)) {
      const nav = (navigator.language || navigator.userLanguage || "").slice(0, 2).toLowerCase();
      chosen = has(nav) ? nav : (has("ja") ? "ja" : Object.keys(dicts)[0]);
    }
    current = chosen || "ja";
    return current;
  }

  return { register, setLang, getLang, langs, has, t, apply, init };
})();
