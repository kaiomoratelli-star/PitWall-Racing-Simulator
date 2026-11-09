/* ============================================================
   PIT WALL — migrações de save
   Cada versão nova do jogo adiciona um passo aqui. Saves antigos
   são atualizados ao carregar, sem perder temporadas ou históricos.
   ============================================================ */
'use strict';

const SAVE_VERSION = 7;

/* calendário padrão das versões até a 0.8.1 (temporada 2026 como foi disputada): só ele é trocado pelo oficial de 2027 */
const MIGRATE_OLD_CAL = 'melbourne,shanghai,suzuka,miami,montreal,monaco,catalunya,spielberg,silverstone,spa-francorchamps,hungaroring,zandvoort,monza,madring,baku,sepang,marina-bay,austin,mexico-city,interlagos,las-vegas,lusail,yas-marina';
const Migrate = {
  steps: {
    // v6 -> v7 (v0.8.2): uma pessoa = um registro, grid real (veteranos ativos), calendário oficial de 2027,
    // datas corrigidas das categorias e economia com receitas, fábrica, teto auditado e patrimônio
    6: (G) => {
      Migrate.v7(G);
    },
    // v5 -> v6 (v0.8): identidade das equipes por temporada (ex.: Gucci Racing Alpine em 2027),
    // modos de pneu e de energia separados (a corrida em andamento converte o modo antigo sozinha)
    5: (G) => {
      if (G.season && typeof Identity !== 'undefined') Identity.apply(G, G.season.year);
      // IndyCar e WEC passam a ser simuladas (a Fórmula E já era)
      if (typeof Cats !== 'undefined' && G.cats) { const add = ['indycar', 'wec', 'f4uae', 'f4de', 'f1a', 'dtm', 'stockcar', 'nascup'].filter(id => !G.cats.byId[id]); if (add.length) Cats.init(G, add); }
      // base de pilotos reais (ligação à carreira real e pilotos de outras séries)
      if (typeof DriverDB !== 'undefined' && !G.driverDbDone) DriverDB.init(G);
      if (typeof Circuits !== 'undefined') Circuits.addReal(G.db);
      if (typeof Disc !== 'undefined') Disc.init(G);
      if (typeof Kart !== 'undefined') Kart.init(G);
      if (typeof MarketPlus !== 'undefined') MarketPlus.init(G);
      Potential.state(G);
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
  OLD_CAL: MIGRATE_OLD_CAL,
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

/* passo v6 -> v7 em funções separadas (cada parte é segura sozinha) */
Migrate.v7 = (G) => {
  const y = G.season ? G.season.year : 2027;
  const first = y === (G.db.rules.startYear || 2027);
  if (typeof Cats !== 'undefined') Cats._ids = null;
  // 1) pilotas geradas da F1 Academy com id do nome masculino sorteado
  if (typeof Persons !== 'undefined' && typeof Cats !== 'undefined') {
    const ids = new Set(G.db.drivers.map(d => d.id));
    G.db.drivers.filter(d => d.regen && d.gender === 'F' && d.id.startsWith('c-') && d.id.replace(/x+$/, '') !== 'c-' + Cats.norm(d.name).replace(/ /g, '-').slice(0, 30)).forEach(d => {
      let id = 'c-' + Cats.norm(d.name).replace(/ /g, '-').slice(0, 30);
      while (ids.has(id)) id += 'x';
      ids.add(id);
      const old = d.id; d.id = id;
      Persons.walk(G, old, id, new Set([d]));
    });
  }
  // 2) uma pessoa, um registro (os apelidos do DriverDB ajudam a reconhecer a mesma pessoa)
  if (typeof DriverDB !== 'undefined' && DriverDB.applyDdb) DriverDB.applyDdb(G, { fixAge: false });
  if (typeof Persons !== 'undefined') Persons.dedupe(G);
  // 3) veteranos aposentados pela regra antiga ao criar a carreira (ainda na primeira temporada)
  if (first) G.db.drivers.forEach(d => {
    if (!d.retired || d.dead || d.quit || d.retiredYear !== y || d.team) return;
    const r26 = (d.realSeasons || []).filter(s => s[0] === 2026);
    if (!r26.length) return;
    d.retired = false; delete d.retiredYear;
    d.series = r26[0][1]; d.seriesTeam = r26[0][2] || null; d.seriesStatus = r26[0][4] || null;
    (G.persons = G.persons || { merged: [], renamed: [] }).reactivated = ((G.persons.reactivated) || []).concat([d.id]);
  });
  if (G.persons && G.persons.reactivated && G.persons.reactivated.length) Career.record(G, 'decisao', byLang(`Base de dados: ${G.persons.reactivated.length} pilotos ativos em 2026 tinham sido aposentados por engano na criação da carreira e voltaram ao universo.`, `Database: ${G.persons.reactivated.length} drivers active in 2026 had been retired by mistake when the career was created and are back in the universe.`));
  // 4) calendário oficial de 2027 (só se o calendário ainda for o padrão antigo; calendários editados ficam)
  if (typeof Circuits !== 'undefined' && (G.db.calendar || []).join(',') === Migrate.OLD_CAL) {
    if (Circuits.applyOfficial(G.db) && G.season && G.season.round === 0 && !G.weekend && first) {
      G.season.calendar = G.db.calendar.slice();
      G.today = null; G.todayYear = null;
      if (typeof Cats !== 'undefined' && Cats.on(G) && Cats.list(G, true).every(c => !c.season || c.season.next === 0)) Cats.startSeason(G, y);
    }
  }
  // 5) categorias: datas da Fórmula E e nomes de equipe corrigidos na importação
  if (G.cats && typeof REAL_CATS !== 'undefined') REAL_CATS.cats.forEach(C => {
    const cat = G.cats.byId[C.id]; if (!cat) return;
    if (cat.baseCal && C.calendar && cat.baseCal.length === C.calendar.length) cat.baseCal.forEach((e, i) => { e.date = C.calendar[i].date; });
    (cat.teams || []).forEach(t => { const r = C.teams.find(x => x.id === t.id); if (r && r.name !== t.name) t.name = r.name; });
  });
  // 6) economia: receitas, aporte dos donos, patrimônio
  if (typeof Econ !== 'undefined') {
    G.db.teams.forEach(t => { if (t.ownerFunding == null) t.ownerFunding = Econ.OWNER[t.id] ?? 30; if (t.corporate == null) t.corporate = 0; t.budget = Math.round(Econ.revenue(G, t).total); });
    if (G.finances) {
      if (G.finances.corporate == null) G.finances.corporate = 0;
      if (!G.finances.season && G.season) {
        const S = { year: y, byCat: {}, inc: 0, exp: 0 };
        (G.finances.ledger || []).filter(x => x.year === y).forEach(x => { S.byCat[x.cat] = +((S.byCat[x.cat] || 0) + x.amount).toFixed(3); if (x.amount > 0) S.inc += x.amount; else S.exp += x.amount; });
        G.finances.season = S;
      }
    }
  }
};
