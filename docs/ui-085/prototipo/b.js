/* Proposta B · Paddock — kit de componentes, casca e telas com layout próprio. */
(function () {
'use strict';
const W = window.PW; const { D, PT, esc, nf, money, moneyS, lap, dname, dlast, dabbr, drv, team, tcol, tname, flag, faceUrl, initials, cal, nextGP, myDrivers, standDRows, standCRows, ATTR, ATTR_GROUPS, STYLE, CAR, TYRE, NEWS_TAG, OUTLET, INBOX_TAG, tone, toneCond, trackSvg, trackPath, dateS, MONTHS_L, BASE, SC, AREAS, SCREENS } = W;

/* ---------- kit ---------- */
const at = (go, p) => go ? ` data-go="${go}"${p ? ` data-p='${JSON.stringify(p)}'` : ''}` : '';
const K = {};
K.page = (head, body) => head + body;
K.head = ({ t, s, act, tabs, tab, tabKey }) => `<div class="ph"><div><h1>${esc(t)}</h1>${s ? `<p>${s}</p>` : ''}</div><div class="grow"></div>${tabs ? `<div class="tabs">${tabs.map(([v, l]) => `<button type="button" data-tab="${esc(v)}" data-tk="${tabKey || 'tab'}" class="${v === tab ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>` : ''}${act ? `<div class="acts">${act}</div>` : ''}</div>`;
K.card = ({ t, a, body, cls = '', flush, go, p }) => `<section class="card ${cls}${flush ? ' flush' : ''}${go ? ' go' : ''}"${at(go, p)}>${t ? `<header class="ch"><h3>${esc(t)}</h3>${a ? `<span class="ca">${a}</span>` : ''}</header>` : ''}<div class="bd">${body}</div></section>`;
K.grid = (tpl, ...items) => `<div class="g" style="grid-template-columns:${tpl}">${items.join('')}</div>`;
K.table = (cols, rows, o = {}) => `<table class="t ${o.cls || ''}"><thead><tr>${cols.map(c => `<th class="${c[1] || ''}">${esc(c[0])}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr class="${o.hl && o.hl(r, i) ? 'me' : ''} ${o.rowCls ? o.rowCls(i) : ''}">${r.map((c, j) => `<td class="${cols[j][1] || ''}">${c == null ? '' : c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
K.chip = (t, c = 'n') => `<span class="chip ${c}">${t}</span>`;
K.btn = (t, o = {}) => `<a class="btn ${o.kind === 'sec' || !o.kind ? 'alt' : o.kind}"${at(o.go, o.p)} role="button" tabindex="0">${t}</a>`;
K.stat = (l, v, s, c = '') => `<div class="stat ${c}"><div class="l">${esc(l)}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}</div>`;
K.bar = (v, o = {}) => { const n = Math.round(Math.max(0, Math.min(100, v / (o.max || 100) * 100)) / 10); return `<span class="bar t-${o.tone || tone(v)}">${Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`; };
K.ring = (v) => `<span class="rate t-${tone(v)}">${nf(v, 0)}</span>`;
K.av = (d, s = 40) => { const u = d && (d.face || d.img) ? faceUrl(d) : null; return u ? `<img class="av" src="${u}" alt="" style="width:${s}px;height:${s}px">` : `<span class="av" style="width:${s}px;height:${s}px">${esc(initials(d && d.name))}</span>`; };
K.who = (did, tid) => { const d = drv(did); const t = tid || (d && d.team); return `<span class="who"><i class="slab" style="background:${tcol(t)}"></i>${d && d.nat ? flag(d.nat) : ''}<a data-go="driver" data-p='{"id":"${did}"}'><b>${esc(dname(did))}</b></a></span>`; };
K.tm = (tid) => { const t = team(tid); return `<a class="tm" data-go="teampage" data-p='{"id":"${tid}"}'><i class="slab" style="background:${tcol(tid)}"></i>${t && t.logo ? `<img src="${W.logoUrl(t)}" alt="">` : ''}${esc(tname(tid))}</a>`; };
K.dot = (tid) => `<i class="dot" style="background:${tcol(tid)}" title="${esc(tname(tid))}"></i>`;
K.kv = (pairs) => `<dl class="kv">${pairs.map(([a, b]) => `<dt>${a}</dt><dd>${b == null ? '—' : b}</dd>`).join('')}</dl>`;
K.list = (items, o = {}) => `<div class="list${o.compact ? ' compact' : ''}">${items.map(it => `<${it.go ? 'a' : 'div'} class="li${it.on ? ' on' : ''}${it.unread ? ' unread' : ''}"${at(it.go, it.p)}>${it.lead ? `<span class="ll">${it.lead}</span>` : ''}<span class="lt"><b>${esc(it.title)}</b>${it.sub ? `<span>${esc(it.sub)}</span>` : ''}</span>${it.tail ? `<span class="lr">${it.tail}</span>` : ''}</${it.go ? 'a' : 'div'}>`).join('')}</div>`;
K.empty = (t, act) => `<div class="empty"><i></i><div><p>${esc(t)}</p>${act ? `<div style="margin-top:8px">${act}</div>` : ''}</div></div>`;
K.help = (t) => `<div class="help">${esc(t)}</div>`;
K.tyre = (c) => `<span class="tyre ${(TYRE[c] || ['', 'med'])[1]}" title="${(TYRE[c] || [''])[0]}">${c}</span>`;
K.pos = (n) => `<span class="pos ${n <= 3 ? 'p' + n : ''}">${n}</span>`;
K.attr = (l, v) => `<div class="attr t-${tone(v)}"><span>${esc(l)}</span>${K.bar(v)}<b>${v}</b></div>`;
K.stars = (n) => `<span class="stars" title="${n} estrelas">${'★'.repeat(Math.floor(n))}${n % 1 ? '½' : ''}<s>${'★'.repeat(5 - Math.ceil(n))}</s></span>`;
K.num = (v) => `<span class="num" style="color:var(--t-${tone(v)});font-weight:600">${nf(v, 1)}</span>`;
K.field = (l, v) => `<label class="fld"><span>${esc(l)}</span><div>${esc(v)}</div></label>`;
K.slider = (l, v, mn, mx, u) => `<div class="slider"><div class="sh"><span>${esc(l)}</span><b>${nf(v, 0)} ${esc(u)}</b></div><div class="st2"><i style="width:${(v - mn) / (mx - mn) * 100}%"></i><em style="left:${(v - mn) / (mx - mn) * 100}%"></em></div></div>`;
K.post = (s) => `<article class="post"><div class="post-h">${K.av(s.by.kind === 'driver' ? drv(s.by.ref) || { name: s.by.name } : { name: s.by.name }, 38)}<div><b>${esc(s.by.name)}</b><span>@${esc(s.by.handle || '')} · etapa ${s.r}</span></div></div><p>${esc(s.text)}</p><div class="post-f"><span>♥ ${nf(s.likes)}</span><span>↻ ${nf(s.reposts)}</span></div></article>`;

/* ---------- casca ---------- */
const NAV = [['inicio', 'Início'], ['corrida', 'Corrida'], ['equipe', 'Equipe'], ['carro', 'Carro e fábrica', ['carro', 'fabrica']], ['mercado', 'Mercado e finanças', ['mercado', 'financas']], ['mundo', 'Mundo'], ['arquivo', 'Arquivo']];
const areaOf = (a) => (NAV.find(n => (n[2] || [n[0]]).includes(a)) || ['sistema'])[0];
const HIDE = new Set(['decision', 'driver', 'negotiation', 'newproject', 'teampage', 'circuit', 'search']);
const shell = (id, body) => {
  const sc = SC[id]; const na = areaOf(sc.area); const group = (NAV.find(n => n[0] === na) || [null, null, ['sistema']])[2] || [na];
  const subs = SCREENS.filter(s => group.includes(s[0]) && !HIDE.has(s[1]));
  const conf = D.meta.board.confidence; const pend = W.pending.length;
  return `<div class="bshell" style="--team:${PT.color};--team2:${PT.color2}">
    <header class="bmast"><a class="bm-team" data-go="hub"><img src="${W.logoUrl(PT)}" alt=""><span><b>${esc(PT.name)}</b><span>${esc(D.meta.player.name)} · chefe de equipe · temporada ${D.meta.year}</span></span></a>
      <div class="bm-tick"><span class="${W.myCPos.pos <= D.meta.board.target ? 'g' : 'y'}"><small>Construtores</small><b>${W.myCPos.pos}º · ${W.myCPos.pts} pts</b></span><span><small>Caixa</small><b>${money(D.finances.balance)}</b></span><span class="${conf < 30 ? 'r' : conf < 55 ? 'y' : 'g'}"><small>Diretoria</small><b>${nf(conf, 0)}%</b></span><span><small>Data</small><b>${dateS(D.meta.today)}</b></span></div>
      <span class="bm-grow"></span><a class="bm-s" data-go="search">Buscar <kbd>Ctrl K</kbd></a>
      ${pend ? `<a class="bm-go wait" data-go="decision"><span>${pend} decisões<small>responda antes de avançar</small></span>→</a>` : `<a class="bm-go" data-go="weekend"><span>Avançar<small>${esc(nextGP.gp)}</small></span>→</a>`}</header>
    <nav class="bnav">${NAV.map(([a, n, g]) => `<a data-go="${SCREENS.find(s => (g || [a]).includes(s[0]))[1]}" class="${a === na ? 'on' : ''}">${n}${a === 'inicio' && W.unread.length ? `<span class="bd">${W.unread.length}</span>` : ''}</a>`).join('')}<span class="sp"></span><a data-go="options" class="${na === 'sistema' ? 'on' : ''}">Sistema</a></nav>
    <nav class="bsub">${subs.map(s => `<a data-go="${s[1]}" class="${s[1] === id ? 'on' : ''}">${esc(s[2])}</a>`).join('')}</nav>
    <main class="bcontent">${body}</main></div>`;
};

/* ---------- telas com layout próprio ---------- */
const OWN = {};
const SHORT = { design: 'Projeto', banco: 'Banco de testes', pitstop: 'Treino de pit stop', marketing: 'Hospitalidade', medico: 'Centro médico', logistica: 'Logística', motor: 'Motores', cfd: 'Centro de CFD', tunel: 'Túnel de vento', simulador: 'Simulador', sede: 'Sede', fabrica: 'Fábrica' };
const formChips = (id) => W.formOf(id).map(v => `<i class="${v === 'R' ? 'r' : v <= 3 ? 'pd' : v <= 10 ? 'pt' : ''}">${v === 'R' ? 'AB' : v}</i>`).join('');

OWN.hub = () => {
  const t = nextGP; const days = Math.round((new Date(t.date) - new Date(D.meta.today)) / 864e5); const b = D.meta.board;
  const ticker = `<div class="tick"><b>Paddock</b><div class="tick-r">${D.news.slice(0, 6).map(n => `<span>${esc(n.title)}</span>`).join('<i>/</i>')}</div></div>`;
  const front = `<section class="front"><div class="fr-l"><span class="eyebrow">Próxima etapa · ${t.round}/${cal.length} · em ${days} dias</span><h2>${esc(t.gp.replace(/^GP d[aeo]s? /, ''))}</h2><span class="fr-gp">Grande Prêmio</span>
      <div class="fr-meta">${flag(t.country)} <b>${esc(t.circuit)}</b> · ${dateS(t.date)} ${D.meta.year}${t.sprint ? ' · <span class="chip y">Sprint</span>' : ''}</div>
      <table class="fr-sch"><tr><th>Sexta</th><td>Treinos livres 1 e 2</td></tr><tr><th>Sábado</th><td>Treino livre 3 · Classificação</td></tr><tr><th>Domingo</th><td>Corrida · ${t.laps} voltas · 15:00</td></tr></table>
      <div class="fr-act">${K.btn('Preparar fim de semana', { kind: 'pri', go: 'weekend' })}${K.btn('Estratégia', { go: 'strategy' })}${K.btn('Ficha do circuito', { kind: 'ghost', go: 'circuit', p: { id: t.id } })}</div></div>
    <div class="fr-r">${trackSvg(t.shape, { w: 420, h: 300, start: true, cls: 'trk frtrk' })}<div class="fr-k">${[['Extensão', nf(t.length, 3) + ' km'], ['Curvas', t.turns], ['Chuva', Math.round(t.rain * 100) + '%'], ['Ultrapassagem', t.overtaking >= 0.7 ? 'fácil' : t.overtaking >= 0.45 ? 'média' : 'difícil']].map(([a, v]) => `<span><small>${a}</small><b>${v}</b></span>`).join('')}</div></div></section>`;
  const decide = `<section class="todo"><h3 class="todo-h">Para decidir <span>${W.pending.length}</span></h3>${W.pending.slice(0, 4).map(m => `<a class="td" data-go="decision" data-p='{"id":"${m.id}"}'><span class="td-k">${esc(INBOX_TAG[m.tag] || m.tag)}</span><b>${esc(m.title)}</b><span class="td-o">${m.choices.slice(0, 2).map(c => esc(c.replace(/\s*\(.*\)$/, ''))).join(' · ')}</span></a>`).join('')}<a class="todo-more" data-go="inbox">Ver as ${W.pending.length} decisões e ${W.unread.length} mensagens</a></section>`;
  const drivers = myDrivers.map(d => { const s = d.season || {}; return `<a class="hd" data-go="driver" data-p='{"id":"${d.id}"}'><img src="${faceUrl(d)}" alt=""><div class="hd-i"><span class="hd-n">${d.num}</span><b>${esc(d.last)}</b><span class="mu">${esc(d.first)}</span><div class="hd-s"><span><small>Pos.</small>${s.pos}º</span><span><small>Pontos</small>${s.pts}</span><span><small>Nota</small>${nf(d.ovr, 0)}</span></div><div class="form">${formChips(d.id)}</div></div></a>`; }).join('');
  const sheet = `<table class="ts"><thead><tr><th>Pos</th><th>Piloto</th><th>Equipe</th><th class="r">Pts</th><th class="r">Dif.</th></tr></thead><tbody>${standDRows.slice(0, 8).map(r => `<tr class="${r.tid === PT.id ? 'me' : ''}"><td>${r.pos}</td><td><i style="background:${tcol(r.tid)}"></i>${esc(dname(r.did))}</td><td class="mu">${esc(tname(r.tid))}</td><td class="r num">${r.pts}</td><td class="r num mu">${r.pos > 1 ? '−' + (W.leaderPts - r.pts) : ''}</td></tr>`).join('')}${standDRows.filter(r => r.tid === PT.id && r.pos > 8).map(r => `<tr class="me"><td>${r.pos}</td><td><i style="background:${tcol(r.tid)}"></i>${esc(dname(r.did))}</td><td class="mu">${esc(tname(r.tid))}</td><td class="r num">${r.pts}</td><td class="r num mu">−${W.leaderPts - r.pts}</td></tr>`).join('')}</tbody></table>`;
  return ticker + `<div class="hubb"><div class="hb-main">${front}<div class="hb-d">${drivers}</div></div><aside class="hb-side">${decide}
    <section class="card"><header class="ch"><h3>Diretoria</h3><span class="ca">meta ${b.target}º · hoje ${W.myCPos.pos}º</span></header><div class="bd"><div class="gauge"><b class="num" style="color:var(--${b.confidence < 30 ? 'r' : b.confidence < 55 ? 'y' : 'g'})">${nf(b.confidence, 0)}%</b><span>${nf(b.lastDelta, 1)} na última corrida</span></div>${K.bar(b.confidence, { tone: b.confidence < 30 ? 'bad' : b.confidence < 55 ? 'lo' : 'hi' })}</div></section>
    </aside></div>
    <div class="g" style="grid-template-columns:1.2fr 1fr 1fr">${K.card({ t: 'Campeonato de pilotos', a: '<a data-go="standings">completo</a>', flush: true, body: sheet })}
      ${K.card({ t: 'Construtores', flush: true, body: `<table class="ts"><tbody>${standCRows.map(r => `<tr class="${r.tid === PT.id ? 'me' : ''}"><td>${r.pos}</td><td><i style="background:${tcol(r.tid)}"></i>${esc(r.t.name)}</td><td class="r num">${r.pts}</td></tr>`).join('')}</tbody></table>` })}
      ${K.card({ t: 'Fábrica e caixa', body: `${D.projects.map(p => `<div class="pjm"><b>${esc(p.name)}</b><span class="mu small">${p.stage === 'design' ? 'em desenho' : 'em fabricação'} · faltam ${p.dLeft} dias</span></div>`).join('')}<div class="pjm"><b>Simulador: obra para o nível 4</b><span class="mu small">entrega em 3 corridas</span></div>${K.kv([['Caixa', money(D.finances.balance)], ['Teto: sobram', money(W.capRoom)], ['Receita por corrida', money(D.sponsors.reduce((a, s) => a + s.perRace, 0), 2)]])}` })}</div>`;
};

OWN.race = () => {
  const L = D.live; const t = cal.find(c => c.id === D.pre.trackId) || nextGP; const p = trackPath(t.shape, 520, 300, 18);
  const leadT = W.liveCars[0].T; const lapT = W.liveCars[0].last || 90;
  const dots = W.liveCars.map(c => { const f = (1 - ((c.T - leadT) / lapT) % 1 + 1) % 1 * 0.999 + 0.35; const [x, y] = W.along(p.pts, f); return `<g class="car${c.tid === PT.id ? ' me' : ''}" transform="translate(${x.toFixed(1)},${y.toFixed(1)})"><rect x="-11" y="-7" width="22" height="14" rx="2" fill="${tcol(c.tid)}"/><text y="3.5" text-anchor="middle">${esc(dabbr(c.did))}</text></g>`; }).join('');
  const rows = W.liveCars.map(c => `<tr class="${c.tid === PT.id ? 'me' : ''}"><td class="c"><b>${c.pos}</b></td><td><span class="who"><i class="slab" style="background:${tcol(c.tid)}"></i><b>${esc(dname(c.did))}</b></span></td><td class="r num">${c.pos === 1 ? 'Líder' : '+' + c.gapLead.toFixed(3)}</td><td class="r num">${c.pos === 1 ? '' : '+' + c.int.toFixed(3)}</td><td class="r num">${lap(c.last)}</td><td class="r num">${lap(c.best)}</td><td class="c">${K.tyre(c.tyre.c)}</td><td class="c num">${c.tyre.age}</td><td class="num"><span class="wear" style="--w:${100 - c.tyre.wear}%"></span></td><td class="c num">${c.pits}</td><td class="c ${c.pos < c.grid ? 'gain' : c.pos > c.grid ? 'loss' : 'mu'}">${c.pos < c.grid ? '+' + (c.grid - c.pos) : c.pos > c.grid ? '−' + (c.pos - c.grid) : '='}</td></tr>`).join('');
  const mine = W.liveCars.filter(c => c.tid === PT.id);
  return `<div class="braces" style="--team:${PT.color}"><header class="rhead"><a class="btn ghost" data-go="hub">← Sair</a><div><span class="eyebrow">${flag(t.country)} ${esc(t.circuit)}</span><h1>${esc(t.gp)}</h1></div><div class="rlap"><small>Volta</small><b class="num">${L.lap}</b><span>/ ${L.laps}</span></div><div class="rflag">Pista livre</div><div class="rwx"><small>Ar · pista</small><b class="num">${nf((D.pre.weather.air || [20])[0], 0)}° · ${nf((D.pre.weather.trackT || [30])[0], 0)}°</b><span>chuva em ~12 voltas: 30%</span></div><span class="grow"></span><div class="seg"><button type="button">Pausar</button><button type="button" class="on">1×</button><button type="button">4×</button><button type="button">16×</button></div>${K.btn('Pular para o fim', { go: 'podium' })}</header>
    <div class="rbody"><section class="rtime"><table class="t tt"><thead><tr><th class="c">Pos</th><th>Piloto</th><th class="r">Líder</th><th class="r">Intervalo</th><th class="r">Última</th><th class="r">Melhor</th><th class="c">Pneu</th><th class="c">Voltas</th><th>Desgaste</th><th class="c">Paradas</th><th class="c">+/−</th></tr></thead><tbody>${rows}</tbody></table></section>
      <aside class="rright"><section class="rmapb"><svg viewBox="0 0 520 300"><path d="${p.d}" class="rt-o"/><path d="${p.d}" class="rt-i"/>${dots}</svg></section>
        ${mine.map(c => `<section class="rc2"><div class="rc2-h">${K.av(c.d, 40)}<div><b>${esc(c.d.name)}</b><span>P${c.pos} · ${K.tyre(c.tyre.c)} ${c.tyre.wear}% · bateria ${c.soc}%</span></div></div><div class="rc2-g"><span>Pneus</span><div class="seg sm"><button type="button">Poupar</button><button type="button" class="on">Normal</button><button type="button">Atacar</button></div><span>Energia</span><div class="seg sm"><button type="button">Recarregar</button><button type="button" class="on">Neutro</button><button type="button">Ultrapassar</button></div></div><div class="rc2-b">${K.btn('Box nesta volta', { kind: 'pri' })}${K.btn('Rádio')}</div></section>`).join('')}
        <section class="rlog"><h4 class="lbl">Direção de prova</h4>${L.events.slice(-5).reverse().map(e => `<p><b class="num">V${e.lap}</b> ${esc(e.text)}</p>`).join('')}</section></aside></div></div>`;
};

OWN.podium = () => {
  const c = D.last.cls.slice(0, 3); const w = drv(c[0].did) || { name: dname(c[0].did) }; const t = cal.find(x => x.id === D.last.trackId) || {};
  return `<div class="bpod" style="--tc:${tcol(c[0].tid)}"><div class="bp-photo">${faceUrl(w) ? `<img src="${faceUrl(w)}" alt="">` : ''}<span class="bp-num">1</span></div><div class="bp-txt"><span class="eyebrow">${esc(D.last.gp)} · ${D.last.laps} voltas</span><h1>${esc(w.first || '')}<b>${esc(w.last || w.name)}</b></h1><p>vence em ${esc(t.place || '')} pela ${esc(tname(c[0].tid))}</p>
    <ol class="bp-list">${c.map((r, i) => `<li><span class="bp-p">${i + 1}</span><i style="background:${tcol(r.tid)}"></i><b>${esc(dname(r.did))}</b><span class="mu">${esc(tname(r.tid))}</span><span class="num">${i ? '+' + (r.T - c[0].T).toFixed(3) : lap(r.T)}</span></li>`).join('')}</ol>
    <div class="bp-act">${K.btn('Resultado completo', { kind: 'pri', go: 'post' })}${K.btn('Análise de dados', { go: 'analysis' })}</div></div></div>`;
};

OWN.driver = (p) => {
  const d = drv(p.id) || myDrivers[0]; const t = team(d.team) || PT; const s = d.season || {}; const c = d.career || {};
  const keys = Object.keys(ATTR); const R = 120, cx = 150, cy = 150;
  const pt = (i, v) => { const a = -Math.PI / 2 + i / keys.length * Math.PI * 2; const r = (v - 50) / 50 * R; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const poly = keys.map((k, i) => pt(i, d.attrs[k]).map(x => x.toFixed(1)).join(',')).join(' ');
  const ring = [60, 70, 80, 90, 100].map(v => `<polygon points="${keys.map((k, i) => pt(i, v).map(x => x.toFixed(1)).join(',')).join(' ')}" class="rg"/>`).join('');
  const labels = keys.map((k, i) => { const [x, y] = pt(i, 116); return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle" class="rl">${ATTR[k].split(' ')[0]}</text>`; }).join('');
  return `<section class="bdp" style="--tc:${t.color}"><div class="bdp-ph">${faceUrl(d) ? `<img src="${faceUrl(d)}" alt="">` : ''}<span class="bdp-num">${d.num || ''}</span></div>
    <div class="bdp-in"><span class="eyebrow">${flag(d.nat)} ${esc(t.name)} · ${d.age} anos · ${esc(STYLE[d.style] || '')}</span><h1>${esc(d.first || '')}<b>${esc(d.last || d.name)}</b></h1>
      <div class="bdp-strip">${[['Nota', `<span class="rate t-${tone(d.ovr)}">${nf(d.ovr, 1)}</span>`], ['Potencial estimado', K.stars(d.pot >= 90 ? 5 : d.pot >= 86 ? 4.5 : d.pot >= 82 ? 4 : 3.5)], ['Campeonato', `${s.pos || '—'}º · ${s.pts || 0} pts`], ['Moral', d.morale], ['Contrato', 'até ' + (d.contract ? d.contract.until : '—')], ['Salário', money(d.contract && d.contract.salary)]].map(([a, b]) => `<span><small>${a}</small><b>${b}</b></span>`).join('')}</div>
      <div class="bdp-act">${d.team === PT.id ? K.btn('Renovar contrato', { kind: 'pri', go: 'negotiation', p: { id: d.id } }) : K.btn('Fazer proposta', { kind: 'pri', go: 'negotiation', p: { id: d.id } })}${K.btn('Comparar')}${K.btn('Observar', { kind: 'ghost' })}</div></div></section>` +
    K.grid('360px 1fr 1fr', K.card({ t: 'Perfil', body: `<svg class="radar" viewBox="0 0 300 300">${ring}<polygon points="${poly}" class="rp"/>${labels}</svg>` }),
      K.card({ t: 'Atributos', body: ATTR_GROUPS.map(([g, ks]) => `<h4 class="lbl">${g}</h4>${ks.map(k => K.attr(ATTR[k], d.attrs[k])).join('')}`).join('') }),
      `<div class="g" style="grid-template-columns:1fr">${K.card({ t: 'Números na F1', body: `<div class="nums">${[['Largadas', c.starts], ['Vitórias', c.wins], ['Pódios', c.podiums], ['Poles', c.poles], ['Títulos', c.titles], ['Pontos', nf(c.points, 0)]].map(([a, b]) => `<span><b class="num">${b ?? 0}</b><small>${a}</small></span>`).join('')}</div>` })}
        ${K.card({ t: 'Últimas temporadas', flush: true, body: K.table([['Ano'], ['Série'], ['Equipe'], ['Pos.', 'c']], (d.real || []).slice(-4).reverse().map(r => [r[0], String(r[1]).toUpperCase(), esc(r[2]), r[3] || '—'])) })}
        ${K.card({ t: 'Contrato e empresário', body: K.kv([['Até', d.contract ? d.contract.until : '—'], ['Opção', d.contract && d.contract.option ? d.contract.option.year + ' (' + (d.contract.option.holder === 'team' ? 'equipe' : 'piloto') + ')' : '—'], ['Empresário', esc(d.manager || '—')]]) })}</div>`);
};

OWN.drivers = () => K.head({ t: 'Pilotos', s: `${PT.name} · titulares, reserva e comparação` }) +
  `<div class="bdr">${myDrivers.map(d => { const s = d.season || {}; return `<a class="bdr-c" data-go="driver" data-p='{"id":"${d.id}"}'><img src="${faceUrl(d)}" alt=""><div><span class="bdr-n">${d.num}</span><h2>${esc(d.first)}<b>${esc(d.last)}</b></h2><div class="bdr-s"><span><small>Nota</small><span class="rate t-${tone(d.ovr)}">${nf(d.ovr, 0)}</span></span><span><small>Campeonato</small><b>${s.pos}º</b></span><span><small>Pontos</small><b>${s.pts}</b></span><span><small>Contrato</small><b>${d.contract.until}</b></span></div><div class="form">${formChips(d.id)}</div></div></a>`; }).join('')}</div>` +
  K.card({ t: 'Frente a frente', flush: true, body: K.table([['Atributo'], [myDrivers[0].last, 'c'], [myDrivers[1].last, 'c'], ['Vantagem']], Object.keys(ATTR).map(k => { const a = myDrivers[0].attrs[k], b = myDrivers[1].attrs[k]; return [ATTR[k], `<b class="num">${a}</b>`, `<b class="num">${b}</b>`, a === b ? '<span class="mu">igual</span>' : `${esc(a > b ? myDrivers[0].last : myDrivers[1].last)} <span class="mu">+${Math.abs(a - b)}</span>`]; })) });

OWN.car = () => {
  const keys = Object.keys(CAR); const rank = (k) => [...D.teams].sort((a, b) => (b.car[k] || 0) - (a.car[k] || 0)).findIndex(t => t.id === PT.id) + 1;
  const callouts = [['aero', 18, 20], ['chassis', 45, 14], ['reliability', 70, 18], ['tyreCare', 15, 82], ['cooling', 52, 86], ['energy', 80, 80]];
  return K.head({ t: `${PT.chassis} · ${PT.name}`, s: `Motor ${esc(PT.pu)} · equipe de pit ${nf(PT.pitCrew, 0)}`, act: K.btn('Novo projeto', { kind: 'pri', go: 'newproject' }) }) +
    `<section class="bcar"><img src="${W.carUrl(PT)}" alt="">${callouts.map(([k, x, y]) => `<span class="bco" style="left:${x}%;top:${y}%"><small>${CAR[k]}</small><b class="num">${nf(PT.car[k], 1)}</b><em>${rank(k)}º no grid</em></span>`).join('')}</section>` +
    K.card({ t: 'Classificação de cada área no grid', flush: true, body: K.table([['Equipe'], ...keys.map(k => [CAR[k], 'c'])], [...D.teams].sort((a, b) => (b.car.aero + b.car.chassis) - (a.car.aero + a.car.chassis)).map(t => [K.tm(t.id), ...keys.map(k => K.num(t.car[k]))]), { hl: (r, i) => [...D.teams].sort((a, b) => (b.car.aero + b.car.chassis) - (a.car.aero + a.car.chassis))[i].id === PT.id }) });
};

OWN.facilities = (p) => {
  const ids = Object.keys(D.fac.B); const sel = p.id || 'tunel'; const f = PT.fac[sel] || {}; const B = D.fac.B[sel];
  const plan = { sede: [20, 20, 220, 150], fabrica: [250, 20, 260, 150], design: [520, 20, 140, 70], cfd: [520, 100, 140, 70], tunel: [670, 20, 120, 240], simulador: [20, 180, 150, 90], banco: [180, 180, 160, 90], motor: [350, 180, 160, 90], logistica: [20, 280, 240, 90], pitstop: [270, 280, 200, 90], medico: [480, 280, 120, 90], marketing: [610, 280, 180, 90] };
  return K.head({ t: 'Sede e fábrica', s: `Índice de instalações ${nf(PT.facilities, 1)} · investimento fora do teto: ${money(30)} por ano`, act: K.btn('Manutenção geral') }) +
    K.grid('1fr 360px', K.card({ t: 'Planta do complexo', a: 'Woking, Reino Unido', body: `<svg class="plan" viewBox="0 0 810 390">${ids.map(id => { const [x, y, w, h] = plan[id]; const q = PT.fac[id] || {}; return `<a data-go="facilities" data-p='{"id":"${id}"}'><rect x="${x}" y="${y}" width="${w}" height="${h}" class="pl ${id === sel ? 'on' : ''} c-${toneCond(q.cond)}"/><text x="${x + 10}" y="${y + 22}" class="pt">${esc(SHORT[id] || D.fac.B[id][0])}</text><text x="${x + 10}" y="${y + 42}" class="pv">Nível ${q.lvl || 0} · ${nf(q.cond, 0)}%</text>${id === 'simulador' ? `<text x="${x + 10}" y="${y + h - 12}" class="pw">OBRA → NÍVEL 4</text>` : ''}</a>`; }).join('')}</svg><div class="pleg"><span><i class="c-hi"></i>bom estado</span><span><i class="c-mid"></i>desgaste</span><span><i class="c-lo"></i>manutenção urgente</span></div>` }),
      K.card({ t: B[0], body: `<div class="lvp">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= f.lvl ? 'on' : ''}">${i}</i>`).join('')}</div>${K.kv([['Estado', nf(f.cond, 0) + '%'], ['O que faz', esc(D.fac.eff[sel][0])], ['Próximo nível', money(B[3] * Math.pow(f.lvl + 1, 1.35))], ['Prazo da obra', (B[4] + f.lvl) + ' corridas'], ['Manutenção', money((100 - f.cond) / 100 * Math.max(1, f.lvl) * B[5] * 2, 2)]])}<div style="display:flex;gap:8px;margin-top:14px">${K.btn('Melhorar', { kind: 'pri' })}${K.btn('Manutenção')}</div>` })) +
    K.card({ t: 'Comparação com o grid', flush: true, body: K.table([['Equipe'], ...ids.map(id => [D.fac.B[id][0].split(' ')[0], 'c'])], D.teams.map(t => [K.tm(t.id), ...ids.map(id => { const l = (t.fac && t.fac[id] && t.fac[id].lvl) || 0; return `<span class="lvc l${l}">${l}</span>`; })]), { hl: (r, i) => D.teams[i].id === PT.id }) });
};

OWN.calendar = () => {
  const months = [...new Set(cal.map(c => c.date.slice(0, 7)))];
  return K.head({ t: 'Calendário', s: `Temporada ${D.meta.year} · ${cal.length} GPs · ${cal.filter(c => c.done).length} disputados`, tabs: [['temp', 'Temporada'], ['mes', 'Mês']], tab: 'temp' }) +
    `<div class="season">${months.map(m => `<section class="sm"><h3>${MONTHS_L[+m.slice(5) - 1]}</h3>${cal.filter(c => c.date.startsWith(m)).map(c => `<a class="sgp${c.done ? ' done' : ''}${c.round === nextGP.round ? ' next' : ''}" data-go="circuit" data-p='{"id":"${c.id}"}'><span class="sg-r">${String(c.round).padStart(2, '0')}</span>${trackSvg(c.shape, { w: 70, h: 46, pad: 4 })}<span class="sg-t"><b>${esc(c.gp.replace(/^GP d[aeo]s? /, ''))}</b><small>${dateS(c.date)}${c.sprint ? ' · Sprint' : ''}</small></span><span class="sg-w">${c.done && c.winner ? `<i style="background:${tcol((drv(c.winner) || {}).team)}"></i>${esc(dabbr(c.winner))}` : c.round === nextGP.round ? '<span class="chip r">Próxima</span>' : ''}</span></a>`).join('')}</section>`).join('')}</div>` +
    K.card({ t: 'Também neste mês', body: K.list([{ title: 'F2 · Rodada 6 em Silverstone', sub: '3 pilotos da sua academia', tail: K.chip('F2', 'b') }, { title: 'Reunião do Conselho da FIA', sub: '9 de julho · 2 propostas', tail: K.chip('Conselho', 'y') }, { title: 'Janela do mercado abre', sub: '21 de julho', tail: K.chip('Mercado', 'n') }, { title: 'Assoalho novo pronto', sub: 'previsão: 12 de julho', tail: K.chip('Fábrica', 'g') }]) });
};

OWN.standings = (p) => {
  const tab = p.tab || 'pilotos';
  if (tab !== 'pilotos') return BASE.standings(K, { tab, tabs: [['pilotos', 'Pilotos'], ['construtores', 'Construtores'], ['matriz', 'Resultados por GP']] });
  const mx = standDRows[0].pts || 1;
  return K.head({ t: 'Classificação', s: `${D.results.length} de ${cal.length} etapas`, tabs: [['pilotos', 'Pilotos'], ['construtores', 'Construtores'], ['matriz', 'Resultados por GP']], tab }) +
    K.card({ flush: true, body: `<table class="t sheet"><thead><tr><th class="c">Pos</th><th>Piloto</th><th>Equipe</th><th>Pontos</th><th class="r">Vitórias</th><th class="r">Pódios</th><th class="r">Poles</th><th>Últimas 5</th></tr></thead><tbody>${standDRows.map(r => `<tr class="${r.tid === PT.id ? 'me' : ''}"><td class="c"><b>${r.pos}</b></td><td>${K.who(r.did, r.tid)}</td><td class="mu">${esc(tname(r.tid))}</td><td><span class="pbar"><i style="width:${r.pts / mx * 100}%;background:${tcol(r.tid)}"></i></span><b class="num">${r.pts}</b></td><td class="r num">${r.st.wins}</td><td class="r num">${r.st.podiums}</td><td class="r num">${r.st.poles}</td><td><span class="form sm">${formChips(r.did)}</span></td></tr>`).join('')}</tbody></table>` });
};

OWN.finance = () => {
  const F = D.finances; const bc = Object.entries(F.season.byCat).filter(([, v]) => v < 0); const tot = bc.reduce((a, [, v]) => a - v, 0);
  const CAT = { 'fábrica': 'Fábrica', marketing: 'Marketing', 'salário': 'Salários', 'operação': 'Operação', motor: 'Motor', 'P&D': 'P&D', infraestrutura: 'Infraestrutura' };
  const cols = ['#111317', '#5C6370', '#9AA0A8', '#C3C8D0', PT.color, '#D06A00', '#1D63D8', '#0E8F4F'];
  let acc = 0; const arcs = bc.map(([k, v], i) => { const a0 = acc / tot * 360; acc += -v; const a1 = acc / tot * 360; return `${cols[i % cols.length]} ${a0}deg ${a1}deg`; }).join(',');
  return K.head({ t: 'Finanças', s: `Balanço da temporada ${F.season.year} · após ${D.meta.round} etapas` }) +
    K.grid('repeat(4,1fr)', K.stat('Caixa', money(F.balance)), K.stat('Receitas', money(F.season.inc), '', 'g'), K.stat('Despesas', money(-F.season.exp), '', 'r'), K.stat('Teto: sobram', money(W.capRoom), 'de US$ 215 mi')) +
    K.grid('380px 1fr', K.card({ t: 'Despesas por área', body: `<div class="donut" style="background:conic-gradient(${arcs})"><span><b class="num">${money(tot)}</b><small>gasto no ano</small></span></div><div class="dleg">${bc.map(([k, v], i) => `<span><i style="background:${cols[i % cols.length]}"></i>${CAT[k] || k}<b class="num">${nf(-v, 1)}</b></span>`).join('')}</div>` }),
      K.card({ t: 'Livro-caixa', flush: true, body: K.table([['Etapa', 'c'], ['Lançamento'], ['Área'], ['Entrada', 'r'], ['Saída', 'r']], F.ledger.slice(-15).reverse().map(e => [e.round, esc(e.desc), `<span class="mu">${esc(e.cat)}</span>`, e.amount > 0 ? `<span class="num gain">${nf(e.amount, 2)}</span>` : '', e.amount < 0 ? `<span class="num loss">${nf(-e.amount, 2)}</span>` : ''])) }));
};

OWN.news = (p) => {
  const tab = p.tab || 'todas'; const tags = ['todas', ...new Set(D.news.map(n => n.tag))]; const list = D.news.filter(n => tab === 'todas' || n.tag === tab);
  const [h, s1, s2, ...rest] = list; const tIm = (n) => (n && n.tm && n.tm[0] && team(n.tm[0]) ? W.carUrl(team(n.tm[0])) : null);
  return `<div class="paper"><header class="pp-h"><span>${dateS(D.meta.today)} de ${D.meta.year}</span><h1>Paddock Diário</h1><span>Edição da etapa ${D.meta.round}</span></header><nav class="pp-n">${tags.map(t => `<button type="button" data-tab="${t}" class="${t === tab ? 'on' : ''}">${t === 'todas' ? 'Tudo' : NEWS_TAG[t] || t}</button>`).join('')}</nav>
    ${h ? `<div class="pp-top"><article class="pp-lead">${tIm(h) ? `<img src="${tIm(h)}" alt="">` : ''}<span class="eyebrow">${esc(OUTLET[h.outlet] || h.outlet)} · ${esc(NEWS_TAG[h.tag] || h.tag)}</span><h2>${esc(h.title)}</h2><p>${esc(h.body)}</p></article><div class="pp-side">${[s1, s2].filter(Boolean).map(n => `<article><span class="eyebrow">${esc(OUTLET[n.outlet] || n.outlet)}</span><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></article>`).join('')}</div></div>` : ''}
    <div class="pp-cols">${rest.slice(0, 12).map(n => `<article><span class="eyebrow">${esc(NEWS_TAG[n.tag] || n.tag)} · ${esc(OUTLET[n.outlet] || n.outlet)}</span><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></article>`).join('')}</div></div>`;
};

OWN.title = () => `<div class="btitle" style="--team:${PT.color}"><div class="bt-l"><img class="bt-mgc" src="${W.IMG}brand/mgc-logo-dark.png" alt="Moratelli Game Company"><h1>PitWall<b>Racing Simulator</b></h1><p>Comande uma equipe de Fórmula 1 em um universo vivo: pilotos, fábrica, política, mercado e mais de 20 categorias.</p><span class="bt-v">versão 0.8.5</span></div>
  <nav class="bt-m">${[['Continuar', 'hub', `${esc(PT.name)} · ${dateS(D.meta.today)} de ${D.meta.year} · ${nextGP.gp}`], ['Nova carreira', 'newcareer', 'equipe do grid, candidata ou criada'], ['Carregar jogo', 'options', '3 jogos salvos'], ['Opções', 'options', 'idioma, eventos, áudio, acessibilidade'], ['Editor da base', 'editor', 'equipes, pilotos, circuitos']].map(([t, g, s], i) => `<a data-go="${g}" class="${i ? '' : 'pri'}"><b>${t}</b><small>${s}</small><span>→</span></a>`).join('')}</nav>
  <img class="bt-car" src="${W.carUrl(PT)}" alt=""></div>`;

OWN.seasonend = () => {
  const h = D.history[D.history.length - 1]; const ch = drv(h.champion) || { name: h.championName };
  return K.head({ t: `Temporada ${h.year}`, s: 'Encerrada · campeões, avaliação e premiação', act: K.btn('Começar a pré-temporada', { kind: 'pri', go: 'hub' }) }) +
    `<section class="bse" style="--tc:${tcol(h.championTeam)}">${faceUrl(ch) ? `<img src="${faceUrl(ch)}" alt="">` : ''}<div><span class="eyebrow">Campeão mundial de pilotos</span><h2>${esc(h.championName)}</h2><p>${esc(tname(h.championTeam))} · ${h.standD[0].pts} pontos · ${h.standD[0].st.wins} vitórias · ${h.standD[0].st.podiums} pódios</p></div><div class="bse-c"><span class="eyebrow">Construtores</span><b>${esc(h.constructorName)}</b><span>${h.standC[0].pts} pontos</span></div></section>` +
    K.grid('1fr 1fr', K.card({ t: 'Classificação final', flush: true, body: K.table([['', 'c'], ['Piloto'], ['Pts', 'r']], h.standD.slice(0, 10).map((r, i) => [i + 1, K.who(r.did), `<b class="num">${r.pts}</b>`])) }),
      K.card({ t: 'Sua avaliação', body: K.kv([['Meta da diretoria', h.target + 'º'], ['Resultado', `<b>${h.playerPos}º</b>`], ['Confiança', '−8 pontos'], ['Prêmio da F1', money(62)], ['Meta para ' + (h.year + 1), '4º']]) + K.help('O prêmio em dinheiro depende da posição final. A próxima meta considera o orçamento e o carro do ano que vem.') }));
};

OWN.teampage = (p) => {
  const t = team(p.id) || PT; const ch = (D.hist.chron || {})[t.id] || []; const lu = t.lineup.map(drv).filter(Boolean);
  return `<section class="btp" style="--tc:${t.color};--tc2:${t.color2}"><div><img src="${W.logoUrl(t)}" alt=""><span class="eyebrow">${flag(t.country)} ${esc(t.country)} · ${esc(t.pu)}</span><h1>${esc(t.full)}</h1><p>${t.champ ? t.champ.pos + 'º no campeonato · ' + t.champ.pts + ' pontos' : ''}</p></div><img class="btp-car" src="${W.carUrl(t)}" alt=""></section>` +
    K.grid('1fr 1fr 1fr', K.card({ t: 'Pilotos', body: lu.map(d => `<div class="qd">${K.av(d, 48)}<div><b>${esc(d.name)}</b><div class="mu small">${d.season ? d.season.pos + 'º · ' + d.season.pts + ' pts' : ''}</div></div>${K.ring(d.ovr)}</div>`).join('') }),
      K.card({ t: 'Empresa', body: K.kv([['Dono', esc((t.owner || {}).name || '—')], ['Valor', money(t.value)], ['Orçamento', money(t.budget)], ['Reputação', nf(t.reputation, 1)], ['Instalações', nf(t.facilities, 1)]]) }),
      K.card({ t: 'Nomes ao longo da história', body: ch.length ? `<ol class="blin">${ch.map(([n, a, b]) => `<li><b>${esc(n)}</b><span class="num">${a}–${b || 'hoje'}</span></li>`).join('')}</ol>` : '<p class="mu">Sem nomes anteriores.</p>' })) +
    K.card({ t: 'Carro', body: Object.keys(CAR).map(k => K.attr(CAR[k], Math.round(t.car[k]))).join('') });
};

OWN.post = () => {
  const L = D.last; const mine = L.cls.filter(r => r.tid === PT.id);
  return K.head({ t: `${L.gp}`, s: `Resultado oficial · ${L.laps} voltas`, act: K.btn('Pódio', { go: 'podium' }) + K.btn('Análise', { go: 'analysis' }) + K.btn('Avançar', { kind: 'pri', go: 'hub' }) }) +
    `<div class="bpost">${mine.map(r => `<div class="bpm" style="--tc:${PT.color}">${K.av(drv(r.did), 64)}<div><b>${esc(dname(r.did))}</b><span>largou ${r.grid}º · ${r.pits} parada${r.pits > 1 ? 's' : ''} · ${r.status === 'fin' ? 'terminou' : esc(r.reason || 'abandonou')}</span></div><span class="bpm-p">P${r.pos}</span><span class="bpm-pts">+${r.pts} pts</span></div>`).join('')}</div>` +
    K.card({ t: 'Classificação oficial', flush: true, body: K.table([['Pos', 'c'], ['Nº', 'c'], ['Piloto'], ['Equipe'], ['Voltas', 'c'], ['Tempo / diferença', 'r'], ['Pts', 'r']], L.cls.map(r => [`<b>${r.pos}</b>`, (drv(r.did) || {}).num || '', K.who(r.did, r.tid), `<span class="mu">${esc(tname(r.tid))}</span>`, r.laps, r.status === 'fin' ? (r.pos === 1 ? `<span class="num">${lap(r.T)}</span>` : `<span class="num">+${(r.T - L.cls[0].T).toFixed(3)}</span>`) : `<span class="mu">${esc(r.reason || (r.status === 'lapped' ? '+1 volta' : 'abandono'))}</span>`, r.pts ? `<b class="num">${r.pts}</b>` : '']), { hl: (x, i) => L.cls[i].tid === PT.id }) });
};

OWN.rnd = () => {
  const cols = [['Na fila', []], ['Desenho', D.projects.filter(p => p.stage === 'design')], ['Fabricação', D.projects.filter(p => p.stage !== 'design')], ['Instaladas nesta temporada', []]];
  const card = (p) => { const tot = (p.designDays || 30); const done = Math.max(0, tot - (p.dLeft || 0)); return `<div class="kt" style="--c:${p.next ? 'var(--b)' : PT.color}"><b>${esc(p.name)}</b><span>${p.next ? 'carro de ' + (D.meta.year + 1) : 'carro atual'} · ${esc(p.staffName || '')}</span><div class="prog"><i style="width:${done / tot * 100}%"></i></div><span>faltam ${p.dLeft} dias · ganho +${nf(p.min, 1)} a +${nf(p.max, 1)} · risco ${p.risk}%</span></div>`; };
  const installed = [['Asa traseira — conservador', '+0,4 aerodinâmica', 'GP do Canadá'], ['Freios — equilibrado', '+0,6 chassi', 'GP de Mônaco'], ['Refrigeração — conservador', '+0,3 confiabilidade', 'GP da Espanha']];
  return K.head({ t: 'Projetos de P&D', s: `${D.projects.length} de ${D.meta.slots} vagas ocupadas · teto: sobram ${money(W.capRoom)}`, act: K.btn('Novo projeto', { kind: 'pri', go: 'newproject' }) }) +
    `<div class="kan">${cols.map(([n, ps], i) => `<section class="kc"><h4>${n}<span class="num">${i === 3 ? installed.length : ps.length}</span></h4>${i === 3 ? installed.map(([a, b, c]) => `<div class="kt" style="--c:var(--g)"><b>${a}</b><span>${b} · ${c}</span></div>`).join('') : ps.map(card).join('') || `<div class="kt empty2">${i === 0 ? 'Vaga livre: <a data-go="newproject"><b style="display:inline;font-size:14px">abrir projeto</b></a>' : 'Nada aqui'}</div>`}</section>`).join('')}</div>` +
    K.grid('1fr 1fr', K.card({ t: 'Túnel de vento e CFD neste período', body: `${K.slider('Túnel de vento', 210, 0, 320, 'de 320')}${K.slider('CFD', 1100, 0, 2000, 'de 2.000')}${K.help('O período renova a cada 4 corridas. Equipes atrás no campeonato recebem mais horas (regra ATR).')}` }),
      K.card({ t: 'Peças por área', flush: true, body: K.table([['Área'], ['Valor', 'c'], ['Posição no grid', 'c'], ['Último projeto']], Object.keys(CAR).map(k => [CAR[k], K.num(PT.car[k]), [...D.teams].sort((a, b) => (b.car[k] || 0) - (a.car[k] || 0)).findIndex(t => t.id === PT.id) + 1 + 'º', '<span class="mu">—</span>'])) }));
};

OWN.council = () => {
  const O = D.councilOpen || { props: [] }; const st = (x) => x > 0.12 ? 'sim' : x < -0.12 ? 'nao' : 'ind';
  return K.head({ t: 'Conselho da FIA', s: `Reunião do ${esc(O.gp || '')} · seu capital político: ${D.council.capital}` }) +
    O.props.map((pr, i) => { const votes = D.teams.map(t => [t, st(((pr.imp || {})[t.id] || 0) + ((pr.noise || {})[t.id] || 0) + ((pr.lobby || {})[t.id] || 0))]); const yes = votes.filter(v => v[1] === 'sim').length, no = votes.filter(v => v[1] === 'nao').length; const need = Math.ceil(D.teams.length * 0.6);
      return `<article class="doc"><div class="doc-h">${D.logos['institutions:FIA'] ? `<img src="${W.IMG + D.logos['institutions:FIA']}" alt="FIA">` : '<b>FIA</b>'}<div><b>Comissão de F1 · documento ${i + 1}</b>Proposta da ${pr.proposer === 'fia' ? 'FIA' : pr.proposer === 'fom' ? 'Fórmula 1' : esc(tname(pr.proposer))} · vale a partir de ${pr.eff}</div></div><h2>${esc(pr.title)}</h2><p class="lead" style="font-size:15px">${esc(pr.desc || '')}</p>
        <div class="score"><span class="y"><small>A favor</small><b>${yes}</b></span><span><small>Indecisas</small><b>${D.teams.length - yes - no}</b></span><span class="n"><small>Contra</small><b>${no}</b></span></div><p class="mu small" style="margin-bottom:10px">Aprovação: ${need} equipes + FIA + Fórmula 1.</p>
        ${K.table([['Equipe'], ['Intenção', 'c'], ['Efeito estimado', 'r'], ['Motor']], votes.map(([t, v]) => [K.tm(t.id), `<span class="vt2 ${v}">${v === 'sim' ? 'a favor' : v === 'nao' ? 'contra' : 'indecisa'}</span>`, `<span class="num ${pr.imp[t.id] >= 0 ? 'gain' : 'loss'}">${(pr.imp[t.id] >= 0 ? '+' : '') + nf(pr.imp[t.id], 2)}</span>`, esc(t.pu || t.engine)]), { hl: (r, j) => votes[j][0].id === PT.id })}
        <div style="display:flex;gap:8px;margin-top:14px">${K.btn('Votar a favor', { kind: 'pri' })}${K.btn('Votar contra')}${K.btn('Abster')}${K.btn('Negociar apoio · 8 de capital', { kind: 'ghost' })}</div></article>`; }).join('');
};

OWN.search = () => `<div class="srch-bg">${shell('hub', OWN.hub())}</div>` + BASE.search(K);

const FULL = new Set(['race', 'podium', 'title']);
W.P.b = {
  name: 'Paddock',
  render(id, p) {
    if (id === 'search') return OWN.search();
    const body = OWN[id] ? OWN[id](p || {}) : BASE[id] ? BASE[id](K, p || {}) : `<p>Tela ${esc(id)} em construção.</p>`;
    return FULL.has(id) ? `<div class="full" style="--team:${PT.color};--team2:${PT.color2}">${body}</div>` : shell(id, body);
  },
};
})();
