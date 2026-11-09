/* ============================================================
   PIT WALL 0.8.5 — Corrida
   - Corrida ao vivo (modelo B, com o traçado em destaque e o rádio ampliado)
   - Grid e pole (pôster da B após a classificação)
   - Pódio no estilo da transmissão oficial
   - Pós-corrida: resumo da sua corrida no topo
   ============================================================ */
'use strict';

/* ---------- ordens de rádio ---------- */
const RADIO85 = [
  ['attack', 'Atacar', 'Attack', 'Por 5 voltas: mais ritmo e mais chance de ultrapassar; gasta mais pneu e arrisca mais.', 'For 5 laps: more pace and better overtaking odds; more tyre wear and risk.', 'timed'],
  ['defend', 'Defender', 'Defend', 'Por 5 voltas: fica mais difícil ser ultrapassado; o pneu sofre um pouco mais.', 'For 5 laps: harder to pass; slightly more tyre wear.', 'timed'],
  ['cleanAir', 'Evitar ar sujo', 'Avoid dirty air', 'Por 5 voltas: abre cerca de 1,5 s do carro da frente para esfriar os pneus; não ataca.', 'For 5 laps: drops back about 1.5 s to cool the tyres; will not attack.', 'timed'],
  ['kerbs', 'Evitar zebras', 'Stay off kerbs', 'Menos erros e quebras; perde cerca de 0,07 s por volta.', 'Fewer mistakes and failures; about 0.07 s per lap slower.', 'toggle'],
  ['lift', 'Poupar (lift and coast)', 'Lift and coast', 'Economiza combustível, freios e pneus; cerca de 0,2 s mais lento por volta.', 'Saves fuel, brakes and tyres; about 0.2 s per lap slower.', 'toggle'],
  ['hold', 'Manter posições', 'Hold positions', 'Não briga por posição com o companheiro de equipe.', 'No fighting with the team-mate.', 'toggle'],
  ['letBy', 'Deixar o companheiro passar', 'Let team-mate by', 'Abre passagem assim que o companheiro estiver logo atrás (até 2,5 s). O piloto não gosta.', 'Lets the team-mate through once he is right behind (up to 2.5 s). The driver will not like it.', 'once'],
  ['extend', 'Estender o stint', 'Extend the stint', 'Adia a parada automática por 6 voltas, se o pneu aguentar.', 'Delays the automatic stop by 6 laps if the tyres allow.', 'once'],
  ['motivate', 'Incentivar', 'Encourage', 'Mensagem de incentivo: a moral sobe e o piloto rende um pouco mais por 3 voltas.', 'Encouraging message: morale goes up and the driver is slightly quicker for 3 laps.', 'once'],
];
const RADIO_MSG85 = {
  attack: ['está liberado para atacar. Use tudo nas próximas voltas.', 'you are free to attack. Push for the next laps.'],
  defend: ['defenda a posição, cubra a parte de dentro.', 'defend the position, cover the inside.'],
  cleanAir: ['recue e saia do ar sujo, cuide dos pneus.', 'drop back out of the dirty air, look after the tyres.'],
  kerbs: ['evite as zebras, não queremos danos.', 'stay off the kerbs, we do not want damage.'],
  lift: ['poupe combustível e freios, faça lift and coast.', 'lift and coast, save fuel and brakes.'],
  hold: ['manter posições, sem briga com o companheiro.', 'hold positions, no fighting with your team-mate.'],
  letBy: ['deixe o seu companheiro passar.', 'let your team-mate through.'],
  extend: ['vamos estender este stint. Fique fora.', 'we are extending this stint. Stay out.'],
  motivate: ['ótimo trabalho, o ritmo está bom. Vamos buscar!', 'great job, the pace is good. Let us go get them!'],
};
ACT.radio85 = (el) => {
  const race = G.weekend && G.weekend.race; if (!race || race.finished) return;
  const c = race.cars.find(x => x.did === el.dataset.d); if (!c || c.status !== 'run') return;
  const k = el.dataset.o, L = race.lap; c.orders = c.orders || {};
  const d = Career.driver(G, c.did); let on = true;
  if (['attack', 'defend', 'cleanAir'].includes(k)) {
    const active = typeof c.orders[k] === 'number' && c.orders[k] > L;
    ['attack', 'defend', 'cleanAir'].forEach(x => { delete c.orders[x]; });
    if (active) on = false; else c.orders[k] = L + (Engine.ORDER_LAPS[k] || 5);
  } else if (['kerbs', 'lift', 'hold'].includes(k)) {
    c.orders[k] = !c.orders[k]; on = c.orders[k];
    if (k === 'hold') race.cars.filter(x => x.tid === c.tid && x !== c).forEach(x => { x.orders = x.orders || {}; x.orders.hold = c.orders.hold; });
  } else if (k === 'letBy') {
    if (c.orders.letBy) { c.orders.letBy = false; on = false; } else { c.orders.letBy = true; if (d) { if (typeof People !== 'undefined') People.mood(G, d, -5, 'orders'); else d.morale = clamp((d.morale || 60) - 5, 1, 100); } }
  } else if (k === 'extend') {
    c.noPitUntil = (c.noPitUntil && c.noPitUntil > L) ? 0 : L + 6; on = !!c.noPitUntil;
  } else if (k === 'motivate') {
    if (c.orders.motivatedUntil && L - (c._motAt || -99) < 10) { toast(byLang('Ele acabou de ouvir isso. Espere algumas voltas.', 'He just heard that. Wait a few laps.')); return; }
    c.orders.motivatedUntil = L + 3; c._motAt = L; if (d) { if (typeof People !== 'undefined') People.mood(G, d, 3, 'talk'); else d.morale = clamp((d.morale || 60) + 3, 1, 100); }
  }
  const m = RADIO_MSG85[k];
  if (m) Engine.event(race, 'radio', on ? byLang(`Rádio para ${rawName(c.did)}: ${m[0]}`, `Radio to ${rawName(c.did)}: ${m[1]}`) : byLang(`Rádio para ${rawName(c.did)}: ordem cancelada.`, `Radio to ${rawName(c.did)}: order cancelled.`), c.did, { imp: true });
  updateRace();
};
function radioState85(c, k, L) {
  const o = c.orders || {};
  if (['attack', 'defend', 'cleanAir'].includes(k)) return typeof o[k] === 'number' && o[k] > L ? `${o[k] - L}v` : '';
  if (k === 'extend') return c.noPitUntil && c.noPitUntil > L ? `${c.noPitUntil - L}v` : '';
  if (k === 'motivate') return o.motivatedUntil && o.motivatedUntil > L ? `${o.motivatedUntil - L}v` : '';
  if (k === 'letBy') return o.letBy ? byLang('pendente', 'pending') : '';
  return o[k] ? byLang('ligado', 'on') : '';
}

/* combustível: % do tanque e quantas voltas sobram (ou faltam) até a bandeirada */
function fuel85(c, race) {
  const f = Math.max(0, c.fuel ?? 100); const per = 100 / Math.max(1, race.laps); const left = Math.max(0, race.laps - race.lap);
  const margin = f / per - left; const tone = margin < -0.3 ? 'var(--red)' : margin < 0.2 ? 'var(--yellow)' : 'var(--green)';
  return `<span title="${byLang('Combustível no tanque e sobra estimada até a bandeirada', 'Fuel in the tank and estimated margin to the flag')}"><small>${byLang('Combustível', 'Fuel')}</small><b class="n-num">${Math.round(f)}%<em class="rp-fm" style="color:${tone}">${Math.abs(margin) < 0.05 ? '±0.0' : (margin > 0 ? '+' : '') + margin.toFixed(1)}v</em></b>${K85.bar(f, 100, tone)}</span>`;
}

/* ---------- Pit Wall (cartões dos seus pilotos) ---------- */
pitWallHtml = function (race, wk, tr, cars) {
  const ctl = $('#ctl'); if (!ctl) return;
  const obs = Career.isObs(G);
  if (obs && !UI.followTeam) UI.followTeam = cars[0] ? cars[0].tid : G.db.teams[0].id;
  const tid = obs ? UI.followTeam : G.player.teamId;
  const mine = race.cars.filter(c => c.tid === tid);
  const L = race.lap;
  const card = (c, idx) => {
    const d = Career.driver(G, c.did);
    const i = cars.indexOf(c), ahead = cars[i - 1], behind = cars[i + 1];
    const props = Engine.tprops(tr, c.tyre.c);
    const share = race.R ? race.R.electricShare : 50;
    const gapA = ahead && c.status === 'run' && ahead.status === 'run' ? (c.T - ahead.T) : null;
    const gapB = behind && behind.status === 'run' && c.status === 'run' ? (behind.T - c.T) : null;
    const ctrl = !obs && c.status === 'run' && !race.finished;
    const radio = c.status === 'run' && typeof Events !== 'undefined' && Events.radio ? Events.radio(race, c, wk) : [];
    if (c.status === 'run' && c.tyre.temp > props.hi) radio.push(byLang(`Pneus superaquecendo (${Math.round(c.tyre.temp)}°C).`, `Tyres overheating (${Math.round(c.tyre.temp)}°C).`));
    if (c.status === 'run' && c.tyre.temp < props.lo && c.tyre.age > 1) radio.push(byLang(`Pneus frios (${Math.round(c.tyre.temp)}°C).`, `Tyres cold (${Math.round(c.tyre.temp)}°C).`));
    const eng = Staff && Staff.get ? Staff.get(Career.team(G, c.tid), idx === 0 ? 'raceEng1' : 'raceEng2') : null;
    return `<div class="rp ${c.status !== 'run' ? 'out' : ''}" style="--tc:${teamColor(c.tid)}">
      <div class="rp-h">${K85.av(d, 44)}<div class="rp-n"><b>${esc(d ? shortName(d) : c.did)}</b><span>${byLang('Largou', 'Started')} ${c.grid}º · ${c.pits} ${byLang('parada(s)', 'stop(s)')}${['wing', 'floor', 'susp', 'brakes', 'gbx'].filter(k => c.damage[k] > 0).map(k => ` · <span class="n-loss">${esc(Parts.name(k))} ${k === 'wing' ? byLang('danificada', 'damaged') : Math.round(c.damage[k] * 100) + '%'}</span>`).join('')}${c.damage.power ? ` · <span class="n-loss">${byLang('perda de potência', 'power loss')}</span>` : ''}</span></div><span class="rp-p n-num">${c.status === 'dnf' ? 'AB' : 'P' + c.pos}</span></div>
      ${c.status === 'run' ? `<div class="rp-gap"><span><small>${byLang('À frente', 'Ahead')}</small><b>${gapA != null ? `${esc(rawName(ahead.did))} <em class="n-num">${gapA.toFixed(1)}s</em>` : '—'}</b></span><span><small>${byLang('Atrás', 'Behind')}</small><b>${gapB != null ? `${esc(rawName(behind.did))} <em class="n-num">${gapB.toFixed(1)}s</em>` : '—'}</b></span></div>
      <div class="rp-m"><span><small>${byLang('Pneu', 'Tyre')}</small><b>${K85.tyre(c.tyre.c)} ${c.tyre.age}v</b><i class="rp-nb"></i></span><span><small>${byLang('Desgaste', 'Wear')}</small><b class="n-num">${Math.round(c.tyre.wear)}%</b>${K85.bar(100 - c.tyre.wear, 100, c.tyre.wear > 70 ? 'var(--red)' : c.tyre.wear > 50 ? 'var(--yellow)' : 'var(--green)')}</span><span><small>${byLang('Temp.', 'Temp.')}</small><b class="n-num ${c.tyre.temp > props.hi || c.tyre.temp < props.lo ? 'n-loss' : ''}">${Math.round(c.tyre.temp)}°</b>${K85.bar(Math.max(0, Math.min(100, (c.tyre.temp - props.lo + 15) / (props.hi - props.lo + 30) * 100)), 100, c.tyre.temp > props.hi ? 'var(--red)' : c.tyre.temp < props.lo ? 'var(--blue)' : 'var(--green)')}</span>${share > 0 ? `<span><small>${byLang('Bateria', 'Battery')}</small><b class="n-num">${Math.round(c.soc ?? 100)}%</b>${K85.bar(c.soc ?? 100, 100, (c.soc ?? 100) < 20 ? 'var(--red)' : 'var(--blue)')}</span>` : ''}${fuel85(c, race)}<span><small>${byLang('Última', 'Last')}</small><b class="n-num">${c.lastLap ? fmtLap(c.lastLap) : '—'}</b><i class="rp-nb"></i></span></div>` : `<div class="rp-out">${esc(c.dnfReason || byLang('Fora da corrida', 'Out of the race'))}</div>`}
      ${ctrl ? `<div class="rp-modes"><span>${byLang('Pneus', 'Tyres')}</span>${segBtns('carTyreMode', Engine.tyreModeOf(c), [['save', byLang('Poupar', 'Save')], ['normal', byLang('Normal', 'Normal')], ['push', byLang('Atacar', 'Push')]], `data-d="${c.did}"`)}${share > 0 ? `<span>${byLang('Energia', 'Energy')}</span>${segBtns('carErsMode', Engine.ersModeOf(c), [['harvest', byLang('Recarregar', 'Harvest')], ['balanced', byLang('Neutro', 'Neutral')], ['overtake', byLang('Ultrapassar', 'Overtake')]], `data-d="${c.did}"`)}` : ''}</div>
        <div class="rp-radio"><span class="rp-lbl">${byLang('Rádio', 'Radio')}${eng ? ` · ${esc(eng.name)}` : ''}</span><div class="rp-grid">${RADIO85.map(([k, pt, en, hp, he]) => { const st = radioState85(c, k, L); return `<button class="rb ${st ? 'on' : ''}" data-act="radio85" data-d="${c.did}" data-o="${k}" title="${esc(byLang(hp, he))}">${esc(byLang(pt, en))}${st ? `<em>${esc(st)}</em>` : ''}</button>`; }).join('')}</div></div>
        <div class="rp-box"><span class="rp-lbl">${byLang('Box nesta volta', 'Box this lap')}</span>${['S', 'M', 'H', 'I', 'W'].map(t => `<button class="rb-t ${c.pitReq === t ? 'on' : ''}" data-act="carPit" data-d="${c.did}" data-c="${t}" title="${esc(Engine.tyreLabel(tr, t))}">${K85.tyre(t)}</button>`).join('')}<button class="btn sm ${c.autoModes ? 'primary' : ''}" data-act="carAutoModes" data-d="${c.did}" title="${byLang('O engenheiro escolhe os modos de pneu e de energia a cada volta', 'The engineer picks tyre and energy modes every lap')}">${c.autoModes ? byLang('Modos: engenheiro', 'Modes: engineer') : byLang('Modos: manual', 'Modes: manual')}</button><button class="btn sm ${c.auto ? '' : 'primary'}" data-act="carAuto" data-d="${c.did}">${c.auto ? byLang('Paradas: auto', 'Stops: auto') : byLang('Paradas: manual', 'Stops: manual')}</button></div>` : ''}
      ${radio.length && c.status === 'run' ? `<div class="rp-say"><b>${byLang('Engenheiro', 'Engineer')}:</b> ${esc(radio.slice(0, 2).join(' '))}</div>` : ''}
    </div>`;
  };
  if (!UI.pwSel || !mine.some(c => c.did === UI.pwSel)) UI.pwSel = (mine.find(c => c.status === 'run') || mine[0] || {}).did;
  const mini = (c) => { const d = Career.driver(G, c.did); const i = cars.indexOf(c), ahead = cars[i - 1]; const gapA = ahead && c.status === 'run' && ahead.status === 'run' ? (c.T - ahead.T) : null;
    return `<button class="rp-mini ${c.did === UI.pwSel ? 'on' : ''}" data-act="pwSel85" data-d="${c.did}" style="--tc:${teamColor(c.tid)}">${K85.av(d, 34)}<span class="rp-mn"><b>${esc(d ? shortName(d) : c.did)}</b><small>${c.status === 'run' ? `${K85.tyre(c.tyre.c)} ${Math.round(c.tyre.wear)}% · ${gapA != null ? '+' + gapA.toFixed(1) + 's' : byLang('líder', 'leader')}` : esc(c.dnfReason || 'AB')}</small></span><span class="rp-mp n-num">${c.status === 'dnf' ? 'AB' : 'P' + c.pos}</span>${Object.keys(c.orders || {}).some(k => radioState85(c, k, L)) || (c.noPitUntil && c.noPitUntil > L) ? '<i class="rp-dot" title="Ordem ativa"></i>' : ''}</button>`; };
  const sel = mine.find(c => c.did === UI.pwSel) || mine[0];
  ctl.innerHTML = `${obs ? `<div class="rp-follow"><span>${byLang('Acompanhar', 'Follow')}</span><select class="inp" data-chg="followTeam" aria-label="${byLang('Equipe', 'Team')}">${G.db.teams.map(t => opt(t.id, t.name, tid)).join('')}</select></div>` : ''}<div class="rp-tabs">${mine.map(mini).join('')}</div>${sel ? card(sel, mine.indexOf(sel)) : ''}`;
};

ACT.pwSel85 = (el) => { UI.pwSel = el.dataset.d; updateRace(); };

/* tela de fim de semana ou de corrida sem sessão: diz o que fazer agora (próximo GP ou fim de temporada) */
function noSession85(msg) {
  const over = Career.seasonOver(G);
  const id = G.season.calendar[Math.min(G.season.round, G.season.calendar.length - 1)]; const tr = id && Career.track(G, id);
  let date = ''; try { date = Time.fmt(Time.weekendDay(G)); } catch (e) { /* sem data */ }
  if (over) return `<div class="ns85"><span class="n-eyebrow">${byLang('Temporada', 'Season')} ${G.season.year}</span><h2>${byLang('Temporada encerrada', 'Season finished')}</h2><p>${esc(msg)} ${byLang('Veja campeões, premiação e o que vem a seguir.', 'See champions, awards and what comes next.')}</p>${K85.btn(byLang('Fim de temporada', 'Season review'), { act: 'go', v: 'hub', kind: 'primary' })}</div>`;
  return `<div class="ns85">${tr ? K85.track(tr, { w: 220, h: 130, cls: 'ns85-trk' }) : ''}<span class="n-eyebrow">${byLang('Próximo GP', 'Next GP')} · ${byLang('etapa', 'round')} ${G.season.round + 1}/${G.season.calendar.length}</span><h2>${esc(tr ? tr.gp : '')}</h2><p>${esc(msg)}${date ? ` ${byLang('O fim de semana começa em', 'The weekend starts on')} ${esc(date)}.` : ''}</p>${cta85().replace('class="x-cta', 'class="x-cta ns85-cta')}</div>`;
}

/* ---------- corrida ao vivo ---------- */
(function () {
  const old = SCREENS.race;
  SCREENS.race = {
    bare: true,
    html() {
      const wk = G.weekend;
      if (!wk || !wk.race) return shellHtml(noSession85(byLang('Nenhuma corrida em andamento.', 'No race in progress.')));
      const race = wk.race; const tr = Career.track(G, wk.trackId); const team = Career.isObs(G) ? null : Career.team(G);
      if (team) { document.documentElement.style.setProperty('--team', team.color); }
      return `<div class="r85">
        <header class="r85-top"><button class="x-ibtn" data-act="go" data-v="hub" aria-label="${byLang('Sair da corrida', 'Leave the race')}" title="${byLang('Sair (a corrida fica pausada)', 'Leave (the race stays paused)')}">${svg85(ICON85.back)}</button>
          <div class="r85-t"><span class="n-eyebrow">${natTag(tr.country)} ${esc(tr.circuit)} · ${byLang('Etapa', 'Round')} ${wk.round + 1}</span><b>${esc(tr.gp)}</b></div>
          <div class="race-hud" id="hud"></div></header>
        ${race.lap === 0 && !race.finished ? preRaceHtml(wk, race, tr) : ''}
        <div class="r85-body">
          <section class="r85-col"><div class="n-card r85-tw"><div class="tower" id="tower"></div></div>
            <div class="r85-lead">${K85.card({ t: byLang('Liderança volta a volta', 'Lap leaders'), body: '<div id="leaderChart"></div>' })}</div></section>
          <section class="r85-mid"><div class="n-card r85-map"><div class="trackbox"><canvas id="raceMap"></canvas><div class="wx" id="wx"></div></div></div></section>
          <section class="r85-col"><aside class="r85-pw" id="ctl"></aside>
            <div class="r85-low">${K85.card({ t: byLang('Direção de prova e rádio', 'Race control and radio'), flush: true, body: '<div class="feed" id="feed"></div>' })}</div></section>
        </div>
        <div id="raceEnd"></div>
        <div id="lights" class="lights" hidden><div class="lights-row">${[0, 1, 2, 3, 4].map(i => `<span class="lamp" id="lamp${i}"><i></i><i></i></span>`).join('')}</div></div></div>`;
    },
    after() { if (G && G.weekend && G.weekend.race) old.after.call(this); },
  };
})();

/* ---------- Grid e pole (pôster) ---------- */
function poleData85() {
  const q = (G.weekend && G.weekend.quali && G.weekend.quali.order) ? G.weekend.quali : (G.lastRace && G.lastRace.quali && G.lastRace.quali.order ? G.lastRace.quali : null);
  if (!q) return null;
  const live = !!(G.weekend && G.weekend.quali === q);
  const trId = live ? G.weekend.trackId : G.lastRace.trackId;
  const grid = live && G.weekend.grid ? G.weekend.grid : q.order;
  return { q, live, tr: Career.track(G, trId), grid };
}
SCREENS.pole = {
  bare: true,
  html() {
    const P = poleData85();
    if (!P) return shellHtml(K85.empty(byLang('Ainda não houve classificação.', 'No qualifying yet.')));
    const { q, tr, grid, live } = P;
    const pid = grid[0]; const pd = Career.driver(G, pid); const pr = q.res[pid] || {}; const tc = teamColor(pd.team);
    const best = (did) => (q.res[did] || {}).best;
    const pole = best(pid);
    const face = K85.face(pd);
    const slot = (did, i) => { const d = Career.driver(G, did); const r = q.res[did] || {}; const mine = d && d.team === G.player.teamId; const b = r.best;
      return `<div class="pg-s ${i % 2 ? 'r' : 'l'} ${mine ? 'me' : ''}" style="--tc:${d ? teamColor(d.team) : '#888'}"><span class="pg-p">${i + 1}</span><i></i><span class="pg-n"><b>${esc(d ? shortName(d) : did)}</b><small>${esc(d ? Career.team(G, d.team).name : '')}</small></span><span class="pg-t n-num">${i === 0 ? (isFinite(b) ? fmtLap(b) : '') : isFinite(b) && isFinite(pole) ? '+' + (b - pole).toFixed(3) : r.eliminatedIn || ''}</span></div>`; };
    const mine = grid.map((did, i) => [did, i]).filter(([did]) => { const d = Career.driver(G, did); return d && d.team === G.player.teamId; });
    return `<div class="pole" style="--tc:${tc}">
      <div class="pole-ph">${face ? `<img src="${face}" alt="">` : ''}<span class="pole-num">${pd.number ?? 1}</span><span class="pole-tag">Pole position</span></div>
      <div class="pole-tx"><div class="pole-top"><button class="x-ibtn" data-act="back" aria-label="${byLang('Voltar', 'Back')}">${svg85(ICON85.back)}</button><span class="n-eyebrow">${natTag(tr.country)} ${esc(tr.gp)} · ${byLang('classificação', 'qualifying')}</span></div>
        <h1>${esc(pd.firstName || '')}<b>${esc(pd.lastName || pd.name)}</b></h1>
        <p class="pole-sub">${esc(Career.team(G, pd.team).name)} · <span class="n-num">${isFinite(pole) ? fmtLap(pole) : ''}</span>${grid[1] && isFinite(best(grid[1])) ? ` · ${byLang('vantagem de', 'by')} <span class="n-num">${(best(grid[1]) - pole).toFixed(3)} s</span>` : ''}</p>
        ${mine.length ? `<div class="pole-mine">${mine.map(([did, i]) => `<span>${K85.av(Career.driver(G, did), 34)}<b>${esc(rawName(did))}</b><em class="n-num">P${i + 1}</em></span>`).join('')}</div>` : ''}
        <span class="n-lbl">${byLang('Grid de largada', 'Starting grid')}</span>
        <div class="pg">${grid.map(slot).join('')}</div>
        <div class="pole-act">${live && G.weekend.phase === 'quali' ? K85.btn(byLang('Definir estratégia', 'Set strategy'), { act: 'toStrategy85', kind: 'primary' }) : ''}${K85.btn(byLang('Tempos completos', 'Full times'), { act: 'go', v: live ? 'weekend' : 'analysis' })}</div></div></div>`;
  },
};
ACT.toStrategy85 = () => { ACT.toStrategy(); go('weekend'); };
(function () {
  const f = ACT.qFinish; ACT.qFinish = (el) => { f(el); if (el.dataset.k !== 'SQ' && G.weekend && G.weekend.quali) go('pole'); };
  const s = ACT.qSimAll; ACT.qSimAll = (el) => { s(el); if (el.dataset.k !== 'SQ' && G.weekend && G.weekend.quali) go('pole'); };
  const r = ACT.runQuali; if (r) ACT.runQuali = (el) => { r(el); if (G.weekend && G.weekend.quali) go('pole'); };
})();

/* ---------- Pódio ---------- */
function fmtRace85(t) { if (!isFinite(t)) return ''; const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s2 = t % 60; return `${h ? h + ':' + String(m).padStart(2, '0') : m}:${s2.toFixed(3).padStart(6, '0')}`; }
SCREENS.podium = {
  bare: true,
  html() {
    const R = G.lastRace; const res = G.season.results[G.season.results.length - 1];
    if (!R || !res) return shellHtml(K85.empty(byLang('Ainda não houve corrida.', 'No race yet.')));
    const tr = Career.track(G, R.trackId); const hero = trackHero85(tr);
    const cls = res.cls; const top = cls.slice(0, 3); const win = Career.team(G, top[0].tid);
    const fl = res.fastest; const flD = fl && Career.driver(G, fl.did);
    const step = (r, i) => { const d = Career.driver(G, r.did); const t = Career.team(G, r.tid); const f = K85.face(d);
      return `<div class="pd p${i + 1}" style="--tc:${t.color}"><div class="pd-f">${f ? `<img src="${f}" alt="">` : ''}</div><div class="pd-plate"><span class="pd-pos">${i + 1}</span><span class="pd-name">${flagOnly(d.nat)}<b>${esc(d.lastName || shortName(d))}</b><small>${esc(t.name)}</small></span><span class="pd-gap n-num">${i === 0 ? fmtRace85(r.T) : '+' + (r.T - top[0].T).toFixed(3)}</span></div><div class="pd-step"><em>${i + 1}</em></div></div>`; };
    return `<div class="podium85" style="${hero ? `--img:url('${hero}')` : ''};--tw:${win.color}">
      <div class="pdm-conf" aria-hidden="true">${Array.from({ length: 40 }, (_, i) => `<i style="--x:${(i * 37) % 100}%;--d:${(i % 7) * 0.45}s;--c:${[win.color, '#ffffff', win.color2 || '#FFC93C', '#E10600'][i % 4]};--r:${(i * 53) % 360}deg"></i>`).join('')}</div>
      <header class="pdm-top"><span class="n-eyebrow">${natTag(tr.country)} ${esc(R.gp)} · ${R.laps} ${byLang('voltas', 'laps')}</span><h1>${byLang('Pódio', 'Podium')}</h1></header>
      <div class="pdm-row">${step(top[1], 1)}${step(top[0], 0)}${step(top[2], 2)}</div>
      <footer class="pdm-foot"><div class="pdm-b">${imgUrl(win.logo) ? `<img src="${imgUrl(win.logo)}" alt="">` : ''}<span><small>${byLang('Troféu de construtores', 'Constructors trophy')}</small><b>${esc(win.name)}</b></span></div>
        ${flD ? `<div class="pdm-b fl"><span class="pdm-ic">⏱</span><span><small>${byLang('Volta mais rápida', 'Fastest lap')}</small><b>${esc(flD.name)} · <span class="n-num">${fmtLap(fl.time)}</span></b></span></div>` : ''}
        <div class="pdm-act">${K85.btn(byLang('Continuar', 'Continue'), { act: 'go', v: 'post', kind: 'primary' })}</div></footer></div>`;
  },
};
(function () {
  const f = ACT.finishWeekend;
  ACT.finishWeekend = async (...a) => { const p = f(...a); if (G && !Career.isObs(G) && G.lastRace && G.lastRace.cars) go('podium'); return p; };
})();

/* ---------- Pós-corrida: resumo no topo ---------- */
(function () {
  const old = SCREENS.post; if (!old) return;
  SCREENS.post = {
    html() {
      const base = old.html.call(this);
      if (!G.lastRace || Career.isObs(G)) return base;
      const res = G.season.results[G.season.results.length - 1]; if (!res) return base;
      const mine = res.cls.filter(c => c.tid === G.player.teamId);
      const pts = mine.reduce((a, c) => a + (c.pts || 0), 0);
      const sc = Career.standingsC(G); const pos = sc.findIndex(x => x.tid === G.player.teamId) + 1;
      const band = `<section class="pst"><div class="pst-pts"><b class="n-num">+${pts}</b><span>${byLang('pontos para a', 'points for')} ${esc(Career.team(G).name)}</span><small>${ordinal(pos)} ${byLang('no Mundial de Construtores', 'in the Constructors')}</small></div>
        ${mine.map(c => { const d = Career.driver(G, c.did); const ch = c.grid - c.pos; return `<div class="pst-d">${K85.av(d, 50)}<span><b>${esc(d.name)}</b><small>${byLang('largou', 'started')} ${c.grid}º · ${c.pits ?? 0} ${byLang('parada(s)', 'stop(s)')}${c.status !== 'fin' && c.status !== 'lapped' ? ' · ' + esc(c.reason || byLang('abandono', 'DNF')) : ''}</small></span><span class="pst-p"><b class="n-num">${c.status === 'fin' || c.status === 'lapped' ? 'P' + c.pos : 'AB'}</b>${c.status === 'fin' || c.status === 'lapped' ? `<em class="${ch > 0 ? 'n-gain' : ch < 0 ? 'n-loss' : 'n-mu'}">${ch > 0 ? '▲' + ch : ch < 0 ? '▼' + -ch : '='}</em>` : ''}</span></div>`; }).join('')}
        </section>`;
      return band + base.replace(/<button class="btn" data-act="go" data-v="analysis">Análise de dados<\/button>/, '');
    },
    after() { if (old.after) old.after.call(this); },
  };
})();
podiumHtml = function () { return ''; };   // o pódio agora tem tela própria (ui85-race)
