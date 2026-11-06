// Teste de simulação prolongada sem interface.
// Uso: node scripts/sim-test.js [temporadas=10] [semente=1] [modo=both|manager|observer]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { core } = require('./modules');
const ctx = vm.createContext({ console, Math, JSON, Date });
for (const m of core) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
vm.runInContext('this.API = { Career, Events, Diag, Migrate, RNG, Engine, buildDefaultDB, driverOverall, SAVE_VERSION }', ctx);
const { Career, Events, Diag, Migrate, buildDefaultDB, SAVE_VERSION } = ctx.API;

const seasons = +(process.argv[2] || 10);
const seed = process.argv[3] || '1';
const modes = (process.argv[4] || 'both') === 'both' ? ['manager', 'observer'] : [process.argv[4]];
let failures = 0;

for (const mode of modes) {
  const t0 = Date.now();
  const G = Career.create(buildDefaultDB(), { mode, teamId: 'bravura', name: 'Teste', seed });
  const champs = {};
  for (let s = 0; s < seasons; s++) {
    const ts = Date.now();
    while (!Career.seasonOver(G)) {
      Career.startWeekend(G); Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G); Career.simRaceToEnd(G);
      Career.finishWeekend(G);
      G.inbox.forEach(m => { if (m.choices && m.resolved == null) Events.resolve(G, m.id, Math.floor(Math.random() * m.choices.length)); });
    }
    const d = Diag.run(G);
    const sum = Career.endSeason(G);
    champs[sum.constructorName] = (champs[sum.constructorName] || 0) + 1;
    // round-trip de save a cada temporada
    const copy = JSON.parse(JSON.stringify(G));
    if (copy.version !== SAVE_VERSION) { console.log('ERRO versão do save'); failures++; }
    const d2 = Diag.run(G);
    const cash = G.db.teams.map(t => t.cash.toFixed(0)).join(',');
    const cars = G.db.teams.map(t => t.short + ':' + ctx.API.Engine.carRating(G.db, t).toFixed(1)).join(' ');
    const seats = G.db.teams.every(t => Career.lineup(G, t.id).length === 2);
    console.log(`[${mode}] ${sum.year} campeão ${sum.championName} / ${sum.constructorName} | erros ${d.errors.length}+${d2.errors.length} avisos ${d.warns.length} | assentos ok ${seats} | save ${(d2.stats.size / 1024).toFixed(0)}KB | log ${d2.stats.log} | ${Date.now() - ts}ms | caixa [${cash}]\n      carros ${cars}`);
    [...d.errors, ...d2.errors].forEach(e => { console.log('   ERRO:', e); failures++; });
    if (s === seasons - 1) d2.warns.slice(0, 5).forEach(w => console.log('   aviso:', w));
  }
  console.log(`[${mode}] títulos de construtores:`, JSON.stringify(champs), `| total ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  // migração: simula save v1 e atualiza
  const old = JSON.parse(JSON.stringify(G)); old.version = 1; delete old.log; delete old.archive;
  try { Migrate.run(old); console.log(`[${mode}] migração v1→v${old.version} ok`); } catch (e) { console.log('ERRO migração', e.message); failures++; }
}
if (failures) { console.log(`FALHOU: ${failures} problema(s)`); process.exit(1); }
console.log('OK');
