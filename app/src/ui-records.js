/* ============================================================
   PIT WALL — páginas de equipe e de circuito, recordes de temporada.
   Dados reais (f1db) e simulados aparecem sempre identificados.
   ============================================================ */
'use strict';

const RREC = typeof REAL_RECORDS !== 'undefined' ? REAL_RECORDS : null;
const LORE = typeof TEAM_LORE !== 'undefined' ? TEAM_LORE : {};
function fmtMs(ms) { return ms ? fmtLap(ms / 1000) : '—'; }
function simTag() { return '<span class="chip ai" title="Resultado simulado nesta carreira">simulado</span>'; }

/* linhagem: quais construtores reais formam a equipe ao longo dos anos */
function teamLineage(tid) {
  const ch = RREC && RREC.chronology[tid];
  if (ch) return ch.map(([id, from, to]) => ({ id, from, to, name: (RREC.names[id] || (HIST && HIST.constructors[id] ? HIST.constructors[id][0] : id)) }));
  return HIST && HIST.constructors[tid] ? [{ id: tid, from: null, to: null, name: HIST.constructors[tid][0] }] : [];
}
function inLineage(lin, cid, y) { return lin.some(l => l.id === cid && (l.from == null || y >= l.from) && (l.to == null || y <= l.to)); }

SCREENS.teamPage = {
  html() {
    const t = Career.team(G, UI.params.id) || G.db.teams[0];
    const lin = teamLineage(t.id);
    const lore = LORE[t.id] || {};
    // títulos e temporadas reais da linhagem
    const realSeasons = [];
    const titles = [];
    const winners = {};
    if (HIST) HIST.seasons.forEach(s => {
      const i = s.c.findIndex(x => inLineage(lin, x[0], s.y));
      if (i >= 0 && s.c[i][2] != null) realSeasons.push({ y: s.y, pos: s.c[i][2], pts: s.c[i][1], name: (RREC && RREC.names[s.c[i][0]]) || hTeam(s.c[i][0]) });
      if (s.complete && i === 0) titles.push({ y: s.y, name: (RREC && RREC.names[s.c[0][0]]) || hTeam(s.c[0][0]) });
      s.r.forEach(r => { if (r[5][0] && inLineage(lin, r[5][0], s.y)) winners[r[4][0]] = (winners[r[4][0]] || 0) + 1; });
    });
    const sim = (t.history || []).filter(h => h.sim);
    const simTitles = (G.history || []).filter(h => h.constructor === t.id).map(h => h.year);
    (G.archive || []).forEach(a => a.races.forEach(r => { const c = r.c.find(x => x[0] === r.w); if (c && c[1] === t.id) winners[r.w] = (winners[r.w] || 0) + 1; }));
    const topW = Object.entries(winners).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const rs = t.realStats || {};
    const lineTotals = lin.reduce((acc, l) => { const h = HIST && HIST.constructors[l.id]; if (h && !acc.seen.has(l.id)) { acc.seen.add(l.id); acc.wins += h[3]; acc.pod += h[4]; acc.poles += h[5]; acc.starts += h[2]; } return acc; }, { wins: 0, pod: 0, poles: 0, starts: 0, seen: new Set() });
    const best = realSeasons.concat(sim.map(h => ({ y: h.y, pos: h.pos, sim: true }))).sort((a, b) => a.pos - b.pos || a.y - b.y)[0];
    const maxY = Math.max(...realSeasons.map(s => s.y), ...sim.map(s => s.y), 0);
    const chart = realSeasons.slice(-30).concat(sim.map(h => ({ y: h.y, pos: h.pos, sim: true })));
    return `<div class="team-hero" style="--tc:${t.color};--tc2:${t.color2 || '#111'}"><div class="th-txt">${teamLogo(t)}<div><div class="eyebrow">${esc(lore.base || natTag(t.country))}${lore.debut ? ` · na F1 desde ${lore.debut}` : ''}</div><h1>${esc(t.name)}</h1><div class="small">${esc(t.chassisName || '')}${t.puName ? ' · ' + esc(t.puName) : ''} · chefe de equipe ${esc(t.principal)}</div></div></div>${carImg(t, 'th-car')}</div>
    <div class="grid g4" style="margin-top:14px">
      <div class="panel"><div class="panel-b"><div class="label">Títulos de construtores</div><div class="stat-big">${(rs.titles || 0) + simTitles.length}</div><div class="small muted">${rs.titles || 0} reais${simTitles.length ? ` · ${simTitles.length} na carreira` : ''}</div></div></div>
      <div class="panel"><div class="panel-b"><div class="label">Vitórias (nome atual)</div><div class="stat-big">${(rs.wins || 0) + sim.reduce((s, h) => s + (h.w || 0), 0)}</div><div class="small muted">Linhagem completa: ${lineTotals.wins} vitórias</div></div></div>
      <div class="panel"><div class="panel-b"><div class="label">Pódios / poles</div><div class="stat-big">${(rs.podiums || 0) + sim.reduce((s, h) => s + (h.pod || 0), 0)} / ${rs.poles || 0}</div><div class="small muted">Linhagem: ${lineTotals.pod} pódios · ${lineTotals.poles} poles</div></div></div>
      <div class="panel"><div class="panel-b"><div class="label">Melhor temporada</div><div class="stat-big">${best ? ordinal(best.pos) : '—'}</div><div class="small muted">${best ? `${best.y}${best.sim ? ' (simulada)' : ''}` : ''}</div></div></div>
    </div>
    <div class="grid g2">
      <div class="panel"><div class="panel-h"><h3>Linhagem</h3><span class="small muted">Mesma estrutura, nomes diferentes</span></div><div class="panel-b"><div class="lineage">${lin.map(l => `<div class="lin"><b>${esc(l.name)}</b><span class="num small muted">${l.from || '?'}–${l.to || 'hoje'}</span></div>`).join('') || '<p class="muted">Sem histórico real.</p>'}</div>
        ${titles.length || simTitles.length ? `<div class="label" style="margin-top:14px">Anos de título</div><div class="row" style="flex-wrap:wrap;gap:6px;margin-top:6px">${titles.map(x => `<span class="chip" title="${esc(x.name)}">${x.y}</span>`).join('')}${simTitles.map(y => `<span class="chip ai">${y}</span>`).join('')}</div>` : ''}
      </div></div>
      <div class="panel"><div class="panel-h"><h3>Chefes de equipe</h3></div><div class="panel-b tight"><table class="tbl"><tbody>${(lore.principals || []).slice().reverse().map(([n, a, b]) => `<tr><td>${esc(n)}</td><td class="r num muted">${a}–${b || 'hoje'}</td></tr>`).join('')}${(t.history || []).filter(h => h.sim && h.principal).reduce((acc, h) => { if (!acc.length || acc[acc.length - 1][0] !== h.principal) acc.push([h.principal, h.y, h.y]); else acc[acc.length - 1][2] = h.y; return acc; }, []).filter(([n]) => !(lore.principals || []).some(p => p[0] === n)).map(([n, a, b]) => `<tr><td>${esc(n)} ${simTag()}</td><td class="r num muted">${a}–${b}</td></tr>`).join('')}</tbody></table></div></div>
    </div>
    <div class="panel"><div class="panel-h"><h3>Posição no Mundial, ano a ano</h3><span class="small muted">Últimas temporadas reais e as simuladas desta carreira</span></div><div class="panel-b"><div class="poschart">${chart.map(s => `<div class="pc ${s.sim ? 'sim' : ''}" title="${s.y}: ${ordinal(s.pos)}${s.sim ? ' (simulada)' : ''}"><i style="height:${Math.max(6, 100 - (s.pos - 1) * 9)}%"></i><span>${String(s.y).slice(2)}</span></div>`).join('')}</div>${maxY ? '' : '<p class="muted">Sem temporadas registradas.</p>'}</div></div>
    <div class="grid g2">
      <div class="panel"><div class="panel-h"><h3>Maiores vencedores pela equipe</h3></div><div class="panel-b tight"><table class="tbl"><tbody>${topW.map(([id, n]) => `<tr><td>${dLink(id)}</td><td class="r num">${n}</td></tr>`).join('') || '<tr><td class="empty">Ainda sem vitórias.</td></tr>'}</tbody></table></div></div>
      <div class="panel"><div class="panel-h"><h3>Hoje</h3></div><div class="panel-b"><dl class="kv"><dt>Pilotos</dt><dd>${Career.lineup(G, t.id).map(d => esc(d.name)).join(' · ')}</dd><dt>Motor</dt><dd>${esc(Engine.engineOf(G.db, t).name)}${t.works ? ' (fábrica)' : ''}</dd><dt>Orçamento</dt><dd>${fmtMoney(t.budget)}</dd><dt>Reputação</dt><dd>${Math.round(t.reputation)}</dd><dt>Pontos ${G.season.year}</dt><dd>${G.season.standC[t.id] || 0}</dd></dl></div></div>
    </div>`;
  },
};
function dLink(id) { const d = Career.driver(G, id); return d ? `<button class="linkbtn" data-act="driverPage" data-id="${esc(id)}">${esc(d.name)}</button>` : esc(hName(id)); }
ACT.teamPage = (el) => go('teamPage', { id: el.dataset.id });

/* ---------- circuito ---------- */
SCREENS.circuit = {
  html() {
    const tr = Career.track(G, UI.params.id) || G.db.tracks[0];
    const rr = RREC && RREC.circuits[tr.id];
    const hc = HIST && HIST.circuits[tr.id];
    const races = [];
    if (HIST) HIST.seasons.forEach(s => s.r.forEach(r => { if (r[3] === tr.id && r[4][0]) races.push({ y: s.y, gp: r[2], w: r[4][0], t: r[5][0], p: r[6] }); }));
    (G.archive || []).forEach(a => a.races.forEach(r => { if (r.t === tr.id) { const c = r.c.find(x => x[0] === r.w); races.push({ y: a.year, w: r.w, t: c ? c[1] : null, p: r.p, sim: true }); } }));
    G.season.results.forEach(r => { if (r.trackId === tr.id) races.push({ y: G.season.year, w: r.winner, t: r.cls[0].tid, p: r.pole, sim: true }); });
    const cnt = (k) => { const m = {}; races.forEach(r => { if (r[k]) m[r[k]] = (m[r[k]] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6); };
    const sr = (G.trackRecords || {})[tr.id] || {};
    const hero = imgUrl(tr.heroImg);
    return `<div class="team-hero circ" style="--tc:#e10600;--tc2:#15151e${hero ? `;background-image:linear-gradient(90deg,rgba(21,21,30,.95) 30%,rgba(21,21,30,.35)),url('${hero}')` : ''}"><div class="th-txt"><div><div class="eyebrow">${esc(tr.place || '')} · ${natTag(tr.country)}</div><h1>${esc(tr.circuit)}</h1><div class="small">${esc(tr.gp)}${hc ? ` · ${hc[5]} GPs desde ${rr ? rr.first : ''}` : ''}</div></div></div><div class="trackbox th-map"><canvas id="circMap"></canvas></div></div>
    <div class="grid g4" style="margin-top:14px">
      <div class="panel"><div class="panel-b"><div class="label">Extensão</div><div class="stat-big">${(+tr.length).toFixed(3).replace('.', ',')} km</div><div class="small muted">${trOsm(tr)}${tr.laps} voltas · ${tr.turns || '—'} curvas</div></div></div>
      <div class="panel"><div class="panel-b"><div class="label">Recorde da volta (corrida)</div><div class="stat-big">${rr && rr.lap ? fmtMs(rr.lap[0]) : '—'}</div><div class="small muted">${rr && rr.lap ? `${esc(hName(rr.lap[1]))} · ${rr.lap[3]}` : 'sem registro no traçado atual'}</div></div></div>
      <div class="panel"><div class="panel-b"><div class="label">Volta mais rápida em classificação</div><div class="stat-big">${rr && rr.quali ? fmtMs(rr.quali[0]) : '—'}</div><div class="small muted">${rr && rr.quali ? `${esc(hName(rr.quali[1]))} · ${rr.quali[3]}` : ''}</div></div></div>
      <div class="panel"><div class="panel-b"><div class="label">Recordes nesta carreira</div><div class="stat-big">${sr.lap ? fmtLap(sr.lap[0]) : '—'}</div><div class="small muted">${sr.lap ? `corrida: ${esc(hName(sr.lap[1]))} (${sr.lap[3]})` : 'ainda não corremos aqui'}${sr.quali ? `<br>classificação: ${fmtLap(sr.quali[0])} · ${esc(hName(sr.quali[1]))} (${sr.quali[3]})` : ''}</div></div></div>
    </div>
    <div class="grid g3">
      <div class="panel"><div class="panel-h"><h3>Mais vitórias</h3></div><div class="panel-b tight"><table class="tbl"><tbody>${cnt('w').map(([id, n]) => `<tr><td>${dLink(id)}</td><td class="r num">${n}</td></tr>`).join('') || '<tr><td class="empty">—</td></tr>'}</tbody></table></div></div>
      <div class="panel"><div class="panel-h"><h3>Equipes que mais venceram</h3></div><div class="panel-b tight"><table class="tbl"><tbody>${cnt('t').map(([id, n]) => `<tr><td>${esc(hTeam(id))}</td><td class="r num">${n}</td></tr>`).join('') || '<tr><td class="empty">—</td></tr>'}</tbody></table></div></div>
      <div class="panel"><div class="panel-h"><h3>Mais poles</h3></div><div class="panel-b tight"><table class="tbl"><tbody>${cnt('p').map(([id, n]) => `<tr><td>${dLink(id)}</td><td class="r num">${n}</td></tr>`).join('') || '<tr><td class="empty">—</td></tr>'}</tbody></table></div></div>
    </div>
    <div class="panel"><div class="panel-h"><h3>Todos os vencedores</h3><span class="small muted">${races.length} corrida(s)</span></div><div class="panel-b tight tbl-wrap" style="max-height:420px;overflow:auto"><table class="tbl"><thead><tr><th>Ano</th><th>Vencedor</th><th>Equipe</th><th>Pole</th></tr></thead><tbody>${races.slice().reverse().map(r => `<tr><td class="num">${r.y} ${r.sim ? simTag() : ''}</td><td>${dLink(r.w)}</td><td>${esc(hTeam(r.t))}</td><td class="muted">${r.p ? esc(hName(r.p)) : '—'}</td></tr>`).join('')}</tbody></table></div></div>`;
  },
  after() { const cv = $('#circMap'); const tr = Career.track(G, UI.params.id); if (cv && tr) requestAnimationFrame(() => drawTrack(cv, tr, [], { pad: 18, outline: '#ffffff', thick: 5 })); },
};
ACT.circuitPage = (el) => go('circuit', { id: el.dataset.id });

/* ---------- recordes de temporada (real + simulado) ---------- */
function seasonRecords() {
  const rows = [];
  if (HIST) HIST.seasons.filter(s => s.complete).forEach(s => {
    const w = {}, p = {};
    s.r.forEach(r => { if (r[4][0]) w[r[4][0]] = (w[r[4][0]] || 0) + 1; if (r[6]) p[r[6]] = (p[r[6]] || 0) + 1; });
    const champ = s.d[0];
    const dob = champ && HIST.drivers[champ[0]] ? HIST.drivers[champ[0]][2] : null;
    const last = s.r[s.r.length - 1];
    const ageExact = dob && last ? (new Date(last[1]) - new Date(dob)) / (365.25 * 864e5) : null;
    rows.push({ y: s.y, n: s.r.length, w, p, champ: champ && champ[0], margin: s.d[1] ? s.d[0][2] - s.d[1][2] : 0, age: ageExact ? Math.floor(ageExact) : null, ageX: ageExact });
  });
  (G.archive || []).forEach(a => {
    const w = {}, p = {};
    a.races.forEach(r => { w[r.w] = (w[r.w] || 0) + 1; if (r.p) p[r.p] = (p[r.p] || 0) + 1; });
    const d = Career.driver(G, a.standD[0][0]);
    rows.push({ y: a.year, sim: true, n: a.races.length, w, p, champ: a.standD[0][0], margin: a.standD[1] ? a.standD[0][1] - a.standD[1][1] : 0, age: d ? d.age - (G.season.year - a.year) : null });
  });
  const best = (f) => { let out = null; rows.forEach(r => Object.entries(f(r) || {}).forEach(([id, v]) => { if (!out || v > out.v) out = { id, v, y: r.y, sim: r.sim, n: r.n }; })); return out; };
  const mw = best(r => r.w), mp = best(r => r.p);
  const pct = best(r => { const o = {}; Object.entries(r.w).forEach(([id, v]) => { if (r.n >= 8) o[id] = Math.round(v / r.n * 1000) / 10; }); return o; });
  const mar = rows.slice().sort((a, b) => b.margin - a.margin)[0];
  const young = rows.filter(r => r.age).sort((a, b) => (a.ageX || a.age + 0.5) - (b.ageX || b.age + 0.5))[0];
  const old = rows.filter(r => r.age).sort((a, b) => (b.ageX || b.age + 0.5) - (a.ageX || a.age + 0.5))[0];
  return [
    mw && ['Mais vitórias em uma temporada', `${mw.v}`, `${hName(mw.id)} · ${mw.y}`, mw.sim],
    pct && ['Maior aproveitamento de vitórias', `${String(pct.v).replace('.', ',')}%`, `${hName(pct.id)} · ${pct.y}`, pct.sim],
    mp && ['Mais poles em uma temporada', `${mp.v}`, `${hName(mp.id)} · ${mp.y}`, mp.sim],
    mar && ['Maior vantagem do campeão', `${mar.margin} pts`, `${hName(mar.champ)} · ${mar.y}`, mar.sim],
    young && ['Campeão mais jovem', `${young.age} anos`, `${hName(young.champ)} · ${young.y}`, young.sim],
    old && ['Campeão mais velho', `${old.age} anos`, `${hName(old.champ)} · ${old.y}`, old.sim],
  ].filter(Boolean);
}
const _hallHtml = SCREENS.hall.html;
SCREENS.hall.html = function () {
  const recs = seasonRecords();
  return _hallHtml.call(this) + `<div class="panel" style="margin-top:16px"><div class="panel-h"><h3>Recordes de temporada</h3><span class="small muted">História real desde 1950 + temporadas desta carreira</span></div><div class="panel-b grid g3">${recs.map(([t, v, who, sim]) => `<div class="rec"><div class="label">${t}</div><div class="stat-big">${v}</div><div class="small muted">${esc(who)} ${sim ? simTag() : ''}</div></div>`).join('')}</div></div>`;
};

/* extensão medida no traçado do OpenStreetMap (quando o circuito tem), ao lado da oficial da FIA */
function trOsm(tr) {
  const osm = tr.osmKm || (typeof REAL_TRACKS !== 'undefined' && (REAL_TRACKS.list.find(r => r.id === tr.id) || {}).osmKm);
  return osm ? byLang(`medida no traçado (OpenStreetMap): ${(+osm).toFixed(2).replace('.', ',')} km · `, `measured on the OpenStreetMap layout: ${(+osm).toFixed(2)} km · `) : '';
}
