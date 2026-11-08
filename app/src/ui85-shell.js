/* ============================================================
   PIT WALL 0.8.5 — casca da interface
   - 10 áreas (Início, Corrida, Equipe, Carro, Fábrica, Mercado, Finanças,
     Mundo, Arquivo, Sistema); as telas de cada área viram abas.
   - Menu na lateral, no topo ou embaixo (Opções → Interface).
   - Tema escuro (padrão) ou claro.
   - Botão de ação único no topo: decisões pendentes, ir ao fim de semana,
     corrida ao vivo ou avançar a data.
   - Busca rápida (Ctrl+K) por telas, pilotos, equipes e circuitos.
   ============================================================ */
'use strict';

const UIPREF = (() => {
  const KEY = 'pitwall-ui85';
  let p = { theme: 'dark', nav: 'side' };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s && typeof s === 'object') p = Object.assign(p, s); } catch (e) { /* sem armazenamento */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* sem armazenamento */ } };
  const apply = () => { document.documentElement.dataset.theme = p.theme === 'light' ? 'light' : 'dark'; };
  apply();
  return { get: (k) => p[k], set: (k, v) => { p[k] = v; save(); apply(); }, apply };
})();

const ICON85 = {
  inicio: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  corrida: 'M5 21V4m0 0h11l-2 4 2 4H5',
  equipe: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-6 10a6 6 0 0 1 12 0m2-10a3 3 0 1 0 0-6m2 16a5 5 0 0 0-3-4.6',
  carro: 'M3 15l2-5h14l2 5v3H3zM7 18v2m10-2v2M6 13h3m6 0h3M8 10l1.5-3h5L16 10',
  fabrica: 'M3 21V9l6 4V9l6 4V5h6v16zM7 17h2m4 0h2m3 0h1',
  mercado: 'M4 7h16l-1.5 12h-13zM9 7a3 3 0 0 1 6 0',
  financas: 'M12 3v18M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6',
  mundo: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  arquivo: 'M4 4h16v4H4zM5 8v12h14V8M10 12h4',
  sistema: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z',
  back: 'M15 18l-6-6 6-6', sun: 'M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m11.4 1.4-1.4-1.4M6.3 6.3 4.9 4.9M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z', moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
};
/* áreas e abas: [view, rótulo, params, condição] */
const AREAS85 = [
  ['inicio', 'Início', 'Início', [['hub', 'Central'], ['inbox', 'Caixa de entrada'], ['calendar', 'Calendário']]],
  ['corrida', 'Corrida', 'Race', [['weekend', 'Fim de semana'], ['race', 'Corrida ao vivo', null, () => G.weekend && G.weekend.race], ['pole', 'Grid e pole', null, () => (G.weekend && G.weekend.quali && G.weekend.quali.order) || (G.lastRace && G.lastRace.quali)], ['podium', 'Pódio', null, () => G.lastRace && G.lastRace.cars], ['post', 'Pós-corrida', null, () => G.lastRace], ['analysis', 'Análise de dados']]],
  ['equipe', 'Equipe', 'Team', [['team', 'Pilotos', { tab: 'drivers' }], ['mano', 'Mano a Mano'], ['team', 'Funcionários', { tab: 'staff' }], ['academy', 'Academia'], ['scout', 'Olheiros'], ['sister', 'Parcerias'], ['teamSetup', 'Montagem da equipe', null, () => G.teamSetup && G.teamSetup.pending]]],
  ['carro', 'Carro', 'Car', [['car', 'Carro'], ['dev', 'Projetos de P&D']]],
  ['fabrica', 'Fábrica', 'Factory', [['facilities', 'Sede e fábrica']]],
  ['mercado', 'Mercado', 'Market', [['market', 'Pilotos']]],
  ['financas', 'Finanças', 'Finance', [['finance', 'Finanças'], ['sponsors', 'Patrocinadores']]],
  ['mundo', 'Mundo', 'World', [['standings', 'Classificação'], ['paddock', 'Equipes do grid'], ['owners', 'Donos e equipes'], ['manufacturers', 'Fabricantes'], ['council', 'Conselho da FIA'], ['news', 'Notícias'], ['social', 'Redes sociais'], ['cats', 'Outras categorias'], ['circuits', 'Circuitos'], ['log', 'Registro']]],
  ['arquivo', 'Arquivo', 'Archive', [['history', 'Minha carreira'], ['seasons', 'Temporadas desde 1950'], ['hall', 'Hall da Fama']]],
  ['sistema', 'Sistema', 'System', [['saves', 'Salvar e opções'], ['editor', 'Editor da base'], ['account', 'Perfil'], ['diag', 'Diagnóstico']]],
];
/* telas que não aparecem como aba, mas pertencem a uma área */
const AREA_OF85 = { driverPage: 'equipe', teamPage: 'mundo', circuit: 'mundo', seasonEnd: 'inicio', newcareer: 'sistema', title: 'sistema' };
const OBS_HIDE85 = new Set(['inbox', 'team', 'mano', 'academy', 'scout', 'sister', 'car', 'dev', 'facilities', 'market', 'finance', 'sponsors', 'teamSetup']);
function area85(view) {
  if (AREA_OF85[view]) return AREA_OF85[view];
  const a = AREAS85.find(x => x[3].some(t => t[0] === view));
  return a ? a[0] : 'inicio';
}
function tabsOf85(areaId) {
  const a = AREAS85.find(x => x[0] === areaId); if (!a) return [];
  const obs = G && Career.isObs(G);
  return a[3].filter(t => (!obs || !OBS_HIDE85.has(t[0])) && (!t[3] || (G && t[3]())) && SCREENS[t[0]]);
}
function tabOn85(t) {
  if (UI.view !== t[0]) return false;
  if (!t[2]) return !UI.params || !UI.params.tab || !tabsOf85(area85(UI.view)).some(x => x[0] === t[0] && x[2] && x[2].tab === UI.params.tab);
  return Object.keys(t[2]).every(k => String((UI.params || {})[k] || (k === 'tab' && t[0] === 'team' ? 'drivers' : '')) === String(t[2][k]));
}
const svg85 = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;

/* botão de ação único */
function cta85() {
  if (Career.isObs(G)) return `<button class="x-cta" data-act="simRound">${byLang('Simular etapa', 'Simulate round')}<small>${esc(nextRaceName85())}</small></button>`;
  if (Career.seasonOver(G)) return `<button class="x-cta" data-act="go" data-v="hub"><span>${byLang('Fim de temporada', 'Season review')}<small>${byLang('campeões e premiação', 'champions and awards')}</small></span>→</button>`;
  if (G.weekend) {
    if (G.weekend.race && G.weekend.race.finished) return `<button class="x-cta live" data-act="finishWeekend"><span>${byLang('Encerrar fim de semana', 'Finish the weekend')}<small>${byLang('pódio e resultados', 'podium and results')}</small></span>→</button>`;
    const live = G.weekend.race && !G.weekend.race.finished;
    return `<button class="x-cta live" data-act="go" data-v="${G.weekend.race ? 'race' : 'weekend'}"><span>${live ? byLang('Corrida ao vivo', 'Live race') : byLang('Fim de semana', 'Race weekend')}<small>${esc(nextRaceName85())}</small></span>→</button>`;
  }
  Time.init(G);
  const bl = Time.blockers(G);
  if (bl.length) return `<button class="x-cta wait" data-act="openBlocker"><span>${bl.length} ${bl.length > 1 ? byLang('pendências', 'pending') : byLang('pendência', 'pending')}<small>${byLang('resolva antes de avançar', 'resolve before continuing')}</small></span>→</button>`;
  const atWk = Time.diff(G.today, Time.weekendDay(G)) <= 0;
  if (atWk) return `<button class="x-cta" data-act="toWeekend"><span>${byLang('Ir para o GP', 'Go to the GP')}<small>${esc(nextRaceName85())}</small></span>→</button>`;
  const up = Time.upcoming(G).find(x => x.date > G.today);
  return `<button class="x-cta" data-act="advanceTime"><span>${byLang('Avançar', 'Continue')}<small>${up ? esc(Time.fmt(up.date)) + ' · ' + esc(up.label) : esc(nextRaceName85())}</small></span>→</button>`;
}
function nextRaceName85() { const id = G.season.calendar[Math.min(G.season.round, G.season.calendar.length - 1)]; const tr = id && Career.track(G, id); return tr ? tr.gp : ''; }

/* faixa de notícias rotativa (Central e Notícias) */
function ticker85() {
  const items = (G.news || []).slice(0, 14);
  if (!items.length) return '';
  const one = items.map(n => `<a data-act="go" data-v="news"><small>${esc(n.tag ? (typeof NEWS_TAGS85 !== 'undefined' && NEWS_TAGS85[n.tag]) || n.tag : 'Paddock')}</small>${esc(n.title)}</a>`).join('');
  return `<div class="x-ticker" role="marquee" aria-label="${byLang('Últimas do paddock', 'Paddock news')}"><b>Paddock</b><div class="x-tk-w"><div class="x-tk" style="--dur:${Math.max(40, items.length * 7)}s">${one}${one}</div></div></div>`;
}

function shell85(inner) {
  const obs = Career.isObs(G);
  const team = obs ? null : Career.team(G);
  const root = document.documentElement;
  root.style.setProperty('--team', team ? team.color : '#E10600');
  root.style.setProperty('--team2', team ? (team.color2 || '#ffffff') : '#ffffff');
  root.style.setProperty('--team-ink', team && luma85(team.color) > 0.62 ? '#111317' : '#ffffff');
  const area = area85(UI.view);
  const unread = obs ? 0 : G.inbox.filter(m => !m.read).length;
  const areas = AREAS85.filter(a => a[0] !== 'sistema' && tabsOf85(a[0]).length).map(a => `<button class="x-area ${a[0] === area ? 'on' : ''}" data-act="go" data-v="${tabsOf85(a[0])[0][0]}" ${tabsOf85(a[0])[0][2] ? `data-p='${JSON.stringify(tabsOf85(a[0])[0][2])}'` : ''} title="${esc(byLang(a[1], a[2]))}">${svg85(ICON85[a[0]])}<span>${esc(byLang(a[1], a[2]))}</span>${a[0] === 'inicio' && unread ? `<span class="badge">${unread > 99 ? '99+' : unread}</span>` : ''}${a[0] === 'corrida' && G.weekend ? '<span class="live"></span>' : ''}</button>`).join('');
  const tabs = tabsOf85(area);
  const sub = tabs.length > 1 ? `<nav class="x-sub" aria-label="${byLang('Telas da área', 'Area screens')}">${tabs.map(t => `<button class="${tabOn85(t) ? 'on' : ''}" data-act="go" data-v="${t[0]}" ${t[2] ? `data-p='${JSON.stringify(t[2])}'` : ''}>${esc(tabLabel85(t))}${t[0] === 'inbox' && unread ? `<span class="badge">${unread > 99 ? '99+' : unread}</span>` : ''}</button>`).join('')}</nav>` : '';
  const curTab = tabs.find(tabOn85);
  const title = curTab ? byLang(curTab[1], T(curTab[1])) : (SCREEN_TITLE85[UI.view] || '');
  let kpis = '';
  if (!obs) {
    const sc = Career.standingsC(G); const pos = sc.findIndex(x => x.tid === team.id) + 1;
    const conf = Math.round(G.board.confidence);
    kpis = `<div class="x-kpis"><span class="x-kpi ${pos <= (G.board.target || 99) ? 'g' : 'y'}" title="${byLang('Meta da diretoria', 'Board target')}: ${G.board.target}º"><i></i>${byLang('Construtores', 'Constructors')} <b>${ordinal(pos)}</b></span><span class="x-kpi ${G.finances.balance < 0 ? 'r' : ''}"><i></i>${byLang('Caixa', 'Cash')} <b>${fmtMoney(G.finances.balance)}</b></span><span class="x-kpi ${conf < 30 ? 'r' : conf < 55 ? 'y' : 'g'}">${ring85(conf, 22, '')}${byLang('Diretoria', 'Board')} <b>${conf}%</b></span><span class="x-kpi"><i></i><b>${typeof Time !== 'undefined' ? esc(Time.fmt(G.today)) : G.season.year}</b></span></div>`;
  } else {
    kpis = `<div class="x-kpis"><span class="x-kpi"><i></i>${byLang('Modo Observador', 'Observer mode')}</span><span class="x-kpi"><i></i>${byLang('Temporada', 'Season')} <b>${G.season.year} · ${Math.min(G.season.round + 1, G.season.calendar.length)}/${G.season.calendar.length}</b></span></div>`;
  }
  const nav = UIPREF.get('nav');
  const logo = team ? (imgUrl(team.logo) ? `<img src="${imgUrl(team.logo)}" alt="">` : `<b>${esc(team.short || teamAbbr(team.name))}</b>`) : '<b>PW</b>';
  return `<div class="x-app nav-${nav === 'top' || nav === 'bottom' ? nav : 'side'}">
    <nav class="x-rail" aria-label="${byLang('Áreas', 'Areas')}"><button class="x-logo" data-act="go" data-v="hub" title="${esc(team ? team.name : 'PitWall')}">${logo}</button>${areas}<span class="sp"></span><button class="x-area ${area === 'sistema' ? 'on' : ''}" data-act="go" data-v="saves" title="${byLang('Sistema', 'System')}">${svg85(ICON85.sistema)}<span>${byLang('Sistema', 'System')}</span></button></nav>
    <div class="x-main">
      <header class="x-top"><button class="x-ibtn" data-act="back" aria-label="${byLang('Voltar', 'Back')}" title="${byLang('Voltar (Alt + ←)', 'Back (Alt + ←)')}" ${UI.hist && UI.hist.length ? '' : 'disabled'}>${svg85(ICON85.back)}</button>
        <div class="x-crumb"><small>${esc(byLang(...(AREAS85.find(a => a[0] === area) || ['', 'Início', 'Home']).slice(1, 3)))}</small><b>${esc(title)}</b></div>${kpis}
        <span class="x-grow"></span>
        <button class="x-search" data-act="search85" aria-label="${byLang('Buscar', 'Search')}"><span>${byLang('Buscar telas, pilotos, equipes…', 'Search screens, drivers, teams…')}</span><kbd>Ctrl K</kbd></button>
        <button class="x-ibtn" data-act="theme85" aria-label="${byLang('Trocar tema', 'Switch theme')}" title="${byLang('Tema claro ou escuro', 'Light or dark theme')}">${svg85(UIPREF.get('theme') === 'light' ? ICON85.moon : ICON85.sun)}</button>
        ${cta85()}</header>
      ${sub}
      <main class="main"><div class="main-inner">${inner}</div></main>
    </div></div>`;
}
/* durante um fim de semana, Pódio e Pós-corrida ainda mostram o GP anterior: o rótulo diz isso */
function tabLabel85(t) {
  const l = byLang(t[1], T(t[1]));
  const wk = G && G.weekend; const prevOnly = wk && !(wk.race && wk.race.finished) && G.lastRace;
  if (prevOnly && (t[0] === 'podium' || t[0] === 'post')) return `${l} · ${byLang('GP anterior', 'last GP')}`;
  return l;
}
const SCREEN_TITLE85 = { driverPage: 'Ficha do piloto', teamPage: 'Página da equipe', circuit: 'Circuito', seasonEnd: 'Fim de temporada' };
function luma85(hex) { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '')); if (!m) return 0.3; const n = parseInt(m[1], 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; }
function ring85(v, sz = 52, label = '') { const c = v >= 70 ? 'hi' : v >= 45 ? 'mid' : v >= 30 ? 'lo' : 'bad'; return `<span class="n-ring t-${c}${sz < 30 ? ' ring-s' : ''}" style="--v:${Math.max(0, Math.min(100, v))};--sz:${sz}px">${sz >= 30 ? `<b>${Math.round(v)}</b>` : ''}${label ? `<small>${esc(label)}</small>` : ''}</span>`; }

shellHtml = function (inner) { return shell85(inner); };
shellObsHtml = function (inner) { return shell85(inner); };

ACT.theme85 = () => { UIPREF.set('theme', UIPREF.get('theme') === 'light' ? 'dark' : 'light'); render(); };
ACT.navPos85 = (el) => { UIPREF.set('nav', el.dataset.val); render(); };
ACT.themeSet85 = (el) => { UIPREF.set('theme', el.dataset.val); render(); };

/* ---------- busca rápida (Ctrl+K) ---------- */
function searchItems85(q) {
  const out = [];
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const nq = norm(q);
  AREAS85.forEach(a => tabsOf85(a[0]).forEach(t => out.push({ k: byLang('Tela', 'Screen'), t: byLang(t[1], T(t[1])), s: byLang(a[1], a[2]), go: t[0], p: t[2] })));
  if (G) {
    G.db.teams.forEach(t => out.push({ k: byLang('Equipe', 'Team'), t: t.name, s: t.fullName || '', act: 'teamPage85', id: t.id, color: t.color }));
    G.db.drivers.filter(d => d.team && d.seat).forEach(d => out.push({ k: byLang('Piloto', 'Driver'), t: d.name, s: (Career.team(G, d.team) || {}).name || '', act: 'driverPage', id: d.id, color: teamColor(d.team) }));
    G.season.calendar.forEach(id => { const tr = Career.track(G, id); if (tr) out.push({ k: byLang('Circuito', 'Circuit'), t: tr.circuit || tr.gp, s: tr.gp, act: 'circuitPage', id: tr.id }); });
  }
  const res = nq ? out.filter(x => norm(x.t + ' ' + x.s).includes(nq)) : out.filter(x => x.k === byLang('Tela', 'Screen'));
  return res.slice(0, 12);
}
function searchList85(q) {
  const items = searchItems85(q);
  UI.search85 = { q, items, sel: 0 };
  return items.map((x, i) => `<button class="x-sr ${i === 0 ? 'on' : ''}" ${x.go ? `data-act="searchGo85" data-i="${i}"` : `data-act="searchGo85" data-i="${i}"`}><span class="x-sk">${esc(x.k)}</span>${x.color ? `<i class="n-slab" style="background:${x.color}"></i>` : ''}<b>${esc(x.t)}</b><span class="n-mu n-sm">${esc(x.s)}</span><kbd class="x-kbd">↵</kbd></button>`).join('') || `<div class="n-empty" style="padding:14px 18px"><i></i>${byLang('Nada encontrado.', 'Nothing found.')}</div>`;
}
ACT.search85 = () => {
  if (!G) return;
  closeModal();
  const bg = document.createElement('div');
  bg.className = 'modal-bg x-search-bg'; bg.id = 'modal';
  bg.innerHTML = `<div class="x-search-box" role="dialog" aria-modal="true" aria-label="${byLang('Busca rápida', 'Quick search')}"><div class="x-si"><svg viewBox="0 0 24 24"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4.3-4.3"/></svg><input id="q85" autocomplete="off" placeholder="${byLang('Digite uma tela, piloto, equipe ou circuito', 'Type a screen, driver, team or circuit')}" aria-label="${byLang('Buscar', 'Search')}"><kbd class="x-kbd">Esc</kbd></div><div class="x-sl" id="sl85">${searchList85('')}</div></div>`;
  bg.addEventListener('click', e => { if (e.target === bg) closeModal(); });
  document.body.appendChild(bg);
  const inp = document.getElementById('q85');
  inp.focus();
  inp.addEventListener('input', () => { document.getElementById('sl85').innerHTML = searchList85(inp.value); });
  inp.addEventListener('keydown', (e) => {
    const s = UI.search85; if (!s) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); s.sel = (s.sel + (e.key === 'ArrowDown' ? 1 : -1) + s.items.length) % Math.max(1, s.items.length); document.querySelectorAll('.x-sr').forEach((b, i) => b.classList.toggle('on', i === s.sel)); }
    if (e.key === 'Enter') { e.preventDefault(); ACT.searchGo85({ dataset: { i: s.sel } }); }
    if (e.key === 'Escape') closeModal();
  });
};
ACT.searchGo85 = (el) => {
  const s = UI.search85; const x = s && s.items[+el.dataset.i]; if (!x) return;
  closeModal();
  if (x.go) return go(x.go, x.p || {});
  if (ACT[x.act]) ACT[x.act]({ dataset: { id: x.id } });
};
ACT.teamPage85 = (el) => go('teamPage', { id: el.dataset.id });
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && G) { e.preventDefault(); ACT.search85(); }
  if (e.key === 'Escape' && document.querySelector('.x-search-bg')) closeModal();
});

/* ---------- Opções → Interface ---------- */
(function () {
  const old = SCREENS.saves; if (!old) return;
  SCREENS.saves = {
    html() {
      const th = UIPREF.get('theme'), nv = UIPREF.get('nav');
      const opt3 = (act, cur, items) => `<div class="n-seg">${items.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-act="${act}" data-val="${v}">${l}</button>`).join('')}</div>`;
      const pane = `<section class="n-card ui85-opt"><header class="n-ch"><h3>${byLang('Interface', 'Interface')}</h3><span class="n-ca">${byLang('vale para todas as carreiras neste computador', 'applies to every career on this computer')}</span></header><div class="n-bd">
        <div class="ui85-row"><div><b>${byLang('Tema', 'Theme')}</b><span>${byLang('Escuro é o padrão. O claro lembra a papelada do paddock.', 'Dark is the default. Light looks like paddock paperwork.')}</span></div>${opt3('themeSet85', th, [['dark', byLang('Escuro', 'Dark')], ['light', byLang('Claro', 'Light')]])}</div>
        <div class="ui85-row"><div><b>${byLang('Posição do menu', 'Menu position')}</b><span>${byLang('Lateral: mais altura para tabelas (recomendado). Topo: mais largura. Embaixo: estilo console, bom para telas largas.', 'Side: more height for tables (recommended). Top: more width. Bottom: console style, good for wide screens.')}</span></div>${opt3('navPos85', nv === 'top' || nv === 'bottom' ? nv : 'side', [['side', byLang('Lateral', 'Side')], ['top', byLang('Topo', 'Top')], ['bottom', byLang('Embaixo', 'Bottom')]])}</div>
        <div class="ui85-row"><div><b>${byLang('Atalhos', 'Shortcuts')}</b><span>${byLang('Ctrl+K abre a busca · Alt+← volta para a tela anterior', 'Ctrl+K opens search · Alt+← goes back')}</span></div></div></div></section>`;
      return pane + old.html.call(this);
    },
    after() { if (old.after) old.after.call(this); },
  };
})();
