import {
  FILE_ACCEPT,
  ITEM_TYPES,
  PENDING_TTL_MS,
  api,
  checkFile,
  classifyFile,
  cleanCommand,
  formatSize,
  getSettings,
  guessItemType,
  guessLanguage,
  LANGUAGES,
  parseTags,
  saveSettings,
  suggestTitle,
  titleFrom,
  titleFromFileName,
  uploadFile,
} from './lib.js';

const $ = (id) => document.getElementById(id);
const isWindow = new URLSearchParams(location.search).has('window');

let settings;
let tags = [];
let page = { selection: '', title: '', url: '', heading: '' };
/** A file or image chosen instead of text, or null. */
let attached = null;
let titleTouched = false;

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

/** A heavy page can be slow to answer; after this long the popup opens with just the tab's title and address. */
const READ_TAB_TIMEOUT_MS = 1200;

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

/** Read the selection, title and URL from the active tab. */
async function readActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return { selection: '', title: '', url: '' };

  const fallback = { selection: '', title: tab.title ?? '', url: tab.url ?? '' };
  try {
    const [result] = await withTimeout(chrome.scripting.executeScript({
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
    }), READ_TAB_TIMEOUT_MS);
    return result?.result ?? fallback;
  } catch {
    // chrome:// pages, the Web Store and PDFs don't allow scripts
    return fallback;
  }
}

/** The chips plus whatever is still being typed, so nothing is lost on save. */
function currentTags() {
  return [...new Set([...tags, ...parseTags($('tags').value)])];
}

function renderTags() {
  for (const chip of $('tag-box').querySelectorAll('.tag-chip')) chip.remove();
  for (const tag of tags) {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.append(`#${tag}`);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${tag}`);
    remove.addEventListener('click', () => {
      tags = tags.filter((t) => t !== tag);
      renderTags();
      $('tags').focus();
    });
    chip.append(remove);
    $('tag-box').insertBefore(chip, $('tags'));
  }
  $('tags').placeholder = tags.length ? '' : 'Type a tag, press Enter';
}

/** Move what's typed into chips. */
function commitTagDraft() {
  const added = parseTags($('tags').value);
  $('tags').value = '';
  if (!added.length) return;
  tags = [...new Set([...tags, ...added])];
  renderTags();
}

function applyType(type) {
  const isLink = type === 'link' && !attached;
  $('type-field').hidden = Boolean(attached);
  $('url-field').hidden = !isLink;
  $('content-field').hidden = isLink || Boolean(attached);
  $('url').required = isLink;
  $('content').placeholder = type === 'command' ? 'npm run dev' : '';
  $('language-field').hidden = type !== 'snippet' || Boolean(attached);
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

/** Fill the picker, keeping the current choice (or the one last used) when it is still there. */
function renderCollections(collections) {
  const chosen = $('collection').value || settings.lastCollectionId;
  $('collection').replaceChildren(new Option('No collection', ''));
  for (const collection of collections) {
    $('collection').append(new Option(collection.name, collection.id));
  }
  if (collections.some((c) => c.id === chosen)) $('collection').value = chosen;
}

/** The last list the API gave, so the picker is full the moment the popup opens. */
async function showCachedCollections() {
  const { collectionsCache } = await chrome.storage.local.get('collectionsCache');
  if (Array.isArray(collectionsCache)) renderCollections(collectionsCache);
}

/** Ask the API for the list. False when the token was refused and the setup panel is showing. */
async function loadCollections() {
  try {
    const collections = await api('/collections', { settings });
    const slim = collections.map(({ id, name }) => ({ id, name }));
    renderCollections(slim);
    await chrome.storage.local.set({ collectionsCache: slim });
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

/** Show a file or image (or take it away): it replaces the type picker and the text fields. */
function applyAttachment(file) {
  attached = file;
  $('attachment').hidden = !file;
  $('attach').hidden = Boolean(file);
  if (file) {
    $('attachment-name').textContent = file.name;
    $('attachment-name').title = file.name;
    $('attachment-size').textContent = `${classifyFile(file.name)} · ${formatSize(file.size)}`;
    // The page's title is only a guess; a title the person typed is kept
    if (!titleTouched) $('title').value = titleFromFileName(file.name);
  }
  applyType($('type').value);
}

function attachFile(file) {
  const problem = checkFile(file.name, file.size);
  if (problem) {
    setStatus(problem, 'error');
    return;
  }
  setStatus('');
  applyAttachment(file);
}

/**
 * The file picker would take focus from the toolbar popup and close it, so from the popup the page
 * opens again as a window (carrying the selection with it), where the picker works.
 */
async function pickFile() {
  if (isWindow) {
    $('file-input').click();
    return;
  }
  await chrome.storage.session.set({ pending: { ...page, at: Date.now() } });
  await chrome.windows.create({
    url: chrome.runtime.getURL('popup.html?window=1&attach=1'),
    type: 'popup',
    width: 500,
    height: 660,
  });
  window.close();
}

function showNewCollection(visible) {
  $('new-collection').hidden = !visible;
  $('show-new-collection').hidden = visible;
  if (visible) $('new-collection-name').focus();
  else $('new-collection-name').value = '';
}

/** Create a collection from the inline row and pick it, so the save goes into it. */
async function createCollection() {
  const name = $('new-collection-name').value.trim();
  if (!name) {
    $('new-collection-name').focus();
    return;
  }
  $('create-collection').disabled = true;
  setStatus('Creating collection…');
  try {
    const created = await api('/collections', { method: 'POST', settings, body: { name } });
    const option = document.createElement('option');
    option.value = created.id;
    option.textContent = created.name;
    $('collection').append(option);
    $('collection').value = created.id;
    showNewCollection(false);
    setStatus('');
  } catch (error) {
    setStatus(error.message, 'error');
  }
  $('create-collection').disabled = false;
}

// One click, two AI calls side by side: tags are merged into what's typed, and a
// description fills the field unless one has been written already. Either can
// fail without losing the other.
async function suggestWithAi() {
  const button = $('suggest');
  const type = $('type').value;
  const content = attached ? attached.name : type === 'link' ? $('url').value : $('content').value;

  if (!$('title').value.trim()) {
    setStatus('Add a title first.', 'error');
    return;
  }

  const body = {
    title: $('title').value,
    content,
    typeName: attached ? 'note' : type,
    language: type === 'snippet' && !attached ? $('language').value : null,
  };
  if (type === 'link' && !attached) body.url = $('url').value;

  button.disabled = true;
  button.textContent = '…';
  setStatus('Suggesting tags and a description…');
  const [tagsResult, descriptionResult] = await Promise.allSettled([
    api('/ai/tags', { method: 'POST', settings, body }),
    api('/ai/description', { method: 'POST', settings, body }),
  ]);

  if (tagsResult.status === 'fulfilled') {
    tags = [...new Set([...currentTags(), ...tagsResult.value.tags.map((t) => t.toLowerCase())])];
    $('tags').value = '';
    renderTags();
  }
  if (descriptionResult.status === 'fulfilled' && !$('description').value.trim()) {
    $('description').value = descriptionResult.value.description;
  }

  const failed = [tagsResult, descriptionResult].find((result) => result.status === 'rejected');
  setStatus(failed ? failed.reason.message : '', failed ? 'error' : undefined);
  button.disabled = false;
  button.textContent = '✦ Suggest';
}

async function save(event) {
  event?.preventDefault();
  if (!$('form').reportValidity()) return;

  const type = $('type').value;
  const collectionId = $('collection').value;
  const written = $('description').value.trim();

  if (attached) {
    $('save').disabled = true;
    setStatus('Uploading…');
    try {
      await uploadFile(
        attached,
        {
          title: $('title').value.trim(),
          description: written,
          tags: currentTags().join(','),
          collectionId,
        },
        settings
      );
      await saveSettings({ lastCollectionId: collectionId });
      show('done');
      setTimeout(() => window.close(), isWindow ? 1500 : 1200);
    } catch (error) {
      setStatus(error.message, 'error');
      $('save').disabled = false;
    }
    return;
  }

  const body = {
    typeName: type,
    title: $('title').value.trim(),
    tags: currentTags(),
    collectionIds: collectionId ? [collectionId] : [],
  };
  if (written) body.description = written;

  if (type === 'link') {
    body.url = $('url').value.trim();
  } else {
    body.content = $('content').value;
    if (type === 'snippet') body.language = $('language').value;
    if (type === 'command') body.language = 'bash';
    if (page.url && /^https?:\/\//i.test(page.url)) {
      // Where it came from goes under the description. The API caps descriptions
      // at 1000 characters; a very long URL is cut to fit
      body.description = [written, `Saved from ${page.url}`].filter(Boolean).join('\n\n').slice(0, 1000);
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
  $('suggest').addEventListener('click', suggestWithAi);
  $('tags').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey && $('tags').value.trim()) {
      event.preventDefault();
      commitTagDraft();
    } else if (event.key === 'Backspace' && !$('tags').value && tags.length) {
      tags = tags.slice(0, -1);
      renderTags();
    }
  });
  $('tags').addEventListener('input', () => {
    if ($('tags').value.includes(',')) commitTagDraft();
  });
  $('tags').addEventListener('blur', commitTagDraft);
  $('show-new-collection').addEventListener('click', () => showNewCollection(true));
  $('cancel-collection').addEventListener('click', () => showNewCollection(false));
  $('create-collection').addEventListener('click', createCollection);
  $('new-collection-name').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      createCollection();
    } else if (event.key === 'Escape') {
      event.stopPropagation();
      showNewCollection(false);
    }
  });
  $('form').addEventListener('submit', save);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !$('form').hidden) save(event);
  });

  $('title').addEventListener('input', () => { titleTouched = true; });
  $('attach').addEventListener('click', pickFile);
  $('attachment-clear').addEventListener('click', () => {
    $('file-input').value = '';
    applyAttachment(null);
  });
  $('file-input').accept = FILE_ACCEPT;
  $('file-input').addEventListener('change', () => {
    const [file] = $('file-input').files;
    if (file) attachFile(file);
  });
  // A file dropped on the popup attaches without the picker, so it works from the toolbar popup too
  document.addEventListener('dragover', (event) => {
    if (!$('form').hidden) {
      event.preventDefault();
      document.body.classList.add('dropping');
    }
  });
  document.addEventListener('dragleave', (event) => {
    if (!event.relatedTarget) document.body.classList.remove('dropping');
  });
  document.addEventListener('drop', (event) => {
    event.preventDefault();
    document.body.classList.remove('dropping');
    const [file] = event.dataTransfer?.files ?? [];
    if (file && !$('form').hidden) attachFile(file);
  });
  if (isWindow) document.documentElement.classList.add('window');

  // The settings, the selection handed over by the context menu and the last list of collections
  // are all read from the browser's own storage, so they come together
  const [loaded, pending] = await Promise.all([getSettings(), takePendingSelection()]);
  settings = loaded;
  if (!settings.token) {
    showSetup('Connect the extension to your BitBin account first.');
    return;
  }
  await showCachedCollections();

  // The collections come from the network, which can be slow, so the form opens without waiting for
  // them: the cached list is already in the picker, and the fresh one replaces it when it arrives
  const collectionsLoaded = loadCollections();
  page = pending ?? (isWindow ? page : await readActiveTab());
  prefill();
  show('form');
  $('title').focus();
  $('title').select();
  await collectionsLoaded;
}

init();
