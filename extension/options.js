import { BASE_URLS, api, getSettings, saveSettings } from './lib.js';

const $ = (id) => document.getElementById(id);

function setStatus(message, kind = '') {
  $('status').textContent = message;
  $('status').className = `status ${kind}`;
}

async function showShortcut() {
  const commands = await chrome.commands.getAll();
  const action = commands.find((command) => command.name === '_execute_action');
  $('shortcut').textContent = action?.shortcut || 'not set';
  if (!action?.shortcut) {
    setStatus('No shortcut is assigned (another extension or the browser may use Ctrl+Shift+B). Use "Change shortcut" to pick one.', 'error');
  }
}

async function init() {
  for (const { label, value } of BASE_URLS) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    $('base-url').append(option);
  }

  const settings = await getSettings();
  $('base-url').value = settings.baseUrl;
  $('token').value = settings.token;
  await showShortcut();

  $('open-settings').addEventListener('click', () => {
    chrome.tabs.create({ url: `${$('base-url').value}/settings` });
  });
  $('shortcuts').addEventListener('click', () => {
    chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
  });

  $('form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const baseUrl = $('base-url').value;
    const token = $('token').value.trim();

    if (!token.startsWith('bb_')) {
      setStatus('That doesn\'t look like a BitBin token. Tokens start with bb_.', 'error');
      return;
    }

    $('save').disabled = true;
    setStatus('Checking…');
    try {
      const me = await api('/me', { settings: { baseUrl, token } });
      await saveSettings({ baseUrl, token, lastCollectionId: '' });
      setStatus(`Connected as ${me.email}. You're ready to go.`, 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      $('save').disabled = false;
    }
  });
}

init();
