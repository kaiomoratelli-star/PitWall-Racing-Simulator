/* ============================================================
   PIT WALL — gerador automático de artes (cartões no formato das redes)
   Modelos: breaking/urgente (veículo de imprensa), oficial (equipe),
   resultado (pódio), campeão, número/marca e frase.
   Cada arte usa a foto do piloto, o logo da equipe e o do veículo (quando
   o logo foi baixado; senão, o nome em letra de manchete) e leva uma marca
   discreta "PitWall · simulação" para não ser confundida com publicação real.
   ============================================================ */
'use strict';

const Cards = {};
Cards.BR = new Set(['ge', 'gp']);
Cards.photo = (d) => {
  if (!d) return null;
  const f = typeof Assets !== 'undefined' && Assets.face ? Assets.face(d) : null;
  return f || (d.img ? imgUrl(d.img) : null);
};
Cards.outletMark = (oid) => {
  const o = Media.OUTLETS[oid] || { name: 'Paddock', handle: '' };
  const url = typeof Assets !== 'undefined' ? Assets.logoByName('media', o.name) : null;
  return url ? `<img class="ck-olog" src="${url}" alt="${esc(o.name)}" onerror="this.replaceWith(Object.assign(document.createElement('b'),{className:'ck-oword',textContent:'${esc(o.name).replace(/'/g, '')}'}))">` : `<b class="ck-oword">${esc(o.name)}</b>`;
};
Cards.teamMark = (t) => (t ? `<span class="ck-tlogo">${teamLogo(t, 'lg')}</span>` : '');
Cards.wm = () => `<span class="ck-wm">PitWall · ${byLang('simulação', 'simulation')}</span>`;
Cards.pic = (d, cls = '') => { const u = Cards.photo(d); return u ? `<img class="ck-pic ${cls}" src="${u}" alt="" loading="lazy" onerror="this.remove()">` : d && typeof Avatar !== 'undefined' ? `<span class="ck-pic ck-av ${cls}">${Avatar.svg(d)}</span>` : `<span class="ck-pic ck-ini ${cls}">${esc(d ? initials(d.name) : '')}</span>`; };
Cards.upper = (s) => esc(String(s || '').toUpperCase());

/* c: {kind, outlet, d, t, head, sub, podium:[d1,d2,d3], big} */
Cards.html = (c) => {
  const t = c.t, col = t ? t.color : '#e10600', col2 = t ? (t.color2 || '#15151e') : '#15151e';
  if (c.kind === 'breaking') {
    const word = Cards.BR.has(c.outlet) ? 'URGENTE' : 'BREAKING';
    return `<div class="ck ck-breaking" style="--tc:${col}"><div class="ck-top">${Cards.outletMark(c.outlet)}<span class="ck-word">${word}</span></div>
      <div class="ck-body">${Cards.pic(c.d)}<span class="ck-slash"></span>${Cards.teamMark(t)}</div>
      <div class="ck-foot"><div class="ck-name">${Cards.upper(c.head)}</div><div class="ck-sub">${Cards.upper(c.sub)}</div></div>${Cards.wm()}</div>`;
  }
  if (c.kind === 'official') {
    return `<div class="ck ck-official" style="--tc:${col};--tc2:${col2}"><div class="ck-top">${Cards.teamMark(t)}<span class="ck-word">${byLang('OFICIAL', 'OFFICIAL')}</span></div>
      <div class="ck-body">${Cards.pic(c.d)}</div>
      <div class="ck-foot"><div class="ck-sub">${byLang('BEM-VINDO', 'WELCOME')}</div><div class="ck-name">${Cards.upper(c.head)}</div><div class="ck-sub">${Cards.upper(c.sub)}</div></div>${Cards.wm()}</div>`;
  }
  if (c.kind === 'result') {
    const p = c.podium || [];
    return `<div class="ck ck-result" style="--tc:${col}"><div class="ck-top">${Cards.outletMark(c.outlet || Media.official())}<span class="ck-word">${byLang('RESULTADO', 'RESULT')}</span></div>
      <div class="ck-pod">${[1, 0, 2].map(i => p[i] ? `<div class="ck-step s${i + 1}">${Cards.pic(p[i], 'sm')}<b>P${i + 1}</b><span>${esc(p[i].name.split(' ').slice(-1)[0].toUpperCase())}</span></div>` : '').join('')}</div>
      <div class="ck-foot"><div class="ck-name">${Cards.upper(c.head)}</div><div class="ck-sub">${Cards.upper(c.sub)}</div></div>${Cards.wm()}</div>`;
  }
  if (c.kind === 'champion') {
    return `<div class="ck ck-champ" style="--tc:${col};--tc2:${col2}"><div class="ck-top">${Cards.teamMark(t)}<span class="ck-word">${byLang('CAMPEÃO MUNDIAL', 'WORLD CHAMPION')}</span></div>
      <div class="ck-body">${Cards.pic(c.d)}</div>
      <div class="ck-foot"><div class="ck-name">${Cards.upper(c.head)}</div><div class="ck-sub">${Cards.upper(c.sub)}</div></div>${Cards.wm()}</div>`;
  }
  return '';
};

/* arte automática a partir de uma postagem */
Cards.forPost = (p) => {
  const d = p.about && Career.driver(G, p.about);
  if (p.kind === 'signing' && d) {
    const ft = d.futureTeam ? Career.team(G, d.futureTeam.team) : d.team ? Career.team(G, d.team) : null;
    return Cards.html({ kind: 'official', d, t: ft, head: d.name, sub: ft ? byLang(`na ${ft.name} em ${(p.y || G.season.year) + 1}`, `joins ${ft.name} for ${(p.y || G.season.year) + 1}`) : '' });
  }
  if (p.kind === 'rumor' && d && p.by && p.by.ref) {
    const t = p.team ? Career.team(G, p.team) : p.aboutTeam ? Career.team(G, p.aboutTeam) : null;
    return Cards.html({ kind: 'breaking', outlet: p.by.ref, d, t, head: d.name, sub: t ? byLang(`acordo com a ${t.name} para ${(p.y || G.season.year) + 1}`, `deal with ${t.name} for ${(p.y || G.season.year) + 1}`) : byLang('negociação avançada', 'talks at an advanced stage') });
  }
  if (p.kind === 'title' && d && d.team && p.by && p.by.kind === 'driver') {
    return Cards.html({ kind: 'champion', d, t: Career.team(G, d.team), head: d.name, sub: String(p.y || G.season.year) });
  }
  if (p.kind === 'win' && d && d.team) {
    const res = (G.season.results || []).find(r => r.winner === d.id && G.season.year === p.y && r.round === p.r) || G.season.results[G.season.results.length - 1];
    const pod = res && res.cls ? res.cls.slice(0, 3).map(x => Career.driver(G, x.did)).filter(Boolean) : [d];
    const tr = res && Career.track(G, res.trackId);
    return Cards.html({ kind: 'result', outlet: Media.official(), d, t: Career.team(G, d.team), podium: pod, head: tr ? tr.gp : '', sub: `${d.name} ${byLang('vence', 'wins')}` });
  }
  return '';
};

/* ---------- ganchos: linha do tempo, notícias e galeria ---------- */
(function () {
  const feed = socialFeedHtml;
  socialFeedHtml = function (list, max, compact) {
    let html = feed(list, max, compact);
    if (compact) return html;
    // insere a arte depois do texto de cada postagem que tem modelo
    list.slice(0, max).forEach(p => {
      const card = Cards.forPost(p);
      if (!card) return;
      const mark = `data-id="${p.id}" aria-label="`;
      const i = html.indexOf(mark);
      if (i < 0) return;
      const j = html.indexOf('</div>', html.lastIndexOf('<div class="stext">', i));
      if (j > 0) html = html.slice(0, j + 6) + `<div class="ck-wrap">${card}</div>` + html.slice(j + 6);
    });
    return html;
  };
  const img = newsImg;
  newsImg = function (n, big) {
    if (big && n.dr && ['mercado', 'rumor', 'campeonato'].includes(n.tag)) {
      const d = Career.driver(G, n.dr[0]);
      const t = n.tm && Career.team(G, n.tm[0]) || (d && d.team && Career.team(G, d.team));
      if (d && Cards.photo(d)) return `<div class="nimg cardimg">${Cards.html(n.tag === 'campeonato' && d.team ? { kind: 'champion', d, t, head: d.name, sub: String(n.year), outlet: n.outlet } : { kind: 'breaking', outlet: n.outlet, d, t, head: d.name, sub: n.title.length > 60 ? n.title.slice(0, 58) + '…' : n.title })}</div>`;
    }
    return img(n, big);
  };
  const nh = SCREENS.news.html;
  SCREENS.news.html = function () {
    if (UI.params.tab !== 'art') return nh.call(this).replace(`<button class="" data-act="go" data-v="news" data-p='{"tab":"stories"}'>`, `<button class="" data-act="go" data-v="news" data-p='{"tab":"art"}'>${byLang('Artes', 'Graphics')}</button><button class="" data-act="go" data-v="news" data-p='{"tab":"stories"}'>`);
    const posts = (G.social || []).map(p => ({ p, c: Cards.forPost(p) })).filter(x => x.c).slice(0, 24);
    return `<div class="page-head"><div><div class="eyebrow">Paddock</div><h1>${byLang('Artes', 'Graphics')}</h1></div><button class="btn" data-act="go" data-v="news">${byLang('Voltar às notícias', 'Back to news')}</button></div>
      <p class="small muted">${byLang('Artes geradas automaticamente a partir das postagens de equipes e veículos de imprensa do jogo. Todas são simulação.', 'Graphics generated automatically from in-game team and media posts. All are simulations.')}</p>
      <div class="ck-gallery">${posts.map(x => `<div>${x.c}<div class="small muted" style="margin-top:4px">${esc(x.p.by.name)} · ${x.p.y}</div></div>`).join('') || `<div class="empty">${byLang('As artes aparecem com vitórias, contratações e vazamentos.', 'Graphics appear with wins, signings and leaks.')}</div>`}</div>${disclaimerHtml(true)}`;
  };
})();
