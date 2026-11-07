/* ============================================================
   PIT WALL — kart: a base da pirâmide.
   - Campeonatos de kart regionais (genéricos, sem marcas) com pilotos
     fictícios de 12 a 15 anos, gerados pelo jogo a cada temporada.
   - Não há corrida a corrida: o kart é resolvido no fim do ano
     (classificação por habilidade, forma e sorte).
   - Os melhores sobem para as F4 da região (antes de o jogo inventar
     um piloto novo para a vaga). Quem passa dos 16 sem vaga larga o kart.
   - Potencial muito volátil nessa idade (Potential.vol) e o resultado
     no kart pesa na evolução.
   ============================================================ */
'use strict';

const Kart = {};
Kart.CHAMPS = [
  { id: 'eu', name: 'Kart · Europa', nats: ['GBR', 'ITA', 'GER', 'FRA', 'ESP', 'NED', 'FIN', 'POR', 'SWE', 'BEL', 'DEN'], f4: ['f4it', 'f4es', 'f4gb', 'f4de', 'e4'] },
  { id: 'am', name: 'Kart · Américas', nats: ['USA', 'CAN', 'MEX', 'ARG'], f4: ['f4us'] },
  { id: 'br', name: 'Kart · Brasil', nats: ['BRA'], f4: ['f4br'] },
  { id: 'ap', name: 'Kart · Ásia-Pacífico', nats: ['JPN', 'CHN', 'IND', 'AUS'], f4: ['f4jp'] },
];
Kart.SIZE = { eu: 34, am: 16, br: 14, ap: 16 };
Kart.byId = (id) => Kart.CHAMPS.find(c => c.id === id);
Kart.on = (G) => !!(G && G.kart && typeof Cats !== 'undefined' && Cats.on(G));
Kart.drivers = (G, cid) => G.db.drivers.filter(d => d.series === 'kart' && !d.retired && !d.dead && (!cid || (d.kart && d.kart.c === cid)));

Kart.spawn = (G, ch, age) => {
  const ref = Cats.get(G, ch.f4.find(id => Cats.get(G, id)) || 'f4it') || { id: 'kart', tier: 6, range: [50, 63] };
  const nat = RNG.pick(ch.nats);
  const ovr = Math.round(clamp(ref.range[0] - 16 + (age - 12) * 3 + RNG.normal(0, 3.5), 30, ref.range[0] - 1));
  // nome único (antes desistia quando o nome sorteado já existia, e o kart encolhia com os anos)
  const name = typeof Talent !== 'undefined' ? Talent.uniqueName(G, nat) : randomName(nat);
  if (!name) return null;
  const d = Cats.makeDriver(G, { name, nat, regen: true }, ref, ovr, age);
  d.cat = null; d.ctm = null; d.series = 'kart'; d.seriesTeam = ch.name.replace('Kart · ', ''); d.kart = { c: ch.id, since: G.season ? G.season.year : 2027, res: [] };
  d.popularity = Math.min(d.popularity, 6);
  G.db.drivers.push(d);
  return d;
};

Kart.init = (G) => {
  if (G.kart || typeof Cats === 'undefined' || !Cats.on(G)) return;
  G.kart = { champs: {} };
  Kart.CHAMPS.forEach(ch => {
    for (let i = 0; i < Kart.SIZE[ch.id]; i++) Kart.spawn(G, ch, RNG.int(12, 15));
    G.kart.champs[ch.id] = [];
  });
};

/* fim do ano: classificação de cada campeonato; o resultado fica no piloto */
Kart.season = (G) => {
  if (!Kart.on(G)) return;
  const y = G.season.year;
  Kart.CHAMPS.forEach(ch => {
    const ds = Kart.drivers(G, ch.id);
    const tab = ds.map(d => ({ d, s: driverOverall(d) * 1.0 + (d.age - 12) * 0.6 + RNG.normal(0, 3) })).sort((a, b) => b.s - a.s);
    tab.forEach((x, i) => {
      x.d.kart.res = (x.d.kart.res || []).concat([[y, i + 1, tab.length]]).slice(-5);
      const exp = ds.slice().sort((a, b) => driverOverall(b) - driverOverall(a)).indexOf(x.d) + 1;
      x.d.kart.perf = clamp((exp - (i + 1)) / Math.max(4, tab.length / 2), -1, 1);
    });
    G.kart.champs[ch.id] = (G.kart.champs[ch.id] || []).concat([{ y, top: tab.slice(0, 5).map(x => x.d.id) }]).slice(-12);
    if (tab[0]) Career.record(G, 'categorias', `${tab[0].d.name} (${tab[0].d.age} anos) é campeão do ${ch.name} ${y}.`, { drivers: [tab[0].d.id], year: y });
  });
};

/* depois da troca de ano: sai quem passou da idade, entra uma nova geração */
Kart.renew = (G) => {
  if (!Kart.on(G)) return;
  Kart.drivers(G).forEach(d => {
    if (d.age >= 17 || (d.age >= 16 && RNG.chance(0.5))) { d.series = null; d.seriesTeam = null; d.retired = true; d.quit = true; d.retiredYear = G.season.year; }
  });
  Kart.CHAMPS.forEach(ch => {
    const n = Kart.drivers(G, ch.id).length;
    for (let i = n; i < Kart.SIZE[ch.id]; i++) Kart.spawn(G, ch, RNG.chance(0.7) ? 12 : 13);
  });
};

/* F4 sem piloto vindo de baixo: antes de inventar alguém, olha o kart da região */
Kart.pick = (G, C) => {
  const ch = Kart.CHAMPS.find(c => c.f4.includes(C.id));
  if (!ch) return null;
  const pool = Kart.drivers(G, ch.id).filter(d => d.age >= 14);
  if (!pool.length) return null;
  const last = (d) => (d.kart.res || []).slice(-1)[0];
  const sc = (d) => driverOverall(d) * 1.2 + (typeof Potential !== 'undefined' ? Potential.seenBy(G, d, 'f4') : d.potential) * 0.6 + (last(d) ? Math.max(0, 8 - last(d)[1]) : 0) + (d.academy ? 6 : 0) + RNG.normal(0, 2);
  const d = pool.map(d => ({ d, s: sc(d) })).sort((a, b) => b.s - a.s)[0].d;
  d.series = null; d.seriesTeam = null; d.kart.out = G.season ? G.season.year : null;
  return d;
};

(function () {
  const regen = Cats.newRegen;
  Cats.newRegen = (G, C) => (Kart.on(G) && C.tier >= 5 && Kart.pick(G, C)) || regen(G, C);
  const perf = Potential.performance;
  Potential.performance = (G, d) => (d.series === 'kart' && d.kart && d.kart.perf != null ? d.kart.perf : perf(G, d));
  const name = DriverDB.seriesName;
  DriverDB.seriesName = (sid) => (sid === 'kart' ? 'Kart' : name(sid));
  const end = Career.endSeason;
  Career.endSeason = (G) => { Kart.season(G); const r = end(G); Kart.renew(G); return r; };
})();
