// Client for BitBin's token API (docs/api/token-api.md). Runs in the main
// process only, so the token never reaches a renderer.

const { parseTags } = require('./guess');

const PRODUCTION_URL ='https://bitbin.divyanshuagrahari.dev';
const LOCAL_URL = 'http://localhost:3000';

const REQUEST_TIMEOUT_MS = 20 * 1000;

/** The sites the app may talk to. Local development is offered only when running from source. */
function baseUrls({ packaged }) {
  const urls = [{ label: 'BitBin (bitbin.divyanshuagrahari.dev)', value: PRODUCTION_URL }];
  if (!packaged) urls.push({ label: 'Local development (localhost:3000)', value: LOCAL_URL });
  return urls;
}

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Call the token API. Resolves to the parsed `data`, or throws an ApiError whose
 * message is safe to show (the server's `error` string) and whose `status` is the
 * HTTP status (0 when the request never got an answer).
 */
async function apiRequest(fetchImpl, { baseUrl, token }, path, { method = 'GET', body } = {}) {
  if (!token) throw new ApiError('Add your BitBin token in Settings.', 401);

  let res;
  try {
    res = await fetchImpl(`${baseUrl}/api/v1${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'omit',
      redirect: 'error',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(`Could not reach ${new URL(baseUrl).host}.`, 0);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fieldError = json.fieldErrors && Object.values(json.fieldErrors).flat()[0];
    throw new ApiError(fieldError || json.error || `Request failed (${res.status})`, res.status);
  }
  return json.data;
}

/**
 * The body for `POST /api/v1/items` from the capture form. Only known fields are
 * passed on, so a renderer can't send anything else through the main process.
 */
function buildItemBody(form, itemTypes) {
  const type = itemTypes.includes(form?.type) ? form.type : 'note';
  const text = (value) => (typeof value === 'string' ? value : '');

  const body = {
    typeName: type,
    title: text(form?.title).trim(),
    tags: parseTags(text(form?.tags)),
    collectionIds: text(form?.collectionId) ? [form.collectionId] : [],
  };

  const description = text(form?.description).trim();
  if (description) body.description = description;

  if (type === 'link') body.url = text(form?.url).trim();
  else body.content = text(form?.content);

  return body;
}

/** The body the two AI endpoints share. */
function buildSuggestBody(form, itemTypes) {
  const item = buildItemBody(form, itemTypes);
  const body = {
    title: item.title,
    content: item.typeName === 'link' ? item.url : item.content,
    typeName: item.typeName,
    language: null,
  };
  if (item.typeName === 'link') body.url = item.url;
  return body;
}

module.exports = {
  PRODUCTION_URL,
  LOCAL_URL,
  ApiError,
  apiRequest,
  baseUrls,
  buildItemBody,
  buildSuggestBody,
};
