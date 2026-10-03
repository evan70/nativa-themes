# Nativa Themes

A static gallery of the four themes in
[Nativa Minimal](https://github.com/evan70/nativa-minimal) — a
zero-dependency PHP 8.5 starter kit — published on GitHub Pages.

No screenshots. Every page below is the theme's **real stylesheet and real
scripts** over **hand-written markup** that uses the same BEM class names the
PHP templates emit.

| Theme | Prefix | Surface | Pages |
|-------|--------|---------|-------|
| Starter | `st-*` | public, the default | [home](starter/) · [blog](starter/blog/) · [article](starter/article/) · [tags](starter/tags/) · [author](starter/author/) |
| Erik | `er-*` | public, selectable | [home](erik/) · [blog](erik/blog/) · [article](erik/article/) · [tags](erik/tags/) · [author](erik/author/) |
| Magazine | `mag-*` | reference code, unwired | [home](magazine/) · [blog](magazine/blog/) · [article](magazine/article/) · [tags](magazine/tags/) · [author](magazine/author/) |
| Moonshine | `m-*` / `layout-*` | admin, behind `/mark` | [dashboard](moonshine/) |

The Moonshine page is a **static design demo**, not a live admin: no session,
no data, no forms, every control inert. It opens with a banner saying so, and
its design language is inspired by
[MoonShine](https://getmoonshine.app/).

The fifth theme in the app, `minimal`, is unwired reference code with no build
entry, so it has no page here.

## Why the markup is hand-written

In the app a theme is a PHP class: it renders all of its own HTML from a
payload the kernel hands it. GitHub Pages runs no PHP, so the markup has to
exist as files. It is written by hand against the class names the templates
emit — which is what makes the pages worth looking at: a typo in a class name
shows up as visibly unstyled content rather than as a subtle difference from
the real thing.

The stylesheets and scripts are *not* re-implemented. `scripts/sync-themes.mjs`
copies them out of the app, byte for byte.

## Layout

```
index.html               the gallery itself
starter/…/index.html     demo pages, at the URL they are served from
erik/…/index.html
magazine/…/index.html
moonshine/index.html
entries/                 hand-written code: gallery CSS, the admin entry
src/<theme>/             SYNCED from the app — do not edit
build/                   SYNCED from the app — the @layer stripping plugin
public/                  assets: fonts, images, article covers, page scripts
scripts/                 sync, page check, interaction check, CDP client
```

### `src/` is not yours

`scripts/sync-themes.mjs` **deletes and recopies** `src/<theme>/` on every
run. Anything you hand-write there is erased by the next sync, so demo-only
entries live in `entries/` instead.

## Working on it

```bash
pnpm install
pnpm run sync          # pull the current theme sources out of the app
pnpm run dev           # http://localhost:5177
```

`sync` looks for `nativa-minimal` next to this repository; point it elsewhere
with `NATIVA_MINIMAL=/path/to/nativa-minimal pnpm run sync`.

### Checks

```bash
pnpm run verify        # everything below, in order
```

| Command | What it proves |
|---------|----------------|
| `pnpm run sync:check` | the copied theme sources still match the app |
| `pnpm run typecheck` | `tsc --noEmit` over the entries, the build plugins and the synced sources |
| `pnpm run build` | Vite builds the multi-page site |
| `pnpm run shoot` | every page loads with no 404, no console error, and its theme's token on `:root` |
| `pnpm run interactions` | the ported behaviours actually work in a browser |

`shoot` is what caught both font bugs above: a missing woff2 file shows up as
an HTTP 404 on every erik and moonshine page, not as a silent visual
difference.

`shoot` and `interactions` need a preview server:

```bash
pnpm run build && pnpm run preview &
pnpm run shoot -- --scheme light --width 390 --height 844 --shots
```

`sync:check` cannot run on CI — the app repository is private, so a fresh
runner has no sibling checkout and the check can only report "skipped". It is
a **local** gate; the workflow below deliberately does not pretend to run it.

## Deployment

`.github/workflows/pages.yml` builds `dist/` and deploys it to GitHub Pages on
every push to `main`. Enable it once in the repository settings
(*Settings → Pages → Source: GitHub Actions*).

The build uses `base: './'`, so the site works under any repository name —
rename the repo and the URLs keep resolving.

## The stylesheets are the real ones

You can check that without trusting this repository. The app's own build lives
in `nativa-minimal/public/dist/`, and two of the theme bundles come out of
this build byte-identical:

```bash
md5sum natura-minimal/public/dist/starter/assets/main-Fi6Y-zd4.css \
       natura-themes/dist/assets/main-Fi6Y-zd4.css
```

The starter and magazine stylesheets match exactly. The erik one differs by
exactly one thing: `stripCommercialFontsPlugin` removes its commercial
`@font-face` rules (see below), and this build's relative base rewrites the
remaining asset URLs to be relative.

## The commercial font is not published

The erik and moonshine stylesheets declare `@font-face` for **Gilroy**, a
commercial font (Indian Type Foundry / Emil Szymanek). `scripts/sync-themes.mjs`
does not copy the woff2 files, because redistributing them from a public
repository is not a decision this repository gets to make.

The theme sources stay byte-identical anyway — the rules are removed from the
**emitted** CSS by `stripCommercialFontsPlugin`, the same post-processing
pattern as `@layer` stripping. Removing the rule beats overriding it: a
declared `@font-face` is always fetched, and which of two same-family rules
wins depends on stylesheet ordering that Vite does not guarantee across
chunks. An earlier attempt that shipped a `local()` substitute in a second
stylesheet still fetched the file, and `pnpm run shoot` reported it as a 404.

The result: the themes' own font stacks fall through to their system
alternatives. Layout, spacing and colour are identical; only the typeface
differs from the shipped theme.

## Baseline

The build keeps the app's constraints rather than relaxing them, because a
showcase that dropped them would be a lie:

- `target: 'es2015'` — the Chrome 70 / Android 9+ baseline.
- `stripAtLayerPlugin` — Chrome 70 drops `@layer` blocks entirely.
- WCAG AA contrast contracts live in the theme CSS itself; the tokens that
  satisfy them are the ones shipped in `src/`.

## Licence

MIT. The theme CSS and TypeScript are copied from
[Nativa Minimal](https://github.com/evan70/nativa-minimal) — see that
repository for its licence. The Gilroy font files are deliberately **not**
included; see above.
