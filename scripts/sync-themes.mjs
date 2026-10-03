/**
 * sync-themes.mjs — copy the theme sources out of natura-minimal.
 *
 * The demo pages in `pages/` are hand-written, but their CSS and
 * TypeScript are NOT: they are the real theme sources, copied verbatim from
 * `Frontend/packages/<theme>/src/` so a demo page is styled by exactly the
 * stylesheet the running app ships.
 *
 * Run after every change to a theme upstream:
 *
 *   node scripts/sync-themes.mjs          # copy + report the diff
 *   node scripts/sync-themes.mjs --check  # exit 1 if the copy is stale
 *
 * Overridable with NATIVA_MINIMAL=/path/to/nativa-minimal.
 */
import { createHash } from 'node:crypto';
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');

/** Sibling checkout of the app that owns the real theme sources. */
const appRoot =
  process.env.NATIVA_MINIMAL ??
  resolve(repoRoot, '..', 'nativa-minimal');

/**
 * Every copy is a directory or a single file, addressed from the app root.
 * `themes/<name>` mirrors `Frontend/packages/<name>/src`, so the demo pages
 * import the same relative paths the upstream build does.
 */
const COPIES = [
  // Only what this repo actually uses. `vite-theme-factory.ts` is the app's
  // own per-package config (it writes to public/dist/<theme>/ and resolves the
  // PHP manifest keys) and is meaningless here, so it is deliberately absent:
  // an unused copied file that looks load-bearing is worse than no file.
  'Frontend/packages/build/strip-at-layer.ts',
  'Frontend/packages/starter/src',
  'Frontend/packages/erik/src',
  'Frontend/packages/magazine/src',
  'Frontend/packages/moonshine/src',
  'public/images/erik-hero-underlay.webp',
  // NOTE: `public/fonts/mark` is deliberately NOT copied. Gilroy is a
  // commercial font (Indian Type Foundry) and this repository is public, so
  // redistributing the woff2 files is not ours to decide. The theme CSS
  // still declares its `@font-face` — it has to stay a verbatim copy — so
  // `public/fonts/demo-font-substitute.css` redeclares the same family with a
  // `local()` src and the browser never requests the file.
];

const fail = (message) => {
  console.error(`sync-themes: ${message}`);
  process.exit(1);
};

if (!existsSync(join(appRoot, 'Frontend', 'packages', 'starter', 'src'))) {
  // `--check` cannot check anything without the sources, and CI does not
  // have them: natura-minimal is a private repository, so a fresh runner
  // never has a sibling checkout. Failing here would train people to ignore
  // the gate. Report it as skipped and let the local run be the real gate.
  if (check) {
    console.warn(
      `sync-themes: --check skipped — no theme sources at "${appRoot}".\n` +
        'The freshness gate only runs where natura-minimal is checked out.',
    );
    process.exit(0);
  }

  fail(
    `cannot find the theme sources in "${appRoot}".\n` +
      'Clone natura-minimal next to this repo, or set NATIVA_MINIMAL=/path/to/nativa-minimal.',
  );
}

/** Destination for one app-relative path, mirroring the app layout under `src/`. */
const destination = (relativePath) => {
  if (relativePath.startsWith('Frontend/packages/build/')) {
    return join(repoRoot, 'build', relativePath.slice('Frontend/packages/build/'.length));
  }
  if (relativePath.startsWith('Frontend/packages/')) {
    return join(
      repoRoot,
      'src',
      relativePath.slice('Frontend/packages/'.length).replace('/src', ''),
    );
  }
  return join(repoRoot, 'public', relativePath.slice('public/'.length));
};

/**
 * Content hash of a file or directory tree. `--check` has to notice an edit
 * inside `src/erik/erik/tokens.css`, so the fingerprint walks every file and
 * hashes the bytes plus each path — not just the top-level listing.
 */
const fingerprint = (path) => {
  const hash = createHash('sha256');

  if (!statSync(path).isDirectory()) {
    hash.update(readFileSync(path));
    return hash.digest('hex');
  }

  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort()) {
      const full = join(current, entry.name);
      hash.update(entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        hash.update(readFileSync(full));
      }
    }
  };

  walk(path);

  return hash.digest('hex');
};

const stale = [];

for (const relativePath of COPIES) {
  const from = join(appRoot, relativePath);
  const to = destination(relativePath);

  if (!existsSync(from)) {
    console.warn(`sync-themes: skipped missing ${relativePath}`);
    continue;
  }

  if (check) {
    if (!existsSync(to) || fingerprint(to) !== fingerprint(from)) {
      stale.push(relativePath);
    }
  } else {
    rmSync(to, { recursive: true, force: true });
    cpSync(from, to, { recursive: true });
  }

  console.log(
    `${check ? 'checked' : 'copied'}  ${relative(appRoot, from)} → ${relative(repoRoot, to)}`,
  );
}

if (check && stale.length > 0) {
  fail(`stale copies — run "node scripts/sync-themes.mjs":\n  ${stale.join('\n  ')}`);
}

console.log(`\nsync-themes: ${COPIES.length} entries from ${appRoot}`);
