/* ============================================================
   PIT WALL 0.8.5 — Finanças, Patrocinadores, Diretoria e dono
   Finanças: modelo A + rosca da B + mais gráficos e ferramentas de análise
   Patrocinadores: modelo B
   ============================================================ */
'use strict';

const FIN_CAT85 = { receita: ['Receitas', 'Revenue', '#2BD67B'], 'fábrica': ['Fábrica', 'Factory', '#4DA3FF'], 'salário': ['Salários', 'Salaries', '#B46BFF'], 'operação': ['Operação e viagens', 'Operations', '#FFC93C'], motor: ['Motor', 'Power unit', '#FF8A3D'], 'P&D': ['P&D', 'R&D', '#19D3C5'], marketing: ['Marketing', 'Marketing', '#FF5C8A'], infraestrutura: ['Infraestrutura', 'Infrastructure', '#9AA0A8'], staff: ['Funcionários', 'Staff', '#C9A227'], mercado: ['Mercado', 'Market', '#E10600'], academia: ['Academia', 'Academy', '#7D8597'], multa: ['Multas', 'Fines', '#FF4D5E'], reparo: ['Reparos', 'Repairs', '#6A7182'] };
const finCat85 = (k) => FIN_CAT85[k] ? byLang(FIN_CAT85[k][0], FIN_CAT85[k][1]) : (k || '—');
const finCol85 = (k, i) => FIN_CAT85[k] ? FIN_CAT85[k][2] : ['#4DA3FF', '#B46BFF', '#FFC93C', '#FF8A3D', '#19D3C5', '#9AA0A8'][i % 6];

SCREENS.finance = {
  html() {
    const F = G.finances; const team = Career.team(G); const y = G.season.year;
    const tab = UI.params.tab || 'visao';
    const L = F.ledger.filter(x => x.year === y);
    const cap = (typeof Econ !== 'undefined' && Econ.cap) ? Econ.cap(G) : G.db.rules.budgetCap;
    const played = Math.max(1, G.season.round); const left = G.season.calendar.length - G.season.round;
    const inc = L.filter(x => x.amount > 0).reduce((a, x) => a + x.amount, 0), exp = L.filter(x => x.amount < 0).reduce((a, x) => a + x.amount, 0);
    const net = (inc + exp) / played; const proj = F.balance + net * left;
    const payroll = Career.teamDrivers(G, team.id).reduce((a, d) => a + (d.salary || 0), 0) + (typeof Staff !== 'undefined' ? Staff.payroll(team) : 0);
    const capPct = F.spent / cap * 100; const capProj = typeof Econ !== 'undefined' && Econ.committed ? (F.spent + Econ.committed(G, team)) / cap * 100 : capPct / played * G.season.calendar.length;
    // por etapa
    const byR = {}; L.forEach(x => { const r = (x.round ?? 0) + 1; const o = byR[r] = byR[r] || { inc: 0, exp: 0 }; if (x.amount > 0) o.inc += x.amount; else o.exp += x.amount; });
    const rounds = Object.keys(byR).map(Number).sort((a, b) => a - b);
    let bal = F.balance; const balPts = [[G.season.round + 1, bal]]; rounds.slice().reverse().forEach(r => { bal -= byR[r].inc + byR[r].exp; balPts.push([r, bal]); }); balPts.sort((a, b) => a[0] - b[0]);
    // por categoria
    const cats = {}; L.forEach(x => { cats[x.cat] = (cats[x.cat] || 0) + x.amount; });
    const expParts = Object.entries(cats).filter(([, v]) => v < 0).sort((a, b) => a[1] - b[1]).map(([k, v], i) => ({ l: finCat85(k), v: -v, c: finCol85(k, i), k }));
    const src = {}; L.filter(x => x.amount > 0).forEach(x => { const k = /patroc|sponsor/i.test(x.desc) ? 'pat' : /prêmio|premio|prize|fom|comercial|commercial|direitos/i.test(x.desc) ? 'f1' : 'out'; src[k] = (src[k] || 0) + x.amount; });   // ids-ok: chave interna da fonte de renda
    const incParts = [['pat', byLang('Patrocínio', 'Sponsorship'), '#2BD67B'], ['f1', byLang('Fórmula 1 (prêmio e comercial)', 'Formula 1 (prize and commercial)'), '#4DA3FF'], ['out', byLang('Outras', 'Other'), '#FFC93C']].filter(([k]) => src[k]).map(([k, l, c]) => ({ l, v: src[k], c }));   // ids-ok: chave interna da fonte de renda
    // cascata
    const items = Object.entries(cats).sort((a, b) => b[1] - a[1]); let run = 0; const cum = [0]; items.forEach(([, v]) => { run += v; cum.push(run); }); const lo0 = Math.min(...cum), hi0 = Math.max(...cum); const span = (hi0 - lo0) || 1; const X = (v) => (v - lo0) / span * 100; run = 0;
    const wf = items.map(([k, v]) => { const from = run; run += v; return `<div class="wf"><span>${esc(finCat85(k))}</span><div class="wf-b"><i class="${v < 0 ? 'n' : 'p'}" style="left:${X(Math.min(from, run))}%;width:${Math.max(0.4, Math.abs(v) / span * 100)}%"></i></div><b class="n-num ${v < 0 ? 'n-loss' : 'n-gain'}">${v >= 0 ? '+' : ''}${fmtMoney(v)}</b></div>`; }).join('') + `<div class="wf tot"><span>${byLang('Resultado do ano', 'Year result')}</span><div class="wf-b"><i class="${run < 0 ? 'n' : 'p'}" style="left:${X(Math.min(0, run))}%;width:${Math.abs(run) / span * 100}%"></i></div><b class="n-num">${run >= 0 ? '+' : ''}${fmtMoney(run)}</b></div>`;
    const head = K85.head({ t: byLang('Finanças', 'Finance'), s: `${byLang('Temporada', 'Season')} ${y} · ${byLang('após', 'after')} ${G.season.round} ${byLang('etapas', 'rounds')}`, tabs: [['visao', byLang('Visão geral', 'Overview')], ['analise', byLang('Análise', 'Analysis')], ['extrato', byLang('Extrato', 'Statement')]], tab });
    const tiles = K85.grid('repeat(4,minmax(0,1fr))',
      K85.stat(byLang('Caixa', 'Cash'), fmtMoney(F.balance), byLang('projeção no fim do ano:', 'year-end projection:') + ' ' + fmtMoney(proj), F.balance < 0 ? 'r' : 't', `<div style="margin-top:6px">${K85.spark(balPts.map(p => p[1]), { w: 240, h: 34 })}</div>`),
      K85.stat(byLang('Receitas no ano', 'Revenue this year'), fmtMoney(inc), `${fmtMoney(inc / played)} ${byLang('por etapa', 'per round')}`, 'g'),
      K85.stat(byLang('Despesas no ano', 'Spending this year'), fmtMoney(-exp), `${fmtMoney(-exp / played)} ${byLang('por etapa', 'per round')}`, 'r'),
      K85.stat(byLang('Resultado por GP', 'Net per GP'), `${net >= 0 ? '+' : ''}${fmtMoney(net)}`, `${byLang('folha fixa', 'fixed payroll')} ${fmtMoney(payroll)}${byLang('/ano', '/yr')}`, net < 0 ? 'r' : 'g'));
    if (tab === 'extrato') {
      const cf = UI.params.cat || 'all'; const catsAll = [...new Set(F.ledger.map(x => x.cat))];
      const rows = F.ledger.filter(x => cf === 'all' || x.cat === cf).slice(0, 200);
      return head + tiles + K85.card({ t: byLang('Extrato', 'Statement'), a: `<div class="n-tabs">${['all', ...catsAll].map(c => `<button class="${c === cf ? 'on' : ''}" data-act="go" data-v="finance" data-p='${esc(JSON.stringify({ tab: 'extrato', cat: c }))}'>${esc(c === 'all' ? byLang('Tudo', 'All') : finCat85(c))}</button>`).join('')}</div>`, flush: true, body: K85.table([[byLang('Ano · etapa', 'Year · round')], [byLang('Lançamento', 'Entry')], [byLang('Categoria', 'Category')], [byLang('Entrada', 'In'), 'r'], [byLang('Saída', 'Out'), 'r']], rows.map(x => [`<span class="n-num n-mu">${x.year} · ${(x.round ?? 0) + 1}</span>`, esc(x.desc), `<span class="fin-c"><i style="background:${finCol85(x.cat, 0)}"></i>${esc(finCat85(x.cat))}</span>`, x.amount > 0 ? `<span class="n-num n-gain">${fmtMoney(x.amount)}</span>` : '', x.amount < 0 ? `<span class="n-num n-loss">${fmtMoney(-x.amount)}</span>` : '']), { maxH: 620 }) });
    }
    if (tab === 'analise') {
      const sc = Career.standingsC(G); const pts = {}; sc.forEach(s => (pts[s.tid] = s.pts));
      const eff = G.db.teams.map(t => ({ t, spent: t.id === team.id ? F.spent : (t.spent || 0), pts: pts[t.id] || 0 })).map(x => ({ ...x, per: x.pts ? x.spent / x.pts : null }));
      const effSorted = eff.slice().sort((a, b) => (a.per ?? 1e9) - (b.per ?? 1e9));
      const maxSpent = Math.max(...eff.map(x => x.spent), 1);
      const budgets = G.db.teams.slice().sort((a, b) => b.budget - a.budget);
      return head + tiles + K85.grid('minmax(0,1fr) minmax(0,1fr)',
        K85.card({ t: byLang('Gasto por ponto conquistado', 'Spending per point scored'), a: byLang('quanto menor, mais eficiente', 'lower is more efficient'), body: effSorted.map((x, i) => `<div class="n-hbar ${x.t.id === team.id ? 'me' : ''}"><span>${K85.tm(x.t.id, { logo: false })}</span>${K85.bar(x.per ? Math.min(100, x.per / Math.max(...eff.filter(e => e.per).map(e => e.per)) * 100) : 0, 100, x.t.color)}<b>${x.per ? fmtMoney(x.per) : '—'}</b></div>`).join('') }),
        K85.card({ t: byLang('Gasto dentro do teto × pontos', 'Spending under the cap × points'), body: (() => { const W = 520, H = 280, m = { l: 44, r: 14, t: 14, b: 30 }; const mp = Math.max(...eff.map(x => x.pts), 1); const lo = Math.min(...eff.map(x => x.spent)) * 0.97, hi = maxSpent * 1.01; const sx = (v) => m.l + (v - lo) / Math.max(hi - lo, 1) * (W - m.l - m.r - 40), sy = (v) => H - m.b - v / mp * (H - m.t - m.b); const used = []; return `<svg class="n-chart" viewBox="0 0 ${W} ${H}"><line class="gl" x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}"/><line class="gl" x1="${m.l}" x2="${m.l}" y1="${m.t}" y2="${H - m.b}"/><text class="gt" x="${W - m.r}" y="${H - 8}" text-anchor="end">${byLang('gasto (US$ mi) →', 'spent ($m) →')}</text><text class="gt" x="${m.l - 6}" y="${m.t + 6}" text-anchor="end">pts</text><text class="gt" x="${m.l}" y="${H - 8}">${fmtMoney(lo)}</text>${eff.map(x => `<g><circle cx="${sx(x.spent).toFixed(1)}" cy="${sy(x.pts).toFixed(1)}" r="${x.t.id === team.id ? 9 : 7}" fill="${x.t.color}" stroke="${x.t.id === team.id ? 'var(--fg)' : 'none'}" stroke-width="2"><title>${esc(x.t.name)}: ${fmtMoney(x.spent)} · ${x.pts} pts</title></circle><text class="gx" x="${(sx(x.spent) + 11).toFixed(1)}" y="${(() => { let y = sy(x.pts) + 4; while (used.some(u => Math.abs(u[0] - sx(x.spent)) < 40 && Math.abs(u[1] - y) < 11)) y -= 11; used.push([sx(x.spent), y]); return y.toFixed(1); })()}">${esc(x.t.short || teamAbbr(x.t.name))}</text></g>`).join('')}</svg>`; })() }),
        K85.card({ t: byLang('Receitas e despesas por etapa', 'Revenue and spending by round'), body: K85.cols(rounds.flatMap(r => [{ l: String(r), v: +byR[r].inc.toFixed(2), c: 'var(--green)' }, { l: '', v: +byR[r].exp.toFixed(2), c: 'var(--red)' }]), { h: 220, fmt: v => Math.round(v) }) + `<div class="mm-leg"><span><i style="background:var(--green)"></i>${byLang('receitas', 'revenue')}</span><span><i style="background:var(--red)"></i>${byLang('despesas', 'spending')}</span></div>` }),
        K85.card({ t: byLang('Orçamento das equipes', 'Team budgets'), body: budgets.map(t => `<div class="n-hbar ${t.id === team.id ? 'me' : ''}"><span>${K85.tm(t.id, { logo: false })}</span>${K85.bar(t.budget, budgets[0].budget, t.color)}<b>${fmtMoney(t.budget)}</b></div>`).join('') }));
    }
    // visão geral
    return head + tiles + K85.grid('minmax(0,1.25fr) minmax(0,1fr)',
      K85.col(K85.card({ t: byLang('Caixa ao longo da temporada', 'Cash through the season'), body: K85.lines([{ c: 'var(--team)', w: 2.6, area: true, pts: balPts, name: byLang('Caixa', 'Cash') }], { h: 210, fmt: v => Math.round(v), xlabels: balPts.filter((p, i) => i % 2 === 0).map(p => [p[0], 'E' + p[0]]) }) }),
        K85.card({ t: byLang('Para onde foi o dinheiro', 'Where the money went'), body: wf })),
      K85.col(K85.card({ t: byLang('Despesas por área', 'Spending by area'), body: `<div class="fin-d">${K85.donut(expParts, `<b class="n-num">${fmtMoney(-exp)}</b><small>${byLang('gasto no ano', 'spent this year')}</small>`, 190)}${K85.legend(expParts, v => fmtMoney(v))}</div>` }),
        K85.card({ t: byLang('De onde veio', 'Where it came from'), body: incParts.length ? `<div class="fin-d">${K85.donut(incParts, `<b class="n-num">${fmtMoney(inc)}</b><small>${byLang('receitas', 'revenue')}</small>`, 150)}${K85.legend(incParts, v => fmtMoney(v))}</div>` : K85.empty(byLang('Sem receitas ainda.', 'No revenue yet.')) }),
        K85.card({ t: byLang('Teto orçamentário', 'Budget cap'), a: fmtMoney(cap), body: `<div class="fin-cap"><div class="fin-capb"><i style="width:${Math.min(100, capPct)}%"></i><em style="left:${Math.min(100, capProj)}%" title="${byLang('projeção', 'projection')}"></em></div><div class="fin-capl"><span>${byLang('usado', 'used')}<b class="n-num">${Math.round(capPct)}%</b></span><span>${byLang('projeção no fim do ano', 'year-end projection')}<b class="n-num ${capProj > 100 ? 'n-loss' : ''}">${Math.round(capProj)}%</b></span><span>${byLang('sobram', 'room')}<b class="n-num">${fmtMoney(Career.capRoom(G))}</b></span></div></div>${K85.help(byLang('Fora do teto: salários dos pilotos e dos diretores mais caros, marketing e até US$ 30 mi por ano em instalações.', 'Outside the cap: driver salaries, the top directors, marketing and up to $30m a year on facilities.'))}` })));
  },
};

/* ---------------- Patrocinadores (modelo B) ---------------- */
const SP_OBJ85 = { finish: ['Terminar as corridas', 'Finish races'], points: ['Marcar pontos', 'Score points'], podium: ['Subir ao pódio', 'Reach the podium'], top5: ['Ficar no top 5', 'Finish top 5'], top10: ['Ficar no top 10', 'Finish top 10'], win: ['Vencer', 'Win'], exposure: ['Exposição na TV', 'TV exposure'] };
SCREENS.sponsors = {
  html() {
    const team = Career.team(G); const S = G.sponsors || [];
    const perRace = S.reduce((a, s) => a + (s.perRace || 0), 0); const nR = G.season.calendar.length;
    const avgSat = S.length ? S.reduce((a, s) => a + (s.satisfaction || 0), 0) / S.length : 0;
    const segs = {}; S.forEach(s => (segs[s.seg || '—'] = (segs[s.seg || '—'] || 0) + (s.perRace || 0)));
    const segParts = Object.entries(segs).map(([k, v], i) => ({ l: k, v, c: ['#2BD67B', '#4DA3FF', '#FFC93C', '#B46BFF', '#FF8A3D', '#19D3C5'][i % 6] }));
    const old = typeof sponsorsHtml === 'function' ? sponsorsHtml(team) : '';
    const card = (s) => { const u = typeof Assets !== 'undefined' && (Assets.logoByName('sponsors', s.name) || Assets.logoByName('manufacturers', s.name)); const sat = s.satisfaction || 0;
      return `<div class="sp85"><div class="sp85-h">${u ? `<span class="sp85-l"><img src="${u}" alt="${esc(s.name)}"></span>` : `<span class="sp85-l txt">${esc(s.name)}</span>`}<span><b>${esc(s.name)}</b><small>${esc(s.seg || '')}${s.brandTier ? ` · ${byLang('porte', 'tier')} ${s.brandTier}` : ''}</small></span>${K85.ring(sat, 52)}</div>
        ${K85.kv([[byLang('Por corrida', 'Per race'), fmtMoney(s.perRace)], [byLang('No ano', 'Per year'), fmtMoney((s.perRace || 0) * nR)], [byLang('Objetivo', 'Objective'), esc(SP_OBJ85[s.objective] ? byLang(...SP_OBJ85[s.objective]) : s.objective || '—')], [byLang('Bônus', 'Bonus'), s.bonus ? fmtMoney(s.bonus) : '—'], [byLang('Contrato', 'Contract'), s.seasons ? `${s.seasons} ${byLang('temporada(s)', 'season(s)')}` : '—'], s.clauseMin ? [byLang('Cláusula de desempenho', 'Performance clause'), `${byLang('mínimo', 'minimum')} ${ordinal(s.clauseMin)}`] : null])}</div>`; };
    return K85.head({ t: byLang('Patrocinadores', 'Sponsors'), s: `${S.length} ${byLang('contratos', 'deals')} · ${fmtMoney(perRace)} ${byLang('por corrida', 'per race')} · ${fmtMoney(perRace * nR)} ${byLang('no ano', 'per year')}` }) +
      K85.grid('repeat(3,minmax(0,1fr))', K85.stat(byLang('Receita por corrida', 'Revenue per race'), fmtMoney(perRace), '', 'g'), K85.stat(byLang('Satisfação média', 'Average satisfaction'), Math.round(avgSat) + '%', avgSat < 50 ? byLang('risco de perder contratos', 'deals at risk') : byLang('estável', 'stable'), avgSat < 50 ? 'r' : avgSat < 70 ? 'y' : 'g'), K85.stat(byLang('Espaços no carro', 'Car spaces'), `${S.length}/${Math.max(S.length, 6)}`, byLang('patrocínio principal e secundários', 'title and secondary partners'), 't')) +
      `<div class="sp85s">${S.map(card).join('') || K85.empty(byLang('Sem patrocinadores.', 'No sponsors.'))}</div>` +
      K85.grid('minmax(0,1.3fr) minmax(0,1fr)', K85.card({ t: byLang('Espaços no carro', 'Spaces on the car'), body: `<div class="livery85">${carImg(team) ? `<img src="${imgUrl(team.carImg)}" alt="">` : ''}${[[46, 30, byLang('Patrocinador principal', 'Title partner'), S[0]], [16, 62, byLang('Asa dianteira', 'Front wing'), S[1]], [82, 26, byLang('Asa traseira', 'Rear wing'), S[2]], [60, 66, byLang('Laterais', 'Sidepods'), S[3]], [30, 40, byLang('Cockpit', 'Cockpit'), S[4]]].map(([x, yy, l, s]) => `<span class="lv85 ${s ? '' : 'free'}" style="left:${x}%;top:${yy}%"><small>${l}</small><b>${s ? esc(s.name) : byLang('livre', 'free')}</b></span>`).join('')}</div>` }),
        K85.card({ t: byLang('Receita por segmento', 'Revenue by sector'), body: segParts.length ? `<div class="fin-d">${K85.donut(segParts, `<b class="n-num">${fmtMoney(perRace)}</b><small>${byLang('por corrida', 'per race')}</small>`, 150)}${K85.legend(segParts, v => fmtMoney(v))}</div>` : K85.empty('—') })) +
      (old ? `<div class="sp85-old">${old}</div>` : '');
  },
  after() { if (typeof bindCharts === 'function') bindCharts(); },
};

/* ---------------- Diretoria e dono ---------------- */
SCREENS.board = {
  html() {
    const team = Career.team(G); const b = G.board; const o = team.owner || {};
    const sc = Career.standingsC(G); const pos = sc.findIndex(x => x.tid === team.id) + 1;
    const value = typeof Owners !== 'undefined' && Owners.value ? Owners.value(G, team) : null;
    const prot = typeof Owners !== 'undefined' && Owners.protection ? Owners.protection(G, team) : null;
    const OT = { fundo: byLang('Fundo de investimento', 'Investment fund'), familia: byLang('Família', 'Family'), montadora: byLang('Montadora', 'Car maker'), bilionario: byLang('Bilionário', 'Billionaire'), empresa: byLang('Empresa', 'Company'), consorcio: byLang('Consórcio', 'Consortium'), grupo: byLang('Grupo', 'Group'), fabricante: byLang('Fabricante', 'Manufacturer') };
    const goals = [[byLang(`Terminar em ${ordinal(b.target)} entre os construtores`, `Finish ${ordinal(b.target)} in the Constructors`), pos <= b.target ? 'g' : pos <= b.target + 2 ? 'y' : 'r', pos <= b.target ? byLang('no caminho', 'on track') : byLang('em risco', 'at risk')], [byLang('Manter o caixa positivo', 'Keep cash positive'), G.finances.balance > 0 ? 'g' : 'r', G.finances.balance > 0 ? byLang('em dia', 'fine') : byLang('negativo', 'negative')], [byLang('Respeitar o teto orçamentário', 'Stay under the budget cap'), Career.capRoom(G) > 0 ? 'g' : 'r', Career.capRoom(G) > 0 ? byLang('em dia', 'fine') : byLang('estourado', 'breached')]];
    return K85.head({ t: byLang('Diretoria e dono', 'Board and owner'), s: `${esc(o.name || '—')} · ${esc(OT[o.type] || o.type || '')}` }) +
      `<section class="bd85"><div class="bd85-c">${K85.ring(b.confidence, 150, byLang('confiança', 'confidence'))}<span>${(b.lastDelta || 0) >= 0 ? '+' : ''}${(b.lastDelta || 0).toFixed(1)} ${byLang('na última corrida', 'last race')}</span></div>
        <div class="bd85-g">${K85.gauge(Math.max(1, G.db.teams.length - pos + 1), G.db.teams.length, ordinal(pos), pos <= b.target ? 'var(--green)' : 'var(--orange)')}<span>${byLang('Meta', 'Target')}: <b>${ordinal(b.target)}</b> · ${byLang('hoje', 'now')}: <b>${ordinal(pos)}</b></span></div>
        <div class="bd85-o"><span class="n-eyebrow">${byLang('O dono', 'The owner')}</span><h2>${esc(o.name || '—')}</h2>${[[byLang('Riqueza', 'Wealth'), o.wealth], [byLang('Ambição', 'Ambition'), o.ambition], [byLang('Paciência', 'Patience'), o.patience], [byLang('Humor', 'Mood'), team.ownerMood]].map(([l, v]) => `<div class="n-attr"><span>${l}</span>${K85.seg(v || 0, 100, K85.toneP(v || 0))}<b style="color:var(--fg2)">${Math.round(v || 0)}</b></div>`).join('')}</div></section>` +
      K85.grid('minmax(0,1fr) minmax(0,1fr)', K85.card({ t: byLang('O que a diretoria espera', 'What the board expects'), flush: true, body: K85.list(goals.map(([t2, c, l]) => ({ title: esc(t2), tail: K85.tag(l, c) }))) }),
        K85.card({ t: byLang('A empresa', 'The company'), body: K85.kv([[byLang('Valor da equipe', 'Team value'), value != null ? fmtMoney(value) : '—'], [byLang('Orçamento', 'Budget'), fmtMoney(team.budget)], [byLang('Dívida', 'Debt'), team.debt ? fmtMoney(team.debt) : '—'], [byLang('Aporte do dono', 'Owner funding'), team.ownerFunding != null ? fmtMoney(team.ownerFunding) : '—'], [byLang('Venda', 'Sale'), prot === 'nunca' ? byLang('protegida: nunca será vendida', 'protected: never sold') : prot === 'protegida20' ? byLang('só depois de 20 anos e uma crise forte', 'only after 20 years and a deep crisis') : byLang('pode ser vendida em crise', 'can be sold in a crisis')]]) + `<div style="margin-top:12px">${K85.btn(byLang('Donos de todas as equipes', 'All team owners'), { act: 'go', v: 'owners', sm: true })}</div>` }));
  },
};
(function () { const a = AREAS85.find(x => x[0] === 'financas'); if (a && !a[3].some(t => t[0] === 'board')) a[3].push(['board', 'Diretoria e dono']); OBS_HIDE85.add('board'); })();
