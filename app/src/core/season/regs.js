/* ============================================================
   PIT WALL — regulamentos técnicos e esportivos (editáveis e por temporada)
   Tudo o que está aqui altera a simulação de verdade.
   ============================================================ */
'use strict';

const Regs = {};
/* valores padrão inspirados no regulamento 2026 da F1 */
Regs.DEFAULTS = {
  // técnico
  electricShare: 50,        // % da potência vinda do sistema híbrido (2026 ≈ 50%)
  fuelLimit: 70,            // kg de combustível por corrida
  minWeight: 768,           // kg
  activeAero: true,         // asas móveis (2026)
  overtakeMode: true,       // modo de ultrapassagem por energia (2026) em vez de DRS
  aeroFreedom: 60,          // 0–100: quanto o desenvolvimento aerodinâmico rende
  engineFreeze: false,      // motores congelados (sem evolução entre temporadas)
  chassisFreeze: false,     // chassi homologado e congelado na temporada (só confiabilidade e carro do ano seguinte)
  puLimit: 4,               // unidades de potência por piloto por temporada
  gearboxLimit: 4,
  atr: true,                // restrição de túnel de vento/CFD por posição
  atrMin: 70, atrMax: 115,  // % de tempo de túnel do campeão e do último
  testingDays: 3,
  // esportivo
  qualiFormat: 'knockout',  // knockout (Q1/Q2/Q3) | single (sessão única)
  polePoints: 0,
  reverseGrid: 0,           // inverte os N primeiros no grid da sprint (0 = desligado)
  parcFerme: true,
  scMultiplier: 1,          // frequência de Safety Car
  vsc: true, redFlags: true,
  trackLimitWarnings: 3,    // advertências antes da punição
  penaltyStrictness: 1,     // 0,5 = brandos · 1 = padrão · 2 = rigorosos
  engineGridPenalty: 10,    // posições por componente extra
  nextYearStartPct: 45,     // % da temporada a partir da qual as equipes podem focar no carro novo
};
Regs.LABELS = {
  electricShare: ['Potência elétrica (%)', 'tec'], fuelLimit: ['Limite de combustível (kg)', 'tec'], minWeight: ['Peso mínimo (kg)', 'tec'],
  activeAero: ['Aerodinâmica ativa', 'tec'], overtakeMode: ['Modo de ultrapassagem por energia (em vez de DRS)', 'tec'], aeroFreedom: ['Liberdade aerodinâmica (0–100)', 'tec'],
  engineFreeze: ['Motores congelados', 'tec'], chassisFreeze: ['Chassi congelado na temporada', 'tec'], puLimit: ['Unidades de potência por temporada', 'tec'], gearboxLimit: ['Câmbios por temporada', 'tec'],
  atr: ['Restrição de túnel de vento (ATR)', 'dev'], atrMin: ['ATR do campeão (%)', 'dev'], atrMax: ['ATR do último (%)', 'dev'], testingDays: ['Dias de teste de pré-temporada', 'dev'],
  qualiFormat: ['Formato da classificação', 'esp'], polePoints: ['Pontos pela pole', 'esp'], reverseGrid: ['Grid invertido na sprint (N primeiros)', 'esp'],
  parcFerme: ['Parque fechado', 'esp'], scMultiplier: ['Frequência de Safety Car (×)', 'esp'], vsc: ['Safety Car Virtual', 'esp'], redFlags: ['Bandeira vermelha', 'esp'],
  trackLimitWarnings: ['Advertências de limite de pista antes da punição', 'esp'], penaltyStrictness: ['Rigor dos comissários (×)', 'esp'], engineGridPenalty: ['Punição por componente extra (posições)', 'esp'],
  nextYearStartPct: ['Início do foco no carro novo (% da temporada)', 'dev'],
};
Regs.r = (G) => Object.assign({}, Regs.DEFAULTS, G.db.rules.regs || {});
Regs.ensure = (rules) => { rules.regs = Object.assign({}, Regs.DEFAULTS, rules.regs || {}); rules.versions = rules.versions || {}; return rules; };

/* ATR: equipes mais bem colocadas têm menos tempo de túnel e CFD */
Regs.atrFactor = (G, teamId) => {
  const R = Regs.r(G);
  if (!R.atr) return 1;
  const prev = (G.history || []).slice(-1)[0];
  const order = prev ? prev.standC.map(x => x.tid) : Object.entries(Career.expectedRanks(G)).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  const i = order.indexOf(teamId);
  const n = Math.max(2, G.db.teams.length);
  const pct = R.atrMin + (R.atrMax - R.atrMin) * (i < 0 ? 0.5 : i / (n - 1));
  return pct / 100;
};
/* rende mais ou menos conforme a liberdade aerodinâmica do regulamento */
Regs.aeroMul = (G) => 0.6 + Regs.r(G).aeroFreedom / 100 * 0.8;

/* aplica versões de regulamento programadas para a temporada */
Regs.applyVersion = (G, year) => {
  const v = (G.db.rules.versions || {})[year];
  if (!v) return null;
  const { reset, label, ...changes } = v;
  Object.entries(changes).forEach(([k, val]) => { if (k in Regs.DEFAULTS) G.db.rules.regs[k] = val; else G.db.rules[k] = val; });
  Career.record(G, 'regulamento', `Novo regulamento em vigor em ${year}${label ? ` (${label})` : ''}: ${Object.keys(changes).map(k => (Regs.LABELS[k] ? Regs.LABELS[k][0] : k)).join(', ')}.`, { year });
  Career.news(G, `Regulamento ${year}${label ? ': ' + label : ''} entra em vigor`, 'regulamento');
  return { reset: !!reset };
};

/* unidades de potência: desgaste por corrida, falha antecipa troca; acima do limite → punição no grid */
Regs.puTick = (G, race) => {
  const R = Regs.r(G);
  const races = G.season.calendar.length;
  const life = races / Math.max(1, R.puLimit);
  race.cars.forEach(c => {
    const d = Career.driver(G, c.did); if (!d) return;
    d.pu = d.pu && d.pu.y === G.season.year ? d.pu : { y: G.season.year, used: 1, age: 0 };
    d.pu.age++;
    const t = Career.team(G, c.tid);
    const rel = Engine.reliability(G.db, t);
    const failed = c.status === 'dnf' && /motor|energia|elétrica|potência|Superaquecimento|engine|energy|electric|power|overheat/i.test(c.dnfReason || '');
    if (failed || d.pu.age >= life * (0.85 + rel / 330)) {
      d.pu.used++; d.pu.age = 0;
      if (d.pu.used > R.puLimit) {
        G.gridPenalties = G.gridPenalties || {};
        G.gridPenalties[d.id] = Math.min(20, (G.gridPenalties[d.id] || 0) + R.engineGridPenalty);
        Career.news(G, `${d.name} terá punição de ${R.engineGridPenalty} posições no grid por usar a ${d.pu.used}ª unidade de potência`, 'regulamento');
        Career.record(G, 'regulamento', `${d.name} excedeu o limite de ${R.puLimit} unidades de potência (${d.pu.used}ª): punição de ${R.engineGridPenalty} posições no próximo grid.`, { drivers: [d.id], teams: [t.id] });
      }
    }
  });
};
