/**
 * theme-toggle.js — the shared light/dark handler.
 *
 * Wires EVERY `[data-theme-toggle]` instance, not just the first: a theme
 * chrome may render the control more than once (moonshine puts one in the
 * sidebar foot and one in the topbar). A single-match handler left the second
 * control dead.
 *
 * Mirrors `Modules/Core/.../assets/scripts/theme-toggle.js` from the app.
 */
(function () {
  var btns = document.querySelectorAll('[data-theme-toggle]');
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      var html = document.documentElement;
      var next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      try {
        localStorage.setItem('nativa-theme', next);
      } catch (e) {
        // Persisting is best effort; the toggle still works for this page.
      }
    });
  }
})();
