/**
 * toc-fab.js — the starter theme's mobile "On this page" button.
 *
 * Ported from the inline script the PHP theme emits behind a CSP nonce
 * (`StarterRenderer::tocFab`). It ships as a file here because these pages
 * have no CSP header to satisfy, but the behaviour is byte-for-byte the same:
 * toggle the panel, close on outside click, close on link click, Escape closes
 * and returns focus to the button.
 */
(function () {
  var fab = document.getElementById('st-toc-fab');
  var toggle = document.getElementById('st-toc-fab-toggle');
  var panel = document.getElementById('st-toc-fab-panel');
  if (!fab || !toggle || !panel) return;

  function open() {
    toggle.classList.add('open');
    panel.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
  }

  function close() {
    toggle.classList.remove('open');
    panel.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', function () {
    if (toggle.classList.contains('open')) close();
    else open();
  });

  panel.addEventListener('click', function (event) {
    if (event.target && event.target.tagName === 'A') close();
  });

  document.addEventListener('click', function (event) {
    if (!fab.contains(event.target)) close();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      close();
      toggle.focus();
    }
  });
})();
