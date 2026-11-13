// npm test: roda as verificações em sequência, na mesma ordem de sempre, e para na primeira que falhar.
// (0.9) Antes era uma cadeia "node a && node b && ..." no package.json. O npm roda scripts pelo cmd.exe no Windows,
// e no Windows 11 build 26200 (cmd.exe 10.0.26100.9949) o cmd.exe trava, sem rodar nada, quando a linha tem 10 ou
// mais "&&" (9 passam; com parênteses também trava). Este executor em Node não depende do shell.
// O workflow-check falha se algum script do package.json voltar a ter 10 ou mais "&&".
// Uso: node scripts/test-all.js        (o mesmo que npm test)
'use strict';
const path = require('path');
const { spawnSync } = require('child_process');

const STEPS = [
  ['guard-check.js'],
  ['privacy-check.js'],
  ['workflow-check.js'],
  ['docs-check.js'],
  ['pack-check.js'],
  ['check-scope.js'],
  ['storage-check.js'],
  ['schema-check.js', '1'],
  ['rules-check.js'],
  ['lang-parity-check.js', '24'],
  ['sim-test.js', '10', '1'],
  ['sim-test.js', '4', '42'],
  ['cats-check.js', '1'],
];

const t0 = Date.now();
const times = [];
for (const [script, ...args] of STEPS) {
  const s = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, script), ...args], { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  const secs = Math.round((Date.now() - s) / 1000);
  times.push(`${script}${args.length ? ' ' + args.join(' ') : ''} ${secs}s`);
  if (r.status !== 0) {
    console.log(`\nnpm test: FALHOU em ${script} ${args.join(' ')} (código ${r.status === null ? r.signal : r.status})`);
    process.exit(r.status || 1);
  }
}
console.log(`\nnpm test OK · ${STEPS.length} verificações em ${Math.round((Date.now() - t0) / 1000)} s (${times.join(' · ')})`);
