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
  tr: { on: 'B C D G K M N S T Y Ç Ş', v: 'a e i o u ı', k: 'd l n r s t k y', endL: 'oğlu türk can kaya han soy', endM: 'an er han ur et', endF: 'a e ay nur' },
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

/* um nome de pessoa (uma palavra): role 'first' ou 'last'; gender 'M' ou 'F' */
function personWord(family, role, gender, seed) {
  const st = S[family] || S.en;
  const r = rngOf(seed);
  if (st.syl && st.two) {   // chinês e coreano: uma ou duas sílabas
    const a = pick(r, W(st.syl)), b = pick(r, W(st.syl)).toLowerCase();
    return role === 'last' ? a : a + b;
  }
  if (st.syl) {   // japonês
    const n = 1 + Math.floor(r() * 2);
    let s = ''; for (let i = 0; i < n; i++) s += pick(r, W(st.syl));
    return cap(s + pick(r, W(role === 'last' ? st.endL : gender === 'F' ? st.endF : st.endM)));
  }
  let s = pick(r, W(st.on)) + pick(r, W(st.v));
  if (role === 'last') { s += pick(r, W(st.k)); if (r() < 0.35) s += pick(r, W(st.v)) + pick(r, W(st.k)); }
  else if (r() < 0.55) s += pick(r, W(st.k));
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
  while (s.length < len) s += pick(r, (s.length % 2 ? V : L).split(''));
  return s.slice(0, len);
}

module.exports = { FAMILY, familyOf: (nat) => FAMILY[nat] || 'en', personWord, brandWord, acronym, hash, rngOf };
