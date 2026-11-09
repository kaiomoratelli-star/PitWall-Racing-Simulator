/* ============================================================
   PIT WALL — tela Equipe irmã: compra, promoção de pilotos,
   academia compartilhada, política de pilotos e venda.
   ============================================================ */
'use strict';

NAV.splice(NAV.findIndex(n => n[0] === 'academy') + 1, 0, ['sister', 'Equipe irmã', 'M7 20V9l5-4 5 4v11M3 20V12l4-3m14 11v-8l-4-3M10 20v-5h4v5']);
MANAGER_ONLY.add('sister');

/* 0.8.7: tela portada para o visual novo (K85), com tudo o que a versão antiga mostrava:
   lista de compra, tabelas das duas equipes com "Promover", parceria técnica, política de pilotos,
   próxima decisão, academia compartilhada e venda. Os cartões de indicação, identidade e parcerias
   técnicas (ui86.js) continuam sendo acrescentados por baixo. */
function sisDriverRows(tid, btn) {
  const race = G.db.drivers.filter(d => d.team === tid && d.seat !== 'R').sort((a, b) => a.seat - b.seat);
  return K85.table([[''], [byLang('Piloto', 'Driver')], [byLang('Nota', 'Rating'), 'c'], ['Pts', 'c'], [byLang('Bateu o colega', 'Beat team-mate'), 'c'], ['', 'r']],
    race.map(d => { const st = G.season.stats[d.id] || {}; return [K85.av(d, 34), `${K85.who(d.id, { tid })}<small class="n-mu" style="display:block">${d.age} ${byLang('anos', 'years')} · ${byLang('contrato até', 'contract until')} ${d.contract ? d.contract.until : G.season.year + Math.max(0, d.contractYears || 0)}</small>`, `<b class="n-num">${driverOverall(d)}</b>`, `<span class="n-num">${G.season.standD[d.id] || 0}</span>`, `<span class="n-num">${st.starts ? `${st.beatMate}/${st.starts}` : '—'}</span>`, btn ? btn(d) : '']; }));
}
function sisFamily(parent, child, mine) {
  const P = Career.team(G, parent), C = Career.team(G, child);
  const pos = (tid) => { const arr = Object.entries(G.season.standC).sort((a, b) => b[1] - a[1]).map(x => x[0]); return arr.indexOf(tid) + 1; };
  const iAmParent = mine === parent;
  const cand = Sisters.candidates(G, parent);
  const ac = (G.academies || []).find(a => a.team === parent);
  const members = ac ? ac.members.map(id => Career.driver(G, id)).filter(d => d && !d.retired) : [];
  const info = (G.sisterInfo || {})[child] || {};
  const where = (d) => d.team ? esc(Career.team(G, d.team).name) + (d.seat === 'R' ? ` (${byLang('reserva', 'reserve')})` : '') : d.cat && G.cats && G.cats.byId[d.cat] ? esc(G.cats.byId[d.cat].name || d.cat) : `<span class="n-mu">${byLang('sem vaga', 'no seat')}</span>`;
  return K85.grid('1fr 1fr',
      K85.card({ t: P.name, a: K85.tag(`${byLang('Principal', 'Parent')} · ${pos(parent)}º`), flush: true, body: sisDriverRows(parent) }),
      K85.card({ t: C.name, a: K85.tag(`${byLang('Irmã', 'Sister')} · ${pos(child)}º`, 'acc'), flush: true, body: sisDriverRows(child, iAmParent && !G.weekend ? (d) => `<button class="btn sm" data-act="sisPromoteOpen" data-id="${d.id}" ${d.futureTeam ? 'disabled' : ''}>${byLang('Promover', 'Promote')}</button>` : null) })) +
    K85.grid('1fr 1fr 1fr',
      K85.card({ t: byLang('Parceria técnica', 'Technical partnership'), body: `<p class="n-sm">${byLang(`A ${esc(C.name)} usa peças da ${esc(P.name)} (suspensão, câmbio e partes do chassi) e se aproxima dela a cada temporada.`, `${esc(C.name)} uses ${esc(P.name)} parts (suspension, gearbox and chassis parts) and gets closer every season.`)}</p>${K85.kv([[byLang('Chassi', 'Chassis'), `${esc(P.short)} <b class="n-num">${P.car.chassis.toFixed(1)}</b> · ${esc(C.short)} <b class="n-num">${C.car.chassis.toFixed(1)}</b>`], [byLang('Aerodinâmica', 'Aerodynamics'), `${esc(P.short)} <b class="n-num">${P.car.aero.toFixed(1)}</b> · ${esc(C.short)} <b class="n-num">${C.car.aero.toFixed(1)}</b>`]])}` }),
      K85.card({ t: byLang('Política de pilotos da irmã', 'Sister team driver policy'), body: `${iAmParent ? `<div class="pol86-seg"><button class="seg ${info.policy !== 'results' ? 'on' : ''}" data-act="sisPolicy" data-v="youth">${byLang('Formar jovens', 'Develop youngsters')}</button><button class="seg ${info.policy === 'results' ? 'on' : ''}" data-act="sisPolicy" data-v="results">${byLang('Buscar resultados', 'Chase results')}</button></div>` : `<b>${info.policy === 'results' ? byLang('Buscar resultados', 'Chase results') : byLang('Formar jovens', 'Develop youngsters')}</b>`}<p class="n-mu n-sm">${byLang('Formar jovens: quando abrir vaga na irmã, a preferência é dos pilotos da academia. Buscar resultados: pilotos experientes têm mais chance.', 'Develop youngsters: when a seat opens at the sister team, academy drivers come first. Chase results: experienced drivers have a better chance.')}</p>` }),
      K85.card({ t: iAmParent ? byLang('Próxima decisão', 'Next decision') : byLang('Risco de promoção', 'Promotion risk'), body: `${cand ? `<p class="n-sm">${byLang('Melhor da irmã', 'Best at the sister team')}: <b>${esc(cand.up.name)}</b>. ${byLang('Pior da principal', 'Weakest at the parent team')}: <b>${esc(cand.down.name)}</b>. ${byLang('Diferença de rendimento', 'Performance gap')}: <b class="n-num ${cand.gap > 0 ? 'n-gain' : 'n-loss'}">${cand.gap > 0 ? '+' : ''}${cand.gap.toFixed(1)}</b>.</p>` : `<p class="n-mu n-sm">${byLang('Sem candidatos agora.', 'No candidates right now.')}</p>`}<p class="n-mu n-sm">${iAmParent ? byLang('Você pode trocar os pilotos entre as equipes a qualquer momento entre um GP e outro, inclusive no meio da temporada.', 'You can swap drivers between the teams at any time between GPs, including mid-season.') : byLang(`A ${esc(P.name)} pode levar pilotos da academia dela que correm pela ${esc(C.name)}, e mandar o rebaixado para cá.`, `${esc(P.name)} can take its academy drivers racing for ${esc(C.name)} and send the demoted driver here.`)}</p>` })) +
    K85.card({ t: `${byLang('Academia compartilhada', 'Shared academy')}: ${ac ? ac.name : ''}`, a: `<small class="n-mu">${members.length} ${byLang('pilotos', 'drivers')}</small>`, flush: true,
      body: members.length ? K85.table([[''], [byLang('Piloto', 'Driver')], [byLang('Idade', 'Age'), 'c'], [byLang('Onde corre', 'Racing in')], [byLang('Nota', 'Rating'), 'c'], [byLang('Pot.', 'Pot.'), 'c']], members.sort((a, b) => driverOverall(b) - driverOverall(a)).map(d => [K85.av(d, 30), K85.who(d.id, { tid: d.team }), `<span class="n-num">${d.age}</span>`, `<small>${where(d)}</small>`, `<b class="n-num">${driverOverall(d)}</b>`, `<span class="n-num">${potText(d)}</span>`])) : K85.empty(byLang('Sem membros.', 'No members.')) });
}

SCREENS.sister = {
  html() {
    Sisters.ensure(G);
    const me = G.player.teamId;
    const parent = Sisters.parentOf(G, me), child = Sisters.childOf(G, me);
    const head = (s, act) => K85.head({ t: byLang('Equipe irmã e parcerias', 'Sister team and partnerships'), s, act });
    if (parent) return head(byLang(`A sua equipe pertence à família ${esc(Career.team(G, parent).name)}. As duas compartilham a academia, você recebe peças da principal, e ela pode promover os seus pilotos que são da academia dela.`, `Your team belongs to the ${esc(Career.team(G, parent).name)} family. Both share the academy, you get parts from the parent team, and it can promote your drivers who belong to its academy.`)) + sisFamily(parent, me, me);
    if (child) {
      const info = G.sisterInfo[child] || {};
      const value = Math.round(Sisters.price(G, child) * 0.85);
      return head(info.real ? byLang('Relação histórica da equipe.', 'Historic relationship of the team.') : byLang(`Comprada em ${info.since} por ${fmtMoney(info.price || 0)}.`, `Bought in ${info.since} for ${fmtMoney(info.price || 0)}.`), info.real ? '' : `<button class="btn danger" data-act="sisSell">${byLang('Vender a', 'Sell')} ${esc(Career.team(G, child).name)} (${fmtMoney(value)})</button>`) + sisFamily(me, child, me);
    }
    const why = Sisters.canBuy(G);
    const prev = (G.history || []).slice(-1)[0];
    const rows = G.db.teams.filter(t => t.id !== me).map(t => ({ t, price: Sisters.price(G, t.id), block: Sisters.blocker(G, t.id), rank: prev ? prev.standC.findIndex(x => x.tid === t.id) + 1 : null }));
    return head(byLang('Compre uma equipe satélite (no máximo uma), como a Red Bull fez com a Toro Rosso. As duas compartilham a academia, a irmã usa peças da sua equipe e vota com você no Conselho da FIA, e você pode promover pilotos dela e rebaixar os seus. O preço vai de 40% a 70% do orçamento anual da equipe comprada.', 'Buy a satellite team (one at most), as Red Bull did with Toro Rosso. Both share the academy, the sister team uses your parts and votes with you in the FIA Council, and you can promote its drivers and demote yours. The price is 40% to 70% of the bought team\'s yearly budget.')) +
      (why ? `<div class="n-help">${esc(why)}</div>` : '') +
      K85.card({ t: byLang('Equipes', 'Teams'), a: `<small class="n-mu">${byLang('Caixa', 'Cash')}: ${fmtMoney(G.finances.balance)}</small>`, flush: true,
        body: K85.table([[byLang('Equipe', 'Team')], [byLang('Último campeonato', 'Last championship'), 'c'], [byLang('Orçamento', 'Budget'), 'c'], [byLang('Reputação', 'Reputation'), 'c'], [byLang('Preço', 'Price'), 'c'], [byLang('Situação', 'Status')], ['', 'r']],
          rows.map(x => [K85.tm(x.t.id), `<span class="n-num">${x.rank ? x.rank + 'º' : '—'}</span>`, `<span class="n-num">${fmtMoney(x.t.budget)}</span>`, `<span class="n-num">${x.t.reputation}</span>`, `<span class="n-num">${x.block ? '—' : fmtMoney(x.price)}</span>`, `<small class="${x.block ? 'n-mu' : 'n-gain'}">${esc(x.block || byLang('À venda', 'For sale'))}</small>`, !x.block && !why ? `<button class="btn sm primary" data-act="sisBuyOpen" data-id="${x.t.id}">${byLang('Comprar', 'Buy')}</button>` : ''])) });
  },
};

ACT.sisBuyOpen = (el) => {
  const t = Career.team(G, el.dataset.id);
  const price = Sisters.price(G, t.id);
  modal(`Comprar a ${t.name}`, `<p>Preço: <b>${fmtMoney(price)}</b> (${Math.round(price / t.budget * 100)}% do orçamento anual de ${fmtMoney(t.budget)}). Caixa depois da compra: <b>${fmtMoney(G.finances.balance - price)}</b>.</p>
    <ul class="small" style="margin:0;padding-left:18px"><li>Academias unidas: os membros da academia da ${esc(t.name)} passam para a sua.</li><li>Parceria técnica: a ${esc(t.name)} recebe peças da sua equipe e se aproxima do seu carro a cada temporada.</li><li>Você pode promover pilotos dela e rebaixar os seus, inclusive no meio da temporada.</li><li>A ${esc(t.name)} passa a votar com a sua equipe no Conselho da FIA.</li><li>Dá para vender depois, por 85% do valor de mercado.</li></ul>`,
    `<button class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn primary" data-act="sisBuy" data-id="${t.id}">Confirmar compra</button>`);
};
ACT.sisBuy = (el) => { const e = Sisters.buy(G, el.dataset.id); closeModal(); if (e) return toast(e, 'bad'); toast('Compra concluída. A equipe irmã é sua.', 'good'); autosave(); render(); };
ACT.sisSell = () => {
  const c = Sisters.childOf(G, G.player.teamId);
  modal('Vender a equipe irmã', `<p>Vender a ${esc(Career.team(G, c).name)} por <b>${fmtMoney(Math.round(Sisters.price(G, c) * 0.85))}</b>? A academia continua com você; a parceria técnica e a troca de pilotos acabam.</p>`, `<button class="btn ghost" data-act="closeModal">Cancelar</button><button class="btn danger" data-act="sisSellGo">Vender</button>`);
};
ACT.sisSellGo = () => { const e = Sisters.sell(G); closeModal(); if (e) return toast(e, 'bad'); toast('Equipe vendida.', 'good'); autosave(); render(); };
ACT.sisPolicy = (el) => { Sisters.setPolicy(G, el.dataset.v); autosave(); render(); };
ACT.sisPromoteOpen = (el) => {
  const up = Career.driver(G, el.dataset.id);
  const mine = G.db.drivers.filter(d => d.team === G.player.teamId && d.seat !== 'R');
  modal(`Promover ${up.name}`, `<p class="small">${esc(up.name)} (nota ${driverOverall(up)}) sobe para a sua equipe. Quem desce para a ${esc(Career.team(G, up.team).name)}?</p>
    <div class="stack">${mine.map(d => `<button class="btn opt" data-act="sisPromote" data-up="${up.id}" data-down="${d.id}" ${d.futureTeam ? 'disabled' : ''}><span>${esc(d.name)} (carro #${d.seat})</span><span class="small muted">nota ${driverOverall(d)} · ${G.season.standD[d.id] || 0} pts</span></button>`).join('')}</div>
    <p class="small muted">Os contratos continuam valendo. O promovido fica mais motivado; o rebaixado perde moral.</p>`);
};
ACT.sisPromote = (el) => { const e = Sisters.swap(G, el.dataset.up, el.dataset.down, 'Decisão do chefe de equipe.'); closeModal(); if (e) return toast(e, 'bad'); toast('Troca feita. Vale a partir da próxima etapa.', 'good'); autosave(); render(); };
