const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_SHORTCUT, createConfigStore } = require('./config');

/** An in-memory stand-in for `fs` and Electron's `safeStorage`. */
function setup({ encryption = true } = {}) {
  const files = new Map();
  const fs = {
    readFileSync: (file) => {
      if (!files.has(file)) throw new Error('ENOENT');
      return files.get(file);
    },
    writeFileSync: (file, data) => files.set(file, data),
  };
  const safeStorage = {
    isEncryptionAvailable: () => encryption,
    encryptString: (text) => Buffer.from(`enc:${text}`),
    decryptString: (buffer) => {
      const text = buffer.toString();
      if (!text.startsWith('enc:')) throw new Error('bad data');
      return text.slice(4);
    },
  };
  const store = createConfigStore({ file: 'config.json', fs, safeStorage, defaultBaseUrl: 'https://prod.example' });
  return { store, files };
}

test('defaults when nothing is stored', () => {
  const { store } = setup();
  assert.deepEqual(store.load(), {
    baseUrl: 'https://prod.example',
    token: '',
    lastCollectionId: '',
    shortcut: DEFAULT_SHORTCUT,
  });
});

test('the token is stored encrypted, never in plain text', () => {
  const { store, files } = setup();
  store.save({ token: 'bb_secret' });

  assert.equal(store.load().token, 'bb_secret');
  assert.ok(!files.get('config.json').includes('bb_secret'));
});

test('saving other settings keeps the token', () => {
  const { store } = setup();
  store.save({ token: 'bb_secret' });
  store.save({ lastCollectionId: 'c1', shortcut: 'Alt+X' });

  assert.equal(store.load().token, 'bb_secret');
  assert.equal(store.load().lastCollectionId, 'c1');
  assert.equal(store.load().shortcut, 'Alt+X');
});

test('an empty token forgets it', () => {
  const { store, files } = setup();
  store.save({ token: 'bb_secret' });
  store.save({ token: '' });

  assert.equal(store.load().token, '');
  assert.ok(!files.get('config.json').includes('tokenEnc'));
});

test('without a keychain the token lives in memory only', () => {
  const { store, files } = setup({ encryption: false });
  store.save({ token: 'bb_secret' });

  assert.equal(store.load().token, 'bb_secret');
  assert.ok(!files.get('config.json').includes('bb_secret'));
  assert.equal(store.canEncrypt(), false);
});

test('a token encrypted for another user reads as empty instead of throwing', () => {
  const { store, files } = setup();
  files.set('config.json', JSON.stringify({ tokenEnc: Buffer.from('garbage').toString('base64') }));

  assert.equal(store.load().token, '');
});

test('a corrupt file falls back to the defaults', () => {
  const { store, files } = setup();
  files.set('config.json', '{not json');
  assert.equal(store.load().baseUrl, 'https://prod.example');

  files.set('config.json', '[]');
  assert.equal(store.load().shortcut, DEFAULT_SHORTCUT);
});
