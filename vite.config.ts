/**
 * vite.config.ts — the gallery + every theme demo page, as one multi-page
 * build.
 *
 * Differences from the app's own build (one `vite.config.ts` per package
 * under `Frontend/packages/`), and why each one is load-bearing here:
 *
 *   - `base: './'` instead of `/dist/<theme>/`. GitHub Pages serves the site
 *     from `https://<user>.github.io/<repo>/`, so absolute asset URLs would
 *     404. A relative base makes the build work under any repository name.
 *   - Multi-page input instead of one bundle per theme. Each demo page links
 *     its own theme's real entry (`src/starter/main.ts`, `src/erik/erik.ts`,
 *     …), so Vite emits one shared chunk per theme and the pages stay small.
 *   - `target: 'es2015'` and `stripAtLayerPlugin` — the same Chrome 70
 *     baseline the app ships. A showcase of the themes that dropped it would
 *     be a lie.
 *
 * The inputs are listed explicitly rather than globbed: adding a page without
 * a build entry would ship a page that silently 404s its stylesheet.
 */
import { defineConfig } from 'vite';
import { stripAtLayerPlugin } from './build/strip-at-layer.ts';
import { stripCommercialFontsPlugin } from './scripts/vite-strip-commercial-fonts.ts';

/**
 * One Vite entry per HTML page — see the file header for the shape.
 *
 * The HTML sources sit at the paths they should be served from (a page at
 * `starter/blog/index.html` is served at `/starter/blog/`), because Vite's
 * multi-page build preserves the source path in the output. Keeping them in a
 * `pages/` folder would have published every URL as `/pages/…`.
 */
const input = {
  gallery: 'index.html',
  'starter/home': 'starter/index.html',
  'starter/blog': 'starter/blog/index.html',
  'starter/article': 'starter/article/index.html',
  'starter/tags': 'starter/tags/index.html',
  'starter/author': 'starter/author/index.html',
  'erik/home': 'erik/index.html',
  'erik/blog': 'erik/blog/index.html',
  'erik/article': 'erik/article/index.html',
  'erik/tags': 'erik/tags/index.html',
  'erik/author': 'erik/author/index.html',
  'magazine/home': 'magazine/index.html',
  'magazine/blog': 'magazine/blog/index.html',
  'magazine/article': 'magazine/article/index.html',
  'magazine/tags': 'magazine/tags/index.html',
  'magazine/author': 'magazine/author/index.html',
  // Served under the theme's own name, like the other three. It is NOT a live
  // admin and never sits at `/mark`; the page opens with a banner saying so.
  'moonshine/admin': 'moonshine/index.html',

  // The kernel themes. These pages are GENERATED from the theme's own PHP
  // (`bin/build/render-theme-pages.php` in nativa-php-core) — do not hand-edit
  // them; re-render instead. Erik is not listed here yet: its hand-written
  // pages predate the generator and the two must not overwrite each other.
  'boson/home': 'boson/index.html',
  'boson/blog': 'boson/blog/index.html',
  'boson/article': 'boson/article/index.html',
  'boson/tags': 'boson/tags/index.html',
  'boson/categories': 'boson/categories/index.html',
  'boson/author': 'boson/author/index.html',
  'boson/search': 'boson/search/index.html',
  'jednotka/home': 'jednotka/index.html',
  'jednotka/blog': 'jednotka/blog/index.html',
  'jednotka/article': 'jednotka/article/index.html',
  'jednotka/tags': 'jednotka/tags/index.html',
  'jednotka/categories': 'jednotka/categories/index.html',
  'jednotka/author': 'jednotka/author/index.html',
  'jednotka/search': 'jednotka/search/index.html',
  'mono/home': 'mono/index.html',
  'mono/blog': 'mono/blog/index.html',
  'mono/article': 'mono/article/index.html',
  'mono/tags': 'mono/tags/index.html',
  'mono/categories': 'mono/categories/index.html',
  'mono/author': 'mono/author/index.html',
  'mono/search': 'mono/search/index.html',
};

export default defineConfig({
  // Relative so the build is independent of the repository name.
  base: './',
  publicDir: 'public',
  appType: 'mpa',
  plugins: [
    stripAtLayerPlugin('dist'),
    // Drops the commercial Gilroy @font-face rules from the emitted CSS. The
    // woff2 files are not copied by the sync script, and a declared
    // @font-face is always fetched — so leaving the rules in means a 404 on
    // every erik and moonshine page.
    stripCommercialFontsPlugin('dist'),
  ],
  server: {
    allowedHosts: true,
    port: 5177,
  },
  preview: {
    allowedHosts: true,
    port: 4177,
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { input },
  },
});
