/**
 * vite-strip-commercial-fonts.ts — keep the Gilroy woff2 files out of a
 * public build, without editing a single byte of the theme sources.
 *
 * The erik and moonshine stylesheets declare:
 *
 *   @font-face { font-family:'Gilroy'; src:url(/fonts/mark/Gilroy-*.woff2) }
 *
 * Gilroy is a commercial font (Indian Type Foundry / Emil Szymanek). Copying
 * those woff2 files into a PUBLIC repository is a redistribution decision that
 * is not ours to make, so `scripts/sync-themes.mjs` deliberately does not copy
 * them.
 *
 * The theme CSS has to stay a byte-identical copy of the app's, so its
 * `@font-face` rules stay in `src/`. This plugin removes them from the EMITTED
 * asset instead — the same pattern as `strip-at-layer`, which rewrites the
 * built CSS without touching the sources. Removing the rule outright (rather
 * than overriding it with a `local()` substitute) is deterministic: a declared
 * `@font-face` is always fetched, and which of two same-family rules wins
 * depends on stylesheet order that Vite does not guarantee across chunks.
 *
 * With the rule gone, the themes' own font stacks fall through to their system
 * alternatives — erik's `font-family: Gilroy, system-ui, …` and the admin's
 * `--m-font: 'Gilroy', -apple-system, …`. Layout, spacing and colour are
 * untouched; only the typeface differs from the shipped theme.
 *
 * `pnpm run shoot` is the proof: while the files were absent and the rules
 * present, every erik and moonshine page reported an HTTP 404 for
 * `/fonts/mark/Gilroy-*.woff2`.
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import type { Plugin } from 'vite';

/** Any `@font-face` whose `src` points at this directory gets dropped. */
const FONT_DIR = '/fonts/mark/';

/**
 * `@font-face` blocks contain nested `{ }` inside `src: local(...)` fallbacks,
 * so match to the matching brace rather than to the first `}`.
 */
const fontFaceBlocks = (css: string): string[] => {
  const blocks: string[] = [];
  const marker = '@font-face';
  let from = 0;

  for (;;) {
    const start = css.indexOf(marker, from);
    if (start === -1) break;

    const open = css.indexOf('{', start);
    if (open === -1) break;

    let depth = 0;
    let i = open;
    for (; i < css.length; i++) {
      if (css[i] === '{') depth++;
      if (css[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }

    blocks.push(css.slice(start, i + 1));
    from = i + 1;
  }

  return blocks;
};

/** Every `.css` file under a directory. */
const cssFiles = (dir: string): string[] => {
  const found: string[] = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...cssFiles(full));
    else if (extname(entry.name) === '.css') found.push(full);
  }
  return found;
};

/**
 * Drop the commercial `@font-face` rules from a stylesheet.
 *
 * Exported for the check in `RULES.md` to describe; the plugin is the only
 * caller that matters.
 */
export const stripCommercialFontFaces = (css: string): string => {
  if (!css.includes('@font-face') || !css.includes(FONT_DIR)) return css;

  const doomed = fontFaceBlocks(css).filter((block) => block.includes(FONT_DIR));
  if (doomed.length === 0) return css;

  let result = css;
  for (const block of doomed) result = result.replace(block, '');

  return result.replace(/\n{3,}/g, '\n\n');
};

export const stripCommercialFontsPlugin = (outDir: string): Plugin => ({
  name: 'strip-commercial-fonts',
  // closeBundle, not generateBundle: every emitted CSS file is on disk by then,
  // and this is where strip-at-layer runs too.
  closeBundle() {
    let removed = 0;

    for (const file of cssFiles(outDir)) {
      const original = readFileSync(file, 'utf-8');
      const stripped = stripCommercialFontFaces(original);
      if (stripped === original) continue;
      writeFileSync(file, stripped, 'utf-8');
      removed++;
    }

    if (removed > 0) {
      this.warn(
        `strip-commercial-fonts: removed ${FONT_DIR} @font-face rules from ${removed} CSS file(s) — ` +
          'those fonts are not redistributed by this repository',
      );
    }
  },
});
