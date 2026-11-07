/* ============================================================
   PIT WALL — olheiros: observar pilotos de qualquer série, comparar,
   ler relatórios e trazer para a academia. O potencial aparece sempre
   como faixa estimada; a faixa estreita com observação.
   ============================================================ */
'use strict';

NAV.splice(NAV.findIndex(n => n[0] === 'sister') + 1, 0, ['scout', 'Olheiros', 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4-4']);
MANAGER_ONLY.add('scout');

function whereOf(d) {
  if (d.team) return Career.team(G, d.team).name + (d.seat === 'R' ? ' (reserva)' : '');
  if (d.cat && Cats.get(G, d.cat)) return Cats.get(G, d.cat).name;
  if (d.series && typeof DriverDB !== 'undefined') return DriverDB.seriesName(d.series);
  return 'sem equipe';
}
function seriesKey(d) { return d.team ? 'f1' : d.cat || d.series || 'none'; }

SCREENS.scout = {
  html() {
    const S = Scouting.state(G);
    const P = UI.params;
    const tab = P.tab || 'drivers';
    const busy = S.staff.filter(s => s.task).length;
    const tabs = `<div class="seg">${[['drivers', 'Pilotos'], ['staff', 'Olheiros'], ['reports', 'Relatórios']].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="go" data-v="scout" data-p='${JSON.stringify({ ...P, tab: k })}'>${l}</button>`).join('')}</div>`;
    const head = `<div class="page-head"><div><div class="eyebrow">${esc(Career.team(G).name)}</div><h1>Olheiros</h1></div><div class="row"><span class="chip">${busy}/${S.staff.length} olheiros em missão</span>${tabs}</div></div>
      <p class="small muted" style="max-width:980px;margin:-4px 0 14px">O nível real de um piloto nunca aparece: o departamento estima o nível e a faixa de potencial. A estimativa melhora com observação; olheiros melhores e da mesma região do piloto erram menos. Pilotos do kart e da F4 são os mais difíceis de avaliar.</p>`;
    const where = (s) => { const T = s.task; if (!T) return '<span class="muted">livre</span>'; if (T.type === 'driver') { const d = Career.driver(G, T.target); return `observando ${d ? dTag(d.id) : '—'} · ${Math.max(0, 4 - T.races)} etapa(s) para o relatório`; } if (T.type === 'series') return `cobrindo ${esc(T.target === 'f1' ? 'Fórmula 1' : (Cats.get(G, T.target) || {}).name || DriverDB.seriesName(T.target))} · ${T.races} etapa(s)`; return `procurando talentos: ${esc(byLang(Scouting.REGIONS[T.target].name, Scouting.REGIONS[T.target].en))} · ${T.races} etapa(s)`; };
    if (tab === 'staff') {
      const seriesOpts = [['f1', 'Fórmula 1'], ...Cats.list(G).map(c => [c.id, c.name])];
      const regionOpts = Object.entries(Scouting.REGIONS).map(([k, r]) => [k, byLang(r.name, r.en)]);
      const sel = (s) => `<select class="inp" style="width:auto" data-chg="scoutTask" data-id="${s.id}"><option value="">Escolher missão…</option><optgroup label="Cobrir categoria">${seriesOpts.map(([k, l]) => `<option value="series:${k}">${esc(l)}</option>`).join('')}</optgroup><optgroup label="Procurar talentos na região">${regionOpts.map(([k, l]) => `<option value="region:${k}">${esc(l)}</option>`).join('')}</optgroup>${s.task ? '<option value="none">Encerrar a missão</option>' : ''}</select>`;
      return head + `<div class="panel"><div class="panel-h"><h3>Departamento</h3><span class="small muted">${S.staff.length}/${Scouting.MAX} vagas · salários ${fmtMoney(Scouting.payroll(G))}/ano</span></div><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Olheiro</th><th>Região</th><th class="r">Avaliação</th><th class="r">Salário</th><th>Missão</th><th></th></tr></thead><tbody>
        ${S.staff.map(s => `<tr><td><b>${esc(s.name)}</b> <span class="small muted">${natTag(s.nat)}</span></td><td class="small">${esc(byLang(Scouting.REGIONS[s.region].name, Scouting.REGIONS[s.region].en))}</td><td class="r num">${s.judge}</td><td class="r num">${fmtMoney(s.salary)}</td><td class="small">${where(s)}</td><td class="r" style="white-space:nowrap">${sel(s)} <button class="btn sm ghost danger" data-act="scoutFire" data-id="${s.id}">Dispensar</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Nenhum olheiro.</td></tr>'}
        </tbody></table></div></div>
        <div class="panel" style="margin-top:14px"><div class="panel-h"><h3>Mercado de olheiros</h3><span class="small muted">renova a cada temporada · contratação custa meio salário</span></div><div class="panel-b tight tbl-wrap"><table class="tbl">${(S.mkt || []).map(s => `<tr><td><b>${esc(s.name)}</b> <span class="small muted">${natTag(s.nat)}</span></td><td class="small">${esc(byLang(Scouting.REGIONS[s.region].name, Scouting.REGIONS[s.region].en))}</td><td class="r num">avaliação ${s.judge}</td><td class="r num">${fmtMoney(s.salary)}/ano</td><td class="r"><button class="btn sm" data-act="scoutHire" data-id="${s.id}" ${S.staff.length >= Scouting.MAX ? 'disabled' : ''}>Contratar</button></td></tr>`).join('') || '<tr><td class="empty">O mercado abre no fim da temporada.</td></tr>'}</table></div></div>`;
    }
    if (tab === 'reports') {
      return head + (S.reports.length ? `<div class="panel"><div class="panel-b stack">${S.reports.slice(0, 30).map(r => `<div><b>${dTag(r.did)}</b> <span class="small muted">${r.y} · etapa ${r.r}${r.by ? ' · ' + esc(r.by) : ''}</span><div class="small">${r.tier ? `Nível estimado: <b>${esc(r.tier)}</b>. ` : ''}Potencial ${r.lo}–${r.hi} (confiança ${r.conf}). Fortes: ${r.best.join(', ')}. A melhorar: ${r.worst.join(', ')}. ${esc(r.rec)}.</div></div>`).join('')}</div></div>` : '<div class="empty">Nenhum relatório ainda. Mande um olheiro observar um piloto.</div>');
    }
    const f = { s: P.s || '', n: P.n || '', a: +(P.a || 23), q: P.q || '' };
    const pool = G.db.drivers.filter(d => !d.retired && !d.dead && d.team !== G.player.teamId);
    const keys = [...new Set(pool.map(seriesKey))];
    const label = (k) => (k === 'f1' ? 'Fórmula 1' : k === 'none' ? 'Sem equipe' : Cats.get(G, k) ? Cats.get(G, k).name : typeof DriverDB !== 'undefined' ? DriverDB.seriesName(k) : k);
    const nats = [...new Set(pool.map(d => d.nat))].sort();
    let ds = pool.filter(d => (!f.s || seriesKey(d) === f.s) && (!f.n || d.nat === f.n) && d.age <= f.a && (!f.q || d.name.toLowerCase().includes(f.q.toLowerCase())));
    ds = ds.map(d => ({ d, x: Scouting.tierEst(G, d) })).sort((p, q) => q.x.e.mid - p.x.e.mid).slice(0, 80);
    const cmp = UI.scoutCmp || [];
    const sel = (k, v, opts) => `<select class="inp" style="width:auto" data-chg="scoutF" data-k="${k}">${opts}</select>`;
    const watching = (id) => S.staff.some(s => s.task && s.task.type === 'driver' && s.task.target === id);
    return head + `<div class="panel"><div class="panel-h" style="flex-wrap:wrap;gap:8px"><h3>Pilotos</h3><div class="row" style="gap:6px">
        ${sel('s', f.s, opt('', 'Todas as séries', f.s) + keys.sort((a, b) => label(a).localeCompare(label(b))).map(k => opt(k, label(k), f.s)).join(''))}
        ${sel('n', f.n, opt('', 'Todas as nacionalidades', f.n) + nats.map(n => opt(n, NAT_NAMES[n] || n, f.n)).join(''))}
        ${sel('a', f.a, [16, 18, 20, 23, 26, 30, 45].map(a => opt(a, `até ${a} anos`, f.a)).join(''))}
        <input class="inp" placeholder="Buscar nome" value="${esc(f.q)}" data-chg="scoutF" data-k="q" style="width:150px">
        ${cmp.length === 2 ? '<button class="btn sm primary" data-act="scoutCompare">Comparar os dois</button>' : `<span class="small muted">Marque 2 para comparar (${cmp.length}/2)</span>`}</div></div>
        <div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th></th><th></th><th>Piloto</th><th class="r">Idade</th><th>Onde corre</th><th class="r">Nota</th><th>Nível estimado</th><th class="r">Potencial</th><th>Confiança</th><th></th></tr></thead><tbody>
        ${ds.map(({ d, x }) => `<tr><td><input type="checkbox" ${cmp.includes(d.id) ? 'checked' : ''} data-chg="scoutPick" data-id="${d.id}" aria-label="Comparar"></td><td>${headshot(d, 'sm')}</td><td>${dTag(d.id)}<div class="small muted">${natTag(d.nat)}</div></td><td class="r num">${d.age}</td><td class="small">${esc(whereOf(d))}</td><td class="r num">${driverOverall(d)}</td><td class="small"><b>${esc(byLang(x.t.name, x.t.en))}</b> <span style="color:var(--accent)">${Scouting.stars(x.stars)}</span></td><td class="r num">${x.e.lo}–${x.e.hi}</td><td class="small ${x.e.label === 'alta' ? 'pos' : x.e.label === 'baixa' ? 'muted' : ''}">${x.e.label}</td>
          <td class="r" style="white-space:nowrap">${watching(d.id) ? '<span class="small muted">observando</span>' : `<button class="btn sm" data-act="scoutObserve" data-id="${d.id}" ${S.staff.every(s => s.task) ? 'disabled' : ''}>Observar</button>`}${d.age <= 23 && !d.team && Market.academyOf(G, d) !== Market.myAcademy(G) ? ` <button class="btn sm ghost" data-act="acNeg" data-id="${d.id}">Academia</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="10" class="empty">Nenhum piloto com esses filtros.</td></tr>'}
        </tbody></table></div></div>`;
  },
};
CHG.scoutF = (el) => { go('scout', { ...UI.params, [el.dataset.k]: el.value }); };
CHG.scoutPick = (el) => { const id = el.dataset.id; UI.scoutCmp = (UI.scoutCmp || []).filter(x => x !== id); if (el.checked) UI.scoutCmp = [...UI.scoutCmp, id].slice(-2); render(); };
ACT.scoutObserve = (el) => { const e = Potential.observe(G, el.dataset.id); if (e) return toast(e, 'bad'); toast('Olheiro enviado: relatório em 4 etapas.', 'good'); autosave(); render(); };
CHG.scoutTask = (el) => { const [type, target] = el.value.split(':'); if (!el.value) return; Scouting.assign(G, el.dataset.id, type === 'none' ? null : { type, target }); autosave(); render(); };
ACT.scoutHire = (el) => { const e = Scouting.hire(G, el.dataset.id); if (e) return toast(e, 'bad'); toast('Olheiro contratado.', 'good'); autosave(); render(); };
ACT.scoutFire = (el) => { Scouting.fire(G, el.dataset.id); autosave(); render(); };
ACT.scoutCancel = (el) => { Potential.cancel(G, el.dataset.id); render(); };
ACT.scoutCompare = () => {
  const [a, b] = (UI.scoutCmp || []).map(id => Career.driver(G, id));
  if (!a || !b) return;
  const col = (d) => { const x = Scouting.tierEst(G, d), e = x.e; const err = Math.round((1 - e.conf) * 9); const attrs = Object.keys(Potential.ATTR_LABEL).filter(k => d[k] != null); return `<div class="stack" style="gap:6px">${headshot(d, 'lg')}<b>${esc(d.name)}</b><span class="small">${natTag(d.nat)} ${d.age} anos · ${esc(whereOf(d))}</span><dl class="kv"><dt>Nota</dt><dd>${driverOverall(d)}</dd><dt>Nível estimado</dt><dd>${esc(byLang(x.t.name, x.t.en))} ${Scouting.stars(x.stars)}</dd><dt>Potencial</dt><dd>${e.lo}–${e.hi}</dd><dt>Confiança</dt><dd>${e.label}</dd>${attrs.map(k => `<dt>${Potential.ATTR_LABEL[k]}</dt><dd>${err ? `${Math.max(30, Math.round(d[k]) - err)}–${Math.min(99, Math.round(d[k]) + err)}` : Math.round(d[k])}</dd>`).join('')}</dl></div>`; };
  modal('Comparar pilotos', `<div class="grid g2">${col(a)}${col(b)}</div>`);
};
