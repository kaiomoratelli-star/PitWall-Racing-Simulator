/* ============================================================
   PIT WALL — telas de Sede e fábrica e de Fabricantes (V0.8.4)
   ============================================================ */
'use strict';

function facStars(f) { const n = f ? f.lvl : 0; return `<span class="num" title="${n}/5">${'★'.repeat(n)}<span class="muted">${'★'.repeat(Fac.MAX - n)}</span></span>`; }
function facBar(v) { const c = v >= 75 ? 'var(--green, #2ecc71)' : v >= 55 ? 'var(--yellow, #f1c40f)' : 'var(--red, #e74c3c)'; return `<span class="bar" style="display:inline-block;width:80px;height:6px;background:var(--line);border-radius:3px;overflow:hidden;vertical-align:middle"><i style="display:block;height:100%;width:${Math.round(v)}%;background:${c}"></i></span> <span class="small num">${Math.round(v)}%</span>`; }

SCREENS.facilities = {
  html() {
    const t = Career.team(G); Fac.ensure(G, t);
    const used = Fac.yearSpent(G, t), allow = Fac.allowance(G, t);
    const builds = Fac.IDS.filter(id => t.fac[id].build).length;
    const rows = Fac.IDS.filter(id => id !== 'motor' || t.works).map(id => {
      const f = t.fac[id]; const err = Fac.canUpgrade(G, t, id);
      const due = f.build ? (() => { const y = Math.floor(f.build.due / 100), r = f.build.due % 100; return byLang(`obra para o nível ${f.build.to}: pronta na ${r}ª etapa de ${y}`, `building level ${f.build.to}: ready at round ${r} of ${y}`); })() : '';
      const rk = Fac.rank(G, t, id);
      return `<tr><td><b>${esc(Fac.name(id))}</b><div class="small muted">${esc(byLang(...Fac.EFFECT[id]))}</div>${due ? `<div class="small acc">${due}</div>` : ''}</td>
        <td>${facStars(f)}<div class="small muted">${ordinal(rk)} ${byLang('no grid', 'on the grid')}</div></td><td>${facBar(f.cond)}</td>
        <td class="r">${f.lvl < Fac.MAX && !f.build ? `<button class="btn sm" data-act="facUp" data-id="${id}" ${err ? `disabled title="${esc(err)}"` : ''}>${byLang('Ampliar', 'Upgrade')} · ${fmtMoney(Fac.cost(t, id))} · ${Fac.rounds(t, id)} ${byLang('etapas', 'rounds')}</button>` : ''}
          ${f.cond < 97 ? `<button class="btn sm ghost" data-act="facFix" data-id="${id}">${byLang('Manutenção', 'Maintenance')} · ${fmtMoney(Fac.repairCost(t, id))}</button>` : ''}</td></tr>`;
    }).join('');
    const rivals = G.db.teams.slice().sort((a, b) => b.facilities - a.facilities).map(x => `<tr class="${x.id === t.id ? 'me' : ''}"><td>${tTag(x.id)}</td><td class="r num">${x.facilities}</td><td class="r num">${Career.slots(x)}</td><td class="small">${Fac.IDS.filter(id => x.fac && x.fac[id].build).map(id => esc(Fac.name(id))).join(', ') || '—'}</td></tr>`).join('');
    return `<div class="page-head"><div><div class="eyebrow">${esc(t.name)} · ${G.season.year}</div><h1>${byLang('Sede e fábrica', 'HQ & factory')}</h1></div></div>
      <p class="small muted" style="max-width:980px;margin:-4px 0 14px">${byLang('As instalações decidem quantos projetos a equipe toca ao mesmo tempo, a qualidade das peças, o prazo de fabricação, o custo da operação e até a recuperação dos pilotos. Tudo se desgasta: sem manutenção, o rendimento cai. Obras demoram algumas etapas, e só duas podem andar ao mesmo tempo.', 'Facilities decide how many projects the team runs at once, part quality, build time, operating cost and even driver recovery. Everything wears out: without maintenance, output drops. Building work takes several rounds, and only two projects can run at once.')}</p>
      <div class="grid g4">
        <div class="panel"><div class="panel-b"><div class="label">${byLang('Instalações (geral)', 'Facilities (overall)')}</div><div class="stat-big">${t.facilities}</div><div class="small muted">${ordinal(G.db.teams.slice().sort((a, b) => b.facilities - a.facilities).indexOf(t) + 1)} ${byLang('no grid', 'on the grid')}</div></div></div>
        <div class="panel"><div class="panel-b"><div class="label">${byLang('Vagas de projeto no P&D', 'R&D project slots')}</div><div class="stat-big">${Career.slots(t)}</div><div class="small muted">${byLang('escritório de projeto e fábrica', 'design office and factory')}</div></div></div>
        <div class="panel"><div class="panel-b"><div class="label">${byLang('Investimento fora do teto', 'Capex outside the cap')}</div><div class="stat-big" style="font-size:24px">${fmtMoney(used)} / ${fmtMoney(allow)}</div><div class="small muted">${byLang('acima disso, a obra conta no teto de gastos', 'above that, building counts towards the cost cap')}</div></div></div>
        <div class="panel"><div class="panel-b"><div class="label">${byLang('Obras em andamento', 'Building projects')}</div><div class="stat-big">${builds} / 2</div><div class="small muted">${byLang('Caixa', 'Cash')} ${fmtMoney(G.finances.balance)}</div></div></div>
      </div>
      <div class="panel" style="margin-top:14px"><div class="panel-h"><h3>${byLang('Instalações', 'Facilities')}</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${byLang('Instalação', 'Facility')}</th><th>${byLang('Nível', 'Level')}</th><th>${byLang('Estado', 'Condition')}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>
      <div class="panel" style="margin-top:14px"><div class="panel-h"><h3>${byLang('Comparação com o grid', 'Grid comparison')}</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${byLang('Equipe', 'Team')}</th><th class="r">${byLang('Geral', 'Overall')}</th><th class="r">${byLang('Vagas', 'Slots')}</th><th>${byLang('Obras', 'Building')}</th></tr></thead><tbody>${rivals}</tbody></table></div></div>`;
  },
};
ACT.facUp = (el) => { const e = Fac.upgrade(G, Career.team(G), el.dataset.id); if (e) toast(e, 'bad'); else { toast(byLang('Obra iniciada.', 'Building work started.'), 'good'); autosave(); } render(); };
ACT.facFix = (el) => { const e = Fac.repair(G, Career.team(G), el.dataset.id); if (e) toast(e, 'bad'); else { toast(byLang('Manutenção feita.', 'Maintenance done.'), 'good'); autosave(); } render(); };

SCREENS.manufacturers = {
  html() {
    const S = Mfr.ensure(G); const mine = Career.isObs(G) ? null : Career.team(G);
    const myC = mine && S.contracts[mine.id];
    const mlogo = (m) => { const w = Mfr.worksOf(G, m.id); const u = m.logo ? imgUrl(m.logo) : null; return u ? `<span class="tlogo sm" style="--tc:#222"><img src="${u}" alt=""></span>` : w ? teamLogo(w, 'sm') : `<span class="tlogo sm txt" style="--tc:#444">${esc(m.name.slice(0, 3).toUpperCase())}</span>`; };
    const act = S.list.filter(m => m.active).sort((a, b) => (byId(G.db.engines, b.id) || {}).power - (byId(G.db.engines, a.id) || {}).power);
    const rows = act.map(m => {
      const e = byId(G.db.engines, m.id) || {}; const cust = Mfr.customers(G, m.id); const w = Mfr.worksOf(G, m.id);
      const canPick = mine && !mine.works && (!myC || myC.until <= G.season.year) && (m.id === mine.engine || Mfr.capacityLeft(G, m) > 0) && !(m.leaving && m.leaving <= G.season.year + 2);
      return `<tr class="${mine && mine.engine === m.id ? 'me' : ''}"><td><span class="row" style="gap:8px;flex-wrap:nowrap">${mlogo(m)}<b>${esc(m.name)}</b></span>${m.leaving ? `<div class="small neg">${byLang('sai depois de', 'leaves after')} ${m.leaving - 1}</div>` : ''}${m.since && m.since > (G.db.rules.startYear || 2027) - 1 ? `<div class="small muted">${byLang('na F1 desde', 'in F1 since')} ${m.since}</div>` : ''}</td>
        <td class="r num">${e.power}</td><td class="r num">${e.reliability}</td><td class="r num">${(+m.eff).toFixed(1)}</td><td class="r num">${fmtMoney(m.fee)}</td>
        <td class="small">${w ? `<b>${esc(w.name)}</b> (${byLang('fábrica', 'works')})${cust.length > 1 ? ', ' : ''}` : ''}${cust.filter(t => t !== w).map(t => esc(t.name)).join(', ') || (w ? '' : '—')}<div class="muted">${cust.length}/${Mfr.CAP}</div></td>
        <td class="r">${canPick ? `<button class="btn sm" data-act="mfrPick" data-id="${m.id}">${m.id === mine.engine ? byLang('Renovar para', 'Renew for') : byLang('Fechar para', 'Sign for')} ${G.season.year + 1}</button>` : ''}${mine && !mine.works && !w ? `<button class="btn sm ghost" data-act="mfrWorks" data-id="${m.id}" title="${byLang('Chance estimada', 'Estimated chance')}: ${Math.round(Mfr.worksChance(G, mine, m) * 100)}%">${byLang('Pedir parceria de fábrica', 'Request works deal')}</button>` : ''}</td></tr>`;
    }).join('');
    const cands = S.list.filter(m => !m.active).map(m => `<tr><td><span class="row" style="gap:8px;flex-wrap:nowrap">${mlogo(m)}<b>${esc(m.name)}</b></span></td><td>${natTag(m.country || '')}</td><td class="small">${m.entering ? `<b class="acc">${byLang('confirmado para', 'confirmed for')} ${m.entering}</b>` : m.left ? byLang(`saiu em ${m.left}`, `left in ${m.left}`) : byLang('avaliando a entrada', 'considering entry')}</td><td class="small muted">${esc(m.real || '')}</td></tr>`).join('');
    const T = Mfr.tyres(G), tyre = Mfr.tyreNow(G);
    const tyreRows = Object.entries(Mfr.SERIES_TYRES).map(([cid, tid]) => { const c = typeof Cats !== 'undefined' && Cats.get(G, cid); const x = Mfr.TYRES[tid]; return c ? `<tr><td>${esc(c.short || c.name)}</td><td>${x ? `<span class="row" style="gap:6px;flex-wrap:nowrap">${x.logo && imgUrl(x.logo) ? `<img src="${imgUrl(x.logo)}" alt="" style="height:16px">` : ''}${esc(x.name)}</span>` : esc(tid)}</td></tr>` : ''; }).join('');
    const log = S.log.slice(0, 20).map(x => { const m = Mfr.get(G, x.mid); const t = x.tid && Career.team(G, x.tid); const K = { contrato: byLang('Contrato', 'Deal'), anuncio: byLang('Anúncio', 'Announcement'), estreia: byLang('Estreia', 'Debut'), saida: byLang('Anuncia saída', 'Announces exit'), saiu: byLang('Saiu', 'Left'), heranca: byLang('Projeto herdado', 'Project taken over') }; return `<tr><td class="num">${x.y}</td><td>${K[x.kind] || x.kind}</td><td>${esc(m ? m.name : x.mid || '')}</td><td>${t ? esc(t.name) : ''}${x.until ? ` · ${byLang('até', 'until')} ${x.until}` : ''}${x.year ? ` · ${x.year}` : ''}</td></tr>`; }).join('');
    return `<div class="page-head"><div><div class="eyebrow">${byLang('Temporada', 'Season')} ${G.season.year}</div><h1>${byLang('Fabricantes', 'Manufacturers')}</h1></div></div>
      <p class="small muted" style="max-width:980px;margin:-4px 0 14px">${byLang(`Fabricantes de motor fornecem a até ${Mfr.CAP} equipes, com ou sem equipe própria. A potência já inclui a eficiência (consumo e energia). Contratos vencem no fim do ano indicado; no regulamento novo, os motores são reembaralhados.`, `Engine manufacturers supply up to ${Mfr.CAP} teams, with or without a team of their own. Power already includes efficiency (fuel and energy). Deals expire at the end of the year shown; new regulations reshuffle the engines.`)}</p>
      ${mine ? `<div class="panel"><div class="panel-b row between" style="gap:12px;flex-wrap:wrap"><div class="stack" style="gap:2px"><b>${byLang('Seu motor', 'Your engine')}: ${esc((Mfr.get(G, mine.engine) || {}).name || '')}${mine.works ? ` (${byLang('equipe de fábrica', 'works team')})` : ''}</b><span class="small muted">${mine.works ? byLang('O desenvolvimento do motor é feito no P&D e no departamento de motores.', 'Engine development happens in R&D and the power unit department.') : myC ? byLang(`Contrato até ${myC.until} · ${fmtMoney(myC.fee)} por ano${mine.nextEngine ? ` · em ${G.season.year + 1}: ${(Mfr.get(G, mine.nextEngine) || {}).name}` : ''}`, `Deal until ${myC.until} · ${fmtMoney(myC.fee)} a year${mine.nextEngine ? ` · in ${G.season.year + 1}: ${(Mfr.get(G, mine.nextEngine) || {}).name}` : ''}`) : ''}</span></div>
        ${!mine.works && myC && myC.until > G.season.year ? `<button class="btn ghost" data-act="mfrBreak">${byLang('Rescindir contrato', 'Terminate deal')} · ${fmtMoney(Mfr.breakFee(G, mine))}</button>` : ''}</div></div>` : ''}
      <div class="panel" style="margin-top:14px"><div class="panel-h"><h3>${byLang('Motores', 'Power units')}</h3></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${byLang('Fabricante', 'Manufacturer')}</th><th class="r">${byLang('Potência', 'Power')}</th><th class="r">${byLang('Confiab.', 'Reliab.')}</th><th class="r">${byLang('Eficiência', 'Efficiency')}</th><th class="r">${byLang('Preço/ano', 'Price/yr')}</th><th>${byLang('Equipes', 'Teams')}</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>
      <div class="panel" style="margin-top:14px"><div class="panel-h"><h3>${byLang('Fora da F1', 'Outside F1')}</h3><span class="small muted">${byLang('Podem entrar só como fornecedores e, depois, comprar uma equipe', 'They can enter purely as suppliers and later buy a team')}</span></div><div class="tbl-wrap"><table class="tbl"><tbody>${cands}</tbody></table></div></div>
      <div class="grid g2" style="margin-top:14px">
        <div class="panel"><div class="panel-h"><h3>${byLang('Pneus da F1', 'F1 tyres')}</h3></div><div class="panel-b"><div class="row" style="gap:12px">${tyre.logo && imgUrl(tyre.logo) ? `<img src="${imgUrl(tyre.logo)}" alt="" style="height:34px">` : ''}<div><b style="font-size:18px">${esc(tyre.name)}</b><div class="small muted">${byLang('Fornecedora única até', 'Sole supplier until')} ${T.f1.until} · ${byLang('desde', 'since')} ${T.f1.since}</div></div></div>
          <dl class="kv" style="margin-top:10px"><dt>${byLang('Característica', 'Character')}</dt><dd>${esc(byLang(...tyre.note))}</dd><dt>${byLang('Desgaste', 'Wear')}</dt><dd>${tyre.wear < 1 ? byLang('menor que a referência', 'below reference') : tyre.wear > 1 ? byLang('maior que a referência', 'above reference') : byLang('referência', 'reference')} (${tyre.wear.toFixed(2)}×)</dd>
          <dt>${byLang('Licitação', 'Tender')}</dt><dd>${T.tender ? byLang(`aberta: ${T.tender.bids.map(b => Mfr.TYRES[b].name).join(', ')}`, `open: ${T.tender.bids.map(b => Mfr.TYRES[b].name).join(', ')}`) : byLang(`próxima em ${T.f1.until - 1}`, `next in ${T.f1.until - 1}`)}</dd>
          <dt>${byLang('Histórico', 'History')}</dt><dd>${T.hist.map(h => `${h.y}: ${esc(Mfr.TYRES[h.id] ? Mfr.TYRES[h.id].name : h.id)}`).join(' · ')}</dd></dl></div></div>
        <div class="panel"><div class="panel-h"><h3>${byLang('Pneus nas outras categorias', 'Tyres in other series')}</h3></div><div class="tbl-wrap"><table class="tbl"><tbody>${tyreRows}</tbody></table></div></div>
      </div>
      <div class="panel" style="margin-top:14px"><div class="panel-h"><h3>${byLang('Movimentos recentes', 'Recent moves')}</h3></div>${log ? `<div class="tbl-wrap"><table class="tbl"><tbody>${log}</tbody></table></div>` : `<div class="empty">${byLang('Nada ainda.', 'Nothing yet.')}</div>`}</div>`;
  },
};
ACT.mfrPick = (el) => { const e = Mfr.playerChoose(G, el.dataset.id, 2); if (e) toast(e, 'bad'); else { toast(byLang('Contrato fechado para o ano que vem.', 'Deal agreed for next year.'), 'good'); autosave(); } render(); };
ACT.mfrWorks = (el) => { const e = Mfr.askWorks(G, el.dataset.id); if (e) toast(e, 'bad'); else { toast(byLang('Parceria de fábrica fechada!', 'Works partnership agreed!'), 'good'); autosave(); } render(); };
ACT.mfrBreak = () => { const e = Mfr.breakContract(G); if (e) toast(e, 'bad'); else { toast(byLang('Contrato rescindido: escolha o motor do ano que vem.', 'Deal terminated: choose next year’s engine.'), 'good'); autosave(); } render(); };

NAV.splice(NAV.findIndex(n => n[0] === 'dev') + 1, 0, ['facilities', 'Sede e fábrica', 'M3 21h18M5 21V10l5-3v4l5-3v4l4-2v11M9 17h2m4 0h2']);
NAV.splice(NAV.findIndex(n => n[0] === 'owners') + 1, 0, ['manufacturers', 'Fabricantes', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z']);
MANAGER_ONLY.add('facilities');
