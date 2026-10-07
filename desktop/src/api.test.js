const test = require('node:test');
const assert = require('node:assert/strict');
const { ApiError, apiRequest, baseUrls, buildItemBody, buildSuggestBody } = require('./api');
const { ITEM_TYPES } = require('./guess');

const settings = { baseUrl: 'https://bitbin.example', token: 'bb_secret' };
const reply = (status, json) => async () => ({ ok: status < 400, status, json: async () => json });

test('baseUrls offers localhost only when running from source', () => {
  assert.equal(baseUrls({ packaged: true }).length, 1);
  assert.ok(baseUrls({ packaged: false }).some((site) => site.value === 'http://localhost:3000'));
});

test('apiRequest sends the Bearer token without cookies and returns data', async () => {
  let call;
  const fetchImpl = async (url, init) => {
    call = { url, init };
    return { ok: true, status: 200, json: async () => ({ data: { email: 'a@b.dev' } }) };
  };

  const data = await apiRequest(fetchImpl, settings, '/me');

  assert.deepEqual(data, { email: 'a@b.dev' });
  assert.equal(call.url, 'https://bitbin.example/api/v1/me');
  assert.equal(call.init.headers.Authorization, 'Bearer bb_secret');
  assert.equal(call.init.credentials, 'omit');
  assert.equal(call.init.redirect, 'error');
});

test('apiRequest posts JSON bodies', async () => {
  let init;
  await apiRequest(async (_url, i) => { init = i; return { ok: true, status: 201, json: async () => ({ data: {} }) }; },
    settings, '/items', { method: 'POST', body: { title: 'x' } });

  assert.equal(init.method, 'POST');
  assert.equal(init.headers['Content-Type'], 'application/json');
  assert.equal(init.body, '{"title":"x"}');
});

test('apiRequest refuses without a token and never calls the network', async () => {
  let called = false;
  await assert.rejects(
    apiRequest(async () => { called = true; }, { baseUrl: settings.baseUrl, token: '' }, '/me'),
    (error) => error instanceof ApiError && error.status === 401
  );
  assert.equal(called, false);
});

test('apiRequest surfaces the server error and status', async () => {
  await assert.rejects(
    apiRequest(reply(403, { error: 'The BitBin extension requires a Pro subscription' }), settings, '/me'),
    (error) => error.status === 403 && error.message === 'The BitBin extension requires a Pro subscription'
  );
});

test('apiRequest prefers the first field error', async () => {
  await assert.rejects(
    apiRequest(reply(400, { error: 'Validation failed', fieldErrors: { title: ['Title is required'] } }), settings, '/items'),
    (error) => error.message === 'Title is required'
  );
});

test('apiRequest reports an unreachable host without leaking the cause', async () => {
  await assert.rejects(
    apiRequest(async () => { throw new Error('ECONNREFUSED 10.0.0.1'); }, settings, '/me'),
    (error) => error.status === 0 && error.message === 'Could not reach bitbin.example.'
  );
});

test('buildItemBody keeps only known fields', () => {
  const body = buildItemBody({
    type: 'snippet',
    title: '  Hook  ',
    content: 'x',
    url: 'https://ignored.dev',
    tags: 'React, hooks',
    description: ' d ',
    collectionId: 'c1',
    fileUrl: 'https://r2/evil',
    userId: 'someone-else',
  }, ITEM_TYPES);

  assert.deepEqual(body, {
    typeName: 'snippet',
    title: 'Hook',
    tags: ['react', 'hooks'],
    collectionIds: ['c1'],
    description: 'd',
    content: 'x',
  });
});

test('buildItemBody sends the url for links and falls back to a note for unknown types', () => {
  const link = buildItemBody({ type: 'link', title: 'T', url: ' https://a.dev ', content: 'ignored' }, ITEM_TYPES);
  assert.equal(link.url, 'https://a.dev');
  assert.equal('content' in link, false);

  assert.equal(buildItemBody({ type: 'file', title: 'T' }, ITEM_TYPES).typeName, 'note');
  assert.equal(buildItemBody(undefined, ITEM_TYPES).typeName, 'note');
});

test('buildItemBody sends no collection when none is picked', () => {
  assert.deepEqual(buildItemBody({ type: 'note', title: 'T', collectionId: '' }, ITEM_TYPES).collectionIds, []);
});

test('buildSuggestBody uses the url as content for links', () => {
  assert.deepEqual(buildSuggestBody({ type: 'link', title: 'T', url: 'https://a.dev' }, ITEM_TYPES), {
    title: 'T',
    content: 'https://a.dev',
    typeName: 'link',
    language: null,
    url: 'https://a.dev',
  });
});
