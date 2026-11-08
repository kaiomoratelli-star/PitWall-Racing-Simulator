/* Proposta A · Transmissão — kit de componentes, casca e telas com layout próprio. */
(function () {
'use strict';
const W = window.PW; const { D, PT, esc, nf, money, moneyS, lap, dname, dlast, dabbr, drv, team, tcol, tname, flag, faceUrl, initials, cal, nextGP, myDrivers, standDRows, standCRows, ATTR, ATTR_GROUPS, STYLE, CAR, TYRE, NEWS_TAG, OUTLET, tone, toneCond, trackSvg, trackPath, dateS, BASE, SC, AREAS, SCREENS } = W;

/* ---------- kit ---------- */
const at = (go, p) => go ? ` data-go="${go}"${p ? ` data-p='${JSON.stringify(p)}'` : ''}` : '';
const K = {};
K.page = (head, body) => head + body;
K.head = ({ t, s, act, tabs, tab, tabKey }) => `<div class="ph"><div><h1>${esc(t)}</h1>${s ? `<p>${s}</p>` : ''}</div><div class="grow"></div>${tabs ? `<div class="tabs">${tabs.map(([v, l]) => `<button type="button" data-tab="${esc(v)}" data-tk="${tabKey || 'tab'}" class="${v === tab ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>` : ''}${act ? `<div class="acts">${act}</div>` : ''}</div>`;
K.card = ({ t, a, body, cls = '', flush, go, p }) => `<section class="card ${cls}${flush ? ' flush' : ''}${go ? ' go' : ''}"${at(go, p)}>${t ? `<header class="ch"><h3>${esc(t)}</h3>${a ? `<span class="ca">${a}</span>` : ''}</header>` : ''}<div class="bd">${body}</div></section>`;
K.grid = (tpl, ...items) => `<div class="g" style="grid-template-columns:${tpl}">${items.join('')}</div>`;
K.table = (cols, rows, o = {}) => `<table class="t ${o.cls || ''}"><thead><tr>${cols.map(c => `<th class="${c[1] || ''}"${c[2] ? ` style="width:${c[2]}"` : ''}>${esc(c[0])}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr class="${o.hl && o.hl(r, i) ? 'me' : ''} ${o.rowCls ? o.rowCls(i) : ''}">${r.map((c, j) => `<td class="${cols[j][1] || ''}">${c == null ? '' : c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
K.chip = (t, c = 'n') => `<span class="chip ${c}">${t}</span>`;
K.btn = (t, o = {}) => `<a class="btn ${o.kind === 'sec' || !o.kind ? 'alt' : o.kind}"${at(o.go, o.p)} role="button" tabindex="0">${t}</a>`;
K.stat = (l, v, s, c = '') => `<div class="stat ${c}"><div class="l">${esc(l)}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
K.bar = (v, o = {}) => `<span class="bar t-${o.tone || tone(v)}" style="width:${o.w || 100}px"><i style="width:${Math.max(0, Math.min(100, v / (o.max || 100) * 100))}%"></i></span>`;
K.ring = (v, o = {}) => { const s = o.size || 52; return `<span class="ring t-${tone(v)}" style="--v:${Math.max(0, Math.min(100, (v - 50) * 2))};width:${s}px;height:${s}px"><b style="font-size:${Math.round(s * 0.3)}px">${nf(v, 0)}</b></span>`; };
K.av = (d, s = 40) => { const u = d && (d.face || d.img) ? faceUrl(d) : null; return u ? `<img class="av" src="${u}" alt="" style="width:${s}px;height:${s}px">` : `<span class="av" style="width:${s}px;height:${s}px;font-size:${Math.round(s * 0.36)}px">${esc(initials(d && d.name))}</span>`; };
K.who = (did, tid) => { const d = drv(did); const t = tid || (d && d.team); return `<span class="who"><i class="slab" style="background:${tcol(t)}"></i>${d && d.nat ? flag(d.nat) : ''}<a data-go="driver" data-p='{"id":"${did}"}'><b>${esc(dname(did))}</b></a></span>`; };
K.tm = (tid) => { const t = team(tid); return `<a class="tm" data-go="teampage" data-p='{"id":"${tid}"}'><i class="slab" style="background:${tcol(tid)}"></i>${t && t.logo ? `<img src="${W.logoUrl(t)}" alt="">` : ''}${esc(tname(tid))}</a>`; };
K.dot = (tid) => `<i class="dot" style="background:${tcol(tid)}" title="${esc(tname(tid))}"></i>`;
K.kv = (pairs) => `<dl class="kv">${pairs.map(([a, b]) => `<dt>${a}</dt><dd>${b == null ? '—' : b}</dd>`).join('')}</dl>`;
K.list = (items, o = {}) => `<div class="list${o.compact ? ' compact' : ''}">${items.map(it => `<${it.go ? 'a' : 'div'} class="li${it.on ? ' on' : ''}${it.unread ? ' unread' : ''}"${at(it.go, it.p)}>${it.lead ? `<span class="ll">${it.lead}</span>` : ''}<span class="lt"><b>${esc(it.title)}</b>${it.sub ? `<span>${esc(it.sub)}</span>` : ''}</span>${it.tail ? `<span class="lr">${it.tail}</span>` : ''}</${it.go ? 'a' : 'div'}>`).join('')}</div>`;
K.empty = (t, act) => `<div class="empty"><i></i><div><p>${esc(t)}</p>${act ? `<div style="margin-top:8px">${act}</div>` : ''}</div></div>`;
K.help = (t) => `<div class="help">${esc(t)}</div>`;
K.tyre = (c) => `<span class="tyre ${(TYRE[c] || ['', 'med'])[1]}" title="${(TYRE[c] || [''])[0]}">${c}</span>`;
K.pos = (n) => `<span class="pos ${n <= 3 ? 'p' + n : ''}">${n}</span>`;
K.attr = (l, v) => `<div class="attr t-${tone(v)}"><span>${esc(l)}</span>${K.bar(v, { w: 120 })}<b>${v}</b></div>`;
K.stars = (n) => `<span class="stars" title="${n} estrelas">${'★'.repeat(Math.floor(n))}${n % 1 ? '½' : ''}<s>${'★'.repeat(5 - Math.ceil(n))}</s></span>`;
K.num = (v) => `<span class="num" style="color:var(--t-${tone(v)})">${nf(v, 1)}</span>`;
K.field = (l, v) => `<label class="fld"><span>${esc(l)}</span><div>${esc(v)}</div></label>`;
K.slider = (l, v, mn, mx, u) => `<div class="slider"><div class="sh"><span>${esc(l)}</span><b>${nf(v, 0)} ${esc(u)}</b></div><div class="st2"><i style="width:${(v - mn) / (mx - mn) * 100}%"></i><em style="left:${(v - mn) / (mx - mn) * 100}%"></em></div></div>`;
K.post = (s) => `<article class="post"><div class="post-h">${K.av(s.by.kind === 'driver' ? drv(s.by.ref) || { name: s.by.name } : { name: s.by.name }, 36)}<div><b>${esc(s.by.name)}</b><span>@${esc(s.by.handle || '')} · etapa ${s.r}</span></div></div><p>${esc(s.text)}</p><div class="post-f"><span>♥ ${nf(s.likes)}</span><span>↻ ${nf(s.reposts)}</span></div></article>`;
K.spark = (vals, o = {}) => { const w = o.w || 120, h = o.h || 32; const mn = Math.min(...vals), mx = Math.max(...vals); const pts = vals.map((v, i) => `${(i / (vals.length - 1) * w).toFixed(1)},${(h - 3 - (v - mn) / (mx - mn || 1) * (h - 6)).toFixed(1)}`).join(' '); const last = pts.split(' ').pop().split(','); return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="0,${h} ${pts} ${w},${h}" fill="color-mix(in srgb, ${o.c || 'var(--team)'} 18%, transparent)" stroke="none"/><polyline points="${pts}" fill="none" stroke="${o.c || 'var(--team)'}" stroke-width="1.8"/><circle cx="${last[0]}" cy="${last[1]}" r="3" fill="${o.c || 'var(--team)'}"/></svg>`; };

/* ---------- casca ---------- */
const ICON = {
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
};
const first = (a) => SCREENS.find(s => s[0] === a)[1];
const HIDE_TABS = new Set(['decision', 'driver', 'negotiation', 'newproject', 'teampage', 'circuit', 'search']);
const shell = (id, body) => {
  const sc = SC[id]; const area = sc.area;
  const tabs = SCREENS.filter(s => s[0] === area && !HIDE_TABS.has(s[1]));
  const conf = D.meta.board.confidence; const pend = W.pending.length;
  return `<div class="shell" style="--team:${PT.color}"><nav class="rail" aria-label="Áreas"><a class="rail-logo" data-go="hub" title="${esc(PT.name)}"><img src="${W.logoUrl(PT)}" alt=""></a>
    ${AREAS.filter(a => a[0] !== 'sistema').map(([a, n]) => `<a data-go="${first(a)}" class="${a === area ? 'on' : ''}" title="${n}"><svg viewBox="0 0 24 24"><path d="${ICON[a]}"/></svg>${n}${a === 'inicio' && W.unread.length ? `<span class="badge">${W.unread.length}</span>` : ''}</a>`).join('')}
    <span class="sp"></span><a data-go="options" class="${area === 'sistema' ? 'on' : ''}" title="Sistema"><svg viewBox="0 0 24 24"><path d="${ICON.sistema}"/></svg>Sistema</a></nav>
    <div class="main"><header class="top"><div class="crumb"><b>${esc(sc.title)}</b><span>${esc(AREAS.find(a => a[0] === area)[1])}</span></div>
      <div class="kpis"><span class="kpi ${W.myCPos.pos <= D.meta.board.target ? 'g' : 'y'}"><i></i>Construtores <b>${W.myCPos.pos}º</b></span><span class="kpi"><i></i>Caixa <b>${money(D.finances.balance)}</b></span><span class="kpi ${conf < 30 ? 'r' : conf < 55 ? 'y' : 'g'}"><i></i>Diretoria <b>${nf(conf, 0)}%</b></span></div>
      <span class="grow"></span><a class="search" data-go="search"><span>Buscar telas, pilotos…</span><kbd>Ctrl K</kbd></a>
      ${pend ? `<a class="cta wait" data-go="decision"><span>${pend} decisões<small>antes de avançar</small></span>→</a>` : `<a class="cta" data-go="weekend"><span>Avançar<small>${esc(nextGP.gp)}</small></span>→</a>`}</header>
      ${tabs.length > 1 ? `<nav class="subtabs">${tabs.map(s => `<a data-go="${s[1]}" class="${s[1] === id ? 'on' : ''}">${esc(s[2])}</a>`).join('')}</nav>` : ''}
      <main class="content">${body}</main></div></div>`;
};

/* ---------- telas com layout próprio ---------- */
const OWN = {};

OWN.hub = () => {
  const t = nextGP; const days = Math.round((new Date(t.date) - new Date(D.meta.today)) / 864e5);
  const hero = `<section class="hero" style="--img:${W.heroUrl(t.id) ? `url('${W.heroUrl(t.id)}')` : 'linear-gradient(120deg,#1a1d26,#0A0B0F)'}"><div class="hero-in"><div class="hero-l"><span class="eyebrow">Etapa ${t.round} de ${cal.length} · em ${days} dias</span><h2>${esc(t.gp)}</h2><p>${flag(t.country)} ${esc(t.circuit)} · ${dateS(t.date)}${t.sprint ? ' · fim de semana com Sprint' : ''}</p>
    <div class="hero-sch">${[['Sex', 'TL1 · TL2'], ['Sáb', 'TL3 · Classificação'], ['Dom', 'Corrida · 15:00']].map(([d, s]) => `<span><b>${d}</b>${s}</span>`).join('')}</div>
    <div class="hero-act">${K.btn('Preparar fim de semana', { kind: 'pri', go: 'weekend' })}${K.btn('Estratégia', { go: 'strategy' })}</div></div>
    <div class="hero-r">${trackSvg(t.shape, { w: 300, h: 190, start: true })}<div class="hero-f">${[['Voltas', t.laps], ['Extensão', nf(t.length, 3) + ' km'], ['Chuva', Math.round(t.rain * 100) + '%'], ['Pneus', t.tyreStress > 1.1 ? 'desgaste alto' : 'desgaste médio']].map(([a, b]) => `<span><small>${a}</small><b>${b}</b></span>`).join('')}</div></div></div></section>`;
  const dec = W.pending.slice(0, 3).map(m => `<div class="dec"><span class="dec-t">${K.chip(W.INBOX_TAG[m.tag] || m.tag, 'y')}<b>${esc(m.title)}</b><small>${esc(m.from)}</small></span><span class="dec-a">${m.choices.slice(0, 2).map((c, i) => K.btn(esc(c.replace(/\s*\(.*\)$/, '')), { kind: i ? 'sec' : 'pri', go: 'decision', p: { id: m.id } })).join('')}</span></div>`).join('');
  const dcard = (d) => { const s = d.season || {}; const f = W.formOf(d.id); return `<a class="dcard" data-go="driver" data-p='{"id":"${d.id}"}' style="--team:${PT.color}"><img class="dcard-f" src="${faceUrl(d)}" alt=""><div class="dcard-n"><span class="num">${d.num}</span><b>${esc(d.first || '')}<br><em>${esc(d.last || d.name)}</em></b></div><div class="dcard-s"><span><small>Campeonato</small><b>${s.pos || '—'}º</b></span><span><small>Pontos</small><b>${s.pts || 0}</b></span><span><small>Nota</small><b>${nf(d.ovr, 0)}</b></span></div><div class="form">${f.map(v => `<i class="${v === 'R' ? 'r' : v <= 3 ? 'pd' : v <= 10 ? 'pt' : ''}">${v === 'R' ? 'AB' : v}</i>`).join('')}</div></a>`; };
  const tower = standDRows.slice(0, 10).map(r => `<div class="tw${r.tid === PT.id ? ' me' : ''}"><span class="tw-p">${r.pos}</span><i style="background:${tcol(r.tid)}"></i><b>${esc(dabbr(r.did))}</b><span class="tw-n">${esc(dlast(r.did))}</span><span class="num">${r.pts}</span></div>`).join('') + (() => { const out = standDRows.filter(r => r.tid === PT.id && r.pos > 10); return out.map(r => `<div class="tw me sep"><span class="tw-p">${r.pos}</span><i style="background:${tcol(r.tid)}"></i><b>${esc(dabbr(r.did))}</b><span class="tw-n">${esc(dlast(r.did))}</span><span class="num">${r.pts}</span></div>`).join(''); })();
  const ctower = standCRows.slice(0, 6).map(r => `<div class="tw${r.tid === PT.id ? ' me' : ''}"><span class="tw-p">${r.pos}</span><i style="background:${tcol(r.tid)}"></i><b>${esc(r.t.short)}</b><span class="tw-n">${esc(r.t.name)}</span><span class="num">${r.pts}</span></div>`).join('');
  const b = D.meta.board;
  return `<div class="hub">${hero}
    <div class="hub-g">
      <div class="hub-c1">${K.card({ t: 'Decisões pendentes', a: `${W.pending.length} abertas · bloqueiam o avanço`, body: dec || K.empty('Nenhuma decisão pendente.') })}
        <div class="dcards">${myDrivers.map(dcard).join('')}</div>
        ${K.card({ t: 'Últimas notícias', a: '<a data-go="news">Ver todas</a>', flush: true, body: K.list(D.news.slice(0, 4).map(n => ({ go: 'news', title: n.title, sub: `${OUTLET[n.outlet] || n.outlet} · ${NEWS_TAG[n.tag] || n.tag}` })), { compact: true }) })}</div>
      <div class="hub-c2">${K.card({ t: 'Pilotos', a: '<a data-go="standings">Classificação</a>', body: `<div class="tower">${tower}</div>` })}${K.card({ t: 'Construtores', body: `<div class="tower">${ctower}</div>` })}</div>
      <div class="hub-c3">
        ${K.card({ t: 'Diretoria', body: `<div class="kp"><b class="num" style="color:var(--${b.confidence < 30 ? 'r' : b.confidence < 55 ? 'y' : 'g'})">${nf(b.confidence, 0)}%</b><span>${nf(b.lastDelta, 1)} na última corrida</span></div><div class="meta-t">Meta: <b>${b.target}º</b> entre construtores · hoje <b>${W.myCPos.pos}º</b></div>${K.bar(b.confidence, { w: 260, tone: b.confidence < 30 ? 'bad' : b.confidence < 55 ? 'lo' : 'hi' })}` })}
        ${K.card({ t: 'Caixa', body: `<div class="kp"><b class="num">${money(D.finances.balance)}</b><span>teto: sobram ${money(W.capRoom)}</span></div>${K.spark(W.cashSeries, { w: 260, h: 46 })}` })}
        ${K.card({ t: 'Fábrica e P&D', a: '<a data-go="rnd">Abrir</a>', body: D.projects.map(p => `<div class="mini"><span>${esc(p.name)}</span><span class="mu small">${p.stage === 'design' ? 'desenho' : 'fabricação'} · ${p.dLeft} dias</span>${K.bar(100 - p.dLeft / (p.designDays || 30) * 100, { w: 260, tone: 'hi' })}</div>`).join('') })}
      </div></div></div>`;
};

OWN.race = () => {
  const L = D.live; const t = cal.find(c => c.id === D.pre.trackId) || nextGP; const p = trackPath(t.shape, 640, 430, 26);
  const leadT = W.liveCars[0].T; const lapT = W.liveCars[0].last || 90;
  const dots = W.liveCars.map(c => { const f = (1 - ((c.T - leadT) / lapT) % 1 + 1) % 1 * 0.999 + 0.35; const [x, y] = W.along(p.pts, f); return `<g class="car${c.tid === PT.id ? ' me' : ''}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><circle r="${c.tid === PT.id ? 9 : 7}" fill="${tcol(c.tid)}"/><text y="3.5" text-anchor="middle">${c.pos}</text></g>`; }).join('');
  const rows = W.liveCars.map(c => `<div class="lt${c.tid === PT.id ? ' me' : ''}"><span class="lt-p">${c.pos}</span><i style="background:${tcol(c.tid)}"></i><b>${esc(dabbr(c.did))}</b><span class="num lt-g">${c.pos === 1 ? 'Líder' : '+' + c.int.toFixed(1)}</span>${K.tyre(c.tyre.c)}<span class="lt-a num">${c.tyre.age}</span><span class="lt-ch ${c.pos < c.grid ? 'up' : c.pos > c.grid ? 'dn' : ''}">${c.pos < c.grid ? '▲' + (c.grid - c.pos) : c.pos > c.grid ? '▼' + (c.pos - c.grid) : '–'}</span></div>`).join('');
  const mine = W.liveCars.filter(c => c.tid === PT.id);
  const ctl = (c) => `<div class="ctl"><div class="ctl-h">${K.av(c.d, 44)}<div><b>${esc(c.d.name)}</b><span>P${c.pos} · ${c.pos === 1 ? 'líder' : '+' + c.gapLead.toFixed(1) + ' do líder'}</span></div><span class="ctl-p num">P${c.pos}</span></div>
    <div class="ctl-m"><span><small>Pneu</small>${K.tyre(c.tyre.c)} <b class="num">${c.tyre.wear}%</b></span><span><small>Bateria</small><b class="num">${c.soc}%</b></span><span><small>Combustível</small><b class="num">${nf(c.fuel, 1)} kg</b></span><span><small>Última volta</small><b class="num">${lap(c.last)}</b></span></div>
    <div class="ctl-r"><span class="mu small">Pneus</span><div class="seg sm"><button type="button">Poupar</button><button type="button" class="on">Normal</button><button type="button">Atacar</button></div></div>
    <div class="ctl-r"><span class="mu small">Energia</span><div class="seg sm"><button type="button">Recarregar</button><button type="button" class="on">Neutro</button><button type="button">Ultrapassar</button></div></div>
    <div class="ctl-b">${K.btn('Chamar para o box', { kind: 'pri' })}${K.btn('Rádio')}</div></div>`;
  const evs = L.events.slice(-7).reverse().map(e => `<div class="rc"><span class="num">V${e.lap}</span><p>${esc(e.text)}</p></div>`).join('');
  return `<div class="race" style="--team:${PT.color}"><header class="rbar"><a class="rb-x" data-go="hub" title="Sair da transmissão">✕</a><b class="rb-gp">${flag(t.country)} ${esc(t.gp)}</b><span class="rb-lap"><small>Volta</small><b class="num">${L.lap}<em>/${L.laps}</em></b></span><span class="rb-flag green">Bandeira verde</span><span class="rb-w">☁ ${nf((D.pre.weather.air || [20])[0], 0)}° · pista ${nf((D.pre.weather.trackT || [30])[0], 0)}° · chuva em ~12 voltas: 30%</span><span class="grow"></span><div class="seg"><button type="button">Pausar</button><button type="button" class="on">1×</button><button type="button">4×</button><button type="button">16×</button></div>${K.btn('Pular para o fim', { go: 'podium' })}</header>
    <div class="rgrid"><aside class="ltow">${rows}</aside>
      <section class="rmap"><svg viewBox="0 0 640 430"><path d="${p.d}" class="rtrk-o"/><path d="${p.d}" class="rtrk-i"/>${dots}</svg><div class="rm-leg"><span><i class="sec1"></i>Setor 1</span><span><i class="sec2"></i>Setor 2</span><span><i class="sec3"></i>Setor 3</span><span class="mu">Volta mais rápida: <b>${esc(dname(L.fastest && L.fastest.did))}</b> ${L.fastest ? lap(L.fastest.time) : ''}</span></div></section>
      <aside class="rside">${mine.map(ctl).join('')}<div class="rcon"><h4 class="sec">Direção de prova e rádio</h4>${evs}</div></aside></div></div>`;
};

OWN.podium = () => {
  const c = D.last.cls.slice(0, 3); const t = cal.find(x => x.id === D.last.trackId) || {};
  const step = (i) => { const r = c[i]; const d = drv(r.did) || { name: dname(r.did) }; return `<div class="pd p${i + 1}" style="--tc:${tcol(r.tid)}"><div class="pd-f">${faceUrl(d) ? `<img src="${faceUrl(d)}" alt="">` : ''}</div><div class="pd-n"><span>${i + 1}</span><b>${esc(d.first || '')} <em>${esc(d.last || d.name)}</em></b><small>${esc(tname(r.tid))}</small></div><div class="pd-b"></div></div>`; };
  return `<div class="podium" style="--img:${W.heroUrl(t.id) ? `url('${W.heroUrl(t.id)}')` : 'linear-gradient(#1a1d26,#0A0B0F)'}"><div class="pod-top"><span class="eyebrow">${esc(D.last.gp)} · ${D.last.laps} voltas</span><h1>${esc(dname(c[0].did))} vence em ${esc(t.place || '')}</h1></div><div class="pod-row">${step(1)}${step(0)}${step(2)}</div><div class="pod-act">${K.btn('Ver resultado completo', { kind: 'pri', go: 'post' })}${K.btn('Pular cerimônia', { go: 'post', kind: 'ghost' })}</div></div>`;
};

OWN.post = () => {
  const L = D.last; const mine = L.cls.filter(r => r.tid === PT.id); const pts = mine.reduce((a, r) => a + r.pts, 0);
  const res = K.table([['', 'c'], ['Piloto'], ['Grid', 'c'], ['+/−', 'c'], ['Tempo', 'r'], ['Paradas', 'c'], ['Melhor volta', 'r'], ['Pts', 'r']], L.cls.map(r => [K.pos(r.pos), K.who(r.did, r.tid), r.grid, r.status === 'fin' || r.status === 'lapped' ? `<span class="${r.grid - r.pos > 0 ? 'gain' : r.grid - r.pos < 0 ? 'loss' : 'mu'}">${r.grid - r.pos > 0 ? '+' : ''}${r.grid - r.pos || '='}</span>` : '', r.status === 'fin' ? (r.pos === 1 ? `<span class="num">${lap(r.T)}</span>` : `<span class="num">+${(r.T - L.cls[0].T).toFixed(3)}</span>`) : `<span class="mu">${esc(r.reason || (r.status === 'lapped' ? '+1 volta' : 'abandono'))}</span>`, r.pits, `<span class="num ${L.cars.every(c => !c.best || c.best >= r.best) ? 'fl' : ''}">${lap(r.best)}</span>`, r.pts ? `<b class="num">${r.pts}</b>` : '']), { hl: (x, i) => L.cls[i].tid === PT.id });
  return K.head({ t: `${L.gp} · resultado`, s: `${L.laps} voltas · vencedor ${dname(L.cls[0].did)}`, act: K.btn('Ver pódio', { go: 'podium' }) + K.btn('Análise de dados', { go: 'analysis' }) }) +
    K.grid('1fr 380px', K.card({ flush: true, body: res }),
      `<div class="g" style="grid-template-columns:1fr">${K.card({ t: 'Sua corrida', body: `<div class="post-sum"><b class="num">+${pts}</b><span>pontos para a ${esc(PT.name)}</span></div>${mine.map(r => `<div class="qd">${K.av(drv(r.did), 44)}<div><b>${esc(dname(r.did))}</b><div class="mu small">largou ${r.grid}º · ${r.pits} parada${r.pits > 1 ? 's' : ''}</div></div><span class="num big">P${r.pos}</span></div>`).join('')}` })}
      ${K.card({ t: 'Reação', body: K.list([{ title: 'Diretoria', sub: `Confiança ${nf(D.meta.board.lastDelta, 1)} pontos`, tail: K.chip(D.meta.board.lastDelta >= 0 ? 'satisfeita' : 'preocupada', D.meta.board.lastDelta >= 0 ? 'g' : 'r') }, { title: 'Patrocinadores', sub: 'Objetivo da Santander cumprido', tail: K.chip('bônus pago', 'g') }, { title: 'Imprensa', sub: 'Manchete: estratégia de duas paradas', tail: K.chip('neutra', 'n') }]) })}
      ${K.card({ t: 'Destaques', body: L.events.slice(0, 4).map(e => `<p class="hl"><span class="num mu">V${e.lap}</span> ${esc(e.text)}</p>`).join('') })}</div>`);
};

OWN.driver = (p) => {
  const d = drv(p.id) || myDrivers[0]; const t = team(d.team) || PT; const s = d.season || {}; const c = d.career || {};
  const grp = ATTR_GROUPS.map(([g, ks]) => `<div class="ag"><h4 class="sec">${g}</h4>${ks.map(k => K.attr(ATTR[k], d.attrs[k])).join('')}</div>`).join('');
  const pers = d.pers || {};
  return `<div class="dp" style="--tc:${t.color}"><section class="dp-hero"><div class="dp-num">${d.num || ''}</div>${faceUrl(d) ? `<img class="dp-f" src="${faceUrl(d)}" alt="">` : ''}<div class="dp-id"><span class="eyebrow">${flag(d.nat)} ${esc(t.name)} · ${d.age} anos · ${esc(STYLE[d.style] || '')}</span><h1>${esc(d.first || '')} <b>${esc(d.last || d.name)}</b></h1>
      <div class="dp-k">${K.ring(d.ovr, { size: 72 })}<span><small>Nota</small><b>${nf(d.ovr, 1)}</b></span><span><small>Potencial (olheiros)</small>${K.stars(d.pot >= 90 ? 5 : d.pot >= 86 ? 4.5 : d.pot >= 82 ? 4 : 3.5)}</span><span><small>Campeonato</small><b>${s.pos || '—'}º · ${s.pts || 0} pts</b></span><span><small>Moral</small><b>${d.morale}</b></span></div>
      <div class="dp-act">${d.team === PT.id ? K.btn('Renovar contrato', { kind: 'pri', go: 'negotiation', p: { id: d.id } }) + K.btn('Conversar') : K.btn('Fazer proposta', { kind: 'pri', go: 'negotiation', p: { id: d.id } }) + K.btn('Observar')}${K.btn('Comparar')}</div></div>
      ${t.carImg ? `<img class="dp-car" src="${W.carUrl(t)}" alt="">` : ''}</section>
    <div class="g" style="grid-template-columns:1.25fr 1fr 1fr">${K.card({ t: 'Atributos', body: `<div class="ags">${grp}</div>` })}
      <div class="g" style="grid-template-columns:1fr">${K.card({ t: 'Carreira na F1', body: `<div class="cs">${[['Largadas', c.starts], ['Vitórias', c.wins], ['Pódios', c.podiums], ['Poles', c.poles], ['Títulos', c.titles], ['Pontos', nf(c.points, 0)]].map(([a, b]) => `<span><b class="num">${b ?? 0}</b><small>${a}</small></span>`).join('')}</div>` })}
        ${K.card({ t: 'Temporadas', flush: true, body: K.table([['Ano'], ['Categoria'], ['Equipe'], ['Pos.', 'c']], (d.real || []).slice(-5).reverse().map(r => [r[0], String(r[1]).toUpperCase(), esc(r[2]), r[3] || '—'])) })}</div>
      <div class="g" style="grid-template-columns:1fr">${K.card({ t: 'Contrato', body: `<div class="ct">${K.chip('até ' + (d.contract ? d.contract.until : '—'), 'n')}${d.contract && d.contract.option ? K.chip('opção ' + d.contract.option.year + ' (' + (d.contract.option.holder === 'team' ? 'equipe' : d.contract.option.holder === 'driver' ? 'piloto' : 'mútua') + ')', 'b') : ''}${(d.contract && d.contract.clauses || []).map(x => K.chip(x, 'y')).join('')}</div>${K.kv([['Salário', money(d.contract && d.contract.salary)], ['Empresário', esc(d.manager || '—')], ['Valor de mercado', money(Math.max(1, ((d.ovr - 68) ** 2) / 12))]])}` })}
        ${K.card({ t: 'Personalidade', body: [['Ambição', pers.ambition], ['Lealdade', pers.loyalty], ['Temperamento', pers.temper], ['Mídia', pers.media]].map(([a, v]) => `<div class="attr t-mid" style="--c:var(--b)"><span>${a}</span>${K.bar(v || 0, { w: 120, tone: 'mid' })}<b style="color:var(--mu)">${v || 0}</b></div>`).join('') })}
        ${K.card({ t: 'Forma recente', body: `<div class="form big">${W.formOf(d.id).map(v => `<i class="${v === 'R' ? 'r' : v <= 3 ? 'pd' : v <= 10 ? 'pt' : ''}">${v === 'R' ? 'AB' : v}</i>`).join('')}</div>` })}</div></div></div>`;
};

OWN.drivers = () => K.head({ t: 'Pilotos', s: `${PT.name} · titulares, reserva e comparação` }) +
  `<div class="g" style="grid-template-columns:1fr 1fr">${myDrivers.map(d => { const s = d.season || {}; return `<a class="dbig" data-go="driver" data-p='{"id":"${d.id}"}' style="--tc:${PT.color}"><img src="${faceUrl(d)}" alt=""><div class="dbig-i"><span class="num">${d.num}</span><h2>${esc(d.first)} <b>${esc(d.last)}</b></h2><p>${flag(d.nat)} ${d.age} anos · ${esc(STYLE[d.style] || '')}</p><div class="dbig-k">${K.ring(d.ovr, { size: 56 })}<span><small>Campeonato</small><b>${s.pos}º · ${s.pts} pts</b></span><span><small>Contrato</small><b>até ${d.contract.until}</b></span><span><small>Moral</small><b>${d.morale}</b></span></div></div></a>`; }).join('')}</div>` +
  K.card({ t: 'Duelo entre companheiros', body: `<div class="duel">${[['Classificação', 'qualifying'], ['Ritmo', 'pace'], ['Corrida', 'racecraft'], ['Pneus', 'tyre'], ['Chuva', 'wet'], ['Largada', 'start']].map(([n, k]) => { const a = myDrivers[0].attrs[k], b = myDrivers[1].attrs[k]; return `<div class="du"><b class="num ${a >= b ? 'w' : ''}">${a}</b><div class="du-b"><i style="width:${a / (a + b) * 100}%"></i></div><b class="num ${b > a ? 'w' : ''}">${b}</b><span>${n}</span></div>`; }).join('')}</div><div class="duel-n"><span>${esc(myDrivers[0].name)}</span><span>${esc(myDrivers[1].name)}</span></div>` }) +
  K.card({ t: 'Reserva e academia', body: K.empty('Nenhum reserva contratado. Três pilotos da academia já têm superlicença.', K.btn('Ver academia', { go: 'academy' })) });

OWN.car = () => {
  const keys = Object.keys(CAR); const rank = (k) => [...D.teams].sort((a, b) => (b.car[k] || 0) - (a.car[k] || 0)).findIndex(t => t.id === PT.id) + 1;
  const best = (k) => Math.max(...D.teams.map(t => t.car[k] || 0)); const avg = (k) => D.teams.reduce((a, t) => a + (t.car[k] || 0), 0) / D.teams.length;
  const rows = keys.map(k => { const v = PT.car[k], b = best(k), a = avg(k); const sc = (x) => ((x - 70) / 30 * 100).toFixed(1); return `<div class="cmp"><span class="cmp-n">${CAR[k]}</span><div class="cmp-b"><i class="cmp-a" style="left:${sc(a)}%" title="média"></i><i class="cmp-x" style="left:${sc(b)}%" title="melhor"></i><em style="width:${sc(v)}%"></em></div><b class="num">${nf(v, 1)}</b><span class="mu small">${rank(k)}º</span></div>`; }).join('');
  return K.head({ t: `${PT.chassis} · ${PT.name}`, s: `Motor ${esc(PT.pu)} · equipe de pit ${nf(PT.pitCrew, 0)}`, act: K.btn('Novo projeto', { kind: 'pri', go: 'newproject' }) }) +
    `<section class="carhero" style="--tc:${PT.color}"><img src="${W.carUrl(PT)}" alt=""><div class="ch-tags"><span>Ponto forte<b>Confiabilidade</b></span><span>Ponto fraco<b>Aerodinâmica</b></span><span>Próxima peça<b>Assoalho · 8 dias</b></span></div></section>` +
    K.grid('1.4fr 1fr', K.card({ t: 'Comparado ao grid', a: '<i class="lgd x"></i>melhor <i class="lgd a"></i>média', body: rows }),
      K.card({ t: 'Motor', body: K.kv([['Fornecedor', 'Mercedes (cliente)'], ['Contrato', 'até 2030'], ['Preço', money(18) + '/ano'], ['Potência', K.num(93)], ['Confiabilidade', K.num(88.3)], ['Eficiência', K.num(86.2)]]) + K.help('Equipes cliente recebem o motor do ano, mas não opinam no projeto. Uma parceria de fábrica exige negociação na tela Fabricantes.') }));
};

OWN.rnd = () => {
  const PN = { frontWing: 'Asa dianteira', rearWing: 'Asa traseira', floor: 'Assoalho', sidepods: 'Laterais', suspension: 'Suspensão', chassis: 'Chassi', brakes: 'Freios', cooling: 'Refrigeração', gearbox: 'Câmbio', engine: 'Motor', energy: 'ERS' };
  const spots = { frontWing: [6, 62], floor: [46, 74], rearWing: [92, 30], sidepods: [52, 50], suspension: [22, 58], brakes: [28, 76], cooling: [60, 40], gearbox: [80, 62], chassis: [40, 40], engine: [68, 52] };
  const active = new Set(D.projects.map(p => p.area));
  const now = D.projects.map(p => { const tot = (p.designDays || 30) + (p.buildDays || 8); const done = tot - (p.dLeft || 0) - (p.stage === 'design' ? (p.buildDays || 8) : 0); return `<div class="pj"><div class="pj-h"><b>${esc(p.name)}</b>${K.chip(p.next ? 'carro ' + (D.meta.year + 1) : 'carro atual', p.next ? 'b' : 'n')}</div><div class="pj-t"><i class="d" style="width:${(p.designDays || 30) / tot * 100}%">Desenho</i><i class="b" style="width:${(p.buildDays || 8) / tot * 100}%">Fábrica</i><em style="left:${done / tot * 100}%"></em></div><div class="pj-f"><span>${esc(p.staffName || '')}</span><span>${money(p.cost)} · túnel ${p.wt} · CFD ${p.cfd}</span><span>ganho +${nf(p.min, 1)} a +${nf(p.max, 1)} · risco ${p.risk}%</span></div></div>`; }).join('');
  return K.head({ t: 'Projetos de P&D', s: `${D.projects.length} de ${D.meta.slots} vagas · teto: sobram ${money(W.capRoom)}`, act: K.btn('Novo projeto', { kind: 'pri', go: 'newproject' }) }) +
    K.grid('1.3fr 1fr', K.card({ t: 'Planta do carro', a: 'clique numa peça para abrir um projeto', body: `<div class="bp"><img src="${W.carUrl(PT)}" alt="">${Object.entries(spots).map(([k, [x, y]]) => `<a class="bp-s${active.has(k) ? ' on' : ''}" style="left:${x}%;top:${y}%" data-go="newproject" data-p='{"area":"${k}"}'><i></i><span>${PN[k]}</span></a>`).join('')}</div>` }),
      K.card({ t: 'Recursos deste período', body: `${K.slider('Túnel de vento', 210, 0, 320, 'de 320 execuções')}${K.slider('CFD', 1100, 0, 2000, 'de 2.000 simulações')}${K.kv([['Período', 'renova em 2 corridas'], ['Escala do ATR', '95% (5º no campeonato)']])}` })) +
    K.card({ t: 'Em andamento', body: now || K.empty('Nenhum projeto em andamento.') });
};

OWN.facilities = (p) => {
  const ids = Object.keys(D.fac.B); const sel = p.id || 'tunel'; const f = PT.fac[sel] || {}; const B = D.fac.B[sel];
  const pos = { sede: [4, 6, 30, 26], fabrica: [36, 6, 28, 26], design: [66, 6, 16, 26], tunel: [84, 6, 13, 40], cfd: [4, 36, 18, 20], simulador: [24, 36, 18, 20], banco: [44, 36, 20, 20], motor: [66, 36, 16, 20], logistica: [4, 60, 26, 20], pitstop: [32, 60, 24, 20], medico: [58, 60, 14, 20], marketing: [74, 50, 23, 30] };
  const grid = D.teams.map(t => [t, (t.fac && t.fac[sel] && t.fac[sel].lvl) || 0]).sort((a, b) => b[1] - a[1]);
  return K.head({ t: 'Sede e fábrica', s: `Índice de instalações ${nf(PT.facilities, 1)} · investimento fora do teto: ${money(30)} por ano`, act: K.btn('Agendar manutenção geral') }) +
    K.grid('1fr 360px', `<section class="campus">${ids.map(id => { const x = PT.fac[id] || {}; const [l, tp, w, h] = pos[id]; return `<a class="bld${id === sel ? ' on' : ''} c-${toneCond(x.cond)}" style="left:${l}%;top:${tp}%;width:${w}%;height:${h}%" data-go="facilities" data-p='{"id":"${id}"}'><b>${esc(D.fac.B[id][0])}</b><span class="lv">${'■'.repeat(x.lvl || 0)}${'□'.repeat(5 - (x.lvl || 0))}</span><span class="cd2">${nf(x.cond, 0)}%</span>${id === 'simulador' ? '<em class="wk">Obra: nível 4</em>' : ''}</a>`; }).join('')}<div class="campus-l"><span><i class="c-hi"></i>bom estado</span><span><i class="c-mid"></i>desgaste</span><span><i class="c-lo"></i>precisa de manutenção</span></div></section>`,
      K.card({ t: B[0], body: `<div class="fsel"><div class="lvbig">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= f.lvl ? 'on' : ''}"></i>`).join('')}</div><span class="mu small">nível ${f.lvl} de 5</span></div>${K.kv([['Estado', `<span style="color:var(--t-${toneCond(f.cond) === 'lo' ? 'bad' : toneCond(f.cond)})">${nf(f.cond, 0)}%</span>`], ['Efeito', esc(D.fac.eff[sel][0])], ['Próximo nível', money(B[3] * Math.pow(f.lvl + 1, 1.35))], ['Prazo da obra', (B[4] + f.lvl) + ' corridas'], ['Manutenção agora', money((100 - f.cond) / 100 * Math.max(1, f.lvl) * B[5] * 2, 2)]])}<div style="display:flex;gap:8px;margin-top:14px">${K.btn('Melhorar para nível ' + (f.lvl + 1), { kind: 'pri' })}${K.btn('Manutenção')}</div><h4 class="sec" style="margin-top:18px">No grid</h4>${grid.map(([t, l]) => `<div class="gr${t.id === PT.id ? ' me' : ''}"><span>${esc(t.name)}</span><span class="lv">${'■'.repeat(l)}${'□'.repeat(5 - l)}</span></div>`).join('')}` }));
};

OWN.title = () => `<div class="titlea" style="--img:url('${W.IMG}tracks/silverstone-hero.webp')"><div class="ta-in"><img class="ta-mgc" src="${W.IMG}brand/mgc-logo.png" alt="Moratelli Game Company"><h1>PitWall<b>Racing Simulator</b></h1><nav>${[['Continuar', 'hub', `${esc(PT.name)} · ${dateS(D.meta.today)} ${D.meta.year}`], ['Nova carreira', 'newcareer', ''], ['Carregar', 'options', '3 saves'], ['Opções', 'options', ''], ['Editor da base', 'editor', '']].map(([t, g, s], i) => `<a data-go="${g}" class="${i ? '' : 'pri'}"><b>${t}</b>${s ? `<small>${s}</small>` : ''}</a>`).join('')}</nav><span class="ta-v">versão 0.8.5</span></div></div>`;

OWN.seasonend = () => {
  const h = D.history[D.history.length - 1]; const ch = drv(h.champion) || { name: h.championName };
  return `<div class="se"><span class="eyebrow">Temporada ${h.year} encerrada</span><div class="se-g"><div class="se-c" style="--tc:${tcol(h.championTeam)}">${faceUrl(ch) ? `<img src="${faceUrl(ch)}" alt="">` : ''}<span>Campeão mundial</span><h2>${esc(h.championName)}</h2><small>${esc(tname(h.championTeam))} · ${h.standD[0].pts} pontos · ${h.standD[0].st.wins} vitórias</small></div>
    <div class="se-c" style="--tc:${tcol(h.constructor)}">${team(h.constructor) ? `<img class="se-l" src="${W.logoUrl(team(h.constructor))}" alt="">` : ''}<span>Campeã de construtores</span><h2>${esc(h.constructorName)}</h2><small>${h.standC[0].pts} pontos</small></div></div>
    ${K.grid('repeat(4,1fr)', K.stat('Sua posição', h.playerPos + 'º', `meta era ${h.target}º`, h.playerPos <= h.target ? 'g' : 'r'), K.stat('Prêmio da F1', money(62)), K.stat('Diretoria', '−8 pontos', 'abaixo da meta', 'y'), K.stat('Próxima meta', '4º', 'temporada ' + (h.year + 1)))}
    <div style="text-align:center;margin-top:20px">${K.btn('Começar a pré-temporada', { kind: 'pri', go: 'hub' })}</div></div>`;
};

OWN.teampage = (p) => {
  const t = team(p.id) || PT; const ch = (D.hist.chron || {})[t.id] || []; const lu = t.lineup.map(drv).filter(Boolean); const rs = t.realStats || {};
  return `<section class="tp-hero" style="--tc:${t.color};--tc2:${t.color2}"><img class="tp-l" src="${W.logoUrl(t)}" alt=""><div><span class="eyebrow">${flag(t.country)} ${esc(t.country)} · ${esc(t.pu)}</span><h1>${esc(t.full)}</h1><p>${t.champ ? t.champ.pos + 'º no campeonato · ' + t.champ.pts + ' pontos' : ''} · dono: ${esc((t.owner || {}).name || '—')}</p></div><img class="tp-c" src="${W.carUrl(t)}" alt=""></section>` +
    K.grid('1fr 1fr 1fr', K.card({ t: 'Pilotos', body: lu.map(d => `<div class="qd">${K.av(d, 44)}<div><b>${esc(d.name)}</b><div class="mu small">${d.season ? d.season.pos + 'º · ' + d.season.pts + ' pts' : ''}</div></div>${K.ring(d.ovr, { size: 40 })}</div>`).join('') }),
      K.card({ t: 'Carro', body: Object.keys(CAR).map(k => K.attr(CAR[k], Math.round(t.car[k]))).join('') }),
      K.card({ t: 'Linhagem', body: `<div class="lin">${ch.map(([n, a, b]) => `<div><b>${esc(n)}</b><span class="num mu">${a}–${b || 'hoje'}</span></div>`).join('') || '<p class="mu">Equipe sem nomes anteriores.</p>'}</div>` })) +
    K.grid('1fr 1fr', K.card({ t: 'Patrocinadores', body: `<div class="spl">${(t.sponsors || []).map(n => W.sponsorLogo(n) ? `<img src="${W.sponsorLogo(n)}" alt="${esc(n)}" title="${esc(n)}">` : `<span>${esc(n)}</span>`).join('')}</div>` }), K.card({ t: 'Empresa', body: K.kv([['Valor', money(t.value)], ['Orçamento', money(t.budget)], ['Reputação', nf(t.reputation, 1)], ['Instalações', nf(t.facilities, 1)]]) }));
};

OWN.council = () => {
  const O = D.councilOpen || { props: [] }; const st = (x) => x > 0.12 ? 'sim' : x < -0.12 ? 'nao' : 'ind';
  return K.head({ t: 'Conselho da FIA', s: `Reunião do ${esc(O.gp || '')} · seu capital político: ${D.council.capital}` }) +
    O.props.map(pr => { const votes = D.teams.map(t => [t, st(((pr.imp || {})[t.id] || 0) + ((pr.noise || {})[t.id] || 0) + ((pr.lobby || {})[t.id] || 0))]); const yes = votes.filter(v => v[1] === 'sim').length, no = votes.filter(v => v[1] === 'nao').length; const need = Math.ceil(D.teams.length * 0.6);
      return K.card({ t: pr.title, a: `Vale a partir de ${pr.eff} · proposta da ${pr.proposer === 'fia' ? 'FIA' : pr.proposer === 'fom' ? 'Fórmula 1' : tname(pr.proposer)}`, body: `<p class="lead" style="font-size:14px">${esc(pr.desc || '')}</p><div class="vote"><div class="vbar"><i class="y" style="width:${yes / D.teams.length * 100}%"></i><i class="n" style="width:${no / D.teams.length * 100}%"></i><em style="left:${need / D.teams.length * 100}%"></em></div><div class="vleg"><span><b class="num">${yes}</b> a favor</span><span><b class="num">${D.teams.length - yes - no}</b> indecisas</span><span><b class="num">${no}</b> contra</span><span class="mu">precisa de ${need} + FIA e F1</span></div></div><div class="vg">${votes.map(([t, v]) => `<div class="vt ${v}"><i style="background:${t.color}"></i><b>${esc(t.short)}</b><span>${v === 'sim' ? 'a favor' : v === 'nao' ? 'contra' : 'indecisa'}</span><small>${(pr.imp[t.id] >= 0 ? '+' : '') + nf(pr.imp[t.id], 2)}</small></div>`).join('')}</div><div class="vact">${K.btn('Votar a favor', { kind: 'pri' })}${K.btn('Votar contra')}${K.btn('Abster')}${K.btn('Negociar apoio (8 de capital)', { kind: 'ghost' })}</div>` }); }).join('') +
    K.card({ t: 'Votações anteriores', flush: true, body: K.table([['Reunião'], ['Proposta'], ['Placar', 'c'], ['Resultado']], (D.council.history || []).flatMap(h => h.props.map(p => [esc(h.gp), esc(p.title), `${p.yes}–${p.no}`, K.chip(p.result === 'aprovada' ? 'Aprovada' : 'Rejeitada', p.result === 'aprovada' ? 'g' : 'r')]))) });
};

OWN.news = (p) => {
  const tab = p.tab || 'todas'; const tags = ['todas', ...new Set(D.news.map(n => n.tag))]; const list = D.news.filter(n => tab === 'todas' || n.tag === tab);
  const [h, ...rest] = list; const tIm = (n) => (n.tm && n.tm[0] && team(n.tm[0]) ? W.carUrl(team(n.tm[0])) : null);
  return K.head({ t: 'Notícias', s: 'Imprensa do paddock', tabs: tags.map(t => [t, t === 'todas' ? 'Todas' : NEWS_TAG[t] || t]), tab }) +
    (h ? `<article class="nh" style="--tc:${h.tm && h.tm[0] ? tcol(h.tm[0]) : 'var(--act)'}"><div><span class="eyebrow">${esc(OUTLET[h.outlet] || h.outlet)} · ${esc(NEWS_TAG[h.tag] || h.tag)}</span><h2>${esc(h.title)}</h2><p>${esc(h.body)}</p></div>${tIm(h) ? `<img src="${tIm(h)}" alt="">` : ''}</article>` : '') +
    `<div class="ng">${rest.slice(0, 12).map(n => `<article class="nc"><span class="eyebrow">${esc(OUTLET[n.outlet] || n.outlet)}</span><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p><div class="nc-f">${K.chip(NEWS_TAG[n.tag] || n.tag, n.tag === 'escandalo' ? 'r' : n.tag === 'mercado' ? 'b' : 'n')}<span class="mu small">etapa ${n.round}</span></div></article>`).join('')}</div>`;
};

OWN.finance = () => {
  const F = D.finances; const bc = F.season.byCat; const CAT = { receita: 'Receitas', 'fábrica': 'Fábrica', marketing: 'Marketing', 'salário': 'Salários', 'operação': 'Operação', motor: 'Motor', 'P&D': 'P&D', infraestrutura: 'Infraestrutura' };
  const items = Object.entries(bc); let run = 0; const cum = [0]; items.forEach(([, v]) => { run += v; cum.push(run); }); const lo0 = Math.min(...cum), hi0 = Math.max(...cum); const span = (hi0 - lo0) || 1; const X = (v) => (v - lo0) / span * 100; run = 0;
  const wf = items.map(([k, v]) => { const from = run; run += v; return `<div class="wf"><span>${CAT[k] || k}</span><div class="wf-b"><i class="${v < 0 ? 'n' : 'p'}" style="left:${X(Math.min(from, run))}%;width:${Math.abs(v) / span * 100}%"></i></div><b class="num ${v < 0 ? 'loss' : 'gain'}">${moneyS(v)}</b></div>`; }).join('') + `<div class="wf tot"><span>Resultado</span><div class="wf-b"><i class="${run < 0 ? 'n' : 'p'}" style="left:${X(Math.min(0, run))}%;width:${Math.abs(run) / span * 100}%"></i></div><b class="num">${moneyS(run)}</b></div>`;
  const capUsed = 215 - W.capRoom;
  return K.head({ t: 'Finanças', s: `Temporada ${F.season.year} · após ${D.meta.round} etapas` }) +
    K.grid('repeat(4,1fr)', K.stat('Caixa', money(F.balance), K.spark(W.cashSeries, { w: 200, h: 30 })), K.stat('Receitas no ano', money(F.season.inc), '+ prêmio da F1 no fim do ano', 'g'), K.stat('Despesas no ano', money(-F.season.exp)), K.stat('Projeção do ano', money(F.balance + 41), 'se mantiver o ritmo')) +
    K.grid('1.3fr 1fr', K.card({ t: 'Para onde foi o dinheiro', body: wf }),
      K.card({ t: 'Teto orçamentário', body: `<div class="cap"><div class="cap-b"><i style="width:${capUsed / 215 * 100}%"></i><em style="left:${(capUsed + 14) / 215 * 100}%"></em></div><div class="cap-l"><span>usado <b class="num">${money(capUsed)}</b></span><span>projetado <b class="num">${money(capUsed + 14)}</b></span><span>limite <b class="num">US$ 215 mi</b></span></div></div>${K.help('Fora do teto: salários dos pilotos e dos três diretores mais caros, marketing e até US$ 30 mi por ano em instalações.')}` })) +
    K.card({ t: 'Lançamentos recentes', flush: true, body: K.table([['Etapa', 'c'], ['Descrição'], ['Categoria'], ['Valor', 'r']], F.ledger.slice(-12).reverse().map(e => [e.round, esc(e.desc), K.chip(CAT[e.cat] || e.cat, 'n'), `<span class="num ${e.amount < 0 ? 'loss' : 'gain'}">${moneyS(e.amount)}</span>`])) });
};

OWN.search = () => `<div class="srch-bg">${shell('hub', OWN.hub())}</div>` + BASE.search(K);

/* ---------- registro ---------- */
const FULL = new Set(['race', 'podium', 'title']);
W.P.a = {
  name: 'Transmissão',
  render(id, p) {
    if (id === 'search') return OWN.search();
    const body = OWN[id] ? OWN[id](p || {}) : BASE[id] ? BASE[id](K, p || {}) : `<p>Tela ${esc(id)} em construção.</p>`;
    return FULL.has(id) ? `<div class="full" style="--team:${PT.color}">${body}</div>` : shell(id, body);
  },
};
})();
