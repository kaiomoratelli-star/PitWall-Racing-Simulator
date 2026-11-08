/* ============================================================
   PIT WALL 0.8.5 — tela de início (quatro propostas)
   - largada: foto da pista em tela cheia, luzes de largada e o menu à esquerda;
   - garagem: os carros do grid em carrossel, com a cor de cada equipe;
   - telemetria: traçado sendo desenhado, carros na pista e torre de tempos;
   - grid: mosaico com os pilotos do grid, no estilo capa de revista.
   A proposta fica em Opções → Interface e nos botões no canto da própria tela.
   ============================================================ */
'use strict';

const TITLE85 = [
  ['largada', 'Largada', 'Lights out'],
  ['garagem', 'Garagem', 'Garage'],
  ['telemetria', 'Telemetria', 'Telemetry'],
  ['grid', 'Grid', 'Grid'],
];
const title85 = () => { const v = UIPREF.get('title'); return TITLE85.some(t => t[0] === v) ? v : 'largada'; };
ACT.title85 = (el) => { UIPREF.set('title', el.dataset.val); UI.titleCar85 = 0; render(); };

/* menu comum às quatro propostas */
function titleMenu85(o = {}) {
  const slots = UI.slotMetas || {};
  const cont = Store.SLOTS.map((s, i) => {
    const m = slots[s]; if (!m) return '';
    return `<div class="t85-slot" style="--tc:${esc(m.color || '#888')}"><button data-act="loadSlot" data-slot="${s}"><i></i><span><b>${esc(m.team)}</b><small>${esc(m.player)} · ${m.year} · ${byLang('etapa', 'round')} ${Math.min(m.round + 1, m.total)}/${m.total}</small></span><em>${byLang('Jogo', 'Game')} ${i + 1}</em></button><button class="t85-del" data-act="delSlot" data-slot="${s}" title="${byLang('Apagar este jogo', 'Delete this game')}" aria-label="${byLang('Apagar este jogo', 'Delete this game')}">✕</button></div>`;
  }).join('');
  return `<div class="t85-menu ${o.cls || ''}">
    ${cont ? `<span class="t85-lbl">${byLang('Continuar', 'Continue')}</span><div class="t85-slots">${cont}</div>` : ''}
    <button class="t85-new" data-act="go" data-v="newcareer"><span>${byLang('Nova carreira', 'New career')}</span><i>→</i></button>
    <div class="t85-sec"><button data-act="openEditorBase">${byLang('Editor da base', 'Database editor')}</button><button data-act="openAccount">${byLang('Perfil e ativação', 'Profile & activation')}</button><label for="importSave">${byLang('Importar jogo salvo', 'Import saved game')}</label><input type="file" id="importSave" accept=".json,application/json" hidden data-chg="importSave"></div>
    ${I18N.pickerHtml()}
  </div>`;
}
function titleFacts85() {
  const db = BASE;
  return [[byLang('Base', 'Database'), db.name], db.ref ? [byLang('Dados até', 'Data up to'), db.ref] : null, [byLang('Equipes', 'Teams'), db.teams.length], [byLang('Pilotos', 'Drivers'), db.drivers.length], [byLang('Pistas', 'Tracks'), db.calendar.length], [byLang('Salvamento', 'Saving'), Store.native ? byLang('no computador', 'on this computer') : Store.cloud() ? byLang('na sua conta', 'in your account') : byLang('neste navegador', 'in this browser')]].filter(Boolean);
}
const titleWord85 = (cls = '') => `<h1 class="t85-word ${cls}"><span>PIT</span><b>WALL</b></h1>`;
const titleFoot85 = () => `<footer class="t85-foot"><div class="studio">${mgcLogo(26)}<span>${byLang('Uma produção', 'A production by')} ${COMPANY} · v${APP_VERSION} · © 2026</span></div>${disclaimerHtml()}</footer>`;
const titlePick85 = () => `<div class="t85-pick" role="group" aria-label="${byLang('Estilo da tela de início', 'Title screen style')}"><span>${byLang('Estilo', 'Style')}</span>${TITLE85.map(([k, pt, en], i) => `<button class="${title85() === k ? 'on' : ''}" data-act="title85" data-val="${k}" title="${esc(byLang(pt, en))}"><b>${i + 1}</b>${esc(byLang(pt, en))}</button>`).join('')}</div>`;
/* dois pilotos por equipe; quem tem foto oficial vem primeiro (a Haas tem Bearman, Hirakawa e Câmara na base: entram Bearman e Câmara) */
const grid85 = () => { const db = BASE; return db.teams.flatMap(t => db.drivers.filter(d => d.team === t.id).map((d, i) => ({ d, i, f: d.img ? 0 : 1 })).sort((a, b) => a.f - b.f || a.i - b.i).slice(0, 2).map(({ d }) => ({ d, t }))); };

/* 1 · Largada */
function titleLargada85() {
  if (!UI.titleTrack) { const pool = BASE.tracks.filter(t => imgUrl(t.heroImg)); UI.titleTrack = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null; }
  const tr = UI.titleTrack; const hero = tr && imgUrl(tr.heroImg);
  const intro = !UI.titleIntro85;   // luzes e entrada só na primeira vez que a tela abre (não a cada clique)
  return `<div class="t85 t85-largada ${intro ? '' : 'no-intro'}">
    <div class="t85-bg" ${hero ? `style="background-image:url('${hero}')"` : ''}></div><div class="t85-shade"></div>
    ${intro ? `<div class="t85-lights" aria-hidden="true">${[0, 1, 2, 3, 4].map(i => `<span style="--i:${i}"><i></i><i></i></span>`).join('')}</div>` : ''}
    <div class="t85-l">
      <span class="t85-eye">${esc(BASE.rules.seriesName)}</span>
      ${titleWord85()}
      <p class="t85-lead">${byLang('Comande uma equipe da Fórmula 1 ou acompanhe o campeonato como observador. Pilotos, equipes, circuitos e toda a história desde 1950, com dados reais.', 'Run a Formula 1 team or follow the championship as an observer. Drivers, teams, circuits and the whole history since 1950, with real data.')}</p>
      ${titleMenu85()}
      ${titleFoot85()}
    </div>
    ${tr ? `<div class="t85-place"><small>${byLang('Hoje no paddock', 'Today at the paddock')}</small><b>${esc(tr.circuit)}</b><span>${esc(tr.place || '')}</span></div>` : ''}
    <div class="t85-tick"><div>${[...titleFacts85(), ...titleFacts85()].map(([k, v]) => `<span>${esc(k)} <b>${esc(String(v))}</b></span>`).join('')}</div></div>
    ${titlePick85()}
  </div>`;
}

/* 2 · Garagem */
function titleGaragem85() {
  const teams = BASE.teams.filter(t => imgUrl(t.carImg));
  if (UI.titleCar85 == null) UI.titleCar85 = Math.floor(Math.random() * Math.max(1, teams.length));
  const i = ((UI.titleCar85 % teams.length) + teams.length) % teams.length; const t = teams[i] || BASE.teams[0];
  const ds = BASE.drivers.filter(d => d.team === t.id).slice(0, 2);
  return `<div class="t85 t85-garagem" style="--tc:${t.color};--tc2:${t.color2 || t.color}">
    <div class="t85-glow"></div><div class="t85-floor"></div>
    <header class="t85-gh">${titleWord85('sm')}<span class="t85-eye">${esc(BASE.rules.seriesName)}</span></header>
    <div class="t85-stage">
      <div class="t85-big" aria-hidden="true">${esc(t.name)}</div>
      <div class="t85-car" id="t85car">${carImg(t)}</div>
      <div class="t85-team">${imgUrl(t.logo) ? `<img src="${imgUrl(t.logo)}" alt="">` : ''}<span><b>${esc(t.name)}</b><small>${ds.map(d => esc(d.name)).join(' · ')}</small></span></div>
      <div class="t85-nav"><button data-act="titleCar85" data-d="-1" aria-label="${byLang('Equipe anterior', 'Previous team')}">‹</button><div class="t85-dots">${teams.map((x, k) => `<button class="${k === i ? 'on' : ''}" data-act="titleCar85" data-k="${k}" style="--c:${x.color}" aria-label="${esc(x.name)}"></button>`).join('')}</div><button data-act="titleCar85" data-d="1" aria-label="${byLang('Próxima equipe', 'Next team')}">›</button></div>
    </div>
    <div class="t85-bar">${titleMenu85({ cls: 'row' })}</div>
    ${titleFoot85()}
    ${titlePick85()}
  </div>`;
}
ACT.titleCar85 = (el) => { const n = BASE.teams.filter(t => imgUrl(t.carImg)).length || 1; UI.titleCar85 = el.dataset.k != null ? +el.dataset.k : ((UI.titleCar85 || 0) + +el.dataset.d + n) % n; UI.titleCarDir85 = el.dataset.d === '-1' ? -1 : 1; render(); };

/* 3 · Telemetria */
function titleTelemetria85() {
  if (!UI.titleTrackT) { const pool = BASE.tracks.filter(t => t.layout || t.path || t.pts || true); UI.titleTrackT = pool[Math.floor(Math.random() * pool.length)]; }
  const tr = UI.titleTrackT;
  let d = '', len = 0;
  try { const tp = trackPath(tr); const W = 620, H = 440, pad = 30; const s = Math.min((W - pad * 2) / (tp.w || 1), (H - pad * 2) / (tp.h || 1)); const ox = (W - tp.w * s) / 2, oy = (H - tp.h * s) / 2;
    d = 'M' + tp.pts.map(p => (ox + p[0] * s).toFixed(1) + ' ' + (oy + p[1] * s).toFixed(1)).join('L') + 'Z';
    for (let k = 1; k < tp.pts.length; k++) len += Math.hypot((tp.pts[k][0] - tp.pts[k - 1][0]) * s, (tp.pts[k][1] - tp.pts[k - 1][1]) * s); } catch (e) { /* sem traçado */ }
  const g = grid85();
  const cars = BASE.teams.slice(0, 10).map((t, k) => `<circle r="6" fill="${t.color}" stroke="#000" stroke-width="1.5"><animateMotion dur="${(16 + k * 0.35).toFixed(2)}s" begin="${(-k * 1.3).toFixed(1)}s" repeatCount="indefinite" path="${d}"/></circle>`).join('');
  const trace = Array.from({ length: 60 }, (_, k) => { const v = 55 + 25 * Math.sin(k * 0.45) + 12 * Math.sin(k * 1.3 + 1) - (k % 9 === 0 ? 18 : 0); return `${(k * 10).toFixed(0)},${(110 - v).toFixed(1)}`; }).join(' ');
  return `<div class="t85 t85-tele">
    <div class="t85-gridbg"></div>
    <div class="t85-tl">
      <span class="t85-eye">${esc(BASE.rules.seriesName)} · ${byLang('canal de dados', 'data feed')}</span>
      ${titleWord85('mono')}
      <p class="t85-lead">${byLang('Estratégia, mercado, fábrica e política. Cada decisão aparece nos números.', 'Strategy, market, factory and politics. Every decision shows in the numbers.')}</p>
      ${titleMenu85()}
      ${titleFoot85()}
    </div>
    <div class="t85-tc">
      <div class="t85-map"><svg viewBox="0 0 620 440" aria-hidden="true"><path d="${d}" class="t85-trk-o"/><path d="${d}" class="t85-trk" style="--len:${Math.round(len)}"/>${cars}</svg><div class="t85-mapl"><b>${esc(tr.circuit)}</b><span>${esc(tr.place || '')}${tr.lengthKm ? ' · ' + tr.lengthKm.toFixed(3) + ' km' : ''}</span></div></div>
      <div class="t85-trace"><span>${byLang('Velocidade', 'Speed')} · km/h</span><svg viewBox="0 0 590 110" preserveAspectRatio="none" aria-hidden="true"><polyline points="${trace}" /></svg></div>
    </div>
    <aside class="t85-tower"><div class="t85-th">${byLang('Grid', 'Grid')} ${BASE.season || ''}</div>${g.map(({ d: dr, t }, k) => `<div class="t85-tr" style="--tc:${t.color};--k:${k}"><em>${k + 1}</em><i></i><b>${esc(String(dr.lastName || dr.name).toUpperCase().slice(0, 12))}</b><span>${esc(t.short || teamAbbr(t.name))}</span></div>`).join('')}</aside>
    ${titlePick85()}
  </div>`;
}

/* 4 · Grid (capa de revista) */
function titleGrid85() {
  const g = grid85();
  return `<div class="t85 t85-mosaic">
    <div class="t85-tiles">${g.map(({ d, t }, k) => { const f = K85.face(d); return `<div class="t85-tile" style="--tc:${t.color};--k:${k}">${f ? `<img src="${f}" alt="" loading="lazy">` : `<span>${esc(initials(d.name))}</span>`}<small>${esc(String(d.lastName || d.name).toUpperCase())}</small></div>`; }).join('')}</div>
    <div class="t85-band">
      <div class="t85-bt"><span class="t85-eye">${esc(BASE.rules.seriesName)} · ${g.length} ${byLang('pilotos', 'drivers')} · ${BASE.teams.length} ${byLang('equipes', 'teams')}</span>${titleWord85()}<p class="t85-lead">${byLang('Monte o time, vença o mercado e escreva a próxima era da categoria.', 'Build the team, win the market and write the next era of the sport.')}</p></div>
      ${titleMenu85()}
    </div>
    ${titleFoot85()}
    ${titlePick85()}
  </div>`;
}

(function () {
  const old = SCREENS.title;
  SCREENS.title = {
    bare: true,
    html() {
      const v = title85();
      try {
        return v === 'garagem' ? titleGaragem85() : v === 'telemetria' ? titleTelemetria85() : v === 'grid' ? titleGrid85() : titleLargada85();
      } catch (e) { if (UI.errors) UI.errors.push({ where: 'title85', msg: e.message }); return old.html.call(this); }
    },
    after() {
      if (title85() === 'largada') setTimeout(() => { UI.titleIntro85 = true; }, 0);
      cancelAnimationFrame(UI.anim);
      clearInterval(UI.titleTimer85);
      if (title85() === 'garagem') UI.titleTimer85 = setInterval(() => { if (UI.view !== 'title' || title85() !== 'garagem' || document.querySelector('.modal-bg, .modal')) return; ACT.titleCar85({ dataset: { d: '1' } }); }, 7000);
    },
  };
})();
