/* ============================================================
   PIT WALL — telas de donos, mercado de equipes e candidatas (V0.8.4)
   ============================================================ */
'use strict';

const OWN_TYPE = { montadora: ['Montadora', 'Manufacturer'], empresa: ['Empresa', 'Company'], fundo: ['Fundo de investimento', 'Investment fund'], independente: ['Independente', 'Independent'], grupo: ['Grupo de investidores', 'Investor group'], equipe: ['Equipe de corrida', 'Racing team'] };
const CAND_STATUS = { inscrita: ['Inscrita na FIA', 'Applied to the FIA'], aprovada: ['Aprovada, estreia no próximo ano', 'Approved, debuts next year'], recusada: ['Recusada', 'Rejected'], entrou: ['No grid', 'On the grid'], comprou: ['Comprou uma equipe', 'Bought a team'] };
function ownMood(v) { return v >= 70 ? [byLang('satisfeitos', 'satisfied'), 'pos'] : v >= 45 ? [byLang('neutros', 'neutral'), ''] : v >= 25 ? [byLang('insatisfeitos', 'unhappy'), 'neg'] : [byLang('em crise', 'in crisis'), 'neg']; }
function ownSale(G, t) {
  if (t.forSale) return `<span class="chip acc">${byLang('À venda', 'For sale')}</span>`;
  const p = Owners.protection(G, t);
  if (p === 'nunca') return `<span class="chip">${byLang('Não está à venda', 'Not for sale')}</span>`;
  if (p === 'protegida20') return `<span class="chip">${byLang('Protegida até ' + (Owners.start(G) + 20), 'Protected until ' + (Owners.start(G) + 20))}</span>`;
  return '';
}

SCREENS.owners = {
  html() {
    Owners.ensure(G);
    const S = Owners.state(G);
    const ts = G.db.teams.slice().sort((a, b) => Owners.value(G, b) - Owners.value(G, a));
    const rows = ts.map(t => {
      const m = ownMood(t.ownerMood);
      return `<tr><td><span class="row" style="gap:8px;flex-wrap:nowrap">${teamLogo(t, 'sm')}<button class="linkbtn" data-act="teamPage" data-id="${t.id}">${esc(t.name)}</button></span></td>
        <td>${esc(t.owner.name)}<div class="small muted">${esc(byLang(...(OWN_TYPE[t.owner.type] || OWN_TYPE.independente)))}${t.owner.since ? ` · ${byLang('desde', 'since')} ${t.owner.since}` : ''}</div></td>
        <td class="r num">${fmtMoney(Owners.value(G, t))}</td><td class="r num">${t.debt > 0 ? fmtMoney(t.debt) : '—'}</td>
        <td><span class="${m[1]}">${m[0]}</span></td><td>${ownSale(G, t)}</td></tr>`;
    }).join('');
    const cands = Owners.cands().map(c => {
      const st = S.cand[c.id];
      const lbl = st ? byLang(...(CAND_STATUS[st.status] || ['—', '—'])) + (st.y ? ` (${st.y})` : '') : (G.season.year >= c.from - 1 ? byLang('Avaliando', 'Considering') : byLang('A partir de ', 'From ') + c.from);
      return `<tr><td><span class="row" style="gap:8px;flex-wrap:nowrap">${teamLogo(c, 'sm')}<b>${esc(c.fullName)}</b></span></td><td>${esc(c.owner.name)}</td><td class="r num">${fmtMoney(c.budget)}</td><td>${esc(Owners.GOAL[c.plan.goal][byLang(0, 1)])} · ${c.plan.years} ${byLang('anos', 'years')}</td><td>${esc(lbl)}</td></tr>`;
    }).join('');
    const KIND = { avenda: byLang('À venda', 'For sale'), venda: byLang('Venda', 'Sale'), gestao: byLang('Compra pela gestão', 'Management buyout'), saida: byLang('Saída do grid', 'Left the grid'), entrada: byLang('Estreia', 'Debut'), inscricao: byLang('Inscrição', 'Application'), aprovada: byLang('Entrada aprovada', 'Entry approved'), recusada: byLang('Entrada recusada', 'Entry rejected') };
    const log = S.log.slice(0, 80).map(x => `<tr><td class="num">${x.y}</td><td>${KIND[x.kind] || x.kind}</td><td>${esc(x.kind === 'venda' && x.from !== x.to ? `${x.from} → ${x.to}` : (x.name || x.from || ''))}</td><td>${esc(x.owner || '')}</td><td class="r num">${x.price > 1 ? fmtMoney(x.price) : x.price === 1 ? byLang('simbólico', 'nominal') : x.votes ? `${x.votes.yes}×${x.votes.no}` : ''}</td></tr>`).join('');
    const gone = S.gone.map(t => `<span class="chip">${esc(t.name)} (${t.gone.y})</span>`).join(' ');
    return `<div class="page-head"><div><div class="eyebrow">${byLang('Temporada', 'Season')} ${G.season.year}</div><h1>${byLang('Donos e mercado de equipes', 'Owners and team market')}</h1></div></div>
      <p class="small muted" style="max-width:980px;margin:-4px 0 14px">${byLang(`Cada equipe tem dono, valor de mercado e paciência. Donos insatisfeitos cortam o aporte ou colocam a equipe à venda; sem comprador, a equipe pode ser salva pela própria diretoria ou sair do grid. O grid aceita até ${Owners.MAX} equipes: com vaga, candidatas se inscrevem na FIA e a Comissão vota. Ferrari e McLaren nunca são vendidas; Mercedes e Red Bull só depois de 20 temporadas e numa crise muito forte.`, `Every team has an owner, a market value and limited patience. Unhappy owners cut funding or put the team up for sale; with no buyer, management may save the team or it leaves the grid. The grid takes up to ${Owners.MAX} teams: when there is room, candidates apply to the FIA and the Commission votes. Ferrari and McLaren are never sold; Mercedes and Red Bull only after 20 seasons and in a very deep crisis.`)}</p>
      <div class="panel"><div class="panel-h"><h3>${byLang('Equipes do grid', 'Grid teams')} (${G.db.teams.length}/${Owners.MAX})</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${byLang('Equipe', 'Team')}</th><th>${byLang('Dono', 'Owner')}</th><th class="r">${byLang('Valor estimado', 'Estimated value')}</th><th class="r">${byLang('Dívida', 'Debt')}</th><th>${byLang('Donos', 'Owners')}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>
      <div class="panel" style="margin-top:14px"><div class="panel-h"><h3>${byLang('Candidatas ao grid', 'Grid candidates')}</h3><span class="small muted">${byLang('Projeções do jogo, baseadas em organizações reais', 'Game projections based on real organisations')}</span></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${byLang('Projeto', 'Project')}</th><th>${byLang('Dono', 'Owner')}</th><th class="r">${byLang('Orçamento', 'Budget')}</th><th>${byLang('Plano', 'Plan')}</th><th>${byLang('Situação', 'Status')}</th></tr></thead><tbody>${cands}</tbody></table></div></div>
      <div class="panel" style="margin-top:14px"><div class="panel-h"><h3>${byLang('Histórico de donos, vendas e entradas', 'History of owners, sales and entries')}</h3></div>${log ? `<div class="tbl-wrap"><table class="tbl"><tbody>${log}</tbody></table></div>` : `<div class="empty">${byLang('Nada aconteceu ainda nesta carreira.', 'Nothing has happened yet in this career.')}</div>`}</div>
      ${gone ? `<div class="panel" style="margin-top:14px"><div class="panel-h"><h3>${byLang('Equipes que deixaram a F1', 'Teams that left F1')}</h3></div><div class="panel-b row" style="flex-wrap:wrap;gap:6px">${gone}</div></div>` : ''}`;
  },
};
NAV.splice(NAV.findIndex(n => n[0] === 'paddock') + 1, 0, ['owners', 'Donos e equipes', 'M3 21h18M5 21V8l7-5 7 5v13M9 21v-5h6v5M9 11h.01M15 11h.01']);

/* painel do dono na página da equipe */
function ownerPanelHtml(t) {
    const out = '';
    if (!t || typeof Owners === 'undefined') return out;
    Owners.ensureTeam(G, t);
    const m = ownMood(t.ownerMood);
    const lin = (t.lineage || []).map(l => `<div class="small">${l.y}: ${esc(l.from)}${l.to !== l.from ? ` → <b>${esc(l.to)}</b>` : ''} · ${esc(l.owner)}${l.price > 1 ? ` · ${fmtMoney(l.price)}` : ''}</div>`).join('');
    const hist = (t.valueHist || []).slice(-12).map(v => `<span class="small num muted">${v.y}: ${fmtMoney(v.v)}</span>`).join(' · ');
    return out + `<div class="panel" style="margin-top:14px"><div class="panel-h"><h3>${byLang('Dono e valor', 'Owner and value')}</h3>${ownSale(G, t)}</div><div class="panel-b"><dl class="kv">
      <dt>${byLang('Dono', 'Owner')}</dt><dd>${esc(t.owner.name)} <span class="small muted">(${esc(byLang(...(OWN_TYPE[t.owner.type] || OWN_TYPE.independente)))})</span></dd>
      <dt>${byLang('Valor estimado', 'Estimated value')}</dt><dd class="num">${fmtMoney(Owners.value(G, t))}</dd>
      <dt>${byLang('Aporte anual dos donos', 'Owners’ yearly funding')}</dt><dd class="num">${fmtMoney(t.ownerFunding || 0)}</dd>
      <dt>${byLang('Dívida', 'Debt')}</dt><dd class="num">${t.debt > 0 ? fmtMoney(t.debt) : '—'}</dd>
      <dt>${byLang('Humor dos donos', 'Owners’ mood')}</dt><dd class="${m[1]}">${m[0]}</dd>
      ${t.base ? `<dt>${byLang('Sede', 'Base')}</dt><dd>${esc(t.base)}</dd>` : ''}
      ${t.entered ? `<dt>${byLang('Estreia', 'Debut')}</dt><dd>${t.entered}</dd>` : ''}
      ${(() => { const p = Owners.partnerOf(G, t.id); const kids = Object.entries(Owners.partners(G)).filter(([c, x]) => x.parent === t.id).map(([c]) => (Career.team(G, c) || {}).name).filter(Boolean); const sis = (G.sisters || {})[t.id]; return (p ? `<dt>${byLang('Parceria técnica', 'Technical partnership')}</dt><dd>${esc(Career.team(G, p.parent).name)} (${esc(byLang(p.parts.join(', '), (p.partsEn || p.parts).join(', ')))})</dd>` : '') + (kids.length ? `<dt>${byLang('Parceiras técnicas', 'Technical partners')}</dt><dd>${esc(kids.join(', '))}</dd>` : '') + (sis ? `<dt>${byLang('Equipe irmã de', 'Sister team of')}</dt><dd>${esc(Career.team(G, sis).name)} ${byLang('(mesmo dono)', '(same owner)')}</dd>` : ''); })()}
    </dl>${hist ? `<div style="margin-top:8px">${hist}</div>` : ''}${lin ? `<div class="label" style="margin-top:10px">${byLang('Trocas de dono', 'Ownership changes')}</div>${lin}` : ''}</div></div>`;
}

/* ---------- opções de eventos (nova carreira e Salvar e opções) ---------- */
function chaosOptionsHtml(o, act) {
  const lv = (g) => `<label class="field"><span>${esc(byLang(...Chaos.GROUPS[g]))}</span><select class="inp" data-chg="${act}" data-k="lv:${g}">${Chaos.LEVELS.map((l, i) => opt(i, byLang(l[0], l[1]), o.levels[g])).join('')}</select></label>`;
  return `<label class="field"><span>${byLang('Frequência de eventos fora da pista', 'Off-track event frequency')}</span><select class="inp" data-chg="${act}" data-k="freq">${Object.entries(Chaos.FREQ).map(([k, v]) => opt(k, byLang(v[0], v[1]), o.freq)).join('')}</select></label>
    <details class="small"><summary>${byLang('Personalizar por tipo de evento', 'Customise by event type')}</summary><div class="grid g2" style="gap:8px;margin-top:8px">${Object.keys(Chaos.GROUPS).map(lv).join('')}</div>
    <p class="small muted">${byLang('Acidentes graves e fatais ficam sempre ligados, com probabilidade realista pela categoria e pela época.', 'Serious and fatal accidents are always on, with realistic odds by series and era.')}</p></details>
    <label class="check"><input type="checkbox" ${o.realPeople ? 'checked' : ''} data-chg="${act}" data-k="realPeople"> ${byLang('Pessoas, equipes e empresas reais podem aparecer em escândalos e acontecimentos (sempre marcados como ficção do jogo)', 'Real people, teams and companies may appear in scandals and events (always marked as game fiction)')}</label>`;
}
function chaosSet(o, k, el) {
  if (k === 'freq') o.freq = el.value;
  else if (k === 'realPeople') o.realPeople = el.checked;
  else if (k.startsWith('lv:')) o.levels[k.slice(3)] = Number(el.value);
}
CHG.ncChaos = (el) => { NC.chaos = NC.chaos || Chaos.defaults(); chaosSet(NC.chaos, el.dataset.k, el); };
CHG.optChaos = (el) => { const o = Chaos.opts(G); chaosSet(o, el.dataset.k, el); if (el.dataset.k === 'realPeople') G.options.realMortality = o.realPeople; Chaos.opts(G); autosave(); toast(byLang('Opção salva.', 'Option saved.')); };

/* ---------- nova carreira: equipe do grid, candidata (12ª) ou criada pelo jogador (12ª) ---------- */
(function () {
  const nc = SCREENS.newcareer.html;
  SCREENS.newcareer.html = function () {
    NC.src = NC.src || 'grid';
    NC.chaos = NC.chaos || Chaos.defaults();
    NC.custom = NC.custom || { name: '', fullName: '', short: '', country: NC.nat || 'BRA', color: '#00875A', color2: '#FFC72C', project: 'medio', engine: '', logo: 'logos/generic/1.svg' };
    let out = nc.call(this);
    // eventos: troca o seletor antigo pelas opções novas
    out = out.replace(/<label class="field"><span>Eventos fora da pista<\/span>[\s\S]*?<\/label>/, chaosOptionsHtml(NC.chaos, 'ncChaos'));
    if (NC.mode === 'observer' || NC.mode === 'driver') return out;   // (0.9) o piloto não escolhe equipe
    const tabs = `<div class="panel" style="margin-bottom:12px"><div class="panel-b row between" style="gap:10px;flex-wrap:wrap"><div class="stack" style="gap:2px"><b>${byLang('Que equipe você vai comandar?', 'Which team will you run?')}</b><span class="small muted">${byLang('Candidatas e equipes criadas entram como a 12ª equipe do grid.', 'Candidates and created teams join as the 12th team on the grid.')}</span></div>${segBtns('ncSrc', NC.src, [['grid', byLang('Equipe do grid', 'Grid team')], ['cand', byLang('Candidata (12ª)', 'Candidate (12th)')], ['custom', byLang('Criar equipe (12ª)', 'Create team (12th)')]])}</div></div>`;
    let pick = '';
    if (NC.src === 'cand') {
      NC.cand = NC.cand || 'vortice';
      pick = `<div class="team-pick">${Owners.cands().map(c => `<button class="team-card ${NC.cand === c.id ? 'on' : ''}" data-act="ncCand" data-id="${c.id}">
        <div class="stripe" style="background:linear-gradient(90deg, ${c.color} 70%, ${c.color2} 70%)"></div>
        <div class="body"><div class="row" style="gap:8px;flex-wrap:nowrap">${teamLogo(c, 'sm')}<b style="font-family:var(--f-display);font-size:17px">${esc(c.name)}</b></div>
        <div class="small muted">${natTag(c.country)} ${esc(c.owner.name)}</div>
        <div class="small">${byLang('Orçamento', 'Budget')} ${fmtMoney(c.budget)} · ${esc(Owners.GOAL[c.plan.goal][byLang(0, 1)])}</div>
        <div class="small muted">${esc(c.pitch)}</div></div></button>`).join('')}</div>`;
    } else if (NC.src === 'custom') {
      const C = NC.custom;
      const logos = (typeof GENERIC_LOGOS !== 'undefined' ? GENERIC_LOGOS : []).map((p, i) => `<button class="tlogo ${C.logo === p ? 'on' : ''}" style="--tc:${C.color};width:46px;height:46px;cursor:pointer;${C.logo === p ? 'outline:3px solid var(--acc);' : ''}" data-act="ncLogo" data-v="${p}" title="${i + 1}"><img src="${imgUrl(p) || ''}" alt=""></button>`).join('');
      const engs = BASE.engines.map(e => [e.id, e.name]);
      pick = `<div class="panel"><div class="panel-h"><h3>${byLang('Sua equipe', 'Your team')}</h3><span class="row" style="gap:8px">${teamLogo({ ...C, short: C.short || (C.name || '?').slice(0, 3) })}<b>${esc(C.name || byLang('Nova equipe', 'New team'))}</b></span></div><div class="panel-b stack">
        <div class="grid g2" style="gap:10px">
          <label class="field"><span>${byLang('Nome', 'Name')}</span><input class="inp" value="${esc(C.name)}" maxlength="28" data-inp="ncCustomT" data-k="name" placeholder="Vórtice"></label>
          <label class="field"><span>${byLang('Nome completo', 'Full name')}</span><input class="inp" value="${esc(C.fullName)}" maxlength="48" data-inp="ncCustomT" data-k="fullName" placeholder="Vórtice Racing F1 Team"></label>
          <label class="field"><span>${byLang('Sigla (3 letras)', 'Code (3 letters)')}</span><input class="inp" value="${esc(C.short)}" maxlength="3" data-inp="ncCustomT" data-k="short"></label>
          <label class="field"><span>${byLang('País', 'Country')}</span><select class="inp" data-chg="ncCustom" data-k="country">${Object.entries(NAT_NAMES).map(([k, v]) => opt(k, v, C.country)).join('')}</select></label>
          <label class="field"><span>${byLang('Cor principal', 'Main colour')}</span><input class="inp" type="color" style="height:42px;padding:3px" value="${esc(C.color)}" data-chg="ncCustom" data-k="color"></label>
          <label class="field"><span>${byLang('Cor secundária', 'Second colour')}</span><input class="inp" type="color" style="height:42px;padding:3px" value="${esc(C.color2)}" data-chg="ncCustom" data-k="color2"></label>
          <label class="field"><span>${byLang('Tamanho do projeto', 'Project size')}</span><select class="inp" data-chg="ncCustom" data-k="project">${opt('modesto', byLang('Modesto (orçamento ~US$ 150 mi, dono paciente)', 'Modest (~$150m budget, patient owner)'), C.project)}${opt('medio', byLang('Médio (~US$ 190 mi)', 'Medium (~$190m)'), C.project)}${opt('ambicioso', byLang('Ambicioso (~US$ 240 mi, dono exigente)', 'Ambitious (~$240m, demanding owner)'), C.project)}</select></label>
          <label class="field"><span>${byLang('Fornecedor de motor', 'Engine supplier')}</span><select class="inp" data-chg="ncCustom" data-k="engine">${opt('', byLang('O que tiver vaga', 'Whoever has capacity'), C.engine)}${engs.map(([k, v]) => opt(k, v, C.engine)).join('')}</select></label>
        </div>
        <div class="label">${byLang('Logo', 'Logo')}</div><div class="row" style="flex-wrap:wrap;gap:6px">${logos}</div>
        <label class="field"><span>${byLang('Ou importe o seu logo (PNG, JPG ou SVG)', 'Or import your own logo (PNG, JPG or SVG)')}</span><input class="inp" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" data-chg="ncLogoFile"></label>
        <p class="small muted">${byLang('A equipe estreia com carro atrás do grid, estrutura em formação e meta de evolução. Pilotos provisórios são contratados entre os livres; você pode trocar no Mercado.', 'The team debuts with a car behind the grid, a structure still being built and a target to improve. Stand-in drivers are signed from free agents; you can change them in the Market.')}</p>
      </div></div>`;
    }
    if (pick) out = out.replace(/<div class="team-pick"[\s\S]*?<\/button><\/div>\s*(?=<div class="panel"><div class="panel-h"><h3>Configuração)/, pick);
    return out.replace('<div class="grid g-hub">', tabs + '<div class="grid g-hub">');
  };
  ACT.ncSrc = (el) => { NC.src = el.dataset.val; render(); };
  ACT.ncCand = (el) => { NC.cand = el.dataset.id; render(); };
  ACT.ncLogo = (el) => { NC.custom.logo = el.dataset.v; render(); };
  CHG.ncCustomT = (el) => { NC.custom[el.dataset.k] = el.value; };
  CHG.ncCustom = (el) => { NC.custom[el.dataset.k] = el.value; render(); };
  CHG.ncLogoFile = (el) => {
    const f = el.files && el.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      const img = new Image();
      img.onload = () => {
        // reduz para 256 px (o save guarda a imagem)
        const c = document.createElement('canvas'); const k = Math.min(1, 256 / Math.max(img.width, img.height));
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        NC.custom.logo = c.toDataURL('image/png'); render();
      };
      img.src = rd.result;
    };
    rd.readAsDataURL(f);
  };
  const st = ACT.ncStart;
  ACT.ncStart = () => {
    NC.chaosFreq = (NC.chaos || {}).freq;
    if (NC.mode !== 'observer' && NC.src === 'cand') NC.newTeam = { candidate: NC.cand || 'vortice' };
    else if (NC.mode !== 'observer' && NC.src === 'custom') {
      if (!String(NC.custom.name || '').trim()) return toast(byLang('Dê um nome à sua equipe.', 'Give your team a name.'), 'bad');
      NC.newTeam = { ...NC.custom, engine: NC.custom.engine || null };
    } else NC.newTeam = null;
    const out = st();
    if (G && G.teamSetup && G.teamSetup.pending) go('teamSetup');
    return out;
  };
})();

/* Salvar e opções: eventos por frequência e nível */
(function () {
  const sv = SCREENS.saves.html;
  SCREENS.saves.html = function () {
    const out = sv.call(this);
    return G ? out.replace(/<label class="field"><span>Frequência de eventos<\/span>[\s\S]*?<\/label>/, chaosOptionsHtml(Chaos.opts(G), 'optChaos')) : out;
  };
})();

/* Diagnóstico: forçar cada evento do catálogo novo e ver os casos abertos */
(function () {
  const dg = SCREENS.diag && SCREENS.diag.html;
  if (!dg) return;
  SCREENS.diag.html = function () {
    const S = Chaos.state(G);
    const btns = Chaos.EV.map(e => `<button class="btn sm" data-act="forceChaos" data-k="${e.k}">${esc(e.k)}</button>`).join('');
    const open = S.cases.filter(c => c.stage === 'investigacao');
    return dg.call(this) + `<div class="panel" style="margin-top:14px"><div class="panel-h"><h3>${byLang('Eventos e escândalos 0.8.4 (depuração)', '0.8.4 events and scandals (debug)')}</h3><span class="small muted">${byLang('Frequência', 'Frequency')}: ${esc(Chaos.opts(G).freq)} · ${byLang('pessoas reais', 'real people')}: ${Chaos.real(G) ? byLang('sim', 'yes') : byLang('não', 'no')}</span></div><div class="panel-b stack">
      <div class="row" style="flex-wrap:wrap;gap:6px">${btns}<button class="btn sm" data-act="forceChaos" data-k="__lesao">${byLang('lesão', 'injury')}</button></div>
      <div class="small">${byLang('Investigações abertas', 'Open investigations')}: <b>${open.length}</b> · ${byLang('casos encerrados', 'closed cases')}: <b>${S.cases.length - open.length}</b> · ${byLang('ocultos', 'hidden')}: <b>${S.hidden.filter(h => !h.out).length}</b></div>
      <div class="tbl-wrap"><table class="tbl"><tbody>${S.log.slice(0, 15).map(x => `<tr><td class="num small">${x.y} · ${x.r}</td><td class="small">${esc(x.g)}</td><td class="small">${esc(x.k)}${x.covered ? ' (' + byLang('acobertado', 'covered up') + ')' : x.hidden ? ' (' + byLang('oculto', 'hidden') + ')' : ''}</td><td class="small">${x.tid ? esc((Career.team(G, x.tid) || {}).name || '') : x.did ? esc((Career.driver(G, x.did) || {}).name || '') : ''}</td></tr>`).join('') || `<tr><td class="muted small">${byLang('Nenhum evento ainda.', 'No events yet.')}</td></tr>`}</tbody></table></div>
    </div></div>`;
  };
  ACT.forceChaos = (el) => {
    const k = el.dataset.k;
    if (k === '__lesao') { const d = Chaos.drivers(G)[0]; if (d) Chaos.injure(G, d, localRng('fi:' + G.seq), 'doenca'); }
    else Chaos.force(G, k);
    autosave(); toast(byLang('Evento forçado. Veja notícias e caixa de entrada.', 'Event forced. Check news and inbox.'), 'good'); render();
  };
})();

/* ---------- montagem da equipe nova (pilotos, reserva e cargos-chave) ---------- */
SCREENS.teamSetup = {
  html() {
    const t = Career.team(G);
    if (!G.teamSetup) return `<div class="empty">${byLang('Sua equipe já está montada.', 'Your team is already set up.')}</div>`;
    const st = Owners.setupState(G);
    const pool = Owners.setupPool(G);
    const tab = UI.params.tab || 'drivers';
    const slot = (d, lbl) => `<div class="panel"><div class="panel-b row" style="gap:10px">${d ? headshot(d) : '<span class="hs noimg"><b>?</b></span>'}<div class="stack" style="gap:2px"><span class="label">${lbl}</span>${d ? `<b>${esc(d.name)}</b><span class="small muted">${natTag(d.nat)} ${d.age} ${byLang('anos', 'yrs')} · ${byLang('nota', 'rating')} ${driverOverall(d)} · ${fmtMoney(d.salary || 0)}/${byLang('ano', 'yr')}</span>` : `<span class="small muted">${byLang('vaga aberta', 'open seat')}</span>`}</div></div></div>`;
    const ds = Owners.setupDrivers(G).slice(0, 80);
    const drows = ds.map(d => {
      const a = Market.driverAccepts(G, d, t, { salary: Market.ask(d), years: 2, role: 1 });
      const where = d.team ? `${byLang('reserva da', 'reserve at')} ${esc(Career.team(G, d.team).name)}` : (typeof Cats !== 'undefined' && Cats.label(G, d)) || d.series || byLang('livre', 'free');
      return `<tr><td>${headshot(d, 'sm')}</td><td>${dTag(d.id)}<div class="small muted">${natTag(d.nat)} ${d.age} ${byLang('anos', 'yrs')} · ${esc(where)}</div></td><td class="r num">${driverOverall(d)}</td><td class="r num">${fmtMoney(Market.ask(d))}</td><td class="small">${esc(Silly.agent(G, d).name)}</td><td class="r num ${a.p >= 0.5 ? 'pos' : a.p < 0.25 ? 'neg' : ''}">${Math.round(a.p * 100)}%</td><td><button class="btn sm" data-act="negotiate" data-id="${d.id}">${byLang('Negociar', 'Negotiate')}</button></td></tr>`;
    }).join('');
    const roleRows = Owners.SETUP_ROLES.filter(r => r !== 'engine' || t.works || Staff.get(t, 'engine')).map(role => {
      const cur = Staff.get(t, role);
      const cands = (pool[role] || []).filter(c => !c.hired);
      const rivals = G.db.teams.filter(x => x.id !== t.id).map(x => ({ x, s: Staff.get(x, role) })).filter(o => o.s && !o.s.isPlayer).sort((a, b) => b.s.rating - a.s.rating).slice(0, 2);
      return `<div class="panel"><div class="panel-h"><h3>${esc(Staff.ROLES[role].name)}</h3><span class="small">${cur ? `${esc(cur.name)} · ${byLang('nível', 'level')} <b>${cur.rating}</b>${cur.interim ? ` <span class="chip">${byLang('interino', 'interim')}</span>` : ` <span class="chip acc">${byLang('contratado', 'hired')}</span>`}` : byLang('vago', 'vacant')}</span></div><div class="panel-b stack" style="gap:6px">
        ${cands.map(c => `<div class="row between"><span>${natTag(c.nat)} ${esc(c.name)} · ${byLang('nível', 'level')} <b>${c.rating}</b> · ${fmtMoney(c.salary)}/${byLang('ano', 'yr')} · ${byLang('luvas', 'signing fee')} ${fmtMoney(c.fee)}</span><button class="btn sm" data-act="setupHire" data-role="${role}" data-id="${c.id}">${byLang('Contratar', 'Hire')}</button></div>`).join('')}
        ${rivals.map(o => `<div class="row between small muted"><span>${esc(o.s.name)} (${esc(o.x.name)}) · ${byLang('nível', 'level')} ${o.s.rating} · ${byLang('afastamento antes de começar', 'gardening leave before starting')}</span><button class="btn sm ghost" data-act="staffPoach" data-team="${o.x.id}" data-id="${o.s.id}">${byLang('Tentar tirar', 'Try to poach')}</button></div>`).join('')}
      </div></div>`;
    }).join('');
    return `<div class="page-head"><div><div class="eyebrow">${esc(t.fullName)} · ${G.season.year}</div><h1>${byLang('Montagem da equipe', 'Team build-up')}</h1></div>
      <div class="row">${G.teamSetup.pending ? `<button class="btn" data-act="setupAuto">${byLang('Diretor esportivo completa as vagas', 'Sporting director fills the gaps')}</button><button class="btn primary" data-act="setupDone" ${st.ready ? '' : 'disabled'}>${byLang('Concluir montagem', 'Finish build-up')}</button>` : `<span class="chip acc">${byLang('Montagem concluída', 'Build-up complete')}</span>`}</div></div>
      <p class="small muted" style="max-width:980px;margin:-4px 0 14px">${byLang(`A equipe estreia do zero: escolha dois titulares e um reserva e contrate os cargos que fazem o carro andar. Pilotos de ponta podem não querer um projeto novo; o empresário de cada um negocia. Os cargos sem contratação seguem com interinos. Caixa: ${fmtMoney(G.finances.balance)}.`, `The team starts from scratch: pick two race drivers and a reserve and hire the roles that make the car quick. Top drivers may not want a new project; each one’s manager negotiates. Roles you do not fill stay with interim staff. Cash: ${fmtMoney(G.finances.balance)}.`)}</p>
      <div class="grid g3">${slot(st.r1, byLang('Carro #1', 'Car #1'))}${slot(st.r2, byLang('Carro #2', 'Car #2'))}${slot(st.res, byLang('Reserva', 'Reserve'))}</div>
      <div class="row" style="margin:14px 0">${segBtns('setupTab', tab, [['drivers', byLang('Pilotos', 'Drivers')], ['staff', byLang('Cargos-chave', 'Key roles')]])}</div>
      ${tab === 'drivers' ? `<div class="panel"><div class="panel-h"><h3>${byLang('Pilotos disponíveis com superlicença', 'Available drivers with a superlicence')}</h3><span class="small muted">${byLang('Interesse = chance de aceitar a proposta pelo valor pedido', 'Interest = chance of accepting an offer at the asking price')}</span></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th></th><th>${byLang('Piloto', 'Driver')}</th><th class="r">${byLang('Nota', 'Rating')}</th><th class="r">${byLang('Pede', 'Asks')}</th><th>${byLang('Empresário', 'Manager')}</th><th class="r">${byLang('Interesse', 'Interest')}</th><th></th></tr></thead><tbody>${drows}</tbody></table></div></div>`
        : `<div class="grid g2">${roleRows}</div>`}`;
  },
};
ACT.setupTab = (el) => go('teamSetup', { tab: el.dataset.val });
ACT.setupHire = (el) => {
  const pool = Owners.setupPool(G); const c = (pool[el.dataset.role] || []).find(x => x.id === el.dataset.id); if (!c) return;
  if (G.finances.balance < c.fee) return toast(byLang('Caixa insuficiente para as luvas.', 'Not enough cash for the signing fee.'), 'bad');
  Career.ledger(G, byLang(`Contratação: ${c.name} (${Staff.ROLES[c.role].name})`, `Hire: ${c.name} (${c.role})`), -c.fee, 'staff');
  Staff.hire(G, G.player.teamId, c); c.hired = true; autosave(); toast(byLang(`${c.name} contratado.`, `${c.name} hired.`), 'good'); render();
};
ACT.setupAuto = () => { Owners.autoSetup(G); autosave(); toast(byLang('O diretor esportivo completou as vagas.', 'The sporting director filled the gaps.'), 'good'); go('hub'); };
ACT.setupDone = () => { if (!Owners.setupState(G).ready) return toast(byLang('Faltam pilotos titulares.', 'Race seats are still open.'), 'bad'); Owners.finishSetup(G); autosave(); toast(byLang('Equipe pronta para a estreia.', 'Team ready for its debut.'), 'good'); go('hub'); };
(function () {
  // a temporada não anda enquanto a equipe nova não estiver montada
  const at = ACT.advanceTime;
  ACT.advanceTime = (...a) => { if (G && G.teamSetup && G.teamSetup.pending) { toast(byLang('Monte a equipe antes de seguir.', 'Build your team before moving on.'), 'bad'); return go('teamSetup'); } return at(...a); };
  const tw = ACT.toWeekend;
  ACT.toWeekend = (...a) => { if (G && G.teamSetup && G.teamSetup.pending) { toast(byLang('Monte a equipe antes de seguir.', 'Build your team before moving on.'), 'bad'); return go('teamSetup'); } return tw(...a); };
  const hub = SCREENS.hub.html;
  SCREENS.hub.html = function () {
    const out = hub.call(this);
    if (!G || !G.teamSetup || !G.teamSetup.pending) return out;
    return `<div class="panel" style="margin-bottom:14px;border-color:var(--acc)"><div class="panel-b row between" style="gap:12px;flex-wrap:wrap"><div class="stack" style="gap:2px"><b>${byLang('Sua equipe ainda não está montada', 'Your team is not set up yet')}</b><span class="small muted">${byLang('Escolha os pilotos titulares, o reserva e os cargos-chave antes da primeira corrida.', 'Choose the race drivers, the reserve and the key roles before the first race.')}</span></div><button class="btn primary" data-act="go" data-v="teamSetup">${byLang('Montar a equipe', 'Build the team')}</button></div></div>` + out;
  };
})();
NAV.splice(NAV.findIndex(n => n[0] === 'team'), 0, ['teamSetup', 'Montagem da equipe', 'M4 7h16M4 12h16M4 17h10']);
