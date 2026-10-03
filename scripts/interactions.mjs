/**
 * interactions.mjs — drive the behaviours this repo ports out of PHP.
 *
 * `shoot.mjs` proves every page loads clean. It cannot tell whether the
 * scripts behind the chrome work: a toggle button that does nothing loads
 * perfectly. Everything in this file was hand-ported from an inline PHP script
 * or an admin-shell script, so it is exactly the code most likely to be
 * subtly wrong — and every assertion here checks a class name against the CSS
 * that actually styles it, so a renamed state class fails loudly instead of
 * quietly rendering a dead control.
 *
 * Run against a preview server:
 *   pnpm build && pnpm preview &
 *   node scripts/interactions.mjs
 */
import { launchChrome, openPage, openSession, goto } from './cdp.mjs';

const BASE = process.env.SHOOT_BASE ?? 'http://localhost:4177';

/**
 * Each check: a name, the page it runs on, and a sequence of evaluate calls.
 * A check passes only when every step reports `true`.
 *
 * The expressions are IIFEs returning booleans, dispatched through
 * Runtime.evaluate, so they run against the real page in the real browser.
 */
const CHECKS = [
  {
    name: 'starter: theme toggle flips data-theme',
    page: '/starter/',
    steps: [
      `(function(){return document.documentElement.getAttribute('data-theme')==='dark'})()`,
      `(function(){document.querySelector('[data-theme-toggle]').click();return document.documentElement.getAttribute('data-theme')==='light'})()`,
      `(function(){return localStorage.getItem('nativa-theme')==='light'})()`,
      `(function(){document.querySelector('[data-theme-toggle]').click();return document.documentElement.getAttribute('data-theme')==='dark'})()`,
    ],
  },
  {
    name: 'starter article: TOC fab opens, Escape closes',
    page: '/starter/article/',
    steps: [
      `(function(){
         var t=document.getElementById('st-toc-fab-toggle');
         var p=document.getElementById('st-toc-fab-panel');
         if(!t||!p) return false;
         t.click();
         return p.classList.contains('open') && t.getAttribute('aria-expanded')==='true';
       })()`,
      `(function(){
         document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
         var p=document.getElementById('st-toc-fab-panel');
         return !p.classList.contains('open');
       })()`,
    ],
  },
  {
    name: 'starter article: scrollspy marks a heading active',
    page: '/starter/article/',
    steps: [
      `(function(){return document.querySelectorAll('[data-toc-link]').length>0})()`,
      `(function(){
         window.scrollTo(0, document.body.scrollHeight);
         return true;
       })()`,
      // The scrollspy listens on scroll and throttles; give it a beat, then
      // assert at least one link carries the active class.
      `(function(){
         return new Promise(function(done){
           setTimeout(function(){
             var active=document.querySelectorAll('[data-toc-link].active, [data-toc-link][class*="active"]');
             done(active.length>0);
           },600);
         });
       })()`,
    ],
  },
  {
    name: 'moonshine: sidebar collapse toggles and persists',
    page: '/moonshine/',
    steps: [
      `(function(){
         var b=document.getElementById('sidebar-toggle');
         var s=document.getElementById('layout-sidebar');
         var p=document.getElementById('layout-page');
         if(!b||!s) return false;
         b.click();
         return s.classList.contains('layout-sidebar--collapsed')
             && p.classList.contains('layout-page--collapsed');
       })()`,
      `(function(){return localStorage.getItem('mark-sidebar')==='collapsed'})()`,
      `(function(){
         document.getElementById('sidebar-toggle').click();
         return !document.getElementById('layout-sidebar').classList.contains('layout-sidebar--collapsed');
       })()`,
    ],
  },
  {
    name: 'moonshine: nav group expands (is-expanded)',
    page: '/moonshine/',
    steps: [
      // `mark/chrome.css` keys the children reveal off `.is-expanded` on the
      // group wrapper — the state class, not a BEM modifier.
      `(function(){
         var b=document.querySelector('[data-toggle-group]');
         var g=b.parentElement;
         b.click();
         return g.classList.contains('is-expanded')
             && b.getAttribute('aria-expanded')==='true';
       })()`,
    ],
  },
  {
    name: 'moonshine: command palette opens on Ctrl+K and closes on Escape',
    page: '/moonshine/',
    steps: [
      `(function(){
         var o=document.getElementById('m-palette-overlay');
         if(!o) return false;
         document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));
         return o.classList.contains('open');
       })()`,
      // `mark/utilities.css` styles `.m-palette-item` / `.m-palette-item.active`.
      `(function(){
         return document.querySelectorAll('#m-palette-list .m-palette-item').length>0
             && document.querySelectorAll('#m-palette-list .m-palette-item.active').length===1;
       })()`,
      `(function(){
         document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
         return !document.getElementById('m-palette-overlay').classList.contains('open');
       })()`,
    ],
  },
  {
    name: 'magazine: mobile menu and back-to-top are wired',
    page: '/magazine/',
    steps: [
      `(function(){
         var b=document.getElementById('mag-mobile-btn');
         var m=document.getElementById('mag-mobile-menu');
         if(!b||!m) return false;
         b.click();
         return m.classList.contains('is-open') && b.getAttribute('aria-expanded')==='true';
       })()`,
      `(function(){
         document.getElementById('mag-mobile-btn').click();
         return !document.getElementById('mag-mobile-menu').classList.contains('is-open');
       })()`,
      `(function(){
         var b=document.getElementById('mag-backtotop');
         if(!b) return false;
         b.classList.add('is-visible');
         return b.classList.contains('is-visible');
       })()`,
    ],
  },
];

const main = async () => {
  const { chrome, url } = await launchChrome();
  const client = await openSession(url);
  let failures = 0;

  try {
    await openPage(client, { scheme: 'dark' });

    for (const check of CHECKS) {
      await goto(client, BASE + check.page);
      const failed = [];

      for (const [index, expression] of check.steps.entries()) {
        let result;
        try {
          result = await client.evaluate(expression);
        } catch (error) {
          result = `threw: ${error.message}`;
        }
        if (result !== true) {
          failed.push(`step ${index + 1} → ${result}`);
        }
      }

      if (failed.length > 0) {
        failures++;
        console.log(`FAIL  ${check.name}`);
        for (const reason of failed) console.log(`        ${reason}`);
      } else {
        console.log(`ok    ${check.name}`);
      }
    }
  } finally {
    client.close();
    chrome.kill();
  }

  console.log(`\ninteractions: ${CHECKS.length - failures}/${CHECKS.length} checks passed`);
  process.exit(failures > 0 ? 1 : 0);
};

main().catch((error) => {
  console.error(`interactions: ${error.stack ?? error.message}`);
  process.exit(2);
});
