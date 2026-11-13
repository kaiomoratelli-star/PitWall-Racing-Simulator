// Regra 19 do dono: o mundo fictício é o banco de dados original, inteiro e idêntico, com os nomes gerados e os
// mesmos IDs. Este teste joga a mesma carreira (mesma semente) com o Pacote de dados real e com o fictício e confere:
//  1) equivalência: mesma estrutura, mesmos números, mesmos ids; cada texto do fictício é o texto real passado pelo
//     dicionário de nomes, ou ao menos tem o mesmo esqueleto (só as palavras com maiúscula, os nomes, mudam);
//  2) nenhum nome real sobrou no jogo fictício: nomes completos de pessoas e nomes de equipes, marcas, motores e
//     competições da base real;
//  3) o pacote fictício é válido (Pack.check) e não tem foto nem fonte externa.
// Uso: node scripts/fictional-world-check.js [temporadas=1]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const { core } = require('./modules');
const { buildPack } = require('./make-data-pack');
const { buildFictionalPack } = require('./make-fictional-pack');
const SEASONS = +(process.argv[2] || 1);
const real = buildPack();
const { pack: fict, map, mapText, mapName, keyOf, protectedPhrases, FICT_SOURCE, GENERIC } = buildFictionalPack(real);
// textos de fonte do pacote real: dentro de um texto montado pelo jogo, viram a fonte fictícia antes de comparar
const SOURCES = []; (function grab(v, k) { if (typeof v === 'string') { if (/(src|source|sources)$/i.test(k) && v.length > 8) SOURCES.push(v); } else if (Array.isArray(v)) v.forEach(x => grab(x, k)); else if (v && typeof v === 'object') Object.entries(v).forEach(([kk, x]) => grab(x, kk)); })(real.content, ''); SOURCES.sort((a, b) => b.length - a.length);
const deAttr = (s) => { let t = s; for (const x of SOURCES) if (t.includes(x)) t = t.split(x).join(FICT_SOURCE); return t; };
const bad = [];

function career(pack, cfg) {
  const ctx = vm.createContext({ console, Math, JSON, Date, process });
  for (const m of core) vm.runInContext(fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8'), ctx, { filename: m + '.js' });
  ctx.__p = JSON.stringify(pack);
  const r = vm.runInContext('Pack.install(JSON.parse(__p))', ctx);
  if (!r.ok) throw new Error(`pacote ${pack.id} recusado: ${r.errors.join('; ')}`);
  vm.runInContext('this.API = { Career, Events, defaultDb, Owners: typeof Owners !== "undefined" ? Owners : null, Talks: typeof Talks !== "undefined" ? Talks : null }', ctx);
  const { Career, Events, defaultDb, Owners, Talks } = ctx.API;
  const G = Career.create(defaultDb(), { mode: cfg.mode, teamId: cfg.team, seed: cfg.seed, name: 'Teste' });
  if (G.teamSetup && G.teamSetup.pending && Owners && Owners.autoSetup) Owners.autoSetup(G);
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

// campos que não se comparam: horários, o pacote de origem, fontes/fotos (o fictício não tem) e siglas (geradas de novo)
const IGNORE = new Set(['createdAt', 'savedAt', 'pack', 'src', 'source', 'sources', 'img', 'logo', 'carImg', 'teamLogo', 'heroImg', 'mapImg', 'origin', 'license', 'abbr', 'short', 'pid', 'commonsImg', 'handle']);   // pid: chave interna tirada do nome
// esqueleto de um texto: palavras com maiúscula (nomes próprios) viram §; minúsculas, números e pontuação ficam.
// Cobre textos montados pelo código com nomes no meio.
const skeleton = (s) => String(s).replace(/\p{Lu}[\p{L}'’.-]*/gu, '§').replace(/\s+/g, ' ');
function compare(a, b, at, out) {
  if (out.length >= 12) return;
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a === null) !== (b === null)) { out.push(`${at}: tipo diferente (${JSON.stringify(a).slice(0, 40)} × ${JSON.stringify(b).slice(0, 40)})`); return; }
  if (Array.isArray(a)) { if (a.length !== b.length) { out.push(`${at}: ${a.length} × ${b.length} itens`); return; } a.forEach((x, i) => compare(x, b[i], `${at}[${i}]`, out)); return; }
  if (a && typeof a === 'object') {
    const skip = (k) => IGNORE.has(k) || /(src|source)$/i.test(k);   // fontes: o fictício não tem
    const ka = Object.keys(a).filter(k => !skip(k)), kb = Object.keys(b).filter(k => !skip(k));
    if (ka.length !== kb.length) { out.push(`${at}: chaves diferentes (${ka.filter(k => !(k in b) && !(mapText(k) in b)).slice(0, 4).join(',')} × ${kb.filter(k => !(k in a)).slice(0, 4).join(',')})`); return; }
    ka.forEach(k => { const kb2 = k in b ? k : mapText(k); if (!(kb2 in b)) { out.push(`${at}: chave ${k} sumiu`); return; } compare(a[k], b[kb2], `${at}.${k}`, out); });
    return;
  }
  if (typeof a === 'string') { a = deAttr(a); if (a !== b && mapText(a) !== b && mapName(a) !== b && skeleton(a) !== skeleton(b)) out.push(`${at}: "${a.slice(0, 60)}" → esperado "${mapText(a).slice(0, 60)}", veio "${b.slice(0, 60)}"`); return; }
  if (a !== b) out.push(`${at}: ${a} × ${b}`);
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
// uma palavra genérica sozinha ('Autosport', 'Motorsport') não conta: aparece em nomes de equipe fictícios de propósito
// palavras comuns: as que o próprio código do jogo escreve em minúsculas ("marca", "sport"); um nome de uma palavra
// só que também é palavra comum (o jornal "Marca") não conta, porque aparece nos textos do jogo como palavra
const codeWords = new Set();
for (const m of [...core, ...require('./modules').ui]) (fs.readFileSync(path.join(root, 'app', 'src', m + '.js'), 'utf8').match(/\p{Ll}+/gu) || []).forEach(w => codeWords.add(w));
const onlyGenericWord = (n) => { const ws = n.match(/\p{L}+/gu) || []; return ws.length === 1 && (GENERIC.has(keyOf(ws[0])) || codeWords.has(ws[0].toLowerCase())); };
const realList = [...realNames].filter(n => !onlyGenericWord(n)).sort((a, b) => b.length - a.length);
const isLetter = (ch) => !!ch && /\p{L}/u.test(ch);
function leaks(G) {
  const found = new Map();
  const scan = (v, at, key) => {
    if (typeof v === 'string') {
      if (IGNORE.has(key) || /(src|source)$/i.test(key) || v.length < 5) return;
      let t = v; for (const p of protectedPhrases) if (t.includes(p)) t = t.split(p).join(' ');
      for (const n of realList) {
        if (found.has(n)) continue;
        let i = t.indexOf(n);
        while (i >= 0) { if (!isLetter(t[i - 1]) && !isLetter(t[i + n.length])) { found.set(n, `${at}: ${v.slice(0, 70)}`); break; } i = t.indexOf(n, i + 1); }
      }
      return;
    }
    if (Array.isArray(v)) v.forEach((x, i) => scan(x, at + '[' + i + ']', key));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => scan(x, at + '.' + k, k));
  };
  scan(G, 'G', '');
  return [...found.entries()];
}

// 3) o pacote
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

const CONFIGS = [
  { id: 'observador', mode: 'observer', seed: 'ficticio-obs' },
  { id: 'manager-haas', mode: 'manager', team: 'haas', seed: 'ficticio-haas' },
];
const codeLeaks = new Map();
for (const cfg of CONFIGS) {
  const t0 = Date.now();
  const A = career(real, cfg), B = career(fict, cfg);
  const diffs = []; compare(A, B, 'G', diffs);
  const lk = leaks(B);
  lk.forEach(([n, where]) => { if (!codeLeaks.has(n)) codeLeaks.set(n, `${cfg.id}: ${where}`); });
  diffs.forEach(d => bad.push(`${cfg.id}: ${d}`));
  console.log(`${cfg.id}: ${SEASONS} temporada(s) · ${diffs.length ? diffs.length + '+ diferença(s)' : 'mesma carreira, só os nomes mudam'} · ${lk.length} nome(s) real(is) no jogo fictício · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
// nomes reais que aparecem no jogo fictício sem estar no pacote vêm do código (listas reais embutidas nos módulos)
[...codeLeaks.entries()].slice(0, 20).forEach(([n, where]) => bad.push(`nome real "${n}" no jogo fictício (vem do código): ${where}`));

if (bad.length) { console.log(`fictional-world-check: ${bad.length} problema(s)`); bad.slice(0, 60).forEach(b => console.log('  ✗', b)); process.exit(1); }
console.log(`fictional-world-check OK · ${map.size} palavras trocadas · mesmo mundo, mesmos ids, mesma carreira; nenhum nome real`);
