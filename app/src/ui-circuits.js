/* ============================================================
   PIT WALL — licenças de circuito na interface
   - Página do circuito: grau e validade da licença (lista oficial da FIA
     de 04/11/2026 ou renovação simulada no jogo) e, para circuitos criados
     no jogo, a checagem básica (nunca "homologação").
   - Editor de calendário: licença de cada etapa na data da corrida e a
     lista de circuitos reserva.
   - Gerador de circuitos: checagem básica ao vivo.
   ============================================================ */
'use strict';

/* licença sem carreira aberta (editor da base): só a lista oficial */
function circLic(id) {
  if (G && G.db) return Circuits.lic(G, id);
  const f = Circuits.fia(id);
  return f ? { grade: f.grade, expiry: f.expiry, src: 'fia' } : { grade: null, src: 'none', note: Circuits.NOTE[id] || null };
}
function fmtDay(iso) { return iso ? iso.split('-').reverse().join('/') : '—'; }
function licChip(L, date) {
  if (!L.grade) return `<span class="chip">${byLang('sem licença', 'no licence')}</span>`;
  const ok = !date || (L.expiry && L.expiry >= date);
  const g = L.grade === '1' ? byLang('Grau 1', 'Grade 1') : byLang(`Grau ${L.grade}`, `Grade ${L.grade}`);
  return `<span class="chip ${L.grade === '1' && ok ? 'good' : 'warn'}">${g} · ${byLang('até', 'until')} ${fmtDay(L.expiry)}</span>`;
}
function licSrc(L) {
  if (L.src === 'fia') return byLang(`Lista oficial da FIA de ${fmtDay(Circuits.listDate())}`, `Official FIA list of ${fmtDay(Circuits.listDate())}`);
  if (L.src === 'f1') return byLang(`Calendário oficial da F1: licença de Grau 1 (não aparece na lista da FIA de ${fmtDay(Circuits.listDate())})`, `Official F1 calendar: Grade 1 licence (not on the FIA list of ${fmtDay(Circuits.listDate())})`);
  if (L.src === 'sim') return byLang(`${L.upgrade ? 'Obras e licença' : 'Renovação'} simulada pelo jogo (${L.since}) — não é decisão real da FIA`, `${L.upgrade ? 'Works and licence' : 'Renewal'} simulated by the game (${L.since}) — not a real FIA decision`);
  return L.note || (L.generated ? byLang('Circuito criado no jogo', 'Circuit created in the game') : byLang(`Não consta na lista oficial de ${fmtDay(Circuits.listDate())}`, `Not on the official list of ${fmtDay(Circuits.listDate())}`));
}
function checkHtml(t) {
  return `<ul class="checks">${Circuits.check(t).map(c => `<li class="${c.ok ? 'pos' : 'neg'}">${c.ok ? '✓' : '✗'} ${esc(c.txt)}</li>`).join('')}</ul>
    <p class="small muted">${byLang('Checagem básica do jogo, inspirada nas diretrizes da FIA para circuitos novos. Não é homologação nem licença real.', 'Basic in-game check, inspired by FIA guidelines for new circuits. Not a real homologation or licence.')}</p>`;
}

/* página do circuito */
(function () {
  const h = SCREENS.circuit.html;
  SCREENS.circuit.html = function () {
    const html = h.call(this);
    const tr = Career.track(G, UI.params.id) || G.db.tracks[0];
    const L = circLic(tr.id);
    const i = G.season.calendar.indexOf(tr.id);
    const date = i >= 0 ? Time.raceDate(G, i) : null;
    const panel = `<div class="panel"><div class="panel-h"><h3>${byLang('Licença do circuito', 'Circuit licence')}</h3>${licChip(L, date)}</div><div class="panel-b stack" style="gap:6px">
      <div class="small">${esc(licSrc(L))}</div>
      ${date ? `<div class="small">${byLang('Corrida de', 'Race of')} ${G.season.year}: ${esc(Time.fmt(date))} — ${Circuits.validOn(G, tr.id, date) ? byLang('licença válida na data', 'licence valid on the date') : `<span class="neg">${byLang('licença vence antes da corrida: depende de renovação', 'licence expires before the race: needs renewal')}</span>`}</div>` : ''}
      ${L.width ? `<div class="small muted">${byLang('Largura de referência', 'Reference width')}: ${L.width} m</div>` : ''}
      ${tr.generated ? checkHtml(tr) : ''}
    </div></div>`;
    const k = html.indexOf('<div class="grid g3">');
    return k >= 0 ? html.slice(0, k) + panel + html.slice(k) : html + panel;
  };
})();

/* editor de calendário: licenças e reservas */
(function () {
  const ec = edCalendar;
  edCalendar = function (db) {
    const base = ec(db);
    if (typeof FIA_CIRCUITS === 'undefined') return base;
    const year = G && ED.target === 'career' ? G.season.year + 1 : db.rules.startYear;
    const dateOf = (t) => (t.date ? `${year}-${t.date.slice(5)}` : `${year}-12-31`);
    const valid = (t) => { const L = circLic(t.id); return L.grade === '1' && L.expiry && L.expiry >= dateOf(t); };
    const inCal = db.calendar.map(id => db.tracks.find(t => t.id === id)).filter(Boolean);
    const reserves = db.tracks.filter(t => !db.calendar.includes(t.id) && valid(t));
    return base + `<div class="stack" style="margin-top:16px">
      <div class="panel"><div class="panel-h"><h3>${byLang('Licenças das etapas', 'Licences of the rounds')} (${year})</h3><span class="small muted">${byLang('a F1 exige Grau 1 válido na data da corrida', 'F1 requires a valid Grade 1 on race day')}</span></div><div class="panel-b tight tbl-wrap"><table class="tbl"><tbody>
        ${inCal.map(t => { const L = circLic(t.id); return `<tr><td>${esc(t.gp)}<div class="small muted">${esc(licSrc(L))}</div></td><td class="r" style="white-space:normal">${licChip(L, dateOf(t))}${valid(t) ? '' : `<div class="small neg">${byLang('precisa renovar antes da corrida', 'needs renewal before the race')}</div>`}</td></tr>`; }).join('')}
      </tbody></table></div></div>
      <div class="panel"><div class="panel-h"><h3>${byLang('Circuitos reserva', 'Reserve circuits')}</h3><span class="small muted">${byLang('fora do calendário, com Grau 1 válido', 'outside the calendar, with a valid Grade 1')}</span></div><div class="panel-b tight tbl-wrap"><table class="tbl"><tbody>
        ${reserves.map(t => `<tr><td>${esc(t.gp)}<div class="small muted">${esc(t.circuit)} · ${natTag(t.country)}</div></td><td class="r">${licChip(circLic(t.id))}</td></tr>`).join('') || `<tr><td class="muted">${byLang('Nenhum circuito reserva disponível.', 'No reserve circuit available.')}</td></tr>`}
      </tbody></table><p class="small muted" style="padding:8px 12px">${byLang('Se uma etapa ficar sem licença na virada da temporada, o jogo coloca um reserva no lugar (de preferência da mesma região). Fonte das licenças atuais: lista oficial da FIA; renovações futuras são simuladas.', 'If a round has no licence at the season change, the game puts a reserve in its place (preferably from the same region). Current licences: official FIA list; future renewals are simulated.')}</p></div></div>
    </div>`;
  };
})();

/* gerador: checagem básica ao vivo */
(function () {
  const gp = ACT.genPreview;
  ACT.genPreview = () => {
    gp();
    const box = $('#gn-info');
    if (box && UI.genTrack) box.innerHTML += `<div style="margin-top:8px">${checkHtml(UI.genTrack)}</div>`;
  };
})();

/* ---------- tela: circuitos e licenças (todas as pistas, grau, validade e vistorias) ---------- */
NAV.splice(NAV.findIndex(n => n[0] === 'seasons'), 0, ['circuits', 'Circuitos e licenças', 'M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0zm4 0h8M12 8v8']);
SCREENS.circuits = {
  html() {
    const S = Circuits.state(G);
    const y = G.season.year;
    const f = UI.params.g || 'all';
    const cal = new Set(G.season.calendar);
    const rows = G.db.tracks.map(t => ({ t, L: Circuits.lic(G, t.id), date: Circuits.dateFor(G, t.id, y) }))
      .filter(x => f === 'all' || (f === '1' ? x.L.grade === '1' : f === '2' ? x.L.grade === '2' : f === 'cal' ? cal.has(x.t.id) : !x.L.grade || !['1', '2'].includes(x.L.grade)))
      .sort((a, b) => (cal.has(b.t.id) ? 1 : 0) - (cal.has(a.t.id) ? 1 : 0) || String(a.L.grade || '9').localeCompare(String(b.L.grade || '9')) || a.t.circuit.localeCompare(b.t.circuit));
    const hist = (S.hist || []).slice().reverse();
    const lastInsp = (id) => hist.find(h => h.id === id);
    const n1 = G.db.tracks.filter(t => Circuits.lic(G, t.id).grade === '1').length, n2 = G.db.tracks.filter(t => Circuits.lic(G, t.id).grade === '2').length;
    const promoted = hist.filter(h => h.ok);
    const seg = [['all', 'Todos'], ['cal', 'No calendário'], ['1', 'Grau 1'], ['2', 'Grau 2'], ['other', 'Outros']].map(([k, l]) => `<button class="${f === k ? 'on' : ''}" data-act="go" data-v="circuits" data-p='{"g":"${k}"}'>${l}</button>`).join('');
    return `<div class="page-head"><div><div class="eyebrow">FIA · licenças de circuito</div><h1>Circuitos e licenças</h1></div><div class="seg">${seg}</div></div>
      <p class="small muted" style="max-width:980px;margin:-4px 0 14px">A F1 só corre em circuito com licença de Grau 1 válida na data da corrida. Ponto de partida: lista oficial de circuitos licenciados pela FIA de ${fmtDay(Circuits.listDate())}. Todo ano o jogo faz a vistoria dos circuitos de Grau 2: com obras, alguns sobem para o Grau 1 e passam a ser reservas do calendário. Renovações e vistorias depois da data da lista são simulações do jogo, não decisões reais da FIA.</p>
      <div class="grid g4">
        <div class="panel"><div class="panel-b stack"><span class="label">Grau 1</span><span class="stat-big">${n1}</span><span class="small muted">podem receber a F1</span></div></div>
        <div class="panel"><div class="panel-b stack"><span class="label">Grau 2</span><span class="stat-big">${n2}</span><span class="small muted">vistoria anual para o Grau 1</span></div></div>
        <div class="panel"><div class="panel-b stack"><span class="label">Promovidos nesta carreira</span><span class="stat-big">${promoted.length}</span><span class="small muted">${promoted.slice(0, 4).map(h => `${esc((Career.track(G, h.id) || {}).circuit || h.id)} (${h.y})`).join(', ') || 'nenhum ainda'}</span></div></div>
        <div class="panel"><div class="panel-b stack"><span class="label">Vistorias registradas</span><span class="stat-big">${hist.length}</span><span class="small muted">desde o início da carreira</span></div></div>
      </div>
      <div class="panel"><div class="panel-b tight tbl-wrap"><table class="tbl"><thead><tr><th>Circuito</th><th>País</th><th>Licença</th><th>Origem</th><th>Última vistoria</th><th></th></tr></thead><tbody>
        ${rows.map(({ t, L, date }) => { const h = lastInsp(t.id); return `<tr><td><button class="linkbtn" data-act="circuitPage" data-id="${t.id}"><b>${esc(t.circuit)}</b></button>${cal.has(t.id) ? ' <span class="chip acc">calendário</span>' : ''}${t.generated ? ' <span class="chip">criado no jogo</span>' : t.osm ? ' <span class="chip">traçado real</span>' : ''}</td><td>${natTag(t.country)}</td><td>${licChip(L, date)}</td><td class="small muted" style="max-width:320px;white-space:normal">${esc(licSrc(L))}</td><td class="small">${h ? `${h.y}: ${h.ok ? '<span class="pos">aprovado para o Grau 1</span>' : 'mantido no Grau 2'}` : '—'}</td><td></td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">Nenhum circuito.</td></tr>'}
      </tbody></table></div></div>`;
  },
};
Object.assign(I18N_EN, { 'Circuitos e licenças': 'Circuits and licences', 'No calendário': 'On the calendar', 'Outros': 'Others', 'Promovidos nesta carreira': 'Promoted in this career', 'Vistorias registradas': 'Inspections recorded', 'podem receber a F1': 'can host F1', 'vistoria anual para o Grau 1': 'yearly inspection for Grade 1', 'desde o início da carreira': 'since the start of the career', 'Última vistoria': 'Last inspection', 'Origem': 'Source', 'calendário': 'calendar', 'criado no jogo': 'created in game', 'traçado real': 'real layout', 'nenhum ainda': 'none yet', 'mantido no Grau 2': 'kept at Grade 2', 'aprovado para o Grau 1': 'approved for Grade 1', 'Licença': 'Licence', 'FIA · licenças de circuito': 'FIA · circuit licences' });
I18N_PATS.unshift([/^A F1 só corre em circuito com licença de Grau 1 válida na data da corrida\..*$/, 'F1 only races at circuits with a valid Grade 1 licence on race day. Starting point: the official FIA list of licensed circuits. Every year the game inspects the Grade 2 circuits: with works, some move up to Grade 1 and become calendar reserves. Renewals and inspections after the list date are game simulations, not real FIA decisions.']);
