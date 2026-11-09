/* ============================================================
   PIT WALL — disciplinas: Monoposto, GT e Endurance
   - Cada categoria pertence a uma disciplina.
   - A experiência de cada piloto em cada disciplina vem da carreira real
     (base 2022–2027) e do que ele corre no jogo.
   - Sem experiência numa disciplina, o piloto rende menos até se adaptar:
     de Endurance para GT é fácil; de Monoposto para Endurance, médio;
     de Monoposto para GT, mais difícil; de GT para Monoposto, bem difícil.
     A adaptabilidade do piloto ajuda. Verstappen e Alonso se adaptam na hora.
   - Alguns pilotos não aceitam correr fora da sua disciplina.
   - F1 Academy: só mulheres.
   ============================================================ */
'use strict';

const Disc = {};
Disc.LIST = ['mono', 'gt', 'end'];
Disc.NAME = { mono: 'Monoposto', gt: 'GT', end: 'Endurance' };
Disc.NAME_EN = { mono: 'Single-seater', gt: 'GT', end: 'Endurance' };
Disc.label = (k) => byLang(Disc.NAME[k], Disc.NAME_EN[k]);
Disc.SERIES = {
  wec: 'end', imsa: 'end', elms: 'end', alms: 'end',
  dtm: 'gt', stockcar: 'gt', supercars: 'gt', nascup: 'gt', nasxf: 'gt', nastr: 'gt',
};
Disc.of = (sid) => Disc.SERIES[sid] || 'mono';
/* exigência do jogador: adaptação instantânea */
Disc.INSTANT = new Set(['max-verstappen', 'fernando-alonso']);
/* facilidade de adaptação: de → para */
Disc.T = { end: { gt: 0.88, mono: 0.5 }, gt: { end: 0.8, mono: 0.38 }, mono: { end: 0.72, gt: 0.6 } };

/* temporadas por disciplina (carreira real + jogo) */
Disc.exp = (d) => {
  const key = `${(d.realSeasons || []).length}:${(d.history || []).length}:${d.team || ''}:${d.cat || ''}`;
  if (d._dx && d._dx.k === key) return d._dx.v;
  const yrs = { mono: new Set(), gt: new Set(), end: new Set() };
  (d.realSeasons || []).forEach(s => { if (s[4] !== 'anunciado (lista provisória)') yrs[Disc.of(s[1])].add(s[0]); });
  (d.history || []).forEach(h => { if (h.cat) yrs[Disc.of(h.cat)].add(h.y); else if (h.y) yrs.mono.add(h.y); });
  if (d.career && d.career.starts > 0) yrs.mono.add('f1');
  if (d.team && d.seat !== 'R') yrs.mono.add('cur');
  const v = { mono: yrs.mono.size, gt: yrs.gt.size, end: yrs.end.size };
  Object.defineProperty(d, '_dx', { value: { k: key, v }, writable: true, configurable: true, enumerable: false });
  return v;
};
/* adaptação (0,55 a 1): 1 = rende o que sabe */
Disc.fit = (d, disc) => {
  if (Disc.INSTANT.has(d.id)) return 1;
  const e = Disc.exp(d);
  if (e[disc] >= 2) return 1;
  const ad = (d.adaptability ?? 70) / 100;
  if (e[disc] === 1) return clamp(0.93 + ad * 0.06, 0.93, 0.99);
  const from = Disc.LIST.filter(k => k !== disc && e[k] > 0);
  if (!from.length) return clamp(0.7 + ad * 0.2, 0.7, 0.92);   // sem carreira registrada: júnior, aprende rápido
  const best = Math.max(...from.map(k => Disc.T[k][disc]));
  return clamp(0.5 + best * 0.4 + ad * 0.14, 0.55, 0.98);
};
/* perda em pontos de nota para a disciplina */
Disc.penalty = (d, disc) => +((1 - Disc.fit(d, disc)) * 14).toFixed(2);
Disc.level = (d, disc) => {
  if (Disc.INSTANT.has(d.id)) return { k: 'instant', txt: byLang('adaptação imediata', 'instant adaptation') };
  const e = Disc.exp(d)[disc];
  if (e >= 2) return { k: 'exp', txt: byLang(`experiente (${e} temp.)`, `experienced (${e} seasons)`) };
  if (e === 1) return { k: 'some', txt: byLang('pouca experiência', 'little experience') };
  const f = Disc.fit(d, disc);
  return { k: 'none', txt: f >= 0.88 ? byLang('sem experiência · adapta fácil', 'no experience · adapts easily') : f >= 0.76 ? byLang('sem experiência · adaptação média', 'no experience · average adaptation') : byLang('sem experiência · adaptação difícil', 'no experience · hard adaptation') };
};
/* aceita correr nessa disciplina? */
Disc.willing = (d, disc) => {
  if (Disc.INSTANT.has(d.id)) return true;
  const e = Disc.exp(d);
  if (e[disc] > 0) return true;
  const main = Disc.LIST.slice().sort((a, b) => e[b] - e[a])[0];
  const r = (hashStr(d.id + ':' + disc) % 100) / 100;
  const ovr = driverOverall(d);
  if (main === 'mono' && d.team && ovr >= 84 && d.age < 33) return false;      // titular forte na F1 não troca
  if (main === 'gt' && disc === 'mono') return r < 0.25 && d.age < 26;
  if (main === 'mono' && disc === 'gt') return r < (d.age >= 26 ? 0.7 : 0.45);
  return r < 0.8;
};

/* afinidade de cada categoria (nacionalidade e origem) */
Disc.SA = new Set(['BRA', 'ARG', 'URU', 'CHI', 'COL', 'PER', 'VEN', 'PAR', 'BOL', 'ECU']);
Disc.EU = new Set(['GER', 'AUT', 'SUI', 'NED', 'BEL', 'FRA', 'ITA', 'ESP', 'POR', 'GBR', 'DEN', 'SWE', 'FIN', 'NOR', 'POL', 'CZE', 'HUN', 'EST', 'LAT', 'LTU']);
Disc.affinity = (G, cat, d) => {
  const e = Disc.exp(d);
  let s = (Disc.fit(d, cat.disc || 'mono') - 0.8) * 30;
  if (cat.id === 'stockcar') s += Disc.SA.has(d.nat) ? 14 : -8;
  if (cat.id === 'nascup') s += d.nat === 'USA' ? 16 : ['CAN', 'MEX', 'AUS'].includes(d.nat) ? 4 : -14;
  if (cat.id === 'dtm') s += (Disc.EU.has(d.nat) ? 4 : -4) + (e.end > 0 ? 6 : 0) + (e.gt > 0 ? 4 : 0);
  return s;
};

/* gênero: necessário para a F1 Academy (só mulheres) */
Disc.FEMALE = {
  GBR: ['Abbi', 'Jessica', 'Chloe', 'Ella', 'Lola', 'Megan'], ITA: ['Giulia', 'Sofia', 'Chiara', 'Martina'], ESP: ['Lucía', 'Marta', 'Nerea', 'Carla'], FRA: ['Chloé', 'Léa', 'Manon', 'Inès'],
  GER: ['Lena', 'Mia', 'Hanna', 'Emma'], NED: ['Tina', 'Emely', 'Sanne', 'Lotte'], BRA: ['Julia', 'Bianca', 'Rafaela', 'Laura'], USA: ['Madison', 'Avery', 'Chloe', 'Lia'],
  JPN: ['Miki', 'Yuka', 'Aiko', 'Rin'], AUS: ['Aiva', 'Joanne', 'Tiana', 'Ruby'], MEX: ['Valeria', 'Ximena', 'Regina'], ARG: ['Martina', 'Delfina', 'Abril'], CHN: ['Lin', 'Mei', 'Yue'],
  CAN: ['Ella', 'Megan', 'Zoe'], FIN: ['Aino', 'Emma'], SWE: ['Linnea', 'Ebba'], BEL: ['Marie', 'Lisa'], DEN: ['Ida', 'Freja'], POR: ['Inês', 'Mariana'], IND: ['Ananya', 'Diya'],
};
Disc.femaleName = (nat) => {
  const f = Disc.FEMALE[nat] || Disc.FEMALE.GBR;
  const pool = NAME_POOL[nat] || NAME_POOL.GBR;
  return `${RNG.pick(f)} ${RNG.pick(pool.l)}`;
};
/* pilotas: base de pilotos (Wikidata P21) e quem já correu na F1 Academy */
Disc.WOMEN = typeof DRIVER_WOMEN !== 'undefined' ? new Set(DRIVER_WOMEN) : new Set();
Disc.isWoman = (d) => !!d && (d.gender === 'F' || (d.uid && Disc.WOMEN.has(d.uid)));
Disc.init = (G) => {
  G.db.drivers.forEach(d => { if (!d.gender && d.uid && Disc.WOMEN.has(d.uid)) d.gender = 'F'; });
  if (G.cats) Object.values(G.cats.byId).forEach(c => { if (!c.disc) c.disc = c.crew ? 'end' : Disc.of(c.id); });
  G.db.drivers.forEach(d => { if (!d.gender && (d.realSeasons || []).some(s => s[1] === 'f1a')) d.gender = 'F'; });
  if (G.cats && G.cats.byId.f1a) G.cats.byId.f1a.entries.forEach(e => { const d = Career.driver(G, e.did); if (d) d.gender = 'F'; });
};

(function () {
  // desempenho nas categorias simuladas: perda de adaptação na disciplina da categoria
  Hooks.around('Cats', Cats, 'skill', 'disciplines', (skill, d, wet) => skill(d, wet) - (Disc.cur ? Disc.penalty(d, Disc.cur) : 0));
  Hooks.around('Cats', Cats, 'runEvent', 'disciplines', (run, G, cat, ev) => {
    Disc.cur = cat.disc || 'mono';
    // NASCAR: os 4 melhores antes da última etapa disputam o título nela (formato próprio)
    const s = cat.season;
    const last = cat.playoffs && s && s.cal && ev === s.cal[s.cal.length - 1];
    if (last) s.final4 = Cats.standings(cat).slice(0, 4).map(x => x.did);
    try { return run(G, cat, ev); } finally { Disc.cur = null; }
  });
  Hooks.around('Cats', Cats, 'standings', 'disciplines', (st, cat) => {
    const tab = st(cat);
    const s = cat.season;
    if (!cat.playoffs || !s || !s.final4 || !s.res.length) return tab;
    const lastRes = s.res[s.res.length - 1];
    const order = (lastRes.races && lastRes.races[0] && lastRes.races[0].top) || [];
    const f4 = s.final4.slice().sort((a, b) => ((order.indexOf(a) + 1) || 99) - ((order.indexOf(b) + 1) || 99));
    return f4.map(did => ({ ...(tab.find(x => x.did === did) || { did, pts: 0 }), final4: true })).concat(tab.filter(x => !f4.includes(x.did)));
  });
  // F1: piloto sem experiência em monoposto rende menos até se adaptar
  Hooks.around('Career', Career, 'startWeekend', 'disciplines', (sw, G) => {
    const r = sw(G);
    if (G.weekend) G.db.drivers.forEach(d => { if (d.team && d.seat !== 'R') { const p = Disc.penalty(d, 'mono'); if (p) G.weekend.dform[d.id] = +((G.weekend.dform[d.id] || 0) - p * 0.25).toFixed(3); } });
    return r;
  });
  // categorias só de mulheres: piloto novo gerado é mulher
  Hooks.around('Cats', Cats, 'newRegen', 'disciplines', (regen, G, C) => {
    const d = regen(G, C);
    if (C.women && d) {
      d.gender = 'F';
      let n = Disc.femaleName(d.nat);
      const taken = (x) => G.db.drivers.some(o => o !== d && o.name === x);
      for (let i = 0; i < 10 && taken(n); i++) n = Disc.femaleName(d.nat);
      for (let i = 0; taken(n) && i < 25; i++) n = n.replace(/^(\S+)( [A-Z]\.)? /, `$1 ${'ABCDEFGHIJKLMNOPRSTUVWXYZ'[i]}. `);
      d.name = n;
      // id coerente com o nome (antes ficava o id do nome masculino sorteado: c-logan-parker = "Madison Reed")
      const ids = new Set(G.db.drivers.filter(o => o !== d).map(o => o.id));
      let id = 'c-' + Cats.norm(n).replace(/ /g, '-').slice(0, 30);
      while (ids.has(id)) id += 'x';
      if (Cats._ids) { Cats._ids.delete(d.id); Cats._ids.add(id); }
      d.id = id;
    }
    return d;
  });
})();
