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
  complete:   { pace: 0, racecraft: 1, consistency: 1, tyre: 0, wet: 1, overtaking: 0, defending: 1, aggression: 0, qualifying: 0 },
  attack:     { pace: 1, racecraft: 1, consistency: -3, tyre: -3, wet: 0, overtaking: 4, defending: -1, aggression: 12, qualifying: 1 },
  tyre:       { pace: -1, racecraft: 1, consistency: 2, tyre: 6, wet: 0, overtaking: -1, defending: 1, aggression: -6, qualifying: -2 },
  qualifier:  { pace: 2, racecraft: -2, consistency: -1, tyre: -2, wet: -1, overtaking: 0, defending: -2, aggression: 4, qualifying: 5 },
  consistent: { pace: -1, racecraft: 1, consistency: 6, tyre: 2, wet: 0, overtaking: -2, defending: 2, aggression: -8, qualifying: -1 },
  defend:     { pace: -1, racecraft: 2, consistency: 2, tyre: 1, wet: 0, overtaking: -2, defending: 6, aggression: 2, qualifying: -2 },
  wet:        { pace: 0, racecraft: 0, consistency: -1, tyre: 0, wet: 8, overtaking: 1, defending: 0, aggression: 2, qualifying: 0 },
  raw:        { pace: 2, racecraft: -3, consistency: -6, tyre: -3, wet: -2, overtaking: 1, defending: -3, aggression: 10, qualifying: 2 },
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
  complete: 'Completo', attack: 'Agressivo', tyre: 'Gestor de pneus', qualifier: 'Especialista em classificação',
  consistent: 'Consistente', defend: 'Defensor', wet: 'Especialista na chuva', raw: 'Talento bruto',
};

const DRIVER_ATTRS = [
  ['pace', 'Ritmo'], ['qualifying', 'Classificação'], ['racecraft', 'Inteligência de corrida'], ['consistency', 'Consistência'],
  ['tyre', 'Gestão de pneus'], ['wet', 'Chuva'], ['overtaking', 'Ultrapassagem'], ['defending', 'Defesa'],
  ['aggression', 'Agressividade'], ['experience', 'Experiência'], ['potential', 'Potencial'],
];

function driverOverall(d) {
  return Math.round(d.pace * 0.32 + d.qualifying * 0.1 + d.racecraft * 0.14 + d.consistency * 0.14 + d.tyre * 0.1 +
    d.wet * 0.05 + d.overtaking * 0.08 + d.defending * 0.07);
}
