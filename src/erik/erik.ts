/**
 * erik.ts — erik theme frontend entry.
 *
 * The theme carries no custom JS of its own: the theme-init inline script
 * (Shell::themeInitScript) owns the data-theme restore, the shared toggle
 * handler ships in the layout, and the code highlighter + copy buttons run
 * from the shared module. Keep the bundle independent from the starter
 * stylesheet; the PHP layout selects it through AssetManager('erik').
 */

import './erik/index.css';
import { containerQueryManager } from './container-query';
import { initTocScrollspy } from './toc-scrollspy';
import { initCodeHighlight } from './code-highlight';

// The erik bundle carries the same three runtime helpers as the starter
// bundle, byte-identical copies (FrontendPackageParityTest). Only
// initCodeHighlight has markup to act on today: erik's article view renders
// .er-toc__link without data-heading, and no erik surface emits data-cq. The
// other two are wired so a future erik surface that needs them does not have
// to touch the build — they cost nothing while idle (they return early
// without their data-cq / data-heading selectors).
const onDomReady = (): void => {
  containerQueryManager.init()
  initTocScrollspy()
  initCodeHighlight()
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onDomReady)
} else {
  onDomReady()
}
