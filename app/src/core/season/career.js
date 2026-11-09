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
  const drv = opts.mode === 'driver';                      // (0.9) carreira de piloto: sem equipe própria, como o observador
  const obs = opts.mode === 'observer' || drv;
  db.drivers.forEach(d => { d.history = d.history || []; });
  db.teams.forEach(t => { t.history = t.history || []; });
  const team = obs ? null : byId(db.teams, opts.teamId);
  // orçamento de cada equipe a partir das receitas reais do modelo (econ.js)
  if (typeof Econ !== 'undefined') Econ.init({ db, history: [] });
  const G = {
    version: SAVE_VERSION, seed, createdAt: Date.now(), savedAt: null, mode: drv ? 'driver' : obs ? 'observer' : 'manager',
    log: [], archive: [],
    player: { name: opts.name || (drv ? 'Piloto' : obs ? 'Observador' : 'Chefe de Equipe'), nat: opts.nat || 'BRA', teamId: obs ? null : opts.teamId, fired: false, careerWins: 0, titles: 0 },
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
  if (typeof Sisters !== 'undefined') Sisters.ensure(G);
  Market.state(G);
  Staff.refreshMarket(G);
  const freshCats = typeof Cats !== 'undefined' && G.options.categories !== false && !G.cats;
  if (freshCats) Cats.init(G, null, { defer: true });
  if (typeof DriverDB !== 'undefined') { DriverDB.init(G); DriverDB.applyDdb(G); }
  // uma pessoa, um registro (fontes com nomes diferentes para o mesmo piloto) e só então o grid inicial
  if (typeof Persons !== 'undefined') Persons.dedupe(G);
  if (freshCats && Cats.on(G)) Cats.initialGrid(G);
  if (typeof Disc !== 'undefined') Disc.init(G);
  if (typeof Kart !== 'undefined') Kart.init(G);
  if (typeof MarketPlus !== 'undefined') MarketPlus.init(G);
};
Career.isObs = (G) => G.mode === 'observer' || G.mode === 'driver';   // "sem equipe própria": o modo piloto (0.9) também
Career.isDrv = (G) => G.mode === 'driver';

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
  // (0.8.7) o limite de 120 corta as mais antigas, mas nunca uma decisão ainda sem resposta
  if (G.inbox.length > 120) {
    const keep = G.inbox.slice(120).filter(x => x.choices && x.resolved == null);
    G.inbox.length = 120; if (keep.length) G.inbox.push(...keep);
  }
};
Career.news = (G, title, tag = 'geral', body = '', refs) => {
  const n = { id: Career.nextId(G, 'n'), title, tag, body, round: G.season ? G.season.round : 0, year: G.season ? G.season.year : 0 };
  if (refs && refs.main) n.main = true;
  if (typeof Media !== 'undefined') Media.decorate(G, n, refs || {});
  G.news.unshift(n);
  if (G.news.length > 400) G.news.length = 400;   // com o catálogo ampliado de eventos, 150 cobria pouco mais de uma temporada
};

Career.CAP_OUT = new Set(['salário', 'motor', 'mercado', 'marketing', 'multa', 'academia', 'patrimônio', 'receita', 'infraestrutura']);
Career.ledger = (G, desc, amount, cat = 'geral') => {
  G.finances.balance = +(G.finances.balance + amount).toFixed(3);
  // teto: todo gasto elegível conta (fábrica, operação, P&D, reparos, staff contratado...)
  if (amount < 0 && !Career.CAP_OUT.has(cat)) G.finances.spent += -amount;
  G.finances.ledger.unshift({ year: G.season.year, round: G.season.round, desc, amount: +amount.toFixed(3), cat });
  if (G.finances.ledger.length > 400) G.finances.ledger.length = 400;
  // totais da temporada por categoria (o extrato guarda só as últimas linhas)
  const S = G.finances.season && G.finances.season.year === G.season.year ? G.finances.season : (G.finances.season = { year: G.season.year, byCat: {}, inc: 0, exp: 0 });
  S.byCat[cat] = +((S.byCat[cat] || 0) + amount).toFixed(3);
  if (amount > 0) S.inc = +(S.inc + amount).toFixed(3); else S.exp = +(S.exp + amount).toFixed(3);
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
    if (d && !d.injured && !d.banned) return d;
    const res = ds.find(x => x.seat === 'R' && !x.injured && !x.banned);
    if (res) return res;
    // sem reserva: pega o melhor piloto livre temporariamente
    const free = G.db.drivers.filter(x => !x.team && !x.retired && !x.injured && !x.banned && !seats.includes(x)).sort((a, b) => driverOverall(b) - driverOverall(a));
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
    driverOf: (did) => map[did],
    standOf: (did) => ((G.season && G.season.standD) || {})[did] || 0,
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
  if (typeof Regs !== 'undefined') { Regs.ensure(G.db.rules); const v = Regs.applyVersion(G, year); if (typeof Council !== 'undefined') Council.applySeason(G, year); if (v && v.reset) { const ts = G.db.teams; ['aero', 'chassis'].forEach(k => { const m = ts.reduce((a, t) => a + t.car[k], 0) / ts.length; ts.forEach(t => { t.car[k] = +(m + (t.car[k] - m) * 0.88 + RNG.normal(0, 1.0)).toFixed(2); }); }); } }
  const calendar = (G.db.calendar && G.db.calendar.length ? G.db.calendar : G.db.tracks.map(t => t.id)).filter(id => Career.track(G, id));
  G.season = {
    year, round: 0, calendar, results: [],
    standD: {}, standC: {}, stats: {},
  };
  G.db.drivers.forEach(d => (G.season.stats[d.id] = { starts: 0, wins: 0, podiums: 0, poles: 0, dnfs: 0, fl: 0, points: 0, best: null, sumPos: 0, finishes: 0, beatMate: 0 }));
  G.db.teams.forEach(t => (G.season.standC[t.id] = 0));
  if (typeof Identity !== 'undefined') Identity.apply(G, year);
  G.db.drivers.filter(d => d.team && d.seat !== 'R').forEach(d => (G.season.standD[d.id] = 0));
  G.finances.spent = 0;
  if (typeof Cats !== 'undefined' && !first && Cats.on(G)) Cats.startSeason(G, year);
  if (!first && typeof Sisters !== 'undefined') Sisters.seasonStart(G);
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
