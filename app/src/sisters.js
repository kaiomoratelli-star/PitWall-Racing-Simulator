/* ============================================================
   PIT WALL — equipes irmãs (como Red Bull e Racing Bulls)
   G.sisters = { equipe irmã: equipe principal }.
   - A família Red Bull já começa assim (dado real de 2026).
   - O jogador pode comprar no máximo uma equipe satélite, a partir da
     segunda temporada, por 40% a 70% do orçamento anual dela.
   - As duas compartilham a academia; a irmã prioriza os pilotos da
     academia da principal (política: jovens ou resultados).
   - A principal promove pilotos da irmã e rebaixa os seus (troca de
     assentos, inclusive no meio da temporada, como a Red Bull faz).
   - Parceria técnica: a irmã usa peças da principal e se aproxima dela
     a cada temporada; no Conselho da FIA, vota com a principal.
   ============================================================ */
'use strict';

const Sisters = {};
Sisters.REAL = { 'racing-bulls': 'red-bull' };

Sisters.ensure = (G) => {
  if (G.sisters) return G.sisters;
  G.sisters = {};
  G.sisterInfo = {};
  Object.entries(Sisters.REAL).forEach(([c, p]) => { if (Career.team(G, c) && Career.team(G, p)) { G.sisters[c] = p; G.sisterInfo[c] = { since: (G.db.rules.startYear || 2027) - 21, real: true }; } });
  Object.entries(G.sisters).forEach(([c, p]) => Sisters.mergeAcademy(G, c, p));
  return G.sisters;
};
Sisters.parentOf = (G, tid) => (G.sisters || {})[tid] || null;
Sisters.childOf = (G, tid) => Object.keys(G.sisters || {}).find(c => G.sisters[c] === tid) || null;
Sisters.firstYear = (G) => (G.db.rules.startYear || 2027) + 1;

/* academia compartilhada: membros da irmã passam para a academia da principal */
Sisters.mergeAcademy = (G, child, parent) => {
  const acs = G.academies || [];
  const ca = acs.find(a => a.team === child), pa = acs.find(a => a.team === parent);
  if (!pa) return;
  if (ca && ca.members.length) {
    ca.members.forEach(id => { if (!pa.members.includes(id)) pa.members.push(id); const d = Career.driver(G, id); if (d) d.academy = parent; });
    ca.members = [];
  }
  if (ca && ca.pending && ca.pending.length) { pa.pending = [...new Set([...(pa.pending || []), ...ca.pending])]; ca.pending = []; }
  if (ca) { ca.active = false; ca.sharedWith = parent; }
  if (!pa.active && pa.members.length) { pa.active = true; pa.budget = Math.max(pa.budget, 2); }
};

/* preço: 40% a 70% do orçamento anual, conforme reputação e resultado recente */
Sisters.price = (G, tid) => {
  const t = Career.team(G, tid);
  const prev = (G.history || []).slice(-1)[0];
  const n = G.db.teams.length;
  const rank = prev ? prev.standC.findIndex(x => x.tid === tid) : Career.expectedRanks(G)[tid] - 1;
  const f = clamp((t.reputation - 50) / 45 * 0.6 + (1 - Math.max(0, rank) / Math.max(1, n - 1)) * 0.4, 0, 1);
  return Math.round(t.budget * (0.4 + 0.3 * f));
};
/* por que uma equipe não está à venda (null = está) */
Sisters.blocker = (G, tid) => {
  const t = Career.team(G, tid), me = Career.team(G);
  if (tid === me.id) return 'É a sua equipe.';
  if (t.works) return 'Equipe de fábrica de uma montadora: não está à venda.';
  if (G.sisters[tid]) return `Pertence à família ${Career.team(G, G.sisters[tid]).name}.`;
  if (Sisters.childOf(G, tid)) return 'Já tem uma equipe irmã.';
  const prev = (G.history || []).slice(-1)[0];
  const rank = prev ? prev.standC.findIndex(x => x.tid === tid) : Career.expectedRanks(G)[tid] - 1;
  if (rank >= 0 && rank < 4) return 'Equipe de ponta: os donos não vendem.';
  if (t.reputation > me.reputation + 4) return 'Os donos não aceitam vender para uma equipe de menor prestígio.';
  return null;
};
Sisters.canBuy = (G) => {
  Sisters.ensure(G);
  const me = G.player.teamId;
  if (Career.isObs(G)) return 'Só no modo chefe de equipe.';
  if (Sisters.parentOf(G, me)) return `A sua equipe pertence à família ${Career.team(G, Sisters.parentOf(G, me)).name}.`;
  if (Sisters.childOf(G, me)) return 'Você já tem uma equipe irmã (no máximo uma).';
  if (G.season.year < Sisters.firstYear(G)) return `Compra liberada a partir da temporada ${Sisters.firstYear(G)}.`;
  if (G.weekend) return 'Termine o fim de semana de corrida antes.';
  return null;
};
Sisters.buy = (G, tid) => {
  const why = Sisters.canBuy(G) || Sisters.blocker(G, tid);
  if (why) return why;
  const price = Sisters.price(G, tid);
  if (G.finances.balance < price) return `Caixa insuficiente: a compra custa ${fmtMoney(price)}.`;
  const t = Career.team(G, tid), me = Career.team(G);
  Career.ledger(G, `Compra da ${t.name} (equipe irmã)`, -price, 'investimento');
  G.finances.spent -= price; // investimento de capital fica fora do teto orçamentário
  G.sisters[tid] = me.id;
  const added = !(t.partnerOf || []).includes(me.id);
  t.partnerOf = [...new Set([...(t.partnerOf || []), me.id])];
  G.sisterInfo[tid] = { since: G.season.year, price, addedPartner: added, policy: 'youth' };
  Sisters.mergeAcademy(G, tid, me.id);
  Career.record(G, 'decisao', `${me.name} comprou a ${t.name} por ${fmtMoney(price)} e criou uma equipe irmã.`, { teams: [me.id, tid] });
  Career.news(G, `${me.name} compra a ${t.name} e passa a ter uma equipe irmã`, 'mercado', `O negócio, avaliado em ${fmtMoney(price)}, inclui academia compartilhada e parceria técnica: a ${t.name} passa a usar peças da ${me.name}.`, { teams: [me.id, tid], main: true });
  return null;
};
Sisters.sell = (G) => {
  const me = G.player.teamId;
  const c = Sisters.childOf(G, me);
  if (!c) return 'Você não tem equipe irmã.';
  if (G.sisterInfo[c] && G.sisterInfo[c].real) return 'Esta relação faz parte da história da equipe e não pode ser desfeita.';
  if (G.weekend) return 'Termine o fim de semana de corrida antes.';
  const t = Career.team(G, c);
  const value = Math.round(Sisters.price(G, c) * 0.85);
  Career.ledger(G, `Venda da ${t.name}`, value, 'investimento');
  if (G.sisterInfo[c] && G.sisterInfo[c].addedPartner) t.partnerOf = (t.partnerOf || []).filter(x => x !== me);
  delete G.sisters[c]; delete G.sisterInfo[c];
  const ca = (G.academies || []).find(a => a.team === c); if (ca) delete ca.sharedWith;
  Career.record(G, 'decisao', `${Career.team(G, me).name} vendeu a ${t.name} por ${fmtMoney(value)}.`, { teams: [me, c] });
  Career.news(G, `${Career.team(G, me).name} vende a ${t.name}`, 'mercado', '', { teams: [me, c] });
  return null;
};
Sisters.setPolicy = (G, v) => { const c = Sisters.childOf(G, G.player.teamId); if (c) (G.sisterInfo[c] = G.sisterInfo[c] || {}).policy = v; };
/* bônus na escolha de pilotos da irmã para quem é da academia da principal */
Sisters.academyBonus = (G, t, d) => {
  const p = Sisters.parentOf(G, t.id);
  if (!p || typeof Market === 'undefined') return 0;
  const ac = Market.academyOf(G, d);
  if (!ac || ac.team !== p) return 0;
  const pol = (G.sisterInfo && G.sisterInfo[t.id] && G.sisterInfo[t.id].policy) || 'youth';
  return pol === 'results' ? 2 : 8 + (d.age <= 23 ? 3 : 0);
};

/* ---------- troca de assentos entre principal e irmã ---------- */
Sisters.form = (G, d) => {
  const st = G.season && G.season.stats[d.id];
  const mate = st && st.starts ? st.beatMate / st.starts - 0.5 : 0;
  return driverOverall(d) + mate * 6;
};
Sisters.swap = (G, upId, downId, why) => {
  const up = Career.driver(G, upId), down = Career.driver(G, downId);
  if (!up || !down) return 'Piloto não encontrado.';
  const pT = down.team, cT = up.team;
  if (Sisters.parentOf(G, cT) !== pT) return 'Os dois precisam estar na equipe principal e na irmã.';
  if (up.seat === 'R' || down.seat === 'R') return 'A troca é entre pilotos titulares.';
  if (up.futureTeam || down.futureTeam) return 'Um dos pilotos já assinou com outra equipe para o ano que vem.';
  const pSeat = down.seat, cSeat = up.seat;
  const y = G.season.year, r = G.season.round;
  up.team = pT; up.seat = pSeat; down.team = cT; down.seat = cSeat;
  [[up, cT, pT], [down, pT, cT]].forEach(([d, from, to]) => {
    d.transfers = d.transfers || [];
    d.transfers.push({ y, r, to, from, salary: d.salary, until: d.contract ? d.contract.until : y + Math.max(0, d.contractYears), swap: true });
    if (d.contract) d.contract.loanFrom = to === pT ? null : pT;
  });
  up.morale = clamp((up.morale ?? 70) + 12, 0, 100);
  down.morale = clamp((down.morale ?? 70) - 18, 0, 100);
  const P = Career.team(G, pT).name, Cn = Career.team(G, cT).name;
  const when = G.season.round > 0 && !Career.seasonOver(G) ? 'a partir da próxima etapa' : `para ${y}`;
  Career.record(G, 'contrato', `${P} promove ${up.name} da ${Cn} e rebaixa ${down.name} (${when}). ${why || ''}`.trim(), { teams: [pT, cT], drivers: [up.id, down.id] });
  Career.news(G, `${P} promove ${up.name}; ${down.name} volta para a ${Cn}`, 'mercado', `Troca de assentos dentro da família ${P}, ${when}. ${why || ''}`.trim(), { teams: [pT, cT], drivers: [up.id, down.id], main: true });
  return null;
};
/* pares candidatos: o melhor da irmã contra o pior da principal */
Sisters.candidates = (G, parent) => {
  const child = Sisters.childOf(G, parent);
  if (!child) return null;
  const race = (tid) => G.db.drivers.filter(d => d.team === tid && d.seat !== 'R' && !d.futureTeam && !d.injured);
  const ps = race(parent).sort((a, b) => Sisters.form(G, a) - Sisters.form(G, b));
  const cs = race(child).sort((a, b) => Sisters.form(G, b) - Sisters.form(G, a));
  if (!ps.length || !cs.length) return null;
  return { child, up: cs[0], down: ps[0], gap: Sisters.form(G, cs[0]) - Sisters.form(G, ps[0]) };
};
/* decisões das equipes principais controladas pelo jogo */
Sisters.review = (G, phase) => {
  Sisters.ensure(G);
  const me = Career.isObs(G) ? null : G.player.teamId;
  Object.entries(G.sisters).forEach(([child, parent]) => {
    if (parent === me) return; // o jogador decide pela tela Equipe irmã
    const c = Sisters.candidates(G, parent);
    if (!c || c.up.age > 28) return;
    const r = localRng(`sis:${G.seed}:${G.season.year}:${G.season.round}:${child}:${phase}`)();
    const need = phase === 'mid' ? 4 : 2.2;
    if (c.gap < need || r > (phase === 'mid' ? 0.4 : 0.7)) return;
    if (child === me) {
      // a principal leva o seu piloto (ele é da academia dela) e manda o rebaixado para você
      const ac = typeof Market !== 'undefined' ? Market.academyOf(G, c.up) : null;
      if (!ac || ac.team !== parent) return;
      Sisters.swap(G, c.up.id, c.down.id, `${c.up.name} pertence à academia da ${Career.team(G, parent).name}.`);
      Career.mail(G, { from: 'Diretoria', tag: 'team', title: `${Career.team(G, parent).name} promove ${c.up.name}`, body: `A equipe principal exerceu o direito sobre ${c.up.name}, piloto da academia dela. ${c.down.name} passa a correr pela sua equipe com o contrato atual.` });
      return;
    }
    Sisters.swap(G, c.up.id, c.down.id, phase === 'mid' ? 'Decisão tomada no meio da temporada pelo rendimento.' : 'Decisão para a nova temporada.');
  });
};
/* parceria técnica: a irmã usa peças da principal (suspensão, câmbio, partes do chassi) */
Sisters.techTransfer = (G) => {
  Object.entries(G.sisters || {}).forEach(([child, parent]) => {
    const c = Career.team(G, child), p = Career.team(G, parent);
    if (!c || !p) return;
    if (p.car.chassis > c.car.chassis) c.car.chassis = +(c.car.chassis + (p.car.chassis - c.car.chassis) * 0.08).toFixed(2);
    if (p.car.aero > c.car.aero) c.car.aero = +(c.car.aero + (p.car.aero - c.car.aero) * 0.04).toFixed(2);
  });
};
Sisters.afterRound = (G) => {
  if (!G.season || Career.seasonOver(G)) return;
  if (G.season.round === Math.round(G.season.calendar.length * 0.4)) Sisters.review(G, 'mid');
};
Sisters.seasonStart = (G) => { Sisters.ensure(G); Sisters.techTransfer(G); Sisters.review(G, 'pre'); };
