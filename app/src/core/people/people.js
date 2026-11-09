'use strict';
/* =============================================================
   PESSOAS (0.8.6-A)
   1. Moral com causas: cada mudança de moral fica registrada com o motivo (resultado, duelo com o
      companheiro, ordens, promessas, conversas, contrato, paddock e imprensa...). A tela mostra os três
      motivos que mais pesaram nas últimas etapas. O efeito na pista continua pequeno (Engine.eff).
   2. Química entre companheiros (−100 a +100): sobe com a convivência, cai com batidas entre os dois,
      ordens a favor de um só e briga pelo posto de nº 1. Alta: troca de dados no treino (confiança).
      Baixa: ignoram mais as ordens e há vazamentos para a imprensa.
   3. Confiança piloto–chefe (0 a 100), alimentada por conversas e promessas. Pesa na renovação,
      na aceitação de ordens e no pedido de saída.
   4. Funcionários vivos: moral, pedidos (aumento, verba, cargo), conflitos entre chefes de área
      (perda de eficiência no P&D) e pedido de demissão do diretor técnico depois de um ano ruim.
   ============================================================= */
const People = {};

/* ---------- 1. moral com causas ---------- */
People.CAUSE = {
  result: ['Resultados', 'Results'], mate: ['Duelo com o companheiro', 'Team-mate battle'], orders: ['Ordens de equipe', 'Team orders'],
  promise: ['Promessas', 'Promises'], talk: ['Conversas com o chefe', 'Talks with the boss'], policy: ['Papel na equipe', 'Role in the team'],
  contract: ['Contrato', 'Contract'], paddock: ['Paddock e imprensa', 'Paddock and press'], decision: ['Decisões da equipe', 'Team decisions'], chem: ['Clima com o companheiro', 'Mood with team-mate'],
};
People.causeName = (k) => { const c = People.CAUSE[k] || People.CAUSE.paddock; return byLang(c[0], c[1]); };
People.log = (G, d, v, k) => {
  if (!d || !v || Math.abs(v) < 0.05 || !G.season) return;
  const y = G.season.year, r = G.season.round;
  d.moodLog = (d.moodLog || []).filter(x => x.y === y && r - x.r <= 10);
  const last = d.moodLog[d.moodLog.length - 1];
  if (last && last.r === r && last.k === k) last.v = +(last.v + v).toFixed(2); else d.moodLog.push({ y, r, v: +v.toFixed(2), k });
  d._logSum = +((d._logSum || 0) + v).toFixed(2);
  if (d.moodLog.length > 40) d.moodLog.splice(0, d.moodLog.length - 40);
  d._m = d.morale;
};
People.mood = (G, d, v, k) => { if (!d) return; const b = d.morale ?? 70; d.morale = clamp(Math.round((b + v) * 10) / 10, 1, 100); People.log(G, d, d.morale - b, k); };
/* os motivos que mais pesaram nas últimas 6 etapas */
People.causes = (G, d, n = 3) => {
  const r = G.season.round; const by = {};
  (d.moodLog || []).filter(x => x.y === G.season.year && r - x.r <= 6).forEach(x => (by[x.k] = (by[x.k] || 0) + x.v));
  return Object.entries(by).filter(([, v]) => Math.abs(v) >= 0.5).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, n).map(([k, v]) => ({ k, v: +v.toFixed(1), name: People.causeName(k) }));
};
/* mudanças de moral que aconteceram fora dos pontos registrados (eventos do paddock, imprensa...) */
People.drift = (G) => { G.db.drivers.forEach(d => { if (d.team && d._m != null && d.morale != null && Math.abs(d.morale - d._m) >= 0.3) People.log(G, d, d.morale - d._m, 'paddock'); if (d.team) d._m = d.morale; }); };

/* ---------- 2. química entre companheiros ---------- */
People.key = (a, b) => [a, b].sort().join('|');
People.chemBase = (G, a, b) => ((G.chem || {})[People.key(a, b)] || 0);
People.chem = (G, a, b) => Math.round(clamp(People.chemBase(G, a, b) - (typeof Orders !== 'undefined' ? Orders.tension(G, a, b) : 0), -100, 100));
People.addChem = (G, a, b, v) => { G.chem = G.chem || {}; const k = People.key(a, b); G.chem[k] = clamp(Math.round(((G.chem[k] || 0) + v) * 10) / 10, -100, 70); };
People.chemLabel = (v) => (v >= 40 ? byLang('Ótima', 'Great') : v >= 15 ? byLang('Boa', 'Good') : v > -15 ? byLang('Neutra', 'Neutral') : v > -40 ? byLang('Fria', 'Cold') : byLang('Hostil', 'Hostile'));
People.pairs = (G) => G.db.teams.map(t => Career.lineup(G, t.id).filter(d => d && d.seat !== 'R').slice(0, 2)).filter(p => p.length === 2);
People.LEAK = [
  ['Fonte da {t}: {a} reclamou do acerto de {b} na reunião técnica', '{t} source: {a} complained about {b}\'s setup in the technical meeting'],
  ['Clima pesado na {t}: {a} e {b} não se falam fora da pista', 'Tense mood at {t}: {a} and {b} do not talk off track'],
  ['{a} teria pedido à {t} mais atenção do que {b}', '{a} has reportedly asked {t} for more attention than {b}'],
  ['Vazamento: {a} acusa {b} de copiar os dados do seu carro', 'Leak: {a} accuses {b} of copying his car data'],
  ['Mensagens internas da {t} mostram atrito entre {a} e {b}', 'Internal {t} messages show friction between {a} and {b}'],
];
People.afterRace = (G, race) => {
  const clashes = race.clashes || [];
  People.pairs(G).forEach(([a, b]) => {
    if (!race.cars.some(c => c.did === a.id) || !race.cars.some(c => c.did === b.id)) return;
    People.addChem(G, a.id, b.id, 1.2);   // convivência
    const hit = clashes.find(x => (x[0] === a.id && x[1] === b.id) || (x[0] === b.id && x[1] === a.id));
    if (hit) {
      People.addChem(G, a.id, b.id, hit[3] === 'crash' ? -28 : -14);
      const t = Career.team(G, a.team); const culprit = Career.driver(G, hit[2]); const victim = culprit && culprit.id === a.id ? b : a;
      People.mood(G, victim, -5, 'chem'); People.mood(G, culprit, -2, 'chem');
      Career.news(G, byLang(`${hit[3] === 'crash' ? 'Batida' : 'Toque'} entre os companheiros da ${t.name}: ${a.name} e ${b.name}`, `${hit[3] === 'crash' ? 'Crash' : 'Contact'} between ${t.name} team-mates ${a.name} and ${b.name}`), 'corrida', byLang(`${victim.name} culpa ${culprit ? culprit.name : 'o companheiro'}. A equipe vai analisar as imagens.`, `${victim.name} blames ${culprit ? culprit.name : 'his team-mate'}. The team will review the footage.`), { dr: [a.id, b.id], tm: [t.id], main: true });
    }
    if (!Career.isObs(G) && a.team === G.player.teamId && typeof Orders !== 'undefined' && Orders.no1(G)) People.addChem(G, a.id, b.id, -0.6);
    // química baixa: vazamentos para a imprensa
    const ch = People.chem(G, a.id, b.id);
    if (ch <= -40 && RNG.chance(0.08)) {
      const t = Career.team(G, a.team); const [x, y] = RNG.chance(0.5) ? [a, b] : [b, a];
      const L = People.LEAK[Math.floor(RNG.next() * People.LEAK.length)];
      Career.news(G, byLang(L[0], L[1]).replace('{t}', t.name).replace('{a}', x.name).replace('{b}', y.name), 'paddock', '', { dr: [x.id, y.id], tm: [t.id] });
      People.mood(G, x, -2, 'chem'); People.mood(G, y, -3, 'chem');
    }
  });
};

/* ---------- 3. confiança piloto–chefe e promessas ---------- */
People.trust = (d) => d.trust ?? 55;
People.addTrust = (G, d, v, why) => {
  if (!d) return; d.trust = clamp(Math.round((People.trust(d) + v) * 10) / 10, 0, 100);
  d.trustLog = (d.trustLog || []).slice(-19); d.trustLog.push({ y: G.season.year, r: G.season.round, v, why });
};
People.PROMISE = {
  priority: ['Prioridade na equipe até o fim do ano', 'Team priority until the end of the year'],
  car: ['Carro melhor nas próximas 4 etapas', 'A better car within the next 4 rounds'],
  renew: ['Proposta de renovação até o fim do ano', 'A renewal offer by the end of the year'],
  freedom: ['Sem ordens de equipe contra ele', 'No team orders against him'],
};
People.promiseText = (k) => { const p = People.PROMISE[k]; return p ? byLang(p[0], p[1]) : k; };
People.promises = (G, did) => (G.promises || []).filter(p => (!did || p.did === did));
People.openPromise = (G, did, kind) => (G.promises || []).find(p => p.did === did && p.kind === kind && p.state === 'open');
People.promise = (G, d, kind) => {
  if (People.openPromise(G, d.id, kind)) return null;
  const s = G.season; const t = Career.team(G);
  const p = { id: Career.nextId(G, 'pr'), did: d.id, kind, y: s.year, r: s.round, state: 'open',
    due: kind === 'car' ? s.round + 4 : s.calendar.length, base: kind === 'car' ? +Engine.carRating(G.db, t).toFixed(2) : kind === 'renew' ? d.contractYears : null };
  (G.promises = G.promises || []).push(p);
  if (G.promises.length > 60) G.promises.splice(0, G.promises.length - 60);
  return p;
};
People.settle = (G, p, kept) => {
  p.state = kept ? 'kept' : 'broken'; p.at = { y: G.season.year, r: G.season.round };
  const d = Career.driver(G, p.did); if (!d) return;
  People.addTrust(G, d, kept ? 10 : -16, kept ? 'promessa cumprida' : 'promessa quebrada');
  People.mood(G, d, kept ? 5 : -8, 'promise');
  if (!Career.isObs(G) && d.team === G.player.teamId) Career.mail(G, { from: d.name, tag: 'team', important: !kept,
    title: kept ? byLang(`${d.name}: "Você cumpriu o que prometeu"`, `${d.name}: "You kept your word"`) : byLang(`${d.name}: "Você não cumpriu a promessa"`, `${d.name}: "You broke your promise"`),
    body: byLang(`Promessa: ${People.promiseText(p.kind)}. ${kept ? 'A confiança dele em você subiu.' : 'A confiança dele em você caiu, e ele vai lembrar disso na hora de renovar.'}`, `Promise: ${People.promiseText(p.kind)}. ${kept ? 'His trust in you went up.' : 'His trust in you dropped, and he will remember it when it is time to renew.'}`) });
};
People.checkPromises = (G, race) => {
  const s = G.season;
  (G.promises || []).filter(p => p.state === 'open' && p.y === s.year).forEach(p => {
    const d = Career.driver(G, p.did); if (!d || d.team !== G.player.teamId) { p.state = 'void'; return; }
    const mate = Career.teamDrivers(G, d.team).find(x => x.id !== d.id && x.seat !== 'R');
    if (p.kind === 'priority') { const n1 = typeof Orders !== 'undefined' ? Orders.no1(G) : null; if (mate && n1 === mate.id) return People.settle(G, p, false); }
    if (p.kind === 'freedom' && race && (race.orderLog || []).some(x => x.did === d.id && x.type === 'letBy' && x.obeyed && !x.ai)) return People.settle(G, p, false);
    if (p.kind === 'car' && s.round >= p.due) return People.settle(G, p, Engine.carRating(G.db, Career.team(G)) >= p.base + 0.5);
    if (p.kind === 'renew' && d.contractYears > (p.base || 0)) return People.settle(G, p, true);
    if (s.round >= p.due && (p.kind === 'priority' || p.kind === 'freedom' || p.kind === 'renew')) return People.settle(G, p, p.kind !== 'renew');
  });
};
/* pedido de saída quando a confiança e a moral desabam */
People.wantOut = (G) => {
  if (Career.isObs(G)) return;
  Career.teamDrivers(G, G.player.teamId).filter(d => d.seat !== 'R' && d.contractYears > 0 && People.trust(d) < 22 && (d.morale ?? 70) < 45 && d.outAsked !== G.season.year).forEach(d => {
    d.outAsked = G.season.year;
    Career.mail(G, { from: d.name, tag: 'team', important: true, title: byLang(`${d.name} pede para sair da equipe`, `${d.name} asks to leave the team`),
      body: byLang(`"Não vejo mais futuro aqui. Quero ser liberado no fim do ano." Confiança: ${Math.round(People.trust(d))}/100 · moral ${Math.round(d.morale)}.`, `"I no longer see a future here. I want to be released at the end of the year." Trust: ${Math.round(People.trust(d))}/100 · morale ${Math.round(d.morale)}.`),
      choices: [
        { label: byLang('Liberar no fim do ano', 'Release him at the end of the year'), effects: { release: d.id }, outcome: byLang('Acordo fechado: ele sai quando a temporada acabar.', 'Deal done: he leaves when the season ends.') },
        { label: byLang('Recusar: ele tem contrato', 'Refuse: he is under contract'), effects: { morale: { [d.id]: -10 }, trust: { did: d.id, v: -6 } }, outcome: byLang('Ele fica, mas o clima piorou.', 'He stays, but the mood got worse.') },
        { label: byLang('Pedir uma chance: prometer carro melhor', 'Ask for a chance: promise a better car'), effects: { morale: { [d.id]: 4 }, trust: { did: d.id, v: 6 }, promise: { did: d.id, kind: 'car' } }, outcome: byLang('Ele aceitou esperar. A promessa ficou registrada.', 'He agreed to wait. The promise is on record.') },
      ] });
  });
};

/* ---------- 4. funcionários vivos ---------- */
People.HEADS = ['technical', 'aero', 'chiefEngineer', 'engineeringDir', 'engine', 'performance'];
People.staffMood = (s, v) => { s.morale = clamp(Math.round(((s.morale ?? 70) + v) * 10) / 10, 1, 100); };
People.roleName = (r) => { const R = Staff.ROLES[r]; return R ? (typeof I18N !== 'undefined' && I18N.tx ? (I18N.tx(R.name) || R.name) : R.name) : r; };
People.staffTick = (G, summary) => {
  if (Career.isObs(G)) return;
  const t = Career.team(G); if (!t || !t.staffList) return;
  const my = summary.cls.filter(r => r.tid === t.id); if (!my.length) return;
  const exp = Career.expectedRanks(G)[t.id] * 2 - 0.5; const best = Math.min(...my.map(r => r.pos));
  const dm = clamp((exp - best) * 0.4, -2.5, 3);
  t.staffList.filter(s => !s.isPlayer).forEach(s => { if (s.morale == null) s.morale = Math.round(RNG.range(52, 82)); People.staffMood(s, dm * 0.5 + ((64 - s.morale) * 0.12) + RNG.normal(0, 1.5)); });
  const s = G.season;
  // pedidos e conflitos, no máximo um por etapa
  if (s.round % 3 === 0 && RNG.chance(0.45)) People.staffRequest(G, t);
  else if (s.round % 5 === 2 && RNG.chance(0.3)) People.staffConflict(G, t);
};
People.staffRequest = (G, t) => {
  const pool = t.staffList.filter(x => !x.isPlayer && !x.interim && x.rating >= 72);
  if (!pool.length) return;
  const s = RNG.pick(pool); const name = `${s.name} (${People.roleName(s.role)})`;
  const fair = Staff.salaryFor(s.role, s.rating);
  const kinds = [];
  if (s.salary < fair * 1.05) kinds.push('raise');
  if (People.HEADS.includes(s.role)) kinds.push('budget');
  if (['performance', 'raceEng1', 'raceEng2', 'chiefEngineer'].includes(s.role)) kinds.push('role');
  if (!kinds.length) return;
  const k = RNG.pick(kinds);
  if (k === 'raise') {
    const v = +(Math.max(fair * 1.12, s.salary * 1.15)).toFixed(2);
    Career.mail(G, { from: name, tag: 'team', title: byLang(`${s.name} pede aumento`, `${s.name} asks for a raise`), body: byLang(`Recebe ${fmtMoney(s.salary)} por ano e quer ${fmtMoney(v)}. Outras equipes já sondaram. Moral: ${Math.round(s.morale ?? 70)}.`, `Earns ${fmtMoney(s.salary)} a year and wants ${fmtMoney(v)}. Other teams have already asked. Morale: ${Math.round(s.morale ?? 70)}.`),
      choices: [
        { label: byLang(`Dar o aumento (${fmtMoney(v)})`, `Give the raise (${fmtMoney(v)})`), effects: { staffFx: { sid: s.id, salary: v, mood: 12 } }, outcome: byLang('Pedido aceito. Ele renovou o compromisso com a equipe.', 'Request granted. He renewed his commitment to the team.') },
        { label: byLang('Meio-termo', 'Meet halfway'), gamble: { p: 0.55, win: { staffFx: { sid: s.id, salary: +((s.salary + v) / 2).toFixed(2), mood: 5 } }, lose: { staffFx: { sid: s.id, salary: +((s.salary + v) / 2).toFixed(2), mood: -6 } }, winText: byLang('Ele aceitou o meio-termo.', 'He accepted the compromise.'), loseText: byLang('Aceitou, mas saiu insatisfeito.', 'He accepted, but left unhappy.') } },
        { label: byLang('Recusar', 'Refuse'), effects: { staffFx: { sid: s.id, mood: -14, poach: true } }, outcome: byLang('Ele ficou chateado. Fique de olho no mercado.', 'He is upset. Keep an eye on the market.') },
      ] });
  } else if (k === 'budget') {
    const v = +(RNG.range(0.8, 2.2)).toFixed(1);
    Career.mail(G, { from: name, tag: 'dev', title: byLang(`${s.name} pede mais verba para o departamento`, `${s.name} asks for more department budget`), body: byLang(`Com ${fmtMoney(v)} a mais, o departamento rende mais nas próximas 6 etapas (os projetos de P&D ganham cerca de 5%). Conta no teto de gastos.`, `With ${fmtMoney(v)} more, the department performs better over the next 6 rounds (R&D projects gain about 5%). It counts towards the cost cap.`),
      choices: [
        { label: byLang(`Liberar ${fmtMoney(v)}`, `Approve ${fmtMoney(v)}`), effects: { money: -v, moneyDesc: byLang(`Verba extra: ${People.roleName(s.role)}`, `Extra budget: ${People.roleName(s.role)}`), staffFx: { sid: s.id, mood: 8, boost: true } }, outcome: byLang('Verba liberada. O departamento está motivado.', 'Budget approved. The department is motivated.') },
        { label: byLang('Negar: o teto está apertado', 'Refuse: the cap is tight'), effects: { staffFx: { sid: s.id, mood: -6 } }, outcome: byLang('Ele entendeu, mas não gostou.', 'He understood, but did not like it.') },
      ] });
  } else {
    const up = s.role === 'chiefEngineer' ? 'technical' : s.role === 'performance' ? 'raceEng1' : 'chiefEngineer';
    const cur = Staff.get(t, up); if (!cur || cur.isPlayer || cur.rating > s.rating + 4) return;
    Career.mail(G, { from: name, tag: 'team', title: byLang(`${s.name} quer o cargo de ${People.roleName(up).toLowerCase()}`, `${s.name} wants the ${People.roleName(up).toLowerCase()} job`), body: byLang(`Hoje o cargo é de ${cur.name} (nota ${cur.rating}). ${s.name} tem nota ${s.rating} e acha que merece a promoção.`, `The job currently belongs to ${cur.name} (rating ${cur.rating}). ${s.name} is rated ${s.rating} and feels he deserves the promotion.`),
      choices: [
        { label: byLang('Promover e trocar os dois de cargo', 'Promote him and swap the two roles'), effects: { staffFx: { sid: s.id, swapWith: cur.id, mood: 15, otherMood: -15 } }, outcome: byLang('Promoção feita. Quem perdeu o cargo não ficou feliz.', 'Promotion done. The one who lost the job is not happy.') },
        { label: byLang('Ainda não: prometer avaliar no fim do ano', 'Not yet: promise to review at season end'), effects: { staffFx: { sid: s.id, mood: -3 } }, outcome: byLang('Ele vai esperar, por enquanto.', 'He will wait, for now.') },
      ] });
  }
};
People.staffConflict = (G, t) => {
  if (G.staffConflict && G.staffConflict.until > G.season.round && G.staffConflict.y === G.season.year) return;
  const heads = t.staffList.filter(x => !x.isPlayer && People.HEADS.includes(x.role));
  if (heads.length < 2) return;
  const sorted = heads.slice().sort((a, b) => (a.morale ?? 70) - (b.morale ?? 70));
  const a = sorted[0], b = sorted[1]; if ((a.morale ?? 70) > 72) return;
  const TOP = [['o conceito do assoalho', 'the floor concept'], ['a prioridade do túnel de vento', 'wind tunnel priority'], ['quem decide o pacote de atualização', 'who decides the upgrade package'], ['a correlação entre simulador e pista', 'simulator-to-track correlation'], ['a divisão do orçamento', 'the budget split']];
  const top = RNG.pick(TOP);
  G.staffConflict = { a: a.id, b: b.id, y: G.season.year, until: G.season.round + 4, mul: 0.93 };
  Career.mail(G, { from: byLang('Diretor esportivo', 'Sporting director'), tag: 'team', important: true,
    title: byLang(`Conflito na fábrica: ${a.name} × ${b.name}`, `Factory conflict: ${a.name} vs ${b.name}`),
    body: byLang(`${a.name} (${People.roleName(a.role)}) e ${b.name} (${People.roleName(b.role)}) brigam por ${top[0]}. Enquanto não se resolver, os projetos de P&D rendem cerca de 7% menos.`, `${a.name} (${People.roleName(a.role)}) and ${b.name} (${People.roleName(b.role)}) are fighting over ${top[1]}. Until it is settled, R&D projects yield about 7% less.`),
    choices: [
      { label: byLang(`Ficar do lado de ${a.name}`, `Side with ${a.name}`), effects: { staffFx: { sid: a.id, mood: 8, other: b.id, otherMood: -12, endConflict: true } }, outcome: byLang(`${a.name} ganhou a queda de braço.`, `${a.name} won the tug of war.`) },
      { label: byLang(`Ficar do lado de ${b.name}`, `Side with ${b.name}`), effects: { staffFx: { sid: b.id, mood: 8, other: a.id, otherMood: -12, endConflict: true } }, outcome: byLang(`${b.name} ganhou a queda de braço.`, `${b.name} won the tug of war.`) },
      { label: byLang('Reunir os dois e mediar', 'Get them together and mediate'), gamble: { p: 0.55, win: { staffFx: { sid: a.id, mood: 4, other: b.id, otherMood: 4, endConflict: true } }, lose: { staffFx: { sid: a.id, mood: -4, other: b.id, otherMood: -4 } }, winText: byLang('Os dois chegaram a um acordo.', 'They reached an agreement.'), loseText: byLang('A reunião terminou em gritaria. O conflito continua.', 'The meeting ended in shouting. The conflict goes on.') } },
    ] });
};
/* diretor técnico pede demissão depois de um ano abaixo da meta */
People.seasonEnd = (G) => {
  if (Career.isObs(G)) return;
  const t = Career.team(G); if (!t || !t.staffList) return;
  const sc = Career.standingsC ? Career.standingsC(G) : null;
  const pos = sc ? sc.findIndex(x => x.tid === t.id) + 1 : 0;
  const td = Staff.get(t, 'technical');
  if (td && !td.isPlayer && pos && G.board && pos >= (G.board.target || 99) + 2 && (td.morale ?? 70) < 58 && RNG.chance(0.4)) {
    const repl = { id: Career.nextId(G, 'sf'), role: 'technical', name: Staff.genName(t.country), real: false, rating: Math.round(clamp(td.rating - 7, 58, 85)), until: G.season.year + 2, since: G.season.year, interim: true, morale: 65 };
    repl.salary = Staff.salaryFor('technical', repl.rating);
    t.staffList = t.staffList.filter(x => x !== td); t.staffList.push(repl); Staff.derive(t);
    Career.news(G, byLang(`${td.name} pede demissão da ${t.name}`, `${td.name} resigns from ${t.name}`), 'mercado', byLang(`O diretor técnico sai depois de um ano abaixo da meta (${ordinal(pos)} no Mundial). ${repl.name} assume interinamente.`, `The technical director leaves after a year below target (${ordinal(pos)} in the championship). ${repl.name} takes over on an interim basis.`), { tm: [t.id], main: true });
    Career.mail(G, { from: td.name, tag: 'team', important: true, title: byLang(`${td.name} pediu demissão`, `${td.name} has resigned`), body: byLang(`"Não consegui entregar o carro que a equipe precisava. É hora de outra pessoa tentar." ${repl.name} assume como interino; você pode buscar outro nome no mercado de funcionários.`, `"I could not deliver the car the team needed. It is time for someone else to try." ${repl.name} steps in as interim; you can look for someone else on the staff market.`) });
  }
  // a moral dos funcionários volta um pouco para o centro nas férias
  t.staffList.forEach(s => { if (s.morale != null) s.morale = Math.round(s.morale + (70 - s.morale) * 0.4); });
};

/* ---------- efeitos e ganchos ---------- */
(() => {
  // registro de causas: tudo o que mudou desde o último registro e não foi marcado vira "paddock e imprensa"
  Hooks.around('Career', Career, 'finishWeekend', 'people', (fw, G, ...a) => {
    const wk = G.weekend; const race = wk && wk.race;
    try { People.drift(G); } catch (e) { /* nada */ }
    const before = {}, snap = {}; G.db.drivers.forEach(d => { if (d.team) { before[d.id] = d.morale; snap[d.id] = d._logSum || 0; } });
    const r = fw(G, ...a);
    try {
      const res = G.season.results[G.season.results.length - 1];
      G.db.drivers.forEach(d => {
        if (before[d.id] == null || d.morale == null) return;
        const logged = (d._logSum || 0) - (snap[d.id] || 0);
        let diff = d.morale - before[d.id] - logged; if (Math.abs(diff) < 0.05) return;
        // a parte do duelo com o companheiro (±1,5 no pós-corrida)
        const me = res && res.cls.find(x => x.did === d.id); const mate = me && res.cls.find(x => x.tid === me.tid && x.did !== d.id);
        if (me && mate) { const mv = me.pos < mate.pos ? 1.5 : -1.5; People.log(G, d, mv, 'mate'); diff -= mv; }
        People.log(G, d, diff, 'result');
      });
      if (race) { People.afterRace(G, race); People.checkPromises(G, race); }
      People.wantOut(G);
      if (res) People.staffTick(G, res);
      G.db.drivers.forEach(d => { if (d.team) d._m = d.morale; });
    } catch (e) { /* sem registro */ }
    return r;
  });
  // decisões nas cartas: a moral que mudou vira "decisões da equipe" (ou "conversa"/"contrato" quando marcado)
  Hooks.around('Events', Events, 'resolve', 'people', (rs, G, mid, idx) => {
    const before = {}, snap = {}; G.db.drivers.forEach(d => { if (d.team) { before[d.id] = d.morale; snap[d.id] = d._logSum || 0; } });
    const m = rs(G, mid, idx);
    try { G.db.drivers.forEach(d => { if (before[d.id] == null) return; const v = d.morale - before[d.id] - ((d._logSum || 0) - snap[d.id]); if (Math.abs(v) >= 0.05) People.log(G, d, v, 'decision'); }); } catch (e) { /* nada */ }
    return m;
  });
  // renovação: a confiança no chefe pesa na resposta
  Hooks.around('Career', Career, 'offerEval', 'people', (oe, G, d, ...a) => {
    const ev = oe(G, d, ...a);
    try { if (ev && d && d.team === G.player.teamId && typeof ev.p === 'number') { ev.p = clamp(ev.p + (People.trust(d) - 55) / 220, 0, 1); ev.trust = Math.round(People.trust(d)); } } catch (e) { /* nada */ }
    return ev;
  });
  // renovação feita: motivo "contrato" e confiança
  Hooks.around('Career', Career, 'renew', 'people', (rn, G, did, ...a) => { const d = Career.driver(G, did); const b = d ? d.morale : null; const r = rn(G, did, ...a); try { if (d && r && r.ok) { People.log(G, d, d.morale - b, 'contract'); People.addTrust(G, d, 4, 'renovação'); } } catch (e) { /* nada */ } return r; });
  // corrida: confiança e química mexem na obediência às ordens
  Hooks.around('Career', Career, 'startRace', 'people', (sr, G, ...a) => {
    const r = sr(G, ...a);
    try {
      const race = G.weekend && G.weekend.race;
      if (race) race.cars.forEach(c => {
        const d = Career.driver(G, c.did); const mate = race.cars.find(x => x.tid === c.tid && x !== c);
        c.trustAdj = c.tid === G.player.teamId && !Career.isObs(G) && d ? (People.trust(d) - 55) * 0.003 : 0;
        c.chemAdj = mate ? clamp(People.chem(G, c.did, mate.did) / 100 * 0.12, -0.12, 0.06) : 0;
      });
    } catch (e) { /* nada */ }
    return r;
  });
  Hooks.around('Engine', Engine, 'obeyP', 'people', (ob, wk, c, mate) => clamp(ob(wk, c, mate) + (c.trustAdj || 0) + (c.chemAdj || 0), 0.25, 0.99));
  // química alta: troca de dados no treino = mais confiança no carro
  Hooks.around('Career', Career, 'finishPractice', 'people', (fp, G, ...a) => {
    const r = fp(G, ...a);
    try {
      const wk = G.weekend; if (wk && wk.conf && !wk.chemApplied) {
        wk.chemApplied = true;
        People.pairs(G).forEach(([a1, b1]) => { const ch = People.chem(G, a1.id, b1.id); if (ch >= 30) { const add = Math.min(4, ch / 15); [a1, b1].forEach(d => { if (wk.conf[d.id] != null) wk.conf[d.id] = clamp(wk.conf[d.id] + add, 0, 100); }); } });
      }
    } catch (e) { /* nada */ }
    return r;
  });
  // P&D: conflito entre chefes de área reduz o rendimento; verba extra aumenta
  if (typeof RnD !== 'undefined' && RnD.quote) {
    Hooks.around('RnD', RnD, 'quote', 'people', (q0, G, cfg) => {
      const q = q0(G, cfg);
      try {
        const s = G.season; let mul = 1;
        const C = G.staffConflict; if (C && C.y === s.year && C.until > s.round) mul *= C.mul || 0.93;
        const B = G.staffBoost; if (B && B.y === s.year && B.until > s.round) mul *= 1.05;
        if (mul !== 1 && q && q.min != null) { q.min = +(q.min * mul).toFixed(2); q.max = +(q.max * mul).toFixed(2); q.staffMul = mul; }
      } catch (e) { /* nada */ }
      return q;
    });
  }
  // efeitos novos das cartas
  Hooks.around('Events', Events, 'applyEffects', 'people', (ae, G, fx) => {
    const out = ae(G, fx);
    try {
      if (fx && fx.trust) { const d = Career.driver(G, fx.trust.did); if (d) { People.addTrust(G, d, fx.trust.v, 'carta'); out.push(`${byLang('Confiança', 'Trust')} ${fx.trust.v >= 0 ? '+' : ''}${fx.trust.v}`); } }
      if (fx && fx.promise) { const d = Career.driver(G, fx.promise.did); if (d && People.promise(G, d, fx.promise.kind)) out.push(byLang('Promessa registrada', 'Promise recorded')); }
      if (fx && fx.release) { const d = Career.driver(G, fx.release); if (d) { d.releaseAtEnd = true; out.push(byLang('Liberado no fim do ano', 'Released at season end')); } }
      if (fx && fx.staffFx) {
        const S = fx.staffFx; const t = Career.team(G); const s = t.staffList.find(x => x.id === S.sid);
        if (s) {
          if (S.salary) s.salary = S.salary;
          if (S.mood) People.staffMood(s, S.mood);
          if (S.poach) s.poachRisk = (s.poachRisk || 0) + 1;
          if (S.boost) G.staffBoost = { y: G.season.year, until: G.season.round + 6, role: s.role };
          if (S.swapWith) { const o = t.staffList.find(x => x.id === S.swapWith); if (o) { const r0 = s.role; s.role = o.role; o.role = r0; if (S.otherMood) People.staffMood(o, S.otherMood); Staff.derive(t); } }
          if (S.other) { const o = t.staffList.find(x => x.id === S.other); if (o && S.otherMood) People.staffMood(o, S.otherMood); }
          if (S.endConflict) G.staffConflict = null;
          out.push(byLang(`Moral de ${s.name} ${S.mood >= 0 ? '+' : ''}${S.mood || 0}`, `${s.name} morale ${S.mood >= 0 ? '+' : ''}${S.mood || 0}`));
        }
      }
    } catch (e) { /* sem efeito */ }
    return out;
  });
  // fim de temporada: demissão do diretor técnico, pilotos liberados
  Hooks.around('Career', Career, 'endSeason', 'people', (es, G, ...a) => {
    try { People.seasonEnd(G); } catch (e) { /* nada */ }
    try { G.db.drivers.filter(d => d.releaseAtEnd).forEach(d => { d.contractYears = 0; d.releaseAtEnd = false; }); } catch (e) { /* nada */ }
    return es(G, ...a);
  });
})();
