/* ============================================================
   PIT WALL — cláusulas de contrato (complementa market.js)
   - Desempenho: a equipe pode encerrar o contrato no fim do ano, sem
     multa, se o piloto ficar muito abaixo do esperado (carro e
     companheiro). Avaliada uma vez, na metade da temporada.
   - Saída: o piloto pode sair no fim do ano, sem multa, para uma equipe
     melhor colocada no campeonato de construtores.
   - As equipes do jogo usam as mesmas cláusulas: desempenho para
     estreantes e pilotos em teste; saída quando uma estrela aceita
     equipe sem perspectiva.
   - Pilotos não gostam da cláusula de desempenho e gostam da de saída
     (afeta a chance de aceitar a proposta).
   ============================================================ */
'use strict';

const Contracts = {};
Contracts.LABEL = { get performance() { return byLang('cláusula de desempenho', 'performance clause'); }, get release() { return byLang('cláusula de saída', 'release clause'); } };
Contracts.has = (d, k) => !!(d && d.contract && (d.contract.clauses || []).includes(k));

/* cláusulas que uma equipe da IA coloca no contrato */
Contracts.aiClauses = (G, d, tid) => {
  const r = localRng(`cl:${G.seed}:${d.id}:${tid}:${G.season ? G.season.year : 0}`);
  const out = [];
  const rookie = d.age <= 23 && !(d.career && d.career.starts > 10);
  if (rookie && r() < 0.55) out.push('performance');
  const t = Career.team(G, tid);
  if (t && driverOverall(d) >= 86 && Market.teamAppeal(G, t) < 62 && r() < 0.7) out.push('release');
  return out;
};

/* posição atual da equipe no campeonato de construtores (1 = líder) */
Contracts.rank = (G, tid) => {
  const s = G.season && G.season.standT;
  if (!s) return 6;
  return Object.entries(s).sort((a, b) => b[1] - a[1]).findIndex(([id]) => id === tid) + 1 || 6;
};

(function () {
  // proposta com cláusulas: o piloto pesa cada uma
  const accepts = Market.driverAccepts;
  Market.driverAccepts = (G, d, t, offer) => {
    const res = accepts(G, d, t, offer);
    const cl = (offer && offer.clauses) || [];
    let adj = 0;
    if (cl.includes('performance')) adj -= 0.05 + (driverOverall(d) >= 84 ? 0.08 : 0);
    if (cl.includes('release')) adj += 0.07;
    return adj ? { ...res, p: clamp(res.p + adj, 0.02, 0.98) } : res;
  };
  // contrato assinado guarda as cláusulas (pré-contrato inclusive)
  const place = Career.placeDriver;
  Career.placeDriver = (G, d, tid, role, salary, years) => {
    const pend = d.pendingClauses && d.pendingClauses.team === tid ? d.pendingClauses.clauses : null;
    const r = place(G, d, tid, role, salary, years);
    if (d.contract && d.team === tid) {
      d.contract.clauses = pend || (tid !== G.player.teamId || Career.isObs(G) ? Contracts.aiClauses(G, d, tid) : []);
      delete d.pendingClauses;
    }
    return r;
  };
  const sign = Market.playerSign;
  Market.playerSign = (G, did, offer, immediate) => {
    const d = Career.driver(G, did);
    const cl = (offer.clauses || []).slice();
    if (!offer.renew && !immediate && d.team) d.pendingClauses = { team: G.player.teamId, clauses: cl };
    if (!offer.renew && !d.team) d.pendingClauses = { team: G.player.teamId, clauses: cl };
    const msg = sign(G, did, offer, immediate);
    if (d.team === G.player.teamId && d.contract) d.contract.clauses = cl;
    return msg;
  };
  // pré-contrato da IA (efeito dominó): cláusulas definidas na assinatura
  const fut = Market.signFuture;
  Market.signFuture = (G, d, t, offer, buyout) => {
    if (!d.pendingClauses) d.pendingClauses = { team: t.id, clauses: t.id === G.player.teamId ? (offer.clauses || []) : Contracts.aiClauses(G, d, t.id) };
    return fut(G, d, t, offer, buyout);
  };
  // cláusula de saída: equipe melhor colocada pode levar o piloto sem multa
  const avail = Market.availableNextYear;
  Market.availableNextYear = (G, d) => avail(G, d) || (Contracts.has(d, 'release') && !d.retired && !d.retiring && !d.futureTeam && !!d.team);
  const appr = Market.approachPlayer;
  Market.approachPlayer = (G, t, d, offer) => {
    if (!Contracts.has(d, 'release') || Contracts.rank(G, t.id) >= Contracts.rank(G, d.team)) return appr(G, t, d, offer);
    const M = Market.state(G);
    const tk = M.talks[M.talks.length - 1];
    tk.awaitPlayer = false; tk.buyout = 0; tk.resolve = G.season.round + 1;
    Career.mail(G, { from: t.name, tag: 'market', title: byLang(`${t.name} aciona a cláusula de saída de ${d.name}`, `${t.name} triggers ${d.name}'s release clause`), body: byLang(`${d.name} tem cláusula de saída para equipes à frente no campeonato. A ${t.name} (${Contracts.rank(G, t.id)}ª nos construtores) fez proposta para ${G.season.year + 1}; a decisão é do piloto e não há multa.`, `${d.name} has a release clause for teams ahead in the championship. ${t.name} (P${Contracts.rank(G, t.id)} in the constructors') has made an offer for ${G.season.year + 1}; the decision is the driver's and there is no fee.`) });
  };
  // o piloto da equipe do jogador só pode ser levado por quem está à frente
  const cand = Market.candidateScore;
  Market.candidateScore = (G, t, d) => {
    const s = cand(G, t, d);
    if (d.team && d.team !== t.id && d.contractYears > 0 && Contracts.has(d, 'release') && Contracts.rank(G, t.id) >= Contracts.rank(G, d.team)) return s - 99;
    return s;
  };
  // texto do contrato
  const txt = Market.contractText;
  Market.contractText = (G, d) => {
    let s = txt(G, d);
    if (Contracts.has(d, 'release')) s += ' · ' + Contracts.LABEL.release;
    return s;
  };
  // efeito da escolha na caixa de entrada
  const fx = Events.applyEffects;
  Events.applyEffects = (G, e) => {
    const out = fx(G, e);
    if (e && e.clauseExit) { const d = Career.driver(G, e.clauseExit); if (d && d.team === G.player.teamId) { d.contractYears = 0; d.contract.until = G.season.year; Career.record(G, 'contrato', byLang(`${Career.team(G).name} acionou a cláusula de desempenho de ${d.name}: o contrato termina em ${G.season.year}.`, `${Career.team(G).name} triggered ${d.name}'s performance clause: the contract ends in ${G.season.year}.`), { teams: [d.team], drivers: [d.id] }); out.push(byLang(`Contrato de ${d.name} termina no fim do ano`, `${d.name}'s contract ends at the end of the year`)); } }
    return out;
  };
})();

/* metade da temporada: avaliação das cláusulas de desempenho */
Contracts.tick = (G) => {
  const races = G.season.calendar.length;
  if (G.season.round !== Math.round(races * 0.5)) return;
  G.db.drivers.forEach(d => {
    if (!d.team || d.seat === 'R' || d.contractYears <= 0 || !Contracts.has(d, 'performance')) return;
    const perf = Potential.performance(G, d);
    if (perf > -0.25) return;
    const t = Career.team(G, d.team);
    const mine = d.team === G.player.teamId && !Career.isObs(G);
    if (mine) {
      Career.mail(G, { from: byLang('Diretor esportivo', 'Sporting director'), tag: 'team', title: byLang(`Cláusula de desempenho: ${d.name}`, `Performance clause: ${d.name}`), body: byLang(`${d.name} está abaixo do combinado no contrato (resultado contra o carro e o companheiro). A cláusula permite encerrar o contrato no fim de ${G.season.year}, sem multa.`, `${d.name} is below the level agreed in the contract (results against the car and the team-mate). The clause allows the contract to end at the close of ${G.season.year}, with no fee.`),
        choices: [
          { label: byLang('Acionar a cláusula', 'Trigger the clause'), outcome: byLang(`O contrato de ${d.name} termina no fim do ano. A vaga entra no mercado.`, `${d.name}'s contract ends at the end of the year. The seat goes on the market.`), effects: { clauseExit: d.id, morale: { [d.id]: -10 } } },
          { label: byLang('Manter o piloto', 'Keep the driver'), outcome: byLang(`${d.name} segue com o contrato atual.`, `${d.name} stays on the current contract.`), effects: { morale: { [d.id]: 4 } } },
        ] });
      return;
    }
    const r = localRng(`clx:${G.seed}:${d.id}:${G.season.year}`)();
    if (r < 0.7) {
      d.contractYears = 0; if (d.contract) d.contract.until = G.season.year;
      Career.news(G, byLang(`${t.name} aciona a cláusula de desempenho e ${d.name} sai no fim do ano`, `${t.name} triggers the performance clause and ${d.name} leaves at the end of the year`), 'mercado');
      Career.record(G, 'contrato', byLang(`${t.name} acionou a cláusula de desempenho de ${d.name}: contrato encerrado ao fim de ${G.season.year}, sem multa.`, `${t.name} triggered ${d.name}'s performance clause: contract ended at the close of ${G.season.year}, no fee.`), { teams: [t.id], drivers: [d.id] });
    }
  });
};
(function () {
  const fin = Career.finishWeekend;
  Career.finishWeekend = (G, ...a) => { const r = fin(G, ...a); Contracts.tick(G); return r; };
})();
