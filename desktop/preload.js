// The only bridge between the app's pages and the main process. Pages get named
// calls, never `ipcRenderer` itself, and never the API token.

const { contextBridge, ipcRenderer } = require('electron');

const call = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);
const on = (channel) => (listener) => {
  ipcRenderer.on(channel, () => listener());
};

contextBridge.exposeInMainWorld('bitbin', {
  closeWindow: call('window:close'),
  fitWindow: call('window:fit'),
  openSettings: call('app:open-settings'),
  openDashboard: call('app:open-dashboard'),
  openTokens: call('app:open-tokens'),
  quit: call('app:quit'),

  capture: {
    init: call('capture:init'),
    collections: call('capture:collections'),
    suggest: call('capture:suggest'),
    save: call('capture:save'),
    pickFile: call('capture:pick-file'),
    attach: call('capture:attach'),
    clearAttachment: call('capture:clear-attachment'),
    onOpen: on('capture:open'),
  },

  settings: {
    state: call('settings:state'),
    account: call('settings:account'),
    connect: call('settings:connect'),
    disconnect: call('settings:disconnect'),
    setShortcut: call('settings:set-shortcut'),
    setLogin: call('settings:set-login'),
    onOpen: on('settings:open'),
  },
});
