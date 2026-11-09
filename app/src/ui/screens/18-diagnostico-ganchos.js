'use strict';
/* ---------- Diagnóstico: ganchos do jogo (0.8.7) ---------- */
(function () {
  const sc = SCREENS.diag; if (!sc || typeof Hooks === 'undefined') return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    const L = Hooks.list().sort((a, b) => b.layers.length - a.layers.length); const bad = Hooks.verify();
    return out + K85.card({ t: byLang('Ganchos do jogo', 'Game hooks'), a: bad.length ? K85.tag(byLang(`${bad.length} reescrito(s) por fora`, `${bad.length} rewritten outside`), 'neg') : K85.tag(byLang('íntegros', 'intact'), 'pos'), flush: true,
      body: K85.table([[byLang('Função', 'Function')], [byLang('Camadas (de dentro para fora)', 'Layers (inside out)')], [byLang('Base trocada', 'Base replaced')]], L.map(t => [`<b class="n-num">${esc(t.id)}</b>`, `<small>${esc(t.layers.join(' → ') || '—')}</small>`, `<small class="n-mu">${esc(t.base || '')}${t.dropped.length ? ` · ${byLang('derrubou', 'dropped')}: ${esc(t.dropped.join(', '))}` : ''}</small>`])) });
  };
})();

/* ---------- Diagnóstico: telas que sortearam ao desenhar (0.8.7) ---------- */
(function () {
  const sc = SCREENS.diag; if (!sc) return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this); const L = UI.rngLeaks || [];
    return out + K85.card({ t: byLang('Sorteio e telas', 'Random draws and screens'), a: L.length ? K85.tag(byLang(`${L.length} tela(s)`, `${L.length} screen(s)`), 'neg') : K85.tag(byLang('nenhuma tela sorteia', 'no screen draws'), 'pos'),
      body: `<p class="small muted">${byLang('Desenhar uma tela nunca pode mudar a simulação. Se alguma sortear ao desenhar, o sorteio é devolvido e ela aparece aqui.', 'Drawing a screen must never change the simulation. If one draws while rendering, the draw is undone and it is listed here.')}</p>${L.length ? `<p>${L.map(esc).join(', ')}</p>` : ''}` });
  };
})();
