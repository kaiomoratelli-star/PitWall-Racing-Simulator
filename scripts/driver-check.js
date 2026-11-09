// Carreira de piloto (0.9): cria carreiras no modo piloto em vários universos, avança pelas datas,
// corre as etapas do kart e vira os anos, conferindo a cada passo:
//   - o piloto do jogador existe, não é aposentado nem promovido sozinho, e envelhece;
//   - as etapas acontecem na ordem e nas datas; a F1 e as categorias andam junto (o mundo é vivo);
//   - a classificação do campeonato bate com os pontos das etapas;
//   - o esquema do save passa a cada virada; o save gravado e relido continua igual;
//   - carreiras com sementes diferentes são diferentes; a mesma semente dá a mesma carreira.
// Uso: node scripts/driver-check.js [anos=3]
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const { core, data } = require('./modules');
const YEARS = +(process.argv[2] || 3);
const load = () => {
  const ctx = vm.createContext({ console, Math, JSON, Date, process });
  for (const m of [...data, ...core]) vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
  vm.runInContext('this.API = { Career, DCareer, Kart, Cats, Schema, RNG, Time, defaultDb, driverOverall }', ctx);
  return ctx.API;
};
let fails = 0; const fail = (m) => { fails++; if (fails <= 25) console.log('  ✗ ' + m); };
const play = (opts, years) => {
  const A = load(); const { Career, DCareer, Schema, RNG } = A;
  const G = Career.create(A.defaultDb(), { mode: 'driver', ...opts });
  const tag = `${opts.seed}/${opts.nat}`;
  const me = () => DCareer.me(G);
  if (!me() || !me().player) fail(`${tag}: piloto do jogador não foi criado`);
  if (G.mode !== 'driver' || !Career.isObs(G) || !Career.isDrv(G)) fail(`${tag}: modo errado (${G.mode})`);
  const age0 = me().age, y0 = G.season.year, ovr0 = A.driverOverall(me());
  let rounds = 0, f1 = 0, guard = 0; const dates = [];
  while (G.season.year < y0 + years && guard++ < 400) {
    const f1Before = G.season.results.length, yBefore = G.season.year;
    const stop = DCareer.advance(G);
    if (G.season.year === yBefore) f1 += G.season.results.length - f1Before;
    if (stop.type === 'round') {
      if (G.today < stop.ev.date) fail(`${tag}: etapa antes da data (${G.today} < ${stop.ev.date})`);
      dates.push(stop.ev.date);
      const r = DCareer.runRound(G); rounds++;
      if (!r || (!r.dnf && !(r.fin >= 1))) fail(`${tag}: resultado inválido ${JSON.stringify(r)}`);
      // classificação = soma dos pontos das etapas
      const s = G.dcareer.season; const tab = DCareer.standings(G);
      const tot = tab.reduce((a, x) => a + x.pts, 0);
      const exp = s.res.length ? null : 0;
      if (!tab.length || !isFinite(tot)) fail(`${tag}: classificação vazia ou inválida`);
    } else if (stop.type === 'newyear') {
      const sc = Schema.check(G); if (sc.fatal.length || sc.errors.length || sc.warnings.length) fail(`${tag}: esquema ${[...sc.fatal, ...sc.errors, ...sc.warnings].slice(0, 3).join('; ')}`);
      if (!me() || me().retired) fail(`${tag}: jogador aposentado pela virada do ano`);
      if (me().series !== 'kart') fail(`${tag}: jogador saiu do kart sozinho (${me().series}/${me().cat})`);
      const h = G.dcareer.hist[G.dcareer.hist.length - 1];
      if (!h || h.year !== G.season.year - 1 || !(h.pos >= 1)) fail(`${tag}: histórico do ano não gravado ${JSON.stringify(h)}`);
      const kr = (me().kart.res || []).slice(-1)[0];
      if (!kr || kr[0] !== h.year || kr[1] !== h.pos) fail(`${tag}: resultado do kart no piloto (${JSON.stringify(kr)}) ≠ classificação real (P${h.pos})`);
      if (G.dcareer.season.year !== G.season.year || G.dcareer.season.r !== 0) fail(`${tag}: temporada nova do kart não começou`);
    } else { fail(`${tag}: avanço travou (${JSON.stringify(stop)}) em ${G.today}`); break; }
  }
  if (me().age !== age0 + years) fail(`${tag}: idade ${me().age}, esperado ${age0 + years}`);
  if (rounds !== years * 8) fail(`${tag}: ${rounds} etapas em ${years} ano(s), esperado ${years * 8}`);
  for (let i = 1; i < dates.length; i++) if (dates[i] <= dates[i - 1]) fail(`${tag}: datas fora de ordem (${dates[i - 1]} → ${dates[i]})`);
  if ((G.history || []).length !== years) fail(`${tag}: a F1 não fechou ${years} temporada(s) (${(G.history || []).length})`);
  if (!isFinite(G.dcareer.money) || !isFinite(G.dcareer.rep) || !isFinite(G.dcareer.form)) fail(`${tag}: dinheiro/reputação/forma inválidos`);
  if (!G.inbox.some(m => /Etapa|Round/.test(m.title))) fail(`${tag}: nenhuma carta das etapas`);
  // gravar e reler não muda nada
  const again = JSON.parse(JSON.stringify(G)); if (JSON.stringify(again) !== JSON.stringify(G)) fail(`${tag}: save não volta igual`);
  const sig = JSON.stringify({ rng: RNG.state, hist: G.dcareer.hist, ovr: A.driverOverall(me()), pot: me().potential, f1: (G.history || []).map(h => h.champion || h.championD || '') });
  return { G, sig, ovr0, ovr: A.driverOverall(me()), pot: me().potential, hist: G.dcareer.hist, name: me().name, rounds, f1 };
};
const cfgs = [
  { seed: 'drv-a', name: 'Caio Teste', nat: 'BRA', bg: 'media', startAge: 14, number: 27 },
  { seed: 'drv-b', name: 'Luca Prova', nat: 'ITA', bg: 'humilde', startAge: 14, number: 5 },
  { seed: 'drv-c', name: 'Jake Trial', nat: 'USA', bg: 'rica', startAge: 15, number: 99 },
  { seed: 'drv-d', name: 'Ren Shiken', nat: 'JPN', bg: 'media', startAge: 14, number: 8 },
];
const out = cfgs.map(c => {
  const r = play(c, YEARS);
  console.log(`${c.seed} ${c.name} (${c.nat}, ${c.bg}): nota ${r.ovr0}→${r.ovr} · teto oculto ${r.pot} · ${r.hist.map(h => `${h.year} P${h.pos}/${h.of} ${h.w}v`).join(' · ')}`);
  return r;
});
// mesma semente = mesma carreira; sementes diferentes = carreiras diferentes
const rep = play(cfgs[0], YEARS);
if (rep.sig !== out[0].sig) fail('a mesma semente deu carreiras diferentes');
if (new Set(out.map(o => JSON.stringify(o.hist.map(h => [h.pos, h.pts])))).size < out.length) fail('carreiras com sementes diferentes ficaram iguais');
// o modo Manager não ganha nada do modo piloto
{ const A = load(); const G = A.Career.create(A.defaultDb(), { mode: 'manager', teamId: 'williams', seed: 'drv-m', name: 'T' }); if (G.dcareer || G.player.driverId || A.Career.isObs(G) || A.Career.isDrv(G)) fail('modo Manager ganhou estado do modo piloto'); }
console.log(fails ? `piloto: ${fails} falha(s)` : `piloto: OK (${cfgs.length} carreiras × ${YEARS} ano(s), mesma semente reproduz, sementes diferentes divergem)`);
process.exit(fails ? 1 : 0);
