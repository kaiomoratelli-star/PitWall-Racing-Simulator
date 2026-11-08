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
