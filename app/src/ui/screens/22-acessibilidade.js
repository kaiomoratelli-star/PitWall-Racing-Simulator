'use strict';
/* ---------- Acessibilidade (0.8.7) ----------
   - Teclado: tudo o que é clicável e não é botão (cartões, linhas, nomes) recebe foco (Tab) e abre com Enter ou Espaço.
   - Tamanho do texto: Normal, Grande e Muito grande (Salvar e opções), guardado nas preferências da interface.
   - Contraste: as cores de texto secundário passaram de 4,5:1 nos dois temas (ui85.css). */
const A11Y85 = {
  SIZES: [['normal', 'Normal', 'Normal'], ['large', 'Grande', 'Large'], ['xlarge', 'Muito grande', 'Extra large']],
  apply() { const s = (typeof UIPREF !== 'undefined' && UIPREF.get('size')) || 'normal'; document.documentElement.dataset.size = s; },
  // dá foco e papel de botão a quem tem data-act e não é um controle nativo
  fix(root) {
    (root || document).querySelectorAll('[data-act]:not(button):not(a[href]):not(input):not(select):not(textarea)').forEach(el => {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
      if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    });
  },
};
A11Y85.apply();
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target;
  if (!el || !el.matches || !el.matches('[data-act]:not(button):not(a[href]):not(input):not(select):not(textarea)')) return;
  e.preventDefault(); el.click();
});
(function () {
  const base = render;
  render = function () { const r = base.apply(this, arguments); try { A11Y85.fix(document.getElementById('app')); } catch (e) { /* só acessibilidade */ } return r; };
  // os modais também
  // janelas (modal): itens clicáveis com foco, e o foco vai para dentro da janela ao abrir
  const md = modal;
  modal = function () { const r = md.apply(this, arguments); try { const m = document.getElementById('modal'); if (m) { A11Y85.fix(m); const f = m.querySelector('button:not([data-act="closeModal"]), [tabindex="0"], input, select'); if (f) f.focus({ preventScroll: true }); } } catch (e) { /* só acessibilidade */ } return r; };
  const sv = SCREENS.saves;
  if (sv) { const h = sv.html; sv.html = function () { const cur = (typeof UIPREF !== 'undefined' && UIPREF.get('size')) || 'normal';
    return h.call(this) + K85.card({ t: byLang('Acessibilidade', 'Accessibility'), body: `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><span class="small muted">${byLang('Tamanho do texto', 'Text size')}</span>${A11Y85.SIZES.map(([k, pt, en]) => `<button class="btn sm ${cur === k ? 'primary' : ''}" data-act="a11ySize" data-v="${k}" aria-pressed="${cur === k}">${byLang(pt, en)}</button>`).join('')}</div><p class="small muted" style="margin-top:8px">${byLang('Tudo o que é clicável pode ser usado pelo teclado: Tab para andar, Enter ou Espaço para abrir.', 'Everything clickable works from the keyboard: Tab to move, Enter or Space to open.')}</p>` }); }; }
})();
ACT.a11ySize = (el) => { if (typeof UIPREF !== 'undefined') UIPREF.set('size', el.dataset.v); A11Y85.apply(); render(); };
