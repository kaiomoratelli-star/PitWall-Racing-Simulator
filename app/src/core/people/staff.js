/* ============================================================
   PIT WALL — funcionários das equipes
   14 cargos com nomes reais (quando públicos), nível, salário e contrato.
   Cada cargo influencia uma parte do jogo:
     chefe de equipe → moral dos pilotos e decisões; diretor técnico → P&D e confiabilidade;
     aerodinâmica → P&D aero; engenheiro-chefe/desempenho/corrida → acerto e feedback;
     estratégia → previsão e paradas; chefe de mecânicos → pit stops; motores → confiabilidade (fábrica);
     operações → custo de logística; comercial → receita de patrocínio; marketing → popularidade.
   ============================================================ */
'use strict';

const Staff = {};
Staff.ROLES = {
  principal: { name: 'Chefe de equipe', salary: [2, 12] },
  sporting: { name: 'Diretor esportivo', salary: [0.6, 2.5] },
  technical: { name: 'Diretor técnico', salary: [1.5, 10] },
  engineeringDir: { name: 'Diretor de engenharia', salary: [0.8, 4] },
  chiefEngineer: { name: 'Engenheiro-chefe', salary: [0.6, 3] },
  raceEng1: { name: 'Engenheiro de corrida (carro 1)', salary: [0.3, 1.5] },
  raceEng2: { name: 'Engenheiro de corrida (carro 2)', salary: [0.3, 1.5] },
  performance: { name: 'Engenheiro de desempenho', salary: [0.3, 1.2] },
  aero: { name: 'Chefe de aerodinâmica', salary: [0.8, 5] },
  strategy: { name: 'Chefe de estratégia', salary: [0.4, 2] },
  chiefMechanic: { name: 'Chefe de mecânicos', salary: [0.3, 1] },
  engine: { name: 'Chefe de motores', salary: [0.8, 4] },
  operations: { name: 'Chefe de operações', salary: [0.5, 2.5] },
  commercial: { name: 'Diretor comercial', salary: [0.6, 3] },
  marketing: { name: 'Gerente de marketing', salary: [0.2, 1] },
};
/* nomes conhecidos ganham um bônus de reputação */
// (0.9, regra 19) a nota dos profissionais famosos é dado do mundo real: fica no Pacote de dados (REAL_EXTRA.famousStaff),
// e não no código, para o mundo fictício trocar os nomes junto. Sem pacote, ninguém é famoso.
Staff.famous = () => (typeof REAL_EXTRA !== 'undefined' && REAL_EXTRA.famousStaff) || {};

Staff.salaryFor = (role, rating) => { const r = Staff.ROLES[role].salary; return +(r[0] + (r[1] - r[0]) * Math.pow(clamp((rating - 60) / 39, 0, 1), 1.6)).toFixed(2); };
Staff.genName = (nat) => randomName(nat || RNG.pick(NATS));

/* monta o quadro de funcionários a partir dos dados reais */
Staff.init = (G) => {
  const extra = typeof REAL_EXTRA !== 'undefined' ? REAL_EXTRA : { staff: {}, raceEngineers: {} };
  G.db.teams.forEach(t => {
    if (t.staffList && t.staffList.length) return;
    const real = (extra.staff || {})[t.id] || {};
    const base = avg(Object.values(t.staff || { a: 78 }));
    const lineup = Career.lineup(G, t.id);
    const realName = {
      principal: t.principal || real.principal, sporting: real.sporting || real.racing, technical: real.technical || real.cto,
      engineeringDir: real.designer || real.cto || null, chiefEngineer: real.chiefEngineer || real.trackEngineering || null,
      raceEng1: lineup[0] && (extra.raceEngineers || {})[lineup[0].id], raceEng2: lineup[1] && (extra.raceEngineers || {})[lineup[1].id],
      performance: real.performance, aero: real.aero, strategy: real.strategy || real.strategyChief, chiefMechanic: null,
      engine: (extra.works || []).includes(t.id) ? real.engine : null, operations: real.operations, commercial: real.commercial || real.ceo, marketing: null,
    };
    const ratingOf = (role) => {
      const k = { technical: 'technical', aero: 'aero', strategy: 'strategy', chiefEngineer: 'engineering', performance: 'engineering', raceEng1: 'engineering', raceEng2: 'engineering', engineeringDir: 'technical' }[role];
      const v = k && t.staff ? t.staff[k] : base;
      const nm = realName[role];
      return Math.round(clamp((Staff.famous()[nm] || v) + (nm ? 1 : RNG.range(-4, 2)), 55, 99));
    };
    t.staffList = Object.keys(Staff.ROLES).filter(r => r !== 'engine' || (extra.works || []).includes(t.id)).map(role => {
      const name = realName[role] || null;
      const rating = role === 'principal' && t.id === G.player.teamId ? 75 : ratingOf(role);
      return { id: Career.nextId(G, 'sf'), role, name: name || Staff.genName(t.country), real: !!name, rating, salary: Staff.salaryFor(role, rating), until: G.season ? G.season.year + RNG.int(0, 3) : 2028, since: 2026 };
    });
    if (t.id === G.player.teamId) { const p = t.staffList.find(s => s.role === 'principal'); p.name = G.player.name; p.real = false; p.isPlayer = true; }
    t.chassisName = real.chassis || t.chassisName || null; t.puName = real.pu || null;
    Staff.derive(t);
  });
};
Staff.get = (t, role) => (t.staffList || []).find(s => s.role === role);
Staff.r = (t, role, def = 75) => { const s = Staff.get(t, role); return s ? s.rating : def; };
/* recalcula as notas resumidas usadas pelo motor de simulação */
Staff.derive = (t) => {
  if (!t.staffList) return;
  t.staff.technical = Math.round(Staff.r(t, 'technical') * 0.7 + Staff.r(t, 'engineeringDir') * 0.3);
  t.staff.aero = Staff.r(t, 'aero');
  t.staff.engineering = Math.round(Staff.r(t, 'chiefEngineer') * 0.4 + Staff.r(t, 'performance') * 0.2 + (Staff.r(t, 'raceEng1') + Staff.r(t, 'raceEng2')) * 0.2);
  // o chefe de equipe também pesa: estratégia (decisões no muro) e direção técnica (prioridades de P&D)
  const boss = Staff.get(t, 'principal'); const br = boss && !boss.isPlayer ? boss.rating : 75;
  t.staff.strategy = Math.round(Staff.r(t, 'strategy') * 0.65 + Staff.r(t, 'sporting') * 0.2 + br * 0.15);
  t.staff.technical = Math.round(t.staff.technical * 0.9 + br * 0.1);
  t.staffNames = {}; ['technical', 'aero', 'strategy'].forEach(k => { const s = Staff.get(t, k); if (s) t.staffNames[k] = s.name; });
  const ce = Staff.get(t, 'chiefEngineer'); if (ce) t.staffNames.engineering = ce.name;
};
Staff.payroll = (t) => sum((t.staffList || []).filter(s => !s.isPlayer).map(s => s.salary));
/* efeitos dos cargos que não passam pelas 4 notas resumidas */
Staff.commercialMul = (t) => 0.9 + Staff.r(t, 'commercial', 70) / 500;
Staff.opsMul = (t) => 1.12 - Staff.r(t, 'operations', 70) / 600;
Staff.pitDrift = (t) => (Staff.r(t, 'chiefMechanic', 75) - t.pitCrew) * 0.02;
Staff.engineRel = (t) => Staff.get(t, 'engine') ? (Staff.r(t, 'engine') - 80) * 0.03 : 0;

/* ---------- mercado de funcionários ---------- */
Staff.refreshMarket = (G) => {
  G.staffMarket = [];
  Object.keys(Staff.ROLES).filter(r => r !== 'principal').forEach(role => {
    const n = ['technical', 'aero', 'chiefEngineer', 'strategy'].includes(role) ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const rating = Math.round(clamp(RNG.normal(79, 7), 62, 95));
      G.staffMarket.push({ id: Career.nextId(G, 'st'), role, name: Staff.genName(RNG.pick(NATS)), rating, salary: Staff.salaryFor(role, rating), fee: +(Math.max(0.2, (rating - 65) * 0.06)).toFixed(1), real: false });
    }
  });
};
/* contratação: de um livre (imediata) ou de outra equipe (período de jardinagem) */
Staff.hire = (G, tid, cand, fromTeam) => {
  const t = Career.team(G, tid);
  const role = cand.role;
  const cur = Staff.get(t, role);
  const join = fromTeam ? { y: G.season.year, r: G.season.round + 6 } : null;
  const person = { id: Career.nextId(G, 'sf'), role, name: cand.name, real: !!cand.real, rating: cand.rating, salary: cand.salary, until: G.season.year + RNG.int(1, 3), since: G.season.year, prevTeam: fromTeam || null };
  if (fromTeam) {
    const ft = Career.team(G, fromTeam);
    ft.staffList = ft.staffList.filter(s => s.id !== cand.id);
    const repl = { id: Career.nextId(G, 'sf'), role, name: Staff.genName(ft.country), real: false, rating: Math.round(clamp(cand.rating - RNG.range(4, 10), 60, 92)), until: G.season.year + 2, since: G.season.year };
    repl.salary = Staff.salaryFor(role, repl.rating);
    ft.staffList.push(repl); Staff.derive(ft);
    person.pending = join;
    t.pendingStaff = t.pendingStaff || []; t.pendingStaff.push(person);
    Career.news(G, `${t.name} contrata ${cand.name}, que deixa a ${ft.name}`, 'mercado', `Por contrato, ${cand.name} cumpre período de afastamento antes de começar.`);
    Career.record(G, 'staff', `${t.name} tirou ${cand.name} (${Staff.ROLES[role].name}, nível ${cand.rating}) da ${ft.name}. Começa após o período de afastamento.`, { teams: [t.id, ft.id] });
    return;
  }
  if (cur) { t.staffList = t.staffList.filter(s => s !== cur); Career.record(G, 'staff', `${t.name} substituiu ${cur.name} por ${cand.name} como ${Staff.ROLES[role].name.toLowerCase()}.`, { teams: [t.id] }); }
  t.staffList.push(person); Staff.derive(t);
  G.staffMarket = (G.staffMarket || []).filter(x => x.id !== cand.id);
  Career.news(G, `${t.name} contrata ${cand.name} como ${Staff.ROLES[role].name.toLowerCase()}`, 'mercado');
};
Staff.fire = (G, tid, sid, reason) => {
  const t = Career.team(G, tid);
  const s = t.staffList.find(x => x.id === sid); if (!s || s.isPlayer) return 'Não é possível.';
  const cost = +(s.salary * Math.max(0, s.until - G.season.year) * 0.5).toFixed(2);
  t.staffList = t.staffList.filter(x => x !== s);
  const repl = { id: Career.nextId(G, 'sf'), role: s.role, name: Staff.genName(t.country), real: false, rating: Math.round(clamp(s.rating - 6, 58, 85)), until: G.season.year + 1, since: G.season.year, interim: true };
  repl.salary = Staff.salaryFor(s.role, repl.rating); t.staffList.push(repl); Staff.derive(t);
  if (tid === G.player.teamId && cost) Career.ledger(G, `Rescisão de ${s.name}`, -cost, 'staff'); else if (cost) t.cash -= cost;
  Career.record(G, 'staff', `${t.name} demitiu ${s.name} (${Staff.ROLES[s.role].name})${reason ? ': ' + reason : ''}. ${repl.name} assume interinamente.`, { teams: [t.id] });
  Career.news(G, `${t.name} demite ${s.name}`, 'mercado', reason || '');
  return null;
};
/* chegadas após período de afastamento */
Staff.tick = (G) => {
  G.db.teams.forEach(t => {
    if (t.pendingStaff && t.pendingStaff.length) {
      t.pendingStaff = t.pendingStaff.filter(p => {
        if (G.season.round < p.pending.r && G.season.year === p.pending.y) return true;
        const cur = Staff.get(t, p.role); if (cur) t.staffList = t.staffList.filter(s => s !== cur);
        delete p.pending; t.staffList.push(p); Staff.derive(t);
        Career.record(G, 'staff', `${p.name} começou a trabalhar na ${t.name} como ${Staff.ROLES[p.role].name.toLowerCase()}.`, { teams: [t.id] });
        return false;
      });
    }
    // chefe de mecânicos treina a equipe de pit ao longo do ano
    t.pitCrew = +clamp(t.pitCrew + Staff.pitDrift(t), 50, 99).toFixed(2);
  });
};
/* decisões de staff da IA (fim de temporada e meio de ano) */
Staff.aiDecisions = (G, phase) => {
  G.db.teams.forEach(t => {
    if (t.id === G.player.teamId || !t.staffList) return;
    const P = AI.persona(t);
    // chefe de equipe demitido após temporadas muito abaixo do esperado
    if (phase === 'end') {
      const hist = (t.history || []).slice(-2);
      const exp = Career.expectedRanks(G)[t.id];
      const pr = Staff.get(t, 'principal');
      if (pr && hist.length === 2 && hist.every(h => h.pos >= exp + 3) && RNG.chance(0.35 + P.risk * 0.3)) {
        const cand = { role: 'principal', name: Staff.genName(t.country), rating: Math.round(clamp(RNG.normal(82, 5), 72, 92)) };
        cand.salary = Staff.salaryFor('principal', cand.rating);
        Staff.fire(G, t.id, pr.id, `duas temporadas abaixo da meta (${hist.map(h => ordinal(h.pos)).join(' e ')})`);
        const np = Staff.get(t, 'principal'); np.name = cand.name; np.rating = cand.rating; np.interim = false; t.principal = cand.name;
        Career.news(G, byLang(`${t.name} anuncia ${cand.name} como novo chefe de equipe`, `${t.name} name ${cand.name} as new team principal`), 'mercado');
      }
      // contratos vencidos: renova ou deixa sair
      t.staffList.forEach(s => {
        if (s.until > G.season.year || s.isPlayer) return;
        if (s.rating >= 82 || RNG.chance(0.6)) s.until = G.season.year + RNG.int(1, 3);
        else { s.until = G.season.year + 1; s.rating = Math.round(clamp(s.rating + RNG.range(-3, 3), 58, 99)); }
      });
    }
    // reforço na área mais fraca, se houver dinheiro
    if ((t.cash || 0) > t.budget * 0.12 && RNG.chance(phase === 'end' ? 0.5 : 0.08 + P.ambition * 0.05)) {
      const weakest = t.staffList.filter(s => !['principal', 'marketing'].includes(s.role)).sort((a, b) => a.rating - b.rating)[0];
      const cand = (G.staffMarket || []).filter(c => c.role === weakest.role && c.rating > weakest.rating + 3).sort((a, b) => b.rating - a.rating)[0];
      if (cand && cand.fee < t.cash * 0.2) { t.cash -= cand.fee; Staff.hire(G, t.id, cand); Career.record(G, 'staff', `Motivo: ${Staff.ROLES[weakest.role].name.toLowerCase()} era a área mais fraca da ${t.name} (nível ${weakest.rating}).`, { teams: [t.id] }); }
    }
  });
};
/* proposta do jogador a um profissional de outra equipe */
Staff.poachChance = (G, s, fromTeam) => {
  const t = Career.team(G);
  const appeal = Market.teamAppeal(G, t) - Market.teamAppeal(G, Career.team(G, fromTeam));
  return clamp(0.35 + appeal / 150, 0.05, 0.85);
};
