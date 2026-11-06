// Compara os elencos de F1 de 2027 do jogo (início da carreira) com a lista anunciada na base
// de pilotos (DRIVER_DB, fonte Wikipedia, status "anunciado"). Gera docs/VERIFICACAO-2027.md.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { core, data } = require('./modules');
const ctx = vm.createContext({ console, Math, JSON, Date, process });
for (const m of [...data, ...core]) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m });
vm.runInContext('this.API = { Career, defaultDb, DRIVER_DB, DriverDB }', ctx);
const { Career, defaultDb, DRIVER_DB, DriverDB } = ctx.API;
const G = Career.create(defaultDb(), { mode: 'observer', seed: 'check' });
const ann = DRIVER_DB.drivers.filter(p => p.seasons.some(s => s.y === 2027 && s.s === 'f1')).map(p => ({ p, s: p.seasons.find(s => s.y === 2027 && s.s === 'f1') }));
const rows = [];
let ok = 0;
G.db.teams.forEach(t => {
  const ds = Career.lineup(G, t.id);
  ds.forEach(d => {
    const a = ann.find(x => x.p.uid === d.uid);
    const st = a ? 'confirmado na lista anunciada' : 'sem anúncio para 2027 na fonte';
    if (a) ok++;
    rows.push(`| ${t.name} | ${d.name} | ${st}${a ? ` (${a.s.team})` : ''} |`);
  });
});
const inGame = new Set(G.db.teams.flatMap(t => Career.lineup(G, t.id).map(d => d.uid)));
const missing = ann.filter(x => !inGame.has(x.p.uid)).map(x => `- ${x.p.name}: anunciado na ${x.s.team}, mas fora do grid inicial do jogo`);
const md = `# Verificação dos elencos de F1 2027\n\nGerado por \`scripts/check-2027.js\` em ${new Date().toISOString().slice(0, 10)}. Fonte da lista anunciada: ${DRIVER_DB.meta.source}, verificada em ${DRIVER_DB.meta.verified}. Status "anunciado" = lista provisória da fonte; rumores não entram.\n\n**${ok} de ${rows.length} titulares do jogo constam da lista anunciada de 2027.**\n\n| Equipe | Piloto no jogo | Situação |\n|---|---|---|\n${rows.join('\n')}\n\n## Anunciados que não estão no grid inicial\n${missing.join('\n') || '- nenhum'}\n`;
fs.writeFileSync(path.join(__dirname, '..', 'docs', 'VERIFICACAO-2027.md'), md);
console.log(`${ok}/${rows.length} titulares conferem com a lista anunciada; ${missing.length} anunciados fora do grid`);
missing.forEach(m => console.log(m));
