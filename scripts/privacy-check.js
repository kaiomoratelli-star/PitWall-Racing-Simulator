// Privacidade (0.9, E46): nenhum endereço de e-mail pode ir para o jogo distribuído.
// Gera o build e procura e-mails em app/dist/index.html e app/dist/packs/*.js (instalador) e dist-web/pitwall.html (versão web).
// Nomes de arquivo de imagem com "@" (ex.: logo@4x.png, piloto@equipe.webp) não são e-mails.
// Uso: node scripts/privacy-check.js
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
execFileSync(process.execPath, [path.join(__dirname, 'build.js')], { cwd: root, stdio: 'ignore' });
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const IMG = /\.(png|webp|jpe?g|gif|svg|avif|ico|bmp)$/i;
const bad = [];
// (0.9, Onda 3) os dados reais saíram do index.html para o Pacote de dados (app/dist/packs/*.js): também vai no instalador
const packDir = path.join(root, 'app', 'dist', 'packs');
const packs = fs.existsSync(packDir) ? fs.readdirSync(packDir).filter(f => f.endsWith('.js')).map(f => 'app/dist/packs/' + f) : [];
if (!packs.length) bad.push('o build não gerou o Pacote de dados em app/dist/packs (nada para conferir)');
for (const rel of ['app/dist/index.html', 'dist-web/pitwall.html', ...packs]) {
  const f = path.join(root, rel);
  if (!fs.existsSync(f)) { bad.push(`${rel} não foi gerado`); continue; }
  const found = [...new Set((fs.readFileSync(f, 'utf8').match(EMAIL) || []).filter(m => !IMG.test(m)))];
  found.forEach(m => bad.push(`${rel}: endereço de e-mail no build (${m.replace(/^(.).*(@.*)$/, '$1…$2')})`));
}
if (bad.length) { console.log(`privacy-check: ${bad.length} problema(s)`); bad.forEach(b => console.log('  ✗', b)); process.exit(1); }
console.log(`privacy-check OK · nenhum e-mail no build do desktop, no Pacote de dados (${packs.length}) nem no web`);
