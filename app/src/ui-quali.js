/* ============================================================
   PIT WALL — classificação ao vivo (e classificação Sprint)
   ============================================================ */
'use strict';

const Q_SPEEDS = [[0, 'Pausado'], [1, 'Tempo real'], [3, '3×'], [10, '10×']];
function qClock(seg) { const left = Math.max(0, seg.dur - seg.t); return `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(Math.floor(left % 60)).padStart(2, '0')}`; }

/* passos do fim de semana: formato Sprint tem classificação Sprint e corrida Sprint antes */
function stepsHtml(phase) {
  const sprint = G.weekend && G.weekend.sprint;
  const st = sprint ? [['practice', 'Treino'], ['sq', 'Classif. Sprint'], ['quali', 'Classificação'], ['strategy', 'Estratégia'], ['race', 'Corrida'], ['post', 'Resultado']] : [['practice', 'Treinos'], ['quali', 'Classificação'], ['strategy', 'Estratégia'], ['race', 'Corrida'], ['post', 'Resultado']];
  const idx = st.findIndex(s => s[0] === phase);
  return `<div class="steps">${st.map((s, i) => `<div class="step ${i < idx ? 'done' : i === idx ? 'on' : ''}"><span class="n">${i + 1}</span><span class="t">${s[1]}</span></div>`).join('')}</div>`;
}

const _wkHtml = SCREENS.weekend.html;
SCREENS.weekend.html = function () {
  const wk = G && G.weekend;
  if (wk && !Career.isObs(G) && (wk.phase === 'sq' || (wk.phase === 'quali' && !wk.quali))) return qualiScreen(wk.phase === 'sq' ? 'SQ' : 'Q');
  return _wkHtml.call(this);
};

function qualiScreen(kind) {
  const wk = G.weekend;
  const title = kind === 'SQ' ? 'Classificação Sprint' : 'Classificação';
  const ql = wk.ql && wk.ql.kind === kind ? wk.ql : null;
  if (!ql) {
    const lineup = Career.lineup(G, G.player.teamId);
    const durs = Quali.DUR[kind].map(s => s / 60);
    return `${wkHead()}
    ${kind === 'Q' && wk.sprintResult ? sprintPanel(wk.sprintResult.cls) : ''}
    <div class="panel"><div class="panel-b stack">
      <h3>${title}</h3>
      <p>${kind === 'SQ' ? 'SQ1' : 'Q1'} (${durs[0]} min), ${kind === 'SQ' ? 'SQ2' : 'Q2'} (${durs[1]} min) e ${kind === 'SQ' ? 'SQ3' : 'Q3'} (${durs[2]} min). Os 6 mais lentos caem no primeiro e no segundo segmento; os 10 melhores disputam a ${kind === 'SQ' ? 'pole da Sprint' : 'pole'}. ${kind === 'SQ' ? 'Regra de pneus: médios novos na SQ1 e SQ2, macios novos na SQ3.' : 'Volta que começa antes da bandeira quadriculada vale.'}</p>
      <p class="small muted">${Regs.r(G).parcFerme ? 'Parque fechado: na garagem só a asa dianteira e o balanço de freio podem mudar.' : 'Sem parque fechado neste regulamento: todo o acerto pode mudar.'} Previsão: ${wk.forecast.quali}% de chance de chuva.</p>
      <div class="grid g2">${lineup.map(d => { const s = wk.setups[d.id] || {}; return `<div class="row" style="gap:10px">${headshot(d, 'sm')}<div><b>${esc(d.name)}</b><div class="small muted">Confiança ${s.conf ?? '—'}% · acerto de classificação ${Math.round((s.qQ ?? 0) * 100)}%</div></div></div>`; }).join('')}</div>
      <div class="row" style="justify-content:flex-end"><button class="btn" data-act="qSimAll" data-k="${kind}">Simular ${title.toLowerCase()} inteira</button><button class="btn primary lg" data-act="qStart" data-k="${kind}">Começar ${kind === 'SQ' ? 'SQ1' : 'Q1'}</button></div>
    </div></div>`;
  }
  const seg = Quali.seg(ql);
  const tabs = ql.segs.map((s, i) => `<span class="fp-tab ${i === ql.seg ? 'on' : ''} ${s.done ? 'done' : ''}">${s.name}${s.done ? ' ✓' : ''}</span>`).join('');
  const lineup = Career.lineup(G, G.player.teamId);
  return `${wkHead(`<span class="chip">${title}</span>`)}
  <div class="fp-bar panel"><div class="fp-tabs">${tabs}</div>
    <div class="fp-clock"><span class="label">${seg.name} · restante</span><b id="qClock" class="num">${qClock(seg)}</b></div>
    <div class="fp-amb small"><span>Pista <b>${wk.weather.qualiTrack ?? '—'}°</b></span><span>Chuva <b>${Math.round(ql.wet * 100)}%</b></span>${seg.reds ? `<span class="neg">Bandeira vermelha ×${seg.reds}</span>` : ''}</div>
    <div class="fp-ctl">${seg.done ? (ql.done ? `<button class="btn primary" data-act="qFinish" data-k="${kind}">${kind === 'SQ' ? 'Disputar a Sprint' : 'Ver o grid de largada'}</button>` : `<button class="btn primary" data-act="qNext">Começar ${ql.segs[ql.seg + 1].name}</button>`)
      : `${segBtns('qSpeed', UI.qSpeed || 0, Q_SPEEDS)}<div class="seg">${[60, 180, 300].map(s => `<button data-act="qStep" data-s="${s}">+${s / 60} min</button>`).join('')}<button data-act="qStep" data-s="9999">Até o fim do ${seg.name}</button></div>`}
      ${ql.done ? '' : `<button class="btn ghost" data-act="qSimRest">Simular o resto</button>`}</div>
  </div>
  <div class="q-layout">
    <div class="panel"><div class="panel-h"><h3>Cronometragem · ${seg.name}</h3><span class="small muted">${seg.keep ? `Passam ${seg.keep}` : 'Disputa da pole'}</span></div><div class="panel-b tight">${qTower(ql, seg)}</div></div>
    <div class="stack" style="gap:14px">${lineup.map(d => qCarPanel(d, ql, seg)).join('')}
      <div class="panel"><div class="panel-h"><h3>Narração ao vivo</h3></div><div class="panel-b tight"><div class="q-feed">${ql.log.slice(0, 40).map(l => `<div class="qf ${l.kind}"><span class="num muted">${l.seg} ${String(Math.floor(l.t / 60)).padStart(2, '0')}:${String(l.t % 60).padStart(2, '0')}</span> ${esc(l.txt)}</div>`).join('') || '<div class="muted small" style="padding:12px">A sessão vai começar. Mande seus carros para a pista quando quiser: no começo a pista está mais suja; no fim, mais rápida e mais cheia.</div>'}</div></div></div>
    </div>
  </div>`;
}
function qTower(ql, seg) {
  const order = Quali.order(ql);
  const elim = Object.keys(ql.res).filter(d => ql.res[d].elim).sort((a, b) => ql.segs.findIndex(s => s.name === ql.res[b].elim) - ql.segs.findIndex(s => s.name === ql.res[a].elim));
  const lead = ql.res[order[0]] && ql.res[order[0]].times[seg.name];
  const statusOf = (c) => c.crashed && c.state === 'out' ? '<span class="neg">Batida</span>' : c.state === 'garage' ? '<span class="muted">Box</span>' : c.kind === 'out' ? 'Saída' : c.kind === 'in' ? 'Entrada' : c.kind === 'cool' ? 'Resfriando' : '<b class="acc">Volta rápida</b>';
  const secs = (c) => [0, 1, 2].map(i => `<i class="sec ${c.kind === 'push' && c.secStatus && c.secStatus[i] ? c.secStatus[i] : ''}"></i>`).join('');
  const row = (did, i, out) => {
    const c = ql.cars[did], r = ql.res[did]; const t = out ? r.times[r.elim] : r.times[seg.name];
    const mine = r.tid === G.player.teamId;
    return `<tr class="${mine ? 'me' : ''} ${out ? 'out' : ''} ${!out && seg.keep && i + 1 > seg.keep ? 'danger' : ''}"><td class="num">${out ? '' : i + 1}</td><td>${dTag(did, false)}</td><td class="small muted">${esc((Career.team(G, r.tid) || {}).short || '')}</td><td class="r num ${!out && i === 0 && isFinite(t) ? 'pur' : ''}">${t != null && isFinite(t) ? fmtLap(t) : '—'}</td><td class="r num small">${!out && i && t != null && isFinite(t) && isFinite(lead) ? '+' + (t - lead).toFixed(3) : out ? esc(r.elim) : ''}</td><td>${out ? '' : `<span class="secs">${secs(c)}</span>`}</td><td class="small">${out ? '<span class="muted">Eliminado</span>' : statusOf(c)}</td><td>${c.tyre ? tyreIcon(c.tyre.c) : ''}<span class="small muted"> ${c.tyre && c.tyre.laps ? c.tyre.laps + 'v' : c.tyre ? 'novo' : ''}</span></td></tr>`;
  };
  return `<table class="tbl qtower"><thead><tr><th>#</th><th>Piloto</th><th></th><th class="r">Tempo</th><th class="r">Dif.</th><th>Setores</th><th>Status</th><th>Pneu</th></tr></thead><tbody>
    ${order.map((d, i) => (seg.keep && i === seg.keep ? '<tr class="cut"><td colspan="8">Zona de eliminação</td></tr>' : '') + row(d, i, false)).join('')}
    ${elim.map(d => row(d, 0, true)).join('')}</tbody></table>`;
}
function qCarPanel(d, ql, seg) {
  const wk = G.weekend, c = ql.cars[d.id], s = wk.setups[d.id];
  const alive = ql.alive.includes(d.id);
  const req = Quali.requiredCompound(ql);
  const sets = s ? s.tyres : [];
  const fresh = (cc) => sets.filter(t => t.c === cc && !t.laps).length;
  const used = (cc) => sets.filter(t => t.c === cc && t.laps).length;
  const keys = Quali.allowedKeys(G);
  const draft = c.draft || keys.reduce((o, k) => ((o[k] = s[k]), o), {});
  const mins = s ? Quali.garageMinutes(G, d.id, draft) : 0;
  const working = c.workUntil && c.workUntil > seg.t;
  const res = ql.res[d.id];
  const pos = alive ? Quali.order(ql).indexOf(d.id) + 1 : null;
  return `<div class="panel q-car"><div class="panel-h"><div class="row" style="gap:10px;flex-wrap:nowrap">${headshot(d, 'sm')}<div><b>${esc(d.name)}</b><div class="small muted">${alive ? `${pos}º no ${seg.name}` : `Eliminado no ${res.elim}`} · confiança ${s && s.conf != null ? s.conf + '%' : '—'}</div></div></div>
    <label class="check small"><input type="checkbox" ${c.auto ? 'checked' : ''} data-chg="qAuto" data-d="${d.id}" ${alive ? '' : 'disabled'}> Engenheiro decide</label></div>
    ${alive ? `<div class="panel-b stack" style="gap:10px">
      <div class="row" style="gap:8px;flex-wrap:wrap">
        <select class="inp" style="width:auto" data-chg="qOpt" data-d="${d.id}" data-k="compound" ${c.state === 'garage' && !req ? '' : 'disabled'} aria-label="Pneu">${(req ? [req] : ['S', 'M']).map(cc => opt(cc, `${TYRES[cc].name}: ${fresh(cc)} novo(s), ${used(cc)} usado(s)`, (c.opt && c.opt.compound) || req || 'S')).join('')}</select>
        <select class="inp" style="width:auto" data-chg="qOpt" data-d="${d.id}" data-k="push" ${c.state === 'garage' ? '' : 'disabled'} aria-label="Voltas lançadas">${opt(1, '1 volta lançada', (c.opt && c.opt.push) || 1)}${opt(2, '2 voltas lançadas', (c.opt && c.opt.push) || 1)}</select>
        ${segBtns('qRiskL', (c.opt && c.opt.risk) || c.risk, [['safe', 'Segura'], ['normal', 'Normal'], ['push', 'No limite']], `data-d="${d.id}"`)}
      </div>
      <div class="row">${c.state === 'garage' ? `<button class="btn primary" data-act="qSend" data-d="${d.id}" ${seg.done || seg.t >= seg.dur || working ? 'disabled' : ''}>${working ? `Mecânicos trabalhando (${Math.ceil((c.workUntil - seg.t) / 60)} min)` : 'Mandar para a pista'}</button>` : c.state === 'track' ? `<button class="btn" data-act="qAbort" data-d="${d.id}">Abortar e voltar ao box</button><span class="small">${c.kind === 'push' ? 'Em volta rápida' : c.kind === 'out' ? 'Volta de saída' : c.kind === 'cool' ? 'Resfriando os pneus' : 'Voltando aos boxes'}</span>` : '<span class="neg small">Carro danificado</span>'}</div>
      ${c.state === 'garage' && s ? `<details ${c.draft ? 'open' : ''}><summary class="small">Ajustes na garagem ${Regs.r(G).parcFerme ? '(parque fechado)' : ''}</summary>
        ${Setup.PARAMS.filter(p => keys.includes(p[0])).map(([k, l, a, b]) => `<div class="setup-row v2"><span>${l}</span><div class="sl-wrap"><span class="sl-win" style="left:${s.win.w[k].lo}%;width:${Math.max(1, s.win.w[k].hi - s.win.w[k].lo)}%"></span><input type="range" min="0" max="100" value="${draft[k]}" data-inp="qSlide" data-d="${d.id}" data-k="${k}" aria-label="${l}"></div><span class="num" id="qv-${d.id}-${k}">${draft[k]}</span><div class="ends"><span>${a}</span><span>${b}</span></div></div>`).join('')}
        <div class="row" style="margin-top:6px"><button class="btn sm ${c.draft ? 'primary' : ''}" data-act="qApply" data-d="${d.id}" ${c.draft && mins ? '' : 'disabled'}>Confirmar (${mins} min de garagem)</button>${c.draft ? `<button class="btn sm ghost" data-act="qUndo" data-d="${d.id}">Desfazer</button>` : ''}</div>
        <p class="small muted">O relógio continua correndo enquanto os mecânicos trabalham.</p></details>` : ''}
    </div>` : ''}</div>`;
}

/* ---------- ações ---------- */
ACT.qStart = (el) => { Quali.init(G, el.dataset.k); UI.qSpeed = 0; autosave(); render(); };
ACT.qSimAll = (el) => { qStop(); if (el.dataset.k === 'SQ') Career.runSprintQuali(G); else { Career.runQualifying(G); G.weekend.phase = 'quali'; } autosave(); render(); };
ACT.qSimRest = () => { qStop(); Quali.simulate(G, true); autosave(); render(); };
ACT.qNext = () => { Quali.nextSeg(G); UI.qSpeed = 0; autosave(); render(); };
ACT.qFinish = (el) => {
  qStop();
  if (el.dataset.k === 'SQ') { Career.runSprintQuali(G); toast('Corrida Sprint disputada. Veja o resultado e prepare a classificação.', 'good'); }
  else { Career.finishQualifying(G); G.weekend.phase = 'quali'; }
  autosave(); render();
};
ACT.qSpeed = (el) => { UI.qSpeed = Number(el.dataset.val); qLoop(); render(); };
ACT.qStep = (el) => { const seg = Quali.seg(G.weekend.ql); const n = Number(el.dataset.s); Quali.advance(G, n >= 9999 ? seg.dur - seg.t + 1 : n); render(); };
CHG.qAuto = (el) => { Quali.setAuto(G, el.dataset.d, el.checked); render(); };
CHG.qOpt = (el) => { const c = G.weekend.ql.cars[el.dataset.d]; c.opt = c.opt || {}; c.opt[el.dataset.k] = el.dataset.k === 'push' ? Number(el.value) : el.value; };
ACT.qRiskL = (el) => { const c = G.weekend.ql.cars[el.dataset.d]; c.opt = c.opt || {}; c.opt.risk = el.dataset.val; c.risk = el.dataset.val; render(); };
ACT.qSend = (el) => {
  const c = G.weekend.ql.cars[el.dataset.d];
  const o = c.opt || {};
  const r = Quali.send(G, el.dataset.d, { compound: o.compound, push: o.push || 1, risk: o.risk || c.risk });
  if (!r.ok) toast(r.msg, 'bad'); else if (!UI.qSpeed) { UI.qSpeed = 3; qLoop(); }
  render();
};
ACT.qAbort = (el) => { Quali.abort(G, el.dataset.d); render(); };
CHG.qSlide = (el) => { const wk = G.weekend, c = wk.ql.cars[el.dataset.d], s = wk.setups[el.dataset.d]; c.draft = c.draft || Quali.allowedKeys(G).reduce((o, k) => ((o[k] = s[k]), o), {}); c.draft[el.dataset.k] = Number(el.value); const v = $(`#qv-${el.dataset.d}-${el.dataset.k}`); if (v) v.textContent = el.value; };
ACT.qApply = (el) => { const c = G.weekend.ql.cars[el.dataset.d]; const r = Quali.applySetup(G, el.dataset.d, c.draft || {}); c.draft = null; if (!r.ok) toast(r.msg, 'bad'); render(); };
ACT.qUndo = (el) => { G.weekend.ql.cars[el.dataset.d].draft = null; render(); };

/* ---------- relógio ---------- */
function qStop() { if (UI.qTimer) { clearInterval(UI.qTimer); UI.qTimer = null; } }
function qLoop() {
  qStop();
  if (!UI.qSpeed) return;
  let last = performance.now(), lastV = null;
  UI.qTimer = setInterval(() => {
    const wk = G && G.weekend, ql = wk && wk.ql;
    if (!ql || UI.view !== 'weekend') return qStop();
    if ($('#modal')) { last = performance.now(); return; }
    const now = performance.now(); const dt = (now - last) / 1000; last = now;
    const seg = Quali.seg(ql);
    try { Quali.advance(G, dt * UI.qSpeed); } catch (e) { qStop(); UI.qSpeed = 0; reportError('simulação da classificação', e); return; }
    const v = JSON.stringify([ql.log.length, ql.alive.map(d => [ql.cars[d].state, ql.cars[d].kind, ql.cars[d].secIdx]), seg.done]);
    const busy = document.activeElement && ['INPUT', 'SELECT'].includes(document.activeElement.tagName);
    if (v !== lastV && !busy) { lastV = v; try { render(); } catch (e) { reportError('tela da classificação', e); } }
    const c = $('#qClock'); if (c) c.textContent = qClock(seg);
    if (seg.done) { qStop(); UI.qSpeed = 0; autosave(); render(); }
  }, 200);
}
const _goQ = go;
go = function (view, params) { if (view !== 'weekend') qStop(); return _goQ(view, params); };
