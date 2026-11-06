/* ============================================================
   PIT WALL — núcleo da interface: estado, rotas, componentes,
   gráficos SVG e mapa de pista procedural
   ============================================================ */
'use strict';

let G = null;           // carreira atual
let BASE = null;        // base de dados para novas carreiras
let SLOT = 'slot1';
const UI = { view: 'title', params: {}, navOpen: false, raceTimer: null, raceSpeed: 1, racePaused: true, anim: null, charts: {} };
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const ACT = {};      // ações por clique: data-act="nome"
const CHG = {};      // ações por mudança: data-chg="nome"

/* ---------- toasts e modal ---------- */
function toast(msg, kind = '') {
  const box = $('#toasts');
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => t.remove(), 4200);
}
function modal(title, bodyHtml, actionsHtml = '') {
  closeModal();
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.id = 'modal';
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="panel-h"><h3>${esc(title)}</h3><button class="btn ghost sm" data-act="closeModal" aria-label="Fechar">✕</button></div><div class="panel-b stack">${bodyHtml}</div>${actionsHtml ? `<div class="panel-b row" style="justify-content:flex-end;border-top:1px solid var(--line)">${actionsHtml}</div>` : ''}</div>`;
  bg.addEventListener('click', e => { if (e.target === bg) closeModal(); });
  document.body.appendChild(bg);
}
function closeModal() { const m = $('#modal'); if (m) m.remove(); }
ACT.closeModal = closeModal;

/* ---------- navegação ---------- */
const NAV = [
  ['g', 'Temporada'],
  ['hub', 'Central', 'M3 12l9-8 9 8v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],
  ['weekend', 'Fim de semana', 'M4 21V4m0 0h12l-2 4 2 4H4'],
  ['inbox', 'Caixa de entrada', 'M3 6h18v12H3zM3 7l9 6 9-6'],
  ['standings', 'Classificação', 'M5 21V10m7 11V4m7 17v-7'],
  ['calendar', 'Calendário', 'M4 6h16v14H4zM4 10h16M9 3v4m6-4v4'],
  ['g', 'Equipe'],
  ['team', 'Pilotos e funcionários', 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0'],
  ['academy', 'Academia', 'M12 3l10 5-10 5L2 8zM6 10v5c3 2 9 2 12 0v-5'],
  ['dev', 'Carro e P&D', 'M14 7l3-3 3 3-3 3m-3-3L4 17v3h3L17 10'],
  ['finance', 'Finanças', 'M12 3v18M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6'],
  ['market', 'Mercado', 'M3 7h18l-2 12H5zM8 7a4 4 0 0 1 8 0'],
  ['g', 'Dados'],
  ['analysis', 'Análise de dados', 'M3 3v18h18M7 15l4-4 3 3 5-6'],
  ['news', 'Notícias', 'M4 5h13v14H6a2 2 0 0 1-2-2zm13 3h3v9a2 2 0 0 1-2 2'],
  ['history', 'Minha carreira', 'M12 7v5l3 2M3 12a9 9 0 1 0 3-6.7L3 8m0-5v5h5'],
  ['seasons', 'Temporadas desde 1950', 'M4 4h16v16H4zM4 9h16M9 4v16'],
  ['hall', 'Hall da Fama', 'M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4m10-4h3a3 3 0 0 1-3 4'],
  ['g', 'Sistema'],
  ['editor', 'Editor da base', 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4'],
  ['saves', 'Salvar e opções', 'M5 3h11l3 3v15H5zM8 3v5h7V3M8 14h8'],
  ['diag', 'Diagnóstico', 'M12 3l9 16H3zM12 10v4m0 3v.5'],
];
// telas que só existem para quem comanda uma equipe
const MANAGER_ONLY = new Set(['team', 'dev', 'finance', 'market', 'inbox', 'academy']);
NAV.splice(NAV.findIndex(n => n[0] === 'news') + 1, 0,
  ['paddock', 'Equipes do grid', 'M4 20V9l8-5 8 5v11M9 20v-6h6v6'],
  ['log', 'Registro do universo', 'M6 4h12v16H6zM9 8h6M9 12h6M9 16h4']);

function go(view, params = {}) {
  if (UI.view === 'race' && view !== 'race') { stopRaceLoop(); document.body.classList.remove('flag-sc', 'flag-vsc', 'flag-red'); }
  UI.view = view; UI.params = params; UI.navOpen = false;
  render();
  window.scrollTo(0, 0);
}
ACT.go = (el) => {
  const v = el.dataset.v;
  if (G && Career.isObs(G) && MANAGER_ONLY.has(v)) return go('hub');
  go(v, el.dataset.p ? JSON.parse(el.dataset.p) : {});
};
ACT.toggleNav = () => { UI.navOpen = !UI.navOpen; const n = $('.nav'); if (n) n.classList.toggle('open', UI.navOpen); };

const SCREENS = {};  // view -> função que retorna html (e opcional after())

function render() {
  const app = $('#app');
  const scr = SCREENS[UI.view] || SCREENS.title;
  if (!G || scr.bare) {
    app.innerHTML = scr.html();
  } else {
    app.innerHTML = shellHtml(scr.html());
  }
  const mi = $('.main-inner');
  if (mi && UI._lastView !== UI.view + JSON.stringify(UI.params || {})) mi.classList.add('enter');
  UI._lastView = UI.view + JSON.stringify(UI.params || {});
  scr.after && scr.after();
  if (window.claude && window.claude.hot && window.claude.hot.snapshot) { /* registrado em main */ }
}

function shellHtml(inner) {
  if (Career.isObs(G)) return shellObsHtml(inner);
  const team = Career.team(G);
  const unread = G.inbox.filter(m => !m.read).length;
  const pending = G.inbox.filter(m => m.choices && m.resolved == null).length;
  const sc = Career.standingsC(G);
  const pos = sc.findIndex(x => x.tid === team.id) + 1;
  const navItems = NAV.map(n => {
    if (n[0] === 'g') return `<div class="nav-group label">${n[1]}</div>`;
    const badge = n[0] === 'inbox' && (pending || unread) ? `<span class="badge">${pending || unread}</span>` : n[0] === 'weekend' && G.weekend ? '<span class="chip acc">ao vivo</span>' : '';
    const on = UI.view === n[0] || (n[0] === 'weekend' && ['race', 'weekend'].includes(UI.view));
    return `<button class="navitem ${on ? 'on' : ''}" data-act="go" data-v="${n[0]}"><svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${n[2]}"/></svg>${n[1]}${badge}</button>`;
  }).join('');
  return `
  <header class="topbar">
    <button class="btn ghost sm navbtn" data-act="toggleNav" aria-label="Menu">☰</button>
    <button class="brand" data-act="go" data-v="hub"><span class="slash"></span><span class="word">PIT WALL</span></button>
    <div class="top-team"><span class="livery" style="background:linear-gradient(${team.color} 60%, ${team.color2} 60%)"></span><span class="name">${esc(team.name)}</span></div>
    <div class="top-stats">
      <div class="top-stat hide-sm"><span class="label">Temporada</span><b>${G.season.year} · ${Math.min(G.season.round + 1, G.season.calendar.length)}/${G.season.calendar.length}</b></div>
      <div class="top-stat hide-sm"><span class="label">Construtores</span><b>${ordinal(pos)}</b></div>
      <div class="top-stat"><span class="label">Caixa</span><b class="${G.finances.balance < 0 ? 'neg' : ''}">${fmtMoney(G.finances.balance)}</b></div>
      <div class="top-stat"><span class="label">Diretoria</span><b class="${G.board.confidence < 30 ? 'neg' : G.board.confidence > 70 ? 'pos' : ''}">${Math.round(G.board.confidence)}%</b></div>
    </div>
  </header>
  <div class="shell">
    <nav class="nav ${UI.navOpen ? 'open' : ''}" aria-label="Navegação">${navItems}</nav>
    <main class="main"><div class="main-inner">${inner}</div></main>
  </div>`;
}
function navHtml(items) {
  return items.map(n => {
    if (n[0] === 'g') return `<div class="nav-group label">${n[1]}</div>`;
    const on = UI.view === n[0] || (n[0] === 'weekend' && ['race', 'weekend'].includes(UI.view));
    return `<button class="navitem ${on ? 'on' : ''}" data-act="go" data-v="${n[0]}"><svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${n[2]}"/></svg>${n[1]}</button>`;
  }).join('');
}
function shellObsHtml(inner) {
  const sd = Career.standingsD(G);
  const leader = sd[0] && sd[0].pts > 0 ? Career.driver(G, sd[0].did) : null;
  const items = NAV.filter(n => !MANAGER_ONLY.has(n[0]) && n[0] !== 'weekend' && !(n[0] === 'g' && n[1] === 'Equipe'));
  return `
  <header class="topbar">
    <button class="btn ghost sm navbtn" data-act="toggleNav" aria-label="Menu">☰</button>
    <button class="brand" data-act="go" data-v="hub"><span class="slash"></span><span class="word">PIT WALL</span></button>
    <span class="chip acc">Modo Observador</span>
    <div class="top-stats">
      <div class="top-stat hide-sm"><span class="label">Temporada</span><b>${G.season.year} · ${Math.min(G.season.round + 1, G.season.calendar.length)}/${G.season.calendar.length}</b></div>
      <div class="top-stat"><span class="label">Líder</span><b>${leader ? esc(leader.name.split(' ').slice(-1)[0]) + ' ' + sd[0].pts : '—'}</b></div>
    </div>
  </header>
  <div class="shell">
    <nav class="nav ${UI.navOpen ? 'open' : ''}" aria-label="Navegação">${navHtml(items)}</nav>
    <main class="main"><div class="main-inner">${inner}</div></main>
  </div>`;
}

/* ---------- imagens reais (empacotadas na versão desktop) ---------- */
const ACCENT = '#E10600';
function imgUrl(p) { return (typeof HAS_IMG !== 'undefined' && HAS_IMG && p) ? 'assets/img/' + p : null; }
function initials(name) { return String(name || '?').split(' ').filter(Boolean).map(x => x[0]).slice(0, 2).join('').toUpperCase(); }
function headshot(d, cls = '') {
  // retrato com o rosto centralizado (scripts/import_images.py) quando existe; senão a foto original
  const face = d && typeof Assets !== 'undefined' ? Assets.face(d) : null;
  const u = face || (d && imgUrl(d.img));
  const tc = d && d.team && G ? teamColor(d.team) : '#3a3a44';
  if (u) return `<span class="hs ${cls}" style="--tc:${tc}"><img src="${u}" alt="" loading="lazy" onerror="this.parentNode.classList.add('noimg');this.remove()"></span>`;
  return `<span class="hs noimg ${cls}" style="--tc:${tc}"><b>${esc(initials(d && d.name))}</b></span>`;
}
function teamLogo(t, cls = '') {
  const u = t && (imgUrl(t.logo) || (typeof Assets !== 'undefined' ? Assets.logoByName('teams', t.fullName || t.name) : null));
  if (u) return `<span class="tlogo ${cls}" style="--tc:${t.color}"><img src="${u}" alt="" loading="lazy" onerror="this.remove()"></span>`;
  return `<span class="tlogo txt ${cls}" style="--tc:${t ? t.color : '#555'}">${esc(t ? t.short : '')}</span>`;
}
function carImg(t, cls = '') { const u = t && imgUrl(t.carImg); return u ? `<img class="carimg ${cls}" src="${u}" alt="Carro ${esc(t.name)}" loading="lazy" onerror="this.remove()">` : ''; }

/* ---------- marca da Moratelli Game Company (desenhada em CSS: funciona com ou sem imagens) ---------- */
const COMPANY = 'Moratelli Game Company';
function mgcLogo(h = 28, cls = '') { return `<span class="mgc ${cls}" style="--h:${h}px" role="img" aria-label="${COMPANY}"><span class="mgc-mark"><i></i><i></i><i></i><b><span>MGC</span></b></span><span class="mgc-wm"><b>MORATELLI</b><small>GAME COMPANY</small></span></span>`; }

/* ---------- componentes ---------- */
function teamColor(tid) { const t = G ? Career.team(G, tid) : null; return t ? t.color : '#888'; }
function dName(did, full = false) {
  const d = Career.driver(G, did);
  if (!d) return esc(did);
  return esc(full ? d.name : shortName(d));
}
function shortName(d) { return d.lastName || d.name.replace(/\s+(Jr\.?|Sr\.?|II|III)$/i, '').split(' ').slice(-1)[0]; }
function rawName(did) { const d = Career.driver(G, did); return d ? shortName(d) : String(did); }
function dTag(did, full = true) {
  const d = Career.driver(G, did);
  if (!d) return esc(did);
  const tc = d.team ? teamColor(d.team) : '#556';
  return `<span class="row lnk" style="gap:7px;flex-wrap:nowrap" data-act="driverPage" data-id="${esc(d.id)}" title="Ver carreira"><span class="tcolor" style="background:${tc}"></span><span>${esc(full ? d.name : shortName(d))}</span></span>`;
}
function tTag(tid) {
  const t = Career.team(G, tid);
  if (!t) return '';
  return `<span class="row" style="gap:7px;flex-wrap:nowrap"><span class="tcolor" style="background:${t.color}"></span><span>${esc(t.name)}</span></span>`;
}
function tyreIcon(c, title) {
  const T = TYRES[c] || TYRES.M;
  if (!title && G && G.weekend && 'SMH'.includes(c) && typeof Engine.tprops === 'function') { const tr = Career.track(G, G.weekend.trackId); if (tr) title = Engine.tyreLabel(tr, c); }
  return `<span class="tyre" style="color:${T.color}" title="${esc(title || T.name)}">${T.short}</span>`;
}
/* aviso discreto: versão de fã, sem relação com pessoas, equipes ou empresas reais */
const DISCLAIMER = 'Projeto de fã, sem fins comerciais. Sem relação com a FIA, a Fórmula 1, equipes, pilotos, jornalistas, empresas ou marcas citados. Os acontecimentos do jogo são fictícios.';
function disclaimerHtml(short) { return `<p class="disclaimer">${short ? 'Simulação fictícia: sem relação com as pessoas, equipes e empresas reais citadas.' : DISCLAIMER}</p>`; }
/* patrocinador com logo (quando há), em todas as telas */
function sponsorTag(name) { const u = typeof Assets !== 'undefined' ? Assets.logoByName('sponsors', name) || Assets.logoByName('manufacturers', name) || Assets.logoByName('tyres', name) : null; return `<span class="spons">${u ? `<img src="${u}" alt="" loading="lazy" onerror="this.remove()">` : ''}<b>${esc(name)}</b></span>`; }
/* potencial: no modo Manager o jogador vê a faixa estimada pelos olheiros, nunca o número real */
function potEst(d) { return G && d && typeof Potential !== 'undefined' && !Career.isObs(G) ? Potential.estimate(G, d) : null; }
function potText(d) { const e = potEst(d); return e ? `<span title="Confiança ${e.label}">${e.lo}–${e.hi}</span>` : String(d.potential); }
function potMid(d) { const e = potEst(d); return e ? e.mid : d.potential; }
function potRow(d) { const e = potEst(d); if (!e) return potRow(d); return `<div class="attr"><span>Potencial (estimado)</span><span class="num r" style="text-align:right">${e.lo}–${e.hi}</span><div class="bar g"><i style="left:${e.lo}%;width:${Math.max(2, e.hi - e.lo)}%;position:absolute"></i></div></div><div class="small muted" style="margin:-4px 0 4px">Confiança ${e.label}${e.conf < 0.75 ? ' · mande um olheiro para estreitar a faixa' : ''}</div>`; }
function natTag(n) { return `<span class="nat" title="${esc(NAT_NAMES[n] || n)}">${typeof Assets !== 'undefined' ? Assets.flag(n) : ''}${esc(n)}</span>`; }
function flagOnly(n) { return typeof Assets !== 'undefined' ? Assets.flag(n, 'sm') : ''; }
function bar(v, max = 100, cls = '') { return `<div class="bar ${cls}"><i style="width:${clamp(v / max * 100, 0, 100)}%"></i></div>`; }
function attrRow(label, v, cls = '') { return `<div class="attr"><span>${label}</span><span class="num r" style="text-align:right">${Math.round(v)}</span>${bar(v, 100, cls)}</div>`; }
function ratingClass(v) { return v >= 90 ? 'pur' : v >= 84 ? 'pos' : v >= 78 ? '' : 'neg'; }
function pctBar(v) { return bar(v, 100, v < 30 ? 'r' : v > 70 ? 'g' : ''); }

/* ---------- gráfico de linhas SVG com tooltip ---------- */
function lineChart(id, cfg) {
  // cfg: {series:[{name,color,pts:[[x,y]...], width, dash}], h, xLabel, yLabel, invert, yFmt, xFmt, yMin, yMax, bands:[{from,to,color}]}
  UI.charts[id] = cfg;
  const W = 760, H = cfg.h || 300, m = { l: 52, r: 14, t: 12, b: 30 };
  const all = cfg.series.filter(s => !s.off).flatMap(s => s.pts.filter(p => p && isFinite(p[1])));
  if (!all.length) return `<div class="empty">Sem dados para exibir.</div>`;
  const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = cfg.yMin ?? Math.min(...ys), y1 = cfg.yMax ?? Math.max(...ys);
  if (y0 === y1) { y0 -= 1; y1 += 1; }
  if (x0 === x1) x1 = x0 + 1;
  const pad = (y1 - y0) * 0.06; if (cfg.yMin == null) y0 -= pad; if (cfg.yMax == null) y1 += pad;
  const sx = x => m.l + (x - x0) / (x1 - x0) * (W - m.l - m.r);
  const sy = y => cfg.invert ? m.t + (y - y0) / (y1 - y0) * (H - m.t - m.b) : H - m.b - (y - y0) / (y1 - y0) * (H - m.t - m.b);
  const yt = niceTicks(y0, y1, 5), xt = niceTicks(x0, x1, 8).filter(v => v >= x0 && v <= x1);
  const yFmt = cfg.yFmt || (v => +v.toFixed(2));
  const xFmt = cfg.xFmt || (v => v);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(cfg.title || 'Gráfico')}">`;
  (cfg.bands || []).forEach(b => { svg += `<rect x="${sx(b.from)}" y="${m.t}" width="${Math.max(2, sx(b.to) - sx(b.from))}" height="${H - m.t - m.b}" fill="${b.color}" opacity="0.14"/>`; });
  yt.filter(v => v >= y0 && v <= y1).forEach(v => { svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${sy(v)}" y2="${sy(v)}" stroke="var(--line)" stroke-width="1"/><text x="${m.l - 8}" y="${sy(v) + 4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${yFmt(v)}</text>`; });
  xt.forEach(v => { svg += `<text x="${sx(v)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${xFmt(v)}</text>`; });
  if (cfg.xLabel) svg += `<text x="${W - m.r}" y="${H - 10}" text-anchor="end" font-size="10.5" fill="var(--muted)">${esc(cfg.xLabel)}</text>`;
  cfg.series.forEach((s, si) => {
    if (s.off) return;
    let d = '', pen = false;
    s.pts.forEach(p => { if (!p || !isFinite(p[1])) { pen = false; return; } d += (pen ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1); pen = true; });
    svg += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round" stroke-linecap="round" opacity="${s.dim ? 0.35 : 1}"/>`;
    const last = s.pts.filter(p => p && isFinite(p[1])).slice(-1)[0];
    if (last && s.endDot !== false) svg += `<circle cx="${sx(last[0])}" cy="${sy(last[1])}" r="3" fill="${s.color}"/>`;
  });
  svg += `<line class="hl" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" stroke="var(--fg2)" stroke-width="1" opacity="0"/>`;
  svg += `<rect class="hit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/>`;
  svg += `</svg>`;
  cfg._geo = { W, H, m, x0, x1, sx };
  const legend = cfg.legend === false ? '' : `<div class="legend">${cfg.series.map((s, i) => `<span class="${s.off ? 'off' : ''}" data-act="toggleSeries" data-chart="${id}" data-i="${i}"><i style="background:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`;
  return `<div class="chart" id="ch-${id}">${svg}<div class="tip" hidden></div></div>${legend}`;
}
function niceTicks(a, b, n) {
  const span = b - a; if (span <= 0) return [a];
  const step0 = span / n; const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const st = [1, 2, 2.5, 5, 10].map(k => k * mag).find(s => s >= step0) || step0;
  const out = []; for (let v = Math.ceil(a / st) * st; v <= b + 1e-9; v += st) out.push(+v.toFixed(6)); return out;
}
function bindCharts() {
  Object.keys(UI.charts).forEach(id => {
    const box = $('#ch-' + id); if (!box) return;
    const cfg = UI.charts[id]; const svg = $('svg', box); const tip = $('.tip', box); const hl = $('.hl', svg); const hit = $('.hit', svg);
    if (!hit) return;
    const move = (ev) => {
      const r = svg.getBoundingClientRect();
      const g = cfg._geo;
      const px = (ev.clientX - r.left) / r.width * g.W;
      const xv = Math.round(g.x0 + (px - g.m.l) / (g.W - g.m.l - g.m.r) * (g.x1 - g.x0));
      const rows = cfg.series.filter(s => !s.off).map(s => { const p = s.pts.find(q => q && q[0] === xv); return p && isFinite(p[1]) ? { s, v: p[1] } : null; }).filter(Boolean);
      if (!rows.length) { tip.hidden = true; hl.setAttribute('opacity', 0); return; }
      rows.sort((a, b) => cfg.invert ? a.v - b.v : b.v - a.v);
      const yFmt = cfg.tipFmt || cfg.yFmt || (v => +v.toFixed(3));
      tip.innerHTML = `<div class="muted">${esc(cfg.xLabel || 'x')} ${xv}</div>` + rows.slice(0, 12).map(x => `<div><span class="tdot" style="background:${x.s.color}"></span> ${esc(x.s.name)} <b>${yFmt(x.v)}</b></div>`).join('');
      tip.hidden = false;
      const lx = g.sx(xv) / g.W * r.width;
      hl.setAttribute('x1', g.sx(xv)); hl.setAttribute('x2', g.sx(xv)); hl.setAttribute('opacity', 0.5);
      tip.style.left = Math.min(lx + 12, r.width - tip.offsetWidth - 4) + 'px';
      tip.style.top = '8px';
    };
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerleave', () => { tip.hidden = true; hl.setAttribute('opacity', 0); });
  });
}
ACT.toggleSeries = (el) => {
  const cfg = UI.charts[el.dataset.chart]; if (!cfg) return;
  const s = cfg.series[+el.dataset.i]; s.off = !s.off;
  const box = $('#ch-' + el.dataset.chart);
  const wrap = box.parentElement;
  const tmp = document.createElement('div');
  tmp.innerHTML = lineChart(el.dataset.chart, cfg);
  box.nextElementSibling && box.nextElementSibling.classList.contains('legend') && box.nextElementSibling.remove();
  box.replaceWith(...tmp.childNodes);
  bindCharts();
};

/* ---------- mapa de pista procedural ---------- */
const TRACK_CACHE = {};
function trackPath(track) {
  const key = track.id + ':' + track.shapeSeed + ':' + (track.shape ? track.shape.length : 0);
  if (TRACK_CACHE[key]) return TRACK_CACHE[key];
  if (track.shape && track.shape.length > 8) {
    // traçado real (coordenadas geográficas do circuito)
    const norm = track.shape.map(p => [p[0], p[1]]);
    const w = Math.max(...norm.map(p => p[0])), h = Math.max(...norm.map(p => p[1]));
    const cum = [0];
    for (let i = 1; i <= norm.length; i++) { const a = norm[i - 1], b = norm[i % norm.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    return (TRACK_CACHE[key] = { pts: norm, cum, len: cum[cum.length - 1], w, h, real: true });
  }
  const r = localRng(track.shapeSeed || hashStr(track.id));
  const n = 9 + Math.floor(r() * 6);
  const pts = [];
  const sx = 1 + (r() - 0.5) * 0.7, sy = 1 + (r() - 0.5) * 0.5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.45;
    const rad = 0.55 + r() * 0.5 - (track.street ? r() * 0.2 : 0);
    pts.push([Math.cos(a) * rad * sx, Math.sin(a) * rad * sy]);
  }
  // Catmull-Rom fechado
  const out = [];
  const seg = 40;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    for (let k = 0; k < seg; k++) {
      const t = k / seg, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  // normaliza e calcula comprimento acumulado
  const xs = out.map(p => p[0]), ys = out.map(p => p[1]);
  const minx = Math.min(...xs), maxx = Math.max(...xs), miny = Math.min(...ys), maxy = Math.max(...ys);
  const sc = 1 / Math.max(maxx - minx, maxy - miny);
  const norm = out.map(p => [(p[0] - minx) * sc, (p[1] - miny) * sc]);
  const cum = [0];
  for (let i = 1; i <= norm.length; i++) { const a = norm[i - 1], b = norm[i % norm.length]; cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
  const res = { pts: norm, cum, len: cum[cum.length - 1], w: (maxx - minx) * sc, h: (maxy - miny) * sc };
  TRACK_CACHE[key] = res;
  return res;
}
function trackPointAt(tp, frac) {
  frac = ((frac % 1) + 1) % 1;
  const d = frac * tp.len;
  let lo = 0, hi = tp.cum.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (tp.cum[mid] < d) lo = mid; else hi = mid; }
  const a = tp.pts[lo % tp.pts.length], b = tp.pts[(lo + 1) % tp.pts.length];
  const t = (d - tp.cum[lo]) / ((tp.cum[lo + 1] - tp.cum[lo]) || 1);
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}
function drawTrack(canvas, track, cars, opts = {}) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) { canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr); }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  const tp = trackPath(track);
  const pad = opts.pad ?? 28;
  const s = Math.min((rect.width - pad * 2) / tp.w, (rect.height - pad * 2) / tp.h);
  const ox = (rect.width - tp.w * s) / 2, oy = (rect.height - tp.h * s) / 2;
  const P = (p) => [ox + p[0] * s, oy + p[1] * s];
  const path = () => { ctx.beginPath(); tp.pts.forEach((p, i) => { const q = P(p); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); };
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (opts.outline) {
    path(); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = (opts.thick || 10) + 6; ctx.stroke();
    path(); ctx.strokeStyle = opts.outline; ctx.lineWidth = opts.thick || 10; ctx.stroke();
  } else {
    path(); ctx.strokeStyle = opts.wet ? '#26334a' : '#38383f'; ctx.lineWidth = opts.thick || 14; ctx.stroke();
    path(); ctx.strokeStyle = '#15151e'; ctx.lineWidth = (opts.thick || 14) - 5; ctx.stroke();
    path(); ctx.strokeStyle = opts.lineColor || 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.4; ctx.setLineDash([]); ctx.stroke();
  }
  // setores
  [0.33, 0.66].forEach(f => { const q = P(trackPointAt(tp, f)); ctx.fillStyle = '#556172'; ctx.beginPath(); ctx.arc(q[0], q[1], 2.5, 0, Math.PI * 2); ctx.fill(); });
  // largada/chegada
  const sf = P(trackPointAt(tp, 0)), sf2 = P(trackPointAt(tp, 0.004));
  const ang = Math.atan2(sf2[1] - sf[1], sf2[0] - sf[0]) + Math.PI / 2;
  ctx.strokeStyle = opts.outline ? '#15151e' : ACCENT; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(sf[0] - Math.cos(ang) * 11, sf[1] - Math.sin(ang) * 11); ctx.lineTo(sf[0] + Math.cos(ang) * 11, sf[1] + Math.sin(ang) * 11); ctx.stroke();
  if (opts.revealLen != null) {
    // animação de desenho (tela título)
  }
  (cars || []).forEach(c => {
    const q = P(trackPointAt(tp, c.frac));
    ctx.beginPath(); ctx.arc(q[0], q[1], c.me ? 6.5 : 5, 0, Math.PI * 2);
    ctx.fillStyle = c.color; ctx.fill();
    ctx.lineWidth = c.me ? 2.5 : 1.2; ctx.strokeStyle = c.me ? '#ffffff' : '#15151e'; ctx.stroke();
    if (c.label) {
      ctx.font = '700 11px "Titillium Web", sans-serif'; ctx.fillStyle = c.me ? '#ffffff' : 'rgba(255,255,255,.75)';
      ctx.fillText(c.label, q[0] + 8, q[1] - 7);
    }
  });
}

/* ---------- utilidades de formulários ---------- */
function opt(v, label, sel) { return `<option value="${esc(v)}" ${String(v) === String(sel) ? 'selected' : ''}>${esc(label)}</option>`; }
function segBtns(act, value, items, extra = '') {
  return `<div class="seg">${items.map(([v, l]) => `<button class="${String(v) === String(value) ? 'on' : ''}" data-act="${act}" data-val="${esc(v)}" ${extra}>${esc(l)}</button>`).join('')}</div>`;
}

/* ---------- eventos globais ---------- */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const fn = ACT[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-chg]');
  if (!el) return;
  const fn = CHG[el.dataset.chg];
  if (fn) fn(el, e);
});
document.addEventListener('input', (e) => {
  const el = e.target.closest('[data-inp]');
  if (!el) return;
  const fn = CHG[el.dataset.inp];
  if (fn) fn(el, e);
});

function autosave() {
  if (!G) return;
  Store.saveGame(SLOT, G).then(where => { UI.lastSave = { at: Date.now(), where }; }).catch(e => { Store.log('error', 'autosave: ' + (e && e.message)); toast('Não foi possível salvar o jogo. Veja Diagnóstico.', 'bad'); });
}

/* erros inesperados: registra no log (com a pilha) e avisa sem derrubar o jogo.
   O mesmo erro repetido (ex.: dentro de um laço ao vivo) gera um aviso só e uma linha
   no log a cada 30 s, com a contagem; nada é escondido: tudo aparece em Diagnóstico. */
UI.errors = [];
function reportError(where, e) {
  const msg = String((e && e.message) || e);
  const key = where + '|' + msg;
  const now = Date.now();
  let rec = UI.errors.find(x => x.key === key);
  if (!rec) { rec = { key, where, msg, stack: String((e && e.stack) || '').split('\n').slice(0, 6).join(' | '), count: 0, first: now, logged: 0 }; UI.errors.unshift(rec); if (UI.errors.length > 30) UI.errors.length = 30; }
  rec.count++; rec.last = now;
  if (now - rec.logged > 30000) {
    rec.logged = now;
    try { Store.log('error', `[${where}] ${msg}${rec.count > 1 ? ` (x${rec.count})` : ''} :: ${rec.stack}`); } catch (x) { /* sem log */ }
    try { toast(`Erro em ${where}. Registrado no log (Diagnóstico).`, 'bad'); } catch (x) { /* ignore */ }
  }
}
window.addEventListener('error', (e) => reportError('interface', e.error || new Error(`${e.message} @ ${e.filename}:${e.lineno}`)));
window.addEventListener('unhandledrejection', (e) => { Store.log('error', 'promessa: ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)); });
