const $ = (id) => document.getElementById(id);
const desktop = window.bitbin;

let itemTypes = [];
let lastCollectionId = '';
let collectionsLoaded = false;

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

function applyType(type) {
  const isLink = type === 'link';
  $('url-field').hidden = !isLink;
  $('content-field').hidden = isLink;
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
  applyType(prefill.type);

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
