// The saved grid / list choice (lib/view-mode), copied to <html data-view>
// before paint by the root layout. A plain module, not "use client", so the
// server layout gets the string itself.

export const VIEW_STORAGE_KEY = "bitbin:view";

export const VIEW_SCRIPT = `try{if(localStorage.getItem("${VIEW_STORAGE_KEY}")==="list")document.documentElement.dataset.view="list"}catch(e){}`;
