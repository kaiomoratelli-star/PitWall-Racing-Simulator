'use strict';
/* ---------- Abas internas em telas longas (0.8.7) ----------
   Carro: "Visão geral" (áreas, comparação com o grid) e "Motor e peças" (componentes, previsão, por quê).
   Só reorganiza o que a tela já mostra: nada sai, só passa para a outra aba. */
(function () {
  const sc = SCREENS.car; if (!sc) return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    if (!G || Career.isObs(G) || typeof document === 'undefined') return out;
    const tab = UI.params.tab === 'motor' ? 'motor' : 'geral';
    const t = document.createElement('template'); t.innerHTML = out;
    const kids = [...t.content.children]; if (kids.length < 3) return out;
    const head = kids[0];
    const isMotor = (el) => el.classList.contains('pu86-card') || el.classList.contains('why85-card');
    if (!kids.some(isMotor)) return out;
    kids.slice(1).forEach(el => { if ((tab === 'motor') !== isMotor(el)) el.remove(); });
    const tabs = [['geral', byLang('Visão geral', 'Overview')], ['motor', byLang('Motor e peças', 'Power unit and parts')]];
    const bar = document.createElement('div'); bar.className = 'n-tabs in85-tabs'; bar.setAttribute('role', 'tablist');
    bar.innerHTML = tabs.map(([v, l]) => `<button class="${v === tab ? 'on' : ''}" role="tab" aria-selected="${v === tab}" data-act="go" data-v="car" data-p='${esc(JSON.stringify({ tab: v }))}'>${esc(l)}</button>`).join('');
    head.after(bar);
    return t.innerHTML;
  };
})();
