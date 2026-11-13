// Edição fictícia (regra 19 do dono): os textos escritos no próprio código (rótulos de tela, notícias, propostas do
// Conselho...) citam competições, equipes e marcas reais ("Fórmula 1", "Conselho da FIA", "F2, F3 e F1 Academy").
// No build da edição fictícia, cada texto (string e trecho de template) do código passa pelo mesmo dicionário do
// Pacote de dados fictício. Só entram as palavras de competição, organização e marca (nunca palavras comuns como
// "Mercado", nem ids em minúscula): o jogo fica com os mesmos nomes da base fictícia, e o instalador não leva o
// dicionário nem nenhum nome real. Usado por scripts/build.js (--edicao=ficticia).
'use strict';
const acorn = require('acorn');
const walk = require('acorn-walk');

/* troca os textos de um arquivo de código: codeMap(texto) devolve o texto trocado */
function rewriteCode(src, codeMap) {
  const comments = [];
  const ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true, onComment: (block, text, start, end) => comments.push([start, end, block]) });
  const edits = [];
  // comentários saem do build fictício (citam equipes e pessoas reais e nunca aparecem na tela); o de bloco vira um
  // espaço e o de linha vira nada, para não grudar código
  comments.forEach(([s, e, block]) => edits.push([s, e, block ? ' ' : '']));
  walk.full(ast, (node) => {
    // chave de objeto escrita como texto ('Fórmula 1': 'Formula 1' nas traduções): o percurso não visita, troca aqui
    if (node.type === 'Property' && !node.computed && node.key && node.key.type === 'Literal' && typeof node.key.value === 'string') {
      const v = codeMap(node.key.value);
      if (v !== node.key.value) edits.push([node.key.start, node.key.end, JSON.stringify(v)]);
    }
    if (node.type === 'Literal' && node.regex) {
      // expressões regulares (traduções PT -> EN) trocam junto, para continuar casando com os textos trocados
      const p = codeMap(node.regex.pattern);
      if (p !== node.regex.pattern) edits.push([node.start, node.end, `/${p}/${node.regex.flags}`]);
    } else if (node.type === 'Literal' && typeof node.value === 'string') {
      const v = codeMap(node.value);
      if (v !== node.value) edits.push([node.start, node.end, JSON.stringify(v)]);
    } else if (node.type === 'TemplateElement' && typeof node.value.cooked === 'string') {
      const v = codeMap(node.value.cooked);
      if (v !== node.value.cooked) edits.push([node.start, node.end, v.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')]);
    }
  });
  edits.sort((a, b) => b[0] - a[0]);
  let out = src;
  for (const [s, e, txt] of edits) out = out.slice(0, s) + txt + out.slice(e);
  return { code: out, changed: edits.length };
}

/* a função de troca para o código: só palavras de organização/competição/marca do dicionário, com maiúscula,
   que não são palavras comuns (as que o próprio código escreve em minúsculas dentro de frases) */
// nomes de competição e organização que trocam sempre, mesmo aparecendo em minúscula em alguma frase do código
const FORCE_CODE = new Set(['formula', 'fia']);
/* palavras comuns: as que o código escreve em minúsculas dentro de frases (um id sozinho não conta) */
function codeCommonWords(sources, keyOf) {
  const common = new Set();
  for (const src of sources) {
    let ast; try { ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true }); } catch (e) { continue; }
    walk.full(ast, (node) => {
      const t = node.type === 'Literal' && typeof node.value === 'string' ? node.value : node.type === 'TemplateElement' ? node.value.cooked : null;
      if (!t || !/\s/.test(t)) return;
      (t.match(/\p{Ll}+/gu) || []).forEach(w => common.add(keyOf(w)));
    });
  }
  FORCE_CODE.forEach(k => common.delete(k));
  return common;
}
function codeMapper(fict, sources) {
  const { map, stats, keyOf, forced, mapName, real } = fict;
  const common = codeCommonWords(sources, keyOf);
  const terms = new Map();
  for (const [k, s] of stats) {
    if (!map.has(k) || !s.org) continue;                                  // só palavras de equipe, marca, competição
    if (common.has(k) && !FORCE_CODE.has(k)) continue;                    // palavra comum ("Mercado", "Red" de "Red flag")
    terms.set(k, map.get(k));
  }
  // nomes compostos da base (equipes, motores, competições, veículos, marcas): trocados inteiros, como no pacote
  // ("Red Bull" vira o mesmo nome da equipe fictícia, e não "Red" + outra palavra)
  const C = (real && real.content) || {};
  const orgNames = new Set();
  const add = (n) => { if (typeof n === 'string' && /\s/.test(n) && /\p{Lu}/u.test(n)) orgNames.add(n); };
  (C.REAL_DB ? C.REAL_DB.teams : []).forEach(t => { add(t.name); add(t.fullName); (t.sponsors || []).forEach(add); });
  (C.REAL_DB ? C.REAL_DB.engines : []).forEach(e => add(e.name));
  (C.REAL_CATS ? C.REAL_CATS.cats : []).forEach(c => { add(c.name); c.teams.forEach(t => add(t.name)); });
  Object.values((C.DRIVER_DB || {}).series || {}).forEach(s => add(s.name));
  Object.values((C.REAL_HISTORY || {}).constructors || {}).forEach(x => add(x[0]));
  const W = C.WORLD_LISTS || {};
  [...(W.mfrCands || []).map(x => x.name), ...(W.mfrGenPool || []).map(x => x[0]), ...Object.values(W.tyres || {}).map(x => x.name), ...Object.values(W.outlets || {}).map(x => x.name), ...Object.values(W.groupPolicies || {}).map(x => x.name)].forEach(add);
  const phraseMap = new Map();
  for (const n of orgNames) { const v = forced.has(n) ? forced.get(n) : mapName(n); if (v !== n) phraseMap.set(n, v); }
  for (const [k, v] of forced) if (k.length >= 4 && /\p{Lu}/u.test(k) && /\s/.test(k)) phraseMap.set(k, v);
  const phrases = [...phraseMap.keys()].sort((a, b) => b.length - a.length);
  const caseLike = (orig, fake) => (orig.length > 1 && orig === orig.toUpperCase() ? fake.toUpperCase() : fake.charAt(0).toUpperCase() + fake.slice(1));
  const isL = (ch) => !!ch && /\p{L}/u.test(ch);
  const codeMap = (text) => {
    if (!/\p{Lu}/u.test(text)) return text;
    let t = fict.applyFormula ? fict.applyFormula(text) : text;   // "Fórmula 1" -> GP1 (escada GP)
    for (const p of phrases) {
      if (!t.includes(p)) continue;
      let out = '', i = 0, j;
      while ((j = t.indexOf(p, i)) >= 0) { out += t.slice(i, j) + (!isL(t[j - 1]) && !isL(t[j + p.length]) ? phraseMap.get(p) : p); i = j + p.length; }
      t = out + t.slice(i);
    }
    return t.replace(/\p{L}+/gu, (w, off, all) => {
      if (w === 'F' && /\d/.test(all.charAt(off + 1) || '') && !isL(all.charAt(off - 1))) return 'GP';   // F1 -> GP1 ... F4 -> GP4
      if (w === w.toLowerCase()) return w;
      const k = keyOf(w);
      return terms.has(k) ? caseLike(w, terms.get(k)) : w;
    });
  };
  return { codeMap, terms };
}

module.exports = { rewriteCode, codeMapper, codeCommonWords, FORCE_CODE };
