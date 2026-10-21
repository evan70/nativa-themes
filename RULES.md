# RULES

Working rules for this repository. They are the constraints that are easy to
break and hard to notice afterwards.

## `modules/Themes/<Name>/` is the source of the theme

Five themes live here: `Boson`, `Erik`, `Griffe`, `Jednotka`, `Mono`. Each is a kernel
module — `Theme/<Name>Theme.php`, `assets/`, `tests/` — and this repository is where it is
edited.

- A change ships in this order: edit here, sync into `nativa-php-core`, then
  `php bin/cms module:add <Name>` there (the sync script is `bin/build/sync-themes.sh`; until
  it lands, the kernel catalogue is a byte-identical copy that a sync would overwrite).
- The tests travel with the module but **run in the kernel** (`phpunit` scans `modules/`
  there). A change here is not verified until that suite runs.
- No font files and no build output belong in a module: woff2 faces stay in the kernel's
  `public/fonts/`, bundles in its `public/dist/<theme>/`.

## `boson/`, `jednotka/`, `mono/` are GENERATED, not sources

Those pages are rendered from the theme's PHP by
`bin/build/render-theme-pages.php` (in `nativa-php-core`). An edit there is lost on the
next render, which is exactly the drift `render --check` refuses to ship.

- Change the theme (in `modules/Themes/<Name>/`), then re-render.
- Two locales, one shape: `<theme>/…` is English, `<theme>/sk/…` is Slovak. Slovak is the
  project's default locale, so those are the pages that test the font set — the article
  body carries every letter of the alphabet in both cases. Do not hand-write a Slovak page
  to "fill a gap": add the surface to the generator instead, or the two drift apart.
- `erik/`, `starter/`, `magazine/` and `moonshine/` are still hand-written — that is why the
  two rules sit next to each other rather than replacing one another. The generator refuses
  `erik` by name, because rendering into it would overwrite tracked pages.
- `griffe/` does not exist yet: its homepage is composed from attributes by its own web
  components, so a static render is empty. Do not “fix” that by hand-writing pages here —
  either render it once the composition works, or leave it out.

## `src/` and `build/` are gallery copies, not sources

`scripts/sync-themes.mjs` **deletes and recopies** `src/<theme>/` and
`build/`. An edit there does not survive the next `pnpm run sync`. This is about the
gallery only — it never touches `modules/`.

- To change a gallery theme, change it in
  [nativa-minimal](https://github.com/evan70/nativa-minimal) and sync.
- To add code for this repository, put it in `entries/` or `scripts/` (or a theme module).

`sync --check` compares a SHA-256 of every file's contents, so an edit two
directories deep is still caught. Committing a hand-edit to `src/` will fail
`pnpm run verify` on the next run.

## A demo page is evidence, so it must be faithful

The pages exist to show what the themes actually look like. A page that
diverges from the theme is worse than no page.

- Use the class names the PHP templates emit. Check
  `src/Themes/<theme>/` in the app when unsure.
- Check a class name against the CSS before using it. `layout-sidebar__group`
  expands via `.is-expanded`, `.m-palette-overlay` opens via `.open`, palette
  rows are `.m-palette-item` / `.active` — none of these follow the BEM
  modifier convention, and inventing the convention-looking name produces a
  dead control.
- Do not add chrome the real surface does not have. There is no back-to-top
  button in the admin; magazine's blog index genuinely has no `<h1>`.

## Class-name namespaces

| Prefix | Owner |
|--------|-------|
| `st-`, `er-`, `mag-`, `ms-`, `m-`, `layout-`, `cba-` | the themes — never define these here |
| `gal-` | this repository's gallery |
| `mgal-` | this repository's demo-only chrome on the admin page |

A class defined in `entries/` that starts with a theme prefix would claim to
be theme CSS when it is not. `entries/mark-extra.css` exists to make that
boundary explicit.

## Page paths are the URL

Vite's multi-page build preserves the source path, so a page at
`starter/blog/index.html` is served at `/starter/blog/`. Keeping the HTML in a
`pages/` folder would publish every URL as `/pages/…`.

New page, new entry in `vite.config.ts`. The inputs are listed explicitly
rather than globbed: a page missing from that list ships without its
stylesheet.

## The commercial font must never be published

`public/fonts/mark/` — the Gilroy woff2 files — is **not** in the sync list and
must not be added to it. Gilroy is a commercial font and this repository is
public.

The theme sources keep their `@font-face` rules because they stay
byte-identical. `stripCommercialFontsPlugin` removes them from the emitted CSS.
If that rule is deleted, every erik and moonshine page 404s on
`/fonts/mark/Gilroy-*.woff2` and `pnpm run shoot` fails — which is the point of
running it.

Do not try to fix it by shipping a substitute stylesheet that redeclares the
family. That was tried: Vite emits the two stylesheets as separate assets, the
theme's `@font-face` lands second, and the browser fetches the file anyway.
Post-processing the emitted asset is deterministic; relying on cascade order
across chunks is not.

## The admin demo is a design demo

`moonshine/` looks like a back office and is not one. No session, no data, no
forms, every control inert, figures are placeholders. It is `noindex`,
carries a banner above the chrome, and the gallery card says so in words.

It is deliberately **not** at `/mark`, the path the real admin uses. If you
move it, do not move it there.

## `base` is `'./'`, always

GitHub Pages serves the site from `https://<user>.github.io/<repo>/`. An
absolute asset URL would 404, and renaming the repository must not break the
site. Root-absolute URLs in HTML (`/scripts/theme-init.js`, `/covers/…`) are
fine — Vite rewrites them to be relative to each page.

## One list of published pages

`scripts/pages.mjs` is the only list of what the gallery publishes: `shoot`
screenshots it, CI checks the built `dist/` against it, and the post-deploy job
fetches those URLs from Pages. Adding a page therefore means two edits — its
input in `vite.config.ts` and its entry in `scripts/pages.mjs` — and forgetting
the second fails `pnpm run check:dist` ("built but not checked") instead of
shipping a page no check ever saw. The `expect` field is what that page's own
stylesheet must leave in the HTML: a CSS token for generated pages, the theme's
class prefix for hand-written ones (their stylesheet is a separate asset, so no
token appears in the HTML at all).

The same check resolves every internal `href`/`src`/`action` in the built tree,
so a link to a page or a file the demo does not publish fails at build time.
That is not redundant with `shoot`: the browser only fetches what it needs to
paint, so three real bugs (a search form posting to `/en/blog`, a "Blog" link
written `../blog/` on the home page, and Atom/RSS links to feeds this gallery
never emits) were all invisible to it and visible to this check.

## A font claim is read out of the bytes, never typed

`font-set/index.html` says which characters each face covers. That claim is not
allowed to be prose: every block carries `data-font="<file in public/fonts>"`,
and `pnpm run check:fonts` parses the `cmap` of that exact `.woff2` and fails on
any character the block renders that the font does not map.

- Adding a face to the specimen means adding its `data-font` block — an
  uncovered glyph then fails the check instead of showing up as a fallback
  glyph a reader has to notice.
- Do not "fix" a failure by deleting the character from the block. Either the
  face is wrong for this gallery (say so in the page) or the subset is wrong
  (fix it upstream, in `public/fonts/`).

## `theme-init.js` must stay blocking

It restores `data-theme` from `localStorage` before the first paint. A
`type="module"` or `defer` script runs *after* the first paint, which is
exactly the flash the script exists to prevent. It is a classic, synchronous
`<script>` in `<head>`, and the pages that link it must keep it there.

## No `?.` and no `??`

The build targets ES2015 for the Chrome 70 baseline. The synced theme sources
respect this; code in `entries/` and `scripts/` must too.

## `pnpm-workspace.yaml` and `.npmrc` are both load-bearing

pnpm resolves the workspace root by walking **up** from the package directory
and adopts the first `pnpm-workspace.yaml` it finds. A stray one in `$HOME`
hijacks every install and build. The `ignoreWorkspace: true` key is what pnpm
≥ 10 honours; `.npmrc`'s `ignore-workspace=true` covers the pnpm 9 that CI
pins. Do not delete either, and do not turn this repository into a real
workspace without thinking about it.

`packages: []` in that file is **not** redundant. pnpm 9 parses the file as a workspace manifest whether or not `ignoreWorkspace` is set, and refuses every
command — including the `pnpm store path` that `actions/setup-node` calls for
its cache — when `packages` is missing. Dropping it failed the first deploy
with "packages field missing or empty" before any project code ran.

It also keeps `modules/` out of the workspace: a theme module is PHP + assets, not an npm
package, and `packages: []` states that no directory here is a member. Do not add a glob
that would pull `modules/**` in.

A local pnpm ≥ 10 does **not** catch this. Verify a change to that file with
the version CI actually pins:

```bash
npx -y pnpm@9 store path
```

## Keep the tsconfig aligned with the app

`tsconfig.json` mirrors the app's frontend workspace. Adding
`noUncheckedIndexedAccess` looks like a free strictness win and is not: it
fails on the synced theme sources, which are byte-identical copies that must
keep typechecking under the settings they were written for.
