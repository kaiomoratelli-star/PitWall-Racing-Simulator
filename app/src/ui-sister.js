/* ============================================================
   PIT WALL — tela Equipe irmã: compra, promoção de pilotos,
   academia compartilhada, política de pilotos e venda.
   ============================================================ */
'use strict';

NAV.splice(NAV.findIndex(n => n[0] === 'academy') + 1, 0, ['sister', 'Equipe irmã', 'M7 20V9l5-4 5 4v11M3 20V12l4-3m14 11v-8l-4-3M10 20v-5h4v5']);
MANAGER_ONLY.add('sister');

function sisDriverRow(d, extra = '') {
  const st = G.season.stats[d.id] || {};
  return `<tr><td>${headshot(d, 'sm')}</td><td>${dTag(d.id)}<div class="small muted">${d.age} anos · contrato até ${d.contract ? d.contract.until : G.season.year + Math.max(0, d.contractYears)}</div></td><td class="r num ${ratingClass(driverOverall(d))}"><b>${driverOverall(d)}</b></td><td class="r num">${G.season.standD[d.id] || 0}</td><td class="r num">${st.starts ? `${st.beatMate}/${st.starts}` : '—'}</td><td class="r">${extra}</td></tr>`;
}
function sisFamily(parent, child, mine) {
  const P = Career.team(G, parent), C = Career.team(G, child);
  const pos = (tid) => { const arr = Object.entries(G.season.standC).sort((a, b) => b[1] - a[1]).map(x => x[0]); return arr.indexOf(tid) + 1; };
  const race = (tid) => G.db.drivers.filter(d => d.team === tid && d.seat !== 'R').sort((a, b) => a.seat - b.seat);
  const iAmParent = mine === parent;
  const cand = Sisters.candidates(G, parent);
  const ac = (G.academies || []).find(a => a.team === parent);
  const members = ac ? ac.members.map(id => Career.driver(G, id)).filter(d => d && !d.retired) : [];
  const info = (G.sisterInfo || {})[child] || {};
  const table = (tid, btn) => `<div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Piloto</th><th class="r">Nota</th><th class="r">Pts</th><th class="r">Bateu o colega</th><th></th></tr></thead><tbody>${race(tid).map(d => sisDriverRow(d, btn ? btn(d) : '')).join('')}</tbody></table></div>`;
  return `<div class="grid g2">
      <div class="panel"><div class="panel-h"><h3>${tTag(parent)}</h3><span class="chip">Principal · ${pos(parent)}º</span></div><div class="panel-b tight">${table(parent)}</div></div>
      <div class="panel"><div class="panel-h"><h3>${tTag(child)}</h3><span class="chip acc">Irmã · ${pos(child)}º</span></div><div class="panel-b tight">${table(child, iAmParent && !G.weekend ? (d) => `<button class="btn sm" data-act="sisPromoteOpen" data-id="${d.id}" ${d.futureTeam ? 'disabled' : ''}>Promover</button>` : null)}</div></div>
    </div>
    <div class="grid g3" style="margin-top:14px">
      <div class="panel"><div class="panel-b stack"><span class="label">Parceria técnica</span><span class="small">A ${esc(C.name)} usa peças da ${esc(P.name)} (suspensão, câmbio e partes do chassi) e se aproxima dela a cada temporada.</span><dl class="kv"><dt>Chassi</dt><dd>${esc(P.short)} ${P.car.chassis.toFixed(1)} · ${esc(C.short)} ${C.car.chassis.toFixed(1)}</dd><dt>Aerodinâmica</dt><dd>${esc(P.short)} ${P.car.aero.toFixed(1)} · ${esc(C.short)} ${C.car.aero.toFixed(1)}</dd></dl></div></div>
      <div class="panel"><div class="panel-b stack"><span class="label">Política de pilotos da irmã</span>${iAmParent ? `<div class="seg"><button class="${info.policy !== 'results' ? 'on' : ''}" data-act="sisPolicy" data-v="youth">Formar jovens</button><button class="${info.policy === 'results' ? 'on' : ''}" data-act="sisPolicy" data-v="results">Buscar resultados</button></div>` : `<b>${info.policy === 'results' ? 'Buscar resultados' : 'Formar jovens'}</b>`}<span class="small muted">Formar jovens: quando abrir vaga na irmã, a preferência é dos pilotos da academia. Buscar resultados: pilotos experientes têm mais chance.</span></div></div>
      <div class="panel"><div class="panel-b stack"><span class="label">${iAmParent ? 'Próxima decisão' : 'Risco de promoção'}</span>${cand ? `<span class="small">Melhor da irmã: <b>${esc(cand.up.name)}</b>. Pior da principal: <b>${esc(cand.down.name)}</b>. Diferença de rendimento: <b class="${cand.gap > 0 ? 'pos' : 'neg'}">${cand.gap > 0 ? '+' : ''}${cand.gap.toFixed(1)}</b>.</span>` : '<span class="small muted">Sem candidatos agora.</span>'}<span class="small muted">${iAmParent ? 'Você pode trocar os pilotos entre as equipes a qualquer momento entre um GP e outro, inclusive no meio da temporada.' : `A ${esc(P.name)} pode levar pilotos da academia dela que correm pela ${esc(C.name)}, e mandar o rebaixado para cá.`}</span></div></div>
    </div>
    <div class="panel" style="margin-top:14px"><div class="panel-h"><h3>Academia compartilhada: ${esc(ac ? ac.name : '')}</h3><span class="small muted">${members.length} pilotos</span></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Piloto</th><th class="r">Idade</th><th>Onde corre</th><th class="r">Nota</th><th class="r">Pot.</th></tr></thead><tbody>${members.sort((a, b) => driverOverall(b) - driverOverall(a)).map(d => `<tr><td>${headshot(d, 'sm')}</td><td>${dTag(d.id)}</td><td class="r num">${d.age}</td><td class="small">${d.team ? esc(Career.team(G, d.team).name) + (d.seat === 'R' ? ' (reserva)' : '') : d.cat && G.cats && G.cats.byId[d.cat] ? esc(G.cats.byId[d.cat].name || d.cat) : '<span class="muted">sem vaga</span>'}</td><td class="r num">${driverOverall(d)}</td><td class="r num">${potText(d)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Sem membros.</td></tr>'}</tbody></table></div></div>`;
}

SCREENS.sister = {
  html() {
    Sisters.ensure(G);
    const me = G.player.teamId;
    const parent = Sisters.parentOf(G, me), child = Sisters.childOf(G, me);
    const head = (sub) => `<div class="page-head"><div><div class="eyebrow">${esc(Career.team(G).name)}</div><h1>Equipe irmã</h1></div>${sub || ''}</div>`;
    if (parent) return head() + `<p class="small muted" style="margin:-4px 0 14px">A sua equipe pertence à família ${esc(Career.team(G, parent).name)}. As duas compartilham a academia, você recebe peças da principal, e ela pode promover os seus pilotos que são da academia dela.</p>` + sisFamily(parent, me, me);
    if (child) {
      const info = G.sisterInfo[child] || {};
      const value = Math.round(Sisters.price(G, child) * 0.85);
      return head(info.real ? '' : `<button class="btn danger" data-act="sisSell">Vender a ${esc(Career.team(G, child).name)} (${fmtMoney(value)})</button>`) + `<p class="small muted" style="margin:-4px 0 14px">${info.real ? 'Relação histórica da equipe.' : `Comprada em ${info.since} por ${fmtMoney(info.price || 0)}.`} A equipe irmã é administrada pelo próprio pessoal dela; você decide quem sobe e quem desce entre as duas e a política de pilotos.</p>` + sisFamily(me, child, me);
    }
    const why = Sisters.canBuy(G);
    const prev = (G.history || []).slice(-1)[0];
    const rows = G.db.teams.filter(t => t.id !== me).map(t => ({ t, price: Sisters.price(G, t.id), block: Sisters.blocker(G, t.id), rank: prev ? prev.standC.findIndex(x => x.tid === t.id) + 1 : null }));
    return head() + `<p class="small muted" style="max-width:980px;margin:-4px 0 14px">Compre uma equipe satélite (no máximo uma), como a Red Bull fez com a Toro Rosso. As duas compartilham a academia, a irmã usa peças da sua equipe e vota com você no Conselho da FIA, e você pode promover pilotos dela para a sua equipe (e rebaixar os seus) a qualquer momento entre os GPs. O preço vai de 40% a 70% do orçamento anual da equipe, conforme o prestígio e o último campeonato, e sai do caixa (fora do teto orçamentário).</p>
      ${why ? `<div class="panel"><div class="empty">${esc(why)}</div></div>` : ''}
      <div class="panel" style="margin-top:14px"><div class="panel-h"><h3>Equipes</h3><span class="small muted">Caixa: ${fmtMoney(G.finances.balance)}</span></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Equipe</th><th class="r">Último campeonato</th><th class="r">Orçamento</th><th class="r">Reputação</th><th class="r">Preço</th><th>Situação</th><th></th></tr></thead><tbody>
        ${rows.map(x => `<tr><td>${tTag(x.t.id)}</td><td class="r num">${x.rank ? x.rank + 'º' : '—'}</td><td class="r num">${fmtMoney(x.t.budget)}</td><td class="r num">${x.t.reputation}</td><td class="r num">${x.block ? '—' : fmtMoney(x.price)}</td><td class="small ${x.block ? 'muted' : 'pos'}">${x.block ? esc(x.block) : G.finances.balance < x.price ? '<span class="neg">Caixa insuficiente</span>' : 'À venda'}</td><td>${!x.block && !why ? `<button class="btn sm primary" data-act="sisBuyOpen" data-id="${x.t.id}" ${G.finances.balance < x.price ? 'disabled' : ''}>Comprar</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div></div>`;
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
