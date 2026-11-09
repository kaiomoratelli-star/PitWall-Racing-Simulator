'use strict';
/* ---------- Página do piloto: humor com causas, confiança e química ---------- */
(function () {
  const sc = SCREENS.driverPage; if (!sc || typeof People === 'undefined') return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    const d = Career.driver(G, UI.params.id); if (!d || !d.team) return out;
    const causes = People.causes(G, d);
    const mate = Career.teamDrivers(G, d.team).find(x => x.id !== d.id && x.seat !== 'R');
    const chem = mate && d.seat !== 'R' ? People.chem(G, d.id, mate.id) : null;
    const mine = d.team === G.player.teamId && !Career.isObs(G);
    return out + K85.card({ t: byLang('Humor', 'Mood'), a: mine ? `<a data-act="go" data-v="talks">${byLang('conversar', 'talk')}</a>` : '', body: `<div class="mood86">
      <div class="mood86-k"><span><small>${byLang('Moral', 'Morale')}</small><b class="n-num">${Math.round(d.morale ?? 70)}</b></span>${mine ? `<span><small>${byLang('Confiança no chefe', 'Trust in the boss')}</small><b class="n-num">${Math.round(People.trust(d))}</b></span>` : ''}${chem != null ? `<span><small>${byLang('Química com', 'Chemistry with')} ${esc(shortName(mate))}</small><b class="n-num">${chem > 0 ? '+' : ''}${chem}</b> <em class="n-mu">${esc(People.chemLabel(chem))}</em></span>` : ''}<span><small>${byLang('Perfil', 'Profile')}</small><b>${esc(byLang(...Talks.ARCH[Talks.arch(d)]))}</b></span></div>
      <div class="tk86-cz"><small>${byLang('Principais motivos nas últimas etapas', 'Main reasons over the last rounds')}</small>${causes.length ? causes.map(c => `<span class="tk86-c ${c.v >= 0 ? 'up' : 'dn'}"><b class="n-num">${c.v >= 0 ? '+' : ''}${c.v}</b>${esc(c.name)}</span>`).join('') : `<small class="n-mu">${byLang('Sem mudanças recentes.', 'No recent changes.')}</small>`}</div>
      <p class="n-mu n-sm">${byLang('A moral pesa pouco na pista: alta dá um pouco mais de ritmo e menos erros; baixa, o contrário.', 'Morale matters a little on track: high gives slightly more pace and fewer mistakes; low, the opposite.')}</p></div>` });
  };
})();
