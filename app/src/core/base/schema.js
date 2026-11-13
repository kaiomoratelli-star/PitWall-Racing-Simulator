/* ============================================================
   PIT WALL — esquema do save (0.8.7)
   A lista de TODOS os campos de primeiro nível do estado do jogo (G), com o tipo e quem cria.
   - Schema.check(G): confere um save depois da migração (ao carregar) e antes de gravar.
     Devolve { fatal, errors, warnings }. "fatal" = o save não pode ser usado (faltam peças centrais);
     "errors" = dados incoerentes que o jogo ainda consegue rodar; "warnings" = campos fora do esquema.
   - Schema.repair(G): conserta só o que é seguro (listas de registro que faltam). Não muda nada num save saudável.
   Regra para código novo: campo novo em G precisa entrar em Schema.FIELDS (o teste schema-check falha
   se aparecer um campo sem registro).
   ============================================================ */
'use strict';

const Schema = {
  // tipo: 'number' | 'string' | 'boolean' | 'array' | 'object'; null = pode ser nulo; lazy = criado só quando o sistema é usado
  FIELDS: {
    version: { t: 'number', by: 'Career.create / Migrate' },
    seed: { t: 'number', by: 'Career.create' },
    createdAt: { t: 'number', by: 'Career.create' },
    savedAt: { t: 'number', null: true, by: 'Store.saveGame' },
    rngState: { t: 'number', null: true, by: 'Store.saveGame' },
    mode: { t: 'string', by: 'Career.create', one: ['manager', 'observer'] },
    pack: { t: 'object', null: true, by: 'Career.create / Migrate (Pacote de dados de origem; null = mundo fictício)' },
    player: { t: 'object', by: 'Career.create' },
    options: { t: 'object', by: 'Career.create' },
    db: { t: 'object', by: 'Career.create (base de dados do universo)' },
    season: { t: 'object', by: 'Career.create / Career.endSeason' },
    finances: { t: 'object', by: 'Career.create / Econ' },
    log: { t: 'array', by: 'Career.log' },
    archive: { t: 'array', by: 'Career (registro de anos passados)' },
    history: { t: 'array', by: 'Career.endSeason' },
    sponsors: { t: 'array', by: 'Career.create' },
    projects: { t: 'array', by: 'RnD' },
    nextYearFocus: { t: 'number', by: 'RnD' },
    nextYearBank: { t: 'number', by: 'RnD' },
    board: { t: 'object', by: 'Career.create' },
    inbox: { t: 'array', by: 'Career.mail' },
    news: { t: 'array', by: 'Career.news / Media' },
    weekend: { t: 'object', null: true, by: 'Career.startWeekend' },
    lastRace: { t: 'object', null: true, by: 'Career.finishWeekend' },
    staffMarket: { t: 'array', by: 'Staff' },
    juniorPool: { t: 'array', by: 'Market' },
    seq: { t: 'number', by: 'Career (ids)' },
    circ: { t: 'object', by: 'Circuits' },
    academies: { t: 'array', by: 'Academy' },
    sisters: { t: 'object', by: 'Sisters' },
    sisterInfo: { t: 'object', by: 'Sisters' },
    market: { t: 'object', by: 'Market' },
    cats: { t: 'object', null: true, by: 'Cats (outras categorias)' },
    driverDbDone: { t: 'object', null: true, by: 'DriverDB' },
    ddbConflicts: { t: 'array', by: 'DriverDB' },
    persons: { t: 'object', by: 'People' },
    kart: { t: 'object', by: 'Kart' },
    backingDone: { t: 'boolean', by: 'Market (patrocínio pessoal)' },
    seriesBase: { t: 'object', by: 'Cats' },
    owners: { t: 'object', by: 'Owners' },
    mfr: { t: 'object', by: 'Mfr (fabricantes)' },
    today: { t: 'string', by: 'Time' },
    todayYear: { t: 'number', by: 'Time' },
    // criados quando o sistema é usado pela primeira vez
    pendingPracticeBonus: { t: 'number', lazy: true, by: 'Practice' },
    trackRecords: { t: 'object', lazy: true, by: 'Career (recordes)' },
    partners: { t: 'object', lazy: true, by: 'Owners (parcerias)' },
    partnerAsk: { t: 'object', lazy: true, by: 'Owners (pedidos de parceria)' },
    memory: { t: 'object', lazy: true, by: 'Stories (memória)' },
    social: { t: 'array', lazy: true, by: 'Social' },
    council: { t: 'object', lazy: true, by: 'Council' },
    scout: { t: 'object', lazy: true, by: 'Scouting' },
    stories: { t: 'object', lazy: true, by: 'Stories' },
    chaos: { t: 'object', lazy: true, by: 'Chaos' },
    chem: { t: 'object', lazy: true, by: 'People (química)' },
    mates: { t: 'object', lazy: true, by: 'People (companheiros)' },
    _prevLeader: { t: 'string', lazy: true, null: true, by: 'Media (líder anterior)' },
    gridPenalties: { t: 'object', lazy: true, null: true, by: 'Parts / SL (punições de grid)' },
    carRef: { t: 'object', lazy: true, by: 'CarDev' },
    offersThisRound: { t: 'object', lazy: true, by: 'Market' },
    seatDelta: { t: 'object', lazy: true, by: 'Setup' },
    parts: { t: 'array', lazy: true, by: 'Parts' },
    staffConflict: { t: 'object', lazy: true, null: true, by: 'People' },
    atrPool: { t: 'object', lazy: true, by: 'Regs (ATR)' },
    capBreaches: { t: 'array', lazy: true, by: 'Econ (teto de gastos)' },
    devDone: { t: 'array', lazy: true, by: 'CarDev' },
    memorial: { t: 'array', lazy: true, by: 'Events (memorial)' },
    nextYearParts: { t: 'object', lazy: true, by: 'RnD' },
    promises: { t: 'array', lazy: true, by: 'Talks (promessas)' },
    staffBoost: { t: 'object', lazy: true, null: true, by: 'Staff' },
    teamPolicy: { t: 'object', lazy: true, null: true, by: 'Orders (piloto nº 1)' },
    teamSetup: { t: 'object', lazy: true, null: true, by: 'Owners (equipe nova)' },
  },
};

Schema.typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
Schema.finite = (x) => typeof x === 'number' && isFinite(x);

Schema.check = (G) => {
  const fatal = [], errors = [], warnings = [];
  if (!G || typeof G !== 'object') return { fatal: ['o arquivo não tem um jogo salvo'], errors, warnings };
  // campos de primeiro nível
  Object.entries(Schema.FIELDS).forEach(([k, f]) => {
    const v = G[k]; const ty = Schema.typeOf(v);
    if (v === undefined) { if (!f.lazy) (['db', 'season', 'player'].includes(k) ? fatal : errors).push(`falta o campo ${k}`); return; }
    if (ty === 'null') { if (!f.null) errors.push(`${k} está vazio (null)`); return; }
    if (ty !== f.t) (['db', 'season', 'player'].includes(k) ? fatal : errors).push(`${k} é ${ty}, esperado ${f.t}`);
    else if (f.t === 'number' && !isFinite(v)) errors.push(`${k} = ${v}`);
    if (f.one && !f.one.includes(v)) errors.push(`${k} = "${v}" (esperado ${f.one.join(' ou ')})`);
  });
  Object.keys(G).forEach(k => { if (!Schema.FIELDS[k]) warnings.push(`campo ${k} fora do esquema`); });
  if (typeof SAVE_VERSION !== 'undefined' && Schema.finite(G.version) && G.version > SAVE_VERSION) fatal.push(`save da versão ${G.version}, mais nova que este jogo (${SAVE_VERSION})`);
  if (fatal.length) return { fatal, errors, warnings };
  // universo
  const db = G.db;
  ['teams', 'drivers', 'tracks'].forEach(k => { if (!Array.isArray(db[k])) fatal.push(`db.${k} não é uma lista`); });
  if (fatal.length) return { fatal, errors, warnings };
  if (!db.teams.length) fatal.push('nenhuma equipe no universo');
  const teamIds = new Set(); db.teams.forEach(t => { if (!t || !t.id) errors.push('equipe sem id'); else if (teamIds.has(t.id)) errors.push(`equipe ${t.id} repetida`); else teamIds.add(t.id); });
  const drvIds = new Set(); let badRef = 0;
  db.drivers.forEach(d => {
    if (!d || !d.id) { errors.push('piloto sem id'); return; }
    if (drvIds.has(d.id)) errors.push(`piloto ${d.id} repetido`); drvIds.add(d.id);
    if (d.team && !teamIds.has(d.team)) badRef++;
  });
  if (badRef) errors.push(`${badRef} piloto(s) ligados a equipes que não existem`);
  // temporada
  const s = G.season;
  if (!Schema.finite(s.year)) fatal.push('temporada sem ano');
  if (!Array.isArray(s.calendar) || !s.calendar.length) fatal.push('temporada sem calendário');
  if (!Array.isArray(s.results)) fatal.push('temporada sem resultados');
  if (fatal.length) return { fatal, errors, warnings };
  if (!Schema.finite(s.round) || s.round < 0 || s.round > s.calendar.length) errors.push(`etapa ${s.round} fora do calendário (${s.calendar.length} etapas)`);
  if (s.results.length > s.calendar.length) errors.push(`${s.results.length} resultados para ${s.calendar.length} etapas`);
  ['standD', 'standC'].forEach(k => { if (!s[k] || typeof s[k] !== 'object') errors.push(`temporada sem ${k}`); else Object.entries(s[k]).forEach(([id, p]) => { if (!Schema.finite(p)) errors.push(`${k}.${id} = ${p}`); }); });
  // jogador
  if (G.mode === 'manager' && !teamIds.has(G.player.teamId)) fatal.push(`a equipe do jogador (${G.player.teamId}) não existe`);
  // dinheiro
  if (G.finances) ['balance', 'spent'].forEach(k => { if (G.finances[k] != null && !Schema.finite(G.finances[k])) errors.push(`finanças.${k} = ${G.finances[k]}`); });
  db.teams.forEach(t => Object.entries(t.car || {}).forEach(([k, v]) => { if (typeof v === 'number' && !isFinite(v)) errors.push(`carro ${t.id}.${k} = ${v}`); }));
  return { fatal, errors, warnings };
};

// conserta só o que é seguro: listas de registro que faltam (caixa de entrada, notícias, registro, arquivo, histórico).
// Objetos de sistemas NÃO são criados vazios: vários sistemas só se inicializam quando o campo não existe.
Schema.SAFE_LISTS = ['log', 'inbox', 'news', 'archive', 'history'];
Schema.repair = (G) => {
  const done = [];
  if (!G || typeof G !== 'object') return done;
  Schema.SAFE_LISTS.forEach(k => { if (G[k] === undefined || G[k] === null) { G[k] = []; done.push(k); } });
  return done;
};
