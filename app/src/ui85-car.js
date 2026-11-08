/* ============================================================
   PIT WALL 0.8.5 — Carro, P&D e Fabricantes
   - Carro (modelo B): o carro com as áreas em destaque, posição no grid e radar
   - P&D (A + B): quadro por etapas e recursos no topo; planta e configurador abaixo
   - Fabricantes: fornecedor atual em detalhe, comparação de motores, pneus e movimentos
   ============================================================ */
'use strict';

function carAreas85(t) {
  const e = Engine.engineOf(G.db, t);
  return [
    ['aero', byLang('Aerodinâmica', 'Aerodynamics'), t.car.aero],
    ['chassis', byLang('Chassi', 'Chassis'), t.car.chassis],
    ['power', byLang('Potência', 'Power'), (e.power || 0) + (t.car.engineBonus || 0)],
    ['rel', byLang('Confiabilidade', 'Reliability'), Engine.reliability(G.db, t)],
    ['tyre', byLang('Gestão de pneus', 'Tyre management'), t.car.tyreCare ?? 80],
    ['cool', byLang('Refrigeração', 'Cooling'), t.car.cooling ?? 80],
    ['energy', byLang('Eficiência energética', 'Energy efficiency'), t.car.energy ?? 80],
  ];
}
SCREENS.car = {
  html() {
    const t = Career.team(G); const e = Engine.engineOf(G.db, t);
    const all = G.db.teams.map(x => ({ t: x, a: carAreas85(x), r: Engine.carRating(G.db, x) }));
    const mine = carAreas85(t);
    const rank = (i) => all.slice().sort((x, y) => y.a[i][2] - x.a[i][2]).findIndex(x => x.t.id === t.id) + 1;
    const best = (i) => Math.max(...all.map(x => x.a[i][2])); const avg = (i) => all.reduce((s, x) => s + x.a[i][2], 0) / all.length;
    const ovr = Engine.carRating(G.db, t); const ovrRank = all.slice().sort((x, y) => y.r - x.r).findIndex(x => x.t.id === t.id) + 1;
    const pos = [[16, 18], [44, 10], [76, 16], [86, 70], [12, 78], [44, 86], [70, 88]];
    const strong = mine.map((x, i) => [x, rank(i)]).sort((a, b) => a[1] - b[1]);
    const S = Mfr.ensure(G); const ctr = S.contracts[t.id] || {}; const m = Mfr.get(G, t.engine) || {};
    return K85.head({ t: `${t.chassisName || byLang('Carro', 'Car')} · ${t.name}`, s: `${esc(t.puName || e.name)} · ${byLang('equipe de pit', 'pit crew')} ${Math.round(t.pitCrew)} · ${byLang('nota geral', 'overall')} ${ovr.toFixed(1)} (${ordinal(ovrRank)} ${byLang('do grid', 'on the grid')})`, act: K85.btn(byLang('Novo projeto', 'New project'), { act: 'go', v: 'dev', kind: 'primary' }) + K85.btn(byLang('Fabricantes', 'Manufacturers'), { act: 'go', v: 'manufacturers' }) }) +
      `<section class="car85">${carImg(t) ? `<img src="${imgUrl(t.carImg)}" alt="${esc(t.name)}">` : ''}${mine.map((x, i) => `<span class="cco" style="left:${pos[i][0]}%;top:${pos[i][1]}%"><small>${esc(x[1])}</small><b class="n-num" style="color:var(--t-${K85.tone(x[2])})">${x[2].toFixed(1)}</b><em>${ordinal(rank(i))} ${byLang('no grid', 'on grid')}</em></span>`).join('')}
        <div class="car85-tags"><span>${byLang('Ponto forte', 'Strength')}<b>${esc(strong[0][0][1])}</b></span><span>${byLang('Ponto fraco', 'Weakness')}<b>${esc(strong[strong.length - 1][0][1])}</b></span></div></section>` +
      K85.grid('minmax(0,1.2fr) minmax(0,1fr)', K85.card({ t: byLang('Comparado ao grid', 'Against the grid'), a: `<i class="lgd x"></i>${byLang('melhor', 'best')} <i class="lgd a"></i>${byLang('média', 'average')}`, body: mine.map((x, i) => { const sc = (v) => Math.max(0, Math.min(100, (v - 60) / 40 * 100)); return `<div class="cmp85"><span>${esc(x[1])}</span><div class="cmp85-b"><em style="width:${sc(x[2])}%"></em><i class="a" style="left:${sc(avg(i))}%"></i><i class="x" style="left:${sc(best(i))}%"></i></div><b class="n-num">${x[2].toFixed(1)}</b><span class="n-mu n-sm">${ordinal(rank(i))}</span></div>`; }).join('') }),
        K85.col(K85.card({ t: byLang('Perfil do carro', 'Car profile'), body: K85.radar(mine.map(x => x[1].split(' ')[0]), [mine.map(x => x[2]), mine.map((x, i) => best(i))], { r: 104, min: 60, max: 100, colors: [t.color, '#2BD67B'], maxW: 380 }) + `<div class="mm-leg"><span><i style="background:${t.color}"></i>${esc(t.name)}</span><span><i style="background:#2BD67B"></i>${byLang('melhor do grid em cada área', 'best on the grid in each area')}</span></div>` }),
          K85.card({ t: byLang('Motor', 'Power unit'), a: `<a data-act="go" data-v="manufacturers">${byLang('detalhes do fornecedor', 'supplier details')}</a>`, body: `<div class="car85-pu">${mfrLogo85(m)}<div><b>${esc(m.name || e.name)}</b><span class="n-mu n-sm">${t.works ? byLang('equipe de fábrica', 'works team') : byLang('cliente', 'customer')}${ctr.until && ctr.until < 2090 ? ` · ${byLang('contrato até', 'deal until')} ${ctr.until}` : ''}</span></div></div>${K85.help(byLang('Preço, clientes, desenvolvimento e outros fornecedores estão na aba Fabricantes.', 'Price, customers, development and other suppliers are in the Manufacturers tab.'))}` }))) +
      K85.card({ t: byLang('Cada área no grid', 'Every area on the grid'), flush: true, body: K85.table([[byLang('Equipe', 'Team')], [byLang('Geral', 'Overall'), 'c'], ...mine.map(x => [x[1].split(' ')[0], 'c'])], all.sort((x, y) => y.r - x.r).map(x => [K85.tm(x.t.id), `<b class="n-num">${x.r.toFixed(1)}</b>`, ...x.a.map(v => `<span class="n-num" style="color:var(--t-${K85.tone(v[2])})">${v[2].toFixed(1)}</span>`)]), { hl: (i) => all[i].t.id === t.id }) });
  },
};
function mfrLogo85(m) {
  if (!m) return '';
  const own = (m.logo && imgUrl(m.logo)) || (typeof Assets !== 'undefined' && Assets.logoByName('manufacturers', m.name));
  if (own) return `<span class="mlogo"><img src="${own}" alt=""></span>`;
  const w = Mfr.worksOf ? Mfr.worksOf(G, m.id) : null;   // logo da equipe de fábrica (branco): fundo na cor da equipe
  if (w && imgUrl(w.logo)) return `<span class="mlogo team" style="background:${w.color}"><img src="${imgUrl(w.logo)}" alt=""></span>`;
  return `<span class="mlogo txt">${esc(String(m.name || '?').slice(0, 3).toUpperCase())}</span>`;
}

/* ---------------- P&D: quadro por etapas no topo ---------------- */
(function () {
  const old = SCREENS.dev;
  SCREENS.dev = {
    html() {
      const base = old.html.call(this);
      if (Career.isObs(G)) return base;
      const projs = (G.projects || []);
      const q = projs.filter(p => p.stage === 'queue');
      const des = projs.filter(p => !p.buildOnly && (p.stage === 'design' || (!p.dayMode && p.left > 0 && !p.stage)));
      const fab = projs.filter(p => p.stage === 'build' || p.buildOnly);
      const done = (G.log || []).filter(l => l.y === G.season.year && l.t === 'pd' && (l.tm || []).includes(G.player.teamId) && /pronta|instalad|conclu|ganho|completed|fitted/i.test(l.txt)).slice(-5).reverse();
      const card = (p) => { const tot = p.stage === 'design' ? Math.max(1, p.designDays || 1) : Math.max(1, (p.buildDays || 1) * (p.copies || 1)); const left = p.stage === 'design' ? p.dLeft : p.bLeft; const pct = p.dayMode ? Math.round((1 - (left || 0) / tot) * 100) : Math.round(((p.total || 1) - (p.left || 0)) / (p.total || 1) * 100);
        return `<div class="kt" style="--c:${p.next ? 'var(--blue)' : 'var(--team)'}"><b>${esc(p.name || Career.AREAS[p.area].name)}</b><span>${p.next ? byLang('carro de', 'car for') + ' ' + (G.season.year + 1) : byLang('carro atual', 'current car')}${p.staffName ? ' · ' + esc(p.staffName) : ''}</span>${K85.bar(pct, 100, p.next ? 'var(--blue)' : 'var(--team)')}<span>${p.dayMode ? (p.stage === 'design' ? byLang(`faltam ${p.dLeft} dias de desenho`, `${p.dLeft} design days left`) : byLang(`peça ${(p.fitted || []).length + 1} de ${p.copies} em ${p.bLeft} dias`, `part ${(p.fitted || []).length + 1} of ${p.copies} in ${p.bLeft} days`)) : `${p.left} GPs`}${p.min != null ? ` · +${p.min}–${p.max}` : ''}${p.risk != null ? ` · ${byLang('risco', 'risk')} ${p.risk}%` : ''}</span></div>`; };
      const P = typeof RnD !== 'undefined' && RnD.pool ? RnD.pool(G) : null;
      const team = Career.team(G); const slots = Career.slots(team); const used = projs.filter(p => !p.buildOnly).length;
      const cols = [[byLang('Vagas livres', 'Free slots'), Math.max(0, slots - used), null], [byLang('Desenho', 'Design'), des.length, des], [byLang('Fabricação', 'Manufacturing'), fab.length, fab], [byLang('Concluídas no ano', 'Done this year'), done.length, done]];
      const kan = `<div class="kan85">${cols.map(([n, c, list], i) => `<section class="kc"><h4>${n}<span class="n-num">${c}</span></h4>${i === 0 ? (c ? Array.from({ length: c }, () => `<div class="kt empty2">${byLang('Vaga livre', 'Free slot')} · <a data-act="devZone" data-z="floor">${byLang('configurar abaixo', 'set up below')}</a></div>`).join('') : `<div class="kt empty2">${byLang('Todas as vagas ocupadas', 'All slots in use')}</div>`) : i === 3 ? (list.map(l => `<div class="kt" style="--c:var(--green)"><span>${esc(l.txt)}</span></div>`).join('') || `<div class="kt empty2">${byLang('Nada ainda', 'Nothing yet')}</div>`) : (list.map(card).join('') || `<div class="kt empty2">${byLang('Nada aqui', 'Nothing here')}</div>`)}</section>`).join('')}</div>`;
      const res = P ? K85.grid('1fr 1fr 1fr', K85.stat(byLang('Túnel de vento', 'Wind tunnel'), `${P.wt}`, byLang('execuções neste período', 'runs this period'), 'b', `<div style="margin-top:8px">${K85.bar(P.wt, Math.max(P.wt, P.wtMax || RnD.BASE.wt || 320), 'var(--blue)')}</div>`), K85.stat('CFD', `${P.cfd}`, byLang('simulações neste período', 'simulations this period'), 'p', `<div style="margin-top:8px">${K85.bar(P.cfd, Math.max(P.cfd, P.cfdMax || RnD.BASE.cfd || 2000), 'var(--purple)')}</div>`), K85.stat(byLang('Teto: sobram', 'Cap room'), fmtMoney(Career.capRoom(G)), `${used}/${slots} ${byLang('vagas em uso', 'slots in use')}`, 't')) : '';
      // tira o cabeçalho antigo e o bloco "Seu carro" (agora na aba Carro)
      let b2 = base; const i0 = b2.indexOf('<div class="page-head">'); const iv = b2.indexOf(byLang('Vagas de projeto', 'Project slots'));
      if (i0 >= 0 && iv > i0) { const cut = b2.lastIndexOf('<div class="panel', iv); if (cut > i0) b2 = b2.slice(0, i0) + b2.slice(cut); }
      return K85.head({ t: byLang('Projetos de P&D', 'R&D projects'), s: `${used}/${slots} ${byLang('vagas em uso', 'slots in use')} · ${byLang('teto: sobram', 'cap room')} ${fmtMoney(Career.capRoom(G))}`, act: K85.btn(byLang('Carro', 'Car'), { act: 'go', v: 'car' }) }) + kan + b2;
    },
    after() { if (old.after) old.after.call(this); },
  };
})();

/* ---------------- Fabricantes ---------------- */
SCREENS.manufacturers = {
  html() {
    const S = Mfr.ensure(G); const mine = Career.isObs(G) ? null : Career.team(G);
    const tab = UI.params.tab || 'motores';
    const act = S.list.filter(m => m.active).map(m => ({ m, e: byId(G.db.engines, m.id) || {}, cust: Mfr.customers(G, m.id), w: Mfr.worksOf(G, m.id) })).sort((a, b) => (b.e.power || 0) - (a.e.power || 0));
    const best = (k) => Math.max(...act.map(x => k === 'eff' ? +x.m.eff || 0 : x.e[k] || 0));
    const head = K85.head({ t: byLang('Fabricantes', 'Manufacturers'), s: byLang(`Motores (até ${Mfr.CAP} clientes cada) e pneus · temporada ${G.season.year}`, `Power units (up to ${Mfr.CAP} customers each) and tyres · ${G.season.year} season`), tabs: [['motores', byLang('Motores', 'Power units')], ['pneus', byLang('Pneus', 'Tyres')], ['mov', byLang('Movimentos', 'Moves')]], tab });
    if (tab === 'pneus') return head + mfrTyres85();
    if (tab === 'mov') return head + mfrMoves85(S);
    const myC = mine && S.contracts[mine.id]; const myM = mine && Mfr.get(G, mine.engine); const myE = mine && byId(G.db.engines, mine.engine);
    const ring = (v, b, l) => `<span class="pu-r">${K85.ring(v, 64, '', false)}<small>${l}</small><em class="n-mu n-sm">${byLang('melhor', 'best')} ${Math.round(b)}</em></span>`;
    const hero = mine && myM ? `<section class="pu-hero" style="--tc:${(act.find(x => x.m.id === myM.id) || {}).w ? act.find(x => x.m.id === myM.id).w.color : 'var(--team)'}">
      <div class="pu-id">${mfrLogo85(myM)}<div><span class="n-eyebrow">${byLang('Seu fornecedor', 'Your supplier')}</span><h2>${esc(myM.name)}</h2><p class="n-mu">${mine.works ? byLang('Equipe de fábrica: o desenvolvimento do motor é seu (P&D e departamento de motores).', 'Works team: engine development is yours (R&D and engine department).') : `${byLang('Cliente', 'Customer')} · ${myC && myC.until < 2090 ? byLang('contrato até', 'deal until') + ' ' + myC.until : ''} · ${fmtMoney(Mfr.fee(G, mine))}${byLang('/ano', '/yr')}`}</p></div></div>
      <div class="pu-rs">${myE ? ring(myE.power || 0, best('power'), byLang('Potência', 'Power')) + ring(myE.reliability || 0, best('reliability'), byLang('Confiabilidade', 'Reliability')) + ring(+myM.eff || 0, best('eff'), byLang('Eficiência', 'Efficiency')) : ''}</div>
      <div class="pu-act">${!mine.works && myC && myC.until > G.season.year ? K85.btn(`${byLang('Rescindir', 'Terminate')} · ${fmtMoney(Mfr.breakFee(G, mine))}`, { act: 'mfrBreak', kind: 'ghost' }) : ''}${!mine.works && (!myC || myC.until <= G.season.year) ? K85.btn(byLang('Renovar para', 'Renew for') + ' ' + (G.season.year + 1), { act: 'mfrPick', id: mine.engine, kind: 'primary' }) : ''}</div></section>` : '';
    const card = (x) => { const { m, e, cust, w } = x; const isMine = mine && mine.engine === m.id; const canPick = mine && !mine.works && (!myC || myC.until <= G.season.year) && (m.id === mine.engine || Mfr.capacityLeft(G, m) > 0) && !(m.leaving && m.leaving <= G.season.year + 2);
      return `<div class="pu-c ${isMine ? 'me' : ''}"><div class="pu-ch">${mfrLogo85(m)}<span><b>${esc(m.name)}</b><small>${w ? byLang('fábrica', 'works') + ': ' + esc(w.name) : byLang('só fornecedor', 'supplier only')}${m.leaving ? ` · <span class="n-loss">${byLang('sai depois de', 'leaves after')} ${m.leaving - 1}</span>` : ''}</small></span>${isMine ? K85.tag(byLang('Seu motor', 'Yours'), 't') : ''}</div>
        ${[[byLang('Potência', 'Power'), e.power || 0, best('power')], [byLang('Confiabilidade', 'Reliability'), e.reliability || 0, best('reliability')], [byLang('Eficiência', 'Efficiency'), +m.eff || 0, best('eff')]].map(([l, v, b]) => `<div class="pu-m"><span>${l}</span>${K85.bar(Math.max(0, v - 60), 40, `var(--t-${K85.tone(v)})`)}<b class="n-num">${v.toFixed ? v.toFixed(1) : v}</b>${v >= b ? '<i class="n-tag g">1º</i>' : '<i></i>'}</div>`).join('')}
        <div class="pu-k">${K85.kv([[byLang('Preço por ano', 'Price per year'), m.fee ? fmtMoney(m.fee) : '—'], [byLang('Verba de desenvolvimento', 'Development budget'), m.dev ? fmtMoney(m.dev) : '—'], [byLang('Reputação', 'Reputation'), m.rep != null ? Math.round(m.rep) : '—'], [byLang('Na F1 desde', 'In F1 since'), m.since || '—']])}</div>
        <div class="pu-cu"><span class="n-lbl">${byLang('Clientes', 'Customers')} ${cust.length}/${Mfr.CAP}</span><div class="pu-sl">${Array.from({ length: Mfr.CAP }, (_, i) => { const t = cust[i]; return t ? `<span class="pu-s" style="--tc:${t.color}" title="${esc(t.name)}">${esc(t.short || teamAbbr(t.name))}</span>` : `<span class="pu-s free">${byLang('livre', 'free')}</span>`; }).join('')}</div></div>
        ${mine && !isMine ? `<div class="pu-a">${canPick ? K85.btn(byLang('Fechar para', 'Sign for') + ' ' + (G.season.year + 1), { act: 'mfrPick', id: m.id, sm: true }) : ''}${!mine.works && !w ? K85.btn(`${byLang('Pedir parceria de fábrica', 'Ask for works deal')} · ${Math.round(Mfr.worksChance(G, mine, m) * 100)}%`, { act: 'mfrWorks', id: m.id, sm: true, kind: 'ghost' }) : ''}</div>` : ''}</div>`; };
    // dispersão potência x confiabilidade
    const W = 520, H = 260, mg = { l: 42, r: 14, t: 14, b: 32 };
    const xs = act.map(x => x.e.power || 0), ys = act.map(x => x.e.reliability || 0);
    const x0 = Math.min(...xs) - 2, x1 = Math.max(...xs) + 2, y0 = Math.min(...ys) - 2, y1 = Math.max(...ys) + 2;
    const sx = (v) => mg.l + (v - x0) / ((x1 - x0) || 1) * (W - mg.l - mg.r), sy = (v) => H - mg.b - (v - y0) / ((y1 - y0) || 1) * (H - mg.t - mg.b);
    const scat = `<svg class="n-chart" viewBox="0 0 ${W} ${H}"><line class="gl" x1="${mg.l}" x2="${W - mg.r}" y1="${H - mg.b}" y2="${H - mg.b}"/><line class="gl" x1="${mg.l}" x2="${mg.l}" y1="${mg.t}" y2="${H - mg.b}"/><text class="gt" x="${W - mg.r}" y="${H - 8}" text-anchor="end">${byLang('potência →', 'power →')}</text><text class="gt" x="${mg.l - 6}" y="${mg.t + 8}" text-anchor="end">${byLang('confiab.', 'reliab.')}</text>${act.map(x => { const c = x.w ? x.w.color : '#7D8597'; const r = 8 + x.cust.length * 4; return `<g><circle cx="${sx(x.e.power || 0).toFixed(1)}" cy="${sy(x.e.reliability || 0).toFixed(1)}" r="${r}" fill="color-mix(in srgb, ${c} 45%, transparent)" stroke="${c}" stroke-width="2"/><text class="gx" x="${sx(x.e.power || 0).toFixed(1)}" y="${(sy(x.e.reliability || 0) - r - 4).toFixed(1)}" text-anchor="middle">${esc(x.m.name)}</text></g>`; }).join('')}</svg>`;
    const cands = S.list.filter(m => !m.active);
    return head + hero + K85.grid('minmax(0,1.3fr) minmax(0,1fr)', `<div class="pu-cs">${act.map(card).join('')}</div>`,
      K85.col(K85.card({ t: byLang('Potência × confiabilidade', 'Power × reliability'), a: byLang('tamanho = número de clientes', 'size = number of customers'), body: scat }),
        K85.card({ t: byLang('Fora da F1', 'Outside F1'), a: byLang('podem entrar como fornecedores', 'may enter as suppliers'), flush: true, body: cands.length ? K85.table([[byLang('Fabricante', 'Manufacturer')], [byLang('País', 'Country')], [byLang('Situação', 'Status')]], cands.map(m => [`<span class="n-tm">${mfrLogo85(m)}<b>${esc(m.name)}</b></span>`, natTag(m.country || ''), m.entering ? K85.tag(byLang('confirmado para', 'confirmed for') + ' ' + m.entering, 'g') : m.left ? K85.tag(byLang('saiu em', 'left in') + ' ' + m.left, 'r') : K85.tag(byLang('avaliando', 'considering'), 'y')])) : `<div style="padding:12px 16px">${K85.empty(byLang('Nenhum candidato.', 'No candidates.'))}</div>` }),
        K85.help(byLang('Contratos vencem no fim do ano indicado. Num regulamento novo, a força dos motores é reembaralhada. Um fabricante com equipe própria favorece a equipe de fábrica.', 'Deals end at the end of the year shown. A new rule set reshuffles engine strength. A manufacturer with its own team favours its works team.'))));
  },
};
function mfrTyres85() {
  const T = Mfr.tyres(G), cur = Mfr.tyreNow(G);
  const traits = Object.entries(Mfr.TYRES);
  const series = Object.entries(Mfr.SERIES_TYRES).map(([cid, tid]) => { const c = typeof Cats !== 'undefined' && Cats.get(G, cid); return c ? [c, Mfr.TYRES[tid], tid] : null; }).filter(Boolean);
  const count = {}; series.forEach(([, , tid]) => (count[tid] = (count[tid] || 0) + 1));
  const cols = ['#E10600', '#FFC93C', '#4DA3FF', '#2BD67B', '#B46BFF', '#FF8A3D', '#19D3C5', '#9AA0A8'];
  const parts = Object.keys(count).map((k, i) => ({ l: (Mfr.TYRES[k] || {}).name || k, v: count[k], c: cols[i % cols.length] }));
  return `<section class="ty-hero">${cur.logo && imgUrl(cur.logo) ? `<img src="${imgUrl(cur.logo)}" alt="">` : ''}<div><span class="n-eyebrow">${byLang('Fornecedora única da F1', 'Sole F1 supplier')}</span><h2>${esc(cur.name)}</h2><p class="n-mu">${byLang('até', 'until')} ${T.f1.until} · ${byLang('desde', 'since')} ${T.f1.since} · ${esc(byLang(...cur.note))}</p></div><div class="ty-k">${[[byLang('Desgaste', 'Wear'), cur.wear], [byLang('Aquecimento', 'Warm-up'), cur.warm]].map(([l, v]) => `<span><small>${l}</small><b class="n-num">${v.toFixed(2)}×</b>${K85.bar(v * 50, 100, v > 1 ? 'var(--orange)' : 'var(--green)')}</span>`).join('')}<span><small>${byLang('Licitação', 'Tender')}</small><b>${T.tender ? byLang('aberta', 'open') : (T.f1.until - 1)}</b></span></div></section>` +
    K85.grid('minmax(0,1.2fr) minmax(0,1fr)', K85.card({ t: byLang('Fabricantes de pneus', 'Tyre makers'), flush: true, body: K85.table([[byLang('Marca', 'Brand')], [byLang('Desgaste', 'Wear'), 'c'], [byLang('Aquecimento', 'Warm-up'), 'c'], [byLang('Característica', 'Character')], [byLang('Categorias', 'Series'), 'c']], traits.map(([k, x]) => [`<span class="n-tm">${x.logo && imgUrl(x.logo) ? `<img src="${imgUrl(x.logo)}" alt="" style="width:44px;height:20px;object-fit:contain">` : ''}<b>${esc(x.name)}</b>${k === T.f1.id ? K85.tag('F1', 't') : ''}</span>`, `<span class="n-num">${x.wear.toFixed(2)}×</span>`, `<span class="n-num">${x.warm.toFixed(2)}×</span>`, `<span class="n-sm">${esc(byLang(...(x.note || ['', ''])))}</span>`, count[k] || 0])) }),
      K85.col(K85.card({ t: byLang('Quem fornece cada categoria', 'Who supplies each series'), body: `<div class="ty-d">${K85.donut(parts, `<b>${series.length}</b><small>${byLang('categorias', 'series')}</small>`, 170)}${K85.legend(parts)}</div>` }),
        K85.card({ t: byLang('Histórico na F1', 'F1 history'), body: `<div class="ty-h">${T.hist.map(h => `<span><b class="n-num">${h.y}</b>${esc((Mfr.TYRES[h.id] || {}).name || h.id)}</span>`).join('')}</div>` })));
}
function mfrMoves85(S) {
  const K = { contrato: byLang('Contrato', 'Deal'), anuncio: byLang('Anúncio', 'Announcement'), estudo: byLang('Novo projeto em estudo', 'New project under study'), estreia: byLang('Estreia', 'Debut'), saida: byLang('Anuncia saída', 'Announces exit'), saiu: byLang('Saiu', 'Left'), heranca: byLang('Projeto herdado', 'Project taken over') };
  const log = (S.log || []).slice(0, 40);
  return K85.card({ t: byLang('Movimentos dos fabricantes', 'Manufacturer moves'), flush: true, body: log.length ? K85.table([[byLang('Ano', 'Year'), 'c'], [byLang('Tipo', 'Type')], [byLang('Fabricante', 'Manufacturer')], [byLang('Equipe', 'Team')], [byLang('Detalhe', 'Detail')]], log.map(x => { const m = Mfr.get(G, x.mid); const t = x.tid && Career.team(G, x.tid); return [x.y, K85.tag(K[x.kind] || x.kind, x.kind === 'saiu' || x.kind === 'saida' ? 'r' : x.kind === 'estreia' || x.kind === 'anuncio' ? 'g' : 'b'), m ? `<span class="n-tm">${mfrLogo85(m)}<b>${esc(m.name)}</b></span>` : esc(x.mid || ''), t ? K85.tm(t.id) : '—', esc(x.txt || (x.until ? byLang('até', 'until') + ' ' + x.until : x.year || ''))]; })) : `<div style="padding:12px 16px">${K85.empty(byLang('Nada ainda.', 'Nothing yet.'))}</div>` });
}
