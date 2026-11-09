'use strict';
/* ---------- motores próprios de quem comprou ou entrou ---------- */
Owners.engineProjects = (G) => {
  const S = Owners.state(G);
  const y = G.season.year;
  S.engines.filter(p => !p.done && p.ready <= y).forEach(p => {
    p.done = true;
    const t = Career.team(G, p.tid); const c = Owners.cand(p.cid);
    if (!t || t.gone || !c) return;
    const es = G.db.engines;
    const id = 'pu-' + c.id;
    if (!byId(es, id)) es.push({ id, name: c.name, power: +(avg(es.map(e => e.power)) - 2.5).toFixed(1), reliability: +(avg(es.map(e => e.reliability)) - 3).toFixed(1), cost: 16, real: false });
    t.engine = id; t.works = true;
    Career.news(G, byLang(`${t.name} estreia motor próprio em ${y}`, `${t.name} debuts its own power unit in ${y}`), 'tecnica', byLang('O projeto de motor da equipe chega à pista. No primeiro ano, a potência e a confiabilidade ficam abaixo dos fornecedores tradicionais.', 'The team’s engine project reaches the track. In year one, power and reliability trail the established suppliers.'), { tm: [t.id] });
  });
};

/* ---------- entrada de equipes novas ---------- */
Owners.health = (G) => clamp(avg(G.db.teams.map(t => t.reputation)) / 70, 0.7, 1.3);
Owners.pending = (G) => Owners.state(G).apps.filter(a => ['fia', 'aprovada'].includes(a.stage));
Owners.applications = (G, y) => {
  const S = Owners.state(G);
  const open = Owners.MAX - G.db.teams.length - Owners.pending(G).length;
  if (open <= 0) return;
  const r = localRng(`apply:${G.seed}:${y}`);
  const inGrid = new Set(G.db.teams.map(x => x.candidate).filter(Boolean));
  const ok = Owners.cands().filter(c => y >= c.from - 1 && !inGrid.has(c.id) && !Owners.blocked(G, c) && Owners.canApply(S, c, y));
  for (const c of ok.sort(() => r() - 0.5)) {
    if (r() < c.interest * 0.07 * Owners.health(G) * (open >= 2 ? 1.6 : 1)) {
      S.apps.push({ cid: c.id, y, stage: 'fia', decide: y + 1 });
      S.cand[c.id] = { status: 'inscrita', y };
      const txt = byLang(`${c.fullName} se inscreve no processo da FIA para entrar na F1 em ${y + 2}. Plano: ${Owners.GOAL[c.plan.goal][0]} em ${c.plan.years} anos.`, `${c.fullName} enters the FIA selection process to join F1 in ${y + 2}. Plan: ${Owners.GOAL[c.plan.goal][1]} within ${c.plan.years} years.`);
      Career.news(G, byLang(`${c.name} quer entrar na F1`, `${c.name} wants to join F1`), 'mercado', txt, { main: true });
      Career.record(G, 'equipe', txt, {});
      S.log.unshift({ y, kind: 'inscricao', cid: c.id, name: c.fullName });
      break;
    }
  }
};
/* grupo dono que já tem equipe no grid (ex.: Lamborghini e Audi, ambas do Grupo Volkswagen) */
Owners.blocked = (G, c) => !!(c.blockedBy && G.db.teams.some(t => t.id === c.blockedBy && /Audi/.test(t.owner ? t.owner.name : '')));
Owners.canApply = (S, c, y) => { const s = S.cand[c.id]; if (!s) return true; if (s.status === 'recusada') return y - s.y >= 5; return false; };
Owners.GOAL = { sobreviver: ['sobreviver e se firmar', 'survive and establish itself'], meio: ['brigar no meio do pelotão', 'fight in the midfield'], podios: ['chegar aos pódios', 'reach the podium'], titulos: ['disputar títulos', 'fight for titles'] };
/* análise da FIA e voto da Comissão (no meio da temporada seguinte à inscrição) */
Owners.decide = (G) => {
  const S = Owners.state(G);
  const y = G.season.year;
  S.apps.filter(a => a.stage === 'fia' && a.decide === y).forEach(a => {
    const c = Owners.cand(a.cid); if (!c) { a.stage = 'recusada'; return; }
    const r = localRng(`fia:${G.seed}:${c.id}:${y}`);
    const fiaOk = r() < 0.45 + c.owner.wealth / 250 + c.staff / 500;
    const votes = Owners.vote(G, c, r);
    a.votes = votes;
    const pass = fiaOk && votes.yes > votes.no;
    a.stage = pass ? 'aprovada' : 'recusada';
    S.cand[c.id] = { status: pass ? 'aprovada' : 'recusada', y };
    S.log.unshift({ y, kind: pass ? 'aprovada' : 'recusada', cid: c.id, name: c.fullName, votes, fiaOk });
    const why = !fiaOk ? byLang('A FIA considerou o plano técnico e financeiro insuficiente.', 'The FIA judged the technical and financial plan insufficient.') : byLang(`A Comissão votou ${votes.yes} a ${votes.no}${pass ? '' : ': as equipes atuais temem dividir a premiação'}.`, `The Commission voted ${votes.yes} to ${votes.no}${pass ? '' : ': current teams fear splitting the prize money'}.`);
    const title = pass ? byLang(`${c.name} é aprovada e estreia na F1 em ${y + 1}`, `${c.name} approved to join F1 in ${y + 1}`) : byLang(`Entrada da ${c.name} na F1 é recusada`, `${c.name}'s F1 entry is rejected`);
    Career.news(G, title, 'regulamento', why + (pass ? byLang(` A equipe paga a taxa de entrada de ${fmtMoney(Owners.FEE)} e começa a montar a estrutura.`, ` The team pays the ${fmtMoney(Owners.FEE)} entry fee and starts building its operation.`) : ''), { main: true });
    Career.record(G, 'equipe', `${title}. ${why}`, {});
    if (!Career.isObs(G) && G.player.teamId) Career.mail(G, { from: 'FIA', tag: 'board', title, body: why + (votes.mine ? byLang(` Sua equipe votou ${votes.mine === 'sim' ? 'a favor' : 'contra'}.`, ` Your team voted ${votes.mine === 'sim' ? 'in favour' : 'against'}.`) : '') });
  });
};
/* voto: as equipes perdem parte da premiação com uma equipe a mais; marcas fortes e dinheiro novo ajudam */
Owners.vote = (G, c, r) => {
  let yes = 0, no = 0, mine = null;
  const fom = (c.kind === 'montadora' ? 0.25 : 0) + (c.country === 'USA' ? 0.1 : 0) + (c.owner.wealth - 60) / 200;
  G.db.teams.forEach(t => {
    let p = 0.32 + fom - (t.reputation >= 85 ? 0.05 : 0) + (t.engine && c.engine === 'cliente' ? 0.08 : 0);
    if (G.council && G.council.entryVote && Owners.isPlayerTeam(G, t)) { const v = G.council.entryVote[c.id]; if (v) { mine = v; v === 'sim' ? yes++ : no++; return; } }
    if (Owners.isPlayerTeam(G, t)) { mine = r() < p ? 'sim' : 'nao'; mine === 'sim' ? yes++ : no++; return; }
    r() < p ? yes++ : no++;
  });
  // FIA e FOM votam juntas a favor quando a marca tem peso comercial
  if (fom > 0.1) yes += 2; else no += 1;
  return { yes, no, mine };
};
/* estreia das aprovadas no começo da temporada */
Owners.enterApproved = (G) => {
  const S = Owners.state(G);
  const y = G.season.year;
  S.apps.filter(a => a.stage === 'aprovada' && a.decide < y).forEach(a => {
    if (G.db.teams.length >= Owners.MAX) return;
    const c = Owners.cand(a.cid); if (!c) return;
    a.stage = 'entrou';
    const t = Owners.addTeam(G, Owners.fromCandidate(G, c, y));
    S.cand[c.id] = { status: 'entrou', y, tid: t.id };
    if (c.engine === 'propria') S.engines.push({ tid: t.id, cid: c.id, ready: y + (c.engineYears || 3) });
    S.log.unshift({ y, kind: 'entrada', tid: t.id, name: t.name });
    const ds = G.db.drivers.filter(d => d.team === t.id && d.seat !== 'R');
    const txt = byLang(`${t.fullName} estreia em ${y} com ${Engine.engineOf(G.db, t).name} como fornecedora de motor${ds.length ? ` e ${ds.map(d => d.name).join(' e ')} como pilotos` : ''}.`, `${t.fullName} debuts in ${y} with ${Engine.engineOf(G.db, t).name} power${ds.length ? ` and ${ds.map(d => d.name).join(' and ')} as drivers` : ''}.`);
    Career.news(G, byLang(`${t.name} estreia na F1`, `${t.name} makes its F1 debut`), 'mercado', txt, { tm: [t.id], main: true });
    Career.record(G, 'equipe', txt, { teams: [t.id] });
  });
};
/* ---------- montagem de uma equipe nova (candidata ou do jogador) ---------- */
Owners.fromCandidate = (G, c, y) => ({
  id: c.id, name: c.name, fullName: c.fullName, short: c.short, country: c.country, color: c.color, color2: c.color2, logo: c.logo,
  budget: c.budget, funding: c.funding, reputation: c.reputation, facilities: c.facilities, staff: c.staff, owner: { ...c.owner, since: y },
  principal: c.leaders ? c.leaders.principal : null, base: c.base, candidate: c.id, fictional: !!c.fictional, planYears: c.plan.years,
});
Owners.pickEngine = (G, pref) => {
  const es = G.db.engines.filter(e => !String(e.id).startsWith('pu-') || G.db.teams.some(t => t.engine === e.id && t.works));
  if (pref && byId(es, pref)) return pref;
  const count = (e) => G.db.teams.filter(t => t.engine === e.id).length;
  return es.slice().sort((a, b) => count(a) - count(b) || b.power - a.power)[0].id;
};
/* cria a equipe a partir de uma ficha; db pode ser o banco ainda sem carreira (criação do jogador) */
Owners.buildTeam = (db, spec, y, rng) => {
  const ts = db.teams;
  const m = (k) => avg(ts.map(t => t.car[k]));
  const r = rng || Math.random;
  const gap = 5.5 + (70 - (spec.facilities || 65)) / 8 + r() * 2.5;
  const st = spec.staff || 72;
  return {
    id: spec.id, name: spec.name, fullName: spec.fullName || spec.name, short: (spec.short || spec.name.slice(0, 3)).toUpperCase().slice(0, 3), country: spec.country || 'GBR',
    color: spec.color || '#888888', color2: spec.color2 || '#111111', engine: spec.engine, budget: spec.budget || 180, reputation: spec.reputation || 48,
    car: { aero: +(m('aero') - gap).toFixed(2), chassis: +(m('chassis') - gap).toFixed(2), reliability: +(m('reliability') - 3).toFixed(1), tyreCare: +(m('tyreCare') - 2).toFixed(1) },
    pitCrew: 78, facilities: spec.facilities || 65, principal: spec.principal || null, staff: { technical: st, aero: st, strategy: st + 1, engineering: st },
    sponsors: [], img: null, founded: y, entered: y, realStats: { starts: 0, wins: 0, titles: 0, podiums: 0, poles: 0 }, champ2026: null,
    logo: spec.logo || null, carImg: null, history: [], ownerFunding: spec.funding || 60, corporate: 0, debt: 0, ownerMood: 65, crisisYears: 0,
    owner: spec.owner || { name: spec.fullName || spec.name, type: 'independente', wealth: 60, ambition: 65, patience: 60, since: y },
    candidate: spec.candidate || null, base: spec.base || null, fictional: spec.fictional ?? true, newTeam: true, lineage: [], playerMade: !!spec.playerMade, planYears: spec.planYears || 5,
  };
};
/* coloca uma equipe nova numa carreira em andamento (estrutura, funcionários, pilotos) */
Owners.addTeam = (G, spec) => {
  const y = G.season.year;
  if (Career.team(G, spec.id)) spec.id = spec.id + '-' + y;
  spec.engine = spec.engine && spec.engine !== 'cliente' && spec.engine !== 'propria' ? spec.engine : Owners.pickEngine(G);
  const t = Owners.buildTeam(G.db, spec, y, localRng(`newteam:${G.seed}:${spec.id}:${y}`));
  G.db.teams.push(t);
  t.cash = Math.round(t.budget * 0.3); t.spent = 0;
  if (!t.principal) t.principal = Staff.genName(t.country);
  AI.init(G);
  Staff.init(G);
  if (typeof Econ !== 'undefined') t.budget = Math.round(Econ.revenue(G, t).total);
  Owners.ensureTeam(G, t);
  if (G.season && G.season.standC) G.season.standC[t.id] = 0;
  [1, 2].forEach(seat => { const d = Career.aiFillSeat(G, t.id, seat); if (d && G.season.standD[d.id] == null) G.season.standD[d.id] = 0; });
  if (G.council && G.council.rel && G.council.rel[t.id] == null) G.council.rel[t.id] = 0;
  return t;
};

/* registro do universo: o que é rotina (decisões, contratos, P&D, finanças, corridas) sai depois de 25 anos;
   títulos, escândalos, mortes, recordes e a vida das equipes ficam para sempre */
Owners.LOG_MINOR = new Set(['decisao', 'corrida', 'pd', 'financas', 'contrato', 'staff', 'patrocinio']);
Owners.pruneLog = (G) => {
  if (!G.log || G.log.length < 4000) return;
  const y = G.season.year;
  G.log = G.log.filter(e => !(Owners.LOG_MINOR.has(e.t) && y - e.y > 25));
};
