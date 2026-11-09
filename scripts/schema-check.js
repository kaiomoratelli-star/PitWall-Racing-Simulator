// Esquema do save (app/src/core/base/schema.js): todo campo de primeiro nível de G precisa estar registrado,
// e o save tem de passar na conferência em carreiras longas (Manager e Observador) e nos saves reais de versões publicadas.
// Uso: node scripts/schema-check.js [temporadas=2]
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const root = path.join(__dirname, '..');
const { core, data } = require('./modules');
const SEASONS = +(process.argv[2] || 2);
const load = () => {
  const ctx = vm.createContext({ console, Math, JSON, Date, process });
  for (const m of [...data, ...core]) vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
  vm.runInContext('this.API = { Career, Events, Migrate, RNG, Schema, defaultDb, Owners }', ctx);
  return ctx.API;
};
let bad = 0;
const report = (where, r) => {
  const all = [...r.fatal.map(x => 'FATAL ' + x), ...r.errors, ...r.warnings];
  if (all.length) { bad++; console.log(`✗ ${where}`); all.slice(0, 10).forEach(x => console.log('    ' + x)); }
};
// 1. carreiras novas, conferidas a cada etapa
for (const [mode, team, seed] of [['manager', 'williams', 'sc-a'], ['manager', 'ferrari', 'sc-b'], ['observer', null, 'sc-c']]) {
  const { Career, Events, Schema, defaultDb, Owners } = load();
  const G = Career.create(defaultDb(), { mode, teamId: team, name: 'T', seed });
  if (G.teamSetup && G.teamSetup.pending) Owners.autoSetup(G);
  report(`${mode} ${seed} ao criar`, Schema.check(G));
  const y0 = G.season.year; let n = 0;
  while (G.season.year < y0 + SEASONS) {
    if (Career.seasonOver(G)) { Career.endSeason(G); report(`${mode} ${seed} virada ${G.season.year}`, Schema.check(G)); continue; }
    Career.startWeekend(G); report(`${mode} ${seed} ${G.season.year} etapa ${G.season.round + 1} (fim de semana aberto)`, Schema.check(G));
    Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G); Career.simRaceToEnd(G); Career.finishWeekend(G);
    G.inbox.forEach(m => { if (m.choices && m.resolved == null) Events.resolve(G, m.id, n % m.choices.length); });
    report(`${mode} ${seed} ${G.season.year} etapa ${G.season.round}`, Schema.check(G)); n++;
  }
  // o save gravado e relido continua válido, e repair não muda um save saudável
  const again = JSON.parse(JSON.stringify(G)); const fixed = Schema.repair(again);
  if (fixed.length) { bad++; console.log(`✗ ${mode} ${seed}: repair mexeu num save saudável (${fixed.join(', ')})`); }
  console.log(`${mode} ${seed}: ${n} etapas, ${Object.keys(G).length} campos, conferido a cada etapa`);
}
// 2. saves reais de versões publicadas, depois da migração
const dir = path.join(root, 'tests', 'saves');
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.json.gz')).sort()) {
  const { Migrate, Schema } = load();
  const G = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f))).toString('utf8'));
  Migrate.run(G); report(f, Schema.check(G));
  console.log(`${f}: conferido`);
}
// 3. saves estragados são reconhecidos (e não passam como bons)
{
  const { Career, Schema, defaultDb } = load();
  const G = Career.create(defaultDb(), { mode: 'manager', teamId: 'haas', name: 'T', seed: 'sc-x' });
  const cases = [
    ['sem db', g => { delete g.db; }, 'fatal'], ['sem temporada', g => { delete g.season; }, 'fatal'],
    ['equipe do jogador sumiu', g => { g.player.teamId = 'nada'; }, 'fatal'], ['versão do futuro', g => { g.version = 99; }, 'fatal'],
    ['caixa NaN', g => { g.finances.balance = NaN; }, 'errors'], ['piloto repetido', g => { g.db.drivers.push(JSON.parse(JSON.stringify(g.db.drivers[0]))); }, 'errors'],
    ['campo sem registro', g => { g.campoNovo = 1; }, 'warnings'], ['etapa fora do calendário', g => { g.season.round = 99; }, 'errors'],
  ];
  cases.forEach(([name, fn, kind]) => { const g = JSON.parse(JSON.stringify(G)); fn(g); const r = Schema.check(g); if (!r[kind].length) { bad++; console.log(`✗ save estragado não reconhecido: ${name}`); } });
  const g = JSON.parse(JSON.stringify(G)); delete g.inbox; delete g.news; const fx = Schema.repair(g);
  if (!(fx.includes('inbox') && fx.includes('news') && Array.isArray(g.inbox) && !Schema.check(g).errors.length)) { bad++; console.log('✗ repair não refez as listas que faltavam'); }
  console.log(`saves estragados: ${cases.length} casos reconhecidos`);
}
console.log(bad ? `esquema: ${bad} problema(s)` : 'esquema: OK');
process.exit(bad ? 1 : 0);
