/* ============================================================
   PIT WALL 0.8.5 — Mundo
   - Página da equipe (modelo A + estatísticas completas e maiores vencedores)
   - Conselho da FIA (modelo B: cada proposta como documento oficial)
   - Notícias (modelo B: jornal) e Redes sociais (modelo A: feed em cartões)
   - Fim de temporada (modelo B)
   ============================================================ */
'use strict';

/* ---------------- Página da equipe ---------------- */
function teamStats85(t) {
  const lin = typeof teamLineage === 'function' ? teamLineage(t.id) : [];
  const inL = (cid, y) => typeof inLineage === 'function' ? inLineage(lin, cid, y) : cid === t.id;
  const S = { seasons: [], titles: [], wins: {}, poles: {}, drivers: {}, winsByYear: {}, podByYear: {}, starts: 0, wins0: 0, pods: 0, poles0: 0, dTitles: [] };
  if (typeof HIST !== 'undefined' && HIST) HIST.seasons.forEach(s => {
    const ci = s.c.findIndex(x => inL(x[0], s.y));
    if (ci >= 0 && s.c[ci][2] != null) S.seasons.push({ y: s.y, pos: s.c[ci][2], pts: s.c[ci][1] });
    if (s.complete && ci === 0) S.titles.push(s.y);
    const dteam = {}; s.d.forEach(x => { dteam[x[0]] = x[1]; if (inL(x[1], s.y)) { const o = S.drivers[x[0]] = S.drivers[x[0]] || { seasons: 0, pts: 0 }; o.seasons++; o.pts += x[2] || 0; } });
    if (s.complete && s.d[0] && inL(s.d[0][1], s.y)) S.dTitles.push([s.y, s.d[0][0]]);
    s.r.forEach(r => {
      if (r[5] && r[5][0] && inL(r[5][0], s.y)) { S.wins[r[4][0]] = (S.wins[r[4][0]] || 0) + 1; S.winsByYear[s.y] = (S.winsByYear[s.y] || 0) + 1; S.wins0++; }
      (r[5] || []).forEach(tid => { if (inL(tid, s.y)) { S.pods++; S.podByYear[s.y] = (S.podByYear[s.y] || 0) + 1; } });
      if (r[6] && dteam[r[6]] && inL(dteam[r[6]], s.y)) { S.poles[r[6]] = (S.poles[r[6]] || 0) + 1; S.poles0++; }
    });
  });
  // temporadas simuladas desta carreira
  (t.history || []).filter(h => h.sim).forEach(h => { S.seasons.push({ y: h.y, pos: h.pos, pts: h.pts, sim: true }); S.winsByYear[h.y] = (S.winsByYear[h.y] || 0) + (h.w || 0); S.wins0 += h.w || 0; S.pods += h.pod || 0; });
  (G.history || []).forEach(h => { if (h.constructor === t.id) S.titles.push(h.year); if (h.championTeam === t.id) S.dTitles.push([h.year, h.champion]); });
  (G.archive || []).forEach(a => (a.races || []).forEach(r => { const c = (r.c || []).find(x => x[0] === r.w); if (c && c[1] === t.id) S.wins[r.w] = (S.wins[r.w] || 0) + 1; }));
  // temporada atual
  (G.season.results || []).forEach(r => { const w = (r.cls || [])[0]; if (w && w.tid === t.id) { S.wins[w.did] = (S.wins[w.did] || 0) + 1; S.winsByYear[G.season.year] = (S.winsByYear[G.season.year] || 0) + 1; } });
  S.lin = lin; S.seasons.sort((a, b) => a.y - b.y);
  return S;
}
SCREENS.teamPage = {
  html() {
    const t = Career.team(G, UI.params.id) || G.db.teams[0]; const S = teamStats85(t);
    const lore = (typeof LORE !== 'undefined' && LORE[t.id]) || {};
    const sc = Career.standingsC(G); const pos = sc.findIndex(x => x.tid === t.id) + 1; const pts = (sc.find(x => x.tid === t.id) || {}).pts || 0;
    const lu = Career.lineup(G, t.id); const rs = t.realStats || {};
    const nm = (id) => typeof hName === 'function' ? hName(id) : id;
    const topW = Object.entries(S.wins).sort((a, b) => b[1] - a[1]).slice(0, 8); const maxW = topW.length ? topW[0][1] : 1;
    const topP = Object.entries(S.poles).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const topD = Object.entries(S.drivers).sort((a, b) => b[1].seasons - a[1].seasons || b[1].pts - a[1].pts).slice(0, 8);
    const best = S.seasons.slice().sort((a, b) => a.pos - b.pos || a.y - b.y)[0];
    const yrs = S.seasons.slice(-30);
    const curSeason = (G.season.results || []).reduce((o, r) => { (r.cls || []).filter(c => c.tid === t.id).forEach(c => { if (c.pos === 1 && c.status === 'fin') o.w++; if (c.pos <= 3 && c.status === 'fin') o.p++; }); return o; }, { w: 0, p: 0 });
    const tiles = [[byLang('Títulos de construtores', 'Constructors titles'), S.titles.length], [byLang('Títulos de pilotos', 'Drivers titles'), S.dTitles.length], [byLang('Vitórias', 'Wins'), S.wins0], [byLang('Pódios', 'Podiums'), S.pods], ['Poles', S.poles0], [byLang('Temporadas', 'Seasons'), S.seasons.length], [byLang('Melhor posição', 'Best finish'), best ? ordinal(best.pos) : '—'], [byLang('Na F1 desde', 'In F1 since'), lore.debut || (S.seasons[0] || {}).y || '—']];
    const posPts = yrs.map(s => [s.y, s.pos]);
    const winCols = yrs.map(s => ({ l: String(s.y).slice(2), v: S.winsByYear[s.y] || 0, c: s.sim ? 'var(--purple)' : t.color }));
    return `<section class="tp85" style="--tc:${t.color};--tc2:${t.color2 || '#111'}"><div class="tp85-l">${imgUrl(t.logo) ? `<span class="tp85-logo"><img src="${imgUrl(t.logo)}" alt=""></span>` : ''}<div><span class="n-eyebrow">${natTag(t.country)} ${esc(lore.base || '')}${t.puName ? ' · ' + esc(t.puName) : ''}</span><h1>${esc(t.fullName || t.name)}</h1><p>${ordinal(pos)} ${byLang('no campeonato', 'in the championship')} · ${pts} pts · ${curSeason.w} ${byLang('vitória(s)', 'win(s)')} · ${curSeason.p} ${byLang('pódio(s) em', 'podium(s) in')} ${G.season.year}</p>
        <div class="tp85-act">${K85.btn(byLang('Donos e valor', 'Owners and value'), { act: 'go', v: 'owners', sm: true })}${t.id === (G.player || {}).teamId ? K85.btn(byLang('Carro', 'Car'), { act: 'go', v: 'car', sm: true }) : ''}</div></div></div>${imgUrl(t.carImg) ? `<img class="tp85-car" src="${imgUrl(t.carImg)}" alt="">` : ''}</section>` +
      `<div class="tp85-tiles">${tiles.map(([l, v]) => `<div><b class="n-num">${v}</b><small>${l}</small></div>`).join('')}</div>` +
      K85.grid('minmax(0,1.2fr) minmax(0,1fr)', K85.col(K85.card({ t: byLang('Posição no Mundial, ano a ano', 'Championship position by year'), a: byLang('roxo = simulado nesta carreira', 'purple = simulated in this career'), body: K85.lines([{ c: t.color, w: 2.4, pts: posPts, name: t.name }], { invert: true, yMin: 1, yMax: Math.max(10, ...posPts.map(p => p[1])), h: 190, fmt: v => ordinal(Math.round(v)), xlabels: posPts.filter((p, i) => i % 4 === 0).map(p => [p[0], String(p[0])]) }) }),
          K85.card({ t: byLang('Vitórias por temporada', 'Wins per season'), body: K85.cols(winCols, { h: 170, every: 3 }) })),
        K85.col(K85.card({ t: byLang('Maiores vencedores pela equipe', 'Biggest winners for the team'), flush: true, body: topW.length ? K85.list(topW.map(([id, n], i) => { const d = Career.driver(G, id); return { lead: `<span class="n-pos ${i < 3 ? 'p' + (i + 1) : ''}">${i + 1}</span>${d ? K85.av(d, 30) : ''}`, title: esc(d ? d.name : nm(id)), tail: `<span style="width:120px">${K85.bar(n, maxW, t.color)}</span><b class="n-num">${n}</b>` }; })) : `<div style="padding:12px 16px">${K85.empty(byLang('Ainda sem vitórias.', 'No wins yet.'))}</div>` }),
          K85.grid('1fr 1fr', K85.card({ t: 'Poles', flush: true, body: topP.length ? K85.list(topP.map(([id, n]) => ({ title: esc(nm(id)), tail: `<b class="n-num">${n}</b>` }))) : `<div style="padding:12px 16px">—</div>` }), K85.card({ t: byLang('Mais temporadas', 'Most seasons'), flush: true, body: topD.length ? K85.list(topD.map(([id, o]) => ({ title: esc(nm(id)), sub: `${Math.round(o.pts)} pts`, tail: `<b class="n-num">${o.seasons}</b>` }))) : `<div style="padding:12px 16px">—</div>` })))) +
      K85.grid('minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', K85.card({ t: byLang('Pilotos hoje', 'Current drivers'), body: lu.map(d => `<div class="tp85-d" data-act="driverPage" data-id="${d.id}">${K85.av(d, 46)}<span><b>${esc(d.name)}</b><small>${(() => { const i = Career.standingsD(G).findIndex(x => x.did === d.id); return i >= 0 ? ordinal(i + 1) : ''; })()} · ${byLang('até', 'until')} ${(d.contract || {}).until || '—'}</small></span>${K85.rate(driverOverall(d))}</div>`).join('') }),
        K85.card({ t: byLang('Carro', 'Car'), body: K85.radar([byLang('Aero', 'Aero'), byLang('Chassi', 'Chassis'), byLang('Motor', 'Engine'), byLang('Confiab.', 'Reliab.'), byLang('Pneus', 'Tyres')], [[t.car.aero, t.car.chassis, (Engine.engineOf(G.db, t).power || 80) + (t.car.engineBonus || 0), Engine.reliability(G.db, t), t.car.tyreCare ?? 80]], { r: 86, min: 60, max: 100, colors: [t.color], maxW: 320 }) }),
        K85.card({ t: byLang('Linhagem e títulos', 'Lineage and titles'), body: `<div class="tp85-lin">${S.lin.map(l => `<div><b>${esc(l.name)}</b><span class="n-num n-mu">${l.from || '?'}–${l.to || byLang('hoje', 'now')}</span></div>`).join('') || `<p class="n-mu">${byLang('Sem nomes anteriores.', 'No previous names.')}</p>`}</div>${S.titles.length ? `<span class="n-lbl">${byLang('Anos de título', 'Title years')}</span><div class="tp85-ty">${S.titles.map(y => K85.tag(String(y), y > (G.db.rules.startYear || 2027) - 1 ? 'p' : '')).join('')}</div>` : ''}${(lore.principals || []).length ? `<span class="n-lbl">${byLang('Chefes de equipe', 'Team principals')}</span>${K85.list((lore.principals || []).slice(-4).reverse().map(([n, a, b]) => ({ title: esc(n), tail: `<span class="n-num n-mu">${a}–${b || byLang('hoje', 'now')}</span>` })))}` : ''}` })) +
      K85.grid('minmax(0,1fr) minmax(0,1fr)', K85.card({ t: byLang('Empresa', 'Company'), body: K85.kv([[byLang('Dono', 'Owner'), esc((t.owner || {}).name || '—')], [byLang('Valor', 'Value'), typeof Owners !== 'undefined' && Owners.value ? fmtMoney(Owners.value(G, t)) : '—'], [byLang('Orçamento', 'Budget'), fmtMoney(t.budget)], [byLang('Reputação', 'Reputation'), Math.round(t.reputation)], [byLang('Instalações', 'Facilities'), Math.round(t.facilities)], [byLang('Motor', 'Engine'), esc(Engine.engineOf(G.db, t).name) + (t.works ? byLang(' (fábrica)', ' (works)') : '')]]) }),
        K85.card({ t: byLang('Patrocinadores', 'Sponsors'), body: `<div class="tp85-sp">${(t.sponsors || []).map(n => { const u = typeof Assets !== 'undefined' && Assets.logoByName('sponsors', n); return u ? `<span class="sp85-l" title="${esc(n)}"><img src="${u}" alt="${esc(n)}"></span>` : `<span class="sp85-l txt">${esc(n)}</span>`; }).join('') || '—'}</div>` }));
  },
};

/* ---------------- Conselho da FIA (documento) ---------------- */
(function () {
  if (typeof councilProp !== 'function') return;
  const cp = councilProp;
  councilProp = function (pr, open) {
    const html = cp(pr, open);
    const T = open ? Council.tally(G, pr, false) : { yes: pr.yes, no: pr.no, und: pr.abst, need: pr.need };
    const n = G.db.teams.length; const fia = (typeof Assets !== 'undefined' && Assets.logoByName('institutions', 'FIA'));
    const head = `<div class="doc85-h">${fia ? `<img src="${fia}" alt="FIA">` : '<b class="doc85-fia">FIA</b>'}<div><b>${byLang('Comissão de Fórmula 1', 'F1 Commission')}</b><span>${esc(Council.CATS[pr.cat] || '')} · ${pr.eff === 'now' ? byLang('vale nesta temporada', 'applies this season') : byLang('vale em', 'applies in') + ' ' + pr.eff}</span></div></div>
      <div class="doc85-s"><span class="y"><small>${byLang('A favor', 'For')}</small><b>${T.yes}</b></span><span><small>${open ? byLang('Indecisas', 'Undecided') : byLang('Abstenções', 'Abstained')}</small><b>${T.und || Math.max(0, n - T.yes - T.no)}</b></span><span class="n"><small>${byLang('Contra', 'Against')}</small><b>${T.no}</b></span><span class="need"><small>${byLang('Precisa', 'Needs')}</small><b>${T.need}</b></span></div>
      <div class="doc85-bar"><i class="y" style="width:${T.yes / n * 100}%"></i><i class="n" style="width:${T.no / n * 100}%"></i><em style="left:${T.need / n * 100}%"></em></div>`;
    return html.replace('<div class="panel cp">', `<div class="panel cp doc85">${head}`);
  };
  const old = SCREENS.council;
  SCREENS.council = {
    html() {
      let h = old.html.call(this);
      h = h.replace(/<div class="page-head">[\s\S]*?<\/h1><\/div><\/div>/, fiaHero85());
      h = h.replace(/<p class="small muted" style="max-width:980px;margin:-4px 0 14px">([\s\S]*?)<\/p>/, (m, txt) => `<div class="n-help">${txt}</div>`);
      return h;
    },
    after() { if (old.after) old.after.call(this); },
  };
})();

/* faixa do Conselho: logo da FIA e o plenário da Comissão (FIA, Fórmula 1 e as equipes, agrupadas pelo motor) */
function fiaHero85() {
  const fia = typeof Assets !== 'undefined' && Assets.logoByName('institutions', 'FIA');
  const C = Council.ensure(G); const nx = Council.nextMeeting ? Council.nextMeeting(G) : null;
  const eng = (t) => { try { return Engine.engineOf(G.db, t).name || ''; } catch (e) { return ''; } };
  const teams = G.db.teams.slice().sort((a, b) => eng(a).localeCompare(eng(b)) || a.name.localeCompare(b.name));
  const seats = [{ c: '#1B3E8C', l: 'FIA' }, { c: '#E10600', l: 'F1' }, ...teams.map(t => ({ c: t.color, l: t.short || teamAbbr(t.name), me: t.id === G.player.teamId, n: t.name + ' · ' + eng(t) }))];
  const N = seats.length, W = 300, H = 160, cx = W / 2, cy = H - 14, R = 118;
  const dots = seats.map((x, i) => { const a = Math.PI - (i + 0.5) / N * Math.PI; const px = cx + R * Math.cos(a), py = cy - R * Math.sin(a);
    return `<g class="fh-seat" style="animation-delay:${i * 45}ms"><circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${x.me ? 15 : 13}" fill="${x.c}" stroke="${x.me ? 'var(--fg)' : 'rgba(255,255,255,.25)'}" stroke-width="${x.me ? 3 : 1}"><title>${esc(x.n || x.l)}</title></circle><text x="${px.toFixed(1)}" y="${(py + 3.5).toFixed(1)}" text-anchor="middle">${esc(String(x.l).slice(0, 3))}</text></g>`; }).join('');
  const need = Math.ceil(G.db.teams.length * 0.6), needNow = Math.ceil(G.db.teams.length * 0.8);
  return `<section class="fia85">
    <div class="fia85-logo">${fia ? `<img src="${fia}" alt="FIA">` : '<b>FIA</b>'}</div>
    <div class="fia85-t"><span class="n-eyebrow">${byLang('Fédération Internationale de l’Automobile', 'Fédération Internationale de l’Automobile')}</span><h1>${byLang('Conselho da FIA', 'FIA Council')}</h1>
      <p>${byLang('Comissão de Fórmula 1', 'Formula 1 Commission')} · ${byLang('temporada', 'season')} ${G.season.year}${nx ? ` · ${byLang('próxima reunião depois da etapa', 'next meeting after round')} ${nx}` : ''}</p>
      <div class="fia85-k"><span><small>${byLang('Para aprovar', 'To pass')}</small><b>FIA + F1 + ${need}/${G.db.teams.length}</b></span><span><small>${byLang('Para valer já', 'To apply now')}</small><b>${needNow}/${G.db.teams.length}</b></span></div></div>
    <svg class="fia85-hemi" viewBox="0 0 ${W} ${H}" aria-label="${byLang('Plenário da Comissão', 'Commission seats')}">${dots}<text class="fh-c" x="${cx}" y="${cy - 30}" text-anchor="middle">${N}</text><text class="fh-s" x="${cx}" y="${cy - 12}" text-anchor="middle">${byLang('votos', 'votes')}</text></svg>
  </section>`;
}

/* ---------------- Notícias (jornal) ---------------- */
(function () {
  const old = SCREENS.news;
  const TAGL = (k) => (typeof Media !== 'undefined' && Media.TAGS && Media.TAGS[k]) || NEWS_TAGS85[k] || k || 'Paddock';
  SCREENS.news = {
    html() {
      const tab = UI.params.tab || 'top';
      if (tab === 'social') return SCREENS.social.html();
      if (tab !== 'top') return old.html.call(this);
      const tag = UI.params.tag || 'all';
      const all = G.news || []; const tags = ['all', ...new Set(all.map(n => n.tag).filter(Boolean))];
      const list = all.filter(n => tag === 'all' || n.tag === tag);
      const [lead, s1, s2, ...rest] = list;
      const art = (n, cls) => n ? `<article class="${cls}">${cls === 'pp-lead' ? newsImg(n, true) : ''}<span class="n-eyebrow">${esc(outletName(n))} · ${esc(TAGL(n.tag))}</span><h${cls === 'pp-lead' ? 2 : 3}>${esc(n.title)}</h${cls === 'pp-lead' ? 2 : 3}><p>${esc(n.body || '')}</p><small class="n-mu">${newsWhen(n)}</small></article>` : '';
      const tabsNav = [['top', byLang('Manchetes', 'Headlines')], ['social', byLang('Redes sociais', 'Social')], ['stories', byLang('Histórias e rivalidades', 'Stories and rivalries')]];
      return `<div class="paper85"><header class="pp-h"><span>${typeof Time !== 'undefined' ? esc(Time.fmt(G.today, true)) : G.season.year}</span><h1>${byLang('Paddock Diário', 'Paddock Daily')}</h1><span>${byLang('Edição da etapa', 'Round edition')} ${G.season.round}</span></header>
        <nav class="pp-n">${tabsNav.map(([k, l]) => `<button class="${k === tab ? 'on' : ''}" data-act="go" data-v="news" data-p='${esc(JSON.stringify({ tab: k }))}'>${l}</button>`).join('')}<span class="pp-sep"></span>${tags.map(k => `<button class="${k === tag ? 'on' : ''}" data-act="go" data-v="news" data-p='${esc(JSON.stringify({ tab: 'top', tag: k }))}'>${esc(k === 'all' ? byLang('Tudo', 'All') : TAGL(k))}</button>`).join('')}</nav>
        ${lead ? `<div class="pp-top">${art(lead, 'pp-lead')}<div class="pp-side">${art(s1, 'pp-s')}${art(s2, 'pp-s')}</div></div>` : K85.empty(byLang('Sem notícias.', 'No news.'))}
        <div class="pp-cols">${rest.slice(0, 24).map(n => art(n, 'pp-c')).join('')}</div></div>`;
    },
    after() { if (old.after) old.after.call(this); },
  };
})();

/* ---------------- Redes sociais (feed) ---------------- */
SCREENS.social = {
  html() {
    const S = (G.social || []).slice(0, 60);
    const who = (s) => { const d = s.by && s.by.kind === 'driver' && Career.driver(G, s.by.ref); const t = s.by && s.by.kind === 'team' && Career.team(G, s.by.ref); return { d, t }; };
    const top = S.slice().sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 5);
    const card = (s) => { const { d, t } = who(s); const col = d && d.team ? teamColor(d.team) : t ? t.color : 'var(--mu2)';
      return `<article class="sc85" style="--tc:${col}"><div class="sc85-h">${d ? K85.av(d, 42) : t && imgUrl(t.logo) ? `<span class="n-av sc85-tl" style="width:42px;height:42px;background:${t.color}"><img src="${imgUrl(t.logo)}" alt=""></span>` : `<span class="n-av" style="width:42px;height:42px">${esc(initials(s.by ? s.by.name : '?'))}</span>`}<span><b>${esc(s.by ? s.by.name : '')}</b>${(d || t) ? '<i class="sc85-v" title="Conta verificada">✓</i>' : ''}<small>@${esc((s.by && s.by.handle) || '')} · ${byLang('etapa', 'round')} ${s.r ?? ''}</small></span></div>
        <p>${esc(s.text)}</p>${s.img && imgUrl(s.img) ? `<img class="sc85-img" src="${imgUrl(s.img)}" alt="">` : ''}
        <div class="sc85-f"><span>♥ ${typeof fmtCount === 'function' ? fmtCount(s.likes || 0) : s.likes}</span><span>↻ ${typeof fmtCount === 'function' ? fmtCount(s.reposts || 0) : s.reposts}</span>${s.kind ? K85.tag(esc({ clash: byLang('polêmica', 'clash'), win: byLang('vitória', 'win'), fan: byLang('torcida', 'fans'), joke: byLang('humor', 'humour') }[s.kind] || s.kind), s.kind === 'clash' ? 'r' : '') : ''}</div></article>`; };
    return K85.head({ t: byLang('Redes sociais', 'Social media'), s: byLang('O que pilotos, equipes, jornalistas e torcedores estão dizendo', 'What drivers, teams, journalists and fans are saying'), act: K85.btn(byLang('Notícias', 'News'), { act: 'go', v: 'news' }) }) +
      `<div class="sc85-g"><div class="sc85-feed">${S.map(card).join('') || K85.empty(byLang('Nada por aqui ainda.', 'Nothing here yet.'))}</div>
        <aside class="n-col">${K85.card({ t: byLang('Em alta', 'Trending'), flush: true, body: K85.list(top.map((s, i) => ({ lead: `<span class="n-pos">${i + 1}</span>`, title: esc(s.text), sub: `${esc(s.by ? s.by.name : '')} · ♥ ${typeof fmtCount === 'function' ? fmtCount(s.likes || 0) : s.likes}` }))) })}
          ${K85.card({ t: byLang('Pilotos mais populares', 'Most popular drivers'), flush: true, body: K85.list(G.db.drivers.filter(d => d.team && d.seat).sort((a, b) => (b.popularity || 0) - (a.popularity || 0)).slice(0, 8).map(d => ({ lead: K85.av(d, 30), title: esc(d.name), tail: `<span style="width:90px">${K85.bar(d.popularity || 0, 100, teamColor(d.team))}</span>`, do: { act: 'driverPage', id: d.id } }))) })}</aside></div>`;
  },
};

/* ---------------- Fim de temporada (modelo B) ---------------- */
SCREENS.seasonEnd = {
  html() {
    const sd = Career.standingsD(G), sc = Career.standingsC(G);
    const ch = Career.driver(G, sd[0].did); const ct = Career.team(G, sc[0].tid); const team = Career.isObs(G) ? null : Career.team(G);
    const myPos = team ? sc.findIndex(x => x.tid === team.id) + 1 : 0; const f = K85.face(ch);
    const prize = G.db.rules.prizePerPosition ? G.db.rules.prizePerPosition[myPos - 1] : null;
    const regNext = (G.history.length + 1) % (G.db.rules.regulationChangeEvery || 4) === 0;
    return K85.head({ t: byLang(`Temporada ${G.season.year}`, `${G.season.year} season`), s: byLang('Encerrada · campeões, avaliação e o que vem a seguir', 'Finished · champions, review and what comes next'), act: K85.btn(byLang(`Iniciar temporada ${G.season.year + 1}`, `Start ${G.season.year + 1} season`), { act: 'nextSeason', kind: 'primary' }) }) +
      `<section class="se85" style="--tc:${teamColor(ch.team)};--tw:${ct.color}">${f ? `<img src="${f}" alt="">` : '<span></span>'}<div class="se85-c"><span class="n-eyebrow">${byLang('Campeão mundial de pilotos', 'World Drivers’ Champion')}</span><h2>${esc(ch.firstName || '')}<b>${esc(ch.lastName || ch.name)}</b></h2><p>${esc(Career.team(G, ch.team).name)} · ${sd[0].pts} pts · ${sd[0].st.wins} ${byLang('vitórias', 'wins')} · ${sd[0].st.podiums} ${byLang('pódios', 'podiums')} · ${sd[0].st.poles} poles</p></div>
        <div class="se85-t">${imgUrl(ct.logo) ? `<img src="${imgUrl(ct.logo)}" alt="">` : ''}<span class="n-eyebrow">${byLang('Campeã de construtores', 'Constructors’ Champion')}</span><b>${esc(ct.name)}</b><span>${sc[0].pts} pts · ${sc[1] ? '+' + (sc[0].pts - sc[1].pts) + ' ' + byLang('sobre', 'over') + ' ' + esc(Career.team(G, sc[1].tid).name) : ''}</span></div></section>` +
      K85.grid('minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)', K85.card({ t: byLang('Pilotos', 'Drivers'), flush: true, body: K85.table([['', 'c'], [byLang('Piloto', 'Driver')], [byLang('V', 'W'), 'c'], ['Pts', 'r']], sd.slice(0, 12).map((x, i) => [K85.pos(i + 1), K85.who(x.did), x.st.wins, `<b class="n-num">${x.pts}</b>`]), { hl: (i) => team && Career.driver(G, sd[i].did).team === team.id }) }),
        K85.card({ t: byLang('Construtores', 'Constructors'), flush: true, body: K85.table([['', 'c'], [byLang('Equipe', 'Team')], ['Pts', 'r']], sc.map((x, i) => [K85.pos(i + 1), K85.tm(x.tid), `<b class="n-num">${x.pts}</b>`]), { hl: (i) => team && sc[i].tid === team.id }) }),
        team ? K85.col(K85.card({ t: byLang('Sua avaliação', 'Your review'), body: `<div class="se85-ev">${K85.gauge(Math.max(1, G.db.teams.length - myPos + 1), G.db.teams.length, ordinal(myPos), myPos <= G.board.target ? 'var(--green)' : 'var(--red)')}<span>${byLang('Meta', 'Target')}: <b>${ordinal(G.board.target)}</b> · ${myPos <= G.board.target ? byLang('cumprida', 'met') : byLang('não cumprida', 'missed')}</span></div>${K85.kv([[byLang('Confiança da diretoria', 'Board confidence'), Math.round(G.board.confidence) + '%'], prize ? [byLang('Prêmio da F1', 'F1 prize money'), fmtMoney(prize)] : null, [byLang('Caixa', 'Cash'), fmtMoney(G.finances.balance)]])}` }),
          K85.card({ t: byLang('O que acontece agora', 'What happens next'), body: K85.list([{ title: byLang('Pilotos envelhecem e evoluem', 'Drivers age and develop') }, { title: byLang('Contratos vencem e o mercado se mexe', 'Contracts end and the market moves') }, { title: byLang('Patrocinadores renovam ou saem', 'Sponsors renew or leave') }, regNext ? { title: byLang('Regulamento novo: os carros são reembaralhados', 'New regulations: the order is reshuffled'), tail: K85.tag(byLang('novo', 'new'), 'y') } : { title: byLang('O carro novo é montado', 'The new car is built') }].concat(G.nextYearBank > 0 ? [{ title: byLang(`Desenvolvimento guardado: +${G.nextYearBank.toFixed(2)}`, `Banked development: +${G.nextYearBank.toFixed(2)}`), tail: K85.tag('P&D', 'g') }] : [])) })) : '');
  },
};
