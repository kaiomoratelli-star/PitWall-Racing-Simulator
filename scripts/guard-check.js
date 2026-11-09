// Guarda contra funcionalidades que somem sem ninguém perceber. Roda no `npm test` e no CI do Windows.
// Falha quando:
//   1. duas funções com o mesmo nome existem no jogo (a de baixo apaga a de cima em silêncio);
//   2. uma tela (SCREENS.x) ou ação (ACT.x / CHG.x) é redefinida por inteiro sem guardar a anterior
//      e sem estar registrada em tests/replacements.json (troca aprovada, com o motivo);
//   3. um botão chama uma ação que não existe (data-act="x" sem ACT.x);
//   4. um arquivo de app/src não está no build, ou o build cita um arquivo que não existe;
//   5. o manifesto de funcionalidades (tests/features.json) cita uma tela, ação ou função que não existe mais.
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
const files = fs.readdirSync(SRC).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));
const listed = new Set([...order, ...data.map(d => d)]);
files.forEach(f => { if (!listed.has(f) && !['head'].includes(f)) errors.push(`app/src/${f}.js não está em scripts/modules.js (nunca entra no jogo)`); });
order.forEach(m => { if (!fs.existsSync(path.join(SRC, m + '.js'))) errors.push(`scripts/modules.js cita ${m}.js, que não existe`); });

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
if (errors.length) { console.log(`guard-check: ${errors.length} problema(s)`); errors.forEach(e => console.log('  ✗', e)); process.exit(1); }
console.log(`guard-check OK · ${order.length} módulos · ${Object.keys(fnDefs).length} funções · ${actDefs.size} ações · ${used.size} botões conferidos`);
