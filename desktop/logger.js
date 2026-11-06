// Log em arquivo com rotação: %APPDATA%\PitWall Racing Simulator\logs\pitwall.log
const fs = require('fs');
const path = require('path');
let file = null;
const MAX = 2 * 1024 * 1024;
function init(dir) {
  fs.mkdirSync(dir, { recursive: true });
  file = path.join(dir, 'pitwall.log');
  try {
    if (fs.existsSync(file) && fs.statSync(file).size > MAX) {
      for (let i = 2; i >= 1; i--) { const a = `${file}.${i}`; if (fs.existsSync(a)) fs.renameSync(a, `${file}.${i + 1}`); }
      fs.renameSync(file, `${file}.1`);
    }
  } catch (e) { /* rotação falhou: segue no mesmo arquivo */ }
}
function write(level, msg) {
  const line = `${new Date().toISOString()} [${level.toUpperCase()}] ${String(msg).replace(/\s+$/, '')}\n`;
  if (level === 'error') process.stderr.write(line); else if (process.env.PITWALL_DEV) process.stdout.write(line);
  if (!file) return;
  try { fs.appendFileSync(file, line); } catch (e) { /* disco cheio ou sem permissão */ }
}
module.exports = { init, info: m => write('info', m), warn: m => write('warn', m), error: m => write('error', m), write, get file() { return file; } };
