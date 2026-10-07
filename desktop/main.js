// BitBin desktop: a tray icon and a system-wide shortcut that open a small window
// to save the clipboard as a BitBin item. Talks only to the token API (/api/v1).

const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  clipboard,
  dialog,
  globalShortcut,
  ipcMain,
  nativeImage,
  nativeTheme,
  net,
  protocol,
  safeStorage,
  screen,
  shell,
} = require('electron');

const { ApiError, apiRequest, baseUrls, buildItemBody, buildSuggestBody, PRODUCTION_URL } = require('./src/api');
const { createConfigStore } = require('./src/config');
const { ITEM_TYPES, parseTags, prefillFrom } = require('./src/guess');
const {
  MAX_UPLOAD_BYTES,
  baseName,
  buildFileForm,
  checkFile,
  classifyFile,
  clipboardImageName,
  PICKER_EXTENSIONS,
} = require('./src/files');

// The app's pages are served from ./renderer over this scheme rather than file://:
// a CSP `'self'` doesn't match file:// pages, and the IPC handlers below only
// answer frames from this origin.
const APP_SCHEME = 'bitbin-app';
const RENDERER_DIR = path.join(__dirname, 'renderer');
const RENDERER_URL = `${APP_SCHEME}://app/`;

protocol.registerSchemesAsPrivileged([
  { scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

/** Longest clipboard text handed to the capture window; the API rejects far less. */
const MAX_CAPTURE_CHARS = 200 * 1000;

const CAPTURE_WIDTH = 560;
const CAPTURE_MIN_HEIGHT = 200;
const CAPTURE_MAX_HEIGHT = 820;

const SETTINGS_WIDTH = 720;

let config;
let tray = null;
let captureWindow = null;
let settingsWindow = null;
let pendingCapture = prefillFrom('');
/** A file or image waiting to be saved: `{ name, type, bytes }`. Lives in this process only. */
let attachment = null;
let shortcutActive = false;
let quitting = false;

const sites = () => baseUrls({ packaged: app.isPackaged });
const fetchImpl = (url, init) => net.fetch(url, init);
const api = (apiPath, options, settings = config.load()) => apiRequest(fetchImpl, settings, apiPath, options);

// ---------------------------------------------------------------- windows

function createWindow(file, options) {
  const win = new BrowserWindow({
    show: false,
    backgroundColor: '#0a0b0d',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    ...options,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  win.removeMenu();
  // Closing a window only hides it: the app lives in the tray until Quit
  win.on('close', (event) => {
    if (quitting) return;
    event.preventDefault();
    win.hide();
  });
  win.loadURL(`${RENDERER_URL}${file}`);
  return win;
}

/** The clipboard's text, or '' when it can't be read. Electron's clipboard API is async. */
async function readClipboardText() {
  try {
    const text = await clipboard.readText();
    return typeof text === 'string' ? text.slice(0, MAX_CAPTURE_CHARS) : '';
  } catch (error) {
    console.error('Could not read the clipboard:', error);
    return '';
  }
}

/** What the capture window shows for the attachment: never the bytes. */
function attachmentInfo() {
  return attachment ? { name: attachment.name, type: attachment.type, size: attachment.bytes.length } : null;
}

/** Holds a file for saving after the same checks the server makes. Throws a message safe to show. */
function setAttachment(name, bytes) {
  const fileName = baseName(name);
  const problem = checkFile(fileName, bytes.length);
  if (problem) throw new ApiError(problem, 400);
  attachment = { name: fileName, type: classifyFile(fileName), bytes };
  return attachmentInfo();
}

/** The clipboard's image as a PNG, or null when it holds none (or one too big to save). */
async function readClipboardImage() {
  try {
    const image = await clipboard.readImage();
    if (!image || image.isEmpty()) return null;
    const bytes = image.toPNG();
    return bytes.length > 0 && bytes.length <= MAX_UPLOAD_BYTES ? bytes : null;
  } catch (error) {
    console.error('Could not read an image from the clipboard:', error);
    return null;
  }
}

async function showCapture({ fromClipboard }) {
  attachment = null;
  const text = fromClipboard ? await readClipboardText() : '';
  pendingCapture = prefillFrom(text);

  // A copied screenshot or image becomes an image item; text on the clipboard wins when both are there
  if (fromClipboard && !text.trim()) {
    const png = await readClipboardImage();
    if (png) {
      const info = setAttachment(clipboardImageName(), png);
      pendingCapture = { type: 'note', title: info.name.replace(/\.png$/, ''), content: '', url: '' };
    }
  }

  if (!captureWindow) {
    captureWindow = createWindow('capture.html', {
      width: CAPTURE_WIDTH,
      height: 700,
      frame: false,
      resizable: false,
      maximizable: false,
      fullscreenable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
    });
  }

  // Centre it on the screen the pointer is on
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const [width, height] = captureWindow.getSize();
  captureWindow.setPosition(
    Math.round(workArea.x + (workArea.width - width) / 2),
    Math.round(workArea.y + Math.max(40, (workArea.height - height) / 3))
  );

  captureWindow.show();
  captureWindow.focus();
  // A window that is still loading asks for the capture itself once it's ready
  if (!captureWindow.webContents.isLoading()) captureWindow.webContents.send('capture:open');
}

/** Opens the capture window. Never rejects: a failure is logged, not shown as a crash dialog. */
function openCapture(options) {
  showCapture(options).catch((error) => console.error('Could not open the capture window:', error));
}

function showSettings() {
  if (!settingsWindow) {
    settingsWindow = createWindow('settings.html', {
      width: SETTINGS_WIDTH,
      height: 520,
      useContentSize: true,
      resizable: false,
      maximizable: false,
      fullscreenable: false,
      title: 'BitBin settings',
    });
    // It's shown once the page has sized it to its content (window:fit), so it never
    // opens at the wrong size. The timer is a fallback if the page fails to load.
    const win = settingsWindow;
    setTimeout(() => {
      if (!win.isDestroyed() && !win.isVisible()) win.show();
    }, 2000);
    return;
  }
  settingsWindow.show();
  settingsWindow.focus();
  settingsWindow.webContents.send('settings:open');
}

function openInBrowser(pagePath) {
  // Only ever a page of the configured BitBin site
  return shell.openExternal(`${config.load().baseUrl}${pagePath}`);
}

// ---------------------------------------------------------------- tray and shortcut

/** Registers the capture shortcut, replacing the previous one. False if the OS refused it. */
function registerShortcut(accelerator) {
  globalShortcut.unregisterAll();
  try {
    shortcutActive = globalShortcut.register(accelerator, () => openCapture({ fromClipboard: true }));
  } catch {
    // Not a valid accelerator
    shortcutActive = false;
  }
  return shortcutActive;
}

function buildTrayMenu() {
  const { shortcut } = config.load();
  return Menu.buildFromTemplate([
    {
      label: 'Save clipboard to BitBin',
      accelerator: shortcutActive ? shortcut : undefined,
      click: () => openCapture({ fromClipboard: true }),
    },
    { label: 'New item', click: () => openCapture({ fromClipboard: false }) },
    { label: 'Open BitBin', click: () => openInBrowser('/dashboard') },
    { type: 'separator' },
    { label: 'Settings', click: showSettings },
    {
      label: 'Start at login',
      type: 'checkbox',
      // Registering a login item only makes sense for an installed build
      enabled: app.isPackaged,
      checked: app.isPackaged && app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    },
    { type: 'separator' },
    { label: 'Quit BitBin', click: () => app.quit() },
  ]);
}

function refreshTray() {
  tray?.setContextMenu(buildTrayMenu());
}

function createTray() {
  // Electron picks up tray@2x.png next to it on high-DPI screens
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png')));
  tray.setToolTip('BitBin');
  tray.on('click', () => openCapture({ fromClipboard: true }));
  refreshTray();
}

// ---------------------------------------------------------------- IPC

/**
 * Registers a handler that only answers the app's own pages and always resolves to
 * `{ ok, data }` or `{ ok: false, error, status }`, so a renderer never sees a stack.
 */
function handle(channel, fn) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (!event.senderFrame?.url.startsWith(RENDERER_URL)) {
      return { ok: false, error: 'Not allowed', status: 403 };
    }
    try {
      return { ok: true, data: await fn(event, ...args) };
    } catch (error) {
      if (error instanceof ApiError) return { ok: false, error: error.message, status: error.status };
      console.error(`${channel} failed:`, error);
      return { ok: false, error: 'Something went wrong. Please try again.', status: 500 };
    }
  });
}

function settingsState() {
  const { baseUrl, token, shortcut } = config.load();
  return {
    baseUrl,
    sites: sites(),
    connected: Boolean(token),
    tokenIsStored: config.canEncrypt(),
    shortcut,
    shortcutActive,
    packaged: app.isPackaged,
    openAtLogin: app.isPackaged && app.getLoginItemSettings().openAtLogin,
    platform: process.platform,
    version: app.getVersion(),
  };
}

function registerIpc() {
  handle('window:close', (event) => BrowserWindow.fromWebContents(event.sender)?.hide());
  // A page reports its content height; the window follows, within the screen
  handle('window:fit', (event, height) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || !Number.isFinite(height)) return;
    const { workAreaSize } = screen.getDisplayMatching(win.getBounds());
    const max = Math.max(CAPTURE_MIN_HEIGHT, Math.min(CAPTURE_MAX_HEIGHT, workAreaSize.height - 80));
    const fitted = Math.round(Math.min(Math.max(height, CAPTURE_MIN_HEIGHT), max));
    if (win === captureWindow) {
      win.setContentSize(CAPTURE_WIDTH, fitted);
    } else if (win === settingsWindow) {
      win.setContentSize(SETTINGS_WIDTH, fitted);
      if (!win.isVisible()) {
        win.show();
        win.focus();
      }
    }
  });
  handle('app:open-settings', () => showSettings());
  handle('app:quit', () => app.quit());
  handle('app:open-dashboard', () => openInBrowser('/dashboard'));
  handle('app:open-tokens', () => openInBrowser('/settings'));

  handle('capture:init', () => {
    const { token, lastCollectionId } = config.load();
    return {
      connected: Boolean(token),
      prefill: pendingCapture,
      itemTypes: ITEM_TYPES,
      lastCollectionId,
      attachment: attachmentInfo(),
    };
  });
  handle('capture:pick-file', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const picked = await dialog.showOpenDialog(win, {
      title: 'Attach a file or image',
      properties: ['openFile'],
      filters: [{ name: 'BitBin files', extensions: PICKER_EXTENSIONS }],
    });
    if (picked.canceled || !picked.filePaths[0]) return attachmentInfo();

    const file = picked.filePaths[0];
    const stat = await fs.promises.stat(file);
    if (!stat.isFile()) throw new ApiError('Pick a file, not a folder.', 400);
    // Checked before reading, so a huge file is never loaded
    const problem = checkFile(baseName(file), stat.size);
    if (problem) throw new ApiError(problem, 400);
    return setAttachment(file, await fs.promises.readFile(file));
  });
  // A file dropped on the window: the page reads its bytes (it has no path) and hands them over
  handle('capture:attach', (_event, name, data) => {
    if (typeof name !== 'string' || !(data instanceof ArrayBuffer)) throw new ApiError('Could not read that file.', 400);
    const problem = checkFile(baseName(name), data.byteLength);
    if (problem) throw new ApiError(problem, 400);
    return setAttachment(name, Buffer.from(data));
  });
  handle('capture:clear-attachment', () => {
    attachment = null;
  });
  handle('capture:collections', () => api('/collections'));
  handle('capture:save', async (_event, form) => {
    if (attachment) {
      const saved = await api('/files', { method: 'POST', form: buildFileForm(attachment, form) });
      attachment = null;
      config.save({ lastCollectionId: typeof form?.collectionId === 'string' ? form.collectionId : '' });
      return saved;
    }
    const body = buildItemBody(form, ITEM_TYPES);
    const item = await api('/items', { method: 'POST', body });
    config.save({ lastCollectionId: body.collectionIds[0] ?? '' });
    return item;
  });
  // One click, two AI calls side by side. Either can fail without losing the other.
  handle('capture:suggest', async (_event, form) => {
    const body = buildSuggestBody(form, ITEM_TYPES);
    const [tags, description] = await Promise.allSettled([
      api('/ai/tags', { method: 'POST', body }),
      api('/ai/description', { method: 'POST', body }),
    ]);
    const failed = [tags, description].find((result) => result.status === 'rejected');
    return {
      tags: [...new Set([
        ...parseTags(typeof form?.tags === 'string' ? form.tags : ''),
        ...(tags.status === 'fulfilled' ? tags.value.tags : []),
      ])],
      description: description.status === 'fulfilled' ? description.value.description : '',
      error: failed ? failed.reason.message : '',
    };
  });

  handle('settings:state', () => settingsState());
  handle('settings:account', () => api('/me'));
  handle('settings:connect', async (_event, input) => {
    const baseUrl = sites().find((site) => site.value === input?.baseUrl)?.value;
    const token = typeof input?.token === 'string' ? input.token.trim() : '';
    if (!baseUrl) throw new ApiError('Pick a site from the list.', 400);
    if (!/^bb_[\w-]{20,200}$/.test(token)) {
      throw new ApiError('That doesn\'t look like a BitBin token. It starts with "bb_".', 400);
    }
    // Check it before storing it
    const account = await api('/me', {}, { baseUrl, token });
    config.save({ baseUrl, token, lastCollectionId: '' });
    return account;
  });
  handle('settings:disconnect', () => config.save({ token: '', lastCollectionId: '' }));
  handle('settings:set-shortcut', (_event, accelerator) => {
    const previous = config.load().shortcut;
    if (typeof accelerator !== 'string' || accelerator.length > 60 || !registerShortcut(accelerator)) {
      registerShortcut(previous);
      refreshTray();
      throw new ApiError('That shortcut is invalid or already used by another app.', 400);
    }
    config.save({ shortcut: accelerator });
    refreshTray();
    return settingsState();
  });
  handle('settings:set-login', (_event, enabled) => {
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: Boolean(enabled) });
    refreshTray();
    return settingsState();
  });
}

// ---------------------------------------------------------------- app

// An uncaught error would otherwise open a modal dialog that blocks the whole tray app
process.on('uncaughtException', (error) => console.error('Uncaught exception:', error));
process.on('unhandledRejection', (error) => console.error('Unhandled rejection:', error));

// The app's pages are local files that never navigate or open windows
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event) => event.preventDefault());
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  // Starting BitBin again while it's running opens the capture window
  app.on('second-instance', () => openCapture({ fromClipboard: true }));

  app.whenReady().then(() => {
    app.setAppUserModelId('dev.divyanshuagrahari.bitbin');
    app.dock?.hide();
    nativeTheme.themeSource = 'dark';

    protocol.handle(APP_SCHEME, (request) => {
      const file = path.join(RENDERER_DIR, decodeURIComponent(new URL(request.url).pathname));
      // Only files inside ./renderer
      if (!file.startsWith(RENDERER_DIR + path.sep)) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(file).href);
    });

    config =createConfigStore({
      file: path.join(app.getPath('userData'), 'config.json'),
      fs,
      safeStorage,
      defaultBaseUrl: PRODUCTION_URL,
    });
    // A site that isn't offered any more (a dev build's localhost) falls back to production
    if (!sites().some((site) => site.value === config.load().baseUrl)) {
      config.save({ baseUrl: PRODUCTION_URL, token: '' });
    }

    registerIpc();
    registerShortcut(config.load().shortcut);
    createTray();

    if (!config.load().token) showSettings();
  });

  app.on('before-quit', () => {
    quitting = true;
  });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  // Keep running in the tray with every window hidden
  app.on('window-all-closed', () => {});
}
