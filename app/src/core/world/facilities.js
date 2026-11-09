/* ============================================================
   PIT WALL — sede, fábrica e operação (V0.8.4)
   12 instalações por equipe, nível 1 a 5 e estado de conservação (0–100).
   O nível efetivo cai com o estado: instalação velha rende menos.
   Efeitos (jogador e equipes do jogo, com as mesmas contas):
   - Escritório de projeto e fábrica: vagas de projeto do P&D, prazo de projeto e de fabricação.
   - Túnel de vento e CFD: qualidade das peças aerodinâmicas. Banco de testes: chassi e confiabilidade.
   - Departamento de motores: desenvolvimento do motor (equipes de fábrica e fabricantes).
   - Simulador: voltas extras de acerto antes do fim de semana.
   - Logística: custo de frete e operação. Centro de pit stop: equipe de boxes.
   - Centro de performance humana: recuperação de lesões e doenças.
   - Sede: atrai funcionários e dá estabilidade. Hospitalidade e marketing: patrocínio.
   O número antigo "instalações" (t.facilities, 30–100) vira a média ponderada das 12, para todo
   o resto do jogo continuar coerente (custo da fábrica, valor da equipe, capacidade técnica).
   Investimento de capital: até um limite anual fica fora do teto de gastos (como a regra real de
   CapEx); o excedente entra no teto.
   ============================================================ */
'use strict';

const Fac = {};
/* id: [nome, nome em inglês, peso no número geral, custo-base por nível (US$ mi), obras em etapas, manutenção-base] */
Fac.B = {
  sede: ['Sede', 'Headquarters', 0.7, 4.5, 6, 0.5],
  fabrica: ['Fábrica', 'Factory', 1.4, 6, 6, 0.8],
  design: ['Escritório de projeto', 'Design office', 1.2, 4, 5, 0.5],
  tunel: ['Túnel de vento', 'Wind tunnel', 1.5, 8, 8, 0.9],
  cfd: ['Centro de CFD', 'CFD centre', 1.1, 5, 5, 0.6],
  simulador: ['Simulador', 'Simulator', 0.9, 4, 5, 0.4],
  banco: ['Banco de testes (chassi e suspensão)', 'Test rig (chassis and suspension)', 0.9, 3.5, 4, 0.4],
  motor: ['Departamento de motores', 'Power unit department', 0.6, 9, 8, 1],
  logistica: ['Centro de logística', 'Logistics centre', 0.6, 3, 4, 0.4],
  pitstop: ['Centro de treino de pit stop', 'Pit stop training centre', 0.5, 1.5, 3, 0.2],
  medico: ['Centro de performance humana', 'Human performance centre', 0.4, 2, 3, 0.2],
  marketing: ['Hospitalidade e marketing', 'Hospitality and marketing', 0.5, 2.5, 3, 0.3],
};
Fac.IDS = Object.keys(Fac.B);
Fac.EFFECT = {
  sede: ['Atrai e segura funcionários; estabilidade da equipe', 'Attracts and keeps staff; team stability'],
  fabrica: ['Vagas de projeto e velocidade de fabricação das peças', 'Project slots and part manufacturing speed'],
  design: ['Vagas de projeto e prazo de desenho das peças', 'Project slots and part design time'],
  tunel: ['Qualidade das peças aerodinâmicas (correlação com a pista)', 'Aero part quality (track correlation)'],
  cfd: ['Qualidade das peças aerodinâmicas e mecânicas', 'Aero and mechanical part quality'],
  simulador: ['Voltas extras de acerto antes de cada GP', 'Extra setup laps before each GP'],
  banco: ['Ganho de chassi e confiabilidade', 'Chassis and reliability gains'],
  motor: ['Desenvolvimento do motor (só equipes de fábrica)', 'Power unit development (works teams only)'],
  logistica: ['Custo de frete e operação', 'Freight and operating costs'],
  pitstop: ['Rendimento da equipe de boxes', 'Pit crew performance'],
  medico: ['Recuperação de lesões e doenças', 'Injury and illness recovery'],
  marketing: ['Satisfação e mercado de patrocinadores', 'Sponsor satisfaction and market'],
};
Fac.MAX = 5;
Fac.CAPEX = 30;          // investimento anual fora do teto (US$ mi); equipes do fundo ganham mais
Fac.name = (id) => byLang(Fac.B[id][0], Fac.B[id][1]);
Fac.round = (G) => G.season.year * 100 + G.season.round;

/* ---------- estado ---------- */
Fac.ensure = (G, t) => {
  if (t.fac && t.fac.sede) return t.fac;
  const base = (t.facilities ?? 70);
  const r = localRng('fac:' + t.id + ':' + (G.seed || ''));
  t.fac = {};
  Fac.IDS.forEach(id => {
    let lvl = (base - 45) / 10.5 + (r() - 0.5) * 1.2;
    if (id === 'motor') lvl = t.works ? lvl + 0.5 : 0;           // só quem faz motor tem o departamento
    if (id === 'tunel' && (t.reputation || 60) >= 85) lvl += 0.4;
    t.fac[id] = { lvl: id === 'motor' && !t.works ? 0 : Math.round(clamp(lvl, 1, Fac.MAX)), cond: Math.round(70 + r() * 25) };
  });
  t.facYear = { y: G.season ? G.season.year : 2027, spent: 0 };
  Fac.sync(t);
  return t.fac;
};
Fac.ensureAll = (G) => G.db.teams.forEach(t => Fac.ensure(G, t));
/* nível efetivo: o estado tira até 30% do nível */
Fac.eff = (t, id) => { const f = t.fac && t.fac[id]; if (!f || !f.lvl) return 0; return f.lvl * (0.7 + 0.3 * f.cond / 100); };
/* túnel alugado da parceira técnica (Haas usa o da Ferrari, por exemplo) */
Fac.effTunnel = (G, t) => { const own = Fac.eff(t, 'tunel'); const p = typeof Owners !== 'undefined' && Owners.partnerOf ? Owners.partnerOf(G, t.id) : null; const par = p && (p.parts || []).some(x => /túnel/.test(x)) ? Career.team(G, p.parent) : null; return par && par.fac ? Math.max(own, Fac.eff(par, 'tunel') - 1) : own; };
/* número geral antigo (30–100) = média ponderada das instalações */
Fac.sync = (t) => {
  let s = 0, w = 0;
  Fac.IDS.forEach(id => { if (id === 'motor' && !t.works) return; const W = Fac.B[id][2]; s += Fac.eff(t, id) * W; w += W; });
  t.facilities = +clamp(45 + 10.5 * (s / w), 30, 100).toFixed(1);
  return t.facilities;
};
/* multiplicador de um efeito (1 = nível 3 em bom estado) */
Fac.mul = (G, t, id, k) => { if (!t || !t.fac) return 1; const e = id === 'tunel' ? Fac.effTunnel(G, t) : Fac.eff(t, id); return 1 + (e - 2.8) * (k || 0.04); };

/* ---------- obras ---------- */
Fac.cost = (t, id) => { const f = t.fac[id]; return +(Fac.B[id][3] * Math.pow(f.lvl + 1, 1.35)).toFixed(1); };
Fac.rounds = (t, id) => Fac.B[id][4] + t.fac[id].lvl;
Fac.repairCost = (t, id) => { const f = t.fac[id]; return +((100 - f.cond) / 100 * Math.max(1, f.lvl) * Fac.B[id][5] * 2).toFixed(2); };
Fac.allowance = (G, t) => {
  const sc = Career.standingsC(G); const pos = sc.findIndex(x => x.tid === t.id) + 1 || sc.length;
  return Fac.CAPEX + (pos > sc.length - 3 ? 10 : 0);   // as três últimas têm mais investimento liberado
};
Fac.yearSpent = (G, t) => { if (!t.facYear || t.facYear.y !== G.season.year) t.facYear = { y: G.season.year, spent: 0 }; return t.facYear.spent; };
/* paga uma obra: dentro do limite anual fica fora do teto; o resto conta no teto */
Fac.pay = (G, t, v, desc) => {
  const room = Math.max(0, Fac.allowance(G, t) - Fac.yearSpent(G, t));
  const out = Math.min(v, room), inside = +(v - out).toFixed(2);
  t.facYear.spent = +(t.facYear.spent + v).toFixed(2);
  if (Fac.isPlayer(G, t)) {
    if (out > 0) Career.ledger(G, desc, -out, 'infraestrutura');
    if (inside > 0) Career.ledger(G, desc + byLang(' (acima do limite de investimento: conta no teto)', ' (above the capex allowance: counts towards the cap)'), -inside, 'fábrica');
  } else { t.cash = +((t.cash || 0) - v).toFixed(2); t.spent = +((t.spent || 0) + inside).toFixed(2); }
};
Fac.isPlayer = (G, t) => !Career.isObs(G) && t.id === G.player.teamId;
Fac.canUpgrade = (G, t, id) => {
  const f = t.fac[id];
  if (id === 'motor' && !t.works) return byLang('Só equipes de fábrica (com motor próprio) têm departamento de motores.', 'Only works teams (with their own power unit) have a power unit department.');
  if (f.lvl >= Fac.MAX) return byLang('Já está no nível máximo.', 'Already at the top level.');
  if (f.build) return byLang('Já há uma obra em andamento aqui.', 'Construction is already under way here.');
  if (Fac.IDS.filter(x => t.fac[x].build).length >= 2) return byLang('No máximo duas obras ao mesmo tempo.', 'At most two building projects at a time.');
  const cash = Fac.isPlayer(G, t) ? G.finances.balance : (t.cash || 0);
  if (cash - Fac.cost(t, id) < -10) return byLang('Caixa insuficiente.', 'Not enough cash.');
  return null;
};
Fac.upgrade = (G, t, id) => {
  const err = Fac.canUpgrade(G, t, id); if (err) return err;
  const c = Fac.cost(t, id), n = Fac.rounds(t, id);
  Fac.pay(G, t, c, byLang(`Obra: ${Fac.name(id)} (nível ${t.fac[id].lvl + 1})`, `Construction: ${Fac.name(id)} (level ${t.fac[id].lvl + 1})`));
  t.fac[id].build = { to: t.fac[id].lvl + 1, due: Fac.addRounds(G, n), cost: c };
  if (!Fac.isPlayer(G, t) && t.fac[id].lvl >= 3) Career.news(G, byLang(`${t.name} começa a ampliar: ${Fac.name(id).toLowerCase()}`, `${t.name} starts expanding: ${Fac.name(id).toLowerCase()}`), 'tecnica', '', { tm: [t.id] });
  return null;
};
Fac.addRounds = (G, n) => { const len = G.season.calendar.length; let y = G.season.year, r = G.season.round + n; while (r > len) { r -= len; y++; } return y * 100 + r; };
Fac.repair = (G, t, id) => {
  const c = Fac.repairCost(t, id); if (c <= 0.05) return byLang('Já está em bom estado.', 'Already in good condition.');
  const cash = Fac.isPlayer(G, t) ? G.finances.balance : (t.cash || 0);
  if (cash - c < -10) return byLang('Caixa insuficiente.', 'Not enough cash.');
  if (Fac.isPlayer(G, t)) Career.ledger(G, byLang(`Manutenção: ${Fac.name(id)}`, `Maintenance: ${Fac.name(id)}`), -c, 'fábrica'); else { t.cash = +((t.cash || 0) - c).toFixed(2); t.spent = +((t.spent || 0) + c).toFixed(2); }
  t.fac[id].cond = 100; Fac.sync(t);
  return null;
};
/* depois de cada GP: desgaste e obras que terminam */
Fac.tick = (G) => {
  const now = Fac.round(G);
  G.db.teams.forEach(t => {
    Fac.ensure(G, t);
    Fac.IDS.forEach(id => {
      const f = t.fac[id]; if (!f.lvl && !f.build) return;
      f.cond = +clamp(f.cond - 0.33 - (f.lvl >= 4 ? 0.05 : 0), 20, 100).toFixed(1);
      if (f.build && f.build.due <= now) {
        f.lvl = f.build.to; f.cond = 100; delete f.build;
        if (Fac.isPlayer(G, t)) Career.mail(G, { from: byLang('Diretor de operações', 'Operations director'), tag: 'team', important: true, title: byLang(`Obra concluída: ${Fac.name(id)} nível ${f.lvl}`, `Construction complete: ${Fac.name(id)} level ${f.lvl}`), body: byLang(`${Fac.name(id)} já funciona no nível ${f.lvl}. ${Fac.EFFECT[id][0]}.`, `${Fac.name(id)} is now running at level ${f.lvl}. ${Fac.EFFECT[id][1]}.`) });
        else if (f.lvl >= 4) Career.record(G, 'equipe', byLang(`${t.name} inaugurou: ${Fac.name(id).toLowerCase()} nível ${f.lvl}.`, `${t.name} opened: ${Fac.name(id).toLowerCase()} level ${f.lvl}.`), { teams: [t.id] });
      }
    });
    Fac.sync(t);
    // jogador: aviso uma vez por temporada quando uma instalação passa a render bem menos
    if (Fac.isPlayer(G, t)) Fac.IDS.forEach(id => { const f = t.fac[id]; if (f.lvl && f.cond < 60 && f.warned !== G.season.year) { f.warned = G.season.year; Career.mail(G, { from: byLang('Diretor de operações', 'Operations director'), tag: 'team', title: byLang(`${Fac.name(id)} precisa de manutenção`, `${Fac.name(id)} needs maintenance`), body: byLang(`O estado caiu para ${Math.round(f.cond)}% e o rendimento já é menor. A manutenção custa ${fmtMoney(Fac.repairCost(t, id))} na tela Sede e fábrica.`, `Condition is down to ${Math.round(f.cond)}% and output is already lower. Maintenance costs ${fmtMoney(Fac.repairCost(t, id))} on the HQ & factory screen.`) }); } });
    // equipes do jogo fazem manutenção quando o estado cai demais
    if (!Fac.isPlayer(G, t)) Fac.IDS.forEach(id => { const f = t.fac[id]; if (f.lvl && f.cond < 62 && (t.cash || 0) > Fac.repairCost(t, id) + 15) Fac.repair(G, t, id); });
  });
};
/* fim de temporada: as equipes do jogo investem o excedente (antes ia direto para "instalações") */
Fac.PRIORITY = { aero: ['tunel', 'cfd', 'design', 'fabrica', 'simulador', 'banco'], base: ['fabrica', 'design', 'cfd', 'tunel', 'banco', 'simulador', 'logistica', 'sede'], extra: ['pitstop', 'medico', 'marketing', 'logistica', 'sede'] };
Fac.aiSpend = (G, t, money) => {
  Fac.ensure(G, t);
  let left = money; const done = [];
  const order = (t.reputation >= 80 ? Fac.PRIORITY.aero : Fac.PRIORITY.base).concat(Fac.PRIORITY.extra, t.works ? ['motor'] : []);
  // primeiro o que está pior em relação à média do grid
  const avgL = (id) => avg(G.db.teams.map(x => (x.fac && x.fac[id] ? x.fac[id].lvl : 2)));
  const cand = order.filter(id => t.fac[id] && (id !== 'motor' || t.works)).sort((a, b) => (t.fac[a].lvl - avgL(a)) - (t.fac[b].lvl - avgL(b)) || order.indexOf(a) - order.indexOf(b));
  for (const id of cand) {
    if (left <= 0) break;
    const c = Fac.cost(t, id);
    if (c > left * 1.15 || Fac.canUpgrade(G, t, id)) continue;
    // não estoura o limite anual fora do teto (equipe do jogo também respeita o teto)
    if (Fac.yearSpent(G, t) + c > Fac.allowance(G, t) * 1.05) continue;
    Fac.upgrade(G, t, id); left -= c; done.push(Fac.name(id).toLowerCase());
  }
  return { spent: +(money - left).toFixed(1), done };
};
/* compra de equipe: dono rico reforma o que estiver pior */
Fac.boost = (G, t, pts) => {
  Fac.ensure(G, t);
  const n = Math.max(0, Math.round(pts));
  Fac.IDS.filter(id => t.fac[id].lvl).sort((a, b) => t.fac[a].lvl - t.fac[b].lvl).slice(0, n).forEach(id => { t.fac[id].lvl = Math.min(Fac.MAX, t.fac[id].lvl + 1); t.fac[id].cond = 100; });
  Fac.IDS.forEach(id => { if (t.fac[id].lvl) t.fac[id].cond = Math.max(t.fac[id].cond, 85); });
  Fac.sync(t);
};
/* motor próprio: a equipe ganha o departamento de motores */
Fac.openEngineDept = (G, t) => { Fac.ensure(G, t); if (!t.fac.motor.lvl) { t.fac.motor.lvl = 2; t.fac.motor.cond = 100; } Fac.sync(t); };
Fac.slots = (t) => 1 + Math.floor(Fac.eff(t, 'design') / 2) + (Fac.eff(t, 'fabrica') >= 3.8 ? 1 : 0);
Fac.rank = (G, t, id) => 1 + G.db.teams.filter(x => x.fac && Fac.eff(x, id) > Fac.eff(t, id) + 0.05).length;

/* ---------- ganchos ---------- */
(function () {
  // vagas de projeto: escritório de projeto e fábrica
  Hooks.around('Career', Career, 'slots', 'facilities', (sl, team) => (team && team.fac ? Fac.slots(team) : sl(team)));
  // P&D do jogador: qualidade e prazo dependem das instalações
  if (typeof RnD !== 'undefined') {
    Hooks.around('RnD', RnD, 'quote', 'facilities', (qt, G, cfg) => {
      const q = qt(G, cfg); const team = Career.team(G); if (!q || !team || !team.fac) return q;
      const S = RnD.SPEC[q.area] || {};
      const m = S.kind === 'aero' ? (Fac.mul(G, team, 'tunel', 0.05) + Fac.mul(G, team, 'cfd', 0.035)) / 2 : S.kind === 'pu' ? Fac.mul(G, team, 'motor', 0.06) : S.kind === 'team' ? 1 : (Fac.mul(G, team, 'banco', 0.045) + Fac.mul(G, team, 'cfd', 0.025)) / 2;
      q.min = +(q.min * m).toFixed(2); q.max = +(q.max * m).toFixed(2);
      q.designDays = Math.max(3, Math.round(q.designDays * (1.12 - Fac.eff(team, 'design') * 0.04)));
      if (q.buildDays) q.buildDays = Math.max(1, Math.round(q.buildDays * (1.15 - Fac.eff(team, 'fabrica') * 0.05)));
      if (q.area === 'facilities') q.blocked = byLang('As instalações agora são administradas na tela Sede e fábrica.', 'Facilities are now managed on the HQ & factory screen.');
      q.facMul = +m.toFixed(3);
      return q;
    });
  }
  // equipes do jogo: o mesmo efeito na conversão dinheiro → desempenho
  if (typeof AI !== 'undefined' && AI.areaGain) {
    Hooks.around('AI', AI, 'areaGain', 'facilities', (dg, t, area, money, ...a) => dg(t, area, money, ...a) * (t.fac && AI.G ? (area === 'aero' ? (Fac.mul(AI.G, t, 'tunel', 0.05) + Fac.mul(AI.G, t, 'cfd', 0.035)) / 2 : area === 'chassis' ? Fac.mul(AI.G, t, 'banco', 0.045) : 1) : 1));
  }
  // logística e operação
  Hooks.around('Staff', Staff, 'opsMul', 'facilities', (om, t) => om(t) * (t.fac ? 1.1 - Fac.eff(t, 'logistica') * 0.035 : 1));
  // pit stop
  // o centro de pit stop move o ponto de equilíbrio (até ~3 pontos), não soma a cada GP (somar levava todos a 99)
  Hooks.around('Staff', Staff, 'pitDrift', 'facilities', (pd, t) => pd(t) + (t.fac ? (Fac.eff(t, 'pitstop') - 2.8) * 0.028 : 0));
  // patrocínio
  Hooks.around('Staff', Staff, 'commercialMul', 'facilities', (cm, t) => cm(t) * (t.fac ? 0.95 + Fac.eff(t, 'marketing') * 0.012 + Fac.eff(t, 'sede') * 0.006 : 1));
  // contratar funcionário de outra equipe: sede melhor atrai mais
  if (Staff.poachChance) {
    Hooks.around('Staff', Staff, 'poachChance', 'facilities', (pc, G, s, fromTeam) => { const me = Career.team(G); return clamp(pc(G, s, fromTeam) * (me && me.fac ? 0.85 + Fac.eff(me, 'sede') * 0.05 : 1), 0.02, 0.95); });
  }
  // lesões: centro de performance humana encurta a recuperação
  if (typeof Chaos !== 'undefined') {
    Hooks.around('Chaos', Chaos, 'injure', 'facilities', (inj, G, d, r, how, gp) => { inj(G, d, r, how, gp); const t = d.team && Career.team(G, d.team); if (t && t.fac && d.injured > 1) d.injured = Math.max(1, Math.round(d.injured * (1.15 - Fac.eff(t, 'medico') * 0.06))); });
  }
  // simulador: voltas extras de acerto para o jogador
  Hooks.around('Career', Career, 'startWeekend', 'facilities', (sw, G, ...a) => {
    const t = !Career.isObs(G) ? Career.team(G) : null;
    if (t && t.fac) { const b = Math.round((Fac.eff(t, 'simulador') - 2.5) * 0.6); if (b > 0) G.pendingPracticeBonus = (G.pendingPracticeBonus || 0) + b; }
    return sw(G, ...a);
  });
  Hooks.around('Career', Career, 'finishWeekend', 'facilities', (fw, G, ...a) => { const r = fw(G, ...a); Fac.tick(G); return r; });
  Hooks.around('Career', Career, 'initPeople', 'facilities', (ip, G) => { const r = ip(G); Fac.ensureAll(G); return r; });
  Hooks.around('Career', Career, 'endSeason', 'facilities', (es, G) => { Fac.ensureAll(G); const r = es(G); G.db.teams.forEach(t => { Fac.ensure(G, t); Fac.sync(t); }); return r; });
  // equipes novas e compradas
  if (typeof Owners !== 'undefined') {
    Hooks.around('Owners', Owners, 'addTeam', 'facilities', (at, G, spec) => { const t = at(G, spec); t.fac = null; Fac.ensure(G, t); return t; });
    Hooks.around('Owners', Owners, 'engineProjects', 'facilities', (ep, G) => { ep(G); G.db.teams.forEach(t => { if (t.works && t.fac && !t.fac.motor.lvl) Fac.openEngineDept(G, t); }); });
  }
})();
