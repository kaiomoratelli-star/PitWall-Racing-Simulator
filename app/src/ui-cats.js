/* ============================================================
   PIT WALL — telas das outras categorias (F2, F3, regionais, F4, SF, FE)
   ============================================================ */
'use strict';

NAV.splice(NAV.findIndex(n => n[0] === 'seasons'), 0, ['cats', 'Outras categorias', 'M3 17l4-10 4 6 3-4 7 8M3 21h18']);

const CAT_GROUPS = [['Rumo à F1', ['f2', 'f3']], ['Regionais', ['freca', 'frme', 'fram', 'frj']], ['Fórmula 4', ['f4it', 'f4es', 'f4gb', 'e4', 'f4br', 'f4us', 'f4jp']], ['Profissionais', ['fe', 'sf']]];
function catDate(iso) { const [y, m, d] = iso.split('-'); return `${Number(d)} ${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m) - 1]}`; }
function catTeam(cat, tid) { return cat.teams.find(t => t.id === tid) || { name: '—', color: '#555' }; }
function catDriverCell(did, cat, team) {
  const d = Career.driver(G, did);
  if (!d) return '<span class="muted">—</span>';
  const t = team && catTeam(cat, team);
  const ac = d.academy && Career.team(G, d.academy);
  return `<div class="row" style="gap:8px;flex-wrap:nowrap">${headshot(d, 'sm')}<div style="min-width:0"><button class="linkbtn" data-act="driverPage" data-id="${d.id}"><b>${esc(d.name)}</b></button> ${natTag(d.nat)}<div class="small muted">${t ? `<span class="tdot" style="background:${t.color}"></span>${esc(t.name)}` : ''}${ac ? ` · <span title="Academia">${esc(ac.short)} jr.</span>` : ''}${d.team ? ` · reserva ${esc(Career.team(G, d.team).short)}` : ''}</div></div></div>`;
}

SCREENS.cats = {
  html() {
    if (!Cats.on(G)) return `<div class="page-head"><div><div class="eyebrow">Categorias</div><h1>Outras categorias</h1></div></div><div class="panel"><div class="empty">As outras categorias estão desligadas nesta carreira. Novas carreiras começam com F2, F3, regionais, F4, Super Formula e Fórmula E.</div></div>`;
    const id = UI.params.c && Cats.get(G, UI.params.c) ? UI.params.c : 'f2';
    const cat = Cats.get(G, id);
    const tab = UI.params.t || 'stand';
    const s = cat.season;
    const done = s ? s.next : 0, total = s ? s.cal.length : 0;
    const nextEv = s && s.cal[s.next];
    const P = (o) => JSON.stringify({ c: id, t: tab, ...o });
    const chips = CAT_GROUPS.map(([g, ids]) => `<div class="catgroup"><span class="label">${g}</span>${ids.map(x => Cats.get(G, x)).filter(Boolean).map(c => `<button class="catchip ${c.id === id ? 'on' : ''} ${c.enabled ? '' : 'off'}" style="--cc:${c.color}" data-act="go" data-v="cats" data-p='${JSON.stringify({ c: c.id, t: tab })}'>${esc(c.short)}</button>`).join('')}</div>`).join('');
    let body = '';
    if (tab === 'stand') body = catStandHtml(cat);
    if (tab === 'cal') body = catCalHtml(cat);
    if (tab === 'teams') body = catTeamsHtml(cat);
    if (tab === 'champs') body = catChampsHtml(cat);
    return `<div class="page-head"><div><div class="eyebrow">Outras categorias</div><h1>${esc(cat.name)}</h1></div><div class="seg">${[['stand', 'Classificação'], ['cal', 'Calendário e resultados'], ['teams', 'Equipes'], ['champs', 'Campeões']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="go" data-v="cats" data-p='${P({ t: k })}'>${l}</button>`).join('')}</div></div>
    <div class="catbar">${chips}</div>
    <div class="cathead" style="--cc:${cat.color}"><div><div class="label">Temporada ${s ? s.year : ''} · ${cat.seasonLabel || ''}</div><div class="cat-prog"><b>${done}</b>/${total} etapas${nextEv ? ` · próxima: <b>${esc(nextEv.place || nextEv.circuit)}</b> (${catDate(nextEv.date)})` : done ? ' · temporada encerrada' : ''}</div></div>
      <div class="small muted" style="text-align:right">${cat.entries.length} pilotos · ${cat.teams.length} equipes · ${cat.races.length} corrida(s) por etapa${REAL_EXTRA.superlicense[cat.sl] ? ` · superlicença: ${REAL_EXTRA.superlicense[cat.sl].slice(0, 3).join('/')} pts aos 3 primeiros` : ''}${cat.enabled ? '' : ' · <b class="neg">desligada</b>'}</div></div>
    ${body}`;
  },
};

function catStandHtml(cat) {
  const sd = Cats.standings(cat);
  const tsd = Cats.teamStandings(cat);
  const table = REAL_EXTRA.superlicense[cat.sl] || [];
  return `<div class="grid g-hub"><div class="panel"><div class="panel-h"><h3>Pilotos</h3><span class="small muted">Pontos de superlicença pela posição final</span></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>#</th><th>Piloto</th><th class="r">Idade</th><th class="r">Nota</th><th class="r">V</th><th class="r">Pód</th><th class="r">Poles</th><th class="r">SL</th><th class="r">Pts</th></tr></thead><tbody>
    ${sd.map((x, i) => { const d = Career.driver(G, x.did); return d ? `<tr><td class="num">${i + 1}</td><td>${catDriverCell(x.did, cat, x.team || d.ctm)}</td><td class="r num">${d.age}</td><td class="r num ${ratingClass(driverOverall(d))}">${driverOverall(d)}</td><td class="r num">${x.w || 0}</td><td class="r num">${x.pod || 0}</td><td class="r num">${x.pole || 0}</td><td class="r num muted">${table[i] || ''}</td><td class="r num"><b>${x.pts}</b></td></tr>` : ''; }).join('')}
  </tbody></table></div></div>
  <div class="panel"><div class="panel-h"><h3>Equipes</h3></div><div class="panel-b tight"><table class="tbl"><tbody>${tsd.map((t, i) => `<tr><td class="num">${i + 1}</td><td><span class="tdot" style="background:${catTeam(cat, t.id).color}"></span>${esc(t.name)}</td><td class="r num"><b>${t.pts}</b></td></tr>`).join('')}</tbody></table></div></div></div>`;
}
function catCalHtml(cat) {
  const s = cat.season; if (!s) return '';
  return `<div class="panel"><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Etapa</th><th>Data</th><th>Local</th>${cat.races.map(r => `<th>${esc(r[0])}</th>`).join('')}<th>Pole</th></tr></thead><tbody>
    ${s.cal.map((e, i) => { const r = s.res.find(x => x.r === e.r && x.date === e.date); return `<tr class="${i === s.next ? 'me' : ''}"><td class="num">${e.r}</td><td class="num small">${catDate(e.date)}</td><td>${e.nat ? natTag(e.nat) + ' ' : ''}<b>${esc(e.place || e.circuit)}</b><div class="small muted">${esc(e.circuit)}</div></td>${cat.races.map((_, k) => `<td>${r && r.races[k] && r.races[k].top[0] ? `${catMini(r.races[k].top[0])}${r.wet > 0.25 ? ' <span class="chip" style="color:var(--blue)">chuva</span>' : ''}` : i === s.next ? '<span class="chip acc">próxima</span>' : ''}</td>`).join('')}<td class="small">${r ? catMini(r.pole) : ''}</td></tr>`; }).join('')}
  </tbody></table></div></div>`;
}
function catMini(did) { const d = Career.driver(G, did); return d ? `<button class="linkbtn" data-act="driverPage" data-id="${d.id}">${esc(shortName(d))}</button>` : '—'; }
function catTeamsHtml(cat) {
  return `<div class="grid g3">${cat.teams.slice().sort((a, b) => b.str - a.str).map(t => {
    const ds = cat.entries.filter(e => e.team === t.id);
    return `<div class="panel cat-team" style="--tc:${t.color}"><div class="panel-h"><h3>${esc(t.name)}</h3><span class="small muted">${t.nat ? natTag(t.nat) : ''} força ${t.str}</span></div>${t.carImg && imgUrl(t.carImg) ? `<div class="panel-b" style="padding-bottom:0"><img class="carimg" src="${imgUrl(t.carImg)}" alt="Carro ${esc(t.name)}" loading="lazy" onerror="this.remove()"></div>` : ''}<div class="panel-b stack" style="gap:8px">${ds.map(e => catDriverCell(e.did, cat, null)).join('') || '<span class="muted small">Sem pilotos.</span>'}</div></div>`;
  }).join('')}</div>`;
}
function catChampsHtml(cat) {
  const arch = cat.archive.slice().reverse();
  const titles = {};
  arch.forEach(a => { const k = a.top[0] && (a.top[0][0] || a.top[0][2]); if (k) titles[k] = (titles[k] || 0) + 1; });
  return `<div class="grid g2"><div class="panel"><div class="panel-h"><h3>Campeões</h3><span class="small muted">Temporada real de 2026 e as simuladas desta carreira</span></div><div class="panel-b tight"><table class="tbl"><thead><tr><th>Ano</th><th>Campeão</th><th class="r">Pts</th><th>Vice</th><th>Equipes</th></tr></thead><tbody>
    ${arch.map(a => { const c = a.top[0] || [], v = a.top[1] || []; const d = c[0] && Career.driver(G, c[0]); return `<tr><td class="num">${a.y} ${a.real ? '<span class="realtag">Real</span>' : '<span class="simtag">Sim</span>'}</td><td>${d ? catMini(d.id) : esc(c[2] || '—')}${d && d.team && d.seat !== 'R' ? ` <span class="chip acc">F1 · ${esc(Career.team(G, d.team).short)}</span>` : ''}</td><td class="r num">${c[1] ?? ''}</td><td class="small">${v[0] && Career.driver(G, v[0]) ? catMini(v[0]) : esc(v[2] || '')}</td><td class="small muted">${esc(a.teamChamp || '')}</td></tr>`; }).join('')}
  </tbody></table></div></div>
  <div class="panel"><div class="panel-h"><h3>Formados aqui e hoje na F1</h3></div><div class="panel-b stack" style="gap:8px">${G.db.drivers.filter(d => d.team && d.seat !== 'R' && (d.history || []).some(h => h.cat === cat.id)).map(d => `<div class="row" style="gap:8px">${headshot(d, 'sm')}<button class="linkbtn" data-act="driverPage" data-id="${d.id}"><b>${esc(d.name)}</b></button><span class="small muted">${esc(Career.team(G, d.team).name)} · ${(d.history || []).filter(h => h.cat === cat.id).map(h => `${h.y}: ${ordinal(h.pos)}`).join(', ')}</span></div>`).join('') || '<p class="muted small">Ninguém do grid atual da F1 passou por aqui nos registros desta carreira.</p>'}
    ${Object.keys(titles).length ? `<div class="label" style="margin-top:10px">Mais títulos</div>${Object.entries(titles).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `<div class="small">${Career.driver(G, k) ? esc(Career.driver(G, k).name) : esc(k)} · ${n}</div>`).join('')}` : ''}</div></div></div>`;
}

/* ---------- página do piloto: temporadas nas categorias ---------- */
const _driverPage = ACT.driverPage;
ACT.driverPage = (el) => {
  _driverPage(el);
  const d = G && Career.driver(G, el.dataset.id);
  const cat = d && d.cat && Cats.get(G, d.cat);
  const top = $('#modal .driver-card-top .small.muted');
  if (cat && top) top.insertAdjacentHTML('afterend', `<div class="small"><span class="chip" style="border-color:${cat.color}">${esc(cat.short)}</span> ${esc(catTeam(cat, d.ctm).name)} · temporada ${cat.season ? cat.season.year : ''}: ${(Cats.standings(cat).findIndex(x => x.did === d.id) + 1) || '—'}º com ${(cat.season && cat.season.pts[d.id]) || 0} pts${(d.catTitles || []).length ? ` · títulos: ${d.catTitles.map(t => `${esc(t.short)} ${t.y}`).join(', ')}` : ''}</div>`);
};

/* ---------- mercado: filtro por categoria ---------- */
const _mkHtml = SCREENS.market.html;
SCREENS.market.html = function () {
  const c = UI.params.c;
  if (!c || !Cats.on(G)) return _mkHtml.call(this).replace('<span class="spacer"></span>', `<select class="inp" style="width:auto" data-chg="mkCat" aria-label="Categoria">${opt('', 'Todas as séries', '')}${opt('f1', 'Só F1', '')}${Cats.list(G).map(x => opt(x.id, x.name, '')).join('')}</select><span class="spacer"></span>`);
  // filtra temporariamente a lista de pilotos pela categoria escolhida
  const all = G.db.drivers;
  G.db.drivers = all.filter(d => c === 'f1' ? d.team : d.cat === c || (Cats.get(G, c) && Cats.get(G, c).entries.some(e => e.did === d.id)));
  let html;
  try { html = _mkHtml.call(this); } finally { G.db.drivers = all; }
  return html.replace('<span class="spacer"></span>', `<select class="inp" style="width:auto" data-chg="mkCat" aria-label="Categoria">${opt('', 'Todas as séries', c)}${opt('f1', 'Só F1', c)}${Cats.list(G).map(x => opt(x.id, x.name, c)).join('')}</select><span class="spacer"></span>`);
};
CHG.mkCat = (el) => go('market', { ...UI.params, c: el.value || undefined });

/* ---------- editor: categorias ---------- */
function edCats() {
  if (!G || !Cats.on(G) || ED.target !== 'career') return '<p class="muted">As categorias são editadas dentro de uma carreira (escolha "Carreira atual"). Novas carreiras usam os grids reais de 2026 como ponto de partida.</p>';
  return `<p class="small muted">Desligar uma categoria interrompe a simulação dela (os pilotos continuam no banco). Nomes, pontuação e força das equipes valem a partir da próxima etapa.</p>
  <div class="tbl-wrap"><table class="tbl edit"><thead><tr><th>Ligada</th><th>Nome</th><th>Sigla</th><th>Vagas</th><th>Corridas por etapa (pontuação)</th></tr></thead><tbody>
  ${Cats.list(G, true).map(c => `<tr><td><input type="checkbox" ${c.enabled ? 'checked' : ''} data-chg="catSet" data-id="${c.id}" data-k="enabled"></td><td><input class="inp" value="${esc(c.name)}" data-chg="catSet" data-id="${c.id}" data-k="name"></td><td><input class="inp" style="width:80px" value="${esc(c.short)}" data-chg="catSet" data-id="${c.id}" data-k="short"></td><td><input class="inp num" style="width:70px" type="number" value="${c.seats}" data-chg="catSet" data-id="${c.id}" data-k="seats"></td><td>${c.races.map((r, i) => `<div class="row" style="gap:6px;flex-wrap:nowrap;margin:2px 0"><span class="small" style="width:80px">${esc(r[0])}</span><input class="inp num" style="width:260px" value="${esc(r[1].join(', '))}" data-chg="catPts" data-id="${c.id}" data-i="${i}"><span class="small muted">pole ${r[2]} · v. rápida ${r[3]}${r[4] ? ` · grid invertido ${r[4]}` : ''}</span></div>`).join('')}</td></tr>`).join('')}
  </tbody></table></div>
  <h4 style="margin-top:16px">Força das equipes</h4>
  <div class="grid g3">${Cats.list(G, true).filter(c => !c.secondary).map(c => `<div class="panel" style="background:var(--bg2)"><div class="panel-h"><h3>${esc(c.short)}</h3></div><div class="panel-b stack" style="gap:4px">${c.teams.map((t, i) => `<label class="row between small" style="flex-wrap:nowrap"><span>${esc(t.name)}</span><input class="inp num" style="width:70px" type="number" min="20" max="80" value="${t.str}" data-chg="catTeam" data-id="${c.id}" data-i="${i}"></label>`).join('')}</div></div>`).join('')}</div>`;
}
CHG.catSet = (el) => { const c = Cats.get(G, el.dataset.id); const k = el.dataset.k; c[k] = k === 'enabled' ? el.checked : k === 'seats' ? clamp(Number(el.value) || c.seats, 4, 60) : el.value; toast('Categoria atualizada.'); };
CHG.catPts = (el) => { const c = Cats.get(G, el.dataset.id); const v = el.value.split(',').map(x => Number(x.trim())).filter(x => isFinite(x)); if (v.length) c.races[+el.dataset.i][1] = v; toast('Pontuação atualizada.'); };
CHG.catTeam = (el) => { const c = Cats.get(G, el.dataset.id); c.teams[+el.dataset.i].str = clamp(Number(el.value) || 50, 20, 80); };
