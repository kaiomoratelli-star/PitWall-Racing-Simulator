'use strict';
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
  const buyout = immediate && d.team ? (typeof Market !== 'undefined' && Market.releaseFee ? Market.releaseFee(G, d) : ev.buyout) : 0;
  if (immediate && d.team && typeof Market !== 'undefined' && Market.teamReleases) {
    const rel = Market.teamReleases(G, d, buyout);
    if (!rel.ok && G.finances.balance >= buyout) return { ok: false, msg: `A ${rel.team.name} não libera ${d.name} no meio do contrato (multa de ${fmtMoney(buyout)}). Tente um pré-contrato para quando o contrato acabar.` };
  }
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
  // quem corre em outra série (IndyCar, WEC...) só muda de categoria entre temporadas
  const free = G.db.drivers.filter(x => !x.team && !x.retired && !x.retiring && !x.futureTeam && !(x.series && G.season.round > 0) && !x.dead && ok(x));
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
