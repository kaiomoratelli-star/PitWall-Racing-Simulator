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
