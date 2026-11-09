'use strict';
/* ---------- Etiquetas "por quê" (0.8.7) ----------
   Química, moral, confiança, vida do motor e ATR mudam números, mas o jogador nem sempre via a causa.
   Aqui só se LÊ o estado do jogo (nenhum sorteio, nada é alterado) e se explica o efeito em uma frase. */
const Why85 = {};
/* motivos de um piloto: [{ t: texto, k: 'pos' | 'neg' | '' }] */
Why85.driver = (G, d) => {
  const out = []; if (!d) return out;
  const mate = Career.lineup(G, d.team).find(x => x.id !== d.id);
  // química com o companheiro: soma confiança no fim do treino e ajuda (ou atrapalha) nas ordens de equipe
  if (mate && typeof People !== 'undefined') {
    const ch = People.chem(G, d.id, mate.id);
    if (ch >= 30) { const add = Math.min(4, ch / 15); const wk = G.weekend; const done = wk && wk.chemApplied;
      out.push({ k: 'pos', t: byLang(`+${add.toFixed(1)} de confiança ${done ? 'no' : 'ao fim do'} treino: química ${People.chemLabel(ch).toLowerCase()} com ${shortNameOf(mate)}`, `+${add.toFixed(1)} confidence ${done ? 'from' : 'at the end of'} practice: ${People.chemLabel(ch).toLowerCase()} chemistry with ${shortNameOf(mate)}`) }); }
    else if (ch <= -15) out.push({ k: 'neg', t: byLang(`Clima ${People.chemLabel(ch).toLowerCase()} com ${shortNameOf(mate)}: obedece menos às ordens de equipe`, `${People.chemLabel(ch)} relationship with ${shortNameOf(mate)}: less likely to follow team orders`) });
  }
  // moral: mexe no ritmo, na classificação e na regularidade (Engine.eff)
  const m = clamp(((d.morale ?? 70) - 70) / 30, -1.5, 1) * 0.7;
  if (Math.abs(m) >= 0.2) out.push({ k: m > 0 ? 'pos' : 'neg', t: byLang(`Moral ${Math.round(d.morale)}: ${m > 0 ? '+' : ''}${m.toFixed(1)} de ritmo e de classificação`, `Morale ${Math.round(d.morale)}: ${m > 0 ? '+' : ''}${m.toFixed(1)} pace and qualifying`) });
  // motor gasto: perde potência e quebra mais
  if (typeof Parts !== 'undefined') {
    const pm = Parts.raceMods(G, d.id); const S = Parts.pu(G, d).c; const worst = Parts.KEYS.reduce((a, k) => (S[k].wear > S[a].wear ? k : a), Parts.KEYS[0]);
    if (pm.risk >= 1.15) out.push({ k: 'neg', t: byLang(`${Parts.label(worst, true)} com ${Math.round(100 - S[worst].wear)}% de vida: risco de quebra ${pm.risk.toFixed(1)}×`, `${Parts.label(worst, true)} at ${Math.round(100 - S[worst].wear)}% life: ${pm.risk.toFixed(1)}× failure risk`) });
    if (pm.pace >= 0.02) out.push({ k: 'neg', t: byLang(`Motor gasto: +${pm.pace.toFixed(2)} s por volta`, `Worn engine: +${pm.pace.toFixed(2)} s per lap`) });
  }
  // relação com o chefe (só a equipe do jogador): obediência às ordens
  if (d.team === G.player.teamId && !Career.isObs(G) && typeof People !== 'undefined' && People.trust) {
    const tr = People.trust(d); const adj = (tr - 55) * 0.3;
    if (Math.abs(adj) >= 3) out.push({ k: adj > 0 ? 'pos' : 'neg', t: byLang(`Confiança no chefe ${Math.round(tr)}: ${adj > 0 ? '+' : ''}${Math.round(adj)}% de chance de seguir ordens`, `Trust in the boss ${Math.round(tr)}: ${adj > 0 ? '+' : ''}${Math.round(adj)}% chance of following orders`) });
  }
  return out;
};
/* motivos da equipe (carro e fábrica) */
Why85.team = (G, t) => {
  const out = []; if (!t) return out;
  if (typeof Regs !== 'undefined' && Regs.atrFactor) {
    const f = Regs.atrFactor(G, t.id); const pct = Math.round(f * 100);
    if (Regs.r(G).atr) out.push({ k: pct > 100 ? 'pos' : pct < 100 ? 'neg' : '', t: byLang(`Túnel de vento e CFD: ${pct}% do tempo-base (ATR, pela posição no último campeonato)`, `Wind tunnel and CFD: ${pct}% of base time (ATR, from last championship position)`) });
  }
  return out;
};
Why85.chips = (L) => L.map(x => `<span class="why85 ${x.k}">${esc(x.t)}</span>`).join('');
Why85.card = (G, drivers) => {
  const rows = drivers.map(d => ({ d, L: Why85.driver(G, d) })).filter(r => r.L.length);
  if (!rows.length) return '';
  return K85.card({ t: byLang('Por que o rendimento muda', 'Why performance changes'), cls: 'why85-card',
    body: rows.map(r => `<div class="why85-row"><b>${esc(r.d.name)}</b><div class="why85-l">${Why85.chips(r.L)}</div></div>`).join('') });
};
(function () {
  // fim de semana (treino, classificação, estratégia): os pilotos do jogador
  const wk = SCREENS.weekend;
  if (wk) { const h = wk.html; wk.html = function () { const out = h.call(this); if (!G || Career.isObs(G) || !G.weekend) return out; let c = ''; try { c = Why85.card(G, Career.lineup(G, G.player.teamId)); } catch (e) { c = ''; } return out + c; }; }
  // carro: motivos da equipe e de cada piloto
  const car = SCREENS.car;
  if (car) { const h = car.html; car.html = function () { const out = h.call(this); if (!G || Career.isObs(G)) return out; let c = ''; try { const t = Career.team(G); const L = Why85.team(G, t); const ds = Career.lineup(G, t.id);
    c = K85.card({ t: byLang('Por que o carro rende assim', 'Why the car performs like this'), cls: 'why85-card', body: (L.length ? `<div class="why85-l">${Why85.chips(L)}</div>` : '') + ds.map(d => { const X = Why85.driver(G, d).filter(x => /risco|vida|Motor|engine|life|risk/i.test(x.t)); return X.length ? `<div class="why85-row"><b>${esc(d.name)}</b><div class="why85-l">${Why85.chips(X)}</div></div>` : ''; }).join('') }); } catch (e) { c = ''; } return out + c; }; }
  // corrida: só o que pesa agora (motor no limite, moral muito baixa), junto da faixa da direção de prova
  if (typeof raceControl85 === 'function') {
    const base = raceControl85;
    raceControl85 = function (race, wkx) {
      let h = base(race, wkx); if (!G || Career.isObs(G)) return h;
      try {
        const mine = race.cars.filter(c => c.tid === G.player.teamId && c.status === 'run');
        const notes = mine.flatMap(c => { const d = Career.driver(G, c.did); return Why85.driver(G, d).filter(x => x.k === 'neg' && /risco|risk|Moral|Morale/.test(x.t)).map(x => ({ ...x, t: `${shortNameOf(d)}: ${x.t}` })); });
        if (notes.length) h += `${h ? '' : `<span class="rc85-t">${byLang('Direção de prova', 'Race control')}</span>`}<span class="rc85-why">${byLang('Por quê', 'Why')}</span>${Why85.chips(notes)}`;
      } catch (e) { /* só informação */ }
      return h;
    };
  }
})();
