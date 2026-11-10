const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  platform: process.platform,
  storeGetSync: () => ipcRenderer.sendSync('store:getSync'),
  storeSet: v => ipcRenderer.send('store:set', v),
  saveFile: (name, content) => ipcRenderer.invoke('file:save', name, content),
  openFile: () => ipcRenderer.invoke('file:open'),
  notify: (t, b) => ipcRenderer.send('notify', t, b),
  setBadge: n => ipcRenderer.send('badge', n),
  onMenu: cb => { ipcRenderer.on('menu', (_, m) => cb(m)); }
});
