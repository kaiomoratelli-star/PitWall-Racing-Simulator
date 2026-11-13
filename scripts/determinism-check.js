// Rede de segurança para refatorações: joga carreiras com semente fixa (Observador e Manager, com cartas,
// conversas e ordens) e calcula a assinatura (hash) do estado inteiro do jogo no fim.
// Uma refatoração que não deveria mudar nada para o jogador precisa reproduzir EXATAMENTE as mesmas assinaturas.
// Uso: node scripts/determinism-check.js            (compara com tests/determinism.json)
//      node scripts/determinism-check.js --write    (grava a referência; só depois de uma mudança de jogo aprovada)
//      node scripts/determinism-check.js --pack     (0.9: núcleo SEM app/data + Pacote de dados real instalado;
//                                                    tem de dar as mesmas assinaturas, prova de que o pacote é equivalente)
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const root = path.join(__dirname, '..');
const { core, data } = require('./modules');
const usePack = process.argv.includes('--pack');
const packJson = usePack ? JSON.stringify(require('./make-data-pack').buildPack()) : null;
const CONFIGS = [
  { id: 'obs-a', mode: 'observer', seed: 'det-a', seasons: 3 },
  { id: 'obs-b', mode: 'observer', seed: 'det-b', seasons: 2 },
  { id: 'mgr-mclaren', mode: 'manager', team: 'mclaren', seed: 'det-m', seasons: 2 },
  { id: 'mgr-haas', mode: 'manager', team: 'haas', seed: 'det-h', seasons: 2 },
];
function load() {
  const ctx = vm.createContext({ console, Math, JSON, Date, process });
  for (const m of [...(usePack ? [] : data), ...core]) vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
  if (usePack) {
    ctx.__packJson = packJson;
    const r = vm.runInContext('Pack.install(JSON.parse(__packJson))', ctx);
    if (!r.ok) throw new Error('pacote recusado: ' + r.errors.join('; '));
  }
  vm.runInContext('this.API = { Career, Events, defaultDb, Owners: typeof Owners !== "undefined" ? Owners : null, Talks: typeof Talks !== "undefined" ? Talks : null, Orders: typeof Orders !== "undefined" ? Orders : null }', ctx);
  return ctx.API;
}
function run(cfg) {
  const { Career, Events, defaultDb, Owners, Talks, Orders } = load();
  const G = Career.create(defaultDb(), { mode: cfg.mode, teamId: cfg.team, name: 'Teste', seed: cfg.seed });
  if (G.teamSetup && G.teamSetup.pending && Owners && Owners.autoSetup) Owners.autoSetup(G);
  for (let s = 0; s < cfg.seasons; s++) {
    while (!Career.seasonOver(G)) {
      const r = G.season.round;
      Career.startWeekend(G); Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G);
      const race = G.weekend.race; let lap = 0;
      while (!race.finished && lap++ < 400) {
        Career.stepRace(G);
        if (cfg.mode === 'manager' && lap === 15) { const mine = race.cars.filter(c => c.tid === G.player.teamId && c.status === 'run'); if (mine[0]) { mine[0].orders = mine[0].orders || {}; mine[0].orders.letBy = true; } }
      }
      Career.finishWeekend(G);
      if (cfg.mode === 'manager') {
        if (Talks) Career.teamDrivers(G, G.player.teamId).filter(d => d.seat !== 'R').forEach(d => { const t = Talks.start(G, d.id); if (t && t.opts.length) Talks.answer(G, d.id, t.topic, t.opts[r % t.opts.length].k); });
        G.inbox.forEach(m => { if (m.choices && m.resolved == null) Events.resolve(G, m.id, r % m.choices.length); });
        if (Orders && r === 4) Orders.setNo1(G, Career.lineup(G, G.player.teamId)[0].id);
      }
    }
    Career.endSeason(G);
  }
  // horários e o Pacote de origem (G.pack, metadado do save) não entram na assinatura; o mundo (G.db) entra inteiro
  const json = JSON.stringify(G, function (k, v) { return k === 'createdAt' || k === 'savedAt' || (this === G && k === 'pack') ? undefined : v; });
  return { hash: crypto.createHash('sha256').update(json).digest('hex').slice(0, 16), kb: Math.round(json.length / 1024), champ: (G.history || []).map(h => h.champion || h.driverChampion || '').join(',').slice(0, 80) };
}
const file = path.join(root, 'tests', 'determinism.json');
const ref = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
const out = {}; let bad = 0;
for (const cfg of CONFIGS) {
  const t0 = Date.now(); const r = run(cfg); out[cfg.id] = r;
  const same = ref[cfg.id] && ref[cfg.id].hash === r.hash;
  if (ref[cfg.id] && !same) bad++;
  console.log(`${cfg.id}: ${r.hash} · ${r.kb} KB · ${((Date.now() - t0) / 1000).toFixed(0)} s${ref[cfg.id] ? (same ? ' · igual à referência' : ` · DIFERENTE (referência ${ref[cfg.id].hash})`) : ' · sem referência'}`);
}
if (process.argv.includes('--write')) { fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n'); console.log('referência gravada em tests/determinism.json'); }
else if (bad) { console.log(`DETERMINISMO: ${bad} configuração(ões) mudaram`); process.exit(1); }
else console.log('determinismo OK');
