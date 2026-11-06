/* ============================================================
   PIT WALL — base de dados padrão (100% editável no Editor)
   Equipes e pilotos são fictícios; locais das pistas são reais.
   Use o Editor ou importe um JSON para montar o seu próprio grid.
   ============================================================ */
'use strict';

const DB_VERSION = 1;

/* Pneus: offset = segundos em relação ao macio novo; wear = % de desgaste por volta (base) */
const TYRES = {
  S: { id: 'S', name: 'Macio', short: 'MA', color: '#e8384f', offset: 0.0, wear: 3.3, warm: 1 },
  M: { id: 'M', name: 'Médio', short: 'ME', color: '#f5c518', offset: 0.55, wear: 2.25, warm: 2 },
  H: { id: 'H', name: 'Duro', short: 'DU', color: '#eef0f2', offset: 1.05, wear: 1.5, warm: 3 },
  I: { id: 'I', name: 'Intermediário', short: 'IN', color: '#3fbf5f', offset: 0.0, wear: 2.0, warm: 1 },
  W: { id: 'W', name: 'Chuva', short: 'CH', color: '#3d8bfd', offset: 0.0, wear: 1.6, warm: 1 },
};

const DEFAULT_RULES = {
  seriesName: 'Campeonato Mundial de Monopostos',
  sprintPoints: [8, 7, 6, 5, 4, 3, 2, 1],
  sprintDistancePct: 33,
  startYear: 2027,
  points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
  fastestLapPoint: 1,          // 0 desliga
  fastestLapTopN: 10,
  mandatoryTwoCompounds: true,
  budgetCap: 145,              // milhões por temporada (só P&D + operação)
  raceDistancePct: 100,        // encurta as corridas se quiser partidas rápidas
  practiceRuns: 6,             // voltas de ajuste de acerto por piloto
  regulationChangeEvery: 4,    // grande mudança de regulamento a cada N temporadas
  prizePerPosition: [62, 55, 49, 43, 38, 33, 28, 24, 20, 17, 14, 12], // prêmio de fim de temporada (M)
};

const ENGINES = [
  { id: 'valkyr', name: 'Valkyr Power Units', power: 93, reliability: 83, cost: 18 },
  { id: 'solano', name: 'Solano Motori', power: 91, reliability: 87, cost: 17 },
  { id: 'hoshino', name: 'Hoshino Hybrid', power: 90, reliability: 89, cost: 16 },
  { id: 'strom', name: 'Strøm Antrieb', power: 88, reliability: 91, cost: 14 },
  { id: 'tecno', name: 'Tecnomotor', power: 86, reliability: 86, cost: 11 },
];

/* [id, nome, curto, país, cor, cor2, motor, orçamento M, reputação, aero, chassi, confiab, gentileza pneus, pit crew, instalações, chefe] */
const TEAM_ROWS = [
  ['aurora', 'Aurora Racing', 'AUR', 'GBR', '#19b5a5', '#0b3d3a', 'valkyr', 175, 92, 90, 89, 86, 84, 90, 92, 'Helena Marsh'],
  ['solano', 'Solano Corse', 'SOL', 'ITA', '#d6283b', '#f2d03b', 'solano', 170, 94, 89, 90, 82, 80, 86, 90, 'Federico Lanza'],
  ['vantor', 'Vantor Grand Prix', 'VAN', 'AUT', '#2a4bd7', '#ffcf3f', 'hoshino', 172, 90, 91, 88, 85, 82, 93, 91, 'Dietmar Kohl'],
  ['kestrel', 'Kestrel Motorsport', 'KES', 'GBR', '#ff8a1f', '#1b2a44', 'valkyr', 150, 84, 88, 87, 88, 86, 91, 86, 'Andrew Pike'],
  ['meridian', 'Meridian Racing', 'MER', 'USA', '#8f9aa6', '#c8102e', 'strom', 118, 70, 86, 85, 84, 80, 82, 78, 'Grant Holloway'],
  ['ishikawa', 'Ishikawa Racing', 'ISH', 'JPN', '#f2f2f2', '#e60033', 'hoshino', 125, 74, 85, 84, 88, 85, 85, 80, 'Takeshi Ono'],
  ['nordline', 'Nordline F-Team', 'NRD', 'SWE', '#5ad1ff', '#0a2340', 'strom', 112, 68, 85, 84, 86, 88, 80, 76, 'Ingrid Sörensen'],
  ['bravura', 'Bravura Motorsport', 'BRV', 'BRA', '#1fa24a', '#ffd43b', 'tecno', 104, 64, 84, 84, 83, 84, 84, 72, 'Marcos Albuquerque'],
  ['castellan', 'Écurie Castellan', 'CAS', 'FRA', '#2f6bff', '#ff5aa5', 'solano', 108, 69, 84, 83, 81, 79, 79, 77, 'Claire Dumont'],
  ['hartwell', 'Hartwell Engineering', 'HAR', 'GER', '#b9c4cf', '#1d1d1d', 'tecno', 96, 60, 83, 82, 80, 82, 78, 70, 'Wolfgang Reiter'],
];

/* [id, nome, nac, idade, número, overall, potencial, estilo, equipe|null, salário M, fim contrato (offset anos)] */
const DRIVER_ROWS = [
  ['ashcroft', 'Liam Ashcroft', 'GBR', 27, 7, 92, 94, 'complete', 'aurora', 32, 2],
  ['rios', 'Mateo Ríos', 'ESP', 24, 14, 88, 92, 'tyre', 'aurora', 14, 1],
  ['vitali', 'Lorenzo Vitali', 'ITA', 29, 16, 91, 92, 'attack', 'solano', 30, 2],
  ['marchand', 'Théo Marchand', 'FRA', 25, 10, 89, 92, 'qualifier', 'solano', 16, 1],
  ['vos', 'Jasper Vos', 'NED', 28, 1, 95, 96, 'attack', 'vantor', 45, 3],
  ['arata', 'Kenji Arata', 'JPN', 26, 22, 85, 87, 'consistent', 'vantor', 8, 0],
  ['fairbanks', 'Noah Fairbanks', 'AUS', 25, 81, 90, 93, 'tyre', 'kestrel', 18, 2],
  ['grange', 'Elliot Grange', 'GBR', 23, 4, 89, 94, 'qualifier', 'kestrel', 15, 2],
  ['hart', 'Caleb Hart', 'USA', 30, 2, 83, 84, 'defend', 'meridian', 6, 0],
  ['saldana', 'Diego Saldaña', 'MEX', 32, 11, 86, 86, 'tyre', 'meridian', 9, 1],
  ['mori', 'Yuto Mori', 'JPN', 24, 30, 83, 88, 'raw', 'ishikawa', 4, 1],
  ['gagnon', 'Pierre-Luc Gagnon', 'CAN', 27, 18, 83, 85, 'wet', 'ishikawa', 5, 0],
  ['halvorsen', 'Erik Halvorsen', 'NOR', 35, 27, 86, 86, 'consistent', 'nordline', 10, 0],
  ['brandt', 'Felix Brandt', 'GER', 22, 9, 81, 92, 'raw', 'nordline', 2, 2],
  ['moreira', 'Rafael Moreira', 'BRA', 26, 12, 84, 88, 'wet', 'bravura', 5, 1],
  ['tavares', 'Gabriel Tavares', 'BRA', 21, 25, 80, 91, 'attack', 'bravura', 1.5, 2],
  ['delacroix', 'Antoine Delacroix', 'FRA', 31, 31, 84, 84, 'defend', 'castellan', 6, 1],
  ['bernasconi', 'Luca Bernasconi', 'SUI', 28, 55, 81, 83, 'consistent', 'castellan', 3, 0],
  ['keller', 'Max Keller', 'GER', 33, 5, 84, 84, 'complete', 'hartwell', 6, 0],
  ['oconnell', "Ryan O'Connell", 'IRL', 24, 63, 79, 86, 'attack', 'hartwell', 1.5, 1],
  // Sem equipe — mercado / reservas / juniores
  ['ferraz', 'Sofia Ferraz', 'POR', 20, 37, 78, 93, 'qualifier', null, 1, 0],
  ['mehta', 'Arjun Mehta', 'IND', 22, 44, 79, 86, 'consistent', null, 1, 0],
  ['albuquerque', 'Tomás Albuquerque', 'BRA', 19, 71, 75, 95, 'raw', null, 0.6, 0],
  ['lambert', 'Hugo Lambert', 'BEL', 30, 20, 82, 82, 'defend', null, 3, 0],
  ['saarinen', 'Mikael Saarinen', 'FIN', 23, 77, 79, 87, 'wet', null, 1, 0],
  ['chen', 'Chen Wei', 'CHN', 21, 88, 77, 90, 'tyre', null, 0.8, 0],
  ['campos', 'Isabela Campos', 'BRA', 22, 29, 78, 89, 'attack', null, 0.8, 0],
  ['okafor', 'Daniel Okafor', 'GBR', 20, 42, 77, 91, 'complete', null, 0.8, 0],
];

/* Perfis de atributos por estilo (desvio somado ao overall) */
const STYLE_PROFILES = {
  complete:    { pace: 0, racecraft: 1, consistency: 1, tyre: 0, wet: 1, overtaking: 0, defending: 1, aggression: 0, qualifying: 0, start: 0, energy: 1, adaptability: 2, concentration: 1, feedback: 1 },
  attack:      { pace: 1, racecraft: 1, consistency: -3, tyre: -3, wet: 0, overtaking: 4, defending: -1, aggression: 12, qualifying: 1, start: 2, energy: -2, adaptability: 0, concentration: -2, feedback: 0 },
  conservative:{ pace: -1, racecraft: 1, consistency: 4, tyre: 3, wet: -1, overtaking: -3, defending: 1, aggression: -12, qualifying: -1, start: -1, energy: 3, adaptability: 0, concentration: 3, feedback: 1 },
  technical:   { pace: 0, racecraft: 0, consistency: 2, tyre: 1, wet: 0, overtaking: -1, defending: 0, aggression: -4, qualifying: 1, start: 0, energy: 2, adaptability: 1, concentration: 1, feedback: 7 },
  consistent:  { pace: -1, racecraft: 1, consistency: 6, tyre: 2, wet: 0, overtaking: -2, defending: 2, aggression: -8, qualifying: -1, start: 0, energy: 2, adaptability: 0, concentration: 5, feedback: 1 },
  qualifier:   { pace: 2, racecraft: -2, consistency: -1, tyre: -2, wet: -1, overtaking: 0, defending: -2, aggression: 4, qualifying: 5, start: -1, energy: -1, adaptability: 0, concentration: 0, feedback: 1 },
  overtaker:   { pace: 0, racecraft: 2, consistency: -1, tyre: -1, wet: 1, overtaking: 7, defending: 0, aggression: 8, qualifying: -2, start: 1, energy: 0, adaptability: 0, concentration: -1, feedback: -1 },
  tyre:        { pace: -1, racecraft: 1, consistency: 2, tyre: 6, wet: 0, overtaking: -1, defending: 1, aggression: -6, qualifying: -2, start: 0, energy: 3, adaptability: 0, concentration: 1, feedback: 1 },
  wet:         { pace: 0, racecraft: 0, consistency: -1, tyre: 0, wet: 8, overtaking: 1, defending: 0, aggression: 2, qualifying: 0, start: 0, energy: 0, adaptability: 2, concentration: 0, feedback: 0 },
  adaptable:   { pace: 0, racecraft: 1, consistency: 1, tyre: 0, wet: 2, overtaking: 0, defending: 0, aggression: 0, qualifying: 0, start: 0, energy: 1, adaptability: 7, concentration: 1, feedback: 2 },
  strategic:   { pace: -1, racecraft: 4, consistency: 2, tyre: 3, wet: 0, overtaking: 0, defending: 2, aggression: -4, qualifying: -2, start: 0, energy: 5, adaptability: 1, concentration: 2, feedback: 2 },
  daring:      { pace: 2, racecraft: 0, consistency: -2, tyre: -2, wet: 3, overtaking: 4, defending: -1, aggression: 10, qualifying: 2, start: 3, energy: -2, adaptability: 1, concentration: -3, feedback: -1 },
  erratic:     { pace: 2, racecraft: -3, consistency: -7, tyre: -3, wet: -2, overtaking: 1, defending: -3, aggression: 10, qualifying: 2, start: 0, energy: -2, adaptability: -2, concentration: -6, feedback: -2 },
  starter:     { pace: 0, racecraft: 2, consistency: 0, tyre: 0, wet: 0, overtaking: 2, defending: 2, aggression: 3, qualifying: -1, start: 9, energy: 0, adaptability: 0, concentration: 1, feedback: 0 },
  defend:      { pace: -1, racecraft: 2, consistency: 2, tyre: 1, wet: 0, overtaking: -2, defending: 6, aggression: 2, qualifying: -2, start: 1, energy: 1, adaptability: 0, concentration: 2, feedback: 0 },
  raw:         { pace: 2, racecraft: -3, consistency: -6, tyre: -3, wet: -2, overtaking: 1, defending: -3, aggression: 10, qualifying: 2, start: 0, energy: -2, adaptability: -1, concentration: -5, feedback: -3 },
};
/* efeito do estilo no comportamento em pista (multiplicadores aplicados pelo motor) */
const STYLE_BEHAVIOR = {
  complete: {}, attack: { err: 1.25, wear: 1.12, ovt: 0.35, lap1: 0.3 }, conservative: { err: 0.7, wear: 0.9, ovt: -0.35, def: 0.1 },
  technical: { setup: 0.06 }, consistent: { err: 0.75, sd: 0.85 }, qualifier: { quali: -0.12 }, overtaker: { ovt: 0.55, err: 1.1 },
  tyre: { wear: 0.85 }, wet: { wetGain: 0.4 }, adaptable: { setup: 0.03, wetGain: 0.15 }, strategic: { wear: 0.92, energy: 0.1 },
  daring: { err: 1.2, ovt: 0.4, wetGain: 0.2, lap1: 0.4 }, erratic: { err: 1.6, sd: 1.3 }, starter: { lap1: 0.9 }, defend: { def: 0.4 }, raw: { err: 1.4, sd: 1.2 },
};

/* [id, GP, circuito/cidade, país, voltas, km, volta base s, aero, chassi, motor, facilidade ultrapassagem 0-1,
    estresse pneus, chance chuva, fator SC, perda pit s, zonas DRS, rua?] */
const TRACK_ROWS = [
  ['bhr', 'GP do Bahrein', 'Sakhir', 'BHR', 57, 5.412, 92.5, .32, .33, .35, .70, 1.20, .03, .9, 22.5, 3, 0],
  ['ksa', 'GP da Arábia Saudita', 'Jidá', 'KSA', 50, 6.174, 89.0, .28, .27, .45, .55, .80, .02, 1.5, 20.5, 3, 1],
  ['aus', 'GP da Austrália', 'Melbourne', 'AUS', 58, 5.278, 80.0, .34, .34, .32, .45, .85, .18, 1.3, 19.5, 4, 1],
  ['jpn', 'GP do Japão', 'Suzuka', 'JPN', 53, 5.807, 91.0, .44, .36, .20, .35, 1.25, .28, 1.0, 22.5, 1, 0],
  ['chn', 'GP da China', 'Xangai', 'CHN', 56, 5.451, 94.5, .34, .32, .34, .65, 1.00, .22, 1.0, 23.0, 2, 0],
  ['mia', 'GP de Miami', 'Miami', 'USA', 57, 5.412, 90.0, .32, .34, .34, .50, .90, .20, 1.3, 20.0, 3, 1],
  ['imo', 'GP da Emília-Romanha', 'Ímola', 'ITA', 63, 4.909, 78.0, .40, .36, .24, .25, .95, .22, 1.1, 27.5, 1, 0],
  ['mon', 'GP de Mônaco', 'Monte Carlo', 'MON', 78, 3.337, 74.0, .48, .40, .12, .05, .65, .15, 1.6, 19.5, 1, 1],
  ['can', 'GP do Canadá', 'Montreal', 'CAN', 70, 4.361, 74.0, .26, .32, .42, .60, .85, .28, 1.7, 18.5, 3, 1],
  ['esp', 'GP da Espanha', 'Barcelona', 'ESP', 66, 4.657, 78.5, .45, .35, .20, .40, 1.20, .08, .8, 21.5, 2, 0],
  ['aut', 'GP da Áustria', 'Spielberg', 'AUT', 71, 4.318, 66.0, .28, .30, .42, .70, .95, .22, 1.0, 20.5, 3, 0],
  ['gbr', 'GP da Grã-Bretanha', 'Silverstone', 'GBR', 52, 5.891, 89.0, .46, .32, .22, .55, 1.30, .38, 1.0, 20.0, 2, 0],
  ['hun', 'GP da Hungria', 'Budapeste', 'HUN', 70, 4.381, 79.0, .44, .40, .16, .25, 1.05, .15, .9, 20.5, 1, 0],
  ['bel', 'GP da Bélgica', 'Spa-Francorchamps', 'BEL', 44, 7.004, 106.0, .30, .28, .42, .70, 1.00, .45, 1.2, 19.0, 2, 0],
  ['ned', 'GP da Holanda', 'Zandvoort', 'NED', 72, 4.259, 72.0, .46, .38, .16, .20, 1.05, .30, 1.1, 21.0, 2, 0],
  ['ita', 'GP da Itália', 'Monza', 'ITA', 53, 5.793, 81.5, .18, .27, .55, .70, .80, .12, 1.0, 24.0, 2, 0],
  ['aze', 'GP do Azerbaijão', 'Baku', 'AZE', 51, 6.003, 103.0, .24, .30, .46, .65, .75, .05, 1.8, 20.5, 2, 1],
  ['sgp', 'GP de Singapura', 'Marina Bay', 'SGP', 62, 4.940, 93.0, .46, .40, .14, .25, 1.00, .28, 2.0, 28.0, 3, 1],
  ['usa', 'GP dos Estados Unidos', 'Austin', 'USA', 56, 5.513, 96.0, .36, .34, .30, .60, 1.20, .15, 1.0, 20.5, 2, 0],
  ['mex', 'GP do México', 'Cidade do México', 'MEX', 71, 4.304, 78.0, .30, .34, .36, .50, .85, .12, 1.1, 22.0, 3, 0],
  ['sao', 'GP de São Paulo', 'Interlagos', 'BRA', 71, 4.309, 71.0, .32, .34, .34, .65, 1.00, .42, 1.6, 20.5, 2, 0],
  ['lvg', 'GP de Las Vegas', 'Las Vegas', 'USA', 50, 6.201, 94.0, .20, .30, .50, .65, .70, .02, 1.4, 20.0, 2, 1],
  ['qat', 'GP do Catar', 'Lusail', 'QAT', 57, 5.419, 84.0, .44, .36, .20, .45, 1.45, .02, .9, 26.0, 1, 0],
  ['abu', 'GP de Abu Dhabi', 'Yas Marina', 'UAE', 58, 5.281, 86.0, .34, .34, .32, .50, .90, .02, .9, 21.5, 2, 0],
];

function buildDefaultDB() {
  const rnd = localRng('pitwall-default-db');
  const r = (a, b) => a + (b - a) * rnd();

  const teams = TEAM_ROWS.map(t => ({
    id: t[0], name: t[1], short: t[2], country: t[3], color: t[4], color2: t[5], engine: t[6],
    budget: t[7], reputation: t[8],
    car: { aero: t[9], chassis: t[10], reliability: t[11], tyreCare: t[12] },
    pitCrew: t[13], facilities: t[14], principal: t[15],
    staff: {
      technical: Math.round(clamp(t[14] + r(-6, 4), 55, 98)),
      aero: Math.round(clamp(t[9] + r(-5, 4), 55, 98)),
      strategy: Math.round(clamp(t[8] * 0.6 + 32 + r(-6, 6), 55, 98)),
      engineering: Math.round(clamp(t[10] + r(-5, 4), 55, 98)),
    },
  }));

  const drivers = DRIVER_ROWS.map(d => {
    const prof = STYLE_PROFILES[d[7]] || STYLE_PROFILES.complete;
    const base = d[5];
    const a = k => Math.round(clamp(base + (prof[k] || 0) + r(-2.5, 2.5), 40, 99));
    return {
      id: d[0], name: d[1], nat: d[2], age: d[3], number: d[4], style: d[7],
      team: d[8], salary: d[9], contractYears: d[10],
      pace: a('pace'), qualifying: a('qualifying'), racecraft: a('racecraft'), consistency: a('consistency'),
      tyre: a('tyre'), wet: a('wet'), overtaking: a('overtaking'), defending: a('defending'),
      aggression: Math.round(clamp(50 + (prof.aggression || 0) * 2.5 + r(-8, 8), 10, 95)),
      experience: Math.round(clamp((d[3] - 18) * 7 + r(-6, 6), 5, 99)),
      potential: d[6], morale: 70, popularity: Math.round(clamp(base - 25 + r(-10, 15), 10, 99)),
    };
  });

  const tracks = TRACK_ROWS.map(t => ({
    id: t[0], gp: t[1], circuit: t[2], country: t[3], laps: t[4], length: t[5], baseLap: t[6],
    weights: { aero: t[7], chassis: t[8], engine: t[9] },
    overtaking: t[10], tyreStress: t[11], rain: t[12], scFactor: t[13], pitLoss: t[14], drs: t[15], street: !!t[16],
    shapeSeed: hashStr(t[0] + t[2]) % 100000,
  }));

  return {
    version: DB_VERSION,
    name: 'Grid Padrão Pit Wall',
    rules: deepClone(DEFAULT_RULES),
    engines: deepClone(ENGINES),
    teams, drivers, tracks,
    calendar: tracks.map(t => t.id),
  };
}

/* Mapeia estilos para rótulos de UI */
const STYLE_LABELS = {
  complete: 'Completo', attack: 'Agressivo', conservative: 'Conservador', technical: 'Técnico', consistent: 'Consistente', qualifier: 'Qualificador',
  overtaker: 'Especialista em ultrapassagens', tyre: 'Gestor de pneus', wet: 'Especialista na chuva', adaptable: 'Adaptável', strategic: 'Estratégico',
  daring: 'Arrojado', erratic: 'Irregular', starter: 'Excelente em largadas', defend: 'Defensor', raw: 'Talento bruto',
};

const DRIVER_ATTRS = [
  ['pace', 'Velocidade'], ['qualifying', 'Classificação'], ['racecraft', 'Inteligência de corrida'], ['consistency', 'Consistência'],
  ['tyre', 'Controle de pneus'], ['energy', 'Gestão de energia'], ['wet', 'Chuva'], ['overtaking', 'Ultrapassagem'], ['defending', 'Defesa'],
  ['start', 'Largada'], ['adaptability', 'Adaptabilidade'], ['concentration', 'Concentração'], ['feedback', 'Feedback técnico'],
  ['aggression', 'Agressividade'], ['experience', 'Experiência'], ['potential', 'Potencial'],
];
const NEW_ATTRS = ['start', 'energy', 'adaptability', 'concentration', 'feedback'];

function driverOverall(d) {
  const x = (k) => d[k] ?? d.pace;
  return Math.round(d.pace * 0.3 + d.qualifying * 0.1 + d.racecraft * 0.12 + d.consistency * 0.12 + d.tyre * 0.08 + d.wet * 0.05 + d.overtaking * 0.07 + d.defending * 0.06 +
    x('start') * 0.03 + x('energy') * 0.03 + x('adaptability') * 0.02 + x('concentration') * 0.02);
}

/* Completa campos faltando em bases importadas ou feitas à mão */
function normalizeDb(src) {
  const def = { rules: DEFAULT_RULES, engines: ENGINES };
  const db = deepClone(src);
  db.version = DB_VERSION;
  db.name = db.name || 'Base personalizada';
  db.rules = Object.assign(deepClone(def.rules), db.rules || {});
  db.engines = (db.engines && db.engines.length ? db.engines : def.engines).map((e, i) => ({ ...e, id: e.id || 'eng' + i, name: e.name || 'Motor ' + (i + 1), power: num(e.power, 88), reliability: num(e.reliability, 86), cost: num(e.cost, 14) }));
  const eng0 = db.engines[0].id;
  db.teams = (db.teams || []).map((t, i) => ({ ...t,
    id: t.id || 'team' + i, name: t.name || 'Equipe ' + (i + 1), short: (t.short || (t.name || 'EQP').slice(0, 3)).toUpperCase(), country: t.country || 'GBR',
    color: t.color || '#888888', color2: t.color2 || '#222222', engine: db.engines.some(e => e.id === t.engine) ? t.engine : eng0,
    budget: num(t.budget, 110), reputation: num(t.reputation, 70),
    car: { aero: num(t.car && t.car.aero, 84), chassis: num(t.car && t.car.chassis, 84), reliability: num(t.car && t.car.reliability, 85), tyreCare: num(t.car && t.car.tyreCare, 82), engineBonus: num(t.car && t.car.engineBonus, 0) },
    pitCrew: num(t.pitCrew, 82), facilities: num(t.facilities, 76), principal: t.principal || 'Chefe',
    sponsors: Array.isArray(t.sponsors) ? t.sponsors : [],
    staff: { technical: num(t.staff && t.staff.technical, 78), aero: num(t.staff && t.staff.aero, 78), strategy: num(t.staff && t.staff.strategy, 78), engineering: num(t.staff && t.staff.engineering, 78) },
  }));
  const tids = new Set(db.teams.map(t => t.id));
  db.drivers = (db.drivers || []).map((d, i) => {
    const o = { ...d, id: d.id || 'drv' + i, name: d.name || 'Piloto ' + (i + 1), nat: d.nat || 'BRA', age: num(d.age, 25), number: num(d.number, i + 2), style: STYLE_PROFILES[d.style] ? d.style : 'complete', team: tids.has(d.team) ? d.team : null, salary: num(d.salary, 2), contractYears: num(d.contractYears, 1) };
    // bases reais trazem só a nota geral (ovr) e o estilo: os atributos são expandidos de forma estável
    const prof = STYLE_PROFILES[o.style] || STYLE_PROFILES.complete;
    const r = localRng('attrs:' + o.id);
    const base = num(d.ovr, 78);
    ['pace', 'qualifying', 'racecraft', 'consistency', 'tyre', 'wet', 'overtaking', 'defending'].forEach(k => (o[k] = num(d[k], Math.round(clamp(base + (prof[k] || 0) + (r() - 0.5) * 4, 40, 99)))));
    NEW_ATTRS.forEach(k => (o[k] = num(d[k], Math.round(clamp(base + (prof[k] || 0) + (r() - 0.5) * 5, 40, 99)))));
    const starts = d.career ? d.career.starts || 0 : 0;
    if (!d.personality) {
      const ag = num(d.aggression, 50);
      o.personality = { ambition: Math.round(clamp(85 - (o.age - 18) * 1.6 + (base - 80) + (r() - 0.5) * 20, 15, 99)), loyalty: Math.round(clamp(45 + (o.age - 25) * 1.2 + (r() - 0.5) * 30, 10, 95)), temper: Math.round(clamp(ag * 0.7 + (r() - 0.5) * 30, 5, 95)), media: Math.round(clamp(40 + (d.career ? d.career.titles * 8 + d.career.wins * 0.4 : 0) + (r() - 0.5) * 30, 5, 99)) };
    }
    o.aggression = num(d.aggression, Math.round(clamp(50 + (prof.aggression || 0) * 2.5 + (r() - 0.5) * 14, 10, 95)));
    o.experience = num(d.experience, Math.round(clamp(starts ? 20 + starts / 4 : (o.age - 17) * 5, 5, 99)));
    o.potential = num(d.potential, Math.max(80, o.pace)); o.morale = num(d.morale, 70);
    o.popularity = num(d.popularity, Math.round(clamp(20 + (d.career ? d.career.wins * 1.2 + d.career.titles * 6 : 0) + base - 75, 5, 99)));
    if (d.salary == null && d.ovr != null) { o.salary = +Math.max(0.6, Math.pow(Math.max(0, base - 70) / 25, 2.4) * 42).toFixed(1); }
    if (d.contractYears == null) o.contractYears = o.team ? (base >= 87 ? 2 : 1) : 0;
    if (d.seat != null) o.seat = d.seat;
    return o;
  });
  db.tracks = (db.tracks || []).map((t, i) => ({ ...t,
    id: t.id || 'trk' + i, gp: t.gp || 'Grande Prêmio ' + (i + 1), circuit: t.circuit || 'Circuito', country: t.country || 'BRA', laps: num(t.laps, 55), length: num(t.length, 5), baseLap: num(t.baseLap, 88),
    weights: { aero: num(t.weights && t.weights.aero, .34), chassis: num(t.weights && t.weights.chassis, .33), engine: num(t.weights && t.weights.engine, .33) },
    overtaking: num(t.overtaking, .5), tyreStress: num(t.tyreStress, 1), rain: num(t.rain, .15), scFactor: num(t.scFactor, 1), pitLoss: num(t.pitLoss, 21), drs: num(t.drs, 2), street: !!t.street,
    shapeSeed: num(t.shapeSeed, hashStr(String(t.id || i)) % 100000),
  }));
  db.teams.forEach(t => { if (t.car.cooling == null) t.car.cooling = 80; if (t.car.energy == null) t.car.energy = 80; });
  if (typeof Regs !== 'undefined') Regs.ensure(db.rules);
  const trids = new Set(db.tracks.map(t => t.id));
  db.calendar = (db.calendar && db.calendar.length ? db.calendar : db.tracks.map(t => t.id)).filter(id => trids.has(id));
  return db;
}
function num(v, d) { const n = Number(v); return isFinite(n) && v !== '' && v != null ? n : d; }


/* Base padrão: dados reais quando disponíveis, senão o universo fictício */
function defaultDb() {
  if (typeof REAL_DB !== 'undefined') {
    if (REAL_DB.natNames) Object.assign(NAT_NAMES, REAL_DB.natNames);
    const src = deepClone(REAL_DB);
    if (typeof REAL_EXTRA !== 'undefined') applyRealExtra(src, REAL_EXTRA);
    return normalizeDb(src);
  }
  return buildDefaultDB();
}

/* Aplica a pesquisa complementar (contratos, salários, empresários, staff, academias,
   orçamentos e mudanças já anunciadas para a temporada inicial) à base real */
function applyRealExtra(db, X) {
  const start = db.rules.startYear;
  (X.newDrivers || []).forEach(n => {
    if (db.drivers.some(d => d.id === n.id)) return;
    const age = start - Number(n.dob.slice(0, 4)) - 1;
    db.drivers.push({ ...n, age, team: null, seat: null, img: 'drivers/' + n.id + '.webp', slEligible: true });
  });
  (X.moves2027 || []).forEach(m => {
    const out = db.drivers.find(d => d.id === m.replaces);
    const inn = db.drivers.find(d => d.id === m.driver);
    if (out && out.team === m.team) { out.team = null; out.seat = null; }
    if (inn) { inn.team = m.team; inn.seat = m.seat; }
  });
  db.drivers.forEach(d => {
    const c = X.contracts[d.id];
    if (c) {
      if (c.leaves) { d.contract = { ...c }; return; }
      d.salary = c.salary; d.contractYears = Math.max(0, c.until - start);
      d.contract = { until: c.until, salary: c.salary, option: c.option || null, clauses: c.clauses || [], estimated: !!c.estimated, note: c.note || null, real: true };
    } else if (d.team && d.seat === 'R') { d.contractYears = 0; d.salary = d.salary || 0.5; d.contract = { until: start, estimated: true, note: 'Contrato de reserva estimado' }; }
    if (X.managers && X.managers[d.id]) d.manager = X.managers[d.id];
    if (d.seat === 'R' || d.id === 'rafael-camara') d.slEligible = d.slEligible ?? (d.id !== 'freddie-slater');
  });
  db.teams.forEach(t => {
    if (X.budgets && X.budgets[t.id]) t.budget = X.budgets[t.id];
    t.works = (X.works || []).includes(t.id);
    t.partnerOf = Object.entries(X.partners || {}).filter(([k, v]) => v.includes(t.id)).map(([k]) => k);
    const st = (X.staff || {})[t.id]; if (st && st.principal) t.principal = st.principal;
  });
  db.engines.forEach(e => { if (db.teams.some(t => t.works && t.engine === e.id)) e.works = true; });
  db.extraRef = X.ref;
  db.rules.overtakeMode = true; // 2026: DRS substituído pelo modo de ultrapassagem (energia extra)
}
