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
