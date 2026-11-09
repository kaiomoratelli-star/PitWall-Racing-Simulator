'use strict';
/* ---------- Saúde do carro durante as sessões (0.8.7) ----------
   Treino, classificação, estratégia e corrida: estado de cada peça do carro, quanto custa em tempo e o risco.
   - Na corrida: danos ao vivo (asa dianteira, assoalho, suspensão, freios, câmbio), peça solta, pneu e motor.
   - Fora da corrida: componentes do motor e câmbio (vida e cota) e o que foi consertado depois da última corrida.
   Só lê o estado (nenhum sorteio). Os custos por volta são os mesmos da simulação (Engine.step). */
const Health85 = {
  // [peça, segundos por volta com o dano máximo] — mesmos pesos do tempo de volta no motor da corrida
  PARTS: [['wing', 0.9], ['floor', 0.55], ['susp', 0.7], ['brakes', 0.25], ['gbx', 0]],
  name: (k) => { const P = Engine.PARTS[k]; return P ? byLang(P[2], P[3]) : k; },   // com maiúscula (Asa dianteira)
  color: (h) => (h >= 75 ? 'var(--green)' : h >= 45 ? 'var(--yellow)' : 'var(--red)'),
  state: (h) => (h >= 75 ? ['hl-ok', byLang('OK', 'OK')] : h >= 45 ? ['hl-warn', byLang('Atenção', 'Watch')] : ['hl-bad', byLang('Crítico', 'Critical')]),   // classes próprias: .ok/.bad já têm cor em outras telas
  row: (name, h, eff, extra) => { const [k, l] = Health85.state(h); return `<div class="hl85-r ${k}"><span class="hl85-n">${esc(name)}</span>${K85.bar(h, 100, Health85.color(h))}<b class="n-num">${Math.round(h)}%</b><span class="hl85-e">${eff ? esc(eff) : `<em>${l}</em>`}</span>${extra || ''}</div>`; },
};
/* corrida: um carro (objeto da corrida) */
Health85.race = (G, c, race) => {
  const d = Career.driver(G, c.did);
  const rows = [];
  if (c.meatball) rows.push(`<div class="hl85-flag">${byLang(`Bandeira preta e laranja: asa solta. Parar até a volta ${c.meatball.until}.`, `Black and orange flag: loose wing. Pit by lap ${c.meatball.until}.`)}</div>`);
  Health85.PARTS.forEach(([k, s]) => {
    const dmg = (c.damage && c.damage[k]) || 0; const h = 100 - dmg * 100;
    const eff = dmg > 0 ? (s ? `+${(dmg * s).toFixed(2)} s/${byLang('volta', 'lap')}` : byLang('pode ceder', 'may fail')) : '';
    rows.push(Health85.row(Health85.name(k), h, eff, k === 'wing' && c.loosePart ? `<span class="n-tag neg">${byLang('solta', 'loose')}</span>` : ''));
  });
  rows.push(Health85.row(byLang('Pneus', 'Tyres'), Math.max(0, 100 - c.tyre.wear), ''));
  if (d && typeof Parts !== 'undefined') {
    const S = Parts.pu(G, d).c; const worst = Parts.KEYS.reduce((a, k) => (S[k].wear > S[a].wear ? k : a), Parts.KEYS[0]);
    const risk = c.puRisk || 1;
    rows.push(Health85.row(`${byLang('Motor', 'Power unit')} (${Parts.label(worst, true)})`, 100 - S[worst].wear, risk >= 1.15 ? byLang(`risco de quebra ${risk.toFixed(1)}×`, `${risk.toFixed(1)}× failure risk`) : (c.puPace ? `+${c.puPace.toFixed(2)} s/${byLang('volta', 'lap')}` : '')));
  }
  const tot = Health85.PARTS.reduce((a, [k, s]) => a + ((c.damage && c.damage[k]) || 0) * s, 0) + (c.puPace || 0);
  return `<div class="hl85"><div class="hl85-h"><span class="rp-lbl">${byLang('Saúde do carro', 'Car health')}</span>${tot >= 0.05 ? `<span class="n-loss n-num">+${tot.toFixed(2)} s/${byLang('volta', 'lap')}</span>` : `<span class="n-mu">${byLang('sem perdas', 'no losses')}</span>`}</div>${rows.join('')}</div>`;
};
/* fora da corrida: motor por componente + danos da última corrida (já consertados) */
Health85.garage = (G, d) => {
  if (!d || typeof Parts === 'undefined') return '';
  const S = Parts.pu(G, d).c;
  const rows = Parts.KEYS.map(k => { const P = S[k]; const lim = Parts.limit(G, k); const h = 100 - P.wear;
    return Health85.row(Parts.label(k, false), h, `${P.used}/${lim}${P.used >= lim ? ' · ' + byLang('cota no limite', 'at the limit') : ''}`); });
  const m = Parts.raceMods(G, d.id);
  const last = G.lastRace && G.lastRace.dmg ? G.lastRace.dmg.filter(x => x.did === d.id && Parts.COST[x.part]) : [];
  const fixed = last.length ? `<div class="hl85-note">${byLang('Consertado depois da última corrida', 'Repaired after the last race')}: ${[...new Set(last.map(x => Health85.name(x.part)))].map(esc).join(', ')}</div>` : '';
  return `<div class="hl85"><div class="hl85-h"><b>${esc(d.name)}</b>${m.risk >= 1.15 ? `<span class="n-loss">${byLang('risco de quebra', 'failure risk')} ${m.risk.toFixed(1)}×</span>` : `<span class="n-mu">${byLang('carro inteiro', 'car intact')}</span>`}</div>
    ${Health85.PARTS.slice(0, 4).map(([k]) => Health85.row(Health85.name(k), 100, '')).join('')}${rows.join('')}${fixed}</div>`;
};
(function () {
  // corrida: dentro do cartão do piloto escolhido no muro dos boxes
  const base = pitWallHtml;
  pitWallHtml = function (race) {
    const r = base.apply(this, arguments);
    try { const ctl = document.getElementById('ctl'); const card = ctl && ctl.querySelector('.rp'); const sel = race.cars.find(c => c.did === UI.pwSel);
      if (card && sel && sel.status === 'run' && !card.querySelector('.hl85')) { const at = card.querySelector('.rp-m'); if (at) at.insertAdjacentHTML('afterend', Health85.race(G, sel, race)); else card.insertAdjacentHTML('beforeend', Health85.race(G, sel, race)); } } catch (e) { /* só informação */ }
    return r;
  };
  // treino, classificação e estratégia: os dois carros
  const wk = SCREENS.weekend;
  if (wk) { const h = wk.html; wk.html = function () { const out = h.call(this); if (!G || Career.isObs(G) || !G.weekend) return out;
    let c = ''; try { const ds = Career.lineup(G, G.player.teamId); c = K85.card({ t: byLang('Saúde do carro', 'Car health'), a: `<a data-act="go" data-v="car" data-p='{"tab":"motor"}'>${byLang('trocar peças', 'replace parts')}</a>`, cls: 'hl85-card', body: `<div class="hl85-g">${ds.map(d => Health85.garage(G, d)).join('')}</div>` }); } catch (e) { c = ''; }
    return out + c; }; }
})();
