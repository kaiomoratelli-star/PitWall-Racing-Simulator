/* ============================================================
   PIT WALL — migrações de save
   Cada versão nova do jogo adiciona um passo aqui. Saves antigos
   são atualizados ao carregar, sem perder temporadas ou históricos.
   ============================================================ */
'use strict';

const SAVE_VERSION = 6;

const Migrate = {
  steps: {
    // v5 -> v6 (v0.8): identidade das equipes por temporada (ex.: Gucci Racing Alpine em 2027),
    // modos de pneu e de energia separados (a corrida em andamento converte o modo antigo sozinha)
    5: (G) => {
      if (G.season && typeof Identity !== 'undefined') Identity.apply(G, G.season.year);
      const r = G.weekend && G.weekend.race;
      if (r) r.cars.forEach(c => { c.tyreMode = c.tyreMode || Engine.tyreModeOf(c); c.ersMode = c.ersMode || Engine.ersModeOf(c); });
    },
    // v4 -> v5 (v0.7): treinos com relógio e acerto com memória, classificação ao vivo, relatório da
    // corrida, Conselho da FIA e equipes irmãs
    4: (G) => {
      G.options = G.options || {};
      if (!G.options.practiceFormat) G.options.practiceFormat = 'real';
      // fim de semana no formato antigo (sem treino com relógio): recomeça no novo formato.
      // Se a corrida já tinha começado, ela segue como estava.
      const wk = G.weekend;
      if (wk && !wk.race && (!wk.fp || !wk.setups)) { G.weekend = null; Career.startWeekend(G); }
      if (G.lastRace) G.lastRace.pitLog = G.lastRace.pitLog || [];
      if (typeof Sisters !== 'undefined') Sisters.ensure(G);
      if (typeof Council !== 'undefined') Council.ensure(G);
    },
    // v3 -> v4 (v0.5): outras categorias, imprensa/rede social, recordes de pista
    3: (G) => {
      G.options = G.options || {};
      if (G.options.categories == null) G.options.categories = true;
      G.social = G.social || [];
      G.trackRecords = G.trackRecords || {};
      if (typeof Cats !== 'undefined' && G.options.categories && !G.cats) Cats.init(G);
    },
    // v1 (primeira versão web) -> v2 (desktop + memória do universo)
    // v2 -> v3 (v0.5): atributos novos, personalidade, funcionários, academias, mercado e superlicença
    2: (G) => {
      G.db.drivers.forEach(d => {
        const prof = STYLE_PROFILES[d.style] || STYLE_PROFILES.complete;
        const r = localRng('mig3:' + d.id);
        const base = driverOverall(d);
        NEW_ATTRS.forEach(k => { if (d[k] == null) d[k] = Math.round(clamp(base + (prof[k] || 0) + (r() - 0.5) * 5, 40, 99)); });
        if (!d.personality) d.personality = { ambition: Math.round(clamp(85 - (d.age - 18) * 1.6 + (r() - 0.5) * 20, 15, 99)), loyalty: Math.round(clamp(45 + (d.age - 25) * 1.2 + (r() - 0.5) * 30, 10, 95)), temper: Math.round(clamp((d.aggression || 50) * 0.7 + (r() - 0.5) * 30, 5, 95)), media: 40 };
        d.sl = d.sl || [];
        if (!d.contract && d.team) d.contract = { until: G.season.year + Math.max(0, d.contractYears || 0), salary: d.salary, estimated: true };
      });
      G.db.teams.forEach(t => { t.partnerOf = t.partnerOf || []; if (t.car.cooling == null) t.car.cooling = 80; if (t.car.energy == null) t.car.energy = 80; });
      Regs.ensure(G.db.rules);
      Career.initPeople(G);
    },
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
    return Migrate._run(G);
  },
  _run(G) {
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
