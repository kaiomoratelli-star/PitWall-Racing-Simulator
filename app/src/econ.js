/* ============================================================
   PIT WALL — economia das equipes (contenção da V0.8.2)
   Antes: receitas proporcionais ao "orçamento" e quase nenhum custo fixo:
   qualquer equipe recuperava o caixa em 3 GPs e todas as equipes da IA
   gastavam exatamente o teto.
   Agora, para o jogador e para a IA, com as mesmas contas:
   - RECEITA (por GP): distribuição comercial pela posição no Mundial anterior
     (+ bônus histórico das equipes tradicionais), patrocínio limitado pelo
     mercado da equipe (reputação e exposição) e aporte anual dos donos.
   - CUSTOS: fábrica e pessoal (dentro do teto, cresce com o tamanho da
     estrutura), operação e frete (dentro do teto), salários de pilotos e
     cargos-chave, motor de cliente, marketing e hospitalidade (fora do teto).
   - TETO: tudo que é elegível entra na conta, inclusive o compromisso da fábrica
     até o fim do ano; projeto que estoura é bloqueado. No fim da temporada há
     auditoria para todos: estouro pequeno = multa; estouro material = multa e
     menos tempo de túnel/CFD no ano seguinte.
   - ORÇAMENTO ESPORTIVO x PATRIMÔNIO: o caixa da equipe tem um limite de
     reserva; o excedente vai para o patrimônio dos donos (não volta sozinho
     para o carro). Prejuízo é coberto pelo patrimônio enquanto houver.
   Valores dos donos e bônus históricos são estimativas do jogo (não são números
   oficiais publicados pelas equipes).
   ============================================================ */
'use strict';

const Econ = {};
/* aporte anual estimado dos donos/montadora (US$ mi) */
Econ.OWNER = { mercedes: 55, ferrari: 85, 'red-bull': 100, mclaren: 30, 'racing-bulls': 80, alpine: 85, haas: 35, audi: 160, williams: 45, 'aston-martin': 95, cadillac: 150 };
/* bônus histórico de longo prazo (acordos comerciais da categoria) */
Econ.HERITAGE = { ferrari: 45, mercedes: 15, 'red-bull': 15, mclaren: 10, williams: 10 };
/* gastos que ficam fora do teto */
Econ.CAP_OUT = new Set(['salário', 'motor', 'mercado', 'marketing', 'multa', 'academia', 'patrimônio', 'receita', 'infraestrutura']);

Econ.races = (G) => Math.max(1, (G.season && G.season.calendar.length) || 24);
Econ.cap = (G) => G.db.rules.budgetCap || 215;
Econ.size = (t) => clamp(((t.facilities ?? 75) - 68) / 27, 0, 1);
/* posição no último Mundial de Construtores (no início da carreira, a de 2026) */
Econ.lastPos = (G, t) => {
  const h = (G.history || [])[G.history.length - 1];
  if (h && h.standC) { const i = h.standC.findIndex(x => x.tid === t.id); if (i >= 0) return i + 1; }
  return t.champ2026 || Math.ceil(G.db.teams.length * 0.7);
};
Econ.commercial = (G, t) => {
  const tab = G.db.rules.prizePerPosition || [140, 130, 120, 110, 100, 90, 80, 70, 60, 50, 40];
  const pos = Econ.lastPos(G, t);
  // parcela fixa por participação (igual para todos) + parcela por posição + bônus histórico
  return 25 + (tab[pos - 1] ?? tab[tab.length - 1]) + (Econ.HERITAGE[t.id] || 0);
};
/* mercado de patrocínio da equipe por ano: reputação (exposição, resultados, marca) e área comercial */
Econ.sponsorPool = (t) => Math.max(40, 30 + ((t.reputation ?? 60) - 40) * 3.2) * (typeof Staff !== 'undefined' && t.staffList ? Staff.commercialMul(t) : 1);
Econ.owner = (t) => t.ownerFunding ?? Econ.OWNER[t.id] ?? 30;
Econ.revenue = (G, t) => {
  const c = Econ.commercial(G, t), s = Econ.sponsorPool(t), o = Econ.owner(t);
  return { commercial: c, sponsors: s, owner: o, total: c + s + o };
};
/* fábrica e pessoal (elegível ao teto): 30% a 42% do teto conforme o porte da estrutura */
Econ.factory = (G, t) => Econ.cap(G) * (0.30 + 0.12 * Econ.size(t)) * (t.costCut || 1);
Econ.marketing = (G, t) => 6 + 0.04 * (t.budget || 200);
Econ.reserve = (G, t) => Math.max(40, (t.budget || 200) * 0.3);

Econ.init = (G) => {
  G.db.teams.forEach(t => {
    if (t.ownerFunding == null) t.ownerFunding = Econ.OWNER[t.id] ?? 30;
    if (t.corporate == null) t.corporate = 0;
    t.budget = Math.round(Econ.revenue(G, t).total);
  });
  if (G.finances && G.finances.corporate == null) G.finances.corporate = 0;
};
/* fim de temporada: orçamento do ano seguinte pela nova posição e reputação */
Econ.recompute = (G) => {
  G.db.teams.forEach(t => {
    // donos: variação pequena por ano; quem está em crise reduz, quem vence mantém
    const r = localRng(`own:${G.seed}:${t.id}:${G.season.year}`)();
    const pos = Econ.lastPos(G, t);
    const drift = (r - 0.5) * 0.12 + (pos <= 3 ? 0.02 : pos >= G.db.teams.length - 1 ? -0.04 : 0);
    t.ownerFunding = +clamp(Econ.owner(t) * (1 + drift), 10, 260).toFixed(1);
    t.budget = Math.round(Econ.revenue(G, t).total);
  });
};

/* mercado de patrocínio entre as equipes da IA: quem vai mal perde marcas, quem vai bem atrai (exclusividade de marca e de segmento) */
Econ.aiSponsors = (G) => {
  if (typeof Career.brand !== 'function') return;
  const n = G.db.teams.length;
  const taken = () => new Set(G.db.teams.flatMap(t => t.sponsors || []).concat((G.sponsors || []).map(s => s.name)));
  G.db.teams.forEach(t => {
    if (t.id === G.player.teamId && !Career.isObs(G)) return;
    const pos = Econ.lastPos(G, t);
    const r = localRng(`aisp:${G.seed}:${t.id}:${G.season.year}`);
    t.sponsors = t.sponsors || [];
    if (pos > n - 3 && t.sponsors.length > 2 && r() < 0.3) {
      const gone = t.sponsors.pop();
      Career.news(G, byLang(`${gone} encerra o patrocínio da ${t.name}`, `${gone} ends its sponsorship of ${t.name}`), 'mercado');
    } else if (pos <= 3 && t.sponsors.length < 7 && r() < 0.35) {
      const segs = new Set(t.sponsors.map(x => Career.brand(x)[0])); const tk = taken();
      const pool = Object.keys(typeof SPONSOR_BRANDS !== 'undefined' ? SPONSOR_BRANDS : {}).filter(x => !tk.has(x) && !segs.has(Career.brand(x)[0]) && (Career.brand(x)[1] > 1 || (t.reputation || 0) >= 75));
      if (pool.length) { const b = pool[Math.floor(r() * pool.length)]; t.sponsors.push(b); Career.news(G, byLang(`${b} fecha patrocínio com a ${t.name}`, `${b} signs a sponsorship deal with ${t.name}`), 'mercado'); }
    }
  });
};
/* compromisso da fábrica e da operação até o fim do ano (já conta para o teto) */
Econ.committed = (G, t) => {
  const left = Math.max(0, Econ.races(G) - (G.season ? G.season.round : 0));
  // + 3% do teto de margem para reparos e imprevistos (as equipes reais trabalham com folga)
  return (Econ.factory(G, t) / Econ.races(G) + 2.3) * left + Econ.cap(G) * 0.03 * (left / Econ.races(G));
};
Econ.capRoom = (G, t, spent) => Econ.cap(G) - spent - Econ.committed(G, t);

/* lançamentos do jogador por GP (receitas e custos da estrutura) */
Econ.playerRace = (G, team) => {
  const n = Econ.races(G);
  const rev = Econ.revenue(G, team);
  Career.ledger(G, byLang('Distribuição comercial da categoria', 'Commercial rights distribution'), rev.commercial / n, 'receita');
  const ownerMul = G.board && G.board.confidence < 35 ? 0.7 : 1;
  Career.ledger(G, byLang('Aporte dos proprietários', 'Owners’ contribution'), rev.owner * ownerMul / n, 'receita');
  Career.ledger(G, byLang('Fábrica e pessoal', 'Factory and personnel'), -Econ.factory(G, team) / n, 'fábrica');
  Career.ledger(G, byLang('Marketing e hospitalidade', 'Marketing and hospitality'), -Econ.marketing(G, team) / n, 'marketing');
};

/* auditoria do teto: devolve a infração (ou null) */
Econ.audit = (G, t, spent, isPlayer) => {
  const cap = Econ.cap(G);
  const over = spent - cap;
  if (!(over > 0.05)) return null;
  const pct = over / cap;
  const material = pct >= 0.05;
  const fine = +(over * (material ? 3 : 1.5)).toFixed(1);
  const y = G.season.year;
  if (isPlayer) Career.ledger(G, byLang(`Multa por estouro do teto de ${y}`, `${y} cost cap breach fine`), -fine, 'multa');
  else t.cash = +(t.cash - fine).toFixed(2);
  if (material) t.capPenalty = { y: y + 1, atr: 0.9 };
  const txt = byLang(`${t.name} estourou o teto orçamentário de ${y} em ${fmtMoney(over)} (${(pct * 100).toFixed(1)}%): ${material ? 'infração material' : 'infração menor'}, multa de ${fmtMoney(fine)}${material ? ' e 10% a menos de túnel de vento e CFD em ' + (y + 1) : ''}.`,
    `${t.name} breached the ${y} cost cap by ${fmtMoney(over)} (${(pct * 100).toFixed(1)}%): ${material ? 'material breach' : 'minor breach'}, fined ${fmtMoney(fine)}${material ? ' and 10% less wind tunnel and CFD time in ' + (y + 1) : ''}.`);
  Career.news(G, txt, 'paddock');
  Career.record(G, 'financas', txt, { teams: [t.id] });
  (G.capBreaches = G.capBreaches || []).push({ y, tid: t.id, over: +over.toFixed(2), pct: +(pct * 100).toFixed(2), material, fine });
  if (isPlayer) Career.mail(G, { from: 'FIA', tag: 'money', important: true, title: byLang(`Auditoria do teto de ${y}`, `${y} cost cap audit`), body: txt });
  return { over, material, fine };
};

/* fim de temporada do jogador: excedente vai ao patrimônio; prejuízo é coberto por ele */
Econ.playerSeasonEnd = (G, team) => {
  const F = G.finances;
  F.corporate = F.corporate || 0;
  const res = Econ.reserve(G, team);
  if (F.balance > res) {
    const ex = +(F.balance - res).toFixed(2);
    F.balance = +res.toFixed(2);
    F.corporate = +(F.corporate + ex).toFixed(2);
    F.ledger.unshift({ year: G.season.year, round: G.season.round, desc: byLang('Excedente transferido ao patrimônio dos donos', 'Surplus transferred to owners’ equity'), amount: -ex, cat: 'patrimônio' });
    Career.mail(G, { from: byLang('Diretoria', 'Board'), tag: 'money', title: byLang('Excedente do ano', 'Year surplus'), body: byLang(`A equipe fechou o ano acima da reserva permitida para a operação esportiva (${fmtMoney(res)}). ${fmtMoney(ex)} foram transferidos ao patrimônio dos donos e não entram no orçamento do carro.`, `The team ended the year above the reserve allowed for sporting operations (${fmtMoney(res)}). ${fmtMoney(ex)} went to the owners’ equity and does not return to the car budget.`) });
  } else if (F.balance < -10 && F.corporate > 0) {
    const cover = +Math.min(F.corporate, -F.balance).toFixed(2);
    F.corporate = +(F.corporate - cover).toFixed(2);
    F.balance = +(F.balance + cover).toFixed(2);
    F.ledger.unshift({ year: G.season.year, round: G.season.round, desc: byLang('Prejuízo coberto pelo patrimônio dos donos', 'Loss covered by owners’ equity'), amount: cover, cat: 'patrimônio' });
    G.board.confidence = clamp(G.board.confidence - 6, 0, 100);
  }
  Econ.crisis(G, team, F.balance);
};
Econ.aiSeasonEnd = (G, t) => {
  t.corporate = t.corporate || 0;
  if (t.cash < -10 && t.corporate > 0) { const c = Math.min(t.corporate, -t.cash); t.corporate -= c; t.cash += c; }
  Econ.crisis(G, t, t.cash);
};
/* crise: a equipe corta pessoal (fábrica mais barata, mas o desenvolvimento perde gente) e os donos
   decidem se colocam mais dinheiro. Sem saída de equipes nesta versão (fica para a V0.8.4). */
Econ.crisis = (G, t, cash) => {
  const y = G.season.year;
  const deep = cash < -(t.budget || 200) * 0.25;
  if (cash < 0) {
    const before = t.costCut || 1;
    t.costCut = +clamp(before - 0.07, 0.78, 1).toFixed(2);
    if (t.costCut < before && t.staff) Object.keys(t.staff).forEach(k => { if (typeof t.staff[k] === 'number') t.staff[k] = +clamp(t.staff[k] - 0.8, 40, 99).toFixed(1); });
    if (t.costCut < before) Career.record(G, 'financas', byLang(`${t.name} corta custos na fábrica para ${y + 1} (estrutura a ${Math.round(t.costCut * 100)}%): caixa de ${fmtMoney(cash)}.`, `${t.name} cuts factory costs for ${y + 1} (structure at ${Math.round(t.costCut * 100)}%): cash of ${fmtMoney(cash)}.`), { teams: [t.id] });
  } else if (cash > Econ.reserve(G, t) * 0.6 && (t.costCut || 1) < 1) t.costCut = +clamp((t.costCut || 1) + 0.05, 0.78, 1).toFixed(2);
  if (deep) {
    const r = localRng(`rescue:${G.seed}:${t.id}:${y}`)();
    const works = !!t.works || (Econ.OWNER[t.id] || 0) >= 80;
    if (r < (works ? 0.85 : 0.55)) {
      const add = Math.round(Math.min(-cash, (t.budget || 200) * 0.4));
      t.ownerFunding = +clamp(Econ.owner(t) + add * 0.35, 10, 260).toFixed(1);
      if (t.id === G.player.teamId && !Career.isObs(G)) Career.ledger(G, byLang('Aporte extraordinário dos donos', 'Owners’ emergency injection'), add, 'patrimônio');
      else t.cash = +(t.cash + add).toFixed(2);
      const txt = byLang(`Os donos da ${t.name} colocam ${fmtMoney(add)} para salvar o caixa e aumentam o aporte anual.`, `${t.name}'s owners inject ${fmtMoney(add)} to rescue the finances and raise their yearly contribution.`);
      Career.news(G, txt, 'paddock'); Career.record(G, 'financas', txt, { teams: [t.id] });
    } else {
      const txt = byLang(`${t.name} fecha ${y} com dívida de ${fmtMoney(-cash)}: os donos recusam novo aporte e a equipe entra em modo de sobrevivência.`, `${t.name} ends ${y} with debt of ${fmtMoney(-cash)}: the owners refuse new money and the team goes into survival mode.`);
      Career.news(G, txt, 'paddock'); Career.record(G, 'financas', txt, { teams: [t.id] });
    }
  }
};

(function () {
  // auditoria antes do fechamento (o fechamento zera o gasto do ano) e orçamento novo depois
  const es = Career.endSeason;
  Career.endSeason = (G) => {
    const pt = G.player.teamId;
    G.db.teams.forEach(t => {
      if (t.id === pt && !Career.isObs(G)) Econ.audit(G, t, G.finances.spent, true);
      else Econ.audit(G, t, t.spent || 0, false);
    });
    const team = !Career.isObs(G) && pt ? Career.team(G, pt) : null;
    const r = es(G);
    Econ.recompute(G);
    Econ.aiSponsors(G);
    G.db.teams.forEach(t => { if (t.id !== pt || Career.isObs(G)) Econ.aiSeasonEnd(G, t); });
    if (team) Econ.playerSeasonEnd(G, team);
    return r;
  };
  // punição do teto: menos túnel de vento e CFD no ano seguinte
  if (typeof Regs !== 'undefined' && Regs.atrFactor) {
    const af = Regs.atrFactor;
    Regs.atrFactor = (G, teamId) => { const t = Career.team(G, teamId); const p = t && t.capPenalty; return af(G, teamId) * (p && G.season && p.y === G.season.year ? p.atr : 1); };
  }
})();
