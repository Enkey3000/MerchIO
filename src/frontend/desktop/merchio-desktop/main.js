const { app, BrowserWindow, Menu, Tray, Notification, dialog, ipcMain, shell, nativeImage } = require('electron');
const path = require('path'), fs = require('fs');
let win = null, tray = null, quitting = false;

/* ---------- data file (userData/merchio-data.json) with atomic writes + 7 daily backups ---------- */
const dataFile = () => path.join(app.getPath('userData'), 'merchio-data.json');
const readStore = () => { try { return fs.readFileSync(dataFile(), 'utf8'); } catch (e) { return null; } };
let pending = null, timer = null;
function flush() {
  if (pending == null) return;
  const f = dataFile(), tmp = f + '.tmp';
  try {
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(tmp, pending); fs.renameSync(tmp, f);
    const d = path.join(path.dirname(f), 'backups'); fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'merchio-' + new Date().toISOString().slice(0, 10) + '.json'), pending);
    fs.readdirSync(d).sort().slice(0, -7).forEach(x => fs.unlinkSync(path.join(d, x)));
  } catch (e) { console.error('store write failed', e); }
  pending = null;
}
const writeStore = v => { pending = v; clearTimeout(timer); timer = setTimeout(flush, 400); };

/* ---------- window state ---------- */
const stateFile = () => path.join(app.getPath('userData'), 'window.json');
const loadState = () => { try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch (e) { return {}; } };
const saveState = () => { try { if (win && !win.isMinimized() && !win.isMaximized()) fs.writeFileSync(stateFile(), JSON.stringify(win.getBounds())); } catch (e) {} };

const send = (cmd, arg) => { if (win && !win.isDestroyed()) win.webContents.send('menu', { cmd, arg }); };
const showWin = () => { if (!win) return createWindow(); if (win.isMinimized()) win.restore(); win.show(); win.focus(); };

function createWindow() {
  const st = loadState();
  win = new BrowserWindow({
    width: st.width || 1360, height: st.height || 860, x: st.x, y: st.y, minWidth: 980, minHeight: 640,
    backgroundColor: '#ffffff', title: 'MerchIO', show: false, icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true, nodeIntegration: false }
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  win.on('close', saveState);
  win.on('closed', () => { win = null; });
}

/* ---------- menu ---------- */
const go = (label, id, accel) => ({ label, accelerator: accel, click: () => send('go', id) });
function buildMenu() {
  const mac = process.platform === 'darwin';
  return Menu.buildFromTemplate([
    ...(mac ? [{ role: 'appMenu' }] : []),
    { label: 'File', submenu: [
      { label: 'New Record', accelerator: 'CmdOrCtrl+N', click: () => send('new') },
      { label: 'Import CSV…', accelerator: 'CmdOrCtrl+O', click: () => send('import') },
      { label: 'Export CSV…', accelerator: 'CmdOrCtrl+E', click: () => send('export') },
      { type: 'separator' },
      { label: 'Backup…', click: () => send('backup') }, { label: 'Restore…', click: () => send('restore') },
      { type: 'separator' }, mac ? { role: 'close' } : { role: 'quit' }] },
    { role: 'editMenu' },
    { label: 'View', submenu: [
      { label: 'Toggle Dark Mode', accelerator: 'CmdOrCtrl+D', click: () => send('theme') }, { type: 'separator' },
      { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'resetZoom' }, { type: 'separator' }, { role: 'togglefullscreen' },
      ...(app.isPackaged ? [] : [{ type: 'separator' }, { role: 'reload' }, { role: 'toggleDevTools' }])] },
    { label: 'Go', submenu: [
      go('Dashboard', 'home', 'CmdOrCtrl+1'), go('Orders', 'orders', 'CmdOrCtrl+2'), go('Inventory', 'inventory', 'CmdOrCtrl+3'),
      go('Support Tickets', 'tickets', 'CmdOrCtrl+4'), go('Email Marketing', 'email', 'CmdOrCtrl+5'), go('Notifications', 'notes', 'CmdOrCtrl+6'),
      { type: 'separator' }, { label: 'Search…', accelerator: 'CmdOrCtrl+K', click: () => send('search') }] },
    { role: 'windowMenu' },
    { label: 'Help', submenu: [{ label: 'MerchIO Website', click: () => shell.openExternal('https://merchio.com') }, { label: 'About MerchIO', click: () => dialog.showMessageBox(win, { type: 'info', title: 'MerchIO', message: 'MerchIO ' + app.getVersion(), detail: 'Commerce operations platform.' }) }] }
  ]);
}

/* ---------- tray ---------- */
function buildTray() {
  try {
    const img = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png')).resize({ width: 16, height: 16 });
    tray = new Tray(img); tray.setToolTip('MerchIO');
    tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Open MerchIO', click: showWin }, { label: 'New Order', click: () => { showWin(); send('go', 'orders'); send('new'); } }, { type: 'separator' }, { label: 'Quit', click: () => { quitting = true; app.quit(); } }]));
    tray.on('click', showWin);
  } catch (e) { console.error('tray unavailable', e); }
}

/* ---------- IPC (validated; renderer is sandboxed) ---------- */
ipcMain.on('store:getSync', e => { e.returnValue = readStore(); });
ipcMain.on('store:set', (_, v) => { if (typeof v === 'string' && v.length < 50e6) writeStore(v); });
ipcMain.handle('file:save', async (_, name, content) => {
  const safe = String(name).replace(/[\\/:*?"<>|]/g, '_');
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), safe), filters: [{ name: 'CSV / JSON', extensions: ['csv', 'json'] }] });
  if (r.canceled || !r.filePath) return null;
  fs.writeFileSync(r.filePath, String(content)); return r.filePath;
});
ipcMain.handle('file:open', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'CSV / JSON / Text', extensions: ['csv', 'json', 'txt'] }] });
  if (r.canceled || !r.filePaths[0]) return null;
  if (fs.statSync(r.filePaths[0]).size > 20e6) return null;
  return fs.readFileSync(r.filePaths[0], 'utf8');
});
ipcMain.on('notify', (_, t, b) => { if (Notification.isSupported()) { const n = new Notification({ title: String(t).slice(0, 120), body: String(b || '').slice(0, 300) }); n.on('click', () => { showWin(); send('go', 'notes'); }); n.show(); } });
ipcMain.on('badge', (_, n) => { try { app.setBadgeCount(Math.max(0, +n || 0)); } catch (e) {} });

/* ---------- lifecycle, single instance, merchio:// deep links ---------- */
const deep = u => { const m = /^merchio:\/\/([\w-]+)/.exec(u || ''); if (m) { showWin(); setTimeout(() => send('go', m[1]), 300); } };
if (!app.requestSingleInstanceLock()) { app.quit(); }
else {
  app.on('second-instance', (_, argv) => { showWin(); deep(argv.find(a => a.startsWith('merchio://'))); });
  app.on('open-url', (e, u) => { e.preventDefault(); deep(u); });
  app.whenReady().then(() => {
    app.setAsDefaultProtocolClient('merchio');
    Menu.setApplicationMenu(buildMenu()); createWindow(); buildTray();
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
  });
  app.on('before-quit', () => { quitting = true; flush(); });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
module.exports = { buildMenu, readStore, writeStore, flush };
