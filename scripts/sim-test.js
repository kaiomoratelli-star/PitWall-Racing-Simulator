// Teste de simulação prolongada sem interface.
// Uso: node scripts/sim-test.js [temporadas=10] [semente=1] [modo=both|manager|observer]
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { core, data } = require('./modules');
const ctx = vm.createContext({ console, Math, JSON, Date, process });
for (const m of [...data, ...core]) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
vm.runInContext('this.API = { Career, Events, Diag, Migrate, RNG, Engine, buildDefaultDB: (process.env.FICTIONAL ? buildDefaultDB : defaultDb), driverOverall, SAVE_VERSION }', ctx);
const { Career, Events, Diag, Migrate, buildDefaultDB, SAVE_VERSION } = ctx.API;

const seasons = +(process.argv[2] || 10);
const seed = process.argv[3] || '1';
const modes = (process.argv[4] || 'both') === 'both' ? ['manager', 'observer'] : [process.argv[4]];
let failures = 0;

for (const mode of modes) {
  const t0 = Date.now();
  const G = Career.create(buildDefaultDB(), { mode, teamId: process.env.FICTIONAL ? 'bravura' : 'williams', name: 'Teste', seed });
  const champs = {};
  for (let s = 0; s < seasons; s++) {
    const ts = Date.now();
    while (!Career.seasonOver(G)) {
      Career.startWeekend(G); Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G); Career.simRaceToEnd(G);
      Career.finishWeekend(G);
      G.inbox.forEach(m => { if (m.choices && m.resolved == null) Events.resolve(G, m.id, [...String(m.id) + seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % m.choices.length); });
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
  // save da V0.3 (sem outras categorias): a migração cria as categorias e o jogo segue
  const v3 = JSON.parse(JSON.stringify(G)); v3.version = 3; delete v3.cats; delete v3.options.categories; delete v3.social;
  v3.db.drivers = v3.db.drivers.filter(d => !d.id.startsWith('c-')); v3.db.drivers.forEach(d => { delete d.cat; });
  try {
    Migrate.run(v3);
    if (!v3.cats || !v3.cats.byId.f2 || !v3.cats.byId.f2.entries.length) throw new Error('categorias não criadas');
    if (!Career.seasonOver(v3)) { Career.startWeekend(v3); Career.finishPractice(v3); Career.runQualifying(v3); Career.startRace(v3); Career.simRaceToEnd(v3); Career.finishWeekend(v3); }
    const dg = Diag.run(v3);
    if (dg.errors.length) throw new Error(dg.errors.join('; '));
    console.log(`[${mode}] migração v3→v${v3.version} ok (${v3.cats.order.length} categorias)`);
  } catch (e) { console.log('ERRO migração v3', e.message); failures++; }
  // save da 0.6 (v4) no meio de um fim de semana no formato antigo: sem treino com relógio,
  // Conselho, equipes irmãs nem registro de pit stops
  const v4 = JSON.parse(JSON.stringify(G)); v4.version = 4;
  delete v4.council; delete v4.sisters; v4.db.teams.forEach(t => { if (t.identityYear) { const h = t.identityHistory[t.identityHistory.length - 1]; Object.assign(t, { name: h.name, fullName: h.fullName, sponsors: h.sponsors }); delete t.identityYear; delete t.titleSponsor; t.identityHistory = []; } }); delete v4.sisterInfo; delete v4.options.practiceFormat; if (v4.lastRace) delete v4.lastRace.pitLog;
  try {
    if (!Career.seasonOver(v4)) { Career.startWeekend(v4); delete v4.weekend.fp; delete v4.weekend.setups; }
    Migrate.run(v4);
    if (!v4.sisters || !v4.council) throw new Error('Conselho ou equipes irmãs não criados');
    if (v4.weekend && !v4.weekend.fp) throw new Error('fim de semana não convertido');
    if (!Career.seasonOver(v4)) { Career.finishPractice(v4); Career.runQualifying(v4); Career.startRace(v4); Career.simRaceToEnd(v4); Career.finishWeekend(v4); }
    const dg = Diag.run(v4);
    if (dg.errors.length) throw new Error(dg.errors.join('; '));
    const alp = v4.db.teams.find(t => t.id === 'alpine');
    if (alp && v4.season.year >= 2027 && alp.titleSponsor !== 'Gucci') throw new Error('identidade 2027 da Alpine não aplicada');
    console.log(`[${mode}] migração v4→v${v4.version} ok (fim de semana convertido, Conselho, equipes irmãs, identidade ${alp ? alp.name : '-'})`);
  } catch (e) { console.log('ERRO migração v4', e.message); failures++; }
}
if (failures) { console.log(`FALHOU: ${failures} problema(s)`); process.exit(1); }
console.log('OK');
