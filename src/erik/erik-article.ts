/**
 * erik-article.ts — the article surface's script, and its stylesheet.
 *
 * Two things an article page needs and no other erik surface does:
 *
 * - `erik-article.css`, the comments and reader-questions blocks.
 * - `initInlineEditor()`, the author's Markdown editor over the canonical
 *   `<textarea name="body">` that `Blog\...\BlogInlineEditor` renders. The
 *   markup exists only on an article the reader may edit.
 *
 * Until 2026-11-25 the editor was imported by `erik.ts`, so every page
 * downloaded a Markdown renderer, a toolbar and a preview panel that had no
 * textarea to attach to. It moved here, where the surface that renders the
 * markup is the surface that tags the script.
 *
 * The stylesheet is imported rather than declared as a second input: one
 * entry produces one manifest row, so the CSS and the script cannot drift
 * apart in the build. The surface file is therefore a classic script and the
 * factory still emits no shared chunk.
 */

import './erik-article.css';
import { initInlineEditor } from './inline-editor';

const onDomReady = (): void => {
  initInlineEditor();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onDomReady);
} else {
  onDomReady();
}
