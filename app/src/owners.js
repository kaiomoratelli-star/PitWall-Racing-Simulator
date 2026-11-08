/* ============================================================
   PIT WALL — equipes como empresas (V0.8.4)
   - Cada equipe tem dono (montadora, empresa, fundo, independente),
     com riqueza, ambição e paciência. O humor do dono sobe e desce
     com os resultados (contra a expectativa) e com o caixa.
   - Valor de mercado estimado pela receita, reputação, estrutura,
     patrimônio e dívida.
   - Decisões dos donos: aumentar ou cortar o aporte e colocar a equipe
     à venda (montadora que sai, independente sem dinheiro, fundo que
     realiza lucro).
   - Venda: compradores (candidatas do banco e investidores) negociam;
     o comprador pode trocar nome, cores e logo (a linhagem fica guardada).
     Sem comprador e com a dívida crescendo: compra pela gestão
     (como a Brawn em 2009) ou saída do grid.
   - Regras do dono do jogo: Ferrari e McLaren nunca são vendidas;
     Mercedes e Red Bull só depois de 20 temporadas e numa crise
     muito forte; as outras podem ser vendidas.
   - Entrada de equipes novas (até 12): inscrição, análise da FIA,
     voto da Comissão e estreia na temporada seguinte à aprovação.
   - Criação de equipe pelo jogador (12ª equipe), com logo genérico,
     importado ou de uma candidata do banco.
   ============================================================ */
'use strict';

const Owners = {};
Owners.MAX = 12;
Owners.FEE = 450;   // taxa de entrada (anti-diluição) em milhões, paga pelo dono
Owners.state = (G) => (G.owners = G.owners || { log: [], cand: {}, apps: [], gone: [], engines: [] });
Owners.cands = () => (typeof TEAM_CANDIDATES !== 'undefined' ? TEAM_CANDIDATES : []);
Owners.cand = (id) => Owners.cands().find(c => c.id === id) || null;
Owners.start = (G) => G.db.rules.startYear || 2027;
Owners.isPlayerTeam = (G, t) => !Career.isObs(G) && t.id === G.player.teamId;
/* investidores sem marca própria (fictícios) */
Owners.INVESTORS = ['Northgate Sports Capital', 'Halvard Partners', 'Crestline Motorsport Holdings', 'Ardent Ventures', 'Silverpine Group', 'Kestrel & Vane Capital', 'Orrin Bay Investments', 'Valmont Equity'];

Owners.ensureTeam = (G, t) => {
  if (!t.owner) {
    const o = (typeof TEAM_OWNERS !== 'undefined' && TEAM_OWNERS[t.id]) || { name: byLang(`Grupo ${t.name}`, `${t.name} group`), type: 'independente', wealth: 55, ambition: 60, patience: 60 };
    t.owner = { ...o, since: o.since ?? null };
  }
  if (t.debt == null) t.debt = 0;
  if (t.ownerMood == null) t.ownerMood = 60;
  if (t.crisisYears == null) t.crisisYears = 0;
  t.lineage = t.lineage || [];
};
Owners.ensure = (G) => { Owners.state(G); G.db.teams.forEach(t => Owners.ensureTeam(G, t)); };

/* valor de mercado (US$ mi): receita × múltiplo da marca + patrimônio − dívida */
Owners.value = (G, t) => {
  const rev = typeof Econ !== 'undefined' ? Econ.revenue(G, t).total : (t.budget || 200);
  const mult = 5.5 + ((t.reputation ?? 60) - 50) / 9 + (typeof Econ !== 'undefined' ? Econ.size(t) * 1.2 : 0.6);
  // o patrimônio acumulado dos donos pesa pouco no valor da equipe (não é receita da operação)
  return Math.max(150, Math.round(rev * mult + Math.min(600, (t.corporate || 0) * 0.3) - (t.debt || 0)));
};
Owners.protection = (G, t) => (t.owner && t.owner.sale) || null;
/* pode ser vendida neste ano? */
Owners.sellable = (G, t) => {
  const p = Owners.protection(G, t);
  if (p === 'nunca') return false;
  if (p === 'protegida20') return G.season.year - Owners.start(G) >= 20 && t.crisisYears >= 3 && t.ownerMood < 15;
  return true;
};
/* posição esperada pelo dono: ambição e tamanho histórico (reputação) */
Owners.expected = (G, t) => {
  const n = G.db.teams.length;
  const amb = clamp(Math.round(1 + (100 - t.owner.ambition) / 100 * n * 0.95), 1, n);
  const repRank = G.db.teams.slice().sort((a, b) => b.reputation - a.reputation).indexOf(t) + 1;
  return Math.round((amb + repRank) / 2);
};

/* ---------- fim de temporada: humor, aporte, venda, saída, entrada ---------- */
Owners.yearly = (G, sc) => {
  const S = Owners.state(G);
  const y = G.season.year - 1;            // temporada que acabou de terminar (já começou a nova)
  const n = G.db.teams.length;
  G.db.teams.forEach(t => {
    Owners.ensureTeam(G, t);
    const pos = sc.findIndex(x => x.tid === t.id) + 1 || n;
    const exp = Owners.expected(G, t);
    const cash = Owners.isPlayerTeam(G, t) ? G.finances.balance : (t.cash || 0);
    const budget = t.budget || 200;
    // dívida: caixa negativo vira dívida com juros; caixa folgado amortiza
    if (cash < -budget * 0.15) t.debt = +((t.debt || 0) * 1.08 + (-cash - budget * 0.15) * 0.5).toFixed(1);
    else if (t.debt > 0) t.debt = +Math.max(0, t.debt * 1.06 - Math.max(0, cash) * 0.4 - (t.ownerFunding || 0) * 0.15).toFixed(1);
    const fin = cash < 0 ? -12 * Math.min(1, -cash / budget * 2) : 2;
    const debtHit = -Math.min(15, (t.debt || 0) / Math.max(1, Owners.value(G, t)) * 60);
    const champ = sc[0] && sc[0].tid === t.id ? 10 : 0;
    t.ownerMood = Math.round(clamp(t.ownerMood + 0.25 * (60 - t.ownerMood) + (exp - pos) * 3.2 + fin + debtHit + champ, 0, 100));
    t.crisisYears = (cash < 0 || t.ownerMood < 25 || t.debt > budget * 0.5) ? t.crisisYears + 1 : 0;
    t.valueHist = (t.valueHist || []).concat([{ y, v: Owners.value(G, t) }]).slice(-60);
    // aporte: dono feliz e ambicioso coloca mais; infeliz corta
    if (!t.forSale) {
      const r = localRng(`ownf:${G.seed}:${t.id}:${y}`)();
      if (t.ownerMood > 70 && t.owner.wealth > 60 && r < 0.4) t.ownerFunding = +clamp((t.ownerFunding || 30) * 1.08, 10, 300).toFixed(1);
      else if (t.ownerMood < 30 && r < 0.5) t.ownerFunding = +clamp((t.ownerFunding || 30) * 0.88, 10, 300).toFixed(1);
    }
  });
  Owners.saleDecisions(G, y);
  Owners.processSales(G, y);
  Owners.engineProjects(G);
  Owners.applications(G, y);
  Owners.enterApproved(G);
};

Owners.saleDecisions = (G, y) => {
  G.db.teams.forEach(t => {
    if (t.forSale || !Owners.sellable(G, t)) return;
    // equipe nova tem o prazo do plano de negócios antes de o dono pensar em vender
    if (t.entered && y - t.entered < (t.planYears || 5)) return;
    const o = t.owner, r = localRng(`sell:${G.seed}:${t.id}:${y}`)();
    const unhappy = t.ownerMood < 35 ? (35 - t.ownerMood) / 35 : 0;
    const impatience = 1.3 - o.patience / 100;
    let p = 0, reason = null;
    const prot = Owners.protection(G, t) === 'protegida20';
    if (prot) { p = 0.25; reason = 'crise'; }
    else {
      const base = { montadora: 0.16, independente: 0.12, fundo: 0.1, empresa: 0.12, grupo: 0.08, equipe: 0.12 }[o.type] ?? 0.1;
      p = base * unhappy * 2 * impatience;
      if (unhappy && o.type === 'montadora') reason = 'estrategia';
      else if (unhappy) reason = 'crise';
      // fundo realiza o lucro depois de alguns anos de valorização
      const since = o.since || Owners.start(G) - 5;
      const bought = (t.valueHist || []).find(v => v.y >= since);
      if (o.type === 'fundo' && y - since >= 5 && bought && Owners.value(G, t) > bought.v * 1.35) { p += 0.1; reason = reason || 'lucro'; }
      // dono independente: dinheiro curto, idade, outros negócios
      if (o.type === 'independente' && o.wealth < 70) { p += 0.012; reason = reason || 'pessoal'; }
      if (t.debt > (t.budget || 200) * 0.6) { p += 0.15; reason = 'divida'; }
    }
    if (r < p) Owners.putForSale(G, t, reason || 'crise', y);
  });
};
Owners.REASON = {
  crise: ['resultados abaixo do esperado e prejuízo', 'poor results and losses'], estrategia: ['a montadora decidiu sair da F1 e rever a estratégia', 'the manufacturer decided to leave F1 and rethink its strategy'],
  lucro: ['o fundo quer realizar o lucro da valorização da equipe', 'the fund wants to cash in on the team’s rising value'], pessoal: ['o dono quer se desfazer do negócio', 'the owner wants out of the business'],
  divida: ['dívida crescente que os donos não querem mais cobrir', 'mounting debt the owners no longer want to cover'],
};
Owners.putForSale = (G, t, reason, y) => {
  t.forSale = { since: y, ask: Owners.value(G, t), reason };
  const R = Owners.REASON[reason] || Owners.REASON.crise;
  const txt = byLang(`${t.owner.name} coloca a ${t.name} à venda: ${R[0]}.`, `${t.owner.name} puts ${t.name} up for sale: ${R[1]}.`);
  Career.news(G, byLang(`${t.name} está à venda`, `${t.name} is up for sale`), 'mercado', txt + byLang(` Valor estimado: ${fmtMoney(t.forSale.ask)}.`, ` Estimated value: ${fmtMoney(t.forSale.ask)}.`), { tm: [t.id], main: true });
  Career.record(G, 'equipe', txt, { teams: [t.id] });
  Owners.state(G).log.unshift({ y, kind: 'avenda', tid: t.id, name: t.name, reason });
  if (Owners.isPlayerTeam(G, t)) Career.mail(G, { from: byLang('Diretoria', 'Board'), tag: 'board', important: true, title: byLang('A equipe está à venda', 'The team is for sale'), body: txt + byLang(' Seu cargo continua até a conclusão do negócio. Os novos donos podem mudar o nome, as cores e o orçamento.', ' Your role continues until the deal closes. New owners may change the name, colours and budget.') });
};
/* compradores interessados neste ano */
Owners.buyers = (G, t, y) => {
  const S = Owners.state(G);
  const inGrid = new Set(G.db.teams.map(x => x.candidate).filter(Boolean));
  return Owners.cands().filter(c => c.buyer && y >= c.from - 1 && !inGrid.has(c.id) && !Owners.blocked(G, c) && !['entrou', 'comprou', 'inscrita'].includes((S.cand[c.id] || {}).status));
};
Owners.processSales = (G, y) => {
  G.db.teams.slice().forEach(t => {
    const fs = t.forSale; if (!fs) return;
    const r = localRng(`sale:${G.seed}:${t.id}:${y}`);
    const yrs = y - fs.since;
    const distress = clamp(((t.debt || 0) / Math.max(1, Owners.value(G, t))) + (t.crisisYears * 0.08), 0, 0.6);
    const pBuyer = 0.5 - distress * 0.4 + (t.reputation - 60) / 200;
    if (r() < pBuyer) {
      const cs = Owners.buyers(G, t, y);
      let buyer = null;
      if (cs.length && r() < 0.6) {
        const w = cs.map(c => c.interest * (0.5 + c.owner.wealth / 100));
        let x = r() * w.reduce((a, v) => a + v, 0); buyer = cs.find((c, i) => (x -= w[i]) <= 0) || cs[0];
      }
      const price = Math.round(Owners.value(G, t) * (0.95 - distress * 0.6 + r() * 0.15));
      Owners.transfer(G, t, buyer, price, y, r);
      return;
    }
    const cash = Owners.isPlayerTeam(G, t) ? G.finances.balance : (t.cash || 0);
    const deep = cash < -(t.budget || 200) * 0.2 || t.debt > (t.budget || 200) * 0.5;
    // montadora ou empresa que quer sair e não acha comprador fecha a operação (como a Toyota em 2009)
    const quit = ['montadora', 'empresa'].includes(t.owner.type) && t.ownerMood < 25;
    if (yrs >= 2 && (deep || quit)) {
      // sem comprador: compra pela gestão ou fim da linha
      if (Owners.isPlayerTeam(G, t) || G.db.teams.length <= 9 || r() < 0.55) Owners.managementBuyout(G, t, y);
      else Owners.exit(G, t, deep ? 'falencia' : 'retirada', y);
    } else if (yrs >= 3 && !deep) {
      t.forSale = null; t.ownerMood = clamp(t.ownerMood + 10, 0, 100);
      Career.news(G, byLang(`${t.owner.name} tira a ${t.name} do mercado e segue como dono`, `${t.owner.name} takes ${t.name} off the market and stays on as owner`), 'mercado', '', { tm: [t.id] });
    }
  });
};
/* troca de dono (comprador do banco ou investidor) */
Owners.transfer = (G, t, cand, price, y, r) => {
  const S = Owners.state(G);
  const old = { name: t.name, fullName: t.fullName, owner: t.owner.name, color: t.color, color2: t.color2, logo: t.logo };
  const inv = Owners.INVESTORS[Math.floor(r() * Owners.INVESTORS.length)];
  if (cand) {
    t.owner = { ...cand.owner, since: y + 1 };
    // a marca nova assume a identidade; a história da equipe continua a mesma
    t.identityHistory = t.identityHistory || [];
    t.identityHistory.push({ until: y, name: t.name, fullName: t.fullName, sponsors: (t.sponsors || []).slice(), color: t.color, color2: t.color2 });
    Object.assign(t, { name: cand.name, fullName: cand.fullName, short: cand.short, color: cand.color, color2: cand.color2, logo: cand.logo, carImg: null, img: null, titleSponsor: null, candidate: cand.id });
    t.ownerFunding = cand.funding;
    t.facilities = Math.round(clamp(t.facilities + (cand.owner.wealth - 60) / 8, 50, 99));
    S.cand[cand.id] = { status: 'comprou', y, tid: t.id };
    if (cand.engine === 'propria') S.engines.push({ tid: t.id, cid: cand.id, ready: y + 1 + (cand.engineYears || 3) });
  } else {
    t.owner = { name: inv + byLang(' (fundo de investimento, fictício)', ' (investment fund, fictional)'), type: 'fundo', wealth: 60 + Math.round(r() * 25), ambition: 55 + Math.round(r() * 25), patience: 50 + Math.round(r() * 20), since: y + 1 };
    t.ownerFunding = +clamp((t.ownerFunding || 30) * (0.9 + r() * 0.4), 15, 200).toFixed(1);
  }
  t.debt = 0; t.forSale = null; t.ownerMood = 70; t.crisisYears = 0;
  if (t.costCut && t.costCut < 1) t.costCut = Math.min(1, t.costCut + 0.1);
  if (!Owners.isPlayerTeam(G, t)) t.cash = Math.max(t.cash || 0, Math.round((t.budget || 200) * 0.2));
  Owners.breakSister(G, t);
  t.lineage.push({ y: y + 1, from: old.name, to: t.name, owner: t.owner.name, price, kind: 'venda' });
  S.log.unshift({ y, kind: 'venda', tid: t.id, from: old.name, to: t.name, owner: t.owner.name, price });
  const renamed = old.name !== t.name;
  const title = byLang(`${old.name} é vendida para ${cand ? cand.owner.name : inv}${renamed ? ` e vira ${t.name}` : ''}`, `${old.name} sold to ${cand ? cand.owner.name : inv}${renamed ? ` and becomes ${t.name}` : ''}`);
  const body = byLang(`Negócio estimado em ${fmtMoney(price)}, com aprovação da FIA. ${renamed ? `A partir de ${y + 1}, a equipe corre como ${t.fullName}. A estrutura, os funcionários e a história da antiga ${old.name} continuam.` : 'O nome da equipe não muda por enquanto.'}`, `Deal estimated at ${fmtMoney(price)}, approved by the FIA. ${renamed ? `From ${y + 1} the team races as ${t.fullName}. The structure, staff and history of the former ${old.name} carry on.` : 'The team name stays the same for now.'}`);
  Career.news(G, title, 'mercado', body, { tm: [t.id], main: true });
  Career.record(G, 'equipe', `${title}. ${body}`, { teams: [t.id] });
  if (typeof Social !== 'undefined') Social.post(G, { by: 'bbc', kind: 'scandal', text: byLang(`URGENTE: ${title}`, `BREAKING: ${title}`), hype: 2 });
  if (Owners.isPlayerTeam(G, t)) {
    G.board.confidence = 55;
    Career.mail(G, { from: byLang('Novos donos', 'New owners'), tag: 'board', important: true, title: byLang(`Bem-vindo à nova ${t.name}`, `Welcome to the new ${t.name}`), body: body + byLang(' Os novos donos mantêm você no cargo e esperam evolução já na próxima temporada.', ' The new owners keep you in charge and expect progress next season.') });
  }
};
/* compra pela gestão: a equipe sobrevive com dono novo e orçamento curto */
Owners.managementBuyout = (G, t, y) => {
  const S = Owners.state(G);
  const p = (t.staffList || []).find(s => s.role === 'principal');
  const who = Owners.isPlayerTeam(G, t) ? G.player.name : (p ? p.name : t.principal || 'a diretoria');
  t.lineage.push({ y: y + 1, from: t.name, to: t.name, owner: byLang(`${who} e a diretoria (compra pela gestão)`, `${who} and management (buyout)`), price: 1, kind: 'gestao' });
  t.owner = { name: byLang(`${who} e a diretoria (compra pela gestão)`, `${who} and management (buyout)`), type: 'independente', wealth: 35, ambition: 55, patience: 70, since: y + 1 };
  t.debt = Math.round((t.debt || 0) * 0.3); t.forSale = null; t.ownerMood = 60; t.crisisYears = 0;
  t.ownerFunding = +clamp((t.ownerFunding || 30) * 0.5, 10, 60).toFixed(1);
  if (!Owners.isPlayerTeam(G, t)) t.cash = Math.max(t.cash || 0, 5);
  else if (G.finances.balance < 0) { G.finances.balance = 5; }
  Owners.breakSister(G, t);
  S.log.unshift({ y, kind: 'gestao', tid: t.id, from: t.name, to: t.name, owner: t.owner.name, price: 1 });
  const txt = byLang(`Sem comprador, ${who} e a diretoria compram a ${t.name} por um valor simbólico e salvam a equipe. Orçamento curto e dívida renegociada.`, `With no buyer, ${who} and management buy ${t.name} for a nominal sum and save the team. Tight budget and renegotiated debt.`);
  Career.news(G, byLang(`${t.name} é salva por compra da gestão`, `${t.name} saved by a management buyout`), 'mercado', txt, { tm: [t.id], main: true });
  Career.record(G, 'equipe', txt, { teams: [t.id] });
  if (Owners.isPlayerTeam(G, t)) Career.mail(G, { from: byLang('Diretoria', 'Board'), tag: 'board', important: true, title: byLang('Compra pela gestão', 'Management buyout'), body: txt });
};
Owners.breakSister = (G, t) => {
  if (!G.sisters) return;
  if (G.sisters[t.id]) { delete G.sisters[t.id]; Career.record(G, 'equipe', byLang(`${t.name} deixa de ser equipe irmã depois da troca de dono.`, `${t.name} is no longer a sister team after the change of ownership.`), { teams: [t.id] }); }
  Object.keys(G.sisters).forEach(c => { if (G.sisters[c] === t.id) delete G.sisters[c]; });
};
/* saída do grid */
Owners.exit = (G, t, reason, y) => {
  const S = Owners.state(G);
  G.db.drivers.forEach(d => {
    if (d.team === t.id) { if (G.season.standD) delete G.season.standD[d.id]; d.team = null; d.seat = null; d.contractYears = 0; d.contract = null; }
    if (d.futureTeam && d.futureTeam.team === t.id) d.futureTeam = null;
  });
  (G.academies || []).forEach(a => { if (a.team === t.id) { a.active = false; a.members = []; } });
  Owners.breakSister(G, t);
  if (G.market) (G.market.talks || []).forEach(k => { if (k.team === t.id && k.status === 'talks') k.status = 'cancelled'; });
  G.db.teams = G.db.teams.filter(x => x !== t);
  if (G.season && G.season.standC) delete G.season.standC[t.id];
  t.gone = { y, reason };
  S.gone.push(t);
  S.log.unshift({ y, kind: 'saida', tid: t.id, name: t.name, reason });
  const txt = reason === 'retirada'
    ? byLang(`${t.owner.name} não encontra comprador e fecha a ${t.name}: a equipe deixa a F1 depois de ${y}. Pilotos e funcionários estão livres no mercado.`, `${t.owner.name} finds no buyer and closes ${t.name}: the team leaves F1 after ${y}. Drivers and staff are free on the market.`)
    : byLang(`Fim da linha: a ${t.name} não encontra comprador, deixa de pagar fornecedores e sai da F1 depois de ${y}. Pilotos e funcionários estão livres no mercado.`, `End of the road: ${t.name} finds no buyer, stops paying suppliers and leaves F1 after ${y}. Drivers and staff are free on the market.`);
  Career.news(G, byLang(`${t.name} fecha as portas e deixa a F1`, `${t.name} closes its doors and leaves F1`), 'mercado', txt, { tm: [t.id], main: true });
  Career.record(G, 'equipe', txt, { teams: [t.id] });
};

/* ---------- motores próprios de quem comprou ou entrou ---------- */
Owners.engineProjects = (G) => {
  const S = Owners.state(G);
  const y = G.season.year;
  S.engines.filter(p => !p.done && p.ready <= y).forEach(p => {
    p.done = true;
    const t = Career.team(G, p.tid); const c = Owners.cand(p.cid);
    if (!t || t.gone || !c) return;
    const es = G.db.engines;
    const id = 'pu-' + c.id;
    if (!byId(es, id)) es.push({ id, name: c.name, power: +(avg(es.map(e => e.power)) - 2.5).toFixed(1), reliability: +(avg(es.map(e => e.reliability)) - 3).toFixed(1), cost: 16, real: false });
    t.engine = id; t.works = true;
    Career.news(G, byLang(`${t.name} estreia motor próprio em ${y}`, `${t.name} debuts its own power unit in ${y}`), 'tecnica', byLang('O projeto de motor da equipe chega à pista. No primeiro ano, a potência e a confiabilidade ficam abaixo dos fornecedores tradicionais.', 'The team’s engine project reaches the track. In year one, power and reliability trail the established suppliers.'), { tm: [t.id] });
  });
};

/* ---------- entrada de equipes novas ---------- */
Owners.health = (G) => clamp(avg(G.db.teams.map(t => t.reputation)) / 70, 0.7, 1.3);
Owners.pending = (G) => Owners.state(G).apps.filter(a => ['fia', 'aprovada'].includes(a.stage));
Owners.applications = (G, y) => {
  const S = Owners.state(G);
  const open = Owners.MAX - G.db.teams.length - Owners.pending(G).length;
  if (open <= 0) return;
  const r = localRng(`apply:${G.seed}:${y}`);
  const inGrid = new Set(G.db.teams.map(x => x.candidate).filter(Boolean));
  const ok = Owners.cands().filter(c => y >= c.from - 1 && !inGrid.has(c.id) && !Owners.blocked(G, c) && Owners.canApply(S, c, y));
  for (const c of ok.sort(() => r() - 0.5)) {
    if (r() < c.interest * 0.07 * Owners.health(G) * (open >= 2 ? 1.6 : 1)) {
      S.apps.push({ cid: c.id, y, stage: 'fia', decide: y + 1 });
      S.cand[c.id] = { status: 'inscrita', y };
      const txt = byLang(`${c.fullName} se inscreve no processo da FIA para entrar na F1 em ${y + 2}. Plano: ${Owners.GOAL[c.plan.goal][0]} em ${c.plan.years} anos.`, `${c.fullName} enters the FIA selection process to join F1 in ${y + 2}. Plan: ${Owners.GOAL[c.plan.goal][1]} within ${c.plan.years} years.`);
      Career.news(G, byLang(`${c.name} quer entrar na F1`, `${c.name} wants to join F1`), 'mercado', txt, { main: true });
      Career.record(G, 'equipe', txt, {});
      S.log.unshift({ y, kind: 'inscricao', cid: c.id, name: c.fullName });
      break;
    }
  }
};
/* grupo dono que já tem equipe no grid (ex.: Lamborghini e Audi, ambas do Grupo Volkswagen) */
Owners.blocked = (G, c) => !!(c.blockedBy && G.db.teams.some(t => t.id === c.blockedBy && /Audi/.test(t.owner ? t.owner.name : '')));
Owners.canApply = (S, c, y) => { const s = S.cand[c.id]; if (!s) return true; if (s.status === 'recusada') return y - s.y >= 5; return false; };
Owners.GOAL = { sobreviver: ['sobreviver e se firmar', 'survive and establish itself'], meio: ['brigar no meio do pelotão', 'fight in the midfield'], podios: ['chegar aos pódios', 'reach the podium'], titulos: ['disputar títulos', 'fight for titles'] };
/* análise da FIA e voto da Comissão (no meio da temporada seguinte à inscrição) */
Owners.decide = (G) => {
  const S = Owners.state(G);
  const y = G.season.year;
  S.apps.filter(a => a.stage === 'fia' && a.decide === y).forEach(a => {
    const c = Owners.cand(a.cid); if (!c) { a.stage = 'recusada'; return; }
    const r = localRng(`fia:${G.seed}:${c.id}:${y}`);
    const fiaOk = r() < 0.45 + c.owner.wealth / 250 + c.staff / 500;
    const votes = Owners.vote(G, c, r);
    a.votes = votes;
    const pass = fiaOk && votes.yes > votes.no;
    a.stage = pass ? 'aprovada' : 'recusada';
    S.cand[c.id] = { status: pass ? 'aprovada' : 'recusada', y };
    S.log.unshift({ y, kind: pass ? 'aprovada' : 'recusada', cid: c.id, name: c.fullName, votes, fiaOk });
    const why = !fiaOk ? byLang('A FIA considerou o plano técnico e financeiro insuficiente.', 'The FIA judged the technical and financial plan insufficient.') : byLang(`A Comissão votou ${votes.yes} a ${votes.no}${pass ? '' : ': as equipes atuais temem dividir a premiação'}.`, `The Commission voted ${votes.yes} to ${votes.no}${pass ? '' : ': current teams fear splitting the prize money'}.`);
    const title = pass ? byLang(`${c.name} é aprovada e estreia na F1 em ${y + 1}`, `${c.name} approved to join F1 in ${y + 1}`) : byLang(`Entrada da ${c.name} na F1 é recusada`, `${c.name}'s F1 entry is rejected`);
    Career.news(G, title, 'regulamento', why + (pass ? byLang(` A equipe paga a taxa de entrada de ${fmtMoney(Owners.FEE)} e começa a montar a estrutura.`, ` The team pays the ${fmtMoney(Owners.FEE)} entry fee and starts building its operation.`) : ''), { main: true });
    Career.record(G, 'equipe', `${title}. ${why}`, {});
    if (!Career.isObs(G) && G.player.teamId) Career.mail(G, { from: 'FIA', tag: 'board', title, body: why + (votes.mine ? byLang(` Sua equipe votou ${votes.mine === 'sim' ? 'a favor' : 'contra'}.`, ` Your team voted ${votes.mine === 'sim' ? 'in favour' : 'against'}.`) : '') });
  });
};
/* voto: as equipes perdem parte da premiação com uma equipe a mais; marcas fortes e dinheiro novo ajudam */
Owners.vote = (G, c, r) => {
  let yes = 0, no = 0, mine = null;
  const fom = (c.kind === 'montadora' ? 0.25 : 0) + (c.country === 'USA' ? 0.1 : 0) + (c.owner.wealth - 60) / 200;
  G.db.teams.forEach(t => {
    let p = 0.32 + fom - (t.reputation >= 85 ? 0.05 : 0) + (t.engine && c.engine === 'cliente' ? 0.08 : 0);
    if (G.council && G.council.entryVote && Owners.isPlayerTeam(G, t)) { const v = G.council.entryVote[c.id]; if (v) { mine = v; v === 'sim' ? yes++ : no++; return; } }
    if (Owners.isPlayerTeam(G, t)) { mine = r() < p ? 'sim' : 'nao'; mine === 'sim' ? yes++ : no++; return; }
    r() < p ? yes++ : no++;
  });
  // FIA e FOM votam juntas a favor quando a marca tem peso comercial
  if (fom > 0.1) yes += 2; else no += 1;
  return { yes, no, mine };
};
/* estreia das aprovadas no começo da temporada */
Owners.enterApproved = (G) => {
  const S = Owners.state(G);
  const y = G.season.year;
  S.apps.filter(a => a.stage === 'aprovada' && a.decide < y).forEach(a => {
    if (G.db.teams.length >= Owners.MAX) return;
    const c = Owners.cand(a.cid); if (!c) return;
    a.stage = 'entrou';
    const t = Owners.addTeam(G, Owners.fromCandidate(G, c, y));
    S.cand[c.id] = { status: 'entrou', y, tid: t.id };
    if (c.engine === 'propria') S.engines.push({ tid: t.id, cid: c.id, ready: y + (c.engineYears || 3) });
    S.log.unshift({ y, kind: 'entrada', tid: t.id, name: t.name });
    const ds = G.db.drivers.filter(d => d.team === t.id && d.seat !== 'R');
    const txt = byLang(`${t.fullName} estreia em ${y} com ${Engine.engineOf(G.db, t).name} como fornecedora de motor${ds.length ? ` e ${ds.map(d => d.name).join(' e ')} como pilotos` : ''}.`, `${t.fullName} debuts in ${y} with ${Engine.engineOf(G.db, t).name} power${ds.length ? ` and ${ds.map(d => d.name).join(' and ')} as drivers` : ''}.`);
    Career.news(G, byLang(`${t.name} estreia na F1`, `${t.name} makes its F1 debut`), 'mercado', txt, { tm: [t.id], main: true });
    Career.record(G, 'equipe', txt, { teams: [t.id] });
  });
};
/* ---------- montagem de uma equipe nova (candidata ou do jogador) ---------- */
Owners.fromCandidate = (G, c, y) => ({
  id: c.id, name: c.name, fullName: c.fullName, short: c.short, country: c.country, color: c.color, color2: c.color2, logo: c.logo,
  budget: c.budget, funding: c.funding, reputation: c.reputation, facilities: c.facilities, staff: c.staff, owner: { ...c.owner, since: y },
  principal: c.leaders ? c.leaders.principal : null, base: c.base, candidate: c.id, fictional: !!c.fictional, planYears: c.plan.years,
});
Owners.pickEngine = (G, pref) => {
  const es = G.db.engines.filter(e => !String(e.id).startsWith('pu-') || G.db.teams.some(t => t.engine === e.id && t.works));
  if (pref && byId(es, pref)) return pref;
  const count = (e) => G.db.teams.filter(t => t.engine === e.id).length;
  return es.slice().sort((a, b) => count(a) - count(b) || b.power - a.power)[0].id;
};
/* cria a equipe a partir de uma ficha; db pode ser o banco ainda sem carreira (criação do jogador) */
Owners.buildTeam = (db, spec, y, rng) => {
  const ts = db.teams;
  const m = (k) => avg(ts.map(t => t.car[k]));
  const r = rng || Math.random;
  const gap = 5.5 + (70 - (spec.facilities || 65)) / 8 + r() * 2.5;
  const st = spec.staff || 72;
  return {
    id: spec.id, name: spec.name, fullName: spec.fullName || spec.name, short: (spec.short || spec.name.slice(0, 3)).toUpperCase().slice(0, 3), country: spec.country || 'GBR',
    color: spec.color || '#888888', color2: spec.color2 || '#111111', engine: spec.engine, budget: spec.budget || 180, reputation: spec.reputation || 48,
    car: { aero: +(m('aero') - gap).toFixed(2), chassis: +(m('chassis') - gap).toFixed(2), reliability: +(m('reliability') - 3).toFixed(1), tyreCare: +(m('tyreCare') - 2).toFixed(1) },
    pitCrew: 78, facilities: spec.facilities || 65, principal: spec.principal || null, staff: { technical: st, aero: st, strategy: st + 1, engineering: st },
    sponsors: [], img: null, founded: y, entered: y, realStats: { starts: 0, wins: 0, titles: 0, podiums: 0, poles: 0 }, champ2026: null,
    logo: spec.logo || null, carImg: null, history: [], ownerFunding: spec.funding || 60, corporate: 0, debt: 0, ownerMood: 65, crisisYears: 0,
    owner: spec.owner || { name: spec.fullName || spec.name, type: 'independente', wealth: 60, ambition: 65, patience: 60, since: y },
    candidate: spec.candidate || null, base: spec.base || null, fictional: spec.fictional ?? true, newTeam: true, lineage: [], playerMade: !!spec.playerMade, planYears: spec.planYears || 5,
  };
};
/* coloca uma equipe nova numa carreira em andamento (estrutura, funcionários, pilotos) */
Owners.addTeam = (G, spec) => {
  const y = G.season.year;
  if (Career.team(G, spec.id)) spec.id = spec.id + '-' + y;
  spec.engine = spec.engine && spec.engine !== 'cliente' && spec.engine !== 'propria' ? spec.engine : Owners.pickEngine(G);
  const t = Owners.buildTeam(G.db, spec, y, localRng(`newteam:${G.seed}:${spec.id}:${y}`));
  G.db.teams.push(t);
  t.cash = Math.round(t.budget * 0.3); t.spent = 0;
  if (!t.principal) t.principal = Staff.genName(t.country);
  AI.init(G);
  Staff.init(G);
  if (typeof Econ !== 'undefined') t.budget = Math.round(Econ.revenue(G, t).total);
  Owners.ensureTeam(G, t);
  if (G.season && G.season.standC) G.season.standC[t.id] = 0;
  [1, 2].forEach(seat => { const d = Career.aiFillSeat(G, t.id, seat); if (d && G.season.standD[d.id] == null) G.season.standD[d.id] = 0; });
  if (G.council && G.council.rel && G.council.rel[t.id] == null) G.council.rel[t.id] = 0;
  return t;
};

/* ---------- titular da F1 com nota mínima (regra do dono do jogo: 80) ---------- */
Owners.minRating = (G) => {
  const min = typeof Talent !== 'undefined' ? Talent.F1_MIN : 80;
  const pt = Career.isObs(G) ? null : G.player.teamId;
  G.db.drivers.filter(d => d.team && (d.seat === 1 || d.seat === 2) && !d.retired && driverOverall(d) < min).forEach(d => {
    const t = Career.team(G, d.team); if (!t) return;
    if (t.id === pt) { Career.mail(G, { from: byLang('Diretor esportivo', 'Sporting director'), tag: 'team', important: true, title: byLang(`${d.name} caiu abaixo do nível da F1`, `${d.name} has dropped below F1 level`), body: byLang(`A nota de ${d.name} está em ${driverOverall(d)}. Os titulares da F1 ficam a partir de ${min}; recomendo procurar outro piloto no Mercado.`, `${d.name}'s rating is ${driverOverall(d)}. F1 race drivers sit at ${min} or higher; I recommend finding another driver in the Market.`) }); return; }
    const seat = d.seat;
    const alt = G.db.drivers.filter(x => !x.retired && !x.dead && !x.retiring && !x.futureTeam && (!x.team || (x.team === t.id && x.seat === 'R')) && !(x.series && G.season.round > 0) && driverOverall(x) >= min && Market.slEligible(G, x))
      .sort((a, b) => driverOverall(b) - driverOverall(a))[0];
    if (!alt) return;
    d.seat = 'R';
    Career.placeDriver(G, alt, t.id, seat, +Math.max(0.6, Market.ask(alt)).toFixed(2), alt.age >= 32 ? 1 : 2);
    if (G.season.standD) { delete G.season.standD[d.id]; if (G.season.standD[alt.id] == null) G.season.standD[alt.id] = 0; }
    Career.news(G, byLang(`${t.name} promove ${alt.name} e tira ${d.name} do carro #${seat}`, `${t.name} brings in ${alt.name} and drops ${d.name} from car #${seat}`), 'mercado', byLang(`${d.name} vira reserva: a equipe quer mais desempenho para ${G.season.year}.`, `${d.name} becomes reserve: the team wants more performance for ${G.season.year}.`), { tm: [t.id] });
  });
};

/* ---------- ganchos ---------- */
(function () {
  const ct = Career.team;
  // equipes que saíram continuam consultáveis (histórico, recordes, notícias antigas)
  Career.team = (G, id) => ct(G, id) || (G && G.owners && id ? (G.owners.gone || []).find(t => t.id === id) : undefined);
  const es = Career.endSeason;
  Career.endSeason = (G) => {
    Owners.ensure(G);
    const sc = Career.standingsC(G);
    const r = es(G);
    Owners.yearly(G, sc);
    Owners.minRating(G);
    return r;
  };
  const fw = Career.finishWeekend;
  Career.finishWeekend = (G, ...a) => {
    const r = fw(G, ...a);
    if (G.season && G.season.round === Math.ceil(G.season.calendar.length / 2)) Owners.decide(G);
    return r;
  };
  const ip = Career.initPeople;
  Career.initPeople = (G) => { const r = ip(G); Owners.ensure(G); return r; };
})();

/* ---------- carreira com equipe criada pelo jogador ou candidata do banco (12ª equipe) ---------- */
Owners.PROJECTS = {
  modesto: { budget: 150, funding: 50, facilities: 60, staff: 70, reputation: 42, wealth: 50, ambition: 55, patience: 70 },
  medio: { budget: 190, funding: 90, facilities: 66, staff: 73, reputation: 46, wealth: 65, ambition: 70, patience: 60 },
  ambicioso: { budget: 240, funding: 140, facilities: 72, staff: 76, reputation: 50, wealth: 85, ambition: 85, patience: 50 },
};
Owners.playerSpec = (o) => {
  if (o.candidate) { const c = Owners.cand(o.candidate); if (c) return { ...Owners.fromCandidate(null, c, 0), engine: o.engine || null, playerMade: false }; }
  const P = Owners.PROJECTS[o.project] || Owners.PROJECTS.medio;
  const name = String(o.name || 'Nova Equipe').trim().slice(0, 28);
  return {
    id: 'equipe-' + (String(name).toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'jogador'), name, fullName: (o.fullName || name + ' F1 Team').slice(0, 48),
    short: o.short || name.replace(/[^A-Za-z]/g, '').slice(0, 3), country: o.country || 'BRA', color: o.color || '#00875A', color2: o.color2 || '#FFC72C', logo: o.logo || 'logos/generic/1.svg',
    budget: P.budget, funding: P.funding, reputation: P.reputation, facilities: P.facilities, staff: P.staff, base: o.base || null, engine: o.engine || null,
    owner: { name: o.ownerName || byLang(`${name} Holdings (dono fictício)`, `${name} Holdings (fictional owner)`), type: 'independente', wealth: P.wealth, ambition: P.ambition, patience: P.patience },
    playerMade: true, fictional: true, project: o.project || 'medio',
  };
};
(function () {
  const cc = Career.create;
  Career.create = (baseDb, opts) => {
    if (!opts || !opts.newTeam || opts.mode === 'observer') return cc(baseDb, opts);
    const db = deepClone(baseDb);
    const y = db.rules.startYear;
    const spec = Owners.playerSpec(opts.newTeam);
    if (byId(db.teams, spec.id)) spec.id += '-12';
    spec.engine = Owners.pickEngine({ db }, spec.engine);
    const t = Owners.buildTeam(db, spec, y, localRng('newteam:' + spec.id + ':' + (opts.seed || '')));
    db.teams.push(t);
    const G = cc(db, { ...opts, teamId: t.id });
    const team = Career.team(G, t.id);
    G.board.target = team.budget >= 220 ? 11 : 12;
    Owners.ensure(G);
    // a montagem é do jogador: pilotos, reserva e cargos-chave antes da primeira corrida
    G.teamSetup = { pending: true, since: y };
    (team.staffList || []).forEach(s => { if (!s.isPlayer) s.interim = true; });
    Career.mail(G, { from: byLang('Diretoria', 'Board'), tag: 'board', important: true, title: byLang(`${team.name}: a 12ª equipe do grid`, `${team.name}: the 12th team on the grid`), body: byLang(`A ${team.fullName} foi aprovada pela FIA e estreia em ${y} com motor ${Engine.engineOf(G.db, team).name}. Agora é com você: escolha os dois pilotos titulares, o reserva e os cargos-chave da fábrica na tela Montagem da equipe. Os cargos estão com interinos até você contratar. Meta da diretoria: ${ordinal(G.board.target)} lugar ou melhor no primeiro ano. O carro começa atrás do grid, como toda equipe nova.`, `${team.fullName} has been approved by the FIA and debuts in ${y} with ${Engine.engineOf(G.db, team).name} power. Now it is up to you: choose the two race drivers, the reserve and the key factory roles on the Team build-up screen. Interim staff fill the roles until you hire. Board target: ${ordinal(G.board.target)} or better in year one. The car starts behind the grid, like every new team.`) });
    Career.news(G, byLang(`${team.name} é a 12ª equipe da F1`, `${team.name} becomes F1's 12th team`), 'mercado', '', { tm: [team.id], main: true });
    if (opts.newTeam.candidate) Owners.state(G).cand[opts.newTeam.candidate] = { status: 'entrou', y, tid: team.id };
    const c = opts.newTeam.candidate && Owners.cand(opts.newTeam.candidate);
    if (c && c.engine === 'propria') Owners.state(G).engines.push({ tid: team.id, cid: c.id, ready: y + (c.engineYears || 3) });
    G.rngState = RNG.state;
    return G;
  };
})();

/* ---------- montagem da equipe nova pelo jogador ---------- */
Owners.SETUP_ROLES = ['technical', 'aero', 'engineeringDir', 'chiefEngineer', 'sporting', 'strategy', 'raceEng1', 'raceEng2', 'performance', 'chiefMechanic', 'operations', 'commercial', 'marketing', 'engine'];
/* candidatos livres por cargo (gerados uma vez por carreira) */
Owners.setupPool = (G) => {
  const S = G.teamSetup; if (!S) return {};
  if (S.pool) return S.pool;
  const r = localRng('setup:' + G.seed);
  S.pool = {};
  Owners.SETUP_ROLES.forEach(role => {
    S.pool[role] = Array.from({ length: 4 }, (_, i) => {
      const rating = Math.round(clamp(70 + r() * 20 - i * 1.5, 62, 92));
      const nat = NATS[Math.floor(r() * NATS.length)];
      return { id: Career.nextId(G, 'st'), role, name: Staff.genName(nat), nat, rating, salary: Staff.salaryFor(role, rating), fee: +(Math.max(0.2, (rating - 65) * 0.06)).toFixed(1), real: false };
    });
  });
  return S.pool;
};
/* pilotos que podem ser contratados para a equipe nova */
Owners.setupDrivers = (G) => G.db.drivers.filter(d => !d.retired && !d.dead && !d.retiring && d.team !== G.player.teamId && !d.futureTeam && d.age >= 18 && (!d.team || d.seat === 'R') && Market.slEligible(G, d))
  .sort((a, b) => driverOverall(b) - driverOverall(a));
Owners.setupState = (G) => {
  const t = Career.team(G); const ds = G.db.drivers.filter(d => d.team === t.id);
  return { r1: ds.find(d => d.seat === 1), r2: ds.find(d => d.seat === 2), res: ds.find(d => d.seat === 'R'), ready: ds.filter(d => d.seat === 1 || d.seat === 2).length === 2 };
};
/* quem corre em outra categoria sai dela ao assinar como titular na F1 */
Owners.leaveSeries = (G, d) => {
  if (typeof Cats !== 'undefined' && G.cats) Cats.list(G, true).forEach(c => { if (c.entries) c.entries = c.entries.filter(e => e.did !== d.id); });
  d.cat = null; d.series = null;
};
/* o diretor esportivo completa o que faltar (vagas de piloto) */
Owners.autoSetup = (G) => {
  const t = Career.team(G); if (!t) return;
  [1, 2].forEach(seat => { if (!G.db.drivers.some(d => d.team === t.id && d.seat === seat)) { const d = Career.aiFillSeat(G, t.id, seat); if (d) { Owners.leaveSeries(G, d); if (G.season.standD[d.id] == null) G.season.standD[d.id] = 0; } } });
  Owners.finishSetup(G);
};
Owners.finishSetup = (G) => {
  if (!G.teamSetup || !G.teamSetup.pending) return;
  G.teamSetup.pending = false; G.teamSetup.done = G.season.year;
  const t = Career.team(G); const st = Owners.setupState(G);
  const staff = (t.staffList || []).filter(s => !s.isPlayer && !s.interim).length;
  Career.news(G, byLang(`${t.name} apresenta a equipe para a estreia: ${[st.r1, st.r2].filter(Boolean).map(d => d.name).join(' e ')}`, `${t.name} unveils its debut line-up: ${[st.r1, st.r2].filter(Boolean).map(d => d.name).join(' and ')}`), 'mercado', byLang(`${staff} contratações para a fábrica e os boxes.${st.res ? ` Reserva: ${st.res.name}.` : ''}`, `${staff} hires for the factory and garage.${st.res ? ` Reserve: ${st.res.name}.` : ''}`), { tm: [t.id], main: true });
  Career.record(G, 'equipe', byLang(`${t.name} concluiu a montagem da equipe para ${G.season.year}.`, `${t.name} completed its team build-up for ${G.season.year}.`), { teams: [t.id] });
};
(function () {
  // rede de segurança: nenhuma corrida começa com carro vazio
  const sw = Career.startWeekend;
  Career.startWeekend = (G, ...a) => { if (G.teamSetup && G.teamSetup.pending && !Owners.setupState(G).ready) Owners.autoSetup(G); else if (G.teamSetup && G.teamSetup.pending) Owners.finishSetup(G); return sw(G, ...a); };
  // titular vindo de outra categoria sai dela
  const pd = Career.placeDriver;
  Career.placeDriver = (G, d, tid, role, ...a) => { const out = pd(G, d, tid, role, ...a); if (G.teamSetup && G.teamSetup.pending && tid === G.player.teamId && role !== 'R' && (d.cat || d.series)) Owners.leaveSeries(G, d); return out; };
})();

/* ---------- equipe parceira (acordo técnico) × equipe irmã (mesmo dono) ----------
   Irmã (sisters.js): controle comum, academia compartilhada, vota junto.
   Parceira: acordo técnico com a fornecedora (motor, câmbio, suspensão traseira e túnel alugado).
   A transferência de tecnologia é limitada às peças listadas: aproxima um pouco o chassi e a
   confiabilidade da parceira dos da equipe principal, nunca a aerodinâmica. Carro parecido demais
   chama a atenção da FIA (caso "Mercedes rosa" de 2020). Troca de dono ou motor próprio encerra o acordo. */
Owners.PARTNERS = { haas: ['ferrari', ['motor', 'câmbio', 'suspensão', 'túnel de vento'], ['engine', 'gearbox', 'suspension', 'wind tunnel']], williams: ['mercedes', ['motor', 'câmbio', 'suspensão traseira'], ['engine', 'gearbox', 'rear suspension']], cadillac: ['ferrari', ['motor', 'câmbio'], ['engine', 'gearbox']], alpine: ['mercedes', ['motor', 'câmbio'], ['engine', 'gearbox']] };
Owners.partners = (G) => {
  if (!G.partners) {
    G.partners = {};
    Object.entries(Owners.PARTNERS).forEach(([c, [p, pt, en]]) => { if (Career.team(G, c) && Career.team(G, p)) G.partners[c] = { parent: p, parts: pt, partsEn: en, since: Owners.start(G) - 3 }; });
  }
  return G.partners;
};
Owners.partnerOf = (G, tid) => { const p = Owners.partners(G)[tid]; return p && Career.team(G, p.parent) && !Career.team(G, p.parent).gone ? p : null; };
Owners.endPartner = (G, tid, why) => {
  const P = Owners.partners(G); const p = P[tid]; if (!p) return;
  delete P[tid];
  const t = Career.team(G, tid), par = Career.team(G, p.parent);
  if (t && par) Career.news(G, byLang(`${t.name} encerra a parceria técnica com a ${par.name}`, `${t.name} ends its technical partnership with ${par.name}`), 'tecnica', why || '', { tm: [t.id, par.id] });
};
/* fim de temporada: transferência limitada de tecnologia e novos acordos para quem estreia */
Owners.partnerYear = (G) => {
  const P = Owners.partners(G);
  Object.entries(P).forEach(([tid, p]) => {
    const t = Career.team(G, tid), par = Career.team(G, p.parent);
    if (!t || !par || t.gone || par.gone || (t.engine !== par.engine && t.engine !== par.id)) return Owners.endPartner(G, tid, byLang('Mudança de fornecedor de motor.', 'Change of engine supplier.'));
    const pull = (k, f, cap) => { const d = par.car[k] - t.car[k]; if (d > 0) t.car[k] = +(t.car[k] + Math.min(cap, d * f)).toFixed(2); };
    pull('chassis', 0.06, 0.4); pull('reliability', 0.1, 0.8);
  });
  // equipe nova com motor de cliente fecha acordo técnico com a fornecedora (se ela tiver equipe)
  G.db.teams.forEach(t => {
    if (P[t.id] || t.works || !t.newTeam || t.planDone) return;
    const par = G.db.teams.find(x => x.id !== t.id && x.works && x.engine === t.engine) || G.db.teams.find(x => x.id === t.engine);
    if (!par) return;
    t.planDone = true;
    P[t.id] = { parent: par.id, parts: ['motor', 'câmbio'], partsEn: ['engine', 'gearbox'], since: G.season.year };
    Career.news(G, byLang(`${t.name} fecha parceria técnica com a ${par.name}`, `${t.name} signs a technical partnership with ${par.name}`), 'tecnica', byLang('O acordo inclui motor e câmbio; a aerodinâmica continua sendo da própria equipe.', 'The deal covers engine and gearbox; aerodynamics remain the team’s own work.'), { tm: [t.id, par.id] });
  });
};
(function () {
  const es = Career.endSeason;
  Career.endSeason = (G) => { const r = es(G); try { Owners.partnerYear(G); } catch (e) { if (typeof Store !== 'undefined' && Store.log) Store.log('error', 'parceria: ' + e.message); else throw e; } return r; };
  // troca de dono encerra a parceria
  const bs = Owners.breakSister;
  Owners.breakSister = (G, t) => { bs(G, t); if (Owners.partners(G)[t.id]) Owners.endPartner(G, t.id, byLang('Os novos donos querem um projeto técnico próprio.', 'The new owners want their own technical project.')); Object.keys(Owners.partners(G)).forEach(c => { if (Owners.partners(G)[c].parent === t.id && !Career.team(G, t.id)) delete Owners.partners(G)[c]; }); };
  // motor próprio encerra o acordo de motor
  const ep = Owners.engineProjects;
  Owners.engineProjects = (G) => { ep(G); G.db.teams.forEach(t => { if (t.works && Owners.partners(G)[t.id] && String(t.engine).startsWith('pu-')) Owners.endPartner(G, t.id, byLang('A equipe passa a usar motor próprio.', 'The team switches to its own power unit.')); }); };
  // no Conselho, a parceira acompanha a equipe principal nos temas técnicos
  if (typeof Council !== 'undefined') {
    const stc = Council.stance;
    Council.stance = (G, pr, tid) => {
      let s = stc(G, pr, tid);
      const p = Owners.partnerOf(G, tid);
      if (p && pr.cat === 'tec' && pr.imp[p.parent] != null) s = s * 0.8 + pr.imp[p.parent] * 0.2;
      return s;
    };
    // bastidores: blocos de motor fecham posição antes da votação
    const om = Council.openMeeting;
    Council.openMeeting = (G) => {
      const r0 = om(G);
      const C = Council.ensure(G); const m = C.open; if (!m) return r0;
      const r = localRng(`bast:${G.seed}:${G.season.year}:${G.season.round}`);
      m.props.forEach(pr => {
        const blocs = {};
        G.db.teams.forEach(t => { (blocs[t.engine] = blocs[t.engine] || []).push(t); });
        Object.entries(blocs).forEach(([eng, ts]) => {
          if (ts.length < 3 || r() > 0.35) return;
          const iv = ts.map(t => Council.intent(Council.stance(G, pr, t.id)));
          const same = iv.every(v => v === iv[0]) && iv[0] !== 'ind';
          if (!same) return;
          const e = byId(G.db.engines, eng);
          Career.news(G, byLang(`Bastidores: o bloco ${e ? e.name : eng} (${ts.map(t => t.name).join(', ')}) fecha posição ${iv[0] === 'sim' ? 'a favor de' : 'contra'} "${pr.title}"`, `Behind the scenes: the ${e ? e.name : eng} bloc (${ts.map(t => t.name).join(', ')}) closes ranks ${iv[0] === 'sim' ? 'in favour of' : 'against'} "${pr.title}"`), 'regulamento', byLang('Equipes clientes costumam acompanhar a fornecedora de motor nos temas técnicos.', 'Customer teams usually follow their engine supplier on technical matters.'));
        });
        const offers = Object.values(pr.offers || {}).filter(o => o.accepted).length;
        if (offers >= 2) Career.news(G, byLang(`Bastidores: ${Council.proposerName(G, pr.proposer)} oferece compensações para aprovar "${pr.title}"`, `Behind the scenes: ${Council.proposerName(G, pr.proposer)} offers concessions to pass "${pr.title}"`), 'regulamento', byLang(`${offers} equipes teriam aceitado dinheiro ou horas de túnel em troca do voto.`, `${offers} teams reportedly accepted money or wind tunnel hours in exchange for their vote.`));
      });
      return r0;
    };
  }
})();
