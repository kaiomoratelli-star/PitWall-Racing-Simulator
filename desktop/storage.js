// Saves em disco, separados da instalação:
//   saves\slot1.json (+ .meta.json) e saves\backups\slot1.<data>.json (5 últimas versões)
// Gravação atômica (arquivo temporário + rename) e recuperação automática.
const fs = require('fs');
const path = require('path');
const log = require('./logger');
const KEEP = 5;
const SLOT_RE = /^slot[1-9]$/;
let dir, bdir;

function init(dataDir) {
  dir = path.join(dataDir, 'saves');
  bdir = path.join(dir, 'backups');
  fs.mkdirSync(bdir, { recursive: true });
}
function atomicWrite(file, data) {
  const tmp = `${file}.tmp`;
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeFileSync(fd, data); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  fs.renameSync(tmp, file);
}
function check(slot) { if (!SLOT_RE.test(slot)) throw new Error('slot inválido: ' + slot); }
function backups(slot) {
  return fs.readdirSync(bdir).filter(f => f.startsWith(slot + '.') && f.endsWith('.json')).sort().reverse();
}
function saveSlot(slot, data, meta) {
  check(slot);
  JSON.parse(data); // nunca grava conteúdo corrompido
  const file = path.join(dir, slot + '.json');
  if (fs.existsSync(file)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(file, path.join(bdir, `${slot}.${stamp}.json`));
    backups(slot).slice(KEEP).forEach(f => fs.rmSync(path.join(bdir, f), { force: true }));
  }
  atomicWrite(file, data);
  atomicWrite(path.join(dir, slot + '.meta.json'), JSON.stringify(meta || {}));
  return true;
}
function readJson(file) { const s = fs.readFileSync(file, 'utf8'); JSON.parse(s); return s; }
function loadSlot(slot) {
  check(slot);
  const file = path.join(dir, slot + '.json');
  if (fs.existsSync(file)) {
    try { return { data: readJson(file), recovered: false }; } catch (e) { log.error(`save ${slot} danificado: ${e.message}`); }
  }
  for (const b of backups(slot)) {
    try {
      const data = readJson(path.join(bdir, b));
      log.warn(`save ${slot} recuperado do backup ${b}`);
      const stat = fs.statSync(path.join(bdir, b));
      return { data, recovered: true, recoveredAt: stat.mtimeMs };
    } catch (e) { log.error(`backup ${b} também danificado`); }
  }
  return null;
}
function slotMeta(slot) {
  check(slot);
  try { return JSON.parse(fs.readFileSync(path.join(dir, slot + '.meta.json'), 'utf8')); } catch (e) { return fs.existsSync(path.join(dir, slot + '.json')) ? { team: 'Jogo salvo', year: '?', round: 0, total: 0 } : null; }
}
function deleteSlot(slot) {
  check(slot);
  // não apaga de verdade: move para backups, recuperável
  const file = path.join(dir, slot + '.json');
  if (fs.existsSync(file)) fs.renameSync(file, path.join(bdir, `${slot}.apagado-${Date.now()}.json`));
  fs.rmSync(path.join(dir, slot + '.meta.json'), { force: true });
  return true;
}
function saveBase(data) { JSON.parse(data); atomicWrite(path.join(dir, 'base-database.json'), data); return true; }
function loadBase() { try { return readJson(path.join(dir, 'base-database.json')); } catch (e) { return null; } }
module.exports = { init, saveSlot, loadSlot, slotMeta, deleteSlot, saveBase, loadBase, get dir() { return dir; } };
