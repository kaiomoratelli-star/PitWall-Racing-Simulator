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
  const mundo = AREAS85.find(a => a[0] === 'mundo'); if (mundo && !mundo[3].some(t => t[0] === 'cases')) mundo[3].splice(Math.max(0, mundo[3].findIndex(t => t[0] === 'council') + 1), 0, ['cases', 'Casos e investigações']);
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
    return K85.head({ t: byLang('Casos e investigações', 'Cases and investigations'), s: `${open.length} ${byLang('em aberto', 'open')} · ${closed.length} ${byLang('encerrados recentemente', 'recently closed')}` }) +
      K85.grid('minmax(0,1.6fr) minmax(0,1fr)',
        K85.col(K85.card({ t: byLang('Investigações abertas', 'Open investigations'), body: open.length ? open.map(caseRow).join('') : K85.empty(byLang('Nenhuma investigação aberta.', 'No open investigations.')) }),
          K85.card({ t: byLang('Vereditos', 'Verdicts'), body: closed.length ? closed.map(caseRow).join('') : K85.empty(byLang('Nenhum caso encerrado ainda.', 'No closed cases yet.')) })),
        K85.col(K85.card({ t: `${byLang('Acontecimentos em', 'Events in')} ${G.season.year}`, body: parts.length ? `<div class="fin-d">${K85.donut(parts, `<b class="n-num">${parts.reduce((a, x) => a + x.v, 0)}</b><small>${byLang('no ano', 'this year')}</small>`, 170)}${K85.legend(parts, v => v)}</div>` : K85.empty(byLang('Nada registrado ainda neste ano.', 'Nothing recorded this year yet.')) }),
          K85.card({ t: byLang('Como funciona', 'How it works'), body: `<p class="n-mu">${byLang('Escândalos graves abrem investigação da FIA. O veredito sai algumas etapas depois. Cooperar reduz a pena; negar e perder aumenta. Casos podem puxar outras equipes para a investigação.', 'Serious scandals open an FIA investigation. The verdict comes a few rounds later. Cooperating reduces the penalty; denying and losing increases it. Cases can drag other teams into the investigation.')}</p>` })));
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
