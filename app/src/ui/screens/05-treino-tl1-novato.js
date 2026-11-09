'use strict';
/* ---------- Fim de semana: novato no TL1 (regra da FIA: cada carro, 2 vezes por temporada) ---------- */
CHG.fp1Set86 = ACT.fp1Set86 = (el) => { const wk = G.weekend; if (!wk) return; const tid = G.player.teamId; wk.fp1 = wk.fp1 || {}; const m = (wk.fp1[tid] = wk.fp1[tid] || {}); if (el.value) m[el.dataset.car] = el.value; else delete m[el.dataset.car]; autosave(); render(); };
function fp1Panel86() {
  const wk = G.weekend; if (!wk || wk.phase !== 'practice' || Career.isObs(G) || typeof SL === 'undefined') return '';
  const tr = Career.track(G, wk.trackId); const tid = G.player.teamId; const lu = Career.lineup(G, tid);
  const ses = wk.fp && wk.fp.sessions && wk.fp.sessions[0]; const started = !ses || ses.t > 0 || wk.fp.cur > 0;
  const mine = (wk.fp1 && wk.fp1[tid]) || {}; const cands = SL.fp1Candidates(G, tid); const left = SL.remainingFP1(G);
  const car = (n) => { const done = SL.fp1Done(G, tid, n); const main = lu[n - 1]; const pick = mine[n] && Career.driver(G, mine[n]);
    const sel = started || tr.sprint ? `<b>${pick ? esc(pick.name) : esc(main ? main.name : '—')}</b>` : `<select class="inp" data-chg="fp1Set86" data-car="${n}" aria-label="${byLang('Piloto do TL1', 'FP1 driver')}"><option value="">${esc(main ? main.name : '—')} (${byLang('titular', 'race driver')})</option>${cands.map(d => `<option value="${d.id}" ${mine[n] === d.id ? 'selected' : ''}>${esc(d.name)} · ${esc(SL.label(SL.status(G, d)).toLowerCase())} · ${SL.points(G, d)} pts${d.team ? '' : ' · ' + byLang('emprestado', 'on loan')}</option>`).join('')}</select>`;
    return `<div class="fp86-car"><span class="fp86-n">${byLang('Carro', 'Car')} ${n}</span>${sel}<span class="fp86-q">${[0, 1].map(i => `<i class="${i < done ? 'on' : ''}"></i>`).join('')}<small>${done}/${SL.FP1_PER_CAR}</small></span></div>`; };
  const needTot = [1, 2].reduce((a, n) => a + Math.max(0, SL.FP1_PER_CAR - SL.fp1Done(G, tid, n)), 0);
  const note = tr.sprint ? byLang('Fim de semana com Sprint: só há um treino, e as equipes não costumam ceder o carro.', 'Sprint weekend: only one practice session; teams rarely hand the car over.')
    : started ? byLang('O TL1 já começou: a escolha fica para o próximo GP.', 'FP1 has started: the choice waits for the next GP.')
    : needTot ? byLang(`Faltam ${needTot} TL1 com novato e restam ${left} GP(s) sem Sprint. Quem cumpre a regra ganha 1 ponto de superlicença por TL1; o titular perde parte do acerto do treino.`, `${needTot} rookie FP1 session(s) still due with ${left} non-Sprint GP(s) left. Each run earns the rookie 1 super licence point; the race driver loses some setup work.`)
    : byLang('Cota de novatos cumprida nesta temporada.', 'Rookie quota met this season.');
  return K85.card({ t: byLang('Novato no TL1', 'Rookie in FP1'), a: byLang('regra da FIA: 2 vezes por carro na temporada', 'FIA rule: twice per car per season'), body: `<div class="fp86">${car(1)}${car(2)}</div><p class="n-mu fp86-note">${note}</p>` });
}
(function () {
  const sc = SCREENS.weekend; if (!sc) return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    try { const p = fp1Panel86(); if (!p) return out; const i = out.indexOf('<div class="fp-bar panel">'); return i >= 0 ? out.slice(0, i) + p + out.slice(i) : p + out; } catch (e) { return out; }
  };
})();
