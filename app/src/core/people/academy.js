/* ============================================================
   PIT WALL — academia de pilotos (V0.8.3)
   - Entrar numa academia é um contrato, como na vida real: salário de
     júnior (bem menor que o de piloto), duração, multa de saída e o
     custeio do assento na categoria (a academia paga a vaga do piloto).
   - Negociação: o piloto aceita, recusa ou faz contraproposta conforme o
     prestígio da academia (estrutura e equipe), o salário, a ambição e o
     interesse das academias rivais (a IA também contrata juniores).
   - Plano de carreira: para cada membro, a equipe sugere a categoria do
     ano seguinte — ficar mais um ano, subir ou trocar de região (ex.: F4
     Brasil → FRECA direto, ou mais um ano numa F4 europeia). O jogo
     respeita o plano na virada do ano quando há vaga ou a academia compra
     o assento; o piloto pode reclamar se for segurado sem motivo.
   Valores de assento (estimativas de mercado em US$ mi por temporada):
   F4 0,35 · regional 0,9 · F3 1,2 · F2 2,6 · F1 Academy 0,15 (subsidiada).
   ============================================================ */
'use strict';

const Academy = {};
Academy.SEAT = (cat) => {
  if (!cat) return 0;
  const w = seriesInfo(cat.id).academySeat;   // (0.9) custo da vaga por série: REAL_EXTRA.series.info[id].academySeat
  if (w != null) return w;
  if (cat.tier >= 5) return 0.35;
  return 0;                                         // séries profissionais: a equipe da série paga
};
Academy.prestige = (G, a) => {
  const t = Career.team(G, a.team);
  return clamp(a.level * 0.55 + (t ? t.reputation : 60) * 0.45, 20, 99);
};
Academy.contractOf = (d) => d.acContract || null;
Academy.ask = (G, d) => {
  // pedido do piloto: cresce com a nota, o potencial que as equipes enxergam e a idade
  const e = typeof Potential !== 'undefined' ? Potential.estimate(G, d, 'ai').mid : d.potential || 70;
  return +clamp(0.03 + Math.max(0, e - 70) * 0.012 + Math.max(0, driverOverall(d) - 65) * 0.006, 0.03, 0.6).toFixed(2);
};
/* academias rivais interessadas (as de equipes com bom prestígio disputam os melhores juniores) */
Academy.rivals = (G, d, mine) => {
  const e = typeof Potential !== 'undefined' ? Potential.estimate(G, d, 'ai').mid : d.potential || 70;
  if (e < 82) return [];
  return (G.academies || []).filter(a => a.active && a !== mine && localRng(`acrival:${G.seed}:${a.id}:${d.id}:${G.season.year}`)() < (e - 80) / 20);
};
/* proposta do jogador: {salary, years} */
Academy.offer = (G, did, offer) => {
  const a = Market.myAcademy(G), d = Career.driver(G, did);
  if (!a || !d) return { status: 'error', msg: byLang('Academia não encontrada.', 'Academy not found.') };
  if (d.age > 23) return { status: 'reject', msg: byLang('Academias aceitam pilotos com até 23 anos.', 'Academies take drivers aged 23 or under.') };
  const other = Market.academyOf(G, d);
  if (other && other.team !== a.team) {
    const c = Academy.contractOf(d);
    if (c && c.until > G.season.year) return { status: 'reject', msg: byLang(`${d.name} tem contrato com a ${other.name} até ${c.until}.`, `${d.name} is contracted to ${other.name} until ${c.until}.`) };
  }
  const ask = Academy.ask(G, d);
  const rivals = Academy.rivals(G, d, a);
  const P = d.personality || { ambition: 60, loyalty: 50 };
  const pres = Academy.prestige(G, a);
  const best = rivals.length ? Math.max(...rivals.map(x => Academy.prestige(G, x))) : 0;
  let score = 50 + (offer.salary / Math.max(0.03, ask) - 1) * 40 + (pres - Math.max(55, best)) * (0.4 + P.ambition / 250) - rivals.length * 4 + (offer.years >= 3 ? -4 : 0);
  const p = clamp(1 / (1 + Math.exp(-(score - 50) / 8)), 0.03, 0.97);
  const r = localRng(`acoffer:${G.seed}:${d.id}:${G.season.year}:${G.season.round}:${offer.salary}:${offer.years}`)();
  if (r < p && offer.salary >= ask * 0.8) return { status: 'accept', p, ask, rivals: rivals.length };
  if (offer.salary < ask * 0.5) return { status: 'reject', p, ask, msg: byLang(`${d.name} recusou. Pede perto de ${fmtMoney(ask)}/ano${rivals.length ? ` e tem ${rivals.length} academia(s) rival(is) interessada(s)` : ''}.`, `${d.name} declined. Asks about ${fmtMoney(ask)}/year${rivals.length ? ` and has ${rivals.length} rival academ${rivals.length > 1 ? 'ies' : 'y'} interested` : ''}.`) };
  return { status: 'counter', p, ask, rivals: rivals.length, counter: { salary: +Math.max(offer.salary, ask * (1 + rivals.length * 0.08)).toFixed(2), years: offer.years } };
};
Academy.sign = (G, did, offer) => {
  const a = Market.myAcademy(G), d = Career.driver(G, did);
  const other = Market.academyOf(G, d);
  if (other && other !== a) { other.members = other.members.filter(x => x !== d.id); }
  if (!a.active) { a.active = true; a.budget = Math.max(a.budget, 2); }
  if (!a.members.includes(d.id)) a.members.push(d.id);
  d.academy = a.team;
  d.acContract = { team: a.team, salary: +(+offer.salary).toFixed(2), until: G.season.year + offer.years, signed: G.season.year, buyout: +(offer.salary * offer.years * 1.5 + 0.2).toFixed(2) };
  Career.record(G, 'contrato', byLang(`${d.name} assinou com a ${a.name} até ${d.acContract.until} (${fmtMoney(offer.salary)}/ano).`, `${d.name} signed with ${a.name} until ${d.acContract.until} (${fmtMoney(offer.salary)}/year).`), { teams: [a.team], drivers: [d.id] });
  Career.news(G, byLang(`${d.name} é o novo integrante da ${a.name}`, `${d.name} joins ${a.name}`), 'mercado');
  return byLang(`${d.name} assinou com a ${a.name} até ${d.acContract.until}.`, `${d.name} signed with ${a.name} until ${d.acContract.until}.`);
};

/* ---------- plano de carreira ---------- */
/* opções para o ano seguinte: ficar, subir (série de acesso) ou trocar por uma do mesmo nível em outra região */
Academy.options = (G, d) => {
  if (!d.cat || d.team) return [];
  const cat = Cats.get(G, d.cat); if (!cat || cat.pro) return [];
  const out = [{ id: 'stay', label: byLang(`Ficar na ${cat.short} mais um ano`, `Stay in ${cat.short} another year`) }];
  const up = Cats.UP[cat.id];
  const ups = new Set([up, ...Object.entries(Cats.FEEDERS).filter(([k, v]) => v.includes(cat.id) && !(Cats.get(G, k) || {}).pro).map(([k]) => k)].filter(Boolean));
  ups.forEach(id => { const c = Cats.get(G, id); if (c && c.enabled !== false && !c.secondary && (!c.women || (typeof Disc !== 'undefined' && Disc.isWoman(d)))) out.push({ id, label: byLang(`Subir para a ${c.name}`, `Move up to ${c.name}`), up: true }); });
  Cats.list(G).filter(c => c.id !== cat.id && !c.secondary && !c.pro && Math.abs(c.tier - cat.tier) < 0.5 && (!c.women || (typeof Disc !== 'undefined' && Disc.isWoman(d)))).forEach(c => out.push({ id: c.id, label: byLang(`Trocar para a ${c.name}`, `Switch to ${c.name}`) }));
  return out;
};
Academy.setPlan = (G, did, opt) => { const d = Career.driver(G, did); if (!d) return; d.acPlan = opt ? { y: G.season.year, opt } : null; };
/* aplicado depois da progressão das categorias (virada de ano) */
Academy.applyPlans = (G) => {
  const y = G.season.year;
  (G.academies || []).forEach(a => a.members.forEach(id => {
    const d = Career.driver(G, id);
    if (!d || d.retired || d.team || !d.acPlan || d.acPlan.y !== y) return;
    const opt = d.acPlan.opt; d.acPlan = null;
    if (opt === 'stay') return;                                   // já tratado dentro da progressão
    const to = Cats.get(G, opt); if (!to) return;
    if (to.entries.some(e => e.did === d.id)) return;
    // tira da categoria atual e compra a vaga na escolhida (substitui o piloto de menor nota sem apoio)
    Cats.list(G, true).forEach(c => { c.entries = c.entries.filter(e => e.did !== d.id); });
    if (to.entries.length >= to.seats) {
      const victim = to.entries.map(e => ({ e, x: Career.driver(G, e.did) })).filter(o => o.x && !o.x.academy).sort((p, q) => driverOverall(p.x) - driverOverall(q.x))[0];
      if (victim) { to.entries = to.entries.filter(e => e !== victim.e); victim.x.cat = null; }
    }
    if (to.entries.length >= to.seats) return;
    const team = (Cats.freeSeats(to)[0]) || RNG.pick(to.teams).id;
    d.cat = to.id; d.ctm = team;
    to.entries.push({ did: d.id, team, no: d.number, st: 'academia' });
    Career.record(G, 'categorias', byLang(`${a.name}: ${d.name} vai correr na ${to.name} em ${y + 1} (plano da academia).`, `${a.name}: ${d.name} will race in ${to.name} in ${y + 1} (academy plan).`), { drivers: [d.id], teams: [a.team] });
  }));
};
/* custo anual: salários dos juniores e custeio dos assentos */
Academy.yearCost = (G, a) => a.members.reduce((s, id) => { const d = Career.driver(G, id); if (!d || d.retired) return s; return s + ((d.acContract && d.acContract.team === a.team) ? d.acContract.salary : 0.1) + (d.team ? 0 : Academy.SEAT(d.cat && Cats.get(G, d.cat))); }, 0);
Academy.charge = (G) => {
  (G.academies || []).forEach(a => {
    if (!a.active) return;
    const c = +Academy.yearCost(G, a).toFixed(2); if (!c) return;
    if (a.team === G.player.teamId && !Career.isObs(G)) Career.ledger(G, byLang(`Academia: salários e assentos dos juniores (${a.members.length})`, `Academy: junior salaries and seats (${a.members.length})`), -c, 'academia');
    else { const t = Career.team(G, a.team); if (t) t.cash = +(t.cash - c).toFixed(2); }
  });
};
/* contratos vencidos: renovação automática para a IA; para o jogador, aviso e saída se não renovar */
Academy.contracts = (G) => {
  const y = G.season.year;
  (G.academies || []).forEach(a => a.members.slice().forEach(id => {
    const d = Career.driver(G, id); if (!d) return;
    if (!d.acContract) d.acContract = { team: a.team, salary: Academy.ask(G, d), until: y + 1, signed: y, buyout: 0.3, estimated: true };
    if (d.acContract.until > y) return;
    const mine = a.team === G.player.teamId && !Career.isObs(G);
    const keep = mine ? !!d.acRenew : (d.age <= 22 && (typeof Potential !== 'undefined' ? Potential.seenBy(G, d, a.team) : d.potential) >= 82);
    if (keep) { d.acContract = { ...d.acContract, until: y + 2, salary: +(Academy.ask(G, d)).toFixed(2), signed: y }; d.acRenew = false; }
    else { a.members = a.members.filter(x => x !== id); if (d.academy === a.team) d.academy = null; d.acContract = null; if (mine) Career.mail(G, { from: byLang('Academia', 'Academy'), tag: 'team', title: byLang(`${d.name} deixa a academia`, `${d.name} leaves the academy`), body: byLang('O contrato terminou sem renovação.', 'The contract ended without renewal.') }); }
  }));
};
/* IA: academias contratam juniores promissores todo ano (disputa real pelos talentos) */
Academy.aiSign = (G) => {
  (G.academies || []).filter(a => a.active && a.team !== G.player.teamId).forEach(a => {
    if (a.members.length >= 8) return;
    const pool = G.db.drivers.filter(d => !d.retired && !d.team && !d.academy && d.age <= 19 && d.cat).map(d => ({ d, e: Potential.seenBy(G, d, a.team) })).filter(x => x.e >= 84).sort((p, q) => q.e - p.e);
    const pick = pool[Math.floor(localRng(`acai:${G.seed}:${a.id}:${G.season.year}`)() * Math.min(3, pool.length))];
    if (!pick) return;
    const d = pick.d; a.members.push(d.id); d.academy = a.team;
    d.acContract = { team: a.team, salary: Academy.ask(G, d), until: G.season.year + 2, signed: G.season.year, buyout: 0.5 };
    Career.record(G, 'contrato', `${d.name} entrou na ${a.name}.`, { teams: [a.team], drivers: [d.id] });
  });
};
/* desempenho do membro na temporada atual (para a tela) */
Academy.form = (G, d) => {
  const cat = d.cat && Cats.get(G, d.cat);
  if (d.team) { const st = G.season.stats[d.id] || {}; return { where: Career.team(G, d.team).name + (d.seat === 'R' ? byLang(' (reserva)', ' (reserve)') : ''), pos: null, pts: st.points || 0, races: st.starts || 0 }; }
  if (!cat) return { where: d.series && typeof DriverDB !== 'undefined' ? DriverDB.seriesName(d.series) : byLang('sem vaga', 'no seat'), pos: null, pts: 0, races: 0 };
  const tab = cat.season && cat.season.res && cat.season.res.length ? Cats.standings(cat) : [];
  const i = tab.findIndex(x => x.did === d.id);
  return { where: cat.name, cat, pos: i >= 0 ? i + 1 : null, of: tab.length, pts: i >= 0 ? tab[i].pts : 0, races: cat.season ? cat.season.res.length : 0, team: (cat.teams.find(t => t.id === d.ctm) || {}).name || '' };
};

/* membros que já estavam na academia ao começar a carreira: contrato estimado de júnior */
Academy.initContracts = (G) => {
  const y = G.season ? G.season.year : 2027;
  (G.academies || []).forEach(a => a.members.forEach(id => { const d = Career.driver(G, id); if (d && !d.acContract) d.acContract = { team: a.team, salary: Academy.ask(G, d), until: y + 1, signed: y, buyout: 0.3, estimated: true }; }));
};
(function () {
  Hooks.around('Career', Career, 'initPeople', 'academy', (ip, G) => { const r = ip(G); Academy.initContracts(G); return r; });
  // virada de ano: custos, contratos, IA contratando, planos (depois da progressão das categorias)
  Hooks.around('Career', Career, 'endSeason', 'academy', (es, G) => { Academy.charge(G); Academy.contracts(G); const r = es(G); Academy.aiSign(G); return r; });
  if (typeof Cats !== 'undefined') {
    Hooks.around('Cats', Cats, 'progression', 'academy', (pg, G, initial) => { const r = pg(G, initial); if (!initial) Academy.applyPlans(G); return r; });
  }
  // contratar pela academia agora passa pela negociação (a função antiga continua para a IA e migrações)
})();
