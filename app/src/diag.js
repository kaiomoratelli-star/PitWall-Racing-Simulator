/* ============================================================
   PIT WALL — diagnóstico de integridade do universo
   Verifica invariantes (assentos, contratos, pontuação, finanças,
   calendário, ids) e corrige o que é seguro corrigir.
   ============================================================ */
'use strict';

const Diag = {};

Diag.run = (G) => {
  const errors = [], warns = [];
  const db = G.db;
  const dup = (arr, what) => {
    const seen = new Set();
    arr.forEach(x => { if (seen.has(x.id)) errors.push(`${what} com id duplicado: ${x.id}`); seen.add(x.id); });
  };
  dup(db.teams, 'Equipe'); dup(db.drivers, 'Piloto'); dup(db.tracks, 'Pista'); dup(db.engines, 'Motor');
  // assentos
  db.teams.forEach(t => {
    const ds = db.drivers.filter(d => d.team === t.id);
    [1, 2].forEach(s => {
      const n = ds.filter(d => d.seat === s).length;
      if (n === 0) warns.push(`${t.name} sem piloto no carro #${s}`);
      if (n > 1) errors.push(`${t.name} tem ${n} pilotos no carro #${s}`);
    });
    if (!byId(db.engines, t.engine)) errors.push(`${t.name} usa motor inexistente (${t.engine})`);
    ['aero', 'chassis', 'reliability', 'tyreCare'].forEach(k => { if (!isFinite(t.car[k])) errors.push(`${t.name}: valor inválido em carro.${k}`); });
    if (t.cash != null && !isFinite(t.cash)) errors.push(`${t.name}: caixa inválido`);
    if (t.cash != null && t.cash < -t.budget) warns.push(`${t.name}: dívida acima do orçamento anual (${fmtMoney(t.cash)})`);
  });
  db.drivers.forEach(d => {
    if (d.team && !byId(db.teams, d.team)) errors.push(`${d.name} ligado a equipe inexistente (${d.team})`);
    if (d.retired && d.team) errors.push(`${d.name} está aposentado mas tem equipe`);
    if (d.team && d.seat == null) warns.push(`${d.name} tem equipe sem assento definido`);
    if (Career.ATTRS_GROW.some(k => !isFinite(d[k]))) errors.push(`${d.name}: atributo inválido`);
  });
  // outras categorias
  if (G.cats) {
    const primary = {};
    Object.values(G.cats.byId).forEach(cat => {
      const seen = new Set();
      cat.entries.forEach(e => {
        const d = Career.driver(G, e.did);
        if (!d) { errors.push(`${cat.short}: inscrição de piloto inexistente (${e.did})`); return; }
        if (seen.has(e.did)) errors.push(`${cat.short}: ${d.name} inscrito duas vezes`);
        seen.add(e.did);
        if (d.retired) warns.push(`${cat.short}: ${d.name} aposentado mas inscrito`);
        if (!cat.teams.some(t => t.id === e.team)) errors.push(`${cat.short}: ${d.name} em equipe inexistente (${e.team})`);
        if (!cat.secondary) { if (primary[e.did]) errors.push(`${d.name} inscrito em ${primary[e.did]} e ${cat.short} ao mesmo tempo`); primary[e.did] = cat.short; }
      });
      if (cat.entries.length > cat.seats + 2) warns.push(`${cat.short}: ${cat.entries.length} inscritos para ${cat.seats} vagas`);
      if (cat.season) Object.values(cat.season.pts).forEach(p => { if (!isFinite(p)) errors.push(`${cat.short}: pontuação inválida`); });
    });
  }
  // calendário
  (G.season.calendar || []).forEach(id => { if (!Career.track(G, id)) errors.push(`Calendário cita pista inexistente: ${id}`); });
  if (!G.season.calendar.length) errors.push('Calendário vazio');
  // pontuação: tabela = soma das corridas
  const fromRes = {}, fromResC = {};
  G.season.results.forEach(r => [...r.cls, ...(r.sprint || []), ...(r.bonus || [])].forEach(c => { fromRes[c.did] = (fromRes[c.did] || 0) + c.pts; fromResC[c.tid] = (fromResC[c.tid] || 0) + c.pts; }));
  if (G.weekend && G.weekend.bonus) G.weekend.bonus.forEach(c => { fromRes[c.did] = (fromRes[c.did] || 0) + c.pts; fromResC[c.tid] = (fromResC[c.tid] || 0) + c.pts; });
  if (G.weekend && G.weekend.sprintResult) G.weekend.sprintResult.cls.forEach(c => { fromRes[c.did] = (fromRes[c.did] || 0) + c.pts; fromResC[c.tid] = (fromResC[c.tid] || 0) + c.pts; });
  Object.entries(fromRes).forEach(([did, p]) => { if ((G.season.standD[did] || 0) !== p) errors.push(`Pontos de ${(Career.driver(G, did) || {}).name || did} não batem (${G.season.standD[did]} vs ${p})`); });
  Object.entries(fromResC).forEach(([tid, p]) => { if ((G.season.standC[tid] || 0) !== p) errors.push(`Pontos da equipe ${tid} não batem`); });
  // finanças do jogador
  if (G.mode !== 'observer' && !isFinite(G.finances.balance)) errors.push('Caixa do jogador inválido');
  // a mesma pessoa real em dois registros (id único ou nome + nascimento)
  if (typeof DriverDB !== 'undefined') DriverDB.duplicates(G).slice(0, 10).forEach(([a, b, k]) => (k.startsWith('u:') ? errors : warns).push(`Piloto duplicado: ${a} e ${b} (${k.startsWith('u:') ? 'mesmo id único' : 'mesmo nome, sem data de nascimento'})`));
  // notícias duplicadas na mesma etapa
  const seenN = new Set();
  G.news.forEach(n => { const k = `${n.year}:${n.round}:${n.title}`; if (seenN.has(k)) warns.push(`Notícia repetida: ${n.title}`); seenN.add(k); });
  // contratos
  db.drivers.filter(d => d.team).forEach(d => { if (d.contractYears < -1) errors.push(`${d.name} com contrato vencido há mais de uma temporada`); });
  let size = 0; try { size = JSON.stringify(G).length; } catch (e) { errors.push('Save não serializável: ' + e.message); }
  if (size > 30e6) warns.push(`Save grande (${(size / 1e6).toFixed(1)} MB)`);
  return { errors, warns, stats: { size, drivers: db.drivers.length, active: db.drivers.filter(d => !d.retired).length, seasons: (G.history || []).length, log: (G.log || []).length } };
};

/* correções seguras: assentos vazios, pontuação recalculada, contratos */
Diag.repair = (G) => {
  const fixed = [];
  G.db.teams.forEach(t => {
    [1, 2].forEach(s => {
      const occ = G.db.drivers.filter(d => d.team === t.id && d.seat === s);
      if (occ.length > 1) occ.slice(1).forEach(d => { d.seat = 'R'; fixed.push(`${d.name} movido para reserva na ${t.name}`); });
      if (!occ.length) { const f = Career.aiFillSeat(G, t.id, s); if (f) fixed.push(`${f.name} colocado no carro #${s} da ${t.name}`); }
    });
  });
  G.db.drivers.forEach(d => {
    if (d.team && !byId(G.db.teams, d.team)) { d.team = null; d.seat = null; fixed.push(`${d.name} liberado (equipe inexistente)`); }
    if (d.retired && d.team) { d.team = null; d.seat = null; fixed.push(`${d.name} aposentado removido da equipe`); }
  });
  const sd = {}, sc = {};
  G.db.teams.forEach(t => (sc[t.id] = 0));
  Object.keys(G.season.standD).forEach(k => (sd[k] = 0));
  G.season.results.forEach(r => [...r.cls, ...(r.sprint || []), ...(r.bonus || [])].forEach(c => { sd[c.did] = (sd[c.did] || 0) + c.pts; sc[c.tid] = (sc[c.tid] || 0) + c.pts; }));
  if (G.weekend && G.weekend.sprintResult) G.weekend.sprintResult.cls.forEach(c => { sd[c.did] = (sd[c.did] || 0) + c.pts; sc[c.tid] = (sc[c.tid] || 0) + c.pts; });
  if (JSON.stringify(sd) !== JSON.stringify(G.season.standD) || JSON.stringify(sc) !== JSON.stringify(G.season.standC)) { G.season.standD = sd; G.season.standC = sc; fixed.push('Tabelas recalculadas a partir dos resultados'); }
  G.season.calendar = G.season.calendar.filter(id => Career.track(G, id));
  return fixed;
};
