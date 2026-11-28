<?php

declare(strict_types = 1);

namespace Modules\Themes\Ohniva\Tests;

use Modules\Core\Application\Services\AssetManager;
use Modules\Core\Application\Services\View\InlineCss;
use Modules\Core\Domain\ShellNavItem;
use Modules\Core\Infrastructure\Http\Request;
use Modules\Core\Interfaces\HTTP\FrontendLayout;
use Modules\Core\Interfaces\HTTP\PageContext;
use Modules\Core\Interfaces\HTTP\ShellContext;
use Modules\Core\Interfaces\HTTP\ThemeRegistry;
use Modules\Themes\Ohniva\Theme\OhnivaTheme;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * OhnivaThemeTest: the client theme's ported contracts.
 *
 * The live reference is the old responsive.sk CMS page at ohniva-show.sk:
 * Cascade Framework 1.5, conditional IE6 classes, a fixed 920 px stage and
 * textured panels. This port has to keep the look on a kernel document, stay
 * inside the theme class ownership gate, and keep an honest IE6 layout
 * baseline.
 *
 * Three things a screenshot cannot pin are asserted here: every class is
 * `oh-` prefixed (Cascade arrives as `oh-c-`), the theme layer uses no
 * construct IE6 cannot lay out, and every named image resolves under
 * `public/themes/ohniva/`.
 *
 * Skips when the module is not installed, like every module test here. The
 * tearDown guard is deliberate: PHPUnit runs it even after a skipped setUp.
 */
final class OhnivaThemeTest extends TestCase
{
    private const string MODULE = 'Ohniva';

    protected function setUp(): void
    {
        if (!is_dir(APP_BASE_PATH . '/src/Modules/Themes/' . self::MODULE)) {
            $this->markTestSkipped(self::MODULE . ' is not installed, the `ohniva` theme ships with this module.');
        }
    }

    protected function tearDown(): void
    {
        if (!is_dir(APP_BASE_PATH . '/src/Modules/Themes/' . self::MODULE)) {
            $this->markTestSkipped(self::MODULE . ' is not installed, the `ohniva` theme ships with this module.');
        }
    }

    #[Test]
    public function everyPublicSurfaceRendersInTheThemesVocabulary(): void
    {
        $theme = new OhnivaTheme();
        $shell = self::shell();
        $surfaces = [
            'header' => $theme->header($shell),
            'footer' => $theme->footer($shell),
            'wrap' => $theme->pageWrap('<p>Content</p>'),
            'homepage' => $theme->homepage(self::homepageContext()),
            'blog index' => $theme->blogIndex(self::indexContext()),
            'blog search' => $theme->blogSearch(self::searchContext()),
            'blog article' => $theme->blogArticle(self::articleContext()),
            'article tail' => $theme->articleTail('<p>A comment.</p>'),
            'blog tags' => $theme->blogTags(self::tagsContext()),
            'blog categories' => $theme->blogCategories(self::categoriesContext()),
            'author profile' => $theme->authorProfile(self::authorContext()),
            'error' => $theme->errorContent(404, 'Not found', 'No page here.'),
            'auth' => $theme->authPage(
                'Sign in',
                '/login',
                'Sign in',
                [['name' => 'email', 'type' => 'email', 'label' => 'E-mail', 'required' => true]],
                '<input type="hidden" name="_token" value="test">',
                [],
            ),
        ];

        foreach ($surfaces as $surface => $html) {
            $this->assertNotSame('', $html, sprintf('The %s surface rendered nothing.', $surface));
            preg_match_all('/class="([^"]*)"/', $html, $attributes);
            $classes = array_filter(explode(' ', implode(' ', $attributes[1])));

            $this->assertNotSame([], $classes, sprintf('The %s surface renders no class at all.', $surface));

            foreach (array_unique($classes) as $class) {
                $this->assertStringStartsWith(
                    'oh-',
                    $class,
                    sprintf('The %s surface names a class outside the oh- vocabulary: %s.', $surface, $class),
                );
            }
        }
    }

    #[Test]
    public function everyClassTheStylesheetDefinesCarriesTheThemePrefix(): void
    {
        $theme = new OhnivaTheme();
        $unprefixed = [];

        foreach ($theme->criticalCss() as $path) {
            $css = (string) file_get_contents(APP_BASE_PATH . '/modules/Themes/Ohniva/' . self::afterModules($path));
            $css = (string) preg_replace('!/\*.*?\*/!s', '', $css);
            $css = (string) preg_replace('/url\((?:[^)"\']|"[^"]*"|\'[^\']*\')*\)/i', 'url()', $css);
            $css = (string) preg_replace('/"[^"]*"|\'[^\']*\'/', '', $css);
            preg_match_all('/\.([A-Za-z_][A-Za-z0-9_-]*)/', $css, $matches);

            foreach (array_unique($matches[1]) as $class) {
                if (!str_starts_with($class, 'oh-')) {
                    $unprefixed[] = $path . ' .' . $class;
                }
            }
        }

        $this->assertSame([], $unprefixed, 'Every theme class carries the oh- prefix: ' . implode(', ', $unprefixed));
        $this->assertStringContainsString('oh-c-col', InlineCss::files($theme->criticalCss()));
        $this->assertStringContainsString('oh-c-width-1of5', InlineCss::files($theme->criticalCss()));
    }

    #[Test]
    public function theHomepageCarriesTheTemplateRailAndBanners(): void
    {
        $theme = new OhnivaTheme();
        $home = $theme->homepage(self::homepageContext());

        $this->assertMatchesRegularExpression(
            '#<h1[^>]*>[^<]*<b>[^<]+</b>#',
            $home,
            'The page header carries its bold second clause.',
        );
        $this->assertStringContainsString('oh-welcome', $home);
        $this->assertSame(1, substr_count($home, 'oh-welcome__header'), 'One welcome panel header.');
        $this->assertStringContainsString('oh-welcome__body', $home);
        $this->assertStringContainsString('oh-welcome__footer', $home);
        $this->assertSame(8, substr_count($home, 'oh-gallery__link'), 'The gallery lists eight thumbnails.');
        $this->assertSame(4, substr_count($home, 'oh-rail__group'), 'The rail holds four groups.');
        $this->assertSame(9, substr_count($home, 'oh-rail__link'), 'The rail holds nine show links.');
        $this->assertSame(4, substr_count($home, 'oh-banner '), 'Four order banners.');

        foreach (OhnivaTheme::BANNERS as [$kicker, $title, $page, $form]) {
            $this->assertStringContainsString(self::e($kicker), $home);
            $this->assertStringContainsString(self::e($title), $home);
            $this->assertStringContainsString('href="/' . $page . '#form-' . $form . '"', $home);
        }

        $own = $theme->homepage(PageContext::forHomepage(
            Request::create('GET', '/'),
            OhnivaTheme::NAME,
            'sk',
            copy: [
                'home.hero_title' => 'Minimálny PHP 8.5 starter kit',
                'home.ohniva_title' => 'Klientsky nadpis',
            ],
        ));

        $this->assertStringContainsString('Klientsky nadpis', $own, 'The theme reads its own title key.');
        $this->assertStringNotContainsString('starter kit', $own, 'The starter kit title never reaches the client page.');
    }

    #[Test]
    public function theTemplateLinksNameSeededPages(): void
    {
        $seed = APP_BASE_PATH . '/bin/export/ohniva-show/seed/pages';

        if (!is_dir($seed)) {
            $this->markTestSkipped('The ohniva-show seed is pruned; the export carries no bin/export.');
        }

        $slugs = [];

        foreach (glob($seed . '/*.md') ?: [] as $file) {
            $slugs[] = basename($file, '.md');
        }

        $theme = new OhnivaTheme();

        $home = $theme->homepage(self::homepageContext());

        foreach (OhnivaTheme::RAIL as $label => $links) {
            $this->assertStringContainsString(self::e($label), $home, 'The rail names its group ' . $label . '.');

            foreach ($links as $slug => $text) {
                $this->assertContains($slug, $slugs, 'The rail names the seeded page ' . $slug . '.');
                $this->assertStringContainsString('href="/' . $slug . '"', $home);
                $this->assertStringContainsString(self::e($text), $home);
            }
        }

        foreach (OhnivaTheme::BANNERS as [, , $slug]) {
            $this->assertContains($slug, $slugs, 'The banner names the seeded page ' . $slug . '.');
        }
    }

    #[Test]
    public function theIe6StylesheetStaysInsideTheIe6Baseline(): void
    {
        $css = (string) file_get_contents(APP_BASE_PATH . '/modules/Themes/Ohniva/assets/critical/ohniva-ie6.css');
        $css = (string) preg_replace('!/\*.*?\*/!s', '', $css);
        $forbidden = [
            '/display\s*:\s*(inline-)?(flex|grid)/i',
            '/grid-template/i',
            '/\bvar\s*\(/i',
            '/\bcalc\s*\(/i',
            '/\bclamp\s*\(/i',
            '/@supports/i',
            '/:has\s*\(/i',
            '/::?(?:before|after)\b/i',
            '/:nth-/i',
            '/:not\s*\(/i',
            '/:first-child/i',
            '/:last-child/i',
            '/position\s*:\s*fixed/i',
            '/min-height\s*:/i',
            '/(?:^|[;{])\s*max-width\s*:/m',
            '/background-size\s*:/i',
            '/\bopacity\s*:/i',
            '/rgba\s*\(/i',
            '/border-radius\s*:/i',
            '/box-shadow\s*:/i',
            '/(?<!text-)transform\s*:/i',
            '/transition\s*:/i',
            '/linear-gradient/i',
        ];

        foreach ($forbidden as $pattern) {
            $this->assertDoesNotMatchRegularExpression($pattern, $css, 'The IE6 sheet uses a construct IE6 cannot lay out: ' . $pattern);
        }

        $this->assertFalse(str_contains($css, 'expression('), 'No expression() rule, the old site used one for glyphs.');
        $this->assertStringContainsString('.oh-ie6', $css, 'The sheet is scoped to the class the init script sets.');

        $selectors = (string) preg_replace('!/\*.*?\*/!s', '', $css);
        $selectors = (string) preg_replace('/\{[^}]*\}/', "}\n", $selectors);

        foreach (explode("}\n", $selectors) as $ruleset) {
            $ruleset = trim($ruleset);

            if ('' === $ruleset) {
                continue;
            }

            foreach (explode(',', $ruleset) as $selector) {
                $selector = trim($selector);

                if ('' === $selector || str_starts_with($selector, '@')) {
                    continue;
                }

                $this->assertStringContainsString(
                    '.oh-ie6',
                    $selector,
                    'Every IE6 selector is scoped by .oh-ie6: ' . $selector,
                );
            }
        }
    }

    #[Test]
    public function theModernStylesheetKeepsTheTemplateLook(): void
    {
        $css = (string) file_get_contents(APP_BASE_PATH . '/modules/Themes/Ohniva/assets/critical/ohniva.css');

        foreach (['latolight', 'latobold', 'latin_modern_roman_dunhil10Rg', 'engebrechtreregular'] as $family) {
            $this->assertStringContainsString($family, $css, 'The modern sheet declares ' . $family . '.');
        }

        $this->assertMatchesRegularExpression('/position\s*:\s*fixed/i', $css, 'The backdrop is fixed.');
        $this->assertMatchesRegularExpression('/text-shadow\s*:/i', $css);
        $this->assertMatchesRegularExpression('/border-radius\s*:/i', $css);
        $this->assertMatchesRegularExpression('/linear-gradient/i', $css);
        $this->assertMatchesRegularExpression('/box-shadow\s*:/i', $css);
        $this->assertMatchesRegularExpression('/rgba\s*\(/i', $css);
        $this->assertMatchesRegularExpression('/transition\s*:/i', $css);
    }

    #[Test]
    public function theBackdropShipsEverySlide(): void
    {
        $this->assertCount(8, OhnivaTheme::SLIDES, 'The template backdrop carries eight photographs.');

        $header = (new OhnivaTheme())->header(self::shell());

        foreach (OhnivaTheme::SLIDES as $slide) {
            $path = '/themes/ohniva/slides/' . $slide . '.jpg';
            $this->assertFileExists(APP_BASE_PATH . '/public' . $path, 'The slide ' . $slide . ' is shipped.');
            $this->assertStringContainsString('src="' . $path . '"', $header, 'The backdrop names ' . $slide . '.');
        }
    }

    #[Test]
    public function theBackdropVeilKeepsTheHeaderReadable(): void
    {
        $header = (new OhnivaTheme())->header(self::shell());
        $css = (string) file_get_contents(APP_BASE_PATH . '/modules/Themes/Ohniva/assets/critical/ohniva.css');
        $ie6 = (string) file_get_contents(APP_BASE_PATH . '/modules/Themes/Ohniva/assets/critical/ohniva-ie6.css');

        $this->assertMatchesRegularExpression(
            '/class="oh-slide[^"]*"[^>]*>.*<div class="oh-backdrop__veil"><\/div>\s*<\/div>/s',
            $header,
            'The veil follows the slides inside the backdrop.',
        );

        $this->assertMatchesRegularExpression(
            '/\.oh-backdrop__veil\s*\{[^}]*rgba\s*\([^}]*repeating-linear-gradient[^}]*linear-gradient/s',
            $css,
            'The modern sheet darkens the photograph and draws the grid and the top gradient.',
        );

        self::assertSame(
            1,
            preg_match('/\.oh-backdrop__veil\s*\{([^}]*)\}/', $css, $veil),
            'The veil rule is one block the colour layers can be read from.',
        );

        self::assertSame(
            4,
            substr_count($veil[1], 'radial-gradient'),
            'Four irregular colour washes keep the translucent layers from looking even.',
        );

        foreach (['34, 149, 204', '231, 204, 126', '255, 127, 0', '66, 172, 223'] as $colour) {
            self::assertStringContainsString(
                'rgba(' . $colour . ',',
                $veil[1],
                'The colour wash ' . $colour . ' comes from the template palette.',
            );
        }

        self::assertSame(
            2,
            substr_count($veil[1], 'transparent 24px'),
            'Both grid directions use a 24px cell, fine enough to read as texture.',
        );

        self::assertStringContainsString(
            'feTurbulence',
            $veil[1],
            'A grain layer keeps the washed photograph from looking like a flat filter.',
        );

        $this->assertMatchesRegularExpression(
            '/\.oh-ie6 \.oh-backdrop__veil\s*\{[^}]*display\s*:\s*none/s',
            $ie6,
            'IE6 hides the veil, because it cannot draw rgba or a gradient.',
        );
    }

    #[Test]
    public function theBackdropPhotoFillsTheViewport(): void
    {
        $css = (string) file_get_contents(APP_BASE_PATH . '/modules/Themes/Ohniva/assets/critical/ohniva.css');

        $this->assertMatchesRegularExpression(
            '/\.oh-slide\s*\{[^}]*width\s*:\s*100%[^}]*height\s*:\s*100%[^}]*object-fit\s*:\s*cover/s',
            $css,
            'The 600 x 400 photograph covers the fixed backdrop instead of sitting in a corner.',
        );
    }

    #[Test]
    public function theBackdropStopsForReducedMotion(): void
    {
        $script = (string) file_get_contents(APP_BASE_PATH . '/modules/Themes/Ohniva/assets/scripts/ohniva.js');
        $css = (string) file_get_contents(APP_BASE_PATH . '/modules/Themes/Ohniva/assets/critical/ohniva.css');

        $this->assertStringContainsString('prefers-reduced-motion: reduce', $script, 'The rotation asks the reader first.');
        $this->assertMatchesRegularExpression('/matchMedia\s*\(/', $script);
        $this->assertMatchesRegularExpression(
            '/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*transition/i',
            $css,
            'The stylesheet motion sits behind the same query.',
        );

        $header = (new OhnivaTheme())->header(self::shell());
        $this->assertStringContainsString('oh-slide--active', $header, 'The first slide is the no-JavaScript backdrop.');
    }

    #[Test]
    public function theGalleryShipsEveryThumbnail(): void
    {
        $this->assertCount(8, OhnivaTheme::THUMBS);

        $home = (new OhnivaTheme())->homepage(self::homepageContext());

        foreach (OhnivaTheme::THUMBS as $thumb) {
            $path = APP_BASE_PATH . '/public/themes/ohniva/thumbs/' . $thumb . '.jpg';
            $this->assertFileExists($path, 'The thumbnail ' . $thumb . ' is shipped.');

            $size = getimagesize($path);
            $this->assertIsArray($size);
            $this->assertSame([140, 105], [$size[0], $size[1]], 'The thumbnail ' . $thumb . ' is 140 x 105.');
            $this->assertStringContainsString('src="/themes/ohniva/thumbs/' . $thumb . '.jpg"', $home);
        }
    }

    #[Test]
    public function theInitScriptShivsHtml5AndMarksIe6(): void
    {
        $script = (new OhnivaTheme())->themeInitScript();

        $this->assertStringContainsString('<script', $script);
        $this->assertStringContainsString('createElement', $script);
        $this->assertStringContainsString('oh-ie6', $script);
        $this->assertStringContainsString('querySelector', $script);
    }

    #[Test]
    public function everyAssetTheThemeNamesIsShipped(): void
    {
        $theme = new OhnivaTheme();
        $html = $theme->header(self::shell()) . $theme->footer(self::shell());
        $css = InlineCss::files($theme->criticalCss());
        $named = [];

        preg_match_all('#(?:url\(["\']?|src=["\'])(/themes/ohniva/[^"\')]+)#', $html . $css, $matches);

        foreach (array_unique($matches[1]) as $raw) {
            $path = (string) preg_replace('/[?#].*$/', '', $raw);
            $named[] = $path;
            $this->assertFileExists(APP_BASE_PATH . '/public' . $path, sprintf('The theme names %s but does not ship it.', $path));
        }

        $this->assertNotSame([], $named, 'The theme ships at least the logo and the backdrop.');
        $this->assertStringNotContainsString('http://', $html . $css);
        $this->assertStringNotContainsString('https://', $html . $css);
        $this->assertStringNotContainsString('//cdn', $html . $css);
    }

    #[Test]
    public function noBuildPageStillCarriesTheFullStylesheet(): void
    {
        $theme = new OhnivaTheme();
        $css = InlineCss::files($theme->criticalCss());

        $this->assertCount(3, $theme->criticalCss(), 'Cascade, the modern sheet and the IE6 sheet.');
        $this->assertStringContainsString('.oh-header', $css);
        $this->assertStringContainsString('.oh-panel', $css);
        $this->assertStringContainsString('.oh-backdrop', $css);
        $this->assertStringContainsString('.oh-ie6', $css);
        $this->assertStringContainsString('oh-c-site-center', $css);
        $this->assertGreaterThan(20_000, strlen($css), 'The no-build stylesheet is the complete design, not a subset.');
    }

    #[Test]
    public function theBuiltBundleCarriesTheThemesStylesheet(): void
    {
        $manifestPath = APP_BASE_PATH . '/public/dist/ohniva/manifest.json';

        if (!is_file($manifestPath)) {
            $this->markTestSkipped('public/dist/ohniva has not been built; run make assets.');
        }

        $theme = new OhnivaTheme();
        $assets = new AssetManager($theme->bundle());
        $this->assertTrue($assets->isAvailable(), 'The ohniva bundle is known to AssetManager.');

        $url = $assets->cssUrls($theme->jsKey())[0] ?? null;
        $this->assertNotNull($url, 'The build emits a stylesheet for the base entry.');

        $built = (string) file_get_contents(APP_BASE_PATH . '/public' . $url);
        $this->assertStringContainsString('.oh-header', $built);
        $this->assertStringContainsString('oh-c-site-center', $built);

        $html = FrontendLayout::render('Test', '<p>x</p>', theme: OhnivaTheme::NAME);
        $this->assertStringContainsString($built, $html, 'The document carries the built bytes once.');
    }

    #[Test]
    public function discoveryFindsTheTheme(): void
    {
        $this->assertTrue(ThemeRegistry::has(OhnivaTheme::NAME));
        $theme = ThemeRegistry::get(OhnivaTheme::NAME);

        $this->assertInstanceOf(OhnivaTheme::class, $theme);
        $this->assertSame(OhnivaTheme::NAME, $theme->bundle());
        $this->assertSame(OhnivaTheme::NAME, $theme->jsKey());
        $this->assertSame('oh', $theme->prefix());
    }

    private static function e(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private static function afterModules(string $path): string
    {
        return (string) preg_replace('#^Modules/[^/]+/#', '', $path);
    }

    private static function homepageContext(): PageContext
    {
        return PageContext::forHomepage(
            Request::create('GET', '/'),
            OhnivaTheme::NAME,
            'sk',
            copy: ['title' => 'Ohnivá show'],
            latestArticles: [self::article('a', 'Biela noc')],
            blogHref: '/blog',
        );
    }

    private static function indexContext(): PageContext
    {
        return PageContext::forBlogIndex(
            Request::create('GET', '/blog'),
            OhnivaTheme::NAME,
            'sk',
            [self::article('a', 'Biela noc')],
        );
    }

    private static function searchContext(): PageContext
    {
        return PageContext::forBlogSearch(
            Request::create('GET', '/blog?q=ohen'),
            OhnivaTheme::NAME,
            'sk',
            'ohen',
            [self::article('a', 'Biela noc')],
        );
    }

    private static function articleContext(): PageContext
    {
        return PageContext::forBlogArticle(
            Request::create('GET', '/blog/a'),
            OhnivaTheme::NAME,
            'sk',
            'a',
            'Biela noc',
            '<p>Body <em>raw</em>.</p>',
            '<a href="/authors/x">By X</a>',
            '<a href="/blog/tags/ohen">oheň</a>',
            '',
            '',
            [['level' => 2, 'text' => 'First part', 'anchor' => 'first-part']],
            [],
            2,
        );
    }

    private static function tagsContext(): PageContext
    {
        return PageContext::forBlogTags(
            Request::create('GET', '/blog/tags'),
            OhnivaTheme::NAME,
            'sk',
            ['ohen'],
            ['ohen' => 1],
        );
    }

    private static function categoriesContext(): PageContext
    {
        return PageContext::forBlogCategories(
            Request::create('GET', '/blog/categories'),
            OhnivaTheme::NAME,
            'sk',
            ['show'],
            ['show' => 1],
        );
    }

    private static function authorContext(): PageContext
    {
        return PageContext::forAuthorProfile(
            Request::create('GET', '/authors/x'),
            OhnivaTheme::NAME,
            'sk',
            ['id' => 'x', 'name' => 'Ondrej', 'avatar' => null],
            [self::article('a', 'Biela noc')],
            '2026',
        );
    }

    private static function shell(): ShellContext
    {
        return ShellContext::from(
            'Ohnivá show',
            [
                new ShellNavItem('Vitajte', '/', true),
                new ShellNavItem('Info', '/about'),
                new ShellNavItem('Kontakt', '/contact'),
            ],
            [new ShellNavItem('Články', '/blog')],
            '/',
            null,
            'sk',
            ['sk'],
            false,
        );
    }

    private static function article(string $slug, string $title): object
    {
        return (object) [
            'slug' => $slug,
            'title' => $title,
            'date' => '2026-01-01',
            'category' => 'Show',
            'author' => 'Ondrej',
            'excerpt' => 'Krátka reportáž.',
            'image' => '',
        ];
    }
}
