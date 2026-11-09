// Idioma não muda o jogo (0.8.7): a mesma carreira (mesma semente) em português e em inglês tem de dar
// exatamente os mesmos resultados, pontos, dinheiro e sorteio; só o texto muda. Pega tradução que sorteia,
// que chama a função errada ou que avalia algo com efeito colateral duas vezes.
// Uso: node scripts/lang-parity-check.js [etapas=30]
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const { core, data } = require('./modules');
const ROUNDS = +(process.argv[2] || 30);
const run = (lang, team, seed) => {
  const ctx = vm.createContext({ console, Math, JSON, Date, process });
  for (const m of [...data, ...core]) vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
  vm.runInContext(`LANG = ${JSON.stringify(lang)}; applyLang(${JSON.stringify(lang)}); this.API = { Career, Events, RNG, defaultDb, Owners, Talks: typeof Talks !== 'undefined' ? Talks : null }`, ctx);
  const { Career, Events, RNG, defaultDb, Owners, Talks } = ctx.API;
  const G = Career.create(defaultDb(), { mode: team ? 'manager' : 'observer', teamId: team, name: 'T', seed });
  if (G.teamSetup && G.teamSetup.pending) Owners.autoSetup(G);
  for (let r = 0; r < ROUNDS; r++) {
    if (Career.seasonOver(G)) Career.endSeason(G);
    Career.startWeekend(G); Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G); Career.simRaceToEnd(G); Career.finishWeekend(G);
    if (team && Talks) Career.teamDrivers(G, G.player.teamId).filter(d => d.seat !== 'R').forEach(d => { const t = Talks.start(G, d.id); if (t && t.opts.length) Talks.answer(G, d.id, t.topic, t.opts[r % t.opts.length].k); });
    G.inbox.forEach(m => { if (m.choices && m.resolved == null) Events.resolve(G, m.id, r % m.choices.length); });
  }
  // texto: em inglês tem de sair inglês (senão a comparação não prova nada)
  const txt = JSON.stringify(G.news.slice(0, 80).map(n => n.title)) + JSON.stringify(G.inbox.slice(0, 40).map(m => [m.title, m.body]));
  const ptMarks = (txt.match(/\b(não|vitórias|equipe|corrida|pontos|você|para)\b/g) || []).length;
  const enMarks = (txt.match(/\b(the|and|wins|race|points|you|for)\b/g) || []).length;
  // impressão digital só de números (nada de texto)
  const s = G.season;
  return { lang, ptMarks, enMarks, fp: JSON.stringify({ rng: RNG.state, year: s.year, round: s.round, standD: s.standD, standC: s.standC, res: s.results.map(x => x.cls.map(c => [c.did, c.pos, c.status, c.pts])),
    money: Math.round(G.finances.balance * 1000), cars: G.db.teams.map(t => [t.id, Math.round(t.car.aero * 100), Math.round(t.car.chassis * 100)]),
    drivers: G.db.drivers.filter(d => d.team).map(d => [d.id, d.team, d.seat, Math.round((d.morale || 0) * 10)]), inbox: G.inbox.length, news: G.news.length }) };
};
let bad = 0;
for (const [team, seed] of [['williams', 'lp-a'], ['ferrari', 'lp-b'], [null, 'lp-c']]) {
  const pt = run('pt', team, seed), en = run('en', team, seed);
  const ok = pt.fp === en.fp; if (!ok) bad++;
  const textOk = en.enMarks > en.ptMarks * 3 && pt.ptMarks > pt.enMarks; if (!textOk) bad++;
  console.log(`${team || 'observador'} ${seed}: ${ok ? 'mesmo jogo em PT e EN' : 'DIFERENTE entre PT e EN'} · texto PT ${pt.ptMarks}/${pt.enMarks} · EN ${en.enMarks}/${en.ptMarks}${textOk ? '' : ' (TEXTO NO IDIOMA ERRADO)'}`);
  if (!ok) { const a = JSON.parse(pt.fp), b = JSON.parse(en.fp); Object.keys(a).forEach(k => { if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) console.log('   difere em', k); }); }
}
console.log(bad ? 'idiomas: FALHOU' : 'idiomas: OK');
process.exit(bad ? 1 : 0);
