// Ponte segura entre o jogo (renderer isolado) e o sistema de arquivos
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('pitwallNative', {
  saveSlot: (slot, data, meta) => ipcRenderer.invoke('save:write', slot, data, meta),
  loadSlot: (slot) => ipcRenderer.invoke('save:read', slot),
  slotMeta: (slot) => ipcRenderer.invoke('save:meta', slot),
  deleteSlot: (slot) => ipcRenderer.invoke('save:delete', slot),
  saveBase: (data) => ipcRenderer.invoke('base:write', data),
  loadBase: () => ipcRenderer.invoke('base:read'),
  exportFile: (name, data) => ipcRenderer.invoke('file:export', name, data),
  info: () => ipcRenderer.invoke('app:info'),
  openPath: (which) => ipcRenderer.invoke('app:open', which),
  toggleFullscreen: () => ipcRenderer.invoke('app:fullscreen'),
  log: (level, msg) => ipcRenderer.send('log', level, msg),
  ready: () => ipcRenderer.send('app:ready'),
  smokeMode: () => ipcRenderer.invoke('smoke:mode'),
  smokeDone: (result) => ipcRenderer.send('smoke:done', result),
});
