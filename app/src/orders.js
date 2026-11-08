'use strict';
/* =============================================================
   ORDENS DE EQUIPE — CONSEQUÊNCIAS (0.8.6-B)
   O motor decide na pista se o piloto obedece (Engine.obeyP) e registra em race.orderLog.
   Aqui, depois da corrida: moral, tensão entre companheiros, cartas com escolhas e notícias.
   A tensão fica em G.mates["a|b"] (0 a 100) e será usada pela química entre companheiros.
   ============================================================= */
const Orders = {};
Orders.key = (a, b) => [a, b].sort().join('|');
Orders.tension = (G, a, b) => ((G.mates || {})[Orders.key(a, b)] || 0);
Orders.addTension = (G, a, b, v) => { G.mates = G.mates || {}; const k = Orders.key(a, b); G.mates[k] = clamp(Math.round((G.mates[k] || 0) + v), 0, 100); return G.mates[k]; };
Orders.pick = (arr) => { const x = arr[Math.floor(RNG.next() * arr.length)]; return byLang(x[0], x[1]); };

/* textos variados para a carta do diretor esportivo */
Orders.MAIL_OPEN = [
  ['{d} ignorou a ordem da equipe na volta {l}.', '{d} ignored the team order on lap {l}.'],
  ['Na volta {l}, {d} desobedeceu o pit wall de forma clara.', 'On lap {l}, {d} clearly disobeyed the pit wall.'],
  ['O rádio foi gravado: {d} recusou a ordem na volta {l}.', 'The radio was recorded: {d} refused the order on lap {l}.'],
  ['{d} decidiu por conta própria na volta {l}, contra a ordem da equipe.', '{d} made his own call on lap {l}, against the team order.'],
  ['Todos no box ouviram: {d} não cumpriu a ordem na volta {l}.', 'Everyone in the garage heard it: {d} did not follow the order on lap {l}.'],
];
Orders.MAIL_MATE = [
  ['{m} está furioso e quer uma resposta da direção.', '{m} is furious and wants an answer from management.'],
  ['{m} pediu uma reunião ainda hoje.', '{m} asked for a meeting today.'],
  ['{m} não falou com ninguém depois da corrida.', '{m} did not talk to anyone after the race.'],
  ['{m} disse aos engenheiros que perdeu a confiança no companheiro.', '{m} told the engineers he has lost trust in his team-mate.'],
  ['{m} postou só um emoji nas redes. A imprensa já percebeu.', '{m} posted a single emoji online. The press has noticed.'],
];
Orders.MAIL_PRESS = [
  ['Os jornalistas vão perguntar sobre isso na próxima coletiva.', 'Journalists will ask about this at the next press conference.'],
  ['A diretoria quer saber como você vai lidar com isso.', 'The board wants to know how you will deal with this.'],
  ['O caso já virou assunto no paddock.', 'The case is already the talk of the paddock.'],
  ['Os patrocinadores estão de olho na imagem da equipe.', 'The sponsors are watching the team image.'],
];

Orders.afterRace = (G, race, gp) => {
  const log = race.orderLog || []; if (!log.length) return;
  const pt = G.player.teamId, obs = Career.isObs(G);
  const seen = new Set();
  log.forEach(x => {
    const k = x.did + x.type + x.obeyed; if (seen.has(k)) return; seen.add(k);
    const d = Career.driver(G, x.did), m = Career.driver(G, x.mate); if (!d || !m) return;
    const t = Career.team(G, x.tid);
    if (x.obeyed) {
      // obedeceu: perde moral, mais se cedeu pódio ou vitória
      const big = x.pos <= 3;
      d.morale = clamp((d.morale ?? 70) - (big ? 6 : 3), 1, 100);
      Orders.addTension(G, d.id, m.id, big ? 8 : 4);
      if (big && x.tid !== pt) Career.news(G, byLang(`${t.name} usa ordem de equipe: ${d.name} cede o P${x.pos} para ${m.name}`, `${t.name} use team orders: ${d.name} hands P${x.pos} to ${m.name}`), 'corrida', '', { dr: [d.id, m.id], tm: [t.id] });
      return;
    }
    // desobedeceu
    d.disobey = (d.disobey || 0) + 1;
    const ten = Orders.addTension(G, d.id, m.id, x.type === 'hold' ? 18 : 14);
    m.morale = clamp((m.morale ?? 70) - 6, 1, 100);
    Career.news(G, byLang(x.type === 'hold' ? `${d.name} desobedece a ${t.name} e briga com ${m.name}` : `${d.name} ignora ordem da ${t.name} e não deixa ${m.name} passar`, x.type === 'hold' ? `${d.name} defies ${t.name} and fights ${m.name}` : `${d.name} ignores ${t.name} order and does not let ${m.name} by`), 'corrida', byLang(`Tensão entre os companheiros: ${ten}/100.`, `Tension between the team-mates: ${ten}/100.`), { dr: [d.id, m.id], tm: [t.id], main: x.pos <= 5 });
    if (x.tid !== pt || obs) { if (t) t.morale = clamp((t.morale ?? 70) - 2, 1, 100); return; }
    const fill = (s) => s.replace('{d}', d.name).replace('{m}', m.name).replace('{l}', x.lap);
    const body = `${fill(Orders.pick(Orders.MAIL_OPEN))} ${fill(Orders.pick(Orders.MAIL_MATE))} ${Orders.pick(Orders.MAIL_PRESS)}\n\n${byLang('Tensão entre os dois', 'Tension between them')}: ${ten}/100.`;
    const loy = ((d.personality || {}).loyalty ?? 50) / 100;
    Career.mail(G, { from: byLang('Diretor esportivo', 'Sporting director'), tag: 'team', important: true,
      title: byLang(`${gp}: ${d.name} desobedeceu a ordem de equipe`, `${gp}: ${d.name} disobeyed the team order`), body,
      choices: [
        { label: byLang('Multa interna e advertência por escrito', 'Internal fine and written warning'), effects: { morale: { [d.id]: -10, [m.id]: 4 }, board: 2, tension: { a: d.id, b: m.id, v: -6 } }, outcome: byLang(`${d.name} pagou a multa calado. ${m.name} se sentiu respeitado.`, `${d.name} paid the fine in silence. ${m.name} felt respected.`) },
        { label: byLang('Conversa a portas fechadas', 'Closed-door talk'), gamble: { p: clamp(0.35 + loy * 0.5, 0.2, 0.85), win: { morale: { [d.id]: 3, [m.id]: 3 }, tension: { a: d.id, b: m.id, v: -15 } }, lose: { morale: { [d.id]: -3, [m.id]: -3 }, tension: { a: d.id, b: m.id, v: 5 } }, winText: byLang('A conversa funcionou: os dois apertaram as mãos.', 'The talk worked: they shook hands.'), loseText: byLang('A conversa azedou. Cada um saiu com a sua versão.', 'The talk went sour. Each left with his own version.') } },
        { label: byLang('Liberar a briga entre os dois daqui em diante', 'Let them race from now on'), effects: { morale: { [d.id]: 6, [m.id]: -2 }, board: -2, tension: { a: d.id, b: m.id, v: 6 } }, outcome: byLang('A partir de agora, sem ordens. A imprensa adorou; a diretoria, nem tanto.', 'From now on, no orders. The press loved it; the board, not so much.') },
        { label: byLang('Deixar para lá', 'Let it go'), effects: { morale: { [m.id]: -8 }, board: -1 }, outcome: byLang(`${m.name} entendeu o recado: a ordem só vale para ele.`, `${m.name} got the message: orders only apply to him.`) },
      ] });
  });
};

(() => {
  const ae = Events.applyEffects;
  Events.applyEffects = (G, fx) => {
    const out = ae(G, fx);
    try { if (fx && fx.tension) { const v = Orders.addTension(G, fx.tension.a, fx.tension.b, fx.tension.v); out.push(`${byLang('Tensão', 'Tension')} ${fx.tension.v >= 0 ? '+' : ''}${fx.tension.v} (${v}/100)`); } } catch (e) { /* sem efeito */ }
    return out;
  };
  const fw = Career.finishWeekend;
  Career.finishWeekend = (G, ...a) => {
    const wk = G.weekend; const race = wk && wk.race; const tr = wk && Career.track(G, wk.trackId);
    if (race && !race.ordDone) { try { Orders.afterRace(G, race, tr ? tr.gp : ''); } catch (e) { /* sem consequências */ } race.ordDone = true; }
    return fw(G, ...a);
  };
  // a tensão esfria com o tempo (fim de temporada)
  const es = Career.endSeason;
  Career.endSeason = (G, ...a) => { try { Object.keys(G.mates || {}).forEach(k => { G.mates[k] = Math.round(G.mates[k] * 0.4); if (!G.mates[k]) delete G.mates[k]; }); G.db.drivers.forEach(d => { if (d.disobey) d.disobey = Math.max(0, d.disobey - 1); }); } catch (e) { /* nada */ } return es(G, ...a); };
})();
