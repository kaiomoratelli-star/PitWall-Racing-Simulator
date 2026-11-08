/* ============================================================
   PIT WALL — relatório oficial da corrida
   Classificação no formato oficial da F1, volta a volta com todos os
   eventos, gráfico de posições, pit stops e voltas mais rápidas.
   ============================================================ */
'use strict';

function lrCar(lr, did) { return lr.cars.find(c => c.did === did); }

const _postHtml = SCREENS.post.html;
SCREENS.post.html = function () {
  const base = _postHtml.call(this);
  const lr = G.lastRace;
  const res = G.season.results[G.season.results.length - 1];
  if (!lr || !res || lr.round !== res.round) return base;
  const cut = base.indexOf('<div class="panel"><div class="panel-h"><h3>Classificação da corrida</h3>');
  const head = cut > 0 ? base.slice(0, cut) : base;
  const tab = UI.params.rt || 'podium';
  const tabs = [['podium', 'Pódio e resumo'], ['cls', 'Classificação oficial'], ['laps', 'Volta a volta'], ['chart', 'Gráfico de posições'], ['pits', 'Pit stops'], ['fl', 'Voltas mais rápidas']];
  let body = '';
  if (tab === 'podium') return `${podiumHtml(res, lr)}${head}<div class="panel"><div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="go" data-v="post" data-p='${JSON.stringify({ rt: k })}'>${l}</button>`).join('')}<button data-act="go" data-v="analysis">Análise completa</button></div></div>`;
  if (tab === 'cls') body = officialHtml(res, lr);
  if (tab === 'laps') body = lapByLapHtml(lr);
  if (tab === 'chart') body = lapChartHtml(lr);
  if (tab === 'pits') body = pitsHtml(lr);
  if (tab === 'fl') body = fastestHtml(lr, res);
  const top = head.slice(0, head.indexOf('</div></div>') > 0 ? head.indexOf('<div class="grid') > 0 ? head.indexOf('<div class="grid') : head.length : head.length);
  return `${top}<div class="panel"><div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="go" data-v="post" data-p='${JSON.stringify({ rt: k })}'>${l}</button>`).join('')}<button data-act="go" data-v="analysis">Análise completa</button></div><div class="panel-b ${tab === 'chart' ? '' : 'tight'}">${body}</div></div>`;
};

/* classificação oficial: Pos · Nº · Piloto · Equipe · Voltas · Tempo/Abandono · Pts */
function officialHtml(res, lr) {
  const mine = Career.isObs(G) ? null : G.player.teamId;
  const win = res.cls[0];
  const wc = lrCar(lr, win.did);
  const winT = wc ? wc.times.filter(Boolean).reduce((a, b) => a + b, 0) : 0;
  return `<div class="tbl-wrap"><table class="tbl official"><thead><tr><th>Pos</th><th>Nº</th><th>Piloto</th><th>Equipe</th><th class="r">Voltas</th><th class="r">Tempo / Abandono</th><th class="r">Pts</th></tr></thead><tbody>
    ${res.cls.map((c, i) => {
      const d = Career.driver(G, c.did), t = Career.team(G, c.tid);
      const car = lrCar(lr, c.did);
      const laps = car ? car.times.filter(Boolean).length : c.laps;
      let time;
      if (c.status === 'dnf') time = `Abandono${c.reason ? ` · ${esc(c.reason.toLowerCase())}` : ''}`;
      else if (i === 0) time = fmtRaceTime(winT);
      else if (c.lapsDown) time = `+${c.lapsDown} volta${c.lapsDown > 1 ? 's' : ''}`;
      else time = `+${(c.T - win.T).toFixed(3)}s`;
      if (c.penalty && c.status !== 'dnf') time += ` <span class="small neg">(${c.penalty}s de punição)</span>`;
      return `<tr class="${mine && c.tid === mine ? 'me' : ''}"><td class="num"><b>${c.status === 'dnf' ? 'NC' : c.pos}</b></td><td class="num muted">${d ? d.number : ''}</td><td>${dTag(c.did)}</td><td><span class="tdot" style="background:${t.color}"></span>${esc(t.name)}</td><td class="r num">${laps}</td><td class="r num">${time}</td><td class="r num"><b>${c.pts || ''}</b></td></tr>`;
    }).join('')}</tbody></table></div>
    <p class="small muted" style="padding:10px 14px">${res.fastest ? `Volta mais rápida: ${esc(Career.driver(G, res.fastest.did).name)}, ${fmtLap(res.fastest.time)} (volta ${res.fastest.lap}). ` : ''}${res.sc ? `${res.sc} intervenção(ões) de Safety Car. ` : ''}NC = não classificado.</p>`;
}

/* volta a volta: o resumo narrado e todos os acontecimentos de cada volta */
const EV_LABEL = { overtake: 'Ultrapassagem', defend: 'Defesa', pit: 'Pit stop', radio: 'Rádio', crash: 'Batida', contact: 'Toque', spin: 'Rodada', issue: 'Problema', dnf: 'Abandono', sc: 'Safety Car', flag: 'Bandeira', penalty: 'Punição', fastest: 'Volta mais rápida', weather: 'Clima', undercut: 'Estratégia', teamorder: 'Ordem de equipe', finish: 'Bandeira quadriculada' };
function lapByLapHtml(lr) {
  const f = UI.params.lf || 'all';
  const mine = Career.isObs(G) ? null : G.player.teamId;
  const byLap = {};
  lr.events.forEach(e => { (byLap[e.lap] = byLap[e.lap] || []).push(e); });
  const keep = (e) => f === 'all' || (f === 'imp' ? (e.imp || ['crash', 'dnf', 'sc', 'penalty', 'flag', 'weather', 'undercut', 'teamorder', 'fastest'].includes(e.type) || (mine && lrCar(lr, e.did) && lrCar(lr, e.did).tid === mine)) : f === 'mine' ? mine && ((lrCar(lr, e.did) || {}).tid === mine || (e.b && (lrCar(lr, e.b) || {}).tid === mine)) : e.type === f);
  const laps = Object.keys(byLap).map(Number).sort((a, b) => a - b);
  const counts = {}; lr.events.forEach(e => (counts[e.type] = (counts[e.type] || 0) + 1));
  const filters = [['all', 'Tudo'], ['imp', 'Destaques'], ...(mine ? [['mine', 'Minha equipe']] : []), ['overtake', `Ultrapassagens (${counts.overtake || 0})`], ['pit', `Pit stops (${counts.pit || 0})`], ['radio', `Rádio (${counts.radio || 0})`]];
  return `<div class="row" style="padding:10px 14px;flex-wrap:wrap;gap:6px">${filters.map(([k, l]) => `<button class="chip ${f === k ? 'acc' : ''}" data-act="go" data-v="post" data-p='${JSON.stringify({ rt: 'laps', lf: k })}'>${l}</button>`).join('')}</div>
  <div class="lbl-list">${laps.map(L => {
    const evs = byLap[L].filter(e => e.type !== 'narr' && keep(e));
    const narr = byLap[L].find(e => e.type === 'narr');
    if (!evs.length && f !== 'all' && f !== 'imp') return '';
    const changes = lapChanges(lr, L);
    return `<div class="lbl-lap"><div class="lbl-h"><span class="lbl-n">V${L}</span><span>${narr ? esc(narr.text.replace(/^Volta \d+\/\d+\.\s*/, '')) : ''}</span></div>
      ${changes ? `<div class="lbl-moves small">${changes}</div>` : ''}
      ${evs.map(e => `<div class="lbl-ev ${e.type}"><span class="lbl-t">${EV_LABEL[e.type] || e.type}</span><span>${esc(e.text)}</span></div>`).join('')}</div>`;
  }).join('')}</div>`;
}
/* mudanças de posição na volta (setas) */
function lapChanges(lr, L) {
  if (L < 2) return '';
  const mv = lr.cars.filter(c => c.positions[L] && c.positions[L - 1] && c.positions[L] !== c.positions[L - 1]).map(c => ({ c, g: c.positions[L - 1] - c.positions[L] })).sort((a, b) => a.c.positions[L] - b.c.positions[L]);
  if (!mv.length) return '';
  return mv.slice(0, 10).map(({ c, g }) => `<span class="${g > 0 ? 'pos' : 'neg'}">${g > 0 ? '▲' : '▼'}${Math.abs(g)} ${esc(shortName(Career.driver(G, c.did)))} ${c.positions[L]}º</span>`).join(' · ');
}

/* gráfico de posições (volta a volta) */
function lapChartHtml(lr) {
  const W = 1100, H = 520, pl = 38, pr = 110, pt = 14, pb = 26;
  const n = lr.cars.length, laps = lr.laps;
  const x = (l) => pl + (W - pl - pr) * (l / laps);
  const y = (p) => pt + (H - pt - pb) * ((p - 1) / Math.max(1, n - 1));
  const mine = Career.isObs(G) ? null : G.player.teamId;
  const lines = lr.cars.map(c => {
    const t = Career.team(G, c.tid), d = Career.driver(G, c.did);
    const pts = [[0, c.grid], ...c.positions.map((p, l) => [l, p]).filter(([l, p]) => l > 0 && p)];
    const dpath = pts.map(([l, p], i) => `${i ? 'L' : 'M'}${x(l).toFixed(1)} ${y(p).toFixed(1)}`).join(' ');
    const last = pts[pts.length - 1];
    const meCar = mine && c.tid === mine;
    const dash = (Career.lineup(G, c.tid)[1] || {}).id === c.did ? 'stroke-dasharray="6 4"' : '';
    return `<path d="${dpath}" fill="none" stroke="${t.color}" stroke-width="${meCar ? 3.4 : 1.8}" ${dash} opacity="${meCar || !mine ? 1 : 0.75}"/>${c.status === 'dnf' ? `<text x="${x(last[0]) + 4}" y="${y(last[1]) + 4}" font-size="11" fill="#ff5468">✕</text>` : `<text x="${x(last[0]) + 6}" y="${y(last[1]) + 4}" font-size="11.5" fill="${meCar ? '#fff' : '#d7d7dc'}" font-weight="${meCar ? 700 : 500}">${esc(shortName(d))}</text>`}`;
  }).join('');
  const grid = Array.from({ length: n }, (_, i) => `<text x="${pl - 8}" y="${y(i + 1) + 4}" font-size="10.5" fill="#9a9aa5" text-anchor="end">${i + 1}</text><line x1="${pl}" x2="${W - pr}" y1="${y(i + 1)}" y2="${y(i + 1)}" stroke="rgba(255,255,255,.05)"/>`).join('');
  const ticks = Array.from({ length: Math.floor(laps / 5) + 1 }, (_, i) => i * 5).map(l => `<text x="${x(l)}" y="${H - 6}" font-size="10.5" fill="#9a9aa5" text-anchor="middle">${l}</text>`).join('');
  const sc = (lr.scHistory || []).map(s => `<rect x="${x(s.from ?? s.lap ?? 0)}" y="${pt}" width="${Math.max(2, x((s.to ?? (s.from ?? s.lap ?? 0) + 3)) - x(s.from ?? s.lap ?? 0))}" height="${H - pt - pb}" fill="rgba(255,216,74,.08)"/>`).join('');
  return `<div class="tbl-wrap"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Gráfico de posições volta a volta" style="min-width:760px">${sc}${grid}${ticks}${lines}</svg></div><p class="small muted">Linha contínua: primeiro piloto da equipe; tracejada: segundo. Faixas amarelas: Safety Car.</p>`;
}

function pitsHtml(lr) {
  const tr = Career.track(G, lr.trackId);
  const list = (lr.pitLog || []).slice().sort((a, b) => a.lap - b.lap);
  if (!list.length) return '<div class="empty">Nenhum pit stop.</div>';
  const best = Math.min(...list.map(p => p.stop));
  const mine = Career.isObs(G) ? null : G.player.teamId;
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="r">Volta</th><th>Piloto</th><th>Equipe</th><th>Pneus</th><th class="r">Parado</th><th class="r">Tempo no pit lane</th><th class="r">Posição</th><th></th></tr></thead><tbody>
    ${list.map(p => `<tr class="${mine && p.tid === mine ? 'me' : ''}"><td class="r num">${p.lap}</td><td>${dTag(p.did, false)}</td><td class="small muted">${esc(Career.team(G, p.tid).short)}</td><td>${tyreIcon(p.from)} → ${tyreIcon(p.to)} <span class="small muted">${Engine.tprops(tr, p.to).name || ''}</span></td><td class="r num ${p.stop === best ? 'pur' : p.slow ? 'neg' : ''}">${p.stop.toFixed(1)}s</td><td class="r num">${p.loss.toFixed(1)}s</td><td class="r num">${p.posIn}º → ${p.posOut ?? '—'}º</td><td class="small">${p.sc ? `<span class="chip" style="color:var(--yellow)">${p.sc}</span>` : ''}${p.slow ? ' <span class="neg">lenta</span>' : ''}</td></tr>`).join('')}
  </tbody></table></div>`;
}

function fastestHtml(lr, res) {
  const tr = Career.track(G, lr.trackId);
  const rows = lr.cars.filter(c => c.best).map(c => { const i = c.times.findIndex(t => t === c.best); return { c, lap: i, t: c.best }; }).sort((a, b) => a.t - b.t);
  const mine = Career.isObs(G) ? null : G.player.teamId;
  return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pos</th><th>Nº</th><th>Piloto</th><th>Equipe</th><th class="r">Volta</th><th class="r">Tempo</th><th class="r">Vel. média</th><th class="r">Vel. máx.</th></tr></thead><tbody>
    ${rows.map((r, i) => { const d = Career.driver(G, r.c.did), t = Career.team(G, r.c.tid); return `<tr class="${mine && r.c.tid === mine ? 'me' : ''}"><td class="num">${i + 1}</td><td class="num muted">${d.number}</td><td>${dTag(r.c.did)}</td><td class="small muted">${esc(t.name)}</td><td class="r num">${r.lap}</td><td class="r num ${i === 0 ? 'pur' : ''}">${fmtLap(r.t)}</td><td class="r num">${(tr.length / r.t * 3600).toFixed(1)} km/h</td><td class="r num">${r.c.vmax ? r.c.vmax + ' km/h' : '—'}</td></tr>`; }).join('')}
  </tbody></table></div>`;
  void res;
}

/* ---------- cerimônia de pódio ---------- */
function podiumHtml() { return ''; }   // o pódio tem tela própria (ui85-race.js)
