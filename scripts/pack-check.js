// Pacote de dados (0.9, Onda 3): o pacote real gerado de app/data passa no Pack.check, e pacotes
// inválidos são recusados SEM mudar nada (nenhuma variável publicada, Pack.installed continua vazio).
// A equivalência (mesmas assinaturas com o pacote) é conferida por: node scripts/determinism-check.js --pack
// Uso: node scripts/pack-check.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const { buildPack } = require('./make-data-pack');
const real = buildPack();
const fresh = () => {
  const ctx = vm.createContext({ console, Math, JSON, Date });
  for (const m of ['core/base/util', 'core/base/pack']) vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
  return ctx;
};
const clone = (o) => JSON.parse(JSON.stringify(o));
const bad = [];

// 1) o pacote real é válido e instala
{
  const ctx = fresh(); ctx.__p = JSON.stringify(real);
  const r = vm.runInContext('Pack.install(JSON.parse(__p))', ctx);
  if (!r.ok) bad.push('pacote real recusado: ' + r.errors.join('; '));
  else if (vm.runInContext('typeof REAL_DB === "undefined" || REAL_DB.teams.length === 0', ctx)) bad.push('pacote real instalado, mas REAL_DB não ficou disponível');
}

// 2) pacotes inválidos: recusados e nada muda
const cases = [
  ['não é um objeto', () => 'texto'],
  ['formato errado', p => { p.format = 'outro'; return p; }],
  ['versão mais nova que o jogo', p => { p.version = 99; return p; }],
  ['sem identificador', p => { delete p.id; return p; }],
  ['conteúdo desconhecido', p => { p.content.CODIGO = 'alert(1)'; return p; }],
  ['tipo errado', p => { p.content.REAL_CATS = []; return p; }],
  ['sem REAL_DB', p => { delete p.content.REAL_DB; return p; }],
  ['equipes vazias', p => { p.content.REAL_DB.teams = []; return p; }],
  ['piloto repetido', p => { p.content.REAL_DB.drivers.push(clone(p.content.REAL_DB.drivers[0])); return p; }],
  ['piloto em equipe inexistente', p => { p.content.REAL_DB.drivers[0].team = 'equipe-que-nao-existe'; return p; }],
];
for (const [name, mut] of cases) {
  const ctx = fresh();
  ctx.__p = JSON.stringify(mut(clone(real)));
  const r = vm.runInContext('Pack.install(JSON.parse(__p))', ctx);
  const leaked = vm.runInContext('Object.keys(Pack.GLOBALS).filter(k => typeof globalThis[k] !== "undefined")', ctx);
  const inst = vm.runInContext('Pack.installed', ctx);
  if (r.ok) bad.push(`${name}: foi aceito`);
  if (leaked.length || inst) bad.push(`${name}: recusado, mas mudou o estado (${leaked.join(', ') || 'Pack.installed'})`);
}

if (bad.length) { console.log(`pack-check: ${bad.length} problema(s)`); bad.forEach(b => console.log('  ✗', b)); process.exit(1); }
console.log(`pack-check OK · pacote real válido (${Object.keys(real.content).length} conjuntos) · ${cases.length} pacotes inválidos recusados sem mudar nada`);
