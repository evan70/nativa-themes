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
    public function theThemeStylesheetStaysInsideTheIe6Baseline(): void
    {
        $css = (string) file_get_contents(APP_BASE_PATH . '/modules/Themes/Ohniva/assets/critical/ohniva.css');
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
            $this->assertDoesNotMatchRegularExpression($pattern, $css, 'The theme layer uses an IE6-forbidden construct: ' . $pattern);
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

        foreach (array_unique($matches[1]) as $path) {
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

        $this->assertStringContainsString('.oh-header', $css);
        $this->assertStringContainsString('.oh-panel', $css);
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
