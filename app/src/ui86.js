/* ============================================================
   PIT WALL 0.8.6 — telas que faltavam (pendências da 0.8.5)
   - rivalidades na página do piloto (os dados já mudavam o comportamento na pista);
   - Casos e investigações (Mundo): investigações abertas, vereditos e linha do tempo dos casos;
   - Créditos e licenças (Sistema): origem e licença de cada imagem do jogo;
   - Finanças: histórico de estouros do teto de gastos.
   ============================================================ */
'use strict';

/* abas novas nas áreas */
(function () {
  const mundo = AREAS85.find(a => a[0] === 'mundo'); if (mundo && !mundo[3].some(t => t[0] === 'cases')) mundo[3].splice(Math.max(0, mundo[3].findIndex(t => t[0] === 'council') + 1), 0, ['cases', 'Comissários e casos']);
  const eq = AREAS85.find(a => a[0] === 'equipe'); if (eq && !eq[3].some(t => t[0] === 'talks')) eq[3].splice(Math.max(0, eq[3].findIndex(t => t[0] === 'mano') + 1), 0, ['talks', 'Conversas', null, () => !Career.isObs(G)]);
  const sis = AREAS85.find(a => a[0] === 'sistema'); if (sis && !sis[3].some(t => t[0] === 'credits')) sis[3].splice(sis[3].length - 1, 0, ['credits', 'Créditos e licenças']);
})();

/* ---------- rivalidades na página do piloto ---------- */
function rivalsOf86(did) {
  const R = (G.memory && G.memory.rivals) || {};
  return Object.values(R).filter(r => r.a === did || r.b === did).map(r => ({ ...r, other: r.a === did ? r.b : r.a })).filter(r => Career.driver(G, r.other)).sort((a, b) => b.score - a.score);
}
(function () {
  const sc = SCREENS.driverPage; if (!sc) return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    const d = Career.driver(G, UI.params.id); if (!d) return out;
    const L = rivalsOf86(d.id).slice(0, 5);
    if (!L.length) return out;
    const max = Math.max(10, ...L.map(r => r.score));
    const rows = L.map(r => { const o = Career.driver(G, r.other); const t = o.team && Career.team(G, o.team); const hot = r.score >= 4.5;
      return `<div class="rv86 ${hot ? 'hot' : ''}"><span class="rv86-p">${K85.av(o, 38)}<span><b data-act="driverPage" data-id="${o.id}">${esc(o.name)}</b><small>${t ? esc(t.name) : ''} · ${byLang('desde', 'since')} ${r.since}${r.crashes ? ` · ${r.crashes} ${byLang('batida(s)', 'crash(es)')}` : ''}</small></span></span>
        <span class="rv86-m"><small>${hot ? byLang('Rivalidade', 'Rivalry') : byLang('Atrito', 'Friction')}</small>${K85.bar(r.score, max, hot ? 'var(--red)' : 'var(--yellow)')}</span>
        <span class="rv86-log">${(r.log || []).slice(0, 2).map(x => `<small>${x.y} · ${esc(x.t)}</small>`).join('')}</span></div>`; }).join('');
    return out + K85.card({ t: byLang('Rivalidades', 'Rivalries'), a: byLang('batidas, toques e disputas mudam o comportamento na pista', 'crashes, contacts and battles change on-track behaviour'), body: `<div class="rv86s">${rows}</div>` });
  };
})();

/* ---------- Casos e investigações ---------- */
const CASE_STAGE86 = { investigacao: ['Em investigação', 'Under investigation'], fechado: ['Encerrado', 'Closed'] };
const cap86 = (t) => (t ? t[0].toUpperCase() + t.slice(1) : '');
SCREENS.cases = {
  html() {
    const S = (typeof Chaos !== 'undefined' && Chaos.state) ? Chaos.state(G) : { cases: [], log: [] };
    const open = S.cases.filter(c => c.stage === 'investigacao');
    const closed = S.cases.filter(c => c.stage === 'fechado').slice().reverse().slice(0, 20);
    const tm = (id) => { const t = Career.team(G, id); return t ? K85.tm(t.id) : esc(id || '—'); };
    const caseRow = (c) => `<div class="cs86 ${c.stage === 'investigacao' ? 'open' : c.guilty ? 'guilty' : 'clear'}"><div class="cs86-h"><span class="cs86-tag">${c.stage === 'investigacao' ? byLang('Em investigação', 'Under investigation') : c.guilty ? byLang('Culpada', 'Guilty') : byLang('Absolvida', 'Cleared')}</span>${tm(c.tid)}<small>${c.y}${c.stage === 'investigacao' && c.due ? ` · ${byLang('veredito previsto na etapa', 'verdict expected at round')} ${c.due}` : ''}</small></div><b>${esc(c.title || '')}</b>${c.result ? `<p>${esc(c.result)}</p>` : c.body ? `<p class="n-mu">${esc(String(c.body).slice(0, 220))}</p>` : ''}</div>`;
    const byG = {}; (S.log || []).filter(x => x.y === G.season.year).forEach(x => (byG[x.g] = (byG[x.g] || 0) + 1));
    const GN = { escandalos: byLang('Escândalos', 'Scandals'), operacao: byLang('Operação', 'Operations'), pessoas: byLang('Pessoas', 'People'), saude: byLang('Saúde', 'Health'), lesoes: byLang('Lesões e saúde', 'Injuries and health'), conflitos: byLang('Conflitos', 'Conflicts'), leves: byLang('Pequenos casos', 'Minor stories'), mercado: byLang('Mercado', 'Market'), midia: byLang('Mídia', 'Media'), financas: byLang('Finanças', 'Finance'), tecnica: byLang('Técnica', 'Technical'), politica: byLang('Política', 'Politics'), board: byLang('Diretoria', 'Board'), team: byLang('Equipes', 'Teams'), negocios: byLang('Negócios', 'Business'), money: byLang('Dinheiro', 'Money') };
    const parts = Object.entries(byG).map(([k, v], i) => ({ l: GN[k] || k, v, c: ['#E10600', '#4DA3FF', '#FFC93C', '#2BD67B', '#B46BFF', '#FF8A3D', '#19D3C5'][i % 7] }));
    // comissários: punições, revisões e desclassificações da temporada
    const stw = [];
    (G.season.results || []).forEach(r => {
      (r.pens || []).forEach(p => stw.push({ r: r.round, gp: r.gp, did: p.did, tid: p.tid, what: cap86(SL.penTxt(p.why)), pen: `+${p.s}s`, why: p.why, st: p.rev === 'ok' ? ['ok', byLang('Retirada na revisão', 'Withdrawn on review')] : p.rev === 'no' ? ['no', byLang('Revisão negada', 'Review refused')] : ['', byLang('Cumprida', 'Served')] }));
      r.cls.filter(x => x.dsq).forEach(x => stw.push({ r: r.round, gp: r.gp, did: x.did, tid: x.tid, what: cap86(SL.DSQ_TXT[x.dsq] ? byLang(SL.DSQ_TXT[x.dsq][0], SL.DSQ_TXT[x.dsq][1]) : x.dsq), pen: byLang('Desclassificado', 'Disqualified'), why: 'dsq', st: x.appeal === 'ok' ? ['ok', byLang('Apelação aceita', 'Appeal upheld')] : x.appeal === 'no' ? ['no', byLang('Apelação negada', 'Appeal dismissed')] : ['', byLang('Mantida', 'Upheld')] }));
    });
    stw.sort((a, b) => b.r - a.r);
    const WC = { colisao: '#E10600', limites: '#FFC93C', pitspeed: '#4DA3FF', unsafe: '#FF8A3D', largada: '#B46BFF', dsq: '#19D3C5' };
    const byW = {}; stw.forEach(x => (byW[x.why] = (byW[x.why] || 0) + 1));
    const wParts = Object.entries(byW).map(([k, v]) => ({ l: k === 'dsq' ? byLang('Desclassificação técnica', 'Technical disqualification') : cap86(SL.penTxt(k)), v, c: WC[k] || '#888' }));
    const mineT = G.player && G.player.teamId;
    const stwCard = K85.card({ t: `${byLang('Comissários em', 'Stewards in')} ${G.season.year}`, flush: true, body: stw.length ? K85.table([[byLang('Etapa', 'Round'), 'c'], [byLang('Piloto', 'Driver')], [byLang('Infração', 'Offence')], [byLang('Punição', 'Penalty'), 'c'], [byLang('Situação', 'Status')]], stw.slice(0, 40).map(x => [`<span class="n-num">${x.r}</span>`, `${K85.who(x.did, { tid: x.tid })}${x.tid === mineT ? ' ' + K85.tag(byLang('sua equipe', 'your team'), 'acc') : ''}`, `<small>${esc(x.what)}</small>`, `<b class="n-num">${esc(x.pen)}</b>`, x.st[0] ? K85.tag(x.st[1], x.st[0] === 'ok' ? 'pos' : 'neg') : `<small class="n-mu">${x.st[1]}</small>`])) : K85.empty(byLang('Nenhuma punição nesta temporada.', 'No penalties this season.')) });
    const stwSum = K85.card({ t: byLang('Infrações no ano', 'Offences this year'), body: wParts.length ? `<div class="fin-d">${K85.donut(wParts, `<b class="n-num">${stw.length}</b><small>${byLang('decisões', 'decisions')}</small>`, 150)}${K85.legend(wParts, v => v)}</div>` : K85.empty(byLang('Sem decisões ainda.', 'No decisions yet.')) });
    const rulesCard = K85.card({ t: byLang('Regras dos comissários', 'Stewards\' rules'), body: `<ul class="n-ul86"><li>${byLang('Punições de tempo dadas durante a corrida não admitem apelação. A equipe pode pedir o <b>direito de revisão</b> em até 96 horas, com um elemento novo e relevante.', 'Time penalties given during the race cannot be appealed. The team may request a <b>right of review</b> within 96 hours, with a significant new element.')}</li><li>${byLang('Decisões depois da corrida (vistoria técnica) podem ir ao <b>Tribunal de Apelação da FIA</b>.', 'Post-race decisions (technical inspection) can go to the <b>FIA Court of Appeal</b>.')}</li><li>${byLang('Diretrizes: 5 s por limites de pista (depois de 3 advertências), pit lane acima da velocidade, liberação insegura e largada queimada; 5 a 10 s por causar colisão.', 'Guidelines: 5 s for track limits (after 3 warnings), pit lane speeding, unsafe release and jump start; 5 to 10 s for causing a collision.')}</li><li>${byLang('Cada punição pode somar pontos na superlicença: 12 pontos em 12 meses suspendem o piloto por uma corrida.', 'Each penalty may add super licence points: 12 points in 12 months ban the driver for one race.')}</li></ul>` });
    return K85.head({ t: byLang('Comissários e casos', 'Stewards and cases'), s: `${stw.length} ${byLang('decisões dos comissários', 'stewards\' decisions')} · ${open.length} ${byLang('investigações abertas', 'open investigations')} · ${closed.length} ${byLang('casos encerrados', 'closed cases')}` }) +
      K85.grid('minmax(0,1.6fr) minmax(0,1fr)',
        K85.col(stwCard, K85.card({ t: byLang('Investigações abertas', 'Open investigations'), body: open.length ? open.map(caseRow).join('') : K85.empty(byLang('Nenhuma investigação aberta.', 'No open investigations.')) }),
          K85.card({ t: byLang('Vereditos', 'Verdicts'), body: closed.length ? closed.map(caseRow).join('') : K85.empty(byLang('Nenhum caso encerrado ainda.', 'No closed cases yet.')) })),
        K85.col(K85.card({ t: `${byLang('Acontecimentos em', 'Events in')} ${G.season.year}`, body: parts.length ? `<div class="fin-d">${K85.donut(parts, `<b class="n-num">${parts.reduce((a, x) => a + x.v, 0)}</b><small>${byLang('no ano', 'this year')}</small>`, 170)}${K85.legend(parts, v => v)}</div>` : K85.empty(byLang('Nada registrado ainda neste ano.', 'Nothing recorded this year yet.')) }),
          stwSum, rulesCard, K85.card({ t: byLang('Como funciona', 'How it works'), body: `<p class="n-mu">${byLang('Escândalos graves abrem investigação da FIA. O veredito sai algumas etapas depois. Cooperar reduz a pena; negar e perder aumenta. Casos podem puxar outras equipes para a investigação.', 'Serious scandals open an FIA investigation. The verdict comes a few rounds later. Cooperating reduces the penalty; denying and losing increases it. Cases can drag other teams into the investigation.')}</p>` })));
  },
};

/* ---------- Créditos e licenças ---------- */
SCREENS.credits = {
  html() {
    const R = typeof ASSET_REGISTRY !== 'undefined' ? ASSET_REGISTRY : [];
    const byType = {}; R.forEach(a => { const k = a.type || 'other'; (byType[k] = byType[k] || { n: 0, lic: {} }).n++; byType[k].lic[a.license] = (byType[k].lic[a.license] || 0) + 1; });
    const TN = { 'driver-face': byLang('Retratos de pilotos', 'Driver portraits'), 'driver-photo': byLang('Fotos de pilotos', 'Driver photos'), 'team-logo': byLang('Logos de equipes', 'Team logos'), car: byLang('Carros', 'Cars'), circuit: byLang('Pistas', 'Circuits'), 'category-logo': byLang('Logos de categorias', 'Series logos'), logo: byLang('Logos (empresas, fabricantes, mídia)', 'Logos (companies, makers, media)'), flag: byLang('Bandeiras', 'Flags'), brand: byLang('Marca do jogo', 'Game brand'), 'news-photo': byLang('Fotos das notícias', 'News photos'), other: byLang('Outros', 'Other') };
    const free = (l) => /^(CC|Public domain|PD|MIT|próprio)/i.test(l || '');
    const sumRows = Object.entries(byType).sort((a, b) => b[1].n - a[1].n).map(([k, v]) => { const fr = Object.entries(v.lic).filter(([l]) => free(l)).reduce((a, [, n]) => a + n, 0); return [esc(TN[k] || k), `<span class="n-num">${v.n}</span>`, `${K85.bar(fr, v.n, fr === v.n ? 'var(--green)' : fr ? 'var(--yellow)' : 'var(--red)', 120)} <small class="n-mu">${fr}/${v.n} ${byLang('livres', 'free')}</small>`, `<small class="n-mu">${esc(Object.keys(v.lic).slice(0, 2).join(' · '))}</small>`]; });
    const photos = R.filter(a => free(a.license) && a.page).slice(0, 300);
    return K85.head({ t: byLang('Créditos e licenças', 'Credits and licences'), s: `${R.length} ${byLang('imagens no jogo', 'images in the game')}` }) +
      `<div class="n-help">${byLang('Fotos, logos e marcas reais pertencem aos seus titulares. Este é um projeto de fã, sem fins comerciais: antes de qualquer venda, o que não tem licença livre precisa ser licenciado ou substituído.', 'Real photos, logos and brands belong to their owners. This is a non-commercial fan project: before any sale, everything without a free licence must be licensed or replaced.')}</div>` +
      K85.card({ t: byLang('Resumo por tipo', 'Summary by type'), flush: true, body: K85.table([[byLang('Tipo', 'Type')], [byLang('Arquivos', 'Files'), 'c'], [byLang('Licença livre', 'Free licence')], [byLang('Licenças', 'Licences')]], sumRows) }) +
      K85.card({ t: byLang('Fotos com licença livre (autor e licença)', 'Free-licence photos (author and licence)'), flush: true, body: K85.table([[byLang('Arquivo', 'File')], [byLang('Autor e origem', 'Author and source')], [byLang('Licença', 'Licence')]], photos.map(a => [`<small class="n-num">${esc(a.path.replace('assets/img/', ''))}</small>`, a.page ? `<a href="${esc(a.page)}" target="_blank" rel="noopener">${esc(a.origin || '')}</a>` : esc(a.origin || ''), `<small>${esc(a.license || '')}</small>`])) }) +
      K85.card({ t: byLang('Dados', 'Data'), body: `<p class="n-mu">f1db (CC BY 4.0), Wikipedia, Wikidata, formula1.com, ${byLang('sites oficiais das categorias', 'official series websites')}, ${byLang('lista de circuitos licenciados da FIA', 'FIA licensed circuit list')}, ${byLang('traçados', 'layouts')} © OpenStreetMap ${byLang('colaboradores', 'contributors')} (ODbL), Wikimedia Commons. ${byLang('Fontes: Barlow Condensed, Titillium Web, IBM Plex Mono (SIL Open Font License). Bandeiras: flag-icons (MIT).', 'Fonts: Barlow Condensed, Titillium Web, IBM Plex Mono (SIL Open Font License). Flags: flag-icons (MIT).')}</p>` });
  },
};

/* ---------- Finanças: estouros do teto de gastos ---------- */
(function () {
  const sc = SCREENS.finance; if (!sc) return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    if ((UI.params.tab || 'visao') !== 'visao') return out;
    const B = (G.capBreaches || []).slice().reverse().slice(0, 15);
    const body = B.length ? K85.table([[byLang('Ano', 'Year'), 'c'], [byLang('Equipe', 'Team')], [byLang('Acima do teto', 'Over the cap')], [byLang('Tipo', 'Type')], [byLang('Multa', 'Fine')]],
      B.map(b => [b.y, K85.tm(b.tid), `<span class="n-num">${fmtMoney(b.over)}</span> <small class="n-mu">(${b.pct}%)</small>`, b.material ? K85.tag(byLang('grave', 'material'), 'r') : K85.tag(byLang('leve', 'minor'), 'y'), b.fine ? fmtMoney(b.fine) : '—'])) : K85.empty(byLang('Nenhuma equipe estourou o teto de gastos até agora.', 'No team has breached the cost cap so far.'));
    return out + K85.card({ t: byLang('Estouros do teto de gastos', 'Cost cap breaches'), a: byLang('auditoria da FIA no fim de cada ano', 'FIA audit at the end of each year'), flush: !!B.length, body });
  };
})();

/* Diagnóstico: censo dos níveis ocultos de talento (fica só aqui, porque o nível é oculto no jogo) */
(function () {
  const sc = SCREENS.diag; if (!sc || typeof Talent === 'undefined' || !Talent.census) return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    const c = Talent.census(G); const tot = Object.values(c).reduce((a, b) => a + b, 0) || 1;
    const rows = Talent.TIERS.map(t => [esc(t.name || t.id), `<span class="n-num">${c[t.id] || 0}</span>`, K85.bar(c[t.id] || 0, tot, 'var(--team)', 160)]);
    return out + K85.card({ t: byLang('Censo dos níveis ocultos (todos os pilotos ativos)', 'Hidden tier census (all active drivers)'), flush: true, body: K85.table([[byLang('Nível', 'Tier')], [byLang('Pilotos', 'Drivers'), 'c'], ['']], rows) });
  };
})();

/* ---------- Fim de semana: novato no TL1 (regra da FIA: cada carro, 2 vezes por temporada) ---------- */
CHG.fp1Set86 = ACT.fp1Set86 = (el) => { const wk = G.weekend; if (!wk) return; const tid = G.player.teamId; wk.fp1 = wk.fp1 || {}; const m = (wk.fp1[tid] = wk.fp1[tid] || {}); if (el.value) m[el.dataset.car] = el.value; else delete m[el.dataset.car]; autosave(); render(); };
function fp1Panel86() {
  const wk = G.weekend; if (!wk || wk.phase !== 'practice' || Career.isObs(G) || typeof SL === 'undefined') return '';
  const tr = Career.track(G, wk.trackId); const tid = G.player.teamId; const lu = Career.lineup(G, tid);
  const ses = wk.fp && wk.fp.sessions && wk.fp.sessions[0]; const started = !ses || ses.t > 0 || wk.fp.cur > 0;
  const mine = (wk.fp1 && wk.fp1[tid]) || {}; const cands = SL.fp1Candidates(G, tid); const left = SL.remainingFP1(G);
  const car = (n) => { const done = SL.fp1Done(G, tid, n); const main = lu[n - 1]; const pick = mine[n] && Career.driver(G, mine[n]);
    const sel = started || tr.sprint ? `<b>${pick ? esc(pick.name) : esc(main ? main.name : '—')}</b>` : `<select class="inp" data-chg="fp1Set86" data-car="${n}" aria-label="${byLang('Piloto do TL1', 'FP1 driver')}"><option value="">${esc(main ? main.name : '—')} (${byLang('titular', 'race driver')})</option>${cands.map(d => `<option value="${d.id}" ${mine[n] === d.id ? 'selected' : ''}>${esc(d.name)} · ${esc(SL.label(SL.status(G, d)).toLowerCase())} · ${SL.points(G, d)} pts${d.team ? '' : ' · ' + byLang('emprestado', 'on loan')}</option>`).join('')}</select>`;
    return `<div class="fp86-car"><span class="fp86-n">${byLang('Carro', 'Car')} ${n}</span>${sel}<span class="fp86-q">${[0, 1].map(i => `<i class="${i < done ? 'on' : ''}"></i>`).join('')}<small>${done}/${SL.FP1_PER_CAR}</small></span></div>`; };
  const needTot = [1, 2].reduce((a, n) => a + Math.max(0, SL.FP1_PER_CAR - SL.fp1Done(G, tid, n)), 0);
  const note = tr.sprint ? byLang('Fim de semana com Sprint: só há um treino, e as equipes não costumam ceder o carro.', 'Sprint weekend: only one practice session; teams rarely hand the car over.')
    : started ? byLang('O TL1 já começou: a escolha fica para o próximo GP.', 'FP1 has started: the choice waits for the next GP.')
    : needTot ? byLang(`Faltam ${needTot} TL1 com novato e restam ${left} GP(s) sem Sprint. Quem cumpre a regra ganha 1 ponto de superlicença por TL1; o titular perde parte do acerto do treino.`, `${needTot} rookie FP1 session(s) still due with ${left} non-Sprint GP(s) left. Each run earns the rookie 1 super licence point; the race driver loses some setup work.`)
    : byLang('Cota de novatos cumprida nesta temporada.', 'Rookie quota met this season.');
  return K85.card({ t: byLang('Novato no TL1', 'Rookie in FP1'), a: byLang('regra da FIA: 2 vezes por carro na temporada', 'FIA rule: twice per car per season'), body: `<div class="fp86">${car(1)}${car(2)}</div><p class="n-mu fp86-note">${note}</p>` });
}
(function () {
  const sc = SCREENS.weekend; if (!sc) return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    try { const p = fp1Panel86(); if (!p) return out; const i = out.indexOf('<div class="fp-bar panel">'); return i >= 0 ? out.slice(0, i) + p + out.slice(i) : p + out; } catch (e) { return out; }
  };
})();

/* ---------- Página do piloto: superlicença ---------- */
(function () {
  const sc = SCREENS.driverPage; if (!sc || typeof SL === 'undefined') return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    const d = Career.driver(G, UI.params.id); if (!d) return out;
    const st = SL.status(G, d); const pts = SL.points(G, d); const y = G.season.year;
    const bySeason = [y - 3, y - 2, y - 1, y].map(yy => ({ yy, s: sum((d.sl || []).filter(x => !x.fp && x.y === yy).map(x => x.pts || 0)), f: (d.sl || []).filter(x => x.fp && x.y === yy).length }));
    const pp = SL.activePP(G, d); const ppt = sum(pp.map(x => x.pts));
    const W = Math.max(SL.FULL, pts) * 1.1;
    const bar = `<div class="sl86-bar"><i style="width:${Math.min(100, pts / W * 100)}%"></i><em style="left:${SL.FP / W * 100}%"><small>25</small></em><em style="left:${SL.FULL / W * 100}%"><small>40</small></em></div>`;
    const why = (k) => byLang(...(SL.WHY[k] || [k, k]));
    return out + K85.card({ t: byLang('Superlicença', 'Super licence'), a: SL.label(st), body: `<div class="sl86">
      <div class="sl86-top"><span class="sl86-st ${st}">${esc(SL.label(st))}</span><b class="n-num">${pts}</b><small>${byLang('pontos nas 3 últimas temporadas', 'points in the last 3 seasons')}${SL.fpPts(G, d) ? ` · ${SL.fpPts(G, d)} ${byLang('de treino livre', 'from practice')}` : ''}</small></div>${bar}
      <div class="sl86-y">${bySeason.map(x => `<span><small>${x.yy}</small><b class="n-num">${x.s + x.f}</b>${x.f ? `<em>${x.f} TL</em>` : ''}</span>`).join('')}</div>
      <div class="sl86-pp"><span><small>${byLang('Pontos de punição (12 meses)', 'Penalty points (12 months)')}</small><b class="n-num ${ppt >= 8 ? 'n-loss' : ''}">${ppt}/12</b>${K85.bar(ppt, 12, ppt >= 8 ? 'var(--red)' : ppt >= 4 ? 'var(--yellow)' : 'var(--green)')}</span>
        ${pp.length ? `<div class="sl86-ppl">${pp.slice().reverse().map(x => `<small>${esc(x.gp || '')} · ${x.pts} pt(s) · ${esc(why(x.why))} · ${byLang('expira em', 'expires on')} ${esc(Time.fmt(Time.addDays(x.date, 365)))}</small>`).join('')}</div>` : `<small class="n-mu">${byLang('Nenhum ponto ativo.', 'No active points.')}</small>`}</div></div>` });
  };
})();

/* ---------- Carro: componentes do motor e câmbio (0.8.6-B) ---------- */
(function () {
  const sc = SCREENS.car; if (!sc) return;
  const h = sc.html;
  sc.html = function () {
    const base = h.call(this);
    if (Career.isObs(G) || typeof Parts === 'undefined') return base;
    const ds = Career.lineup(G, G.player.teamId).slice(0, 2);
    if (!ds.length) return base;
    const can = !G.weekend || G.weekend.phase === 'practice';
    const R = Regs.r(G);
    const cell = (d, k) => {
      const P = Parts.pu(G, d).c[k]; const lim = Parts.limit(G, k);
      const next = P.used + 1 > lim ? (P.pen ? Math.ceil(R.engineGridPenalty / 2) : R.engineGridPenalty) : 0;
      const col = P.wear > 85 ? 'var(--red)' : P.wear > 65 ? 'var(--yellow)' : 'var(--green)';
      return `<div class="pu86"><span class="pu86-n n-num ${P.used > lim ? 'n-loss' : ''}">${P.used}/${lim}</span>${K85.bar(100 - P.wear, 100, col, 90)}<small class="n-mu n-num">${Math.round(100 - P.wear)}%</small>${can ? `<button class="btn sm" data-act="puSwap86" data-d="${d.id}" data-k="${k}" title="${esc(byLang('Montar um elemento novo antes da classificação', 'Fit a new element before qualifying'))}">${byLang('Trocar', 'Swap')}${next ? ` <em class="n-loss">+${next}</em>` : ''}</button>` : ''}</div>`;
    };
    const rows = Parts.KEYS.map(k => [`<b>${esc(Parts.label(k))}</b>`, ...ds.map(d => cell(d, k))]);
    const risk = ds.map(d => { const m = Parts.raceMods(G, d.id); return `<span>${esc(shortName(d))}: ${byLang('risco de quebra', 'failure risk')} <b class="n-num ${m.risk > 1.4 ? 'n-loss' : ''}">×${m.risk.toFixed(2)}</b> · ${byLang('perda por desgaste', 'wear loss')} <b class="n-num">${m.pace ? '+' + m.pace.toFixed(2) + 's' : '0'}</b></span>`; }).join(' · ');
    const card = K85.card({ t: byLang('Motor e câmbio por componente', 'Power unit and gearbox by element'), a: `<small class="n-mu">${byLang('usados / cota da temporada · vida útil restante', 'used / season allocation · life left')}</small>`, flush: true,
      body: K85.table([[byLang('Elemento', 'Element')], ...ds.map(d => [esc(d.name)])], rows) + `<div class="n-help" style="margin:10px 14px"><div><div>${risk}</div><div style="margin-top:6px">${byLang(`Acima da cota, o primeiro elemento novo custa ${R.engineGridPenalty} posições no grid e cada um depois, ${Math.ceil(R.engineGridPenalty / 2)}. Mais de 15 posições: largada do fim do grid. Peça gasta perde rendimento e quebra mais. ${can ? 'A troca vale para a próxima classificação.' : 'Trocas só antes da classificação.'}`, `Beyond the allocation, the first new element costs ${R.engineGridPenalty} grid places and each one after, ${Math.ceil(R.engineGridPenalty / 2)}. Over 15 places: start from the back. Worn parts lose performance and fail more. ${can ? 'The swap applies to the next qualifying.' : 'Swaps only before qualifying.'}`)}</div></div></div>` });
    return base + card;
  };
  ACT.puSwap86 = (el) => {
    if (G.weekend && G.weekend.phase !== 'practice') return toast(byLang('Trocas só antes da classificação.', 'Swaps only before qualifying.'), 'bad');
    const pen = Parts.swapNow(G, el.dataset.d, el.dataset.k);
    const d = Career.driver(G, el.dataset.d);
    if (pen) Career.ledger(G, byLang(`Elemento extra: ${Parts.label(el.dataset.k, true)} (${d.name})`, `Extra element: ${Parts.label(el.dataset.k, true)} (${d.name})`), -Parts.extraCost(el.dataset.k), 'motor');
    toast(pen ? byLang(`${Parts.label(el.dataset.k, true)} novo para ${d.name}: ${pen} posições de punição no grid.`, `New ${Parts.label(el.dataset.k, true)} for ${d.name}: ${pen}-place grid penalty.`) : byLang(`${Parts.label(el.dataset.k, true)} novo para ${d.name}, dentro da cota.`, `New ${Parts.label(el.dataset.k, true)} for ${d.name}, within the allocation.`), pen ? 'bad' : 'good');
    autosave(); render();
  };
})();

/* ---------- Pilotos: política de equipe e tensão entre companheiros (0.8.6-B) ---------- */
(function () {
  if (typeof drivers85 !== 'function' || typeof Orders === 'undefined') return;
  const d85 = drivers85;
  drivers85 = function () {
    const base = d85();
    const ds = Career.teamDrivers(G, G.player.teamId).filter(d => d.seat !== 'R');
    if (ds.length < 2) return base;
    const [a, b] = ds; const n1 = Orders.no1(G); const ten = Orders.tension(G, a.id, b.id);
    const opt3 = [['', byLang('Disputa livre', 'Free racing')], [a.id, `${byLang('Nº 1', 'No. 1')}: ${a.name}`], [b.id, `${byLang('Nº 1', 'No. 1')}: ${b.name}`]];
    const dis = ds.map(d => `${esc(shortName(d))}: <b class="n-num">${d.disobey || 0}</b>`).join(' · ');
    const card = K85.card({ t: byLang('Política de equipe', 'Team policy'), body: `<div class="pol86">
      <div class="pol86-seg">${opt3.map(([v, l]) => `<button class="seg ${(n1 || '') === v ? 'on' : ''}" data-act="setNo186" data-v="${v}">${esc(l)}</button>`).join('')}</div>
      <div class="pol86-k"><span><small>${byLang('Química entre os dois', 'Chemistry between them')}</small>${(() => { const ch = typeof People !== 'undefined' ? People.chem(G, a.id, b.id) : -ten; return `${K85.bar(ch + 100, 200, ch >= 15 ? 'var(--green)' : ch <= -15 ? 'var(--red)' : 'var(--yellow)', 160)} <b class="n-num">${ch > 0 ? '+' : ''}${ch}</b> <em class="n-mu">${typeof People !== 'undefined' ? esc(People.chemLabel(ch)) : ''}</em>`; })()}</span><span><small>${byLang('Ordens desobedecidas (recentes)', 'Orders disobeyed (recent)')}</small>${dis}</span></div>
      <p class="n-mu n-sm">${n1 ? byLang('Com piloto nº 1, a equipe pede passagem sozinha quando ele está logo atrás. O nº 2 obedece mais, mas perde moral a cada corrida.', 'With a number one driver, the team asks for the swap automatically when he is right behind. The number two obeys more but loses morale every race.') : byLang('Disputa livre: nenhum pedido automático. Você ainda pode dar ordens pelo rádio durante a corrida.', 'Free racing: no automatic requests. You can still give radio orders during the race.')}</p></div>` });
    return base + card;
  };
  ACT.setNo186 = (el) => { Orders.setNo1(G, el.dataset.v || null); autosave(); render(); };
})();


/* ---------- Conversas com os pilotos (0.8.6-A) ---------- */
SCREENS.talks = {
  html() {
    if (Career.isObs(G) || typeof Talks === 'undefined') return K85.empty(byLang('Disponível só no modo carreira.', 'Available in career mode only.'));
    const ds = Career.teamDrivers(G, G.player.teamId).sort((a, b) => (a.seat === 'R' ? 9 : a.seat) - (b.seat === 'R' ? 9 : b.seat));
    if (!ds.length) return K85.empty(byLang('Sem pilotos na equipe.', 'No drivers in the team.'));
    const sel = Career.driver(G, UI.talkDid) || ds[0]; UI.talkDid = sel.id;
    const T = UI.talk && UI.talk.did === sel.id && UI.talk.y === G.season.year && UI.talk.r === G.season.round ? UI.talk : null;
    const mates = ds.filter(d => d.seat !== 'R');
    const chem = mates.length === 2 ? People.chem(G, mates[0].id, mates[1].id) : null;
    const trustBar = (d) => { const v = Math.round(People.trust(d)); return `${K85.bar(v, 100, v >= 65 ? 'var(--green)' : v >= 40 ? 'var(--yellow)' : 'var(--red)', 90)} <b class="n-num">${v}</b>`; };
    const list = ds.map(d => `<button class="tk86-d ${d.id === sel.id ? 'on' : ''}" data-act="talkSel86" data-v="${d.id}" style="--tc:${Career.team(G).color}">${K85.av(d, 44)}<span><b>${esc(d.name)}</b><small>${d.seat === 'R' ? byLang('Reserva', 'Reserve') : byLang('Carro', 'Car') + ' #' + d.seat} · ${esc(byLang(...Talks.ARCH[Talks.arch(d)]))}</small><small>${byLang('Confiança', 'Trust')} ${trustBar(d)}</small><small>${byLang('Moral', 'Morale')} <b class="n-num">${Math.round(d.morale ?? 70)}</b>${Talks.canTalk(G, d) ? '' : ` · <em class="n-mu">${byLang('já conversaram nesta etapa', 'already talked this round')}</em>`}</small></span></button>`).join('');
    const causes = People.causes(G, sel);
    const causeHtml = causes.length ? causes.map(c => `<span class="tk86-c ${c.v >= 0 ? 'up' : 'dn'}"><b class="n-num">${c.v >= 0 ? '+' : ''}${c.v}</b>${esc(c.name)}</span>`).join('') : `<small class="n-mu">${byLang('Sem mudanças recentes.', 'No recent changes.')}</small>`;
    let talk;
    if (!Talks.canTalk(G, sel) && !(T && T.res)) talk = `<p class="n-mu">${byLang(`Você já conversou com ${esc(shortName(sel))} nesta etapa. Volte depois da próxima corrida.`, `You already talked to ${esc(shortName(sel))} this round. Come back after the next race.`)}</p>`;
    else if (!T) talk = `<p class="n-mu">${byLang('Chame o piloto para uma conversa. O assunto vem do momento dele: resultados, companheiro, contrato, promessas, ordens...', 'Call the driver in for a talk. The topic comes from his situation: results, team-mate, contract, promises, orders...')}</p><button class="btn primary" data-act="talkStart86">${byLang('Chamar para conversar', 'Call in for a talk')}</button>`;
    else {
      const face = K85.av(sel, 56);
      talk = `<div class="tk86-chat"><div class="tk86-b them">${face}<p>${esc(T.open)}</p></div>
        ${T.res ? `<div class="tk86-b me"><p>${esc(T.chosen)}</p></div><div class="tk86-b them ${T.res.tone}">${face}<p>${esc(T.res.reply)}</p></div>
          <div class="tk86-fx"><span>${byLang('Moral', 'Morale')} <b class="n-num ${T.res.mood >= 0 ? 'n-gain' : 'n-loss'}">${T.res.mood >= 0 ? '+' : ''}${T.res.mood}</b></span><span>${byLang('Confiança', 'Trust')} <b class="n-num ${T.res.trust >= 0 ? 'n-gain' : 'n-loss'}">${T.res.trust >= 0 ? '+' : ''}${T.res.trust}</b></span>${T.res.promise ? `<span>${K85.tag(byLang('Promessa registrada', 'Promise recorded'), 'acc')} ${esc(People.promiseText(T.res.promise.kind))}</span>` : ''}</div>`
        : `<div class="tk86-o">${T.opts.map(o => `<button class="btn" data-act="talkAns86" data-v="${o.k}">${esc(o.label)}</button>`).join('')}</div>`}</div>`;
    }
    const prom = People.promises(G).filter(p => ds.some(d => d.id === p.did) && p.y === G.season.year).slice().reverse().slice(0, 8);
    const ST = { open: [byLang('Em aberto', 'Open'), ''], kept: [byLang('Cumprida', 'Kept'), 'pos'], broken: [byLang('Quebrada', 'Broken'), 'neg'], void: [byLang('Anulada', 'Void'), ''] };
    const promHtml = prom.length ? K85.table([[byLang('Piloto', 'Driver')], [byLang('Promessa', 'Promise')], [byLang('Prazo', 'Due'), 'c'], [byLang('Situação', 'Status')]], prom.map(p => [K85.who(p.did, { tid: G.player.teamId }), `<small>${esc(People.promiseText(p.kind))}</small>`, `<span class="n-num">${byLang('etapa', 'round')} ${p.due}</span>`, K85.tag(ST[p.state][0], ST[p.state][1])])) : K85.empty(byLang('Nenhuma promessa neste ano.', 'No promises this year.'));
    const hist = (sel.talkLog || []).slice().reverse().slice(0, 6);
    const histHtml = hist.length ? hist.map(h => `<div class="tk86-h ${h.tone}"><small>${h.y} · ${byLang('etapa', 'round')} ${h.r}</small><span>${esc(h.reply)}</span><em class="n-num">${h.mood >= 0 ? '+' : ''}${h.mood} / ${h.trust >= 0 ? '+' : ''}${h.trust}</em></div>`).join('') : `<small class="n-mu">${byLang('Nenhuma conversa ainda.', 'No talks yet.')}</small>`;
    return K85.head({ t: byLang('Conversas', 'Talks'), s: byLang('Relação com os pilotos: confiança, promessas e humor', 'Relationship with the drivers: trust, promises and mood') }) +
      K85.grid('minmax(0,0.9fr) minmax(0,1.6fr)',
        K85.col(K85.card({ t: byLang('Pilotos', 'Drivers'), body: `<div class="tk86-list">${list}</div>` }),
          chem != null ? K85.card({ t: byLang('Química entre os titulares', 'Chemistry between the race drivers'), body: `<div class="tk86-chem"><b class="n-num ${chem >= 15 ? 'n-gain' : chem <= -15 ? 'n-loss' : ''}">${chem > 0 ? '+' : ''}${chem}</b><span>${esc(People.chemLabel(chem))}</span></div><p class="n-mu n-sm">${byLang('Sobe com a convivência e ordens justas; cai com batidas entre os dois, ordens a favor de um só e briga pelo posto de nº 1. Alta: os dois trocam dados e chegam mais confiantes à classificação. Baixa: ignoram mais as ordens e vazam coisas para a imprensa.', 'Rises with time together and fair orders; drops with crashes between them, orders favouring one, and fights for number one status. High: they share data and reach qualifying more confident. Low: they ignore orders more and leak to the press.')}</p>` }) : ''),
        K85.col(K85.card({ t: `${byLang('Conversa com', 'Talk with')} ${sel.name}`, a: `<small class="n-mu">${esc(byLang(...Talks.ARCH[Talks.arch(sel)]))}</small>`, body: `<div class="tk86-cz"><small>${byLang('O que mais mexeu com o humor dele', 'What moved his mood the most')}</small>${causeHtml}</div>${talk}` }),
          K85.card({ t: byLang('Promessas', 'Promises'), flush: true, body: promHtml }),
          K85.card({ t: byLang('Conversas anteriores', 'Previous talks'), body: histHtml })));
  },
};
ACT.talkSel86 = (el) => { UI.talkDid = el.dataset.v; render(); };
ACT.talkStart86 = () => { const t = Talks.start(G, UI.talkDid); if (!t) return; UI.talk = Object.assign(t, { y: G.season.year, r: G.season.round }); render(); };
ACT.talkAns86 = (el) => {
  const T = UI.talk; if (!T || T.res) return;
  const o = T.opts.find(x => x.k === el.dataset.v); const res = Talks.answer(G, T.did, T.topic, el.dataset.v);
  if (!res) return toast(byLang('Já conversaram nesta etapa.', 'Already talked this round.'), 'bad');
  T.res = res; T.chosen = o ? o.label.replace(/^[^:]+:\s*/, '') : ''; autosave(); render();
};

/* ---------- Página do piloto: humor com causas, confiança e química ---------- */
(function () {
  const sc = SCREENS.driverPage; if (!sc || typeof People === 'undefined') return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    const d = Career.driver(G, UI.params.id); if (!d || !d.team) return out;
    const causes = People.causes(G, d);
    const mate = Career.teamDrivers(G, d.team).find(x => x.id !== d.id && x.seat !== 'R');
    const chem = mate && d.seat !== 'R' ? People.chem(G, d.id, mate.id) : null;
    const mine = d.team === G.player.teamId && !Career.isObs(G);
    return out + K85.card({ t: byLang('Humor', 'Mood'), a: mine ? `<a data-act="go" data-v="talks">${byLang('conversar', 'talk')}</a>` : '', body: `<div class="mood86">
      <div class="mood86-k"><span><small>${byLang('Moral', 'Morale')}</small><b class="n-num">${Math.round(d.morale ?? 70)}</b></span>${mine ? `<span><small>${byLang('Confiança no chefe', 'Trust in the boss')}</small><b class="n-num">${Math.round(People.trust(d))}</b></span>` : ''}${chem != null ? `<span><small>${byLang('Química com', 'Chemistry with')} ${esc(shortName(mate))}</small><b class="n-num">${chem > 0 ? '+' : ''}${chem}</b> <em class="n-mu">${esc(People.chemLabel(chem))}</em></span>` : ''}<span><small>${byLang('Perfil', 'Profile')}</small><b>${esc(byLang(...Talks.ARCH[Talks.arch(d)]))}</b></span></div>
      <div class="tk86-cz"><small>${byLang('Principais motivos nas últimas etapas', 'Main reasons over the last rounds')}</small>${causes.length ? causes.map(c => `<span class="tk86-c ${c.v >= 0 ? 'up' : 'dn'}"><b class="n-num">${c.v >= 0 ? '+' : ''}${c.v}</b>${esc(c.name)}</span>`).join('') : `<small class="n-mu">${byLang('Sem mudanças recentes.', 'No recent changes.')}</small>`}</div>
      <p class="n-mu n-sm">${byLang('A moral pesa pouco na pista: alta dá um pouco mais de ritmo e menos erros; baixa, o contrário.', 'Morale matters a little on track: high gives slightly more pace and fewer mistakes; low, the opposite.')}</p></div>` });
  };
})();

/* ---------- Funcionários: clima, pedidos e conflitos ---------- */
(function () {
  const sc = SCREENS.team; if (!sc || typeof People === 'undefined') return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    if ((UI.params.tab || 'drivers') !== 'staff' || Career.isObs(G)) return out;
    const t = Career.team(G); const L = (t.staffList || []).filter(s => !s.isPlayer).slice().sort((a, b) => (a.morale ?? 70) - (b.morale ?? 70));
    const C = G.staffConflict && G.staffConflict.y === G.season.year && G.staffConflict.until > G.season.round ? G.staffConflict : null;
    const B = G.staffBoost && G.staffBoost.y === G.season.year && G.staffBoost.until > G.season.round ? G.staffBoost : null;
    const nm = (id) => { const s = t.staffList.find(x => x.id === id); return s ? s.name : ''; };
    const rows = L.map(s => { const m = Math.round(s.morale ?? 70); return [`<b>${esc(s.name)}</b>`, `<small>${esc(People.roleName(s.role))}</small>`, `${K85.bar(m, 100, m >= 65 ? 'var(--green)' : m >= 45 ? 'var(--yellow)' : 'var(--red)', 100)} <span class="n-num">${m}</span>`, s.poachRisk ? K85.tag(byLang('pode sair', 'may leave'), 'neg') : (m < 45 ? K85.tag(byLang('insatisfeito', 'unhappy'), 'neg') : '')]; });
    return out + K85.card({ t: byLang('Clima entre os funcionários', 'Staff mood'), a: C ? K85.tag(byLang('Conflito em andamento', 'Ongoing conflict'), 'neg') : B ? K85.tag(byLang('Verba extra ativa', 'Extra budget active'), 'pos') : '', flush: true,
      body: (C ? `<div class="n-help" style="margin:10px 14px">${byLang(`${esc(nm(C.a))} e ${esc(nm(C.b))} estão em conflito até a etapa ${C.until}: os projetos de P&D rendem cerca de 7% menos.`, `${esc(nm(C.a))} and ${esc(nm(C.b))} are in conflict until round ${C.until}: R&D projects yield about 7% less.`)}</div>` : '') +
        K85.table([[byLang('Nome', 'Name')], [byLang('Cargo', 'Role')], [byLang('Moral', 'Morale')], ['']], rows) +
        `<p class="n-mu n-sm" style="margin:10px 14px">${byLang('A moral sobe com bons resultados e pedidos atendidos. Funcionários bons pedem aumento, verba ou promoção; chefes de área insatisfeitos entram em conflito; o diretor técnico pode pedir demissão depois de um ano abaixo da meta.', 'Morale rises with good results and granted requests. Good staff ask for raises, budget or promotion; unhappy department heads clash; the technical director may resign after a year below target.')}</p>` });
  };
})();

/* ---------- Equipe irmã: indicar pilotos e reestilizar (0.8.6) ---------- */
(function () {
  const sc = SCREENS.sister; if (!sc) return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    if (Career.isObs(G)) return out;
    const child = Sisters.childOf(G, G.player.teamId); if (!child) return out;
    const c = Career.team(G, child);
    const race = G.db.drivers.filter(d => d.team === child && d.seat !== 'R').sort((a, b) => a.seat - b.seat);
    const cands = Sisters.nomCandidates(G, child);
    const SRC = { academy: byLang('Academia', 'Academy'), reserve: byLang('Seu reserva', 'Your reserve'), free: byLang('Livre', 'Free agent') };
    const nom = K85.card({ t: `${byLang('Indicar pilotos para a', 'Nominate drivers for')} ${c.name}`, flush: true,
      body: K85.table([[byLang('Carro', 'Car'), 'c'], [byLang('Piloto atual', 'Current driver')], [byLang('Nota', 'Rating'), 'c'], [byLang('Contrato', 'Contract'), 'c'], ['', 'r']],
        race.map(d => [`<b class="n-num">#${d.seat}</b>`, K85.who(d.id, { tid: child }), `<b class="n-num">${driverOverall(d)}</b>`, `<span class="n-num">${d.contract ? d.contract.until : G.season.year + Math.max(0, d.contractYears || 0)}</span>`, G.weekend ? `<small class="n-mu">${byLang('depois da corrida', 'after the race')}</small>` : `<button class="btn sm" data-act="sisNomOpen86" data-id="${d.id}" ${cands.length ? '' : 'disabled'}>${byLang('Substituir', 'Replace')}</button>`])) +
        `<p class="n-mu n-sm" style="margin:10px 14px">${byLang(`Como dona da ${esc(c.name)}, você escolhe quem corre nela: alguém da academia, o seu reserva ou um piloto livre com superlicença (${cands.length} disponíveis). Quem sai vira reserva da irmã ou fica livre; a rescisão sai do caixa da irmã.`, `As owner of ${esc(c.name)}, you choose who races there: someone from the academy, your reserve or a free agent with a super licence (${cands.length} available). The driver who leaves becomes the sister team's reserve or a free agent; the sister team pays any termination.`)}</p>` });
    const reb = c.rebranded;
    const brand = K85.card({ t: byLang('Identidade da equipe', 'Team identity'), a: `<button class="btn sm primary" data-act="sisBrandGo86">${byLang('Reestilizar', 'Restyle')}</button>`,
      body: `<div class="br86-now">${teamLogo(c)}<div><b>${esc(c.fullName || c.name)}</b><small class="n-mu">${esc(c.short || '')} · ${esc(c.chassisName || '')}</small><span class="br86-sw"><i style="background:${c.color}"></i><i style="background:${c.color2 || c.color}"></i></span></div></div>
        <p class="n-mu n-sm">${reb ? byLang(`Identidade nova desde ${reb.y} (antes: ${esc(reb.from.name)}).`, `New identity since ${reb.y} (formerly ${esc(reb.from.name)}).`) + ` <a data-act="sisBrandRestore86">${byLang('voltar à original', 'restore the original')}</a>` : byLang('Você pode trocar nome, sigla, cores, logo e nome do chassi da equipe irmã.', 'You can change the sister team name, code, colours, logo and chassis name.')}</p>` });
    return out + K85.grid('minmax(0,1.5fr) minmax(0,1fr)', nom, brand);
  };
  ACT.sisNomOpen86 = (el) => {
    const child = Sisters.childOf(G, G.player.teamId); const d = Career.driver(G, el.dataset.id); if (!child || !d) return;
    const SRC = { academy: byLang('Academia', 'Academy'), reserve: byLang('Seu reserva', 'Your reserve'), free: byLang('Livre', 'Free agent') };
    const list = Sisters.nomCandidates(G, child);
    modal(byLang(`Quem entra no lugar de ${d.name}?`, `Who replaces ${d.name}?`), `<div class="stack">${list.map(x => `<button class="btn opt" data-act="sisNom86" data-out="${d.id}" data-in="${x.d.id}"><span>${esc(x.d.name)} · ${x.d.age} ${byLang('anos', 'years')}</span><span class="small muted">${SRC[x.src]} · ${byLang('nota', 'rating')} ${driverOverall(x.d)}${x.d.cat ? ' · ' + esc(((typeof Cats !== 'undefined' && Cats.get(G, x.d.cat)) || {}).short || '') : ''}</span></button>`).join('') || `<p class="muted">${byLang('Ninguém disponível com superlicença.', 'Nobody available with a super licence.')}</p>`}</div>`);
  };
  ACT.sisNom86 = (el) => { const child = Sisters.childOf(G, G.player.teamId); const e = Sisters.nominate(G, child, el.dataset.out, el.dataset.in); closeModal(); if (e) return toast(e, 'bad'); toast(byLang('Indicação feita. Vale a partir da próxima etapa.', 'Nomination done. It applies from the next round.'), 'good'); autosave(); render(); };
  ACT.sisBrandGo86 = () => { const child = Sisters.childOf(G, G.player.teamId); const t = Career.team(G, child); if (!t) return; UI.brand = { child, name: t.name, fullName: t.fullName || t.name, short: t.short || '', color: t.color, color2: t.color2 || t.color, logo: 'keep', chassisName: t.chassisName || '', keepCar: !!t.carImg }; go('sisterBrand'); };
  ACT.sisBrandRestore86 = () => { const e = Sisters.restoreBrand(G, Sisters.childOf(G, G.player.teamId)); if (e) return toast(e, 'bad'); toast(byLang('Identidade original de volta.', 'Original identity restored.'), 'good'); autosave(); render(); };
  // depois de comprar, já abre a tela de identidade
  const buy = ACT.sisBuy;
  ACT.sisBuy = (el) => { buy(el); if (Sisters.childOf(G, G.player.teamId)) ACT.sisBrandGo86(); };
})();

SCREENS.sisterBrand = {
  html() {
    const B = UI.brand; const t = B && Career.team(G, B.child);
    if (!t || Sisters.parentOf(G, B.child) !== G.player.teamId) return K85.empty(byLang('Nenhuma equipe irmã para reestilizar.', 'No sister team to restyle.'));
    const prev = { ...t, name: B.name || t.name, short: (B.short || (B.name || '').slice(0, 3)).toUpperCase(), color: B.color, color2: B.color2, logo: B.logo === 'keep' ? t.logo : B.logo, carImg: null };
    const logos = (typeof GENERIC_LOGOS !== 'undefined' ? GENERIC_LOGOS : []).map((p, i) => `<button class="tlogo ${B.logo === p ? 'on' : ''}" style="--tc:${B.color};width:48px;height:48px;cursor:pointer;${B.logo === p ? 'outline:3px solid var(--acc);' : ''}" data-act="brLogo86" data-v="${p}" title="${i + 1}"><img src="${imgUrl(p)}" alt=""></button>`).join('');
    const f = (k, label, max, ph) => `<label class="field"><span>${label}</span><input class="inp" value="${esc(B[k] || '')}" maxlength="${max}" data-inp="brT86" data-k="${k}" placeholder="${esc(ph || '')}"></label>`;
    return K85.head({ t: byLang('Nova identidade', 'New identity'), s: `${esc(t.rebranded ? t.rebranded.from.name : t.name)} · ${byLang('equipe irmã', 'sister team')}`, act: K85.btn(byLang('Voltar', 'Back'), { act: 'go', v: 'sister' }) }) +
      K85.grid('minmax(0,1.4fr) minmax(0,1fr)',
        K85.card({ t: byLang('Nome e cores', 'Name and colours'), body: `<div class="grid g2" style="gap:10px">${f('name', byLang('Nome', 'Name'), 28, 'Racing Bulls')}${f('fullName', byLang('Nome completo', 'Full name'), 48, 'Visa Cash App Racing Bulls F1 Team')}${f('short', byLang('Sigla (3 letras)', 'Code (3 letters)'), 3, 'RB')}${f('chassisName', byLang('Nome do chassi', 'Chassis name'), 16, 'VCARB 03')}
            <label class="field"><span>${byLang('Cor principal', 'Main colour')}</span><input class="inp" type="color" style="height:42px;padding:3px" value="${esc(B.color)}" data-chg="brC86" data-k="color"></label>
            <label class="field"><span>${byLang('Cor secundária', 'Second colour')}</span><input class="inp" type="color" style="height:42px;padding:3px" value="${esc(B.color2)}" data-chg="brC86" data-k="color2"></label></div>
          <div class="label" style="margin-top:12px">${byLang('Logo', 'Logo')}</div><div class="row" style="flex-wrap:wrap;gap:6px"><button class="btn sm ${B.logo === 'keep' ? 'primary' : ''}" data-act="brLogo86" data-v="keep">${byLang('Manter o atual', 'Keep current')}</button>${logos}</div>
          <label class="field" style="margin-top:10px"><span>${byLang('Ou importe o seu logo (PNG, JPG, SVG ou WEBP)', 'Or import your own logo (PNG, JPG, SVG or WEBP)')}</span><input class="inp" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" data-chg="brFile86"></label>
          <label class="row" style="gap:8px;margin-top:10px"><input type="checkbox" ${B.keepCar ? 'checked' : ''} data-chg="brCar86"> <span class="n-sm">${byLang('Manter a foto do carro atual (desmarque se a pintura nova não combina)', 'Keep the current car photo (untick if the new livery does not match)')}</span></label>` }),
        K85.col(K85.card({ t: byLang('Prévia', 'Preview'), body: `<div class="br86-prev" style="--c1:${B.color};--c2:${B.color2}"><div class="br86-stripe"></div>${teamLogo(prev)}<b>${esc(B.fullName || B.name || '')}</b><small>${esc(prev.short)} · ${esc(B.chassisName || '')}</small></div><div style="margin-top:12px">${K85.tm ? `<span class="n-tm"><i class="n-slab" style="background:${B.color}"></i>${esc(B.name || '')}</span>` : ''}</div>` }),
          K85.card({ body: `<p class="n-mu n-sm">${byLang('A nova identidade aparece em todo o jogo: classificação, corrida, notícias e redes. As trocas reais de patrocinador da temporada deixam de valer para esta equipe. Dá para voltar à identidade original na tela da equipe irmã.', 'The new identity shows across the game: standings, race, news and social media. The season\'s real sponsor-name changes no longer apply to this team. You can restore the original identity on the sister team screen.')}</p><button class="btn primary" data-act="brSave86">${byLang('Aplicar nova identidade', 'Apply new identity')}</button>` })));
  },
};
ACT.brLogo86 = (el) => { UI.brand.logo = el.dataset.v; render(); };
CHG.brT86 = (el) => { UI.brand[el.dataset.k] = el.value; };
CHG.brC86 = (el) => { UI.brand[el.dataset.k] = el.value; render(); };
CHG.brCar86 = (el) => { UI.brand.keepCar = el.checked; };
CHG.brFile86 = (el) => {
  const f = el.files && el.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); const k = Math.min(1, 256 / Math.max(img.width, img.height)); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); UI.brand.logo = c.toDataURL('image/png'); render(); }; img.src = rd.result; };
  rd.readAsDataURL(f);
};
ACT.brSave86 = () => { const B = UI.brand; const e = Sisters.rebrand(G, B.child, B); if (e) return toast(e, 'bad'); toast(byLang('Nova identidade aplicada.', 'New identity applied.'), 'good'); autosave(); go('sister'); };
AREA_OF85.sisterBrand = 'equipe'; SCREEN_TITLE85.sisterBrand = 'Nova identidade';

/* ---------- Finanças: previsão do ano, receita prevista, custos fixos e patrimônio dos donos
   (existiam na 0.8.4 e sumiram quando a tela foi refeita na 0.8.5) ---------- */
(function () {
  const sc = SCREENS.finance; if (!sc) return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    if ((UI.params.tab || 'visao') !== 'visao' || Career.isObs(G)) return out;
    const team = Career.team(G); const s = G.season;
    const L = (G.finances.ledger || []).filter(x => x.year === s.year);
    const played = Math.max(1, s.round), left = s.calendar.length - s.round;
    const net = sum(L.map(x => x.amount)) / played;
    const pos = Career.standingsC(G).findIndex(x => x.tid === team.id) + 1;
    const proj = G.finances.balance + net * left;
    const cap = typeof Econ !== 'undefined' ? Econ.cap(G) : G.db.rules.budgetCap;
    const capProj = typeof Econ !== 'undefined' ? G.finances.spent + Econ.committed(G, team) - cap * 0.03 * (left / s.calendar.length) : G.finances.spent / played * s.calendar.length;
    const capPct = Math.round(capProj / cap * 100);
    const drv = sum(Career.teamDrivers(G, team.id).map(d => d.salary || 0)), stf = typeof Staff !== 'undefined' ? Staff.payroll(team) : 0;
    const box = (l, v, sub, cls) => `<div class="fc86"><small>${l}</small><b class="n-num ${cls || ''}">${v}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
    let econ = '';
    if (typeof Econ !== 'undefined') {
      const rv = Econ.revenue(G, team); const spon = sum((G.sponsors || []).map(x => x.perRace || 0)) * s.calendar.length; const pool = Math.max(1, Econ.sponsorPool(team));
      econ = box(byLang('Receita prevista no ano', 'Expected revenue this year'), fmtMoney(rv.commercial + spon + rv.owner), byLang(`comercial ${fmtMoney(rv.commercial)} · patrocínio ${fmtMoney(spon)} · donos ${fmtMoney(rv.owner)}`, `commercial ${fmtMoney(rv.commercial)} · sponsorship ${fmtMoney(spon)} · owners ${fmtMoney(rv.owner)}`)) +
        box(byLang('Mercado de patrocínio', 'Sponsorship market'), Math.round(spon / pool * 100) + '%', byLang(`do que as marcas pagam por uma equipe com a sua exposição (${fmtMoney(pool)}/ano)`, `of what brands pay a team with your exposure (${fmtMoney(pool)}/yr)`)) +
        box(byLang('Custos fixos no ano', 'Fixed costs this year'), fmtMoney(-(Econ.factory(G, team) + Econ.marketing(G, team))), byLang(`fábrica e pessoal ${fmtMoney(Econ.factory(G, team))} · marketing ${fmtMoney(Econ.marketing(G, team))}`, `factory and staff ${fmtMoney(Econ.factory(G, team))} · marketing ${fmtMoney(Econ.marketing(G, team))}`), 'n-loss') +
        box(byLang('Patrimônio dos donos', 'Owners\' equity'), fmtMoney(G.finances.corporate || 0), byLang(`o caixa guarda até ${fmtMoney(Econ.reserve(G, team))}; o excedente vai para os donos`, `the team keeps up to ${fmtMoney(Econ.reserve(G, team))}; the surplus goes to the owners`));
    }
    const card = K85.card({ t: byLang(`Previsão para o fim de ${s.year}`, `Forecast for the end of ${s.year}`), a: `<small class="n-mu">${byLang(`média das ${played} etapa(s) disputada(s)`, `average of ${played} round(s) raced`)}</small>`,
      body: `<div class="fc86-g">${box(byLang('Caixa projetado', 'Projected cash'), fmtMoney(proj), byLang(`você está em ${ordinal(pos)}: a posição final define a distribuição comercial do ano que vem`, `you are ${ordinal(pos)}: the final position sets next year's commercial payout`), proj < 0 ? 'n-loss' : 'n-gain')}
        ${box(byLang('Teto no fim do ano', 'Cap at year end'), capPct + '%', capProj > cap ? byLang('risco de estourar o teto: multa e punição esportiva', 'risk of breaching the cap: fine and sporting penalty') : byLang('dentro do limite', 'within the limit'), capProj > cap ? 'n-loss' : '')}
        ${box(byLang('Folha fixa por ano', 'Fixed payroll per year'), fmtMoney(drv + stf), byLang(`pilotos ${fmtMoney(drv)} · funcionários ${fmtMoney(stf)}`, `drivers ${fmtMoney(drv)} · staff ${fmtMoney(stf)}`))}${econ}</div>` });
    // entra logo depois do cabeçalho da tela
    try { const tmp = document.createElement('div'); tmp.innerHTML = out; const ph = tmp.querySelector('.n-ph'); if (ph) { ph.insertAdjacentHTML('afterend', card); return tmp.innerHTML; } } catch (e) { /* segue */ }
    return out + card;
  };
})();

/* ---------- Calendário: tabela da temporada com vencedor, pole, sua melhor posição e condições
   (a tabela antiga sumiu quando o calendário virou visão por mês/etapa na 0.8.5) ---------- */
(function () {
  const sc = SCREENS.calendar; if (!sc) return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    if (UI.params.tab !== 'etapas') return out;
    const s = G.season; const mineT = Career.isObs(G) ? null : G.player.teamId;
    const rows = s.calendar.map((tid, i) => {
      const tr = Career.track(G, tid); const r = s.results[i];
      const mine = r && mineT ? r.cls.filter(c => c.tid === mineT) : [];
      const best = mine.length ? Math.min(...mine.map(c => (c.status === 'fin' ? c.pos : 99))) : null;
      const cond = r ? [r.wet > 0.25 ? K85.tag(byLang('Chuva', 'Rain'), 'acc') : K85.tag(byLang('Seco', 'Dry')), r.sc ? K85.tag(`SC ×${r.sc}`, 'neg') : '', r.cls.some(x => x.status === 'dsq') ? K85.tag('DSQ', 'neg') : ''].join(' ') : '';
      return [`<span class="n-num">${i + 1}</span>`, `<b>${esc(tr.gp)}</b>${tr.sprint ? ' ' + K85.tag('Sprint', 'acc') : ''}`, `<small class="n-mu">${esc(tr.circuit)}</small>`,
        r ? K85.who(r.winner, { tid: (r.cls[0] || {}).tid }) : i === s.round ? K85.tag(byLang('próxima', 'next'), 'acc') : '', r && r.pole ? `<small>${esc((Career.driver(G, r.pole) || {}).name || '')}</small>` : '',
        best ? `<b class="n-num">${best === 99 ? byLang('Abandono', 'DNF') : 'P' + best}</b>` : '', cond];
    });
    return out + K85.card({ t: byLang(`Temporada ${s.year}: resultados por etapa`, `${s.year} season: results by round`), flush: true,
      body: K85.table([[byLang('Etapa', 'Round'), 'c'], [byLang('Grande Prêmio', 'Grand Prix')], [byLang('Circuito', 'Circuit')], [byLang('Vencedor', 'Winner')], ['Pole'], [byLang('Sua melhor posição', 'Your best position'), 'c'], [byLang('Condições', 'Conditions')]], rows) });
  };
})();

/* ---------- Parcerias técnicas (além das equipes irmãs) ---------- */
function partnersCard86() {
  if (typeof Owners === 'undefined' || !Owners.partners) return '';
  const P = Owners.partners(G); const me = Career.isObs(G) ? null : G.player.teamId; const t = me ? Career.team(G) : null;
  const pkgName = (k) => (k === 'full' ? byLang('Completo', 'Full') : k === 'basic' ? byLang('Básico', 'Basic') : byLang('Histórico', 'Historic'));
  const parts = (p) => esc(byLang((p.parts || []).join(', '), (p.partsEn || p.parts || []).join(', ')));
  const rows = Object.entries(P).filter(([c, p]) => Career.team(G, c) && Career.team(G, p.parent)).map(([c, p]) => [K85.tm(c), `<small class="n-mu">→</small> ${K85.tm(p.parent)}`, `<small>${parts(p)}</small>`, `<small>${pkgName(p.pkg)}${p.fee ? ` · ${fmtMoney(p.fee)}/${byLang('ano', 'yr')}` : ''}</small>`, `<span class="n-num">${p.since}</span>`,
    me && (c === me || p.parent === me) && p.player !== undefined ? `<button class="btn sm danger" data-act="ptEnd86" data-id="${c}">${byLang('Encerrar', 'End')}</button>` : (me && (c === me || p.parent === me) ? `<button class="btn sm danger" data-act="ptEnd86" data-id="${c}">${byLang('Encerrar', 'End')}</button>` : '')]);
  let mine = '';
  if (t) {
    const myP = P[me];
    if (t.works) {
      const kids = Owners.kidsOf(G, me);
      const cands = G.db.teams.filter(x => !Owners.canParent(G, me, x.id));
      mine = `<p class="n-sm">${byLang(`Como equipe de fábrica, você pode vender peças às clientes do seu motor (até 2). Parceiras hoje: ${kids.length}.`, `As a works team you can sell parts to your engine customers (up to 2). Current partners: ${kids.length}.`)}</p>` +
        (cands.length ? `<div class="pt86-o">${cands.map(x => `<div class="pt86-r">${K85.tm(x.id)}<span class="n-grow"></span><button class="btn sm" data-act="ptOffer86" data-id="${x.id}" data-pkg="basic">${byLang('Oferecer básico', 'Offer basic')} (+${fmtMoney(Owners.PKG.basic.fee)}/${byLang('ano', 'yr')})</button><button class="btn sm primary" data-act="ptOffer86" data-id="${x.id}" data-pkg="full">${byLang('Oferecer completo', 'Offer full')} (+${fmtMoney(Owners.PKG.full.fee)}/${byLang('ano', 'yr')})</button></div>`).join('')}</div>` : `<p class="n-mu n-sm">${byLang('Nenhuma cliente do seu motor disponível agora.', 'No customer of your engine available right now.')}</p>`);
    } else if (myP) {
      mine = `<p class="n-sm">${byLang(`Você compra ${parts(myP)} da`, `You buy ${parts(myP)} from`)} ${K85.tm(myP.parent)} ${byLang('desde', 'since')} ${myP.since}.</p>`;
    } else {
      const works = G.db.teams.filter(x => x.works && !Owners.canParent(G, x.id, me));
      mine = `<p class="n-sm">${byLang('Clientes podem comprar peças da equipe de fábrica que fornece o seu motor. A transferência aproxima o seu chassi e a confiabilidade dos dela (nunca a aerodinâmica). A taxa anual entra no teto de gastos.', 'Customers can buy parts from the works team that supplies their engine. The transfer brings your chassis and reliability closer to theirs (never the aerodynamics). The yearly fee counts towards the cost cap.')}</p>` +
        (works.length ? `<div class="pt86-o">${works.map(x => `<div class="pt86-r">${K85.tm(x.id)}<span class="n-grow"></span><button class="btn sm" data-act="ptAsk86" data-id="${x.id}" data-pkg="basic">${byLang('Pedir básico', 'Ask basic')}: ${byLang('motor e câmbio', 'engine and gearbox')} (${fmtMoney(Owners.PKG.basic.fee)}/${byLang('ano', 'yr')})</button><button class="btn sm primary" data-act="ptAsk86" data-id="${x.id}" data-pkg="full">${byLang('Pedir completo', 'Ask full')}: + ${byLang('suspensão e túnel', 'suspension and tunnel')} (${fmtMoney(Owners.PKG.full.fee)}/${byLang('ano', 'yr')})</button></div>`).join('')}</div>` : `<p class="n-mu n-sm">${byLang('A equipe de fábrica do seu motor não está disponível (já tem duas parceiras, ou o seu fornecedor não tem equipe na F1).', 'Your engine\'s works team is not available (it already has two partners, or your supplier has no F1 team).')}</p>`);
    }
  }
  return K85.card({ t: byLang('Parcerias técnicas', 'Technical partnerships'), a: `<small class="n-mu">${byLang('compra de peças entre equipes, sem ser dona', 'parts deals between teams, without ownership')}</small>`,
    body: mine + (rows.length ? K85.table([[byLang('Parceira', 'Partner')], [byLang('Principal', 'Parent')], [byLang('Peças', 'Parts')], [byLang('Pacote', 'Package')], [byLang('Desde', 'Since'), 'c'], ['', 'r']], rows) : K85.empty(byLang('Nenhuma parceria técnica no grid.', 'No technical partnerships on the grid.'))) });
}
(function () {
  const sc = SCREENS.sister; if (!sc) return;
  const h = sc.html;
  sc.html = function () { return h.call(this) + partnersCard86(); };
  ACT.ptAsk86 = (el) => { const e = Owners.askPartner(G, el.dataset.id, el.dataset.pkg); if (e) return toast(e, 'bad'); toast(byLang('Parceria fechada!', 'Partnership agreed!'), 'good'); autosave(); render(); };
  ACT.ptOffer86 = (el) => { const e = Owners.offerPartner(G, el.dataset.id, el.dataset.pkg); if (e) return toast(e, 'bad'); toast(byLang('Parceria fechada!', 'Partnership agreed!'), 'good'); autosave(); render(); };
  ACT.ptEnd86 = (el) => { const e = Owners.endPartnerPlayer(G, el.dataset.id); if (e) return toast(e, 'bad'); toast(byLang('Parceria encerrada.', 'Partnership ended.'), 'good'); autosave(); render(); };
})();

/* ---------- Página da equipe: chefes de equipe (sumiu na 0.8.5) ---------- */
(function () {
  const sc = SCREENS.teamPage; if (!sc) return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    const t = Career.team(G, UI.params.id); if (!t) return out;
    const lore = (typeof TEAM_LORE !== 'undefined' && TEAM_LORE[t.id]) || {};
    const real = (lore.principals || []).slice().reverse().map(([n, a, b]) => [esc(n), `<span class="n-num n-mu">${a}–${b || byLang('hoje', 'now')}</span>`]);
    const sim = []; (t.history || []).filter(x => x.sim && x.principal).forEach(x => { const l = sim[sim.length - 1]; if (l && l.n === x.principal) l.b = x.y; else sim.push({ n: x.principal, a: x.y, b: x.y }); });
    const rows = sim.reverse().map(s => [`${esc(s.n)} ${K85.tag(byLang('carreira', 'career'))}`, `<span class="n-num n-mu">${s.a}–${s.b}</span>`]).concat(real);
    if (t.principal && !rows.some(r => r[0].startsWith(esc(t.principal)))) rows.unshift([`<b>${esc(t.principal)}</b>`, `<span class="n-num n-mu">${byLang('atual', 'current')}</span>`]);
    return rows.length ? out + K85.card({ t: byLang('Chefes de equipe', 'Team principals'), flush: true, body: K85.table([[byLang('Nome', 'Name')], [byLang('Período', 'Period'), 'r']], rows.slice(0, 14)) }) : out;
  };
})();

/* ---------- P&D: restrição aerodinâmica (ATR) de cada equipe (sumiu na 0.8.5) ---------- */
(function () {
  const sc = SCREENS.dev; if (!sc || typeof Regs === 'undefined') return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    if (Career.isObs(G)) return out;
    const R = Regs.r(G); if (!R.atr) return out + K85.card({ t: byLang('Restrição aerodinâmica (ATR)', 'Aerodynamic testing restriction (ATR)'), body: `<p class="n-mu">${byLang('Desligada pelo regulamento atual: todas as equipes têm o mesmo tempo de túnel e CFD.', 'Disabled by current regulations: all teams have the same tunnel and CFD time.')}</p>` });
    const list = G.db.teams.map(t => ({ t, f: Regs.atrFactor(G, t.id) })).sort((a, b) => a.f - b.f);
    const me = G.player.teamId;
    return out + K85.card({ t: byLang('Restrição aerodinâmica (ATR)', 'Aerodynamic testing restriction (ATR)'), a: `<small class="n-mu">${byLang(`do campeão ${R.atrMin}% ao último ${R.atrMax}%`, `from the champion ${R.atrMin}% to last ${R.atrMax}%`)}</small>`, flush: true,
      body: K85.table([[byLang('Equipe', 'Team')], [byLang('Tempo de túnel e CFD', 'Tunnel and CFD time')]], list.map(x => [K85.tm(x.t.id) + (x.t.id === me ? ' ' + K85.tag(byLang('você', 'you'), 'acc') : ''), `${K85.bar(x.f * 100, R.atrMax, x.t.id === me ? 'var(--team)' : 'var(--blue)', 160)} <b class="n-num">${Math.round(x.f * 100)}%</b>`])) });
  };
})();
