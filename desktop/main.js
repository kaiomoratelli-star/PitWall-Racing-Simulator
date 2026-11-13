// PitWall Racing Simulator — processo principal (Electron)
const { app, BrowserWindow, ipcMain, dialog, shell, screen } = require('electron');
const fs = require('fs');
const path = require('path');
const log = require('./logger');
const storage = require('./storage');

const isDev = process.argv.includes('--dev') || !!process.env.PITWALL_DEV;
const argVal = (k) => { const a = process.argv.find(x => x.startsWith(k + '=')); return a ? a.slice(k.length + 1) : null; };
const smokeMode = process.argv.includes('--smoke-test') ? 'test' : process.argv.includes('--smoke-verify') ? 'verify' : null;

// pasta de dados: %APPDATA%\PitWall Racing Simulator (dev usa outra pasta para não misturar)
app.setName('PitWall Racing Simulator');
const customData = argVal('--data-dir');
if (customData) app.setPath('userData', path.resolve(customData));
else if (isDev) app.setPath('userData', path.join(app.getPath('appData'), 'PitWall Racing Simulator (dev)'));
const DATA = app.getPath('userData');
log.init(path.join(DATA, 'logs'));
storage.init(DATA);
log.info(`iniciando v${app.getVersion()} ${isDev ? '(dev)' : ''} electron ${process.versions.electron} em ${process.platform}; dados em ${DATA}`);

// limite de memória do V8 e uma única instância aberta
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=2048');
// preferências do aplicativo (não do save): %APPDATA%\PitWall Racing Simulator\desktop-prefs.json
const PREFS_FILE = path.join(DATA, 'desktop-prefs.json');
const PREFS_DEFAULT = { hwAccel: true };
function loadPrefs() { try { return { ...PREFS_DEFAULT, ...JSON.parse(fs.readFileSync(PREFS_FILE, 'utf8')) }; } catch (e) { return { ...PREFS_DEFAULT }; } }
const prefs = loadPrefs();
// (0.9) aceleração de hardware ligada por padrão; o jogador pode desligar nas opções (vale ao reiniciar),
// para placas e drivers com travamentos ou artefatos de vídeo. --disable-hw-accel força o modo sem GPU.
const hwAccel = prefs.hwAccel !== false && !process.argv.includes('--disable-hw-accel');
if (!hwAccel) app.disableHardwareAcceleration();
log.info(`aceleração de hardware: ${hwAccel ? 'ligada' : 'desligada'}`);
if (!smokeMode && !app.requestSingleInstanceLock()) { app.quit(); }

process.on('uncaughtException', (e) => {
  log.error('exceção não tratada: ' + (e && e.stack || e));
  if (app.isReady() && !smokeMode) dialog.showErrorBox('PitWall Racing Simulator', `Ocorreu um erro inesperado e ele foi registrado em:\n${log.file}\n\n${e && e.message}`);
});
process.on('unhandledRejection', (e) => log.error('promessa rejeitada: ' + (e && e.stack || e)));

let win = null, splash = null;
const stateFile = path.join(DATA, 'window-state.json');
function loadState() { try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch (e) { return { width: 1440, height: 900, maximized: true }; } }
function saveState() {
  if (!win || win.isDestroyed()) return;
  const b = win.getNormalBounds();
  try { fs.writeFileSync(stateFile, JSON.stringify({ ...b, maximized: win.isMaximized(), fullscreen: win.isFullScreen() })); } catch (e) { /* ignora */ }
}
const ICON = path.join(__dirname, '..', 'build', 'icon.png');

function createSplash() {
  splash = new BrowserWindow({ width: 640, height: 360, frame: false, resizable: false, transparent: false, center: true, show: true, backgroundColor: '#0b0b10', icon: ICON, skipTaskbar: false, webPreferences: { sandbox: true, contextIsolation: true } });
  splash.loadFile(path.join(__dirname, 'splash.html'), { query: { v: app.getVersion() } });
}

function createWindow() {
  const st = loadState();
  const area = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width: Math.min(st.width || 1440, area.width), height: Math.min(st.height || 900, area.height), x: st.x, y: st.y,
    minWidth: 1024, minHeight: 640, show: false, backgroundColor: '#0d1015', icon: ICON, title: 'PitWall Racing Simulator', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false, devTools: isDev },
  });
  win.setMenu(null);
  win.loadFile(path.join(__dirname, '..', 'app', 'dist', 'index.html'));
  const showMain = () => {
    if (!win || win.isDestroyed() || win.isVisible()) return;
    if (st.maximized) win.maximize();
    if (st.fullscreen) win.setFullScreen(true);
    if (!smokeMode) win.show(); else win.showInactive();
    if (splash && !splash.isDestroyed()) splash.close();
    splash = null;
  };
  ipcMain.removeAllListeners('app:ready');
  ipcMain.on('app:ready', showMain);
  setTimeout(showMain, 15000); // segurança: nunca fica preso na tela de abertura
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    if (input.key === 'Escape' && win.isFullScreen()) win.setFullScreen(false);
    if (isDev && input.key === 'F12') win.webContents.toggleDevTools();
    if (isDev && input.control && input.key.toLowerCase() === 'r') win.reload();
  });
  // links externos abrem no navegador; navegação interna bloqueada
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); } });
  // Electron 35+: os dados vêm no próprio evento e level é texto ('info' | 'warning' | 'error' | 'debug')
  win.webContents.on('console-message', (e) => {
    const lvl = e.level === 'warning' ? 'warn' : e.level === 'error' ? 'error' : null;
    if (lvl) log.write(lvl, `renderer: ${e.message} (${path.basename(e.sourceId || '')}:${e.lineNumber})`);
  });
  win.webContents.on('render-process-gone', (e, details) => {
    log.error('processo do jogo encerrou: ' + JSON.stringify(details));
    if (smokeMode) return finishSmoke({ ok: false, error: 'render-process-gone ' + details.reason });
    const r = dialog.showMessageBoxSync(win, { type: 'error', buttons: ['Recarregar', 'Fechar'], title: 'PitWall', message: 'O jogo parou de responder.', detail: 'Seu último salvamento automático está preservado. Deseja recarregar?' });
    if (r === 0) win.reload(); else app.quit();
  });
  win.on('unresponsive', () => log.warn('janela sem resposta'));
  ['resize', 'move', 'enter-full-screen', 'leave-full-screen'].forEach(ev => win.on(ev, () => { clearTimeout(win._st); win._st = setTimeout(saveState, 400); }));
  win.on('close', saveState);
  win.on('closed', () => { win = null; });
}

/* ---------- IPC: ponte segura com o jogo ---------- */
const handle = (ch, fn) => ipcMain.handle(ch, async (e, ...a) => {
  try { return await fn(...a); } catch (err) { log.error(`${ch}: ${err.stack || err}`); throw err; }
});
handle('save:write', (slot, data, meta) => storage.saveSlot(slot, data, meta));
handle('save:read', (slot) => storage.loadSlot(slot));
handle('save:meta', (slot) => storage.slotMeta(slot));
handle('save:delete', (slot) => storage.deleteSlot(slot));
handle('base:write', (data) => storage.saveBase(data));
handle('base:read', () => storage.loadBase());
handle('app:info', () => ({ version: app.getVersion(), dataDir: DATA, savesDir: storage.dir, logFile: log.file, dev: isDev, electron: process.versions.electron, hwAccel, prefs: loadPrefs() }));
// só chaves conhecidas e do tipo certo; a mudança vale ao reiniciar o jogo
handle('prefs:set', (k, v) => {
  if (!Object.prototype.hasOwnProperty.call(PREFS_DEFAULT, k) || typeof v !== typeof PREFS_DEFAULT[k]) throw new Error(`preferência inválida: ${k}`);
  const p = { ...loadPrefs(), [k]: v };
  fs.writeFileSync(PREFS_FILE, JSON.stringify(p, null, 2));
  log.info(`preferência ${k} = ${v} (vale ao reiniciar)`);
  return p;
});
handle('app:open', (which) => shell.openPath(which === 'logs' ? path.dirname(log.file) : storage.dir));
handle('app:fullscreen', () => { if (win) win.setFullScreen(!win.isFullScreen()); return win && win.isFullScreen(); });
handle('file:export', async (name, data) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('documents'), String(name).replace(/[\\/:*?"<>|]/g, '-')), filters: [{ name: 'JSON', extensions: ['json'] }] });
  if (r.canceled || !r.filePath) return { ok: false, canceled: true };
  fs.writeFileSync(r.filePath, data);
  log.info('exportado: ' + r.filePath);
  return { ok: true, path: r.filePath };
});
ipcMain.on('log', (e, level, msg) => log.write(['info', 'warn', 'error'].includes(level) ? level : 'info', 'jogo: ' + msg));
handle('smoke:mode', () => smokeMode);
ipcMain.on('smoke:done', (e, result) => finishSmoke(result));

async function finishSmoke(result) {
  const shot = argVal('--smoke-shot');
  if (shot && win && !win.isDestroyed()) {
    try { win.webContents.executeJavaScript("go('hub')"); await new Promise(r => setTimeout(r, 600)); const img = await win.webContents.capturePage(); fs.writeFileSync(shot, img.toPNG()); } catch (e) { log.error('captura: ' + e.message); }
  }
  const out = { ...result, version: app.getVersion(), dataDir: DATA, at: new Date().toISOString() };
  fs.writeFileSync(path.join(DATA, `smoke-${smokeMode}.json`), JSON.stringify(out, null, 2));
  log.info(`smoke ${smokeMode}: ${out.ok ? 'OK' : 'FALHOU'} ${out.error || ''}`);
  setTimeout(() => app.exit(out.ok ? 0 : 1), 300);
}

app.whenReady().then(() => {
  if (!smokeMode) createSplash();
  createWindow();
  if (smokeMode) setTimeout(() => finishSmoke({ ok: false, error: 'tempo esgotado (180s)' }), 180000);
});
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => { log.info('encerrando'); app.quit(); });
