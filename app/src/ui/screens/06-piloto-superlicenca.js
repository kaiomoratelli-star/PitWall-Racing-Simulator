'use strict';
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
