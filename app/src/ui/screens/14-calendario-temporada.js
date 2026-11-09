'use strict';
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
      const fp1 = mineT && typeof SL !== 'undefined' ? (SL.fp1(G)[mineT] || []).filter(x => x.r === i) : [];
      return [`<span class="n-num">${i + 1}</span>`, `<b>${esc(tr.gp)}</b>${tr.sprint ? ' ' + K85.tag('Sprint', 'acc') : ''}${fp1.length ? ' ' + K85.tag(byLang(`TL1 novato: ${fp1.map(x => (Career.driver(G, x.did) || {}).lastName || '').join(', ')}`, `FP1 rookie: ${fp1.map(x => (Career.driver(G, x.did) || {}).lastName || '').join(', ')}`), 'pos') : ''}`, `<small class="n-mu">${esc(tr.circuit)}</small>`,
        r ? K85.who(r.winner, { tid: (r.cls[0] || {}).tid }) : i === s.round ? K85.tag(byLang('próxima', 'next'), 'acc') : '', r && r.pole ? `<small>${esc((Career.driver(G, r.pole) || {}).name || '')}</small>` : '',
        best ? `<b class="n-num">${best === 99 ? byLang('Abandono', 'DNF') : 'P' + best}</b>` : '', cond];
    });
    return out + K85.card({ t: byLang(`Temporada ${s.year}: resultados por etapa`, `${s.year} season: results by round`), flush: true,
      body: K85.table([[byLang('Etapa', 'Round'), 'c'], [byLang('Grande Prêmio', 'Grand Prix')], [byLang('Circuito', 'Circuit')], [byLang('Vencedor', 'Winner')], ['Pole'], [byLang('Sua melhor posição', 'Your best position'), 'c'], [byLang('Condições', 'Conditions')]], rows) });
  };
})();
