/* ============================================================
   PIT WALL — mercado de transferências, contratos, academias e
   superlicença. Funciona igual para o jogador e para a IA.

   Ciclo realista (baseado no "silly season" da F1):
   - a partir de ~30% da temporada as equipes avaliam as vagas do ano seguinte;
   - negociações levam de 1 a 3 corridas e geram rumores;
   - o piloto compara propostas (competitividade, salário, papel, lealdade);
   - acordos viram pré-contratos anunciados; vagas abertas criam efeito dominó;
   - no fim do ano os pré-contratos entram em vigor e as vagas restantes são preenchidas.
   ============================================================ */
'use strict';

const Market = {};

/* ---------- contrato ---------- */
Market.until = (G, d) => G.season.year + Math.max(-1, d.contractYears ?? 0);
Market.contractText = (G, d) => {
  if (!d.team) return 'Sem contrato';
  const c = d.contract || {};
  const parts = [`até ${Market.until(G, d)}`];
  if (c.option) parts.push(`opção ${c.option.year} (${c.option.holder === 'team' ? 'da equipe' : c.option.holder === 'driver' ? 'do piloto' : 'mútua'})`);
  if (c.clauses && c.clauses.includes('performance')) parts.push('cláusula de desempenho');
  if (c.loanFrom) parts.push(`emprestado pela ${(Career.team(G, c.loanFrom) || {}).name || c.loanFrom}`);
  if (c.estimated) parts.push('prazo estimado');
  return parts.join(' · ');
};

/* valor de mercado em US$ mi/ano (escala real: estreante ~0,75; campeão ~70) */
Market.value = (d) => {
  const ovr = driverOverall(d);
  const t = Math.max(0, (ovr - 76) / 19);
  let v = 0.75 + 70 * Math.pow(t, 3);
  v += ((d.career && d.career.titles) || 0) * 1.2 + Math.min(4, ((d.career && d.career.wins) || 0) * 0.05);
  if (d.age < 24) v += Math.max(0, d.potential - ovr) * 0.3;
  if (d.age > 34) v *= 0.8;
  return +Math.max(0.5, v).toFixed(2);
};
Market.ask = (d) => {
  const P = d.personality || {};
  return +(Market.value(d) * (0.9 + (P.ambition ?? 50) / 100 * 0.3) * (d.morale < 45 ? 0.9 : 1)).toFixed(2);
};

/* atratividade de uma equipe para um piloto */
Market.teamAppeal = (G, t) => {
  const rank = Career.expectedRanks(G)[t.id] || G.db.teams.length;
  return (G.db.teams.length - rank + 1) * 9 + t.reputation * 0.5 + (t.id === G.player.teamId ? 0 : 0);
};

/* ---------- superlicença ---------- */
Market.slPoints = (G, d) => {
  const y = G.season.year;
  return sum((d.sl || []).filter(x => x.y >= y - 3 && x.y <= y).map(x => x.pts));
};
Market.slEligible = (G, d) => !!(d.slEligible || (d.career && d.career.starts > 0) || Market.slPoints(G, d) >= 40) && d.age >= 18;
Market.awardSuperlicense = (G, catId, standings) => {
  const table = (typeof REAL_EXTRA !== 'undefined' && REAL_EXTRA.superlicense[catId]) || null;
  if (!table) return;
  standings.forEach((x, i) => {
    const d = Career.driver(G, x.did); if (!d || !table[i]) return;
    d.sl = d.sl || []; d.sl.push({ y: G.season.year, cat: catId, pts: table[i] });
  });
};

/* ---------- avaliação de candidatos pela equipe ---------- */
Market.academyOf = (G, d) => (G.academies || []).find(a => a.members.includes(d.id));
Market.candidateScore = (G, t, d) => {
  const P = AI.persona(t);
  let s = driverOverall(d) * 1.0;
  if (d.age <= 24) s += Math.max(0, d.potential - driverOverall(d)) * (0.15 + (1 - P.ambition) * 0.25);
  if (d.age >= 35) s -= (d.age - 34) * 1.2;
  const ac = Market.academyOf(G, d);
  if (ac && ac.team === t.id) s += 4;
  else if (ac && (t.partnerOf || []).includes(ac.team)) s += 3;
  s += (d.popularity || 0) * 0.02;
  if (!Market.slEligible(G, d)) s -= 50;
  return s;
};
Market.driverBudget = (G, t) => {
  const own = t.id === G.player.teamId;
  const cash = own ? G.finances.balance : t.cash;
  return Math.max(1, t.budget * 0.14 + Math.max(0, cash || 0) * 0.08);
};

/* piloto livre para assinar para o próximo ano? */
Market.availableNextYear = (G, d) => !d.retired && !d.retiring && !d.futureTeam && (!d.team || d.contractYears <= 0);

/* ---------- decisão do piloto ---------- */
Market.driverAccepts = (G, d, t, offer) => {
  const P = d.personality || { ambition: 50, loyalty: 50 };
  const ask = Market.ask(d);
  const appeal = Market.teamAppeal(G, t);
  const cur = d.team ? Career.team(G, d.team) : null;
  const curAppeal = cur && !d.retiring ? Market.teamAppeal(G, cur) + P.loyalty * 0.25 : 30;
  let score = 50 + (offer.salary / Math.max(0.4, ask) - 1) * 45 + (appeal - curAppeal) * (0.3 + P.ambition / 200);
  if (offer.role === 'R') score -= 35;
  if (offer.role === 1 && driverOverall(d) >= 88) score += 6;
  if (offer.years >= 3 && d.age >= 31) score += 6;
  if (offer.years >= 3 && d.age <= 23 && appeal < curAppeal) score -= 6;
  const ac = Market.academyOf(G, d);
  if (ac && ac.team !== t.id && !(t.partnerOf || []).includes(ac.team)) score -= 12; // academia segura o piloto
  if (!cur) score += 12;
  return { p: clamp(1 / (1 + Math.exp(-(score - 50) / 9)), 0.02, 0.98), ask };
};

/* contraproposta do piloto */
Market.counter = (G, d, t, offer) => {
  const ask = Market.ask(d);
  const wantsYears = d.age >= 32 ? clamp(offer.years, 1, 2) : driverOverall(d) >= 88 ? Math.max(offer.years, 3) : offer.years;
  const wantsRole = offer.role === 'R' && driverOverall(d) >= 80 ? 2 : offer.role;
  return { salary: +Math.max(offer.salary, ask * RNG.range(0.95, 1.12)).toFixed(2), years: wantsYears, role: wantsRole };
};

/* ---------- estado do mercado ---------- */
Market.state = (G) => (G.market = G.market || { talks: [], decided: {}, history: [], rumorsUsed: {} });
Market.rumor = (G, key, title, body) => {
  const M = Market.state(G);
  if (M.rumorsUsed[key]) return;
  M.rumorsUsed[key] = G.season.year;
  Career.news(G, title, 'rumor', body);
  if (typeof Social !== 'undefined') Social.post(G, { kind: 'rumor', text: title });
};

/* vagas do ano seguinte para uma equipe */
Market.openSeats = (G, t) => {
  const ds = Career.teamDrivers(G, t.id).filter(d => d.seat === 1 || d.seat === 2);
  const out = [];
  [1, 2].forEach(seat => {
    const occ = ds.find(d => d.seat === seat);
    const incoming = G.db.drivers.find(x => x.futureTeam && x.futureTeam.team === t.id && x.futureTeam.role === seat);
    if (incoming) return;
    if (!occ || occ.contractYears <= 0 || occ.retiring || (occ.futureTeam && occ.futureTeam.team !== t.id)) out.push({ seat, occ });
  });
  return out;
};

/* rodada de mercado: chamada depois de cada corrida */
Market.tick = (G) => {
  const M = Market.state(G);
  const races = G.season.calendar.length;
  const p = G.season.round / races;
  const pt = G.player.teamId;
  // aposentadorias anunciadas a partir do meio da temporada
  if (p > 0.45) G.db.drivers.forEach(d => {
    if (d.retired || d.retiring || d.futureTeam || !d.team || d.seat === 'R' || d.age < 35) return;
    const st = G.season.stats[d.id] || {};
    const chance = (d.age - 34) * 0.025 + (driverOverall(d) < 82 ? 0.03 : 0) + ((st.points || 0) === 0 && G.season.round > 8 ? 0.03 : 0);
    if (d.contractYears <= 0 && RNG.chance(chance)) {
      d.retiring = true;
      Career.news(G, `${d.name} anuncia que vai se aposentar ao fim de ${G.season.year}`, 'mercado');
      Career.record(G, 'aposentadoria', `${d.name} anunciou a aposentadoria ao fim de ${G.season.year}, aos ${d.age} anos.`, { drivers: [d.id], teams: [d.team] });
      if (typeof Social !== 'undefined') Social.post(G, { kind: 'retire', driver: d.id, text: `Obrigado por tudo. ${G.season.year} será minha última temporada.` });
    }
  });
  if (p < 0.28) { Market.resolveTalks(G); return; }
  // equipes da IA avaliam vagas do próximo ano
  G.db.teams.forEach(t => {
    if (t.id === pt) return;
    Market.openSeats(G, t).forEach(({ seat, occ }) => {
      const key = `${G.season.year}:${t.id}:${seat}`;
      if (M.talks.some(x => x.team === t.id && x.seat === seat && x.status === 'talks')) return;
      // renovar o ocupante?
      if (occ && !occ.retiring && !M.decided[key + ':' + occ.id] && occ.contractYears <= 0) {
        M.decided[key + ':' + occ.id] = true;
        const alt = Market.bestCandidates(G, t, seat, [occ.id])[0];
        const occS = Market.candidateScore(G, t, occ) + 1.5 + (occ.personality ? occ.personality.loyalty / 50 : 1);
        const ask = Market.ask(occ);
        const budgetOk = ask <= Market.driverBudget(G, t) * 1.6;
        if ((!alt || occS >= alt.s - 0.5) && budgetOk) {
          const acc = Market.driverAccepts(G, occ, t, { salary: ask, years: occ.age >= 33 ? 1 : RNG.int(1, 3), role: seat });
          if (RNG.chance(acc.p + 0.15)) {
            const years = occ.age >= 33 ? 1 : RNG.int(1, 3);
            occ.contractYears = years; occ.salary = +ask.toFixed(2);
            occ.contract = { ...(occ.contract || {}), until: G.season.year + years, salary: occ.salary, estimated: false, option: null, signed: { y: G.season.year, r: G.season.round } };
            Career.news(G, `${t.name} renova com ${occ.name} até ${G.season.year + years}`, 'mercado');
            Career.record(G, 'contrato', `${t.name} renovou com ${occ.name} até ${G.season.year + years} (${fmtMoney(occ.salary)}/ano). Motivo: ${alt ? `melhor que a alternativa disponível (${alt.d.name})` : 'sem alternativa melhor no mercado'}.`, { teams: [t.id], drivers: [occ.id] });
            return;
          }
        } else {
          Career.record(G, 'decisao', `${t.name} decidiu não renovar com ${occ.name}: ${!budgetOk ? `pede ${fmtMoney(ask)}/ano, acima do orçamento` : `${alt.d.name} é uma opção melhor`}.`, { teams: [t.id], drivers: [occ.id] });
          if (alt) Market.rumor(G, `drop:${occ.id}:${G.season.year}`, `${occ.name} deve deixar a ${t.name} no fim do ano`, `A equipe avalia ${alt.d.name} para o carro #${seat}.`);
        }
      }
      // procurar substituto (a partir de 40% da temporada)
      if (p < 0.4) return;
      const cands = Market.bestCandidates(G, t, seat, occ ? [occ.id] : []);
      const tried = M.history.filter(h => h.team === t.id && h.y === G.season.year).map(h => h.driver);
      const c = cands.find(x => !tried.includes(x.d.id));
      if (!c) return;
      const offer = { salary: +Math.min(Market.driverBudget(G, t) * 1.8, Market.ask(c.d) * RNG.range(0.95, 1.15)).toFixed(2), years: c.d.age >= 33 ? 1 : RNG.int(1, 3), role: seat };
      M.talks.push({ id: Career.nextId(G, 'tk'), team: t.id, driver: c.d.id, seat, offer, status: 'talks', y: G.season.year, start: G.season.round, resolve: G.season.round + RNG.int(1, 3) });
      M.history.push({ team: t.id, driver: c.d.id, y: G.season.year });
      if (pt && c.d.team === pt) Market.approachPlayer(G, t, c.d, offer);
      else if (RNG.chance(0.6)) Market.rumor(G, `talk:${c.d.id}:${t.id}:${G.season.year}`, `Rumor: ${t.name} conversa com ${c.d.name} para ${G.season.year + 1}`, `${c.d.name} ${c.d.team ? `tem contrato com a ${Career.team(G, c.d.team).name} até ${Market.until(G, c.d)}` : 'está livre no mercado'}.`);
    });
  });
  Market.resolveTalks(G);
  Market.midSeasonSackings(G, p);
};

Market.bestCandidates = (G, t, seat, exclude = []) => {
  const budget = Market.driverBudget(G, t);
  const top = (Career.expectedRanks(G)[t.id] || 9) <= 4;
  return G.db.drivers.filter(d => !exclude.includes(d.id) && d.team !== t.id && !d.retired && !d.retiring && !d.futureTeam && Market.slEligible(G, d) &&
      (Market.availableNextYear(G, d) || (top && d.contractYears === 1 && Market.value(d) > 15)) && Market.ask(d) <= budget * 2.2)
    .map(d => ({ d, s: Market.candidateScore(G, t, d) - Math.max(0, Market.ask(d) - budget) * 0.15 }))
    .sort((a, b) => b.s - a.s).slice(0, 6);
};

Market.resolveTalks = (G) => {
  const M = Market.state(G);
  M.talks.filter(x => x.status === 'talks' && x.resolve <= G.season.round).forEach(tk => {
    const t = Career.team(G, tk.team), d = Career.driver(G, tk.driver);
    if (!t || !d || d.futureTeam || d.retiring) { tk.status = 'cancelled'; return; }
    if (tk.awaitPlayer) return;
    const acc = Market.driverAccepts(G, d, t, tk.offer);
    if (RNG.chance(acc.p)) {
      Market.signFuture(G, d, t, tk.offer, tk.buyout || 0);
      tk.status = 'signed';
    } else {
      tk.status = 'rejected';
      Career.record(G, 'decisao', `${d.name} recusou a proposta da ${t.name} (${fmtMoney(tk.offer.salary)}/ano).`, { teams: [t.id], drivers: [d.id] });
    }
  });
};

/* pré-contrato: entra em vigor no ano seguinte */
Market.signFuture = (G, d, t, offer, buyout = 0) => {
  const from = d.team;
  d.futureTeam = { team: t.id, role: offer.role, salary: offer.salary, years: offer.years };
  if (buyout && from) {
    const ft = Career.team(G, from);
    if (from === G.player.teamId) Career.ledger(G, `Multa recebida: saída de ${d.name}`, buyout, 'receita'); else if (ft) ft.cash += buyout;
    if (t.id === G.player.teamId) Career.ledger(G, `Multa paga pela liberação de ${d.name}`, -buyout, 'mercado'); else t.cash -= buyout;
  }
  const head = from ? `${d.name} troca a ${Career.team(G, from).name} pela ${t.name} em ${G.season.year + 1}` : `${t.name} anuncia ${d.name} para ${G.season.year + 1}`;
  Career.news(G, head, 'mercado', `Contrato até ${G.season.year + offer.years}${offer.role === 'R' ? ' como reserva' : ''}.`);
  Career.record(G, 'contrato', `${d.name} assinou pré-contrato com a ${t.name} até ${G.season.year + offer.years} (${offer.role === 'R' ? 'reserva' : 'carro #' + offer.role}, ${fmtMoney(offer.salary)}/ano)${from ? `; deixa a ${Career.team(G, from).name}` : ''}${buyout ? `; multa de ${fmtMoney(buyout)}` : ''}.`, { teams: [t.id, from].filter(Boolean), drivers: [d.id] });
  if (typeof Social !== 'undefined') Social.post(G, { kind: 'signing', team: t.id, driver: d.id, text: `Bem-vindo, ${d.name}! Juntos a partir de ${G.season.year + 1}.` });
  if (from === G.player.teamId) Career.mail(G, { from: 'Diretor esportivo', tag: 'team', title: `${d.name} assinou com a ${t.name}`, body: `${d.name} vai deixar a equipe no fim de ${G.season.year}. Você precisa de um piloto para o carro #${d.seat} em ${G.season.year + 1}.` });
};

/* uma equipe da IA quer um piloto do jogador */
Market.approachPlayer = (G, t, d, offer) => {
  const M = Market.state(G);
  const tk = M.talks[M.talks.length - 1];
  const under = d.contractYears > 0;
  const buyout = under ? +(d.salary * d.contractYears * 0.8 + 2).toFixed(1) : 0;
  tk.awaitPlayer = true; tk.buyout = buyout;
  Career.mail(G, {
    from: t.name, tag: 'market', title: `${t.name} quer ${d.name} para ${G.season.year + 1}`,
    body: `${t.principal}, chefe da ${t.name}, procurou a equipe: quer ${d.name} para o carro #${offer.role} em ${G.season.year + 1}, com salário de ${fmtMoney(offer.salary)}/ano. ${under ? `O contrato atual vai até ${Market.until(G, d)}; eles oferecem ${fmtMoney(buyout)} de multa.` : 'O contrato dele termina neste ano.'}`,
    choices: [
      { label: under ? `Liberar e receber ${fmtMoney(buyout)}` : 'Não criar obstáculos', outcome: `${d.name} está livre para negociar com a ${t.name}.`, effects: { marketTalk: { id: tk.id, allow: true } } },
      { label: 'Recusar a abordagem', outcome: under ? `O contrato foi mantido. ${d.name} ficou incomodado.` : `${d.name} ainda pode decidir sair, já que o contrato termina.`, effects: { marketTalk: { id: tk.id, allow: false }, morale: { [d.id]: under ? -6 : -2 } } },
    ],
  });
};
Market.playerAnswer = (G, talkId, allow) => {
  const M = Market.state(G);
  const tk = M.talks.find(x => x.id === talkId); if (!tk) return;
  tk.awaitPlayer = false;
  const d = Career.driver(G, tk.driver);
  if (!allow && d.contractYears > 0) { tk.status = 'blocked'; return; }
  if (!allow) tk.buyout = 0;
  tk.resolve = G.season.round + 1;
};

/* demissão no meio da temporada (rara): piloto muito abaixo do companheiro */
Market.midSeasonSackings = (G, p) => {
  if (p < 0.35 || p > 0.75) return;
  G.db.teams.forEach(t => {
    if (t.id === G.player.teamId) return;
    const P = AI.persona(t);
    Career.lineup(G, t.id).forEach(d => {
      const st = G.season.stats[d.id], mate = Career.lineup(G, t.id).find(x => x.id !== d.id);
      if (!st || !mate || st.starts < 6) return;
      const ms = G.season.stats[mate.id] || {};
      const gap = (ms.points || 0) - (st.points || 0);
      const ratio = (st.beatMate || 0) / Math.max(1, st.starts);
      if (ratio < 0.15 && gap > 25 && d.morale < 55 && RNG.chance(0.06 + P.risk * 0.08)) {
        const res = Career.teamDrivers(G, t.id).find(x => x.seat === 'R' && Market.slEligible(G, x));
        const ac = (G.academies || []).find(a => a.team === t.id || (t.partnerOf || []).includes(a.team));
        const junior = ac && G.db.drivers.find(x => ac.members.includes(x.id) && !x.team && Market.slEligible(G, x));
        const sub = res || junior;
        if (!sub) return;
        const seat = d.seat;
        d.team = null; d.seat = null; d.contractYears = 0; d.morale = 35;
        Career.placeDriver(G, sub, t.id, seat, Math.max(sub.salary || 0.75, 0.75), 0);
        Career.news(G, `${t.name} troca de piloto no meio da temporada: sai ${d.name}, entra ${sub.name}`, 'mercado');
        Career.record(G, 'rescisao', `${t.name} substituiu ${d.name} por ${sub.name} após ${st.starts} corridas: ${st.points || 0} pontos contra ${ms.points || 0} do companheiro.`, { teams: [t.id], drivers: [d.id, sub.id] });
      }
    });
  });
};

/* ---------- negociação do jogador (com contraproposta) ---------- */
Market.playerOffer = (G, did, offer, immediate) => {
  const d = Career.driver(G, did), t = Career.team(G);
  if (!d || d.team === t.id && !offer.renew) return { status: 'error', msg: 'Este piloto já é seu.' };
  if (!offer.renew && !Market.slEligible(G, d) && offer.role !== 'R') return { status: 'reject', msg: `${d.name} não tem superlicença (${Market.slPoints(G, d)} de 40 pontos). Só pode ser contratado como reserva.` };
  const M = Market.state(G);
  M.patience = M.patience || {};
  const pk = `${G.season.year}:${G.season.round}:${did}`;
  M.patience[pk] = (M.patience[pk] || 0) + 1;
  if (M.patience[pk] > 3) return { status: 'reject', msg: `${d.name} encerrou as conversas por enquanto. Tente de novo depois da próxima corrida.` };
  const acc = Market.driverAccepts(G, d, t, offer);
  const pAdj = offer.renew ? clamp(acc.p + 0.2 + ((d.morale || 70) - 60) / 120, 0.03, 0.98) : acc.p;
  const ratio = offer.salary / Math.max(0.4, acc.ask);
  if (RNG.chance(pAdj) && ratio >= 0.85) return { status: 'accept', p: pAdj };
  if (ratio < 0.6 || M.patience[pk] >= 3) return { status: 'reject', p: pAdj, msg: `${d.name} recusou. Pedia algo perto de ${fmtMoney(acc.ask)}/ano.` };
  return { status: 'counter', p: pAdj, counter: Market.counter(G, d, t, offer) };
};
Market.playerSign = (G, did, offer, immediate) => {
  const d = Career.driver(G, did), t = Career.team(G);
  if (offer.renew) {
    d.salary = offer.salary; d.contractYears = offer.years;
    d.contract = { ...(d.contract || {}), until: G.season.year + offer.years, salary: offer.salary, estimated: false, signed: { y: G.season.year, r: G.season.round } };
    d.morale = clamp(d.morale + 5, 0, 100);
    Career.record(G, 'contrato', `${d.name} renovou com a ${t.name} até ${G.season.year + offer.years} (${fmtMoney(offer.salary)}/ano).`, { teams: [t.id], drivers: [d.id] });
    Career.news(G, `${t.name} renova com ${d.name} até ${G.season.year + offer.years}`, 'mercado');
    return `${d.name} renovou até ${G.season.year + offer.years}.`;
  }
  const buyout = d.team && d.contractYears > 0 && immediate ? +(d.salary * d.contractYears * 0.8 + 1).toFixed(1) : 0;
  if (immediate || !d.team) {
    if (buyout) { Career.ledger(G, `Multa rescisória: ${d.name}`, -buyout, 'mercado'); const ft = Career.team(G, d.team); if (ft) ft.cash += buyout; }
    Career.placeDriver(G, d, t.id, offer.role, offer.salary, offer.years);
    Career.news(G, `${d.name} assina com a ${t.name}`, 'mercado');
    return `${d.name} assinou até ${G.season.year + offer.years}.`;
  }
  Market.signFuture(G, d, t, offer, 0);
  return `${d.name} assinou pré-contrato para ${G.season.year + 1}.`;
};

/* ---------- academias ---------- */
Market.initAcademies = (G) => {
  if (G.academies) return;
  const extra = typeof REAL_EXTRA !== 'undefined' ? REAL_EXTRA.academies : [];
  G.academies = G.db.teams.map(t => {
    const real = extra.find(a => a.team === t.id);
    const members = real ? real.members.map(m => Market.findDriverByName(G, m.name)).filter(Boolean).map(d => d.id) : [];
    return { id: 'ac-' + t.id, team: t.id, name: real ? real.name : `${t.name} Academy`, active: !!real, level: real ? 70 + Math.round(t.reputation / 10) : 40, budget: real ? 6 : 0, pending: real ? real.members.map(m => m.name) : [], members };
  });
  G.db.drivers.forEach(d => { if (d.academy) { const a = G.academies.find(x => x.team === d.academy); if (a && !a.members.includes(d.id)) a.members.push(d.id); } });
};
Market.findDriverByName = (G, name) => {
  const n = String(name).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return G.db.drivers.find(d => d.name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() === n);
};
/* membros resolvidos quando novas categorias trazem os pilotos */
Market.syncAcademies = (G) => {
  (G.academies || []).forEach(a => {
    (a.pending || []).forEach(name => { const d = Market.findDriverByName(G, name); if (d && !a.members.includes(d.id)) { a.members.push(d.id); d.academy = a.team; } });
  });
};
Market.academyTick = (G) => {
  (G.academies || []).forEach(a => {
    if (!a.active) return;
    a.members.forEach(id => {
      const d = Career.driver(G, id); if (!d || d.retired) return;
      if (d.age < 26 && driverOverall(d) < d.potential && RNG.chance(0.35)) {
        const k = RNG.pick(Career.ATTRS_GROW);
        d[k] = +clamp(d[k] + RNG.range(0, 0.35) * (0.6 + a.level / 120) * (1 + a.budget / 20), 30, 99).toFixed(2);
      }
    });
  });
};
Market.academyCost = (a) => +(a.budget * 1).toFixed(1);
Market.addToAcademy = (G, did) => {
  const a = (G.academies || []).find(x => x.team === G.player.teamId); const d = Career.driver(G, did);
  if (!a || !d) return 'Academia não encontrada.';
  const other = Market.academyOf(G, d);
  if (other && other.team !== a.team) return `${d.name} pertence à ${other.name}.`;
  if (d.age > 23) return 'Academias aceitam pilotos com até 23 anos.';
  if (!a.active) { a.active = true; a.budget = Math.max(a.budget, 2); }
  a.members.push(d.id); d.academy = a.team;
  Career.ledger(G, `Academia: contrato de desenvolvimento de ${d.name}`, -0.3, 'academia');
  Career.record(G, 'contrato', `${d.name} entrou na ${a.name}.`, { teams: [a.team], drivers: [d.id] });
  Career.news(G, `${d.name} é o novo integrante da ${a.name}`, 'mercado');
  return null;
};
Market.removeFromAcademy = (G, did) => {
  const a = (G.academies || []).find(x => x.team === G.player.teamId); const d = Career.driver(G, did);
  if (!a || !d) return;
  a.members = a.members.filter(x => x !== did); if (d.academy === a.team) d.academy = null;
  Career.record(G, 'rescisao', `${d.name} foi dispensado da ${a.name}.`, { teams: [a.team], drivers: [d.id] });
};

/* ---------- fim de temporada ---------- */
Market.endSeason = (G) => {
  const M = Market.state(G);
  M.talks = M.talks.filter(x => x.status === 'talks' && false);
  M.decided = {}; M.patience = {};
  // quem anunciou aposentadoria se aposenta
  G.db.drivers.filter(d => d.retiring).forEach(d => { d.retiring = false; d.retired = true; d.retiredYear = G.season.year; });
};
