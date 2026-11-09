// Gera tests/features.json: a lista oficial do que o jogo TEM (telas, ações, funções públicas do motor
// e títulos de painéis). O guard-check (npm test) falha se qualquer item dessa lista sumir.
//
// Quando rodar: só ao ACRESCENTAR algo novo (para proteger também o novo) ou ao REMOVER algo de propósito.
// Remoção de propósito: rode, confira o diff de tests/features.json no commit e explique o motivo na mensagem.
// Uso: node scripts/features-snapshot.js            (mostra o que mudaria)
//      node scripts/features-snapshot.js --write    (grava)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const SRC = path.join(root, 'app', 'src');
const { core, ui } = require('./modules');
const read = (m) => fs.readFileSync(path.join(SRC, m + '.js'), 'utf8');
const coreSrc = core.map(read).join('\n'), uiSrc = ui.map(read).join('\n');
const uniq = (a) => [...new Set(a)].sort();
const out = {
  _leia: 'Lista oficial do que o jogo tem. Gerada por scripts/features-snapshot.js e conferida pelo guard-check no npm test. Um item só sai daqui de propósito, com o motivo no commit.',
  screens: uniq([...uiSrc.matchAll(/\bSCREENS\.(\w+)\s*=\s*\{/g)].map(m => m[1])),
  actions: uniq([...uiSrc.matchAll(/\bACT\.(\w+)\s*=(?!=)/g)].map(m => m[1])),
  functions: uniq([...coreSrc.matchAll(/^([A-Z][A-Za-z0-9]*\.[A-Za-z0-9_]+)\s*=(?!=)/gm)].map(m => m[1]).concat([...coreSrc.matchAll(/^function (\w+)\s*\(/gm)].map(m => m[1]))),
  panels: uniq([...uiSrc.matchAll(/K85\.card\(\{\s*t:\s*byLang\('((?:[^'\\]|\\.)+)'/g), ...uiSrc.matchAll(/<h3>([A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç][^<$`{]{2,60})<\/h3>/g)].map(m => m[1])),
};
const file = path.join(root, 'tests', 'features.json');
const old = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
['screens', 'actions', 'functions', 'panels'].forEach(k => {
  const a = new Set(old[k] || []), b = new Set(out[k]);
  const add = [...b].filter(x => !a.has(x)), rem = [...a].filter(x => !b.has(x));
  console.log(`${k}: ${out[k].length}${add.length ? ` · novos ${add.length}` : ''}${rem.length ? ` · REMOVIDOS ${rem.length}: ${rem.slice(0, 12).join(', ')}` : ''}`);
});
if (process.argv.includes('--write')) { fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n'); console.log('gravado em tests/features.json'); }
