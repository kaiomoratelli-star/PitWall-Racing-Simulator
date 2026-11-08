/* Conteúdo base das telas, parte 2: Mercado, Finanças, Mundo, Arquivo, Sistema. */
(function () {
'use strict';
const W = window.PW; const { D, PT, TM, esc, nf, money, moneyS, lap, dname, dlast, dabbr, drv, team, tcol, tname, flag, cal, nextGP, myDrivers, standDRows, standCRows, ROLE, NEWS_TAG, LOG_T, OWNER_T, OUTLET, tone, trackSvg, dateS, BASE } = W;

/* ===================== MERCADO ===================== */
const mval = (d) => Math.max(0.5, Math.round(((d.ovr - 68) ** 2) / 12 * 10) / 10);
BASE.market = (K, p) => {
  const tab = p.tab || 'vencendo';
  const pool = tab === 'livres' ? D.freeAgents : D.drivers.filter(d => d.team !== PT.id && d.contract && d.contract.until <= D.meta.year + 1);
  const rows = pool.slice().sort((a, b) => b.ovr - a.ovr).slice(0, 18);
  return K.page(K.head({ t: 'Mercado de pilotos', s: 'Janela aberta nas férias de verão · 3 conversas possíveis', tabs: [['vencendo', 'Contratos que vencem'], ['livres', 'Sem equipe'], ['observacao', 'Lista de observação']], tab }),
    K.grid('260px 1fr',
      K.card({ t: 'Filtros', body: `${K.field('Nota mínima', '75')}${K.field('Idade', '18 a 32')}${K.field('Categoria', 'Todas')}${K.field('Salário pedido até', 'US$ 15 mi')}<label class="ck"><input type="checkbox" checked> Só quem aceita conversar</label><label class="ck"><input type="checkbox"> Só pilotos da academia</label>` }),
      K.card({ flush: true, body: K.table([['Piloto'], ['Idade', 'c'], ['Nota', 'c'], ['Potencial'], ['Equipe atual'], ['Contrato até', 'c'], ['Valor', 'r'], ['', 'r']], rows.map(d => [K.who(d.id, d.team), d.age, K.ring(d.ovr, { size: 34 }), K.stars(d.pot >= 90 ? 5 : d.pot >= 86 ? 4.5 : d.pot >= 82 ? 4 : d.pot >= 78 ? 3.5 : 3), d.team ? esc(tname(d.team)) : '<span class="mu">livre</span>', d.contract ? d.contract.until : '—', money(mval(d)), K.btn('Negociar', { kind: 'sec', go: 'negotiation', p: { id: d.id } })])) })));
};

BASE.negotiation = (K, p) => {
  const d = drv(p.id) || D.drivers.find(x => x.team !== PT.id && x.contract && x.contract.until <= D.meta.year + 1) || D.drivers[0];
  const ask = Math.max(2, Math.round(mval(d) * 1.4));
  return K.page(K.head({ t: `Negociação · ${d.name}`, s: `Empresário: ${d.manager || 'agência própria'} · nota ${nf(d.ovr, 1)}`, act: K.btn('Voltar ao mercado', { kind: 'ghost', go: 'market' }) }),
    K.grid('1fr 1.2fr 1fr',
      K.card({ body: `<div class="ng-p">${K.av(d, 110)}<h3>${esc(d.name)}</h3><p class="mu">${flag(d.nat)} ${d.age} anos · ${esc(tname(d.team) || 'sem equipe')}</p>${K.kv([['Contrato atual', d.contract ? 'até ' + d.contract.until : '—'], ['Salário atual', money(d.contract && d.contract.salary)], ['Interesse em vir', '<b>alto</b>'], ['Outras equipes', 'Aston Martin, Audi']])}</div>` }),
      K.card({ t: 'Sua proposta', body: `${K.slider('Salário por ano', ask, 1, 40, 'US$ mi')}${K.slider('Anos de contrato', 3, 1, 5, 'anos')}<h4 class="sec">Papel na equipe</h4><div class="seg"><button type="button">Igualdade</button><button type="button" class="on">Primeiro piloto</button><button type="button">Segundo piloto</button></div><h4 class="sec">Bônus</h4>${K.kv([['Por vitória', 'US$ 0,5 mi'], ['Por pódio', 'US$ 0,15 mi'], ['Por título', 'US$ 5 mi']])}<h4 class="sec">Cláusulas</h4><label class="ck"><input type="checkbox" checked> Desempenho (a equipe pode encerrar)</label><label class="ck"><input type="checkbox"> Saída para equipe à frente</label><label class="ck"><input type="checkbox" checked> Opção de renovação da equipe</label>` }),
      K.card({ t: 'Resposta do empresário', body: `<div class="agent"><p>“${esc(dlast(d.id))} gosta do projeto, mas a Aston Martin ofereceu ${money(ask + 2)} por ano. Ele quer ser o primeiro piloto.”</p></div>${K.kv([['Chance de aceitar', '<b>62%</b>'], ['Comissão do empresário', money(ask * 0.08, 2)], ['Impacto no teto', 'não entra (salário de piloto)']])}${K.btn('Enviar proposta', { kind: 'pri' })}${K.btn('Retirar interesse', { kind: 'ghost' })}` })));
};

BASE.staffmarket = (K) => K.page(K.head({ t: 'Mercado de funcionários', s: `${D.staffMarket.length} profissionais disponíveis` }),
  K.card({ flush: true, body: K.table([['Nome'], ['Cargo'], ['Nota', 'c'], ['Quem ocupa hoje'], ['Diferença', 'c'], ['Salário', 'r'], ['Multa', 'r'], ['', 'r']], D.staffMarket.map(s => { const cur = D.staff.find(x => x.role === s.role); const dlt = cur ? s.rating - cur.rating : 0; return [`<b>${esc(s.name)}</b>`, esc(ROLE[s.role] || s.role), K.ring(s.rating, { size: 34 }), cur ? `${esc(cur.isPlayer ? 'você' : cur.name)} (${cur.rating})` : '—', K.chip((dlt > 0 ? '+' : '') + dlt, dlt > 0 ? 'g' : dlt < 0 ? 'r' : 'n'), money(s.salary), money(s.fee), K.btn('Contratar', { kind: 'sec' })]; })) }));

/* ===================== FINANÇAS ===================== */
const CAT = { receita: 'Receitas', 'fábrica': 'Fábrica', marketing: 'Marketing', 'salário': 'Salários', 'operação': 'Operação e viagens', motor: 'Motor', 'P&D': 'P&D', infraestrutura: 'Infraestrutura', premio: 'Prêmios' };
BASE.finance = (K) => {
  const F = D.finances; const bc = F.season.byCat;
  return K.page(K.head({ t: 'Finanças', s: `Temporada ${F.season.year}` }),
    K.grid('repeat(4,1fr)', K.stat('Caixa', money(F.balance)), K.stat('Receitas no ano', money(F.season.inc)), K.stat('Despesas no ano', money(-F.season.exp)), K.stat('Teto: sobra', money(W.capRoom))) +
    K.grid('1fr 1fr', K.card({ t: 'Por categoria', body: K.table([['Categoria'], ['Valor', 'r']], Object.entries(bc).map(([k, v]) => [CAT[k] || k, `<span class="num ${v < 0 ? 'loss' : 'gain'}">${moneyS(v)}</span>`])) }),
      K.card({ t: 'Lançamentos', flush: true, body: K.table([['Etapa', 'c'], ['Descrição'], ['Valor', 'r']], F.ledger.slice(-14).reverse().map(e => [e.round, esc(e.desc), `<span class="num ${e.amount < 0 ? 'loss' : 'gain'}">${moneyS(e.amount)}</span>`])) })));
};

BASE.sponsors = (K) => {
  const OBJ = { finish: 'Terminar as corridas', points: 'Marcar pontos', podium: 'Subir ao pódio', top5: 'Ficar no top 5', win: 'Vencer' };
  return K.page(K.head({ t: 'Patrocinadores', s: `${D.sponsors.length} contratos · ${money(D.sponsors.reduce((a, s) => a + s.perRace, 0))} por corrida`, act: K.btn('Buscar patrocinador', { kind: 'pri' }) }),
    K.grid('repeat(3,1fr)', ...D.sponsors.map(s => K.card({ body: `<div class="sp">${W.sponsorLogo(s.name) ? `<img class="sp-l" src="${W.sponsorLogo(s.name)}" alt="${esc(s.name)}">` : `<b class="sp-n">${esc(s.name)}</b>`}<div class="mu small">${esc(s.seg)} · porte ${s.brandTier}</div></div>${K.kv([['Por corrida', money(s.perRace, 2)], ['Objetivo', OBJ[s.objective] || s.objective], ['Bônus', money(s.bonus, 2)], ['Contrato', s.seasons + ' temporadas']])}<div class="sat"><span>Satisfação</span>${K.bar(s.satisfaction)}<b class="num">${s.satisfaction}%</b></div>` }))) +
    K.card({ t: 'Espaços no carro', body: `<div class="livery"><img src="${W.carUrl(PT)}" alt=""><span class="lv-s" style="left:44%;top:30%">Patrocinador principal</span><span class="lv-s" style="left:12%;top:58%">Asa dianteira · livre</span><span class="lv-s" style="left:78%;top:24%">Asa traseira</span></div>` }));
};

BASE.board = (K) => {
  const b = D.meta.board; const o = PT.owner || {};
  return K.page(K.head({ t: 'Diretoria e dono', s: `${o.name || '—'} · ${OWNER_T[o.type] || o.type || ''}` }),
    K.grid('1fr 1fr 1fr', K.stat('Confiança da diretoria', nf(b.confidence, 0) + '%', `${b.lastDelta >= 0 ? '+' : ''}${nf(b.lastDelta, 1)} na última corrida`, b.confidence < 30 ? 'r' : b.confidence < 55 ? 'y' : 'g'), K.stat('Meta da temporada', b.target + 'º entre os construtores', `hoje: ${W.myCPos.pos}º`), K.stat('Valor da equipe', money(PT.value), 'estimativa de mercado')) +
    K.grid('1fr 1fr', K.card({ t: 'O dono', body: K.kv([['Nome', esc(o.name)], ['Tipo', OWNER_T[o.type] || o.type], ['Riqueza', o.wealth + '/100'], ['Ambição', o.ambition + '/100'], ['Paciência', o.patience + '/100'], ['Humor', PT.ownerMood + '/100'], ['Venda', PT.sale === 'nunca' ? 'protegida: nunca será vendida' : PT.sale === 'protegida20' ? 'só depois de 20 anos e crise forte' : 'pode ser vendida']]) }),
      K.card({ t: 'O que a diretoria espera', body: K.list([{ title: `Terminar em ${b.target}º no Mundial de Construtores`, tail: K.chip('Em risco', 'r') }, { title: 'Manter o caixa acima de US$ 30 mi', tail: K.chip('Em dia', 'g') }, { title: 'Promover um piloto da academia até 2030', tail: K.chip('Em andamento', 'y') }]) })));
};

/* ===================== MUNDO ===================== */
BASE.standings = (K, p) => {
  const tab = p.tab === 'matriz' ? 'pilotos' : (p.tab || 'pilotos'); const rounds = D.results.length;
  const cell = (v) => v == null ? '<td class="mx"></td>' : v === 'R' ? '<td class="mx r">AB</td>' : `<td class="mx ${v === 1 ? 'p1' : v === 2 ? 'p2' : v === 3 ? 'p3' : v <= 10 ? 'pts' : ''}">${v}</td>`;
  const tbl = tab === 'pilotos'
    ? `<table class="mxt"><thead><tr><th></th><th class="l">Piloto</th>${D.results.map(r => `<th title="${esc(r.gp)}">${flag((cal.find(c => c.id === r.trackId) || {}).country, 'flag sm')}</th>`).join('')}<th class="r">Pts</th></tr></thead><tbody>${standDRows.map(r => `<tr class="${r.tid === PT.id ? 'me' : ''}"><td class="c">${r.pos}</td><td class="l">${K.who(r.did, r.tid)}</td>${Array.from({ length: rounds }, (_, i) => cell((D.matrix[r.did] || [])[i])).join('')}<td class="r"><b class="num">${r.pts}</b></td></tr>`).join('')}</tbody></table>`
    : K.table([['', 'c'], ['Equipe'], ['Pontos', 'r'], ['Diferença', 'r']], standCRows.map(r => [r.pos, K.tm(r.tid), `<b class="num">${r.pts}</b>`, r.pos > 1 ? '−' + (standCRows[0].pts - r.pts) : '']), { hl: (x, i) => standCRows[i].tid === PT.id });
  return K.page(K.head({ t: 'Classificação', s: `${rounds} de ${cal.length} etapas`, tabs: p.tabs || [['pilotos', 'Pilotos'], ['construtores', 'Construtores']], tab: p.tab || tab }), K.card({ flush: true, body: `<div class="scroll-x">${tbl}</div>` }));
};

BASE.paddock = (K) => K.page(K.head({ t: 'Equipes do grid', s: `${D.teams.length} equipes` }),
  K.card({ flush: true, body: K.table([['', 'c'], ['Equipe'], ['Motor'], ['Aero', 'c'], ['Chassi', 'c'], ['Confiab.', 'c'], ['Orçamento', 'r'], ['Dono'], ['Pts', 'r']], standCRows.map(r => { const t = r.t; return [r.pos, K.tm(t.id), esc(t.pu || t.engine), K.num(t.car.aero), K.num(t.car.chassis), K.num(t.car.reliability), money(t.budget), esc((t.owner || {}).name || '—'), `<b class="num">${r.pts}</b>`]; }), { hl: (x, i) => standCRows[i].tid === PT.id }) }));

BASE.teampage = (K, p) => {
  const t = team(p.id) || PT; const ch = (D.hist.chron || {})[t.id] || [];
  return K.page(K.head({ t: t.full || t.name, s: `${t.country} · ${t.pu || t.engine}` }),
    K.grid('1fr 1fr', K.card({ body: `<img class="carimg" src="${W.carUrl(t)}" alt="">` }), K.card({ t: 'Linhagem', body: K.list(ch.map(([n, a, b]) => ({ title: n, sub: `${a}–${b || 'hoje'}` }))) })));
};

BASE.owners = (K, p) => {
  const tab = p.tab || 'equipes';
  const body = tab === 'equipes'
    ? K.table([['Equipe'], ['Dono'], ['Tipo'], ['Valor', 'r'], ['Humor do dono', 'c'], ['Dívida', 'r'], ['Situação']], [...D.teams].sort((a, b) => b.value - a.value).map(t => [K.tm(t.id), esc((t.owner || {}).name || '—'), OWNER_T[(t.owner || {}).type] || '', money(t.value), K.bar(t.ownerMood, { w: 80 }), t.debt ? money(t.debt) : '—', t.sale === 'nunca' ? K.chip('Nunca à venda', 'b') : t.sale === 'protegida20' ? K.chip('Protegida', 'b') : t.ownerMood < 35 ? K.chip('Pode ser vendida', 'r') : K.chip('Estável', 'g')]), { hl: (x, i) => false })
    : K.table([['Candidata'], ['Tipo'], ['País'], ['Orçamento', 'r'], ['Situação']], D.owners.cands.map(c => [`<span class="tmc">${c.logo ? `<img src="${W.IMG + c.logo}" alt="">` : ''}<b>${esc(c.name)}</b></span>`, ({ equipe: 'Equipe de corrida', montadora: 'Montadora', empresa: 'Empresa', criada: 'Projeto novo' })[c.kind] || c.kind, flag(c.country), money(c.budget), K.chip('Estudando entrada', 'n')]));
  return K.page(K.head({ t: 'Donos e equipes', s: 'Equipes como empresas: valor, donos, vendas e candidatas', tabs: [['equipes', 'Equipes do grid'], ['candidatas', `Candidatas (${D.owners.cands.length})`], ['historico', 'Vendas e entradas']], tab }), K.card({ flush: true, body }));
};

BASE.manufacturers = (K, p) => {
  const tab = p.tab || 'motores'; const M = D.mfr;
  const cust = (mid) => D.teams.filter(t => (M.contracts[t.id] || {}).mid === mid || t.engine === mid);
  const body = tab === 'motores'
    ? K.table([['Fabricante'], ['Potência', 'c'], ['Confiabilidade', 'c'], ['Eficiência', 'c'], ['Clientes'], ['Preço por ano', 'r'], ['Situação']], M.list.map(m => [`<b>${esc(m.name)}</b>`, K.num(m.raw), K.num(m.reliability), K.num(m.eff), cust(m.id).map(t => K.dot(t.id)).join('') || '<span class="mu">nenhum</span>', m.fee ? money(m.fee) : '—', m.active ? K.chip('Ativo', 'g') : K.chip(m.since ? 'Entra em ' + m.since : 'Estudando', 'y')]))
    : K.table([['Fornecedora'], ['Desgaste', 'c'], ['Aquecimento', 'c'], ['Característica'], ['Situação']], Object.entries(M.tyreTraits).map(([k, t]) => [`<span class="tmc">${t.logo ? `<img src="${W.IMG + t.logo}" alt="">` : ''}<b>${esc(t.name)}</b></span>`, nf(t.wear, 2), nf(t.warm, 2), esc((t.note || [])[0] || ''), M.tyres.f1.id === k ? K.chip('Fornece a F1 até ' + M.tyres.f1.until, 'g') : '']));
  return K.page(K.head({ t: 'Fabricantes', s: 'Motores e pneus', tabs: [['motores', 'Motores'], ['pneus', 'Pneus']], tab }), K.card({ flush: true, body }));
};

BASE.council = (K) => {
  const O = D.councilOpen || { props: [] }; const pr = O.props[0] || {};
  const st = (x) => x > 0.1 ? 'sim' : x < -0.1 ? 'nao' : 'ind';
  return K.page(K.head({ t: 'Conselho da FIA', s: `${O.gp || ''} · capital político ${D.council.capital}` }),
    K.card({ t: pr.title, body: `<p>${esc(pr.desc || '')}</p>` }) +
    K.card({ t: 'Posição das equipes', body: K.table([['Equipe'], ['Impacto'], ['Tendência', 'c']], D.teams.map(t => [K.tm(t.id), (pr.imp || {})[t.id] >= 0 ? 'ganha' : 'perde', K.chip(st((pr.imp || {})[t.id] || 0), 'n')])) }));
};

BASE.news = (K, p) => {
  const tab = p.tab || 'todas'; const tags = ['todas', ...new Set(D.news.map(n => n.tag))];
  const list = D.news.filter(n => tab === 'todas' || n.tag === tab);
  return K.page(K.head({ t: 'Notícias', s: 'Imprensa do paddock', tabs: tags.map(t => [t, t === 'todas' ? 'Todas' : NEWS_TAG[t] || t]), tab }),
    K.card({ body: K.list(list.slice(0, 20).map(n => ({ title: n.title, sub: `${OUTLET[n.outlet] || n.outlet} · etapa ${n.round}`, lead: K.chip(NEWS_TAG[n.tag] || n.tag, n.tag === 'escandalo' ? 'r' : 'n') }))) }));
};

BASE.social = (K) => K.page(K.head({ t: 'Redes sociais', s: 'O que pilotos, equipes e jornalistas estão dizendo' }),
  `<div class="feed">${D.social.slice(0, 16).map(s => K.post(s)).join('')}</div>`);

BASE.cases = (K) => {
  const C = D.chaos.cases; const STG = { investigacao: 'Investigação', denuncia: 'Denúncia', veredito: 'Veredito', encerrado: 'Encerrado' };
  const G = { escandalos: 'Escândalo', conflitos: 'Conflito interno', lesoes: 'Lesão', operacao: 'Operação', negocios: 'Negócios', midia: 'Mídia', leves: 'Bastidores' };
  return K.page(K.head({ t: 'Escândalos e investigações', s: `${C.length} caso(s) aberto(s) · ${D.chaos.log.length} eventos nesta temporada` }),
    K.grid('1fr 1fr', ...C.map(c => K.card({ t: c.title, a: K.chip(STG[c.stage] || c.stage, 'r'), body: `<p>${esc(c.body)}</p>${K.kv([['Equipe', K.tm(c.tid)], ['Gravidade', '●'.repeat(c.sev) + '○'.repeat(5 - c.sev)], ['Decisão prevista', 'etapa ' + c.due]])}<div class="steps">${['Denúncia', 'Investigação', 'Veredito', 'Consequências'].map((s, i) => `<span class="${i <= 1 ? 'on' : ''}">${s}</span>`).join('')}</div>` }))) +
    K.card({ t: 'Eventos da temporada', flush: true, body: K.table([['Etapa', 'c'], ['Tipo'], ['Envolvidos']], D.chaos.log.slice().reverse().slice(0, 14).map(e => [e.r, K.chip(G[e.g] || e.g, e.g === 'escandalos' ? 'r' : e.g === 'leves' || e.g === 'midia' ? 'n' : 'y'), `${e.tid ? K.tm(e.tid) : ''} ${e.did ? esc(dname(e.did)) : ''}`])) }));
};

BASE.cats = (K) => K.page(K.head({ t: 'Outras categorias', s: `${D.cats.length} campeonatos simulados` }),
  K.grid('repeat(4,1fr)', ...D.cats.map(c => K.card({ cls: 'catc', body: `<div class="cat-h">${D.catLogos.includes(c.id) ? `<img src="${W.IMG}logos/categories/${c.id}.png" alt="">` : `<b>${esc(c.short)}</b>`}</div><b>${esc(c.name)}</b><div class="mu small">${c.teams} equipes · nível ${nf(c.tier, 1)}</div>` }))));

BASE.circuits = (K) => {
  const lic = D.circ.lic || {};
  return K.page(K.head({ t: 'Circuitos e licenças', s: `${Object.keys(lic).length} circuitos com licença FIA` }),
    K.grid('repeat(4,1fr)', ...cal.map(c => K.card({ go: 'circuit', p: { id: c.id }, cls: 'cc', body: `${trackSvg(c.shape, { w: 160, h: 100 })}<b>${esc(c.circuit)}</b><div class="mu small">${flag(c.country)} ${esc(c.place)} · Grau ${(lic[c.id] || {}).grade || '1'} · até ${((lic[c.id] || {}).expiry || '2030').slice(0, 4)}</div>` }))));
};

BASE.circuit = (K, p) => {
  const c = cal.find(x => x.id === p.id) || nextGP; const r = (D.hist.rec || {})[c.id] || {};
  return K.page(K.head({ t: c.circuit, s: `${c.gp} · ${c.place}` }),
    K.grid('1.3fr 1fr', K.card({ body: trackSvg(c.shape, { w: 600, h: 380, start: true }) }),
      K.card({ t: 'Ficha', body: K.kv([['Extensão', nf(c.length, 3) + ' km'], ['Curvas', c.turns], ['Voltas', c.laps], ['GPs realizados', r.held || c.racesHeld], ['Primeiro GP', r.first || '—'], ['Recorde da volta', r.lap ? `${lap(r.lap[0] / 1000)} · ${esc(r.lap[1])} (${r.lap[3]})` : '—'], ['Recorde da classificação', r.quali ? `${lap(r.quali[0] / 1000)} · ${esc(r.quali[1])} (${r.quali[3]})` : '—']]) })));
};

BASE.log = (K, p) => {
  const tab = p.tab || 'todos'; const types = ['todos', ...new Set(D.log.map(l => l.t))];
  const list = D.log.filter(l => tab === 'todos' || l.t === tab).slice().reverse().slice(0, 40);
  return K.page(K.head({ t: 'Registro do universo', s: `${D.log.length} acontecimentos recentes`, tabs: types.slice(0, 10).map(t => [t, t === 'todos' ? 'Tudo' : LOG_T[t] || t]), tab }),
    K.card({ body: `<div class="tl">${list.map(l => `<div class="tl-i"><span class="tl-d">${l.y} · etapa ${l.r}</span>${K.chip(LOG_T[l.t] || l.t, 'n')}<p>${esc(l.txt)}</p></div>`).join('')}</div>` }));
};

/* ===================== ARQUIVO ===================== */
BASE.career = (K) => {
  const H = D.history;
  return K.page(K.head({ t: 'Minha carreira', s: `${D.meta.player.name} · desde ${H.length ? H[0].year : D.meta.year}` }),
    K.grid('repeat(4,1fr)', K.stat('Temporadas', H.length + 1), K.stat('Vitórias', D.meta.player.careerWins), K.stat('Títulos', D.meta.player.titles), K.stat('Melhor posição', H.length ? Math.min(...H.map(h => h.playerPos)) + 'º' : '—')) +
    K.card({ t: 'Temporadas', flush: true, body: K.table([['Ano'], ['Equipe'], ['Meta', 'c'], ['Resultado', 'c'], ['Campeão'], ['Construtores']], [...H.map(h => [h.year, K.tm(h.playerTeam), h.target + 'º', `<b>${h.playerPos}º</b>`, esc(h.championName), esc(h.constructorName)]), [D.meta.year, K.tm(PT.id), D.meta.board.target + 'º', W.myCPos.pos + 'º (em andamento)', '—', '—']]) }));
};

BASE.seasons = (K) => K.page(K.head({ t: 'Temporadas desde 1950', s: `${D.hist.seasons.length} temporadas reais e as simuladas da sua carreira` }),
  K.card({ flush: true, body: K.table([['Ano'], ['Campeão'], ['Equipe'], ['Vice'], ['Construtores']], [...D.history.map(h => [h.year, `<b>${esc(h.championName)}</b>`, esc(h.constructorName), '—', esc(h.constructorName)]), ...D.hist.seasons.slice().reverse().map(s => [s.y, s.d[0] ? `${flag(s.d[0][2])} <b>${esc(s.d[0][1])}</b>` : '—', s.d[0] ? esc(s.d[0][4]) : '', s.d[1] ? esc(s.d[1][1]) : '', s.c[0] ? esc(s.c[0][1]) : '—'])]) }));

BASE.hall = (K, p) => {
  const tab = p.tab || 'pilotos';
  const body = tab === 'pilotos'
    ? K.table([['', 'c'], ['Piloto'], ['Títulos', 'c'], ['Vitórias', 'c'], ['Poles', 'c'], ['Pódios', 'c'], ['Largadas', 'c']], D.hist.drivers.slice(0, 30).map((d, i) => [i + 1, `${flag(d.nat)} <b>${esc(d.name)}</b>`, d.titles, d.wins, d.poles, d.podiums, d.starts]))
    : K.table([['', 'c'], ['Equipe'], ['Títulos', 'c'], ['Vitórias', 'c'], ['Poles', 'c'], ['GPs', 'c']], D.hist.cons.slice(0, 20).map((c, i) => [i + 1, `${flag(c.nat)} <b>${esc(c.name)}</b>`, c.titles, c.wins, c.poles, c.starts]));
  return K.page(K.head({ t: 'Hall da Fama', s: 'Os maiores da história (dados reais até 2026 + sua carreira)', tabs: [['pilotos', 'Pilotos'], ['equipes', 'Equipes']], tab }), K.card({ flush: true, body }));
};

BASE.records = (K) => K.page(K.head({ t: 'Recordes', s: 'Volta mais rápida e pole de cada circuito do calendário' }),
  K.card({ flush: true, body: K.table([['Circuito'], ['Recorde da volta', 'r'], ['Piloto'], ['Ano', 'c'], ['Recorde da classificação', 'r'], ['Piloto'], ['Ano', 'c']], cal.map(c => { const r = D.hist.rec[c.id] || {}; return [`${flag(c.country)} <b>${esc(c.circuit)}</b>`, r.lap ? `<span class="num">${lap(r.lap[0] / 1000)}</span>` : '—', r.lap ? esc(r.lap[1]) : '', r.lap ? r.lap[3] : '', r.quali ? `<span class="num">${lap(r.quali[0] / 1000)}</span>` : '—', r.quali ? esc(r.quali[1]) : '', r.quali ? r.quali[3] : '']; })) }));

/* ===================== SISTEMA ===================== */
BASE.title = (K) => `<div class="title-s"><h1>PitWall Racing Simulator</h1><div class="title-m">${['Continuar', 'Nova carreira', 'Carregar', 'Opções', 'Sair'].map((x, i) => `<a data-go="${['hub', 'newcareer', 'options', 'options', 'title'][i]}">${x}</a>`).join('')}</div></div>`;

BASE.newcareer = (K, p) => {
  const tab = p.tab || 'grid';
  const body = tab === 'grid' ? K.grid('repeat(4,1fr)', ...D.teams.map(t => K.card({ cls: 'pick' + (t.id === PT.id ? ' on' : ''), body: `<div class="pk">${W.logoUrl(t) ? `<img src="${W.logoUrl(t)}" alt="">` : ''}<b>${esc(t.name)}</b><span class="mu small">${money(t.budget)} · exp. ${t.champ ? t.champ.pos : '—'}º</span></div>` })))
    : tab === 'candidata' ? K.grid('repeat(4,1fr)', ...D.owners.cands.slice(0, 20).map(c => K.card({ cls: 'pick', body: `<div class="pk">${c.logo ? `<img src="${W.IMG + c.logo}" alt="">` : ''}<b>${esc(c.name)}</b><span class="mu small">${money(c.budget)}</span></div>` })))
    : K.grid('1fr 1fr', K.card({ t: 'Identidade', body: `${K.field('Nome da equipe', 'Equipe Moratelli')}${K.field('País', 'Brasil')}<h4 class="sec">Cores</h4><div class="sw">${['#0B6E4F', '#F2C14E', '#1C3F94', '#E4572E', '#111'].map(c => `<i style="background:${c}"></i>`).join('')}</div><h4 class="sec">Logo</h4><div class="logos">${Array.from({ length: 10 }, (_, i) => `<img src="${W.IMG}logos/generic/${i + 1}.svg" alt="">`).join('')}</div>` }), K.card({ t: 'Estrutura inicial', body: K.kv([['Orçamento', 'US$ 140 mi'], ['Sede', 'nível 2'], ['Motor', 'cliente (escolher)'], ['Pilotos e diretores', 'escolhidos na montagem']]) }));
  return K.page(K.head({ t: 'Nova carreira', s: 'Escolha como começar', tabs: [['grid', 'Equipe do grid'], ['candidata', 'Equipe candidata (12ª)'], ['criar', 'Criar equipe']], tab, act: K.btn('Começar', { kind: 'pri', go: 'hub' }) }), body);
};

BASE.teamsetup = (K) => K.page(K.head({ t: 'Montagem da equipe', s: 'Escolha pilotos e diretores antes da primeira corrida', act: K.btn('Concluir montagem', { kind: 'pri', go: 'hub' }) }),
  K.grid('1fr 1fr', K.card({ t: 'Pilotos (2 vagas)', body: K.table([['Piloto'], ['Nota', 'c'], ['Pede', 'r'], ['', 'r']], D.freeAgents.slice(0, 8).map(d => [K.who(d.id, null), K.ring(d.ovr, { size: 32 }), money(Math.max(1, mval(d))), K.btn('Escolher', { kind: 'sec' })])) }),
    K.card({ t: 'Diretores', body: K.table([['Cargo'], ['Nome'], ['Nota', 'c'], ['', 'r']], D.staffMarket.slice(0, 8).map(s => [esc(ROLE[s.role] || s.role), esc(s.name), s.rating, K.btn('Escolher', { kind: 'sec' })])) })));

BASE.seasonend = (K) => {
  const h = D.history[D.history.length - 1];
  return K.page(K.head({ t: `Fim da temporada ${h.year}`, s: 'Campeões, premiação e avaliação' }),
    K.grid('1fr 1fr', K.card({ t: 'Campeão de pilotos', body: `<div class="qd">${K.av(drv(h.champion), 80)}<div><h3>${esc(h.championName)}</h3><p class="mu">${esc(tname(h.championTeam))}</p></div></div>` }), K.card({ t: 'Campeã de construtores', body: K.tm(h.constructor) })) +
    K.card({ t: 'Sua temporada', body: K.kv([['Meta', h.target + 'º'], ['Resultado', h.playerPos + 'º'], ['Prêmio em dinheiro', money(62)]]) }));
};

BASE.options = (K, p) => {
  const tab = p.tab || 'jogo'; const lv = ['Desligado', 'Raro', 'Normal', 'Novela', 'Caos'];
  const G = [['escandalos', 'Escândalos'], ['conflitos', 'Conflitos internos'], ['lesoes', 'Lesões e doenças'], ['operacao', 'Operação'], ['negocios', 'Negócios'], ['midia', 'Mídia'], ['leves', 'Bastidores']];
  const body = tab === 'jogo' ? K.grid('1fr 1fr', K.card({ t: 'Saves', body: K.table([['Espaço'], ['Equipe'], ['Data no jogo'], ['', 'r']], [['1', K.tm(PT.id), D.meta.today, K.btn('Carregar', { kind: 'sec' })], ['2', K.tm('williams'), '2027-09-12', K.btn('Carregar', { kind: 'sec' })], ['3', '<span class="mu">vazio</span>', '', K.btn('Salvar aqui', { kind: 'sec' })]]) }), K.card({ t: 'Idioma e unidades', body: `${K.field('Idioma', 'Português (Brasil)')}${K.field('Moeda', 'US$')}${K.field('Velocidade', 'km/h')}` }))
    : tab === 'eventos' ? K.card({ t: 'Eventos do universo', body: `<h4 class="sec">Frequência geral</h4><div class="seg"><button type="button">Baixa</button><button type="button" class="on">Normal</button><button type="button">Alta</button></div><h4 class="sec">Nível por tipo</h4>${G.map(([k, n]) => `<div class="lvl"><span>${n}</span><div class="seg sm">${lv.map((l, i) => `<button type="button" class="${i === (D.meta.options.chaos.levels[k] || 2) ? 'on' : ''}">${l}</button>`).join('')}</div></div>`).join('')}<label class="ck"><input type="checkbox" checked> Pessoas e marcas reais podem aparecer (sempre marcadas como ficção do jogo)</label><p class="mu small">Acidentes fatais ficam sempre ligados, raríssimos e tratados com luto e investigação.</p>` })
    : K.card({ t: tab === 'audio' ? 'Áudio' : 'Acessibilidade', body: tab === 'audio' ? `${K.slider('Volume geral', 80, 0, 100, '%')}${K.slider('Efeitos de interface', 60, 0, 100, '%')}${K.slider('Som da corrida', 90, 0, 100, '%')}` : `${K.field('Escala da interface', '100%')}<label class="ck"><input type="checkbox"> Cores para daltonismo nos pneus</label><label class="ck"><input type="checkbox"> Reduzir animações</label><label class="ck"><input type="checkbox" checked> Foco visível no teclado</label>` });
  return K.page(K.head({ t: 'Salvar e opções', s: 'Jogo salvo automaticamente a cada etapa', tabs: [['jogo', 'Jogo e saves'], ['eventos', 'Eventos do universo'], ['audio', 'Áudio'], ['acess', 'Acessibilidade']], tab }), body);
};

BASE.editor = (K, p) => {
  const tab = p.tab || 'equipes';
  return K.page(K.head({ t: 'Editor da base', s: 'Mudanças valem para carreiras novas', tabs: [['equipes', 'Equipes'], ['pilotos', 'Pilotos'], ['circuitos', 'Circuitos'], ['calendario', 'Calendário'], ['categorias', 'Categorias']], tab, act: K.btn('Exportar base', { kind: 'sec' }) }),
    K.grid('300px 1fr', K.card({ flush: true, body: K.list(D.teams.map((t, i) => ({ on: i === 4, lead: K.dot(t.id), title: t.name, sub: t.full }))) }),
      K.card({ t: 'McLaren', body: K.grid('1fr 1fr', `${K.field('Nome curto', PT.name)}${K.field('Nome completo', PT.full)}${K.field('País', PT.country)}${K.field('Motor', PT.pu)}`, `${K.field('Orçamento (US$ mi)', PT.budget)}${K.field('Reputação', nf(PT.reputation, 1))}${K.field('Cor principal', PT.color)}${K.field('Cor secundária', PT.color2)}`) })));
};

BASE.account = (K) => K.page(K.head({ t: 'Perfil e ativação', s: 'Moratelli Game Company' }),
  K.grid('1fr 1fr', K.card({ t: 'Perfil', body: `${K.field('Nome no jogo', D.meta.player.name)}${K.field('Nacionalidade', 'Brasil')}${K.field('Avatar', 'Retrato ilustrado nº 4')}` }), K.card({ t: 'Ativação', body: K.kv([['Situação', K.chip('Ativado', 'g')], ['Versão', '0.8.5'], ['Chave', 'PWRS-••••-••••-7Q2K']]) })));

BASE.diag = (K) => K.page(K.head({ t: 'Diagnóstico', s: 'Verificações do universo e desempenho' }),
  K.grid('repeat(4,1fr)', K.stat('Erros', '0', 'nesta sessão', 'g'), K.stat('Tempo por fim de semana', '410 ms'), K.stat('Tamanho do save', '3,3 MB'), K.stat('Pilotos no universo', '1.512')) +
  K.card({ t: 'Verificações', body: K.list([['Assentos da F1 preenchidos', 'g', 'ok'], ['Pilotos duplicados', 'g', 'nenhum'], ['Contratos inválidos', 'g', 'nenhum'], ['Patrocínio de equipe sem contrato', 'y', '1 aviso'], ['Fotos ausentes', 'y', '42 pilotos sem foto']].map(([t, c, s]) => ({ title: t, tail: K.chip(s, c) }))) }));

BASE.search = (K) => {
  const items = [['Tela', 'Caixa de entrada', 'inbox'], ['Tela', 'Sede e fábrica', 'facilities'], ['Piloto', 'Lando Norris', 'driver', { id: 'lando-norris' }], ['Piloto', 'Oscar Piastri', 'driver', { id: 'oscar-piastri' }], ['Equipe', 'Ferrari', 'teampage', { id: 'ferrari' }], ['Circuito', 'Silverstone', 'circuit', { id: 'silverstone' }], ['Ação', 'Novo projeto de P&D', 'newproject'], ['Ação', 'Negociar com piloto', 'market']];
  return `<div class="srch"><div class="srch-b"><div class="srch-i"><span>⌕</span><input id="q" value="no" aria-label="Buscar"><kbd>Esc</kbd></div>${items.map(([k, t, g, pp], i) => `<a class="srch-r${i === 2 ? ' on' : ''}" data-go="${g}" ${pp ? `data-p='${JSON.stringify(pp)}'` : ''}><span class="srch-k">${k}</span><b>${esc(t)}</b><kbd>↵</kbd></a>`).join('')}</div></div>`;
};
})();
