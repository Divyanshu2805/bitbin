import {
  ITEM_TYPES,
  PENDING_TTL_MS,
  api,
  cleanCommand,
  getSettings,
  guessItemType,
  guessLanguage,
  LANGUAGES,
  parseTags,
  saveSettings,
  suggestTitle,
  titleFrom,
} from './lib.js';

const $ = (id) => document.getElementById(id);
const isWindow = new URLSearchParams(location.search).has('window');

let settings;
let page = { selection: '', title: '', url: '', heading: '' };

function show(panel) {
  for (const id of ['loading', 'setup', 'done', 'form']) {
    $(id).hidden = id !== panel;
  }
}

function setStatus(message, kind = '') {
  $('status').textContent = message;
  $('status').className = `status ${kind}`;
}

function showSetup(message) {
  $('setup-message').textContent = message;
  show('setup');
}

/** The selection handed over by the context menu, if it's fresh. */
async function takePendingSelection() {
  const { pending } = await chrome.storage.session.get('pending');
  if (!pending) return null;
  await chrome.storage.session.remove('pending');
  return Date.now() - pending.at < PENDING_TTL_MS ? pending : null;
}

/** Read the selection, title and URL from the active tab. */
async function readActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return { selection: '', title: '', url: '' };

  const fallback = { selection: '', title: tab.title ?? '', url: tab.url ?? '' };
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const active = document.activeElement;
        let selection = window.getSelection()?.toString() ?? '';
        // Selections inside inputs and textareas aren't part of getSelection()
        if (!selection && active && typeof active.selectionStart === 'number') {
          selection = active.value.slice(active.selectionStart, active.selectionEnd);
        }
        // The nearest heading above the selection names it better than its first line
        let heading = '';
        const anchor = window.getSelection()?.rangeCount ? window.getSelection().getRangeAt(0).startContainer : null;
        if (anchor) {
          for (const h of document.querySelectorAll('h1, h2, h3')) {
            if (h.compareDocumentPosition(anchor) & Node.DOCUMENT_POSITION_FOLLOWING) {
              const text = h.textContent.trim().replace(/\s+/g, ' ');
              if (text) heading = text;
            }
          }
        }
        return { selection, title: document.title, url: location.href, heading };
      },
    });
    return result?.result ?? fallback;
  } catch {
    // chrome:// pages, the Web Store and PDFs don't allow scripts
    return fallback;
  }
}

function applyType(type) {
  const isLink = type === 'link';
  $('url-field').hidden = !isLink;
  $('content-field').hidden = isLink;
  $('url').required = isLink;
  $('content').placeholder = type === 'command' ? 'npm run dev' : '';
  $('language-field').hidden = type !== 'snippet';
  if (type === 'snippet' && !$('language').dataset.touched) {
    $('language').value = guessLanguage($('content').value);
  }
}

function prefill() {
  const text = page.selection.trim();
  const type = text ? guessItemType(text) : 'link';

  $('type').value = type;
  if (type === 'link') {
    $('url').value = text && /^https?:\/\//i.test(text) ? text : page.url;
    $('title').value = titleFrom(page.title, $('url').value);
    $('content').value = '';
  } else {
    $('content').value = type === 'command' ? cleanCommand(text) : text;
    $('title').value = suggestTitle(type, text, { heading: page.heading, pageTitle: page.title });
    $('url').value = '';
  }

  $('source').textContent = page.url ? `From ${page.url}` : '';
  $('source').title = page.url;
  applyType(type);
}

async function loadCollections() {
  try {
    const collections = await api('/collections', { settings });
    for (const collection of collections) {
      const option = document.createElement('option');
      option.value = collection.id;
      option.textContent = collection.name;
      $('collection').append(option);
    }
    if (collections.some((c) => c.id === settings.lastCollectionId)) {
      $('collection').value = settings.lastCollectionId;
    }
    return true;
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      showSetup(error.message);
      return false;
    }
    setStatus(error.message, 'error');
    return true;
  }
}

async function suggestTags() {
  const button = $('suggest');
  const type = $('type').value;
  const content = type === 'link' ? $('url').value : $('content').value;

  if (!$('title').value.trim()) {
    setStatus('Add a title first.', 'error');
    return;
  }

  button.disabled = true;
  button.textContent = '…';
  setStatus('');
  try {
    const { tags } = await api('/ai/tags', {
      method: 'POST',
      settings,
      body: {
        title: $('title').value,
        content,
        typeName: type,
        language: type === 'snippet' ? $('language').value : null,
      },
    });
    const merged = [...new Set([...parseTags($('tags').value), ...tags])];
    $('tags').value = merged.join(', ');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = '✦ Suggest';
  }
}

async function save(event) {
  event?.preventDefault();
  if (!$('form').reportValidity()) return;

  const type = $('type').value;
  const collectionId = $('collection').value;
  const body = {
    typeName: type,
    title: $('title').value.trim(),
    tags: parseTags($('tags').value),
    collectionIds: collectionId ? [collectionId] : [],
  };

  if (type === 'link') {
    body.url = $('url').value.trim();
  } else {
    body.content = $('content').value;
    if (type === 'snippet') body.language = $('language').value;
    if (type === 'command') body.language = 'bash';
    if (page.url && /^https?:\/\//i.test(page.url)) {
      body.description = `Saved from ${page.url}`;
    }
  }

  $('save').disabled = true;
  setStatus('Saving…');
  try {
    await api('/items', { method: 'POST', settings, body });
    await saveSettings({ lastCollectionId: collectionId });
    show('done');
    setTimeout(() => window.close(), isWindow ? 1500 : 1200);
  } catch (error) {
    setStatus(error.message, 'error');
    $('save').disabled = false;
  }
}

async function init() {
  for (const { value, label } of LANGUAGES) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    $('language').append(option);
  }
  $('language').addEventListener('change', () => { $('language').dataset.touched = '1'; });

  for (const type of ITEM_TYPES) {
    const option = document.createElement('option');
    option.value = type;
    option.textContent = type[0].toUpperCase() + type.slice(1);
    $('type').append(option);
  }

  $('open-options').addEventListener('click', () => chrome.runtime.openOptionsPage());
  $('open-bitbin').addEventListener('click', () => chrome.tabs.create({ url: `${settings.baseUrl}/dashboard` }));
  $('type').addEventListener('change', () => applyType($('type').value));
  $('suggest').addEventListener('click', suggestTags);
  $('form').addEventListener('submit', save);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !$('form').hidden) save(event);
  });

  settings = await getSettings();
  if (!settings.token) {
    showSetup('Connect the extension to your BitBin account first.');
    return;
  }

  page = (await takePendingSelection()) ?? (isWindow ? page : await readActiveTab());
  prefill();

  if (await loadCollections()) {
    show('form');
    $('title').focus();
    $('title').select();
  }
}

init();
