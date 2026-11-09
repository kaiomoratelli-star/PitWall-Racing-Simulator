// Compatibilidade de saves: abre os saves REAIS de versões publicadas (tests/saves/*.json.gz) na versão atual,
// passa pela mesma migração do jogo (Migrate.run) e continua jogando uma temporada inteira como Manager,
// conferindo a integridade dos dados a cada etapa. Falha se algo quebrar ou ficar incoerente.
// Uso: node scripts/save-compat-check.js [etapas=26]
const fs = require('fs'), path = require('path'), vm = require('vm'), zlib = require('zlib');
const root = path.join(__dirname, '..');
const { core, data } = require('./modules');
const ROUNDS = +(process.argv[2] || 26);
const dir = path.join(root, 'tests', 'saves');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json.gz')).sort() : [];
if (!files.length) { console.log('sem saves em tests/saves'); process.exit(1); }
const load = () => {
  const ctx = vm.createContext({ console, Math, JSON, Date, process });
  for (const m of [...data, ...core]) vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
  vm.runInContext('this.API = { Career, Events, Migrate, RNG, Talks: typeof Talks !== "undefined" ? Talks : null, Parts: typeof Parts !== "undefined" ? Parts : null, SL: typeof SL !== "undefined" ? SL : null, People: typeof People !== "undefined" ? People : null, Schema: typeof Schema !== "undefined" ? Schema : null }', ctx);
  return ctx.API;
};
const finite = (x) => typeof x === 'number' && isFinite(x);
function check(API, G, where, fail) {
  const { Career } = API;
  G.db.teams.forEach(t => {
    const race = G.db.drivers.filter(d => d.team === t.id && d.seat !== 'R' && !d.retired);
    if (race.length !== 2) fail(`${where}: ${t.name} com ${race.length} titulares`);
    Object.entries(t.car || {}).forEach(([k, v]) => { if (typeof v === 'number' && !finite(v)) fail(`${where}: carro ${t.id}.${k}=${v}`); });
    const lu = Career.lineup(G, t.id); if (new Set(lu.map(d => d.id)).size !== lu.length) fail(`${where}: ${t.name} com o mesmo piloto nos dois carros`);
  });
  ['balance', 'spent'].forEach(k => { if (!finite(G.finances[k])) fail(`${where}: finanças.${k}=${G.finances[k]}`); });
  const s = G.season; const tot = {};
  s.results.forEach(r => { r.cls.forEach(x => (tot[x.did] = (tot[x.did] || 0) + x.pts)); (r.sprint || []).forEach(x => (tot[x.did] = (tot[x.did] || 0) + x.pts)); (r.bonus || []).forEach(x => (tot[x.did] = (tot[x.did] || 0) + x.pts)); });
  Object.entries(s.standD).forEach(([did, p]) => { if (Math.abs((tot[did] || 0) - p) > 0.01) fail(`${where}: pontos de ${did} ${p} ≠ ${tot[did] || 0}`); });
  G.db.drivers.forEach(d => { if (d.morale != null && !finite(d.morale)) fail(`${where}: moral de ${d.id}`); });
}
let failed = 0;
for (const f of files) {
  const API = load(); const { Career, Events, Migrate, RNG, Talks, Parts, SL } = API;
  const fails = []; const fail = (m) => { if (fails.length < 15) fails.push(m); };
  let G;
  try {
    G = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f))).toString('utf8'));
    const from = `${G.season.year} etapa ${G.season.round}${G.weekend ? ' (meio da corrida)' : ''}`;
    const steps = Migrate.run(G); RNG.state = G.rngState || G.seed;
    // continua a corrida em andamento, se houver
    if (G.weekend && G.weekend.race && !G.weekend.race.finished) { Career.simRaceToEnd(G); Career.finishWeekend(G); }
    else if (G.weekend) { G.weekend = null; }
    check(API, G, 'depois de carregar', fail);
    let played = 0;
    while (played < ROUNDS) {
      if (Career.seasonOver(G)) { Career.endSeason(G); check(API, G, `virada para ${G.season.year}`, fail); }
      const r = G.season.round;
      Career.startWeekend(G); Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G); Career.simRaceToEnd(G); Career.finishWeekend(G);
      if (Talks) Career.teamDrivers(G, G.player.teamId).filter(d => d.seat !== 'R').forEach(d => { const t = Talks.start(G, d.id); if (t && t.opts.length) Talks.answer(G, d.id, t.topic, t.opts[r % t.opts.length].k); });
      G.inbox.forEach(m => { if (m.choices && m.resolved == null) Events.resolve(G, m.id, r % m.choices.length); });
      if (Parts && r % 5 === 2) { const d = Career.lineup(G, G.player.teamId)[0]; Parts.pu(G, d); }
      check(API, G, `${G.season.year} etapa ${r + 1}`, fail); played++;
    }
    // o save continua salvável e relível
    const again = JSON.parse(JSON.stringify(G)); Migrate.run(again);
    console.log(`${f}: de ${from} → ${G.season.year} etapa ${G.season.round}${steps.length ? ' · migração ' + steps.join(', ') : ''} · ${played} etapas jogadas · ${fails.length ? 'FALHOU' : 'OK'}`);
  } catch (e) { fail(`${f}: ${e.message} ${String(e.stack).split('\n')[1] || ''}`); console.log(`${f}: ERRO`); }
  if (fails.length) { failed++; fails.forEach(x => console.log('   ✗', x)); }
}
console.log(failed ? `saves: ${failed} com problema` : `saves: todos os ${files.length} OK`);
process.exit(failed ? 1 : 0);
