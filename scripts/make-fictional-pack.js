// Pacote de dados fictício (regra 19 do dono, 13/11/2026): o banco de dados original, inteiro e idêntico, com todos
// os nomes trocados por nomes gerados automaticamente e os mesmos IDs. Decisões do dono no mesmo dia: trocam pessoas,
// equipes, fabricantes, marcas, patrocinadores e competições; circuitos, GPs, cidades e países ficam reais; os nomes
// são fixos na edição (o mesmo nome real vira sempre o mesmo nome fictício).
//
// Como: um dicionário palavra a palavra (as sequências de letras que o jogo usa para ligar pessoas entre as bases,
// Cats.norm) montado a partir dos campos de nome. Cada palavra própria vira sempre a mesma palavra fictícia; palavras
// genéricas (Racing, Team, Grand Prix...) e campos de lugar ficam como estão. Onde o jogo cria um id ou um sorteio a
// partir do nome, o pacote leva o id (cid/id) e o hash (h) calculados com o nome real, para tudo sair igual.
// Uso: node scripts/make-fictional-pack.js [saída=dist-pack/pitwall-ficticio.json]
//      require('./make-fictional-pack').buildFictionalPack()  -> { pack, map }  (map: o dicionário, para os testes)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const N = require('./fictional-names');
const root = path.join(__dirname, '..');

// funções do próprio jogo (o mesmo hash e a mesma normalização de nomes)
const game = (() => {
  const ctx = vm.createContext({});
  for (const m of ['core/base/util']) vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8'), ctx);
  const ps = fs.readFileSync(path.join(root, 'app', 'src', 'core', 'base', 'persons.js'), 'utf8');
  const nickSrc = ps.slice(ps.indexOf('Persons.NICK = {') + 'Persons.NICK = '.length, ps.indexOf('};', ps.indexOf('Persons.NICK = {')) + 1);
  ctx.__nick = nickSrc;
  const ds = fs.readFileSync(path.join(root, 'app', 'src', 'core', 'season', 'disciplines.js'), 'utf8');
  ctx.__fem = ds.slice(ds.indexOf('Disc.FEMALE = {') + 'Disc.FEMALE = '.length, ds.indexOf('};', ds.indexOf('Disc.FEMALE = {')) + 1);
  vm.runInContext("this.G = { female: eval('(' + __fem + ')'), namePool: JSON.parse(JSON.stringify(NAME_POOL)), nick: eval('(' + __nick + ')'), hashStr, norm: (s) => String(s || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/[^a-z]+/g, ' ').trim() }", ctx);
  return ctx.G;
})();
const keyOf = (w) => game.norm(w).replace(/ /g, '');

// palavras que não são nome de ninguém: ficam como estão
const GENERIC = new Set(`racing team teams motorsport motorsports motor sport sports grand prix gp series championship championships cup trophy
challenge junior juniors academy programme program world international regional national super pro open masters endurance autosport engineering
competition competitions corse scuderia squadra equipe ecurie garage works factory group global management agency talent partners performance
technology technologies by with and e of the de da do dos das del della di du des van von der den le la el los las y jr sr ii iii iv ltd gmbh spa
inc corp corporation holding holdings familia grupo escuderia club clube automobile automobili auto cars car rally rallycross truck trucks stock
touring turismo gt lmp hypercar prototype sprint feature season temporada campeonato copa trofeu taca serie mundial europeu europeia european asian
americas america middle east oceania japanese spanish italian british german french australian brazilian dutch belgian swiss austrian
nordic north south west central danish swedish finnish norwegian polish czech russian indian thai korean mexican argentine argentinian canadian
portuguese irish scottish welsh new zealand chinese arabian emirates saudi africa african asia europe one two three four oriente medio medio
americas japan japao espanha italia franca alemanha reino unido brasil eua estados unidos emirados arabes britanica alema francesa japonesa
espanhola italiana brasileira americana asiatica do com em e no na nos nas para pelo pela por ao aos as os um uma o a lista seasons edition
open classic cup cups trophies race races junior national formula1 driver drivers program`.split(/\s+/).filter(Boolean));

// campos (por caminho) onde há nomes: pessoa, organização/marca/competição, ou misto (pessoas e empresas)
const PERSON = [
  'REAL_DB.drivers[].name', 'REAL_DB.drivers[].firstName', 'REAL_DB.drivers[].lastName', 'REAL_DB.teams[].principal',
  'REAL_EXTRA.newDrivers[].name', 'REAL_EXTRA.newDrivers[].firstName', 'REAL_EXTRA.newDrivers[].lastName',
  'REAL_EXTRA.raceEngineers.*', 'REAL_EXTRA.staff.*.principal', 'REAL_EXTRA.staff.*.technical', 'REAL_EXTRA.staff.*.sporting',
  'REAL_EXTRA.staff.*.operations', 'REAL_EXTRA.staff.*.commercial', 'REAL_EXTRA.staff.*.engine', 'REAL_EXTRA.academies[].members[].name',
  'REAL_HISTORY.drivers.*[0]', 'TEAM_LORE.*.principals[][0]', 'REAL_CATS.cats[].drivers[].name', 'REAL_CATS.cats[].drivers[].wiki',
  'REAL_CATS.cats[].standings[][1]', 'DRIVERDB_2026.people.*.name', 'DRIVERDB_2026.series.*[][1]', 'DRIVER_DB.drivers[].name',
  'DRIVER_DB.drivers[].aliases[]', 'DRIVER_DB.drivers[].wiki', 'WORLD_LISTS.creators[].name',
];
const ORG = [
  'REAL_DB.teams[].name', 'REAL_DB.teams[].fullName', 'REAL_DB.teams[].sponsors[]', 'REAL_DB.engines[].name', 'REAL_DB.name',
  'REAL_EXTRA.staff.*.chassis', 'REAL_EXTRA.staff.*.pu', 'REAL_EXTRA.academies[].name', 'REAL_EXTRA.academies[].members[].series[]',
  'REAL_HISTORY.constructors.*[0]', 'REAL_RECORDS.names.*', 'REAL_CATS.cats[].name', 'REAL_CATS.cats[].page', 'REAL_CATS.cats[].teams[].name',
  'REAL_CATS.cats[].teamStandings[][1]', 'DRIVERDB_2026.people.*.team', 'DRIVER_DB.drivers[].seasons[].team', 'DRIVER_DB.series.*.name',
  'DRIVER_DB.series.*.ecoName', 'DRIVER_DB.series.*.seasons.*.page', 'TEAM_CANDIDATES[].name', 'TEAM_CANDIDATES[].fullName',
  'DRIVERDB_2026.series.*[][3]', 'WORLD_LISTS.mfrCands[].name', 'WORLD_LISTS.mfrGenPool[][0]', 'WORLD_LISTS.tyres.*.name',
  'WORLD_LISTS.groupPolicies.*.name', 'WORLD_LISTS.outlets.*.name',
];
const MIXED = ['REAL_EXTRA.managers.*', 'TEAM_OWNERS.*.name', 'TEAM_CANDIDATES[].owner.name'];
// siglas: viram siglas fictícias tiradas do nome fictício (mesmo tamanho)
const ABBR = { 'REAL_DB.drivers[].abbr': 'lastName', 'REAL_DB.teams[].short': 'name', 'TEAM_CANDIDATES[].short': 'name', 'REAL_CATS.cats[].short': 'name' };
// lugares: ficam reais (decisão do dono) e são protegidos dentro dos textos
const PLACE = [
  'REAL_DB.tracks', 'REAL_DB.natNames', 'REAL_DB.calendar', 'FIA_CIRCUITS', 'REAL_TRACKS', 'REAL_HISTORY.circuits', 'REAL_HISTORY.seasons',
  'REAL_CATS.cats[].calendar', 'TEAM_CANDIDATES[].base', 'TEAM_LORE.*.base', 'DRIVERDB_2026.people.*.natName', 'F1_CALENDAR_2027',
  'DRIVER_TIERS', 'DRIVER_WOMEN', 'GENERIC_LOGOS',
];
// fonte, foto e arquivo: no fictício não há fonte externa nem foto
const ATTRIBUTION = new Set(['src', 'source', 'sources', 'img', 'logo', 'carImg', 'teamLogo', 'heroImg', 'mapImg', 'origin', 'license', 'page_url']);
const ID_KEYS = new Set(['id', 'uid', 'qid', 'cid']);   // os outros ids são códigos em minúsculas, que a troca já não toca   // ids: nunca mudam
const FICT_SOURCE = 'Mundo fictício do PitWall (gerado a partir da base do jogo)';

// objetos que são mapas por id (a chave é um id, não um campo): no caminho, a chave vira *
const MAPS = new Set(['REAL_HISTORY.drivers', 'REAL_HISTORY.constructors', 'REAL_HISTORY.circuits', 'REAL_RECORDS.names', 'REAL_RECORDS.circuits',
  'REAL_RECORDS.chronology', 'TEAM_LORE', 'TEAM_OWNERS', 'REAL_EXTRA.contracts', 'REAL_EXTRA.managers', 'REAL_EXTRA.raceEngineers', 'REAL_EXTRA.staff',
  'REAL_EXTRA.budgets', 'REAL_EXTRA.partners', 'REAL_EXTRA.superlicense', 'DRIVERDB_2026.people', 'DRIVERDB_2026.series', 'DRIVER_DB.series',
  'DRIVER_DB.series.*.seasons', 'SPONSOR_BRANDS', 'REAL_DB.natNames', 'DRIVER_TIERS.series', 'DRIVER_TIERS.f1',
  'WORLD_LISTS.tyres', 'WORLD_LISTS.groupPolicies', 'WORLD_LISTS.outlets']);
// percorre todos os textos: fn(texto, caminho). Caminho: campos com ".", arrays com "[]", e o índice de um texto
// que está direto num array como "[i]" (ex.: REAL_CATS.cats[].standings[][1]). Se fn devolver algo, troca o texto.
function each(v, p, fn) {
  if (Array.isArray(v)) { v.forEach((x, i) => { if (typeof x === 'string') { const r = fn(x, p + '[' + i + ']'); if (r !== undefined) v[i] = r; } else each(x, p + '[]', fn); }); return; }
  if (v && typeof v === 'object') {
    for (const k of Object.keys(v)) {
      const pk = (p ? p + '.' : '') + (MAPS.has(p) ? '*' : k);
      if (typeof v[k] === 'string') { const r = fn(v[k], pk); if (r !== undefined) v[k] = r; } else each(v[k], pk, fn);
    }
  }
}
const inList = (list, p) => { const g = p.replace(/\[\d+\]$/, '[]'); return list.some(pat => p === pat || g === pat || p.startsWith(pat + '.') || p.startsWith(pat + '[')); };
const leafOf = (p) => p.split('.').pop().replace(/\[.*$/, '');

function buildFictionalPack(realPack) {
  const real = realPack || require('./make-data-pack').buildPack();
  const C = JSON.parse(JSON.stringify(real.content));
  const women = new Set(C.DRIVER_WOMEN || []);
  const stats = new Map();    // chave -> { first, last, org, fam: {}, F, M, upper, samples }
  const placeStrings = new Set();
  const lower = new Set();    // palavras em minúsculas que aparecem em textos que não são nome (códigos, português)
  const note = (w, kind, nat, gender, upper) => {
    const k = keyOf(w); if (k.length < 2 || GENERIC.has(k)) return;
    const s = stats.get(k) || { first: 0, last: 0, org: 0, fam: {}, F: 0, M: 0, upper: 0, n: 0 };
    s[kind]++; s.n++; if (upper) s.upper++;
    if (nat) { const f = N.familyOf(nat); s.fam[f] = (s.fam[f] || 0) + 1; }
    if (gender) s[gender]++;
    stats.set(k, s);
  };
  const words = (str) => String(str).match(/\p{L}+/gu) || [];
  const notePerson = (str, nat, gender) => { const ws = words(str).filter(w => w.length > 1); ws.forEach((w, i) => note(w, i === 0 && ws.length > 1 ? 'first' : 'last', nat, gender, w === w.toUpperCase())); };
  const noteOrg = (str) => words(str).forEach(w => { if (w.length > 1) note(w, 'org', null, null, w === w.toUpperCase()); });

  // 1) junta as palavras dos campos de nome (com nacionalidade e gênero quando há)
  const natOf = (obj) => (obj && (obj.nat || obj.country)) || null;
  const genderOf = (obj, catId) => (obj && (women.has(obj.uid) || obj.gender === 'F' || catId === 'f1a') ? 'F' : 'M');
  C.REAL_DB.drivers.forEach(d => notePerson(d.name, d.nat, 'M'));
  (C.REAL_EXTRA.newDrivers || []).forEach(d => notePerson(d.name, d.nat, 'M'));
  C.DRIVER_DB.drivers.forEach(d => { const g = genderOf(d); notePerson(d.name, d.nat, g); (d.aliases || []).forEach(a => notePerson(a, d.nat, g)); if (d.wiki) notePerson(d.wiki.replace(/\s*\(.*?\)/g, ''), d.nat, g); });
  Object.values(C.REAL_HISTORY.drivers).forEach(a => notePerson(a[0], a[1], 'M'));
  Object.values(C.DRIVERDB_2026.people).forEach(x => notePerson(x.name, x.nat, null));
  Object.entries(C.DRIVERDB_2026.series).forEach(([sid, rows]) => rows.forEach(r => notePerson(r[1], null, sid === 'f1a' ? 'F' : null)));
  C.REAL_CATS.cats.forEach(c => { c.drivers.forEach(d => { notePerson(d.name, d.nat, c.id === 'f1a' ? 'F' : 'M'); if (d.wiki) notePerson(d.wiki.replace(/\s*\(.*?\)/g, ''), d.nat, null); }); c.standings.forEach(r => notePerson(r[1], null, null)); });
  (C.REAL_EXTRA.academies || []).forEach(a => a.members.forEach(m => notePerson(m.name, m.nat, null)));
  Object.values(C.REAL_EXTRA.raceEngineers || {}).forEach(n => notePerson(n, null, 'M'));
  Object.values(C.REAL_EXTRA.staff || {}).forEach(s => ['principal', 'technical', 'sporting', 'operations', 'commercial', 'engine'].forEach(k => s[k] && notePerson(s[k], null, 'M')));
  C.REAL_DB.teams.forEach(t => t.principal && notePerson(t.principal, null, 'M'));
  Object.keys(C.REAL_EXTRA.famousStaff || {}).forEach(n => notePerson(n, null, 'M'));
  // nomes que o jogo sorteia (NAME_POOL do núcleo): entram no dicionário para o pacote fictício trazer a mesma lista
  // trocada; um nome sorteado igual ao de uma pessoa real vira o mesmo nome fictício (as colisões continuam iguais)
  Object.entries(game.female).forEach(([nat, list]) => list.forEach(w => note(w, 'first', nat, 'F', false)));
  Object.entries(game.namePool).forEach(([nat, p]) => { (p.f || []).forEach(w => note(w, 'first', nat, null, false)); (p.l || []).forEach(w => note(w, 'last', nat, null, false)); });
  Object.values(C.TEAM_LORE || {}).forEach(l => (l.principals || []).forEach(p => notePerson(p[0], null, 'M')));
  // organizações, marcas e competições
  C.REAL_DB.teams.forEach(t => { noteOrg(t.name); noteOrg(t.fullName || ''); (t.sponsors || []).forEach(noteOrg); });
  C.REAL_DB.engines.forEach(e => noteOrg(e.name));
  Object.values(C.REAL_EXTRA.staff || {}).forEach(s => { noteOrg(s.chassis || ''); noteOrg(s.pu || ''); });
  (C.REAL_EXTRA.academies || []).forEach(a => { noteOrg(a.name); a.members.forEach(m => (m.series || []).forEach(noteOrg)); });
  Object.values(C.REAL_HISTORY.constructors).forEach(a => noteOrg(a[0]));
  Object.values(C.REAL_RECORDS.names || {}).forEach(noteOrg);
  C.REAL_CATS.cats.forEach(c => { noteOrg(c.name); noteOrg(c.page || ''); c.teams.forEach(t => noteOrg(t.name)); c.teamStandings.forEach(r => noteOrg(r[1])); });
  Object.values(C.DRIVERDB_2026.people).forEach(x => x.team && noteOrg(x.team));
  Object.values(C.DRIVERDB_2026.series).forEach(rows => rows.forEach(r => typeof r[3] === 'string' && noteOrg(r[3])));
  C.DRIVER_DB.drivers.forEach(d => d.seasons.forEach(s => s.team && noteOrg(s.team)));
  Object.values(C.DRIVER_DB.series).forEach(s => { noteOrg(s.name); noteOrg(s.ecoName || ''); Object.values(s.seasons || {}).forEach(x => noteOrg(x.page || '')); });
  (C.TEAM_CANDIDATES || []).forEach(t => { noteOrg(t.name); noteOrg(t.fullName || ''); });
  Object.keys(C.SPONSOR_BRANDS || {}).forEach(noteOrg);
  (C.SPONSOR_POOL || []).forEach(noteOrg);
  const WL = C.WORLD_LISTS || {};
  (WL.mfrCands || []).forEach(x => noteOrg(x.name)); (WL.mfrGenPool || []).forEach(x => noteOrg(x[0]));
  Object.values(WL.tyres || {}).forEach(x => noteOrg(x.name)); Object.values(WL.groupPolicies || {}).forEach(x => noteOrg(x.name));
  Object.values(WL.outlets || {}).forEach(x => noteOrg(x.name)); (WL.creators || []).forEach(x => notePerson(x.name, null, null));
  Object.values(C.REAL_EXTRA.identities || {}).forEach(byYear => Object.values(byYear).forEach(id => {
    ['name', 'fullName', 'titleSponsor', 'ended'].forEach(k => id[k] && noteOrg(id[k]));
    [...(id.sponsorsAdd || []), ...(id.sponsorsRemove || [])].forEach(noteOrg);
  }));
  // mistos: empresário, dono (pessoas e empresas)
  Object.values(C.REAL_EXTRA.managers || {}).forEach(s => notePerson(s, null, 'M'));
  Object.values(C.TEAM_OWNERS || {}).forEach(o => o.name && noteOrg(o.name));
  (C.TEAM_CANDIDATES || []).forEach(t => t.owner && t.owner.name && noteOrg(t.owner.name));

  // 2) lugares (ficam reais) e palavras em minúsculas de textos que não são nome
  each(C, '', (s, p) => {
    const f = (list) => inList(list, p);
    if (f(PLACE)) { placeStrings.add(s); return undefined; }
    if (f(PERSON) || f(ORG) || f(MIXED)) return undefined;
    (s.match(/\p{L}+/gu) || []).forEach(w => { if (w === w.toLowerCase()) lower.add(keyOf(w)); });
    return undefined;
  });
  // nomes de pessoas citados só em textos (ex.: "Fundada em 2002 por Oliver Oakes"): duas palavras com maiúscula seguidas
  const placeWords = new Set([...placeStrings].flatMap(s => words(s).map(keyOf)));
  const freeTexts = [];
  each(C, '', (s, p) => { const f = (list) => inList(list, p); if (!f(PLACE) && !f(PERSON) && !f(ORG) && !f(MIXED) && /\s/.test(s) && /\p{Lu}/u.test(s)) freeTexts.push(s); return undefined; });
  freeTexts.forEach(t => (t.match(/\p{Lu}\p{Ll}+(?:\s+\p{Lu}\p{Ll}+)+/gu) || []).forEach(seq => {
    const ws = words(seq).filter(w => !GENERIC.has(keyOf(w)) && !placeWords.has(keyOf(w)));
    if (ws.length >= 2 && !stats.has(keyOf(ws[0])) && /^[A-Z]/.test(ws[0])) ws.forEach((w, i) => note(w, i === 0 ? 'first' : 'last', null, 'M', false));
    else ws.forEach(w => { if (stats.has(keyOf(w))) note(w, stats.get(keyOf(w)).org > 0 ? 'org' : 'last', null, null, false); });
  }));

  // 3) uma palavra fictícia para cada palavra real (ordem fixa: as mais citadas primeiro, depois alfabética)
  const used = new Set([...stats.keys(), ...GENERIC, ...placeWords, ...lower]);
  const map = new Map();
  const keys = [...stats.keys()].sort((a, b) => (stats.get(b).n - stats.get(a).n) || (a < b ? -1 : 1));
  for (const k of keys) {
    const s = stats.get(k);
    const person = s.first + s.last > 0;
    const role = s.first > s.last ? 'first' : 'last';
    const fam = Object.entries(s.fam).sort((a, b) => b[1] - a[1])[0];
    const family = fam ? fam[0] : 'en';
    const gender = s.F > s.M ? 'F' : 'M';
    const allCaps = s.upper > 0 && s.upper >= s.n / 2 && k.length <= 5;
    let fake = null;
    for (let a = 0; a < 400 && !fake; a++) {
      const seed = `pitwall-ficticio-v1:${k}:${a}`;
      let w = allCaps ? N.acronym(N.brandWord(seed), k.length, a) : person ? N.personWord(family, role, gender, seed, a > 60, k[0]) : N.brandWord(seed);
      const wk = keyOf(w);
      if (wk.length < 2 || used.has(wk)) continue;
      fake = w; used.add(wk);
    }
    if (!fake) throw new Error('make-fictional-pack: sem nome livre para ' + k);
    map.set(k, fake);
  }
  // apelidos de primeiro nome (Persons.NICK: cam -> cameron): a forma curta ganha a mesma palavra fictícia da forma
  // completa, para "Cam Waters" e "Cameron Waters" continuarem sendo reconhecidos como a mesma pessoa
  // (ficam numa tabela própria do pacote, NICKNAMES, com as palavras fictícias; o jogo usa só para o primeiro nome)
  const nickFict = {};
  for (const [short, full] of Object.entries(game.nick)) {
    if (!map.has(short)) continue;
    const fs2 = keyOf(map.get(short)), ff = map.has(full) ? keyOf(map.get(full)) : fs2;
    nickFict[fs2] = ff;
  }
  // letra antes de número em marcas e competições (F1, W17): troca a letra por outra fixa
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', SHIFT = 'PKRTZVLWMXNHGDBCSFQJYAEUIO';
  const letterDigit = (ch) => (ch === 'F' ? 'V' : ch);   // só F1–F4 (V1–V4): Q1, P1, W17 e outros códigos ficam como estão

  // 4) a troca: mesma função para todos os textos (lugares protegidos; códigos e ids em minúsculas ficam)
  const protectedPhrases = [...placeStrings].filter(s => words(s).some(w => map.has(keyOf(w)))).sort((a, b) => b.length - a.length);
  // marcas escritas só em minúsculas (ex.: patrocinador 'bp'): troca o texto inteiro
  const forced = new Map();
  [...C.REAL_DB.teams.flatMap(t => t.sponsors || []), ...Object.keys(C.SPONSOR_BRANDS || {})].forEach(x => { if (/^[a-z0-9 ]+$/.test(x) && /[a-z]/.test(x)) { const w = (x.match(/[a-z]+/g) || []).find(y => map.has(keyOf(y))); if (w) forced.set(x, x.replace(w, map.get(keyOf(w)).toLowerCase())); } });
  const caseLike = (orig, fake) => (orig.length > 1 && orig === orig.toUpperCase() ? fake.toUpperCase() : orig === orig.toLowerCase() ? fake.toLowerCase() : fake.charAt(0).toUpperCase() + fake.slice(1));
  // códigos de país: os valores dos campos de nacionalidade da base (nunca mudam)
  const natCodes = new Set(Object.keys(C.REAL_DB.natNames || {}));
  (function grabNat(v, k) { if (typeof v === 'string') { if (/^(nat|country|nationality)$/.test(k) && /^[A-Z]{2,3}$/.test(v)) natCodes.add(v); } else if (Array.isArray(v)) v.forEach(x => grabNat(x, k)); else if (v && typeof v === 'object') Object.entries(v).forEach(([kk, x]) => grabNat(x, kk)); })(C, '');
  const slugLike = (s) => /^[a-z0-9]+(?:[-_.:/][a-z0-9]+)*$/.test(s) || /^Q[0-9]+$/.test(s) || natCodes.has(s);   // ids, QIDs e códigos de país
  // names = true só em campos que são nomes: aí até a parte em minúscula de um nome muda ("R-ace GP")
  const mapText = (s, names) => {
    if (typeof s !== 'string' || !s) return s;
    if (forced.has(s)) return forced.get(s);
    if (slugLike(s) && !names) return s;
    const hold = [];
    let t = s;
    for (const p of protectedPhrases) { if (t.includes(p)) t = t.split(p).join(`\u0000${hold.push(p) - 1}\u0000`); }
    // nomes forçados (feitos de palavras genéricas) também dentro de textos: o nome inteiro, com limite de palavra
    for (const p of forcedList) {
      if (!t.includes(p)) continue;
      let out = '', i = 0, j;
      while ((j = t.indexOf(p, i)) >= 0) {
        const before = t[j - 1], after = t[j + p.length];
        const okL = !before || !/\p{L}/u.test(before), okR = !after || !/\p{L}/u.test(after);
        out += t.slice(i, j) + (okL && okR ? `\u0000${hold.push(forced.get(p)) - 1}\u0000` : p);
        i = j + p.length;
      }
      t = out + t.slice(i);
    }
    t = t.replace(/\p{L}+/gu, (w, off, all) => {
      if (w.length === 1) return /\d/.test(all.charAt(off + 1) || '') && /[A-Z]/.test(w) ? letterDigit(w) : w;
      const k = keyOf(w);
      if (!map.has(k)) return w;
      if (w === w.toLowerCase() && !names) return w;   // minúscula: código, id ou palavra comum (marcas em minúscula: lista forçada)
      return caseLike(w, map.get(k));
    });
    return t.replace(/\u0000(\d+)\u0000/g, (m, i) => hold[+i]);
  };
  const mapName = (s) => mapText(s, true);
  let forcedList = [];   // preenchida depois de montar a lista forçada (logo abaixo)
  // nomes de equipe, marca ou veículo feitos só de palavras genéricas ("The Race", "Autosport") sairiam iguais:
  // ganham um nome de marca gerado, sempre o mesmo para o mesmo texto (entram na lista forçada, valem em todo lugar)
  const usedForced = new Set();
  each(JSON.parse(JSON.stringify(C)), '', (s, p) => {
    const f = (list) => inList(list, p);
    if (!(f(ORG) || f(MIXED)) || f(PLACE) || forced.has(s) || natCodes.has(s) || !/\p{L}{2}/u.test(s)) return undefined;
    if (mapName(s) !== s) return undefined;
    let a = 0, v; do { v = N.brandWord(`pitwall-ficticio-v1:forcado:${s}:${a++}`); } while ((used.has(keyOf(v)) || usedForced.has(v)) && a < 200);
    usedForced.add(v); used.add(keyOf(v)); forced.set(s, v);
    return undefined;
  });
  forcedList = [...forced.keys()].filter(k => k.length >= 4 && /\p{Lu}/u.test(k)).sort((a, b) => b.length - a.length);

  // 5) ids e hashes que o jogo tira do nome: calculados com o nome real e levados no pacote
  const cid = (name) => 'c-' + game.norm(name).replace(/ /g, '-').slice(0, 30);
  C.REAL_CATS.cats.forEach(c => c.drivers.forEach(d => { d.id = cid(d.name); d.h = game.hashStr(d.name); }));
  C.DRIVER_DB.drivers.forEach(p => { p.cid = cid(p.name); });

  // 6) aplica: lugares ficam; fontes e fotos saem; o resto passa pela troca
  each(C, '', (s, p) => {
    const f = (list) => inList(list, p);
    const leaf = leafOf(p);
    if (ID_KEYS.has(leaf)) return undefined;
    if (ATTRIBUTION.has(leaf) || /(src|source)$/i.test(leaf)) return /(src|source)$/i.test(leaf) ? FICT_SOURCE : null;   // fonte e foto: antes até dos lugares
    if (f(PLACE)) return undefined;
    const abbr = Object.keys(ABBR).find(pat => inList([pat], p));
    if (abbr) return undefined;   // siglas: depois, a partir do nome fictício
    return (f(PERSON) || f(ORG) || f(MIXED)) && !slugLike(s) ? mapName(s) : mapText(s);
  });
  // chaves que são nomes (marcas de patrocínio)
  if (C.SPONSOR_BRANDS) C.SPONSOR_BRANDS = Object.fromEntries(Object.entries(C.SPONSOR_BRANDS).map(([k, v]) => [mapText(k) === k && /^[a-z0-9]+$/.test(k) ? caseLike(k, map.get(keyOf(k)) || k) : mapText(k), v]));
  C.REAL_DB.teams.forEach(t => { t.sponsors = (t.sponsors || []).map(x => (/^[a-z0-9]+$/.test(x) && map.has(keyOf(x)) ? caseLike(x, map.get(keyOf(x))) : x)); });
  // siglas a partir do nome fictício, sem repetir
  // com número (F2, F3) a sigla segue a troca de letra do nome ("Fórmula 2" e "F2" mudam juntos); sem número, sai da
  // primeira palavra própria do nome fictício (pulando Racing, Team...)
  const sig = (list, field, from) => {
    const seen = new Set();
    list.forEach(x => {
      if (!x || !x[field]) return;
      const orig = x[field], len = orig.length;
      if (/\d/.test(orig)) { x[field] = orig.replace(/[A-Z](?=\d)/g, letterDigit); seen.add(x[field]); return; }
      const base = (String(x[from] || x.name || '').match(/\p{L}+/gu) || []).filter(w => !GENERIC.has(keyOf(w))).join('') || orig;
      let a = 0, v; do { v = N.acronym(base, len, a++); } while (seen.has(v) && a < 60);
      seen.add(v); x[field] = v;
    });
  };
  sig(C.REAL_DB.drivers, 'abbr', 'lastName');
  sig(C.REAL_DB.teams, 'short', 'name');
  sig(C.TEAM_CANDIDATES || [], 'short', 'name');
  sig(C.REAL_CATS.cats, 'short', 'name');
  if (C.REAL_EXTRA.famousStaff) C.REAL_EXTRA.famousStaff = Object.fromEntries(Object.entries(C.REAL_EXTRA.famousStaff).map(([k, v]) => [mapText(k), v]));
  // fotos: só bandeiras e a marca própria continuam no registro
  if (C.ASSET_REGISTRY) C.ASSET_REGISTRY = C.ASSET_REGISTRY.filter(a => a.type === 'flag' || a.type === 'brand');
  if (C.REAL_EXTRA.sources) C.REAL_EXTRA.sources = [FICT_SOURCE];
  C.NICKNAMES = nickFict;
  // perfis nas redes: o fictício não tem perfis reais; o jogo gera o perfil a partir do nome (Media.handle)
  if (C.WORLD_LISTS) C.WORLD_LISTS.handles = {};
  // perfis dos veículos de imprensa fictícios: tirados do nome novo
  Object.values((C.WORLD_LISTS || {}).outlets || {}).forEach(o => { o.handle = String(o.name).normalize('NFD').replace(/[^A-Za-z0-9]/g, ''); });
  C.FEMALE_NAMES = Object.fromEntries(Object.entries(game.female).map(([nat, list]) => [nat, list.map(mapText)]));
  C.NAME_POOL = Object.fromEntries(Object.entries(game.namePool).map(([nat, p]) => [nat, { f: (p.f || []).map(mapText), l: (p.l || []).map(mapText) }]));

  const pack = {
    format: real.format, version: real.version, id: 'pitwall-ficticio',
    name: 'Mundo fictício', nameEn: 'Fictional world',
    ref: real.ref, game: real.game,
    license: 'Nomes gerados automaticamente pelo PitWall a partir da base do jogo. Lugares e circuitos reais.',
    content: C,
  };
  return { pack, map, mapText, mapName, keyOf, protectedPhrases, stats, forced, FICT_SOURCE, GENERIC, real };
}

if (require.main === module) {
  const out = path.resolve(process.argv[2] || path.join(root, 'dist-pack', 'pitwall-ficticio.json'));
  const { pack, map } = buildFictionalPack();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const txt = JSON.stringify(pack);
  fs.writeFileSync(out, txt);
  console.log(`pacote fictício gerado: ${path.relative(root, out)} · ${map.size} palavras trocadas · ${(txt.length / 1048576).toFixed(1)} MB`);
}
module.exports = { buildFictionalPack };
