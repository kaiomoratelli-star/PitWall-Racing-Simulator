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

ACT.mfrPick = (el) => { const e = Mfr.playerChoose(G, el.dataset.id, 2); if (e) toast(e, 'bad'); else { toast(byLang('Contrato fechado para o ano que vem.', 'Deal agreed for next year.'), 'good'); autosave(); } render(); };
ACT.mfrWorks = (el) => { const e = Mfr.askWorks(G, el.dataset.id); if (e) toast(e, 'bad'); else { toast(byLang('Parceria de fábrica fechada!', 'Works partnership agreed!'), 'good'); autosave(); } render(); };
ACT.mfrBreak = () => { const e = Mfr.breakContract(G); if (e) toast(e, 'bad'); else { toast(byLang('Contrato rescindido: escolha o motor do ano que vem.', 'Deal terminated: choose next year’s engine.'), 'good'); autosave(); } render(); };

NAV.splice(NAV.findIndex(n => n[0] === 'dev') + 1, 0, ['facilities', 'Sede e fábrica', 'M3 21h18M5 21V10l5-3v4l5-3v4l4-2v11M9 17h2m4 0h2']);
NAV.splice(NAV.findIndex(n => n[0] === 'owners') + 1, 0, ['manufacturers', 'Fabricantes', 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z']);
MANAGER_ONLY.add('facilities');
