/* ============================================================
   PIT WALL — carreira real (DRIVER_DB) na página do piloto e a série
   atual dos pilotos que correm fora das categorias simuladas.
   ============================================================ */
'use strict';

const STATUS_LBL = { disputou: 'disputou', inscrito: 'inscrito', 'anunciado (lista provisória)': 'anunciado (provisório)' };
function realCareerHtml(d) {
  if (!d || !d.realSeasons || !d.realSeasons.length) return '';
  const rows = d.realSeasons.slice().reverse().map(([y, s, team, pos, st, pts, w]) => `<tr><td class="num">${y}</td><td>${esc(DriverDB.seriesName(s))}</td><td class="small">${esc(team || '—')}</td><td class="r num">${pos ? pos + 'º' : '—'}</td><td class="r num">${pts != null ? pts : '—'}</td><td class="r num">${w || ''}</td><td class="small muted">${esc(STATUS_LBL[st] || st || '')}</td></tr>`).join('');
  return `<div class="stack" style="gap:6px"><div class="row between"><h4>Carreira real</h4><span class="small muted">Wikipedia e Wikidata · verificado em ${esc(DRIVER_DB.meta.verified)}</span></div>
    <div class="tbl-wrap" style="max-height:260px;overflow:auto"><table class="tbl"><thead><tr><th>Ano</th><th>Série</th><th>Equipe</th><th class="r">Pos.</th><th class="r">Pts</th><th class="r">Vit.</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
const _driverPageDb = ACT.driverPage;
ACT.driverPage = (el) => {
  _driverPageDb(el);
  const d = G && Career.driver(G, el.dataset.id);
  const box = $('#modal .panel-b');
  if (!d || !box || typeof DriverDB === 'undefined') return;
  const top = $('#modal .driver-card-top .small.muted');
  if (d.series && top) top.insertAdjacentHTML('afterend', `<div class="small"><span class="chip">${esc(DriverDB.seriesName(d.series))}</span> ${esc(d.seriesTeam || '')}</div>`);
  if (d.seatStatus && top) top.insertAdjacentHTML('afterend', `<div class="small muted">Assento em ${d.seatStatus.y}: ${esc(d.seatStatus.status)}</div>`);
  box.insertAdjacentHTML('beforeend', realCareerHtml(d));
};
/* série atual para quem corre fora das categorias simuladas */
function seriesLabel(d) { return d && d.series && typeof DriverDB !== 'undefined' ? `${DriverDB.seriesName(d.series)}${d.seriesTeam ? ' · ' + d.seriesTeam : ''}` : null; }
