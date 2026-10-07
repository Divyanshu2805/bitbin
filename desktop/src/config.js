// Settings kept on this device, in `config.json` under the app's user-data folder.
// The API token is stored encrypted with the OS keychain (Electron `safeStorage`:
// DPAPI on Windows, Keychain on macOS, libsecret on Linux). Where no keychain is
// available the token is kept in memory only and has to be pasted again next run.

const DEFAULT_SHORTCUT = 'CommandOrControl+Alt+B';

function createConfigStore({ file, fs, safeStorage, defaultBaseUrl }) {
  let memoryToken = '';

  function readFile() {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      // Missing or corrupt: start again from the defaults
      return {};
    }
  }

  function canEncrypt() {
    try {
      return safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  }

  function readToken(raw) {
    if (typeof raw.tokenEnc !== 'string' || !canEncrypt()) return memoryToken;
    try {
      return safeStorage.decryptString(Buffer.from(raw.tokenEnc, 'base64'));
    } catch {
      // Written by another OS user or a different machine
      return '';
    }
  }

  function load() {
    const raw = readFile();
    const text = (value, fallback) => (typeof value === 'string' && value ? value : fallback);
    return {
      baseUrl: text(raw.baseUrl, defaultBaseUrl),
      token: readToken(raw),
      lastCollectionId: text(raw.lastCollectionId, ''),
      shortcut: text(raw.shortcut, DEFAULT_SHORTCUT),
    };
  }

  /** Merge `patch` into the stored settings. `token: ''` forgets the token. */
  function save(patch) {
    const raw = readFile();
    const { token, ...rest } = patch;
    Object.assign(raw, rest);

    if (token !== undefined) {
      memoryToken = token;
      delete raw.tokenEnc;
      if (token && canEncrypt()) {
        raw.tokenEnc = safeStorage.encryptString(token).toString('base64');
      }
    }

    fs.writeFileSync(file, JSON.stringify(raw, null, 2), { mode: 0o600 });
  }

  return { load, save, canEncrypt };
}

module.exports = { DEFAULT_SHORTCUT, createConfigStore };
