'use strict';
/* ---------- Parcerias técnicas (além das equipes irmãs) ---------- */
function partnersCard86() {
  if (typeof Owners === 'undefined' || !Owners.partners) return '';
  const P = Owners.partners(G); const me = Career.isObs(G) ? null : G.player.teamId; const t = me ? Career.team(G) : null;
  const pkgName = (k) => (k === 'full' ? byLang('Completo', 'Full') : k === 'basic' ? byLang('Básico', 'Basic') : byLang('Histórico', 'Historic'));
  const parts = (p) => esc(byLang((p.parts || []).join(', '), (p.partsEn || p.parts || []).join(', ')));
  const rows = Object.entries(P).filter(([c, p]) => Career.team(G, c) && Career.team(G, p.parent)).map(([c, p]) => [K85.tm(c), `<small class="n-mu">→</small> ${K85.tm(p.parent)}`, `<small>${parts(p)}</small>`, `<small>${pkgName(p.pkg)}${p.fee ? ` · ${fmtMoney(p.fee)}/${byLang('ano', 'yr')}` : ''}</small>`, `<span class="n-num">${p.since}</span>`,
    me && (c === me || p.parent === me) && p.player !== undefined ? `<button class="btn sm danger" data-act="ptEnd86" data-id="${c}">${byLang('Encerrar', 'End')}</button>` : (me && (c === me || p.parent === me) ? `<button class="btn sm danger" data-act="ptEnd86" data-id="${c}">${byLang('Encerrar', 'End')}</button>` : '')]);
  let mine = '';
  if (t) {
    const myP = P[me];
    if (t.works) {
      const kids = Owners.kidsOf(G, me);
      const cands = G.db.teams.filter(x => !Owners.canParent(G, me, x.id));
      mine = `<p class="n-sm">${byLang(`Como equipe de fábrica, você pode vender peças às clientes do seu motor (até 2). Parceiras hoje: ${kids.length}.`, `As a works team you can sell parts to your engine customers (up to 2). Current partners: ${kids.length}.`)}</p>` +
        (cands.length ? `<div class="pt86-o">${cands.map(x => `<div class="pt86-r">${K85.tm(x.id)}<span class="n-grow"></span><button class="btn sm" data-act="ptOffer86" data-id="${x.id}" data-pkg="basic">${byLang('Oferecer básico', 'Offer basic')} (+${fmtMoney(Owners.PKG.basic.fee)}/${byLang('ano', 'yr')})</button><button class="btn sm primary" data-act="ptOffer86" data-id="${x.id}" data-pkg="full">${byLang('Oferecer completo', 'Offer full')} (+${fmtMoney(Owners.PKG.full.fee)}/${byLang('ano', 'yr')})</button></div>`).join('')}</div>` : `<p class="n-mu n-sm">${byLang('Nenhuma cliente do seu motor disponível agora.', 'No customer of your engine available right now.')}</p>`);
    } else if (myP) {
      mine = `<p class="n-sm">${byLang(`Você compra ${parts(myP)} da`, `You buy ${parts(myP)} from`)} ${K85.tm(myP.parent)} ${byLang('desde', 'since')} ${myP.since}.</p>`;
    } else {
      const works = G.db.teams.filter(x => x.works && !Owners.canParent(G, x.id, me));
      mine = `<p class="n-sm">${byLang('Clientes podem comprar peças da equipe de fábrica que fornece o seu motor. A transferência aproxima o seu chassi e a confiabilidade dos dela (nunca a aerodinâmica). A taxa anual entra no teto de gastos.', 'Customers can buy parts from the works team that supplies their engine. The transfer brings your chassis and reliability closer to theirs (never the aerodynamics). The yearly fee counts towards the cost cap.')}</p>` +
        (works.length ? `<div class="pt86-o">${works.map(x => `<div class="pt86-r">${K85.tm(x.id)}<span class="n-grow"></span><button class="btn sm" data-act="ptAsk86" data-id="${x.id}" data-pkg="basic">${byLang('Pedir básico', 'Ask basic')}: ${byLang('motor e câmbio', 'engine and gearbox')} (${fmtMoney(Owners.PKG.basic.fee)}/${byLang('ano', 'yr')})</button><button class="btn sm primary" data-act="ptAsk86" data-id="${x.id}" data-pkg="full">${byLang('Pedir completo', 'Ask full')}: + ${byLang('suspensão e túnel', 'suspension and tunnel')} (${fmtMoney(Owners.PKG.full.fee)}/${byLang('ano', 'yr')})</button></div>`).join('')}</div>` : `<p class="n-mu n-sm">${byLang('A equipe de fábrica do seu motor não está disponível (já tem duas parceiras, ou o seu fornecedor não tem equipe na F1).', 'Your engine\'s works team is not available (it already has two partners, or your supplier has no F1 team).')}</p>`);
    }
  }
  return K85.card({ t: byLang('Parcerias técnicas', 'Technical partnerships'), a: `<small class="n-mu">${byLang('compra de peças entre equipes, sem ser dona', 'parts deals between teams, without ownership')}</small>`,
    body: mine + (rows.length ? K85.table([[byLang('Parceira', 'Partner')], [byLang('Principal', 'Parent')], [byLang('Peças', 'Parts')], [byLang('Pacote', 'Package')], [byLang('Desde', 'Since'), 'c'], ['', 'r']], rows) : K85.empty(byLang('Nenhuma parceria técnica no grid.', 'No technical partnerships on the grid.'))) });
}
(function () {
  const sc = SCREENS.sister; if (!sc) return;
  const h = sc.html;
  sc.html = function () { return h.call(this) + partnersCard86(); };
  ACT.ptAsk86 = (el) => { const e = Owners.askPartner(G, el.dataset.id, el.dataset.pkg); if (e) return toast(e, 'bad'); toast(byLang('Parceria fechada!', 'Partnership agreed!'), 'good'); autosave(); render(); };
  ACT.ptOffer86 = (el) => { const e = Owners.offerPartner(G, el.dataset.id, el.dataset.pkg); if (e) return toast(e, 'bad'); toast(byLang('Parceria fechada!', 'Partnership agreed!'), 'good'); autosave(); render(); };
  ACT.ptEnd86 = (el) => { const e = Owners.endPartnerPlayer(G, el.dataset.id); if (e) return toast(e, 'bad'); toast(byLang('Parceria encerrada.', 'Partnership ended.'), 'good'); autosave(); render(); };
})();
