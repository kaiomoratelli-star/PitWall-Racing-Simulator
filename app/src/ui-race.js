/* ============================================================
   PIT WALL — corrida ao vivo (estilo transmissão):
   apresentação do GP, luzes de largada, torre com setores,
   mapa, gráfico de líderes e Pit Wall na parte inferior.
   A velocidade da tela não altera a simulação (volta a volta, determinística).
   ============================================================ */
'use strict';

const RACE_SPEEDS = [[0.5, '½×', 3000], [1, '1×', 1500], [2, '2×', 750], [4, '4×', 350], [10, '10×', 140], [30, '30×', 45]];
function speedMs() { return (RACE_SPEEDS.find(s => s[0] === UI.raceSpeed) || RACE_SPEEDS[1])[2]; }
if (!UI.raceSpeed || UI.raceSpeed === 8 || UI.raceSpeed === 20) UI.raceSpeed = 1;

function circuitHistory(trackId) {
  if (!HIST) return null;
  const races = [];
  HIST.seasons.forEach(s => s.r.forEach(r => { if (r[3] === trackId && r[4][0]) races.push({ y: s.y, w: r[4][0], t: r[5][0] }); }));
  (G.archive || []).forEach(a => a.races.forEach(r => { if (r.t === trackId) races.push({ y: a.year, w: r.w, sim: true }); }));
  if (!races.length) return null;
  const cnt = {}; races.forEach(r => (cnt[r.w] = (cnt[r.w] || 0) + 1));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  return { n: races.length, last: races[races.length - 1], top: { id: top[0], wins: top[1] }, first: races[0].y };
}

function preRaceHtml(wk, race, tr) {
  const hero = imgUrl(tr.heroImg), map = imgUrl(tr.mapImg);
  const team = Career.isObs(G) ? G.db.teams[0] : Career.team(G);
  const lead = Career.lineup(G, team.id)[0];
  const fc = lead ? Engine.strategyForecast(tr, race.laps, Career.ctx(G).effOf(lead.id), team) : [];
  const ch = circuitHistory(tr.id);
  const al = Engine.alloc(tr);
  const w0 = wk.weather;
  return `<div class="panel race-intro">
    <div class="hero intro-hero" ${hero ? `style="background-image:url('${hero}')"` : ''}>
      <div class="intro-title"><div class="eyebrow">${esc(G.db.rules.seriesName)} · Etapa ${wk.round + 1}${tr.sprint ? ' · Sprint' : ''}</div><h1>${esc(tr.gp)}</h1><div class="small" style="color:var(--fg2)">${esc(tr.circuit)} · ${esc(tr.place || '')} ${natTag(tr.country)} · ${esc(gpDate(tr))}</div></div>
    </div>
    <div class="panel-b grid g3">
      <div class="stack" style="gap:8px">
        <h4>Ficha técnica</h4>
        <dl class="kv"><dt>Voltas</dt><dd>${race.laps}</dd><dt>Distância</dt><dd>${(race.laps * tr.length).toFixed(1)} km</dd><dt>Extensão</dt><dd>${tr.length.toFixed(3)} km</dd>${tr.turns ? `<dt>Curvas</dt><dd>${tr.turns}</dd>` : ''}<dt>Tipo</dt><dd>${tr.street ? 'Rua' : 'Permanente'}</dd><dt>Perda no pit</dt><dd>${tr.pitLoss.toFixed(1)} s</dd><dt>Zonas de ${race.boostName}</dt><dd>${tr.drs}</dd><dt>Volta de referência</dt><dd>${fmtLap(tr.baseLap)}</dd></dl>
        ${map ? `<div class="officialmap"><img src="${map}" alt="Traçado oficial"></div>` : ''}
      </div>
      <div class="stack" style="gap:8px">
        <h4>Condições</h4>
        <div class="forecast"><div class="fc"><span class="label">Ar</span><b>${w0.air ? w0.air[1] : '—'}°C</b></div><div class="fc"><span class="label">Pista</span><b>${w0.trackT ? w0.trackT[1] : '—'}°C</b></div><div class="fc"><span class="label">Umidade</span><b>${w0.humidity ?? '—'}%</b></div><div class="fc"><span class="label">Vento</span><b>${w0.wind ?? '—'} km/h</b></div></div>
        <div class="small">${w0.time === 'night' ? 'Corrida noturna' : w0.time === 'dusk' ? 'Largada ao entardecer' : 'Corrida de dia'} · chuva: ${wk.forecast.race.map((p, i) => `${['início', 'meio', 'fim'][i]} ${p}%`).join(', ')}</div>
        <h4 style="margin-top:6px">Pneus Pirelli</h4>
        <div class="row" style="gap:10px">${['H', 'M', 'S'].map((c, i) => `<span class="row" style="gap:6px">${tyreIcon(c)}<span class="small"><b>${TYRES[c].name}</b> C${al[i]}</span></span>`).join('')}</div>
        <p class="small muted">${Engine.allocReal(tr) ? 'Escolha anunciada pela Pirelli para 2026.' : 'Escolha estimada pelo perfil da pista.'}</p>
        <h4 style="margin-top:6px">Estratégia prevista</h4>
        ${fc.map((o, i) => `<div class="row small" style="gap:6px">${o.plan.map(c => tyreIcon(c)).join('<span class="muted">→</span>')}<span>${o.stops} parada${o.stops > 1 ? 's' : ''}</span><span class="muted">${i === 0 ? 'mais rápida' : '+' + o.delta + 's'}</span></div>`).join('')}
      </div>
      <div class="stack" style="gap:8px">
        <h4>História do GP</h4>
        ${ch ? `<dl class="kv"><dt>Corridas aqui</dt><dd>${ch.n} (desde ${ch.first})</dd><dt>Último vencedor</dt><dd>${esc(hName(ch.last.w))} (${ch.last.y}${ch.last.sim ? ', simulado' : ''})</dd><dt>Maior vencedor</dt><dd>${esc(hName(ch.top.id))} · ${ch.top.wins}</dd></dl>` : '<p class="small muted">Primeira corrida neste circuito.</p>'}
        <button class="btn sm" data-act="circuitPage" data-id="${tr.id}" style="margin-top:8px">Recordes e vencedores</button>
        <h4 style="margin-top:6px">Grid</h4>
        <div class="stack" style="gap:3px">${wk.grid.slice(0, 6).map((did, i) => `<div class="row small" style="gap:6px"><b class="num" style="width:22px">${i + 1}</b>${dTag(did)}</div>`).join('')}</div>
        <button class="btn primary lg" data-act="lightsOut" style="margin-top:8px">Luzes vermelhas</button>
      </div>
    </div></div>`;
}

SCREENS.race = {
  html() {
    const wk = G.weekend;
    if (!wk || !wk.race) return '<div class="empty">Nenhuma corrida em andamento.</div>';
    const race = wk.race; const tr = Career.track(G, wk.trackId);
    return `${race.lap === 0 && !race.finished ? preRaceHtml(wk, race, tr) : ''}
    <div class="panel race-hud" id="hud"></div>
    <div class="race-grid">
      <div class="panel tower" id="tower"></div>
      <div class="stack">
        <div class="panel"><div class="trackbox"><canvas id="raceMap"></canvas><div class="wx" id="wx"></div></div></div>
        <div class="panel"><div class="panel-h"><h3>Evolução da liderança</h3><span class="small muted">Quem liderou cada volta e a posição dos 8 primeiros</span></div><div class="panel-b" id="leaderChart"></div></div>
        <div class="panel"><div class="panel-h"><h3>Rádio e direção de prova</h3></div><div class="feed" id="feed"></div></div>
      </div>
    </div>
    <div class="panel pitwall" id="ctl"></div>
    <div id="raceEnd"></div>
    <div id="lights" class="lights" hidden><div class="lights-row">${[0, 1, 2, 3, 4].map(i => `<span class="lamp" id="lamp${i}"><i></i><i></i></span>`).join('')}</div></div>`;
  },
  after() { UI.tickStart = performance.now(); updateRace(true); startRaceAnim(); if (!UI.racePaused && !G.weekend.race.finished) scheduleTick(); },
};

/* luzes de largada: cinco luzes acendem e apagam juntas */
ACT.lightsOut = () => {
  const box = $('#lights'); if (!box) return;
  box.hidden = false;
  if (typeof Sound !== 'undefined') Sound.prime();
  const intro = $('.race-intro'); if (intro) intro.remove();
  let i = 0;
  const on = () => {
    const l = $('#lamp' + i); if (l) l.classList.add('on');
    if (typeof Sound !== 'undefined') Sound.beep(i);
    i++;
    if (i < 5) setTimeout(on, 650);
    else setTimeout(() => { $$('.lamp').forEach(x => x.classList.remove('on')); if (typeof Sound !== 'undefined') Sound.go(); setTimeout(() => { box.hidden = true; }, 500); UI.racePaused = false; UI.tickStart = performance.now(); scheduleTick(); updateRace(); }, 400 + Math.random() * 1600);
  };
  setTimeout(on, 500);
};

function flagHtml(race) {
  if (race.finished) return '<span class="flag chk">Bandeirada</span>';
  if (race.sc) return race.sc.type === 'SC' ? '<span class="flag sc">Safety Car</span>' : race.sc.type === 'RED' ? '<span class="flag red">Bandeira vermelha</span>' : '<span class="flag vsc">VSC</span>';
  if (race.lap === 0) return '<span class="flag" style="background:var(--panel2)">Grid formado</span>';
  return '<span class="flag green">Bandeira verde</span>';
}
function secCell(c, k, race) {
  const v = c.lastS ? c.lastS[k] : null;
  if (v == null) return '<i class="sec"></i>';
  const cls = race.bestS[k] != null && v <= race.bestS[k] + 1e-6 ? 'p' : c.bestS[k] != null && v <= c.bestS[k] + 1e-6 ? 'g' : 'y';
  return `<i class="sec ${cls}" title="S${k + 1}: ${v.toFixed(3)}"></i>`;
}
function tempClass(track, code, temp) {
  const p = Engine.tprops(track, code);
  return temp < p.lo ? 'cold' : temp > p.hi ? 'hot' : 'ok';
}

function updateRace(full) {
  const wk = G.weekend; if (!wk || !wk.race) return;
  const race = wk.race, tr = Career.track(G, wk.trackId);
  const L = race.lap;
  const w = race.wet[Math.max(1, L)] || 0;
  const hud = $('#hud');
  if (hud) hud.innerHTML = `
    <div class="lapcount num">${Math.min(L, race.laps)}<small>/${race.laps}</small></div>
    ${flagHtml(race)}
    <span class="chip" style="${w > 0.2 ? 'color:var(--blue)' : ''}">Pista ${Engine.wetLabel(w).toLowerCase()}</span>
    ${race.fastest ? `<span class="chip"><span class="pur">Volta mais rápida</span> ${dName(race.fastest.did)} ${fmtLap(race.fastest.time)}</span>` : ''}
    <span class="spacer"></span>
    ${L === 0 && !race.finished ? '<button class="btn primary" data-act="lightsOut">Largar</button>' : `<button class="btn ${UI.racePaused ? 'primary' : ''}" data-act="racePlay" ${race.finished ? 'disabled' : ''}>${UI.racePaused ? 'Continuar' : 'Pausar'}</button>`}
    <button class="btn" data-act="raceStep" ${race.finished ? 'disabled' : ''}>+1 volta</button>
    ${segBtns('raceSpeed', UI.raceSpeed, RACE_SPEEDS.map(s => [s[0], s[1]]))}
    <button class="btn ghost" data-act="raceSkip" ${race.finished ? 'disabled' : ''}>Simular até o fim</button>
    <button class="btn ghost sm" data-act="soundToggle" aria-label="${Sound.on ? 'Desligar som' : 'Ligar som'}" title="${Sound.on ? 'Desligar som' : 'Ligar som'}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/>${Sound.on ? '<path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>' : '<path d="M17 9l5 6M22 9l-5 6"/>'}</svg></button>`;
  const wx = $('#wx');
  if (wx && wk.weather.air) wx.innerHTML = `<span>Ar <b>${wk.weather.air[Math.max(1, L)]}°</b></span><span>Pista <b>${wk.weather.trackT[Math.max(1, L)]}°</b></span><span>Umid. <b>${wk.weather.humidity}%</b></span><span>Vento <b>${wk.weather.wind} km/h</b></span>`;
  // torre
  const cars = race.cars.slice().sort((a, b) => a.pos - b.pos);
  const lead = cars[0];
  const tower = $('#tower');
  if (tower) tower.innerHTML = `<table><thead><tr><th></th><th></th><th></th><th></th><th class="gp">Líder</th><th class="gp">Int.</th><th>Pneu</th><th></th><th>Setores</th><th class="gp">Última</th><th></th></tr></thead><tbody>${cars.map((c, i) => {
    const mine = c.tid === G.player.teamId, prev = cars[i - 1];
    let gap = '';
    if (c.status === 'dnf') gap = '<span class="neg">AB</span>';
    else if (race.finished && c.lapsDown) gap = `+${c.lapsDown} v`;
    else if (i === 0) gap = L ? 'Líder' : '';
    else gap = L ? fmtGap(c.T - lead.T) : '';
    const intv = c.status !== 'dnf' && i > 0 && prev && prev.status !== 'dnf' && L ? (c.T - prev.T).toFixed(1) : '';
    const ch = c.grid - c.pos;
    return `<tr class="${mine ? 'me' : ''} ${c.status === 'dnf' ? 'out' : ''} ${c._flash ? 'flash' : ''}">
      <td class="p">${c.pos}</td><td style="width:6px;padding:0"><span class="tcolor" style="background:${teamColor(c.tid)}"></span></td>
      <td class="nm">${dName(c.did)}${c.pendingPen ? ` <span class="chip bad">+${c.pendingPen}s</span>` : ''}${c.drs && !race.finished ? ` <span class="chip good" title="${race.boostName}">${race.boostName === 'DRS' ? 'DRS' : tr('MU', 'OM')}</span>` : ''}</td>
      <td class="small ${ch > 0 ? 'pos' : ch < 0 ? 'neg' : 'muted'} num">${L ? (ch > 0 ? '▲' + ch : ch < 0 ? '▼' + -ch : '–') : ''}</td>
      <td class="gp">${gap}</td><td class="gp muted">${intv}</td>
      <td>${c.status === 'dnf' ? '' : tyreIcon(c.tyre.c)}</td>
      <td class="num small ${c.status === 'dnf' ? 'muted' : tempClass(tr, c.tyre.c, c.tyre.temp)}" title="Desgaste ${Math.round(c.tyre.wear)}% · ${Math.round(c.tyre.temp)}°C">${c.status === 'dnf' ? esc((c.dnfReason || '').split(' ')[0]) : Math.round(c.tyre.wear) + '%'}</td>
      <td class="secs">${c.status === 'dnf' ? '' : [0, 1, 2].map(k => secCell(c, k, race)).join('')}</td>
      <td class="num small ${c.best && race.fastest && c.best === race.fastest.time ? 'pur' : 'muted'}">${c.lastLap && c.status !== 'dnf' ? fmtLap(c.lastLap) : ''}</td>
      <td class="num small muted">${c.pits ? 'P' + c.pits : ''}</td></tr>`;
  }).join('')}</tbody></table>`;
  cars.forEach(c => { c._flash = false; });
  // gráfico de líderes (atualiza a cada 2 voltas)
  const lc = $('#leaderChart');
  if (lc && (full || L % 2 === 0 || race.finished)) lc.innerHTML = leaderChartHtml(race);
  pitWallHtml(race, wk, tr, cars);
  const feed = $('#feed');
  if (feed) feed.innerHTML = race.events.slice().reverse().slice(0, 80).map(e => `<div class="${e.type}"><span class="l">V${e.lap}</span><span>${esc(e.text)}</span></div>`).join('') || '<div><span class="l">—</span><span class="muted">Carros alinhados no grid.</span></div>';
  const end = $('#raceEnd'); if (end) end.innerHTML = race.finished ? raceEndHtml(race) : '';
  if (typeof Sound !== 'undefined') Sound.raceUpdate(race);
}

function leaderChartHtml(race) {
  const L = Math.min(race.lap, race.laps);
  if (L < 1) return '<div class="empty small">O gráfico aparece após a largada.</div>';
  const leaders = [];
  for (let l = 1; l <= L; l++) { const c = race.cars.find(x => x.positions[l] === 1); leaders.push(c ? c.tid : null); }
  const strip = `<div class="leadstrip">${leaders.map((tid, i) => `<i style="background:${tid ? teamColor(tid) : 'transparent'}" title="Volta ${i + 1}: ${tid ? esc(Career.team(G, tid).name) : ''}"></i>`).join('')}</div>`;
  const top = race.cars.filter(c => c.status !== 'dnf').sort((a, b) => a.pos - b.pos).slice(0, 8);
  const used = {};
  const series = top.map(c => { const col = teamColor(c.tid); const dash = used[col] ? '5 4' : null; used[col] = true; return { name: rawName(c.did), color: col, dash, width: c.tid === G.player.teamId ? 2.6 : 1.6, pts: [[0, c.grid]].concat(c.positions.map((p, l) => (l && p != null ? [l, p] : null)).filter(Boolean)) }; });
  UI.charts = UI.charts || {};
  const html = lineChart('lead', { series, h: 200, xLabel: 'Volta', invert: true, yMin: 1, yMax: Math.max(8, race.cars.length), yFmt: v => 'P' + Math.round(v), tipFmt: v => 'P' + v, legend: false });
  setTimeout(bindCharts, 0);
  return strip + html;
}

function pitWallHtml(race, wk, tr, cars) {
  const ctl = $('#ctl'); if (!ctl) return;
  const obs = Career.isObs(G);
  if (obs && !UI.followTeam) UI.followTeam = cars[0] ? cars[0].tid : G.db.teams[0].id;
  const tid = obs ? UI.followTeam : G.player.teamId;
  const mine = race.cars.filter(c => c.tid === tid);
  const card = (c) => {
    const i = cars.indexOf(c), ahead = cars[i - 1], behind = cars[i + 1];
    const props = Engine.tprops(tr, c.tyre.c);
    const wearRate = Engine.wearRate(c.tyre.c, tr, Career.ctx(G).effOf(c.did), Career.team(G, c.tid), c.mode, race.wet[race.lap] || 0, c.tyre.temp);
    const lapsTo70 = Math.max(0, Math.round((70 - c.tyre.wear) / Math.max(0.3, wearRate)));
    const radio = c.status === 'run' ? Events.radio(race, c, wk) : [];
    if (c.status === 'run' && c.tyre.temp > props.hi) radio.push(`Pneus superaquecendo (${Math.round(c.tyre.temp)}°C).`);
    if (c.status === 'run' && c.tyre.temp < props.lo && c.tyre.age > 1) radio.push(`Pneus frios (${Math.round(c.tyre.temp)}°C), sem aderência.`);
    if (c.status === 'run' && (c.soc ?? 100) < 15) radio.push('Bateria baixa: economize energia.');
    const gapA = ahead && c.status === 'run' && ahead.status === 'run' ? (c.T - ahead.T) : null;
    const gapB = behind && behind.status === 'run' && c.status === 'run' ? (behind.T - c.T) : null;
    const ctrl = !obs && c.status === 'run' && !race.finished;
    return `<div class="pw-car">
      <div class="row between"><div class="row" style="gap:10px;flex-wrap:nowrap">${headshot(Career.driver(G, c.did), 'sm')}<span class="big num">P${c.pos}</span><div>${dTag(c.did)}<div class="small muted">Largou em ${c.grid} · ${c.pits} parada(s)${c.lastStop ? ` · última ${c.lastStop}s` : ''}${c.damage.wing ? ' · <span class="neg">asa danificada</span>' : ''}${c.damage.power ? ' · <span class="neg">perda de potência</span>' : ''}</div></div></div>
      ${c.status !== 'run' ? `<span class="chip bad">${c.status === 'fin' ? 'Terminou' : esc(c.dnfReason || 'Abandono')}</span>` : ''}</div>
      ${c.status === 'run' ? `<div class="pw-grid">
        <div><span class="label">À frente</span><b>${gapA != null ? `${esc(rawName(ahead.did))} ${gapA.toFixed(1)}s` : '—'}</b></div>
        <div><span class="label">Atrás</span><b>${gapB != null ? `${esc(rawName(behind.did))} ${gapB.toFixed(1)}s` : '—'}</b></div>
        <div><span class="label">Pneu</span><b>${tyreIcon(c.tyre.c)} ${props.name} · ${c.tyre.age}v</b></div>
        <div><span class="label">Desgaste</span>${bar(c.tyre.wear, 100, c.tyre.wear > 70 ? 'r' : '')}<span class="small num">${Math.round(c.tyre.wear)}% · ~${lapsTo70} v até 70%</span></div>
        <div><span class="label">Temperatura</span><b class="${tempClass(tr, c.tyre.c, c.tyre.temp)}">${Math.round(c.tyre.temp)}°C</b><span class="small muted"> janela ${props.lo}–${props.hi}</span></div>
        <div><span class="label">Bateria</span>${bar(c.soc ?? 100, 100, (c.soc ?? 100) < 20 ? 'r' : 'g')}<span class="small num">${Math.round(c.soc ?? 100)}%</span></div>
        <div><span class="label">Plano</span><b>${c.plan.stops} parada(s)${c.auto ? ' · automático' : ' · manual'}</b></div>
        <div><span class="label">Velocidade máx.</span><b class="num">${c.vmax || '—'} km/h</b></div>
      </div>` : ''}
      ${ctrl ? `<div class="row">${segBtns('carMode', c.mode, [['save', 'Poupar energia'], ['normal', 'Normal'], ['push', 'Atacar']], `data-d="${c.did}"`)}
        <button class="btn sm ${c.auto ? '' : 'primary'}" data-act="carAuto" data-d="${c.did}">${c.auto ? 'Paradas: automático' : 'Paradas: manual'}</button></div>
      <div class="row"><span class="small muted">Box:</span>${['S', 'M', 'H', 'I', 'W'].map(t => `<button class="btn sm ${c.pitReq === t ? 'primary' : ''}" data-act="carPit" data-d="${c.did}" data-c="${t}" title="${esc(Engine.tyreLabel(tr, t))}">${tyreIcon(t)}</button>`).join('')}${c.pitReq ? `<span class="chip acc">Box nesta volta: ${esc(Engine.tyreLabel(tr, c.pitReq))}</span>` : ''}</div>` : ''}
      ${radio.length && c.status === 'run' ? `<div class="radio">Engenheiro${(() => { const s = Staff.get(Career.team(G, c.tid), mine.indexOf(c) === 0 ? 'raceEng1' : 'raceEng2'); return s ? ` (${esc(s.name)})` : ''; })()}: ${esc(radio.join(' '))}</div>` : ''}
    </div>`;
  };
  ctl.innerHTML = `<div class="panel-h"><h3>Pit Wall${obs ? ' · acompanhamento' : ''}</h3>
    ${obs ? `<select class="inp" style="width:auto" data-chg="followTeam" aria-label="Equipe">${G.db.teams.map(t => opt(t.id, t.name, tid)).join('')}</select>` : (mine.filter(c => c.status === 'run').length === 2 && !race.finished ? '<button class="btn sm" data-act="teamOrder">Ordem de equipe: trocar posições</button>' : '')}</div>
    <div class="pw-cars">${mine.map(card).join('')}</div>`;
}
CHG.followTeam = (el) => { UI.followTeam = el.value; updateRace(); };

/* detecta ultrapassagens para o efeito visual na torre */
const _stepRace = Career.stepRace;
Career.stepRace = (G2) => {
  const before = {}; (G2.weekend.race.cars || []).forEach(c => (before[c.did] = c.pos));
  const r = _stepRace(G2);
  r.cars.forEach(c => { if (before[c.did] && c.pos < before[c.did] && c.status === 'run') c._flash = true; });
  return r;
};
