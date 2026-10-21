/**
 * font-coverage.mjs — read the cmap out of a woff2 file and check that the
 * characters a page CLAIMS to render are really in the font.
 *
 * The gallery publishes a font-set page (`font-set/index.html`) that renders
 * the full Slovak and Czech charset in every face the gallery ships. That page
 * is a claim: "this font covers these letters". A claim in HTML is worth
 * nothing on its own, so this script reads the same `.woff2` bytes the browser
 * loads, extracts the cmap, and fails when a character on the page is not in
 * the font — the failure mode a re-subset produces, and the one a reader would
 * otherwise only notice as a fallback glyph mid-word.
 *
 *   node scripts/font-coverage.mjs                   # check font-set/index.html
 *   node scripts/font-coverage.mjs --file some.html  # check another page
 *   node scripts/font-coverage.mjs --list            # print coverage, no page
 *
 * A block is any element with `data-font="<file in public/fonts>"`; its text
 * content is the charset to verify. Exit 0 only when every character in every
 * block is in that font's cmap.
 *
 * ## Why the parser is here and not a dependency
 *
 * woff2 stores the table directory, then ONE brotli stream holding every
 * table's bytes back to back. Only `glyf`/`loca` are transformed; `cmap` is
 * stored as-is. Node ships brotli (`zlib.brotliDecompressSync`), so the whole
 * job is: parse the directory, decompress once, slice, parse cmap. No package,
 * no native build, and the script reads exactly the bytes the browser reads.
 */
import { brotliDecompressSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Read a UIntBase128 at `at`; returns [value, nextOffset]. */
const readBase128 = (buffer, at) => {
  let value = 0;

  for (let i = 0; i < 5; i++) {
    const byte = buffer[at + i];

    if (undefined === byte) throw new Error('truncated UIntBase128');

    // A leading 0x80 would be an over-long encoding — the spec forbids it.
    if (0 === i && 0x80 === byte) throw new Error('over-long UIntBase128');

    value = value * 128 + (byte & 0x7f);

    if (0 === (byte & 0x80)) return [value, at + i + 1];
  }

  throw new Error('UIntBase128 longer than 5 bytes');
};

const tagOf = (buffer, at) => buffer.toString('latin1', at, at + 4);

/**
 * Every table of a woff2 file, decompressed, keyed by tag.
 *
 * @returns {Map<string, Buffer>}
 */
export const woff2Tables = (buffer) => {
  if ('wOF2' !== buffer.toString('latin1', 0, 4)) {
    throw new Error('not a woff2 file');
  }

  const numTables = buffer.readUInt16BE(12);
  const totalCompressedSize = buffer.readUInt32BE(20);
  const entries = [];
  let at = 48;

  for (let i = 0; i < numTables; i++) {
    const flags = buffer[at];
    at += 1;

    const tag = 0x3f === (flags & 0x3f) ? (() => {
      const read = tagOf(buffer, at);
      at += 4;
      return read;
    })() : knownTag(flags & 0x3f);

    const [origLength, afterOrig] = readBase128(buffer, at);
    at = afterOrig;

    const transformVersion = flags >> 6;
    const isGlyfLoca = 'glyf' === tag || 'loca' === tag;
    // glyf/loca: version 0 IS the transform (3 means null). Everything else:
    // version 0 is the null transform. Only hmtx uses version 1.
    const transformed = isGlyfLoca ? 3 !== transformVersion : 0 !== transformVersion;
    let storedLength = origLength;

    if (transformed) {
      const [transformLength, afterTransform] = readBase128(buffer, at);
      at = afterTransform;
      storedLength = transformLength;
    }

    entries.push({ tag, length: storedLength });
  }

  const compressed = buffer.subarray(at, at + totalCompressedSize);
  const tables = brotliDecompressSync(compressed);
  const out = new Map();
  let offset = 0;

  for (const entry of entries) {
    out.set(entry.tag, tables.subarray(offset, offset + entry.length));
    offset += entry.length;
  }

  return out;
};

/**
 * The 63 tags woff2 may encode as a 6-bit index (spec, "Known Table Tags").
 * Index order is normative — it is not alphabetical.
 */
const KNOWN_TAGS = [
  'cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'cvt ', 'fpgm',
  'glyf', 'loca', 'prep', 'CFF ', 'VORG', 'EBDT', 'EBLC', 'gasp', 'hdmx', 'kern',
  'LTSH', 'PCLT', 'VDMX', 'vhea', 'vmtx', 'BASE', 'GDEF', 'GPOS', 'GSUB', 'EBSC',
  'JSTF', 'MATH', 'CBDT', 'CBLC', 'COLR', 'CPAL', 'SVG ', 'sbix', 'acnt', 'avar',
  'bdat', 'bloc', 'bsln', 'cvar', 'fdsc', 'feat', 'fmtx', 'fvar', 'gvar', 'hsty',
  'just', 'lcar', 'mort', 'morx', 'opbd', 'prop', 'trak', 'Zapf', 'Silf', 'Glat',
  'Gloc', 'Feat', 'Sill',
];

const knownTag = (index) => {
  const tag = KNOWN_TAGS[index];

  if (undefined === tag) throw new Error(`unknown woff2 tag index ${index}`);

  return tag;
};

/** Codepoints the font's cmap maps to a real glyph (format 4 and 12). */
export const cmapCodepoints = (cmap) => {
  const covered = new Set();
  const count = cmap.readUInt16BE(2);

  for (let i = 0; i < count; i++) {
    const record = 4 + i * 8;
    const platform = cmap.readUInt16BE(record);
    const encoding = cmap.readUInt16BE(record + 2);
    const offset = cmap.readUInt32BE(record + 4);
    const format = cmap.readUInt16BE(offset);

    // Unicode subtables only: (3,1) BMP, (3,10) full, (0,*) Unicode.
    const unicode = 0 === platform || (3 === platform && (1 === encoding || 10 === encoding));

    if (!unicode) continue;

    if (4 === format) {
      const segCount = cmap.readUInt16BE(offset + 6) / 2;
      const endAt = offset + 14;
      const startAt = endAt + segCount * 2 + 2;
      const deltaAt = startAt + segCount * 2;
      const rangeAt = deltaAt + segCount * 2;

      for (let seg = 0; seg < segCount; seg++) {
        const end = cmap.readUInt16BE(endAt + seg * 2);
        const start = cmap.readUInt16BE(startAt + seg * 2);
        const delta = cmap.readInt16BE(deltaAt + seg * 2);
        const rangeOffset = cmap.readUInt16BE(rangeAt + seg * 2);

        for (let code = start; code <= end && code !== 0xffff; code++) {
          let glyph;

          if (0 === rangeOffset) {
            glyph = (code + delta) & 0xffff;
          } else {
            const at = rangeAt + seg * 2 + rangeOffset + (code - start) * 2;
            glyph = cmap.readUInt16BE(at);

            if (0 !== glyph) glyph = (glyph + delta) & 0xffff;
          }

          if (0 !== glyph) covered.add(code);
        }
      }
    }

    if (12 === format) {
      const groups = cmap.readUInt32BE(offset + 12);

      for (let group = 0; group < groups; group++) {
        const at = offset + 16 + group * 12;
        const start = cmap.readUInt32BE(at);
        const end = cmap.readUInt32BE(at + 4);

        for (let code = start; code <= end; code++) covered.add(code);
      }
    }
  }

  return covered;
};

/** Codepoints present in a woff2 file on disk. */
export const coverage = (path) => cmapCodepoints(woff2Tables(readFileSync(path)).get('cmap'));

/** Split a block's text into the characters it actually asks the font for. */
const characters = (text) => [...new Set([...text])].filter((char) => !/\s/.test(char));

/**
 * Every `data-font` block on a page, with its text.
 *
 * The text is read with tags stripped, so markup inside the block (a `<b>`, a
 * `<span class="x">`) cannot smuggle characters that were never rendered.
 *
 * @returns {Array<{font: string, text: string}>}
 */
export const blocks = (html) => {
  const found = [];

  for (const match of html.matchAll(/<(\w+)([^>]*\bdata-font="([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/g)) {
    found.push({ font: match[3], text: match[4].replace(/<[^>]*>/g, '') });
  }

  return found;
};

const checkPage = (pagePath) => {
  const html = readFileSync(pagePath, 'utf8');
  const found = blocks(html);

  if (0 === found.length) {
    console.error(`font-coverage: no data-font blocks in ${pagePath}`);
    process.exit(1);
  }

  let failures = 0;

  for (const block of found) {
    const fontPath = resolve(repoRoot, 'public/fonts', block.font);

    try {
      const covered = coverage(fontPath);
      const wanted = characters(block.text);
      const missing = wanted.filter((char) => !covered.has(char.codePointAt(0)));

      if (0 === missing.length) {
        console.log(`ok    ${block.font.padEnd(36)} ${wanted.length}/${wanted.length} characters`);
      } else {
        failures++;
        console.error(`FAIL  ${block.font} missing ${missing.length}: ${missing.join(' ')}`);
        console.error(`      U+${missing.map((c) => c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' U+')}`);
      }
    } catch (error) {
      failures++;
      console.error(`FAIL  ${block.font}: ${error.message}`);
    }
  }

  console.log(`\nfont-coverage: ${found.length - failures}/${found.length} faces cover their block`);
  process.exit(0 === failures ? 0 : 1);
};

const main = () => {
  const args = process.argv.slice(2);
  const fileAt = args.indexOf('--file');
  const pagePath = fileAt === -1
    ? resolve(repoRoot, 'font-set/index.html')
    : resolve(process.cwd(), args[fileAt + 1] ?? '');

  if (args.includes('--list')) {
    for (const font of ['inter-400-0c9c05bd.woff2', 'roboto-condensed-400-c05481f9.woff2']) {
      const covered = coverage(resolve(repoRoot, 'public/fonts', font));

      console.log(`${font} ${covered.size} codepoints`);
    }

    return;
  }

  checkPage(pagePath);
};

// Importing this file (a test, a one-off measurement) must not check a page.
if (import.meta.main ?? (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]))) {
  main();
}
