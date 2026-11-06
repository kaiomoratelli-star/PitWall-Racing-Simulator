/* ============================================================
   PIT WALL — telas de pessoas: pilotos e funcionários da equipe,
   mercado com negociação (proposta, contraproposta, pré-contrato),
   academia de pilotos e notícias do mercado.
   ============================================================ */
'use strict';

function persBars(d) {
  const P = d.personality || {};
  return `<div class="stack" style="gap:6px">${[['ambition', 'Ambição'], ['loyalty', 'Lealdade'], ['temper', 'Temperamento'], ['media', 'Exposição na mídia']].map(([k, l]) => attrRow(l, P[k] ?? 50, 'b')).join('')}</div>`;
}
function slChip(d) {
  if (!G) return '';
  const ok = Market.slEligible(G, d);
  return `<span class="chip ${ok ? 'good' : 'bad'}" title="Superlicença da FIA">${ok ? 'Superlicença' : `SL ${Market.slPoints(G, d)}/40`}</span>`;
}

/* ================= EQUIPE: PILOTOS E FUNCIONÁRIOS ================= */
SCREENS.team = {
  html() {
    const team = Career.team(G);
    const ds = Career.teamDrivers(G, team.id).sort((a, b) => (a.seat === 'R' ? 9 : a.seat) - (b.seat === 'R' ? 9 : b.seat));
    const incoming = G.db.drivers.filter(d => d.futureTeam && d.futureTeam.team === team.id);
    const tab = UI.params.tab || 'drivers';
    let body = '';
    if (tab === 'drivers') body = `<div class="grid g2">${ds.map(driverCardV1).join('')}</div>
      ${incoming.length ? `<div class="panel"><div class="panel-h"><h3>Chegam em ${G.season.year + 1}</h3></div><div class="panel-b tight"><table class="tbl">${incoming.map(d => `<tr><td>${headshot(d, 'sm')}</td><td>${dTag(d.id)}</td><td>${d.futureTeam.role === 'R' ? 'Reserva' : 'Carro #' + d.futureTeam.role}</td><td class="r num">${fmtMoney(d.futureTeam.salary)}/ano</td><td class="r">até ${G.season.year + d.futureTeam.years}</td></tr>`).join('')}</table></div></div>` : ''}`;
    else if (tab === 'staff') body = staffHtml(team);
    else body = sponsorsHtml(team);
    return `<div class="page-head"><div><div class="eyebrow">${esc(team.name)}${team.chassisName ? ' · ' + esc(team.chassisName) : ''}</div><h1>Equipe</h1></div><div class="row"><button class="btn" data-act="go" data-v="market">Mercado</button><button class="btn" data-act="go" data-v="academy">Academia</button></div></div>
    <div class="panel"><div class="tabs">${[['drivers', 'Pilotos'], ['staff', 'Funcionários'], ['sponsors', 'Patrocinadores']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="go" data-v="team" data-p='{"tab":"${k}"}'>${l}</button>`).join('')}</div></div>
    ${body}`;
  },
};
function driverCardV1(d) {
  const st = G.season.stats[d.id] || {};
  const ovr = driverOverall(d);
  const ac = Market.academyOf(G, d);
  const c = d.contract || {};
  return `<div class="panel"><div class="panel-h"><div class="row" style="gap:12px">${headshot(d)}<span class="stat-big" style="font-size:30px;color:${teamColor(d.team)}">${d.number}</span><div><h3 class="lnk" data-act="driverPage" data-id="${d.id}">${esc(d.name)}</h3><div class="small muted">${natTag(d.nat)} ${d.age} anos · ${esc(STYLE_LABELS[d.style] || '')}${d.injured ? ' · <span class="neg">lesionado</span>' : ''}${d.retiring ? ' · <span class="acc">aposenta-se no fim do ano</span>' : ''}</div></div></div>
    <div class="row"><span class="chip">${d.seat === 'R' ? 'Reserva' : 'Carro #' + d.seat}</span><span class="chip acc">Nota ${ovr}</span>${slChip(d)}</div></div>
    <div class="panel-b grid g2">
      <div class="stack" style="gap:7px">${DRIVER_ATTRS.slice(0, 13).map(([k, l]) => attrRow(l, d[k] ?? 0)).join('')}</div>
      <div class="stack" style="gap:7px">
        ${attrRow('Experiência', d.experience, 'b')}${attrRow('Potencial', d.potential, 'g')}${attrRow('Moral', d.morale, d.morale < 40 ? 'r' : 'g')}${attrRow('Popularidade', d.popularity, 'b')}
        <dl class="kv" style="margin-top:6px"><dt>Contrato</dt><dd style="white-space:normal">${esc(Market.contractText(G, d))}</dd><dt>Salário</dt><dd>${fmtMoney(d.salary)}/ano</dd><dt>Pede no mercado</dt><dd>${fmtMoney(Market.ask(d))}/ano</dd>${d.manager ? `<dt>Empresário</dt><dd style="white-space:normal">${esc(d.manager)}</dd>` : ''}${ac ? `<dt>Academia</dt><dd>${esc(ac.name)}</dd>` : ''}<dt>Temporada</dt><dd>${G.season.standD[d.id] || 0} pts · ${st.wins || 0}V · ${st.podiums || 0}P</dd></dl>
        ${c.note ? `<p class="small muted">${esc(c.note)}</p>` : ''}
        <div class="row" style="margin-top:4px">
          <select class="inp" style="width:auto" data-chg="setSeat" data-id="${d.id}" aria-label="Assento">${opt(1, 'Carro #1', d.seat)}${opt(2, 'Carro #2', d.seat)}${opt('R', 'Reserva', d.seat)}</select>
          <button class="btn sm" data-act="negotiate" data-id="${d.id}" data-renew="1">Renovar</button>
          <button class="btn sm danger" data-act="releaseDlg" data-id="${d.id}">Dispensar</button>
        </div>
      </div>
    </div></div>`;
}
function staffHtml(team) {
  const L = (team.staffList || []).slice().sort((a, b) => Object.keys(Staff.ROLES).indexOf(a.role) - Object.keys(Staff.ROLES).indexOf(b.role));
  const roleSel = UI.params.role || 'technical';
  const rivals = G.db.teams.filter(t => t.id !== team.id).map(t => ({ t, s: Staff.get(t, roleSel) })).filter(x => x.s).sort((a, b) => b.s.rating - a.s.rating).slice(0, 6);
  return `<div class="grid g2">
    <div class="panel"><div class="panel-h"><h3>Quadro de funcionários</h3><span class="small muted">Folha: ${fmtMoney(Staff.payroll(team))}/ano</span></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Cargo</th><th>Nome</th><th class="r">Nível</th><th class="r">Salário</th><th class="r">Até</th><th></th></tr></thead><tbody>
      ${L.map(s => `<tr><td class="small">${esc(Staff.ROLES[s.role].name)}</td><td>${esc(s.name)} ${s.real ? '<span class="realtag">Real</span>' : ''}${s.interim ? ' <span class="chip">interino</span>' : ''}</td><td class="r num ${ratingClass(s.rating)}">${s.rating}</td><td class="r num">${s.isPlayer ? '—' : fmtMoney(s.salary)}</td><td class="r num">${s.isPlayer ? '—' : s.until}</td><td>${s.isPlayer ? '<span class="chip acc">você</span>' : `<button class="btn sm danger" data-act="staffFire" data-id="${s.id}">Demitir</button>`}</td></tr>`).join('')}
      ${(team.pendingStaff || []).map(s => `<tr><td class="small">${esc(Staff.ROLES[s.role].name)}</td><td>${esc(s.name)} <span class="chip">chega na etapa ${s.pending.r + 1}</span></td><td class="r num">${s.rating}</td><td class="r num">${fmtMoney(s.salary)}</td><td class="r num">${s.until}</td><td></td></tr>`).join('')}
    </tbody></table></div>
    <div class="panel-b small muted">Cada cargo afeta o jogo: técnico e engenharia no P&D e no acerto, estratégia nas paradas e na previsão do tempo, chefe de mecânicos no pit stop, operações na logística, comercial nos patrocínios, motores na confiabilidade (equipes de fábrica).</div></div>
    <div class="stack">
      <div class="panel"><div class="panel-h"><h3>Profissionais livres</h3><span class="small muted">Renovado a cada temporada</span></div><div class="panel-b tight tbl-wrap" style="max-height:360px;overflow:auto"><table class="tbl"><thead><tr><th>Cargo</th><th>Nome</th><th class="r">Nível</th><th class="r">Atual</th><th class="r">Salário</th><th></th></tr></thead><tbody>
        ${(G.staffMarket || []).map(s => { const cur = Staff.get(team, s.role); return `<tr><td class="small">${esc(Staff.ROLES[s.role].name)}</td><td>${esc(s.name)}</td><td class="r num ${ratingClass(s.rating)}">${s.rating}</td><td class="r num muted">${cur ? cur.rating : '—'}</td><td class="r num">${fmtMoney(s.salary)}</td><td><button class="btn sm" data-act="staffHire" data-id="${s.id}">Contratar</button></td></tr>`; }).join('')}
      </tbody></table></div></div>
      <div class="panel"><div class="panel-h"><h3>Tirar de outra equipe</h3><select class="inp" style="width:auto" data-chg="staffRole" aria-label="Cargo">${Object.entries(Staff.ROLES).filter(([k]) => k !== 'principal').map(([k, r]) => opt(k, r.name, roleSel)).join('')}</select></div><div class="panel-b tight"><table class="tbl">
        ${rivals.map(({ t, s }) => `<tr><td>${tTag(t.id)}</td><td>${esc(s.name)} ${s.real ? '<span class="realtag">Real</span>' : ''}</td><td class="r num ${ratingClass(s.rating)}">${s.rating}</td><td class="r small muted">chance ${Math.round(Staff.poachChance(G, s, t.id) * 100)}%</td><td><button class="btn sm" data-act="staffPoach" data-team="${t.id}" data-id="${s.id}">Propor (${fmtMoney(s.salary * 1.4)}/ano)</button></td></tr>`).join('')}
      </table><p class="small muted" style="padding:10px 14px">Quem sai de uma rival cumpre 6 etapas de afastamento antes de começar.</p></div></div>
    </div></div>`;
}
function sponsorsHtml(team) {
  return `<div class="panel"><div class="panel-h"><h3>Patrocinadores</h3><span class="small muted">${fmtMoney(sum(G.sponsors.map(s => s.perRace)) * Staff.commercialMul(team))} por GP com o diretor comercial</span></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Marca</th><th class="r">Por GP</th><th>Objetivo</th><th class="r">Bônus</th><th class="r">Temporadas</th><th>Satisfação</th></tr></thead><tbody>
    ${G.sponsors.map(s => `<tr><td><b>${esc(s.name)}</b></td><td class="r num">${fmtMoney(s.perRace)}</td><td class="small">${Career.SPONSOR_OBJ[s.objective]}</td><td class="r num">${fmtMoney(s.bonus)}</td><td class="r num">${s.seasons}</td><td style="min-width:120px">${pctBar(s.satisfaction)}</td></tr>`).join('')}
  </tbody></table></div><div class="panel-b small muted">Parceiros reais da equipe: ${(team.sponsors || []).map(esc).join(', ') || '—'}</div></div>`;
}
CHG.staffRole = (el) => go('team', { tab: 'staff', role: el.value });
ACT.staffFire = (el) => { const e = Staff.fire(G, G.player.teamId, el.dataset.id, 'decisão do chefe de equipe'); if (e) toast(e, 'bad'); else { toast('Demitido. Um interino assume.'); autosave(); } render(); };
ACT.staffHire = (el) => {
  const c = (G.staffMarket || []).find(x => x.id === el.dataset.id); if (!c) return;
  if (G.finances.balance < c.fee) return toast('Caixa insuficiente para a contratação.', 'bad');
  Career.ledger(G, `Contratação: ${c.name} (${Staff.ROLES[c.role].name})`, -c.fee, 'staff');
  Staff.hire(G, G.player.teamId, c); autosave(); toast(`${c.name} contratado.`, 'good'); render();
};
ACT.staffPoach = (el) => {
  const t = Career.team(G, el.dataset.team); const s = t.staffList.find(x => x.id === el.dataset.id); if (!s) return;
  const M = Market.state(G); M.staffTried = M.staffTried || {};
  const k = `${G.season.year}:${G.season.round}:${s.id}`;
  if (M.staffTried[k]) return toast(`${s.name} já respondeu nesta etapa.`, 'bad');
  M.staffTried[k] = true;
  if (!RNG.chance(Staff.poachChance(G, s, t.id))) { toast(`${s.name} preferiu ficar na ${t.name}.`, 'bad'); Career.record(G, 'staff', `${s.name} recusou proposta da ${Career.team(G).name} e ficou na ${t.name}.`, { teams: [t.id, G.player.teamId] }); return render(); }
  Staff.hire(G, G.player.teamId, { ...s, salary: +(s.salary * 1.4).toFixed(2) }, t.id); autosave(); toast(`${s.name} aceitou. Começa após o afastamento.`, 'good'); render();
};

/* ================= MERCADO ================= */
SCREENS.market = {
  html() {
    const f = UI.params.f || 'all', sort = UI.params.s || 'ovr';
    let ds = G.db.drivers.filter(d => !d.retired && d.team !== G.player.teamId);
    if (f === 'free') ds = ds.filter(d => !d.team);
    if (f === 'young') ds = ds.filter(d => d.age <= 23);
    if (f === 'expiring') ds = ds.filter(d => d.team && d.contractYears <= 0);
    if (f === 'sl') ds = ds.filter(d => Market.slEligible(G, d));
    if (f === 'academy') ds = ds.filter(d => Market.academyOf(G, d));
    const key = { ovr: d => -driverOverall(d), pot: d => -d.potential, age: d => d.age, val: d => -Market.value(d), until: d => d.team ? d.contractYears : -9 }[sort];
    ds.sort((a, b) => key(a) - key(b));
    const P = (o) => JSON.stringify({ f, s: sort, ...o });
    const M = Market.state(G);
    const talks = M.talks.filter(x => x.status === 'talks').slice(-8).reverse();
    const signed = G.db.drivers.filter(d => d.futureTeam).slice(0, 12);
    const p = G.season.round / G.season.calendar.length;
    return `<div class="page-head"><div><div class="eyebrow">Transferências · ${p < 0.28 ? 'mercado calmo' : p < 0.7 ? 'silly season em andamento' : 'reta final do mercado'}</div><h1>Mercado de pilotos</h1></div></div>
    <div class="grid g2">
      <div class="panel"><div class="panel-h"><h3>Negociações no paddock</h3><span class="small muted">Rumores e conversas em andamento</span></div><div class="panel-b stack" style="gap:6px">${talks.length ? talks.map(x => `<div class="small">${tTag(x.team)} conversa com <b class="lnk" data-act="driverPage" data-id="${x.driver}">${esc(Career.driver(G, x.driver).name)}</b> para o carro #${x.offer.role}</div>`).join('') : '<p class="muted small">Nada em andamento.</p>'}</div></div>
      <div class="panel"><div class="panel-h"><h3>Já assinados para ${G.season.year + 1}</h3></div><div class="panel-b stack" style="gap:6px">${signed.length ? signed.map(d => `<div class="small"><b class="lnk" data-act="driverPage" data-id="${d.id}">${esc(d.name)}</b> → ${tTag(d.futureTeam.team)} até ${G.season.year + d.futureTeam.years}</div>`).join('') : '<p class="muted small">Nenhum pré-contrato anunciado.</p>'}</div></div>
    </div>
    <div class="row"><div class="seg">${[['all', 'Todos'], ['free', 'Sem equipe'], ['expiring', 'Contrato acabando'], ['young', 'Até 23 anos'], ['sl', 'Com superlicença'], ['academy', 'De academias']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="go" data-v="market" data-p='${P({ f: k })}'>${l}</button>`).join('')}</div>
      <span class="spacer"></span><div class="seg">${[['ovr', 'Nota'], ['pot', 'Potencial'], ['age', 'Idade'], ['val', 'Valor'], ['until', 'Contrato']].map(([k, l]) => `<button class="${sort === k ? 'on' : ''}" data-act="go" data-v="market" data-p='${P({ s: k })}'>${l}</button>`).join('')}</div></div>
    <div class="panel"><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Piloto</th><th class="r">Idade</th><th>Equipe</th><th>Contrato</th><th class="r">Nota</th><th class="r">Pot.</th><th>SL</th><th class="r">Pede/ano</th><th></th></tr></thead><tbody>
      ${ds.slice(0, 120).map(d => { const ac = Market.academyOf(G, d); return `<tr><td>${headshot(d, 'sm')}</td><td>${dTag(d.id)}<div class="small muted">${natTag(d.nat)} ${esc(STYLE_LABELS[d.style] || '')}${ac ? ' · ' + esc(ac.name) : ''}${d.regen ? ' · piloto gerado' : ''}</div></td><td class="r num">${d.age}</td><td class="small">${d.team ? esc(Career.team(G, d.team).name) + (d.seat === 'R' ? ' (res.)' : '') : '<span class="muted">Livre</span>'}${d.futureTeam ? `<div class="small acc">→ ${esc(Career.team(G, d.futureTeam.team).short)} ${G.season.year + 1}</div>` : ''}</td><td class="small">${d.team ? esc(Market.contractText(G, d)) : '—'}</td><td class="r num ${ratingClass(driverOverall(d))}"><b>${driverOverall(d)}</b></td><td class="r num">${d.potential}</td><td>${slChip(d)}</td><td class="r num">${fmtMoney(Market.ask(d))}</td><td><button class="btn sm" data-act="negotiate" data-id="${d.id}" ${d.futureTeam ? 'disabled' : ''}>Negociar</button></td></tr>`; }).join('')}
    </tbody></table></div></div>`;
  },
};

/* modal de negociação com contraproposta */
ACT.negotiate = (el) => {
  const d = Career.driver(G, el.dataset.id); const renew = el.dataset.renew === '1';
  const ask = Market.ask(d);
  UI.neg = { did: d.id, renew, salary: +Math.max(renew ? d.salary : 0.5, ask).toFixed(1), years: renew ? 2 : (d.age >= 32 ? 1 : 2), role: renew ? d.seat : 2, log: [] };
  negModal();
};
function negModal() {
  const n = UI.neg; const d = Career.driver(G, n.did); const team = Career.team(G);
  const under = d.team && d.team !== team.id && d.contractYears > 0;
  const buyout = under ? +(d.salary * d.contractYears * 0.8 + 1).toFixed(1) : 0;
  const acc = Market.driverAccepts(G, d, team, { salary: n.salary, years: n.years, role: n.role });
  modal(`${n.renew ? 'Renovação' : 'Negociação'} — ${d.name}`, `
    <div class="row">${headshot(d)}<div><div>${natTag(d.nat)} ${d.age} anos · nota <b>${driverOverall(d)}</b> · potencial ${d.potential} ${slChip(d)}</div><div class="small muted">${d.team ? esc(Market.contractText(G, d)) : 'Sem contrato'} · pede cerca de ${fmtMoney(Market.ask(d))}/ano${d.manager ? ` · empresário: ${esc(d.manager)}` : ''}</div></div></div>
    ${n.log.length ? `<div class="callout stack" style="gap:4px">${n.log.map(l => `<div class="small">${l}</div>`).join('')}</div>` : ''}
    <div class="grid g3">
      <label class="field"><span>Salário anual (US$ mi)</span><input class="inp num" id="ng-sal" type="number" step="0.1" min="0.3" value="${n.salary}" data-inp="negField" data-k="salary"></label>
      <label class="field"><span>Contrato até</span><select class="inp" id="ng-y" data-chg="negField" data-k="years">${[1, 2, 3, 4, 5].map(k => opt(k, String(G.season.year + k), n.years)).join('')}</select></label>
      <label class="field"><span>Função</span><select class="inp" id="ng-r" data-chg="negField" data-k="role">${opt(1, 'Carro #1', n.role)}${opt(2, 'Carro #2', n.role)}${opt('R', 'Reserva', n.role)}</select></label>
    </div>
    ${!n.renew && d.team ? `<label class="check"><input type="checkbox" id="ng-now" ${n.now ? 'checked' : ''} data-chg="negField" data-k="now"> ${under ? `Pagar multa de ${fmtMoney(buyout)} e trazer agora` : 'Trazer agora (contrato atual já termina)'}; senão, pré-contrato para ${G.season.year + 1}</label>` : ''}
    <div class="callout">Chance estimada de aceitar: <b>${Math.round((n.renew ? clamp(acc.p + 0.2, 0, 0.98) : acc.p) * 100)}%</b>. Ele considera competitividade da equipe, salário, papel, lealdade e ambição.</div>`,
    `<button class="btn" data-act="closeModal">Encerrar conversa</button><button class="btn primary" data-act="negSend">Enviar proposta</button>`);
}
CHG.negField = (el) => { const n = UI.neg; const k = el.dataset.k; n[k] = k === 'now' ? el.checked : k === 'role' ? (el.value === 'R' ? 'R' : +el.value) : Number(el.value); if (k !== 'salary') negModal(); };
ACT.negSend = () => {
  const n = UI.neg;
  const r = Market.playerOffer(G, n.did, { salary: n.salary, years: n.years, role: n.role, renew: n.renew }, n.now);
  const d = Career.driver(G, n.did);
  if (r.status === 'accept') {
    const msg = Market.playerSign(G, n.did, { salary: n.salary, years: n.years, role: n.role, renew: n.renew }, n.now);
    closeModal(); toast(msg, 'good'); autosave(); render(); return;
  }
  if (r.status === 'counter') {
    n.log.push(`Proposta: ${fmtMoney(n.salary)}/ano até ${G.season.year + n.years}. <b>${esc(d.name)} pede ${fmtMoney(r.counter.salary)}/ano até ${G.season.year + r.counter.years}${r.counter.role !== n.role ? ' e vaga de titular' : ''}.</b>`);
    n.salary = r.counter.salary; n.years = r.counter.years; n.role = r.counter.role;
    negModal(); return;
  }
  closeModal(); toast(r.msg || 'Proposta recusada.', 'bad'); autosave(); render();
};

/* ================= ACADEMIA ================= */
SCREENS.academy = {
  html() {
    const a = (G.academies || []).find(x => x.team === G.player.teamId);
    if (!a) return '<div class="empty">Sua equipe não tem academia.</div>';
    const members = a.members.map(id => Career.driver(G, id)).filter(Boolean);
    const elsewhere = (a.pending || []).filter(nm => !Market.findDriverByName(G, nm));
    const prospects = G.db.drivers.filter(d => !d.retired && d.age <= 21 && !Market.academyOf(G, d) && !d.team).sort((x, y) => y.potential - x.potential).slice(0, 12);
    return `<div class="page-head"><div><div class="eyebrow">Jovens pilotos</div><h1>${esc(a.name)}</h1></div><span class="chip ${a.active ? 'good' : 'bad'}">${a.active ? 'Ativa' : 'Inativa'}</span></div>
    <div class="grid g3">
      <div class="panel"><div class="panel-b stack"><span class="label">Investimento por temporada</span><span class="stat-big">${fmtMoney(a.budget)}</span><input type="range" min="0" max="20" step="1" value="${a.budget}" id="ac-budget" data-chg="acBudget" aria-label="Investimento"><span class="small muted">Mais investimento acelera a evolução dos membros. Cobrado ao fim de cada temporada.</span></div></div>
      <div class="panel"><div class="panel-b stack"><span class="label">Estrutura</span><span class="stat-big">${a.level}</span>${bar(a.level)}<span class="small muted">Nível da estrutura de formação (simulador, preparadores, engenheiros).</span></div></div>
      <div class="panel"><div class="panel-b stack"><span class="label">Membros no jogo</span><span class="stat-big">${members.length}</span><span class="small muted">${elsewhere.length} membro(s) reais correm em categorias que entram nas próximas etapas do jogo.</span></div></div>
    </div>
    <div class="panel"><div class="panel-h"><h3>Membros</h3></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Piloto</th><th class="r">Idade</th><th>Situação</th><th class="r">Nota</th><th class="r">Pot.</th><th>SL</th><th></th></tr></thead><tbody>
      ${members.map(d => `<tr><td>${headshot(d, 'sm')}</td><td>${dTag(d.id)}</td><td class="r num">${d.age}</td><td class="small">${d.team ? esc(Career.team(G, d.team).name) + (d.seat === 'R' ? ' (reserva)' : ` (carro #${d.seat})`) : 'Sem vaga'}</td><td class="r num">${driverOverall(d)}</td><td class="r num">${d.potential}</td><td>${slChip(d)}</td><td class="row" style="gap:4px;flex-wrap:nowrap">${!d.team ? `<button class="btn sm" data-act="acPromote" data-id="${d.id}">Fazer reserva</button>` : ''}<button class="btn sm danger" data-act="acRemove" data-id="${d.id}">Dispensar</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">Nenhum membro.</td></tr>'}
      ${elsewhere.map(nm => `<tr><td></td><td>${esc(nm)}</td><td></td><td class="small muted" colspan="5">Corre em outra categoria</td></tr>`).join('')}
    </tbody></table></div></div>
    <div class="panel"><div class="panel-h"><h3>Talentos sem academia</h3><span class="small muted">Até 21 anos, sem equipe</span></div><div class="panel-b tight tbl-wrap"><table class="tbl">${prospects.map(d => `<tr><td>${headshot(d, 'sm')}</td><td>${dTag(d.id)}${d.regen ? ' <span class="chip">piloto gerado</span>' : ''}</td><td class="r num">${d.age}</td><td class="r num">${driverOverall(d)}</td><td class="r num">pot. ${d.potential}</td><td><button class="btn sm" data-act="acAdd" data-id="${d.id}">Contratar para a academia</button></td></tr>`).join('') || '<tr><td class="empty">Nenhum talento livre agora.</td></tr>'}</table></div></div>
    <div class="panel"><div class="panel-h"><h3>Academias do paddock</h3></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Academia</th><th>Equipe</th><th class="r">Membros</th><th>Destaques</th></tr></thead><tbody>${(G.academies || []).filter(x => x.active).map(x => `<tr><td><b>${esc(x.name)}</b></td><td>${tTag(x.team)}</td><td class="r num">${x.members.length + (x.pending || []).filter(nm => !Market.findDriverByName(G, nm)).length}</td><td class="small">${x.members.slice(0, 4).map(id => esc((Career.driver(G, id) || {}).name || '')).join(', ')}</td></tr>`).join('')}</tbody></table></div></div>`;
  },
};
CHG.acBudget = (el) => { const a = G.academies.find(x => x.team === G.player.teamId); a.budget = Number(el.value); a.active = a.active || a.budget > 0; autosave(); render(); };
ACT.acAdd = (el) => { const e = Market.addToAcademy(G, el.dataset.id); if (e) toast(e, 'bad'); else { toast('Contratado para a academia.', 'good'); autosave(); } render(); };
ACT.acRemove = (el) => { Market.removeFromAcademy(G, el.dataset.id); autosave(); render(); };
ACT.acPromote = (el) => { const d = Career.driver(G, el.dataset.id); if (G.db.drivers.some(x => x.team === G.player.teamId && x.seat === 'R')) return toast('Você já tem um reserva. Dispense-o ou troque antes.', 'bad'); Career.placeDriver(G, d, G.player.teamId, 'R', Math.max(0.5, d.salary || 0.5), 1); autosave(); toast(`${d.name} agora é seu reserva.`, 'good'); render(); };
