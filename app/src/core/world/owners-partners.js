'use strict';
/* ---------- equipe parceira (acordo técnico) × equipe irmã (mesmo dono) ----------
   Irmã (sisters.js): controle comum, academia compartilhada, vota junto.
   Parceira: acordo técnico com a fornecedora (motor, câmbio, suspensão traseira e túnel alugado).
   A transferência de tecnologia é limitada às peças listadas: aproxima um pouco o chassi e a
   confiabilidade da parceira dos da equipe principal, nunca a aerodinâmica. Carro parecido demais
   chama a atenção da FIA (caso "Mercedes rosa" de 2020). Troca de dono ou motor próprio encerra o acordo. */
// (0.9) acordos do mundo real (equipe cliente -> [fornecedora, peças PT, peças EN]): ficam no Pacote de dados
// (REAL_EXTRA.partsDeals); sem pacote, nenhum
Object.defineProperty(Owners, 'PARTNERS', { get: () => (typeof REAL_EXTRA !== 'undefined' && REAL_EXTRA.partsDeals) || {}, configurable: true });
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
  Hooks.around('Career', Career, 'endSeason', 'owners#2', (es, G) => { const r = es(G); try { Owners.partnerYear(G); } catch (e) { if (typeof Store !== 'undefined' && Store.log) Store.log('error', 'parceria: ' + e.message); else throw e; } return r; });
  // troca de dono encerra a parceria
  Hooks.around('Owners', Owners, 'breakSister', 'owners', (bs, G, t) => { bs(G, t); if (Owners.partners(G)[t.id]) Owners.endPartner(G, t.id, byLang('Os novos donos querem um projeto técnico próprio.', 'The new owners want their own technical project.')); Object.keys(Owners.partners(G)).forEach(c => { if (Owners.partners(G)[c].parent === t.id && !Career.team(G, t.id)) delete Owners.partners(G)[c]; }); });
  // motor próprio encerra o acordo de motor
  Hooks.around('Owners', Owners, 'engineProjects', 'owners', (ep, G) => { ep(G); G.db.teams.forEach(t => { if (t.works && Owners.partners(G)[t.id] && String(t.engine).startsWith('pu-')) Owners.endPartner(G, t.id, byLang('A equipe passa a usar motor próprio.', 'The team switches to its own power unit.')); }); });
  // no Conselho, a parceira acompanha a equipe principal nos temas técnicos
  if (typeof Council !== 'undefined') {
    Hooks.around('Council', Council, 'stance', 'owners', (stc, G, pr, tid) => {
      let s = stc(G, pr, tid);
      const p = Owners.partnerOf(G, tid);
      if (p && pr.cat === 'tec' && pr.imp[p.parent] != null) s = s * 0.8 + pr.imp[p.parent] * 0.2;
      return s;
    });
    // bastidores: blocos de motor fecham posição antes da votação
    Hooks.around('Council', Council, 'openMeeting', 'owners', (om, G) => {
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
    });
  }
})();

/* =============================================================
   PARCERIA TÉCNICA DO JOGADOR (0.8.6) — além das equipes irmãs
   Como Haas–Ferrari e Williams–Mercedes: a cliente compra peças da equipe de fábrica que fornece o
   seu motor. Dois pacotes:
     - básico: motor e câmbio (transferência pela metade);
     - completo: motor, câmbio, suspensão e uso do túnel de vento da principal.
   A cliente paga uma taxa por ano (dentro do teto de gastos); a principal recebe. A parceira acompanha
   a principal em 20% do peso nos votos técnicos do Conselho e pode receber pilotos emprestados da
   academia. Troca de motor, de dono ou motor próprio encerra o acordo.
   ============================================================= */
Owners.PKG = {
  basic: { parts: ['motor', 'câmbio'], partsEn: ['engine', 'gearbox'], fee: 6, mul: 0.5 },
  full: { parts: ['motor', 'câmbio', 'suspensão', 'túnel de vento'], partsEn: ['engine', 'gearbox', 'suspension', 'wind tunnel'], fee: 14, mul: 1 },
};
Owners.kidsOf = (G, tid) => Object.entries(Owners.partners(G)).filter(([c, p]) => p.parent === tid && Career.team(G, c)).map(([c]) => c);
/* quem pode ser a principal de uma cliente: a equipe de fábrica do mesmo motor */
Owners.canParent = (G, parentId, childId) => {
  const par = Career.team(G, parentId), ch = Career.team(G, childId);
  if (!par || !ch || par.id === ch.id || par.gone || ch.gone) return byLang('Equipe indisponível.', 'Team unavailable.');
  if (!par.works) return byLang(`A ${par.name} não é equipe de fábrica de motor.`, `${par.name} is not an engine works team.`);
  if (ch.works) return byLang(`A ${ch.name} é equipe de fábrica: não compra peças de outra.`, `${ch.name} is a works team: it does not buy parts from another.`);
  if (ch.engine !== par.engine && ch.engine !== par.id) return byLang(`A parceria técnica vem junto com o motor: a ${ch.name} precisa usar o motor da ${par.name}.`, `A technical partnership comes with the engine: ${ch.name} must use ${par.name}'s engine.`);
  if (Owners.partners(G)[childId]) return byLang(`A ${ch.name} já tem parceria técnica.`, `${ch.name} already has a technical partnership.`);
  if ((G.sisters || {})[childId]) return byLang(`A ${ch.name} já é equipe irmã de outra.`, `${ch.name} is already another team's sister team.`);
  if (Owners.kidsOf(G, parentId).length >= 2) return byLang(`A ${par.name} já atende duas equipes parceiras.`, `${par.name} already supplies two partner teams.`);
  return null;
};
Owners.makePartner = (G, childId, parentId, pkg, player) => {
  const K = Owners.PKG[pkg] || Owners.PKG.basic; const ch = Career.team(G, childId), par = Career.team(G, parentId);
  Owners.partners(G)[childId] = { parent: parentId, parts: K.parts.slice(), partsEn: K.partsEn.slice(), since: G.season.year, pkg, fee: K.fee, player: !!player };
  ch.partnerOf = [...new Set([...(ch.partnerOf || []), parentId])];
  Career.news(G, byLang(`${ch.name} fecha parceria técnica com a ${par.name}`, `${ch.name} signs a technical partnership with ${par.name}`), 'tecnica', byLang(`Pacote ${pkg === 'full' ? 'completo' : 'básico'}: ${K.parts.join(', ')}. Taxa de ${fmtMoney(K.fee)} por ano. A aerodinâmica continua sendo de cada equipe.`, `${pkg === 'full' ? 'Full' : 'Basic'} package: ${K.partsEn.join(', ')}. Fee of ${fmtMoney(K.fee)} a year. Each team keeps its own aerodynamics.`), { tm: [ch.id, par.id], main: true });
  Career.record(G, 'decisao', `${ch.name} e ${par.name}: parceria técnica (${K.parts.join(', ')}), ${fmtMoney(K.fee)}/ano.`, { teams: [ch.id, par.id] });
};
/* o jogador (cliente) pede parceria a uma equipe de fábrica */
Owners.askPartner = (G, parentId, pkg) => {
  const me = G.player.teamId; const why = Owners.canParent(G, parentId, me); if (why) return why;
  G.partnerAsk = G.partnerAsk || {};
  const key = `${parentId}:${G.season.year}:${G.season.round}`; if (G.partnerAsk[key]) return byLang('Eles já responderam nesta etapa. Tente depois da próxima corrida.', 'They already answered this round. Try again after the next race.');
  G.partnerAsk[key] = 1;
  const K = Owners.PKG[pkg] || Owners.PKG.basic; const par = Career.team(G, parentId), t = Career.team(G);
  // a fábrica gosta de clientes estáveis e que não ameaçam o seu resultado
  const gap = Engine.carRating(G.db, par) - Engine.carRating(G.db, t);
  const p = clamp(0.45 + gap * 0.04 + (t.reputation - 60) / 200 - (pkg === 'full' ? 0.12 : 0), 0.1, 0.9);
  if (!RNG.chance(p)) return byLang(`A ${par.name} recusou por enquanto (chance era de ${Math.round(p * 100)}%).`, `${par.name} declined for now (the chance was ${Math.round(p * 100)}%).`);
  Owners.makePartner(G, me, parentId, pkg, true);
  // taxa proporcional ao que resta do ano
  const frac = Math.max(0.2, 1 - G.season.round / G.season.calendar.length);
  Career.ledger(G, byLang(`Parceria técnica com a ${par.name}`, `Technical partnership with ${par.name}`), -+(K.fee * frac).toFixed(2), 'operação');
  return null;
};
/* o jogador (equipe de fábrica) oferece parceria a uma cliente */
Owners.offerPartner = (G, childId, pkg) => {
  const me = G.player.teamId; const why = Owners.canParent(G, me, childId); if (why) return why;
  G.partnerAsk = G.partnerAsk || {};
  const key = `o:${childId}:${G.season.year}:${G.season.round}`; if (G.partnerAsk[key]) return byLang('Eles já responderam nesta etapa.', 'They already answered this round.');
  G.partnerAsk[key] = 1;
  const ch = Career.team(G, childId), t = Career.team(G); const K = Owners.PKG[pkg] || Owners.PKG.basic;
  const gap = Engine.carRating(G.db, t) - Engine.carRating(G.db, ch);
  const cash = (ch.budget || 150) / 150;
  const p = clamp(0.35 + gap * 0.05 + (cash - 1) * 0.3 - (pkg === 'full' ? 0.08 : 0), 0.1, 0.92);
  if (!RNG.chance(p)) return byLang(`A ${ch.name} preferiu seguir sozinha (chance era de ${Math.round(p * 100)}%).`, `${ch.name} preferred to stay independent (the chance was ${Math.round(p * 100)}%).`);
  Owners.makePartner(G, childId, me, pkg, true);
  const frac = Math.max(0.2, 1 - G.season.round / G.season.calendar.length);
  Career.ledger(G, byLang(`Parceria técnica com a ${ch.name}`, `Technical partnership with ${ch.name}`), +(K.fee * frac).toFixed(2), 'receita');
  return null;
};
Owners.endPartnerPlayer = (G, childId) => {
  const p = Owners.partners(G)[childId]; const me = G.player.teamId;
  if (!p || (childId !== me && p.parent !== me)) return byLang('Você não faz parte deste acordo.', 'You are not part of this deal.');
  const ch = Career.team(G, childId); if (ch) ch.partnerOf = (ch.partnerOf || []).filter(x => x !== p.parent);
  Owners.endPartner(G, childId, byLang('Decisão do chefe de equipe.', 'Team principal\'s decision.'));
  return null;
};
/* transferência anual com o fator do pacote, e taxa anual do jogador */
(() => {
  Hooks.around('Owners', Owners, 'partnerYear', 'owners', (py, G) => {
    const P = Owners.partners(G);
    // guarda o carro das parceiras de pacote básico para devolver metade do ganho
    const snap = {}; Object.entries(P).forEach(([tid, p]) => { if (p.pkg === 'basic') { const t = Career.team(G, tid); if (t) snap[tid] = { c: t.car.chassis, r: t.car.reliability }; } });
    py(G);
    Object.entries(snap).forEach(([tid, s]) => { const t = Career.team(G, tid); if (!t) return; t.car.chassis = +(s.c + (t.car.chassis - s.c) * 0.5).toFixed(2); t.car.reliability = +(s.r + (t.car.reliability - s.r) * 0.5).toFixed(2); });
  });
  Hooks.around('Career', Career, 'startSeason', 'owners', (ss, G, first, ...a) => {
    const r = ss(G, first, ...a);
    try {
      if (!first && !Career.isObs(G)) {
        const me = G.player.teamId; const P = Owners.partners(G);
        Object.entries(P).forEach(([c, p]) => {
          if (!p.fee) return;
          if (c === me) Career.ledger(G, byLang(`Parceria técnica com a ${(Career.team(G, p.parent) || {}).name}`, `Technical partnership with ${(Career.team(G, p.parent) || {}).name}`), -p.fee, 'operação');
          else if (p.parent === me) Career.ledger(G, byLang(`Parceria técnica com a ${(Career.team(G, c) || {}).name}`, `Technical partnership with ${(Career.team(G, c) || {}).name}`), p.fee, 'receita');
        });
      }
    } catch (e) { /* sem taxa */ }
    return r;
  });
})();
