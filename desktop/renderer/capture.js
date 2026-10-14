const $ = (id) => document.getElementById(id);
const desktop = window.bitbin;

let itemTypes = [];
let lastCollectionId = '';
let collectionsLoaded = false;
let tags = [];
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

/** File and Image items carry a file instead of text. */
function isAttachType(type) {
  return type === 'file' || type === 'image';
}

/** Show the attached file (or take it away). A file sets the type to File or Image to match. */
function applyAttachment(info) {
  attached = info;
  if (info) {
    $('type').value = info.type;
    $('attachment-name').textContent = info.name;
    $('attachment-name').title = info.name;
    $('attachment-size').textContent = `${info.type} · ${formatSize(info.size)}`;
    if (!$('title').value.trim()) $('title').value = info.name.replace(/\.[^.]+$/, '');
  }
  applyType($('type').value);
}

async function attachFromPicker() {
  setStatus('');
  const result = await desktop.capture.pickFile($('type').value);
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

/** The chips plus whatever is still being typed, so nothing is lost on save. */
function currentTags() {
  return [...new Set([...tags, ...parseTags($('tags').value)])];
}

function parseTags(value) {
  return value.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean);
}

function renderTags() {
  for (const chip of $('tag-box').querySelectorAll('.tag-chip')) chip.remove();
  for (const tag of tags) {
    const chip = document.createElement('span');
    chip.className = 'tag-chip';
    chip.append('#' + tag);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.setAttribute('aria-label', 'Remove ' + tag);
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
  const result = await desktop.capture.createCollection(name);
  if (result.ok) {
    const option = document.createElement('option');
    option.value = result.data.id;
    option.textContent = result.data.name;
    $('collection').append(option);
    $('collection').value = result.data.id;
    showNewCollection(false);
    setStatus('');
  } else {
    setStatus(result.error, 'error');
  }
  $('create-collection').disabled = false;
}

function applyType(type) {
  const isLink = type === 'link';
  const carriesFile = isAttachType(type);
  $('url-field').hidden = !isLink;
  $('content-field').hidden = isLink || carriesFile;
  $('url').required = isLink;
  // Choosing a file only makes sense for the File and Image types
  $('attach-zone').hidden = !carriesFile;
  $('attachment').hidden = !attached;
  $('attach').hidden = Boolean(attached);
  $('attach').firstChild.textContent = type === 'image' ? '+ Choose an image ' : '+ Choose a file ';
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
    content: attached ? attached.name : $('content').value,
    url: $('url').value,
    tags: currentTags().join(', '),
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
    tags = result.data.tags;
    $('tags').value = '';
    renderTags();
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
  if (isAttachType($('type').value) && !attached) {
    setStatus($('type').value === 'image' ? 'Choose an image first.' : 'Choose a file first.', 'error');
    return;
  }

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
  tags = [];
  $('tags').value = '';
  renderTags();
  showNewCollection(false);
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

$('type').addEventListener('change', async () => {
  // A file stays only while the type still matches it
  if (attached && attached.type !== $('type').value) await removeAttachment();
  applyType($('type').value);
});
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
    // Closes the row, not the whole window
    event.stopPropagation();
    showNewCollection(false);
  }
});
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
