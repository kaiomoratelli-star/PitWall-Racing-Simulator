'use strict';
/* ---------- Funcionários: clima, pedidos e conflitos ---------- */
(function () {
  const sc = SCREENS.team; if (!sc || typeof People === 'undefined') return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    if ((UI.params.tab || 'drivers') !== 'staff' || Career.isObs(G)) return out;
    const t = Career.team(G); const L = (t.staffList || []).filter(s => !s.isPlayer).slice().sort((a, b) => (a.morale ?? 70) - (b.morale ?? 70));
    const C = G.staffConflict && G.staffConflict.y === G.season.year && G.staffConflict.until > G.season.round ? G.staffConflict : null;
    const B = G.staffBoost && G.staffBoost.y === G.season.year && G.staffBoost.until > G.season.round ? G.staffBoost : null;
    const nm = (id) => { const s = t.staffList.find(x => x.id === id); return s ? s.name : ''; };
    const rows = L.map(s => { const m = Math.round(s.morale ?? 70); return [`<b>${esc(s.name)}</b>`, `<small>${esc(People.roleName(s.role))}</small>`, `${K85.bar(m, 100, m >= 65 ? 'var(--green)' : m >= 45 ? 'var(--yellow)' : 'var(--red)', 100)} <span class="n-num">${m}</span>`, s.poachRisk ? K85.tag(byLang('pode sair', 'may leave'), 'neg') : (m < 45 ? K85.tag(byLang('insatisfeito', 'unhappy'), 'neg') : '')]; });
    return out + K85.card({ t: byLang('Clima entre os funcionários', 'Staff mood'), a: C ? K85.tag(byLang('Conflito em andamento', 'Ongoing conflict'), 'neg') : B ? K85.tag(byLang('Verba extra ativa', 'Extra budget active'), 'pos') : '', flush: true,
      body: (C ? `<div class="n-help" style="margin:10px 14px">${byLang(`${esc(nm(C.a))} e ${esc(nm(C.b))} estão em conflito até a etapa ${C.until}: os projetos de P&D rendem cerca de 7% menos.`, `${esc(nm(C.a))} and ${esc(nm(C.b))} are in conflict until round ${C.until}: R&D projects yield about 7% less.`)}</div>` : '') +
        K85.table([[byLang('Nome', 'Name')], [byLang('Cargo', 'Role')], [byLang('Moral', 'Morale')], ['']], rows) +
        `<p class="n-mu n-sm" style="margin:10px 14px">${byLang('A moral sobe com bons resultados e pedidos atendidos. Funcionários bons pedem aumento, verba ou promoção; chefes de área insatisfeitos entram em conflito; o diretor técnico pode pedir demissão depois de um ano abaixo da meta.', 'Morale rises with good results and granted requests. Good staff ask for raises, budget or promotion; unhappy department heads clash; the technical director may resign after a year below target.')}</p>` });
  };
})();
