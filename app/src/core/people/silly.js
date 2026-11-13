/* ============================================================
   PIT WALL — mercado de pilotos vivo (V0.8.4)
   - Empresários: cada piloto tem um (os da F1 com o nome real, os demais
     em agências fictícias). O empresário cobra comissão, empurra o
     salário pedido para cima e vaza o interesse das equipes para a mídia.
   - Leilão: quando um piloto disputado abre conversas, outras equipes
     com vaga entram com proposta melhor; o piloto escolhe pelo projeto,
     salário, papel e lealdade. O jogador pode perder o alvo para um rival.
   - Janela: a silly season abre nas férias de verão (anúncio e lista de
     contratos que vencem); antes disso, as equipes da IA travam os
     pilotos-chave com renovação antecipada.
   - Contratos: opção de renovação (da equipe), bônus por vitória, pódio
     e título, e direitos de imagem.
   ============================================================ */
'use strict';

const Silly = {};
Silly.AGENCIES = ['Apex Driver Management', 'Northline Sports', 'Grid One Agency', 'Velocity Talent', 'Pole Line Management', 'Corsa Talent Group', 'Paddock Partners', 'Summit Racing Management', 'Delta Motorsport Agency', 'Lumen Sports'];
Silly.STYLES = { agressivo: [0.06, 0.12], equilibrado: [0.03, 0.08], leal: [0, 0.05] };
/* empresário do piloto: o cálculo (só do piloto, sem sorteio). (0.9) As telas usam este, que não grava nada no
   jogo (regra 6); antes, desenhar a tela de Donos gravava o empresário nos pilotos e o save mudava conforme a tela. */
Silly.agentInfo = (d) => {
  if (d.agent) return d.agent;
  const real = typeof REAL_EXTRA !== 'undefined' && REAL_EXTRA.managers && REAL_EXTRA.managers[d.id];
  const h = hashStr('agent:' + d.id);
  const style = ['agressivo', 'equilibrado', 'equilibrado', 'leal'][h % 4];
  const fee = +(0.05 + (h % 8) / 100).toFixed(2);
  return { name: real || Silly.AGENCIES[h % Silly.AGENCIES.length], real: !!real, style, fee };
};
/* empresário do piloto (criado sob demanda pela simulação) */
Silly.agent = (G, d) => {
  if (!d.agent) { const a = Silly.agentInfo(d); if (Draw.on) return a; d.agent = a; }   // tela: só lê (regra 6)
  return d.agent;
};
Silly.push = (G, d) => (Silly.STYLES[Silly.agent(G, d).style] || Silly.STYLES.equilibrado)[0];   // não depende da carreira (só do piloto)
Silly.STYLE_TXT = { agressivo: ['agressivo: empurra o salário e leva a melhor proposta', 'aggressive: pushes the salary and takes the best offer'], equilibrado: ['equilibrado', 'balanced'], leal: ['leal: valoriza o projeto e a relação com a equipe', 'loyal: values the project and the relationship with the team'] };

/* bônus e direitos de imagem de um contrato novo (valores em milhões) */
Silly.terms = (G, d, t, offer, r) => {
  const sal = offer.salary || 1;
  const top = driverOverall(d) >= 88;
  return {
    bonus: { win: +(sal * 0.04).toFixed(2), podium: +(sal * 0.015).toFixed(2), title: +(sal * (top ? 0.5 : 0.3)).toFixed(2) },
    imageRights: top ? 0.25 : 0.1,
    option: offer.years >= 2 && r() < 0.35 ? { holder: 'team', year: G.season.year + offer.years + 1, years: 1 } : (offer.option || null),
  };
};

/* ---------- janela da silly season ---------- */
Silly.tick = (G) => {
  const S = G.season, n = S.calendar.length, rd = S.round;
  const M = Market.state(G);
  const r = localRng(`silly:${G.seed}:${S.year}:${rd}`);
  // renovações antecipadas (antes das férias): as equipes da IA travam quem faz diferença
  if (rd === Math.max(2, Math.round(n * 0.2))) Silly.earlyRenewals(G, r);
  // abertura da silly season
  if (rd === Math.round(n * 0.45) && M.sillyYear !== S.year) {
    M.sillyYear = S.year;
    const exp = G.db.drivers.filter(d => d.team && d.seat !== 'R' && !d.retired && d.contractYears <= 0 && !d.futureTeam);
    Career.news(G, byLang(`Silly season aberta: ${exp.length} pilotos sem contrato para ${S.year + 1}`, `Silly season opens: ${exp.length} drivers out of contract for ${S.year + 1}`), 'mercado',
      exp.length ? byLang(`Contratos que vencem: ${exp.slice(0, 12).map(d => `${d.name} (${Career.team(G, d.team).name})`).join(', ')}${exp.length > 12 ? '…' : ''}.`, `Expiring deals: ${exp.slice(0, 12).map(d => `${d.name} (${Career.team(G, d.team).name})`).join(', ')}${exp.length > 12 ? '…' : ''}.`) : '', { main: true });
  }
  // opções de renovação: a equipe decide no meio do ano
  if (rd === Math.round(n * 0.5)) Silly.options(G, r);
  // leilão pelos pilotos disputados
  Silly.auction(G, r);
  // o histórico de abordagens só serve para o ano corrente: limpa o que tem mais de 2 anos
  if (rd === 1 && M.history && M.history.length) M.history = M.history.filter(h => S.year - h.y <= 2);
};
Silly.earlyRenewals = (G, r) => {
  const pt = G.player.teamId;
  G.db.teams.forEach(t => {
    if (t.id === pt && !Career.isObs(G)) return;
    Career.lineup(G, t.id).forEach(d => {
      if (d.contractYears !== 1 || d.retiring || d.age >= 34 || Market.value(d) < 8) return;
      if (r() > 0.3) return;
      const years = 2 + Math.floor(r() * 2);
      const sal = +(Market.ask(d) * (1.02 + r() * 0.08)).toFixed(2);
      if (sal > Market.driverBudget(G, t) * 2.2) return;
      d.contractYears = years; d.salary = sal;
      d.contract = { ...(d.contract || {}), until: G.season.year + years, salary: sal, estimated: false, signed: { y: G.season.year, r: G.season.round }, ...Silly.terms(G, d, t, { salary: sal, years }, r) };
      Career.news(G, byLang(`${t.name} se antecipa e renova com ${d.name} até ${G.season.year + years}`, `${t.name} moves early and extends ${d.name} until ${G.season.year + years}`), 'mercado', byLang('A equipe tira o piloto do mercado antes da silly season.', 'The team takes the driver off the market before the silly season.'));
      Career.record(G, 'contrato', byLang(`${t.name} renovou antecipadamente com ${d.name} até ${G.season.year + years} (${fmtMoney(sal)}/ano).`, `${t.name} extended ${d.name} early until ${G.season.year + years} (${fmtMoney(sal)}/yr).`), { teams: [t.id], drivers: [d.id] });
    });
  });
};
Silly.options = (G, r) => {
  const pt = G.player.teamId;
  G.db.drivers.forEach(d => {
    const o = d.contract && d.contract.option;
    // opções da equipe, do piloto e mútuas (os contratos reais trazem as três)
    if (!d.team || d.contractYears > 0 || !o || !['team', 'driver', 'mutual'].includes(o.holder) || d.retiring) return;
    const t = Career.team(G, d.team);
    if (!t) return;
    const mineT = t.id === pt && !Career.isObs(G);
    const st = G.season.stats[d.id] || {};
    const mate = Career.lineup(G, t.id).find(x => x.id !== d.id);
    const teamOk = (st.points || 0) >= ((mate && (G.season.stats[mate.id] || {}).points) || 0) * 0.6 || r() < 0.35;
    const rank = (Career.expectedRanks(G)[t.id] || 6), driverOk = (d.morale ?? 70) >= 55 && (rank <= Math.ceil(G.db.teams.length / 2) || r() < 0.5);
    // a equipe do jogador decide a própria opção na negociação; a do piloto e a mútua seguem a vontade do piloto
    if (mineT && o.holder === 'team') return;
    const ok = o.holder === 'team' ? teamOk : o.holder === 'driver' ? driverOk : (mineT ? driverOk : teamOk && driverOk);
    d.contract.option = null;
    if (ok) {
      d.contractYears = o.years || 1; d.contract.until = G.season.year + d.contractYears;
      Career.news(G, o.holder === 'team' ? byLang(`${t.name} exerce a opção e segura ${d.name} para ${G.season.year + 1}`, `${t.name} takes up its option on ${d.name} for ${G.season.year + 1}`) : byLang(`${d.name} exerce a opção e fica na ${t.name} em ${G.season.year + 1}`, `${d.name} takes up the option and stays at ${t.name} in ${G.season.year + 1}`), 'mercado');
      if (mineT) Career.mail(G, { from: byLang('Diretor esportivo', 'Sporting director'), tag: 'team', title: byLang(`${d.name} exerceu a opção do contrato`, `${d.name} took up his contract option`), body: byLang(`O contrato vai até ${G.season.year + d.contractYears}.`, `The contract now runs until ${G.season.year + d.contractYears}.`) });
      Career.record(G, 'contrato', byLang(`${t.name} exerceu a opção de renovação de ${d.name} (+${d.contractYears} ano).`, `${t.name} took up its option on ${d.name} (+${d.contractYears} year).`), { teams: [t.id], drivers: [d.id] });
    } else Career.record(G, 'decisao', byLang(`${t.name} não exerceu a opção de renovação de ${d.name}: o piloto fica livre no fim do ano.`, `${t.name} did not take up its option on ${d.name}: the driver becomes free at the end of the year.`), { teams: [t.id], drivers: [d.id] });
  });
};
/* outras equipes com vaga entram na disputa por quem já está em conversa */
Silly.auction = (G, r) => {
  const M = Market.state(G);
  const pt = G.player.teamId;
  const live = M.talks.filter(k => k.status === 'talks' && k.y === G.season.year && !k.auctioned);
  live.forEach(k => {
    k.auctioned = true;
    const d = Career.driver(G, k.driver); if (!d || Market.value(d) < 5) return;
    const rivals = G.db.teams.filter(t => t.id !== k.team && t.id !== d.team && !(t.id === pt && !Career.isObs(G))
      && !M.talks.some(x => x.team === t.id && x.driver === d.id)
      && Market.openSeats(G, t).length && Market.ask(d) <= Market.driverBudget(G, t) * 2.4);
    shuffleBy(rivals, r).slice(0, 2).forEach(t => {
      const fit = Market.bestCandidates(G, t, Market.openSeats(G, t)[0].seat).slice(0, 3).some(c => c.d.id === d.id);
      if (!fit || r() > 0.6) return;
      const best = Math.max(...M.talks.filter(x => x.driver === d.id && x.status === 'talks').map(x => x.offer.salary));
      const offer = { salary: +(best * (1.05 + r() * 0.12)).toFixed(2), years: k.offer.years, role: Market.openSeats(G, t)[0].seat };
      M.talks.push({ id: Career.nextId(G, 'tk'), team: t.id, driver: d.id, seat: offer.role, offer, status: 'talks', y: G.season.year, start: G.season.round, resolve: k.resolve, auctioned: true, bid: true });
      M.history.push({ team: t.id, driver: d.id, y: G.season.year });
      const ag = Silly.agent(G, d);
      Market.rumor(G, `auc:${d.id}:${t.id}:${G.season.year}`, byLang(`Leilão por ${d.name}: ${t.name} entra na disputa com a ${Career.team(G, k.team).name}`, `Bidding war for ${d.name}: ${t.name} joins ${Career.team(G, k.team).name} in the race`), byLang(`Segundo pessoas próximas de ${ag.name}, empresário do piloto, a proposta nova passa de ${fmtMoney(offer.salary)} por ano.`, `According to people close to ${ag.name}, the driver’s manager, the new offer tops ${fmtMoney(offer.salary)} a year.`));
    });
  });
};
/* o piloto escolhe entre as propostas na mesa (projeto, salário, papel, empresário) */
Silly.choose = (G, d, talks) => {
  const ag = Silly.agent(G, d);
  const w = ag.style === 'agressivo' ? 1.25 : ag.style === 'leal' ? 0.8 : 1;
  const sc = talks.map(k => { const t = Career.team(G, k.team); const a = Market.driverAccepts(G, d, t, k.offer); return { k, s: a.p + (k.offer.salary / Math.max(0.4, a.ask) - 1) * 0.25 * w }; }).sort((a, b) => b.s - a.s);
  return sc[0].k;
};

/* ---------- ganchos ---------- */
(function () {
  // pedido salarial com o empurrão do empresário
  Hooks.around('Market', Market, 'ask', 'silly', (ask, d) => +(ask(d) * (1 + (d ? Silly.push(null, d) * 0.5 : 0))).toFixed(2));
  // leilão: com várias propostas, o piloto escolhe uma e as outras perdem
  Hooks.around('Market', Market, 'resolveTalks', 'silly', (rt, G) => {
    const M = Market.state(G);
    const due = M.talks.filter(k => k.status === 'talks' && k.resolve <= G.season.round && !k.awaitPlayer);
    const byD = {};
    due.forEach(k => (byD[k.driver] = byD[k.driver] || []).push(k));
    Object.entries(byD).forEach(([did, ks]) => {
      if (ks.length < 2) return;
      const d = Career.driver(G, did); if (!d) return;
      const win = Silly.choose(G, d, ks);
      ks.forEach(k => { if (k === win) return; k.status = 'lost'; Career.record(G, 'decisao', byLang(`${d.name} preferiu a proposta da ${Career.team(G, win.team).name} à da ${Career.team(G, k.team).name}.`, `${d.name} preferred ${Career.team(G, win.team).name}'s offer to ${Career.team(G, k.team).name}'s.`), { teams: [k.team, win.team], drivers: [d.id] }); });
      win.offer.salary = +(win.offer.salary * 1.03).toFixed(2);
    });
    return rt(G);
  });
  // proposta do jogador concorre com as da IA que estão na mesa
  Hooks.around('Market', Market, 'playerOffer', 'silly', (po, G, did, offer, immediate) => {
    const res = po(G, did, offer, immediate);
    if (!res || res.status !== 'accept' || offer.renew) return res;
    const d = Career.driver(G, did), mine = Career.team(G);
    const rivals = Market.state(G).talks.filter(k => k.driver === did && k.status === 'talks' && k.team !== mine.id);
    if (!rivals.length) return res;
    const pick = Silly.choose(G, d, [...rivals, { team: mine.id, offer }]);
    if (pick.team === mine.id) return res;
    const t = Career.team(G, pick.team);
    return { status: 'counter', p: res.p, counter: { ...offer, salary: +(pick.offer.salary * 1.05).toFixed(2) }, msg: byLang(`${Silly.agent(G, d).name}, empresário de ${d.name}, avisa que a ${t.name} ofereceu ${fmtMoney(pick.offer.salary)}/ano. Para fechar com você, quer pelo menos ${fmtMoney(pick.offer.salary * 1.05)}.`, `${Silly.agent(G, d).name}, ${d.name}'s manager, says ${t.name} offered ${fmtMoney(pick.offer.salary)}/yr. To sign with you, he wants at least ${fmtMoney(pick.offer.salary * 1.05)}.`) };
  });
  // contrato novo leva bônus, direitos de imagem e às vezes opção de renovação; a comissão do empresário sai na assinatura
  Hooks.around('Market', Market, 'signFuture', 'silly', (sf, G, d, t, offer, buyout) => {
    const r = sf(G, d, t, offer, buyout);
    d.pendingTerms = Silly.terms(G, d, t, offer, localRng(`terms:${G.seed}:${d.id}:${G.season.year}`));
    const fee = +(offer.salary * Silly.agent(G, d).fee).toFixed(2);
    if (t.id === G.player.teamId && !Career.isObs(G)) Career.ledger(G, byLang(`Comissão do empresário de ${d.name}`, `${d.name}'s manager commission`), -fee, 'mercado'); else t.cash = +((t.cash || 0) - fee).toFixed(2);
    return r;
  });
  Hooks.around('Career', Career, 'placeDriver', 'silly', (pd, G, d, tid, role, salary, years) => {
    const terms = d.pendingTerms; d.pendingTerms = null;
    const out = pd(G, d, tid, role, salary, years);
    if (role !== 'R' && d.contract) Object.assign(d.contract, terms || Silly.terms(G, d, Career.team(G, tid), { salary, years }, localRng(`terms:${G.seed}:${d.id}:${G.season.year}:p`)));
    return out;
  });
  // contrato na ficha: empresário, bônus e direitos de imagem
  Hooks.around('Market', Market, 'contractText', 'silly', (ct, G, d) => {
    let s = ct(G, d);
    const c = d.contract || {};
    if (d.team && c.bonus) s += byLang(` · bônus: vitória ${fmtMoney(c.bonus.win)}, pódio ${fmtMoney(c.bonus.podium)}, título ${fmtMoney(c.bonus.title)}`, ` · bonuses: win ${fmtMoney(c.bonus.win)}, podium ${fmtMoney(c.bonus.podium)}, title ${fmtMoney(c.bonus.title)}`);
    if (d.team && c.imageRights) s += byLang(` · ${Math.round(c.imageRights * 100)}% dos direitos de imagem com a equipe`, ` · ${Math.round(c.imageRights * 100)}% of image rights with the team`);
    const ag = Silly.agentInfo(d);   // (0.9) texto da ficha: só lê (regra 6)
    return s + byLang(` · empresário: ${ag.name} (comissão de ${Math.round(ag.fee * 100)}%)`, ` · manager: ${ag.name} (${Math.round(ag.fee * 100)}% commission)`);
  });
  // bônus pagos por resultado
  Hooks.around('Career', Career, 'finishWeekend', 'silly', (fw, G, ...a) => {
    const res = fw(G, ...a);
    const last = G.season.results[G.season.results.length - 1];
    if (last) last.cls.filter(c => c.status === 'fin' && c.pos <= 3).forEach(c => {
      const d = Career.driver(G, c.did); const b = d && d.contract && d.contract.bonus; if (!b) return;
      const v = c.pos === 1 ? b.win + b.podium : b.podium; if (!(v > 0)) return;
      const t = Career.team(G, c.tid); if (!t) return;
      if (t.id === G.player.teamId && !Career.isObs(G)) Career.ledger(G, byLang(`Bônus de resultado: ${d.name}`, `Result bonus: ${d.name}`), -v, 'salário'); else t.cash = +((t.cash || 0) - v).toFixed(2);
    });
    Silly.tick(G);
    return res;
  });
})();
