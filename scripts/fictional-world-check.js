// Regra 19 do dono: o mundo fictício é o banco de dados original, inteiro e idêntico, com os nomes trocados e os
// mesmos IDs. As corridas no real e no fictício não precisam dar o mesmo resultado (decisão do dono, 13/11/2026): o que
// tem de ser igual são os ids. Este teste confere:
//  1) o mesmo banco: o pacote fictício tem a mesma estrutura, os mesmos números e os mesmos ids do real; só os textos
//     (nomes) mudam, e fontes e fotos saem;
//  2) os mesmos ids na carreira: a mesma carreira criada com o pacote real e com o fictício tem os mesmos ids;
//  3) a carreira fictícia roda as temporadas pedidas e nenhum nome real aparece no jogo nem no pacote;
//  4) o pacote fictício é válido (Pack.check) e não tem foto nem fonte externa.
// Uso: node scripts/fictional-world-check.js [temporadas=1]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const { core } = require('./modules');
const { buildPack } = require('./make-data-pack');
const { buildFictionalPack } = require('./make-fictional-pack');
const SEASONS = +(process.argv[2] || 1);
const real = buildPack();
const { pack: fict, map, keyOf, protectedPhrases, placeStrings = new Set(), GENERIC, stats } = buildFictionalPack(real);
const bad = [];

function newCareer(pack, cfg) {
  const ctx = vm.createContext({ console, Math, JSON, Date, process });
  for (const m of core) vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
  ctx.__p = JSON.stringify(pack);
  const r = vm.runInContext('Pack.install(JSON.parse(__p))', ctx);
  if (!r.ok) throw new Error(`pacote ${pack.id} recusado: ${r.errors.join('; ')}`);
  vm.runInContext('this.API = { Career, Events, defaultDb, Owners: typeof Owners !== "undefined" ? Owners : null, Talks: typeof Talks !== "undefined" ? Talks : null }', ctx);
  const { Career, defaultDb, Owners } = ctx.API;
  const G = Career.create(defaultDb(), { mode: cfg.mode, teamId: cfg.team, seed: cfg.seed, name: 'Teste' });
  if (G.teamSetup && G.teamSetup.pending && Owners && Owners.autoSetup) Owners.autoSetup(G);
  return { G, api: ctx.API };
}
function play({ G, api }, cfg) {
  const { Career, Events, Talks } = api;
  for (let s = 0; s < SEASONS; s++) {
    while (!Career.seasonOver(G)) {
      const r0 = G.season.round;
      Career.startWeekend(G); Career.finishPractice(G); Career.runQualifying(G); Career.startRace(G);
      let lap = 0; while (!G.weekend.race.finished && lap++ < 400) Career.stepRace(G);
      Career.finishWeekend(G);
      if (cfg.mode === 'manager') {
        if (Talks) Career.teamDrivers(G, G.player.teamId).filter(d => d.seat !== 'R').forEach(d => { const t = Talks.start(G, d.id); if (t && t.opts.length) Talks.answer(G, d.id, t.topic, t.opts[r0 % t.opts.length].k); });
        G.inbox.forEach(m => { if (m.choices && m.resolved == null) Events.resolve(G, m.id, r0 % m.choices.length); });
      }
    }
    Career.endSeason(G);
  }
  return JSON.parse(JSON.stringify(G));
}

// 1) o mesmo banco. Ficam de fora: fontes e fotos (o fictício não tem), o registro de fotos, os perfis nas redes e as
// tabelas que só o fictício leva (nomes sorteáveis e apelidos trocados). Campos que o fictício acrescenta para manter os
// ids (id, h, cid: calculados com o nome real) também.
const ATTR = new Set(['src', 'source', 'sources', 'img', 'logo', 'carImg', 'teamLogo', 'heroImg', 'mapImg', 'origin', 'license', 'page_url', 'handle', 'handles', 'commonsImg']);
const SKIP_TOP = new Set(['ASSET_REGISTRY', 'NICKNAMES', 'NAME_POOL', 'FEMALE_NAMES']);
const ADDED = new Set(['id', 'h', 'cid']);
const NAME_KEYED = new Set(['SPONSOR_BRANDS', 'REAL_EXTRA.famousStaff']);   // mapas cuja chave é um nome
const ID_KEYS = new Set(['id', 'uid', 'qid', 'cid', 'teamId', 'driverId', 'catId', 'trackId']);
let idsCompared = 0;
function sameDb(a, b, at, out) {
  if (out.length >= 15) return;
  const leaf = at.split('.').pop().replace(/\[.*$/, '');
  if (ATTR.has(leaf) || /(src|source)$/i.test(leaf)) return;
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a === null) !== (b === null)) { out.push(`${at}: tipo diferente`); return; }
  if (Array.isArray(a)) { if (a.length !== b.length) { out.push(`${at}: ${a.length} × ${b.length} itens`); return; } a.forEach((x, i) => sameDb(x, b[i], `${at}[${i}]`, out)); return; }
  if (a && typeof a === 'object') {
    const p = at.replace(/^C\./, '');
    if (NAME_KEYED.has(p)) {
      const va = Object.values(a), vb = Object.values(b);
      if (va.length !== vb.length) out.push(`${at}: ${va.length} × ${vb.length} entradas`);
      else va.forEach((x, i) => sameDb(x, vb[i], `${at}<${i}>`, out));
      return;
    }
    const ka = Object.keys(a).filter(k => !ATTR.has(k) && !(at === 'C' && SKIP_TOP.has(k)));
    const kb = Object.keys(b).filter(k => !ATTR.has(k) && !(at === 'C' && SKIP_TOP.has(k)) && !(ADDED.has(k) && !(k in a)));
    const miss = ka.filter(k => !(k in b)), extra = kb.filter(k => !(k in a));
    if (miss.length || extra.length) { out.push(`${at}: chaves diferentes (faltam ${miss.slice(0, 4).join(',')}; sobram ${extra.slice(0, 4).join(',')})`); return; }
    ka.forEach(k => sameDb(a[k], b[k], `${at}.${k}`, out));
    return;
  }
  if (typeof a === 'string') { if (ID_KEYS.has(leaf)) { idsCompared++; if (a !== b) out.push(`${at}: id ${a} × ${b}`); } return; }   // textos (nomes) podem mudar; ids não
  if (a !== b) out.push(`${at}: ${a} × ${b}`);
}
{
  const out = []; sameDb(real.content, fict.content, 'C', out);
  out.forEach(d => bad.push('banco: ' + d));
  console.log(`banco: ${out.length ? out.length + '+ diferença(s)' : 'mesma estrutura, mesmos números'} · ${idsCompared} ids iguais`);
}

// nomes reais que não podem aparecer no fictício: nomes completos de pessoas e nomes de equipes, marcas, motores e
// competições da base real (só os que têm alguma palavra trocada pelo dicionário; lugares ficam de fora)
const C0 = real.content;
const realNames = new Set();
const addName = (n) => { if (typeof n === 'string' && n.length >= 5 && (n.match(/\p{L}+/gu) || []).some(w => w.length > 1 && map.has(keyOf(w)))) realNames.add(n); };
C0.REAL_DB.drivers.forEach(d => addName(d.name)); C0.DRIVER_DB.drivers.forEach(d => addName(d.name));
Object.values(C0.REAL_HISTORY.drivers).forEach(x => addName(x[0])); Object.values(C0.REAL_HISTORY.constructors).forEach(x => addName(x[0]));
C0.REAL_DB.teams.forEach(t => { addName(t.name); addName(t.fullName); addName(t.principal); (t.sponsors || []).forEach(addName); });
C0.REAL_DB.engines.forEach(e => addName(e.name)); C0.REAL_CATS.cats.forEach(c => { addName(c.name); c.teams.forEach(t => addName(t.name)); });
Object.values(C0.REAL_EXTRA.staff || {}).forEach(x => Object.values(x).forEach(addName));
Object.keys(C0.SPONSOR_BRANDS || {}).forEach(addName);
// listas do mundo real (montadoras, pneus, veículos, criadores): todos os nomes, mesmo os de palavras genéricas
const WL0 = C0.WORLD_LISTS || {};
[...(WL0.mfrCands || []).map(x => x.name), ...(WL0.mfrGenPool || []).map(x => x[0]), ...Object.values(WL0.tyres || {}).map(x => x.name), ...Object.values(WL0.outlets || {}).map(x => x.name), ...(WL0.creators || []).map(x => x.name)].forEach(n => { if (typeof n === 'string' && n.length >= 4) realNames.add(n); });
// uma palavra genérica sozinha ('Autosport', 'Motorsport') não conta; nem uma palavra comum que o próprio código do
// jogo escreve em minúsculas ("marca", "sport")
const codeWords = new Set();
for (const m of [...core, ...require('./modules').ui]) (fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8').match(/\p{Ll}+/gu) || []).forEach(w => codeWords.add(w));
// (nunca perdoa o nome de uma equipe, motor ou categoria da base: o código escreve "williams" e "audi" como id)
const NEVER = new Set([...C0.REAL_DB.teams.map(t => t.name), ...C0.REAL_DB.engines.map(e => e.name), ...C0.REAL_CATS.cats.map(c => c.name)]);
const onlyGenericWord = (n) => { const ws = n.match(/\p{L}+/gu) || []; return !NEVER.has(n) && ws.length === 1 && (GENERIC.has(keyOf(ws[0])) || codeWords.has(ws[0].toLowerCase())); };
const realList = [...realNames].filter(n => !onlyGenericWord(n)).sort((a, b) => b.length - a.length);
// uma palavra que também é primeiro nome ("Jordan", "Mercedes") fica de propósito quando é o primeiro nome de alguém:
// só conta quando não vem seguida de outra palavra com maiúscula (o sobrenome)
const firstNameWord = (n) => /^\p{L}+$/u.test(n) && (stats.get(keyOf(n)) || {}).first > 0;
const isLetter = (ch) => !!ch && /\p{L}/u.test(ch);
const FIRST_LISTS = new Set(['NAME_POOL', 'FEMALE_NAMES', 'NICKNAMES']);
function leaks(G) {
  const found = new Map();
  const scan = (v, at, key) => {
    if (typeof v === 'string') {
      // lugares ficam reais (decisão do dono), mesmo com nome de pessoa: "Nelson Piquet", o autódromo de Brasília
      if (ATTR.has(key) || /(src|source)$/i.test(key) || v.length < 4 || placeStrings.has(v)) return;
      let t = v; for (const p of protectedPhrases) if (t.includes(p)) t = t.split(p).join(' ');
      for (const n of realList) {
        if (found.has(n)) continue;
        let i = t.indexOf(n);
        while (i >= 0) {
          const end = i + n.length;
          const asFirst = firstNameWord(n) && /^\s+\p{Lu}/u.test(t.slice(end));
          if (!isLetter(t[i - 1]) && !isLetter(t[end]) && !asFirst) { found.set(n, `${at}: ${v.slice(0, 70)}`); break; }
          i = t.indexOf(n, i + 1);
        }
      }
      return;
    }
    if (Array.isArray(v)) v.forEach((x, i) => scan(x, at + '[' + i + ']', key));
    // listas de primeiros nomes sorteáveis: os primeiros nomes ficam de propósito (estilo decidido pelo dono)
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => { if (!(at === 'G' && FIRST_LISTS.has(k))) scan(x, at + '.' + k, k); });
  };
  scan(G, 'G', '');
  return [...found.entries()];
}

// 4) o pacote
{
  const ctx = vm.createContext({});
  for (const m of ['core/base/util', 'core/base/pack']) vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8'), ctx);
  ctx.__p = JSON.stringify(fict);
  const r = vm.runInContext('Pack.check(JSON.parse(__p))', ctx);
  if (!r.ok) bad.push('pacote fictício inválido: ' + r.errors.join('; '));
  if (fict.images) bad.push('o pacote fictício não pode ter pasta de imagens');
  const photos = (fict.content.ASSET_REGISTRY || []).filter(a => a.type !== 'flag' && a.type !== 'brand').length;
  if (photos) bad.push(`o pacote fictício ainda registra ${photos} foto(s) do mundo real`);
  const packLeaks = leaks(fict.content);
  packLeaks.slice(0, 10).forEach(([n, where]) => bad.push(`pacote: nome real "${n}" (${where})`));
  console.log(`pacote fictício: ${map.size} palavras trocadas · ${packLeaks.length} nome(s) real(is) sobrando no pacote`);
}

// 5) o estilo decidido pelo dono (13/11/2026, "bem parecido, estilo PES"): o primeiro nome fica, o sobrenome muda só
// o final (o começo fica), a sigla de 3 letras quase sempre fica; escada GP nas competições; FIA -> FMA
{
  const R = real.content.REAL_DB.drivers, F = fict.content.REAL_DB.drivers;
  const firstKept = R.filter((d, i) => d.firstName === F[i].firstName && d.name.split(' ')[0] === F[i].name.split(' ')[0]).length;
  const lastSimilar = R.filter((d, i) => { const a = keyOf(d.lastName), b = keyOf(F[i].lastName); return a !== b && b.startsWith(a.slice(0, a.length >= 5 ? 3 : 2)); }).length;
  const abbrKept = R.filter((d, i) => d.abbr === F[i].abbr).length;
  if (firstKept < R.length) bad.push(`estilo: ${R.length - firstKept} piloto(s) de F1 com o primeiro nome trocado`);
  if (lastSimilar < R.length * 0.95) bad.push(`estilo: só ${lastSimilar}/${R.length} sobrenomes de F1 mudam só o final`);
  if (abbrKept < R.length * 0.85) bad.push(`estilo: só ${abbrKept}/${R.length} siglas de F1 ficaram`);
  // em toda a base: os sobrenomes e as palavras de marca começam como as reais
  let total = 0, same = 0;
  for (const [k, v] of map) { const s = stats.get(k); if (!s || k.length < 4 || (s.upper && s.upper >= s.n / 2)) continue; total++; if (keyOf(v).startsWith(k.slice(0, 2))) same++; }
  if (same < total * 0.97) bad.push(`estilo: só ${same}/${total} palavras trocadas começam como a real`);
  const cat = (id) => (fict.content.REAL_CATS.cats.find(c => c.id === id) || {}).name;
  const ladder = { f1: fict.content.DRIVER_DB.series.f1.name, f2: cat('f2'), f3: cat('f3'), fe: cat('fe') };
  if (ladder.f1 !== 'GP1' || ladder.f2 !== 'GP2' || ladder.f3 !== 'GP3' || ladder.fe !== 'GP Elétrico') bad.push(`estilo: escada GP errada (${JSON.stringify(ladder)})`);
  if (map.get('fia') !== 'FMA') bad.push(`estilo: FIA virou ${map.get('fia')}, não FMA`);
  console.log(`estilo: ${firstKept}/${R.length} primeiros nomes de F1 iguais · ${lastSimilar}/${R.length} sobrenomes com o mesmo começo · ${abbrKept}/${R.length} siglas iguais · ${same}/${total} palavras com o mesmo começo · ${ladder.f1}/${ladder.f2}/${ladder.f3}`);
}

// 2) e 3) a carreira: os mesmos ids ao criar; depois, só o fictício joga (o resultado pode ser outro)
const idsOf = (G) => {
  const ids = new Set();
  // G.pack (de qual pacote veio o save) é metadado: o id do pacote é outro de propósito
  (function walk(v, k) { if (typeof v === 'string') { if (k === 'id') ids.add(v); } else if (Array.isArray(v)) v.forEach(x => walk(x, k)); else if (v && typeof v === 'object') Object.entries(v).forEach(([kk, x]) => { if (kk !== 'pack') walk(x, kk); }); })(G, '');
  return ids;
};
const CONFIGS = [
  { id: 'observador', mode: 'observer', seed: 'ficticio-obs' },
  { id: 'manager-haas', mode: 'manager', team: 'haas', seed: 'ficticio-haas' },
];
const codeLeaks = new Map();
for (const cfg of CONFIGS) {
  const t0 = Date.now();
  const A = newCareer(real, cfg), B = newCareer(fict, cfg);
  const ia = idsOf(JSON.parse(JSON.stringify(A.G))), ib = idsOf(JSON.parse(JSON.stringify(B.G)));
  const onlyA = [...ia].filter(x => !ib.has(x)), onlyB = [...ib].filter(x => !ia.has(x));
  if (onlyA.length || onlyB.length) bad.push(`${cfg.id}: ids diferentes ao criar a carreira (só no real: ${onlyA.slice(0, 5).join(', ')}; só no fictício: ${onlyB.slice(0, 5).join(', ')})`);
  let G;
  try { G = play(B, cfg); } catch (e) { bad.push(`${cfg.id}: a carreira fictícia parou: ${e.stack.split('\n').slice(0, 3).join(' | ')}`); continue; }
  const lk = leaks(G);
  lk.forEach(([n, where]) => { if (!codeLeaks.has(n)) codeLeaks.set(n, `${cfg.id}: ${where}`); });
  console.log(`${cfg.id}: ${ia.size} ids ${onlyA.length || onlyB.length ? 'DIFERENTES' : 'iguais'} ao criar · ${SEASONS} temporada(s) no fictício · ${lk.length} nome(s) real(is) no jogo · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
// nomes reais que aparecem no jogo fictício sem estar no pacote vêm do código (listas reais embutidas nos módulos)
[...codeLeaks.entries()].slice(0, 20).forEach(([n, where]) => bad.push(`nome real "${n}" no jogo fictício: ${where}`));

if (bad.length) { console.log(`fictional-world-check: ${bad.length} problema(s)`); bad.slice(0, 60).forEach(b => console.log('  ✗', b)); process.exit(1); }
console.log(`fictional-world-check OK · ${map.size} palavras trocadas · mesmo banco e mesmos ids; nenhum nome real`);
