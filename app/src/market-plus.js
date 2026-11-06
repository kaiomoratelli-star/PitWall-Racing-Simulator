/* ============================================================
   PIT WALL — mercado: realismo complementar (envolve market.js, não o substitui)
   - Atratividade da equipe inclui saúde financeira.
   - Estrelas recusam equipes sem horizonte quando têm opção melhor.
   - Pilotos com patrocínio pessoal: valem mais para equipes com caixa
     apertado; o dinheiro entra de fato nas contas da equipe a cada ano.
     Valores estimados pelo jogo (fictícios), nunca apresentados como reais.
   - Empresários: carteira, reputação e relação com equipes (abre portas,
     não garante contratos impossíveis).
   - Política de academia por grupo (configurável em G.db.rules.groupPolicies).
   - Rescisão no meio do ano custa multa à equipe.
   ============================================================ */
'use strict';

const MarketPlus = {};
MarketPlus.DEFAULT_POLICIES = {
  'red-bull': { name: 'Red Bull', teams: ['red-bull', 'racing-bulls'], academyWeight: 14, externalPenalty: 9, note: 'Prioridade quase total à Red Bull Junior Team; contratação externa só sem opção à altura.' },
};
MarketPlus.policies = (G) => {
  G.db.rules.groupPolicies = G.db.rules.groupPolicies || JSON.parse(JSON.stringify(MarketPlus.DEFAULT_POLICIES));
  return G.db.rules.groupPolicies;
};
MarketPlus.policyOf = (G, tid) => Object.entries(MarketPlus.policies(G)).find(([, p]) => (p.teams || []).includes(tid)) || null;

/* apoio financeiro pessoal (estimado): poucos pilotos, valores de 1 a 18 milhões por ano */
MarketPlus.KINDS = ['patrocinadores pessoais', 'empresa do país de origem', 'grupo de investidores', 'fundo de desenvolvimento de pilotos'];
MarketPlus.init = (G) => {
  if (G.backingDone) return;
  G.db.drivers.forEach(d => {
    if (d.backing != null) return;
    if (!d.regen) { d.backing = null; return; } // só pilotos fictícios: não inventamos patrocínio de pessoas reais
    const r = localRng(`back:${G.seed}:${d.id}`);
    const p = d.age <= 24 ? 0.16 : 0.08;
    d.backing = r() < p ? { m: Math.round(1 + Math.pow(r(), 1.8) * 17), kind: MarketPlus.KINDS[Math.floor(r() * MarketPlus.KINDS.length)], est: true } : null;
  });
  G.backingDone = true;
};
/* novatos gerados ao longo dos anos também podem trazer patrocínio */
MarketPlus.tagNew = (G) => { G.backingDone = false; MarketPlus.init(G); };
/* empresário: id estável por piloto (os reais vêm de real-extra); reputação e afinidade com cada equipe */
MarketPlus.agent = (d) => {
  const name = d.manager ? (typeof d.manager === 'string' ? d.manager : d.manager.name) : null;
  const key = name || 'ag-' + (hashStr(d.id) % 37);
  const r = localRng('agent:' + key);
  return { key, name: name || null, rep: Math.round(35 + r() * 60) };
};
MarketPlus.affinity = (agent, tid) => (localRng(`aff:${agent.key}:${tid}`)() - 0.5) * 2; // -1 a 1

/* ---------- decoradores ---------- */
(function () {
  const appeal = Market.teamAppeal;
  Market.teamAppeal = (G, t) => {
    const cash = t.id === G.player.teamId ? G.finances.balance : (t.cash ?? t.budget * 0.3);
    const stability = clamp(cash / Math.max(1, t.budget) * 25, -18, 8);   // equipe no vermelho afasta pilotos
    return appeal(G, t) + stability;
  };
  const accepts = Market.driverAccepts;
  Market.driverAccepts = (G, d, t, offer) => {
    const res = accepts(G, d, t, offer);
    const ovr = driverOverall(d);
    const ap = Market.teamAppeal(G, t);
    let adj = 0;
    // estrela não aceita equipe sem perspectiva quando tem opção (equipe atual ou mercado aquecido)
    if (ovr >= 86) adj -= Math.max(0, 70 - ap) * 0.012 * (ovr - 84);
    // empresário com boa relação abre a porta; com relação ruim, atrapalha
    const ag = MarketPlus.agent(d);
    adj += MarketPlus.affinity(ag, t.id) * (ag.rep / 100) * 0.06;
    return { ...res, p: clamp(res.p + adj, 0.02, 0.98), agent: ag };
  };
  const cand = Market.candidateScore;
  Market.candidateScore = (G, t, d) => {
    let s = cand(G, t, d);
    // patrocínio pessoal: pesa conforme a necessidade de caixa da equipe
    if (d.backing) {
      const cash = t.id === G.player.teamId ? G.finances.balance : (t.cash ?? t.budget * 0.3);
      const need = clamp(1 - cash / Math.max(1, t.budget * 0.35), 0, 1.2);
      s += d.backing.m * 0.35 * need;
    }
    // política do grupo: academia primeiro
    const pol = MarketPlus.policyOf(G, t.id);
    if (pol) {
      const ac = Market.academyOf(G, d);
      const fromGroup = ac && (pol[1].teams || []).includes(ac.team);
      s += fromGroup ? pol[1].academyWeight : -pol[1].externalPenalty;
    }
    return s;
  };
})();

/* dinheiro do patrocínio pessoal entra uma vez por temporada (fim do ano) */
MarketPlus.seasonPayments = (G) => {
  G.db.drivers.forEach(d => {
    if (!d.backing || !d.team || d.seat === 'R') return;
    const t = Career.team(G, d.team);
    if (t.id === G.player.teamId && !Career.isObs(G)) Career.ledger(G, `Patrocínio pessoal de ${d.name}`, d.backing.m, 'patrocínio');
    else t.cash = +((t.cash ?? 0) + d.backing.m).toFixed(3);
  });
};
(function () {
  const end = Career.endSeason;
  Career.endSeason = (G) => { MarketPlus.seasonPayments(G); const r = end(G); MarketPlus.tagNew(G); return r; };
})();
/* multa de rescisão quando uma equipe do jogo troca de piloto no meio do ano */
MarketPlus.exitFee = (G, d, t) => {
  const fee = +(Math.max(0, d.salary || 0) * Math.max(0.5, d.contractYears || 1) * 0.5).toFixed(2);
  t.cash = +((t.cash ?? 0) - fee).toFixed(3);
  return fee;
};
