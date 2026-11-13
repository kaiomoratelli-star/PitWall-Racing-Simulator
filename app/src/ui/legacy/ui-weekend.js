/* ============================================================
   PIT WALL — fim de semana: treinos, classificação, estratégia,
   corrida ao vivo, resultado e análise de dados
   ============================================================ */
'use strict';

function wkHead(sub) {
  const tr = Career.track(G, G.weekend.trackId);
  const fc = G.weekend.forecast;
  return `<div class="page-head"><div><div class="eyebrow">Etapa ${G.weekend.round + 1} · ${esc(tr.circuit)}</div><h1>${esc(tr.gp)}</h1></div>
    <div class="row"><span class="chip">Chuva: classif. ${fc.quali}% · corrida ${fc.race.join('/')}%</span>${sub || ''}</div></div>${stepsHtml(G.weekend.phase)}`;
}

SCREENS.weekend = {
  html() {
    if (Career.isObs(G)) { setTimeout(() => go(G.weekend && G.weekend.race ? 'race' : 'hub'), 0); return ''; }
    if (!G.weekend) return typeof noSession85 === 'function' ? noSession85(byLang('Nenhum fim de semana em andamento.', 'No race weekend in progress.')) : `<div class="empty">Nenhum fim de semana em andamento.</div>`;
    const ph = G.weekend.phase;
    if (ph === 'practice') return practiceHtml();
    if (ph === 'quali') return qualiHtml();
    if (ph === 'strategy') return strategyHtml();
    if (ph === 'race') { setTimeout(() => go('race'), 0); return ''; }
    return '';
  },
  after() { bindCharts(); },
};

/* treinos livres: ver ui-practice.js */

/* ---------- classificação ---------- */
function qualiHtml() {
  const wk = G.weekend;
  const lineup = Career.lineup(G, G.player.teamId);
  if (!wk.quali) {
    return `${wkHead()}
    <div class="grid g2">${lineup.map(d => `<div class="panel"><div class="panel-h">${dTag(d.id)}<span class="chip">Confiança ${wk.setups[d.id].conf ?? '—'}% · acerto classif. ${Math.round((wk.setups[d.id].qQ ?? wk.setups[d.id].q ?? 0) * 100)}%</span></div><div class="panel-b stack">
      <span class="label">Postura na volta rápida</span>
      ${segBtns('qRisk', wk.qualiRisk[d.id], [['safe', 'Segura'], ['normal', 'Normal'], ['push', 'No limite']], `data-d="${d.id}"`)}
      <p class="small muted">No limite: mais rápido em média, mas com mais chance de erro ou batida. Segura: quase sem erros, um pouco mais lento.</p>
    </div></div>`).join('')}</div>
    <div class="callout">Previsão para a classificação: <b>${wk.forecast.quali}% de chance de chuva</b>.</div>
    <div class="row" style="justify-content:flex-end"><button class="btn primary lg" data-act="runQuali">Disputar a classificação</button></div>`;
  }
  const q = wk.quali;
  const pole = q.res[q.order[0]].best;
  return `${wkHead()}
  <div class="panel"><div class="panel-h"><h3>Grid de largada</h3>${q.wet > 0.15 ? '<span class="chip" style="color:var(--blue)">Classificação com chuva</span>' : ''}</div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Pos</th><th>Piloto</th><th>Equipe</th>${q.sessions.map(s => `<th class="r">${s}</th>`).join('')}<th class="r">Gap</th><th>Observações</th></tr></thead><tbody>
    ${wk.grid.map((did, i) => { const r = q.res[did]; const mine = r.tid === G.player.teamId; return `<tr class="${mine ? 'me' : ''}"><td class="num">${i + 1}</td><td>${dTag(did)}</td><td class="small muted">${esc(Career.team(G, r.tid).short)}</td>${q.sessions.map(s => `<td class="r num ${r.times[s] === pole ? 'pur' : ''}">${r.times[s] != null ? (isFinite(r.times[s]) ? fmtLap(r.times[s]) : 'sem tempo') : ''}</td>`).join('')}<td class="r num">${r.best && i ? fmtGap(r.best - pole) : ''}</td><td class="small muted">${esc(r.incidents.join('; '))}${r.pos !== i + 1 ? ' · punição de grid' : ''}</td></tr>`; }).join('')}
  </tbody></table></div></div>
  <div class="row" style="justify-content:flex-end"><button class="btn primary lg" data-act="toStrategy">Definir estratégia</button></div>`;
}
ACT.qRisk = (el) => { G.weekend.qualiRisk[el.dataset.d] = el.dataset.val; render(); };
ACT.runQuali = () => { Career.runQualifying(G); G.weekend.phase = 'quali'; autosave(); render(); };
ACT.toStrategy = () => { G.weekend.phase = 'strategy'; render(); };

/* ---------- estratégia ---------- */
function sprintPanel(cls, title = 'Resultado da corrida Sprint') {
  if (!cls) return '';
  return `<div class="panel"><div class="panel-h"><h3>${title}</h3><span class="chip acc">Sprint</span></div><div class="panel-b tight tbl-wrap"><table class="tbl">${cls.slice(0, 10).map(c => `<tr class="${c.tid === G.player.teamId ? 'me' : ''}"><td class="num">${c.status === 'dnf' ? 'AB' : c.pos}</td><td>${dTag(c.did)}</td><td class="small muted">${esc(Career.team(G, c.tid).name)}</td><td class="r num"><b>${c.pts || ''}</b></td></tr>`).join('')}</table></div></div>`;
}
function strategyHtml() {
  const wk = G.weekend;
  const tr = Career.track(G, wk.trackId);
  const lineup = Career.lineup(G, G.player.teamId);
  const team = Career.team(G);
  const laps = Math.round(tr.laps * (G.db.rules.raceDistancePct || 100) / 100);
  const ctx = Career.ctx(G);
  const life = (c, d) => Math.round(70 / Engine.wearRate(c, tr, ctx.effOf(d.id), team, 'normal', 0));
  return `${wkHead()}
  ${wk.sprintResult ? sprintPanel(wk.sprintResult.cls) : ''}
  <div class="grid g2">${lineup.map(d => {
    const st = wk.strategy[d.id];
    return `<div class="panel"><div class="panel-h">${dTag(d.id)}<span class="chip">Larga em ${ordinal(wk.grid.indexOf(d.id) + 1)}</span></div><div class="panel-b stack">
      <span class="label">Pneu de largada</span>
      <div class="row">${['S', 'M', 'H', 'I', 'W'].map(c => `<button class="btn sm ${st.startTyre === c ? 'primary' : ''}" data-act="stTyre" data-d="${d.id}" data-c="${c}">${tyreIcon(c)} ${TYRES[c].name}</button>`).join('')}</div>
      <div class="small muted">Voltas até a vida do pneu cair para 30%: ${['S', 'M', 'H'].map(c => `${TYRES[c].name} ~${life(c, d)} voltas`).join(' · ')} (corrida de ${laps} voltas)</div>
      <span class="label">Plano de paradas</span>
      ${segBtns('stStops', st.stops, [[1, '1 parada'], [2, '2 paradas'], [3, '3 paradas']], `data-d="${d.id}"`)}
      <label class="field"><span>Parar quando a vida do pneu cair para ${100 - st.pitWear}%</span><input type="range" min="45" max="90" step="1" value="${st.pitWear}" data-inp="stWear" data-d="${d.id}" id="sw-${d.id}"></label>
      <label class="check"><input type="checkbox" ${st.auto ? 'checked' : ''} data-chg="stAuto" data-d="${d.id}"> Engenheiro decide as paradas automaticamente (você ainda pode chamar o piloto quando quiser)</label>
    </div></div>`;
  }).join('')}</div>
  <div class="grid g2">
    <div class="panel"><div class="panel-h"><h3>Grid</h3></div><div class="panel-b tight tbl-wrap" style="max-height:340px;overflow:auto"><table class="tbl">${wk.grid.map((did, i) => `<tr class="${Career.driver(G, did).team === team.id ? 'me' : ''}"><td class="num">${i + 1}</td><td>${dTag(did)}</td></tr>`).join('')}</table></div></div>
    <div class="panel"><div class="panel-h"><h3>Condições</h3></div><div class="panel-b stack">
      <div class="forecast">${wk.forecast.race.map((p, i) => `<div class="fc"><span class="label">${['Início', 'Meio', 'Fim'][i]}</span><b>${p}%</b></div>`).join('')}</div>
      <dl class="kv"><dt>Estresse de pneus</dt><dd>${tr.tyreStress.toFixed(2)}×</dd><dt>Perda no pit</dt><dd>${tr.pitLoss.toFixed(1)} s</dd><dt>Ultrapassagem</dt><dd>${Math.round(tr.overtaking * 100)}%</dd><dt>Regra de 2 compostos</dt><dd>${G.db.rules.mandatoryTwoCompounds ? 'Sim (corrida seca)' : 'Não'}</dd></dl>
      <button class="btn primary lg" data-act="startRace">Luzes se apagam</button>
    </div></div>
  </div>`;
}
ACT.stTyre = (el) => { G.weekend.strategy[el.dataset.d].startTyre = el.dataset.c; render(); };
ACT.stStops = (el) => { G.weekend.strategy[el.dataset.d].stops = +el.dataset.val; render(); };
CHG.stWear = (el) => { G.weekend.strategy[el.dataset.d].pitWear = +el.value; const lab = el.closest('label').querySelector('span'); if (lab) lab.textContent = byLang(`Parar quando a vida do pneu cair para ${100 - el.value}%`, `Pit when tyre life drops to ${100 - el.value}%`); };
CHG.stAuto = (el) => { G.weekend.strategy[el.dataset.d].auto = el.checked; };
ACT.startRace = () => { Career.startRace(G); autosave(); UI.racePaused = true; UI.raceError = null; go('race'); };

/* ---------- corrida ao vivo ---------- */
const SPEEDS = [[1, '1×', 1300], [2, '2×', 650], [4, '4×', 300], [8, '8×', 140], [20, '20×', 45]];

function scheduleTick() {
  clearTimeout(UI.raceTimer);
  UI.raceTimer = setTimeout(() => {
    if (UI.view !== 'race' || !G || !G.weekend || !G.weekend.race) return;
    if (UI.racePaused) return;
    // simulação e tela separadas: um erro de desenho não para a corrida; um erro na
    // simulação pausa a corrida com aviso (sem repetir o mesmo passo quebrado sem parar)
    try { Career.stepRace(G); } catch (e) { UI.racePaused = true; reportError('simulação da corrida', e); UI.raceError = String(e && e.message || e); try { updateRace(); } catch (x) { /* já registrado */ } return; }
    UI.tickStart = performance.now();
    try { updateRace(); } catch (e) { reportError('tela da corrida', e); }
    if (G.weekend.race.finished) { UI.racePaused = true; autosave(); return; }
    scheduleTick();
  }, speedMs());
}
function stopRaceLoop() { clearTimeout(UI.raceTimer); cancelAnimationFrame(UI.anim); UI.racePaused = true; }
ACT.racePlay = () => { if (G.weekend.race.finished) return; UI.racePaused = !UI.racePaused; if (!UI.racePaused) { UI.tickStart = performance.now(); scheduleTick(); } updateRace(); };
ACT.raceSpeed = (el) => { UI.raceSpeed = +el.dataset.val; if (!UI.racePaused) scheduleTick(); updateRace(); };
ACT.raceStep = () => { if (G.weekend.race.finished) return; UI.racePaused = true; try { Career.stepRace(G); } catch (e) { reportError('simulação da corrida', e); UI.raceError = String(e && e.message || e); } UI.tickStart = performance.now(); updateRace(); };
ACT.raceSkip = () => { UI.racePaused = true; clearTimeout(UI.raceTimer); Career.simRaceToEnd(G); autosave(); updateRace(true); };
ACT.carMode = (el) => { const c = G.weekend.race.cars.find(x => x.did === el.dataset.d); if (c) c.mode = el.dataset.val; updateRace(); };
ACT.carPit = (el) => { const c = G.weekend.race.cars.find(x => x.did === el.dataset.d); if (c && c.status === 'run') { c.pitReq = c.pitReq === el.dataset.c ? null : el.dataset.c; } updateRace(); };
ACT.carAuto = (el) => { const c = G.weekend.race.cars.find(x => x.did === el.dataset.d); if (c) c.auto = !c.auto; updateRace(); };
ACT.teamOrder = () => {
  const race = G.weekend.race;
  const mine = race.cars.filter(c => c.tid === G.player.teamId && c.status === 'run').sort((a, b) => a.pos - b.pos);
  if (mine.length < 2) return;
  const [a, b] = mine;
  if (a.pos + 1 !== b.pos) return toast('Os carros precisam estar em posições seguidas.', 'bad');
  const ta = a.T; a.T = b.T + 0.4; b.T = ta;
  Engine.event(race, 'order', `Ordem de equipe: ${dName(a.did)} deixa ${dName(b.did)} passar.`, a.did);
  const da = Career.driver(G, a.did), db = Career.driver(G, b.did);
  da.morale = clamp(da.morale - 8, 1, 100); db.morale = clamp(db.morale + 2, 1, 100);
  // reordena
  const run = race.cars.filter(c => c.status === 'run').sort((x, y) => x.T - y.T);
  run.forEach((c, i) => (c.pos = i + 1));
  toast(`${da.name} obedeceu, mas não ficou feliz.`);
  updateRace();
};



function raceEndHtml(race) {
  const cls = race.classification;
  return `<div class="panel" style="margin-top:14px;border-color:var(--accent)"><div class="panel-h"><h2>Resultado final</h2><button class="btn primary lg" data-act="finishWeekend">Encerrar fim de semana</button></div>
  <div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Pos</th><th>Piloto</th><th>Equipe</th><th class="r">Largada</th><th class="r">Tempo/Gap</th><th class="r">Melhor volta</th><th class="r">Paradas</th><th class="r">Pontos</th></tr></thead><tbody>
  ${cls.map((did, i) => { const c = race.cars.find(x => x.did === did); const w = race.cars.find(x => x.did === cls[0]); return `<tr class="${c.tid === G.player.teamId ? 'me' : ''}"><td class="num">${c.status === 'dnf' ? 'AB' : i + 1}</td><td>${dTag(did)}</td><td class="small muted">${esc(Career.team(G, c.tid).name)}</td><td class="r num">${c.grid}</td><td class="r num">${c.status === 'dnf' ? esc(c.dnfReason) : i === 0 ? fmtRaceTime(c.T) : c.lapsDown ? `+${c.lapsDown} volta(s)` : fmtGap(c.T - w.T)}</td><td class="r num ${race.fastest && race.fastest.did === did ? 'pur' : ''}">${fmtLap(c.best)}</td><td class="r num">${c.pits}</td><td class="r num"><b>${race.points[did] || ''}</b></td></tr>`; }).join('')}
  </tbody></table></div></div>`;
}

function startRaceAnim() {
  cancelAnimationFrame(UI.anim);
  const wk = G.weekend; const tr = Career.track(G, wk.trackId);
  const loop = () => { try { frame(); } catch (e) { reportError('mapa da corrida', e); } };
  const frame = () => {
    const cv = $('#raceMap');
    if (!cv || !G || !G.weekend || !G.weekend.race) return;
    const race = G.weekend.race;
    const L = race.lap;
    const phase = race.finished || UI.racePaused ? 0.999 : clamp((performance.now() - UI.tickStart) / speedMs(), 0, 0.999);
    const run = race.cars.filter(c => c.status !== 'dnf');
    const lead = run.slice().sort((a, b) => a.pos - b.pos)[0];
    const ref = (lead && lead.lastLap) || tr.baseLap;
    const cars = run.map(c => {
      const gap = L ? (c.T - lead.T) : (c.grid - 1) * 0.22;
      const frac = (L === 0 ? -gap / ref * 4 : phase - gap / ref);
      return { color: teamColor(c.tid), frac: race.finished ? -gap / ref : frac, me: c.tid === G.player.teamId, label: c.tid === G.player.teamId ? `${dCode(Career.driver(G, c.did))} P${c.pos}` : (c.pos <= 3 ? `${dCode(Career.driver(G, c.did))} P${c.pos}` : '') };
    }).reverse();
    drawTrack(cv, tr, cars, { pad: 30, wet: (race.wet[Math.max(1, L)] || 0) > 0.2 });
    UI.anim = requestAnimationFrame(loop);
  };
  UI.anim = requestAnimationFrame(loop);
  // se o desenho falhar, o frame registra o erro e o mapa fica parado (sem repetir 60 vezes por segundo)
}

ACT.finishWeekend = async () => {
  stopRaceLoop();
  const report = Career.finishWeekend(G);
  UI.lastReport = report;
  autosave();
  go('post');
  // evento escrito pela IA (no máximo um por corrida, com chance por frequência)
  // (0.9, E10) sorteio com gerador local (semente da carreira e da etapa): o redator só existe na versão web e não
  // pode desviar a sequência de sorteios da simulação; senão a mesma semente dá universos diferentes na web e no desktop.
  const rAi = localRng(`redator:${G.seed}:${G.season.year}:${G.season.round}`);
  if (G.options.aiEvents && Store.sample && rAi() < 0.45 * (G.options.eventRate || 1)) {
    const ok = await generateAIEvent(G.season.results[G.season.results.length - 1]);
    if (ok) { toast('Novidade do paddock na caixa de entrada.', 'good'); if (UI.view === 'post') render(); }
  }
};

/* ---------- pós-corrida ---------- */
SCREENS.post = {
  html() {
    const res = G.season.results[G.season.results.length - 1];
    if (!res) return '<div class="empty">Sem resultado.</div>';
    const team = Career.isObs(G) ? null : Career.team(G);
    const mine = team ? res.cls.filter(c => c.tid === team.id) : [];
    const rep = UI.lastReport || { lines: [] };
    const tr = Career.track(G, res.trackId);
    const article = G.lastRace && G.lastRace.article;
    return `
    <div class="page-head"><div><div class="eyebrow">${esc(tr.circuit)} · Etapa ${res.round + 1}</div><h1>${dName(res.winner, true)} vence o ${esc(res.gp)}</h1></div>
      <div class="row"><button class="btn" data-act="go" data-v="analysis">Análise de dados</button><button class="btn primary lg" data-act="go" data-v="hub">Continuar</button></div></div>
    <div class="grid g3">
      ${mine.map(c => `<div class="panel"><div class="panel-b stack"><span class="label">${dName(c.did, true)}</span><span class="stat-big ${c.status === 'dnf' ? 'neg' : c.pos <= 3 ? 'acc' : c.pts ? 'pos' : ''}">${c.status === 'dnf' ? 'Abandono' : ordinal(c.pos)}</span><span class="muted small">Largou em ${c.grid} · ${c.pts} pts${c.status === 'dnf' ? ' · ' + esc(c.reason) : ''}</span></div></div>`).join('')}
      ${team ? '' : `<div class="panel"><div class="panel-b stack"><span class="label">Vencedor</span><span class="stat-big acc">${dName(res.winner, true)}</span><span class="muted small">${esc(Career.team(G, res.cls[0].tid).name)} · largou em ${res.cls[0].grid}</span></div></div>`}
      ${!team ? '' : `<div class="panel"><div class="panel-b stack"><span class="label">Diretoria</span><span class="stat-big">${Math.round(G.board.confidence)}%</span><span class="small ${G.board.lastDelta >= 0 ? 'pos' : 'neg'}">${G.board.lastDelta >= 0 ? '▲' : '▼'} ${Math.abs(G.board.lastDelta || 0).toFixed(1)} nesta corrida</span></div></div>`}
    </div>
    <div class="grid g2">
      ${!team ? '' : `<div class="panel"><div class="panel-h"><h3>Relatório da equipe</h3></div><div class="panel-b stack">
        ${rep.lines.length ? rep.lines.map(l => `<p>${esc(l)}</p>`).join('') : '<p class="muted">Nada fora do normal na fábrica.</p>'}
        <p class="small muted">Receitas, salários e custos foram lançados nas Finanças.</p>
      </div></div>`}
      <div class="panel"><div class="panel-h"><h3>Imprensa</h3>${Store.sample && G.options.aiEvents ? `<button class="btn sm" data-act="aiArticle" ${article ? 'disabled' : ''}>${article ? 'Matéria publicada' : 'Pedir matéria à redação'}</button>` : ''}</div><div class="panel-b stack">
        ${article ? `<h3>${esc(article.title)}</h3><p style="white-space:pre-wrap">${esc(article.body)}</p>` : G.news.slice(0, 4).map(n => `<p><b>${esc(n.title)}</b>${n.body ? `<br><span class="small muted">${esc(n.body)}</span>` : ''}</p>`).join('')}
      </div></div>
    </div>
    ${res.sprint ? sprintPanel(res.sprint) : ''}
    <div class="panel"><div class="panel-h"><h3>Classificação da corrida</h3></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Pos</th><th>Piloto</th><th>Equipe</th><th class="r">Largada</th><th class="r">Gap</th><th class="r">Melhor volta</th><th class="r">Paradas</th><th class="r">Pts</th></tr></thead><tbody>
      ${res.cls.map((c, i) => `<tr class="${team && c.tid === team.id ? 'me' : ''}"><td class="num">${c.status === 'dnf' ? 'AB' : c.pos}</td><td>${dTag(c.did)}</td><td class="small muted">${esc(Career.team(G, c.tid).name)}</td><td class="r num">${c.grid}</td><td class="r num">${c.status === 'dnf' ? esc(c.reason) : i === 0 ? fmtRaceTime(c.T) : c.lapsDown ? `+${c.lapsDown} v` : fmtGap(c.T - res.cls[0].T)}</td><td class="r num ${res.fastest && res.fastest.did === c.did ? 'pur' : ''}">${fmtLap(c.best)}</td><td class="r num">${c.pits}</td><td class="r num"><b>${c.pts || ''}</b></td></tr>`).join('')}
    </tbody></table></div></div>`;
  },
};
ACT.aiArticle = async (el) => {
  if (!Store.sample) return;
  el.disabled = true; el.textContent = 'Escrevendo…';
  const res = G.season.results[G.season.results.length - 1];
  const lr = G.lastRace;
  const facts = {
    gp: res.gp, circuito: Career.track(G, res.trackId).circuit, temporada: G.season.year,
    top10: res.cls.slice(0, 10).map(c => ({ pos: c.pos, piloto: Career.driver(G, c.did).name, equipe: Career.team(G, c.tid).name, largou: c.grid, status: c.status === 'dnf' ? 'abandono: ' + c.reason : 'terminou' })),
    abandonos: res.cls.filter(c => c.status === 'dnf').map(c => `${Career.driver(G, c.did).name} (${c.reason})`),
    pole: Career.driver(G, res.pole).name, voltaMaisRapida: res.fastest ? Career.driver(G, res.fastest.did).name : null,
    chuva: res.wet > 0.25, safetyCars: res.sc,
    momentos: lr.events.filter(e => ['crash', 'sc', 'penalty', 'weather', 'overtake', 'dnf'].includes(e.type)).slice(0, 18).map(e => `V${e.lap}: ${e.text}`),
    lideresCampeonato: Career.standingsD(G).slice(0, 3).map(x => `${Career.driver(G, x.did).name} ${x.pts}`),
    equipeDoJogador: Career.isObs(G) ? 'nenhuma (cobertura geral)' : Career.team(G).name,
  };
  try {
    const out = await Store.sample.json(`Você é jornalista de automobilismo. Escreva uma matéria curta (3 parágrafos, português do Brasil, estilo de portal esportivo) sobre esta corrida fictícia, usando somente os fatos abaixo. Destaque o vencedor, o momento decisivo e como ficou a equipe ${facts.equipeDoJogador}. Não invente resultados.\n\nFatos (JSON): ${JSON.stringify(facts)}\n\nResponda só com JSON: {"title":"manchete até 80 caracteres","body":"texto com parágrafos separados por \\n\\n"}`, { modelTier: 'quick' });
    if (!out || !out.title || !out.body) throw new Error('formato');
    G.lastRace.article = { title: String(out.title).slice(0, 120), body: String(out.body).slice(0, 3000) };
    Career.news(G, G.lastRace.article.title, 'imprensa');
    autosave(); render();
  } catch (e) {
    toast(e && e.code === 'not_granted' ? 'Permissão negada para a redação.' : 'A redação não conseguiu escrever agora.', 'bad');
    el.disabled = false; el.textContent = 'Pedir matéria à redação';
  }
};

/* ---------- análise de dados ---------- */
SCREENS.analysis = {
  html() {
    const lr = G.lastRace;
    const tab = UI.params.tab || (lr ? 'laps' : 'season');
    const tabs = [['laps', 'Tempos de volta'], ['sectors', 'Setores e velocidade'], ['pace', 'Ritmo e consistência'], ['deg', 'Degradação'], ['pos', 'Posições'], ['gap', 'Diferença para o líder'], ['tyres', 'Estratégia de pneus'], ['quali', 'Classificação'], ['season', 'Temporada'], ['h2h', 'Duelo de companheiros']];
    let body = '';
    if (!lr && ['laps', 'sectors', 'pace', 'deg', 'pos', 'gap', 'tyres', 'quali'].includes(tab)) body = '<div class="empty">Dispute uma corrida para liberar a telemetria.</div>';
    else if (tab === 'laps') body = lapTimesHtml(lr);
    else if (tab === 'sectors') body = sectorsHtml(lr);
    else if (tab === 'pace') body = paceHtml(lr);
    else if (tab === 'deg') body = degHtml(lr);
    else if (tab === 'pos') body = posChartHtml(lr);
    else if (tab === 'gap') body = gapChartHtml(lr);
    else if (tab === 'tyres') body = tyreChartHtml(lr);
    else if (tab === 'quali') body = qualiAnalysisHtml(lr);
    else if (tab === 'season') body = seasonAnalysisHtml();
    else if (tab === 'h2h') body = h2hHtml();
    return `<div class="page-head"><div><div class="eyebrow">${lr ? `${esc(lr.gp)} · ${lr.year}` : 'Telemetria'}</div><h1>Análise de dados</h1></div></div>
    <div class="panel"><div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="go" data-v="analysis" data-p='{"tab":"${k}"}'>${l}</button>`).join('')}</div><div class="panel-b">${body}</div></div>`;
  },
  after() { bindCharts(); },
};
function analysisPick(lr) {
  if (!UI.anaSel || UI.anaSel.round !== lr.round + ':' + lr.year) {
    const mine = lr.cars.filter(c => c.tid === G.player.teamId).map(c => c.did);
    const top = lr.cars.slice().sort((a, b) => a.pos - b.pos).slice(0, 3).map(c => c.did);
    UI.anaSel = { round: lr.round + ':' + lr.year, ids: Array.from(new Set([...mine, ...top])), clean: true };
  }
  return UI.anaSel;
}
function driverPicker(lr, sel) {
  return `<div class="row" style="gap:6px;margin-bottom:10px">${lr.cars.slice().sort((a, b) => a.pos - b.pos).map(c => `<button class="btn sm ${sel.ids.includes(c.did) ? 'primary' : ''}" data-act="anaPick" data-d="${c.did}"><span class="tcolor" style="background:${teamColor(c.tid)}"></span>${dName(c.did)}</button>`).join('')}</div>`;
}
ACT.anaPick = (el) => { const s = UI.anaSel; const i = s.ids.indexOf(el.dataset.d); if (i >= 0) s.ids.splice(i, 1); else s.ids.push(el.dataset.d); render(); };
ACT.anaClean = () => { UI.anaSel.clean = !UI.anaSel.clean; render(); };
function seriesColor(lr, did, used) {
  const c = lr.cars.find(x => x.did === did);
  const col = teamColor(c.tid);
  const dash = used[col] ? '5 4' : null; used[col] = true;
  return { col, dash };
}
/* tempos de volta da Análise (o nome antigo colidia com o gráfico de posições do relatório) */
function lapTimesHtml(lr) {
  const sel = analysisPick(lr);
  const used = {};
  const scLaps = new Set(); (lr.scHistory || []).forEach(s => { for (let l = s.from; l <= s.to + 1; l++) scLaps.add(l); });
  const series = sel.ids.map(did => {
    const c = lr.cars.find(x => x.did === did);
    const pitLaps = new Set(c.stints.map(s => s.to).filter(Boolean)); c.stints.forEach(s => pitLaps.add(s.from + 1));
    const { col, dash } = seriesColor(lr, did, used);
    const pts = [];
    for (let l = 1; l < c.times.length; l++) {
      const t = c.times[l]; if (t == null) continue;
      if (sel.clean && (l === 1 || pitLaps.has(l) || scLaps.has(l))) { pts.push(null); continue; }
      pts.push([l, t]);
    }
    return { name: rawName(did), color: col, dash, pts, width: c.tid === G.player.teamId ? 2.6 : 1.8 };
  });
  const bands = (lr.scHistory || []).map(s => ({ from: s.from, to: s.to, color: '#f5c518' }));
  const best = sel.ids.map(did => lr.cars.find(x => x.did === did)).map(c => ({ c, avg: avg(c.times.filter((t, l) => t && l > 1)) }));
  return `${driverPicker(lr, sel)}<div class="row" style="margin-bottom:8px"><label class="check small"><input type="checkbox" ${sel.clean ? 'checked' : ''} data-act="anaClean"> Esconder 1ª volta, voltas de box e de Safety Car</label></div>
  ${lineChart('laps', { series, h: 340, xLabel: 'Volta', yFmt: v => fmtLap(v), tipFmt: v => fmtLap(v), bands })}
  <div class="tbl-wrap" style="margin-top:12px"><table class="tbl"><thead><tr><th>Piloto</th><th class="r">Melhor</th><th class="r">Média</th><th class="r">Ultrapassagens</th><th class="r">Paradas</th><th class="r">Acerto</th></tr></thead><tbody>${best.map(({ c, avg: a }) => `<tr><td>${dTag(c.did)}</td><td class="r num">${fmtLap(c.best)}</td><td class="r num">${fmtLap(a)}</td><td class="r num">${c.overtakes}</td><td class="r num">${c.pits}</td><td class="r num">${Math.round((c.setupQ || 0) * 100)}%</td></tr>`).join('')}</tbody></table></div>`;
}
function posChartHtml(lr) {
  const used = {};
  const series = lr.cars.slice().sort((a, b) => a.pos - b.pos).map(c => {
    const { col, dash } = seriesColor(lr, c.did, used);
    const pts = [[0, c.grid]].concat(c.positions.map((p, l) => (l && p != null ? [l, p] : null)).filter(Boolean));
    return { name: rawName(c.did), color: col, dash, pts, width: c.tid === G.player.teamId ? 3 : 1.5, dim: c.tid !== G.player.teamId };
  });
  return lineChart('pos', { series, h: 420, xLabel: 'Volta', invert: true, yMin: 1, yMax: lr.cars.length, yFmt: v => 'P' + Math.round(v), tipFmt: v => 'P' + v });
}
function gapChartHtml(lr) {
  const sel = analysisPick(lr);
  const used = {};
  const series = sel.ids.map(did => {
    const c = lr.cars.find(x => x.did === did);
    const { col, dash } = seriesColor(lr, did, used);
    return { name: rawName(did), color: col, dash, pts: c.gaps.map((g, l) => (l && g != null ? [l, g] : null)).filter(Boolean), width: c.tid === G.player.teamId ? 2.6 : 1.8 };
  });
  return `${driverPicker(lr, sel)}${lineChart('gap', { series, h: 340, xLabel: 'Volta', invert: true, yMin: 0, yFmt: v => '+' + v.toFixed(0) + 's', tipFmt: v => '+' + v.toFixed(1) + 's', bands: (lr.scHistory || []).map(s => ({ from: s.from, to: s.to, color: '#f5c518' })) })}`;
}
function tyreChartHtml(lr) {
  const N = lr.laps;
  return `<div class="stack" style="gap:6px">${lr.cars.slice().sort((a, b) => a.pos - b.pos).map(c => `<div class="stint-row"><span class="small ${c.tid === G.player.teamId ? 'acc' : ''}">${c.status === 'dnf' ? 'AB' : 'P' + c.pos} ${dName(c.did)}</span><div class="stint-bar">${c.stints.map(s => { const to = s.to ?? N; const w = Math.max(0, to - s.from) / N * 100; return `<i style="width:${w}%;background:${TYRES[s.c].color}" title="${TYRES[s.c].name}: voltas ${s.from + 1}–${to}">${w > 6 ? to - s.from : ''}</i>`; }).join('')}</div></div>`).join('')}</div>
  <div class="legend" style="margin-top:10px">${Object.values(TYRES).map(t => `<span><i style="background:${t.color};height:8px"></i>${t.name}</span>`).join('')}</div>`;
}
function qualiAnalysisHtml(lr) {
  const q = lr.quali; if (!q) return '<div class="empty">Sem dados.</div>';
  const pole = q.res[q.order[0]].best;
  const byTeam = {};
  q.order.forEach(did => { const r = q.res[did]; if (r.best) byTeam[r.tid] = Math.min(byTeam[r.tid] ?? 999, r.best); });
  const teamRank = Object.entries(byTeam).sort((a, b) => a[1] - b[1]);
  const maxGap = teamRank.length ? teamRank[teamRank.length - 1][1] - pole : 1;
  return `<div class="grid g2"><div><h4 style="margin-bottom:10px">Melhor tempo por equipe (gap para a pole)</h4><div class="stack" style="gap:8px">${teamRank.map(([tid, t]) => `<div class="trait" style="grid-template-columns:150px minmax(0,1fr) 70px"><span>${tTag(tid)}</span><div class="bar"><i style="width:${clamp((t - pole) / (maxGap || 1) * 100, 1, 100)}%;background:${teamColor(tid)}"></i></div><span class="num small r">${t === pole ? 'pole' : fmtGap(t - pole)}</span></div>`).join('')}</div></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pos</th><th>Piloto</th><th class="r">Melhor</th><th class="r">Gap</th></tr></thead><tbody>${q.order.map((did, i) => `<tr class="${q.res[did].tid === G.player.teamId ? 'me' : ''}"><td class="num">${i + 1}</td><td>${dTag(did)}</td><td class="r num">${fmtLap(q.res[did].best)}</td><td class="r num">${i && q.res[did].best ? fmtGap(q.res[did].best - pole) : ''}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function seasonAnalysisHtml() {
  const res = G.season.results;
  if (!res.length) return '<div class="empty">Os dados da temporada aparecem depois da primeira corrida.</div>';
  const teams = G.db.teams.map(t => {
    const qs = [], fs = []; let dnf = 0;
    res.forEach(r => { r.quali.forEach((did, i) => { const c = r.cls.find(x => x.did === did); if (c && c.tid === t.id) qs.push(i + 1); }); r.cls.forEach(c => { if (c.tid === t.id) { if (c.status === 'fin') fs.push(c.pos); else dnf++; } }); });
    return { t, q: avg(qs), f: avg(fs), dnf, pts: G.season.standC[t.id] || 0 };
  }).sort((a, b) => a.q - b.q);
  // pontos acumulados por equipe
  const series = Career.standingsC(G).map(x => { let acc = 0; const t = Career.team(G, x.tid); return { name: t.short, color: t.color, width: t.id === G.player.teamId ? 3 : 1.8, pts: [[0, 0]].concat(res.map((r, i) => { acc += sum(r.cls.filter(c => c.tid === t.id).map(c => c.pts)); return [i + 1, acc]; })) }; });
  return `<div class="stack"><div>${lineChart('teamPts', { series, h: 300, xLabel: 'Etapa', yFmt: v => Math.round(v) })}</div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Equipe</th><th class="r">Média no grid</th><th class="r">Média de chegada</th><th class="r">Abandonos</th><th class="r">Pontos</th><th class="r">Carro hoje</th></tr></thead><tbody>${teams.map(x => `<tr class="${x.t.id === G.player.teamId ? 'me' : ''}"><td>${tTag(x.t.id)}</td><td class="r num">${x.q ? x.q.toFixed(1) : '—'}</td><td class="r num">${x.f ? x.f.toFixed(1) : '—'}</td><td class="r num">${x.dnf}</td><td class="r num">${x.pts}</td><td class="r num">${Engine.carRating(G.db, x.t).toFixed(1)}</td></tr>`).join('')}</tbody></table></div></div>`;
}
function h2hHtml() {
  const res = G.season.results;
  if (!res.length) return '<div class="empty">Os duelos aparecem depois da primeira corrida.</div>';
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Equipe</th><th>Piloto A</th><th class="c">Classif.</th><th class="c">Corrida</th><th class="c">Pontos</th><th>Piloto B</th></tr></thead><tbody>${G.db.teams.map(t => {
    const ds = Career.lineup(G, t.id); if (ds.length < 2) return '';
    const [a, b] = ds; let qa = 0, qb = 0, ra = 0, rb = 0;
    res.forEach(r => { const ia = r.quali.indexOf(a.id), ib = r.quali.indexOf(b.id); if (ia >= 0 && ib >= 0) ia < ib ? qa++ : qb++; const ca = r.cls.find(x => x.did === a.id), cb = r.cls.find(x => x.did === b.id); if (ca && cb) ca.pos < cb.pos ? ra++ : rb++; });
    const pa = G.season.standD[a.id] || 0, pb = G.season.standD[b.id] || 0;
    const cell = (x, y) => `<td class="c num"><span class="${x > y ? 'pos' : ''}">${x}</span> – <span class="${y > x ? 'pos' : ''}">${y}</span></td>`;
    return `<tr class="${t.id === G.player.teamId ? 'me' : ''}"><td>${tTag(t.id)}</td><td>${esc(a.name)}</td>${cell(qa, qb)}${cell(ra, rb)}${cell(pa, pb)}<td>${esc(b.name)}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}

/* ---------- telemetria ---------- */
const stdev = (a) => { const m = avg(a); return Math.sqrt(avg(a.map(x => (x - m) * (x - m)))); };
function cleanLaps(lr, c) {
  const sc = new Set(); (lr.scHistory || []).forEach(s => { for (let l = s.from; l <= s.to + 1; l++) sc.add(l); });
  const pit = new Set(); c.stints.forEach(s => { if (s.to) { pit.add(s.to); pit.add(s.to + 1); } });
  return c.times.map((t, l) => (l > 1 && t && !sc.has(l) && !pit.has(l) ? { l, t } : null)).filter(Boolean);
}
function sectorsHtml(lr) {
  if (!lr.cars[0].secs) return '<div class="empty">Dados de setores disponíveis a partir da versão 1.0.</div>';
  const rows = lr.cars.filter(c => c.bestS && c.bestS[0]).map(c => ({ c, s: c.bestS, ideal: sum(c.bestS) })).sort((a, b) => a.ideal - b.ideal);
  const best = lr.bestS || [0, 1, 2].map(k => Math.min(...rows.map(r => r.s[k])));
  const cell = (v, k) => `<td class="r num ${v <= best[k] + 1e-6 ? 'pur' : ''}">${v.toFixed(3)}<span class="small muted"> ${v > best[k] ? '+' + (v - best[k]).toFixed(3) : ''}</span></td>`;
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Piloto</th><th class="r">Setor 1</th><th class="r">Setor 2</th><th class="r">Setor 3</th><th class="r">Volta ideal</th><th class="r">Melhor volta</th><th class="r">Velocidade máx.</th></tr></thead><tbody>
  ${rows.map(r => `<tr class="${r.c.tid === G.player.teamId ? 'me' : ''}"><td>${dTag(r.c.did)}</td>${r.s.map(cell).join('')}<td class="r num">${fmtLap(r.ideal)}</td><td class="r num">${fmtLap(r.c.best)}</td><td class="r num">${r.c.vmax || '—'} km/h</td></tr>`).join('')}
  </tbody></table></div><p class="small muted" style="margin-top:8px">${byLang('Volta ideal = soma dos melhores setores. Roxo = melhor da corrida. Condições: ar', 'Ideal lap = sum of the best sectors. Purple = best of the race. Conditions: air')} ${lr.weather ? lr.weather.air : '—'}°C, ${byLang('pista', 'track')} ${lr.weather ? lr.weather.track : '—'}°C.</p>`;
}
function paceHtml(lr) {
  const rows = lr.cars.filter(c => c.status !== 'dnf').map(c => { const L = cleanLaps(lr, c).map(x => x.t); return { c, avg: avg(L), sd: stdev(L), n: L.length, gain: c.grid - c.pos }; }).filter(r => r.n > 3).sort((a, b) => a.avg - b.avg);
  const ref = rows.length ? rows[0].avg : 0;
  const maxsd = Math.max(...rows.map(r => r.sd), 0.1);
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Piloto</th><th class="r">Ritmo médio</th><th class="r">Gap</th><th>Consistência (desvio)</th><th class="r">Voltas limpas</th><th class="r">Posições ganhas</th></tr></thead><tbody>
  ${rows.map(r => `<tr class="${r.c.tid === G.player.teamId ? 'me' : ''}"><td>${dTag(r.c.did)}</td><td class="r num">${fmtLap(r.avg)}</td><td class="r num">${r.avg > ref ? '+' + (r.avg - ref).toFixed(3) : '—'}</td><td style="min-width:160px"><div class="row" style="gap:8px;flex-wrap:nowrap">${bar(100 - r.sd / maxsd * 100, 100, r.sd / maxsd > 0.7 ? 'r' : 'g')}<span class="num small">±${r.sd.toFixed(3)}</span></div></td><td class="r num">${r.n}</td><td class="r num ${r.gain > 0 ? 'pos' : r.gain < 0 ? 'neg' : ''}">${r.gain > 0 ? '+' : ''}${r.gain}</td></tr>`).join('')}
  </tbody></table></div><p class="small muted" style="margin-top:8px">Ritmo médio sem primeira volta, voltas de box e de Safety Car.</p>`;
}
function degHtml(lr) {
  const sel = analysisPick(lr);
  const used = {};
  const rows = [];
  const series = [];
  sel.ids.forEach(did => {
    const c = lr.cars.find(x => x.did === did); if (!c) return;
    const clean = cleanLaps(lr, c);
    c.stints.forEach((s, si) => {
      const pts = clean.filter(x => x.l > s.from + 1 && x.l <= (s.to || lr.laps)).map(x => [x.l - s.from, x.t]);
      if (pts.length < 4) return;
      const mx = avg(pts.map(p => p[0])), my = avg(pts.map(p => p[1]));
      const slope = sum(pts.map(p => (p[0] - mx) * (p[1] - my))) / Math.max(1e-6, sum(pts.map(p => (p[0] - mx) ** 2)));
      rows.push({ c, s, si, slope, n: pts.length });
      const { col, dash } = seriesColor(lr, did, used);
      series.push({ name: `${rawName(did)} ${TYRES[s.c].short}${si + 1}`, color: col, dash: si % 2 ? '4 3' : dash, pts, width: 1.8 });
    });
  });
  return `${driverPicker(lr, sel)}${lineChart('deg', { series, h: 300, xLabel: 'Volta do stint', yFmt: v => fmtLap(v), tipFmt: v => fmtLap(v) })}
  <div class="tbl-wrap" style="margin-top:10px"><table class="tbl"><thead><tr><th>Piloto</th><th>Stint</th><th>Pneu</th><th class="r">Voltas</th><th class="r">Degradação</th></tr></thead><tbody>${rows.map(r => `<tr><td>${dTag(r.c.did)}</td><td class="num">${r.si + 1}</td><td>${tyreIcon(r.s.c)}</td><td class="r num">${r.n}</td><td class="r num ${r.slope > 0.08 ? 'neg' : 'pos'}">${r.slope >= 0 ? '+' : ''}${r.slope.toFixed(3)} s/volta</td></tr>`).join('')}</tbody></table></div>`;
}
