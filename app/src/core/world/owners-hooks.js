'use strict';
/* ---------- titular da F1 com nota mínima (regra do dono do jogo: 80) ---------- */
Owners.minRating = (G) => {
  const min = typeof Talent !== 'undefined' ? Talent.F1_MIN : 80;
  const pt = Career.isObs(G) ? null : G.player.teamId;
  G.db.drivers.filter(d => d.team && (d.seat === 1 || d.seat === 2) && !d.retired && driverOverall(d) < min).forEach(d => {
    const t = Career.team(G, d.team); if (!t) return;
    if (t.id === pt) { Career.mail(G, { from: byLang('Diretor esportivo', 'Sporting director'), tag: 'team', important: true, title: byLang(`${d.name} caiu abaixo do nível da F1`, `${d.name} has dropped below F1 level`), body: byLang(`A nota de ${d.name} está em ${driverOverall(d)}. Os titulares da F1 ficam a partir de ${min}; recomendo procurar outro piloto no Mercado.`, `${d.name}'s rating is ${driverOverall(d)}. F1 race drivers sit at ${min} or higher; I recommend finding another driver in the Market.`) }); return; }
    const seat = d.seat;
    const alt = G.db.drivers.filter(x => !x.retired && !x.dead && !x.retiring && !x.futureTeam && (!x.team || (x.team === t.id && x.seat === 'R')) && !(x.series && G.season.round > 0) && driverOverall(x) >= min && Market.slEligible(G, x))
      .sort((a, b) => driverOverall(b) - driverOverall(a))[0];
    if (!alt) return;
    d.seat = 'R';
    Career.placeDriver(G, alt, t.id, seat, +Math.max(0.6, Market.ask(alt)).toFixed(2), alt.age >= 32 ? 1 : 2);
    if (G.season.standD) { delete G.season.standD[d.id]; if (G.season.standD[alt.id] == null) G.season.standD[alt.id] = 0; }
    Career.news(G, byLang(`${t.name} promove ${alt.name} e tira ${d.name} do carro #${seat}`, `${t.name} brings in ${alt.name} and drops ${d.name} from car #${seat}`), 'mercado', byLang(`${d.name} vira reserva: a equipe quer mais desempenho para ${G.season.year}.`, `${d.name} becomes reserve: the team wants more performance for ${G.season.year}.`), { tm: [t.id] });
  });
};

/* ---------- ganchos ---------- */
(function () {
  // equipes que saíram continuam consultáveis (histórico, recordes, notícias antigas)
  Hooks.around('Career', Career, 'team', 'owners', (ct, G, id) => ct(G, id) || (G && G.owners && id ? (G.owners.gone || []).find(t => t.id === id) : undefined));
  Hooks.around('Career', Career, 'endSeason', 'owners', (es, G) => {
    Owners.ensure(G);
    const sc = Career.standingsC(G);
    const r = es(G);
    Owners.yearly(G, sc);
    Owners.minRating(G);
    Owners.pruneLog(G);
    return r;
  });
  Hooks.around('Career', Career, 'finishWeekend', 'owners', (fw, G, ...a) => {
    const r = fw(G, ...a);
    if (G.season && G.season.round === Math.ceil(G.season.calendar.length / 2)) Owners.decide(G);
    return r;
  });
  Hooks.around('Career', Career, 'initPeople', 'owners', (ip, G) => { const r = ip(G); Owners.ensure(G); return r; });
})();

/* ---------- carreira com equipe criada pelo jogador ou candidata do banco (12ª equipe) ---------- */
Owners.PROJECTS = {
  modesto: { budget: 150, funding: 50, facilities: 60, staff: 70, reputation: 42, wealth: 50, ambition: 55, patience: 70 },
  medio: { budget: 190, funding: 90, facilities: 66, staff: 73, reputation: 46, wealth: 65, ambition: 70, patience: 60 },
  ambicioso: { budget: 240, funding: 140, facilities: 72, staff: 76, reputation: 50, wealth: 85, ambition: 85, patience: 50 },
};
Owners.playerSpec = (o) => {
  if (o.candidate) { const c = Owners.cand(o.candidate); if (c) return { ...Owners.fromCandidate(null, c, 0), engine: o.engine || null, playerMade: false }; }
  const P = Owners.PROJECTS[o.project] || Owners.PROJECTS.medio;
  const name = String(o.name || 'Nova Equipe').trim().slice(0, 28);
  return {
    id: 'equipe-' + (String(name).toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'jogador'), name, fullName: (o.fullName || name + ' F1 Team').slice(0, 48),
    short: o.short || name.replace(/[^A-Za-z]/g, '').slice(0, 3), country: o.country || 'BRA', color: o.color || '#00875A', color2: o.color2 || '#FFC72C', logo: o.logo || 'logos/generic/1.svg',
    budget: P.budget, funding: P.funding, reputation: P.reputation, facilities: P.facilities, staff: P.staff, base: o.base || null, engine: o.engine || null,
    owner: { name: o.ownerName || byLang(`${name} Holdings (dono fictício)`, `${name} Holdings (fictional owner)`), type: 'independente', wealth: P.wealth, ambition: P.ambition, patience: P.patience },
    playerMade: true, fictional: true, project: o.project || 'medio',
  };
};
(function () {
  Hooks.around('Career', Career, 'create', 'owners', (cc, baseDb, opts) => {
    if (!opts || !opts.newTeam || opts.mode === 'observer') return cc(baseDb, opts);
    const db = deepClone(baseDb);
    const y = db.rules.startYear;
    const spec = Owners.playerSpec(opts.newTeam);
    if (byId(db.teams, spec.id)) spec.id += '-12';
    spec.engine = Owners.pickEngine({ db }, spec.engine);
    const t = Owners.buildTeam(db, spec, y, localRng('newteam:' + spec.id + ':' + (opts.seed || '')));
    db.teams.push(t);
    const G = cc(db, { ...opts, teamId: t.id });
    const team = Career.team(G, t.id);
    G.board.target = team.budget >= 220 ? 11 : 12;
    Owners.ensure(G);
    // a montagem é do jogador: pilotos, reserva e cargos-chave antes da primeira corrida
    G.teamSetup = { pending: true, since: y };
    (team.staffList || []).forEach(s => { if (!s.isPlayer) s.interim = true; });
    Career.mail(G, { from: byLang('Diretoria', 'Board'), tag: 'board', important: true, title: byLang(`${team.name}: a 12ª equipe do grid`, `${team.name}: the 12th team on the grid`), body: byLang(`A ${team.fullName} foi aprovada pela FIA e estreia em ${y} com motor ${Engine.engineOf(G.db, team).name}. Agora é com você: escolha os dois pilotos titulares, o reserva e os cargos-chave da fábrica na tela Montagem da equipe. Os cargos estão com interinos até você contratar. Meta da diretoria: ${ordinal(G.board.target)} lugar ou melhor no primeiro ano. O carro começa atrás do grid, como toda equipe nova.`, `${team.fullName} has been approved by the FIA and debuts in ${y} with ${Engine.engineOf(G.db, team).name} power. Now it is up to you: choose the two race drivers, the reserve and the key factory roles on the Team build-up screen. Interim staff fill the roles until you hire. Board target: ${ordinal(G.board.target)} or better in year one. The car starts behind the grid, like every new team.`) });
    Career.news(G, byLang(`${team.name} é a 12ª equipe da F1`, `${team.name} becomes F1's 12th team`), 'mercado', '', { tm: [team.id], main: true });
    if (opts.newTeam.candidate) Owners.state(G).cand[opts.newTeam.candidate] = { status: 'entrou', y, tid: team.id };
    const c = opts.newTeam.candidate && Owners.cand(opts.newTeam.candidate);
    if (c && c.engine === 'propria') Owners.state(G).engines.push({ tid: team.id, cid: c.id, ready: y + (c.engineYears || 3) });
    G.rngState = RNG.state;
    return G;
  });
})();

/* ---------- montagem da equipe nova pelo jogador ---------- */
Owners.SETUP_ROLES = ['technical', 'aero', 'engineeringDir', 'chiefEngineer', 'sporting', 'strategy', 'raceEng1', 'raceEng2', 'performance', 'chiefMechanic', 'operations', 'commercial', 'marketing', 'engine'];
/* candidatos livres por cargo (gerados uma vez por carreira) */
Owners.setupPool = (G) => {
  const S = G.teamSetup; if (!S) return {};
  if (S.pool) return S.pool;
  const r = localRng('setup:' + G.seed);
  S.pool = {};
  Owners.SETUP_ROLES.forEach(role => {
    S.pool[role] = Array.from({ length: 4 }, (_, i) => {
      const rating = Math.round(clamp(70 + r() * 20 - i * 1.5, 62, 92));
      const nat = NATS[Math.floor(r() * NATS.length)];
      return { id: Career.nextId(G, 'st'), role, name: Staff.genName(nat), nat, rating, salary: Staff.salaryFor(role, rating), fee: +(Math.max(0.2, (rating - 65) * 0.06)).toFixed(1), real: false };
    });
  });
  return S.pool;
};
/* pilotos que podem ser contratados para a equipe nova */
Owners.setupDrivers = (G) => G.db.drivers.filter(d => !d.retired && !d.dead && !d.retiring && d.team !== G.player.teamId && !d.futureTeam && d.age >= 18 && (!d.team || d.seat === 'R') && Market.slEligible(G, d))
  .sort((a, b) => driverOverall(b) - driverOverall(a));
Owners.setupState = (G) => {
  const t = Career.team(G); const ds = G.db.drivers.filter(d => d.team === t.id);
  return { r1: ds.find(d => d.seat === 1), r2: ds.find(d => d.seat === 2), res: ds.find(d => d.seat === 'R'), ready: ds.filter(d => d.seat === 1 || d.seat === 2).length === 2 };
};
/* quem corre em outra categoria sai dela ao assinar como titular na F1 */
Owners.leaveSeries = (G, d) => {
  if (typeof Cats !== 'undefined' && G.cats) Cats.list(G, true).forEach(c => { if (c.entries) c.entries = c.entries.filter(e => e.did !== d.id); });
  d.cat = null; d.series = null;
};
/* o diretor esportivo completa o que faltar (vagas de piloto) */
Owners.autoSetup = (G) => {
  const t = Career.team(G); if (!t) return;
  [1, 2].forEach(seat => { if (!G.db.drivers.some(d => d.team === t.id && d.seat === seat)) { const d = Career.aiFillSeat(G, t.id, seat); if (d) { Owners.leaveSeries(G, d); if (G.season.standD[d.id] == null) G.season.standD[d.id] = 0; } } });
  Owners.finishSetup(G);
};
Owners.finishSetup = (G) => {
  if (!G.teamSetup || !G.teamSetup.pending) return;
  G.teamSetup.pending = false; G.teamSetup.done = G.season.year;
  const t = Career.team(G); const st = Owners.setupState(G);
  const staff = (t.staffList || []).filter(s => !s.isPlayer && !s.interim).length;
  Career.news(G, byLang(`${t.name} apresenta a equipe para a estreia: ${[st.r1, st.r2].filter(Boolean).map(d => d.name).join(' e ')}`, `${t.name} unveils its debut line-up: ${[st.r1, st.r2].filter(Boolean).map(d => d.name).join(' and ')}`), 'mercado', byLang(`${staff} contratações para a fábrica e os boxes.${st.res ? ` Reserva: ${st.res.name}.` : ''}`, `${staff} hires for the factory and garage.${st.res ? ` Reserve: ${st.res.name}.` : ''}`), { tm: [t.id], main: true });
  Career.record(G, 'equipe', byLang(`${t.name} concluiu a montagem da equipe para ${G.season.year}.`, `${t.name} completed its team build-up for ${G.season.year}.`), { teams: [t.id] });
};
(function () {
  // rede de segurança: nenhuma corrida começa com carro vazio
  Hooks.around('Career', Career, 'startWeekend', 'owners', (sw, G, ...a) => { if (G.teamSetup && G.teamSetup.pending && !Owners.setupState(G).ready) Owners.autoSetup(G); else if (G.teamSetup && G.teamSetup.pending) Owners.finishSetup(G); return sw(G, ...a); });
  // titular vindo de outra categoria sai dela
  Hooks.around('Career', Career, 'placeDriver', 'owners', (pd, G, d, tid, role, ...a) => { const out = pd(G, d, tid, role, ...a); if (G.teamSetup && G.teamSetup.pending && tid === G.player.teamId && role !== 'R' && (d.cat || d.series)) Owners.leaveSeries(G, d); return out; });
})();
