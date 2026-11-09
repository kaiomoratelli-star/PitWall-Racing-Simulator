// Saves em disco, separados da instalação:
//   saves\slot1.json.gz (+ .meta.json) e saves\backups\slot1.<data>.json.gz (5 últimas versões)
// Gravação atômica (arquivo temporário + rename) e recuperação automática.
// (0.8.7) Os saves são gravados compactados (gzip, ~6x menores). Antes de trocar o arquivo, o que foi
// gravado é lido de volta, descompactado e comparado com o original: se não bater, nada é trocado.
// Saves antigos (.json sem compactação) continuam sendo lidos; o primeiro save compactado move o
// .json antigo para os backups (nunca apaga).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
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
// backups do slot (compactados e antigos), do mais novo para o mais velho; "apagado" fica de fora da rotação
const isBackup = (slot, f) => f.startsWith(slot + '.') && (f.endsWith('.json') || f.endsWith('.json.gz'));
const stampOf = (f) => f.replace(/\.json(\.gz)?$/, '');
function backups(slot) {
  return fs.readdirSync(bdir).filter(f => isBackup(slot, f)).sort((a, b) => (stampOf(a) < stampOf(b) ? 1 : stampOf(a) > stampOf(b) ? -1 : 0));
}
// grava compactado e confere lendo de volta antes do rename
function atomicWriteGz(file, data) {
  const gz = zlib.gzipSync(Buffer.from(data, 'utf8'), { level: 6 });
  const tmp = `${file}.tmp`;
  const fd = fs.openSync(tmp, 'w');
  try { fs.writeFileSync(fd, gz); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  const back = zlib.gunzipSync(fs.readFileSync(tmp)).toString('utf8');
  if (back !== data) { fs.rmSync(tmp, { force: true }); throw new Error('conferência do save compactado falhou; o save anterior foi mantido'); }
  fs.renameSync(tmp, file);
}
// lê um save (compactado ou não) e confere que é JSON válido
function readSave(file) {
  const buf = fs.readFileSync(file);
  const s = (buf[0] === 0x1f && buf[1] === 0x8b) ? zlib.gunzipSync(buf).toString('utf8') : buf.toString('utf8');
  JSON.parse(s); return s;
}
function saveSlot(slot, data, meta) {
  check(slot);
  JSON.parse(data); // nunca grava conteúdo corrompido
  const file = path.join(dir, slot + '.json.gz');
  const legacy = path.join(dir, slot + '.json');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (fs.existsSync(file)) fs.copyFileSync(file, path.join(bdir, `${slot}.${stamp}.json.gz`));
  atomicWriteGz(file, data);
  // o save antigo sem compactação vai para os backups depois que o novo foi gravado e conferido
  if (fs.existsSync(legacy)) fs.renameSync(legacy, path.join(bdir, `${slot}.${stamp}-antigo.json`));
  backups(slot).filter(f => !f.includes('.apagado-')).slice(KEEP).forEach(f => fs.rmSync(path.join(bdir, f), { force: true }));
  atomicWrite(path.join(dir, slot + '.meta.json'), JSON.stringify(meta || {}));
  return true;
}
function loadSlot(slot) {
  check(slot);
  // primeiro o compactado; depois o antigo (.json, de versões até a 0.8.6)
  for (const f of [slot + '.json.gz', slot + '.json']) {
    const file = path.join(dir, f);
    if (!fs.existsSync(file)) continue;
    try { return { data: readSave(file), recovered: false }; } catch (e) { log.error(`save ${f} danificado: ${e.message}`); }
  }
  for (const b of backups(slot).filter(f => !f.includes('.apagado-'))) {
    try {
      const data = readSave(path.join(bdir, b));
      log.warn(`save ${slot} recuperado do backup ${b}`);
      const stat = fs.statSync(path.join(bdir, b));
      return { data, recovered: true, recoveredAt: stat.mtimeMs };
    } catch (e) { log.error(`backup ${b} também danificado`); }
  }
  return null;
}
function slotMeta(slot) {
  check(slot);
  try { return JSON.parse(fs.readFileSync(path.join(dir, slot + '.meta.json'), 'utf8')); } catch (e) { return (fs.existsSync(path.join(dir, slot + '.json.gz')) || fs.existsSync(path.join(dir, slot + '.json'))) ? { team: 'Jogo salvo', year: '?', round: 0, total: 0 } : null; }
}
function deleteSlot(slot) {
  check(slot);
  // não apaga de verdade: move para backups, recuperável
  for (const ext of ['.json.gz', '.json']) {
    const file = path.join(dir, slot + ext);
    if (fs.existsSync(file)) fs.renameSync(file, path.join(bdir, `${slot}.apagado-${Date.now()}${ext}`));
  }
  fs.rmSync(path.join(dir, slot + '.meta.json'), { force: true });
  return true;
}
function saveBase(data) { JSON.parse(data); atomicWrite(path.join(dir, 'base-database.json'), data); return true; }
function loadBase() { try { return readSave(path.join(dir, 'base-database.json')); } catch (e) { return null; } }
module.exports = { init, saveSlot, loadSlot, slotMeta, deleteSlot, saveBase, loadBase, get dir() { return dir; } };
