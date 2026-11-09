'use strict';
/* ---------- fim de semana ---------- */
Career.startWeekend = (G) => {
  if (typeof Council !== 'undefined') Council.beforeWeekend(G);
  const track = Career.currentTrack(G);
  const team = Career.isObs(G) ? null : Career.team(G);
  const wlaps = Math.round(track.laps * (G.db.rules.raceDistancePct || 100) / 100);
  const weather = Engine.genWeather(track, wlaps, G.options.rainMult);
  const month = track.date ? Number(track.date.slice(5, 7)) : 3 + Math.round(G.season.round / Math.max(1, G.season.calendar.length) * 9);
  Engine.addTemps(weather, track, month, wlaps);
  const lineup = team ? Career.lineup(G, team.id) : [];
  const wk = {
    round: G.season.round, trackId: track.id, phase: 'practice', weather,
    forecast: Engine.forecast(weather, track.laps, team ? team.staff.strategy : 85),
    optimum: {}, setups: {}, qualiRisk: {}, strategy: {}, quali: null, grid: null, race: null, sprint: !!track.sprint, sprintResult: null,
    practiceBonus: G.pendingPracticeBonus || 0,
  };
  G.pendingPracticeBonus = 0;
  // forma do fim de semana: alguns carros se dão melhor em certas pistas, pilotos têm dias bons e ruins
  wk.form = {}; wk.dform = {};
  // (0.8.3: menos sorte por fim de semana — antes um carro variava ~1,8 ponto, quase metade da diferença entre equipes)
  G.db.teams.forEach(t => (wk.form[t.id] = +(localRngNormal(G.seed + ':' + G.season.year + ':' + t.id + ':' + track.id) * 0.3 + RNG.normal(0, 0.12)).toFixed(2)));
  G.db.drivers.forEach(d => (wk.dform[d.id] = +(RNG.normal(0, 0.55) * (1.25 - d.consistency / 130)).toFixed(2)));
  G.db.teams.forEach(t => (wk.optimum[t.id] = Setup.genOptimum(track, t, localRng(G.seed + ':' + G.season.year + ':' + track.id + ':' + t.id))));
  // acerto das equipes da IA: definido pelo trabalho dos engenheiros durante os treinos
  wk.aiSetups = {};
  G.db.teams.forEach(t => { if (!team || t.id !== team.id) Career.lineup(G, t.id).forEach(d => (wk.aiSetups[d.id] = Career.aiSetupQ(t, d))); });
  lineup.forEach(d => { wk.qualiRisk[d.id] = 'normal'; });
  G.weekend = wk;
  if (team) Practice.init(G, wk, track, team, lineup);
  else { const n = Practice.sessionsFor(G, track); wk.fp = { cur: 0, sessions: Array.from({ length: n }, (_, i) => ({ name: n === 1 ? 'TL1' : `TL${i + 1}`, t: 0, dur: Practice.DUR, done: false, rubber0: i * 0.18, best: {}, laps: {}, ai: null, log: [] })) }; }
  // eventos de bastidores (ex.: simulador, atraso de peças) mudam o tempo de pista
  if (team && wk.practiceBonus) Object.values(wk.setups).forEach(s => { s.acclimLaps = Math.max(0, wk.practiceBonus * 4); });
  return wk;
};

Career.aiSetupQ = (team, d) => clamp(0.6 + team.staff.engineering * 0.004 + (d ? ((d.feedback ?? 75) - 78) * 0.0025 + ((d.adaptability ?? 75) - 78) * 0.0015 + (((typeof STYLE_BEHAVIOR !== 'undefined' && STYLE_BEHAVIOR[d.style]) || {}).setup || 0) : 0) + RNG.normal(0, 0.07), 0.35, 0.97);

Career.finishPractice = (G, focus) => {
  const wk = G.weekend;
  if (!Career.isObs(G)) {
    // sessões que o jogador não fez são feitas pelos engenheiros
    const pending = wk.fp.sessions.some(s => !s.done);
    if (pending) Practice.simulate(G, focus || null, true);
    Practice.finish(G);
  } else {
    // observador: só a tabela de tempos dos treinos
    wk.fp.sessions.forEach((s, i) => { wk.fp.cur = i; if (!s.done) { s.ai = Practice.aiPlan(G, wk, s); s.aiIdx = 0; Practice.endSession(G); } });
  }
  Practice.aiConfidence(G, wk);
  wk.phase = wk.sprint ? 'sq' : 'quali';
};

Career.entries = (G, phase = 'race') => {
  const wk = G.weekend;
  const ctx = Career.ctx(G);
  if (!wk.aiSetups) {
    wk.aiSetups = {};
    G.db.teams.forEach(t => { if (t.id !== G.player.teamId) Career.lineup(G, t.id).forEach(d => (wk.aiSetups[d.id] = Career.aiSetupQ(t, d))); });
  }
  const mySetup = (did) => { const s = wk.setups[did]; if (!s) return null; return phase === 'quali' ? (s.qQ ?? s.q) : (s.qR ?? s.q); };
  return Career.grid(G).map(({ d, t }) => ({
    did: d.id, tid: t.id, team: t, drv: typeof Setup !== 'undefined' && wk.conf ? Setup.applyConfidence(ctx.effOf(d.id), wk.conf[d.id]) : ctx.effOf(d.id),
    setupQ: t.id === G.player.teamId ? (mySetup(d.id) ?? Career.aiSetupQ(t)) : wk.aiSetups[d.id] ?? Career.aiSetupQ(t, d),
    carPerf: Engine.carPerf(G.db, t, ctx.track) + (wk.form[t.id] || 0) + (wk.dform[d.id] || 0) + (G.options.difficulty === 'easy' && t.id === G.player.teamId ? 1.2 : 0) - (G.options.difficulty === 'hard' && t.id === G.player.teamId ? 0.8 : 0),
    risk: t.id === G.player.teamId ? (wk.qualiRisk[d.id] || 'normal') : RNG.pick(['normal', 'normal', 'push', 'safe']),
    isPlayer: t.id === G.player.teamId,
  }));
};

/* Classificação Sprint (SQ1/SQ2/SQ3) e a corrida Sprint, no formato atual da F1 */
Career.runSprintQuali = (G) => {
  const wk = G.weekend;
  if (!wk.ql || wk.ql.kind !== 'SQ') Quali.init(G, 'SQ');
  if (!wk.ql.done) Quali.simulate(G, true);
  wk.sq = Quali.result(G);
  wk.ql = null;
  if (!wk.sprintResult) Career.runSprint(G);
  wk.phase = 'quali';
  return wk.sq;
};
Career.runQualifying = (G) => {
  const wk = G.weekend;
  if (wk.sprint && !wk.sprintResult) Career.runSprintQuali(G);
  if (!wk.ql || wk.ql.kind !== 'Q') Quali.init(G, 'Q');
  if (!wk.ql.done) Quali.simulate(G, true);
  return Career.finishQualifying(G);
};
Career.finishQualifying = (G) => {
  const wk = G.weekend;
  const ctx = Career.ctx(G);
  const q = Quali.result(G);
  wk.ql = null;
  // punições de grid por eventos (ex.: troca de motor)
  wk.quali = q;
  wk.grid = q.order.slice();
  if (G.gridPenalties) {
    Object.entries(G.gridPenalties).forEach(([did, n]) => {
      const i = wk.grid.indexOf(did);
      if (i >= 0) { wk.grid.splice(i, 1); wk.grid.splice(Math.min(wk.grid.length, i + n), 0, did); }
    });
    G.gridPenalties = null;
  }
  wk.phase = 'strategy';
  const pole = q.order[0];
  const pp = G.db.rules.regs ? G.db.rules.regs.polePoints || 0 : 0;
  if (pp) { const pt = Career.driver(G, pole).team; wk.bonus = [{ did: pole, tid: (q.res[pole] || {}).tid || pt, pts: pp }]; G.season.standD[pole] = (G.season.standD[pole] || 0) + pp; G.season.standC[wk.bonus[0].tid] = (G.season.standC[wk.bonus[0].tid] || 0) + pp; if (G.season.stats[pole]) G.season.stats[pole].points += pp; }
  G.season.stats[pole] && G.season.stats[pole].poles++;
  const pd = Career.driver(G, pole); if (pd) pd.career.poles++;
  // estratégia padrão para o jogador
  const lineup = Career.isObs(G) ? [] : Career.lineup(G, G.player.teamId);
  const w0 = wk.weather.wet[1] || 0;
  lineup.forEach(d => {
    const top10 = wk.grid.indexOf(d.id) < 10;
    wk.strategy[d.id] = { startTyre: w0 > 0.62 ? 'W' : w0 > 0.2 ? 'I' : (top10 ? 'S' : 'M'), stops: ctx.track.tyreStress > 1.15 ? 2 : 1, auto: true, pitWear: 68 };
  });
  return q;
};

/* Corrida Sprint: distância reduzida, sem paradas obrigatórias, pontuação própria.
   Larga na ordem da classificação e acontece antes da corrida principal. */
Career.runSprint = (G) => {
  const wk = G.weekend;
  const ctx = Career.ctx(G);
  const entries = Career.entries(G);
  const w0 = wk.weather.wet[1] || 0;
  const rev = G.db.rules.regs ? G.db.rules.regs.reverseGrid || 0 : 0;
  const base = (wk.sq || wk.quali).order;
  const order = rev ? [...base.slice(0, rev).reverse(), ...base.slice(rev)] : base;
  const grid = order.map(did => ({ ...entries.find(x => x.did === did), startTyre: w0 > 0.62 ? 'W' : w0 > 0.2 ? 'I' : 'M', auto: true }));
  const race = Engine.createRace({ ...ctx, weather: wk.weather }, grid, { sprint: true });
  let guard = 0;
  while (!race.finished && guard++ < 200) Engine.stepLap(race, { ...ctx, weather: wk.weather });
  const cls = race.classification.map(did => { const c = race.cars.find(x => x.did === did); return { did, tid: c.tid, pos: c.pos, grid: c.grid, pts: race.points[did] || 0, status: c.status, reason: c.dnfReason, T: c.T, lapsDown: c.lapsDown || 0, best: c.best }; });
  cls.forEach(r => {
    G.season.standD[r.did] = (G.season.standD[r.did] || 0) + r.pts;
    G.season.standC[r.tid] = (G.season.standC[r.tid] || 0) + r.pts;
    const st = G.season.stats[r.did]; if (st) { st.points += r.pts; if (r.pos === 1 && r.status === 'fin') st.sprintWins = (st.sprintWins || 0) + 1; }
    const d = Career.driver(G, r.did); if (d) d.career.points += r.pts;
  });
  wk.sprintResult = { laps: race.laps, cls, events: race.events.filter(e => ['crash', 'dnf', 'sc', 'penalty', 'finish'].includes(e.type)).slice(-12) };
  return wk.sprintResult;
};

Career.startRace = (G) => {
  const wk = G.weekend;
  const ctx = Career.ctx(G);
  const entries = Career.entries(G);
  const w0 = wk.weather.wet[1] || 0;
  const grid = wk.grid.map(did => {
    const e = entries.find(x => x.did === did);
    const isP = e.tid === G.player.teamId;
    const st = isP ? wk.strategy[did] : null;
    let startTyre = st ? st.startTyre : (w0 > 0.62 ? 'W' : w0 > 0.2 ? 'I' : RNG.weighted(['S', 'M', 'H'], c => c === 'M' ? 5 : c === 'S' ? (wk.grid.indexOf(did) < 10 ? 4 : 2) : 1.5));
    return {
      ...e, startTyre, auto: st ? st.auto : true,
      plan: st ? { stops: st.stops, pitWear: st.pitWear, scOpportunist: true } : null,
    };
  });
  wk.race = Engine.createRace({ ...ctx, weather: wk.weather }, grid);
  wk.race.rivals = Object.values((G.memory || {}).rivals || {}).filter(r => r.score >= 4.5).map(r => [r.a, r.b].sort().join('|'));
  wk.phase = 'race';
  return wk.race;
};

Career.stepRace = (G) => {
  const wk = G.weekend;
  const ctx = Career.ctx(G);
  Engine.stepLap(wk.race, { ...ctx, weather: wk.weather });
  return wk.race;
};

Career.simRaceToEnd = (G) => { let guard = 0; while (!G.weekend.race.finished && guard++ < 500) Career.stepRace(G); };

/* ---------- pós-corrida ---------- */
Career.finishWeekend = (G) => {
  const wk = G.weekend;
  const race = wk.race;
  const season = G.season;
  const track = Career.track(G, wk.trackId);
  const pts = race.points;
  const cls = race.classification.map(did => {
    const c = race.cars.find(x => x.did === did);
    return { did, tid: c.tid, pos: c.pos, grid: c.grid, pts: pts[did] || 0, status: c.status, reason: c.dnfReason, laps: c.laps, T: c.T, best: c.best, pits: c.pits, lapsDown: c.lapsDown || 0, penalty: c.penalty };
  });
  cls.forEach(r => {
    season.standD[r.did] = (season.standD[r.did] || 0) + r.pts;
    season.standC[r.tid] = (season.standC[r.tid] || 0) + r.pts;
    const st = season.stats[r.did] || (season.stats[r.did] = { starts: 0, wins: 0, podiums: 0, poles: 0, dnfs: 0, fl: 0, points: 0, best: null, sumPos: 0, finishes: 0, beatMate: 0 });
    st.starts++; st.points += r.pts;
    const d = Career.driver(G, r.did);
    d.career.starts++; d.career.points += r.pts;
    if (r.status === 'fin') {
      st.finishes++; st.sumPos += r.pos;
      st.best = st.best == null ? r.pos : Math.min(st.best, r.pos);
      if (r.pos === 1) { st.wins++; d.career.wins++; }
      if (r.pos <= 3) { st.podiums++; d.career.podiums++; }
    } else st.dnfs++;
  });
  if (race.fastest) { const s = season.stats[race.fastest.did]; if (s) s.fl++; }
  // companheiros de equipe
  G.db.teams.forEach(t => {
    const rs = cls.filter(r => r.tid === t.id);
    if (rs.length === 2) { const b = rs[0].pos < rs[1].pos ? rs[0] : rs[1]; season.stats[b.did].beatMate++; }
  });
  const summary = {
    round: season.round, trackId: track.id, gp: track.gp, laps: race.laps,
    winner: cls[0].did, pole: wk.quali.order[0], fastest: race.fastest,
    wet: Math.max(...race.wet), sc: race.scHistory.length,
    cls, quali: wk.quali.order, sprint: wk.sprintResult ? wk.sprintResult.cls.map(c => ({ did: c.did, tid: c.tid, pos: c.pos, pts: c.pts, status: c.status })) : null,
  };
  season.results.push(summary);

  // análise de dados — guarda a corrida completa só da última
  G.lastRace = {
    round: season.round, year: season.year, trackId: track.id, gp: track.gp, laps: race.laps, wet: race.wet, scHistory: race.scHistory,
    events: race.events, pitLog: race.pitLog || [],
    cars: race.cars.map(c => ({ did: c.did, tid: c.tid, grid: c.grid, pos: c.pos, status: c.status, times: c.times, positions: c.positions, gaps: c.gaps, stints: c.stints, best: c.best, pits: c.pits, overtakes: c.overtakes, setupQ: c.setupQ, secs: c.secs, bestS: c.bestS, vmax: c.vmax })),
    bestS: race.bestS, weather: { air: wk.weather.air ? wk.weather.air[1] : null, track: wk.weather.trackT ? wk.weather.trackT[1] : null },
    quali: wk.quali,
  };

  Career.record(G, 'corrida', `${track.gp}: vitória de ${Career.driver(G, summary.winner).name} (${Career.team(G, cls[0].tid).name}), pole de ${Career.driver(G, summary.pole).name}.`, { drivers: [summary.winner], teams: [cls[0].tid] });
  if (wk.bonus) summary.bonus = wk.bonus;
  // outras categorias: tudo o que aconteceu até a data deste GP
  if (typeof Cats !== 'undefined') Cats.advanceTo(G, Cats.f1Date(G, track, season.round));
  // recordes da pista nesta carreira (volta de corrida e de classificação em pista seca)
  G.trackRecords = G.trackRecords || {};
  const trec = G.trackRecords[track.id] || (G.trackRecords[track.id] = {});
  if (race.fastest && race.fastest.time && (!trec.lap || race.fastest.time < trec.lap[0])) trec.lap = [+race.fastest.time.toFixed(3), race.fastest.did, (race.cars.find(c => c.did === race.fastest.did) || {}).tid, season.year];
  const poleRes = wk.quali && wk.quali.res && wk.quali.res[wk.quali.order[0]];
  if (poleRes && poleRes.best && !(wk.quali.wet > 0.2) && (!trec.quali || poleRes.best < trec.quali[0])) trec.quali = [+poleRes.best.toFixed(3), wk.quali.order[0], null, season.year];
  if (typeof Regs !== 'undefined') Regs.puTick(G, race);
  const report = Career.postRaceEffects(G, summary, race);
  season.round++;
  G.weekend = null;
  if (typeof Council !== 'undefined') Council.afterRound(G);
  if (typeof Sisters !== 'undefined') Sisters.afterRound(G);
  if (typeof Potential !== 'undefined') Potential.tick(G);
  return report;
};

Career.postRaceEffects = (G, summary, race) => {
  const obs = Career.isObs(G);
  const team = obs ? null : Career.team(G);
  const my = team ? summary.cls.filter(r => r.tid === team.id) : [];
  const report = { lines: [], money: 0 };
  const track = Career.track(G, summary.trackId);

  // moral dos pilotos (todos)
  G.db.teams.forEach(t => {
    const rs = summary.cls.filter(r => r.tid === t.id);
    const expRank = Career.expectedRanks(G)[t.id];
    rs.forEach(r => {
      const d = Career.driver(G, r.did);
      const exp = expRank * 2 - 0.5;
      let dm = r.status === 'fin' ? clamp((exp - r.pos) * 0.8, -5, 6) : -3;
      if (r.pos === 1) dm += 6;
      const mate = rs.find(x => x.did !== r.did);
      if (mate) dm += r.pos < mate.pos ? 1.5 : -1.5;
      d.morale = clamp(Math.round((d.morale + dm + (66 - d.morale) * 0.07) * 10) / 10, 5, 100);
      d.popularity = clamp(d.popularity + (r.pos <= 3 ? 1.5 : r.pos <= 10 ? 0.3 : -0.2), 1, 100);
    });
  });

  // IA dos chefes de equipe: caixa, investimentos, staff
  AI.raceTick(G);
  Staff.tick(G);
  Market.tick(G);
  Market.academyTick(G);
  Career.driverGrowth(G);
  G.db.drivers.forEach(d => { if (d.injured > 0) { d.injured--; if (d.injured === 0 && team && d.team === team.id) Career.mail(G, { from: 'Departamento médico', tag: 'team', title: `${d.name} liberado`, body: `${d.name} está recuperado e liberado para correr.` }); } });
  const wn0 = Career.driver(G, summary.winner);
  const wt0 = Career.team(G, summary.cls[0].tid);
  if (typeof Media !== 'undefined') { Media.raceReport(G, summary, race); Media.scandalTick(G); } else Career.news(G, `${wn0.name} vence o ${track.gp} com a ${wt0.name}`, 'corrida', `${wn0.name} largou em ${ordinal(summary.cls[0].grid)} e venceu em ${track.circuit}.${summary.wet > 0.25 ? ' Corrida marcada pela chuva.' : ''}${summary.sc ? ` ${summary.sc} intervenção(ões) do Safety Car.` : ''}`);
  if (obs) { Events.betweenRaces(G, summary); return report; }

  // finanças do jogador
  const races = G.season.calendar.length;
  // receita comercial, aporte dos donos, fábrica e marketing (econ.js)
  if (typeof Econ !== 'undefined') Econ.playerRace(G, team);
  else Career.ledger(G, `Direitos comerciais — ${track.gp}`, team.budget * 0.36 / races, 'receita');
  G.sponsors.forEach(s => {
    Career.ledger(G, `Patrocínio: ${s.name}`, s.perRace * Staff.commercialMul(team), 'receita');
    report.money += s.perRace;
    const met = Career.sponsorObjectiveMet(s, my);
    s.satisfaction = clamp((s.satisfaction ?? 70) + (met ? 4 : -3), 0, 100);
    if (met && s.bonus) { Career.ledger(G, `Bônus de ${s.name} (objetivo cumprido)`, s.bonus, 'receita'); report.lines.push(`${s.name} pagou bônus de ${fmtMoney(s.bonus)}.`); }
  });
  // patrocinador muito insatisfeito pode romper no meio do ano (risco de cancelamento)
  G.sponsors.slice().forEach(s => {
    if ((s.satisfaction ?? 70) >= 25 || !RNG.chance(0.05)) return;
    G.sponsors = G.sponsors.filter(x => x !== s);
    Career.record(G, 'patrocinio', `${s.name} rompeu o patrocínio da ${team.name} no meio da temporada (satisfação ${Math.round(s.satisfaction)}%).`, { teams: [team.id] });
    Career.mail(G, { from: 'Comercial', tag: 'money', important: true, title: `${s.name} rompe o contrato`, body: `A ${s.name} usou a cláusula de saída: os resultados ficaram muito abaixo do combinado (satisfação ${Math.round(s.satisfaction)}%). O valor por GP deixa de entrar a partir de agora.` });
    Career.news(G, `${s.name} deixa a ${team.name} no meio da temporada`, 'mercado');
  });
  const myPts = sum(my.map(r => r.pts));
  // pontos viram dinheiro pela distribuição comercial do ano seguinte (posição no Mundial), não por corrida
  if (myPts > 0 && typeof Econ === 'undefined') Career.ledger(G, 'Prêmio por pontos', myPts * 0.09, 'receita');
  const sal = sum(Career.teamDrivers(G, team.id).map(d => d.salary)) / races;
  Career.ledger(G, 'Salários dos pilotos', -sal, 'salário');
  const staffCost = Staff.payroll(team) / races;
  Career.ledger(G, 'Folha da equipe técnica', -staffCost, 'salário');
  Career.ledger(G, `Logística e operação — ${track.gp}`, -(1.25 + team.facilities * 0.006 + (track.street ? 0.2 : 0)) * Staff.opsMul(team), 'operação');
  const legKm = CircuitGen.legKm(G);
  if (legKm) Career.ledger(G, `Frete e viagem (${legKm.toLocaleString('pt-BR')} km)`, -CircuitGen.freight(legKm) * Staff.opsMul(team), 'operação');
  if (!team.works) Career.ledger(G, byLang('Arrendamento de motor', 'Engine lease'), -((typeof Mfr !== 'undefined' ? Mfr.fee(G, team) : Engine.engineOf(G.db, team).cost) / races), 'motor');
  my.forEach(r => {
    if (r.status === 'dnf' && /Acidente|Colisão/.test(r.reason || '')) {
      const cost = RNG.range(0.9, 2.6);
      Career.ledger(G, `Reparos: chassi de ${Career.driver(G, r.did).name}`, -cost, 'reparo');
      report.lines.push(`O acidente de ${Career.driver(G, r.did).name} custou ${fmtMoney(cost)} em reparos.`);
    }
  });

  // diretoria: compara o desempenho da equipe nesta corrida e no campeonato com a meta
  const exp = G.board.target;
  const bestPos = Math.min(...my.map(r => r.pos));
  const raceRank = Career.raceTeamRank(G, summary, team.id);
  const standRank = Career.standingsC(G).findIndex(x => x.tid === team.id) + 1;
  const conf = clamp(clamp((exp - raceRank) * 1.1, -5, 5) * 0.7 + clamp((exp - standRank) * 0.6, -3, 3) + (bestPos <= 3 ? 2 : 0), -6, 7);
  G.board.confidence = clamp(G.board.confidence + conf, 0, 100);
  if (G.finances.balance < 0) G.board.confidence = clamp(G.board.confidence - 3, 0, 100);

  // desenvolvimento P&D
  Career.advanceProjects(G, report);

  my.forEach(r => {
    const d = Career.driver(G, r.did);
    if (r.pos === 1) { Career.news(G, `Vitória histórica! ${d.name} leva a ${team.name} ao topo do pódio`, 'equipe'); G.player.careerWins++; }
    else if (r.pos <= 3) Career.news(G, `${d.name} sobe ao pódio em ${track.circuit}`, 'equipe');
  });
  // eventos aleatórios entre corridas
  Events.betweenRaces(G, summary);
  // checa demissão
  if (G.board.confidence <= 8 && !G.player.fired) {
    G.player.fired = true;
    Career.record(G, 'diretoria', `${G.player.name} foi demitido da ${team.name} (confiança ${Math.round(G.board.confidence)}%).`, { teams: [team.id] });
    Career.mail(G, { from: 'Diretoria', tag: 'board', title: 'Você foi demitido', body: `A diretoria da ${team.name} perdeu a confiança no seu trabalho. Você pode aceitar uma proposta de outra equipe na Central para continuar a carreira.`, action: { type: 'fired' } });
  }
  G.board.lastDelta = conf;
  return report;
};

Career.raceTeamRank = (G, summary, tid) => {
  const score = {};
  summary.cls.forEach(r => { score[r.tid] = score[r.tid] || { pts: 0, best: 99 }; score[r.tid].pts += r.pts; score[r.tid].best = Math.min(score[r.tid].best, r.pos); });
  const arr = Object.entries(score).sort((a, b) => b[1].pts - a[1].pts || a[1].best - b[1].best);
  return arr.findIndex(x => x[0] === tid) + 1;
};

Career.sponsorObjectiveMet = (s, my) => {
  const best = Math.min(...my.map(r => (r.status === 'fin' ? r.pos : 99)));
  if (s.objective === 'points') return my.some(r => r.pts > 0);
  if (s.objective === 'top5') return best <= 5;
  if (s.objective === 'podium') return best <= 3;
  if (s.objective === 'finish') return my.every(r => r.status === 'fin');
  if (s.objective === 'top10both') return my.every(r => r.pos <= 10 && r.status === 'fin');
  return false;
};
Career.SPONSOR_OBJ = {
  finish: 'Terminar com os dois carros', points: 'Marcar pontos', top10both: 'Os dois carros no top 10', top5: 'Um carro no top 5', podium: 'Pódio',
};

/* Marcas reais que patrocinam o automobilismo. As da própria equipe vêm primeiro. */
Career.SPONSOR_POOL = ['Heineken', 'DHL', 'AWS', 'Lenovo', 'Crypto.com', 'Rolex', 'Salesforce', 'Globant', 'MSC Cruises', 'Qatar Airways', 'Emirates', 'Allwyn', 'LVMH', 'Paramount+', 'Pepsico', 'Kraken', 'Tata Communications', 'Bitpanda', 'Castrol', 'Puma', 'Ray-Ban', 'Estrella Galicia', 'Gulf', 'Snowflake', 'Workday'];
/* marca → [segmento, porte] (sponsor-brands.js) */
Career.brand = (name) => (typeof SPONSOR_BRANDS !== 'undefined' && SPONSOR_BRANDS[name]) || ['outros', 3];
Career.genSponsors = (G, team, n) => {
  const used = new Set(G.sponsors.map(s => s.name));
  const segs = new Set(G.sponsors.map(s => s.seg || Career.brand(s.name)[0]));
  // exclusividade: marca que patrocina outra equipe não fecha com a sua; um patrocinador por segmento
  const taken = new Set(G.db.teams.filter(t => t.id !== team.id).flatMap(t => t.sponsors || []));
  const pool0 = [...new Set([...(typeof SPONSOR_BRANDS !== 'undefined' ? Object.keys(SPONSOR_BRANDS) : []), ...Career.SPONSOR_POOL])];
  const reachable = (name) => { const [, tier] = Career.brand(name); return tier === 3 || (tier === 2 && team.reputation >= 55) || (tier === 1 && team.reputation >= 75); };
  const own = (team.sponsors || []).filter(x => !used.has(x));
  const out = [];
  for (let i = 0; i < n; i++) {
    const ownLeft = own.filter(x => !used.has(x) && !segs.has(Career.brand(x)[0]));
    const market = pool0.filter(x => !used.has(x) && !taken.has(x) && !segs.has(Career.brand(x)[0]) && reachable(x));
    const name = ownLeft.length ? ownLeft[0] : market.length ? RNG.pick(market) : RNG.pick(Career.SPONSOR_POOL.filter(x => !used.has(x)));
    if (!name) break;
    used.add(name); segs.add(Career.brand(name)[0]);
    out.push(Career.makeSponsor(G, team, name, undefined, out));
  }
  return out;
};
Career.makeSponsor = (G, team, name, tier, pending) => {
  const rep = team.reputation;
  const exp = Career.expectedRanks(G)[team.id];
  const objs = exp <= 3 ? ['podium', 'top5', 'top10both'] : exp <= 6 ? ['top5', 'top10both', 'points'] : ['points', 'finish', 'top10both'];
  const objective = RNG.pick(objs);
  // o mercado de patrocínio da equipe é limitado (reputação, exposição): cada contrato novo ocupa parte dele
  const races = (G.season && G.season.calendar.length) || 24;
  const pool = typeof Econ !== 'undefined' ? Econ.sponsorPool(team) : team.budget * 0.62;
  const cur = [...(G.sponsors || []), ...(pending || [])];
  const used = sum(cur.map(s => s.perRace)) * races;
  const room = Math.max(pool * 0.04, pool * 1.1 - used);
  const share = cur.length === 0 ? 0.36 : cur.length === 1 ? 0.24 : cur.length === 2 ? 0.16 : 0.08;
  const [seg, btier] = Career.brand(name);
  const brandMul = btier === 1 ? 1.12 : btier === 2 ? 1 : 0.82;      // marca global de topo paga mais
  const perRace = +(Math.min(pool * share * brandMul, room) / races * RNG.range(0.88, 1.12) * (tier || 1)).toFixed(2);
  // cláusula de desempenho: terminar o Mundial até tal posição, senão a marca pode sair no fim do ano
  const clauseMin = clamp(exp + (btier === 1 ? 1 : 2), 1, G.db.teams.length);
  return { id: Career.nextId(G, 's'), name, seg, brandTier: btier, perRace, objective, bonus: +(perRace * RNG.range(0.12, 0.3)).toFixed(2), seasons: RNG.int(1, 3), satisfaction: 70, clauseMin };
};
