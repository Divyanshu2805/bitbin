const MENU_ID = 'bitbin-save-selection';

chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Save selection to BitBin',
    contexts: ['selection', 'link', 'page'],
  });

  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID) return;

  // Hand the selection to the popup: it can't read it itself when opened
  // from a menu on pages scripts can't run in (PDFs, some iframes).
  await chrome.storage.session.set({
    pending: {
      selection: info.selectionText || (info.linkUrl ?? ''),
      title: tab?.title ?? '',
      url: info.pageUrl || tab?.url || '',
      at: Date.now(),
    },
  });

  try {
    await chrome.action.openPopup();
  } catch {
    // openPopup isn't available everywhere; fall back to a small window.
    await chrome.windows.create({
      url: chrome.runtime.getURL('popup.html?window=1'),
      type: 'popup',
      width: 420,
      height: 620,
    });
  }
});
