'use strict';
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
