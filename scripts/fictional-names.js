// Gerador de nomes fictícios (regra 19 do dono: o mundo fictício é o banco de dados original com todos os nomes
// trocados por nomes gerados automaticamente, e os mesmos IDs). Nomes fixos na edição: o mesmo pedido (família de
// idioma, papel, gênero, chave) dá sempre o mesmo nome. Sílabas por família de idioma, para os nomes soarem do país
// da pessoa; marcas e equipes têm um estilo próprio. Usado por scripts/make-fictional-pack.js.
'use strict';

// família de idioma por nacionalidade (código do jogo); o que não está aqui usa 'en'
const FAMILY = {};
const fam = (f, list) => list.split(' ').forEach(n => { FAMILY[n] = f; });
fam('es', 'ESP MEX ARG COL CHI CHL VEN URU PER PAR ECU BOL CRC CRI PUR DOM GUA HON CUB PAN ESA AND');
fam('pt', 'BRA POR PRT ANG MOZ');
fam('it', 'ITA SMR');
fam('fr', 'FRA MON MCO LUX BEL');
fam('de', 'GER DEU AUT SUI CHE LIE FRG GDR');
fam('nl', 'NED NLD');
fam('no', 'SWE NOR DEN DNK FIN ISL EST');
fam('fi', 'FIN EST');
fam('sl', 'POL CZE SVK RUS UKR SRB CRO HRV SLO SVN BUL BGR BLR MKD BIH MNE LAT LVA LTU KAZ URS TCH YUG GEO ARM');
fam('ja', 'JPN');
fam('zh', 'CHN HKG TPE TWN MAC MAS MYS SGP INA IDN PHI PHL VIE VNM KHM');
fam('ko', 'KOR');
fam('ar', 'UAE ARE KSA SAU QAT KUW KWT OMN OMA BHR BRN JOR EGY LBN MAR TUN ALG IRQ SYR IRN');
fam('in', 'IND PAK SRI LKA BAN NEP');
fam('th', 'THA');
fam('tr', 'TUR');
fam('hu', 'HUN');
fam('gr', 'GRE GRC CYP');
fam('ro', 'ROU MDA');

// on = consoante inicial, v = vogais, k = consoantes do meio, endL/endM/endF = finais de sobrenome, nome masculino
// e nome feminino. A montagem alterna consoante e vogal (nada de "oea" nem de três consoantes seguidas).
const S = {
  en: { on: 'B Br C Ch Cr D Dr F G Gr H J K L M N P R S Sh St T Th W', v: 'a e i o u a e o', k: 'd l n r s t v m nd rl ll', endL: 'ton ley well wood more ford field ham by son ett worth ridge brook land shaw wick den croft hurst', endM: 'an en ton ric ley den vin ard son as el on ian', endF: 'a ie elle ine lyn ette ia ey anne' },
  es: { on: 'B C Ch D G J L M N P R S T V Br Cr Gr Fr', v: 'a e i o u a e o', k: 'd l n r s t v m rr lv rd', endL: 'ez ado ero ales ino illa anza edo ena aro ega ida ares ondo urra ejo', endM: 'o io ando el an ín ar ero undo ián esto', endF: 'a ia ela ina ita ena isa iana' },
  pt: { on: 'B C D F G J L M N P R S T V Br Cr Fr Gr', v: 'a e i o u a e o', k: 'd l n r s t v m lh nh rr', endL: 'eira inho ado ário elo ida ares ouza ante anha edo alho este ões ena', endM: 'o ilo ério el eu ino ão ardo iano', endF: 'a ana ela ira ice ina ícia' },
  it: { on: 'B C D F G L M N P R S T V Br Cr Fr Gr', v: 'a e i o u a e o', k: 'd l n r s t v m ll rr nz tt', endL: 'elli ini etti one ardi ucci aro ese ani ola azzi ato ino otti', endM: 'o io ino ello ardo ano iano ero', endF: 'a ia ella ina etta ana ilde' },
  fr: { on: 'B C D F G J L M N P R S T V Br Ch Gr Tr', v: 'a e i o a e ou au', k: 'd l n r s t v m rn ss', endL: 'ard ier eau ault ois in et elle ière on aux ac ange', endM: 'ien ard ain el ric ent on is aud', endF: 'ine elle ette ie ane aude ise' },
  de: { on: 'B D F G H K L M N R S T W Br Gr Kr Sch St', v: 'a e i o u a e ei', k: 'd l n r s t m nk rt ld lm', endL: 'mann berg er stein hoff feld ner ling bach hardt itz rich wald', endM: 'er ard ulf ert ian as o mar old', endF: 'a ine ke rid lind gard' },
  nl: { on: 'B D F G H J K L M N P R S T V W Br Gr Kr', v: 'a e i o u a e oo', k: 'd l n r s t v m nk rs', endL: 'ink ers huis stra sen ma dijk veld hout ens kamp man', endM: 's ijn ert ard o en ik', endF: 'ke a ien je ina' },
  no: { on: 'B D F G H J K L M N R S T V Br Fr Gr Sv', v: 'a e i o u a e y', k: 'd l n r s t v m ld rn', endL: 'son sen berg lund ström qvist dahl gren vik holm nen inen la stad', endM: 'e ar ik ulf as o er', endF: 'a ja rid ve na lin' },
  sl: { on: 'B D G K L M N P R S T V Z Br Dr Kr Pr St', v: 'a e i o u a e o', k: 'd l n r s t v m sl dr', endL: 'ski ov ić enko ak ek iak yk in ev ec uk', endM: 'an ek omir slav ir ij o en', endF: 'a ina ka ena ia' },
  ja: { syl: 'ka ki ko ta to na no ma mi mo ra ri ro sa shi su ya yu ha hi ho da go ji ku ke se so te', endL: 'moto mura ta shita kawa no da yama saki uchi hara zawa', endM: 'o to ki ya shi ro hei suke', endF: 'ko mi na ka yo e ri' },
  zh: { syl: 'Bao Chen Dai Fan Gao Hong Jia Kai Lan Lei Ming Ning Pei Qin Rui Shan Tao Wen Xia Yan Zhen Bo Cai Deng Fei Guo Hua Jun Kang Liang Mei Nan Ping Qing Rong Song Tian Wei Xin Yue Zhi', two: true },
  ko: { syl: 'Bae Cha Do Eun Gwan Ha Hyun Ji Jun Kang Min Na Seo Sung Tae Woo Yeon Yoo Dong Hee', two: true },
  ar: { on: 'B D F H J K Kh M N Q R S Sh T Z', v: 'a i u a a', k: 'd l n r s m b h', endL: 'ani awi eri ein ari ouri adi ini', endM: 'id ir an am ad ul', endF: 'a ia ah ina' },
  in: { on: 'B D G J K M N P R S T V Ch Sh', v: 'a i u a e', k: 'd l n r s m v sh', endL: 'an esh ar raj deep avan ani endra', endM: 'av esh ul an it ish', endF: 'a ita ika ini' },
  th: { on: 'B Ch K N P R S T W Th Ph', v: 'a i o u a', k: 'k n p t w', endL: 'chai pong wat sakul thorn porn kul', endM: 'chai pong sak at', endF: 'a porn ya nee' },
  tr: { on: 'B C D G K M N S T Y Ç Ş', v: 'a e i o u e', k: 'd l n r s t k y', endL: 'oğlu türk can kaya han soy', endM: 'an er han ur et', endF: 'a e ay nur' },
  hu: { on: 'B D F G K L M N P S T V Sz', v: 'a e i o u á', k: 'd l n r s t k', endL: 'ás ényi ai ó és ics', endM: 'án or ás os ér', endF: 'a ka ett' },
  gr: { on: 'D G K L M N P S Th Ch St', v: 'a e i o', k: 'd l n r s t k', endL: 'opoulos idis akis atos iou', endM: 'os is as', endF: 'a i ia' },
  ro: { on: 'B C D F G M N P R S T V', v: 'a e i o u', k: 'd l n r s t v', endL: 'escu eanu aru ache', endM: 'u el ian or', endF: 'a ia ela ina' },
};
const W = (s) => (s ? s.split(' ') : []);
const VOWELS = 'aeiouyáéíóúãõâêôàäöüı';
const endsVowel = (s) => VOWELS.includes(s.slice(-1).toLowerCase());
const startsVowel = (s) => VOWELS.includes(s.charAt(0).toLowerCase());

// gerador com semente (mulberry32 sobre um hash FNV do texto)
const hash = (str) => { let h = 2166136261 >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; };
const rngOf = (seed) => { let s = hash(seed) || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* um nome de pessoa (uma palavra): role 'first' ou 'last'; gender 'M' ou 'F'; initial = a letra (a-z) com que o nome
   tem de começar (a mesma do nome real: o jogo compara iniciais para achar a mesma pessoa e abrevia "L. Hamilton") */
function personWord(family, role, gender, seed, long, initial) {
  const st = S[family] || S.en;
  const r = rngOf(seed);
  const I = initial ? initial.toLowerCase() : null;
  const startsI = (x) => !I || x.toLowerCase().startsWith(I);
  const pickI = (list) => { const ok = list.filter(startsI); return ok.length ? pick(r, ok) : null; };
  if (st.syl && st.two) {   // chinês e coreano: uma ou duas sílabas
    const a = pickI(W(st.syl)) || cap(I + pick(r, W('a e i o u'))), b = pick(r, W(st.syl)).toLowerCase();
    return role === 'last' && !long ? a : a + b;
  }
  if (st.syl) {   // japonês
    const n = 1 + Math.floor(r() * 2) + (long ? 1 : 0);
    let s = pickI(W(st.syl)) || (I ? I + pick(r, W('a i o u')) : pick(r, W(st.syl)));
    for (let i = 1; i < n; i++) s += pick(r, W(st.syl));
    return cap(s + pick(r, W(role === 'last' ? st.endL : gender === 'F' ? st.endF : st.endM)));
  }
  let s;
  if (!I) s = pick(r, W(st.on)) + pick(r, W(st.v));
  else if (VOWELS.includes(I)) s = I + pick(r, W(st.k));                       // começa por vogal: vogal + consoante
  else s = (pickI(W(st.on)) || I.toUpperCase()) + pick(r, W(st.v));          // consoante inicial da família (ou a própria letra)
  if (role === 'last') { s += pick(r, W(st.k)); if (long || r() < 0.35) s += pick(r, W(st.v)) + pick(r, W(st.k)); }
  else if (r() < 0.55 || long) s += pick(r, W(st.k)) + (long ? pick(r, W(st.v)) + pick(r, W(st.k)) : '');
  const end = pick(r, W(role === 'last' ? st.endL : gender === 'F' ? st.endF : st.endM));
  if (endsVowel(s) && startsVowel(end)) s += pick(r, W(st.k));                       // nada de vogal com vogal na emenda
  else if (!endsVowel(s) && !startsVowel(end)) s += pick(r, W(st.v));                // nem consoante com consoante
  return cap((s + end).toLowerCase());
}

/* uma palavra de marca ou equipe (sem família de idioma) */
const BRAND = { on: 'Al Ar B Br C Cor D Dr El F G H K Kr L M N Nov Or P R S Sol T Tr V Vel Vex Z', v: 'a e i o u a o', k: 'l n r s t v x z m nd rt', end: 'on ex ix ar or a o ia ium ant era ent is us ova' };
function brandWord(seed) {
  const r = rngOf(seed);
  let s = pick(r, W(BRAND.on)) + pick(r, W(BRAND.v));
  if (r() < 0.6) s += pick(r, W(BRAND.k));
  const end = pick(r, W(BRAND.end));
  if (endsVowel(s) && startsVowel(end)) s += pick(r, W(BRAND.k));
  else if (!endsVowel(s) && !startsVowel(end)) s += pick(r, W(BRAND.v));
  return cap((s + end).toLowerCase());
}

/* sigla de N letras a partir de uma palavra fictícia (tentativa 0 = as primeiras letras) */
function acronym(word, len, attempt) {
  const base = String(word || '').normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase();
  if (base.length >= len && attempt === 0) return base.slice(0, len);
  const r = rngOf('sig:' + word + ':' + attempt);
  const L = 'BCDFGHJKLMNPRSTVWXZ', V = 'AEIOU';
  let s = base.slice(0, 1) || pick(r, L.split(''));
  const ALL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  while (s.length < len) s += pick(r, (attempt > 3 ? ALL : s.length % 2 ? V : L).split(''));
  if (attempt > 8) s = pick(r, ALL.split('')) + s.slice(1);
  return s.slice(0, len);
}

// ---------------------------------------------------------------------------------------------------------------
// Estilo "parecido" (decisão do dono, 13/11/2026: "bem parecido, estilo PES"). O começo da palavra fica igual e só o
// fim muda: troca a rima da última sílaba (vogal + consoantes finais), troca a última sílaba inteira por um final
// típico do idioma ou, numa palavra de uma sílaba, acrescenta um final. Ex.: Hamilton -> Hamilford, Leclerc -> Leclair.
// Quem escolhe entre os candidatos é make-fictional-pack.js (palavra livre, distância e naturalidade).
// r = rimas (começam por vogal), s = sílabas finais (começam por consoante)
const ENDS = {
  en: { r: 'in ey er an ell ard ock ing ett on ow ick ins', s: 'ford ley ton well by son wood field more worth den ham wick ridge shaw ston' },
  es: { r: 'ez ado ero ino ega iro ales ano era al ar ines on', s: 'res dez ndo rra lla nez ros zo ra go ño' },
  pt: { r: 'eira inho ado ares elo ino ira ote ano ela ões', s: 'nho lho ra ro sa to des res ta' },
  it: { r: 'etti ini ello ano one ari ucci ato esi oli ani', s: 'netti rini lli sso zzi tti ni ri ti no to' },
  fr: { r: 'ard ier eau in ais on et ot ac and ault air elle', s: 'nard tier reau lin gnac zet vet ron vin' },
  de: { r: 'er ann ert ing en ich ach old inger el', s: 'mann berg ler ner stein hof feld bach ling wald hardt' },
  nl: { r: 'ers en el ink ijk aan ens oort uis', s: 'sen mans berg kel veld dijk huis stra hout kamp' },
  no: { r: 'en er und ist ell ing ar as', s: 'son sen berg lund ström dahl gren vik holm stad' },
  fi: { r: 'inen anen ala ola o i en', s: 'nen la vaara salo mäki nni' },
  sl: { r: 'ov ev in ski ak ek ic enko uk an', s: 'ski nov vic ček rov lak tov' },
  ja: { r: 'a i o e u', s: 'kawa mura saki ta ki ra hara yama mi ka ma ga no zawa shima moto' },
  zh: { r: 'an ang ei ong ao ui en', s: 'wei ming jun hao lin tao feng long rui xin bo kai' },
  ko: { r: 'an eon ung oo i', s: 'hyun min woo jin seok ho jun' },
  ar: { r: 'i an ani ari ir ad oud ah', s: 'mi ri di dan san had' },
  in: { r: 'an esh ar i am av', s: 'raj deep nath preet kumar' },
  th: { r: 'a on in it', s: 'chai pong sakul porn wat' },
  tr: { r: 'oğlu an er ay ın ün', s: 'can kaya türk han soy' },
  hu: { r: 'ás ai ényi os és', s: 'nyi házi csi ló' },
  gr: { r: 'opoulos idis akis os as is', s: 'poulos dis kis tos' },
  ro: { r: 'escu eanu an u a', s: 'nescu reanu lescu' },
  brand: { r: 'ano ia ex on ix o a ara ina ell ard en is us or io', s: 'sen ton ford ley rex tron vel nor dex tek line' },
};
const VOW = 'aeiouyáéíóúãõâêôàäöüåæøı';
// 'y' é vogal, menos no começo e antes de outra vogal (Gasly, Tyrrell; Yuki, Guanyu)
// o 'u' de "qu" e de "gue/gui" não é vogal (Piquet, Rodríguez)
const isVowelAt = (w, i) => {
  const c = w[i]; if (!c) return false;
  if (c === 'y') return i > 0 && !'aeiouáéíóúãõâêôàäöü'.includes(w[i + 1] || '#');
  if (c === 'u' && (w[i - 1] === 'q' || (w[i - 1] === 'g' && 'eiéí'.includes(w[i + 1] || '#')))) return false;
  return VOW.includes(c);
};
function vowelGroups(lw) { const g = []; for (let i = 0; i < lw.length;) { if (isVowelAt(lw, i)) { const s = i; while (i < lw.length && isVowelAt(lw, i)) i++; g.push([s, i]); } else i++; } return g; }

/* candidatos parecidos com a palavra (ordem fixa pela semente): [{ w, j }], j = onde começa a parte nova */
function similarCandidates(word, family, seed) {
  const E = ENDS[family] || ENDS.en;
  const lw = word.toLowerCase();
  const r = rngOf('parecido:' + seed);
  const mix = (arr) => arr.map(x => [r(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const g = vowelGroups(lw);
  const out = [];
  if (g.length >= 2) {
    const last = g[g.length - 1], prevEnd = g[g.length - 2][1];
    const AB = [];
    W(E.r).forEach(e => AB.push({ w: word.slice(0, last[0]) + e, j: last[0] }));                 // troca a rima
    W(E.s).forEach(e => {                                                                       // troca a última sílaba
      AB.push({ w: word.slice(0, prevEnd) + e, j: prevEnd });
      if (last[0] - prevEnd >= 2) AB.push({ w: word.slice(0, prevEnd + 1) + e, j: prevEnd + 1 });   // Hamil|ford
    });
    out.push(...mix(AB));
  }
  // acrescenta um final (palavra de uma sílaba; nas outras, só se nada acima servir)
  const endsV = isVowelAt(lw, lw.length - 1);
  const C = [];
  [...W(E.r), ...W(E.s)].forEach(e => { if (endsV !== VOW.includes(e[0])) C.push({ w: word + e, j: word.length }); });
  out.push(...mix(C));
  return out;
}

/* naturalidade: as sequências de 3 letras da emenda em diante (última letra que fica + o final novo) existem em
   nomes reais (corpus = as próprias palavras da base, por família de idioma; strict = só a família, senão todas);
   e a emenda não cria grupo de consoantes maior que o da palavra real, letra tripla nem sílaba repetida */
function makeNatural(corpusByFamily) {
  const tri = new Map(), all = new Set();
  for (const [f, words] of Object.entries(corpusByFamily)) {
    const s = tri.get(f) || new Set();
    for (const w of words) { const p = '^' + w.toLowerCase() + '$'; for (let i = 0; i + 3 <= p.length; i++) { s.add(p.slice(i, i + 3)); all.add(p.slice(i, i + 3)); } }
    tri.set(f, s);
  }
  const consRun = (s) => { let m = 0, c = 0; for (let i = 0; i < s.length; i++) { if (/\p{L}/u.test(s[i]) && !isVowelAt(s, i)) { c++; m = Math.max(m, c); } else c = 0; } return m; };
  return (cand, j, family, strict, orig) => {
    const s = tri.get(family);
    const use = strict ? (s && s.size > 600 ? s : null) : all;
    if (!use) return false;
    const lc = cand.toLowerCase();
    const p = '^' + lc + '$';
    for (let i = j; i + 3 <= p.length; i++) if (!use.has(p.slice(i, i + 3))) return false;
    const win = lc.slice(Math.max(0, j - 3), j + 3);
    if (/(\p{L})\1\1/u.test(lc) || /(\p{L}{2})\1/u.test(win)) return false;
    if (orig && consRun(win) > Math.max(2, consRun(orig.toLowerCase()))) return false;
    return true;
  };
}

/* sigla parecida: as primeiras letras ficam, a última muda (vogal por vogal, consoante por consoante) */
function similarAcronyms(word, seed) {
  const up = String(word).toUpperCase();
  const r = rngOf('sigla:' + seed);
  const mix = (arr) => arr.map(x => [r(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const V = 'AEIOU', K = 'BCDFGKLMNPRSTVXZ';
  const swap = (s, i) => mix((V.includes(s[i]) ? V : K).split('').filter(c => c !== s[i])).map(c => s.slice(0, i) + c + s.slice(i + 1));
  const n = up.length;
  const longer = n <= 2 ? mix((V + K).split('')).map(c => up + c) : [];   // AG -> AGX quando as de 2 letras acabam
  return [...swap(up, n - 1), ...(n > 2 ? swap(up, n - 2) : []), ...(n > 2 ? swap(up, 1) : []), ...longer];
}

/* distância de edição (Levenshtein) */
function lev(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

module.exports = { FAMILY, familyOf: (nat) => FAMILY[nat] || 'en', personWord, brandWord, acronym, hash, rngOf, similarCandidates, makeNatural, similarAcronyms, lev, ENDS };
