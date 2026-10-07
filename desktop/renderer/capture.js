const $ = (id) => document.getElementById(id);
const desktop = window.bitbin;

let itemTypes = [];
let lastCollectionId = '';
let collectionsLoaded = false;
/** The file or image waiting to be saved, as the main process describes it (never its bytes) */
let attached = null;

/** The biggest file the window will read when one is dropped on it; the main process checks the real limits. */
const MAX_DROP_BYTES = 12 * 1024 * 1024;

function show(panel) {
  for (const id of ['loading', 'setup', 'done', 'form']) $(id).hidden = id !== panel;
  // Ask the main process to size the window to what's showing
  requestAnimationFrame(() => desktop.fitWindow(document.getElementById('app').offsetHeight));
}

function setStatus(message, kind = '') {
  $('status').textContent = message;
  $('status').className = `status ${kind}`;
}

function showSetup(message) {
  $('setup-message').textContent = message;
  show('setup');
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Show the attached file (or take it away): a file replaces the type picker and the text fields. */
function applyAttachment(info) {
  attached = info;
  $('attachment').hidden = !info;
  $('attach').hidden = Boolean(info);
  $('type').closest('label').hidden = Boolean(info);
  if (info) {
    $('attachment-name').textContent = info.name;
    $('attachment-name').title = info.name;
    $('attachment-size').textContent = `${info.type} · ${formatSize(info.size)}`;
    if (!$('title').value.trim()) $('title').value = info.name.replace(/\.[^.]+$/, '');
  }
  applyType($('type').value);
}

async function attachFromPicker() {
  setStatus('');
  const result = await desktop.capture.pickFile();
  if (!result.ok) {
    setStatus(result.error, 'error');
    return;
  }
  if (result.data) applyAttachment(result.data);
}

async function attachDropped(file) {
  setStatus('');
  if (file.size > MAX_DROP_BYTES) {
    setStatus('That file is too large.', 'error');
    return;
  }
  const result = await desktop.capture.attach(file.name, await file.arrayBuffer());
  if (result.ok) applyAttachment(result.data);
  else setStatus(result.error, 'error');
}

async function removeAttachment() {
  await desktop.capture.clearAttachment();
  applyAttachment(null);
}

function applyType(type) {
  const isLink = type === 'link' && !attached;
  $('url-field').hidden = !isLink;
  $('content-field').hidden = isLink || Boolean(attached);
  $('url').required = isLink;
  $('content').placeholder = type === 'command' ? 'npm run dev' : '';
  requestAnimationFrame(() => desktop.fitWindow(document.getElementById('app').offsetHeight));
}

async function loadCollections() {
  const result = await desktop.capture.collections();
  if (!result.ok) {
    if (result.status === 401 || result.status === 403) {
      showSetup(result.error);
      return false;
    }
    setStatus(result.error, 'error');
    return true;
  }
  for (const collection of result.data) {
    const option = document.createElement('option');
    option.value = collection.id;
    option.textContent = collection.name;
    $('collection').append(option);
  }
  collectionsLoaded = true;
  if (result.data.some((c) => c.id === lastCollectionId)) $('collection').value = lastCollectionId;
  return true;
}

function formValues() {
  return {
    type: $('type').value,
    collectionId: $('collection').value,
    title: $('title').value,
    content: $('content').value,
    url: $('url').value,
    tags: $('tags').value,
    description: $('description').value,
  };
}

async function suggest() {
  if (!$('title').value.trim()) {
    setStatus('Add a title first.', 'error');
    return;
  }
  $('suggest').disabled = true;
  $('suggest').textContent = '…';
  setStatus('Suggesting tags and a description…');

  const result = await desktop.capture.suggest(formValues());
  if (result.ok) {
    $('tags').value = result.data.tags.join(', ');
    if (result.data.description && !$('description').value.trim()) {
      $('description').value = result.data.description;
    }
    setStatus(result.data.error, result.data.error ? 'error' : '');
  } else {
    setStatus(result.error, 'error');
  }

  $('suggest').disabled = false;
  $('suggest').textContent = '✦ Suggest';
}

async function save(event) {
  event?.preventDefault();
  if (!$('form').reportValidity()) return;

  $('save').disabled = true;
  setStatus('Saving…');
  const result = await desktop.capture.save(formValues());
  if (result.ok) {
    show('done');
    setTimeout(() => desktop.closeWindow(), 1200);
  } else {
    setStatus(result.error, 'error');
    $('save').disabled = false;
  }
}

/** Reset the form for a new capture each time the window is shown. */
async function open() {
  show('loading');
  const init = await desktop.capture.init();
  if (!init.ok) {
    showSetup(init.error);
    return;
  }
  if (!init.data.connected) {
    showSetup('Connect BitBin to your account first.');
    return;
  }

  if (!itemTypes.length) {
    itemTypes = init.data.itemTypes;
    for (const type of itemTypes) {
      const option = document.createElement('option');
      option.value = type;
      option.textContent = type[0].toUpperCase() + type.slice(1);
      $('type').append(option);
    }
  }

  const { prefill } = init.data;
  lastCollectionId = init.data.lastCollectionId;
  $('type').value = prefill.type;
  $('title').value = prefill.title;
  $('content').value = prefill.content;
  $('url').value = prefill.url;
  $('tags').value = '';
  $('description').value = '';
  $('save').disabled = false;
  setStatus('');
  applyAttachment(init.data.attachment);

  // The picker is filled once; later captures reuse it
  if (collectionsLoaded) {
    $('collection').value = [...$('collection').options].some((o) => o.value === lastCollectionId) ? lastCollectionId : '';
  } else if (!(await loadCollections())) {
    return;
  }

  show('form');
  $('title').focus();
  $('title').select();
}

$('type').addEventListener('change', () => applyType($('type').value));
$('attach').addEventListener('click', attachFromPicker);
$('attachment-clear').addEventListener('click', removeAttachment);

// Drop a file anywhere on the window to attach it
document.addEventListener('dragover', (event) => {
  event.preventDefault();
  if (!$('form').hidden) $('app').classList.add('dropping');
});
document.addEventListener('dragleave', (event) => {
  if (!event.relatedTarget) $('app').classList.remove('dropping');
});
document.addEventListener('drop', (event) => {
  event.preventDefault();
  $('app').classList.remove('dropping');
  const file = event.dataTransfer?.files?.[0];
  if (file && !$('form').hidden) attachDropped(file);
});
$('suggest').addEventListener('click', suggest);
$('form').addEventListener('submit', save);
$('close').addEventListener('click', () => desktop.closeWindow());
$('open-settings').addEventListener('click', () => {
  desktop.openSettings();
  desktop.closeWindow();
});
$('open-bitbin').addEventListener('click', () => {
  desktop.openDashboard();
  desktop.closeWindow();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') desktop.closeWindow();
  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !$('form').hidden) save(event);
});

// Follow the content: a status message or a changed type resizes the window
new ResizeObserver(() => desktop.fitWindow(document.getElementById('app').offsetHeight)).observe($('app'));

// The main process shows an already-loaded window again with this
desktop.capture.onOpen(open);
open();
