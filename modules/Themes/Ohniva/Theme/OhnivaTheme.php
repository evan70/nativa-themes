<?php

declare(strict_types = 1);

namespace Modules\Themes\Ohniva\Theme;

use Modules\ContentLocale\Interfaces\HTTP\ContentLocaleServices;
use Modules\Core\Application\Services\View\InlineJs;
use Modules\Core\Domain\MarkRoutePolicy;
use Modules\Core\Domain\ShellNavItem;
use Modules\Core\Domain\Contracts\AuthPageTheme;
use Modules\Core\Domain\Contracts\ThemeModule;
use Modules\Core\Interfaces\HTTP\FrontendLayout;
use Modules\Core\Interfaces\HTTP\PageContext;
use Modules\Core\Interfaces\HTTP\ShellContext;

/**
 * OhnivaTheme: the ohniva-show.sk design as a kernel theme module.
 *
 * Measured 2026-11-27 on the live client site: a fixed 920 px stage, a 125 px
 * logo, a seven-item serif header nav, a black ornamental ground, one fire
 * photograph, blue-grey textured panels, `#c6a460` section headings and
 * `#74c2e1` links. The reference loads Cascade Framework 1.5 from jsDelivr
 * and carries IE6/7/8 conditional classes. The module is 7 files and 92 KB
 * on disk, measured with `find` and `du` on the same day.
 *
 * ## What this port keeps, and what it refuses
 *
 * The design is kept: the shell, the panel vocabulary, the type scale and the
 * palette. The old CMS is not. There is no jQuery, no Supersized slideshow,
 * no Font Awesome and no remote request at runtime; the backdrop is one local
 * JPEG and the menu glyph is three spans.
 *
 * ## Cascade arrives namespaced
 *
 * `assets/critical/cascade-ohniva.css` is the MIT licensed Cascade Framework
 * 1.6 at commit 5863cb6, assembled from core, typography, grids, helpers and
 * responsive. Every class is prefixed `oh-c-` because `ThemeClassOwnershipTest`
 * requires every class a theme defines to carry `oh-`. The source and the five
 * checksums live beside it.
 *
 * ## IE6 is a baseline, not a slogan
 *
 * The theme layer uses floats, fixed widths and anchor hover only. The head
 * script creates the HTML5 elements IE6 does not know and marks the document
 * `oh-ie6`. This machine has no IE6, so the baseline is enforced statically by
 * `OhnivaThemeTest` and checked visually in a modern browser; a Windows VM is
 * still the only way to prove rendering.
 *
 * ## No feature-module import
 *
 * Article shapes travel as objects and are read through `get_object_vars`.
 * The only module import is ContentLocale's mapper, the same shell-level
 * service every theme uses.
 */
final class OhnivaTheme implements AuthPageTheme, ThemeModule
{
    public const string NAME = 'ohniva';

    public function name(): string
    {
        return self::NAME;
    }

    public function bundle(): string
    {
        return self::NAME;
    }

    public function jsKey(): string
    {
        return self::NAME;
    }

    /**
     * @return list<string> src/-relative, resolved by InlineCss
     */
    public function criticalCss(?string $surface = null): array
    {
        return FrontendLayout::themeCriticalCss([
            'Modules/Ohniva/assets/critical/cascade-ohniva.css',
            'Modules/Ohniva/assets/critical/ohniva.css',
        ], $surface);
    }

    /**
     * The IE6 shiv, in `<head>` before the body is parsed.
     */
    public function themeInitScript(): string
    {
        $script = InlineJs::file('Modules/Ohniva/assets/scripts/ohniva.js');

        return '' === $script
            ? ''
            : '<script nonce="__CSP_NONCE_PLACEHOLDER__">' . $script . '</script>';
    }

    public function prefix(): string
    {
        return 'oh';
    }

    public function header(ShellContext $context): string
    {
        $nav = '';

        foreach ($context->headerNav as $item) {
            $nav .= $this->navItem($item, $context->currentPath);
        }

        return '<a class="oh-skip" href="#content">Preskočiť na obsah</a>' . "\n"
            . '<div class="oh-backdrop" aria-hidden="true">'
            . '<img class="oh-backdrop__photo" src="/themes/ohniva/fire.jpg" alt="" width="600" height="400">'
            . '</div>' . "\n"
            . '<header class="oh-header">' . "\n"
            . '<div class="oh-header__inner">' . "\n"
            . '<a class="oh-brand" href="/">'
            . '<img class="oh-brand__logo" src="/themes/ohniva/logo.gif" alt="' . self::e($context->siteName) . '" width="125" height="125">'
            . '</a>' . "\n"
            . '<nav class="oh-nav" aria-label="Hlavná navigácia">'
            . '<ul class="oh-nav__list">' . $nav . '</ul>'
            . '</nav>' . "\n"
            . '<div class="oh-actions">'
            . $this->localeLinks($context)
            . ($context->signedIn
                ? '<a class="oh-mark" href="' . self::e(MarkRoutePolicy::prefix()) . '">Mark</a>'
                : '')
            . '</div>' . "\n"
            . '<div class="oh-clear"></div>' . "\n"
            . '</div>' . "\n"
            . '</header>' . "\n";
    }

    public function footer(ShellContext $context): string
    {
        $nav = '';

        foreach ($context->footerNav as $item) {
            $nav .= '<a class="oh-footer__link" href="' . self::e($item->href) . '"'
                . ($item->external ? ' rel="noopener noreferrer"' : '') . '>'
                . self::e($item->label) . '</a>';
        }

        return '<footer class="oh-footer">' . "\n"
            . '<div class="oh-footer__inner">' . "\n"
            . '<span class="oh-footer__copy">&copy; ' . $context->year . ' ' . self::e($context->siteName) . '</span>' . "\n"
            . '<div class="oh-footer__nav">' . $nav . $this->localeLinks($context) . '</div>' . "\n"
            . '<div class="oh-clear"></div>' . "\n"
            . '</div>' . "\n"
            . '</footer>' . "\n";
    }

    public function pageWrap(string $content): string
    {
        return '<main class="oh-main" id="content">' . "\n"
            . '<div class="oh-content">' . "\n"
            . '<div class="oh-stage">' . "\n"
            . $content
            . "\n" . '</div>' . "\n"
            . '</div>' . "\n"
            . '</main>' . "\n";
    }

    public function homepage(PageContext $context): string
    {
        $title = self::copy($context, 'home.hero_title', 'Akčné predstavenia, ktoré Vás nenechajú chladnými');
        $lede = self::copy($context, 'home.hero_lede', 'Ohňové show, svetelné show, žonglovanie, chodúle a šaškovanie pre každý typ podujatia.');
        $welcome = self::copy(
            $context,
            'home.welcome',
            'Venujeme sa akčným typom divadla. V sekcii Info sa dozviete, ako naša skupina funguje, v Blogu nájdete reportáže z podujatí a v Kontakte objednávkový formulár.',
        );

        return '<section class="oh-hero">' . "\n"
            . '<p class="oh-eyebrow">Ohnivá show</p>' . "\n"
            . '<h1 class="oh-hero__title">' . self::e($title) . '</h1>' . "\n"
            . '<p class="oh-hero__lede">' . self::e($lede) . '</p>' . "\n"
            . '</section>' . "\n"
            . '<div class="oh-panel">'
            . '<div class="oh-panel__header"><h2 class="oh-panel__title">Vitajte</h2></div>'
            . '<div class="oh-panel__body"><p>' . self::e($welcome) . '</p></div>'
            . '</div>' . "\n"
            . ([] === $context->latestArticles
                ? ''
                : '<div class="oh-panel">'
                    . '<div class="oh-panel__header"><h2 class="oh-panel__title">Z blogu</h2></div>'
                    . '<div class="oh-panel__body">' . self::cards($context->latestArticles, $context->locale) . '</div>'
                    . '</div>');
    }

    public function blogIndex(PageContext $context): string
    {
        $perPage = $context->perPage > 0 ? $context->perPage : 9;
        $totalPages = max(1, (int) ceil(count($context->articles) / $perPage));
        $page = max(1, min($context->page, $totalPages));
        $slice = array_slice($context->articles, ($page - 1) * $perPage, $perPage);

        return self::page(
            'Články',
            self::cards($slice, $context->locale) . self::pager($context, $totalPages, $page),
        );
    }

    public function blogSearch(PageContext $context): string
    {
        $title = 'Hľadanie: ' . $context->query;

        return self::page(
            $title,
            '<p class="oh-meta">' . count($context->results) . ' výsledkov</p>'
            . self::cards($context->results, $context->locale)
            . self::pager($context),
        );
    }

    public function blogArticle(PageContext $context): string
    {
        $cover = '' !== $context->coverUrl ? $context->coverUrl : $context->coverImage;
        $views = $context->views > 0 ? ' &middot; ' . $context->views . ' zobrazení' : '';

        $article = '<article class="oh-article">'
            . '<div class="oh-panel">'
            . '<div class="oh-panel__header"><h1 class="oh-panel__title oh-article__title">' . self::e($context->title) . '</h1></div>'
            . '<div class="oh-panel__body">'
            . ('' === $context->metaLine
                ? ''
                : '<p class="oh-article__meta">' . $context->metaLine . $views . '</p>')
            . ('' === $cover
                ? ''
                : '<img class="oh-article__cover" src="' . self::e($cover) . '" alt="' . self::e($context->coverAlt) . '">')
            . $context->inlineEditHtml
            . '<div class="oh-article__body">' . $context->bodyHtml . '</div>'
            . ('' === $context->tagChips ? '' : '<div class="oh-article__tags">' . $context->tagChips . '</div>')
            . '</div>'
            . '</div>'
            . '</article>';

        $toc = self::toc($context);

        return '<section class="oh-section">'
            . '<div class="oh-grid">'
            . '<div class="oh-grid__main">' . $article . '</div>'
            . '<div class="oh-grid__aside">' . $toc . '</div>'
            . '<div class="oh-clear"></div>'
            . '</div>'
            . '</section>';
    }

    public function articleTail(string $html): string
    {
        if ('' === $html) {
            return '';
        }

        return '<section class="oh-section">'
            . '<div class="oh-grid">'
            . '<div class="oh-grid__main">' . $html . '</div>'
            . '<div class="oh-grid__aside"></div>'
            . '<div class="oh-clear"></div>'
            . '</div>'
            . '</section>';
    }

    public function blogTags(PageContext $context): string
    {
        $title = null !== $context->tag ? 'Tag: ' . $context->tag : 'Tagy';

        return self::page(
            $title,
            self::cloud($context->tags, $context->counts, 'tags', $context->tag)
            . self::cards($context->articles, $context->locale)
            . self::pager($context),
        );
    }

    public function blogCategories(PageContext $context): string
    {
        $title = null !== $context->category ? $context->category : 'Kategórie';

        return self::page(
            $title,
            self::cloud($context->categories, $context->counts, 'categories', $context->category)
            . self::cards($context->articles, $context->locale)
            . self::pager($context),
        );
    }

    public function authorProfile(PageContext $context): string
    {
        $author = $context->author ?? [];
        $name = $author['name'] ?? 'Autor';

        return self::page(
            $name,
            '<div class="oh-author">'
            . '<h1 class="oh-author__name">' . self::e($name) . '</h1>'
            . ('' === $context->memberSince ? '' : '<p class="oh-meta">Členom od ' . self::e($context->memberSince) . '</p>')
            . '</div>'
            . self::cards($context->articles, $context->locale)
            . self::pager($context),
        );
    }

    public function errorContent(int $status, string $title, string $detail): string
    {
        return '<section class="oh-error">'
            . '<p class="oh-error__status">' . $status . '</p>'
            . '<h1>' . self::e($title) . '</h1>'
            . '<p>' . self::e($detail) . '</p>'
            . '<p><a href="/">Späť na úvod</a></p>'
            . '</section>';
    }

    /**
     * @param list<array{name: string, type?: string, label?: string, value?: mixed, required?: bool, autofocus?: bool}> $fields
     * @param list<string>                                                                                               $errors
     */
    public function authPage(
        string $title,
        string $formAction,
        string $submitLabel,
        array $fields,
        string $hiddenHtml,
        array $errors,
        ?string $footnote = null,
        ?string $alert = null,
    ): string {
        $fieldsHtml = '';

        foreach ($fields as $field) {
            $type = $field['type'] ?? 'text';
            $name = $field['name'];
            $label = $field['label'] ?? ucfirst($name);
            $raw = $field['value'] ?? '';
            $value = is_scalar($raw) ? (string) $raw : '';
            $required = ($field['required'] ?? true) ? ' required' : '';
            $autofocus = ($field['autofocus'] ?? false) ? ' autofocus' : '';
            $id = 'oh-auth-' . $name;

            if ('hidden' === $type) {
                $fieldsHtml .= '<input type="hidden" name="' . self::e($name) . '" value="' . self::e($value) . '">';

                continue;
            }

            if ('checkbox' === $type) {
                $fieldsHtml .= '<div class="oh-field oh-field--check">'
                    . '<input type="checkbox" id="' . self::e($id) . '" name="' . self::e($name) . '"' . $required . '>'
                    . '<label for="' . self::e($id) . '">' . self::e($label) . '</label>'
                    . '</div>';

                continue;
            }

            $fieldsHtml .= '<div class="oh-field">'
                . '<label class="oh-field__label" for="' . self::e($id) . '">' . self::e($label) . '</label>'
                . '<input class="oh-field__input" type="' . self::e($type) . '" id="' . self::e($id) . '"'
                . ' name="' . self::e($name) . '" value="' . self::e($value) . '"' . $required . $autofocus . '>'
                . '</div>';
        }

        $errorsHtml = '';

        if ([] !== $errors) {
            $items = '';

            foreach ($errors as $error) {
                $items .= '<li>' . self::e($error) . '</li>';
            }

            $errorsHtml = '<div class="oh-errors" role="alert"><ul class="oh-errors__list">' . $items . '</ul></div>';
        }

        return '<section class="oh-auth">'
            . '<div class="oh-panel">'
            . '<div class="oh-panel__header"><h1 class="oh-panel__title oh-auth__title">' . self::e($title) . '</h1></div>'
            . '<div class="oh-panel__body">'
            . (null === $alert ? '' : '<div class="oh-errors">' . self::e($alert) . '</div>')
            . $errorsHtml
            . '<form method="post" action="' . self::e($formAction) . '">'
            . $hiddenHtml
            . $fieldsHtml
            . '<button type="submit">' . self::e($submitLabel) . '</button>'
            . '</form>'
            . (null === $footnote ? '' : '<p class="oh-footnote">' . $footnote . '</p>')
            . '</div>'
            . '</div>'
            . '</section>';
    }

    private function navItem(ShellNavItem $item, string $currentPath): string
    {
        $current = $item->href === $currentPath
            || ('/' !== $item->href && str_starts_with($currentPath, rtrim($item->href, '/') . '/'));

        return '<li class="oh-nav__item' . ($current ? ' oh-nav__item--current' : '') . '">'
            . '<a class="oh-nav__link" href="' . self::e($item->href) . '"'
            . ($item->external ? ' rel="noopener noreferrer"' : '')
            . ($current ? ' aria-current="page"' : '')
            . '>' . self::e($item->label) . '</a>'
            . '</li>';
    }

    private function localeLinks(ShellContext $context): string
    {
        if ([] === $context->availableLocales) {
            return '';
        }

        $links = '';

        foreach ($context->availableLocales as $language) {
            if ($language === $context->activeLocale) {
                continue;
            }

            $href = $context->localeLinks[$language] ?? $context->currentPath;
            $links .= '<a class="oh-locale__link" href="' . self::e($href) . '" hreflang="'
                . self::e(substr($language, 0, 2)) . '">' . self::e(strtoupper(substr($language, 0, 2))) . '</a>';
        }

        return '' === $links ? '' : '<span class="oh-locale">' . $links . '</span>';
    }

    private static function page(string $title, string $body): string
    {
        return '<section class="oh-section">'
            . '<h1 class="oh-section__title">' . self::e($title) . '</h1>'
            . $body
            . '</section>';
    }

    /**
     * @param list<object> $articles
     */
    private static function cards(array $articles, string $locale): string
    {
        if ([] === $articles) {
            return '<p class="oh-meta">Zatiaľ tu nie je žiadny článok.</p>';
        }

        $cards = '';

        foreach ($articles as $article) {
            $data = get_object_vars($article);
            $slug = self::field($data, 'slug');
            $title = self::field($data, 'title', 'Bez názvu');
            $date = self::field($data, 'date');
            $excerpt = self::field($data, 'excerpt');
            $image = self::field($data, 'image');
            $href = ContentLocaleServices::mapper()->urlPrefix($locale) . '/blog/' . rawurlencode($slug);

            $cards .= '<div class="oh-card">'
                . ('' === $image ? '' : '<img class="oh-card__image" src="' . self::e($image) . '" alt="">')
                . '<div class="oh-card__body">'
                . '<h2 class="oh-card__title"><a href="' . self::e($href) . '">' . self::e($title) . '</a></h2>'
                . ('' === $date ? '' : '<p class="oh-card__meta">' . self::e($date) . '</p>')
                . ('' === $excerpt ? '' : '<p class="oh-card__excerpt">' . self::e($excerpt) . '</p>')
                . '</div>'
                . '</div>';
        }

        return $cards;
    }

    private static function pager(PageContext $context, ?int $totalPages = null, ?int $page = null): string
    {
        $total = $totalPages ?? max(1, $context->totalPages);
        $current = $page ?? max(1, $context->page);

        if ($total <= 1) {
            return '';
        }

        $path = $context->request->getPathInfo();
        $links = '';

        if ($current > 1) {
            $links .= '<a href="' . self::e(self::pageUrl($path, $current - 1)) . '">Predchádzajúca</a> ';
        }

        $links .= '<span class="oh-meta">Strana ' . $current . ' z ' . $total . '</span>';

        if ($current < $total) {
            $links .= ' <a href="' . self::e(self::pageUrl($path, $current + 1)) . '">Ďalšia</a>';
        }

        return '<p class="oh-pager">' . $links . '</p>';
    }

    private static function pageUrl(string $path, int $page): string
    {
        return $path . '?page=' . $page;
    }

    /**
     * @param list<string>       $terms
     * @param array<string, int> $counts
     */
    private static function cloud(array $terms, array $counts, string $kind, ?string $active): string
    {
        if ([] === $terms) {
            return '';
        }

        $html = '';

        foreach ($terms as $term) {
            $count = $counts[$term] ?? 0;
            $html .= '<a class="oh-tag" href="/blog/' . self::e($kind) . '/' . rawurlencode($term) . '">'
                . self::e($term) . ' (' . $count . ')</a>';
        }

        return '<p class="oh-tags">' . $html . '</p>';
    }

    private static function toc(PageContext $context): string
    {
        if ([] === $context->headings) {
            return '<div class="oh-toc"><h2 class="oh-toc__title">Obsah</h2><p class="oh-meta">Článok nemá členenie.</p></div>';
        }

        $items = '';

        foreach ($context->headings as $heading) {
            $items .= '<li class="oh-toc__item' . ($heading['level'] > 2 ? ' oh-toc__item--sub' : '') . '">'
                . '<a href="#' . self::e($heading['anchor']) . '">' . self::e($heading['text']) . '</a>'
                . '</li>';
        }

        return '<div class="oh-toc"><h2 class="oh-toc__title">Obsah</h2><ul class="oh-toc__list">' . $items . '</ul></div>';
    }

    /**
     * @param array<string, mixed> $data
     */
    private static function field(array $data, string $key, string $default = ''): string
    {
        $value = $data[$key] ?? null;

        if (is_string($value)) {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        return $default;
    }

    private static function copy(PageContext $context, string $key, string $default): string
    {
        $value = $context->copy[$key] ?? null;

        return is_string($value) && '' !== trim($value) ? $value : $default;
    }

    private static function e(mixed $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }
}
