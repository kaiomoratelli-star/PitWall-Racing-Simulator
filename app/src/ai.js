/* ============================================================
   PIT WALL — IA dos chefes de equipe
   Cada equipe controlada pela IA tem personalidade, caixa próprio,
   teto orçamentário e decide onde investir. Nada é de graça:
   todo ganho técnico vem de dinheiro gasto e fica registrado.
   ============================================================ */
'use strict';

const AI = {};

AI.PERSONAS = {
  ambitious: { label: 'Ambiciosa', ambition: 0.85, risk: 0.65, thrift: 0.2 },
  balanced: { label: 'Equilibrada', ambition: 0.6, risk: 0.45, thrift: 0.45 },
  prudent: { label: 'Prudente', ambition: 0.45, risk: 0.25, thrift: 0.75 },
  gambler: { label: 'Arrojada', ambition: 0.7, risk: 0.85, thrift: 0.25 },
  survivor: { label: 'Sobrevivente', ambition: 0.35, risk: 0.35, thrift: 0.85 },
};

AI.init = (G) => {
  G.db.teams.forEach(t => {
    if (!t.ai || !AI.PERSONAS[t.ai.persona]) {
      const r = localRng(G.seed + ':persona:' + t.id);
      const keys = t.reputation >= 85 ? ['ambitious', 'balanced', 'gambler'] : t.budget < 110 ? ['survivor', 'prudent', 'gambler', 'balanced'] : ['balanced', 'prudent', 'ambitious', 'gambler'];
      t.ai = { persona: keys[Math.floor(r() * keys.length)] };
    }
    if (t.cash == null) t.cash = Math.round(t.budget * 0.3);
    if (t.spent == null) t.spent = 0;
    if (t.nextYearBank == null) t.nextYearBank = 0;
    t.history = t.history || [];
  });
};
AI.persona = (t) => AI.PERSONAS[(t.ai && t.ai.persona) || 'balanced'] || AI.PERSONAS.balanced;

AI.areaGain = (t, area, money) => {
  // mesma conversão dinheiro → desempenho dos projetos do jogador (~0,16 ponto por milhão)
  const staffKey = { aero: 'aero', chassis: 'engineering', reliability: 'technical' }[area];
  const sk = 0.7 + (t.staff[staffKey] || 75) / 100 * 0.5;
  const cur = t.car[area];
  const dimin = clamp(1 - (cur - 82) / 40, 0.3, 1.25);
  return money * 0.15 * sk * dimin;
};

/* uma rodada de decisões por corrida para cada equipe da IA */
AI.raceTick = (G) => {
  const races = G.season.calendar.length;
  const cap = G.db.rules.budgetCap;
  const late = G.season.round / races;
  const sc = Career.standingsC(G);
  G.db.teams.forEach(t => {
    if (t.id === G.player.teamId) return;
    const P = AI.persona(t);
    // receitas e custos fixos
    const income = t.budget * 0.97 / races;
    const salaries = sum(Career.teamDrivers(G, t.id).map(d => d.salary)) / races;
    const staffCost = sum(Object.values(t.staff)) * 0.0042 * 24 / races;
    const ops = 1.25 + t.facilities * 0.006;
    const engine = Engine.engineOf(G.db, t).cost / races;
    t.cash = +(t.cash + income - salaries - staffCost - ops - engine).toFixed(3);
    t.spent += ops;
    // investimento: nunca gasta o que não tem, respeita o teto
    const reserve = t.budget * (0.04 + P.thrift * 0.08);
    const available = Math.max(0, t.cash - reserve);
    const capLeft = Math.max(0, cap - t.spent);
    let spend = Math.min(available * (0.25 + P.ambition * 0.35), capLeft * 0.12, t.budget * 0.06);
    if (spend < 0.3) spend = 0;
    if (spend > 0) {
      // prioridade: área mais fraca em relação ao grid, com viés da personalidade
      const avgOf = k => avg(G.db.teams.map(x => x.car[k]));
      const need = ['aero', 'chassis', 'reliability'].map(k => ({ k, gap: avgOf(k) - t.car[k] + (k === 'reliability' ? (1 - P.risk) * 2 - 1 : 0) + RNG.normal(0, 1.2) }));
      need.sort((a, b) => b.gap - a.gap);
      const area = need[0].k;
      // foco no próximo ano: quem está longe do objetivo na reta final pensa no carro novo
      const pos = sc.findIndex(x => x.tid === t.id) + 1;
      const hopeless = late > 0.55 && (pos > 3 || P.ambition < 0.5);
      const focus = late > 0.45 ? clamp((hopeless ? 0.6 : 0.25) + (late - 0.45), 0, 0.85) : 0;
      let g = AI.areaGain(t, area, spend) * clamp(RNG.normal(1, 0.35 + P.risk * 0.2), -0.2, 2.2);
      const now = g * (area === 'reliability' ? 1 : 1 - focus);
      const bank = area === 'reliability' ? 0 : g * focus * 1.3;
      t.car[area] = +clamp(t.car[area] + now, 30, area === 'reliability' ? 99 : 110).toFixed(2);
      t.nextYearBank = +(t.nextYearBank + bank).toFixed(3);
      t.cash = +(t.cash - spend).toFixed(3);
      t.spent = +(t.spent + spend).toFixed(3);
      t.lastDev = { area, spend: +spend.toFixed(2), gain: +now.toFixed(2), round: G.season.round };
      if (g > 1.2 && RNG.chance(0.6)) {
        Career.news(G, `${t.name} estreia pacote de ${Career.AREAS[area].name.toLowerCase()} e impressiona no paddock`, 'técnica');
        Career.record(G, 'pd', `${t.name} investiu ${fmtMoney(spend)} em ${Career.AREAS[area].name.toLowerCase()} (+${now.toFixed(2)}).`, { teams: [t.id] });
      }
    }
    // contratação de staff quando sobra dinheiro
    if (t.cash > t.budget * 0.15 && RNG.chance(0.06 + P.ambition * 0.06)) {
      const weakest = Object.entries(t.staff).sort((a, b) => a[1] - b[1])[0];
      const cand = (G.staffMarket || []).filter(s => s.role === weakest[0] && s.rating > weakest[1] + 3 && s.fee < t.cash * 0.3).sort((a, b) => b.rating - a.rating)[0];
      if (cand) {
        t.cash -= cand.fee;
        const old = (t.staffNames && t.staffNames[cand.role]) || 'o antigo responsável';
        t.staff[cand.role] = cand.rating;
        t.staffNames = t.staffNames || {}; t.staffNames[cand.role] = cand.name;
        G.staffMarket = G.staffMarket.filter(s => s.id !== cand.id);
        Career.news(G, `${t.name} contrata ${cand.name} como ${Career.STAFF_ROLES[cand.role].toLowerCase()}`, 'mercado');
        Career.record(G, 'staff', `${t.name} contratou ${cand.name} (${Career.STAFF_ROLES[cand.role]}, nível ${cand.rating}) no lugar de ${old}. Motivo: área mais fraca da equipe.`, { teams: [t.id] });
      }
    }
    // crise financeira
    if (t.cash < 0 && !t.inCrisis) {
      t.inCrisis = true;
      Career.news(G, `${t.name} enfrenta dificuldades financeiras e congela investimentos`, 'paddock');
      Career.record(G, 'financas', `${t.name} entrou em crise: caixa negativo (${fmtMoney(t.cash)}). Desenvolvimento suspenso.`, { teams: [t.id] });
    } else if (t.cash > t.budget * 0.05 && t.inCrisis) {
      t.inCrisis = false;
      Career.record(G, 'financas', `${t.name} recuperou o equilíbrio financeiro.`, { teams: [t.id] });
    }
  });
};

/* fim de temporada: premiação entra no caixa, banco de desenvolvimento vira carro novo */
AI.seasonEnd = (G, sc) => {
  sc.forEach((x, i) => {
    const t = Career.team(G, x.tid);
    if (!t || t.id === G.player.teamId) return;
    t.cash = +(t.cash + (G.db.rules.prizePerPosition[i] || 8)).toFixed(2);
    // excedente: parte vira infraestrutura (fora do teto), o resto é distribuído aos donos
    const keep = t.budget * 0.45;
    if (t.cash > keep) {
      const P = AI.persona(t);
      const excess = t.cash - keep;
      const infra = Math.min(excess * (0.3 + P.ambition * 0.3), 25);
      const gain = infra * 0.25 * clamp(1 - (t.facilities - 70) / 40, 0.2, 1.2);
      t.facilities = +clamp(t.facilities + gain, 30, 100).toFixed(1);
      const dividend = (excess - infra) * (0.4 + P.thrift * 0.4);
      t.cash = +(t.cash - infra - dividend).toFixed(2);
      Career.record(G, 'financas', `${t.name} fechou ${G.season.year} com sobra de caixa: investiu ${fmtMoney(infra)} em instalações (+${gain.toFixed(1)}) e distribuiu ${fmtMoney(dividend)} aos proprietários.`, { teams: [t.id] });
    }
  });
};
AI.applyNextYear = (G) => {
  G.db.teams.forEach(t => {
    if (t.id === G.player.teamId) return;
    if (t.nextYearBank > 0) {
      t.car.aero = +(t.car.aero + t.nextYearBank * 0.55).toFixed(2);
      t.car.chassis = +(t.car.chassis + t.nextYearBank * 0.45).toFixed(2);
      Career.record(G, 'pd', `${t.name} estreia carro novo com +${t.nextYearBank.toFixed(2)} de desenvolvimento acumulado.`, { teams: [t.id] });
    }
    t.nextYearBank = 0;
    t.spent = 0;
  });
};

/* explica a decisão de mercado da IA em texto */
AI.whyRenew = (t, d) => `${t.name} renovou com ${d.name}: overall ${driverOverall(d)} e moral ${Math.round(d.morale)}.`;
AI.whyRelease = (t, d, best) => `${t.name} não renovou com ${d.name} (overall ${driverOverall(d)}): havia opção melhor no mercado${best ? ` (${best.name}, ${driverOverall(best)})` : ''}.`;
