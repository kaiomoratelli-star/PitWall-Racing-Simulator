/* ============================================================
   PIT WALL — tela dos treinos livres
   ============================================================ */
'use strict';

const FP_SPEEDS = [[0, 'Pausado'], [1, 'Tempo real'], [5, '5×'], [15, '15×'], [60, '60×']];
function fpClock(ses) { const left = Math.max(0, ses.dur - ses.t); return `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(Math.floor(left % 60)).padStart(2, '0')}`; }
function lvlCls(l) { return ['ok', 'l1', 'l2', 'l3'][l] || 'l3'; }

function practiceHtml() {
  const wk = G.weekend;
  const ses = Practice.session(wk);
  const lineup = Career.lineup(G, G.player.teamId);
  const allDone = wk.fp.sessions.every(s => s.done);
  const tabs = wk.fp.sessions.map((s, i) => `<span class="fp-tab ${i === wk.fp.cur ? 'on' : ''} ${s.done ? 'done' : ''}">${s.name}${s.done ? ' ✓' : i === wk.fp.cur ? (s.t > 0 ? ' · ao vivo' : '') : ''}</span>`).join('');
  const amb = { air: wk.weather.qualiAir ?? '—', track: Practice.trackT(wk, ses), rubber: Math.round(Practice.rubber(wk, ses) * 100) };
  const fmtLabel = { real: 'formato vida real', 1: '1 sessão', 2: '2 sessões', 3: '3 sessões' }[(G.options.practiceFormat || 'real')];
  return `${wkHead(`<span class="chip">${wk.fp.sessions.length} treino(s) · ${fmtLabel}</span>`)}
  <div class="fp-bar panel"><div class="fp-tabs">${tabs}</div>
    <div class="fp-clock"><span class="label">${ses.name} · restante</span><b id="fpClock" class="num">${fpClock(ses)}</b></div>
    <div class="fp-amb small"><span>Ar <b>${amb.air}°</b></span><span>Pista <b id="fpTrackT">${amb.track}°</b></span><span>Borracha <b id="fpRubber">${amb.rubber}%</b></span><span>Vento <b>${wk.weather.wind} km/h</b></span></div>
    <div class="fp-ctl">${ses.done ? '' : segBtns('fpSpeed', UI.fpSpeed || 0, FP_SPEEDS)}
      ${ses.done ? (allDone ? `<button class="btn primary" data-act="endPractice">Ir para a classificação</button>` : `<button class="btn primary" data-act="fpNext">Começar ${wk.fp.sessions[wk.fp.cur + 1].name}</button>`) : `<button class="btn" data-act="fpSimOpen" data-all="0">Simular ${ses.name} pelo engenheiro</button>`}
      ${allDone ? '' : `<button class="btn ghost" data-act="fpSimOpen" data-all="1">Pular todos os treinos</button>`}</div>
  </div>
  <div class="grid g2">${lineup.map(d => carPanel(d, wk, ses)).join('')}</div>
  <div class="grid g-hub">
    <div class="panel"><div class="panel-h"><h3>Tempos · ${ses.name}</h3><span class="small muted">Melhor volta de cada piloto</span></div><div class="panel-b tight tbl-wrap" style="max-height:520px;overflow:auto">${fpTimesheet(ses)}</div></div>
    <div class="panel"><div class="panel-h"><h3>Rádio e garagem</h3></div><div class="panel-b tight"><div class="fp-log">${ses.log.slice(0, 30).map(l => `<div><span class="num muted">${fpClockAt(ses, l.t)}</span> ${esc(l.txt)}</div>`).join('') || '<div class="muted small" style="padding:12px">Mande os carros para a pista para começar o trabalho.</div>'}</div></div></div>
  </div>`;
}
function fpClockAt(ses, t) { return `${String(Math.floor(t / 60)).padStart(2, '0')}'`; }
function fpTimesheet(ses) {
  const rows = Object.entries(ses.best).map(([did, b]) => ({ did, ...b })).sort((a, b) => a.t - b.t);
  if (!rows.length) return '<div class="empty">Nenhuma volta cronometrada ainda.</div>';
  const p = rows[0].t;
  return `<table class="tbl"><thead><tr><th>#</th><th>Piloto</th><th>Equipe</th><th class="r">Melhor</th><th class="r">Dif.</th><th class="r">Voltas</th><th>Pneu</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${r.tid === G.player.teamId ? 'me' : ''}"><td class="num">${i + 1}</td><td>${dTag(r.did, false)}</td><td class="small muted">${esc((Career.team(G, r.tid) || {}).short || '')}</td><td class="r num ${i === 0 ? 'pur' : ''}">${fmtLap(r.t)}</td><td class="r num">${i ? '+' + (r.t - p).toFixed(3) : ''}</td><td class="r num">${ses.laps[r.did] || 0}</td><td>${tyreIcon(r.c)}</td></tr>`).join('')}</tbody></table>`;
}

function carPanel(d, wk, ses) {
  const s = wk.setups[d.id];
  const team = Career.team(G);
  const draft = s.draft || Setup.KEYS.reduce((o, k) => ((o[k] = s.pending ? s.pending[k] : s[k]), o), {});
  const changed = Setup.KEYS.some(k => draft[k] !== (s.pending ? s.pending[k] : s[k]));
  const mins = Practice.garageMinutes(G, s, draft);
  const conf = Setup.confidence(s.sat ?? 0, s.acclim, d.carFam ?? 70);
  const last = s.runs.slice().reverse().find(r => r.fb);
  const run = s.run;
  let status;
  if (s.state === 'track' && run) status = `<span class="chip acc">Na pista · ${Practice.PROGRAMS[run.program].name} · ${run.kind === 'out' ? 'volta de saída' : run.kind === 'in' ? 'volta de entrada' : run.kind === 'cool' ? 'volta de resfriamento' : `volta ${run.times.length + 1}/${run.target}`}</span>`;
  else if (s.pending && s.workUntil > ses.t) status = `<span class="chip">Mecânicos trabalhando · ${Math.ceil((s.workUntil - ses.t) / 60)} min</span>`;
  else status = '<span class="chip">Na garagem</span>';
  const counts = { S: 0, M: 0, H: 0 }, fresh = { S: 0, M: 0, H: 0 };
  s.tyres.forEach(t => { counts[t.c]++; if (!t.laps) fresh[t.c]++; });
  const P = s.plan || { program: 'setup', laps: 4, tyre: 'M' };
  const inGarage = s.state === 'garage';
  return `<div class="panel fp-car"><div class="panel-h"><div class="row" style="gap:10px;flex-wrap:nowrap">${headshot(d, 'sm')}<div>${dTag(d.id)}<div class="small muted">Engenheiro de corrida: ${esc(team.staffList ? (Staff.get(team, d.seat === 2 ? 'raceEng2' : 'raceEng1') || {}).name || '—' : '—')}</div></div></div>${status}</div>
    <div class="panel-b stack" style="gap:14px">
      <div class="conf-box"><div class="conf-total"><span class="label">Confiança</span><b class="${conf >= 75 ? 'pos' : conf < 50 ? 'neg' : ''}">${s.sat == null ? '—' : conf + '%'}</b></div>
        <div class="conf-parts">${[['Acerto (50%)', s.sat ?? 0], ['Pista (25%)', s.acclim], ['Carro (25%)', Math.round(d.carFam ?? 70)]].map(([l, v]) => `<div class="attr"><span>${l}</span><span class="num r">${Math.round(v)}</span>${bar(v, 100, v >= 75 ? 'g' : '')}</div>`).join('')}</div></div>
      <div><div class="label" style="margin-bottom:6px">Feedback do piloto ${last ? `<span class="muted">· ${esc(last.session)}, ${esc(Practice.PROGRAMS[last.program].name.toLowerCase())}</span>` : ''}</div>
        ${last ? `<div class="fb-grid">${last.fb.items.map(it => { const c = Setup.CATS.find(x => x[0] === it.cat); return `<div class="fb-row ${lvlCls(it.lvl)}"><span class="fb-cat">${c[1]}</span><span class="fb-meter"><i style="left:${50 + clamp(it.val, -24, 24) / 24 * 46}%"></i></span><span class="fb-lvl">${it.lvl === 0 ? 'Ideal' : (it.dir === 'neg' ? c[2] : c[3])}</span></div>`; }).join('')}</div>
        <div class="fb-quote">${last.fb.items.filter(i => i.lvl > 0 || i.changed).slice(0, 3).map(i => `<p>“${esc(i.text)}”</p>`).join('') || '<p>“O carro está muito bom, não mexeria em nada.”</p>'}</div>` : '<p class="small muted">O piloto dá o primeiro feedback depois de 2 voltas lançadas.</p>'}</div>
      <div><div class="row between"><span class="label">Acerto ${s.win.k > 0 ? `<span class="muted">· janela do engenheiro ${Math.round(s.win.k * 100)}% definida</span>` : ''}</span>
        <select class="inp" style="width:auto" data-chg="fpFocus" data-d="${d.id}" aria-label="Objetivo do acerto">${Object.entries(Setup.FOCUS).map(([k, l]) => opt(k, l, s.focus)).join('')}</select></div>
        ${Setup.PARAMS.map(([k, l, a, b, m]) => { const w = s.win.w[k]; return `<div class="setup-row v2"><span>${l}<small class="muted"> · ${m} min</small></span>
          <div class="sl-wrap"><span class="sl-win" style="left:${w.lo}%;width:${Math.max(1, w.hi - w.lo)}%"></span>${s.tested ? `<span class="sl-tested" style="left:${s.tested[k]}%" title="Último acerto testado"></span>` : ''}<input type="range" min="0" max="100" value="${draft[k]}" data-inp="fpSlide" data-d="${d.id}" data-k="${k}" aria-label="${l}" ${inGarage ? '' : 'disabled'}></div>
          <span class="num" id="fpv-${d.id}-${k}">${draft[k]}</span><div class="ends"><span>${a}</span><span>${b}</span></div></div>`; }).join('')}
        <div class="row" style="margin-top:8px"><button class="btn sm" data-act="fpRec" data-d="${d.id}" ${inGarage && s.win.k > 0 ? '' : 'disabled'}>Usar recomendação do engenheiro</button>
          <button class="btn sm ${changed ? 'primary' : ''}" data-act="fpApply" data-d="${d.id}" ${inGarage && changed ? '' : 'disabled'}>Confirmar ajustes${changed ? ` (${mins} min de garagem)` : ''}</button>
          ${changed ? `<button class="btn sm ghost" data-act="fpUndo" data-d="${d.id}">Desfazer</button>` : ''}</div>
        <p class="small muted" style="margin-top:6px">Faixa azul: onde o engenheiro acredita estar o ideal para o objetivo escolhido. Ela fica mais estreita a cada saída com feedback. Marca branca: último acerto testado na pista. As relações de marcha são homologadas para a temporada.</p></div>
      <div class="fp-run"><div class="row" style="gap:8px;flex-wrap:wrap">
        <select class="inp" style="width:auto" data-chg="fpPlan" data-d="${d.id}" data-k="program" ${inGarage ? '' : 'disabled'} aria-label="Programa">${Object.entries(Practice.PROGRAMS).map(([k, p]) => opt(k, p.name, P.program)).join('')}</select>
        <label class="row small" style="gap:6px">Voltas lançadas <input class="inp num" type="number" min="1" max="25" style="width:64px" value="${P.laps}" data-chg="fpPlan" data-d="${d.id}" data-k="laps" ${inGarage ? '' : 'disabled'}></label>
        <select class="inp" style="width:auto" data-chg="fpPlan" data-d="${d.id}" data-k="tyre" ${inGarage ? '' : 'disabled'} aria-label="Pneu">${['S', 'M', 'H'].map(c => opt(c, `${TYRES[c].name} (${Engine.tprops(Career.track(G, wk.trackId), c).name}) · ${fresh[c]} novo(s) de ${counts[c]}`, P.tyre)).join('')}</select>
        ${inGarage ? `<button class="btn primary" data-act="fpSend" data-d="${d.id}" ${ses.done ? 'disabled' : ''}>Mandar para a pista</button>` : `<button class="btn" data-act="fpBox" data-d="${d.id}">Chamar para o box</button>`}</div>
        <p class="small muted">${esc(Practice.PROGRAMS[P.program].desc)}</p></div>
      ${s.runs.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Sessão</th><th>Programa</th><th>Pneu</th><th class="r">Voltas</th><th class="r">Melhor</th><th class="r">Média</th><th class="r">Satisf.</th></tr></thead><tbody>${s.runs.slice().reverse().slice(0, 8).map(r => `<tr><td class="small">${esc(r.session)} ${fpClockAt({}, r.t)}</td><td class="small">${esc(Practice.PROGRAMS[r.program].name)}</td><td>${tyreIcon(r.c)}</td><td class="r num">${r.times.length}</td><td class="r num">${r.best ? fmtLap(r.best) : '—'}</td><td class="r num">${r.avg ? fmtLap(r.avg) : '—'}</td><td class="r num">${r.fb ? r.fb.satisfaction + '%' : '—'}</td></tr>`).join('')}</tbody></table></div>` : ''}
    </div></div>`;
}

/* ---------- ações ---------- */
ACT.fpSpeed = (el) => { UI.fpSpeed = Number(el.dataset.val); fpLoop(); render(); };
CHG.fpSlide = (el) => {
  const s = G.weekend.setups[el.dataset.d];
  s.draft = s.draft || Setup.KEYS.reduce((o, k) => ((o[k] = s.pending ? s.pending[k] : s[k]), o), {});
  s.draft[el.dataset.k] = Number(el.value);
  const v = $(`#fpv-${el.dataset.d}-${el.dataset.k}`); if (v) v.textContent = el.value;
  UI.fpDirty = true;
};
ACT.fpRec = (el) => { const s = G.weekend.setups[el.dataset.d]; s.draft = Setup.recommend(s.win); render(); };
ACT.fpUndo = (el) => { G.weekend.setups[el.dataset.d].draft = null; render(); };
ACT.fpApply = (el) => {
  const s = G.weekend.setups[el.dataset.d];
  const r = Practice.applySetup(G, el.dataset.d, s.draft || s);
  s.draft = null;
  if (!r.ok) toast(r.msg, 'bad'); else if (r.min) toast(`Mecânicos trabalhando: ${r.min} min.`);
  render();
};
CHG.fpPlan = (el) => { const s = G.weekend.setups[el.dataset.d]; s.plan = s.plan || { program: 'setup', laps: 4, tyre: 'M' }; const k = el.dataset.k; s.plan[k] = k === 'laps' ? clamp(Number(el.value) || 1, 1, 25) : el.value; if (k === 'program') { s.plan.laps = Practice.PROGRAMS[el.value].laps; if (el.value === 'quali') s.plan.tyre = 'S'; } render(); };
CHG.fpFocus = (el) => { const wk = G.weekend; const s = wk.setups[el.dataset.d]; s.focus = el.value; Setup.learn(s.win, null, (est) => Setup.bestFor(est, wk, s.focus)); render(); };
ACT.fpSend = (el) => {
  const s = G.weekend.setups[el.dataset.d];
  if (s.draft) { const a = Practice.applySetup(G, el.dataset.d, s.draft); s.draft = null; if (a.min) { toast(`Primeiro os ajustes: ${a.min} min de garagem. Mande para a pista depois.`); return render(); } }
  const r = Practice.send(G, el.dataset.d, s.plan || { program: 'setup', laps: 4, tyre: 'M' });
  if (!r.ok) toast(r.msg, 'bad');
  else if (!UI.fpSpeed) UI.fpSpeed = 15;
  fpLoop(); render();
};
ACT.fpBox = (el) => { Practice.box(G, el.dataset.d); toast('Box, box! O piloto entra no fim desta volta.'); render(); };
ACT.fpNext = () => { Practice.nextSession(G); UI.fpSpeed = 0; autosave(); render(); };
ACT.endPractice = () => { fpStop(); Career.finishPractice(G); autosave(); render(); };
ACT.fpSimOpen = (el) => {
  const all = el.dataset.all === '1';
  const ses = Practice.session(G.weekend);
  modal(all ? 'Pular todos os treinos' : `Simular ${ses.name} pelo engenheiro`, `
    <p>${all ? 'Os engenheiros fazem todos os treinos restantes' : `Os engenheiros fazem o ${ses.name}`} com o mesmo motor de simulação, sem mostrar volta a volta. Escolha a diretriz:</p>
    <div class="stack" style="gap:8px">${Object.entries(Setup.FOCUS).map(([k, l], i) => `<label class="check"><input type="radio" name="fpFocus" value="${k}" ${i === 0 ? 'checked' : ''}> <span><b>${['Tudo na mão do engenheiro', 'Focar exclusivamente na classificação', 'Focar exclusivamente no ritmo de corrida'][i]}</b><br><span class="small muted">${l}</span></span></label>`).join('')}</div>
    <p class="small muted">Os engenheiros raramente acham um acerto tão bom quanto o que você encontra trabalhando com o piloto, mas cumprem o programa e garantem quilometragem.</p>`,
  `<button class="btn" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="fpSim" data-all="${all ? 1 : 0}">Simular</button>`);
};
ACT.fpSim = (el) => {
  const focus = (document.querySelector('input[name="fpFocus"]:checked') || {}).value || 'balanced';
  const all = el.dataset.all === '1';
  fpStop();
  Practice.simulate(G, focus, all);
  closeModal();
  if (all) { Career.finishPractice(G, focus); toast('Treinos concluídos pelos engenheiros.', 'good'); }
  else toast(`${Practice.session(G.weekend).name} concluído pelos engenheiros.`, 'good');
  autosave(); render();
};

/* ---------- relógio ---------- */
function fpStop() { if (UI.fpTimer) { clearInterval(UI.fpTimer); UI.fpTimer = null; } }
function fpLoop() {
  fpStop();
  if (!UI.fpSpeed) return;
  let lastV = null, last = performance.now();
  UI.fpTimer = setInterval(() => {
    const wk = G && G.weekend;
    if (!wk || wk.phase !== 'practice' || UI.view !== 'weekend') return fpStop();
    const ses = Practice.session(wk);
    const now = performance.now(); const dt = (now - last) / 1000; last = now;
    if ($('#modal')) return; // relógio para enquanto uma janela está aberta
    try { Practice.advance(G, dt * UI.fpSpeed); } catch (e) { fpStop(); UI.fpSpeed = 0; reportError('simulação do treino', e); return; }
    const v = JSON.stringify([ses.log.length, Object.values(wk.setups).map(s => [s.state, s.run && s.run.kind, s.run && s.run.times.length, !!s.pending]), ses.done]);
    const busy = document.activeElement && ['INPUT', 'SELECT'].includes(document.activeElement.tagName);
    if (v !== lastV && !busy && !$('#modal')) { lastV = v; try { render(); } catch (e) { reportError('tela do treino', e); } }
    const c = $('#fpClock'); if (c) c.textContent = fpClock(ses);
    if (ses.done) { fpStop(); UI.fpSpeed = 0; autosave(); render(); }
  }, 200);
}
const _goFp = go;
go = function (view, params) { if (view !== 'weekend') fpStop(); return _goFp(view, params); };
