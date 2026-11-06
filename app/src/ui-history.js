/* ============================================================
   PIT WALL — história: temporadas reais (1950 em diante, fonte f1db)
   + temporadas simuladas, Hall da Fama com filtros, página do piloto.
   Dados reais e simulados ficam sempre identificados.
   ============================================================ */
'use strict';

const HIST = typeof REAL_HISTORY !== 'undefined' ? REAL_HISTORY : null;

function hName(id) {
  const d = G && Career.driver(G, id);
  if (d) return d.name;
  return HIST && HIST.drivers[id] ? HIST.drivers[id][0] : id;
}
function hNat(id) {
  const d = G && Career.driver(G, id);
  if (d) return d.nat;
  return HIST && HIST.drivers[id] ? HIST.drivers[id][1] : '';
}
function hTeam(id) {
  const t = G && Career.team(G, id);
  if (t) return t.name;
  return HIST && HIST.constructors[id] ? HIST.constructors[id][0] : (id || '—');
}
function realYears() { return HIST ? HIST.seasons.map(s => s.y) : []; }
function simSeasons() {
  const out = (G && G.archive ? G.archive : []).map(a => ({ y: a.year, sim: true, races: a.races, d: a.standD, c: a.standC }));
  if (G && G.season && G.season.results.length) {
    out.push({ y: G.season.year, sim: true, current: true, races: G.season.results.map(r => ({ t: r.trackId, gp: r.gp, w: r.winner, p: r.pole, fl: r.fastest ? r.fastest.did : null, c: r.cls.map(c => [c.did, c.tid, c.pos, c.grid, c.pts, c.status === 'dnf' ? 1 : 0]) })), d: Career.standingsD(G).map(x => [x.did, x.pts]), c: Career.standingsC(G).map(x => [x.tid, x.pts]) });
  }
  return out;
}

/* Agrega estatísticas por piloto/equipe dentro de um período, somando real + simulado */
function hallAggregate(from, to, scope) {
  const D = {}, T = {};
  const dget = id => (D[id] = D[id] || { id, wins: 0, pod: 0, poles: 0, fl: 0, titles: 0, starts: 0, pts: 0, startsKnown: true });
  const tget = id => (T[id] = T[id] || { id, wins: 0, pod: 0, poles: 0, titles: 0 });
  if (HIST && scope !== 'sim') {
    HIST.seasons.forEach(s => {
      if (s.y < from || s.y > to) return;
      if (s.complete && s.d[0]) { dget(s.d[0][0]).titles++; }
      if (s.complete && s.c[0]) { tget(s.c[0][0]).titles++; }
      s.d.forEach(x => { dget(x[0]).pts += x[2] || 0; dget(x[0]).startsKnown = false; });
      s.r.forEach(r => {
        r[4].forEach((did, i) => { const x = dget(did); x.pod++; if (i === 0) x.wins++; });
        r[5].forEach((tid, i) => { const x = tget(tid); x.pod++; if (i === 0) x.wins++; });
        if (r[6]) dget(r[6]).poles++;
        if (r[7]) dget(r[7]).fl++;
      });
    });
    // sem filtro de período, largadas reais vêm dos totais de carreira
    if (from <= HIST.seasons[0].y && to >= HIST.lastYear) Object.values(D).forEach(x => { const h = HIST.drivers[x.id]; if (h) { x.starts = h[3]; x.startsKnown = true; } });
  }
  if (scope !== 'real') {
    simSeasons().forEach(s => {
      if (s.y < from || s.y > to) return;
      if (!s.current && s.d[0]) dget(s.d[0][0]).titles++;
      if (!s.current && s.c[0]) tget(s.c[0][0]).titles++;
      s.d.forEach(x => (dget(x[0]).pts += x[1] || 0));
      s.races.forEach(r => {
        const pod = r.c.filter(c => !c[5] && c[2] <= 3).sort((a, b) => a[2] - b[2]);
        pod.forEach((c, i) => { dget(c[0]).pod++; tget(c[1]).pod++; if (i === 0) { dget(c[0]).wins++; tget(c[1]).wins++; } });
        if (r.p) { dget(r.p).poles++; const tc = r.c.find(c => c[0] === r.p); if (tc) tget(tc[1]).poles++; }
        if (r.fl) dget(r.fl).fl++;
        r.c.forEach(c => (dget(c[0]).starts++));
      });
    });
  }
  return { D: Object.values(D), T: Object.values(T) };
}

SCREENS.hall = {
  html() {
    const yrs = [...realYears(), ...simSeasons().map(s => s.y)];
    const minY = Math.min(...yrs, G ? G.season.year : 2026), maxY = Math.max(...yrs, G ? G.season.year : 2026);
    const p = UI.params;
    const from = +(p.from || minY), to = +(p.to || maxY), metric = p.m || 'wins', who = p.w || 'drivers', scope = p.s || 'all', natF = p.nat || 'all';
    const agg = hallAggregate(from, to, scope);
    const labels = { titles: 'Títulos', wins: 'Vitórias', pod: 'Pódios', poles: 'Poles', fl: 'Voltas mais rápidas', starts: 'Largadas', pts: 'Pontos' };
    const metrics = who === 'drivers' ? ['titles', 'wins', 'pod', 'poles', 'fl', 'starts', 'pts'] : ['titles', 'wins', 'pod', 'poles'];
    const m = metrics.includes(metric) ? metric : 'wins';
    let rows = who === 'drivers' ? agg.D : agg.T;
    if (who === 'drivers' && natF !== 'all') rows = rows.filter(x => hNat(x.id) === natF);
    rows = rows.filter(x => (x[m] || 0) > 0).sort((a, b) => (b[m] || 0) - (a[m] || 0) || (b.wins || 0) - (a.wins || 0)).slice(0, 50);
    const nats = [...new Set(agg.D.map(x => hNat(x.id)).filter(Boolean))].sort();
    const P = (o) => JSON.stringify({ from, to, m, w: who, s: scope, nat: natF, ...o }).replace(/'/g, '');
    const simNote = G ? `Temporadas simuladas: ${G.archive && G.archive.length ? `${G.archive[0].year}–${G.archive[G.archive.length - 1].year}` : 'nenhuma encerrada ainda'}${G.season.results.length ? ` + ${G.season.year} em andamento` : ''}.` : 'Comece uma carreira para somar temporadas simuladas.';
    return `<div class="page-head"><div><div class="eyebrow">Recordes de todos os tempos</div><h1>Hall da Fama</h1></div>
      <div class="row">${segBtns('hallWho', who, [['drivers', 'Pilotos'], ['teams', 'Equipes']])}</div></div>
    <div class="panel"><div class="panel-b row">
      <label class="field" style="width:110px"><span>De</span><input class="inp num" type="number" id="hall-from" value="${from}" min="${minY}" max="${maxY}" data-chg="hallYear" data-k="from"></label>
      <label class="field" style="width:110px"><span>Até</span><input class="inp num" type="number" id="hall-to" value="${to}" min="${minY}" max="${maxY}" data-chg="hallYear" data-k="to"></label>
      <label class="field" style="width:170px"><span>Fonte</span><select class="inp" id="hall-scope" data-chg="hallSel" data-k="s">${opt('all', 'Real + simulada', scope)}${opt('real', 'Somente real', scope)}${opt('sim', 'Somente simulada', scope)}</select></label>
      ${who === 'drivers' ? `<label class="field" style="width:180px"><span>Nacionalidade</span><select class="inp" id="hall-nat" data-chg="hallSel" data-k="nat">${opt('all', 'Todas', natF)}${nats.map(n => opt(n, NAT_NAMES[n] || n, natF)).join('')}</select></label>` : ''}
      <span class="spacer"></span><span class="small muted" style="max-width:44ch">Real: ${HIST ? `${esc(HIST.source)}, dados até ${esc(HIST.ref)}` : 'indisponível'}. ${esc(simNote)}</span>
    </div></div>
    <div class="panel"><div class="tabs">${metrics.map(k => `<button class="${m === k ? 'on' : ''}" data-act="go" data-v="hall" data-p='${P({ m: k })}'>${labels[k]}</button>`).join('')}</div>
      <div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>${who === 'drivers' ? 'Piloto' : 'Equipe'}</th>${who === 'drivers' ? '<th>Nac.</th>' : ''}${metrics.map(k => `<th class="r">${labels[k]}</th>`).join('')}</tr></thead><tbody>
      ${rows.map((x, i) => `<tr class="${G && (G.db.drivers.some(d => d.id === x.id && d.team === G.player.teamId) || x.id === G.player.teamId) ? 'me' : ''}"><td class="num">${i + 1}</td><td>${who === 'drivers' ? `<span class="row lnk" data-act="driverPage" data-id="${esc(x.id)}" style="gap:8px;flex-wrap:nowrap">${esc(hName(x.id))}</span>` : esc(hTeam(x.id))}</td>${who === 'drivers' ? `<td>${natTag(hNat(x.id))}</td>` : ''}${metrics.map(k => `<td class="r num ${k === m ? 'acc' : ''}">${k === 'starts' && !x.startsKnown ? '—' : k === 'pts' ? Math.round(x[k]) : (x[k] || 0)}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="9" class="empty">Nenhum registro neste filtro.</td></tr>'}
      </tbody></table></div></div>
    ${who === 'drivers' ? '<p class="small muted">Largadas por período só existem para temporadas simuladas. Sem filtro de período, a coluna mostra o total real de carreira somado ao simulado.</p>' : ''}`;
  },
};
ACT.hallWho = (el) => go('hall', { ...UI.params, w: el.dataset.val });
CHG.hallYear = (el) => go('hall', { ...UI.params, [el.dataset.k]: el.value });
CHG.hallSel = (el) => go('hall', { ...UI.params, [el.dataset.k]: el.value });

/* ================= TEMPORADAS ================= */
SCREENS.seasons = {
  html() {
    const sims = simSeasons();
    const all = [...(HIST ? HIST.seasons.map(s => ({ y: s.y, real: true })) : []), ...sims.map(s => ({ y: s.y, sim: true, current: s.current }))];
    const sel = UI.params.y ? +UI.params.y : (all.length ? all[all.length - 1].y : null);
    const simSel = sims.find(s => s.y === sel);
    const realSel = !simSel && HIST ? HIST.seasons.find(s => s.y === sel) : null;
    let body = '<div class="empty">Escolha uma temporada.</div>';
    if (realSel) {
      const champ = realSel.d[0], cchamp = realSel.c[0];
      body = `<div class="row" style="margin-bottom:12px"><span class="realtag">Real</span>${realSel.complete ? '' : `<span class="chip acc">Temporada em andamento nos dados reais (${realSel.r.filter(r => r[4].length).length} de ${realSel.r.length} etapas)</span>`}</div>
      <div class="grid g3" style="margin-bottom:14px">
        <div><div class="label">${realSel.complete ? 'Campeão de pilotos' : 'Líder'}</div><div class="stat-big" style="font-size:26px">${champ ? esc(hName(champ[0])) : '—'}</div><div class="small muted">${champ ? `${esc(hTeam(champ[1]))} · ${champ[2]} pts` : ''}</div></div>
        <div><div class="label">${realSel.complete ? 'Campeã de construtores' : 'Líder de construtores'}</div><div class="stat-big" style="font-size:26px">${cchamp ? esc(hTeam(cchamp[0])) : (realSel.y < 1958 ? 'Não havia' : '—')}</div><div class="small muted">${cchamp ? cchamp[1] + ' pts' : realSel.y < 1958 ? 'O Mundial de Construtores começou em 1958' : ''}</div></div>
        <div><div class="label">Corridas</div><div class="stat-big" style="font-size:26px">${realSel.r.length}</div></div>
      </div>
      <div class="grid g2">
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Etapa</th><th>Grande Prêmio</th><th>Vencedor</th><th>Equipe</th><th>Pole</th></tr></thead><tbody>${realSel.r.map(r => `<tr><td class="num">${r[0]}</td><td>${esc(r[2])}<div class="small muted">${esc(r[1])}</div></td><td>${r[4][0] ? `<span class="lnk" data-act="driverPage" data-id="${esc(r[4][0])}">${esc(hName(r[4][0]))}</span>` : '<span class="muted">a disputar</span>'}</td><td class="small">${r[5][0] ? esc(hTeam(r[5][0])) : ''}</td><td class="small">${r[6] ? esc(hName(r[6])) : ''}</td></tr>`).join('')}</tbody></table></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pos</th><th>Piloto</th><th>Equipe</th><th class="r">Pts</th></tr></thead><tbody>${realSel.d.slice(0, 25).map(x => `<tr><td class="num">${x[3] || '—'}</td><td><span class="lnk" data-act="driverPage" data-id="${esc(x[0])}">${esc(hName(x[0]))}</span></td><td class="small muted">${esc(hTeam(x[1]))}</td><td class="r num">${x[2]}</td></tr>`).join('')}</tbody></table></div>
      </div>`;
    } else if (simSel) {
      const champ = simSel.d[0], cchamp = simSel.c[0];
      body = `<div class="row" style="margin-bottom:12px"><span class="simtag">Simulada</span>${simSel.current ? '<span class="chip acc">Temporada em andamento</span>' : ''}</div>
      <div class="grid g3" style="margin-bottom:14px">
        <div><div class="label">${simSel.current ? 'Líder' : 'Campeão de pilotos'}</div><div class="stat-big" style="font-size:26px">${champ ? esc(hName(champ[0])) : '—'}</div><div class="small muted">${champ ? champ[1] + ' pts' : ''}</div></div>
        <div><div class="label">${simSel.current ? 'Líder de construtores' : 'Campeã de construtores'}</div><div class="stat-big" style="font-size:26px">${cchamp ? esc(hTeam(cchamp[0])) : '—'}</div><div class="small muted">${cchamp ? cchamp[1] + ' pts' : ''}</div></div>
        <div><div class="label">Corridas</div><div class="stat-big" style="font-size:26px">${simSel.races.length}</div></div>
      </div>
      <div class="grid g2">
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Etapa</th><th>Grande Prêmio</th><th>Vencedor</th><th>Equipe</th><th>Pole</th></tr></thead><tbody>${simSel.races.map((r, i) => { const w = r.c.find(c => c[0] === r.w); return `<tr><td class="num">${i + 1}</td><td>${esc(r.gp || (G && Career.track(G, r.t) ? Career.track(G, r.t).gp : r.t))}</td><td><span class="lnk" data-act="driverPage" data-id="${esc(r.w)}">${esc(hName(r.w))}</span></td><td class="small">${w ? esc(hTeam(w[1])) : ''}</td><td class="small">${r.p ? esc(hName(r.p)) : ''}</td></tr>`; }).join('')}</tbody></table></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pos</th><th>Piloto</th><th class="r">Pts</th></tr></thead><tbody>${simSel.d.slice(0, 25).map((x, i) => `<tr><td class="num">${i + 1}</td><td><span class="lnk" data-act="driverPage" data-id="${esc(x[0])}">${esc(hName(x[0]))}</span></td><td class="r num">${x[1]}</td></tr>`).join('')}</tbody></table></div>
      </div>`;
    }
    const decades = {};
    all.forEach(s => { const k = Math.floor(s.y / 10) * 10; (decades[k] = decades[k] || []).push(s); });
    return `<div class="page-head"><div><div class="eyebrow">Desde 1950</div><h1>Temporadas</h1></div><span class="small muted">${HIST ? `Real: ${esc(HIST.source)}` : ''}</span></div>
    <div class="panel"><div class="panel-b stack" style="gap:8px">${Object.entries(decades).map(([dec, list]) => `<div class="row" style="gap:6px"><span class="label" style="width:48px">${dec}s</span>${list.map(s => `<button class="btn sm ${s.y === sel && (!!s.sim === !!simSel) ? 'primary' : ''}" data-act="go" data-v="seasons" data-p='{"y":${s.y}}' title="${s.sim ? 'Simulada' : 'Real'}">${s.y}${s.sim ? '*' : ''}</button>`).join('')}</div>`).join('')}
      <p class="small muted">* temporada simulada</p></div></div>
    <div class="panel"><div class="panel-h"><h2>${sel || ''}</h2></div><div class="panel-b">${body}</div></div>`;
  },
};

/* histórico real de um piloto (temporadas e equipes) */
function realDriverSeasons(id) {
  if (!HIST) return [];
  const out = [];
  HIST.seasons.forEach(s => { const x = s.d.find(r => r[0] === id); if (x) out.push({ y: s.y, team: x[1], pos: x[3], pts: x[2], wins: s.r.filter(r => r[4][0] === id).length, pod: s.r.filter(r => r[4].includes(id)).length, poles: s.r.filter(r => r[6] === id).length, complete: s.complete }); });
  return out;
}

/* página do piloto: substitui a anterior com foto, história real e simulada */
ACT.driverPage = (el) => {
  const id = el.dataset.id;
  const d = G ? Career.driver(G, id) : null;
  const h = HIST && HIST.drivers[id];
  if (!d && !h) return;
  const name = d ? d.name : h[0];
  const real = realDriverSeasons(id);
  const sim = d ? (d.history || []).slice() : [];
  const c = d ? d.career || {} : { starts: h[3], wins: h[4], podiums: h[5], poles: h[6], titles: h[9], points: h[8] };
  const st = d && G ? G.season.stats[d.id] || {} : {};
  const tr = d ? (d.transfers || []).slice().reverse() : [];
  modal(name, `
    <div class="driver-card-top">${d ? headshot(d, 'xl') : `<span class="hs xl noimg"><b>${esc(initials(name))}</b></span>`}
      <div class="stack" style="gap:6px">
        <div class="row">${natTag(d ? d.nat : h[1])}<span>${d ? `${d.age} anos · ${esc(STYLE_LABELS[d.style] || '')} · nota <b>${driverOverall(d)}</b> · potencial ${potText(d)}` : `Nascido em ${esc(h[2] || '?')}${h[11] ? ` · falecido em ${esc(h[11])}` : ''}`}</span>${d && d.regen ? '<span class="chip">piloto gerado</span>' : ''}${d && d.retired ? '<span class="chip">aposentado</span>' : ''}</div>
        <div class="small muted">${d && d.team ? `${esc(Career.team(G, d.team).name)} (${d.seat === 'R' ? 'reserva' : 'carro #' + d.seat}) até ${G.season.year + Math.max(0, d.contractYears)} · ${fmtMoney(d.salary)}/ano` : d ? 'Sem equipe' : 'Piloto histórico'}</div>
        ${d && d.evidence ? `<div class="small muted">Nota estimada a partir dos resultados reais: ${d.evidence.races3y} corridas nas últimas 3 temporadas.</div>` : ''}
        ${d && G ? `<div class="row" style="gap:6px">${slChip(d)}${Market.academyOf(G, d) ? `<span class="chip">${esc(Market.academyOf(G, d).name)}</span>` : ''}${d.manager ? `<span class="chip">Empresário: ${esc(d.manager)}</span>` : ''}</div>
        <div class="small">Contrato: ${esc(Market.contractText(G, d))}${d.contract && d.contract.real ? ' <span class="realtag">Real</span>' : ''}${d.contract && d.contract.note ? ` <span class="muted">— ${esc(d.contract.note)}</span>` : ''}</div>` : ''}
      </div></div>
    <div class="grid g4">${[['GPs', c.starts], ['Vitórias', c.wins], ['Pódios', c.podiums], ['Poles', c.poles], ['Títulos', c.titles], ['Pontos', Math.round(c.points || 0)], [G ? `Pts ${G.season.year}` : '', G ? G.season.standD[id] || 0 : ''], [G ? `Vit. ${G.season.year}` : '', st.wins || 0]].filter(x => x[0]).map(([l, v]) => `<div><div class="label">${l}</div><div class="stat-big" style="font-size:24px">${v || 0}</div></div>`).join('')}</div>
    ${d ? `<div class="grid g2"><div class="stack" style="gap:6px">${DRIVER_ATTRS.slice(0, 13).map(([k, l]) => attrRow(l, d[k] ?? 0)).join('')}</div><div>${d.personality ? persBars(d) : ''}</div></div>` : ''}
    <h4>Temporadas</h4>
    ${real.length || sim.length ? `<div class="tbl-wrap" style="max-height:280px;overflow:auto"><table class="tbl"><thead><tr><th>Ano</th><th></th><th>Equipe</th><th class="r">Pos</th><th class="r">Pts</th><th class="r">V</th><th class="r">Pód</th><th class="r">Poles</th></tr></thead><tbody>
      ${sim.slice().sort((a, b) => b.y - a.y || (a.cat ? 1 : 0) - (b.cat ? 1 : 0)).map(x => `<tr><td class="num">${x.y}</td><td><span class="${x.real ? 'realtag' : 'simtag'}">${x.real ? 'Real' : 'Sim'}</span></td><td class="small">${x.cat ? `<span class="chip">${esc(x.series)}</span>` : (x.teams || []).map(t => esc(hTeam(t))).join(', ')}</td><td class="r num">${x.pos}</td><td class="r num">${x.pts}</td><td class="r num">${x.w ?? ''}</td><td class="r num">${x.pod ?? ''}</td><td class="r num">${x.pole ?? ''}</td></tr>`).join('')}
      ${real.slice().reverse().map(x => `<tr><td class="num">${x.y}</td><td><span class="realtag">Real</span></td><td class="small">${esc(hTeam(x.team))}</td><td class="r num">${x.pos || '—'}${x.complete ? '' : '*'}</td><td class="r num">${x.pts}</td><td class="r num">${x.wins}</td><td class="r num">${x.pod}</td><td class="r num">${x.poles}</td></tr>`).join('')}
    </tbody></table></div>${real.some(x => !x.complete) ? '<p class="small muted">* temporada real ainda em andamento nos dados</p>' : ''}` : '<p class="muted small">Sem temporadas registradas.</p>'}
    ${tr.length ? `<h4>Transferências no jogo</h4>${tr.map(x => `<div class="small">${x.y}: ${x.from ? esc(hTeam(x.from)) + ' → ' : ''}<b>${esc(hTeam(x.to))}</b> até ${x.until} · ${fmtMoney(x.salary)}/ano</div>`).join('')}` : ''}`);
};
