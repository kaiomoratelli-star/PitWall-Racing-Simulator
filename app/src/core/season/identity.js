/* ============================================================
   PIT WALL — identidade das equipes por temporada
   Nome esportivo, nome completo, title partner, patrocinadores e cores
   mudam ao longo dos anos; o histórico das temporadas anteriores fica
   preservado em t.identityHistory (e nos registros já gravados).
   Dados curados à mão a partir de anúncios oficiais, com fonte, data
   de verificação e status de cada campo (confirmado / provisório).
   ============================================================ */
'use strict';

const Identity = {};
// (0.9, regra 19) as identidades (nome, patrocinadores, notícia) são dado do mundo real: ficam no Pacote de dados
// (REAL_EXTRA.identities), para o mundo fictício trocar os nomes junto. Sem pacote, nenhuma equipe muda de identidade.
Identity.season = () => (typeof REAL_EXTRA !== 'undefined' && REAL_EXTRA.identities) || {};

/* aplica a identidade vigente no ano; guarda a anterior no histórico da equipe */
Identity.apply = (G, year) => {
  G.db.teams.forEach(t => {
    if (t.rebranded) return;   // identidade escolhida pela dona da equipe
    const byYear = Identity.season()[t.id];
    if (!byYear) return;
    const ys = Object.keys(byYear).map(Number).filter(y => y <= year).sort((a, b) => a - b);
    if (!ys.length) return;
    const y = ys[ys.length - 1];
    const id = byYear[y];
    if (t.identityYear === y) return;
    t.identityHistory = t.identityHistory || [];
    t.identityHistory.push({ until: y - 1, name: t.name, fullName: t.fullName, sponsors: (t.sponsors || []).slice(), color: t.color, color2: t.color2 });
    if (id.name) t.name = id.name;
    if (id.fullName) t.fullName = id.fullName;
    if (id.color) t.color = id.color;
    if (id.color2) t.color2 = id.color2;
    t.sponsors = [...new Set([...(id.sponsorsAdd || []), ...(t.sponsors || []).filter(s => !(id.sponsorsRemove || []).includes(s))])];
    t.titleSponsor = id.titleSponsor || null;
    t.identityYear = y;
    t.identitySource = { source: id.source, verified: id.verified, status: id.status };
    if (typeof Career !== 'undefined' && G.season) {
      Career.record(G, 'decisao', `${t.fullName}: nova identidade a partir de ${y}${id.ended ? ` (fim do title partnership da ${id.ended})` : ''}.`, { teams: [t.id], year: y });
      if (id.news) Career.news(G, id.news.title, 'mercado', id.news.body, { teams: [t.id], main: true });
    }
  });
};
/* nome da equipe numa temporada passada (para tabelas históricas) */
Identity.nameIn = (t, year) => {
  const h = (t.identityHistory || []).find(x => year <= x.until);
  return h ? h.name : t.name;
};
