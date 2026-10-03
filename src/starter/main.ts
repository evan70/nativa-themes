/**
 * main.ts — minimal starter frontend entry.
 *
 * Imported CSS is bundled and emitted alongside the JS; the PHP layout
 * resolves both via the Vite manifest (AssetManager).
 *
 * ES2015-safe: no `?.`, `??` or other Chrome 70-unsupported syntax.
 */

import './base/index.css';
import { containerQueryManager } from './container-query';
import { initTocScrollspy } from './toc-scrollspy';
import { initCodeHighlight } from './code-highlight';

// ── PWA manifest ───────────────────────────────────────────────

const injectManifest = (): void => {
  if (document.querySelector('link[rel="manifest"]') !== null) return
  const link = document.createElement('link')
  link.rel = 'manifest'; link.href = '/site.webmanifest'
  document.head.appendChild(link)
}

// ── Init ───────────────────────────────────────────────────────

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

window.addEventListener('load', injectManifest)
