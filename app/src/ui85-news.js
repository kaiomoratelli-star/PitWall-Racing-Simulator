/* ============================================================
   PIT WALL 0.8.5 — imagens das notícias
   - banco de fotos por tema (assets/img/news/<tema>-<n>.webp, Wikimedia Commons, licenças
     livres; autor e licença em assets/img/sources.json e na tela de créditos);
   - montagens feitas pelo jogo com as fotos dos pilotos, carros, logos e pistas:
     transferência, renovação, vitória, duelo, marca histórica e "rosto da notícia";
   - o tema sai da etiqueta e das palavras do título (chuva, batida, Safety Car, box, motor…).
   A escolha é fixa por notícia (mesma foto toda vez que ela aparece).
   ============================================================ */
'use strict';

const NEWSBANK85 = (() => {
  const out = {};
  if (typeof ASSET_REGISTRY === 'undefined') return out;
  for (const a of ASSET_REGISTRY) { const m = /^assets\/img\/news\/([a-z0-9]+)-\d+\.webp$/.exec(a.path); if (m) (out[m[1]] = out[m[1]] || []).push(a.path.replace(/^assets\/img\//, '')); }
  Object.values(out).forEach(l => l.sort());
  return out;
})();

/* tema da notícia: primeiro as palavras do título, depois a etiqueta */
const NEWSTHEME85 = [
  [/^F2[: ]|Fórmula 2|Formula 2/i, 'f2'], [/^F3[: ]|Fórmula 3|Formula 3/i, 'f3'], [/^INDY|IndyCar|Indianápolis|Indianapolis/i, 'indycar'], [/^NASCAR/i, 'nascar'],
  [/^WEC|Le Mans|Endurance/i, 'wec'], [/^FE[: ]|Fórmula E|Formula E|ePrix/i, 'formulae'], [/kart/i, 'karting'],
  [/chuva|molhad|rain|wet/i, 'rain'], [/safety car|bandeira vermelha|red flag|carro de segurança/i, 'safetycar'], [/batida|acidente|bate |crash|colis|abandona|quebra|falha/i, 'crash'],
  [/box|pit ?stop|parada|pit lane/i, 'pitstop'], [/motor|unidade de potência|power unit|engine/i, 'engine'], [/pneu|tyre|tire|Pirelli/i, 'tyres'],
  [/túnel|tunnel|fábrica|factory|simulador|simulator|atualiza|upgrade|peça|hacker/i, 'factory'], [/torcida|fãs|fans|enquete|poll|público/i, 'fans'],
  [/coletiva|entrevista|vídeo|video|press|declara|critica|discute|pesagem/i, 'press'], [/punição|punido|comissários|stewards|investiga|multa|penalty|regra|regulamento|Conselho|Federação|FIA/i, 'fia'],
  [/título|campeão|campeã|champion|title/i, 'trophy'], [/pódio|podium|vence|vitória|venceu|wins|victory/i, 'podium'], [/pole|largada|start|grid/i, 'start'],
  [/ultrapass|overtak|duelo|briga|batalha|battle/i, 'battle'], [/noite|night|Singapura|Singapore|Las Vegas/i, 'night'], [/apresenta|lança|launch|pintura|livery/i, 'launch'],
  [/aposent|retire|piloto do mês|driver of the month|assessor|capacete|helmet/i, 'helmet'], [/história|histórico|lenda|legend|anos de|homenag|tribute/i, 'history'],
  [/estrategista|engenheiro|diretor|chefe de|strategist|engineer|principal/i, 'pitwall'], [/mecânic|garagem|garage|equipe de box/i, 'garage'],
  [/patrocin|sponsor|parceri|contrato|acordo/i, 'paddock'],
];
const NEWSTAG85 = { corrida: 'battle', campeonato: 'trophy', mercado: 'paddock', rumor: 'paddock', regulamento: 'fia', escandalo: 'fia', paddock: 'paddock', historia: 'history', rivalidade: 'battle', financas: 'paddock', 'técnica': 'factory', tecnica: 'factory', staff: 'pitwall', categorias: 'f2', equipe: 'garage', geral: 'paddock' };
function newsTheme85(n) { const t = n.title || ''; for (const [re, k] of NEWSTHEME85) if (re.test(t) && NEWSBANK85[k]) return k; return NEWSBANK85[NEWSTAG85[n.tag]] ? NEWSTAG85[n.tag] : null; }
function newsHash85(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); }
function newsPhoto85(n, theme) { const l = NEWSBANK85[theme || newsTheme85(n)]; return l && l.length ? imgUrl(l[newsHash85(n.id + '|' + n.title) % l.length]) : null; }

/* recorte do piloto (foto de corpo inteiro com fundo transparente) ou retrato */
const cut85 = (d) => (d && d.img && /^drivers\//.test(d.img) ? imgUrl(d.img) : null);
const prevTeam85 = (d) => { const h = d && d.history; if (!Array.isArray(h)) return null; for (const x of h.slice().reverse()) { const id = (x.teams || [x.team]).filter(Boolean).find(t => t !== d.team); if (id && Career.team(G, id)) return Career.team(G, id); } return null; };

function newsMontage85(n) {
  const T = n.title || '';
  const d = n.dr && Career.driver(G, n.dr[0]); const d2 = n.dr && n.dr[1] && Career.driver(G, n.dr[1]);
  const t = (n.tm && Career.team(G, n.tm[0])) || (d && d.team && Career.team(G, d.team));
  const logo = (x) => (x && imgUrl(x.logo) ? `<img class="nm-lg" src="${imgUrl(x.logo)}" alt="">` : `<b class="nm-lt">${esc(x ? x.short || teamAbbr(x.name) : '')}</b>`);
  const person = (x, cls = '') => { const c = cut85(x); const f = K85.face(x); return c ? `<span class="nm-cut ${cls}" style="background-image:url('${c}')"></span>` : f ? `<span class="nm-face ${cls}"><img src="${f}" alt=""></span>` : ''; };
  const has = (x) => !!(cut85(x) || K85.face(x));
  // transferência, acordo, renovação
  if ((n.tag === 'mercado' || n.tag === 'rumor') && d && t && has(d)) {
    const renew = /renova|extends|renews/i.test(T) || (d.team === t.id && !/deixar|leave|troca/i.test(T));
    const from = renew ? null : (d.team && d.team !== t.id ? Career.team(G, d.team) : prevTeam85(d));
    const yr = (/(20\d\d)/.exec(T) || [])[1];
    const lbl = renew ? byLang('Renovação', 'Extension') : n.tag === 'rumor' ? byLang('Rumor', 'Rumour') : byLang('Transferência', 'Transfer');
    return `<div class="nimg nm85 nm-move" style="--a:${from ? from.color : '#2a2d36'};--b:${t.color}"><div class="nm-l">${from ? logo(from) : ''}</div><div class="nm-r">${logo(t)}</div>${from ? '<span class="nm-arrow">→</span>' : ''}${person(d)}<span class="nm-tag">${esc(lbl)}${yr ? ` · ${yr}` : ''}</span><span class="nm-name">${esc(d.name)}</span></div>`;
  }
  // duelo entre dois pilotos
  if (d && d2 && has(d) && has(d2) && (n.tag === 'rivalidade' || /duelo|discute|briga|contra|pressão|duel|clash|pressure/i.test(T))) {
    const ta = Career.team(G, d.team), tb = Career.team(G, d2.team);
    return `<div class="nimg nm85 nm-duel" style="--a:${ta ? ta.color : '#444'};--b:${tb ? tb.color : '#666'}">${person(d, 'a')}${person(d2, 'b')}<span class="nm-vs">VS</span><span class="nm-tag">${byLang('Duelo', 'Duel')}</span></div>`;
  }
  // vitória: pista ao fundo e o vencedor
  if (n.tag === 'corrida' && d && has(d) && /venc|vitória|wins|victory|festa/i.test(T)) {
    const tr = n.tr && Career.track(G, n.tr); const bg = (tr && imgUrl(tr.heroImg)) || newsPhoto85(n, 'podium');
    return `<div class="nimg nm85 nm-win" style="--a:${t ? t.color : '#E10600'};${bg ? `--bg:url('${bg}')` : ''}">${person(d)}<span class="nm-p1">P1</span><span class="nm-tag">${tr ? esc(tr.gp) : byLang('Vitória', 'Win')}</span>${t ? `<span class="nm-tl">${logo(t)}</span>` : ''}</div>`;
  }
  // marca histórica: número grande
  const mk = /(\d+)\s*(vitórias|pódios|poles|GPs|pontos|títulos|wins|podiums|titles|points)/i.exec(T);
  if (d && mk && has(d)) return `<div class="nimg nm85 nm-mark" style="--a:${t ? t.color : '#E10600'}"><span class="nm-num">${mk[1]}</span><span class="nm-unit">${esc(mk[2])}</span>${person(d)}</div>`;
  return '';
}

/* imagem de uma notícia: montagem, foto do banco com o rosto em destaque, ou a arte antiga */
function newsPic85(n, big) {
  try {
    const m = newsMontage85(n); if (m) return m;
    const ph = newsPhoto85(n);
    if (ph) {
      const d = n.dr && Career.driver(G, n.dr[0]); const t = (n.tm && Career.team(G, n.tm[0])) || (d && d.team && Career.team(G, d.team));
      const f = d && K85.face(d);
      return `<div class="nimg nm85 nm-photo ${n.tag === 'escandalo' ? 'dark' : ''}" style="--bg:url('${ph}');--a:${t ? t.color : '#E10600'}">${f ? `<span class="nm-badge"><img src="${f}" alt=""></span>` : t && imgUrl(t.logo) ? `<span class="nm-badge lg"><img src="${imgUrl(t.logo)}" alt=""></span>` : ''}</div>`;
    }
  } catch (e) { /* cai na arte antiga */ }
  return oldNewsImg85(n, big);
}
/* todas as telas que mostram notícia com imagem passam a usar a nova */
const oldNewsImg85 = newsImg;
newsImg = function (n, big) { return newsPic85(n, big); };

/* jornal: imagem na manchete, nas duas notícias ao lado e em parte das colunas */
(function () {
  const sc = SCREENS.news; if (!sc) return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    if ((UI.params.tab || 'top') !== 'top' || !G.news) return out;
    const tag = UI.params.tag || 'all';
    const list = G.news.filter(n => tag === 'all' || n.tag === tag);
    const byTitle = new Map(list.map(n => [esc(n.title), n]));
    let k = 0;
    let res = out;
    res = res.replace(/<article class="(pp-s|pp-c)">(<span class="n-eyebrow">[\s\S]*?<\/span>)<h3>([\s\S]*?)<\/h3>/g, (m0, cls, eye, title) => {
      const n = byTitle.get(title); if (!n) return m0;
      const show = cls === 'pp-s' || (k++ < 24 && k % 2 === 1);
      return show ? `<article class="${cls} has-img">${newsPic85(n, false)}${eye}<h3>${title}</h3>` : m0;
    });
    return res;
  };
})();

/* Central: a faixa de notícias e a matéria aberta também ganham a imagem nova */
(function () {
  const o = ACT.newsOpen; if (!o) return;
  ACT.newsOpen = (el) => { o(el); const n = G.news.find(x => String(x.id) === el.dataset.id); const box = document.querySelector('.narticle'); if (!n || !box) return; const old = box.querySelector('.nimg'); const html = newsPic85(n, true); if (old) old.outerHTML = html; else box.insertAdjacentHTML('afterbegin', html); };
})();

/* foto de fundo de uma pista: a própria (heroImg ou tracks/<id>-hero.webp) ou, se não houver,
   uma foto de corrida do banco (noturna para corridas à noite), sempre a mesma para a mesma pista */
function trackHero85(tr) {
  if (!tr) return null;
  if (tr.heroImg && (typeof Assets === 'undefined' || Assets.has(tr.heroImg))) return imgUrl(tr.heroImg);
  const own = `tracks/${tr.id}-hero.webp`; if (typeof Assets !== 'undefined' && Assets.has(own)) return imgUrl(own);
  const themes = ['battle', 'safetycar', 'start', 'flag'];   // fotos genéricas de pista (nada que mostre outra cidade)
  const avail = themes.filter(k => NEWSBANK85[k]); if (!avail.length) return null;
  const k = avail[newsHash85(tr.id) % avail.length];
  return newsPhoto85({ id: tr.id, title: tr.id }, k);
}
