/* ============================================================
   PIT WALL 0.8.5 — kit de componentes e gráficos das telas novas
   (cartões, tabelas, notas, anéis, barras, rosca, radar, linhas, colunas)
   ============================================================ */
'use strict';

const K85 = {};
const at85 = (o) => o ? (o.act ? ` data-act="${o.act}"${o.v ? ` data-v="${o.v}"` : ''}${o.p ? ` data-p='${esc(JSON.stringify(o.p))}'` : ''}${o.id != null ? ` data-id="${esc(o.id)}"` : ''}${o.extra || ''}` : '') : '';
K85.go = (v, p) => ({ act: 'go', v, p });
K85.tone = (v) => v >= 88 ? 'elite' : v >= 82 ? 'hi' : v >= 75 ? 'mid' : v >= 68 ? 'lo' : 'bad';
K85.toneP = (v) => v >= 70 ? 'hi' : v >= 45 ? 'mid' : v >= 30 ? 'lo' : 'bad';   // percentuais (confiança, moral)
K85.head = ({ t, s, act, tabs, tab, tabAct, eyebrow }) => `<div class="n-ph"><div>${eyebrow ? `<span class="n-eyebrow">${eyebrow}</span>` : ''}<h1>${esc(t)}</h1>${s ? `<p>${s}</p>` : ''}</div><span class="n-grow"></span>${tabs ? `<div class="n-tabs">${tabs.map(([v, l]) => `<button class="${v === tab ? 'on' : ''}" ${tabAct ? `data-act="${tabAct}" data-val="${esc(v)}"` : `data-act="go" data-v="${UI.view}" data-p='${esc(JSON.stringify(Object.assign({}, UI.params || {}, { tab: v })))}'`}>${esc(l)}</button>`).join('')}</div>` : ''}${act ? `<div class="n-acts">${act}</div>` : ''}</div>`;
K85.card = ({ t, a, body, cls = '', flush, on, style }) => `<section class="n-card ${cls}${flush ? ' flush' : ''}${on ? ' go' : ''}"${at85(on)}${style ? ` style="${style}"` : ''}>${t ? `<header class="n-ch"><h3>${t}</h3>${a ? `<span class="n-ca">${a}</span>` : ''}</header>` : ''}<div class="n-bd">${body}</div></section>`;
K85.grid = (tpl, ...items) => `<div class="n-grid" style="grid-template-columns:${tpl}">${items.join('')}</div>`;
K85.col = (...items) => `<div class="n-col">${items.join('')}</div>`;
K85.table = (cols, rows, o = {}) => `<div class="n-tw"${o.maxH ? ` style="max-height:${o.maxH}px;overflow:auto"` : ''}><table class="n-t ${o.cls || ''}"><thead><tr>${cols.map(c => `<th class="${c[1] || ''}"${c[2] ? ` style="width:${c[2]}"` : ''}>${esc(c[0])}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr class="${o.hl && o.hl(i) ? 'me' : ''} ${o.rowCls ? o.rowCls(i) : ''} ${o.rowAct ? 'go' : ''}"${o.rowAct ? at85(o.rowAct(i)) : ''}>${r.map((c, j) => `<td class="${(cols[j] || [])[1] || ''}">${c == null ? '' : c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
K85.tag = (t, c = '') => `<span class="n-tag ${c}">${t}</span>`;
K85.btn = (t, o = {}) => `<button class="btn ${o.kind || ''} ${o.sm ? 'sm' : ''}"${at85(o)}${o.disabled ? ' disabled' : ''}${o.title ? ` title="${esc(o.title)}"` : ''}>${t}</button>`;
K85.stat = (l, v, s, c = '', extra = '') => `<div class="n-stat ${c}"><div class="l">${esc(l)}</div><div class="v">${v}</div>${s ? `<div class="s">${s}</div>` : ''}${extra}</div>`;
K85.rate = (v, lg) => `<span class="n-rate t-${K85.tone(v)}${lg ? ' lg' : ''}">${Math.round(v)}</span>`;
K85.ring = (v, sz = 52, label = '', pct = true) => { const c = pct ? K85.toneP(v) : K85.tone(v); const fill = pct ? v : Math.max(0, Math.min(100, (v - 50) * 2)); return `<span class="n-ring t-${c}" style="--v:${Math.max(0, Math.min(100, fill))};--sz:${sz}px"><b>${Math.round(v)}</b>${label ? `<small>${esc(label)}</small>` : ''}</span>`; };
K85.seg = (v, max = 100, tone) => { const n = Math.round(Math.max(0, Math.min(1, v / max)) * 10); return `<span class="n-segbar t-${tone || K85.tone(v)}">${Array.from({ length: 10 }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`; };
K85.bar = (v, max = 100, color, w) => `<span class="n-bar"${w ? ` style="width:${w}px"` : ''}><i style="width:${Math.max(0, Math.min(100, v / max * 100))}%${color ? `;background:${color}` : ''}"></i></span>`;
K85.attr = (l, v) => `<div class="n-attr t-${K85.tone(v)}"><span>${esc(l)}</span>${K85.seg(v)}<b>${Math.round(v)}</b></div>`;
K85.pos = (n) => `<span class="n-pos ${n <= 3 ? 'p' + n : ''}">${n}</span>`;
K85.tyre = (c) => `<span class="n-tyre ${c}" title="${esc((TYRES[c] || {}).name || c)}">${c}</span>`;
K85.stars = (n) => `<span class="n-stars" title="${n}/5">${'★'.repeat(Math.floor(n))}${n % 1 ? '½' : ''}<s>${'★'.repeat(Math.max(0, 5 - Math.ceil(n)))}</s></span>`;
K85.face = (d) => d ? (typeof Assets !== 'undefined' && Assets.face(d)) || imgUrl(d.img) : null;
K85.av = (d, s = 40) => { const u = K85.face(d); return u ? `<img class="n-av" src="${u}" alt="" loading="lazy" style="width:${s}px;height:${s}px" onerror="this.style.visibility='hidden'">` : `<span class="n-av" style="width:${s}px;height:${s}px;font-size:${Math.round(s * .34)}px">${esc(initials(d && d.name))}</span>`; };
K85.who = (did, o = {}) => { const d = Career.driver(G, did); if (!d) return esc(typeof hName === 'function' ? hName(did) : did); const tid = o.tid || d.team; return `<span class="n-who" data-act="driverPage" data-id="${esc(d.id)}" style="cursor:pointer"><i class="n-slab" style="background:${tid ? teamColor(tid) : 'var(--mu2)'}"></i>${o.flag !== false ? flagOnly(d.nat) : ''}<b>${esc(o.short ? shortName(d) : d.name)}</b></span>`; };
K85.tm = (tid, o = {}) => { const t = Career.team(G, tid); if (!t) return ''; const u = imgUrl(t.logo); return `<span class="n-tm" data-act="teamPage85" data-id="${t.id}" style="cursor:pointer"><i class="n-slab" style="background:${t.color}"></i>${u && o.logo !== false ? `<img src="${u}" alt="">` : ''}${esc(o.short ? (t.short || t.name) : t.name)}</span>`; };
K85.kv = (pairs) => `<dl class="n-kv">${pairs.filter(Boolean).map(([a, b]) => `<dt>${a}</dt><dd>${b == null || b === '' ? '—' : b}</dd>`).join('')}</dl>`;
K85.list = (items) => `<div class="n-list">${items.map(it => `<div class="n-li${it.on ? ' on' : ''}"${at85(it.do)}>${it.lead || ''}<span class="n-lt"><b>${it.title}</b>${it.sub ? `<span>${it.sub}</span>` : ''}</span>${it.tail || ''}</div>`).join('')}</div>`;
K85.help = (t) => `<div class="n-help">${esc(t)}</div>`;
K85.empty = (t, act) => `<div class="n-empty"><i></i><div><p>${esc(t)}</p>${act ? `<div style="margin-top:8px">${act}</div>` : ''}</div></div>`;
K85.form = (arr, lg) => `<span class="n-form${lg ? ' lg' : ''}">${arr.map(v => `<i class="${v === 'AB' ? 'r' : v <= 3 ? 'pd' : v <= 10 ? 'pt' : ''}">${v}</i>`).join('')}</span>`;
K85.pips = (n, max = 5) => `<span class="n-pips">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;

/* ---------- gráficos SVG ---------- */
K85.spark = (vals, o = {}) => {
  const v = (vals || []).filter(x => isFinite(x)); if (v.length < 2) return '';
  const w = o.w || 120, h = o.h || 32; const mn = Math.min(...v), mx = Math.max(...v);
  const pts = v.map((x, i) => [i / (v.length - 1) * w, h - 3 - (x - mn) / ((mx - mn) || 1) * (h - 6)]);
  const c = o.c || 'var(--team)'; const l = pts[pts.length - 1]; const P = pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
  return `<svg class="n-spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="0,${h} ${P} ${w},${h}" fill="color-mix(in srgb, ${c} 16%, transparent)" stroke="none"/><polyline points="${P}" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"/><circle cx="${l[0].toFixed(1)}" cy="${l[1].toFixed(1)}" r="3" fill="${c}"/></svg>`;
};
K85.donut = (parts, center, sz = 200) => {
  const tot = parts.reduce((a, p) => a + Math.max(0, p.v), 0) || 1; let acc = 0;
  const arcs = parts.map(p => { const a0 = acc / tot * 360; acc += Math.max(0, p.v); return `${p.c} ${a0.toFixed(2)}deg ${(acc / tot * 360).toFixed(2)}deg`; }).join(',');
  return `<div class="n-donut" style="--sz:${sz}px;background:conic-gradient(${arcs || 'var(--s3) 0 360deg'})"><span>${center || ''}</span></div>`;
};
K85.legend = (parts, fmt) => `<div class="n-leg">${parts.map(p => `<span><i style="background:${p.c}"></i>${esc(p.l)}<b>${fmt ? fmt(p.v) : p.v}</b></span>`).join('')}</div>`;
K85.radar = (labels, series, o = {}) => {
  const n = labels.length, R = o.r || 110, cx = R + 78, cy = R + 24, W = cx * 2, H = cy * 2 - 4, lo = o.min ?? 50, hi = o.max ?? 100;
  const pt = (i, v) => { const a = -Math.PI / 2 + i / n * Math.PI * 2; const r = Math.max(0, Math.min(1.25, (v - lo) / (hi - lo))) * R; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const rings = [0.25, 0.5, 0.75, 1].map(f => `<polygon class="rg" points="${labels.map((_, i) => pt(i, lo + (hi - lo) * f).map(x => x.toFixed(1)).join(',')).join(' ')}"/>`).join('');
  const axes = labels.map((_, i) => { const [x, y] = pt(i, hi); return `<line class="ra" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
  const polys = series.map((s, k) => `<polygon class="${k ? 'rp2' : 'rp'}" points="${s.map((v, i) => pt(i, v).map(x => x.toFixed(1)).join(',')).join(' ')}"${o.colors && o.colors[k] ? ` style="stroke:${o.colors[k]};fill:color-mix(in srgb, ${o.colors[k]} ${k ? 18 : 28}%, transparent)"` : ''}/>`).join('');
  const lab = labels.map((l, i) => { const [x, y] = pt(i, hi + (hi - lo) * 0.14); return `<text class="rl" x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${Math.abs(x - cx) < 8 ? 'middle' : x > cx ? 'start' : 'end'}">${esc(l)}</text>`; }).join('');
  return `<svg class="n-radar" viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${o.maxW || W}px;display:block;margin:0 auto">${rings}${axes}${polys}${lab}</svg>`;
};
/* colunas (valores positivos e negativos) */
K85.cols = (items, o = {}) => {
  if (!items.length) return K85.empty(byLang('Sem dados ainda.', 'No data yet.'));
  const W = o.w || 640, H = o.h || 200, m = { l: 44, r: 8, t: 10, b: 26 };
  const vals = items.map(x => x.v); const mx = Math.max(0, ...vals), mn = Math.min(0, ...vals); const span = (mx - mn) || 1;
  const y = (v) => m.t + (mx - v) / span * (H - m.t - m.b); const bw = (W - m.l - m.r) / items.length;
  const ticks = [mn, mx, 0].filter((v, i, a) => a.indexOf(v) === i);
  return `<svg class="n-chart" viewBox="0 0 ${W} ${H}">${ticks.map(v => `<line class="gl" x1="${m.l}" x2="${W - m.r}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="gt" x="${m.l - 6}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end">${o.fmt ? o.fmt(v) : Math.round(v)}</text>`).join('')}${items.map((it, i) => { const y0 = y(Math.max(0, it.v)), y1 = y(Math.min(0, it.v)); return `<rect x="${(m.l + i * bw + bw * 0.16).toFixed(1)}" y="${y0.toFixed(1)}" width="${(bw * 0.68).toFixed(1)}" height="${Math.max(1, y1 - y0).toFixed(1)}" rx="2" fill="${it.c || (it.v < 0 ? 'var(--red)' : 'var(--team)')}"><title>${esc(it.l)}: ${o.fmt ? o.fmt(it.v) : it.v}</title></rect>${i % (o.every || 1) === 0 ? `<text class="gt" x="${(m.l + i * bw + bw / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${esc(it.l)}</text>` : ''}`; }).join('')}</svg>`;
};
/* linhas simples (sem interação) */
K85.lines = (series, o = {}) => {
  const W = o.w || 640, H = o.h || 220, m = { l: 44, r: 10, t: 10, b: 24 };
  const all = series.flatMap(s => s.pts.filter(p => p && isFinite(p[1]))); if (all.length < 2) return K85.empty(byLang('Sem dados ainda.', 'No data yet.'));
  const x0 = Math.min(...all.map(p => p[0])), x1 = Math.max(...all.map(p => p[0])); let y0 = o.yMin ?? Math.min(...all.map(p => p[1])), y1 = o.yMax ?? Math.max(...all.map(p => p[1])); if (y0 === y1) { y0 -= 1; y1 += 1; }
  const sx = (x) => m.l + (x - x0) / ((x1 - x0) || 1) * (W - m.l - m.r); const sy = (v) => o.invert ? m.t + (v - y0) / (y1 - y0) * (H - m.t - m.b) : H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
  const ticks = niceTicks(y0, y1, 4).filter(v => v >= y0 && v <= y1);
  const body = series.map(s => { const ok = s.pts.filter(p => p && isFinite(p[1])); if (!ok.length) return ''; let d = '', pen = false; s.pts.forEach(p => { if (!p || !isFinite(p[1])) { pen = false; return; } d += (pen ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1); pen = true; }); const l = ok[ok.length - 1], f = ok[0]; return `${s.area ? `<path d="${d} L${sx(l[0]).toFixed(1)} ${H - m.b} L${sx(f[0]).toFixed(1)} ${H - m.b} Z" fill="color-mix(in srgb, ${s.c} 14%, transparent)"/>` : ''}<path d="${d}" fill="none" stroke="${s.c}" stroke-width="${s.w || 2}" ${s.dash ? `stroke-dasharray="${s.dash}"` : ''} stroke-linejoin="round" opacity="${s.dim ? 0.35 : 1}"><title>${esc(s.name || '')}</title></path><circle cx="${sx(l[0]).toFixed(1)}" cy="${sy(l[1]).toFixed(1)}" r="3" fill="${s.c}"/>`; }).join('');
  return `<svg class="n-chart" viewBox="0 0 ${W} ${H}">${ticks.map(v => `<line class="gl" x1="${m.l}" x2="${W - m.r}" y1="${sy(v).toFixed(1)}" y2="${sy(v).toFixed(1)}"/><text class="gt" x="${m.l - 6}" y="${(sy(v) + 3).toFixed(1)}" text-anchor="end">${o.fmt ? o.fmt(v) : +v.toFixed(1)}</text>`).join('')}${body}${o.xlabels ? o.xlabels.map(([x, t]) => `<text class="gt" x="${sx(x).toFixed(1)}" y="${H - 6}" text-anchor="middle">${esc(t)}</text>`).join('') : ''}</svg>`;
};
/* medidor semicircular */
K85.gauge = (v, max = 100, label = '', c) => { const f = Math.max(0.001, Math.min(1, v / max)); const a = Math.PI * (1 - f); const x = 100 + Math.cos(a) * 80, y = 100 - Math.sin(a) * 80; return `<svg class="n-gauge" viewBox="0 0 200 112"><path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="var(--s3)" stroke-width="14" stroke-linecap="round"/><path d="M20 100 A80 80 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}" fill="none" stroke="${c || 'var(--team)'}" stroke-width="14" stroke-linecap="round"/><text x="100" y="94" text-anchor="middle" style="font:600 26px var(--f-mono);fill:var(--fg)">${label || Math.round(v)}</text></svg>`; };
/* traçado da pista em SVG (o mesmo caminho do mapa da corrida) */
K85.track = (tr, o = {}) => {
  if (!tr) return '';
  const tp = trackPath(tr); const w = o.w || 300, h = o.h || 200, pad = o.pad ?? 10;
  const s = Math.min((w - pad * 2) / (tp.w || 1), (h - pad * 2) / (tp.h || 1)); const ox = (w - tp.w * s) / 2, oy = (h - tp.h * s) / 2;
  const d = 'M' + tp.pts.map(p => (ox + p[0] * s).toFixed(1) + ' ' + (oy + p[1] * s).toFixed(1)).join('L') + 'Z';
  const sf = tp.pts[0];
  return `<svg class="n-trk ${o.cls || ''}" viewBox="0 0 ${w} ${h}"${w <= 140 ? ` style="width:${w}px;height:${h}px;flex:none"` : ''} aria-hidden="true"><path d="${d}" class="t-o"/><path d="${d}" class="t-i"/>${o.start !== false ? `<circle cx="${(ox + sf[0] * s).toFixed(1)}" cy="${(oy + sf[1] * s).toFixed(1)}" r="${o.dot || 4}" class="t-s"/>` : ''}</svg>`;
};
/* resultados de um piloto na temporada (posição ou AB) */
K85.results = (did) => {
  const out = [];
  (G.season.results || []).forEach(r => { const c = (r.cls || []).find(x => x.did === did); if (c) out.push(c.status === 'dnf' || c.status === 'dsq' ? 'AB' : c.pos); });
  return out;
};
K85.recent = (did, n = 5) => K85.results(did).slice(-n);
/* série do caixa a partir do livro-caixa */
K85.cashSeries = () => { let b = G.finances.balance; const L = (G.finances.ledger || []).slice().reverse(); const out = [b]; for (const e of L.slice(0, 60)) { b -= e.amount; out.push(b); } return out.reverse(); };
