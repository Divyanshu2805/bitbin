const $ = (id) => document.getElementById(id);
const desktop = window.bitbin;

let state;
let recording = false;

function setStatus(id, message, kind = '') {
  $(id).textContent = message;
  $(id).className = `status ${kind}`;
}

function setPill(kind, text) {
  $('pill').className = `pill ${kind}`;
  $('pill-text').textContent = text;
}

// ------------------------------------------------------------ shortcut

/** Electron accelerator → the key labels the user reads, e.g. CommandOrControl+Alt+B → Ctrl, Alt, B. */
function keyLabels(accelerator) {
  const mac = state?.platform === 'darwin';
  const names = {
    CommandOrControl: mac ? '⌘' : 'Ctrl',
    Alt: mac ? '⌥' : 'Alt',
    Shift: mac ? '⇧' : 'Shift',
  };
  return accelerator.split('+').map((part) => names[part] ?? part);
}

function renderKeys() {
  const keys = $('keys');
  keys.replaceChildren();
  keyLabels(state.shortcut).forEach((label, index) => {
    if (index > 0) {
      const plus = document.createElement('span');
      plus.className = 'plus';
      plus.textContent = '+';
      keys.append(plus);
    }
    const cap = document.createElement('kbd');
    cap.textContent = label;
    keys.append(cap);
  });
  const prompt = document.createElement('span');
  prompt.className = 'prompt';
  prompt.textContent = 'Press the new keys…  (Esc to cancel)';
  keys.append(prompt);
}

/** A keydown → an Electron accelerator, or null while only modifiers are held. */
function acceleratorFrom(event) {
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(event.key)) return null;

  const named = { ' ': 'Space', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' };
  const main = named[event.key] ?? (event.key.length === 1 ? event.key.toUpperCase() : event.key);
  const isFunctionKey = /^F\d{1,2}$/.test(main);
  // A bare letter would be taken from every app, so a modifier is required
  if (!isFunctionKey && !event.ctrlKey && !event.altKey && !event.metaKey) return null;

  const parts = [];
  if (event.ctrlKey || event.metaKey) parts.push('CommandOrControl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  parts.push(main);
  return parts.join('+');
}

function setRecording(on) {
  recording = on;
  $('keys').classList.toggle('recording', on);
  $('change-shortcut').textContent = on ? 'Cancel' : 'Change';
  if (on) setStatus('shortcut-status', '');
}

// ------------------------------------------------------------ account

async function loadAccount() {
  setPill('warn', 'Checking…');
  const result = await desktop.settings.account();
  if (result.ok) {
    const { name, email } = result.data;
    $('name').textContent = name || email;
    $('email').textContent = name ? email : '';
    $('avatar').textContent = (name || email || 'B').trim()[0].toUpperCase();
    setPill('on', 'Connected');
    setStatus('status', '');
  } else {
    $('name').textContent = 'Token refused';
    $('email').textContent = 'Create a new token in BitBin and reconnect.';
    $('avatar').textContent = '!';
    setPill('warn', 'Token problem');
    setStatus('status', result.error, 'error');
  }
}

function render() {
  renderKeys();
  $('version').textContent = state.version;
  $('login').checked = state.openAtLogin;
  $('login').disabled = !state.packaged;
  $('login-note').textContent = state.packaged
    ? 'Keeps the shortcut ready after a restart.'
    : 'Only available in the installed app.';
  $('storage-note').hidden = state.tokenIsStored;
  $('connected').hidden = !state.connected;
  $('connect-form').hidden = state.connected;

  if (!state.connected) setPill('off', 'Not connected');

  const select = $('base-url');
  select.replaceChildren();
  for (const site of state.sites) {
    const option = document.createElement('option');
    option.value = site.value;
    option.textContent = site.label;
    select.append(option);
  }
  select.value = state.baseUrl;
  $('token').value = '';

  $('shortcut-help').textContent = state.shortcutActive
    ? "Works from any app. Saves what's on your clipboard."
    : 'Not active: another app may be using these keys. Pick a different shortcut.';
  if (!state.shortcutActive) setStatus('shortcut-status', 'The shortcut could not be registered.', 'error');
}

async function refresh() {
  const result = await desktop.settings.state();
  if (!result.ok) {
    setStatus('status', result.error, 'error');
    return;
  }
  state = result.data;
  render();
  if (state.connected) loadAccount();
}

// ------------------------------------------------------------ events

$('connect-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('connect').disabled = true;
  setStatus('status', 'Checking the token…');
  const result = await desktop.settings.connect({ baseUrl: $('base-url').value, token: $('token').value });
  $('connect').disabled = false;
  if (!result.ok) {
    setStatus('status', result.error, 'error');
    return;
  }
  setStatus('status', '');
  await refresh();
});

$('toggle-token').addEventListener('click', () => {
  const hidden = $('token').type === 'password';
  $('token').type = hidden ? 'text' : 'password';
  $('toggle-token').textContent = hidden ? 'Hide' : 'Show';
  $('toggle-token').setAttribute('aria-label', hidden ? 'Hide token' : 'Show token');
});

$('disconnect').addEventListener('click', async () => {
  await desktop.settings.disconnect();
  setStatus('status', '');
  await refresh();
});

$('open-bitbin').addEventListener('click', () => desktop.openDashboard());
$('open-tokens').addEventListener('click', () => desktop.openTokens());
$('quit').addEventListener('click', () => desktop.quit());

$('login').addEventListener('change', async () => {
  const result = await desktop.settings.setLogin($('login').checked);
  if (result.ok) state = result.data;
  render();
});

$('change-shortcut').addEventListener('click', () => setRecording(!recording));

document.addEventListener('keydown', async (event) => {
  if (!recording) return;
  event.preventDefault();
  if (event.key === 'Escape') {
    setRecording(false);
    return;
  }
  const accelerator = acceleratorFrom(event);
  if (!accelerator) return;

  setRecording(false);
  const result = await desktop.settings.setShortcut(accelerator);
  if (result.ok) {
    state = result.data;
    render();
    setStatus('shortcut-status', 'Shortcut changed.', 'success');
  } else {
    setStatus('shortcut-status', result.error, 'error');
  }
});
window.addEventListener('blur', () => setRecording(false));

// The window follows the page's height, so there is never empty space or a scrollbar.
// The first report is also what makes the window appear.
new ResizeObserver(() => desktop.fitWindow(document.getElementById('shell').offsetHeight)).observe($('shell'));

desktop.settings.onOpen(refresh);
refresh();
