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
    const S = Potential.state(G);
    const P = UI.params;
    const f = { s: P.s || '', n: P.n || '', a: +(P.a || 23), q: P.q || '' };
    const pool = G.db.drivers.filter(d => !d.retired && !d.dead && d.team !== G.player.teamId);
    const keys = [...new Set(pool.map(seriesKey))];
    const label = (k) => (k === 'f1' ? 'Fórmula 1' : k === 'none' ? 'Sem equipe' : Cats.get(G, k) ? Cats.get(G, k).name : typeof DriverDB !== 'undefined' ? DriverDB.seriesName(k) : k);
    const nats = [...new Set(pool.map(d => d.nat))].sort();
    let ds = pool.filter(d => (!f.s || seriesKey(d) === f.s) && (!f.n || d.nat === f.n) && d.age <= f.a && (!f.q || d.name.toLowerCase().includes(f.q.toLowerCase())));
    ds = ds.map(d => ({ d, e: Potential.estimate(G, d) })).sort((x, y) => y.e.mid - x.e.mid).slice(0, 80);
    const cmp = UI.scoutCmp || [];
    const sel = (k, v, opts) => `<select class="inp" style="width:auto" data-chg="scoutF" data-k="${k}">${opts}</select>`;
    return `<div class="page-head"><div><div class="eyebrow">${esc(Career.team(G).name)}</div><h1>Olheiros</h1></div><span class="chip">${S.jobs.length}/${Potential.SLOTS} olheiros em campo</span></div>
      <p class="small muted" style="max-width:980px;margin:-4px 0 14px">O potencial real de um piloto não aparece: os olheiros estimam uma faixa. Ela é larga para quem está no kart ou na F4 e estreita com observação, tempo de pista e resultados. A estimativa pode errar.</p>
      ${S.jobs.length ? `<div class="panel" style="margin-bottom:14px"><div class="panel-h"><h3>Observações em andamento</h3></div><div class="panel-b tight tbl-wrap"><table class="tbl">${S.jobs.map(j => { const d = Career.driver(G, j.did); return `<tr><td>${dTag(j.did)}</td><td class="small muted">${esc(whereOf(d))}</td><td class="small">faltam ${j.left} etapa(s)</td><td class="r"><button class="btn sm ghost" data-act="scoutCancel" data-id="${j.did}">Cancelar</button></td></tr>`; }).join('')}</table></div></div>` : ''}
      <div class="panel"><div class="panel-h" style="flex-wrap:wrap;gap:8px"><h3>Pilotos</h3><div class="row" style="gap:6px">
        ${sel('s', f.s, opt('', 'Todas as séries', f.s) + keys.sort((a, b) => label(a).localeCompare(label(b))).map(k => opt(k, label(k), f.s)).join(''))}
        ${sel('n', f.n, opt('', 'Todas as nacionalidades', f.n) + nats.map(n => opt(n, NAT_NAMES[n] || n, f.n)).join(''))}
        ${sel('a', f.a, [16, 18, 20, 23, 26, 30, 45].map(a => opt(a, `até ${a} anos`, f.a)).join(''))}
        <input class="inp" placeholder="Buscar nome" value="${esc(f.q)}" data-chg="scoutF" data-k="q" style="width:150px">
        ${cmp.length === 2 ? '<button class="btn sm primary" data-act="scoutCompare">Comparar os dois</button>' : `<span class="small muted">Marque 2 para comparar (${cmp.length}/2)</span>`}</div></div>
        <div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th></th><th></th><th>Piloto</th><th class="r">Idade</th><th>Onde corre</th><th class="r">Nota</th><th class="r">Potencial estimado</th><th>Confiança</th><th></th></tr></thead><tbody>
        ${ds.map(({ d, e }) => `<tr><td><input type="checkbox" ${cmp.includes(d.id) ? 'checked' : ''} data-chg="scoutPick" data-id="${d.id}" aria-label="Comparar"></td><td>${headshot(d, 'sm')}</td><td>${dTag(d.id)}<div class="small muted">${natTag(d.nat)}</div></td><td class="r num">${d.age}</td><td class="small">${esc(whereOf(d))}</td><td class="r num">${driverOverall(d)}</td><td class="r num"><b>${e.lo}–${e.hi}</b></td><td class="small ${e.label === 'alta' ? 'pos' : e.label === 'baixa' ? 'muted' : ''}">${e.label}</td>
          <td class="r" style="white-space:nowrap">${S.jobs.some(j => j.did === d.id) ? '<span class="small muted">observando</span>' : `<button class="btn sm" data-act="scoutObserve" data-id="${d.id}" ${S.jobs.length >= Potential.SLOTS ? 'disabled' : ''}>Observar</button>`}${d.age <= 23 && !d.team && !Market.academyOf(G, d) ? ` <button class="btn sm ghost" data-act="acAdd" data-id="${d.id}" title="Contrato de desenvolvimento e apoio financeiro pela academia">Academia</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">Nenhum piloto com esses filtros.</td></tr>'}
        </tbody></table></div></div>
      ${S.reports.length ? `<div class="panel" style="margin-top:14px"><div class="panel-h"><h3>Relatórios recentes</h3></div><div class="panel-b stack">${S.reports.slice(0, 8).map(r => `<div><b>${dTag(r.did)}</b> <span class="small muted">${r.y} · etapa ${r.r}</span><div class="small">Potencial ${r.lo}–${r.hi} (confiança ${r.conf}). Fortes: ${r.best.join(', ')}. A melhorar: ${r.worst.join(', ')}. ${esc(r.rec)}.</div></div>`).join('')}</div></div>` : ''}`;
  },
};
CHG.scoutF = (el) => { go('scout', { ...UI.params, [el.dataset.k]: el.value }); };
CHG.scoutPick = (el) => { const id = el.dataset.id; UI.scoutCmp = (UI.scoutCmp || []).filter(x => x !== id); if (el.checked) UI.scoutCmp = [...UI.scoutCmp, id].slice(-2); render(); };
ACT.scoutObserve = (el) => { const e = Potential.observe(G, el.dataset.id); if (e) return toast(e, 'bad'); toast(`Olheiro enviado: relatório em ${Potential.ROUNDS} etapas.`, 'good'); autosave(); render(); };
ACT.scoutCancel = (el) => { Potential.cancel(G, el.dataset.id); render(); };
ACT.scoutCompare = () => {
  const [a, b] = (UI.scoutCmp || []).map(id => Career.driver(G, id));
  if (!a || !b) return;
  const col = (d) => { const e = Potential.estimate(G, d); const attrs = Object.keys(Potential.ATTR_LABEL).filter(k => d[k] != null); return `<div class="stack" style="gap:6px">${headshot(d, 'lg')}<b>${esc(d.name)}</b><span class="small">${natTag(d.nat)} ${d.age} anos · ${esc(whereOf(d))}</span><dl class="kv"><dt>Nota</dt><dd>${driverOverall(d)}</dd><dt>Potencial</dt><dd>${e.lo}–${e.hi}</dd><dt>Confiança</dt><dd>${e.label}</dd>${attrs.map(k => `<dt>${Potential.ATTR_LABEL[k]}</dt><dd>${Math.round(d[k])}</dd>`).join('')}</dl></div>`; };
  modal('Comparar pilotos', `<div class="grid g2">${col(a)}${col(b)}</div>`);
};
