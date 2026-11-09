/* ============================================================
   PIT WALL — idiomas (português do Brasil e inglês)
   O português é a língua de origem: cada texto da interface é a própria
   chave do catálogo (como no gettext). Em inglês, um observador traduz
   tudo o que entra na tela (texto, title, placeholder, aria-label):
     1. catálogo exato (I18N.dict, em i18n-en.js);
     2. modelos com números e nomes (I18N.pats), para textos montados.
   O texto gerado pelo jogo (narração, rádio, treino) já nasce no idioma
   escolhido (lang-en.js troca os modelos do núcleo).
   Em português nada é observado: custo zero.
   ============================================================ */
'use strict';

const I18N = { lang: 'pt', dict: {}, pats: [], cache: new Map(), mo: null };
I18N.ATTRS = ['title', 'placeholder', 'aria-label'];
I18N.get = () => { try { return localStorage.getItem('pw-lang'); } catch (e) { return null; } };
I18N.set = (l) => { try { localStorage.setItem('pw-lang', l); } catch (e) { /* sem armazenamento */ } I18N.apply(l); };
I18N.apply = (l) => {
  I18N.lang = l === 'en' ? 'en' : 'pt';
  LANG = I18N.lang;
  document.documentElement.lang = I18N.lang === 'en' ? 'en' : 'pt-BR';
  if (typeof applyLang === 'function') applyLang(I18N.lang);
  I18N.cache.clear();
  if (I18N.lang === 'en') { I18N.observe(); I18N.run(document.body); } else I18N.unobserve();
};
/* tradução de um texto inteiro (já sem espaços nas pontas); null = sem tradução */
I18N.tx = (s) => {
  const c = I18N.cache.get(s);
  if (c !== undefined) return c;
  let out = Object.prototype.hasOwnProperty.call(I18N.dict, s) ? I18N.dict[s] : null;
  if (out == null) {
    for (const [re, rep] of I18N.pats) {
      const m = s.match(re);
      if (m) { out = typeof rep === 'function' ? rep(...m) : s.replace(re, rep); break; }
    }
  }
  if (I18N.cache.size > 40000) I18N.cache.clear();
  I18N.cache.set(s, out);
  return out;
};
/* para usar no código da interface quando o texto não passa pelo DOM (ex.: confirm) */
const T = (s) => (I18N.lang === 'en' ? (I18N.tx(s) ?? s) : s);
I18N.text = (n) => {
  const v = n.nodeValue;
  if (!v || !/[A-Za-zÀ-ú]/.test(v)) return;
  const s = v.trim();
  const t = I18N.tx(s);
  if (t != null && t !== s) n.nodeValue = v.replace(s, () => t);
};
I18N.attrs = (el) => {
  for (const a of I18N.ATTRS) {
    const v = el.getAttribute(a);
    if (!v || !/[A-Za-zÀ-ú]/.test(v)) continue;
    const t = I18N.tx(v.trim());
    if (t != null && t !== v) el.setAttribute(a, t);
  }
};
I18N.run = (root) => {
  if (!root || I18N.lang !== 'en') return;
  if (root.nodeType === 3) return I18N.text(root);
  if (root.nodeType !== 1 || root.closest('script,style,[data-i18n="off"]')) return;
  I18N.attrs(root);
  root.querySelectorAll('[title],[placeholder],[aria-label]').forEach(I18N.attrs);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && n.parentElement.closest('script,style,[data-i18n="off"]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
  let n;
  while ((n = w.nextNode())) I18N.text(n);
};
I18N.observe = () => {
  if (I18N.mo || typeof MutationObserver === 'undefined') return;
  I18N.mo = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'characterData') I18N.text(m.target);
      else if (m.type === 'attributes') I18N.attrs(m.target);
      else m.addedNodes.forEach(I18N.run);
    }
  });
  I18N.mo.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: I18N.ATTRS });
};
I18N.unobserve = () => { if (I18N.mo) { I18N.mo.disconnect(); I18N.mo = null; } };

/* ---------- escolha do idioma ---------- */
I18N.pickerHtml = () => `<div class="seg" role="group" aria-label="Idioma / Language" data-i18n="off"><button class="${I18N.lang === 'pt' ? 'on' : ''}" data-act="setLang" data-l="pt">Português (Brasil)</button><button class="${I18N.lang === 'en' ? 'on' : ''}" data-act="setLang" data-l="en">English</button></div>`;
ACT.setLang = (el) => {
  const l = el.dataset.l;
  const first = !I18N.get();
  I18N.set(l);
  if (first || $('#modal')) closeModal();
  render();
};
I18N.firstRun = () => {
  if (I18N.get()) return;
  modal('Idioma / Language', `<div data-i18n="off" class="stack"><p class="small">Escolha o idioma do jogo. Dá para trocar depois em Salvar e opções.</p><p class="small muted">Choose the game language. You can change it later in Save &amp; options.</p>${I18N.pickerHtml()}</div>`);
};
/* catálogo em inglês (i18n-en.js) e idioma salvo valem desde a primeira tela */
if (typeof I18N_EN !== 'undefined') I18N.dict = I18N_EN;
if (typeof I18N_PATS !== 'undefined') I18N.pats = I18N_PATS;
I18N.apply(I18N.get() || 'pt');
