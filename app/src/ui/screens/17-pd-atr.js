'use strict';
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
