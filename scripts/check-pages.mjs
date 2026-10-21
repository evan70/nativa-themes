/**
 * check-pages.mjs — check the DEPLOYED gallery, not the build directory.
 *
 * `shoot.mjs` proves the pages work on a laptop. This proves the bytes that
 * GitHub Pages serves are the same pages: every URL in `pages.mjs` must answer
 * 200, be HTML, and still contain its theme's marker (`expect`) — the three
 * symptoms of a deploy that published the wrong directory, an old commit, or a
 * base path that moved.
 *
 *   node scripts/check-pages.mjs https://evan70.github.io/nativa-themes
 *   node scripts/check-pages.mjs https://evan70.github.io/nativa-themes --dist dist
 *   node scripts/check-pages.mjs --dist dist        # structure only, no network
 *
 * `--dist` also asserts the local build contains exactly the pages this list
 * names, so adding a page to `vite.config.ts` and forgetting this list fails
 * here rather than shipping unverified.
 *
 * Exit 0 only when every page passes; failures print the URL and the reason.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES } from './pages.mjs';

const args = process.argv.slice(2);
const base = (args.find((arg) => arg.startsWith('http')) ?? '').replace(/\/$/, '');
const distAt = args.indexOf('--dist');
const dist = distAt === -1 ? null : (args[distAt + 1] ?? 'dist');
const timeoutMs = 15000;

const fail = (message) => {
  console.error(`check-pages: ${message}`);
  process.exitCode = 1;
};

if (!base && null === dist) {
  fail('usage: node scripts/check-pages.mjs <base-url> [--dist dist]');
  process.exit(1);
}

const fetchPages = '' !== base;

/** Every index.html under a directory, relative to it. */
const pagesIn = (root, prefix = '') => {
  if (!existsSync(root)) return [];
  const found = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    if (statSync(full).isDirectory()) {
      found.push(...pagesIn(full, `${prefix}${entry}/`));
    } else if (entry === 'index.html') {
      found.push(`${prefix}index.html`);
    }
  }
  return found;
};

if (null !== dist) {
  const built = pagesIn(dist).sort();
  const listed = PAGES.map((page) => (
    page.url === '/' ? 'index.html' : `${page.url.replace(/^\//, '')}index.html`
  )).sort();

  const unlisted = built.filter((page) => !listed.includes(page));
  const missing = listed.filter((page) => !built.includes(page));

  if (unlisted.length > 0) {
    fail(`built but not checked: ${unlisted.join(', ')} — add them to scripts/pages.mjs`);
  }
  if (missing.length > 0) {
    fail(`checked but not built: ${missing.join(', ')} — the build is missing a page`);
  }

  console.log(`dist: ${built.length} built, ${listed.length} listed`);
}

let failures = 0;

if (!fetchPages) {
  console.log('check-pages: --dist only, nothing to fetch');
}

for (const page of fetchPages ? PAGES : []) {
  const url = `${base}${page.url}`;

  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
    const body = await response.text();
    const type = response.headers.get('content-type') ?? '';
    const problems = [];

    if (200 !== response.status) problems.push(`HTTP ${response.status}`);
    if (!type.includes('text/html')) problems.push(`content-type ${type || '(none)'}`);
    if (!body.includes(page.expect)) problems.push(`no ${page.expect} in the served HTML`);

    if (problems.length > 0) {
      failures++;
      console.error(`FAIL  ${page.name.padEnd(20)} ${url}`);
      for (const problem of problems) console.error(`        ${problem}`);
    } else {
      console.log(`ok    ${page.name.padEnd(20)} ${url}`);
    }
  } catch (error) {
    failures++;
    console.error(`FAIL  ${page.name.padEnd(20)} ${url}`);
    console.error(`        ${error.message}`);
  }
}

console.log(fetchPages
  ? `\ncheck-pages: ${PAGES.length - failures}/${PAGES.length} pages served`
  : `\ncheck-pages: ${PAGES.length} pages listed, no URL fetched`);
// A structural failure (built vs listed) set the exit code earlier; it must not
// be overwritten by the network tally, which only counts fetched pages.
process.exit(0 === failures && 0 === (process.exitCode ?? 0) ? 0 : 1);
