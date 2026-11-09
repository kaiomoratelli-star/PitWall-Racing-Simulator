/* ============================================================
   PIT WALL — tela do Conselho da FIA: pauta, impacto por equipe,
   intenção de voto, negociação, proposta própria e histórico.
   ============================================================ */
'use strict';

NAV.splice(NAV.findIndex(n => n[0] === 'calendar') + 1, 0, ['council', 'Conselho da FIA', 'M3 21h18M5 21V11m4 10V11m6 10V11m4 10V11M2 11l10-7 10 7z']);

const VOTE_LBL = { sim: ['A favor', 'good'], nao: ['Contra', 'bad'], ind: ['Indeciso', ''], abst: ['Abstenção', ''] };
function cvChip(v) { const [l, c] = VOTE_LBL[v] || ['—', '']; return `<span class="chip ${c}">${l}</span>`; }
function cImpBar(x) {
  const w = Math.round(Math.abs(x) * 50);
  return `<span class="dbar" title="${Council.impWord(x)} (${x > 0 ? '+' : ''}${x.toFixed(2)})"><i class="${x >= 0 ? 'p' : 'n'}" style="${x >= 0 ? 'left:50%' : `left:${50 - w}%`};width:${w}%"></i></span>`;
}

function councilProp(pr, open) {
  const obs = Career.isObs(G);
  const mine = obs ? null : G.player.teamId;
  const T = open ? Council.tally(G, pr, false) : { votes: pr.votes, yes: pr.yes, no: pr.no, und: pr.abst, need: pr.need, fia: pr.fiaV, fom: pr.fomV };
  const pass = T.fia && T.fom && T.yes >= T.need;
  const teams = G.db.teams.slice().sort((a, b) => pr.imp[b.id] - pr.imp[a.id]);
  const res = pr.result ? `<span class="chip ${pr.result === 'aprovada' ? 'good' : 'bad'}">${pr.result === 'aprovada' ? 'Aprovada' : pr.result === 'vetada' ? 'Vetada pela Ferrari' : 'Rejeitada'}</span>` : `<span class="chip ${pass ? 'good' : 'bad'}">${pass ? 'Hoje passaria' : 'Hoje não passaria'}</span>`;
  const body = (k, who) => { const yes = open ? Council.bodyYes(pr, k) : (k === 'fia' ? pr.fiaV : pr.fomV); return `<div class="cp-v"><span class="cp-t"><b>${who}</b></span>${cvChip(yes ? 'sim' : 'nao')}${open && !obs ? (pr.acts[k] ? '<span class="small muted">negociado</span>' : `<button class="btn sm ghost" data-act="cNeg" data-id="${pr.id}" data-t="${k}">Negociar</button>`) : ''}</div>`; };
  const promised = !obs && open ? Council.ensure(G).promises.filter(pm => pm.made !== pr.id && (pr.proposer === pm.tid || pr.imp[pm.tid] >= 0.3)) : [];
  const myS = mine && open ? Council.stance(G, { ...pr, lobby: {} }, mine) : 0;
  return `<div class="panel cp"><div class="panel-h" style="align-items:flex-start;gap:14px"><div class="stack" style="gap:6px;min-width:0">
      <div class="row" style="gap:6px"><span class="chip">${Council.CATS[pr.cat]}</span><span class="chip ${pr.eff === 'now' ? 'acc' : ''}">${pr.eff === 'now' ? 'Vale já nesta temporada' : `Vale em ${pr.eff}`}</span><span class="small muted">Proposta de ${esc(Council.proposerName(G, pr.proposer))}</span></div>
      <h3 style="margin:0">${esc(pr.title)}</h3></div>
      <div class="cp-tally"><div class="num"><b class="pos">${T.yes}</b> a favor · <b class="neg">${T.no}</b> contra${T.und ? ` · ${T.und} ${open ? 'indecisos' : 'abstenções'}` : ''}</div><div class="small muted">precisa de ${T.need} de ${G.db.teams.length}, mais FIA e Fórmula 1</div>${res}</div></div>
    <div class="panel-b stack">
      ${pr.desc ? `<p class="small" style="margin:0">${esc(pr.desc)}</p>` : ''}
      <div class="grid g2" style="gap:18px">
        <div><div class="row between"><h4>Quem ganha e quem perde</h4><span class="small muted">Critério: ${esc(pr.basis || '')}</span></div>
          ${teams.map(t => `<div class="cp-row ${t.id === mine ? 'me' : ''}"><span class="cp-t">${tTag(t.id)}</span>${cImpBar(pr.imp[t.id])}<span class="small ${pr.imp[t.id] >= 0.15 ? 'pos' : pr.imp[t.id] <= -0.15 ? 'neg' : 'muted'}">${Council.impWord(pr.imp[t.id])}</span></div>`).join('')}</div>
        <div><h4>${open ? 'Intenção de voto' : 'Votação'}</h4>
          ${body('fia', 'FIA')}${body('fom', 'Fórmula 1')}
          ${teams.map(t => { const v = T.votes[t.id]; const isMe = t.id === mine; const act = pr.acts && pr.acts[t.id];
            return `<div class="cp-v ${isMe ? 'me' : ''}"><span class="cp-t">${tTag(t.id)}${(G.sisters || {})[t.id] ? '<span class="small muted"> · irmã</span>' : ''}</span>${isMe && open ? `<span class="chip acc">${pr.vote ? VOTE_LBL[pr.vote][0] : 'Seu voto'}</span>` : cvChip(v)}${open && !obs && !isMe ? (act ? `<span class="small muted">${{ talk: 'conversa feita', deal: 'acordo fechado', engine: 'pressionada', sister: 'ordem dada' }[act]}</span>` : `<button class="btn sm ghost" data-act="cNeg" data-id="${pr.id}" data-t="${t.id}">Negociar</button>`) : ''}</div>`; }).join('')}
        </div>
      </div>
      ${open && mine ? `<div class="cp-mine">
        <div class="row" style="gap:10px"><b>Voto da ${esc(Career.team(G, mine).name)}:</b><div class="seg">${['sim', 'nao', 'abst'].map(v => `<button class="${pr.vote === v ? 'on' : ''}" data-act="cVote" data-id="${pr.id}" data-v="${v}">${{ sim: 'A favor', nao: 'Contra', abst: 'Abster' }[v]}</button>`).join('')}</div>
        ${pr.offers && pr.offers[mine] ? `<p class="small" style="margin:6px 0 0;color:var(--yellow)">Oferta de concessão: ${esc(Council.proposerName(G, pr.offers[mine].by))} ${pr.offers[mine].money ? `paga ${fmtMoney(pr.offers[mine].money)}` : `cede ${pr.offers[mine].hours} horas de túnel de vento`} se você votar a favor e a proposta passar.</p>` : ''}
        <p class="small muted" style="margin:6px 0 0">${byLang('Recomendação do diretor técnico', 'Technical director\'s recommendation')}: ${myS > 0.1 ? byLang('votar <b class="pos">a favor</b>', 'vote <b class="pos">for</b>') : myS < -0.1 ? byLang('votar <b class="neg">contra</b>', 'vote <b class="neg">against</b>') : byLang('pouco muda para nós', 'little changes for us')} (${esc(((w) => (I18N.lang === 'en' ? (I18N.tx(w) ?? w) : w))(Council.impWord(pr.imp[mine])))} ${byLang('para a equipe', 'for the team')}). ${byLang('Sem voto escolhido, a equipe segue essa recomendação.', 'With no vote chosen, the team follows this recommendation.')}</p>
        ${promised.length ? `<p class="small" style="margin:6px 0 0;color:var(--yellow)">Acordo: você prometeu apoio à ${promised.map(pm => esc(Career.team(G, pm.tid).name)).join(' e à ')}. Votar contra quebra o acordo (−15 de capital e a relação piora).</p>` : ''}
      </div>` : ''}
    </div></div>`;
}

/* inscrições de equipes novas: análise da FIA e voto da Comissão no meio da temporada */
function councilEntries() {
  if (typeof Owners === 'undefined') return '';
  const S = Owners.state(G), C = Council.ensure(G);
  const apps = S.apps.filter(a => a.stage === 'fia');
  if (!apps.length) return '';
  const mine = Career.isObs(G) ? null : G.player.teamId;
  C.entryVote = C.entryVote || {};
  const mid = Math.ceil(G.season.calendar.length / 2);
  return `<div class="panel" style="margin-top:14px"><div class="panel-h"><h3>Pedidos de entrada no grid</h3><span class="small muted">Voto da Comissão depois da ${mid}ª etapa de ${apps[0].decide}</span></div><div class="panel-b stack">${apps.map(a => {
    const c = Owners.cand(a.cid); if (!c) return '';
    const v = C.entryVote[c.id];
    return `<div class="row between" style="gap:12px;flex-wrap:wrap"><div class="stack" style="gap:2px;max-width:70ch"><b>${esc(c.fullName)}</b><span class="small muted">${esc(c.owner.name)} · plano: ${Owners.GOAL[c.plan.goal][0]} em ${c.plan.years} anos · motor ${c.engine === 'propria' ? 'próprio' : 'de cliente'}. Uma equipe a mais divide a premiação entre 12.</span></div>
      ${mine ? `<div class="seg">${[['sim', 'A favor'], ['nao', 'Contra']].map(([k, l]) => `<button class="${v === k ? 'on' : ''}" data-act="cEntry" data-id="${c.id}" data-v="${k}">${l}</button>`).join('')}</div>` : ''}</div>`;
  }).join('')}</div></div>`;
}
ACT.cEntry = (el) => { const C = Council.ensure(G); C.entryVote = C.entryVote || {}; C.entryVote[el.dataset.id] = el.dataset.v; render(); };

SCREENS.council = {
  html() {
    const C = Council.ensure(G);
    const obs = Career.isObs(G);
    const n = G.db.teams.length;
    const nm = Council.nextMeeting(G);
    const nmTrack = nm != null ? Career.track(G, G.season.calendar[nm - 1]) : null;
    const sched = Object.entries(C.scheduled || {}).sort((a, b) => a[0] - b[0]);
    const hist = (C.history || []).flatMap(m => m.props.map(p => ({ ...p, my: m.year })));
    const intro = `Comissão de F1: FIA, Fórmula 1 e as ${n} equipes. Para aprovar: FIA, Fórmula 1 e ${Math.ceil(n * 0.6)} de ${n} equipes; mudança que vale já nesta temporada precisa de ${Math.ceil(n * 0.8)}. Nenhuma equipe tem poder de veto. Quem propõe pode oferecer concessões (dinheiro ou horas de túnel) em troca de votos. Equipes clientes tendem a seguir a fornecedora do motor, e equipes irmãs votam juntas.`;
    const stats = obs ? '' : `<div class="grid g3">
      <div class="panel"><div class="panel-b stack"><span class="label">Capital político</span><span class="stat-big">${Math.round(C.capital)}</span><div class="bar b"><i style="width:${C.capital}%"></i></div><span class="small muted">Cresce a cada reunião (mais para quem está no top 3). Gasto em negociações e propostas.</span></div></div>
      <div class="panel"><div class="panel-b stack"><span class="label">${C.open ? 'Votação aberta' : 'Próxima reunião'}</span><span class="stat-big" style="font-size:24px">${C.open ? `Até o ${esc(C.open.gp)}` : nmTrack ? `Depois do ${esc(nmTrack.gp)}` : 'Próxima temporada'}</span><span class="small muted">${C.open ? 'A votação fecha quando o próximo fim de semana começar.' : 'Três reuniões por temporada.'}</span></div></div>
      <div class="panel"><div class="panel-b stack"><span class="label">Sua proposta</span>${C.queued ? `<b>${esc(C.queued.title)}</b><span class="small muted">Entra na pauta da próxima reunião.</span>` : `<span class="small muted">Leve uma mudança de regra para a próxima reunião (${Council.COST.propose} de capital).</span><button class="btn sm" data-act="cProposeOpen">Propor mudança</button>`}
        ${C.promises.length ? `<span class="small" style="color:var(--yellow)">Acordos pendentes: ${C.promises.map(pm => esc(Career.team(G, pm.tid).name)).join(', ')}</span>` : ''}</div></div>
    </div>`;
    return `<div class="page-head"><div><div class="eyebrow">Temporada ${G.season.year}</div><h1>Conselho da FIA</h1></div></div>
      <p class="small muted" style="max-width:980px;margin:-4px 0 14px">${intro}</p>
      ${stats}
      ${councilEntries()}
      ${C.open ? `<div class="stack" style="margin-top:14px">${C.open.props.map(p => councilProp(p, true)).join('')}</div>` : `<div class="panel" style="margin-top:14px"><div class="empty">Nenhuma votação aberta agora.${nmTrack ? ` A próxima reunião acontece depois do ${esc(nmTrack.gp)}.` : ''}</div></div>`}
      ${sched.length ? `<div class="panel" style="margin-top:14px"><div class="panel-h"><h3>Aprovadas, à espera de entrar em vigor</h3></div><div class="panel-b stack">${sched.map(([y, list]) => `<div><b>${y}</b>${list.map(x => `<div class="small">• ${esc(x.title)}</div>`).join('')}</div>`).join('')}</div></div>` : ''}
      <div class="panel" style="margin-top:14px"><div class="panel-h"><h3>Histórico de votações</h3></div>${hist.length ? `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ano</th><th>Proposta</th><th>Tema</th><th>Proposta de</th><th class="r">Votos</th><th>Resultado</th>${obs ? '' : '<th>Seu voto</th>'}</tr></thead><tbody>${hist.slice(0, 60).map(p => `<tr><td class="num">${p.my}</td><td>${esc(p.title)}</td><td class="small muted">${Council.CATS[p.cat]}</td><td class="small">${esc(Council.proposerName(G, p.proposer))}</td><td class="r num">${p.yes}×${p.no}</td><td><span class="chip ${p.result === 'aprovada' ? 'good' : 'bad'}">${p.result}</span></td>${obs ? '' : `<td>${cvChip(p.votes[G.player.teamId])}</td>`}</tr>`).join('')}</tbody></table></div>` : '<div class="empty">Nenhuma votação ainda nesta carreira.</div>'}</div>`;
  },
};

ACT.cVote = (el) => { Council.setVote(G, el.dataset.id, el.dataset.v); render(); };
ACT.cNeg = (el) => {
  const pr = Council.find(G, el.dataset.id); if (!pr) return;
  const tid = el.dataset.t;
  if (!pr.vote || pr.vote === 'abst') return toast('Escolha primeiro o voto da sua equipe (a favor ou contra): a negociação puxa os outros para o mesmo lado.', 'bad');
  const C = Council.ensure(G);
  const name = Council.proposerName(G, tid);
  const want = pr.vote === 'nao' ? 'contra' : 'a favor';
  const T = Council.tally(G, pr, false);
  const rel = tid === 'fia' || tid === 'fom' ? null : (C.rel[tid] || 0);
  modal(`Negociar com ${name}`, `<p class="small">Proposta: <b>${esc(pr.title)}</b></p>
    <p class="small">Você quer o voto <b>${want}</b>. ${tid === 'fia' || tid === 'fom' ? `Posição atual: ${Council.bodyYes(pr, tid) ? 'a favor' : 'contra'}.` : `Intenção atual: ${(VOTE_LBL[T.votes[tid]] || ['—'])[0].toLowerCase()} · para eles a mudança ${Council.impWord(pr.imp[tid])}.`}${rel != null ? ` Relação com a sua equipe: ${rel > 0.25 ? 'boa' : rel < -0.25 ? 'ruim' : 'neutra'}.` : ''}</p>
    <div class="stack">${Council.lobbyOptions(G, pr, tid).map(o => `<button class="btn opt" data-act="cLobby" data-id="${pr.id}" data-t="${tid}" data-k="${o.k}" ${C.capital < o.cost ? 'disabled' : ''}><span>${esc(o.label)}</span><span class="small muted">${o.effect} · ${o.cost} de capital</span></button>`).join('')}</div>
    <p class="small muted">Capital político disponível: ${Math.round(C.capital)}.</p>`);
};
ACT.cLobby = (el) => {
  const err = Council.lobby(G, el.dataset.id, el.dataset.t, el.dataset.k);
  closeModal();
  if (err) return toast(err, 'bad');
  toast(`Negociação feita com ${Council.proposerName(G, el.dataset.t)}.`, 'good');
  render();
};
ACT.cProposeOpen = () => {
  const list = Council.available(G);
  const C = Council.ensure(G);
  modal('Propor mudança na próxima reunião', `<p class="small muted">Sua equipe apresenta a proposta e vota a favor. As outras votam pelo próprio interesse; a relação com a sua equipe pesa. Custo: ${Council.COST.propose} de capital (você tem ${Math.round(C.capital)}).</p>
    <div class="stack" style="max-height:60vh;overflow:auto">${Object.keys(Council.CATS).map(cat => { const xs = list.filter(x => x.cat === cat); return xs.length ? `<h4>${Council.CATS[cat]}</h4>${xs.map(x => `<button class="btn opt" data-act="cPropose" data-k="${x.k}" ${C.capital < Council.COST.propose ? 'disabled' : ''}><span>${esc(x.title)}</span><span class="small ${x.myImp >= 0.15 ? 'pos' : x.myImp <= -0.15 ? 'neg' : 'muted'}">para você: ${Council.impWord(x.myImp)}</span></button>`).join('')}` : ''; }).join('')}</div>`);
};
ACT.cPropose = (el) => {
  const err = Council.propose(G, el.dataset.k);
  closeModal();
  if (err) return toast(err, 'bad');
  toast('Proposta incluída na pauta da próxima reunião.', 'good');
  render();
};
