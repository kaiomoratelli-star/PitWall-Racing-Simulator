/* ============================================================
   PIT WALL — fabricantes de motor e de pneus (V0.8.4)
   Motores (no estilo Motorsport Manager):
   - Fabricante não precisa ter equipe: fornece motores a clientes com contrato
     (valor anual, prazo), até 4 equipes por fabricante.
   - Atributos: potência, confiabilidade e eficiência (consumo e energia).
     A potência que o jogo usa já inclui a eficiência.
   - Desenvolvimento anual com orçamento, retorno decrescente perto do limite do
     regulamento e ajuda do departamento de motores da equipe de fábrica. No
     regulamento novo, os motores são reembaralhados (acerto do conceito).
   - Fabricantes entram (anunciam com antecedência e estreiam atrás), saem
     (avisam com dois anos; a equipe de fábrica pode herdar o projeto) e podem
     comprar equipes (as montadoras do banco de candidatas).
   - No vencimento do contrato, as equipes do jogo escolhem o fornecedor pelo
     desempenho, preço e relação; o jogador negocia na aba Fabricantes e pode
     pedir parceria de fábrica a quem não tem equipe própria.
   Pneus:
   - F1 com fornecedor único escolhido em licitação da FIA a cada 4 anos;
     cada fabricante tem características (desgaste, aquecimento) que mexem
     com a corrida. As outras categorias têm os fornecedores reais.
   ============================================================ */
'use strict';

const Mfr = {};
Mfr.CAP = 4;
Mfr.REF = { power: 92, reliability: 89, eff: 85 };   // "limite" do regulamento vigente (retorno decrescente)
/* fabricantes que ainda não estão na F1 (podem entrar só como fornecedores) */
// (0.9, regra 19) lista do mundo real: fica no Pacote de dados (WORLD_LISTS.mfrCands, app/data/world-lists.js), não no código
Object.defineProperty(Mfr, 'CANDS', { get: () => (typeof WORLD_LISTS !== 'undefined' && WORLD_LISTS.mfrCands) || [], configurable: true });
/* fabricantes que podem surgir como projetos novos ao longo das décadas (nome, país) */
// (0.9, regra 19) lista do mundo real: fica no Pacote de dados (WORLD_LISTS.mfrGenPool, app/data/world-lists.js), não no código
Object.defineProperty(Mfr, 'GEN_POOL', { get: () => (typeof WORLD_LISTS !== 'undefined' && WORLD_LISTS.mfrGenPool) || [], configurable: true });
/* contratos reais de 2026 (estimados quando não divulgados) */
Mfr.REAL_CONTRACTS = { mclaren: 2030, williams: 2030, alpine: 2030, haas: 2028, cadillac: 2028, 'racing-bulls': 2030 };
Mfr.st = (G) => (G.mfr = G.mfr || { list: [], contracts: {}, log: [], tyres: null, seq: 0 });
Mfr.get = (G, id) => Mfr.st(G).list.find(m => m.id === id) || null;
Mfr.active = (G) => Mfr.st(G).list.filter(m => m.active);
Mfr.customers = (G, id) => G.db.teams.filter(t => t.engine === id);
Mfr.worksOf = (G, id) => G.db.teams.find(t => t.engine === id && t.works) || null;

/* ---------- criação a partir dos motores do banco ---------- */
Mfr.ensure = (G) => {
  const S = Mfr.st(G);
  if (!S.list.length) {
    G.db.engines.forEach(e => {
      const w = G.db.teams.find(t => t.engine === e.id && t.works);
      const dev = e.id === 'mercedes' || e.id === 'ferrari' ? 150 : e.id === 'honda' || e.id === 'audi' ? 140 : 120;
      S.list.push({ id: e.id, name: e.name, country: w ? w.country : null, active: true, raw: e.power, reliability: e.reliability, eff: Mfr.REF.eff + (e.power - 90) * 0.4, dev, fee: e.cost || 16, since: null, rep: 60 + (e.power - 86) * 4, real: !!e.real });
    });
    Mfr.CANDS.forEach(c => S.list.push({ ...c, active: false, raw: null, reliability: null, eff: null, fee: 16, rep: 50, cand: true }));
    G.db.teams.forEach(t => { S.contracts[t.id] = { mid: t.engine, until: t.works ? 2099 : (Mfr.REAL_CONTRACTS[t.id] || (G.db.rules.startYear || 2027) + 2), fee: (Mfr.get(G, t.engine) || {}).fee || 16, works: !!t.works }; });
    Mfr.sync(G);
  }
  G.db.teams.forEach(t => { if (!S.contracts[t.id]) S.contracts[t.id] = { mid: t.engine, until: G.season ? G.season.year + 3 : 2030, fee: (Mfr.get(G, t.engine) || {}).fee || 16, works: !!t.works }; });
  return S;
};
/* os motores que o resto do jogo usa (G.db.engines) seguem os fabricantes ativos */
Mfr.sync = (G) => {
  const S = Mfr.st(G);
  S.list.filter(m => m.active).forEach(m => {
    let e = byId(G.db.engines, m.id);
    if (!e) { e = { id: m.id, name: m.name, real: false }; G.db.engines.push(e); }
    e.name = m.name;
    e.power = +clamp(m.raw + (m.eff - Mfr.REF.eff) * 0.08, 70, 100).toFixed(1);
    e.reliability = +clamp(m.reliability, 60, 99).toFixed(1);
    e.cost = m.fee; e.eff = +m.eff.toFixed(1);
  });
};
Mfr.fee = (G, t) => { const c = Mfr.st(G).contracts[t.id]; return t.works ? 0 : (c && c.fee) || (Engine.engineOf(G.db, t).cost || 16); };

/* ---------- desenvolvimento anual ---------- */
Mfr.develop = (G, reg) => {
  if (G.db.rules.regs && G.db.rules.regs.engineFreeze) return;
  const y = G.season.year;
  Mfr.active(G).forEach(m => {
    const r = localRng(`mdev:${G.seed}:${m.id}:${y}`);
    const w = Mfr.worksOf(G, m.id);
    const dept = w && typeof Fac !== 'undefined' && w.fac ? (Fac.eff(w, 'motor') - 2.8) * 0.15 : 0;
    const push = (k, ref, k2) => {
      const gain = (m.dev / 130) * 1.1 + dept + (r() - 0.5) * 0.8;   // ruído menor: motor muda devagar entre regulamentos
      // retorno decrescente: perto do limite do regulamento o ganho some e há leve volta à média
      m[k] = +clamp(m[k] + gain * clamp((ref + 6 - m[k]) / 10, 0, 1.2) - (m[k] - ref) * k2, 70, 99).toFixed(2);
    };
    if (reg) {
      // motor novo: o acerto do conceito embaralha
      ['raw', 'reliability', 'eff'].forEach(k => { const ref = k === 'raw' ? Mfr.REF.power : k === 'reliability' ? Mfr.REF.reliability : Mfr.REF.eff; m[k] = +clamp(ref + (m[k] - ref) * 0.55 + (r() - 0.5) * 4 - (k === 'reliability' ? 3 : 0), 72, 97).toFixed(2); });
    } else { push('raw', Mfr.REF.power, 0.06); push('reliability', Mfr.REF.reliability, 0.05); push('eff', Mfr.REF.eff, 0.05); }
    m.rep = Math.round(clamp(m.rep * 0.8 + (50 + (m.raw - 88) * 6) * 0.2, 20, 99));
  });
  Mfr.sync(G);
};

/* ---------- contratos: vencimentos e escolha das equipes do jogo ---------- */
Mfr.score = (G, t, m, cur) => {
  const e = byId(G.db.engines, m.id); if (!e) return -99;
  return e.power * 1 + e.reliability * 0.45 + (m.eff || 85) * 0.15 - (m.fee || 16) * 0.25 + (cur === m.id ? 2.5 : 0) + ((G.sisters || {})[t.id] && Career.team(G, G.sisters[t.id]) && Career.team(G, G.sisters[t.id]).engine === m.id ? 6 : 0) + (m.leaving ? -30 : 0);
};
Mfr.capacityLeft = (G, m) => Mfr.CAP - Mfr.customers(G, m.id).length;
Mfr.quote = (G, t, m) => +(m.fee * (1.08 - (t.reputation - 60) / 250)).toFixed(1);   // equipe grande paga um pouco menos (vitrine)
Mfr.sign = (G, t, m, years, fee, why) => {
  const S = Mfr.st(G); const old = t.engine;
  S.contracts[t.id] = { mid: m.id, until: G.season.year + years, fee, works: false, from: G.season.year + 1 };
  if (old !== m.id) {
    t.nextEngine = m.id;
    Career.news(G, byLang(`${t.name} terá motor ${m.name} a partir de ${G.season.year + 1}`, `${t.name} to run ${m.name} power from ${G.season.year + 1}`), 'tecnica', byLang(`Contrato até ${G.season.year + years}, cerca de ${fmtMoney(fee)} por ano.${why ? ' ' + why : ''}`, `Deal until ${G.season.year + years}, around ${fmtMoney(fee)} a year.${why ? ' ' + why : ''}`), { tm: [t.id] });
  } else Career.record(G, 'contrato', byLang(`${t.name} renovou o fornecimento de motor com a ${m.name} até ${G.season.year + years}.`, `${t.name} renewed its ${m.name} engine supply until ${G.season.year + years}.`), { teams: [t.id] });
  S.log.unshift({ y: G.season.year, kind: 'contrato', tid: t.id, mid: m.id, fee, until: G.season.year + years });
};
/* meio da temporada: quem tem contrato vencendo decide o fornecedor do ano seguinte */
Mfr.market = (G) => {
  const S = Mfr.st(G), y = G.season.year;
  const pt = Career.isObs(G) ? null : G.player.teamId;
  G.db.teams.forEach(t => {
    const c = S.contracts[t.id];
    if (!c || t.works || c.until > y || c.decided === y) return;
    if (t.id === pt) {
      if (c.warned !== y) { c.warned = y; Career.mail(G, { from: byLang('Diretor técnico', 'Technical director'), tag: 'team', important: true, title: byLang('Contrato de motor vence no fim do ano', 'Engine contract expires at the end of the year'), body: byLang(`O fornecimento da ${(Mfr.get(G, c.mid) || {}).name || 'fornecedora atual'} acaba em ${c.until}. Escolha o motor de ${y + 1} na aba Fabricantes; sem decisão até a última etapa, o contrato atual é renovado por 2 anos.`, `The ${(Mfr.get(G, c.mid) || {}).name || 'current'} supply ends in ${c.until}. Pick the ${y + 1} engine on the Manufacturers tab; with no decision by the last round, the current deal is renewed for 2 years.`) }); }
      return;
    }
    c.decided = y;
    const opts = Mfr.active(G).filter(m => m.id === t.engine || Mfr.capacityLeft(G, m) > 0).filter(m => !m.leaving || m.leaving > y + 2)
      .map(m => ({ m, s: Mfr.score(G, t, m, t.engine) })).sort((a, b) => b.s - a.s);
    const best = opts[0]; if (!best) return;
    Mfr.sign(G, t, best.m, 2 + Math.floor(localRng(`mc:${G.seed}:${t.id}:${y}`)() * 3), Mfr.quote(G, t, best.m), best.m.id !== t.engine ? byLang('A equipe busca um motor mais competitivo.', 'The team is after a more competitive engine.') : '');
  });
};
/* virada do ano: motores trocados entram em vigor; contrato do jogador sem decisão é renovado */
Mfr.applyYear = (G) => {
  const S = Mfr.st(G), y = G.season.year;   // já é o ano novo
  G.db.teams.forEach(t => {
    const c = S.contracts[t.id];
    if (t.nextEngine) { t.engine = t.nextEngine; delete t.nextEngine; const w0 = Mfr.worksOf(G, t.engine); t.partnerOf = w0 && w0.id !== t.id ? [w0.id] : []; if (c && c.pendingWorks) { t.works = true; delete c.pendingWorks; if (typeof Fac !== 'undefined') Fac.openEngineDept(G, t); Career.news(G, byLang(`${t.name} estreia como equipe de fábrica da ${(Mfr.get(G, t.engine) || {}).name}`, `${t.name} debuts as ${(Mfr.get(G, t.engine) || {}).name}'s works team`), 'tecnica', '', { tm: [t.id] }); } }
    else if (c && !t.works && c.until < y) { c.until = y + 1; Career.record(G, 'contrato', byLang(`${t.name}: contrato de motor renovado automaticamente até ${y + 1}.`, `${t.name}: engine contract automatically renewed until ${y + 1}.`), { teams: [t.id] }); }
    // fornecedor que saiu: a equipe vai para quem tiver vaga
    if (!Mfr.get(G, t.engine) || !Mfr.get(G, t.engine).active) {
      const m = Mfr.active(G).filter(x => Mfr.capacityLeft(G, x) > 0).sort((a, b) => Mfr.score(G, t, b) - Mfr.score(G, t, a))[0] || Mfr.active(G)[0];
      if (m) { t.engine = m.id; t.works = false; S.contracts[t.id] = { mid: m.id, until: y + 2, fee: Mfr.quote(G, t, m), works: false }; Career.news(G, byLang(`${t.name} fecha às pressas com a ${m.name}`, `${t.name} signs a rushed deal with ${m.name}`), 'tecnica', '', { tm: [t.id] }); }
    }
  });
};
/* entradas, saídas e projetos de motor próprio */
Mfr.yearly = (G) => {
  const S = Mfr.st(G), y = G.season.year;
  const regEvery = G.db.rules.regulationChangeEvery || 5;
  const nextReg = y + ((regEvery - (G.history.length % regEvery)) % regEvery || regEvery);
  // a lista de candidatas nunca se esgota: com menos de duas na fila, surge um projeto novo (determinístico pela semente)
  const waiting = S.list.filter(m => m.cand && !m.active && !m.entering);
  if (waiting.length < 2) {
    const r = localRng(`mfrgen:${G.seed}:${y}`);
    const used = new Set(S.list.map(m => m.name));
    const pool = Mfr.GEN_POOL.filter(x => !used.has(x[0]));
    if (pool.length) {
      const [name, country] = pool[Math.floor(r() * pool.length)];
      S.seq = (S.seq || 0) + 1;
      S.list.push({ id: `pu-gen${S.seq}`, name, country, logo: null, dev: Math.round(60 + r() * 80), interest: +(0.15 + r() * 0.3).toFixed(2), from: y + 4 + Math.floor(r() * 3), active: false, raw: null, reliability: null, eff: null, fee: 16, rep: 45, cand: true, gen: true, real: byLang('Projeto de motor estudado para o próximo ciclo de regulamento.', 'Power unit project studied for the next rules cycle.') });
      S.log.unshift({ y, kind: 'estudo', mid: `pu-gen${S.seq}` });
    }
  }
  // entradas: candidatas anunciam com antecedência e estreiam no ano marcado
  S.list.filter(m => m.cand && !m.active && !m.entering && y >= m.from - 3).forEach(m => {
    const r = localRng(`ment:${G.seed}:${m.id}:${y}`)();
    const regBoost = nextReg - y <= 3 ? 2.2 : 0.6;
    const fixed = m.id === 'pu-gm' && y >= 2027 && Career.team(G, 'cadillac');
    if (fixed || r < m.interest * 0.08 * regBoost) {
      m.entering = Math.max(m.from, fixed ? 2029 : nextReg);
      Career.news(G, byLang(`${m.name} confirma motor próprio na F1 a partir de ${m.entering}`, `${m.name} confirms its own F1 power unit from ${m.entering}`), 'tecnica', byLang('O fabricante pode fornecer a equipes clientes ou fechar parceria de fábrica.', 'The manufacturer can supply customer teams or form a works partnership.'), { main: true });
      S.log.unshift({ y, kind: 'anuncio', mid: m.id, year: m.entering });
    }
  });
  S.list.filter(m => m.entering && m.entering <= y && !m.active).forEach(m => {
    const act = Mfr.active(G);
    m.active = true; m.since = m.entering; delete m.entering;
    m.raw = +(avg(act.map(x => x.raw)) - 2.5).toFixed(2); m.reliability = +(avg(act.map(x => x.reliability)) - 4).toFixed(2); m.eff = +(avg(act.map(x => x.eff)) - 1.5).toFixed(2);
    m.fee = 14;
    S.log.unshift({ y, kind: 'estreia', mid: m.id });
    // parceria de fábrica prevista (GM → Cadillac) ou equipe dona da marca
    const pt = m.partner && Career.team(G, m.partner);
    if (pt && !pt.works) { pt.nextEngine = m.id; pt.works = true; S.contracts[pt.id] = { mid: m.id, until: 2099, fee: 0, works: true }; if (typeof Fac !== 'undefined') Fac.openEngineDept(G, pt); Career.news(G, byLang(`${pt.name} vira equipe de fábrica da ${m.name}`, `${pt.name} becomes ${m.name}'s works team`), 'tecnica', '', { tm: [pt.id], main: true }); }
  });
  // saídas: fabricante com resultado ruim e motor fraco por anos pode sair (aviso de 2 anos)
  Mfr.active(G).forEach(m => {
    if (m.leaving || Mfr.active(G).length <= 3) return;
    const e = byId(G.db.engines, m.id);
    m.badYears = e && e.power < avg(G.db.engines.map(x => x.power)) - 1.5 ? (m.badYears || 0) + 1 : 0;
    const r = localRng(`mleave:${G.seed}:${m.id}:${y}`)();
    // montadora dona da própria equipe (Audi, por exemplo) não abandona só o motor: ela vende a equipe junto (owners.js)
    const own = Mfr.worksOf(G, m.id); const sameBrand = own && own.owner && new RegExp(m.name.split(' ')[0], 'i').test(own.owner.name);
    if (m.badYears >= 4 && !sameBrand && r < 0.1) {
      m.leaving = y + 2;
      Career.news(G, byLang(`${m.name} anuncia que deixa a F1 depois de ${y + 1}`, `${m.name} announces it will leave F1 after ${y + 1}`), 'tecnica', byLang('As equipes clientes precisam de outro fornecedor.', 'Customer teams need another supplier.'), { main: true });
      S.log.unshift({ y, kind: 'saida', mid: m.id, year: m.leaving });
    }
  });
  Mfr.active(G).filter(m => m.leaving && m.leaving <= y).forEach(m => {
    const w = Mfr.worksOf(G, m.id);
    const r = localRng(`mheir:${G.seed}:${m.id}`)();
    if (w && w.reputation >= 70 && r < 0.6) {
      // a equipe de fábrica herda o projeto (como a Red Bull com a Honda)
      m.leaving = null; m.badYears = 0; const old = m.name; m.name = `${w.name} Powertrains`; m.dev = Math.round(m.dev * 0.8);
      Career.news(G, byLang(`${w.name} assume o projeto de motor deixado pela ${old}`, `${w.name} takes over the power unit project left by ${old}`), 'tecnica', '', { tm: [w.id], main: true });
      S.log.unshift({ y, kind: 'heranca', mid: m.id, tid: w.id });
      return;
    }
    m.active = false; m.left = y; m.leaving = null;
    G.db.teams.forEach(t => { if (t.engine === m.id) t.works = false; });
    S.log.unshift({ y, kind: 'saiu', mid: m.id });
  });
};
/* jogador: escolher o motor do ano seguinte ou pedir parceria de fábrica */
Mfr.playerChoose = (G, mid, years) => {
  const t = Career.team(G); const m = Mfr.get(G, mid); const c = Mfr.st(G).contracts[t.id];
  if (!m || !m.active) return byLang('Fabricante indisponível.', 'Manufacturer unavailable.');
  if (t.works) return byLang('Sua equipe é de fábrica: o motor é dela.', 'Your team is a works team: the engine is its own.');
  if (c && c.until > G.season.year && m.id !== t.engine) return byLang(`Seu contrato atual vai até ${c.until}. Rescindir custa ${fmtMoney(Mfr.breakFee(G, t))}.`, `Your current deal runs until ${c.until}. Breaking it costs ${fmtMoney(Mfr.breakFee(G, t))}.`);
  if (m.id !== t.engine && Mfr.capacityLeft(G, m) <= 0) return byLang(`${m.name} já fornece para ${Mfr.CAP} equipes.`, `${m.name} already supplies ${Mfr.CAP} teams.`);
  if (m.leaving && m.leaving <= G.season.year + 2) return byLang(`${m.name} vai sair da F1.`, `${m.name} is leaving F1.`);
  Mfr.sign(G, t, m, years || 2, Mfr.quote(G, t, m)); Mfr.st(G).contracts[t.id].decided = G.season.year;
  return null;
};
Mfr.breakFee = (G, t) => { const c = Mfr.st(G).contracts[t.id]; return c ? +(c.fee * Math.max(0, c.until - G.season.year) * 0.5).toFixed(1) : 0; };
Mfr.breakContract = (G) => {
  const t = Career.team(G); const c = Mfr.st(G).contracts[t.id]; if (!c || t.works) return byLang('Nada a rescindir.', 'Nothing to terminate.');
  const fee = Mfr.breakFee(G, t);
  if (G.finances.balance - fee < -10) return byLang('Caixa insuficiente para a multa.', 'Not enough cash for the fee.');
  Career.ledger(G, byLang(`Rescisão do contrato de motor (${(Mfr.get(G, c.mid) || {}).name})`, `Engine contract termination (${(Mfr.get(G, c.mid) || {}).name})`), -fee, 'motor');
  c.until = G.season.year;
  return null;
};
/* parceria de fábrica: o fabricante sem equipe própria avalia a equipe do jogador */
Mfr.worksChance = (G, t, m) => clamp(0.15 + (t.reputation - 55) / 80 + (m.rep < 60 ? 0.15 : 0) - (Mfr.worksOf(G, m.id) ? 1 : 0), 0, 0.9);
Mfr.askWorks = (G, mid) => {
  const t = Career.team(G); const m = Mfr.get(G, mid);
  if (!m || !m.active || t.works) return byLang('Não é possível.', 'Not possible.');
  if (Mfr.worksOf(G, m.id)) return byLang(`${m.name} já tem equipe de fábrica.`, `${m.name} already has a works team.`);
  const S = Mfr.st(G); S.asked = S.asked || {};
  if (S.asked[m.id] === G.season.year) return byLang('Já houve resposta este ano.', 'They already answered this year.');
  S.asked[m.id] = G.season.year;
  if (localRng(`works:${G.seed}:${m.id}:${G.season.year}`)() > Mfr.worksChance(G, t, m)) return byLang(`${m.name} agradeceu, mas não quer uma parceria de fábrica com a equipe agora.`, `${m.name} thanked you but does not want a works partnership with the team right now.`);
  t.nextEngine = m.id; t.worksFrom = G.season.year + 1;
  S.contracts[t.id] = { mid: m.id, until: 2099, fee: 0, works: true, from: G.season.year + 1, pendingWorks: true };
  Career.news(G, byLang(`${t.name} será equipe de fábrica da ${m.name} a partir de ${G.season.year + 1}`, `${t.name} to become ${m.name}'s works team from ${G.season.year + 1}`), 'tecnica', '', { tm: [t.id], main: true });
  return null;
};

/* ---------- pneus ---------- */
// (0.9, regra 19) lista do mundo real: fica no Pacote de dados (WORLD_LISTS.tyres, app/data/world-lists.js), não no código
Object.defineProperty(Mfr, 'TYRES', { get: () => (typeof WORLD_LISTS !== 'undefined' && WORLD_LISTS.tyres) || {}, configurable: true });
/* fornecedores das outras categorias (dados reais de 2026) */
Mfr.SERIES_TYRES = { f2: 'pirelli', f3: 'pirelli', f1a: 'pirelli', freca: 'pirelli', indycar: 'firestone', nxt: 'firestone', fe: 'hankook', sf: 'yokohama', sfl: 'kumho', wec: 'michelin', imsa: 'michelin', elms: 'goodyear', nascup: 'goodyear', nasxf: 'goodyear', nastr: 'goodyear', dtm: 'pirelli', stockcar: 'hankook', supercars: 'dunlop' };
Mfr.tyres = (G) => {
  const S = Mfr.st(G);
  if (!S.tyres) S.tyres = { f1: { id: 'pirelli', until: 2028, since: 2011 }, hist: [{ y: 2011, id: 'pirelli' }], tender: null };
  return S.tyres;
};
// pneu neutro, sem marca: vale quando o Pacote de dados não traz os fornecedores (mundo sem pacote)
Mfr.NEUTRAL_TYRE = { name: 'Pneu padrão', wear: 1, warm: 1, bid: 0.5, note: ['Fornecedor único', 'Single supplier'] };
Mfr.tyreOf = (id) => Mfr.TYRES[id] || Mfr.NEUTRAL_TYRE;
Mfr.tyreNow = (G) => Mfr.TYRES[Mfr.tyres(G).f1.id] || Mfr.TYRES.pirelli || Mfr.NEUTRAL_TYRE;
/* licitação: dois anos antes do fim do contrato a FIA abre o processo */
Mfr.tender = (G) => {
  const T = Mfr.tyres(G), y = G.season.year;
  if (!T.tender && y >= T.f1.until - 1) {
    const r = localRng(`tender:${G.seed}:${y}`);
    const bids = Object.entries(Mfr.TYRES).filter(([id]) => id !== 'firestone' && id !== 'kumho').map(([id, x]) => ({ id, s: x.bid * (id === T.f1.id ? 1.4 : 1) + r() * 0.5 })).filter(b => b.s > 0.45).sort((a, b) => b.s - a.s);
    T.tender = { y, bids: bids.map(b => b.id) };
    Career.news(G, byLang(`FIA abre licitação para fornecer pneus à F1 a partir de ${T.f1.until + 1}`, `FIA opens the tender to supply F1 tyres from ${T.f1.until + 1}`), 'regulamento', byLang(`Propostas: ${bids.map(b => Mfr.TYRES[b.id].name).join(', ')}.`, `Bids: ${bids.map(b => Mfr.TYRES[b.id].name).join(', ')}.`));
    return;
  }
  if (T.tender && y >= T.f1.until) {
    const win = T.tender.bids[0] || T.f1.id;
    const changed = win !== T.f1.id;
    T.f1 = { id: win, until: y + 4, since: changed ? y + 1 : T.f1.since };
    if (changed) T.hist.push({ y: y + 1, id: win });
    T.tender = null;
    Career.news(G, changed ? byLang(`${Mfr.tyreOf(win).name} vence a licitação e será a fornecedora de pneus da F1 a partir de ${y + 1}`, `${Mfr.tyreOf(win).name} wins the tender and will supply F1 tyres from ${y + 1}`) : byLang(`${Mfr.tyreOf(win).name} segue como fornecedora de pneus da F1 até ${y + 4}`, `${Mfr.tyreOf(win).name} stays as F1 tyre supplier until ${y + 4}`), 'regulamento', changed ? byLang(Mfr.TYRES[win].note[0] + '. As equipes vão precisar reaprender o pneu.', Mfr.TYRES[win].note[1] + '. Teams will have to relearn the tyre.') : '', { main: changed });
  }
};
Mfr.applyTyre = (G) => { const x = Mfr.tyreNow(G); Engine.TYRE_SUP = { wear: x.wear, warm: x.warm }; };

/* ---------- ganchos ---------- */
(function () {
  Engine.TYRE_SUP = { wear: 1, warm: 1 };
  Hooks.around('Engine', Engine, 'wearRate', 'manufacturers', (wr, ...a) => wr(...a) * Engine.TYRE_SUP.wear);
  Hooks.around('Career', Career, 'initPeople', 'manufacturers', (ip, G) => { const r = ip(G); Mfr.ensure(G); Mfr.applyTyre(G); return r; });
  Hooks.around('Career', Career, 'startWeekend', 'manufacturers', (sw, G, ...a) => { Mfr.ensure(G); Mfr.applyTyre(G); return sw(G, ...a); });
  Hooks.around('Career', Career, 'finishWeekend', 'manufacturers', (fw, G, ...a) => { const res = fw(G, ...a); if (G.season.round === Math.round(G.season.calendar.length * 0.6)) Mfr.market(G); return res; });
  Hooks.around('Career', Career, 'endSeason', 'manufacturers', (es, G) => {
    Mfr.ensure(G);
    const regBefore = G.history.length;
    const r = es(G);
    const reg = (G.history.length % (G.db.rules.regulationChangeEvery || 4)) === 0 && G.history.length !== regBefore;
    Mfr.develop(G, reg);
    Mfr.yearly(G);
    Mfr.applyYear(G);
    Mfr.tender(G);
    Mfr.sync(G);
    return r;
  });
  // equipes que compraram/entraram com motor próprio: o fabricante novo aparece na aba
  if (typeof Owners !== 'undefined') {
    Hooks.around('Owners', Owners, 'engineProjects', 'manufacturers', (ep, G) => {
      ep(G); const S = Mfr.st(G);
      G.db.engines.forEach(e => { if (!S.list.find(m => m.id === e.id)) S.list.push({ id: e.id, name: e.name, country: null, active: true, raw: e.power, reliability: e.reliability, eff: Mfr.REF.eff - 1.5, dev: 120, fee: 14, since: G.season.year, rep: 50 }); });
      S.list.forEach(m => { const e = byId(G.db.engines, m.id); if (e && m.cand && !m.active) { m.active = true; m.since = G.season.year; m.raw = e.power; m.reliability = e.reliability; m.eff = Mfr.REF.eff - 1.5; } });
      G.db.teams.forEach(t => { if (t.works) S.contracts[t.id] = { mid: t.engine, until: 2099, fee: 0, works: true }; });
    });
  }
})();
