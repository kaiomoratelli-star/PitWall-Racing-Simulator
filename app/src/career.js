/* ============================================================
   PIT WALL — carreira: temporada, fim de semana, P&D, finanças,
   mercado de pilotos, diretoria, evolução de pilotos
   ============================================================ */
'use strict';

const Career = {};

/* ---------- criação ---------- */
Career.create = (baseDb, opts) => {
  const seed = opts.seed ? (Number(opts.seed) || hashStr(String(opts.seed))) : Math.floor(Math.random() * 2 ** 31);
  RNG.seed(seed);
  const db = deepClone(baseDb);
  // assentos: primeiro piloto listado da equipe = carro 1
  // respeita assentos definidos no editor; completa os que faltam na ordem da lista
  const taken = {};
  db.drivers.forEach(d => {
    if (!d.team) { d.seat = null; return; }
    taken[d.team] = taken[d.team] || {};
    if ((d.seat === 1 || d.seat === 2) && !taken[d.team][d.seat]) taken[d.team][d.seat] = d.id;
    else if (d.seat !== 'R') d.seat = undefined;
  });
  db.drivers.forEach(d => {
    if (!d.team || d.seat !== undefined) return;
    const t = taken[d.team];
    if (!t[1]) { t[1] = d.id; d.seat = 1; } else if (!t[2]) { t[2] = d.id; d.seat = 2; } else d.seat = 'R';
  });
  db.drivers.forEach(d => {
    d.morale = d.morale ?? 70;
    d.injured = 0;
    d.career = d.career || { starts: 0, wins: 0, podiums: 0, poles: 0, titles: 0, points: 0 };
  });
  // variação inicial: cada carreira começa um pouco diferente
  if (opts.variance !== 0) {
    const v = opts.variance ?? 1;
    db.teams.forEach(t => {
      t.car.aero = Math.round(clamp(t.car.aero + RNG.normal(0, 1.6 * v), 50, 105));
      t.car.chassis = Math.round(clamp(t.car.chassis + RNG.normal(0, 1.6 * v), 50, 105));
      t.car.reliability = Math.round(clamp(t.car.reliability + RNG.normal(0, 2 * v), 50, 99));
    });
    db.drivers.forEach(d => { d.pace = Math.round(clamp(d.pace + RNG.normal(0, 0.8 * v), 40, 99)); });
  }
  const obs = opts.mode === 'observer';
  db.drivers.forEach(d => { d.history = d.history || []; });
  db.teams.forEach(t => { t.history = t.history || []; });
  const team = obs ? null : byId(db.teams, opts.teamId);
  const G = {
    version: SAVE_VERSION, seed, createdAt: Date.now(), savedAt: null, mode: obs ? 'observer' : 'manager',
    log: [], archive: [],
    player: { name: opts.name || (obs ? 'Observador' : 'Chefe de Equipe'), nat: opts.nat || 'BRA', teamId: obs ? null : opts.teamId, fired: false, careerWins: 0, titles: 0 },
    options: { aiEvents: opts.aiEvents !== false, eventRate: opts.eventRate ?? 1, difficulty: opts.difficulty || 'normal', rainMult: opts.rainMult ?? 1, categories: opts.categories !== false, practiceFormat: opts.practiceFormat || 'real' },
    db,
    season: null, history: [],
    finances: { balance: obs ? 0 : Math.round(team.budget * 0.32), ledger: [], spent: 0 },
    sponsors: [], projects: [], nextYearFocus: 0, nextYearBank: 0,
    board: { confidence: 62, target: 8 },
    inbox: [], news: [], weekend: null, lastRace: null,
    staffMarket: [], juniorPool: [],
    seq: 1,
  };
  AI.init(G);
  if (obs) {
    Career.startSeason(G, true);
    Career.initPeople(G);
    Career.mail(G, { from: 'Paddock', tag: 'market', title: `Temporada ${G.season.year}: você é o observador`, body: `As ${db.teams.length} equipes são administradas pelos próprios chefes de equipe: pilotos, contratos, desenvolvimento, finanças e estratégias. Acompanhe as corridas, as tabelas, as notícias e o registro do universo. Use "Avançar" na Central para seguir o campeonato.` });
    Career.record(G, 'inicio', `Universo criado em modo Observador (semente ${seed}).`);
    G.rngState = RNG.state;
    return G;
  }
  team.principal = G.player.name;
  Career.startSeason(G, true);
  Career.initPeople(G);
  G.sponsors = Career.genSponsors(G, team, 3);
  Career.record(G, 'inicio', `${G.player.name} assume a ${team.name} (semente ${seed}).`, { teams: [team.id] });
  Career.mail(G, {
    from: 'Diretoria', tag: 'board',
    title: `Bem-vindo à ${team.name}`,
    body: `A diretoria confia em você para liderar a ${team.name} na temporada ${G.season.year}. Nosso objetivo é terminar o Mundial de Construtores em ${ordinal(G.board.target)} lugar ou melhor. Cuide das finanças, desenvolva o carro e tire o máximo dos pilotos.`,
  });
  Career.news(G, `${G.player.name} é o novo chefe de equipe da ${team.name}`, 'mercado');
  G.rngState = RNG.state;
  return G;
};

Career.nextId = (G, p) => `${p}${G.seq++}`;
/* funcionários, academias e mercado (módulos staff.js e market.js) */
Career.initPeople = (G) => {
  G.db.drivers.forEach(d => { d.sl = d.sl || []; });
  Staff.init(G);
  Market.initAcademies(G);
  Market.state(G);
  Staff.refreshMarket(G);
  if (typeof Cats !== 'undefined' && G.options.categories !== false) Cats.init(G);
};
Career.isObs = (G) => G.mode === 'observer';

/* Registro permanente do universo: toda decisão relevante entra aqui */
Career.LOG_TYPES = {
  inicio: 'Início', contrato: 'Contrato', rescisao: 'Saída', staff: 'Staff', pd: 'Desenvolvimento', patrocinio: 'Patrocínio',
  decisao: 'Decisão', corrida: 'Corrida', titulo: 'Título', aposentadoria: 'Aposentadoria', regulamento: 'Regulamento',
  financas: 'Finanças', novato: 'Novatos', diretoria: 'Diretoria',
};
Career.record = (G, type, text, refs = {}) => {
  G.log = G.log || [];
  G.log.push({ id: G.seq++, y: refs.year || (G.season ? G.season.year : 0), r: G.season ? G.season.round : 0, t: type, txt: text, tm: refs.teams || undefined, dr: refs.drivers || undefined });
};

Career.mail = (G, m) => {
  G.inbox.unshift({ id: Career.nextId(G, 'm'), read: false, round: G.season ? G.season.round : 0, year: G.season ? G.season.year : 0, ...m });
  if (G.inbox.length > 120) G.inbox.length = 120;
};
Career.news = (G, title, tag = 'geral', body = '', refs) => {
  const n = { id: Career.nextId(G, 'n'), title, tag, body, round: G.season ? G.season.round : 0, year: G.season ? G.season.year : 0 };
  if (refs && refs.main) n.main = true;
  if (typeof Media !== 'undefined') Media.decorate(G, n, refs || {});
  G.news.unshift(n);
  if (G.news.length > 150) G.news.length = 150;
};

Career.ledger = (G, desc, amount, cat = 'geral') => {
  G.finances.balance = +(G.finances.balance + amount).toFixed(3);
  if (amount < 0 && cat !== 'salário' && cat !== 'motor') G.finances.spent += -amount;
  G.finances.ledger.unshift({ year: G.season.year, round: G.season.round, desc, amount: +amount.toFixed(3), cat });
  if (G.finances.ledger.length > 200) G.finances.ledger.length = 200;
};

/* ---------- utilidades de consulta ---------- */
Career.team = (G, id) => byId(G.db.teams, id || G.player.teamId);
Career.driver = (G, id) => byId(G.db.drivers, id);
Career.track = (G, id) => byId(G.db.tracks, id);
Career.teamDrivers = (G, tid) => G.db.drivers.filter(d => d.team === tid);
Career.lineup = (G, tid) => {
  const ds = Career.teamDrivers(G, tid);
  const seats = [1, 2].map(s => ds.find(d => d.seat === s));
  return seats.map((d, i) => {
    if (d && !d.injured) return d;
    const res = ds.find(x => x.seat === 'R' && !x.injured);
    if (res) return res;
    // sem reserva: pega o melhor piloto livre temporariamente
    const free = G.db.drivers.filter(x => !x.team && !x.retired && !x.injured && !seats.includes(x)).sort((a, b) => driverOverall(b) - driverOverall(a));
    return free[i] || free[0] || d;
  }).filter(Boolean);
};
Career.grid = (G) => G.db.teams.flatMap(t => Career.lineup(G, t.id).map(d => ({ d, t })));

Career.ctx = (G) => {
  const db = G.db;
  const wk = G.weekend;
  const track = Career.track(G, wk ? wk.trackId : G.season.calendar[G.season.round]);
  const map = {};
  db.drivers.forEach(d => (map[d.id] = d));
  const effCache = {};
  return {
    db, track, weather: wk ? wk.weather : null,
    effOf: (did) => effCache[did] || (effCache[did] = Engine.eff(map[did])),
    nameOf: (did) => (map[did] ? (map[did].lastName || map[did].name.replace(/\s+(Jr\.?|Sr\.?)$/i, '').split(' ').slice(-1)[0]) : did),
  };
};

/* expectativa de força de cada equipe */
Career.teamStrength = (G, t) => {
  const ds = Career.lineup(G, t.id);
  return Engine.carRating(G.db, t) * 0.75 + avg(ds.map(driverOverall)) * 0.25;
};
Career.expectedRanks = (G) => {
  const arr = G.db.teams.map(t => ({ id: t.id, s: Career.teamStrength(G, t) })).sort((a, b) => b.s - a.s);
  const r = {}; arr.forEach((x, i) => (r[x.id] = i + 1)); return r;
};

/* ---------- temporada ---------- */
Career.startSeason = (G, first = false) => {
  const year = G.season ? G.season.year + 1 : G.db.rules.startYear;
  if (typeof Regs !== 'undefined') { Regs.ensure(G.db.rules); const v = Regs.applyVersion(G, year); if (v && v.reset) G.db.teams.forEach(t => { t.car.aero = +(82 + (t.car.aero - 82) * 0.45 + RNG.normal(0, 2.6)).toFixed(2); t.car.chassis = +(82 + (t.car.chassis - 82) * 0.45 + RNG.normal(0, 2.6)).toFixed(2); }); }
  const calendar = (G.db.calendar && G.db.calendar.length ? G.db.calendar : G.db.tracks.map(t => t.id)).filter(id => Career.track(G, id));
  G.season = {
    year, round: 0, calendar, results: [],
    standD: {}, standC: {}, stats: {},
  };
  G.db.drivers.forEach(d => (G.season.stats[d.id] = { starts: 0, wins: 0, podiums: 0, poles: 0, dnfs: 0, fl: 0, points: 0, best: null, sumPos: 0, finishes: 0, beatMate: 0 }));
  G.db.teams.forEach(t => (G.season.standC[t.id] = 0));
  G.db.drivers.filter(d => d.team && d.seat !== 'R').forEach(d => (G.season.standD[d.id] = 0));
  G.finances.spent = 0;
  if (typeof Cats !== 'undefined' && !first && Cats.on(G)) Cats.startSeason(G, year);
  if (Career.isObs(G)) { if (G.db.teams[0].staffList) Staff.refreshMarket(G); return; }
  const ranks = Career.expectedRanks(G);
  const exp = ranks[G.player.teamId];
  G.board.target = clamp(exp - (RNG.chance(0.5) ? 1 : 0), 1, G.db.teams.length);
  G.board.expected = exp;
  if (!first) {
    Career.mail(G, { from: 'Diretoria', tag: 'board', title: `Objetivos para ${year}`, body: `Para a temporada ${year} esperamos terminar em ${ordinal(G.board.target)} no Mundial de Construtores. Confiança atual da diretoria: ${Math.round(G.board.confidence)}%.` });
  }
  if (G.db.teams[0].staffList) Staff.refreshMarket(G);
};

Career.currentTrack = (G) => Career.track(G, G.season.calendar[G.season.round]);
Career.seasonOver = (G) => G.season.round >= G.season.calendar.length;

/* ---------- fim de semana ---------- */
Career.startWeekend = (G) => {
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
  G.db.teams.forEach(t => (wk.form[t.id] = +(localRngNormal(G.seed + ':' + G.season.year + ':' + t.id + ':' + track.id) * 1.3 + RNG.normal(0, 0.5)).toFixed(2)));
  G.db.drivers.forEach(d => (wk.dform[d.id] = +(RNG.normal(0, 1.5) * (1.25 - d.consistency / 130)).toFixed(2)));
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
  wk.phase = 'quali';
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

Career.runQualifying = (G) => {
  const wk = G.weekend;
  const ctx = Career.ctx(G);
  const q = Engine.runQualifying({ ...ctx, weather: wk.weather }, Career.entries(G, 'quali'));
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
  if (wk.sprint && !wk.sprintResult) Career.runSprint(G);
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
  const order = rev ? [...wk.quali.order.slice(0, rev).reverse(), ...wk.quali.order.slice(rev)] : wk.quali.order;
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
    events: race.events,
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
  const tvShare = team.budget * 0.36 / races;
  Career.ledger(G, `Direitos comerciais — ${track.gp}`, tvShare, 'receita');
  G.sponsors.forEach(s => {
    Career.ledger(G, `Patrocínio: ${s.name}`, s.perRace * Staff.commercialMul(team), 'receita');
    report.money += s.perRace;
    const met = Career.sponsorObjectiveMet(s, my);
    s.satisfaction = clamp((s.satisfaction ?? 70) + (met ? 4 : -3), 0, 100);
    if (met && s.bonus) { Career.ledger(G, `Bônus de ${s.name} (objetivo cumprido)`, s.bonus, 'receita'); report.lines.push(`${s.name} pagou bônus de ${fmtMoney(s.bonus)}.`); }
  });
  const myPts = sum(my.map(r => r.pts));
  if (myPts > 0) Career.ledger(G, 'Prêmio por pontos', myPts * 0.09, 'receita');
  const sal = sum(Career.teamDrivers(G, team.id).map(d => d.salary)) / races;
  Career.ledger(G, 'Salários dos pilotos', -sal, 'salário');
  const staffCost = Staff.payroll(team) / races;
  Career.ledger(G, 'Folha da equipe técnica', -staffCost, 'salário');
  Career.ledger(G, `Logística e operação — ${track.gp}`, -(1.25 + team.facilities * 0.006 + (track.street ? 0.2 : 0)) * Staff.opsMul(team), 'operação');
  const legKm = CircuitGen.legKm(G);
  if (legKm) Career.ledger(G, `Frete e viagem (${legKm.toLocaleString('pt-BR')} km)`, -CircuitGen.freight(legKm) * Staff.opsMul(team), 'operação');
  Career.ledger(G, 'Arrendamento de motor', -(Engine.engineOf(G.db, team).cost / races), 'motor');
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
Career.genSponsors = (G, team, n) => {
  const used = new Set(G.sponsors.map(s => s.name));
  const own = (team.sponsors || []).filter(x => !used.has(x));
  const out = [];
  for (let i = 0; i < n; i++) {
    const pool = own.filter(x => !used.has(x)).length ? own.filter(x => !used.has(x)) : Career.SPONSOR_POOL.filter(x => !used.has(x));
    const name = own.length && !used.has(own[0]) ? own[0] : RNG.pick(pool);
    used.add(name);
    out.push(Career.makeSponsor(G, team, name));
  }
  return out;
};
Career.makeSponsor = (G, team, name, tier) => {
  const rep = team.reputation;
  const exp = Career.expectedRanks(G)[team.id];
  const objs = exp <= 3 ? ['podium', 'top5', 'top10both'] : exp <= 6 ? ['top5', 'top10both', 'points'] : ['points', 'finish', 'top10both'];
  const objective = RNG.pick(objs);
  const perRace = +((team.budget * 0.62 / 24 / 3) * RNG.range(0.7, 1.3) * (tier || 1)).toFixed(2);
  return { id: Career.nextId(G, 's'), name, perRace, objective, bonus: +(perRace * RNG.range(0.3, 0.7)).toFixed(2), seasons: RNG.int(1, 3), satisfaction: 70 };
};

/* ---------- P&D ---------- */
/* áreas de P&D: campo afetado, staff responsável (cargo), multiplicador e impacto na confiabilidade */
Career.AREAS = {
  aero: { name: 'Aerodinâmica geral', staff: 'aero', role: 'aero', field: 'aero', aeroReg: true, rel: -0.1 },
  floor: { name: 'Assoalho', staff: 'aero', role: 'aero', field: 'aero', mul: 1.15, aeroReg: true, rel: -0.15 },
  wings: { name: 'Asas dianteira e traseira', staff: 'aero', role: 'aero', field: 'aero', mul: 0.9, aeroReg: true },
  chassis: { name: 'Chassi', staff: 'engineering', role: 'chiefEngineer', field: 'chassis', atr: true },
  suspension: { name: 'Suspensão', staff: 'engineering', role: 'chiefEngineer', field: 'chassis', mul: 0.9, atr: true },
  weight: { name: 'Redução de peso', staff: 'engineering', role: 'engineeringDir', field: 'chassis', mul: 0.7, rel: -0.2 },
  brakes: { name: 'Sistema de freios', staff: 'technical', role: 'engineeringDir', field: 'chassis', mul: 0.5, rel: 0.25 },
  cooling: { name: 'Refrigeração', staff: 'technical', role: 'technical', field: 'cooling', rel: 0.3 },
  engine: { name: 'Motor (unidade de potência)', staff: 'technical', role: 'engine', field: 'engineBonus', mul: 0.5, works: true, rel: -0.2 },
  gearbox: { name: 'Câmbio', staff: 'technical', role: 'engineeringDir', field: 'reliability', mul: 0.8, chassisToo: 0.2 },
  energy: { name: 'Eficiência energética', staff: 'technical', role: 'engine', field: 'energy' },
  reliability: { name: 'Confiabilidade', staff: 'technical', role: 'technical', field: 'reliability' },
  tyreCare: { name: 'Gestão térmica de pneus', staff: 'engineering', role: 'performance', field: 'tyreCare' },
  pitCrew: { name: 'Treino de pit stop', staff: 'technical', role: 'chiefMechanic', field: 'pitCrew', team: true },
  facilities: { name: 'Instalações (túnel, simulador)', staff: 'technical', role: 'operations', field: 'facilities', team: true },
};
Career.carVal = (t, A) => A.team ? t[A.field] : A.field === 'engineBonus' ? (t.car.engineBonus || 0) + 85 : (t.car[A.field] ?? 80);
Career.SIZES = {
  small: { name: 'Pequeno', cost: 2.8, races: 2, min: 0.2, max: 0.65 },
  medium: { name: 'Médio', cost: 6.5, races: 4, min: 0.55, max: 1.45 },
  large: { name: 'Grande', cost: 13, races: 7, min: 1.3, max: 3.0 },
};
Career.slots = (team) => 1 + Math.floor(team.facilities / 32);
/* custos de P&D acompanham o teto orçamentário do regulamento (referência: US$ 145 mi) */
Career.costScale = (G) => clamp((G.db.rules.budgetCap || 145) / 145, 0.4, 4);

Career.projectQuote = (G, area, size) => {
  const team = Career.team(G);
  const A = Career.AREAS[area], S = Career.SIZES[size];
  const staffR = team.staffList && A.role ? Staff.r(team, A.role, team.staff[A.staff]) : team.staff[A.staff];
  const staffP = team.staffList && A.role ? Staff.get(team, A.role) : null;
  const cur = Career.carVal(team, A);
  const ref = avg(G.db.teams.map(t => Career.carVal(t, A)));
  const dimin = clamp(1 - (cur - ref) / 50, 0.55, 1.2);
  const atr = (A.aeroReg || A.atr) && typeof Regs !== 'undefined' ? Regs.atrFactor(G, team.id) : 1;
  const aeroReg = A.aeroReg && typeof Regs !== 'undefined' ? Regs.aeroMul(G) : 1;
  const sk = (0.45 + staffR / 100 * 0.75) * (0.8 + team.facilities / 250) * atr * aeroReg * (A.mul || 1);
  const costMul = area === 'facilities' ? 1.8 : area === 'pitCrew' ? 0.6 : area === 'engine' ? 1.4 : 1;
  return {
    area, size, name: `${A.name} — pacote ${S.name.toLowerCase()}`,
    cost: +(S.cost * costMul * Career.costScale(G)).toFixed(1), races: S.races + (area === 'facilities' ? 2 : 0),
    min: +(S.min * sk * dimin).toFixed(2), max: +(S.max * sk * dimin).toFixed(2),
    risk: Math.round(clamp(18 - staffR / 8 + (size === 'large' ? 6 : 0) + (A.rel < 0 ? 3 : 0), 3, 32)),
    staffName: staffP ? staffP.name : null, rel: A.rel || 0, atr: +(atr * 100).toFixed(0), blocked: A.works && !team.works ? 'Só equipes de fábrica desenvolvem o motor.' : null,
  };
};
Career.startProject = (G, area, size) => {
  const team = Career.team(G);
  if (G.projects.length >= Career.slots(team)) return 'Sem vagas de projeto. Aumente as instalações ou termine um projeto.';
  const q = Career.projectQuote(G, area, size);
  if (q.blocked) return q.blocked;
  if (G.finances.spent + q.cost > G.db.rules.budgetCap) return `O projeto estouraria o teto orçamentário (${fmtMoney(G.db.rules.budgetCap)}).`;
  if (G.finances.balance - q.cost < -15) return 'Caixa insuficiente para este projeto.';
  Career.ledger(G, `P&D: ${q.name}`, -q.cost, 'P&D');
  Career.record(G, 'pd', `${team.name} iniciou o projeto "${q.name}" (${fmtMoney(q.cost)}, ${q.races} GPs).`, { teams: [team.id] });
  G.projects.push({ id: Career.nextId(G, 'p'), ...q, left: q.races, total: q.races });
  return null;
};

Career.advanceProjects = (G, report) => {
  const team = Career.team(G);
  const focus = (G.nextYearFocus || 0) / 100;
  G.projects.forEach(p => p.left--);
  const done = G.projects.filter(p => p.left <= 0);
  G.projects = G.projects.filter(p => p.left > 0);
  done.forEach(p => {
    const A = Career.AREAS[p.area];
    let gain = RNG.range(p.min, p.max);
    const failed = RNG.chance(p.risk / 100);
    if (failed) gain = RNG.range(-0.4, p.min * 0.4);
    let now = gain, bank = 0;
    if (A.field === 'aero' || A.field === 'chassis') { now = gain * (1 - focus); bank = gain * focus * 1.35; }
    G.nextYearBank += bank;
    if (A.team) team[A.field] = +clamp(team[A.field] + now * (A.field === 'facilities' ? 1.6 : 1.4), 30, 100).toFixed(1);
    else if (A.field === 'engineBonus') team.car.engineBonus = +((team.car.engineBonus || 0) + now).toFixed(2);
    else team.car[A.field] = +clamp((team.car[A.field] ?? 80) + now, 30, ['reliability', 'tyreCare', 'cooling', 'energy'].includes(A.field) ? 99 : 110).toFixed(2);
    if (A.chassisToo) team.car.chassis = +(team.car.chassis + now * A.chassisToo).toFixed(2);
    if (A.rel && !failed) team.car.reliability = +clamp(team.car.reliability + A.rel * Career.SIZES[p.size].races / 2, 40, 99).toFixed(2);
    const txt = failed
      ? `O projeto "${p.name}" decepcionou: ganho de apenas ${now.toFixed(2)} ponto(s).`
      : `Projeto "${p.name}" concluído: +${now.toFixed(2)} em ${A.name.toLowerCase()}${bank ? ` (+${bank.toFixed(2)} guardado para o carro do ano que vem)` : ''}.`;
    report && report.lines.push(txt);
    Career.record(G, 'pd', `${team.name}: ${txt}`, { teams: [team.id] });
    Career.mail(G, { from: 'Diretor técnico', tag: 'dev', title: failed ? 'Atualização abaixo do esperado' : 'Atualização pronta', body: txt });
  });
};

/* ---------- evolução dos pilotos ---------- */
Career.ATTRS_GROW = ['pace', 'qualifying', 'racecraft', 'consistency', 'tyre', 'wet', 'overtaking', 'defending', 'start', 'energy', 'adaptability', 'concentration', 'feedback'];
Career.driverGrowth = (G) => {
  G.db.drivers.forEach(d => {
    if (d.age < 27 && driverOverall(d) < d.potential) {
      const k = RNG.pick(Career.ATTRS_GROW);
      const g = RNG.range(0, 0.55) * (d.team ? 1.2 : d.cat ? 0.9 : 0.6) * (d.age < 23 ? 1.3 : 1);
      d[k] = +clamp(d[k] + g, 30, 99).toFixed(2);
    }
    d.experience = clamp(+(d.experience + (d.team && d.seat !== 'R' ? 0.35 : 0.08)).toFixed(2), 1, 99);
  });
};

/* ---------- staff ---------- */
Career.STAFF_ROLES = { technical: 'Diretor técnico', aero: 'Chefe de aerodinâmica', engineering: 'Engenheiro-chefe de pista', strategy: 'Chefe de estratégia' };
Career.refreshStaffMarket = (G) => {
  G.staffMarket = [];
  Object.keys(Career.STAFF_ROLES).forEach(role => {
    for (let i = 0; i < 2; i++) {
      const rating = Math.round(clamp(RNG.normal(80, 8), 60, 98));
      G.staffMarket.push({ id: Career.nextId(G, 'st'), role, name: randomName(RNG.pick(NATS)), rating, fee: +(Math.max(0.5, (rating - 60) * 0.18)).toFixed(1) });
    }
  });
};
Career.hireStaff = (G, sid) => {
  const s = G.staffMarket.find(x => x.id === sid);
  if (!s) return 'Profissional indisponível.';
  if (G.finances.balance < s.fee) return 'Caixa insuficiente para a multa de contratação.';
  const team = Career.team(G);
  Career.ledger(G, `Contratação: ${s.name} (${Career.STAFF_ROLES[s.role]})`, -s.fee, 'staff');
  team.staff[s.role] = s.rating;
  team.staffNames = team.staffNames || {};
  team.staffNames[s.role] = s.name;
  G.staffMarket = G.staffMarket.filter(x => x.id !== sid);
  Career.news(G, `${team.name} contrata ${s.name} como ${Career.STAFF_ROLES[s.role].toLowerCase()}`, 'mercado');
  Career.record(G, 'staff', `${team.name} contratou ${s.name} (${Career.STAFF_ROLES[s.role]}, nível ${s.rating}) por ${fmtMoney(s.fee)}.`, { teams: [team.id] });
  return null;
};

/* ---------- mercado de pilotos ---------- */
Career.marketValue = (d) => {
  const ovr = driverOverall(d);
  const ageF = d.age < 24 ? 1.15 : d.age > 32 ? 0.75 : 1;
  return +Math.max(0.5, Math.pow(Math.max(0, ovr - 70) / 25, 2.4) * 40 * ageF + (d.potential - ovr) * 0.15).toFixed(1);
};
Career.offerEval = (G, d, salary, years, role) => {
  const team = Career.team(G);
  const val = Career.marketValue(d);
  const strength = Career.teamStrength(G, team);
  const theirTeam = d.team ? Career.team(G, d.team) : null;
  const theirStrength = theirTeam ? Career.teamStrength(G, theirTeam) : 70;
  let score = (salary / Math.max(0.5, val)) * 50 + (strength - theirStrength) * 3 + team.reputation * 0.25 - (role === 'R' ? 25 : 0) + (d.morale < 45 && d.team ? 15 : 0);
  if (!d.team) score += 15;
  if (years >= 3 && d.age > 30) score += 6;
  if (years >= 3 && d.age < 24) score -= 5;
  const p = clamp(1 / (1 + Math.exp(-(score - 55) / 8)), 0.02, 0.97);
  return { p, val, buyout: d.team && d.contractYears > 0 ? +(d.salary * d.contractYears * 0.8 + 1).toFixed(1) : 0 };
};
Career.makeOffer = (G, did, salary, years, role, immediate) => {
  const d = Career.driver(G, did);
  const team = Career.team(G);
  if (d.team === team.id) return { ok: false, msg: 'Este piloto já é seu.' };
  if (G.offersThisRound && G.offersThisRound[did]) return { ok: false, msg: `${d.name} já respondeu uma proposta nesta rodada. Tente após a próxima corrida.` };
  G.offersThisRound = G.offersThisRound || {}; G.offersThisRound[did] = true;
  const ev = Career.offerEval(G, d, salary, years, role);
  const buyout = immediate ? ev.buyout : 0;
  if (buyout && G.finances.balance < buyout) return { ok: false, msg: `Multa rescisória de ${fmtMoney(buyout)} acima do seu caixa.` };
  if (!RNG.chance(ev.p)) {
    Career.news(G, `${d.name} recusa proposta da ${team.name}`, 'mercado');
    return { ok: false, msg: `${d.name} recusou a proposta (chance era de ${Math.round(ev.p * 100)}%).` };
  }
  if (immediate || !d.team) {
    if (buyout) Career.ledger(G, `Multa rescisória: ${d.name}`, -buyout, 'mercado');
    Career.placeDriver(G, d, team.id, role, salary, years);
    Career.news(G, `${d.name} assina com a ${team.name}`, 'mercado');
    return { ok: true, msg: `${d.name} assinou! Contrato de ${years} ano(s) por ${fmtMoney(salary)}/ano.` };
  }
  d.futureTeam = { team: team.id, role, salary, years };
  Career.news(G, `${d.name} acerta com a ${team.name} para a próxima temporada`, 'mercado');
  return { ok: true, msg: `${d.name} assinou pré-contrato para ${G.season.year + 1}.` };
};
Career.placeDriver = (G, d, tid, role, salary, years) => {
  // role: 1, 2 ou 'R' — quem ocupa o assento vira reserva ou é dispensado
  const occupant = G.db.drivers.find(x => x.team === tid && x.seat === role && x.id !== d.id);
  if (occupant) {
    const hasRes = G.db.drivers.some(x => x.team === tid && x.seat === 'R' && x.id !== d.id);
    if (role !== 'R' && !hasRes) occupant.seat = 'R'; else { occupant.team = null; occupant.seat = null; }
  }
  if (d.team && d.team !== tid) {
    // libera assento antigo — equipe IA puxa reserva ou livre
    const old = d.team, oldSeat = d.seat;
    d.team = null;
    if (oldSeat !== 'R') Career.aiFillSeat(G, old, oldSeat);
  }
  const prevTeam = d.team && d.team !== tid ? d.team : null;
  d.team = tid; d.seat = role; d.salary = salary; d.contractYears = years; d.morale = clamp(d.morale + 8, 0, 100);
  d.contract = { until: G.season.year + years, salary: +(+salary).toFixed(2), signed: { y: G.season.year, r: G.season.round }, loanFrom: (() => { const ac = typeof Market !== 'undefined' && Market.academyOf(G, d); return ac && ac.team !== tid ? ac.team : null; })() };
  d.transfers = d.transfers || [];
  d.transfers.push({ y: G.season.year, r: G.season.round, to: tid, from: prevTeam, salary: +(+salary).toFixed(2), until: G.season.year + years });
  Career.record(G, 'contrato', `${d.name} assinou com a ${Career.team(G, tid).name} até ${G.season.year + years} (${role === 'R' ? 'reserva' : 'carro #' + role}, ${fmtMoney(salary)}/ano).`, { teams: [tid], drivers: [d.id] });
  if (G.season.standD[d.id] == null && role !== 'R') G.season.standD[d.id] = 0;
};
Career.aiFillSeat = (G, tid, seat) => {
  const team = Career.team(G, tid);
  const ok = (x) => typeof Market === 'undefined' || Market.slEligible(G, x);
  const res = G.db.drivers.find(x => x.team === tid && x.seat === 'R' && ok(x));
  if (res) { res.seat = seat; if (G.season.standD[res.id] == null) G.season.standD[res.id] = 0; Career.record(G, 'contrato', `${team.name} promoveu o reserva ${res.name} ao carro #${seat}.`, { teams: [tid], drivers: [res.id] }); return res; }
  const free = G.db.drivers.filter(x => !x.team && !x.retired && !x.retiring && !x.futureTeam && ok(x));
  const budget = typeof Market !== 'undefined' ? Market.driverBudget(G, team) : team.budget * 0.2;
  const score = (x) => (typeof Market !== 'undefined' ? Market.candidateScore(G, team, x) : driverOverall(x)) - Math.max(0, (typeof Market !== 'undefined' ? Market.ask(x) : Career.marketValue(x)) - budget) * 0.2;
  let pickD = free.sort((a, b) => score(b) - score(a))[0];
  if (!pickD && typeof Market !== 'undefined') {
    // ninguém elegível livre: a FIA concede superlicença ao livre com mais pontos (situação excepcional)
    pickD = G.db.drivers.filter(x => !x.team && !x.retired && !x.retiring && !x.futureTeam && x.age >= 18).sort((a, b) => Market.slPoints(G, b) - Market.slPoints(G, a) || driverOverall(b) - driverOverall(a))[0];
    if (pickD) { pickD.slEligible = true; Career.record(G, 'decisao', `A FIA concedeu superlicença excepcional a ${pickD.name} (${Market.slPoints(G, pickD)} pontos) para a ${team.name}.`, { teams: [tid], drivers: [pickD.id] }); }
  }
  if (!pickD) return null;
  const ac = typeof Market !== 'undefined' ? Market.academyOf(G, pickD) : null;
  const salary = +Math.max(0.6, (typeof Market !== 'undefined' ? Market.ask(pickD) : Career.marketValue(pickD)) * 0.85).toFixed(2);
  Career.placeDriver(G, pickD, tid, seat, salary, RNG.int(0, 1));
  Career.news(G, `${team.name} anuncia ${pickD.name}`, 'mercado');
  Career.record(G, 'contrato', `Motivo da escolha de ${pickD.name} pela ${team.name}: ${ac && (ac.team === tid || (team.partnerOf || []).includes(ac.team)) ? `piloto da ${ac.name}` : 'melhor piloto livre dentro do orçamento'} (nota ${driverOverall(pickD)}).`, { teams: [tid], drivers: [pickD.id] });
  return pickD;
};
Career.releaseDriver = (G, did) => {
  const d = Career.driver(G, did);
  const team = Career.team(G);
  if (d.team !== team.id) return 'Piloto não é da sua equipe.';
  const racing = G.db.drivers.filter(x => x.team === team.id && x.seat !== 'R');
  const cost = +(d.salary * Math.max(0, d.contractYears) * 0.5).toFixed(1);
  if (G.finances.balance < cost) return `Rescisão custa ${fmtMoney(cost)} — caixa insuficiente.`;
  if (cost) Career.ledger(G, `Rescisão: ${d.name}`, -cost, 'mercado');
  const seat = d.seat;
  d.team = null; d.seat = null; d.morale = 50;
  if (seat !== 'R') {
    const filled = Career.aiFillSeat(G, team.id, seat);
    if (filled) Career.mail(G, { from: 'Diretor esportivo', tag: 'team', title: 'Assento preenchido', body: `${filled.name} assume o carro #${seat} até você contratar outro piloto.` });
  }
  Career.news(G, `${team.name} dispensa ${d.name}`, 'mercado');
  Career.record(G, 'rescisao', `${team.name} dispensou ${d.name} (rescisão de ${fmtMoney(cost)}).`, { teams: [team.id], drivers: [d.id] });
  return null;
};
Career.setSeat = (G, did, seat) => {
  const team = Career.team(G);
  const d = Career.driver(G, did);
  if (d.team !== team.id) return;
  const other = G.db.drivers.find(x => x.team === team.id && x.seat === seat && x.id !== did);
  if (other) other.seat = d.seat;
  d.seat = seat;
  [d, other].forEach(x => { if (x && x.seat !== 'R' && G.season.standD[x.id] == null) G.season.standD[x.id] = 0; });
};

/* ---------- fim de temporada ---------- */
Career.standingsD = (G, season = G.season) => Object.entries(season.standD).map(([did, pts]) => ({ did, pts, st: season.stats[did] || {} }))
  .sort((a, b) => b.pts - a.pts || (b.st.wins || 0) - (a.st.wins || 0) || (b.st.podiums || 0) - (a.st.podiums || 0) || (a.st.best || 99) - (b.st.best || 99));
Career.standingsC = (G, season = G.season) => Object.entries(season.standC).map(([tid, pts]) => ({ tid, pts })).sort((a, b) => b.pts - a.pts);

Career.endSeason = (G) => {
  const s = G.season;
  const sd = Career.standingsD(G), sc = Career.standingsC(G);
  const champ = Career.driver(G, sd[0].did), champT = Career.team(G, sc[0].tid);
  champ.career.titles++;
  const obs = Career.isObs(G);
  const myPos = obs ? 0 : sc.findIndex(x => x.tid === G.player.teamId) + 1;
  const team = obs ? null : Career.team(G);
  Career.archiveSeason(G, sd, sc);
  Career.record(G, 'titulo', `${s.year}: ${champ.name} é campeão de pilotos (${sd[0].pts} pts); ${champT.name} campeã de construtores (${sc[0].pts} pts).`, { drivers: [champ.id], teams: [champT.id], year: s.year });
  const summary = {
    year: s.year, champion: champ.id, championName: champ.name, championTeam: champ.team, constructor: champT.id, constructorName: champT.name,
    playerTeam: team ? team.id : null, playerPos: myPos, target: G.board.target, standD: sd.slice(0, 10), standC: sc,
    wins: team ? sum(s.results.map(r => r.cls.filter(c => c.tid === team.id && c.pos === 1).length)) : 0,
  };
  if (team && sc[0].tid === team.id) G.player.titles++;
  G.history.push(summary);
  if (typeof Media !== 'undefined') Media.seasonEnd(G, summary);
  AI.seasonEnd(G, sc);
  if (team) {
    const prize = (G.db.rules.prizePerPosition[myPos - 1] || 8) * 1;
    Career.ledger(G, `Premiação do Mundial (${ordinal(myPos)} lugar)`, prize, 'receita');
    const delta = (G.board.target - myPos) * 9 + (myPos <= G.board.target ? 8 : -6);
    G.board.confidence = clamp(G.board.confidence + delta, 0, 100);
  }
  // reputação e orçamento de todas as equipes
  sc.forEach((x, i) => {
    const t = Career.team(G, x.tid);
    const n = sc.length;
    t.reputation = clamp(Math.round(t.reputation * 0.8 + (100 - i * (60 / n)) * 0.2), 30, 99);
    // orçamento volta à base de cada equipe, corrigido por resultado e reputação (antes era limitado a 220 mi e apagava os orçamentos reais)
    t.baseBudget = t.baseBudget || t.budget;
    const target = t.baseBudget * (0.86 + 0.28 * (1 - i / Math.max(1, n - 1))) * (0.82 + t.reputation / 260);
    t.budget = Math.round(clamp(t.budget * 0.65 + target * 0.35 + RNG.normal(0, 6), 90, 950));
  });
  // carro do próximo ano: regressão + foco no próximo ano
  const reg = (G.history.length % (G.db.rules.regulationChangeEvery || 4)) === 0;
  summary.regChange = reg;
  if (reg) Career.record(G, 'regulamento', `Novo regulamento técnico para ${s.year + 1}: o desempenho dos carros foi aproximado e o grid embaralhado.`, { year: s.year });
  G.db.teams.forEach(t => {
    const k = reg ? 0.45 : 0.82;
    const pull = (v) => +(82 + (v - 82) * k + RNG.normal(0, reg ? 2.6 : 1.1)).toFixed(2);
    t.car.aero = pull(t.car.aero); t.car.chassis = pull(t.car.chassis);
    t.car.reliability = +clamp(t.car.reliability * 0.9 + 9 + RNG.normal(0, 1.5), 60, 97).toFixed(1);
  });
  AI.applyNextYear(G);
  if (team && G.nextYearBank > 0) { team.car.aero += G.nextYearBank * 0.55; team.car.chassis += G.nextYearBank * 0.45; summary.bankUsed = +G.nextYearBank.toFixed(2); G.nextYearBank = 0; }
  if (!(G.db.rules.regs && G.db.rules.regs.engineFreeze)) G.db.engines.forEach(e => { e.power = +clamp(e.power + RNG.normal(0.3, reg ? 2.5 : 1), 75, 100).toFixed(1); e.reliability = +clamp(e.reliability + RNG.normal(0.5, 1.4), 70, 98).toFixed(1); });
  // pilotos: idade, contratos, aposentadoria
  const retired = [];
  G.db.drivers.forEach(d => {
    if (d.retired) return;
    d.age++;
    if (d.age >= 33) Career.ATTRS_GROW.forEach(k => (d[k] = +clamp(d[k] - RNG.range(0, (d.age - 31) * 0.45), 30, 99).toFixed(2)));
    if (d.retiring) { d.retiring = false; d.retired = true; d.retiredYear = s.year; retired.push(d); }
    else if (!d.team && !d.cat && d.age >= 33 && RNG.chance(0.35 + (d.age - 33) * 0.1)) { d.retired = true; d.retiredYear = s.year; retired.push(d); }
    if (d.team) d.contractYears--;
  });
  retired.forEach(d => { Career.news(G, `${d.name} anuncia aposentadoria aos ${d.age} anos`, 'mercado'); Career.record(G, 'aposentadoria', `${d.name} se aposentou aos ${d.age} anos: ${d.career.starts} GPs, ${d.career.wins} vitórias, ${d.career.titles} títulos.`, { drivers: [d.id] }); if (d.team) { const tid = d.team, seat = d.seat; d.team = null; d.seat = null; if (seat !== 'R' && tid !== G.player.teamId) Career.aiFillSeat(G, tid, seat); else if (tid === G.player.teamId) Career.mail(G, { from: 'Diretor esportivo', tag: 'team', title: `${d.name} se aposentou`, body: 'Você precisa de um novo piloto. Veja o Mercado.' }); } });
  // pré-contratos
  G.db.drivers.filter(d => d.futureTeam).forEach(d => { const f = d.futureTeam; d.futureTeam = null; if (d.retired) return; Career.placeDriver(G, d, f.team, f.role, f.salary, Math.max(0, f.years - 1)); });
  // novatos
  const rookies = [];
  // com as categorias de base ativas, os novos talentos chegam pela F4 (ver Cats.progression)
  for (let i = 0; i < (typeof Cats !== 'undefined' && Cats.on(G) ? 0 : RNG.int(4, 6)); i++) { const r = Career.genRookie(G); G.db.drivers.push(r); rookies.push(r); }
  if (rookies.length) Career.record(G, 'novato', `Novos talentos disponíveis: ${rookies.map(r => `${r.name} (${r.nat}, ${r.age} anos, potencial ${r.potential})`).join('; ')}.`, { drivers: rookies.map(r => r.id), year: s.year });
  // academias: investimento anual
  (G.academies || []).forEach(a => {
    if (!a.active || !a.budget) return;
    if (a.team === G.player.teamId) Career.ledger(G, `Investimento na ${a.name}`, -a.budget, 'academia');
    else { const at = Career.team(G, a.team); if (at) at.cash -= a.budget; }
    a.level = Math.round(clamp(a.level + (a.budget - 5) * 0.4, 20, 99));
  });
  // outras categorias: fecha o ano (campeões e superlicença contam para o mercado da F1)
  if (typeof Cats !== 'undefined') Cats.finishYear(G);
  // mercado IA: contratos vencidos e vagas restantes
  Career.aiMarket(G);
  Market.endSeason(G);
  Staff.aiDecisions(G, 'end');
  Market.syncAcademies(G);
  // verificação final: nenhum carro fica sem piloto na temporada seguinte
  G.db.teams.forEach(t => [1, 2].forEach(seat => {
    if (G.db.drivers.some(x => x.team === t.id && x.seat === seat)) return;
    const f = Career.aiFillSeat(G, t.id, seat);
    if (f && t.id === G.player.teamId) Career.mail(G, { from: 'Diretor esportivo', tag: 'team', title: `${f.name} assume o carro #${seat}`, body: `O carro #${seat} estava sem piloto para ${G.season.year + 1}. ${f.name} foi contratado provisoriamente; você pode procurar outro nome no Mercado.` });
  }));
  if (typeof Cats !== 'undefined') Cats.progression(G);
  if (obs) { G.offersThisRound = {}; Career.startSeason(G); return summary; }
  // patrocinadores
  G.sponsors.forEach(sp => sp.seasons--);
  const leaving = G.sponsors.filter(sp => sp.seasons <= 0 && (sp.satisfaction < 60 || RNG.chance(0.4)));
  G.sponsors = G.sponsors.filter(sp => !leaving.includes(sp));
  G.sponsors.forEach(sp => { if (sp.seasons <= 0) { sp.seasons = RNG.int(1, 2); sp.perRace = +(sp.perRace * RNG.range(0.95, 1.15)).toFixed(2); } });
  leaving.forEach(sp => Career.record(G, 'patrocinio', `${sp.name} encerrou o patrocínio da ${team.name}.`, { teams: [team.id] }));
  leaving.forEach(sp => Career.mail(G, { from: 'Comercial', tag: 'money', title: `${sp.name} encerra parceria`, body: `O patrocinador ${sp.name} não renovou o contrato (satisfação ${Math.round(sp.satisfaction)}%).` }));
  if (G.sponsors.length < 3) G.sponsors.push(...Career.genSponsors(G, team, 3 - G.sponsors.length));
  // demissão por temporada ruim
  if (G.board.confidence <= 10) {
    G.player.fired = true;
    Career.mail(G, { from: 'Diretoria', tag: 'board', title: 'Fim da linha', body: 'Após uma temporada abaixo das expectativas, a diretoria decidiu não renovar com você.', action: { type: 'fired' } });
  }
  G.offersThisRound = {};
  Career.startSeason(G);
  return summary;
};

Career.genRookie = (G) => {
  const nat = RNG.chance(0.18) ? 'BRA' : RNG.pick(NATS);
  const ovr = RNG.range(68, 79);
  const pot = Math.round(clamp(ovr + RNG.range(6, 22), 75, 97));
  const style = RNG.pick(Object.keys(STYLE_PROFILES));
  const prof = STYLE_PROFILES[style];
  const a = k => Math.round(clamp(ovr + (prof[k] || 0) + RNG.range(-3, 3), 40, 95));
  return {
    id: Career.nextId(G, 'd'), name: randomName(nat), nat, age: RNG.int(18, 20), number: RNG.int(2, 99), style,
    team: null, seat: null, salary: 0.5, contractYears: 0,
    pace: a('pace'), qualifying: a('qualifying'), racecraft: a('racecraft'), consistency: a('consistency'), tyre: a('tyre'), wet: a('wet'),
    overtaking: a('overtaking'), defending: a('defending'), aggression: Math.round(clamp(50 + (prof.aggression || 0) * 2.5 + RNG.range(-10, 10), 10, 95)),
    start: a('start'), energy: a('energy'), adaptability: a('adaptability'), concentration: a('concentration'), feedback: a('feedback'),
    personality: { ambition: RNG.int(55, 95), loyalty: RNG.int(20, 70), temper: RNG.int(15, 85), media: RNG.int(10, 50) },
    experience: RNG.int(5, 18), potential: pot, morale: 75, popularity: RNG.int(5, 30), injured: 0, rookie: true, regen: true,
    // carreira de base simulada: os melhores chegam com pontos de superlicença (F2/F3)
    sl: ovr >= 74 ? [{ y: (G.season ? G.season.year : 2026) - 1, cat: 'f2', pts: ovr >= 76 ? 40 : 30 }, { y: G.season ? G.season.year : 2026, cat: 'f3', pts: 12 }] : [{ y: G.season ? G.season.year : 2026, cat: 'f3', pts: ovr >= 71 ? 20 : 7 }],
    career: { starts: 0, wins: 0, podiums: 0, poles: 0, titles: 0, points: 0 },
  };
};

Career.aiMarket = (G) => {
  const pt = G.player.teamId;
  // equipes da IA: quem não foi renovado durante a temporada (Market.tick) sai; vagas são preenchidas
  G.db.teams.forEach(t => {
    if (t.id === pt) return;
    Career.teamDrivers(G, t.id).forEach(d => {
      if (d.contractYears >= 0) return;
      const seat = d.seat; d.team = null; d.seat = null; d.contract = null;
      Career.record(G, 'rescisao', `${d.name} deixou a ${t.name} ao fim do contrato.`, { teams: [t.id], drivers: [d.id] });
      if (seat !== 'R') Career.aiFillSeat(G, t.id, seat);
    });
    [1, 2].forEach(seat => { if (!G.db.drivers.some(x => x.team === t.id && x.seat === seat)) Career.aiFillSeat(G, t.id, seat); });
  });
  // jogador: contratos vencidos viram livres, avisa
  if (!pt) return;
  Career.teamDrivers(G, pt).forEach(d => {
    if (d.contractYears < 0) {
      const seat = d.seat; d.team = null; d.seat = null;
      Career.record(G, 'rescisao', `${d.name} deixou a ${Career.team(G, pt).name} ao fim do contrato.`, { teams: [pt], drivers: [d.id] });
      Career.mail(G, { from: 'Diretor esportivo', tag: 'team', title: `${d.name} deixou a equipe`, body: `O contrato de ${d.name} terminou e ele saiu. ${seat !== 'R' ? 'Um substituto foi colocado no carro; vá ao Mercado se quiser outro nome.' : ''}` });
      if (seat !== 'R') Career.aiFillSeat(G, pt, seat);
    } else if (d.contractYears === 0) {
      Career.mail(G, { from: 'Diretor esportivo', tag: 'team', title: `Último ano de ${d.name}`, body: `${d.name} está no último ano de contrato. Renove em Equipe → Pilotos ou ele sai no fim da temporada.` });
    }
  });
};

Career.renew = (G, did, salary, years) => {
  const d = Career.driver(G, did);
  const ev = Career.offerEval(G, d, salary, years, d.seat);
  const p = clamp(ev.p + 0.25 + (d.morale - 60) / 100, 0.03, 0.98);
  G.offersThisRound = G.offersThisRound || {};
  if (G.offersThisRound[did]) return { ok: false, msg: `${d.name} quer esperar a próxima corrida para conversar de novo.` };
  G.offersThisRound[did] = true;
  if (!RNG.chance(p)) return { ok: false, msg: `${d.name} recusou a renovação (chance ${Math.round(p * 100)}%). Tente um salário maior depois da próxima corrida.` };
  d.salary = salary; d.contractYears = years; d.morale = clamp(d.morale + 5, 0, 100);
  Career.record(G, 'contrato', `${d.name} renovou com a ${Career.team(G).name} até ${G.season.year + years} (${fmtMoney(salary)}/ano).`, { teams: [G.player.teamId], drivers: [d.id] });
  return { ok: true, msg: `${d.name} renovou por ${years} ano(s).` };
};

/* Ao ser demitido: escolher nova equipe entre as piores */
Career.jobOffers = (G) => {
  const sc = Career.standingsC(G);
  return sc.slice(-4).map(x => x.tid).filter(t => t !== G.player.teamId).slice(0, 3);
};
Career.takeJob = (G, tid) => {
  const old = Career.team(G);
  old.principal = randomName(old.country);
  G.player.teamId = tid;
  G.player.fired = false;
  const team = Career.team(G);
  team.principal = G.player.name;
  G.board.confidence = 55;
  G.board.target = clamp(Career.expectedRanks(G)[tid], 1, G.db.teams.length);
  G.finances = { balance: Math.round(team.budget * 0.25), ledger: [], spent: G.finances.spent };
  G.sponsors = Career.genSponsors(G, team, 3);
  G.projects = [];
  Career.news(G, `${G.player.name} assume o comando da ${team.name}`, 'mercado');
  Career.record(G, 'diretoria', `${G.player.name} assumiu a ${team.name}.`, { teams: [team.id] });
  Career.mail(G, { from: 'Diretoria', tag: 'board', title: `Bem-vindo à ${team.name}`, body: `Nosso objetivo é terminar em ${ordinal(G.board.target)}. Boa sorte.` });
};

/* Arquiva a temporada: resultados compactos de todas as corridas e
   linha do histórico de cada piloto e equipe (nunca sobrescrito) */
Career.archiveSeason = (G, sd, sc) => {
  const s = G.season;
  G.archive = G.archive || [];
  if (G.archive.some(a => a.year === s.year)) return; // proteção contra arquivar duas vezes
  G.archive.push({
    year: s.year, series: G.db.rules.seriesName, sim: true,
    races: s.results.map(r => ({ t: r.trackId, gp: r.gp, w: r.winner, sw: r.sprint && r.sprint[0] ? r.sprint[0].did : null, p: r.pole, fl: r.fastest ? r.fastest.did : null, wet: +r.wet.toFixed(2), sc: r.sc, c: r.cls.map(c => [c.did, c.tid, c.pos, c.grid, c.pts, c.status === 'dnf' ? 1 : 0]) })),
    standD: sd.map(x => [x.did, x.pts]), standC: sc.map(x => [x.tid, x.pts]),
  });
  sd.forEach((x, i) => {
    const d = Career.driver(G, x.did); if (!d) return;
    const tids = new Set(s.results.flatMap(r => r.cls.filter(c => c.did === d.id).map(c => c.tid)));
    d.history = d.history || [];
    d.history.push({ y: s.year, series: G.db.rules.seriesName, teams: [...tids], pos: i + 1, pts: x.pts, st: x.st.starts || 0, w: x.st.wins || 0, pod: x.st.podiums || 0, pole: x.st.poles || 0, fl: x.st.fl || 0, dnf: x.st.dnfs || 0, sim: true });
  });
  sc.forEach((x, i) => {
    const t = Career.team(G, x.tid); if (!t) return;
    const rs = s.results.flatMap(r => r.cls.filter(c => c.tid === t.id));
    t.history = t.history || [];
    t.history.push({ y: s.year, name: t.name, pos: i + 1, pts: x.pts, w: rs.filter(c => c.pos === 1 && c.status === 'fin').length, pod: rs.filter(c => c.pos <= 3 && c.status === 'fin').length, principal: t.principal, engine: Engine.engineOf(G.db, t).name, drivers: [...new Set(rs.map(c => c.did))], cash: t.cash != null ? +t.cash.toFixed(1) : null, car: +Engine.carRating(G.db, t).toFixed(1), sim: true });
  });
};
