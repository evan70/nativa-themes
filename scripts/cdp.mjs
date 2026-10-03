/**
 * cdp.mjs — a dependency-free Chrome DevTools Protocol client.
 *
 * Enough CDP to drive a page: launch headless Chrome, open a session, send
 * commands, collect events, evaluate expressions. The gallery has two checks
 * that need it (`shoot.mjs` for "does every page load clean", `interactions.mjs`
 * for "do the ported behaviours work"), and neither should own a WebSocket
 * implementation.
 *
 * Uses the WebSocket global built into Node 22+ — no puppeteer, no
 * `ws` dependency, nothing to install for a repository this small.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** Candidate Chrome binaries, most specific first. */
const CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

/** @throws when no Chrome is installed, rather than failing obscurely later. */
export const findChrome = () => {
  const found = CANDIDATES.find((path) => path && existsSync(path));
  if (!found) {
    throw new Error(
      'no Chrome binary found — install one or set CHROME_PATH to its path',
    );
  }
  return found;
};

/**
 * Launch headless Chrome with a debugging port and return a handle.
 *
 * The caller closes it; nothing here registers a process exit hook, because a
 * script that dies on an exception should not leave a browser behind but a
 * script that finishes should not leave one either, and the caller knows when
 * it is finished.
 */
export const launchChrome = async ({ port = 9333, width = 1280, height = 900 } = {}) => {
  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      `--window-size=${width},${height}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  const url = await (async () => {
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
        const page = list.find((target) => target.type === 'page');
        if (page) return page.webSocketDebuggerUrl;
      } catch {
        // Chrome is still starting up.
      }
      await sleep(250);
    }
    throw new Error('Chrome never exposed a debugging target');
  })();

  return { chrome, url };
};

/**
 * Open a session over a WebSocket.
 *
 * `send` resolves the matching response; every other message lands in
 * `events`, which the caller drains between checks so a stale event from the
 * previous page is never attributed to the current one.
 */
export const openSession = async (url) => {
  const socket = new WebSocket(url);
  await new Promise((done, fail) => {
    socket.addEventListener('open', done, { once: true });
    socket.addEventListener('error', fail, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  const events = [];

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const waiter = message.id !== undefined ? pending.get(message.id) : undefined;
    if (!waiter) {
      events.push(message);
      return;
    }
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result);
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  /** Evaluate an expression and return its (JSON) value. */
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ??
          result.exceptionDetails.text,
      );
    }
    return result.result.value;
  };

  return { send, events, evaluate, close: () => socket.close() };
};

/**
 * Open a page with the default domains enabled and a colour scheme emulated.
 *
 * `theme-init.js` reads `prefers-color-scheme` on every page, so emulating the
 * media feature is how a scheme gets checked; localStorage is empty in a fresh
 * profile, so nothing overrides it.
 */
export const openPage = async (client, { scheme = 'dark', width, height } = {}) => {
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Log.enable');
  await client.send('Network.enable');
  await client.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-color-scheme', value: scheme }],
  });
  if (width && height) {
    await client.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
  }
};

/** Navigate and wait for the entry module to run and the fonts to settle. */
export const goto = async (client, url, waitMs = 1200) => {
  await client.send('Page.navigate', { url });
  await sleep(waitMs);
};

export { sleep };
