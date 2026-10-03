/**
 * mark.ts — the moonshine admin demo entry.
 *
 * Pulls in the admin stylesheets the app's PHP layout links as two separate
 * stylesheets (`mark/index.css` and `mark-switch.css`) and wires the chrome
 * behaviours the app ships as an inline script in `AdminLayout` —
 * `Cardboard/…/assets/scripts/admin-shell.js`.
 *
 * The demo lives outside `src/`, which is the directory `scripts/sync-themes.mjs`
 * owns: sync deletes and recopies `src/<theme>/`, so anything hand-written has
 * to live somewhere else or the next sync would erase it.
 *
 * The admin stylesheets declare `@font-face` rules for the commercial Gilroy
 * font. Those rules are removed from the EMITTED css by
 * `stripCommercialFontsPlugin` — see its header for why overriding them with a
 * substitute was not reliable enough.
 */
import '../src/moonshine/mark/index.css';
import '../src/moonshine/mark-switch.css';
import './mark-extra.css';

/** Flip `data-theme` on <html> and remember the choice. */
const initThemeToggle = (): void => {
  const buttons = document.querySelectorAll('[data-theme-toggle]');
  for (let i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', () => {
      const html = document.documentElement;
      const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', next);
      try {
        localStorage.setItem('nativa-theme', next);
      } catch (error) {
        // Private mode: the toggle still works for this page.
      }
    });
  }
};

/** Desktop collapse, persisted across pages. */
const initSidebarCollapse = (): void => {
  const button = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('layout-sidebar');
  const page = document.getElementById('layout-page');
  if (!button || !sidebar) return;

  const apply = (collapsed: boolean): void => {
    sidebar.classList.toggle('layout-sidebar--collapsed', collapsed);
    if (page) page.classList.toggle('layout-page--collapsed', collapsed);
  };

  button.addEventListener('click', () => {
    const collapsed = !sidebar.classList.contains('layout-sidebar--collapsed');
    apply(collapsed);
    try {
      localStorage.setItem('mark-sidebar', collapsed ? 'collapsed' : 'open');
    } catch (error) {
      // Persisting is best effort.
    }
  });

  try {
    apply(localStorage.getItem('mark-sidebar') === 'collapsed');
  } catch (error) {
    // No stored preference — leave the sidebar open.
  }
};

/** Mobile drawer: hamburger opens, overlay or Escape closes. */
const initMobileDrawer = (): void => {
  const hamburger = document.getElementById('sidebar-hamburger');
  const sidebar = document.getElementById('layout-sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!hamburger || !sidebar) return;

  const setOpen = (open: boolean): void => {
    sidebar.classList.toggle('layout-sidebar--open', open);
    if (overlay) overlay.classList.toggle('sidebar-overlay--visible', open);
    hamburger.setAttribute('aria-expanded', open ? 'true' : 'false');
  };

  hamburger.addEventListener('click', () => {
    setOpen(!sidebar.classList.contains('layout-sidebar--open'));
  });

  if (overlay) {
    overlay.addEventListener('click', () => setOpen(false));
  }

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (!sidebar.classList.contains('layout-sidebar--open')) return;
    setOpen(false);
    hamburger.focus();
  });
};

/**
 * Collapsible sidebar nav groups.
 *
 * The expanded state class is `is-expanded` on the group wrapper — that is
 * what `mark/chrome.css` keys the chevron rotation and the children reveal
 * off. The markup ships `aria-expanded="false"` and the group collapsed, which
 * is why the Blog group on the demo page is closed by default.
 */
const initNavGroups = (): void => {
  const buttons = document.querySelectorAll('[data-toggle-group]');
  for (let i = 0; i < buttons.length; i++) {
    const button = buttons[i];
    const group = button.parentElement;
    button.addEventListener('click', () => {
      if (!group) return;
      const open = group.classList.toggle('is-expanded');
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
};

/** Ctrl+K / Cmd+K opens the command palette; arrows move, Enter selects. */
const initCommandPalette = (): void => {
  const overlay = document.getElementById('m-palette-overlay');
  // The markup is authored here, so the narrow is a real guarantee rather
  // than a cast — `getElementById` widens to HTMLElement, which has no `value`.
  const input = document.getElementById('m-palette-input') as HTMLInputElement | null;
  const list = document.getElementById('m-palette-list');
  if (!overlay || !input || !list) return;

  const commands = [
    { label: 'Dashboard', href: '#dashboard' },
    { label: 'Articles', href: '#articles' },
    { label: 'Users', href: '#users' },
    { label: 'Roles', href: '#roles' },
    { label: 'Media', href: '#media' },
    { label: 'Settings', href: '#settings' },
  ];

  let active = 0;

  const render = (): void => {
    const query = input.value.trim().toLowerCase();
    const matches = commands.filter(
      (command) => command.label.toLowerCase().indexOf(query) !== -1,
    );
    active = 0;
    list.innerHTML =
      matches.length === 0
        ? '<div class="m-palette-empty">No matching command</div>'
        : matches
            .map(
              (command, index) =>
                '<div class="m-palette-item' +
                (index === 0 ? ' active' : '') +
                '" data-href="' +
                command.href +
                '"><span class="m-palette-item__icon">›</span>' +
                '<span class="m-palette-item__label">' +
                command.label +
                '</span></div>',
            )
            .join('');
  };

  const open = (): void => {
    overlay.classList.add('open');
    input.value = '';
    render();
    input.focus();
  };

  const close = (): void => {
    overlay.classList.remove('open');
  };

  const highlight = (index: number): void => {
    const items = list.querySelectorAll('.m-palette-item');
    if (items.length === 0) return;
    active = (index + items.length) % items.length;
    for (let i = 0; i < items.length; i++) {
      items[i].classList.toggle('active', i === active);
    }
  };

  input.addEventListener('input', render);

  document.addEventListener('keydown', (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (overlay.classList.contains('open')) close();
      else open();
      return;
    }
    if (!overlay.classList.contains('open')) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      highlight(active + 1);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      highlight(active - 1);
    }
    if (event.key === 'Enter') {
      const items = list.querySelectorAll<HTMLElement>('.m-palette-item');
      const chosen = items[active];
      if (chosen) {
        const href = chosen.dataset.href;
        close();
        if (href) window.location.hash = href;
      }
    }
  });

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  list.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target || !target.classList.contains('m-palette-item')) return;
    const item = target.closest<HTMLElement>('.m-palette-item');
    const href = item ? item.dataset.href : undefined;
    close();
    if (href) window.location.hash = href;
  });
};

const onDomReady = (): void => {
  initThemeToggle();
  initSidebarCollapse();
  initMobileDrawer();
  initNavGroups();
  initCommandPalette();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', onDomReady);
} else {
  onDomReady();
}
