/* ============================================================
   PIT WALL 0.8.5 — clima na corrida (menu suspenso)
   - botão no topo da corrida com a condição, a água na pista e a temperatura do asfalto;
   - ao abrir: condição agora (água na pista, ar, asfalto, umidade, vento, período),
     previsão em blocos de voltas com a chance de chuva (precisão depende do estrategista),
     gráfico de água na pista e temperatura do asfalto na corrida inteira e pneu indicado.
   A previsão nunca mostra o futuro exato: tem erro, e o erro é fixo por bloco (não "pisca").
   ============================================================ */
'use strict';

const WXI85 = {
  sun: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 9.4 4.3 4.3 0 0 0 7 18z"/>',
  drizzle: '<path d="M7 15h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 6.4 4.3 4.3 0 0 0 7 15z"/><path d="M9 18l-.8 2M13 18l-.8 2M17 18l-.8 2"/>',
  rain: '<path d="M7 14h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 5.4 4.3 4.3 0 0 0 7 14z"/><path d="M8 16.5l-1.2 3M12 16.5l-1.2 3M16 16.5l-1.2 3M10 19.5l-.8 2M14 19.5l-.8 2"/>',
  storm: '<path d="M7 13h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.2 4.4 4.3 4.3 0 0 0 7 13z"/><path d="M12.5 14l-2.5 4h3l-2 4"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  wind: '<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3"/>',
  temp: '<path d="M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0z"/><path d="M12 10v6"/>',
};
const wxSvg85 = (k, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${WXI85[k]}</svg>`;
const wxIcon85 = (w, night) => (w >= 0.8 ? 'storm' : w >= 0.4 ? 'rain' : w >= 0.12 ? 'drizzle' : w >= 0.05 ? 'cloud' : night ? 'moon' : 'sun');
const wxTyre85 = (w) => (w < 0.25 ? ['S', byLang('Pneus de pista seca', 'Slick tyres')] : w < 0.55 ? ['I', byLang('Intermediários', 'Intermediates')] : ['W', byLang('Pneus de chuva', 'Full wets')]);

/* previsão em blocos de voltas, com erro fixo por bloco que depende do estrategista */
function wxForecast85(wk, race) {
  const team = !Career.isObs(G) ? Career.team(G) : null;
  const strat = team && team.staff ? (team.staff.strategy || 75) : 85;
  const err = (100 - strat) / 100 * 0.45 + 0.08;
  const L = Math.max(1, race.lap); const N = race.laps; const step = N > 40 ? 6 : 5;
  const out = [];
  for (let a = L + 1, k = 0; a <= N && k < 8; a += step, k++) {
    const b = Math.min(N, a + step - 1);
    const sl = race.wet.slice(a, b + 1); const real = Math.max(0, ...sl);
    const rng = localRng(`wx85:${G.season.year}:${wk.trackId}:${Math.floor(a / step)}`);
    const noise = (rng() * 2 - 1) * err;
    const p = Math.max(0.02, Math.min(0.98, real > 0.15 ? 0.6 + real * 0.35 + noise * 0.6 : 0.04 + real * 0.9 + Math.abs(noise) * 0.7));
    const tt = (wk.weather.trackT || [])[a]; const tt2 = tt != null ? Math.round(tt + (rng() * 2 - 1) * err * 4) : null;
    out.push({ a, b, p: Math.round(p * 100), tt: tt2, w: p > 0.6 ? Math.min(1, real * (1 + noise * 0.3)) : p > 0.35 ? 0.1 : 0 });
  }
  return { blocks: out, strat, acc: Math.round(Math.max(40, Math.min(98, 100 - err * 100))) };
}

function wxButton85() {
  const wk = G.weekend; const race = wk && wk.race; if (!race) return '';
  const L = Math.max(1, race.lap); const w = race.wet[L] || 0; const night = wk.weather.time === 'night';
  return `<button class="wx85-btn ${UI.wxOpen85 ? 'on' : ''} ${w > 0.2 ? 'wet' : ''}" data-act="wx85" aria-expanded="${UI.wxOpen85 ? 'true' : 'false'}" title="${byLang('Clima e previsão', 'Weather and forecast')}">${wxSvg85(wxIcon85(w, night), 20)}<span><b>${Engine.wetLabel(w)}</b><small>${byLang('água', 'water')} ${Math.round(w * 100)}% · ${byLang('asfalto', 'track')} ${(wk.weather.trackT || [])[L] ?? '—'}°</small></span><i>▾</i></button>`;
}

function wxPanel85() {
  const wk = G.weekend; const race = wk && wk.race; if (!race) return '';
  const L = Math.max(1, race.lap); const N = race.laps; const w = race.wet[L] || 0; const W = wk.weather; const night = W.time === 'night';
  const fc = wxForecast85(wk, race); const [tk, tl] = wxTyre85(w);
  const next = fc.blocks.find(x => x.p >= 55);
  const advice = w < 0.25 && next ? byLang(`Chuva provável entre as voltas ${next.a} e ${next.b} (${next.p}%). Deixe intermediários prontos.`, `Rain likely between laps ${next.a} and ${next.b} (${next.p}%). Have intermediates ready.`)
    : w >= 0.25 && !fc.blocks.slice(0, 2).some(x => x.p >= 40) ? byLang('A chuva deve parar. Fique de olho na linha seca para voltar aos pneus de pista seca.', 'Rain should stop. Watch for a dry line to switch back to slicks.')
    : w >= 0.25 ? byLang('Chuva deve continuar nas próximas voltas.', 'Rain should continue for the next laps.') : byLang('Sem chuva prevista para o resto da corrida.', 'No rain expected for the rest of the race.');
  // gráfico: água na pista (barras, passado real) e asfalto (linha; futuro tracejado)
  const GW = 520, GH = 120, pad = 22; const x = (l) => pad + (l - 1) / Math.max(1, N - 1) * (GW - pad * 2);
  const tts = (W.trackT || []).slice(1, N + 1); const tmin = Math.min(...tts) - 2, tmax = Math.max(...tts) + 2; const ty = (t) => GH - 18 - (t - tmin) / Math.max(1, tmax - tmin) * (GH - 34);
  const bars = Array.from({ length: Math.min(L, N) }, (_, i) => { const l = i + 1; const v = race.wet[l] || 0; return v > 0.02 ? `<rect x="${(x(l) - 2).toFixed(1)}" y="${(GH - 18 - v * (GH - 34)).toFixed(1)}" width="4" height="${(v * (GH - 34)).toFixed(1)}" rx="1" class="wb"/>` : ''; }).join('');
  const fbars = fc.blocks.map(b => `<rect x="${x(b.a).toFixed(1)}" y="${(GH - 18 - b.p / 100 * (GH - 34)).toFixed(1)}" width="${Math.max(3, x(b.b) - x(b.a)).toFixed(1)}" height="${(b.p / 100 * (GH - 34)).toFixed(1)}" class="fb"/>`).join('');
  const past = tts.slice(0, L).map((t, i) => `${x(i + 1).toFixed(1)},${ty(t).toFixed(1)}`).join(' ');
  const fut = tts.slice(L - 1).map((t, i) => `${x(i + L).toFixed(1)},${ty(t).toFixed(1)}`).join(' ');
  const kpi = (ic, l, v, sub) => `<div class="wx85-k">${wxSvg85(ic, 18)}<span><small>${l}</small><b>${v}</b>${sub || ''}</span></div>`;
  return `<div class="wx85-p" role="dialog" aria-label="${byLang('Clima e previsão', 'Weather and forecast')}">
    <div class="wx85-now">
      <div class="wx85-big ${w > 0.2 ? 'wet' : night ? 'night' : ''}">${wxSvg85(wxIcon85(w, night), 46)}<span><small>${byLang('Agora', 'Now')} · ${byLang('volta', 'lap')} ${Math.min(L, N)}</small><b>${Engine.wetLabel(w)}</b><em>${night ? byLang('Corrida noturna', 'Night race') : W.time === 'dusk' ? byLang('Entardecer', 'Dusk') : byLang('Corrida de dia', 'Day race')}</em></span></div>
      <div class="wx85-water"><small>${byLang('Água na pista', 'Water on track')}</small><b class="n-num">${Math.round(w * 100)}%</b><span class="wx85-meter"><i style="width:${Math.round(w * 100)}%"></i><em style="left:25%"></em><em style="left:55%"></em></span><span class="wx85-scale"><span>${byLang('seca', 'dry')}</span><span>inter</span><span>${byLang('chuva', 'wet')}</span></span></div>
      <div class="wx85-ks">${kpi('temp', byLang('Ar', 'Air'), `${(W.air || [])[L] ?? '—'}°C`)}${kpi('temp', byLang('Asfalto', 'Track'), `${(W.trackT || [])[L] ?? '—'}°C`)}${kpi('drop', byLang('Umidade', 'Humidity'), `${W.humidity ?? '—'}%`)}${kpi('wind', byLang('Vento', 'Wind'), `${W.wind ?? '—'} km/h`)}</div>
      <div class="wx85-tyre">${K85.tyre(tk)}<span><small>${byLang('Pneu indicado agora', 'Tyre to use now')}</small><b>${tl}</b></span></div>
    </div>
    <div class="wx85-fc"><div class="wx85-h"><b>${byLang('Previsão', 'Forecast')}</b><span>${byLang('estrategista', 'strategist')} ${fc.strat} · ${byLang('precisão', 'accuracy')} ~${fc.acc}%</span></div>
      ${fc.blocks.length ? `<div class="wx85-blocks">${fc.blocks.map(b => `<div class="wx85-b ${b.p >= 55 ? 'rain' : b.p >= 30 ? 'maybe' : ''}"><small>${byLang('V', 'L')}${b.a}–${b.b}</small>${wxSvg85(wxIcon85(b.p >= 55 ? Math.max(0.4, b.w) : b.p >= 30 ? 0.13 : 0, night), 24)}<b class="n-num">${b.p}%</b><span class="wx85-pb"><i style="height:${b.p}%"></i></span><em>${b.tt != null ? b.tt + '°' : ''}</em></div>`).join('')}</div>` : `<p class="n-mu">${byLang('Última volta: sem previsão.', 'Final lap: no forecast.')}</p>`}
      <p class="wx85-adv">${esc(advice)}</p></div>
    <div class="wx85-g"><div class="wx85-h"><b>${byLang('Água na pista e asfalto', 'Water and track temperature')}</b><span><i class="lg w"></i>${byLang('água (real)', 'water (actual)')} <i class="lg f"></i>${byLang('chance de chuva', 'rain chance')} <i class="lg t"></i>${byLang('asfalto', 'track')} °C</span></div>
      <svg viewBox="0 0 ${GW} ${GH}" class="wx85-svg">${[0, 0.5, 1].map(f => `<line x1="${pad}" x2="${GW - pad}" y1="${(GH - 18 - f * (GH - 34)).toFixed(1)}" y2="${(GH - 18 - f * (GH - 34)).toFixed(1)}" class="gl"/>`).join('')}${fbars}${bars}<polyline points="${past}" class="tl"/><polyline points="${fut}" class="tl fut"/><line x1="${x(L).toFixed(1)}" x2="${x(L).toFixed(1)}" y1="8" y2="${GH - 18}" class="now"/><text x="${x(L).toFixed(1)}" y="${GH - 4}" text-anchor="middle" class="gt">${byLang('agora', 'now')}</text><text x="${pad}" y="${GH - 4}" class="gt">${byLang('V', 'L')}1</text><text x="${GW - pad}" y="${GH - 4}" text-anchor="end" class="gt">${byLang('V', 'L')}${N}</text><text x="${GW - pad}" y="12" text-anchor="end" class="gt">${Math.round(tmax)}°</text><text x="${GW - pad}" y="${GH - 22}" text-anchor="end" class="gt">${Math.round(tmin)}°</text></svg></div>
  </div>`;
}

ACT.wx85 = () => { UI.wxOpen85 = !UI.wxOpen85; wxSync85(); };
function wxSync85() {
  const hud = document.getElementById('hud'); if (!hud) return;
  let b = hud.querySelector('.wx85-btn'); const html = wxButton85();
  if (b) b.outerHTML = html; else { const chip = [...hud.querySelectorAll('.chip')].find(c => /^(Pista|Track) /.test(c.textContent.trim())); if (chip) chip.outerHTML = html; else hud.insertAdjacentHTML('afterbegin', html); }
  let p = document.getElementById('wx85'); const host = document.querySelector('.r85');
  if (!UI.wxOpen85) { if (p) p.remove(); return; }
  if (!p && host) { host.insertAdjacentHTML('beforeend', '<div id="wx85" class="wx85"></div>'); p = document.getElementById('wx85'); }
  if (p) { const top = document.querySelector('.r85-top'); p.style.top = (top ? top.getBoundingClientRect().bottom + 6 : 80) + 'px'; p.innerHTML = wxPanel85(); }
}
/* fecha ao clicar fora ou com Esc */
document.addEventListener('click', (e) => { if (!UI.wxOpen85) return; if (e.target.closest('#wx85, .wx85-btn')) return; UI.wxOpen85 = false; wxSync85(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && UI.wxOpen85) { UI.wxOpen85 = false; wxSync85(); } });

/* topo da corrida: informações à esquerda, comandos à direita, sem quebrar linha */
(function () {
  const base = updateRace;
  updateRace = function (...a) {
    const r = base.apply(this, a);
    try {
      const hud = document.getElementById('hud');
      if (hud && UI.view === 'race') {
        wxSync85();
        const kids = [...hud.children]; const sp = hud.querySelector('.spacer');
        if (sp && !hud.querySelector('.r85-info')) {
          const i = kids.indexOf(sp); const info = document.createElement('div'); info.className = 'r85-info'; const ctl = document.createElement('div'); ctl.className = 'r85-ctl';
          kids.slice(0, i).forEach(k => info.appendChild(k)); kids.slice(i + 1).forEach(k => ctl.appendChild(k)); sp.remove();
          hud.append(info, ctl);
          const fl = [...info.querySelectorAll('.chip')].find(c => c.querySelector('.pur')); if (fl) fl.classList.add('fl85');
        }
      }
    } catch (e) { /* o topo nunca derruba a corrida */ }
    return r;
  };
})();
(function () {
  const g = go;
  go = function (view, ...a) { if (view !== 'race') UI.wxOpen85 = false; return g(view, ...a); };
})();
