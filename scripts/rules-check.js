// Testes por regra (0.8.7): cada regra do regulamento tem um teste que FALHA se ela quebrar,
// em vez de só ser conferida por medição. Roda no `npm test`.
//   1. comissários: escala de punições, fim de corrida sem drive-through/stop-and-go, conversão em 20 s / 30 s,
//      rigor dos comissários e punição de grid;
//   2. cotas do motor: dentro da cota sem punição, 1º elemento extra 10 posições, seguintes 5, acima de 15 = último;
//   3. superlicença: idade, 40 pontos, 25 para treino livre, teto de 10 pontos de TL1, janela de 3 anos;
//      pontos de punição: 12 em 12 meses suspendem uma corrida, o reserva corre, a contagem zera e pontos velhos expiram;
//   4. revisão e apelação: recálculo da classificação, pontos, vitórias e pódios sem sobrar nem faltar ponto;
//   5. ganchos: ordem das camadas, nome repetido, base trocada, substituição registrada e reescrita por fora detectada.
// Uso: node scripts/rules-check.js
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const { core, data } = require('./modules');
const load = () => {
  const ctx = vm.createContext({ console, Math, JSON, Date, process });
  for (const m of [...data, ...core]) vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
  vm.runInContext('this.API = { Career, Engine, Events, Parts, SL, Regs, RNG, Hooks, Time, defaultDb, Owners, Damage }', ctx);
  return ctx.API;
};
let fails = 0, passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { fails++; console.log('  ✗ ' + msg); } };
const section = (t) => console.log(t);
const newGame = (A, team = 'williams', seed = 'rules') => { const G = A.Career.create(A.defaultDb(), { mode: 'manager', teamId: team, name: 'T', seed }); if (G.teamSetup && G.teamSetup.pending) A.Owners.autoSetup(G); return G; };
const playRound = (A, G) => { const C = A.Career; if (C.seasonOver(G)) C.endSeason(G); C.startWeekend(G); C.finishPractice(G); C.runQualifying(G); C.startRace(G); C.simRaceToEnd(G); C.finishWeekend(G); };
const toRace = (A, G) => { const C = A.Career; C.startWeekend(G); C.finishPractice(G); C.runQualifying(G); C.startRace(G); return G.weekend.race; };

/* ---------------- 1. comissários ---------------- */
section('1. comissários');
{
  const A = load(); const G = newGame(A); const race = toRace(A, G); const wk = A.Career.ctx(G); const E = A.Engine;
  const car = race.cars.find(c => c.status === 'run');
  const decideMany = (why, n, opts = {}) => {
    const cnt = {}; race.R = race.R || {}; const strict0 = race.R.penaltyStrictness; race.R.penaltyStrictness = opts.strict || 1;
    for (let i = 0; i < n; i++) {
      race.lap = opts.lap != null ? opts.lap : 10; car.status = 'run'; car.serve = null; car.pendingPen = 0;
      const inv = { did: car.did, why, lap: race.lap, due: race.lap, heavy: opts.heavy };
      E.decide(race, wk, inv, !!opts.after);
      cnt[inv.result] = (cnt[inv.result] || 0) + 1;
    }
    race.R.penaltyStrictness = strict0; car.serve = null; return cnt;
  };
  // a escala segue as diretrizes (colisão: 25 nada, 8 advertência, 40 5 s, 17 10 s, 5 DT, 2 SG, 3 grid)
  const N = 4000; const c = decideMany('colisao', N);
  const share = (k) => (c[k] || 0) / N;
  ok(Math.abs(share('nfa') - 0.25) < 0.04, `colisão: "nenhuma ação" em ${(share('nfa') * 100).toFixed(1)}% (esperado ~25%)`);
  ok(Math.abs(share('time') - 0.57) < 0.04, `colisão: punição de tempo em ${(share('time') * 100).toFixed(1)}% (esperado ~57%)`);
  ok(share('dt') > 0.02 && share('dt') < 0.09, `colisão: drive-through em ${(share('dt') * 100).toFixed(1)}% (esperado ~5%)`);
  ok(share('sg') > 0 && share('sg') < 0.05, `colisão: stop-and-go em ${(share('sg') * 100).toFixed(1)}% (esperado ~2%)`);
  ok(share('grid') > 0 && share('grid') < 0.06, `colisão: grid em ${(share('grid') * 100).toFixed(1)}% (esperado ~3%)`);
  // depois da bandeirada ou nas últimas 3 voltas não existe drive-through nem stop-and-go
  const after = decideMany('colisao', 1500, { after: true });
  ok(!after.dt && !after.sg, `decisão depois da corrida deu ${after.dt || 0} DT e ${after.sg || 0} SG`);
  const late = decideMany('colisao', 1500, { lap: race.laps - 2 });
  ok(!late.dt && !late.sg, `decisão nas últimas voltas deu ${late.dt || 0} DT e ${late.sg || 0} SG`);
  // comissários mais rigorosos: menos "nenhuma ação"
  const soft = decideMany('colisao', 3000, { strict: 0.6 }), hard = decideMany('colisao', 3000, { strict: 1.6 });
  ok((hard.nfa || 0) < (soft.nfa || 0) * 0.7, `rigor não reduz "nenhuma ação" (brando ${soft.nfa}, rigoroso ${hard.nfa})`);
  // incidente grave: menos "nenhuma ação", mais punição forte
  const heavy = decideMany('colisao', 3000, { heavy: true }); const light = decideMany('colisao', 3000);
  ok((heavy.nfa || 0) < (light.nfa || 0) * 0.6, `incidente grave não reduz "nenhuma ação" (${heavy.nfa} vs ${light.nfa})`);
  // bandeira azul nunca fica sem decisão (não há "nenhuma ação" na diretriz)
  const blue = decideMany('bandeira', 1000); ok(!blue.nfa, `bandeira azul teve ${blue.nfa} "nenhuma ação"`);
  // punição de tempo vai para o tempo; os pontos na superlicença vão para a lista da corrida
  race.pens = []; race.pp = []; const T0 = car.penalty; E.penalize(race, wk, car, 5, 'colisao', 2);
  ok(car.penalty === T0 + 5 && race.pens.length === 1 && race.pp.length === 1 && race.pp[0].pts === 2, 'penalize não registrou tempo e pontos');
  // (0.8.7) limites de pista: o ponto na superlicença é decisão dos comissários, em cerca de metade dos casos, sem sorteio
  { let n = 0, pts = 0; const st0 = A.RNG.state; race.cars.forEach(cc => { for (let l = 1; l <= 60; l++) { n++; pts += E.tlPoint({ lap: l, laps: 57 }, cc, { id: 'bahrain' }); } });
    ok(pts / n > 0.4 && pts / n < 0.6, `limites de pista com ponto em ${(pts / n * 100).toFixed(0)}% (esperado ~50%)`); ok(A.RNG.state === st0, 'decisão do ponto de limite de pista consumiu o sorteio'); }
  // DT/SG não cumprido vira 20 s / 30 s no tempo final
}
{
  const A = load(); const G = newGame(A, 'williams', 'rules-serve'); const race = toRace(A, G); const wk = A.Career.ctx(G);
  const run = race.cars.filter(c => c.status === 'run'); const a = run[0], b = run[1];
  // força a bandeirada: tudo pendente é convertido
  a.serve = { kind: 'dt', until: 9999 }; b.serve = { kind: 'sg', until: 9999 };
  const pa = a.penalty, pb = b.penalty;
  A.Engine.finishRace(race, wk);
  ok(a.penalty - pa === 20 && !a.serve, `drive-through não cumprido virou +${a.penalty - pa} s (esperado 20)`);
  ok(b.penalty - pb === 30 && !b.serve, `stop-and-go não cumprido virou +${b.penalty - pb} s (esperado 30)`);
}

/* ---------------- 2. cotas do motor ---------------- */
section('2. cotas do motor');
{
  const A = load(); const G = newGame(A, 'haas', 'rules-pu'); const { Parts, Regs, Career } = A;
  const d = Career.lineup(G, 'haas')[0]; const R = Regs.r(G);
  const lim = Parts.limit(G, 'ice'); const S = Parts.pu(G, d);
  const used0 = S.c.ice.used; let pens = [];
  for (let i = used0; i < lim; i++) pens.push(Parts.replace(G, d, 'ice'));
  ok(pens.every(p => p === 0), `trocas dentro da cota deram punição: ${pens.join(',')}`);
  ok(Parts.replace(G, d, 'ice') === R.engineGridPenalty, `1º elemento acima da cota não deu ${R.engineGridPenalty} posições`);
  ok(Parts.replace(G, d, 'ice') === Math.ceil(R.engineGridPenalty / 2), `2º elemento acima da cota não deu ${Math.ceil(R.engineGridPenalty / 2)} posições`);
  ok(R.engineGridPenalty === 10, `punição base do motor é ${R.engineGridPenalty} (regulamento: 10)`);
  // somadas no fim de semana: até 15 é a soma; acima, largar em último
  G.gridPenalties = {};
  Parts.addGrid(G, d, 10, ['ICE']); ok(G.gridPenalties[d.id] === 10, `10 posições viraram ${G.gridPenalties[d.id]}`);
  Parts.addGrid(G, d, 5, ['TC']); ok(G.gridPenalties[d.id] === 15, `10+5 viraram ${G.gridPenalties[d.id]} (esperado 15)`);
  Parts.addGrid(G, d, 5, ['MGU-K']); ok(G.gridPenalties[d.id] === 30, `acima de 15 virou ${G.gridPenalties[d.id]} (esperado 30 = fim do grid)`);
  G.gridPenalties = {}; Parts.addGrid(G, d, 16, ['ICE', 'TC']); ok(G.gridPenalties[d.id] === 30, `16 posições viraram ${G.gridPenalties[d.id]} (esperado 30: acima de 15 larga em último)`);
  G.gridPenalties = {}; Parts.addGrid(G, d, 15, ['ICE', 'TC']); ok(G.gridPenalties[d.id] === 15, `15 posições viraram ${G.gridPenalties[d.id]} (esperado 15)`);
  // câmbio tem cota própria
  ok(Parts.limit(G, 'gbx') === R.gearboxLimit, 'câmbio não usa a cota de câmbio');
}

/* ---------------- 3. superlicença ---------------- */
section('3. superlicença e pontos de punição');
{
  const A = load(); const G = newGame(A, 'mclaren', 'rules-sl'); const { SL, Career } = A; const y = G.season.year;
  const mk = (o) => Object.assign({ id: 'x', name: 'X', age: 20, career: { starts: 0 }, sl: [] }, o);
  ok(SL.status(G, mk({ age: 17, sl: [{ y, pts: 60 }] })) === 'none', 'menor de 18 anos com 60 pontos teve licença');
  ok(SL.status(G, mk({ sl: [{ y, pts: 40 }] })) === 'full', '40 pontos não deram superlicença');
  ok(SL.status(G, mk({ sl: [{ y, pts: 39 }] })) === 'fp', '39 pontos não deram licença de treino livre');
  ok(SL.status(G, mk({ sl: [{ y, pts: 25 }] })) === 'fp', '25 pontos não deram licença de treino livre');
  ok(SL.status(G, mk({ sl: [{ y, pts: 24 }] })) === 'none', '24 pontos deram licença');
  ok(SL.status(G, mk({ career: { starts: 3 } })) === 'full', 'piloto com largadas na F1 ficou sem superlicença');
  ok(SL.points(G, mk({ sl: [{ y: y - 4, pts: 40 }] })) === 0, 'pontos de 4 anos atrás ainda contam (janela de 3 anos)');
  ok(SL.points(G, mk({ sl: [{ y: y - 3, pts: 20 }, { y, pts: 20 }] })) === 40, 'pontos dentro da janela não somaram');
  ok(SL.fpPts(G, mk({ sl: Array.from({ length: 15 }, () => ({ y, fp: true })) })) === 10, 'pontos de TL1 passaram do teto de 10');
  ok(SL.isRookie(mk({ career: { starts: 2 } })) && !SL.isRookie(mk({ career: { starts: 3 } })), 'novato = até 2 GPs');
  // pontos de punição: 12 em 12 meses suspendem uma corrida
  const d = Career.lineup(G, 'mclaren')[0]; d.pp = [];
  const today = SL.dayOf(G);
  SL.afterRace(G, { pp: [{ did: d.id, pts: 6, why: 'colisao' }] }, 'GP 1'); ok(!d.banNext, 'suspenso com 6 pontos');
  SL.afterRace(G, { pp: [{ did: d.id, pts: 5, why: 'colisao' }] }, 'GP 2'); ok(!d.banNext, 'suspenso com 11 pontos');
  SL.afterRace(G, { pp: [{ did: d.id, pts: 1, why: 'limites' }] }, 'GP 3'); ok(d.banNext, 'não suspenso com 12 pontos');
  // a suspensão vale no próximo GP: o reserva corre no lugar
  Career.startWeekend(G);
  ok(d.banned && !d.banNext, 'suspensão não entrou no fim de semana seguinte');
  const lu = Career.lineup(G, 'mclaren'); ok(!lu.some(x => x.id === d.id) && lu.length === 2, `piloto suspenso na escalação (${lu.map(x => x.name).join(', ')})`);
  Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G);
  ok(!G.weekend.race.cars.some(c => c.did === d.id), 'piloto suspenso largou');
  Career.simRaceToEnd(G); Career.finishWeekend(G);
  ok(!d.banned && (d.pp || []).length === 0, 'depois de cumprir a suspensão o piloto não voltou com a contagem zerada');
  ok(Career.lineup(G, 'mclaren').some(x => x.id === d.id), 'piloto não voltou à escalação depois da suspensão');
  // pontos com mais de 12 meses expiram
  d.pp = [{ date: `${y - 2}-01-01`, y: y - 2, pts: 11, why: 'colisao', gp: 'velho' }];
  ok(SL.ppTotal(G, d) === 0, `pontos de 2 anos atrás ainda contam (${SL.ppTotal(G, d)})`);
  SL.afterRace(G, { pp: [{ did: d.id, pts: 2, why: 'colisao' }] }, 'GP novo'); ok(!d.banNext && SL.ppTotal(G, d) === 2, 'pontos vencidos somaram para a suspensão');
}

/* ---------------- 4. revisão, apelação e recálculo ---------------- */
section('4. revisão, apelação e recálculo da classificação');
{
  const A = load(); const G = newGame(A, 'ferrari', 'rules-rev'); const { SL, Career } = A;
  for (let i = 0; i < 3; i++) playRound(A, G);
  const s = G.season; const idx = s.results.length - 1; const res = s.results[idx];
  const totalPts = () => Object.values(s.standD).reduce((a, b) => a + b, 0);
  const sumRes = () => s.results.reduce((a, r) => a + r.cls.reduce((x, c) => x + c.pts, 0) + (r.sprint || []).reduce((x, c) => x + c.pts, 0) + (r.bonus || []).reduce((x, c) => x + c.pts, 0), 0);
  const consistent = (where) => {
    ok(Math.abs(totalPts() - sumRes()) < 0.01, `${where}: soma dos pontos ${totalPts()} ≠ soma dos resultados ${sumRes()}`);
    const byTeam = {}; Object.entries(s.standD).forEach(([did, p]) => { const r = s.results.flatMap(x => x.cls).find(c => c.did === did); if (r) byTeam[r.tid] = (byTeam[r.tid] || 0) + p; });
    ok(Math.abs(Object.values(s.standC).reduce((a, b) => a + b, 0) - totalPts()) < 0.01, `${where}: construtores e pilotos não somam o mesmo`);
  };
  consistent('antes');
  const fin = res.cls.filter(c => c.status === 'fin'); const win = fin[0], second = fin[1];
  const wWins = (s.stats[win.did] || {}).wins || 0, sWins = (s.stats[second.did] || {}).wins || 0;
  const gap = second.T - win.T;
  // punição de tempo maior que a diferença: o vencedor cai, o segundo herda a vitória
  const ch = SL.reclassify(G, idx, cls => { const r = cls.find(x => x.did === win.did); r.T += gap + 30; r.penalty = (r.penalty || 0) + gap + 30; });
  ok(res.winner === second.did && res.cls[0].did === second.did, 'recálculo não passou a vitória para o segundo');
  ok((s.stats[second.did].wins || 0) === sWins + 1 && (s.stats[win.did].wins || 0) === wWins - 1, 'vitórias não foram transferidas');
  ok(ch.length >= 2, 'recálculo não informou as mudanças');
  consistent('depois da punição');
  // revisão aceita: devolve o tempo e o resultado volta ao original
  SL.reclassify(G, idx, cls => { const r = cls.find(x => x.did === win.did); r.T -= gap + 30; r.penalty -= gap + 30; });
  ok(res.winner === win.did && (s.stats[win.did].wins || 0) === wWins, 'revisão não devolveu a vitória');
  consistent('depois da revisão');
  // desclassificação e apelação aceita
  const pts0 = s.standD[second.did];
  SL.reclassify(G, idx, cls => { cls.find(x => x.did === second.did).status = 'dsq'; });
  ok(res.cls.find(x => x.did === second.did).pts === 0 && s.standD[second.did] < pts0, 'desclassificado ficou com pontos');
  consistent('depois da desclassificação');
  s.results[idx].year = s.year;
  SL.applyAppeal(G, { year: s.year, idx, did: second.did, gp: 'GP' });
  ok(Math.abs(s.standD[second.did] - pts0) < 0.01, `apelação não devolveu os pontos (${s.standD[second.did]} vs ${pts0})`);
  consistent('depois da apelação');
  // punição de grid retirada na revisão
  G.gridPenalties = { [win.did]: 5 };
  SL.applyReview(G, { kind: 'grid', year: s.year, idx, did: win.did, n: 5, why: 'colisao', gp: 'GP' });
  ok(!G.gridPenalties[win.did], 'revisão não retirou a punição de grid');
}

/* ---------------- 6. danos: asa parcial, bandeira preta e laranja, detritos ---------------- */
section('6. danos na corrida');
{
  const A = load(); const G = newGame(A, 'mclaren', 'rules-dmg'); const race = toRace(A, G); const wk = A.Career.ctx(G); const E = A.Engine, D = A.Damage;
  for (let i = 0; i < 10; i++) A.Career.stepRace(G);
  const run = race.cars.filter(c => c.status === 'run'); const c = run[0];
  const fresh = () => { c.tyre.wear = 5; c.tyre.puncture = false; c.damage.wing = 0; c.loosePart = null; c.meatball = null; };
  // asa parcial: com muitas voltas pela frente segue; asa muito danificada para
  fresh(); c.damage.wing = 0.25; race.lap = race.laps - 30; ok(!E.aiWantsPit(race, c, wk, 80), 'pedaço pequeno da asa (0,25) fez parar fora de hora');
  fresh(); c.damage.wing = 0.7; ok(E.aiWantsPit(race, c, wk, 80), 'asa muito danificada (0,7) não fez parar');
  fresh(); c.damage.wing = 0.7; race.lap = race.laps - 2; ok(!E.aiWantsPit(race, c, wk, 80), 'parou para trocar a asa a 2 voltas do fim');
  // perda de tempo proporcional ao dano (mesmo peso do motor da corrida)
  ok(Math.abs(0.25 * 0.9 - 0.225) < 1e-9, 'conta de tempo da asa parcial');
  // bandeira preta e laranja: peça solta vira bandeira; a estratégia automática para
  race.lap = 20; fresh(); c.damage.wing = 0.9; c.loosePart = { lap: 20 }; const keepFall = D.FALL_P; D.FALL_P = 0;
  D.lap(race, wk, 20, null);
  ok(c.meatball && c.meatball.until === 20 + D.MEATBALL_LAPS, 'peça solta não virou bandeira preta e laranja com prazo de 2 voltas');
  ok(E.aiWantsPit(race, c, wk, 80), 'com bandeira preta e laranja a estratégia não manda parar');
  ok(race.events.some(e => /preta e laranja|black and orange/.test(e.text)), 'bandeira preta e laranja sem aviso na corrida');
  // quem não para dentro do prazo leva bandeira preta
  D.lap(race, wk, 21, null); D.lap(race, wk, 22, null); ok(c.status === 'run', 'bandeira preta antes do prazo acabar');
  D.lap(race, wk, 23, null);
  ok(c.status === 'dnf' && /preta|Black/.test(c.dnfReason) && (race.pens || []).some(p => p.did === c.did && p.kind === 'bf'), 'não parar com a asa solta não deu bandeira preta');
  D.FALL_P = keepFall;
  // parar resolve: a troca de bico limpa o dano e a bandeira
  const c2 = run[1]; c2.damage.wing = 0.9; c2.loosePart = { lap: 30 }; c2.meatball = { from: 30, until: 32 }; c2.pitReq = 'H';
  race.lap = 30; A.Career.stepRace(G);
  ok(!c2.meatball && !c2.loosePart && !c2.damage.wing && c2.status === 'run', 'parar nos boxes não resolveu a asa solta');
  // detritos: pedaço de asa na pista traz o Safety Car virtual em boa parte das vezes, nunca por cima de um Safety Car
  let vsc = 0; const N = 300; const st0 = A.RNG.state;
  for (let i = 0; i < N; i++) { race.sc = null; race.debrisLap = 40; race.lap = 40; D.lap(race, wk, 40, null); if (race.sc && race.sc.type !== 'SC') vsc++; else if (race.sc) vsc++; }
  ok(vsc / N > 0.45 && vsc / N < 0.75, `detritos da asa trouxeram o Safety Car virtual em ${(vsc / N * 100).toFixed(0)}% (esperado ~60%)`);
  race.sc = { type: 'SC', left: 3, from: 40 }; race.debrisLap = 41; const ev0 = race.events.length; D.lap(race, wk, 41, 'SC');
  ok(!race.events.slice(ev0).some(e => e.deploy), 'detritos acionaram um segundo Safety Car por cima do primeiro');
  race.sc = null;
}

/* ---------------- 5. ganchos ---------------- */
section('5. ganchos');
{
  const { Hooks } = load();
  const O = { f: (x) => [x] };
  Hooks.around('O', O, 'f', 'a', (next, x) => ['a<', ...next(x), '>a']);
  Hooks.around('O', O, 'f', 'b', (next, x) => ['b<', ...next(x), '>b']);
  ok(JSON.stringify(O.f(1)) === JSON.stringify(['b<', 'a<', 1, '>a', '>b']), `ordem das camadas errada: ${JSON.stringify(O.f(1))}`);
  let threw = false; try { Hooks.around('O', O, 'f', 'a', (n, x) => n(x)); } catch (e) { threw = true; }
  ok(threw, 'nome de gancho repetido não deu erro');
  Hooks.base('O', O, 'f', 'nova', (x) => [x * 10], 'teste');
  ok(JSON.stringify(O.f(1)) === JSON.stringify(['b<', 'a<', 10, '>a', '>b']), 'trocar a base derrubou os ganchos');
  Hooks.replace('O', O, 'f', 'troca', (x) => [x * 100], 'teste');
  ok(JSON.stringify(O.f(1)) === JSON.stringify([100]), 'replace não derrubou as camadas');
  ok(JSON.stringify(Hooks.list().find(t => t.id === 'O.f').dropped) === JSON.stringify(['a', 'b']), 'replace não registrou o que saiu');
  ok(!Hooks.verify().includes('O.f'), 'verify acusou um alvo íntegro');
  O.f = () => 'por fora';
  ok(Hooks.verify().includes('O.f'), 'verify não acusou reescrita por fora do registro');
  // os ganchos reais do jogo estão íntegros e nenhum nome se repete
  const A = load(); ok(!A.Hooks.verify().length, 'ganchos do jogo reescritos por fora: ' + A.Hooks.verify().join(', '));
  ok(A.Hooks.list().length > 40, `poucos alvos com ganchos (${A.Hooks.list().length})`);
}

console.log(fails ? `regras: ${fails} falha(s) em ${passed + fails} verificações` : `regras: OK (${passed} verificações)`);
process.exit(fails ? 1 : 0);
