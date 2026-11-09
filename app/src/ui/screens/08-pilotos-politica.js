'use strict';
/* ---------- Pilotos: política de equipe e tensão entre companheiros (0.8.6-B) ---------- */
(function () {
  if (typeof drivers85 !== 'function' || typeof Orders === 'undefined') return;
  const d85 = drivers85;
  drivers85 = function () {
    const base = d85();
    const ds = Career.teamDrivers(G, G.player.teamId).filter(d => d.seat !== 'R');
    if (ds.length < 2) return base;
    const [a, b] = ds; const n1 = Orders.no1(G); const ten = Orders.tension(G, a.id, b.id);
    const opt3 = [['', byLang('Disputa livre', 'Free racing')], [a.id, `${byLang('Nº 1', 'No. 1')}: ${a.name}`], [b.id, `${byLang('Nº 1', 'No. 1')}: ${b.name}`]];
    const dis = ds.map(d => `${esc(shortName(d))}: <b class="n-num">${d.disobey || 0}</b>`).join(' · ');
    const card = K85.card({ t: byLang('Política de equipe', 'Team policy'), body: `<div class="pol86">
      <div class="pol86-seg">${opt3.map(([v, l]) => `<button class="seg ${(n1 || '') === v ? 'on' : ''}" data-act="setNo186" data-v="${v}">${esc(l)}</button>`).join('')}</div>
      <div class="pol86-k"><span><small>${byLang('Química entre os dois', 'Chemistry between them')}</small>${(() => { const ch = typeof People !== 'undefined' ? People.chem(G, a.id, b.id) : -ten; return `${K85.bar(ch + 100, 200, ch >= 15 ? 'var(--green)' : ch <= -15 ? 'var(--red)' : 'var(--yellow)', 160)} <b class="n-num">${ch > 0 ? '+' : ''}${ch}</b> <em class="n-mu">${typeof People !== 'undefined' ? esc(People.chemLabel(ch)) : ''}</em>`; })()}</span><span><small>${byLang('Ordens desobedecidas (recentes)', 'Orders disobeyed (recent)')}</small>${dis}</span></div>
      <p class="n-mu n-sm">${n1 ? byLang('Com piloto nº 1, a equipe pede passagem sozinha quando ele está logo atrás. O nº 2 obedece mais, mas perde moral a cada corrida.', 'With a number one driver, the team asks for the swap automatically when he is right behind. The number two obeys more but loses morale every race.') : byLang('Disputa livre: nenhum pedido automático. Você ainda pode dar ordens pelo rádio durante a corrida.', 'Free racing: no automatic requests. You can still give radio orders during the race.')}</p></div>` });
    return base + card;
  };
  ACT.setNo186 = (el) => { Orders.setNo1(G, el.dataset.v || null); autosave(); render(); };
})();
