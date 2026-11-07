/* ============================================================
   PIT WALL — telas das outras categorias (F2, F3, regionais, F4, SF, FE)
   ============================================================ */
'use strict';

NAV.splice(NAV.findIndex(n => n[0] === 'seasons'), 0, ['cats', 'Outras categorias', 'M3 17l4-10 4 6 3-4 7 8M3 21h18']);

// ecossistemas: as principais em destaque; depois as escadas de formação de cada mundo
const CAT_GROUPS = [['Monoposto · principais', ['fe', 'indycar', 'sf'], true], ['GT', ['dtm', 'stockcar', 'nascup'], true], ['Endurance', ['wec'], true], ['Monoposto · rumo à F1', ['f2', 'f3', 'f1a']], ['Monoposto · regionais', ['freca', 'frme', 'fram']], ['Monoposto · Fórmula 4', ['f4it', 'f4de', 'f4es', 'f4gb', 'e4', 'f4br', 'f4uae']], ['Ecossistema Indy', ['f4us']], ['Ecossistema Super Formula', ['frj', 'f4jp']]];
function catDate(iso) { const [y, m, d] = iso.split('-'); return `${Number(d)} ${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(m) - 1]}`; }
function catTeam(cat, tid) { return cat.teams.find(t => t.id === tid) || { name: '—', color: '#555' }; }
function catDriverCell(did, cat, team) {
  const d = Career.driver(G, did);
  if (!d) return '<span class="muted">—</span>';
  const t = team && catTeam(cat, team);
  const ac = d.academy && Career.team(G, d.academy);
  return `<div class="row" style="gap:8px;flex-wrap:nowrap">${headshot(d, 'sm')}<div style="min-width:0"><button class="linkbtn" data-act="driverPage" data-id="${d.id}"><b>${esc(d.name)}</b></button> ${natTag(d.nat)}<div class="small muted">${t ? `${teamLogo(t, 'xs')} ${esc(t.name)}` : ''}${ac ? ` · <span title="Academia">${esc(ac.short)} jr.</span>` : ''}${d.team ? ` · reserva ${esc(Career.team(G, d.team).short)}` : ''}</div></div></div>`;
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
    const chips = CAT_GROUPS.map(([g, ids, main]) => `<div class="catgroup ${main ? 'main' : ''}"><span class="label">${g}</span>${ids.map(x => Cats.get(G, x)).filter(Boolean).map(c => `<button class="catchip ${c.id === id ? 'on' : ''} ${c.enabled ? '' : 'off'}" style="--cc:${c.color}" data-act="go" data-v="cats" data-p='${JSON.stringify({ c: c.id, t: tab })}'>${Assets.compLogo(c.id, 'chip')}${esc(c.short)}</button>`).join('')}</div>`).join('');
    let body = '';
    if (tab === 'stand') body = catStandHtml(cat);
    if (tab === 'cal') body = catCalHtml(cat);
    if (tab === 'teams') body = catTeamsHtml(cat);
    if (tab === 'champs') body = catChampsHtml(cat);
    return `<div class="page-head"><div><div class="eyebrow">Outras categorias</div><h1>${esc(cat.name)}</h1></div><div class="seg">${[['stand', 'Classificação'], ['cal', 'Calendário e resultados'], ['teams', 'Equipes'], ['champs', 'Campeões']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="go" data-v="cats" data-p='${P({ t: k })}'>${l}</button>`).join('')}</div></div>
    <div class="catbar">${chips}</div>
    ${cat.brief ? `<div class="callout catbrief"><span class="chip">${esc(Disc.label(cat.disc || 'mono'))}</span>${cat.women ? ` <span class="chip">${byLang('só mulheres', 'women only')}</span>` : ''}${cat.playoffs ? ` <span class="chip">${byLang('playoffs: os 4 melhores decidem o título na última etapa', 'playoffs: the top 4 decide the title in the final round')}</span>` : ''} ${esc(cat.brief)}</div>` : ''}
    <div class="cathead" style="--cc:${cat.color}">${Assets.compLogo(cat.id, 'head')}<div style="flex:1"><div class="label">Temporada ${s ? s.year : ''} · ${cat.seasonLabel || ''}</div><div class="cat-prog"><b>${done}</b>/${total} etapas${nextEv ? ` · próxima: <b>${esc(nextEv.place || nextEv.circuit)}</b> (${catDate(nextEv.date)})` : done ? ' · temporada encerrada' : ''}</div></div>
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
/* de onde vem a vaga: anúncio da fonte, grid real de 2026, projeção do jogo ou piloto fictício */
function catEntryStatus(e) {
  if (!e.st || !Cats.STATUS[e.st]) return '';
  const cls = e.st === 'anunciado' ? 'pos' : e.st === 'gerado' ? 'neg' : 'muted';
  return `<div class="small ${cls}" style="margin-top:-6px;padding-left:4px">${esc(Cats.STATUS[e.st])}</div>`;
}
function catTeamsHtml(cat) {
  return `<div class="grid g3">${cat.teams.slice().sort((a, b) => b.str - a.str).map(t => {
    const ds = cat.entries.filter(e => e.team === t.id);
    return `<div class="panel cat-team" style="--tc:${t.color}"><div class="panel-h"><div class="row" style="gap:10px;flex-wrap:nowrap">${teamLogo(t)}<h3>${esc(t.name)}</h3></div><span class="small muted">${t.nat ? natTag(t.nat) : ''} força ${t.str}</span></div>${t.carImg && imgUrl(t.carImg) ? `<div class="panel-b" style="padding-bottom:0"><img class="carimg" src="${imgUrl(t.carImg)}" alt="Carro ${esc(t.name)}" loading="lazy" onerror="this.remove()"></div>` : ''}<div class="panel-b stack" style="gap:8px">${ds.map(e => catDriverCell(e.did, cat, null) + catEntryStatus(e)).join('') || '<span class="muted small">Sem pilotos.</span>'}</div></div>`;
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
  const c = UI.params.c || '';
  const sel = Cats.on(G) ? `<select class="inp" style="width:auto" data-chg="mkCat" aria-label="Categoria">${opt('', 'Todas as séries', c)}${opt('f1', 'Só F1', c)}${Cats.list(G).map(x => opt(x.id, x.name, c)).join('')}</select>` : '';
  return _mkHtml.call(this).replace('<span class="spacer"></span>', sel + '<span class="spacer"></span>');
};
CHG.mkCat = (el) => go('market', { ...UI.params, c: el.value || undefined });

/* ---------- editor: categorias ---------- */
function edCats() {
  if (!G || !Cats.on(G) || ED.target !== 'career') return '<p class="muted">As categorias são editadas dentro de uma carreira (escolha "Carreira atual"). Novas carreiras usam os grids reais de 2026 como ponto de partida.</p>';
  return `<p class="small muted">Desligar uma categoria interrompe a simulação dela (os pilotos continuam no banco). Nomes, pontuação e força das equipes valem a partir da próxima etapa.</p>
  <div class="tbl-wrap"><table class="tbl edit"><thead><tr><th>Ligada</th><th>Nome</th><th>Sigla</th><th>Vagas</th><th>Corridas por etapa (pontuação)</th></tr></thead><tbody>
  ${Cats.list(G, true).map(c => `<tr><td><input type="checkbox" ${c.enabled ? 'checked' : ''} data-chg="catSet" data-id="${c.id}" data-k="enabled"></td><td><input class="inp" value="${esc(c.name)}" data-chg="catSet" data-id="${c.id}" data-k="name"></td><td><input class="inp" style="width:80px" value="${esc(c.short)}" data-chg="catSet" data-id="${c.id}" data-k="short"></td><td><input class="inp num" style="width:70px" type="number" value="${c.seats}" data-chg="catSet" data-id="${c.id}" data-k="seats"></td><td>${c.races.map((r, i) => `<div class="row" style="gap:6px;flex-wrap:nowrap;margin:2px 0"><span class="small" style="width:80px">${esc(r[0])}</span><input class="inp num" style="width:260px" value="${esc(r[1].join(', '))}" data-chg="catPts" data-id="${c.id}" data-i="${i}"><span class="small muted">pole ${r[2]} · v. rápida ${r[3]} · grid invertido</span><input class="inp num" style="width:56px" type="number" min="0" max="20" value="${r[4] || 0}" data-chg="catRev" data-id="${c.id}" data-i="${i}" title="Quantos primeiros colocados largam em ordem invertida (0 = sem inversão)"></div>`).join('')}</td></tr>`).join('')}
  </tbody></table></div>
  <h4 style="margin-top:16px">Força das equipes</h4>
  <div class="grid g3">${Cats.list(G, true).filter(c => !c.secondary).map(c => `<div class="panel" style="background:var(--bg2)"><div class="panel-h"><h3>${esc(c.short)}</h3></div><div class="panel-b stack" style="gap:4px">${c.teams.map((t, i) => `<label class="row between small" style="flex-wrap:nowrap"><span>${esc(t.name)}</span><input class="inp num" style="width:70px" type="number" min="20" max="80" value="${t.str}" data-chg="catTeam" data-id="${c.id}" data-i="${i}"></label>`).join('')}</div></div>`).join('')}</div>`;
}
CHG.catSet = (el) => { const c = Cats.get(G, el.dataset.id); const k = el.dataset.k; c[k] = k === 'enabled' ? el.checked : k === 'seats' ? clamp(Number(el.value) || c.seats, 4, 60) : el.value; toast('Categoria atualizada.'); };
CHG.catPts = (el) => { const c = Cats.get(G, el.dataset.id); const v = el.value.split(',').map(x => Number(x.trim())).filter(x => isFinite(x)); if (v.length) c.races[+el.dataset.i][1] = v; toast('Pontuação atualizada.'); };
CHG.catRev = (el) => { const c = Cats.get(G, el.dataset.id); c.races[+el.dataset.i][4] = clamp(Math.round(Number(el.value) || 0), 0, 20); toast('Formato atualizado.'); };
CHG.catTeam = (el) => { const c = Cats.get(G, el.dataset.id); c.teams[+el.dataset.i].str = clamp(Number(el.value) || 50, 20, 80); };

/* séries que estão na base de pilotos mas ainda não são simuladas: aparecem organizadas, sem fingir que são jogáveis */
(function () {
  const h = SCREENS.cats.html;
  SCREENS.cats.html = function () {
    const base = h.call(this);
    if (typeof DRIVER_DB === 'undefined' || !Cats.on(G)) return base;
    const sim = new Set(Cats.list(G, true).map(c => c.id).concat(['f1']));
    const byEco = {};
    Object.entries(DRIVER_DB.series).filter(([id]) => !sim.has(id)).forEach(([id, s]) => { const n = G.db.drivers.filter(d => d.series === id && !d.retired).length; (byEco[s.ecoName] = byEco[s.ecoName] || []).push(`${esc(s.name)}${n ? ` <span class="muted">· ${n} no universo</span>` : ''}`); });
    return base + `<div class="panel" style="margin-top:14px"><div class="panel-h"><h3>Na base de dados</h3><span class="small muted">pilotos e carreiras reais; simulação em preparação</span></div><div class="panel-b grid g3">${Object.entries(byEco).map(([eco, xs]) => `<div><span class="label">${esc(eco)}</span><div class="small" style="line-height:1.7">${xs.join('<br>')}</div></div>`).join('')}</div></div>`;
  };
})();

/* ---------- editor: formato da categoria (tripulação, Le Mans em dobro) e políticas de grupo ---------- */
(function () {
  const ec = edCats;
  edCats = function () {
    const base = ec();
    if (!G || !Cats.on(G) || ED.target !== 'career') return base;
    const crew = Cats.list(G, true).filter(c => c.crew);
    return base + `<h4 style="margin-top:16px">Formato</h4><div class="tbl-wrap"><table class="tbl edit"><thead><tr><th>Categoria</th><th>Carro com tripulação</th><th>Etapas com pontos em dobro</th></tr></thead><tbody>
      ${Cats.list(G, true).filter(c => !c.secondary).map(c => `<tr><td>${esc(c.name)}</td><td><label class="check"><input type="checkbox" ${c.crew ? 'checked' : ''} data-chg="catCrew" data-id="${c.id}"> 2 ou 3 pilotos por carro dividem os pontos</label></td><td class="small muted">${c.crew ? 'Le Mans (pela pista)' : '—'}</td></tr>`).join('')}
      </tbody></table></div><p class="small muted">${crew.length ? 'Mudar o formato vale a partir da próxima etapa. Numa categoria de tripulação, cada inscrição é um carro.' : ''}</p>`;
  };
})();
CHG.catCrew = (el) => { const c = Cats.get(G, el.dataset.id); c.crew = el.checked; toast('Formato atualizado.'); };

(function () {
  const er = edRules;
  edRules = function (db) {
    const base = er(db);
    if (!db.rules || typeof MarketPlus === 'undefined') return base;
    const pols = db.rules.groupPolicies || (db.rules.groupPolicies = JSON.parse(JSON.stringify(MarketPlus.DEFAULT_POLICIES)));
    const teams = db.teams || [];
    return base + `<h4 style="margin-top:18px">Política de academia por grupo</h4>
      <p class="small muted">Grupos com mais de uma equipe podem priorizar os pilotos da própria academia. "Peso da academia" aumenta a chance de promover um piloto do grupo; "penalidade externa" reduz a de contratar alguém de fora.</p>
      <div class="tbl-wrap"><table class="tbl edit"><thead><tr><th>Grupo</th><th>Equipes</th><th class="r">Peso da academia</th><th class="r">Penalidade externa</th><th></th></tr></thead><tbody>
      ${Object.entries(pols).map(([k, p]) => `<tr><td><input class="inp" value="${esc(p.name || k)}" data-chg="polSet" data-k="${esc(k)}" data-f="name"></td>
        <td><div class="row" style="gap:4px 12px;flex-wrap:wrap;max-width:520px">${teams.map(t => `<label class="check small"><input type="checkbox" ${(p.teams || []).includes(t.id) ? 'checked' : ''} data-chg="polTeam" data-k="${esc(k)}" data-t="${t.id}"> ${esc(t.short || t.name)}</label>`).join('')}</div></td>
        <td class="r"><input class="inp num" type="number" min="0" max="30" style="width:70px" value="${p.academyWeight}" data-chg="polSet" data-k="${esc(k)}" data-f="academyWeight"></td>
        <td class="r"><input class="inp num" type="number" min="0" max="30" style="width:70px" value="${p.externalPenalty}" data-chg="polSet" data-k="${esc(k)}" data-f="externalPenalty"></td>
        <td class="r"><button class="btn sm ghost" data-act="polDel" data-k="${esc(k)}">Remover</button></td></tr>`).join('')}
      </tbody></table></div><button class="btn sm" style="margin-top:8px" data-act="polAdd">Novo grupo</button>`;
  };
})();
const polDb = () => edDb().rules.groupPolicies;
CHG.polSet = (el) => { const p = polDb()[el.dataset.k]; if (!p) return; const f = el.dataset.f; p[f] = f === 'name' ? el.value : clamp(Number(el.value) || 0, 0, 30); toast('Política atualizada.'); };
CHG.polTeam = (el) => { const p = polDb()[el.dataset.k]; if (!p) return; p.teams = (p.teams || []).filter(t => t !== el.dataset.t); if (el.checked) p.teams.push(el.dataset.t); };
ACT.polAdd = () => { const P = polDb(); let i = 1; while (P['grupo-' + i]) i++; P['grupo-' + i] = { name: 'Novo grupo', teams: [], academyWeight: 8, externalPenalty: 4 }; render(); };
ACT.polDel = (el) => { delete polDb()[el.dataset.k]; render(); };

/* kart: base da pirâmide (pilotos fictícios de 12 a 15 anos que alimentam as F4) */
(function () {
  const h = SCREENS.cats.html;
  SCREENS.cats.html = function () {
    const base = h.call(this);
    if (typeof Kart === 'undefined' || !Kart.on(G)) return base;
    const col = (ch) => {
      const ds = Kart.drivers(G, ch.id);
      const last = (G.kart.champs[ch.id] || []).slice(-1)[0];
      const best = ds.slice().sort((a, b) => driverOverall(b) - driverOverall(a)).slice(0, 5);
      return `<div><span class="label">${esc(ch.name)}</span><div class="small muted">${ds.length} pilotos · sobem para ${ch.f4.map(id => Cats.get(G, id) ? esc(Cats.get(G, id).short) : '').filter(Boolean).join(', ')}</div>
        ${last ? `<div class="small" style="margin:6px 0 4px">Campeão ${last.y}: <b>${dTag(last.top[0])}</b></div>` : ''}
        <div class="small" style="line-height:1.8">${best.map(d => `${dTag(d.id)} <span class="muted">${d.age} anos · ${potText(d)}</span>`).join('<br>')}</div></div>`;
    };
    return base + `<div class="panel" style="margin-top:14px"><div class="panel-h"><h3>Kart</h3><span class="small muted">base da pirâmide: pilotos de 12 a 15 anos gerados pelo jogo; os melhores sobem para a F4 da região</span></div>
      <div class="panel-b grid g4">${Kart.CHAMPS.map(col).join('')}</div></div>`;
  };
})();
