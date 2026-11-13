// Pacote de dados fictício (regra 19 do dono, 13/11/2026): o banco de dados original, inteiro e idêntico, com todos
// os nomes trocados por nomes gerados automaticamente e os mesmos IDs. Decisões do dono no mesmo dia: trocam pessoas,
// equipes, fabricantes, marcas, patrocinadores e competições; circuitos, GPs, cidades e países ficam reais; os nomes
// são fixos na edição (o mesmo nome real vira sempre o mesmo nome fictício).
//
// Como: um dicionário palavra a palavra (as sequências de letras que o jogo usa para ligar pessoas entre as bases,
// Cats.norm) montado a partir dos campos de nome. Estilo decidido pelo dono em 13/11/2026: "bem parecido, estilo PES".
// O primeiro nome fica; o sobrenome e as palavras de equipe, marca e competição mudam só o final (Lewis Hamilton ->
// Lewis Hamilford, Ferrari -> Ferrano); a sigla de 3 letras fica quando ainda combina. Competições na escada GP
// (Fórmula 1 -> GP1, F2 -> GP2, FIA -> FMA). Palavras genéricas (Racing, Team, Grand Prix...) e lugares ficam.
// A amostra aprovada pelo dono está em scripts/fictional-overrides.json; o resto é gerado.
// Onde o jogo cria um id a partir do nome, o pacote leva o id (cid/id) e o hash (h) calculados com o nome real.
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
open classic cup cups trophies race races junior national formula1 driver drivers program grande premio gran general ecossistema ecosystem`.split(/\s+/).filter(Boolean));
// palavras de estrutura de um nome ("Series", "Sport"): num nome feito só de palavras genéricas, muda outra palavra
const STRUCT = new Set('series championship cup trophy open sport sports racing team world motor motorsport motorsports news network magazine'.split(' '));

// escada GP (decisão do dono, 13/11/2026): "Fórmula 1" -> GP1, "Fórmula 2" -> GP2... "Fórmula E" -> GP Elétrico.
// Vale no pacote e nos textos do código (scripts/fictional-code.js). "F1" -> "GP1" é feito na troca de letra + número.
const FORMULA_RULES = [
  [/(?<!\p{L})F[oó]rmula\s+(?:One|Um|Uno)(?!\p{L})/gu, () => 'GP1'],
  [/(?<!\p{L})F[oó]rmula\s+(\d)(?!\d)/gu, (m, d) => 'GP' + d],
  [/(?<!\p{L})Fórmula E(?!\p{L})/gu, () => 'GP Elétrico'],
  [/(?<!\p{L})Formula E(?!\p{L})/gu, () => 'GP Electric'],
];
const applyFormula = (t) => FORMULA_RULES.reduce((s, [re, fn]) => s.replace(re, fn), t);

// cargos do staff (REAL_EXTRA.staff): todos são pessoas, menos chassi e motor (empresas) e o dono (pessoa ou empresa)
const STAFF_PEOPLE = 'principal technical sporting operations commercial engine deputy aero trackEngineering chiefEngineer performance raceEngineering strategy ceo designer racing cto head strategyChief trackside consultant'.split(' ');
// campos (por caminho) onde há nomes: pessoa, organização/marca/competição, ou misto (pessoas e empresas)
const PERSON = [
  'REAL_DB.drivers[].name', 'REAL_DB.drivers[].firstName', 'REAL_DB.drivers[].lastName', 'REAL_DB.teams[].principal',
  'REAL_EXTRA.newDrivers[].name', 'REAL_EXTRA.newDrivers[].firstName', 'REAL_EXTRA.newDrivers[].lastName',
  'REAL_EXTRA.raceEngineers.*', ...STAFF_PEOPLE.map(k => 'REAL_EXTRA.staff.*.' + k), 'REAL_EXTRA.academies[].members[].name',
  'REAL_HISTORY.drivers.*[0]', 'TEAM_LORE.*.principals[][0]', 'REAL_CATS.cats[].drivers[].name', 'REAL_CATS.cats[].drivers[].wiki',
  'REAL_CATS.cats[].standings[][1]', 'DRIVERDB_2026.people.*.name', 'DRIVERDB_2026.series.*[][1]', 'DRIVER_DB.drivers[].name',
  'DRIVER_DB.drivers[].aliases[]', 'DRIVER_DB.drivers[].wiki',
];
const ORG = [
  'REAL_DB.teams[].name', 'REAL_DB.teams[].fullName', 'REAL_DB.teams[].sponsors[]', 'REAL_DB.engines[].name', 'REAL_DB.name',
  'REAL_EXTRA.staff.*.chassis', 'REAL_EXTRA.staff.*.pu', 'REAL_EXTRA.academies[].name', 'REAL_EXTRA.academies[].members[].series[]',
  'REAL_HISTORY.constructors.*[0]', 'REAL_RECORDS.names.*', 'REAL_CATS.cats[].name', 'REAL_CATS.cats[].page', 'REAL_CATS.cats[].teams[].name',
  'REAL_CATS.cats[].teamStandings[][1]', 'DRIVERDB_2026.people.*.team', 'DRIVER_DB.drivers[].seasons[].team', 'DRIVER_DB.series.*.name',
  'DRIVER_DB.series.*.seasons.*.page', 'TEAM_CANDIDATES[].name', 'TEAM_CANDIDATES[].fullName',
  'DRIVERDB_2026.series.*[][3]', 'WORLD_LISTS.mfrCands[].name', 'WORLD_LISTS.mfrGenPool[][0]', 'WORLD_LISTS.tyres.*.name',
  'WORLD_LISTS.groupPolicies.*.name', 'WORLD_LISTS.outlets.*.name', 'SPONSOR_POOL[]', 'REAL_EXTRA.identities.*.*.name',
  'REAL_EXTRA.identities.*.*.fullName', 'REAL_EXTRA.identities.*.*.titleSponsor', 'REAL_EXTRA.identities.*.*.ended',
  'REAL_EXTRA.identities.*.*.sponsorsAdd[]', 'REAL_EXTRA.identities.*.*.sponsorsRemove[]',
];
const MIXED = ['REAL_EXTRA.managers.*', 'TEAM_OWNERS.*.name', 'TEAM_CANDIDATES[].owner.name', 'REAL_EXTRA.staff.*.owner', 'WORLD_LISTS.creators[].name'];
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
  'WORLD_LISTS.tyres', 'WORLD_LISTS.groupPolicies', 'WORLD_LISTS.outlets', 'REAL_EXTRA.identities', 'REAL_EXTRA.identities.*']);
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
  const dataCommon = new Set();
  const note = (w, kind, nat, gender, upper) => {
    const k = keyOf(w); if (k.length < 2 || GENERIC.has(k)) return;
    const s = stats.get(k) || { first: 0, last: 0, org: 0, fam: {}, F: 0, M: 0, upper: 0, n: 0, forms: {} };
    s[kind]++; s.n++; if (upper) s.upper++;
    s.forms[w] = (s.forms[w] || 0) + 1;
    if (nat) { const f = N.familyOf(nat); s.fam[f] = (s.fam[f] || 0) + 1; }
    if (gender) s[gender]++;
    stats.set(k, s);
  };
  const words = (str) => String(str).match(/\p{L}+/gu) || [];
  const personNames = new Set();   // nomes completos de pessoas (um autódromo com o nome de alguém não protege a pessoa)
  const notePerson = (str, nat, gender) => { personNames.add(String(str).trim()); const ws = words(str).filter(w => w.length > 1); ws.forEach((w, i) => note(w, i === 0 && ws.length > 1 ? 'first' : 'last', nat, gender, w === w.toUpperCase())); };
  const singleOrg = new Set();   // palavras que sozinhas são o nome de uma equipe ou marca ("Mercedes", "Jordan")
  const orgStrs = new Set();     // nomes de equipe, marca e competição como estão na base
  const noteOrg = (str) => {
    orgStrs.add(String(str).trim());
    words(str).forEach(w => { if (w.length > 1) note(w, 'org', null, null, w === w.toUpperCase()); });
    const own = words(str).filter(w => w.length > 1 && !GENERIC.has(keyOf(w)));
    if (own.length === 1) singleOrg.add(keyOf(own[0]));
  };

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
  Object.values(C.REAL_EXTRA.staff || {}).forEach(s => { STAFF_PEOPLE.forEach(k => typeof s[k] === 'string' && notePerson(s[k], null, 'M')); if (typeof s.owner === 'string') noteOrg(s.owner); });
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
    // frases da base (não ids nem endereços): as palavras em minúscula são palavras comuns
    if (/\s/.test(s) && !/^https?:/.test(s)) (s.match(/\p{L}+/gu) || []).forEach(w => { if (w === w.toLowerCase()) dataCommon.add(keyOf(w)); });
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

  // 3) uma palavra parecida para cada sobrenome e cada palavra de equipe, marca ou competição (estilo PES). Palavra que
  //    só aparece como primeiro nome fica como está. Ordem fixa: as mais citadas escolhem primeiro, depois alfabética.
  const OVR = JSON.parse(fs.readFileSync(path.join(__dirname, 'fictional-overrides.json'), 'utf8')).words;
  // marcas famosas que não estão na base: nenhuma palavra gerada pode ser uma delas
  const FAMOUS = 'marvel disney nike apple sony intel rolex lego puma fila canon nikon ikea tesla uber lexus mazda nissan kia seat skoda opel fiat lancia ducati yamaha suzuki kawasaki gucci prada armani versace chanel dior lacoste omega heineken pepsi cola fanta sprite monster castrol motul repsol petrobras ipiranga emirates etihad gillette tissot hublot casio seiko netflix amazon samsung nokia adobe facebook twitter tiktok youtube spotify paypal ebay ferrero nestle danone lindt subway pringles marlboro camel boss'.split(' ');
  const used = new Set([...stats.keys(), ...GENERIC, ...placeWords, ...lower, ...FAMOUS]);
  Object.entries(OVR).forEach(([k, v]) => used.add(keyOf(v)));
  const map = new Map();
  const formOf = (s) => Object.entries(s.forms).sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1))[0][0];
  const famOf = (s) => { const f = Object.entries(s.fam).sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : 1))[0]; return f ? f[0] : null; };
  // naturalidade: o final novo tem de soar como os nomes reais do mesmo idioma (corpus = as palavras da própria base)
  const corpus = {};
  for (const s of stats.values()) { const f = famOf(s) || (s.org ? 'brand' : 'en'); (corpus[f] = corpus[f] || []).push(...Object.keys(s.forms)); }
  const natural = N.makeNatural(corpus);
  const keys = [...stats.keys()].filter(k => { const s = stats.get(k); return s.last + s.org > 0; })
    .sort((a, b) => (stats.get(b).n - stats.get(a).n) || (a < b ? -1 : 1));
  let fallbacks = 0;
  for (const k of keys) {
    if (OVR[k] != null) { if (keyOf(OVR[k]) !== k) map.set(k, OVR[k]); continue; }
    const s = stats.get(k);
    const form = formOf(s);
    const allCaps = s.upper > 0 && s.upper >= s.n / 2 && k.length <= 5;
    const family = famOf(s) || (s.org ? 'brand' : 'en');
    let fake = null;
    if (allCaps || k.length <= 2 || !/[aeiouy]/.test(k)) {
      for (const c of N.similarAcronyms(form, k)) if (!used.has(keyOf(c))) { fake = c; break; }
    } else {
      // o começo fica (as 3 primeiras letras numa palavra de 5 ou mais, para a sigla continuar a mesma); 1º passe: o
      // final soa como o idioma da pessoa e quase não cresce; 2º passe: soa como algum idioma da base
      const cands = N.similarCandidates(form, family, k);
      const minJ = k.length >= 5 ? 3 : k.length === 4 ? 2 : k.length;
      for (const [strict, maxD, grow] of [[true, k.length <= 5 ? 3 : 4, 2], [false, 5, 3]]) {
        for (const { w, j } of cands) {
          const ck = keyOf(w);
          if (j < minJ || ck.length < 3 || ck.length - k.length > grow || used.has(ck)) continue;
          const d = N.lev(ck, k);
          if (d < 2 || d > maxD || !natural(w, j, family, strict, form)) continue;
          fake = w; break;
        }
        if (fake) break;
      }
    }
    if (!fake) {   // nada parecido serviu: um nome gerado do zero, com a mesma inicial
      fallbacks++;
      for (let a = 0; a < 400 && !fake; a++) {
        const seed = `pitwall-ficticio-v2:${k}:${a}`;
        const w = s.first + s.last > 0 ? N.personWord(family in N.ENDS ? family : 'en', 'last', s.F > s.M ? 'F' : 'M', seed, a > 60, k[0]) : N.brandWord(seed);
        if (keyOf(w).length >= 2 && !used.has(keyOf(w))) fake = w;
      }
      if (!fake) throw new Error('make-fictional-pack: sem nome livre para ' + k);
    }
    used.add(keyOf(fake));
    map.set(k, fake);
  }
  // primeiro nome: fica sempre que a palavra é usada como primeiro nome de alguém ("Max", "Jordan", "Nelson")
  const keepFirstTok = (k) => { const s = stats.get(k); return !!s && s.first > 0; };
  const surnameTok = (k) => { const s = stats.get(k); return !!s && s.last > 0 && s.last >= s.org; };
  // escada GP (decisão do dono): F1 -> GP1 ... F4 -> GP4; Q1, P1, W17 e outros códigos ficam
  const letterDigit = (ch) => (ch === 'F' ? 'GP' : ch);

  // 3b) nomes de etapa com patrocinador nas categorias ("Goodyear 400", "Firestone Grand Prix of St. Petersburg"): o
  //     circuito, o GP e a cidade ficam reais (decisão do dono), mas a marca dentro do nome é patrocinador e muda. Só
  //     quando o nome não é o de um circuito conhecido ("Red Bull Ring" e "Circuit Gilles Villeneuve" ficam).
  const brandTok = new Set();
  const addBrand = (s) => words(s).forEach(w => { const k = keyOf(w); if (k.length > 1 && !GENERIC.has(k)) brandTok.add(k); });
  Object.keys(C.SPONSOR_BRANDS || {}).forEach(addBrand); (C.SPONSOR_POOL || []).forEach(addBrand);
  C.REAL_DB.teams.forEach(t => (t.sponsors || []).forEach(addBrand)); C.REAL_DB.engines.forEach(e => addBrand(e.name));
  Object.values((C.WORLD_LISTS || {}).tyres || {}).forEach(x => addBrand(x.name)); ((C.WORLD_LISTS || {}).mfrCands || []).forEach(x => addBrand(x.name));
  Object.values(C.REAL_EXTRA.identities || {}).forEach(byYear => Object.values(byYear).forEach(id => [id.titleSponsor, ...(id.sponsorsAdd || [])].forEach(x => x && addBrand(x))));
  Object.values(C.DRIVER_DB.series || {}).forEach(s => addBrand(s.name));
  const knownCircuits = new Set();
  [C.REAL_DB.tracks, C.FIA_CIRCUITS, C.REAL_TRACKS, C.REAL_HISTORY.circuits].forEach(src => each(JSON.parse(JSON.stringify(src || {})), '', (s) => { knownCircuits.add(game.norm(s)); return undefined; }));
  const cl = (orig, fake) => (orig.length > 1 && orig === orig.toUpperCase() ? fake.toUpperCase() : fake.charAt(0).toUpperCase() + fake.slice(1));
  // palavras de lugar de verdade (circuitos conhecidos, cidades das etapas, países) nunca são marca: "Le Mans" fica
  const realPlaceWords = new Set([...knownCircuits].flatMap(x => x.split(" ")));
  C.REAL_CATS.cats.forEach(c => (c.calendar || []).forEach(e => typeof e.place === "string" && words(e.place).forEach(w => realPlaceWords.add(keyOf(w)))));
  Object.values(C.REAL_DB.natNames || {}).forEach(n => words(n).forEach(w => realPlaceWords.add(keyOf(w))));
  realPlaceWords.forEach(k => brandTok.delete(k));
  const eventRename = new Map();
  C.REAL_CATS.cats.forEach(c => (c.calendar || []).forEach(e => {
    const s = e.circuit;
    if (typeof s !== 'string' || eventRename.has(s) || knownCircuits.has(game.norm(s))) return;
    if (!words(s).some(w => brandTok.has(keyOf(w)) && map.has(keyOf(w)))) return;
    eventRename.set(s, s.replace(/\p{L}+/gu, (w) => (brandTok.has(keyOf(w)) && map.has(keyOf(w)) ? cl(w, map.get(keyOf(w))) : w)));
  }));
  eventRename.forEach((v, k) => placeStrings.delete(k));   // deixam de ser lugar protegido; valem em todo texto (lista forçada, abaixo)
  // dado errado da importação: nome de equipe no campo de circuito ("JHR Developments" na F4 Britânica) é nome, não lugar
  const teamNameSet = new Set(C.REAL_CATS.cats.flatMap(c => c.teams.map(t => t.name)));
  const teamCircuits = new Set();
  C.REAL_CATS.cats.forEach(c => (c.calendar || []).forEach(e => { if (typeof e.circuit === 'string' && teamNameSet.has(e.circuit)) { teamCircuits.add(e.circuit); placeStrings.delete(e.circuit); } }));

  // 4) a troca: mesma função para todos os textos (lugares protegidos; códigos e ids em minúsculas ficam)
  // palavras comuns: as das frases da base e as que o código escreve em minúsculas dentro de frases
  const M = require('./modules');
  const COMMON = new Set([...dataCommon, ...require('./fictional-code').codeCommonWords([...M.core, ...M.ui].map(m => fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8')), keyOf)]);
  ['formula', 'fia'].forEach(k => COMMON.delete(k));
  // ids da base ("williams", "audi", "campos-racing") e as palavras escolhidas à mão nunca são palavra comum
  (function ids(v, k) {
    if (typeof v === 'string') { if (ID_KEYS.has(k) || k === 'team' || k === 'teamId') (v.match(/[a-z]+/g) || []).forEach(w => COMMON.delete(w)); }
    else if (Array.isArray(v)) v.forEach(x => ids(x, k));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([kk, x]) => ids(x, kk));
  })(C, '');
  Object.keys(C.REAL_DB.teams.reduce((o, t) => (o[t.id] = 1, o), {})).forEach(id => id.split('-').forEach(w => COMMON.delete(w)));
  Object.keys(OVR).forEach(k => COMMON.delete(k));
  const commonOrgPhrases = [...orgStrs].filter(p => /\s/.test(p) && p.length >= 5 && words(p).some(w => COMMON.has(keyOf(w)) && map.has(keyOf(w))))
    .sort((a, b) => b.length - a.length);
  const protectedPhrases = [...placeStrings].filter(s => /\p{Lu}/u.test(s) && words(s).some(w => map.has(keyOf(w))) && !personNames.has(s)).sort((a, b) => b.length - a.length);
  // marcas escritas só em minúsculas (ex.: patrocinador 'bp'): troca o texto inteiro
  const forced = new Map();
  [...C.REAL_DB.teams.flatMap(t => t.sponsors || []), ...Object.keys(C.SPONSOR_BRANDS || {})].forEach(x => { if (/^[a-z0-9 ]+$/.test(x) && /[a-z]/.test(x)) { const w = (x.match(/[a-z]+/g) || []).find(y => map.has(keyOf(y))); if (w) forced.set(x, x.replace(w, map.get(keyOf(w)).toLowerCase())); } });
  const caseLike = (orig, fake) => (orig.length > 1 && orig === orig.toUpperCase() ? fake.toUpperCase() : orig === orig.toLowerCase() ? fake.toLowerCase() : fake.charAt(0).toUpperCase() + fake.slice(1));
  // códigos de país: os valores dos campos de nacionalidade da base (nunca mudam)
  const natCodes = new Set(Object.keys(C.REAL_DB.natNames || {}));
  (function grabNat(v, k) { if (typeof v === 'string') { if (/^(nat|country|nationality)$/.test(k) && /^[A-Z]{2,3}$/.test(v)) natCodes.add(v); } else if (Array.isArray(v)) v.forEach(x => grabNat(x, k)); else if (v && typeof v === 'object') Object.entries(v).forEach(([kk, x]) => grabNat(x, kk)); })(C, '');
  const slugLike = (s) => /^[a-z0-9]+(?:[-_.:/][a-z0-9]+)*$/.test(s) || /^Q[0-9]+$/.test(s) || natCodes.has(s);   // ids, QIDs e códigos de país
  // mode: undefined = texto livre; 'name' = nome de equipe, marca ou misto (até a parte em minúscula muda: "R-ace GP");
  // 'person' = nome de pessoa (os primeiros nomes ficam, o sobrenome muda); 'first' = só o primeiro nome.
  // No texto livre, uma palavra que também é primeiro nome fica quando vem antes de um sobrenome ("Martin Brundle"),
  // e muda no resto ("Aston Martin").
  const mapText = (s, mode) => {
    const names = !!mode;
    if (typeof s !== 'string' || !s) return s;
    if (forced.has(s)) return forced.get(s);
    if (slugLike(s) && !names) return s;
    const hold = [];
    let t = s;
    // lugares protegidos: só a frase inteira, com limite de palavra (antes, "ags" protegia o meio de "Gragson")
    for (const p of protectedPhrases) {
      if (!t.includes(p)) continue;
      let out = '', i = 0, j;
      while ((j = t.indexOf(p, i)) >= 0) {
        const okL = !/\p{L}/u.test(t[j - 1] || ''), okR = !/\p{L}/u.test(t[j + p.length] || '');
        out += t.slice(i, j) + (okL && okR ? `\u0000${hold.push(p) - 1}\u0000` : p);
        i = j + p.length;
      }
      t = out + t.slice(i);
    }
    const held = hold.length;   // o que vem daqui em diante (escada GP, nomes inteiros) é troca de verdade
    for (const [re, fn] of FORMULA_RULES) t = t.replace(re, (...a) => `\u0000${hold.push(fn(...a)) - 1}\u0000`);
    // nomes forçados (feitos de palavras genéricas) também dentro de textos: o nome inteiro, com limite de palavra;
    // no texto livre, também os nomes de equipe com palavra comum ("Pole Motorsport"), trocados como nome
    // (num nome, os nomes de equipe ou marca de dentro dele: "Cash App" em "Visa Cash App Racing Bulls")
    const inner = !mode ? commonOrgPhrases : mode === 'name' ? commonOrgPhrases.filter(x => x.length < s.length) : [];
    for (const p of [...forcedList, ...inner]) {
      if (!t.includes(p)) continue;
      let out = '', i = 0, j;
      while ((j = t.indexOf(p, i)) >= 0) {
        const before = t[j - 1], after = t[j + p.length];
        const okL = !before || !/\p{L}/u.test(before), okR = !after || !/\p{L}/u.test(after);
        out += t.slice(i, j) + (okL && okR ? `\u0000${hold.push(forced.has(p) ? forced.get(p) : mapText(p, 'name')) - 1}\u0000` : p);
        i = j + p.length;
      }
      t = out + t.slice(i);
    }
    const toks = [];
    t.replace(/\p{L}+/gu, (w, off) => { toks.push([w, off]); return w; });
    let lastSig = -1;   // num nome de pessoa, a última palavra própria é o sobrenome
    if (mode === 'person') for (let i = toks.length - 1; i >= 0; i--) { const w = toks[i][0]; if (w.length > 1 && !GENERIC.has(keyOf(w)) && /^\p{Lu}/u.test(w)) { lastSig = i; break; } }
    // num nome, uma palavra comum com maiúscula só muda se nada mais mudar ("Primeira Fila F1" já vira "... GP1";
    // "Mercado Livre Racing" precisa mudar as palavras comuns)
    const otherChange = mode === 'name' && (hold.length > held || toks.some(([w, off]) => (w === 'F' && /\d/.test(t.charAt(off + 1) || '')) ||
      (w.length > 1 && w !== w.toLowerCase() && map.has(keyOf(w)) && !COMMON.has(keyOf(w)))));
    let out = '', pos = 0;
    toks.forEach(([w, off], i) => {
      let rep = w;
      if (w.length === 1) { if (/[A-Z]/.test(w) && /\d/.test(t.charAt(off + 1) || '')) rep = letterDigit(w); }
      else {
        const k = keyOf(w);
        // minúscula fora de nome: código, id ou palavra comum (marcas em minúscula: lista forçada)
        if (map.has(k) && !(w === w.toLowerCase() && !names)) {
          let keep = false;
          // palavra comum (escrita em minúscula nas frases do código ou da base: "pole", "real", "notícias"): num
          // nome, a parte em minúscula fica; num texto, só muda como sobrenome logo depois de um primeiro nome
          // ("Will Power"), e o nome de equipe inteiro já foi trocado antes ("Pole Motorsport")
          const common = COMMON.has(k);
          const pv = toks[i - 1];
          if (common && mode === 'name' && (w === w.toLowerCase() || otherChange)) keep = true;
          else if (common && !mode) keep = !(pv && /^\s+$/.test(t.slice(pv[1] + pv[0].length, off)) && keepFirstTok(keyOf(pv[0])) && /^\p{Lu}/u.test(pv[0]));
          else if (mode === 'first') keep = keepFirstTok(k);
          else if (mode === 'person') keep = i < lastSig && keepFirstTok(k);
          else if (keepFirstTok(k) && !singleOrg.has(k)) {
            // antes de um sobrenome ("Martin Brundle"); num nome de equipe, a 1ª palavra antes de outra palavra
            // própria ("Joe Gibbs Racing"); nunca a palavra que sozinha é uma equipe ("Mercedes", "Jordan")
            const nx = toks[i + 1];
            const nk = nx && keyOf(nx[0]);
            keep = !!nx && /^\s+$/.test(t.slice(off + w.length, nx[1])) && /^\p{Lu}/u.test(nx[0]) &&
              (surnameTok(nk) || (mode === 'name' && i === 0 && map.has(nk)));
          }
          if (!keep) rep = caseLike(w, map.get(k));
        }
      }
      out += t.slice(pos, off) + rep; pos = off + w.length;
    });
    t = out + t.slice(pos);
    return t.replace(/\u0000(\d+)\u0000/g, (m, i) => hold[+i]);
  };
  const mapName = (s) => mapText(s, 'name');
  const mapPerson = (s) => mapText(s, 'person');
  const mapFirst = (s) => mapText(s, 'first');
  let forcedList = [];   // preenchida depois de montar a lista forçada (logo abaixo)
  // nomes de equipe, marca ou veículo feitos só de palavras genéricas ("The Race", "Autosport") sairiam iguais:
  // ganham um nome de marca gerado, sempre o mesmo para o mesmo texto (entram na lista forçada, valem em todo lugar)
  const usedForced = new Set();
  // frases escolhidas à mão (veículos de imprensa e séries de nome genérico), valem antes de tudo
  const PHRASES = JSON.parse(fs.readFileSync(path.join(__dirname, 'fictional-overrides.json'), 'utf8')).phrases || {};
  for (const [k, v] of Object.entries(PHRASES)) { forced.set(k, v); usedForced.add(v); }
  eventRename.forEach((v, k) => { forced.set(k, v); usedForced.add(v); });   // nomes de etapa com patrocinador (3b)
  teamCircuits.forEach(k => { const v = mapName(k); eventRename.set(k, v); forced.set(k, v); usedForced.add(v); });   // equipe no campo de circuito (3b)
  each(JSON.parse(JSON.stringify(C)), '', (s, p) => {
    const f = (list) => inList(list, p);
    if (!(f(ORG) || f(MIXED)) || f(PLACE) || forced.has(s) || natCodes.has(s) || !/\p{L}{2}/u.test(s)) return undefined;
    if (mapName(s) !== s) return undefined;
    // parecido: uma palavra muda o final (a última que não é de estrutura nem lugar: "Asian Le Mans Series" ->
    // "Asiano Le Mans Series"); se nada servir, uma marca gerada
    let v = null;
    const ws = s.match(/\p{L}{3,}/gu) || [];
    if (ws.length) {
      const pickW = [...ws].reverse().find(w => !STRUCT.has(keyOf(w)) && !placeWords.has(keyOf(w))) || ws[ws.length - 1];
      const lastW = pickW, at = s.lastIndexOf(lastW);
      for (const { w, j } of N.similarCandidates(lastW, 'brand', 'forcado:' + s)) {
        const ck = keyOf(w), d = N.lev(ck, keyOf(lastW));
        if (used.has(ck) || d < 2 || d > 5 || !natural(w, j, 'brand')) continue;
        const cand = s.slice(0, at) + w + s.slice(at + lastW.length);
        if (!usedForced.has(cand)) { v = cand; break; }
      }
    }
    for (let a = 0; !v || usedForced.has(v); a++) { v = N.brandWord(`pitwall-ficticio-v2:forcado:${s}:${a}`); if (a > 200) break; }
    usedForced.add(v); forced.set(s, v);
    return undefined;
  });
  // dentro dos textos: só nomes com maiúscula e 4+ letras que não são palavra comum ("Marca") nem parte de um lugar
  // ("Grande Prêmio" de "Grande Prêmio do Brasil")
  forcedList = [...forced.keys()].filter(k => k.length >= 4 && /\p{Lu}/u.test(k) && !(/^\p{L}+$/u.test(k) && lower.has(keyOf(k))) && ![...placeStrings].some(pl => pl.includes(k)))
    .sort((a, b) => b.length - a.length);

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
    if (f(PLACE)) return eventRename.get(s);   // lugar fica; nome de etapa com patrocinador muda a marca (3b)
    const abbr = Object.keys(ABBR).find(pat => inList([pat], p));
    if (abbr) return undefined;   // siglas: depois, a partir do nome fictício
    if (slugLike(s)) return mapText(s);
    if (f(PERSON)) return leaf === 'firstName' ? mapFirst(s) : leaf === 'lastName' ? mapName(s) : mapPerson(s);
    return f(ORG) || f(MIXED) ? mapName(s) : mapText(s);
  });
  // chaves que são nomes (marcas de patrocínio)
  if (C.SPONSOR_BRANDS) C.SPONSOR_BRANDS = Object.fromEntries(Object.entries(C.SPONSOR_BRANDS).map(([k, v]) => [mapText(k) === k && /^[a-z0-9]+$/.test(k) ? caseLike(k, map.get(keyOf(k)) || k) : mapText(k), v]));
  C.REAL_DB.teams.forEach(t => { t.sponsors = (t.sponsors || []).map(x => (/^[a-z0-9]+$/.test(x) && map.has(keyOf(x)) ? caseLike(x, map.get(keyOf(x))) : x)); });
  // siglas, sem repetir: a real fica quando ainda combina com o nome fictício (HAM em Hamilford, RBR em Red Bison
  // Racing); com número, a letra muda junto com o nome (F2 -> GP2); uma sigla que é palavra do dicionário (WEC) segue
  // o dicionário; numa competição "Fórmula ...", o F vira GP (FRECA -> GPRECA, SF -> SGP); senão, sai do nome fictício
  const plain = (x) => String(x || '').normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase();
  const subseq = (needle, hay) => { let i = 0; for (const c of hay) if (c === needle[i]) i++; return i === needle.length; };
  const sig = (list, field, from, realList) => {
    const seen = new Set();
    list.forEach((x, idx) => {
      if (!x || !x[field]) return;
      const orig = x[field], len = orig.length, P = plain(orig);
      const realName = String((realList[idx] || {})[from] || (realList[idx] || {}).name || '');
      let v = null;
      const nameNow = String(x[from] || x.name || '');
      const own = (nameNow.match(/\p{L}+/gu) || []).filter(w => !GENERIC.has(keyOf(w)) || keyOf(w) === 'gp');
      const initials = [nameNow, x.fullName || ''].map(n => (n.match(/\p{L}+/gu) || []).map(w => w[0]).join('').toUpperCase());
      if (/\d/.test(orig)) v = orig.replace(/[A-Z](?=\d)/g, letterDigit);
      else if (GENERIC.has(keyOf(orig))) v = orig;                                                       // STOCK
      else if (P && own.length && plain(own[0])[0] === P[0] && subseq(P, plain(own.join('')))) v = orig;   // HAM em Hamilford
      else if (P && initials.some(i => i.includes(P))) v = orig;                                         // RBR em Red Bison Racing
      else if (/(?<!\p{L})f[oó]rmula(?!\p{L})/iu.test(realName) && /^[A-Z]*F/.test(orig)) v = orig.replace('F', 'GP');   // FRECA -> GPRECA
      else if (map.has(keyOf(orig)) && orig === orig.toUpperCase() && map.get(keyOf(orig)).length === orig.length) v = map.get(keyOf(orig)).toUpperCase();   // WEC -> sigla do dicionário
      if (!v || seen.has(v)) {
        const base = (String(x[from] || x.name || '').match(/\p{L}+/gu) || []).filter(w => !GENERIC.has(keyOf(w))).join('') || 'X';
        let a = 0; do { v = N.acronym(base, len, a++); } while (seen.has(v) && a < 60);
      }
      seen.add(v); x[field] = v;
    });
  };
  sig(C.REAL_DB.drivers, 'abbr', 'lastName', real.content.REAL_DB.drivers);
  sig(C.REAL_DB.teams, 'short', 'name', real.content.REAL_DB.teams);
  sig(C.TEAM_CANDIDATES || [], 'short', 'name', real.content.TEAM_CANDIDATES || []);
  sig(C.REAL_CATS.cats, 'short', 'name', real.content.REAL_CATS.cats);
  if (C.REAL_EXTRA.famousStaff) C.REAL_EXTRA.famousStaff = Object.fromEntries(Object.entries(C.REAL_EXTRA.famousStaff).map(([k, v]) => [mapPerson(k), v]));
  // fotos: só bandeiras e a marca própria continuam no registro
  if (C.ASSET_REGISTRY) C.ASSET_REGISTRY = C.ASSET_REGISTRY.filter(a => a.type === 'flag' || a.type === 'brand');
  if (C.REAL_EXTRA.sources) C.REAL_EXTRA.sources = [FICT_SOURCE];
  // apelidos de primeiro nome (Persons.NICK: cam -> cameron): os primeiros nomes ficam, então a tabela é a mesma,
  // passada pela mesma troca de primeiro nome (para "Cam Waters" e "Cameron Waters" continuarem a mesma pessoa)
  const nickFict = {};
  for (const [short, full] of Object.entries(game.nick)) nickFict[keyOf(mapFirst(short))] = keyOf(mapFirst(full));
  C.NICKNAMES = nickFict;
  // perfis nas redes: o fictício não tem perfis reais; o jogo gera o perfil a partir do nome (Media.handle)
  if (C.WORLD_LISTS) C.WORLD_LISTS.handles = {};
  // perfis dos veículos de imprensa fictícios: tirados do nome novo
  Object.values((C.WORLD_LISTS || {}).outlets || {}).forEach(o => { o.handle = String(o.name).normalize('NFD').replace(/[^A-Za-z0-9]/g, ''); });
  C.FEMALE_NAMES = Object.fromEntries(Object.entries(game.female).map(([nat, list]) => [nat, list.map(mapFirst)]));
  C.NAME_POOL = Object.fromEntries(Object.entries(game.namePool).map(([nat, p]) => [nat, { f: (p.f || []).map(mapFirst), l: (p.l || []).map(mapName) }]));

  const pack = {
    format: real.format, version: real.version, id: 'pitwall-ficticio',
    name: 'Mundo fictício', nameEn: 'Fictional world',
    ref: real.ref, game: real.game,
    license: 'Nomes gerados automaticamente pelo PitWall a partir da base do jogo. Lugares e circuitos reais.',
    content: C,
  };
  return { pack, map, mapText, mapName, mapPerson, keyOf, protectedPhrases, placeStrings, stats, forced, FICT_SOURCE, GENERIC, real, applyFormula, fallbacks };
}

if (require.main === module) {
  const out = path.resolve(process.argv[2] || path.join(root, 'dist-pack', 'pitwall-ficticio.json'));
  const { pack, map, fallbacks } = buildFictionalPack();
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const txt = JSON.stringify(pack);
  fs.writeFileSync(out, txt);
  console.log(`pacote fictício gerado: ${path.relative(root, out)} · ${map.size} palavras trocadas (${fallbacks} sem forma parecida) · ${(txt.length / 1048576).toFixed(1)} MB`);
}
module.exports = { buildFictionalPack, applyFormula };
