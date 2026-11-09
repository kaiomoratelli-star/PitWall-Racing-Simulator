'use strict';
/* ---------- Finanças: previsão do ano, receita prevista, custos fixos e patrimônio dos donos
   (existiam na 0.8.4 e sumiram quando a tela foi refeita na 0.8.5) ---------- */
(function () {
  const sc = SCREENS.finance; if (!sc) return;
  const h = sc.html;
  sc.html = function () {
    const out = h.call(this);
    if ((UI.params.tab || 'visao') !== 'visao' || Career.isObs(G)) return out;
    const team = Career.team(G); const s = G.season;
    const L = (G.finances.ledger || []).filter(x => x.year === s.year);
    const played = Math.max(1, s.round), left = s.calendar.length - s.round;
    const net = sum(L.map(x => x.amount)) / played;
    const pos = Career.standingsC(G).findIndex(x => x.tid === team.id) + 1;
    const proj = G.finances.balance + net * left;
    const cap = typeof Econ !== 'undefined' ? Econ.cap(G) : G.db.rules.budgetCap;
    const capProj = typeof Econ !== 'undefined' ? G.finances.spent + Econ.committed(G, team) - cap * 0.03 * (left / s.calendar.length) : G.finances.spent / played * s.calendar.length;
    const capPct = Math.round(capProj / cap * 100);
    const drv = sum(Career.teamDrivers(G, team.id).map(d => d.salary || 0)), stf = typeof Staff !== 'undefined' ? Staff.payroll(team) : 0;
    const box = (l, v, sub, cls) => `<div class="fc86"><small>${l}</small><b class="n-num ${cls || ''}">${v}</b>${sub ? `<em>${sub}</em>` : ''}</div>`;
    let econ = '';
    if (typeof Econ !== 'undefined') {
      const rv = Econ.revenue(G, team); const spon = sum((G.sponsors || []).map(x => x.perRace || 0)) * s.calendar.length; const pool = Math.max(1, Econ.sponsorPool(team));
      econ = box(byLang('Receita prevista no ano', 'Expected revenue this year'), fmtMoney(rv.commercial + spon + rv.owner), byLang(`comercial ${fmtMoney(rv.commercial)} · patrocínio ${fmtMoney(spon)} · donos ${fmtMoney(rv.owner)}`, `commercial ${fmtMoney(rv.commercial)} · sponsorship ${fmtMoney(spon)} · owners ${fmtMoney(rv.owner)}`)) +
        box(byLang('Mercado de patrocínio', 'Sponsorship market'), Math.round(spon / pool * 100) + '%', byLang(`do que as marcas pagam por uma equipe com a sua exposição (${fmtMoney(pool)}/ano)`, `of what brands pay a team with your exposure (${fmtMoney(pool)}/yr)`)) +
        box(byLang('Custos fixos no ano', 'Fixed costs this year'), fmtMoney(-(Econ.factory(G, team) + Econ.marketing(G, team))), byLang(`fábrica e pessoal ${fmtMoney(Econ.factory(G, team))} · marketing ${fmtMoney(Econ.marketing(G, team))}`, `factory and staff ${fmtMoney(Econ.factory(G, team))} · marketing ${fmtMoney(Econ.marketing(G, team))}`), 'n-loss') +
        box(byLang('Patrimônio dos donos', 'Owners\' equity'), fmtMoney(G.finances.corporate || 0), byLang(`o caixa guarda até ${fmtMoney(Econ.reserve(G, team))}; o excedente vai para os donos`, `the team keeps up to ${fmtMoney(Econ.reserve(G, team))}; the surplus goes to the owners`));
    }
    const card = K85.card({ t: byLang(`Previsão para o fim de ${s.year}`, `Forecast for the end of ${s.year}`), a: `<small class="n-mu">${byLang(`média das ${played} etapa(s) disputada(s)`, `average of ${played} round(s) raced`)}</small>`,
      body: `<div class="fc86-g">${box(byLang('Caixa projetado', 'Projected cash'), fmtMoney(proj), byLang(`você está em ${ordinal(pos)}: a posição final define a distribuição comercial do ano que vem`, `you are ${ordinal(pos)}: the final position sets next year's commercial payout`), proj < 0 ? 'n-loss' : 'n-gain')}
        ${box(byLang('Teto no fim do ano', 'Cap at year end'), capPct + '%', capProj > cap ? byLang('risco de estourar o teto: multa e punição esportiva', 'risk of breaching the cap: fine and sporting penalty') : byLang('dentro do limite', 'within the limit'), capProj > cap ? 'n-loss' : '')}
        ${box(byLang('Folha fixa por ano', 'Fixed payroll per year'), fmtMoney(drv + stf), byLang(`pilotos ${fmtMoney(drv)} · funcionários ${fmtMoney(stf)}`, `drivers ${fmtMoney(drv)} · staff ${fmtMoney(stf)}`))}${econ}</div>` });
    // entra logo depois do cabeçalho da tela
    try { const tmp = document.createElement('div'); tmp.innerHTML = out; const ph = tmp.querySelector('.n-ph'); if (ph) { ph.insertAdjacentHTML('afterend', card); return tmp.innerHTML; } } catch (e) { /* segue */ }
    return out + card;
  };
})();
