/* ============================================================
   PIT WALL — nível do piloto (teto de potencial), perfil e idade (V0.8.3)
   - Nível OCULTO, na escala do automobilismo (a mesma nota em todas as
     categorias): define o teto que o piloto pode atingir no auge.
     Não define a carreira: falta de vaga, carro, dinheiro ou sorte fazem
     um piloto "Bom" ter carreira medíocre.
     Nível F1:     Geracional 96 · Acima da média 90 · Bom 88 · Mediano 86 · Medíocre 84
     Abaixo da F1: Vencedor 82 (ganha títulos nas categorias de acesso e
                   profissionais) · Pelotão 78 (meio de grid) ·
                   Coadjuvante 74 (fundo de grid, carreira curta)
   - Raridade na geração de pilotos novos (geracional ~1 a cada 7 anos).
   - Teto rígido: nenhuma evolução passa do teto; o potencial (pico
     esperado) anda entre a nota atual e o teto.
   - Perfil: pontos fortes e fracos reais (classificação × corrida, chuva,
     pneus, largada...), sem mudar a nota geral. Na F1, o duelo real com o
     companheiro (classificação e corrida) define o desequilíbrio.
   - Idade: crescimento até ~26, auge 27–33, queda a partir de 34 (reflexos
     antes da experiência), mais forte depois dos 38; longevidade rara.
   ============================================================ */
'use strict';

const Talent = {};
Talent.TIERS = [
  { id: 'geracional', name: 'Geracional', en: 'Generational', min: 94, max: 96, f1: true },
  { id: 'acima', name: 'Acima da média', en: 'Above average', min: 89, max: 90, f1: true },
  { id: 'bom', name: 'Bom', en: 'Good', min: 87, max: 88, f1: true },
  { id: 'mediano', name: 'Mediano', en: 'Average', min: 85, max: 86, f1: true },
  { id: 'mediocre', name: 'Medíocre', en: 'Mediocre', min: 83, max: 84, f1: true },
  { id: 'vencedor', name: 'Vencedor', en: 'Winner', min: 79, max: 82, desc: 'ganha títulos abaixo da F1' },
  { id: 'pelotao', name: 'Pelotão', en: 'Midfield', min: 75, max: 78, desc: 'meio de grid' },
  { id: 'coadjuvante', name: 'Coadjuvante', en: 'Backmarker', min: 50, max: 74, desc: 'fundo de grid, carreira curta' },
];
/* chance de cada nível num piloto novo gerado pelo jogo (somam 1) */
Talent.ROLL = { geracional: 0.0025, acima: 0.012, bom: 0.025, mediano: 0.04, mediocre: 0.06, vencedor: 0.16, pelotao: 0.34, coadjuvante: 0.3605 };
Talent.byId = (id) => Talent.TIERS.find(t => t.id === id) || Talent.TIERS[Talent.TIERS.length - 1];
Talent.of = (ceiling) => Talent.TIERS.find(t => ceiling >= t.min) || Talent.TIERS[Talent.TIERS.length - 1];
Talent.name = (id) => { const t = Talent.byId(id); return byLang(t.name, t.en); };
Talent.ATTRS = ['pace', 'qualifying', 'racecraft', 'consistency', 'tyre', 'wet', 'overtaking', 'defending', 'start', 'energy', 'adaptability', 'concentration', 'feedback'];
Talent.REFLEX = new Set(['qualifying', 'start', 'pace', 'concentration']);           // caem primeiro com a idade
Talent.CRAFT = new Set(['tyre', 'consistency', 'defending', 'energy', 'feedback']);  // a experiência segura

/* ---------- teto e potencial ---------- */
Talent.setCeiling = (d, ceiling, tierId) => {
  const t = tierId ? Talent.byId(tierId) : Talent.of(ceiling);
  d.tier = t.id;
  d.ceiling = Math.round(clamp(ceiling, Math.min(t.min, ceiling), t.max));
  if (d.ceiling0 == null) d.ceiling0 = d.ceiling;               // teto de nascença (referência da oscilação de ±3)
  const ovr = driverOverall(d);
  if (d.ceiling < ovr) d.ceiling = Math.min(t.max, ovr);
};
/* potencial = pico esperado (entre a nota e o teto); quem já está no auge tem potencial = nota */
Talent.initPotential = (d, r) => {
  const ovr = driverOverall(d);
  if (d.age >= 27) d.potential = Math.max(ovr, Math.min(d.ceiling, ovr + (d.age <= 29 ? 1 : 0)));
  else d.potential = Math.round(ovr + (d.ceiling - ovr) * ((d.tier === 'geracional' || d.tier === 'acima' ? 0.75 : 0.55) + r() * (d.tier === 'geracional' || d.tier === 'acima' ? 0.25 : 0.45)));
  d.potential = clamp(d.potential, ovr, d.ceiling);
};
/* desempenho real recente (0 a 1): posição na série em 2026 */
Talent.realQ = (G, d) => {
  const h = (d.history || []).filter(x => x.real && x.pos).sort((a, b) => b.y - a.y)[0];
  if (h) { const cat = typeof Cats !== 'undefined' && Cats.get(G, h.cat); const n = cat ? Math.max(cat.entries.length, 10) : 24; return clamp(1 - (h.pos - 1) / (n - 1), 0, 1); }
  const rs = (d.realSeasons || []).filter(s => s[3]).sort((a, b) => b[0] - a[0])[0];
  if (rs) return clamp(1 - (rs[3] - 1) / 23, 0, 1);
  return 0.35;
};
/* nível automático dos pilotos reais fora da tabela */
Talent.autoCeiling = (G, d, r) => {
  const ovr = driverOverall(d), age = d.age || 25;
  const q = Talent.realQ(G, d);
  let c;
  if (age >= 34) c = ovr + Math.min(5, (age - 33) * 0.6);                // veterano: o auge foi melhor que hoje
  else {
    // margem de crescimento por idade (um campeão de F4 aos 16 pode chegar à F1; um piloto de 24 anos já está perto do teto)
    const h = age <= 15 ? 30 : age <= 16 ? 28 : age <= 17 ? 25 : age <= 18 ? 21 : age <= 19 ? 17 : age <= 20 ? 13 : age <= 21 ? 10 : age <= 22 ? 7 : age <= 24 ? 4 : age <= 26 ? 2 : 0.5;
    c = ovr + h * (0.35 + 0.85 * q) + (r() - 0.5) * 3;
  }
  // geracional só por decisão (tabela) ou nascendo no jogo; "acima da média" só para jovens que já mostram resultado
  // "acima da média": raro — só jovens campeões ou vices, e nem todos (sorteio)
  if (c >= 89 && !(age <= 23 && q >= 0.93 && r() < 0.45)) c = Math.min(c, 83 + r() * 5.5);
  return Math.min(c, 90);
};
/* sorteio para pilotos novos gerados pelo jogo */
Talent.roll = (d, r) => {
  let x = r(), id = 'coadjuvante';
  for (const t of Talent.TIERS) { x -= Talent.ROLL[t.id]; if (x < 0) { id = t.id; break; } }
  const t = Talent.byId(id);
  return { id, ceiling: t.min + r() * (t.max - t.min) };
};

/* ---------- perfil: pontos fortes e fracos sem mudar a nota geral ---------- */
Talent.recenter = (d, target) => {
  // a nota geral é arredondada: ajusta em passos até bater exatamente (nota calculada sem arredondar)
  const raw = (x) => x.pace * 0.3 + x.qualifying * 0.1 + x.racecraft * 0.12 + x.consistency * 0.12 + x.tyre * 0.08 + x.wet * 0.05 + x.overtaking * 0.07 + x.defending * 0.06 + (x.start ?? x.pace) * 0.03 + (x.energy ?? x.pace) * 0.03 + (x.adaptability ?? x.pace) * 0.02 + (x.concentration ?? x.pace) * 0.02;
  for (let i = 0; i < 12; i++) {
    const diff = target - raw(d);
    if (Math.abs(diff) < 0.05) break;
    Talent.ATTRS.forEach(k => { if (d[k] != null) d[k] = +clamp(d[k] + diff, 30, 99).toFixed(2); });
  }
};
Talent.profile = (G, d) => {
  if (d.profiled) return;
  const r = localRng('perfil:' + (d.pid || d.id));
  const raw0 = d.pace * 0.3 + d.qualifying * 0.1 + d.racecraft * 0.12 + d.consistency * 0.12 + d.tyre * 0.08 + d.wet * 0.05 + d.overtaking * 0.07 + d.defending * 0.06 + (d.start ?? d.pace) * 0.03 + (d.energy ?? d.pace) * 0.03 + (d.adaptability ?? d.pace) * 0.02 + (d.concentration ?? d.pace) * 0.02;
  const off = {};
  Talent.ATTRS.forEach(k => { off[k] = (r() - 0.5) * 5; });
  // o ritmo puro fica perto da nota geral (é o que mais pesa na volta): fortes e fracos vão para os outros atributos
  off.pace = clamp(off.pace, -1.5, 1.5);
  const pick = Talent.ATTRS.filter(k => k !== 'pace').sort(() => r() - 0.5);
  pick.slice(0, 2).forEach(k => { off[k] += 4 + r() * 3.5; });   // dois pontos fortes
  pick.slice(2, 4).forEach(k => { off[k] -= 4 + r() * 3.5; });   // dois pontos fracos
  // F1: duelo real com o companheiro (segundos de diferença em classificação e corrida, últimas 3 temporadas)
  const ev = typeof REAL_DB !== 'undefined' && (REAL_DB.drivers.find(x => x.id === d.id) || {}).evidence;
  if (ev && ev.qVsMate != null && ev.rVsMate != null) {
    const tilt = clamp((ev.qVsMate - ev.rVsMate) * 2.2, -7, 7);        // mais forte em classificação que em corrida (ou o contrário)
    off.qualifying += tilt; off.racecraft -= tilt * 0.6; off.consistency -= tilt * 0.3;
  }
  // o estilo do piloto (já existente) continua valendo como tendência
  const prof = STYLE_PROFILES[d.style] || {};
  // nenhum atributo foge mais de 12 pontos da tendência do piloto (forte é forte, fraco é fraco, sem absurdos)
  Talent.ATTRS.forEach(k => { if (d[k] != null) d[k] = +clamp(d[k] + clamp(off[k] + (prof[k] || 0) * 0.5, -12, 12), 30, 99).toFixed(2); });
  Talent.recenter(d, raw0);
  d.longevity = d.longevity ?? (['fernando-alonso', 'lewis-hamilton'].includes(d.id) || r() < 0.08);
  d.profiled = true;
};

/* ---------- aplicação ---------- */
Talent.assign = (G, d) => {
  if (d.tier && d.ceiling) return;
  const r = localRng('nivel:' + (d.pid || d.id));
  const table = typeof DRIVER_TIERS !== 'undefined' ? DRIVER_TIERS.f1 : {};
  const ser = typeof DRIVER_TIERS !== 'undefined' && DRIVER_TIERS.series ? DRIVER_TIERS.series[d.id] : null;
  if (table[d.id]) { const t = Talent.byId(table[d.id]); Talent.setCeiling(d, t.min + r() * (t.max - t.min) + (t.id === 'geracional' ? 1 : 0), t.id); }
  else if (ser) { const t = Talent.byId(ser[0]); Talent.setCeiling(d, Math.max(ser[1] + (d.age <= 25 ? 2 : d.age <= 28 ? 1 : 0), t.min + r() * (t.max - t.min) * 0.5), t.id); }
  else if (d.regen) { const x = Talent.roll(d, r); Talent.setCeiling(d, Math.max(x.ceiling, driverOverall(d)), x.id); }
  else Talent.setCeiling(d, Talent.autoCeiling(G, d, r));
  Talent.initPotential(d, r);
};
Talent.capOne = (d) => {
  if (!d.ceiling) return;
  const ovr = driverOverall(d);
  if (ovr > d.ceiling) Talent.recenter(d, d.ceiling + 0.4);
  if (d.potential > d.ceiling) d.potential = d.ceiling;
  // talento de elite não some por temporadas ruins: o pico esperado cai no máximo alguns pontos (até o auge)
  const fl = { geracional: 3, acima: 2.5, bom: 4 }[d.tier];
  if (fl && d.age <= 27 && d.potential < d.ceiling - fl) d.potential = Math.round(d.ceiling - fl);
  const o2 = driverOverall(d);
  if (d.potential < o2) d.potential = o2;
};
Talent.F1_MIN = 75;   // nota mínima de um titular da F1 (decisão do dono em 08/11/2026; era 80)
Talent.ensure = (G) => {
  G.db.drivers.forEach(d => {
    if (d.retired || d.dead) return;
    const first = !d.profiled;
    Talent.profile(G, d);
    // notas revisadas de pilotos de outras séries (driver-tiers.js): aplicadas uma vez, antes do nível
    const ser = first && typeof DRIVER_TIERS !== 'undefined' && DRIVER_TIERS.series ? DRIVER_TIERS.series[d.id] : null;
    if (ser && !d.seriesFixed) { Talent.recenter(d, ser[1] + 0.2); d.seriesFixed = true; d.tier = null; d.ceiling = null; d.ceiling0 = null; }
    Talent.assign(G, d);
    if (first && d.team && d.seat !== 'R' && driverOverall(d) < Talent.F1_MIN) Talent.recenter(d, Talent.F1_MIN - 0.4);
    Talent.capOne(d);
  });
};
Talent.capAll = (G) => { G.db.drivers.forEach(d => { if (!d.retired) Talent.capOne(d); }); };

/* envelhecimento (substitui a queda antiga a partir dos 33): reflexos caem antes da experiência */
Talent.age = (G, d) => {
  if (d.retired || d.dead) return;
  const start = d.longevity ? 37 : 34;
  if (d.age < start) return;
  const r = localRng(`idade:${G.seed}:${d.id}:${d.age}`);
  const yrs = d.age - start + 1;
  const base = 0.25 + yrs * 0.18 + (d.age >= (d.longevity ? 41 : 38) ? 0.35 : 0);
  Talent.ATTRS.forEach(k => { if (d[k] == null) return; const m = Talent.REFLEX.has(k) ? 1.35 : Talent.CRAFT.has(k) ? 0.45 : 0.9; d[k] = +clamp(d[k] - base * m * (0.6 + r() * 0.8), 30, 99).toFixed(2); });
  // o pico esperado acompanha a queda: quem já passou do auge não volta a subir
  d.potential = Math.min(d.potential || 99, driverOverall(d));
};

/* contagens para diagnóstico e relatórios */
Talent.census = (G, filter) => {
  const out = {}; Talent.TIERS.forEach(t => (out[t.id] = 0));
  G.db.drivers.filter(d => !d.retired && !d.dead && (!filter || filter(d))).forEach(d => { if (d.tier) out[d.tier]++; });
  return out;
};

/* evolução por corrida: fecha uma fração da distância até o pico esperado, mais rápido quanto mais jovem
   e quanto mais alto o nível de competição (titular da F1 > reserva > categoria > sem vaga).
   O perfil (pontos fortes e fracos) é mantido: todos os atributos sobem juntos. */
Talent.RATE = (age) => (age <= 20 ? 0.34 : age <= 23 ? 0.3 : age <= 26 ? 0.2 : age <= 28 ? 0.12 : 0);
Talent.grow = (G) => {
  const n = Math.max(1, (G.season && G.season.calendar.length) || 24);
  G.db.drivers.forEach(d => {
    if (!d.retired && !d.dead) {
      const rate = Talent.RATE(d.age || 30);
      const ovr = driverOverall(d);
      if (rate && ovr < (d.potential || 0)) {
        const where = d.team ? (d.seat === 'R' ? 0.5 : 1) : d.cat ? 0.45 : d.series ? 0.35 : 0.2;
        const g = (d.potential - ovr) * rate * where / n * (0.5 + RNG.next());
        Talent.ATTRS.forEach(k => { if (d[k] != null) d[k] = +clamp(d[k] + g, 30, 99).toFixed(3); });
      }
    }
    d.experience = clamp(+((d.experience || 10) + (d.team && d.seat !== 'R' ? 0.35 : 0.08)).toFixed(2), 1, 99);
  });
};
/* universo estável: séries que o jogo não simula (IMSA, NASCAR Xfinity, Supercars...) perdem pilotos com a
   idade e ninguém os repunha. Quando uma série cai abaixo de 90% do tamanho inicial, entram pilotos novos
   (gerados, com nível sorteado) na faixa de nota e de idade da série. */
/* nome fictício único no universo (sobrenome composto e inicial quando os nomes do país acabam) */
Talent.uniqueName = (G, nat) => {
  const used = new Set(G.db.drivers.map(x => x.name));
  let name = randomName(nat);
  for (let i = 0; i < 15 && used.has(name); i++) name = randomName(nat);
  const pool = (typeof NAME_POOL !== 'undefined' && (NAME_POOL[nat] || NAME_POOL.GBR)) || null;
  for (let i = 0; pool && i < 30 && used.has(name); i++) { const a = RNG.pick(pool.l), b = RNG.pick(pool.l); if (a !== b) name = `${RNG.pick(pool.f)} ${a}-${b}`; }
  for (let i = 0; used.has(name) && i < 25; i++) name = name.replace(/^(\S+)( [A-Z]\.)? /, `$1 ${'ABCDEFGHIJKLMNOPRSTUVWXYZ'[i]}. `);
  return used.has(name) ? null : name;
};
Talent.replenish = (G) => {
  if (typeof DriverDB === 'undefined' || typeof Cats === 'undefined') return 0;
  const live = (sid) => G.db.drivers.filter(d => d.series === sid && !d.retired && !d.dead);
  G.seriesBase = G.seriesBase || {};
  const ids = [...new Set(G.db.drivers.filter(d => d.series && d.series !== 'kart').map(d => d.series))];
  ids.forEach(sid => { if (G.seriesBase[sid] == null) G.seriesBase[sid] = live(sid).length; });
  let added = 0;
  Object.entries(G.seriesBase).forEach(([sid, base]) => {
    const range = DriverDB.RANGE[sid]; if (!range || base < 4) return;
    const cur = live(sid);
    const need = Math.min(Math.round(base * 0.95) - cur.length, Math.max(2, Math.ceil(base * 0.25)));
    if (cur.length >= base * 0.9 || need <= 0) return;
    const ages = cur.map(d => d.age).filter(Number.isFinite).sort((a, b) => a - b);
    const young = ages.length ? ages[Math.floor(ages.length * 0.25)] : 22;
    for (let i = 0; i < need; i++) {
      const nat = RNG.pick(NATS);
      const name = Talent.uniqueName(G, nat);
      if (!name) continue;
      const ovr = Math.round(range[0] + (range[1] - range[0]) * Math.pow(RNG.next(), 1.4) * 0.8);
      const d = Cats.makeDriver(G, { name, nat, regen: true }, { id: sid, tier: 3, range }, ovr, clamp(young + RNG.int(-2, 1), 17, 30));
      d.cat = null; d.series = sid; d.seriesTeam = null; d.origin = 'reposicao';
      G.db.drivers.push(d); added++;
    }
  });
  return added;
};

/* teto dinâmico até os 23 anos (inclusive): os resultados revelam o talento.
   - Medido contra a expectativa (carro e companheiro na F1; nota dos rivais nas categorias), não por vitória
     pura: ganhar com o melhor carro conta pouco. Título na categoria dá um bônus extra.
   - Sobe ou desce no máximo 1,5 por ano e ±3 no total em relação ao teto de nascença.
   - Pode passar do limite do nível de nascença (decisão do dono): um Bom com 88 pode chegar a 91. Subir é mais
     difícil que cair (chance por temporada e passos de no máximo 0,8); o máximo absoluto é 96. */
Talent.DYN = { maxYear: 1.5, maxTotal: 3, untilAge: 23 };
Talent.dynamicCeiling = (G) => {
  if (typeof Potential === 'undefined') return;
  const champs = new Set();
  if (typeof Cats !== 'undefined' && Cats.on(G)) Cats.list(G, true).forEach(c => { if (c.season && c.season.res && c.season.res.length >= Math.max(2, (c.season.cal || []).length - 1)) { const top = Cats.standings(c)[0]; if (top) champs.add(top.did); } });
  const sd = Object.entries(G.season.standD || {}).sort((a, b) => b[1] - a[1])[0];
  if (sd) champs.add(sd[0]);
  G.db.drivers.forEach(d => {
    if (d.retired || d.dead || !d.ceiling || (d.age ?? 99) > Talent.DYN.untilAge) return;
    if (d.ceiling0 == null) d.ceiling0 = d.ceiling;
    const perf = Potential.performance(G, d);
    const st = G.season.stats[d.id] || {};
    const raced = (d.team && st.starts >= 5) || (d.cat && perf !== 0);
    if (!raced && !champs.has(d.id)) return;
    // subir o teto é mais difícil que subir o potencial: só com rendimento bem acima do esperado (ou título), em passos
    // pequenos e com chance; cair segue o ritmo normal
    const champ = champs.has(d.id);
    let delta;
    if (perf > 0.35 || champ) {
      const r = localRng(`teto:${G.seed}:${d.id}:${G.season.year}`)();
      delta = r < (champ ? 0.5 : 0.3) ? clamp((perf - 0.2) * 0.8 + (champ ? 0.5 : 0), 0, 0.8) : 0;
    } else delta = clamp(perf * 1.2, -Talent.DYN.maxYear, 0);
    let c = clamp(d.ceiling + delta, d.ceiling0 - Talent.DYN.maxTotal, Math.min(96, d.ceiling0 + Talent.DYN.maxTotal));
    c = +Math.max(c, Math.min(driverOverall(d), 96)).toFixed(2);
    if (Math.abs(c - d.ceiling) < 0.01) return;
    d.ceiling = c; d.tier = Talent.of(c).id;
    (d.ceilHist = d.ceilHist || []).push([G.season.year, +c.toFixed(1)]);
  });
};

(function () {
  // carreira nova: nível, potencial e perfil de todos os pilotos (depois da base, das categorias e do kart)
  const ip = Career.initPeople;
  Career.initPeople = (G) => { const r = ip(G); Talent.ensure(G); Talent.replenish(G); return r; };
  // evolução por corrida e por temporada nunca passa do teto
  Career.driverGrowth = (G) => { Talent.grow(G); Talent.capAll(G); };
  if (typeof Cats !== 'undefined') {
    const dev = Cats.develop;
    Cats.develop = (G) => { const r = dev(G); Talent.capAll(G); return r; };
  }
  // potencial anual: anda entre a nota e o teto
  if (typeof Potential !== 'undefined') {
    const ev = Potential.evolve;
    Potential.evolve = (G) => { Talent.dynamicCeiling(G); const r = ev(G); Talent.capAll(G); return r; };
  }
  // fim de temporada: novos pilotos recebem nível e perfil; teto garantido
  const es = Career.endSeason;
  Career.endSeason = (G) => { const r = es(G); Talent.replenish(G); Talent.ensure(G); return r; };
})();
