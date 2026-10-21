/**
 * pages.mjs — every page the gallery publishes, in gallery order.
 *
 * One list, two checkers: `shoot.mjs` walks it in a real browser before a
 * push, `check-pages.mjs` walks the deployed site after one. A page added to
 * `vite.config.ts` but not here is a page nobody verifies, which is why the
 * count is asserted against the build output by `check-pages.mjs --dist`.
 *
 * `expect` is a string the served HTML must contain. For generated pages it is
 * a CSS custom property the theme's own inlined stylesheet declares; for
 * hand-written pages the stylesheet is a separate asset, so it is the theme's
 * class prefix (the token would not appear in the HTML at all — measured, not
 * assumed: checking tokens there failed 16 of 17 pages for that reason).
 */

export const PAGES = [
  { name: 'gallery', url: '/', expect: 'class="gal-' },
  { name: 'starter/home', url: '/starter/', expect: 'class="st-' },
  { name: 'starter/blog', url: '/starter/blog/', expect: 'class="st-' },
  { name: 'starter/article', url: '/starter/article/', expect: 'class="st-' },
  { name: 'starter/tags', url: '/starter/tags/', expect: 'class="st-' },
  { name: 'starter/author', url: '/starter/author/', expect: 'class="st-' },
  { name: 'erik/home', url: '/erik/', expect: 'class="er-' },
  { name: 'erik/blog', url: '/erik/blog/', expect: 'class="er-' },
  { name: 'erik/article', url: '/erik/article/', expect: 'class="er-' },
  { name: 'erik/tags', url: '/erik/tags/', expect: 'class="er-' },
  { name: 'erik/author', url: '/erik/author/', expect: 'class="er-' },
  { name: 'magazine/home', url: '/magazine/', expect: 'class="mag-' },
  { name: 'magazine/blog', url: '/magazine/blog/', expect: 'class="mag-' },
  { name: 'magazine/article', url: '/magazine/article/', expect: 'class="mag-' },
  { name: 'magazine/tags', url: '/magazine/tags/', expect: 'class="mag-' },
  { name: 'magazine/author', url: '/magazine/author/', expect: 'class="mag-' },
  { name: 'moonshine/admin', url: '/moonshine/', expect: 'class="m-stat' },
  // Generated from the themes themselves; see vite.config.ts.
  { name: 'boson/home', url: '/boson/', expect: '--bo-bg' },
  { name: 'boson/blog', url: '/boson/blog/', expect: '--bo-bg' },
  { name: 'boson/article', url: '/boson/article/', expect: '--bo-bg' },
  { name: 'boson/tags', url: '/boson/tags/', expect: '--bo-bg' },
  { name: 'boson/categories', url: '/boson/categories/', expect: '--bo-bg' },
  { name: 'boson/author', url: '/boson/author/', expect: '--bo-bg' },
  { name: 'boson/search', url: '/boson/search/', expect: '--bo-bg' },
  { name: 'jednotka/home', url: '/jednotka/', expect: '--comments-accent' },
  { name: 'jednotka/blog', url: '/jednotka/blog/', expect: '--comments-accent' },
  { name: 'jednotka/article', url: '/jednotka/article/', expect: '--comments-accent' },
  { name: 'jednotka/tags', url: '/jednotka/tags/', expect: '--comments-accent' },
  { name: 'jednotka/categories', url: '/jednotka/categories/', expect: '--comments-accent' },
  { name: 'jednotka/author', url: '/jednotka/author/', expect: '--comments-accent' },
  { name: 'jednotka/search', url: '/jednotka/search/', expect: '--comments-accent' },
  { name: 'mono/home', url: '/mono/', expect: '--brand-gold' },
  { name: 'mono/blog', url: '/mono/blog/', expect: '--brand-gold' },
  { name: 'mono/article', url: '/mono/article/', expect: '--brand-gold' },
  { name: 'mono/tags', url: '/mono/tags/', expect: '--brand-gold' },
  { name: 'mono/categories', url: '/mono/categories/', expect: '--brand-gold' },
  { name: 'mono/author', url: '/mono/author/', expect: '--brand-gold' },
  { name: 'mono/search', url: '/mono/search/', expect: '--brand-gold' },
];
