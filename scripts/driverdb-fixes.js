// Correções da base de pilotos (app/data/drivers-db.js) depois da importação da Wikipedia:
//  1) tira marcação de wiki que sobrou em nomes de equipe ({{nowrap|Mercedes-AMG Petronas F1 Team}} aparecia assim
//     na ficha de carreira do piloto);
//  2) acrescenta as temporadas confirmadas de scripts/driverdb-manual.json (com fonte e data) que a fonte pública
//     ainda não publicou.
// Edita o texto do arquivo no lugar (não regrava o JSON inteiro: o importador grava números como 180.0).
// Chamado no fim de scripts/import_drivers.py; pode rodar sozinho. Rodar duas vezes não muda nada.
// Uso: node scripts/driverdb-fixes.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const file = path.join(root, 'app', 'data', 'drivers-db.js');
const manual = JSON.parse(fs.readFileSync(path.join(__dirname, 'driverdb-manual.json'), 'utf8'));
let txt = fs.readFileSync(file, 'utf8');
const load = (t) => { const c = vm.createContext({}); vm.runInContext(t + ';this.D=DRIVER_DB', c); return c.D; };

// 1) marcação de wiki em strings ({{nowrap|X}}, {{sortname|A|B}})
let fixedMarkup = 0;
txt = txt.replace(/\{\{\s*(?:nowrap|sortname)\s*\|\s*([^{}"]*?)\s*\}\}/gi, (m, inner) => { fixedMarkup++; return inner.replace(/\|/g, ' ').trim(); });

// 2) temporadas confirmadas: entram no fim da lista do piloto (precisam ser as mais recentes, para manter a ordem)
let added = 0;
for (const { uid, name, entry } of manual.seasons) {
  const D = load(txt);
  const p = D.drivers.find(d => d.uid === uid);
  if (!p) throw new Error(`driverdb-manual: piloto ${uid} (${name}) não está na base`);
  if (p.seasons.some(s => s.y === entry.y && s.s === entry.s)) continue;   // já está (da fonte ou de uma rodada anterior)
  const last = p.seasons[p.seasons.length - 1];
  if (last && (last.y > entry.y || (last.y === entry.y && last.s > entry.s))) throw new Error(`driverdb-manual: ${name} já tem temporada depois de ${entry.y}/${entry.s}; a inserção no fim quebraria a ordem`);
  const at = txt.indexOf(`"uid":"${uid}"`);
  const start = txt.indexOf('"seasons":[', at);
  // fim da lista de temporadas: o colchete que fecha "seasons":[ (as temporadas não têm listas dentro)
  const end = txt.indexOf(']', start + '"seasons":['.length);
  if (at < 0 || start < 0 || end < 0) throw new Error(`driverdb-manual: não achei as temporadas de ${name}`);
  const sep = txt[end - 1] === '[' ? '' : ',';
  txt = txt.slice(0, end) + sep + JSON.stringify(entry) + txt.slice(end);
  added++;
}

const D = load(txt);   // confere que o arquivo continua válido
fs.writeFileSync(file, txt);
console.log(`driverdb-fixes: ${fixedMarkup} marcação(ões) de wiki removida(s) · ${added} temporada(s) confirmada(s) acrescentada(s) · ${D.drivers.length} pilotos`);
