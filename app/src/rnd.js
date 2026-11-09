/* ============================================================
   PIT WALL — P&D por peça (complementa Career.startProject / advanceProjects)
   Cada projeto é uma peça do carro (asa dianteira, assoalho, sidepods...)
   configurada pelo jogador:
   - alvo: carro atual (projeto + fabricação) ou carro do ano seguinte
     (pesquisa: só projeto, rende 35% a mais e fica guardado por peça);
   - foco: onde o ganho vai (carga, eficiência, equilíbrio/pneus,
     confiabilidade...);
   - ambição: conservador, equilibrado ou agressivo (ganho, risco, custo, prazo);
   - túnel de vento e CFD: cada projeto consome horas de túnel e
     simulações de uma cota por período de 4 GPs. A cota segue a regra de
     restrição de testes aerodinâmicos (ATR) do regulamento: quem ficou
     atrás no campeonato tem mais. Mais recurso = projeto mais bem
     resolvido (mais ganho, menos risco); túnel pesa mais nas peças
     aerodinâmicas, CFD nas mecânicas.
   Projetos antigos (pequeno/médio/grande) continuam funcionando.
   ============================================================ */
'use strict';

const RnD = {};
RnD.PERIOD = 4;
RnD.BASE = { wt: 320, cfd: 2000 };   // execuções de túnel e itens de CFD por período (referência: 100% da ATR)

/* peças novas (as áreas antigas continuam valendo) */
Object.assign(Career.AREAS, {
  frontWing: { name: 'Asa dianteira', staff: 'aero', role: 'aero', field: 'aero', aeroReg: true },
  rearWing: { name: 'Asa traseira', staff: 'aero', role: 'aero', field: 'aero', mul: 0.9, aeroReg: true },
  sidepods: { name: 'Sidepods e carenagem', staff: 'aero', role: 'aero', field: 'aero', mul: 0.85, aeroReg: true, rel: 0.1 },
});
/* kind: aero | mech | pu | team ; wt/cfd: recurso para um projeto "completo"; design: GPs de projeto */
RnD.SPEC = {
  frontWing: { kind: 'aero', base: 0.95, wt: 70, cfd: 420, design: 2, cost: 3.2, days: 16, build: 5 },
  rearWing: { kind: 'aero', base: 0.85, wt: 60, cfd: 380, design: 2, cost: 2.8, days: 14, build: 4 },
  floor: { kind: 'aero', base: 1.35, wt: 110, cfd: 700, design: 3, cost: 5.5, days: 24, build: 8 },
  sidepods: { kind: 'aero', base: 0.85, wt: 60, cfd: 520, design: 3, cost: 3.8, days: 22, build: 7 },
  suspension: { kind: 'mech', base: 0.85, wt: 25, cfd: 220, design: 2, cost: 3.2, days: 15, build: 5 },
  chassis: { kind: 'mech', base: 0.95, wt: 15, cfd: 260, design: 3, cost: 6.0, days: 28, build: 12 },
  weight: { kind: 'mech', base: 0.7, wt: 0, cfd: 120, design: 2, cost: 3.6, days: 14, build: 4 },
  brakes: { kind: 'mech', base: 0.6, wt: 10, cfd: 180, design: 2, cost: 2.4, days: 12, build: 3 },
  cooling: { kind: 'mech', base: 0.8, wt: 20, cfd: 300, design: 2, cost: 2.6, days: 14, build: 4 },
  gearbox: { kind: 'mech', base: 0.8, wt: 0, cfd: 80, design: 3, cost: 3.4, days: 20, build: 6 },
  tyreCare: { kind: 'mech', base: 0.8, wt: 10, cfd: 240, design: 2, cost: 2.6, days: 14, build: 3 },
  engine: { kind: 'pu', base: 0.7, wt: 0, cfd: 0, design: 4, cost: 9.0, days: 35, build: 10 },
  energy: { kind: 'pu', base: 0.8, wt: 0, cfd: 60, design: 3, cost: 4.0, days: 24, build: 6 },
  reliability: { kind: 'pu', base: 0.9, wt: 0, cfd: 0, design: 2, cost: 2.8, days: 14, build: 3 },
  pitCrew: { kind: 'team', base: 0.8, wt: 0, cfd: 0, design: 2, cost: 1.6, days: 10, build: 0 },
  facilities: { kind: 'team', base: 0.9, wt: 0, cfd: 0, design: 5, cost: 12, days: 45, build: 0 },
};
RnD.HIDDEN = { aero: true, wings: true };
RnD.EN = { frontWing: 'Front wing', rearWing: 'Rear wing', floor: 'Floor', sidepods: 'Sidepods and bodywork', suspension: 'Suspension', chassis: 'Chassis', weight: 'Weight reduction', brakes: 'Brakes', cooling: 'Cooling', gearbox: 'Gearbox', tyreCare: 'Tyre thermal management', engine: 'Power unit', energy: 'Energy efficiency', reliability: 'Reliability', pitCrew: 'Pit stop training', facilities: 'Facilities' };   // áreas antigas, substituídas pelas peças
RnD.FOCUS = {
  aero: [['downforce', 'Carga aerodinâmica', 'mais aderência nas curvas'], ['efficiency', 'Eficiência', 'menos arrasto: reta e energia'], ['balance', 'Equilíbrio e pneus', 'carro mais estável, desgaste menor']],
  mech: [['performance', 'Desempenho', 'tempo de volta'], ['reliability', 'Confiabilidade', 'menos quebras'], ['tyres', 'Pneus', 'trabalha melhor a borracha']],
  pu: [['standard', 'Padrão', '']], team: [['standard', 'Padrão', '']],
};
RnD.AMB = {
  conservative: { name: 'Conservador', size: 'small', gain: 0.6, risk: -7, cost: 0.7, design: -1 },
  balanced: { name: 'Equilibrado', size: 'medium', gain: 1, risk: 0, cost: 1, design: 0 },
  aggressive: { name: 'Agressivo', size: 'large', gain: 1.65, risk: 10, cost: 1.5, design: 1 },
};
RnD.FIELD_LABEL = { aero: 'aerodinâmica', chassis: 'chassi', energy: 'eficiência energética', tyreCare: 'gestão de pneus', reliability: 'confiabilidade', cooling: 'refrigeração', engineBonus: 'potência do motor', pitCrew: 'pit stop', facilities: 'instalações' };

RnD.split = (area, focus) => {
  const A = Career.AREAS[area], S = RnD.SPEC[area];
  const f = A.field;
  if (!S || S.kind === 'pu' || S.kind === 'team') return { [f]: 1 };
  if (S.kind === 'aero') {
    const base = area === 'sidepods' ? { aero: 0.65, cooling: 0.35 } : { aero: 1 };
    if (focus === 'efficiency') return { ...base, aero: base.aero * 0.55, energy: base.aero * 0.45 };
    if (focus === 'balance') return { ...base, aero: base.aero * 0.6, tyreCare: base.aero * 0.4 };
    return base;
  }
  if (focus === 'reliability') return f === 'reliability' ? { reliability: 1 } : { [f]: 0.4, reliability: 0.6 };
  if (focus === 'tyres') return f === 'tyreCare' ? { tyreCare: 1 } : { [f]: 0.6, tyreCare: 0.4 };
  return { [f]: 1 };
};

/* cota de túnel e CFD do período atual */
RnD.pool = (G) => {
  const team = Career.team(G);
  const idx = Math.floor(G.season.round / RnD.PERIOD);
  const P = G.atrPool;
  if (!P || P.y !== G.season.year || P.p !== idx) {
    const f = typeof Regs !== 'undefined' ? Regs.atrFactor(G, team.id) : 1;
    G.atrPool = { y: G.season.year, p: idx, f: +f.toFixed(2), wt: Math.round(RnD.BASE.wt * f), cfd: Math.round(RnD.BASE.cfd * f), wtMax: Math.round(RnD.BASE.wt * f), cfdMax: Math.round(RnD.BASE.cfd * f) };
  }
  const left = RnD.PERIOD - (G.season.round % RnD.PERIOD);
  return { ...G.atrPool, renewIn: left };
};

RnD.nextOpen = (G) => {
  const R = typeof Regs !== 'undefined' ? Regs.r(G) : { nextYearStartPct: 45 };
  return G.season.round / G.season.calendar.length * 100 >= (R.nextYearStartPct ?? 45);
};

/* orçamento de um projeto configurado */
RnD.quote = (G, cfg) => {
  const team = Career.team(G);
  const area = cfg.area, A = Career.AREAS[area], S = RnD.SPEC[area];
  const amb = RnD.AMB[cfg.amb] || RnD.AMB.balanced;
  const focus = cfg.focus || RnD.FOCUS[S.kind][0][0];
  const next = !!cfg.next;
  const wt = Math.max(0, Math.round(cfg.wt || 0)), cfd = Math.max(0, Math.round(cfg.cfd || 0));
  const staffR = team.staffList && A.role ? Staff.r(team, A.role, team.staff[A.staff]) : team.staff[A.staff];
  const staffP = team.staffList && A.role ? Staff.get(team, A.role) : null;
  const cur = Career.carVal(team, A);
  const ref = avg(G.db.teams.map(t => Career.carVal(t, A)));
  const dimin = clamp(1 - (cur - ref) / 50, 0.55, 1.2);
  const aeroReg = A.aeroReg && typeof Regs !== 'undefined' ? Regs.aeroMul(G) : 1;
  // aproveitamento dos recursos (0,25 a ~1,15): túnel pesa mais na aero, CFD na mecânica
  let q = 1, use = 1;
  if (S.wt + S.cfd > 0) {
    const ww = S.kind === 'aero' ? 0.6 : 0.3;
    use = (S.wt ? ww * wt / S.wt : 0) + (S.cfd ? (S.wt ? 1 - ww : 1) * cfd / S.cfd : 0);
    q = 0.25 + 0.75 * Math.pow(clamp(use, 0, 1.4), 0.75);
  }
  const sk = (0.45 + staffR / 100 * 0.75) * (0.8 + team.facilities / 250) * aeroReg * (A.mul || 1) * (typeof CarDev !== 'undefined' ? CarDev.orgMul(team) : 1);
  const g = S.base * amb.gain * q * sk * dimin * (next ? 1.35 : 1);
  const wtShare = S.wt ? clamp(wt / S.wt, 0, 1.3) : 0.6;
  const risk = Math.round(clamp(22 - staffR / 8 + amb.risk - wtShare * 7 - (q - 0.7) * 8, 3, 42));
  const design = Math.max(1, S.design + amb.design - (use >= 1.15 ? 1 : 0));
  const build = next || S.kind === 'team' ? 0 : 1;
  // em dias: projeto (ambição e recursos mexem no prazo) e fabricação por peça (uma por carro)
  const designDays = Math.max(4, Math.round(S.days * (1 + amb.design * 0.25) * (use >= 1.15 ? 0.85 : use < 0.6 ? 1.15 : 1)));
  const buildDays = build ? S.build : 0;
  const copies = build && S.kind !== 'team' && S.kind !== 'pu' ? clamp(Math.round(cfg.copies || 2), 1, 2) : build ? 2 : 0;
  const perCar = S.kind !== 'team';
  const cost = +((S.cost * amb.cost * (next ? 0.75 : 1) + (build ? S.cost * 0.35 * (perCar ? copies / 2 : 1) : 0)) * Career.costScale(G)).toFixed(1);
  const blocked = A.works && !team.works ? 'Só equipes de fábrica desenvolvem o motor.' : next && S.kind === 'team' ? 'Pesquisa para o próximo ano é só para peças do carro.' : next && !RnD.nextOpen(G) ? `O regulamento libera a pesquisa do carro do ano seguinte a partir de ${(typeof Regs !== 'undefined' ? Regs.r(G).nextYearStartPct : 45)}% da temporada.` : null;
  const yr = G.season.year + (next ? 1 : 0);
  return {
    v2: true, area, size: amb.size, amb: cfg.amb || 'balanced', focus, next, wt, cfd, q: +q.toFixed(2),
    name: `${A.name}${next ? ` (carro de ${yr})` : ''} — ${amb.name.toLowerCase()}`,
    cost, races: design + build, design, build, designDays, buildDays, copies, first: cfg.first === 2 || cfg.first === '2' ? 2 : 1,
    min: +(g * 0.55).toFixed(2), max: +(g * 1.35).toFixed(2), risk,
    split: RnD.split(area, focus), staffName: staffP ? staffP.name : null, rel: next ? 0 : (A.rel || 0), blocked,
  };
};

RnD.start = (G, cfg) => {
  const team = Career.team(G);
  if (RnD.used(G) >= Career.slots(team)) return 'Sem vagas de projeto. Termine um projeto ou melhore as instalações.';
  const q = RnD.quote(G, cfg);
  if (q.blocked) return q.blocked;
  if (G.projects.some(p => !p.buildOnly && p.area === q.area && !!p.next === q.next)) return `Já existe um projeto de ${Career.AREAS[q.area].name.toLowerCase()} ${q.next ? 'para o carro do ano seguinte' : 'no carro atual'}: o mesmo departamento não toca dois ao mesmo tempo.`;
  const P = RnD.pool(G);
  if (q.wt > P.wt) return `Túnel de vento insuficiente neste período (restam ${P.wt} execuções).`;
  if (q.cfd > P.cfd) return `CFD insuficiente neste período (restam ${P.cfd} simulações).`;
  if (Career.capRoom(G) < q.cost) return `O projeto estouraria o teto orçamentário (${fmtMoney(G.db.rules.budgetCap)}): sobram ${fmtMoney(Math.max(0, Career.capRoom(G)))} depois do custo da fábrica até o fim do ano.`;
  if (G.finances.balance - q.cost < -15) return 'Caixa insuficiente para este projeto.';
  G.atrPool.wt -= q.wt; G.atrPool.cfd -= q.cfd;
  G.nextYearFocus = 0;   // o foco geral foi substituído pela pesquisa por peça
  Career.ledger(G, `P&D: ${q.name}`, -q.cost, 'P&D');
  Career.record(G, 'pd', `${team.name} iniciou o projeto "${q.name}" (${fmtMoney(q.cost)}, ${q.races} GPs, túnel ${q.wt}, CFD ${q.cfd}).`, { teams: [team.id] });
  G.projects.push({ id: Career.nextId(G, 'p'), ...q, left: q.races, total: q.races, dayMode: true, stage: 'design', dLeft: q.designDays, bLeft: q.buildDays, copiesLeft: q.copies, fitted: [], start: G.today || null });
  return null;
};
/* vagas: fabricar mais uma peça de um projeto pronto não ocupa vaga de projeto */
RnD.used = (G) => G.projects.filter(p => !p.buildOnly).length;

/* ---------- tempo em dias ---------- */
RnD.dayTick = (G, ev) => {
  const team = Career.team(G);
  const keep = [];
  G.projects.forEach(p => {
    if (!p.dayMode) { keep.push(p); return; }
    if (p.stage === 'design') {
      p.dLeft--;
      if (p.dLeft > 0) { keep.push(p); return; }
      // projeto pronto: resultado definido agora
      p.failed = RNG.chance(p.risk / 100);
      p.gain = +(p.failed ? RNG.range(-0.4, p.min * 0.4) : RNG.range(p.min, p.max)).toFixed(3);
      if (p.next || !p.buildDays) { RnD.apply(G, team, p, p.gain, p.failed, null); ev.push({ kind: 'done', p }); return; }
      p.stage = 'build'; p.bLeft = p.buildDays;
      const an = Career.AREAS[p.area].name;
      Career.mail(G, { from: byLang('Diretor técnico', 'Technical director'), tag: 'dev', title: byLang(`Projeto pronto: ${an}`, `Design complete: ${RnD.EN[p.area] || an}`), body: byLang(`O projeto "${p.name}" terminou${p.failed ? ', abaixo do esperado' : ''}. Começa a fabricação: ${p.buildDays} dia(s) por peça, ${p.copies} peça(s). A primeira vai para o carro #${p.first}.`, `The ${RnD.EN[p.area] || an} design is finished${p.failed ? ', below expectations' : ''}. Manufacturing starts: ${p.buildDays} day(s) per part, ${p.copies} part(s). The first goes on car #${p.first}.`) });
      ev.push({ kind: 'design', p }); keep.push(p); return;
    }
    p.bLeft--;
    if (p.bLeft > 0) { keep.push(p); return; }
    const seat = p.fitted.length ? (p.fitted[0] === 1 ? 2 : 1) : p.first;
    RnD.fit(G, team, p, seat);
    p.fitted.push(seat); p.copiesLeft--;
    ev.push({ kind: 'part', p, seat });
    if (p.copiesLeft > 0) { p.bLeft = p.buildDays; keep.push(p); }
  });
  G.projects = keep;
};

/* peça instalada num carro: o ganho de desempenho vale só para esse carro até a segunda peça */
RnD.PERF = { aero: true, chassis: true, engineBonus: true };
RnD.fit = (G, team, p, seat) => {
  const lu = Career.lineup(G, team.id);
  const d = lu.find(x => x.seat === seat);
  G.parts = G.parts || [];
  let part = G.parts.find(x => x.id === p.id);
  if (S_KIND(p) === 'team') { RnD.apply(G, team, p, p.gain, p.failed, null); return; }
  if (!part) {
    // primeira peça: diferença entre os carros (desempenho) e metade dos efeitos gerais
    part = { id: p.id, area: p.area, name: p.name, split: p.split, gain: p.gain, failed: p.failed, seats: [seat], y: G.season.year, half: {} };
    G.parts.push(part);
    G.seatDelta = G.seatDelta || { 1: {}, 2: {} };
    Object.entries(p.split).forEach(([f, w]) => {
      const g = p.gain * w;
      if (RnD.PERF[f]) G.seatDelta[seat][f] = +((G.seatDelta[seat][f] || 0) + g).toFixed(3);
      else { RnD.addField(team, f, g / 2); part.half[f] = g / 2; }
    });
    RnD.partDone(G, team, p, seat, true);
    RnD.partMail(G, p, seat, d, true);
    return;
  }
  // segunda peça: o carro inteiro passa a ter a evolução
  part.seats.push(seat);
  Object.entries(p.split).forEach(([f, w]) => {
    const g = p.gain * w;
    if (RnD.PERF[f]) { G.seatDelta[part.seats[0]][f] = +((G.seatDelta[part.seats[0]][f] || 0) - g).toFixed(3); RnD.addField(team, f, g); }
    else RnD.addField(team, f, g - (part.half[f] || 0));
  });
  G.parts = G.parts.filter(x => x !== part);
  RnD.partDone(G, team, p, seat, false);
  RnD.partMail(G, p, seat, d, false);
};
/* registro para "Atualizações concluídas": valor do atributo principal no carro que recebeu a peça */
RnD.partDone = (G, team, p, seat, first) => {
  const main = Object.keys(p.split)[0], g = p.gain * p.split[main];
  const base = main === 'engineBonus' ? (team.car.engineBonus || 0) + 85 : (team.car[main] ?? 80);
  const extra = first && RnD.PERF[main] ? ((G.seatDelta || {})[seat] || {})[main] || 0 : 0;
  const after = base + extra, before = after - (RnD.PERF[main] || first ? g : g / 2);
  const lines = Object.entries(p.split).map(([f, w]) => `${p.gain * w >= 0 ? '+' : ''}${(p.gain * w).toFixed(2)} ${RnD.FIELD_LABEL[f] || f}`);
  G.devDone = (G.devDone || []).concat([{ id: p.id + ':' + seat, area: p.area, name: p.name, before: +before.toFixed(2), after: +after.toFixed(2), failed: p.failed, lines, seat, both: !first, y: G.season.year, r: G.season.round, date: G.today, seen: false }]).slice(-12);
};
const S_KIND = (p) => (RnD.SPEC[p.area] || {}).kind;
RnD.addField = (team, f, g) => {
  if (f === 'pitCrew' || f === 'facilities') team[f] = +clamp(team[f] + g * (f === 'facilities' ? 1.6 : 1.4), 30, 100).toFixed(1);
  else if (f === 'engineBonus') team.car.engineBonus = +((team.car.engineBonus || 0) + g).toFixed(2);
  else team.car[f] = +clamp((team.car[f] ?? 80) + g, 30, ['reliability', 'tyreCare', 'cooling', 'energy'].includes(f) ? 99 : 110).toFixed(2);
};
RnD.partMail = (G, p, seat, d, first) => {
  const gains = Object.entries(p.split).map(([f, w]) => `${p.gain * w >= 0 ? '+' : ''}${(p.gain * w).toFixed(2)} ${RnD.FIELD_LABEL[f] || f}`).join(', ');
  const an = Career.AREAS[p.area].name, en = RnD.EN[p.area] || an;
  Career.mail(G, { from: byLang('Chefe de fábrica', 'Factory manager'), tag: 'dev', title: byLang(`Peça nova no carro #${seat}: ${an}`, `New part on car #${seat}: ${en}`),
    body: byLang(`${an} instalada no carro #${seat}${d ? ` (${d.name})` : ''}: ${gains}.${first ? (p.copiesLeft > 1 ? ` A peça do outro carro fica pronta em ${p.buildDays} dia(s).` : ' Só um carro tem a peça: fabrique a segunda na tela de P&D para igualar os dois carros.') : ' Os dois carros agora têm a peça.'}`,
      `${en} fitted to car #${seat}${d ? ` (${d.name})` : ''}.${first ? (p.copiesLeft > 1 ? ` The other car's part is ready in ${p.buildDays} day(s).` : ' Only one car has it: build the second part on the R&D screen to match both cars.') : ' Both cars now have the part.'}`) });
  Career.record(G, 'pd', `${Career.team(G).name}: ${Career.AREAS[p.area].name} nova no carro #${seat}${d ? ` (${d.name})` : ''} (${gains}).`, { teams: [G.player.teamId] });
};
/* diferença de desempenho de um carro em relação à base da equipe, na escala de Engine.carPerf */
RnD.seatPerf = (G, seat, track) => {
  const D = G.seatDelta && G.seatDelta[seat];
  if (!D) return 0;
  const w = track.weights, tot = w.aero + w.chassis + w.engine || 1;
  return ((D.aero || 0) * w.aero + (D.chassis || 0) * w.chassis + (D.engineBonus || 0) * w.engine) / tot;
};
/* fabricar a peça para o outro carro depois (não ocupa vaga de projeto) */
RnD.buildCopy = (G, partId) => {
  const part = (G.parts || []).find(x => x.id === partId);
  if (!part) return 'Peça não encontrada.';
  if (G.projects.some(p => p.buildOnly && p.id === partId)) return 'Essa peça já está sendo fabricada.';
  const S = RnD.SPEC[part.area];
  const cost = +(S.cost * 0.35 / 2 * Career.costScale(G)).toFixed(1);
  if (Career.capRoom(G) < cost) return `A peça estouraria o teto orçamentário (${fmtMoney(G.db.rules.budgetCap)}).`;
  Career.ledger(G, `Fabricação: ${Career.AREAS[part.area].name}`, -cost, 'P&D');
  G.projects.push({ id: part.id, v2: true, dayMode: true, buildOnly: true, area: part.area, name: part.name, size: 'small', split: part.split, gain: part.gain, failed: part.failed, stage: 'build', bLeft: S.build, buildDays: S.build, copies: 2, copiesLeft: 1, fitted: part.seats.slice(), first: part.seats[0], min: 0, max: 0, risk: 0, cost, left: 1, total: 1 });
  return null;
};
/* datas dos próximos marcos (para a central e o calendário) */
RnD.milestones = (G) => {
  const out = [];
  if (!G.today) return out;
  G.projects.filter(p => p.dayMode).forEach(p => {
    const A = Career.AREAS[p.area];
    if (p.stage === 'design') out.push({ date: Time.addDays(G.today, p.dLeft), kind: 'design', label: `${A.name}: projeto pronto` });
    else out.push({ date: Time.addDays(G.today, p.bLeft), kind: 'part', label: `${A.name}: peça ${p.fitted.length + 1} de ${p.copies}` });
  });
  return out;
};

(function () {
  // projetos em dias não andam por GP
  Hooks.around('Career', Career, 'advanceProjects', 'rnd', (adv, G, report) => {
    const dayP = G.projects.filter(p => p.dayMode);
    G.projects = G.projects.filter(p => !p.dayMode);
    adv(G, report);
    G.projects = G.projects.concat(dayP);
  });
  // carro novo: diferenças entre os carros somem (os dois saem iguais)
  Hooks.around('Career', Career, 'endSeason', 'rnd', (end, G) => {
    const r = end(G);
    G.seatDelta = { 1: {}, 2: {} }; G.parts = [];
    G.projects = (G.projects || []).filter(p => !p.buildOnly);
    return r;
  });
})();

/* aplica um projeto concluído (chamado por Career.advanceProjects) */
RnD.apply = (G, team, p, gain, failed, report) => {
  const fieldVals = {};
  const valOf = (f) => (f === 'pitCrew' || f === 'facilities') ? team[f] : f === 'engineBonus' ? (team.car.engineBonus || 0) + 85 : (team.car[f] ?? 80);
  Object.keys(p.split).forEach(f => { fieldVals[f] = valOf(f); });
  const A = Career.AREAS[p.area];
  const lines = [];
  Object.entries(p.split).forEach(([f, w]) => {
    const g = gain * w;
    if (p.next) { G.nextYearParts = G.nextYearParts || {}; G.nextYearParts[f] = +((G.nextYearParts[f] || 0) + g).toFixed(3); }
    else if (f === 'pitCrew' || f === 'facilities') team[f] = +clamp(team[f] + g * (f === 'facilities' ? 1.6 : 1.4), 30, 100).toFixed(1);
    else if (f === 'engineBonus') team.car.engineBonus = +((team.car.engineBonus || 0) + g).toFixed(2);
    else team.car[f] = +clamp((team.car[f] ?? 80) + g, 30, ['reliability', 'tyreCare', 'cooling', 'energy'].includes(f) ? 99 : 110).toFixed(2);
    lines.push(`${g >= 0 ? '+' : ''}${g.toFixed(2)} ${RnD.FIELD_LABEL[f] || f}`);
  });
  if (A.rel && !failed && !p.next) team.car.reliability = +clamp(team.car.reliability + A.rel * Career.SIZES[p.size].races / 2, 40, 99).toFixed(2);
  const txt = p.next
    ? `Pesquisa "${p.name}" concluída${failed ? ' abaixo do esperado' : ''}: ${lines.join(', ')} guardado para o carro de ${G.season.year + 1}.`
    : failed ? `O projeto "${p.name}" decepcionou: ${lines.join(', ')}.` : `Projeto "${p.name}" concluído: ${lines.join(', ')}.`;
  report && report.lines.push(txt);
  const main = Object.keys(p.split)[0];
  G.devDone = (G.devDone || []).concat([{ id: p.id, area: p.area, name: p.name, before: +fieldVals[main].toFixed(2), after: +(p.next ? fieldVals[main] + gain * p.split[main] : valOf(main)).toFixed(2), failed, next: !!p.next, lines, bank: 0, y: G.season.year, r: G.season.round, seen: false }]).slice(-12);
  Career.record(G, 'pd', `${team.name}: ${txt}`, { teams: [team.id] });
  Career.mail(G, { from: 'Diretor técnico', tag: 'dev', title: failed ? 'Atualização abaixo do esperado' : p.next ? 'Pesquisa concluída' : 'Atualização pronta', body: txt });
};

/* carro novo: as pesquisas por peça entram no carro do ano */
RnD.applyNextYear = (G, team) => {
  const N = G.nextYearParts;
  if (!N || !team) return 0;
  let tot = 0;
  Object.entries(N).forEach(([f, g]) => {
    tot += g;
    if (f === 'engineBonus') team.car.engineBonus = +((team.car.engineBonus || 0) + g).toFixed(2);
    else team.car[f] = +clamp((team.car[f] ?? 80) + g, 30, ['reliability', 'tyreCare', 'cooling', 'energy'].includes(f) ? 99 : 110).toFixed(2);
  });
  if (tot) Career.record(G, 'pd', `${team.name} estreia o carro de ${G.season.year + 1} com a pesquisa do ano anterior: ${Object.entries(N).map(([f, g]) => `+${g.toFixed(2)} ${RnD.FIELD_LABEL[f] || f}`).join(', ')}.`, { teams: [team.id] });
  G.nextYearParts = {};
  return +tot.toFixed(2);
};

(function () {
  Hooks.around('Career', Career, 'startProject', 'rnd', (sp, G, area, size, cfg) => (cfg ? RnD.start(G, cfg) : sp(G, area, size)));
})();
