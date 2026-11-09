/* ============================================================
   PIT WALL 0.8.5 — Equipe
   - Pilotos (modelo A, cartões grandes) com atalho para o Mano a Mano
   - Mano a Mano: comparação completa entre dois pilotos (radar, duelos, temporada)
   - Ficha do piloto em página própria (modelo A + diagrama de radar)
   ============================================================ */
'use strict';

const ATTR85 = [['pace', 'Velocidade', 'Pace'], ['qualifying', 'Classificação', 'Qualifying'], ['racecraft', 'Corrida', 'Racecraft'], ['consistency', 'Consistência', 'Consistency'], ['tyre', 'Pneus', 'Tyres'], ['energy', 'Energia', 'Energy'], ['wet', 'Chuva', 'Wet'], ['overtaking', 'Ultrapassagem', 'Overtaking'], ['defending', 'Defesa', 'Defending'], ['start', 'Largada', 'Starts'], ['adaptability', 'Adaptação', 'Adaptability'], ['concentration', 'Concentração', 'Concentration'], ['feedback', 'Retorno técnico', 'Feedback']];
const ATTR_GROUPS85 = [['Velocidade', 'Speed', ['pace', 'qualifying', 'wet']], ['Corrida', 'Racing', ['racecraft', 'overtaking', 'defending', 'start']], ['Gestão', 'Management', ['tyre', 'energy', 'consistency', 'concentration']], ['Técnica', 'Technical', ['adaptability', 'feedback']]];
const attrName85 = (k) => { const a = ATTR85.find(x => x[0] === k); return a ? byLang(a[1], a[2]) : k; };
const aval85 = (d, k) => Math.round(d[k] ?? d.pace ?? 0);

/* estatísticas da temporada a partir dos resultados */
function seasonStats85(did) {
  const out = { starts: 0, pts: 0, wins: 0, pods: 0, top10: 0, dnfs: 0, poles: 0, grid: [], fin: [], best: null, laps: 0 };
  (G.season.results || []).forEach(r => {
    const c = (r.cls || []).find(x => x.did === did); if (!c) return;
    out.starts++; out.pts += c.pts || 0;
    const ok = c.status === 'fin' || c.status === 'lapped';
    if (ok) { out.fin.push(c.pos); if (c.pos === 1) out.wins++; if (c.pos <= 3) out.pods++; if (c.pos <= 10) out.top10++; if (out.best == null || c.pos < out.best) out.best = c.pos; } else out.dnfs++;
    if (c.grid) out.grid.push(c.grid);
    if (r.pole === did) out.poles++;
  });
  const avg = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  out.avgGrid = avg(out.grid); out.avgFin = avg(out.fin);
  return out;
}
function h2h85(a, b) {
  let q = [0, 0], r = [0, 0];
  (G.season.results || []).forEach(res => {
    const ca = (res.cls || []).find(x => x.did === a), cb = (res.cls || []).find(x => x.did === b);
    if (!ca || !cb) return;
    if (ca.grid && cb.grid) { if (ca.grid < cb.grid) q[0]++; else if (cb.grid < ca.grid) q[1]++; }
    const oa = ca.status === 'fin' || ca.status === 'lapped', ob = cb.status === 'fin' || cb.status === 'lapped';
    if (oa && ob) { if (ca.pos < cb.pos) r[0]++; else r[1]++; } else if (oa) r[0]++; else if (ob) r[1]++;
  });
  return { q, r };
}

/* ---------------- Pilotos ---------------- */
function drivers85() {
  const team = Career.team(G);
  const ds = Career.teamDrivers(G, team.id).sort((a, b) => (a.seat === 'R' ? 9 : a.seat) - (b.seat === 'R' ? 9 : b.seat));
  const main = ds.filter(d => d.seat !== 'R'); const res = ds.filter(d => d.seat === 'R');
  const incoming = G.db.drivers.filter(d => d.futureTeam && d.futureTeam.team === team.id);
  const sd = Career.standingsD(G);
  const big = (d) => { const i = sd.findIndex(x => x.did === d.id); const st = seasonStats85(d.id); const c = d.contract || {}; const f = K85.face(d); const ovr = driverOverall(d);
    return `<section class="dbig" style="--tc:${team.color}"><button class="dbig-hit" data-act="driverPage" data-id="${d.id}" aria-label="${esc(d.name)}"></button>${f ? `<img src="${f}" alt="">` : ''}
      <div class="dbig-i"><span class="dbig-num n-num">${d.number ?? ''}</span><h2>${esc(d.firstName || '')}<b>${esc(d.lastName || shortName(d))}</b></h2><p>${natTag(d.nat)} ${d.age} ${byLang('anos', 'years')} · ${esc(STYLE_LABELS[d.style] || '')} · ${byLang('carro', 'car')} #${d.seat}</p>
      <div class="dbig-k">${K85.ring(ovr, 58, '', false)}<span><small>${byLang('Campeonato', 'Championship')}</small><b>${i >= 0 ? ordinal(i + 1) : '—'} · ${st.pts} pts</b></span><span><small>${byLang('Contrato', 'Contract')}</small><b>${byLang('até', 'until')} ${c.until || '—'}</b></span><span><small>${byLang('Moral', 'Morale')}</small>${K85.ring(d.morale || 60, 36)}</span></div>
      <div class="dbig-f">${K85.form(K85.recent(d.id, 8))}</div>
      <div class="dbig-a"><select class="inp" data-chg="setSeat" data-id="${d.id}" aria-label="${byLang('Assento', 'Seat')}">${opt(1, byLang('Carro #1', 'Car #1'), d.seat)}${opt(2, byLang('Carro #2', 'Car #2'), d.seat)}${opt('R', byLang('Reserva', 'Reserve'), d.seat)}</select>${K85.btn(byLang('Renovar', 'Renew'), { act: 'negotiate', id: d.id, extra: ' data-renew="1"', sm: true })}${K85.btn(byLang('Ficha', 'Profile'), { act: 'driverPage', id: d.id, sm: true })}${K85.btn(byLang('Dispensar', 'Release'), { act: 'releaseDlg', id: d.id, sm: true, kind: 'danger' })}</div></div></section>`; };
  const duel = main.length >= 2 ? (() => { const [a, b] = main; const h = h2h85(a.id, b.id); const keys = ['qualifying', 'pace', 'racecraft', 'tyre', 'wet', 'start'];
    return K85.card({ t: 'Mano a Mano', a: `<a data-act="go" data-v="mano">${byLang('comparação completa', 'full comparison')}</a>`, body: `<div class="mm-mini"><div class="mm-h"><b>${esc(shortName(a))}</b><span>${byLang('Classificação', 'Qualifying')} <em class="n-num">${h.q[0]}–${h.q[1]}</em> · ${byLang('Corrida', 'Race')} <em class="n-num">${h.r[0]}–${h.r[1]}</em></span><b>${esc(shortName(b))}</b></div>${keys.map(k => { const x = aval85(a, k), y = aval85(b, k); return `<div class="mm-r"><b class="n-num ${x >= y ? 'w' : ''}">${x}</b><div class="mm-b"><i class="l" style="width:${x / (x + y) * 100}%"></i><i class="r"></i></div><b class="n-num ${y > x ? 'w' : ''}">${y}</b><span>${attrName85(k)}</span></div>`; }).join('')}</div>` }); })() : '';
  return K85.head({ t: byLang('Pilotos', 'Drivers'), s: `${esc(team.name)} · ${byLang('titulares, reservas e quem chega', 'race drivers, reserves and arrivals')}`, act: K85.btn(byLang('Mercado', 'Market'), { act: 'go', v: 'market' }) + K85.btn(byLang('Academia', 'Academy'), { act: 'go', v: 'academy' }) }) +
    `<div class="dbigs">${main.map(big).join('')}</div>` + duel +
    K85.grid('1fr 1fr', K85.card({ t: byLang('Reservas', 'Reserves'), flush: true, body: res.length ? K85.table([[byLang('Piloto', 'Driver')], [byLang('Idade', 'Age'), 'c'], [byLang('Nota', 'Rating'), 'c'], [byLang('Contrato', 'Contract'), 'c'], ['', 'r']], res.map(d => [K85.who(d.id), d.age, K85.rate(driverOverall(d)), (d.contract || {}).until || '—', `<select class="inp" style="width:auto" data-chg="setSeat" data-id="${d.id}">${opt('R', byLang('Reserva', 'Reserve'), d.seat)}${opt(1, byLang('Carro #1', 'Car #1'), d.seat)}${opt(2, byLang('Carro #2', 'Car #2'), d.seat)}</select>`])) : `<div style="padding:12px 16px">${K85.empty(byLang('Nenhum reserva contratado.', 'No reserve driver.'), K85.btn(byLang('Procurar no mercado', 'Search the market'), { act: 'go', v: 'market', sm: true }))}</div>` }),
      K85.card({ t: byLang(`Chegam em ${G.season.year + 1}`, `Arriving in ${G.season.year + 1}`), flush: true, body: incoming.length ? K85.table([[byLang('Piloto', 'Driver')], [byLang('Papel', 'Role')], [byLang('Nota', 'Rating'), 'c']], incoming.map(d => [K85.who(d.id), d.futureTeam.role === 'R' ? byLang('Reserva', 'Reserve') : byLang('Carro #', 'Car #') + d.futureTeam.role, K85.rate(driverOverall(d))])) : `<div style="padding:12px 16px">${K85.empty(byLang('Nenhuma contratação para o ano que vem.', 'No signing for next year yet.'))}</div>` }));
}
(function () {
  const old = SCREENS.team;
  SCREENS.team = { html() { const tab = UI.params.tab || 'drivers'; if (tab === 'drivers' && !Career.isObs(G)) return drivers85(); return old.html.call(this); }, after() { if (old.after) old.after.call(this); } };
})();

/* ---------------- Mano a Mano ---------------- */
ACT.mano85 = (el) => { const p = Object.assign({}, UI.params); p[el.dataset.side] = el.value; go('mano', p); };
CHG.mano85 = (el) => ACT.mano85(el);
SCREENS.mano = {
  html() {
    const lu = Career.isObs(G) ? [] : Career.lineup(G, G.player.teamId);
    const sd = Career.standingsD(G);
    const aId = UI.params.a || (lu[0] && lu[0].id) || (sd[0] && sd[0].did);
    const bId = UI.params.b || (lu[1] && lu[1].id) || (sd[1] && sd[1].did);
    const a = Career.driver(G, aId), b = Career.driver(G, bId);
    if (!a || !b) return K85.empty(byLang('Escolha dois pilotos.', 'Pick two drivers.'));
    const ca = teamColor(a.team), cb = a.team === b.team ? 'var(--blue)' : teamColor(b.team);
    const pool = G.db.drivers.filter(d => d.team && d.seat).sort((x, y) => (Career.team(G, x.team).name).localeCompare(Career.team(G, y.team).name));
    const pick = (side, cur) => `<select class="inp mm-sel" data-chg="mano85" data-side="${side}" aria-label="${byLang('Piloto', 'Driver')}">${pool.map(d => opt(d.id, `${d.name} · ${Career.team(G, d.team).name}`, cur.id)).join('')}</select>`;
    const sa = seasonStats85(a.id), sb = seasonStats85(b.id); const h = h2h85(a.id, b.id);
    const side = (d, s, c, al) => { const f = K85.face(d); return `<div class="mm-p ${al}" style="--tc:${c}">${f ? `<img src="${f}" alt="">` : ''}<div class="mm-pi"><span class="n-num mm-n">${d.number ?? ''}</span><b>${esc(d.firstName || '')}<em>${esc(d.lastName || shortName(d))}</em></b><span class="n-mu">${esc((Career.team(G, d.team) || {}).name || '')} · ${d.age} ${byLang('anos', 'years')}</span><span class="mm-ovr">${K85.rate(driverOverall(d), true)}</span></div></div>`; };
    const row = (l, x, y, o = {}) => { const better = o.low ? (x != null && y != null ? (x < y ? 0 : y < x ? 1 : -1) : -1) : (x > y ? 0 : y > x ? 1 : -1); const fx = o.fmt || ((v) => v == null ? '—' : v); const mx = Math.max(Math.abs(x || 0), Math.abs(y || 0)) || 1;
      return `<div class="mm-row"><b class="n-num ${better === 0 ? 'w' : ''}">${fx(x)}</b><div class="mm-bar"><i class="l" style="width:${o.low ? 50 : (x || 0) / mx * 50}%;background:${ca}"></i><i class="r" style="width:${o.low ? 50 : (y || 0) / mx * 50}%;background:${cb}"></i></div><b class="n-num ${better === 1 ? 'w' : ''}">${fx(y)}</b><span>${l}</span></div>`; };
    const keys = ATTR85.map(x => x[0]);
    const posSeries = (d, c) => ({ c, w: 2.4, pts: K85.results(d.id).map((v, i) => [i + 1, v === 'AB' ? null : v]), name: d.name });
    return K85.head({ t: 'Mano a Mano', s: byLang('Compare dois pilotos atributo por atributo e na temporada', 'Compare two drivers attribute by attribute and this season'), act: `${pick('a', a)}<span class="mm-vs">vs</span>${pick('b', b)}` }) +
      `<section class="mm-top">${side(a, sa, ca, 'l')}<div class="mm-mid"><div class="mm-score"><span><small>${byLang('Classificação', 'Qualifying')}</small><b class="n-num"><i style="color:${ca}">${h.q[0]}</i>–<i style="color:${cb}">${h.q[1]}</i></b></span><span><small>${byLang('Corrida', 'Race')}</small><b class="n-num"><i style="color:${ca}">${h.r[0]}</i>–<i style="color:${cb}">${h.r[1]}</i></b></span><span><small>${byLang('Pontos', 'Points')}</small><b class="n-num"><i style="color:${ca}">${sa.pts}</i>–<i style="color:${cb}">${sb.pts}</i></b></span></div>
        ${K85.radar(keys.map(attrName85), [keys.map(k => aval85(a, k)), keys.map(k => aval85(b, k))], { r: 118, min: 55, max: 100, colors: [ca, cb === 'var(--blue)' ? '#4DA3FF' : cb], maxW: 420 })}</div>${side(b, sb, cb, 'r')}</section>` +
      K85.grid('1fr 1fr', K85.card({ t: byLang('Atributos', 'Attributes'), body: keys.map(k => row(attrName85(k), aval85(a, k), aval85(b, k))).join('') }),
        K85.col(K85.card({ t: byLang('Temporada', 'Season'), body: [row(byLang('Pontos', 'Points'), sa.pts, sb.pts), row(byLang('Vitórias', 'Wins'), sa.wins, sb.wins), row(byLang('Pódios', 'Podiums'), sa.pods, sb.pods), row(byLang('Top 10', 'Top 10'), sa.top10, sb.top10), row('Poles', sa.poles, sb.poles), row(byLang('Abandonos', 'DNFs'), sa.dnfs, sb.dnfs, { low: true }), row(byLang('Largada média', 'Average grid'), sa.avgGrid, sb.avgGrid, { low: true, fmt: v => v == null ? '—' : v.toFixed(1) }), row(byLang('Chegada média', 'Average finish'), sa.avgFin, sb.avgFin, { low: true, fmt: v => v == null ? '—' : v.toFixed(1) }), row(byLang('Melhor resultado', 'Best result'), sa.best, sb.best, { low: true, fmt: v => v == null ? '—' : ordinal(v) })].join('') }),
          K85.card({ t: byLang('Posição de chegada por etapa', 'Finishing position by round'), body: K85.lines([posSeries(a, ca), posSeries(b, cb)], { invert: true, yMin: 1, yMax: 22, h: 200, fmt: v => 'P' + Math.round(v) }) + `<div class="mm-leg"><span><i style="background:${ca}"></i>${esc(a.name)}</span><span><i style="background:${cb}"></i>${esc(b.name)}</span></div>` }),
          K85.card({ t: byLang('Carreira e contrato', 'Career and contract'), body: [row(byLang('GPs', 'Starts'), (a.career || {}).starts || 0, (b.career || {}).starts || 0), row(byLang('Vitórias na carreira', 'Career wins'), (a.career || {}).wins || 0, (b.career || {}).wins || 0), row(byLang('Títulos', 'Titles'), (a.career || {}).titles || 0, (b.career || {}).titles || 0), row(byLang('Moral', 'Morale'), Math.round(a.morale || 0), Math.round(b.morale || 0)), row(byLang('Salário (US$ mi)', 'Salary ($m)'), +(a.salary || 0).toFixed(1), +(b.salary || 0).toFixed(1), { low: true }), row(byLang('Contrato até', 'Contract until'), (a.contract || {}).until || 0, (b.contract || {}).until || 0)].join('') })));
  },
};

/* ---------------- Ficha do piloto ---------------- */
(function () {
  const oldModal = ACT.driverPage;
  ACT.driverPage = (el) => {
    const id = el.dataset.id; const d = G && Career.driver(G, id);
    if (d && d.team && Career.team(G, d.team)) { closeModal(); return go('driverPage', { id }); }
    return oldModal ? oldModal(el) : null;
  };
  ACT.driverModal85 = (el) => oldModal && oldModal(el);
})();
SCREENS.driverPage = {
  html() {
    const d = Career.driver(G, UI.params.id); if (!d) return K85.empty(byLang('Piloto não encontrado.', 'Driver not found.'));
    const t = Career.team(G, d.team) || Career.team(G); const mine = !Career.isObs(G) && d.team === G.player.teamId;
    const sd = Career.standingsD(G); const i = sd.findIndex(x => x.did === d.id); const st = seasonStats85(d.id); const car = d.career || {};
    const pe = potEst(d); const ovr = driverOverall(d); const f = K85.face(d);
    const keys = ATTR85.map(x => x[0]);
    const grp = ATTR_GROUPS85.map(([pt, en, ks]) => `<div class="dp-g"><span class="n-lbl">${byLang(pt, en)}</span>${ks.map(k => K85.attr(attrName85(k), aval85(d, k))).join('')}</div>`).join('');
    const pers = d.personality || {};
    const seasons = (d.realSeasons || []).slice(-6).reverse();
    const sim = (d.history || []).slice(-6).reverse();
    const c = d.contract || {};
    const stars = pe ? (pe.mid >= 92 ? 5 : pe.mid >= 88 ? 4.5 : pe.mid >= 84 ? 4 : pe.mid >= 80 ? 3.5 : pe.mid >= 76 ? 3 : 2.5) : 3;
    return `<section class="dp85" style="--tc:${t.color}"><span class="dp-bg n-num">${d.number ?? ''}</span>${f ? `<img class="dp-f" src="${f}" alt="">` : ''}
      <div class="dp-id"><span class="n-eyebrow">${natTag(d.nat)} ${esc(t.name)} · ${d.age} ${byLang('anos', 'years')} · ${esc(STYLE_LABELS[d.style] || '')}</span><h1>${esc(d.firstName || '')}<b>${esc(d.lastName || shortName(d))}</b></h1>
        <div class="dp-k">${K85.ring(ovr, 76, byLang('nota', 'rating'), false)}<span><small>${byLang('Potencial (olheiros)', 'Potential (scouts)')}</small>${K85.stars(stars)}<em class="n-mu n-sm">${pe ? `${pe.lo}–${pe.hi}` : ''}</em></span><span><small>${byLang('Campeonato', 'Championship')}</small><b>${i >= 0 ? ordinal(i + 1) : '—'} · ${st.pts} pts</b></span><span><small>${byLang('Moral', 'Morale')}</small>${K85.ring(d.morale || 60, 40)}</span><span><small>${byLang('Popularidade', 'Popularity')}</small>${K85.ring(d.popularity || 0, 40)}</span></div>
        <div class="dp-act">${mine ? K85.btn(byLang('Renovar contrato', 'Renew contract'), { act: 'negotiate', id: d.id, extra: ' data-renew="1"', kind: 'primary' }) + K85.btn(byLang('Dispensar', 'Release'), { act: 'releaseDlg', id: d.id, kind: 'danger' }) : Career.isObs(G) ? '' : K85.btn(byLang('Fazer proposta', 'Make an offer'), { act: 'negotiate', id: d.id, kind: 'primary' })}${K85.btn('Mano a Mano', { act: 'go', v: 'mano', p: { a: d.id } })}${K85.btn(byLang('Histórico completo', 'Full history'), { act: 'driverModal85', id: d.id, kind: 'ghost' })}</div></div>
      ${t.carImg ? `<img class="dp-car" src="${imgUrl(t.carImg)}" alt="">` : ''}</section>` +
      `<div class="n-grid" style="grid-template-columns:minmax(0,1.15fr) minmax(0,1fr) minmax(0,1fr)">
        ${K85.card({ t: byLang('Atributos', 'Attributes'), body: `<div class="dp-gs">${grp}</div>` })}
        ${K85.col(K85.card({ t: byLang('Perfil', 'Profile'), body: K85.radar(keys.map(attrName85), [keys.map(k => aval85(d, k))], { r: 106, min: 55, max: 100, colors: [t.color], maxW: 380 }) }),
          K85.card({ t: byLang('Personalidade', 'Personality'), body: [['ambition', 'Ambição', 'Ambition'], ['loyalty', 'Lealdade', 'Loyalty'], ['temper', 'Temperamento', 'Temper'], ['media', 'Mídia', 'Media']].map(([k, pt, en]) => `<div class="n-attr"><span>${byLang(pt, en)}</span>${K85.seg(pers[k] || 0, 100, 'mid')}<b style="color:var(--fg2)">${Math.round(pers[k] || 0)}</b></div>`).join('') }))}
        ${K85.col(K85.card({ t: byLang('Na temporada', 'This season'), body: `<div class="dp-nums">${[[byLang('Pontos', 'Points'), st.pts], [byLang('Vitórias', 'Wins'), st.wins], [byLang('Pódios', 'Podiums'), st.pods], ['Poles', st.poles], [byLang('Abandonos', 'DNFs'), st.dnfs], [byLang('Largada média', 'Avg grid'), st.avgGrid != null ? st.avgGrid.toFixed(1) : '—']].map(([a, b]) => `<span><b class="n-num">${b}</b><small>${a}</small></span>`).join('')}</div><span class="n-lbl">${byLang('Últimas corridas', 'Last races')}</span>${K85.form(K85.recent(d.id, 8), true)}` }),
          K85.card({ t: byLang('Contrato', 'Contract'), body: `<div class="dp-ct">${K85.tag(byLang('até', 'until') + ' ' + (c.until || '—'), 't')}${c.option ? K85.tag(byLang('opção', 'option') + ' ' + c.option.year, 'b') : ''}${(c.clauses || []).map(x => K85.tag(esc(typeof x === 'string' ? x : x.type || x.k || ''), 'y')).join('')}</div>${K85.kv([[byLang('Salário', 'Salary'), fmtMoney(d.salary) + byLang('/ano', '/yr')], [byLang('Pede no mercado', 'Market ask'), typeof Market !== 'undefined' && Market.ask ? fmtMoney(Market.ask(d)) + byLang('/ano', '/yr') : '—'], [byLang('Empresário', 'Manager'), esc(d.manager || '—')], [byLang('Situação', 'Status'), typeof Market !== 'undefined' && Market.contractText ? esc(Market.contractText(G, d)) : '']])}` }))}
      </div>` +
      K85.grid('1fr 1fr', K85.card({ t: byLang('Carreira na F1', 'F1 career'), body: `<div class="dp-nums">${[[byLang('GPs', 'Starts'), car.starts || 0], [byLang('Vitórias', 'Wins'), car.wins || 0], [byLang('Pódios', 'Podiums'), car.podiums || 0], ['Poles', car.poles || 0], [byLang('Títulos', 'Titles'), car.titles || 0], [byLang('Pontos', 'Points'), Math.round(car.points || 0)]].map(([a, b]) => `<span><b class="n-num">${b}</b><small>${a}</small></span>`).join('')}</div>` }),
        K85.card({ t: byLang('Temporadas', 'Seasons'), flush: true, body: (sim.length || seasons.length) ? K85.table([[byLang('Ano', 'Year')], [byLang('Categoria', 'Series')], [byLang('Equipe', 'Team')], [byLang('Pos.', 'Pos.'), 'c']], [...sim.map(h => [h.y, esc(h.series || 'F1'), esc(((h.teams || []).map(x => (Career.team(G, x) || {}).name || x)).join(', ')), h.pos ? ordinal(h.pos) : '—']), ...seasons.map(r => [r[0], esc(String(r[1] || '').toUpperCase()), esc(String(r[2] || '').replace(/\{\{[^|}]*\|([^}]*)\}\}/g, '$1')), +r[3] ? ordinal(+r[3]) : '—'])].slice(0, 8)) : `<div style="padding:12px 16px">${K85.empty(byLang('Sem histórico registrado.', 'No history recorded.'))}</div>` }));
  },
};
