'use strict';
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
