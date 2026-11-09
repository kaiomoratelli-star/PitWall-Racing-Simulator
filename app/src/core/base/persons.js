/* ============================================================
   PIT WALL — identidade das pessoas (pilotos)
   Uma pessoa = um registro. As fontes (f1db, Wikipedia, Wikidata,
   DriverDB) escrevem o mesmo nome de jeitos diferentes: "Kimi Antonelli"
   e "Andrea Kimi Antonelli", "Cam Waters" e "Cameron Waters",
   "Maksimilian" e "Maximilian". Este módulo:
   1. dá a cada piloto uma chave persistente (d.pid): o QID do Wikidata
      quando existe; senão, o nome canônico + o ano de nascimento;
   2. decide se dois registros são a mesma pessoa só com evidência
      (nome compatível + nada em conflito: QID, nascimento, nacionalidade);
      homônimos sem evidência continuam separados;
   3. unifica: guarda o registro mais completo, soma as estatísticas,
      troca todas as referências no save (resultados, notícias, contratos,
      categorias, academias) e registra a unificação;
   4. nomes gerados repetidos (pilotos fictícios) não são unificados:
      o segundo ganha outro nome.
   ============================================================ */
'use strict';

const Persons = {};
/* apelidos e transliterações do primeiro nome (forma curta → forma canônica) */
Persons.NICK = {
  cam: 'cameron', nico: 'nicolas', nick: 'nicholas', pato: 'patricio', dan: 'daniel', danny: 'daniel', alex: 'alexander', sasha: 'alexander',
  maksimilian: 'maximilian', maks: 'maximilian', max: 'maximilian', mick: 'michael', mike: 'michael', matt: 'matthew', tom: 'thomas', tommy: 'thomas',
  jake: 'jacob', joe: 'joseph', joey: 'joseph', josh: 'joshua', chris: 'christopher', ed: 'edward', fred: 'frederik', freddie: 'frederik', frederick: 'frederik',
  sebastien: 'sebastian', seb: 'sebastian', ollie: 'oliver', olli: 'oliver', will: 'william', bill: 'william', ricky: 'richard', ben: 'benjamin', sam: 'samuel',
  zak: 'zachary', zach: 'zachary', jj: 'jj', aj: 'aj', kimi: 'kimi', juju: 'juju', andy: 'andrew', tony: 'anthony', rob: 'robert', bob: 'robert', robbie: 'robert',
  gabi: 'gabriel', leo: 'leonardo', theo: 'theophile', nikolai: 'nikolay', nikolaj: 'nikolay', yuri: 'yury', iurii: 'yury', aleksandr: 'alexander', aleksander: 'alexander', alexandre: 'alexander',
};
Persons.STRIP = /\b(jr|sr|ii|iii|iv)\b\.?/g;
Persons.tokens = (name) => String(name || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/\s*\(.*?\)/g, ' ').replace(/[łŁ]/g, 'l').replace(Persons.STRIP, ' ').replace(/[^a-z]+/g, ' ').trim().split(' ')
  .filter(t => t.length > 1);                                   // iniciais soltas ("Austin J. Hill") não contam
Persons.canon = (name) => { const t = Persons.tokens(name); if (t.length) t[0] = Persons.NICK[t[0]] || t[0]; return t; };
Persons.key = (name) => Persons.canon(name).join(' ');
Persons.isQ = (uid) => typeof uid === 'string' && /^Q\d+$/.test(uid);
Persons.pid = (d) => (Persons.isQ(d.uid) ? d.uid : `n:${Persons.key(d.name)}:${d.dob ? d.dob.slice(0, 4) : '?'}`);

/* nomes compatíveis: iguais na forma canônica, ou um contido no outro com o mesmo sobrenome
   (o mais curto precisa ter nome e sobrenome) */
Persons.nameMatch = (a, b) => {
  const x = Persons.canon(a), y = Persons.canon(b);
  if (!x.length || !y.length) return false;
  if (x.join(' ') === y.join(' ')) return 'igual';
  // sobrenome final igual (sobrenomes compostos: "Granada Ferrero" contém "Granada")
  const short = x.length <= y.length ? x : y, long = short === x ? y : x;
  if (short.length < 2) return false;
  const lastOk = short[short.length - 1] === long[long.length - 1] || (long.includes(short[short.length - 1]) && short[0] === long[0]);
  if (!lastOk) return false;
  return short.every(t => long.includes(t)) ? 'contido' : false;
};
/* algo que prova que são pessoas diferentes */
Persons.suffix = (name) => { const m = String(name || '').toLowerCase().match(/\b(jr|sr|ii|iii|iv)\b\.?/); return m ? m[1] : ''; };
/* anos em que a pessoa correu (fonte real ou histórico do jogo) */
Persons.years = (d) => [...(d.realSeasons || []).map(s => s[0]), ...(d.history || []).map(h => h.y)].filter(Number.isFinite);
Persons.conflict = (a, b) => {
  if (Persons.suffix(a.name) !== Persons.suffix(b.name)) return 'pai e filho (Jr./Sr.)';
  // idade impossível: correu antes dos 12 ou depois dos 62 anos segundo o nascimento do outro registro
  for (const [x, y] of [[a, b], [b, a]]) {
    if (!x.dob) continue;
    const by = Number(x.dob.slice(0, 4)), ys = Persons.years(y);
    if (ys.length && (Math.min(...ys) < by + 12 || Math.max(...ys) > by + 62)) return 'idade incompatível';
  }
  if (Persons.isQ(a.uid) && Persons.isQ(b.uid) && a.uid !== b.uid) return 'QID diferente';
  if (a.dob && b.dob && a.dob !== b.dob) return 'nascimento diferente';
  if (a.nat && b.nat && a.nat !== b.nat) return 'nacionalidade diferente';
  if (a.regen && b.regen) return 'dois pilotos gerados';           // fictícios homônimos: pessoas diferentes
  if ((a.regen && !b.regen) || (!a.regen && b.regen)) return 'um real e um gerado';
  // os dois correram a mesma temporada em séries diferentes ao mesmo tempo com números e equipes distintos:
  // não basta para separar (pilotos correm várias séries), então não é conflito
  return null;
};
/* evidência mínima além do nome para nomes "contidos" */
Persons.evidence = (a, b, how) => {
  if (how === 'igual') return a.nat && b.nat ? 'nome e nacionalidade' : 'nome';
  if (a.dob && b.dob && a.dob === b.dob) return 'nome e nascimento';
  if (a.nat && b.nat && a.nat === b.nat) return 'nome e nacionalidade';
  return null;
};
Persons.same = (a, b) => {
  if (!a || !b || a === b || a.id === b.id) return null;
  const how = Persons.nameMatch(a.name, b.name);
  if (!how) return null;
  if (Persons.conflict(a, b)) return null;
  const ev = Persons.evidence(a, b, how);
  return ev ? { how, ev } : null;
};

/* quem fica: assento na F1 > QID > nascimento > foto > carreira mais recente */
Persons.score = (d) => (d.team ? 100 : 0) + (Persons.isQ(d.uid) ? 12 : 0) + (d.dob ? 6 : 0) + (d.img || d.commonsImg ? 3 : 0) + ((d.career && d.career.starts) ? 4 : 0)
  + (d.regen ? -50 : 0) + Math.max(0, ...((d.realSeasons || []).map(s => s[0] - 2020))) * 0.5 + (d.id.startsWith('c-') ? 0 : 2);

/* ---------- troca de referências no save ---------- */
Persons.walk = (node, drop, keep, seen) => {
  if (!node || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      if (node[i] === drop) node[i] = keep;
      else Persons.walk(node[i], drop, keep, seen);
    }
    // listas de ids: sem repetição
    if (node.length && node.every(x => typeof x === 'string')) { const u = [...new Set(node)]; if (u.length !== node.length) { node.length = 0; node.push(...u); } }
    // inscrições de categoria: um piloto, uma inscrição
    if (node.length && node.every(x => x && typeof x === 'object' && 'did' in x && 'team' in x)) {
      const s = new Set(); const u = node.filter(x => (s.has(x.did) ? false : (s.add(x.did), true)));
      if (u.length !== node.length) { node.length = 0; node.push(...u); }
    }
    return;
  }
  // mapas indexados pelo id do piloto (estatísticas, pontos)
  if (Object.prototype.hasOwnProperty.call(node, drop)) {
    const v = node[drop];
    if (Object.prototype.hasOwnProperty.call(node, keep)) node[keep] = Persons.mergeVal(node[keep], v);
    else node[keep] = v;
    delete node[drop];
  }
  for (const k of Object.keys(node)) {
    const v = node[k];
    if (v === drop) node[k] = keep;
    else if (v && typeof v === 'object') Persons.walk(v, drop, keep, seen);
  }
};
Persons.mergeVal = (a, b) => {
  if (typeof a === 'number' && typeof b === 'number') return +(a + b).toFixed(3);
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) {
    const o = { ...a };
    Object.keys(b).forEach(k => { o[k] = k in o ? (typeof o[k] === 'number' && typeof b[k] === 'number' ? (k === 'best' ? Math.min(o[k], b[k]) : +(o[k] + b[k]).toFixed(3)) : o[k] ?? b[k]) : b[k]; });
    return o;
  }
  return a ?? b;
};

/* une os dados do registro que sai no que fica */
Persons.absorb = (keep, drop) => {
  ['dob', 'img', 'commonsImg', 'nat', 'number', 'gender', 'wiki'].forEach(k => { if (keep[k] == null && drop[k] != null) keep[k] = drop[k]; });
  if (!Persons.isQ(keep.uid) && Persons.isQ(drop.uid)) keep.uid = drop.uid;
  else if (!keep.uid && drop.uid) keep.uid = drop.uid;
  keep.aliases = [...new Set([...(keep.aliases || []), ...(drop.aliases || []), drop.name].filter(n => n && n !== keep.name))];
  keep.oldIds = [...new Set([...(keep.oldIds || []), ...(drop.oldIds || []), drop.id])];
  // carreira real temporada a temporada: união sem repetir (ano + série)
  const rs = [...(keep.realSeasons || [])];
  (drop.realSeasons || []).forEach(s => { if (!rs.some(x => x[0] === s[0] && x[1] === s[1])) rs.push(s); });
  if (rs.length) keep.realSeasons = rs.sort((a, b) => a[0] - b[0]);
  // superlicença: uma linha por ano e série
  const sl = [...(keep.sl || [])];
  (drop.sl || []).forEach(s => { if (!sl.some(x => x.y === s.y && x.cat === s.cat)) sl.push(s); });
  keep.sl = sl;
  // histórico simulado e real
  keep.history = [...(keep.history || []), ...(drop.history || []).filter(h => !(keep.history || []).some(x => x.y === h.y && (x.cat || x.series) === (h.cat || h.series)))];
  if (drop.career && keep.career) Object.keys(drop.career).forEach(k => { if (typeof drop.career[k] === 'number') keep.career[k] = (keep.career[k] || 0) + drop.career[k]; });
  keep.catTitles = [...(keep.catTitles || []), ...(drop.catTitles || [])];
  keep.catYears = Persons.mergeVal(keep.catYears || {}, drop.catYears || {});
  // vaga: quem está na F1 fica na F1; senão, herda a categoria/série do outro registro
  if (!keep.team && !keep.cat && drop.cat) { keep.cat = drop.cat; keep.ctm = drop.ctm; }
  if (!keep.team && !keep.cat && !keep.series && drop.series) { keep.series = drop.series; keep.seriesTeam = drop.seriesTeam; keep.seriesStatus = drop.seriesStatus; }
  if (keep.retired && !drop.retired) { keep.retired = false; delete keep.retiredYear; }
  keep.potential = Math.max(keep.potential || 0, drop.potential || 0) || keep.potential;
};

/* une dois registros no save inteiro */
Persons.merge = (G, keep, drop, why) => {
  Persons.absorb(keep, drop);
  G.db.drivers = G.db.drivers.filter(d => d !== drop);
  const seen = new Set([keep]);
  Persons.walk(G, drop.id, keep.id, seen);
  // F1: piloto com assento não ocupa vaga de categoria
  if (keep.team && keep.seat !== 'R' && G.cats) Object.values(G.cats.byId).forEach(c => { c.entries = c.entries.filter(e => e.did !== keep.id); });
  if (keep.team && keep.seat !== 'R') keep.cat = null;
  // a vaga herdada precisa bater com o que a pessoa correu de verdade no último ano da fonte
  const lastY = Math.max(0, ...(keep.realSeasons || []).map(s => s[0]).filter(v => v <= 2026));
  const real = new Set((keep.realSeasons || []).filter(s => s[0] === lastY).map(s => s[1]));
  if (keep.cat && real.size && !real.has(keep.cat) && G.cats) {
    Object.values(G.cats.byId).forEach(c => { c.entries = c.entries.filter(e => e.did !== keep.id); });
    keep.cat = null; keep.ctm = null;
    const sid = [...real][0]; if (!(G.cats.byId[sid])) { keep.series = sid; }
  }
  G.persons = G.persons || { merged: [], renamed: [] };
  G.persons.merged.push({ keep: keep.id, drop: drop.id, name: keep.name, alias: drop.name, why, y: G.season ? G.season.year : null });
  if (typeof Career !== 'undefined' && G.season) Career.record(G, 'decisao', byLang(`Base de dados: ${drop.name} (${drop.id}) e ${keep.name} são a mesma pessoa (${why}); registros unificados.`, `Database: ${drop.name} (${drop.id}) and ${keep.name} are the same person (${why}); records merged.`), { drivers: [keep.id] });
};

/* pilotos gerados com nome repetido: o mais novo recebe outro nome */
Persons.renameRegen = (G, d) => {
  const taken = (n) => G.db.drivers.some(o => o !== d && Persons.key(o.name) === Persons.key(n));
  const old = d.name;
  for (let i = 0; i < 25 && taken(d.name); i++) d.name = old.replace(/^(\S+)( [A-Z]\.)? /, `$1 ${'ABCDEFGHIJKLMNOPRSTUVWXYZ'[i]}. `);
  G.persons = G.persons || { merged: [], renamed: [] };
  G.persons.renamed.push({ id: d.id, from: old, to: d.name });
};

/* varredura completa: devolve {merged, review} */
Persons.dedupe = (G, opts = {}) => {
  const ds = G.db.drivers;
  const byLast = new Map();
  ds.forEach(d => { const t = Persons.canon(d.name); if (!t.length) return; const k = t[t.length - 1]; (byLast.get(k) || byLast.set(k, []).get(k)).push(d); });
  // sobrenome composto: "Granada Ferrero" também entra em "granada"
  ds.forEach(d => { const t = Persons.canon(d.name); t.slice(1, -1).forEach(k => { if (byLast.has(k)) byLast.get(k).push(d); }); });
  const pairs = [], review = [];
  const done = new Set();
  byLast.forEach(list => {
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (a === b) continue;
      const pk = [a.id, b.id].sort().join('|'); if (done.has(pk)) continue; done.add(pk);
      const how = Persons.nameMatch(a.name, b.name);
      if (how === 'igual' && (a.regen || b.regen)) { pairs.push({ rename: a.regen && b.regen ? (b.id > a.id ? b : a) : a.regen ? a : b }); continue; }
      const m = Persons.same(a, b);
      if (m) { pairs.push({ a, b, why: `${m.how === 'igual' ? 'mesmo nome' : 'nome contido'}, ${m.ev}` }); continue; }
      // mesmo sobrenome, mesma nacionalidade, primeiro nome parecido: revisão manual (não unifica)
      const x = Persons.canon(a.name), y = Persons.canon(b.name);
      if (!how && a.nat && a.nat === b.nat && x[0] && y[0] && x[0][0] === y[0][0] && x[x.length - 1] === y[y.length - 1] && !(a.dob && b.dob && a.dob !== b.dob))
        review.push({ a: a.id, an: a.name, b: b.id, bn: b.name, nat: a.nat });
    }
  });
  const gone = new Set();
  pairs.forEach(p => {
    if (p.rename) { if (!gone.has(p.rename.id)) Persons.renameRegen(G, p.rename); return; }
    if (gone.has(p.a.id) || gone.has(p.b.id)) return;
    const [keep, drop] = Persons.score(p.a) >= Persons.score(p.b) ? [p.a, p.b] : [p.b, p.a];
    if (opts.dry) { gone.add(drop.id); return; }
    Persons.merge(G, keep, drop, p.why); gone.add(drop.id);
  });
  G.db.drivers.forEach(d => { d.pid = Persons.pid(d); });
  G.persons = G.persons || { merged: [], renamed: [] };
  G.persons.review = review;
  return { merged: pairs.filter(p => !p.rename).length, renamed: pairs.filter(p => p.rename).length, review };
};
/* índice por sobrenome para procurar pessoas com a mesma regra (usado nas importações) */
Persons.index = (drivers) => {
  const m = new Map();
  const add = (d) => {
    const names = [d.name, ...(d.aliases || [])];
    const keys = new Set();
    names.forEach(n => { const t = Persons.canon(n); t.forEach((k, i) => { if (i > 0 || t.length === 1) keys.add(k); }); });
    keys.forEach(k => (m.get(k) || m.set(k, []).get(k)).push(d));
  };
  drivers.forEach(add);
  const find = (name, spec = {}) => {
    const t = Persons.canon(name); if (!t.length) return null;
    const cands = [...new Set(t.slice(t.length > 1 ? 1 : 0).flatMap(k => m.get(k) || []))];
    const probe = { id: '?', name, nat: spec.nat || null, dob: spec.dob || null, uid: spec.uid || null, realSeasons: spec.realSeasons, regen: spec.regen };
    const key = Persons.key(name);
    return cands.find(d => Persons.key(d.name) === key && !Persons.conflict(d, probe))
      || cands.find(d => (d.aliases || []).some(a => Persons.key(a) === key) && !Persons.conflict(d, probe))
      || cands.find(d => Persons.same(d, probe)) || null;
  };
  return { add, find };
};
