# RULES

Working rules for this repository. They are the constraints that are easy to
break and hard to notice afterwards.

## `src/` and `build/` are copies, not sources

`scripts/sync-themes.mjs` **deletes and recopies** `src/<theme>/` and
`build/`. An edit there does not survive the next `pnpm run sync`.

- To change a theme, change it in
  [nativa-minimal](https://github.com/evan70/nativa-minimal) and sync.
- To add code for this repository, put it in `entries/` or `scripts/`.

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

## Keep the tsconfig aligned with the app

`tsconfig.json` mirrors the app's frontend workspace. Adding
`noUncheckedIndexedAccess` looks like a free strictness win and is not: it
fails on the synced theme sources, which are byte-identical copies that must
keep typechecking under the settings they were written for.
