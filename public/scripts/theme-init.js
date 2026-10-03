/**
 * theme-init.js — FOUC prevention, loaded as a BLOCKING script in <head>.
 *
 * Byte-equivalent to the app's `Modules/Core/.../assets/scripts/theme-init.js`
 * (and to the moonshine `theme-init.js`), which the PHP layout inlines behind
 * a CSP nonce. It must stay synchronous and blocking: a `type="module"` or
 * `defer` script runs after the first paint, which is exactly the flash this
 * exists to prevent.
 *
 * Chrome 70 baseline: no `?.`, no `??`, `var` throughout.
 */
(function () {
  try {
    var theme = localStorage.getItem('nativa-theme');
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    // Private mode blocks localStorage — dark is the safe default.
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
