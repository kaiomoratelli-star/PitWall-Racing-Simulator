'use strict';
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

/* espaço no teto: limite − gasto do ano − compromisso da fábrica e da operação até a última etapa */
Career.capRoom = (G) => (typeof Econ !== 'undefined' ? Econ.capRoom(G, Career.team(G), G.finances.spent) : G.db.rules.budgetCap - G.finances.spent);
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
  const sk = (0.45 + staffR / 100 * 0.75) * (0.8 + team.facilities / 250) * atr * aeroReg * (A.mul || 1) * (typeof CarDev !== 'undefined' ? CarDev.orgMul(team) : 1);
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
  if (G.projects.some(p => p.area === area)) return `Já existe um projeto de ${Career.AREAS[area].name.toLowerCase()} em andamento: o mesmo departamento não toca dois ao mesmo tempo.`;
  if (Career.capRoom(G) < q.cost) return `O projeto estouraria o teto orçamentário (${fmtMoney(G.db.rules.budgetCap)}): sobram ${fmtMoney(Math.max(0, Career.capRoom(G)))} depois dos gastos já feitos e do custo da fábrica até o fim do ano.`;
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
    const before = Career.carVal(team, A);
    let gain = RNG.range(p.min, p.max);
    const failed = RNG.chance(p.risk / 100);
    if (failed) gain = RNG.range(-0.4, p.min * 0.4);
    if (p.v2 && typeof RnD !== 'undefined') { RnD.apply(G, team, p, gain, failed, report); return; }   // projeto por peça (rnd.js)
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
    // histórico para a tela de P&D (antes → depois, com animação na primeira vez que aparece)
    G.devDone = (G.devDone || []).concat([{ id: p.id, area: p.area, name: p.name, before: +before.toFixed(2), after: +Career.carVal(team, A).toFixed(2), failed, bank: +bank.toFixed(2), y: G.season.year, r: G.season.round, seen: false }]).slice(-12);
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
