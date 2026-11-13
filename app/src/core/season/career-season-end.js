'use strict';
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
  // potencial real se move pelo rendimento da temporada (antes do envelhecimento e da evolução)
  if (typeof Potential !== 'undefined') Potential.evolve(G);
  if (typeof DriverDB !== 'undefined') DriverDB.endSeason(G);
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
    // a premiação do Mundial é paga ao longo do ano seguinte como distribuição comercial (econ.js)
    if (typeof Econ === 'undefined') Career.ledger(G, `Premiação do Mundial (${ordinal(myPos)} lugar)`, (G.db.rules.prizePerPosition[myPos - 1] || 8), 'receita');
    const delta = (G.board.target - myPos) * 9 + (myPos <= G.board.target ? 8 : -6);
    G.board.confidence = clamp(G.board.confidence + delta, 0, 100);
  }
  // reputação e orçamento de todas as equipes
  sc.forEach((x, i) => {
    const t = Career.team(G, x.tid);
    const n = sc.length;
    t.reputation = clamp(Math.round(t.reputation * 0.8 + (100 - i * (60 / n)) * 0.2), 30, 99);
    // orçamento do ano seguinte: recalculado pelas receitas (econ.js, depois do fechamento)
    if (typeof Econ === 'undefined') { t.baseBudget = t.baseBudget || t.budget; const target = t.baseBudget * (0.86 + 0.28 * (1 - i / Math.max(1, n - 1))) * (0.82 + t.reputation / 260); t.budget = Math.round(clamp(t.budget * 0.65 + target * 0.35 + RNG.normal(0, 6), 90, 950)); }
  });
  // carro do próximo ano: regressão + foco no próximo ano
  const reg = (G.history.length % (G.db.rules.regulationChangeEvery || 4)) === 0;
  summary.regChange = reg;
  if (reg) Career.record(G, 'regulamento', `Novo regulamento técnico para ${s.year + 1}: o desempenho dos carros foi aproximado e o grid embaralhado.`, { year: s.year });
  // carro novo sem equalização artificial: mantém a distância para a média do grid (cardev.js)
  if (typeof CarDev !== 'undefined') CarDev.newCars(G, reg);
  G.db.teams.forEach(t => {
    if (typeof CarDev === 'undefined') { const k = reg ? 0.62 : 0.84; const pull = (v) => +(82 + (v - 82) * k + RNG.normal(0, reg ? 1.4 : 1.0)).toFixed(2); t.car.aero = pull(t.car.aero); t.car.chassis = pull(t.car.chassis); }
    // equilíbrio ~87 sem desenvolvimento (antes 90: a confiabilidade subia década após década); regulamento novo derruba 3 pontos
    t.car.reliability = +clamp(t.car.reliability * 0.9 + 8.7 - (reg ? 3 : 0) + RNG.normal(0, 1.5), 60, 97).toFixed(1);
  });
  AI.applyNextYear(G);
  if (team && G.nextYearBank > 0) { team.car.aero += G.nextYearBank * 0.55; team.car.chassis += G.nextYearBank * 0.45; summary.bankUsed = +G.nextYearBank.toFixed(2); G.nextYearBank = 0; }
  if (team && typeof RnD !== 'undefined') { const used = RnD.applyNextYear(G, team); if (used) summary.bankUsed = +((summary.bankUsed || 0) + used).toFixed(2); }
  // motores: com o módulo de fabricantes, a evolução é feita lá (retorno decrescente, sem subir sem parar)
  if (typeof Mfr === 'undefined' && !(G.db.rules.regs && G.db.rules.regs.engineFreeze)) G.db.engines.forEach(e => { e.power = +clamp(e.power + RNG.normal(0.3, reg ? 2.5 : 1), 75, 100).toFixed(1); e.reliability = +clamp(e.reliability + RNG.normal(0.5, 1.4), 70, 98).toFixed(1); });
  // pilotos: idade, contratos, aposentadoria
  const retired = [];
  G.db.drivers.forEach(d => {
    if (d.retired) return;
    d.age++;
    if (typeof Talent !== 'undefined') Talent.age(G, d);            // curva de idade por piloto (talent.js)
    else if (d.age >= 33) Career.ATTRS_GROW.forEach(k => (d[k] = +clamp(d[k] - RNG.range(0, (d.age - 31) * 0.45), 30, 99).toFixed(2)));
    if (d.retiring) { d.retiring = false; d.retired = true; d.retiredYear = s.year; retired.push(d); }
    else if (!d.team && !d.cat && !d.series && d.age >= 33 && RNG.chance(0.35 + (d.age - 33) * 0.1)) { d.retired = true; d.retiredYear = s.year; retired.push(d); }
    if (d.team) d.contractYears--;
  });
  retired.forEach(d => { Career.news(G, `${d.name} anuncia aposentadoria aos ${d.age} anos`, 'mercado'); Career.record(G, 'aposentadoria', `${d.name} se aposentou aos ${d.age} anos: ${d.career.starts} GPs, ${d.career.wins} vitórias, ${d.career.titles} títulos.`, { drivers: [d.id] }); if (d.team) { const tid = d.team, seat = d.seat; d.team = null; d.seat = null; if (seat !== 'R' && tid !== G.player.teamId) Career.aiFillSeat(G, tid, seat); else if (tid === G.player.teamId) Career.mail(G, { from: 'Diretor esportivo', tag: 'team', title: `${d.name} se aposentou`, body: 'Você precisa de um novo piloto. Veja o Mercado.' }); } });
  // pré-contratos
  G.db.drivers.filter(d => d.futureTeam).forEach(d => { const f = d.futureTeam; d.futureTeam = null; if (d.retired) return; Career.placeDriver(G, d, f.team, f.role, f.salary, Math.max(0, f.years - 1)); });
  // novatos
  const rookies = [];
  // com as categorias de base ativas, os novos talentos chegam pela F4 (ver Cats.progression)
  for (let i = 0; i < (typeof Cats !== 'undefined' && Cats.on(G) ? 0 : RNG.int(4, 6)); i++) { const r = Career.genRookie(G); G.db.drivers.push(r); rookies.push(r); }
  if (rookies.length) Career.record(G, 'novato', `Novos talentos disponíveis: ${rookies.map(r => `${r.name} (${r.nat}, ${r.age} anos)`).join('; ')}.`, { drivers: rookies.map(r => r.id), year: s.year });
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
  const leaving = G.sponsors.filter(sp => (sp.seasons <= 0 && (sp.satisfaction < 60 || RNG.chance(0.4))) || (sp.clauseMin && myPos > sp.clauseMin && RNG.chance(0.6)));
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
    sl: ovr >= 74 ? [{ y: (G.season ? G.season.year : 2026) - 1, cat: ladderSeries(1), pts: ovr >= 76 ? 40 : 30 }, { y: G.season ? G.season.year : 2026, cat: ladderSeries(2), pts: 12 }] : [{ y: G.season ? G.season.year : 2026, cat: ladderSeries(2), pts: ovr >= 71 ? 20 : 7 }],
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
