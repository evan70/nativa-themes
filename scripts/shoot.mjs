/**
 * shoot.mjs — load every page in headless Chrome and report what broke.
 *
 * A build that succeeds can still ship a gallery with 404 stylesheets, a font
 * that never loaded or a console error, and none of that shows up in
 * `vite build`. This walks the pages over CDP and fails on:
 *
 *   - a request that came back 404 (or any other error status),
 *   - a console error or an uncaught exception,
 *   - a page with no stylesheet, or no theme token on :root — which is how
 *     "the stylesheet never landed" shows up without guessing at colours
 *     (the starter theme's light background really is #ffffff).
 *
 * The behaviours that were ported out of PHP are checked separately, by
 * `interactions.mjs`.
 *
 * Usage:
 *   node scripts/shoot.mjs                       # check every page
 *   node scripts/shoot.mjs --shots --out shots   # also write PNGs
 *   node scripts/shoot.mjs --only starter        # one theme
 *   node scripts/shoot.mjs --scheme light        # force a colour scheme
 *   node scripts/shoot.mjs --width 390 --height 844
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { goto, launchChrome, openPage, openSession } from './cdp.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.SHOOT_BASE ?? 'http://localhost:4177';

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => {
  const at = argv.indexOf(name);
  return at === -1 || at === argv.length - 1 ? fallback : argv[at + 1];
};

const shots = flag('--shots');
const outDir = resolve(repoRoot, opt('--out', 'shots'));
const scheme = opt('--scheme', 'dark');
const only = opt('--only', null);
const width = Number(opt('--width', 0)) || undefined;
const height = Number(opt('--height', 0)) || undefined;

/** Every page the gallery publishes, in gallery order. */
const PAGES = [
  { name: 'gallery', url: '/' },
  { name: 'starter/home', url: '/starter/' },
  { name: 'starter/blog', url: '/starter/blog/' },
  { name: 'starter/article', url: '/starter/article/' },
  { name: 'starter/tags', url: '/starter/tags/' },
  { name: 'starter/author', url: '/starter/author/' },
  { name: 'erik/home', url: '/erik/' },
  { name: 'erik/blog', url: '/erik/blog/' },
  { name: 'erik/article', url: '/erik/article/' },
  { name: 'erik/tags', url: '/erik/tags/' },
  { name: 'erik/author', url: '/erik/author/' },
  { name: 'magazine/home', url: '/magazine/' },
  { name: 'magazine/blog', url: '/magazine/blog/' },
  { name: 'magazine/article', url: '/magazine/article/' },
  { name: 'magazine/tags', url: '/magazine/tags/' },
  { name: 'magazine/author', url: '/magazine/author/' },
  { name: 'moonshine/admin', url: '/moonshine/' },
];

const targets = PAGES.filter((page) => !only || page.name.startsWith(only));

/**
 * One probe per page: proof the theme's own stylesheet applied, plus the
 * handful of layout numbers that catch an unstyled page.
 */
const PROBE = `JSON.stringify((function () {
  var root = getComputedStyle(document.documentElement);
  var tokens = ['--st-bg', '--er-bg', '--mag-accent', '--m-primary', '--gal-bg'];
  var found = [];
  for (var i = 0; i < tokens.length; i++) {
    var value = root.getPropertyValue(tokens[i]).trim();
    if (value !== '') found.push(tokens[i] + '=' + value);
  }
  return {
    text: (document.body.innerText || '').trim().length,
    bg: getComputedStyle(document.body).backgroundColor,
    sheet: document.styleSheets.length,
    tokens: found,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1
  };
})())`;

/** Problems this page reported, from the collected CDP events. */
const problemsFrom = (events) => {
  const problems = [];
  for (const { method, params } of events) {
    if (method === 'Network.loadingFailed' && !params.canceled) {
      problems.push(`request failed: ${params.errorText} (${params.type})`);
    }
    if (method === 'Network.responseReceived' && params.response.status >= 400) {
      problems.push(`HTTP ${params.response.status}: ${params.response.url}`);
    }
    if (method === 'Runtime.exceptionThrown') {
      const text =
        params.exceptionDetails?.exception?.description ??
        params.exceptionDetails?.text ??
        'unknown exception';
      problems.push(`uncaught: ${text.split('\n')[0]}`);
    }
    if (method === 'Log.entryAdded' && params.entry.level === 'error') {
      problems.push(`console: ${params.entry.text}`);
    }
  }
  return problems;
};

const main = async () => {
  const { chrome, url } = await launchChrome({ width: width ?? 1280, height: height ?? 900 });
  const client = await openSession(url);
  let failures = 0;

  try {
    await openPage(client, { scheme, width, height });

    for (const target of targets) {
      client.events.length = 0;
      await goto(client, BASE + target.url);

      const problems = problemsFrom(client.events);
      // evaluate() hands back the raw JSON string the page produced.
      const stats = JSON.parse(await client.evaluate(PROBE));

      if (stats.text < 40) problems.push(`suspiciously empty body (${stats.text} chars)`);
      if (stats.sheet === 0) problems.push('no stylesheet applied');
      if (stats.tokens.length === 0) {
        problems.push('no theme token on :root — the theme stylesheet did not apply');
      }
      if (stats.overflow) problems.push('horizontal overflow — layout breaks at this width');

      if (shots) {
        const shot = await client.send('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: true,
        });
        const file = resolve(outDir, `${target.name}.png`);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, Buffer.from(shot.data, 'base64'));
      }

      if (problems.length > 0) {
        failures++;
        console.log(`FAIL  ${target.name}  ${BASE}${target.url}`);
        for (const problem of [...new Set(problems)]) console.log(`        ${problem}`);
      } else {
        console.log(
          `ok    ${target.name.padEnd(18)} bg=${stats.bg} ${stats.tokens.join(' ')} text=${stats.text}`,
        );
      }
    }
  } finally {
    client.close();
    chrome.kill();
  }

  console.log(
    `\nshoot: ${targets.length - failures}/${targets.length} pages clean` +
      ` (scheme=${scheme}${width ? `, ${width}x${height}` : ''})` +
      (shots ? ` — screenshots in ${outDir}` : ''),
  );
  process.exit(failures > 0 ? 1 : 0);
};

main().catch((error) => {
  // `error.message` alone hid a real bug here once (a missing JSON.parse read
  // as "Cannot read properties of undefined"); print the stack so the next
  // one does not cost an afternoon.
  console.error(`shoot: ${error.stack ?? error.message}`);
  process.exit(2);
});
