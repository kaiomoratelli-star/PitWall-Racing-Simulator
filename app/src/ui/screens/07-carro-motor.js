'use strict';
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
    const fc = ds.map(d => { const f = Parts.forecast(G, d).filter(x => x.over); return f.length ? `<div><b>${esc(shortName(d))}</b>: ${f.map(x => `${esc(Parts.label(x.k, true))} ${byLang('estoura a cota perto da etapa', 'exceeds the allocation around round')} <b class="n-num">${x.over}</b> (${x.end}/${x.lim})`).join(' · ')}</div>` : `<div><b>${esc(shortName(d))}</b>: ${byLang('dentro da cota até o fim do ano no ritmo atual', 'within the allocation until season end at the current rate')}</div>`; }).join('');
    const card = K85.card({ t: byLang('Motor e câmbio por componente', 'Power unit and gearbox by element'), cls: 'pu86-card', a: `<small class="n-mu">${byLang('usados / cota da temporada · vida útil restante', 'used / season allocation · life left')}</small>`, flush: true,
      body: K85.table([[byLang('Elemento', 'Element')], ...ds.map(d => [esc(d.name)])], rows) + `<div class="pu86-fc"><small>${byLang('Previsão de estouro', 'Allocation forecast')}</small>${fc}</div><div class="n-help" style="margin:10px 14px"><div><div>${risk}</div><div style="margin-top:6px">${byLang(`Acima da cota, o primeiro elemento novo custa ${R.engineGridPenalty} posições no grid e cada um depois, ${Math.ceil(R.engineGridPenalty / 2)}. Mais de 15 posições: largada do fim do grid. Peça gasta perde rendimento e quebra mais. ${can ? 'A troca vale para a próxima classificação.' : 'Trocas só antes da classificação.'}`, `Beyond the allocation, the first new element costs ${R.engineGridPenalty} grid places and each one after, ${Math.ceil(R.engineGridPenalty / 2)}. Over 15 places: start from the back. Worn parts lose performance and fail more. ${can ? 'The swap applies to the next qualifying.' : 'Swaps only before qualifying.'}`)}</div></div></div>` });
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
