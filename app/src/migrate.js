/* ============================================================
   PIT WALL — migrações de save
   Cada versão nova do jogo adiciona um passo aqui. Saves antigos
   são atualizados ao carregar, sem perder temporadas ou históricos.
   ============================================================ */
'use strict';

const SAVE_VERSION = 2;

const Migrate = {
  steps: {
    // v1 (primeira versão web) -> v2 (desktop + memória do universo)
    1: (G) => {
      G.mode = G.mode || 'manager';
      G.log = G.log || [];
      G.archive = G.archive || [];
      G.db.drivers.forEach(d => { d.history = d.history || []; d.career = d.career || { starts: 0, wins: 0, podiums: 0, poles: 0, titles: 0, points: 0 }; });
      G.db.teams.forEach(t => { t.history = t.history || []; });
      AI.init(G);
      // temporadas encerradas antes da v2 viram registros resumidos
      (G.history || []).forEach(h => Career.record(G, 'titulo', `${h.year}: ${h.championName} campeão de pilotos; ${h.constructorName} campeã de construtores.`, { year: h.year }));
    },
  },
  run(G) {
    const from = G.version || 1;
    const done = [];
    for (let v = from; v < SAVE_VERSION; v++) {
      if (!Migrate.steps[v]) throw new Error(`Sem migração do save v${v} para v${v + 1}`);
      Migrate.steps[v](G);
      G.version = v + 1;
      done.push(`v${v}→v${v + 1}`);
    }
    if (G.version > SAVE_VERSION) throw new Error(`Este save é de uma versão mais nova do jogo (v${G.version}). Atualize o Pit Wall.`);
    return done;
  },
};
