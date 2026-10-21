# Nativa Themes

Two things live here.

1. **`modules/Themes/<Name>/` — the five themes of the Nativa kernel.** Each is a complete
   kernel module: a `Theme/<Name>Theme.php` class, its vendored CSS/JS under `assets/`, and its
   tests. This repository is their source; once a theme is in the kernel's catalogue,
   `php bin/cms module:add <Name>` installs it. Its **build source** (`Frontend/packages/<theme>/`)
   still lives in the kernel for now — see "The theme modules are the source" below.

   | Module | Prefix | Surface | Files |
   |--------|--------|---------|-------|
   | `Boson` | `bo-` | public, selectable | 4 |
   | `Erik` | `er-` | public, selectable | 3 |
   | `Griffe` | `gr-` | public, selectable | 4 |
   | `Jednotka` | `je-` | public, selectable | 3 |
   | `Mono` | `mo-` | public, selectable | 5 |

   A theme module carries **no font files** and no build output: the woff2 faces stay in the
   kernel's `public/fonts/`, and `public/dist/<theme>/` is built there.

2. **A static gallery of the four themes in
   [Nativa Minimal](https://github.com/evan70/nativa-minimal)** — a zero-dependency PHP 8.5
   starter kit — published on GitHub Pages. The gallery is a *consumer*: its `src/` is copied
   from the app, not edited here.

No screenshots. Every page below is the theme's **real stylesheet and real
scripts** over **hand-written markup** that uses the same BEM class names the
PHP templates emit.

| Theme | Prefix | Surface | Pages |
|-------|--------|---------|-------|
| Starter | `st-*` | public, the default | [home](starter/) · [blog](starter/blog/) · [article](starter/article/) · [tags](starter/tags/) · [author](starter/author/) |
| Erik | `er-*` | public, selectable | [home](erik/) · [blog](erik/blog/) · [article](erik/article/) · [tags](erik/tags/) · [author](erik/author/) |
| Magazine | `mag-*` | reference code, unwired | [home](magazine/) · [blog](magazine/blog/) · [article](magazine/article/) · [tags](magazine/tags/) · [author](magazine/author/) |
| Moonshine | `m-*` / `layout-*` | admin, behind `/mark` | [dashboard](moonshine/) · [articles](moonshine/articles/) · [editor](moonshine/article/) · [users](moonshine/users/) |

The Moonshine pages are a **static design demo**, not a live admin: no session,
no data, no writes, every control inert. Four of them: the dashboard, the
articles list, the article editor and the users list — the admin surfaces the
real templates render. Each opens with a banner saying so, they navigate to
each other (sidebar and Ctrl+K palette), and the design language is inspired by
[MoonShine](https://getmoonshine.app/).

The fifth theme in the app, `minimal`, is unwired reference code with no build
entry, so it has no page here.

## The theme modules are the source, the kernel copy is a copy

`modules/Themes/<Name>/` here is the editable copy. `nativa-php-core` keeps a catalogue at
`modules/Themes/<Name>/` and an installed slice at `src/Modules/Themes/<Name>/`; both are
meant to be filled from this repository (the `bin/build/sync-themes.sh --check` gate is
planned there, not written yet). **Until that script lands the two catalogues are
byte-identical copies**, so a change typed into the kernel catalogue is a change that a
later sync would overwrite.

Two copies live here and they are not interchangeable. `modules/Themes/<Name>/` is the
kernel theme module (PHP + vendored `assets/` + tests). `src/<theme>/` below is the
gallery's copy of `nativa-minimal`'s frontend sources, and `pnpm run sync:check` only
guards that second pair — a green gallery says nothing about a theme module.

A theme's tests travel with it here, but they run in the kernel (`phpunit` scans `modules/`
there and owns the harness). Packaging a change therefore means: edit here, sync into the
kernel, `php bin/cms module:add <Name>`, run the suite there.

### Demo pages for the kernel themes are generated

`boson/`, `jednotka/` and `mono/` are rendered by `bin/build/render-theme-pages.php` in
`nativa-php-core` — the theme's own PHP against one fixture, wrapped by the kernel layout.
Each theme gets **7 surfaces in English and the same 7 in Slovak**: home, blog, article,
tags, categories, author, search, at `/boson/…` and `/boson/sk/…` (42 pages). Do not
hand-edit them; re-render instead:

```bash
cd ../nativa-php-core
php bin/build/render-theme-pages.php --theme=boson --out=../nativa-themes   # or --theme=all
php bin/build/render-theme-pages.php --locale=sk --out=../nativa-themes     # Slovak only
php bin/build/render-theme-pages.php --check --out=../nativa-themes         # exit 1 if stale
```

The Slovak pages are the font test that matters here: Slovak is the project's default
locale, its fixture (§ `fixtures/themes-demo-sk.php`) carries the whole alphabet in both
cases in one paragraph, and a face that ships no `č`, `ľ` or `ô` falls back mid-sentence
there and nowhere on the English pages. The markup stays the theme's; the theme ships no
translations, so its chrome labels stay English on both locales.

The generated documents are self-contained: critical CSS inlined, the behaviour script
inlined, root URLs rewritten to the depth of the page (`../../` for a surface, `../../../`
for its Slovak twin). Two consequences worth knowing:

- `erik` is skipped on purpose: its gallery pages are hand-written and rendering into the same
directory would overwrite them without a diff to review. The generator refuses it by name.
- `griffe` is not published: its homepage is `<hero-layout>` + `<horizontal-scroll-hero>` filled
from attributes by the frontend package's web components, so the static render is 53 characters
of visible text and `shoot` fails it as an empty body. The generator can render it on request
(`--theme=griffe`) and says why it is empty. Also, the module stylesheet is the 281-line
critical subset, not the app's full frontend one.
- The fonts the pages use (`inter-400-0c9c05bd`, `roboto-condensed-400-c05481f9`) and the
  mono hero images (`public/demo/`) are copied by hand, because they are assets, not markup.- `shoot` covers 60 pages (17 hand-written + 21 generated + 21 Slovak + 1 font set);
  `render --check` proves the generated half still matches the themes.

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
modules/Themes/<Name>/   the five kernel themes — Theme/, assets/, tests/ (the source)
index.html               the gallery itself
font-set/index.html      Slovak charset specimen of every served face
starter/…/index.html     demo pages, at the URL they are served from
erik/…/index.html
magazine/…/index.html
moonshine/index.html       the admin dashboard
moonshine/articles/        the articles list, at the URL the admin serves it from
moonshine/article/         the article editor
moonshine/users/           the users list
boson/…/index.html       GENERATED — 7 surfaces + 7 under sk/, same for jednotka, mono
entries/                 hand-written code: gallery CSS, the admin entry
src/<theme>/             SYNCED from the app — do not edit
build/                   SYNCED from the app — the @layer stripping plugin
public/                  assets: fonts, images, article covers, page scripts
scripts/                 sync, page check, interaction check, CDP client
```

### `src/` is not yours

`scripts/sync-themes.mjs` **deletes and recopies** `src/<theme>/` on every
run. Anything you hand-write there is erased by the next sync, so demo-only
entries live in `entries/` instead. This applies to the gallery only —
`modules/Themes/` is hand-written source and is never touched by the sync.

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
| `pnpm run sync:check` | the gallery's `src/` still matches the app (theme modules are **not** checked here) |
| `pnpm run typecheck` | `tsc --noEmit` over the entries, the build plugins and the synced sources |
| `pnpm run build` | Vite builds the multi-page site |
| `pnpm run check:dist` | `dist/` contains exactly the pages in `scripts/pages.mjs`, and every internal `href`/`src`/`action` on those pages resolves to a file the build produced |
| `pnpm run check:fonts` | every character the font-set page renders is in the `cmap` of the `.woff2` it names — the claim on the page, read out of the bytes |
| `pnpm run shoot` | every page loads with no 404, no console error, and its theme's token on `:root` |
| `pnpm run interactions` | the ported behaviours actually work in a browser |

`shoot` is what caught both font bugs above: a missing woff2 file shows up as
an HTTP 404 on every erik and moonshine page, not as a silent visual
difference.

`check:fonts` answers a different question: not "did the file arrive" but "is
the glyph in it". It parses the `cmap` out of the same `.woff2` bytes the
browser loads (woff2 table directory + one brotli stream, no dependency) and
fails naming the missing codepoints — which is how a re-subset that drops the
Slovak set goes red instead of quietly producing fallback glyphs.

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

A deploy can succeed while the site serves something else — a stale artefact,
a moved base path, a directory uploaded one level too deep. `shoot` cannot see
that (it checks a local preview), so the workflow has a third job, `verify`,
that runs after `deploy` and fetches the **published** URLs:

```bash
pnpm run check:pages https://<user>.github.io/nativa-themes
```

Every page in `scripts/pages.mjs` must answer 200, be `text/html`, and still
contain its theme's marker (`expect` — the theme's CSS token for the generated
pages, its class prefix for the hand-written ones, whose stylesheet is a
separate asset). It retries six times, because Pages serves a new artefact
within seconds but not always the first one; every retry is the same
assertion, not a weaker one.

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
