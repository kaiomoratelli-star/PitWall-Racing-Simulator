// Guarda contra funcionalidades que somem sem ninguém perceber. Roda no `npm test` e no CI do Windows.
// Falha quando:
//   1. duas funções com o mesmo nome existem no jogo (a de baixo apaga a de cima em silêncio);
//   2. uma tela (SCREENS.x) ou ação (ACT.x / CHG.x) é redefinida por inteiro sem guardar a anterior
//      e sem estar registrada em tests/replacements.json (troca aprovada, com o motivo);
//   3. um botão chama uma ação que não existe (data-act="x" sem ACT.x);
//   4. um arquivo de app/src não está no build, ou o build cita um arquivo que não existe;
//   5. o manifesto de funcionalidades (tests/features.json) cita uma tela, ação ou função que não existe mais;
//   6. o estilo antigo de embrulho ou uma redefinição silenciosa de função do jogo;
//   7. um embrulho guarda uma tela/ação que ainda não existe naquele ponto do build.
//   9. um sort com comparador aleatório no núcleo (o resultado dependeria do motor JavaScript);
//  10. um embrulho antigo de tela/ação a mais que a linha de base de tests/wraps.json (E12).
// Uso: node scripts/guard-check.js
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const SRC = path.join(root, 'app', 'src');
const { core, ui, data } = require('./modules');
const order = [...core, ...ui];
const read = (m) => fs.readFileSync(path.join(SRC, m + '.js'), 'utf8').replace(/\r\n/g, '\n');   // Windows grava CRLF
const errors = [];
const warn = [];

// 4. arquivos e build
const walk = (d, pre = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name), pre + e.name + '/') : e.name.endsWith('.js') ? [pre + e.name.slice(0, -3)] : []));
const files = walk(SRC);
const listed = new Set([...order, ...data.map(d => d)]);
files.forEach(f => { if (!listed.has(f) && !['head'].includes(f)) errors.push(`app/src/${f}.js não está em scripts/modules.js (nunca entra no jogo)`); });
order.forEach(m => { if (!fs.existsSync(path.join(SRC, m + '.js'))) errors.push(`scripts/modules.js cita ${m}.js, que não existe`); });

// 8. (0.9) sintaxe: cada arquivo do jogo precisa compilar sozinho (um erro de sintaxe num arquivo de interface
//    derruba o jogo inteiro ao abrir, e os testes do núcleo não passam por ele)
{
  const vmSyn = require('vm');
  order.forEach(m => { try { new vmSyn.Script(read(m), { filename: m + '.js' }); } catch (e) { errors.push(`erro de sintaxe em ${m}.js: ${e.message}`); } });
}

// 1. funções com o mesmo nome
const fnDefs = {};
order.forEach(m => read(m).split('\n').forEach((l, i) => { const r = l.match(/^function (\w+)\s*\(/); if (r) (fnDefs[r[1]] = fnDefs[r[1]] || []).push(`${m}.js:${i + 1}`); }));
Object.entries(fnDefs).forEach(([k, v]) => { if (v.length > 1) errors.push(`função ${k} definida ${v.length} vezes (${v.join(', ')}): a última apaga as outras`); });

// 2. telas e ações redefinidas por inteiro
const repl = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'replacements.json'), 'utf8'));
const allowed = new Set(Object.keys(repl.approved || {}));
const defs = {};
order.forEach(m => {
  const txt = read(m);
  txt.split('\n').forEach((l, i) => {
    const r = l.match(/^\s*(SCREENS|ACT|CHG)\.(\w+)\s*=(?!=)/); if (!r) return;
    const k = `${r[1]}.${r[2]}`;
    // é um embrulho se o mesmo arquivo guardou a versão anterior antes (const x = SCREENS.k / SCREENS.k.html / ACT.k)
    const before = txt.split('\n').slice(Math.max(0, i - 40), i).join('\n');
    const wraps = new RegExp(`=\\s*${r[1]}\\.${r[2]}(\\.html)?\\s*[;,)]|${r[1]}\\.${r[2]}\\.html\\s*;`).test(before) || /\b(old|prev|base|orig|h|o|f|st|nh|sv|dg|buy)\b\s*\(/.test(l) && new RegExp(`(const|let)\\s+\\w+\\s*=\\s*${r[1]}\\.${r[2]}`).test(before);
    (defs[k] = defs[k] || []).push({ at: `${m}.js:${i + 1}`, wraps });
  });
});
Object.entries(defs).forEach(([k, v]) => {
  if (v.length < 2) return;
  v.slice(1).forEach(d => { if (!d.wraps && !allowed.has(k)) errors.push(`${k} redefinida por inteiro em ${d.at} (antes em ${v[0].at}) sem guardar a anterior. Se a troca é intencional, registre em tests/replacements.json com o motivo e confira se nada da versão antiga se perdeu.`); });
});

// 7. (0.8.7) uma tela ou ação que embrulha a anterior (const old = SCREENS.x) precisa que a anterior exista antes dela
//    na ordem do build; senão o embrulho chama algo indefinido (foi o que quebrou a aba de gráfico da Classificação).
{
  const firstDef = {};
  Object.entries(defs).forEach(([k, v]) => { firstDef[k] = v[0].at; });
  const pos = (at) => { const [f, ln] = at.split('.js:'); return [order.indexOf(f), +ln]; };
  const before = (a, b) => (a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]));
  order.forEach(m => read(m).split('\n').forEach((l, i) => {
    const r = l.match(/^\s*const\s+\w+\s*=\s*(SCREENS|ACT|CHG)\.(\w+)\s*;/); if (!r) return;
    const k = `${r[1]}.${r[2]}`; const here = [order.indexOf(m), i + 1];
    if (!firstDef[k] || !before(pos(firstDef[k]), here)) errors.push(`${m}.js:${i + 1} guarda ${k}, que ainda não existe nesse ponto do build (o embrulho chamaria algo indefinido)`);
  }));
}

// 6. ganchos: o estilo antigo de embrulho (const old = Obj.f; Obj.f = ...) é proibido; e uma função do jogo
//    só pode ser redefinida por Hooks.base / Hooks.replace (com motivo), nunca por cima em silêncio.
const OBJ = 'Career|Events|Engine|RnD|Regs|Owners|Council|Market|Staff|Media|Social|Cats|AI|Sisters|Mfr|Fac|CarDev|Time|SL|Parts|Orders|People|Talks|Econ|Quali|Practice|Setup|RaceLog|Chaos|Identity|Contracts|Academy|Scouting|Talent|Potential|Silly|Narr|Kart|Disc|Circuits|Stories|RegCal|MarketPlus|Testing|DriverDB|Persons|Store';
const tempSwaps = new Set(repl.tempSwaps || []);
const firstDef = {};
order.forEach(m => {
  const lines = read(m).split('\n');
  lines.forEach((l, i) => {
    const w = l.match(new RegExp(`^\\s*const (\\w+) = ((?:${OBJ})\\.\\w+);`));
    if (w && lines.slice(i + 1, i + 8).some(x => new RegExp(`^\\s*${w[2].replace('.', '\\.')}\\s*=(?!=)`).test(x))) errors.push(`${m}.js:${i + 1}: embrulho no estilo antigo de ${w[2]} — use Hooks.around('${w[2].split('.')[0]}', ${w[2].split('.')[0]}, '${w[2].split('.')[1]}', 'nome', (next, ...) => ...)`);
    const a = l.match(new RegExp(`^(\\s*)((?:${OBJ})\\.[A-Za-z_]\\w*)\\s*=(?!=)\\s*(\\(|function|async|\\w+\\s*=>)`));
    if (!a) return;
    const k = a[2];
    if (firstDef[k] && !tempSwaps.has(`${m}.js:${k}`)) errors.push(`${m}.js:${i + 1}: ${k} redefinida por cima (primeira definição em ${firstDef[k]}) — use Hooks.base(...) ou Hooks.replace(...) com o motivo`);
    if (!firstDef[k]) firstDef[k] = `${m}.js:${i + 1}`;
  });
});

// 3. botões que chamam ações inexistentes
const noComments = (t) => t.split('\n').map(l => l.replace(/^\s*\/\/.*$/, '').replace(/\/\/\s[^`'"]*$/, '').replace(/;\s+\/\/.*$/, ';')).join('\n');
const uiSrc = noComments(ui.map(read).join('\n') + core.map(read).join('\n'));
const actDefs = new Set([...uiSrc.matchAll(/\bACT\.(\w+)\s*=(?!=)/g)].map(m => m[1]));
const chgDefs = new Set([...uiSrc.matchAll(/\b(?:CHG|INP)\.(\w+)\s*=(?!=)/g)].map(m => m[1]));
const used = new Set([...uiSrc.matchAll(/data-act="([A-Za-z0-9_]+)"/g)].map(m => m[1]));
used.forEach(a => { if (!actDefs.has(a)) errors.push(`botão chama data-act="${a}", mas ACT.${a} não existe`); });
const usedChg = new Set([...uiSrc.matchAll(/data-(?:chg|inp)="([A-Za-z0-9_]+)"/g)].map(m => m[1]));
usedChg.forEach(a => { if (!chgDefs.has(a)) warn.push(`campo chama data-chg/inp="${a}" sem CHG.${a}`); });

// 5. manifesto de funcionalidades
const manPath = path.join(root, 'tests', 'features.json');
if (fs.existsSync(manPath)) {
  const man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
  const allSrc = order.map(read).join('\n');
  (man.screens || []).forEach(s => { if (!new RegExp(`SCREENS\\.${s}\\s*=`).test(allSrc)) errors.push(`manifesto: a tela "${s}" sumiu`); });
  (man.actions || []).forEach(a => { if (!actDefs.has(a)) errors.push(`manifesto: a ação "${a}" sumiu`); });
  const uiAll = ui.map(read).join('\n');
  (man.panels || []).forEach(t => { if (!uiAll.includes(t)) errors.push(`manifesto: o painel "${t}" sumiu da interface`); });
  (man.functions || []).forEach(f => { const [o, k] = f.includes('.') ? f.split('.') : [null, f]; const re = o ? new RegExp(`\\b${o}\\.${k}\\s*=(?!=)`) : new RegExp(`function ${k}\\s*\\(`); if (!re.test(allSrc)) errors.push(`manifesto: a função "${f}" sumiu`); });
} else warn.push('tests/features.json não existe');

warn.forEach(w => console.log('  aviso:', w));
// 9. (0.9) determinismo: no núcleo, um sort com comparador que ignora os dois itens (ex.: sort(() => r() - 0.5))
//    dá resultado que depende do motor JavaScript (o V8 do Node 20 e o do Node 26 embaralham diferente).
//    Para embaralhar, use shuffleBy(lista, r) (util.js), que consome o RNG sempre na mesma ordem.
core.forEach(m => read(m).split('\n').forEach((l, i) => {
  if (/\.sort\(\s*(\(\s*\)\s*=>|function\s*\(\s*\))/.test(l)) errors.push(`${m}.js:${i + 1}: sort com comparador aleatório — o resultado depende do motor JavaScript; use shuffleBy(lista, r)`);
}));

// 10. (0.9, E12) embrulhos antigos de tela/ação (const old = SCREENS.x; SCREENS.x = ... / ACT.x / CHG.x) não podem
//     aumentar. A contagem por arquivo fica em tests/wraps.json (linha de base); a conversão dos que existem para
//     o registro de ganchos vem com as telas novas (Ondas 6 e 7). Código novo: Hooks.around('SCREENS', SCREENS, 'x', 'nome', (next, ...a) => ...).
//     Ao remover embrulhos, regrave a linha de base: node scripts/guard-check.js --wraps-write
const WRAP_RE = /=\s*(SCREENS|ACT|CHG)\.\w+(\.html)?\s*[;,)]/;
const wraps = {};
order.forEach(m => read(m).split('\n').forEach(l => { if (WRAP_RE.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l)) wraps[m] = (wraps[m] || 0) + 1; }));
const wrapTotal = Object.values(wraps).reduce((a, b) => a + b, 0);
const wrapsFile = path.join(root, 'tests', 'wraps.json');
if (process.argv.includes('--wraps-write')) {
  fs.writeFileSync(wrapsFile, JSON.stringify({ _leia: 'Linha de base dos embrulhos antigos de tela/ação (E12). O guard-check falha se algum arquivo passar destes números. Só regrave ao REMOVER embrulhos: node scripts/guard-check.js --wraps-write', total: wrapTotal, files: wraps }, null, 1) + '\n');
  console.log(`tests/wraps.json gravado: ${wrapTotal} embrulho(s) em ${Object.keys(wraps).length} arquivo(s)`);
} else if (!fs.existsSync(wrapsFile)) errors.push('tests/wraps.json não existe (linha de base dos embrulhos de tela; gere com --wraps-write)');
else {
  const baseW = JSON.parse(fs.readFileSync(wrapsFile, 'utf8'));
  Object.entries(wraps).forEach(([m, n]) => { const was = (baseW.files || {})[m] || 0; if (n > was) errors.push(`${m}.js: ${n - was} embrulho(s) novo(s) no estilo antigo (= SCREENS.x / ACT.x / CHG.x) — use Hooks.around('SCREENS', SCREENS, 'x', 'nome', (next, ...a) => ...)`); });
  if (wrapTotal < baseW.total) console.log(`  aviso: embrulhos antigos caíram de ${baseW.total} para ${wrapTotal}: regrave a linha de base (node scripts/guard-check.js --wraps-write)`);
}

if (errors.length) { console.log(`guard-check: ${errors.length} problema(s)`); errors.forEach(e => console.log('  ✗', e)); process.exit(1); }
console.log(`guard-check OK · ${order.length} módulos · ${Object.keys(fnDefs).length} funções · ${actDefs.size} ações · ${used.size} botões conferidos · ${wrapTotal} embrulhos antigos (nenhum novo)`);
