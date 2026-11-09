/* ============================================================
   PIT WALL — relatório da corrida volta a volta
   Depois de cada volta: posição de volta dos pit stops, undercut/overcut,
   rádio das equipes (pneus, estratégia, ordens de equipe, discussões depois
   de toques, bateria, tráfego) e um resumo narrado da volta.
   Tudo entra em race.events, que vira o relatório oficial da prova.
   ============================================================ */
'use strict';

const RaceLog = {};
RaceLog.RADIO = {
  tyres: [['{d}', 'Os pneus acabaram, estou perdendo muito tempo.'], ['{d}', 'Não tenho mais aderência atrás. Quando paramos?'], ['{d}', 'Os pneus estão caindo, não aguento mais muitas voltas.']],
  tyresReply: ['Entendido, box nesta volta.', 'Aguenta mais duas voltas, estamos montando a janela.', 'Copiado. Plano B em análise.'],
  faster: [['{d}', 'Eu sou mais rápido, preciso passar!'], ['{d}', 'Estou preso atrás do {b}, perdendo tempo.'], ['{d}', 'O {b} está segurando todo mundo.'], ['{d}', 'Não consigo chegar perto, ar sujo demais atrás do {b}.']],
  teamOrderAsk: 'Deixe {m} passar, ele está em outra estratégia.',
  teamOrderHold: 'Mantenham as posições. Sem brigas entre vocês.',
  teamOrderReply: [['{d}', 'Entendido... mas ele vai ter que me devolver depois.'], ['{d}', 'Sério? Ok, ok.'], ['{d}', 'Copiado.']],
  scNoPit: [['{d}', 'Por que não paramos no Safety Car?!'], ['{d}', 'Todo mundo parou! Qual é o plano?']],
  scNoPitReply: ['Ficamos na pista para ganhar posição. Confie no plano.', 'Pneus ainda bons, vamos para o fim.'],
  contact: [['{d}', 'Ele me jogou para fora! Isso tem que ser investigado.'], ['{d}', 'Ele não deixou espaço nenhum!'], ['{d}', 'Que manobra foi essa? Bateu em mim!']],
  battery: [['{d}', 'A bateria está no fim, não consigo atacar.'], ['{d}', 'Sem energia na reta, preciso recarregar.']],
  push: ['Faltam {n} voltas. Ritmo de classificação agora!', 'Tudo ou nada nas últimas {n} voltas.'],
  win: [['{d}', 'SIM! Que corrida! Obrigado, pessoal!'], ['{d}', 'Vencemos! Que carro, que equipe!']],
  box: ['Box, box. Box nesta volta.', 'Box, box! Confirme.', 'Entra agora, box, box.', 'Box nesta volta, pneus prontos.'],
  boxSC: ['Safety Car! Box, box, box!', 'Box agora, aproveite o Safety Car!'],
  rain: [['{d}', 'Começou a chover {na}!'], ['{d}', 'Pista escorregando {na}, cuidado.'], ['{d}', 'Está ficando molhado, quando trocamos?']],
  dry: [['{d}', 'A pista está secando, a trajetória já está seca.'], ['{d}', 'Esses pneus estão superaquecendo, a pista secou.']],
  gap: ['{a}s para {f} à frente. Você é {d} mais rápido por volta.', 'Gap de {a}s para {f}. Ritmo bom, continue.', '{b}s de vantagem para {g} atrás. Mantenha o ritmo.'],
  fl: ['Volta mais rápida! Excelente.', 'Roxo no setor três, volta mais rápida. Muito bem.'],
};
RaceLog.radio = (race, did, text) => Engine.event(race, 'radio', text, did, { imp: true });

RaceLog.afterLap = (race, wk) => {
  const L = race.lap;
  const r = localRng(`rl:${race.trackId}:${L}:${race.cars.length}`);
  const name = (did) => wk.nameOf(did);
  const track = wk.track;
  const run = race.cars.filter(c => c.status === 'run').sort((a, b) => a.pos - b.pos);
  // posição de volta dos pit stops
  const boxCalls = [];
  race.cars.forEach(c => {
    if (c._pitEvIdx == null) return;
    const e = race.events[c._pitEvIdx];
    const pl = (race.pitLog || []).filter(p => p.did === c.did).slice(-1)[0];
    if (e && pl) {
      pl.posOut = c.pos;
      const tpl = pl.slow ? Narr.R.slowPit : Narr.R.pit;
      e.text = Narr.fill(Narr.pick(pl.slow ? 'rPs' : 'rP', tpl, r), { a: name(c.did), t: pl.stop.toFixed(1), tyre: Engine.tyreLabel(track, pl.to).replace(/^./, (ch) => ch.toLowerCase()), p: c.pos }) + (pl.sc ? byLang(` Aproveitou o ${pl.sc === 'SC' ? 'Safety Car' : 'Safety Car Virtual'}.`, ` Used the ${pl.sc === 'SC' ? 'Safety Car' : 'Virtual Safety Car'}.`) : '');
      e.posOut = c.pos;
    }
    // chamada de box do engenheiro, logo antes da parada (só para os carros acompanhados de perto)
    if (e && pl && (c.isPlayer || pl.posIn <= 6) && r() < 0.7) boxCalls.push([c._pitEvIdx, c.did, pl.sc]);
    c._pitEvIdx = null;
  });
  boxCalls.sort((a, b) => b[0] - a[0]).forEach(([idx, did, sc]) => {
    const list = sc === 'SC' ? RaceLog.RADIO.boxSC : RaceLog.RADIO.box;
    race.events.splice(idx, 0, { lap: L, type: 'radio', text: `${byLang('Rádio para', 'Radio to')} ${name(did)}: "${list[Math.floor(r() * list.length)]}"`, did, imp: true });
  });
  // undercut / overcut: quem parou antes e voltou à frente de quem estava à frente
  (race.pitLog || []).filter(p => p.lap === L).forEach(p => {
    const me = race.cars.find(c => c.did === p.did);
    (race.pitLog || []).filter(q => q.did !== p.did && q.lap < L && q.lap >= L - 4).forEach(q => {
      const other = race.cars.find(c => c.did === q.did);
      if (!other || other.status !== 'run' || me.status !== 'run') return;
      const before = other.positions[q.lap - 1], mineBefore = me.positions[q.lap - 1];
      const dry = (x) => 'SMH'.includes(x);
      const key = q.did + '>' + p.did;
      race._uc = race._uc || {};
      if (dry(p.to) && dry(q.to) && dry(p.from) && !race._uc[key] && before && mineBefore && before > mineBefore && other.pos < me.pos && Math.abs(other.pos - me.pos) <= 3) {
        race._uc[key] = 1;
        Engine.event(race, 'undercut', Narr.fill(Narr.pick('rU', Narr.R.undercut, r), { a: name(other.did), b: name(me.did) }), other.did, { b: me.did, imp: true });
      }
    });
  });
  // rádio
  let radios = 0;
  const cap = 2;
  run.forEach(c => {
    if (radios >= cap) return;
    const imp = c.isPlayer || c.pos <= 10;
    if (!imp) return;
    c.rd = c.rd || {};
    // pneus no fim
    if ('SMH'.includes(c.tyre.c) && c.tyre.wear > 72 && !c.rd['tyre' + c.pits] && r() < 0.5) {
      c.rd['tyre' + c.pits] = 1; radios++;
      const [, txt] = RaceLog.RADIO.tyres[Math.floor(r() * RaceLog.RADIO.tyres.length)];
      RaceLog.radio(race, c.did, `${name(c.did)}: "${txt}" — ${byLang('Engenheiro', 'Engineer')}: "${RaceLog.RADIO.tyresReply[Math.floor(r() * RaceLog.RADIO.tyresReply.length)]}"`);
      return;
    }
    // preso atrás de alguém
    const ahead = run[c.pos - 2];
    const faster = ahead && c.pure && ahead.pure && ahead.pure - c.pure > 0.25;
    if (L >= 5 && !race.sc && faster && c.T - ahead.T < 0.9 && (c.stuck = (c.stuck || 0) + 1) >= 3 && !c.rd['stuck' + Math.floor(L / 12)]) {
      c.rd['stuck' + Math.floor(L / 12)] = 1; radios++;
      if (ahead.tid === c.tid) {
        // companheiros de equipe: ordem de equipe
        const swap = c.plan && ahead.plan && c.plan.stops !== ahead.plan.stops;
        const msg = swap ? Narr.fill(RaceLog.RADIO.teamOrderAsk, { m: name(c.did) }) : RaceLog.RADIO.teamOrderHold;
        RaceLog.radio(race, ahead.did, `${byLang('Rádio para', 'Radio to')} ${name(ahead.did)}: "${msg}"`);
        const [, rep] = RaceLog.RADIO.teamOrderReply[Math.floor(r() * 3)];
        if (swap && !ahead.isPlayer && Engine.obeyP && r() > Engine.obeyP(wk, ahead, c)) { Engine.orderLog(race, { type: 'letBy', did: ahead.did, mate: c.did, tid: c.tid, obeyed: false, lap: L, pos: ahead.pos, ai: true }); RaceLog.radio(race, ahead.did, `${name(ahead.did)}: "${Engine.orderLine('refuse', name(c.did))}"`); c.stuck = 0; return; }
        RaceLog.radio(race, ahead.did, `${name(ahead.did)}: "${rep}"`);
        if (swap && !ahead.isPlayer) { Engine.orderLog(race, { type: 'letBy', did: ahead.did, mate: c.did, tid: c.tid, obeyed: true, lap: L, pos: ahead.pos, ai: true }); ahead.T = c.T + 0.4; Engine.event(race, 'teamorder', byLang(`Ordem de equipe na ${wk.db.teams.find(t => t.id === c.tid).name}: ${name(ahead.did)} abre passagem para ${name(c.did)}.`, `Team order at ${wk.db.teams.find(t => t.id === c.tid).name}: ${name(ahead.did)} lets ${name(c.did)} through.`), c.did, { imp: true }); }
      } else {
        const [, txt] = RaceLog.RADIO.faster[Math.floor(r() * RaceLog.RADIO.faster.length)];
        RaceLog.radio(race, c.did, `${name(c.did)}: "${Narr.fill(txt, { b: name(ahead.did) })}"`);
      }
      c.stuck = 0;
      return;
    }
    if (!(faster && c.T - ahead.T < 0.9)) c.stuck = 0;
    // bateria
    if ((c.soc ?? 100) < 12 && !c.rd['soc' + Math.floor(L / 8)] && r() < 0.35) {
      c.rd['soc' + Math.floor(L / 8)] = 1; radios++;
      RaceLog.radio(race, c.did, `${name(c.did)}: "${RaceLog.RADIO.battery[Math.floor(r() * 2)][1]}"`);
    }
  });
  // clima: o piloto avisa
  const wxEv = race.events.find(e => e.lap === L && e.type === 'weather');
  if (wxEv && run.length) {
    const c = run[Math.floor(r() * Math.min(6, run.length))];
    const wet = /chuva|molhad|garoa|chove|rain/i.test(wxEv.text);
    const list = wet ? RaceLog.RADIO.rain : RaceLog.RADIO.dry;
    RaceLog.radio(race, c.did, `${name(c.did)}: "${Narr.fill(list[Math.floor(r() * list.length)][1], { c: Narr.corner(track, Math.floor(r() * 3), r) })}"`);
  }
  // engenheiro do jogador: diferenças a cada 9 voltas
  if (L % 9 === 0 && !race.sc) run.filter(c => c.isPlayer).forEach(c => {
    const i = run.indexOf(c), f = run[i - 1], g = run[i + 1];
    let txt;
    if (f && (!g || r() < 0.65)) {
      const dPace = (f.pure || 0) - (c.pure || 0);
      txt = dPace > 0.05 ? Narr.fill(RaceLog.RADIO.gap[0], { a: (c.T - f.T).toFixed(1), f: name(f.did), d: dPace.toFixed(1) + 's' }) : Narr.fill(RaceLog.RADIO.gap[1], { a: (c.T - f.T).toFixed(1), f: name(f.did) });
    } else if (g) txt = Narr.fill(RaceLog.RADIO.gap[2], { b: (g.T - c.T).toFixed(1), g: name(g.did) });
    if (txt) RaceLog.radio(race, c.did, `${byLang('Rádio para', 'Radio to')} ${name(c.did)}: "${txt}"`);
  });
  // volta mais rápida
  const flEv = race.events.find(e => e.lap === L && e.type === 'fastest');
  if (flEv) { const c = race.cars.find(x => x.did === flEv.did); if (c && (c.isPlayer || c.pos <= 5) && r() < 0.5) RaceLog.radio(race, c.did, `${byLang('Rádio para', 'Radio to')} ${name(c.did)}: "${RaceLog.RADIO.fl[Math.floor(r() * 2)]}"`); }
  // Safety Car: quem não parou reclama
  const scNow = race.sc && race.events.some(e => e.lap === L && e.type === 'sc' && e.deploy);
  if (scNow) {
    const pittedNow = new Set((race.pitLog || []).filter(p => p.lap === L).map(p => p.did));
    const stay = run.filter(c => c.pos <= 8 && !pittedNow.has(c.did) && c.tyre.wear > 30);
    if (stay.length && r() < 0.6) {
      const c = stay[Math.floor(r() * stay.length)];
      RaceLog.radio(race, c.did, `${name(c.did)}: "${RaceLog.RADIO.scNoPit[Math.floor(r() * 2)][1]}" — ${byLang('Engenheiro', 'Engineer')}: "${RaceLog.RADIO.scNoPitReply[Math.floor(r() * 2)]}"`);
    }
  }
  // depois de toques: a vítima reclama
  (race.clashes || []).filter(x => x.lap === L || (x.lap == null && !x.logged)).forEach(x => {
    x.logged = true;
    const [a, b, culprit] = x;
    const victim = culprit === a ? b : a;
    const v = race.cars.find(c => c.did === victim);
    if (v && (v.isPlayer || v.pos <= 12)) RaceLog.radio(race, victim, `${name(victim)}: "${RaceLog.RADIO.contact[Math.floor(r() * 3)][1].replace(/^Ele|^He/, name(culprit))}"`);
  });
  // reta final
  const left = race.laps - L;
  if (left === 5 && !race.sprint) { const lead = run[0]; if (lead) RaceLog.radio(race, lead.did, `${byLang('Rádio para', 'Radio to')} ${name(lead.did)}: "${Narr.fill(RaceLog.RADIO.push[Math.floor(r() * 2)], { n: 5 })}"`); }
  // resumo narrado da volta
  RaceLog.summary(race, wk, L, run, r);
};

RaceLog.summary = (race, wk, L, run, r) => {
  const name = (did) => wk.nameOf(did);
  if (!run.length) return;
  const parts = [];
  const lead = run[0], p2 = run[1];
  if (L === 1) {
    const gain = run.map(c => ({ c, g: c.grid - c.pos })).sort((a, b) => b.g - a.g);
    parts.push(byLang(`LARGADA! ${name(lead.did)} ${lead.grid === 1 ? 'mantém a ponta' : `pula de ${lead.grid}º para a liderança`}.`, `LIGHTS OUT! ${name(lead.did)} ${lead.grid === 1 ? 'keeps the lead' : `jumps from P${lead.grid} into the lead`}.`));
    if (gain[0] && gain[0].g >= 2) parts.push(byLang(`${name(gain[0].c.did)} ganha ${gain[0].g} posições na primeira volta.`, `${name(gain[0].c.did)} gains ${gain[0].g} places on the opening lap.`));
    const lost = gain[gain.length - 1];
    if (lost && lost.g <= -3) parts.push(byLang(`${name(lost.c.did)} perde ${-lost.g} posições.`, `${name(lost.c.did)} loses ${-lost.g} places.`));
  } else {
    const prevLeader = race.cars.find(c => c.positions[L - 1] === 1);
    if (prevLeader && prevLeader.did !== lead.did) parts.push(byLang(`TROCA DE LIDERANÇA: ${name(lead.did)} assume a ponta.`, `LEAD CHANGE: ${name(lead.did)} takes the lead.`));
    else if (p2) parts.push(byLang(`${name(lead.did)} lidera com ${(p2.T - lead.T).toFixed(1)}s sobre ${name(p2.did)}.`, `${name(lead.did)} leads by ${(p2.T - lead.T).toFixed(1)}s from ${name(p2.did)}.`));
    // maior ganho/perda da volta
    const moves = race.cars.filter(c => c.positions[L] && c.positions[L - 1]).map(c => ({ c, g: c.positions[L - 1] - c.positions[L] })).sort((a, b) => b.g - a.g);
    if (moves[0] && moves[0].g >= 2) parts.push(byLang(`${name(moves[0].c.did)} sobe ${moves[0].g} posições (${moves[0].c.positions[L]}º).`, `${name(moves[0].c.did)} climbs ${moves[0].g} places (P${moves[0].c.positions[L]}).`));
    // brigas: diferença menor que 1 s no top 10
    const fights = [];
    // a briga pela liderança já aparece na diferença do líder; aqui, do 2º ao 10º
    for (let i = 2; i < Math.min(run.length, 10); i++) if (run[i].T - run[i - 1].T < 1.0 && !race.sc) fights.push(byLang(`${name(run[i].did)} a ${(run[i].T - run[i - 1].T).toFixed(1)}s de ${name(run[i - 1].did)} pelo ${i}º`, `${name(run[i].did)} ${(run[i].T - run[i - 1].T).toFixed(1)}s behind ${name(run[i - 1].did)} for P${i}`));
    if (p2 && p2.T - lead.T < 1.0 && !race.sc && prevLeader && prevLeader.did === lead.did) parts[0] = byLang(`${name(lead.did)} lidera sob pressão: ${name(p2.did)} está a ${(p2.T - lead.T).toFixed(1)}s, dentro da zona de ataque.`, `${name(lead.did)} leads under pressure: ${name(p2.did)} is ${(p2.T - lead.T).toFixed(1)}s behind, inside the attack zone.`);
    if (fights.length) parts.push(byLang('Briga: ', 'Battles: ') + fights.slice(0, 2).join('; ') + '.');
  }
  const sc = race.sc ? (race.sc.type === 'SC' ? byLang(' Safety Car na pista.', ' Safety Car on track.') : byLang(' Safety Car Virtual.', ' Virtual Safety Car.')) : '';
  Engine.event(race, 'narr', `${byLang('Volta', 'Lap')} ${L}/${race.laps}. ${parts.join(' ')}${sc}`, lead.did, { order: run.slice(0, 22).map(c => c.did) });
};

/* acopla ao motor: depois de cada volta, o relatório */
(function () {
  Hooks.around('Engine', Engine, 'stepLap', 'racelog', (step, race, wk) => {
    if (race.finished) return;
    const before = race.clashes ? race.clashes.length : 0;
    step(race, wk);
    if (race.clashes) race.clashes.slice(before).forEach(x => { x.lap = race.lap; });
    if (typeof Narr !== 'undefined') RaceLog.afterLap(race, wk);
    if (race.finished && typeof Narr !== 'undefined') {
      const w = race.cars.find(c => c.pos === 1);
      if (w) { const ro = localRng(`win:${race.trackId}`); RaceLog.radio(race, w.did, `${wk.nameOf(w.did)}: "${RaceLog.RADIO.win[Math.floor(ro() * 2)][1]}"`); }
    }
  });
})();
