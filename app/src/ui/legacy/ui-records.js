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
