// Which files the capture window may attach, and the form that carries one to the token API
// (POST /api/v1/files). Mirrors FILE_CONSTRAINTS in src/lib/r2.ts: the server is the one that decides,
// but checking here first saves a pointless upload and gives a clear message.

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
const FILE_EXTENSIONS = ['.pdf', '.txt', '.md', '.json', '.yaml', '.yml', '.xml', '.csv', '.toml', '.ini'];

/** Extensions for the file picker, without the dots. */
const PICKER_EXTENSIONS = [...IMAGE_EXTENSIONS, ...FILE_EXTENSIONS].map((ext) => ext.slice(1));

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * Hosting platforms refuse a request body above about 4.5 MB, so a bigger upload fails before
 * it reaches BitBin. Staying under it turns that into a clear message here.
 */
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const CONTENT_TYPES = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.json': 'application/json',
  '.yaml': 'application/x-yaml',
  '.yml': 'application/x-yaml',
  '.xml': 'application/xml',
  '.csv': 'text/csv',
  '.toml': 'application/toml',
  '.ini': 'text/plain',
};

function extensionOf(name) {
  const dot = String(name ?? '').lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot).toLowerCase();
}

/** "image", "file", or null when the type isn't one BitBin stores. */
function classifyFile(name) {
  const ext = extensionOf(name);
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
  if (FILE_EXTENSIONS.includes(ext)) return 'file';
  return null;
}

/** Why a file can't be attached, or null when it can. */
function checkFile(name, size) {
  const type = classifyFile(name);
  if (!type) {
    return `BitBin stores ${[...FILE_EXTENSIONS, ...IMAGE_EXTENSIONS].join(', ')} files.`;
  }
  const serverLimit = type === 'image' ? MAX_IMAGE_BYTES : MAX_FILE_BYTES;
  const limit = Math.min(serverLimit, MAX_UPLOAD_BYTES);
  if (!Number.isFinite(size) || size <= 0) return 'That file is empty.';
  if (size > limit) return `That file is too large. The limit is ${Math.round(limit / (1024 * 1024))} MB.`;
  return null;
}

function contentTypeFor(name) {
  return CONTENT_TYPES[extensionOf(name)] ?? 'application/octet-stream';
}

/** A name safe to show and send: no folders, no control characters, never empty. */
function baseName(name) {
  const last = String(name ?? '').split(/[\\/]/).pop().replace(/[\u0000-\u001f]/g, '').trim();
  return last.slice(0, 255) || 'file';
}

/** "12 KB", "3.4 MB" */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** `clipboard-2026-10-07-203045.png`, for an image that came from the clipboard. */
function clipboardImageName(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `clipboard-${date}-${time}.png`;
}

/**
 * The multipart body for `POST /api/v1/files`. Only known fields are passed on, so a renderer
 * can't send anything else through the main process.
 */
function buildFileForm(attachment, form) {
  const text = (value) => (typeof value === 'string' ? value : '');
  const body = new FormData();
  body.set('file', new Blob([attachment.bytes], { type: contentTypeFor(attachment.name) }), attachment.name);
  body.set('itemType', attachment.type);
  const title = text(form?.title).trim();
  if (title) body.set('title', title);
  const description = text(form?.description).trim();
  if (description) body.set('description', description);
  const tags = text(form?.tags).trim();
  if (tags) body.set('tags', tags);
  if (text(form?.collectionId)) body.set('collectionId', form.collectionId);
  return body;
}

module.exports = {
  MAX_UPLOAD_BYTES,
  PICKER_EXTENSIONS,
  buildFileForm,
  baseName,
  checkFile,
  classifyFile,
  clipboardImageName,
  contentTypeFor,
  formatSize,
};
