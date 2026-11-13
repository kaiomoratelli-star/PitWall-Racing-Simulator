// Documentos que não podem ficar para trás (0.9, E33 e E26). Roda no npm test.
// - README e ficha docs/marketing/3-SOBRE-O-JOGO.md citam a versão do package.json em negrito ou por extenso;
// - a ficha não promete o que o jogo não é: nada de "oficial da F1", "licenciado" nem a palavra "IA" (regras 1 e 8).
// Uso: node scripts/docs-check.js
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const v = pkg.version;
const bad = [];
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
if (!readme.includes(`**${v}**`)) bad.push(`README.md não cita a versão do package.json (**${v}**)`);
const ficha = fs.readFileSync(path.join(root, 'docs', 'marketing', '3-SOBRE-O-JOGO.md'), 'utf8');
if (!ficha.includes(v)) bad.push(`3-SOBRE-O-JOGO.md não cita a versão ${v}`);
[[/\bIA\b/, 'a palavra "IA"'], [/oficial da (F1|Fórmula 1)|formato oficial/i, '"oficial da F1"'], [/licenciad/i, '"licenciado"']]
  .forEach(([re, what]) => { if (re.test(ficha)) bad.push(`3-SOBRE-O-JOGO.md usa ${what}`); });
if (bad.length) { console.log(`docs-check: ${bad.length} problema(s)`); bad.forEach(b => console.log('  ✗', b)); process.exit(1); }
console.log(`docs-check OK · README e ficha na versão ${v}`);
