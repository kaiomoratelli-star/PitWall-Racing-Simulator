'use strict';
/* ---------- Corrida: faixa "Direção de prova" (0.8.7) ----------
   Investigações abertas, com a volta da decisão, e punições a cumprir (drive-through / stop-and-go),
   com a volta-limite. Antes isso aparecia só no texto do rádio. Só lê o estado da corrida (sem sorteio). */
function raceControl85(race, wk) {
  const me = Career.isObs(G) ? null : G.player.teamId;
  const nm = (did) => { const d = Career.driver(G, did); return d ? esc(shortNameOf(d)) : esc(did); };
  const mine = (did) => { const d = Career.driver(G, did); return d && d.team === me; };
  const why = (w) => { const t = Engine.PEN_TXT[w] || [w, w]; return esc(byLang(t[0], t[1])); };
  const L = race.lap;
  const open = (race.inv || []).filter(i => !i.done).map(i => ({ did: i.did, html: `<b>${nm(i.did)}</b> ${why(i.why)}${i.other ? ` <small>${byLang('com', 'with')} ${nm(i.other)}</small>` : ''}`,
    when: i.due > race.laps ? byLang('decisão depois da corrida', 'decision after the race') : i.due <= L + 1 ? byLang('decisão nesta volta', 'decision this lap') : byLang(`decisão na volta ${i.due}`, `decision on lap ${i.due}`), kind: 'inv' }));
  const serve = race.cars.filter(c => c.serve && c.status === 'run').map(c => { const K = Engine.KIND_TXT[c.serve.kind] || [c.serve.kind, c.serve.kind];
    return { did: c.did, html: `<b>${nm(c.did)}</b> ${esc(byLang(K[0], c.serve.kind === 'dt' ? 'drive-through' : 'stop-and-go'))}`, when: byLang(`cumprir até a volta ${c.serve.until}`, `serve by lap ${c.serve.until}`), kind: 'serve' }; });
  const recent = (race.pens || []).filter(p => L - (p.lap || 0) <= 3).slice(-3).map(p => ({ did: p.did, html: `<b>${nm(p.did)}</b> ${p.kind === 'warn' ? byLang('advertência', 'warning') : p.kind === 'grid' ? byLang(`${p.n} posições no próximo grid`, `${p.n}-place grid drop next race`) : p.kind === 'dt' || p.kind === 'sg' ? esc((Engine.KIND_TXT[p.kind] || [p.kind])[0]) : `+${p.s} s`} · ${why(p.why)}`, when: byLang(`volta ${p.lap}`, `lap ${p.lap}`), kind: 'done' }));
  const items = [...serve, ...open, ...recent];
  if (!items.length) return '';
  const lab = { inv: byLang('Sob investigação', 'Under investigation'), serve: byLang('A cumprir', 'To serve'), done: byLang('Decidido', 'Decided') };
  return `<span class="rc85-t">${byLang('Direção de prova', 'Race control')}</span>` + items.map(x => `<span class="rc85-i ${x.kind}${mine(x.did) ? ' me' : ''}"><em>${lab[x.kind]}</em>${x.html}<small>${x.when}</small></span>`).join('');
}
(function () {
  const base = updateRace;
  updateRace = function (...a) {
    const r = base.apply(this, a);
    try {
      const el = document.getElementById('rcStrip'); const wk = G && G.weekend;
      if (el && wk && wk.race) { const h = raceControl85(wk.race, wk); el.hidden = !h; if (el.innerHTML !== h) el.innerHTML = h; }
    } catch (e) { /* a faixa nunca derruba a corrida */ }
    return r;
  };
})();
