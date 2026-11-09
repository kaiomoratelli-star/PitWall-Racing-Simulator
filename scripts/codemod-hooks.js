// Converte as cadeias de embrulho (const old = Obj.f; Obj.f = (...) => { ... old(...) ... };) em ganchos
// com nome (Hooks.around). O corpo da função não muda: a variável "old" vira o primeiro parâmetro (next).
// Uso: node scripts/codemod-hooks.js            (só mostra o que faria)
//      node scripts/codemod-hooks.js --apply    (aplica)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const { core, ui } = require('./modules');
const OBJS = 'Social|DriverDB|Career|Events|Engine|RnD|Regs|Owners|Council|Market|Staff|Media|Cats|AI|Sisters|Mfr|Fac|CarDev|Time|SL|Parts|Orders|People|Talks|Econ|Quali|Practice|Setup|RaceLog|Chaos|Identity|Contracts|Academy|Scouting|Talent|Potential|Silly|Narr|Kart|Disc|Circuits|Stories|RegCal|MarketPlus|Testing';
const apply = process.argv.includes('--apply');

// acha o fim de uma expressão (função) começando em i; devolve o índice do ';' final (ou do fim da expressão)
function exprEnd(s, i) {
  let depth = 0; const stack = [];
  const prevSig = (k) => { let j = k - 1; while (j >= 0 && /\s/.test(s[j])) j--; return j >= 0 ? s[j] : ''; };
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (c === '/' && s[k + 1] === '/') { k = s.indexOf('\n', k); if (k < 0) return -1; continue; }
    if (c === '/' && s[k + 1] === '*') { k = s.indexOf('*/', k) + 1; continue; }
    if (c === '\'' || c === '"') { k++; while (k < s.length && s[k] !== c) { if (s[k] === '\\') k++; k++; } continue; }
    if (c === '`') { k++; while (k < s.length && s[k] !== '`') { if (s[k] === '\\') { k += 2; continue; } if (s[k] === '$' && s[k + 1] === '{') { const e = exprEnd(s, k + 2); k = e; } k++; } continue; }
    if (c === '/') { const p = prevSig(k); if (!p || '(,=:[!&|?{};+-*%~^<>'.includes(p)) { k++; let cls = false; while (k < s.length) { if (s[k] === '\\') { k += 2; continue; } if (s[k] === '[') cls = true; else if (s[k] === ']') cls = false; else if (s[k] === '/' && !cls) break; k++; } continue; } }
    if (c === '(' || c === '{' || c === '[') { depth++; stack.push(c); continue; }
    if (c === ')' || c === '}' || c === ']') { if (depth === 0) return k; depth--; stack.pop(); if (depth === 0 && c === '}' && stack.length === 0) { /* fim de bloco */ } continue; }
    if (depth === 0 && (c === ';' || c === ',')) return k;
  }
  return -1;
}
// troca o conteúdo de textos e comentários por espaços (mantém ${...} dos templates), para contar só código
function codeOnly(s) {
  const out = s.split('');
  const blank = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' '; };
  const prevSig = (k) => { let j = k - 1; while (j >= 0 && /\s/.test(s[j])) j--; return j >= 0 ? s[j] : ''; };
  const tmpl = (k) => { // k aponta para o primeiro char depois da crase; devolve o índice da crase final
    let a = k;
    while (k < s.length && s[k] !== '`') {
      if (s[k] === '\\') { k += 2; continue; }
      if (s[k] === '$' && s[k + 1] === '{') { blank(a, k); k = code(k + 2, '}'); a = k + 1; k++; continue; }
      k++;
    }
    blank(a, k); return k;
  };
  function code(k, stop) {
    let depth = 0;
    for (; k < s.length; k++) {
      const c = s[k];
      if (stop && c === stop && depth === 0) return k;
      if (c === '{') depth++; else if (c === '}') depth--;
      if (c === '/' && s[k + 1] === '/') { const e = s.indexOf('\n', k); blank(k, e < 0 ? s.length : e); k = e < 0 ? s.length : e; continue; }
      if (c === '/' && s[k + 1] === '*') { const e = s.indexOf('*/', k) + 2; blank(k, e); k = e - 1; continue; }
      if (c === '\'' || c === '"') { const a = k; k++; while (k < s.length && s[k] !== c) { if (s[k] === '\\') k++; k++; } blank(a + 1, k); continue; }
      if (c === '`') { k = tmpl(k + 1); continue; }
      if (c === '/') { const p = prevSig(k); if (!p || '(,=:[!&|?{};+-*%~^<>'.includes(p)) { const a = k; k++; let cls = false; while (k < s.length) { if (s[k] === '\\') { k += 2; continue; } if (s[k] === '[') cls = true; else if (s[k] === ']') cls = false; else if (s[k] === '/' && !cls) break; k++; } blank(a + 1, k); continue; } }
    }
    return k;
  }
  code(0, null);
  return out.join('');
}
// fim do bloco que contém a posição i (chave que fecha o escopo) no texto só-código
function scopeEnd(cs, i) { let d = 0; for (let k = i; k < cs.length; k++) { if (cs[k] === '{' || cs[k] === '(' || cs[k] === '[') d++; else if (cs[k] === '}' || cs[k] === ')' || cs[k] === ']') { if (d === 0) return k; d--; } } return cs.length; }
let total = 0, skipped = [];
for (const m of [...core, ...ui]) {
  const file = path.join(root, 'app', 'src', m + '.js');
  let s = fs.readFileSync(file, 'utf8');
  const re = new RegExp(`^([ \\t]*)const (\\w+) = ((${OBJS})\\.(\\w+));[^\\n]*\\n`, 'gm');
  const sites = []; let mm;
  while ((mm = re.exec(s))) sites.push({ at: mm.index, len: mm[0].length, indent: mm[1], v: mm[2], target: mm[3], obj: mm[4], key: mm[5] });
  const count = {}; const edits = [];
  for (const st of sites) {
    // a atribuição precisa vir logo depois (até 8 linhas)
    const after = s.slice(st.at + st.len);
    const lines = after.split('\n').slice(0, 8).join('\n');
    const ai = lines.search(new RegExp(`(^|\\n)[ \\t]*${st.target.replace('.', '\\.')}\\s*=(?!=)\\s*`));
    if (ai < 0) { skipped.push(`${m}: ${st.v} = ${st.target} (sem atribuição logo depois)`); continue; }
    const amatch = lines.slice(ai).match(new RegExp(`^\\n?([ \\t]*)${st.target.replace('.', '\\.')}\\s*=\\s*`));
    const aStart = st.at + st.len + ai + (lines[ai] === '\n' ? 1 : 0);
    const rhsStart = aStart + amatch[0].length - (amatch[0].startsWith('\n') ? 1 : 0);
    const end = exprEnd(s, rhsStart);
    if (end < 0) { skipped.push(`${m}: ${st.target} (fim não encontrado)`); continue; }
    const rhs = s.slice(rhsStart, end);
    // a variável só pode ser usada dentro da nova função
    const cs = codeOnly(s); const scEnd = scopeEnd(cs, st.at + st.len);
    const reV = new RegExp(`(?<![\\w.$])${st.v}(?![\\w$])`, 'g');
    const uses = (cs.slice(st.at + st.len, scEnd).match(reV) || []).length;
    const inside = (cs.slice(rhsStart, end).match(reV) || []).length;
    if (uses !== inside) { skipped.push(`${m}: ${st.target} (variável ${st.v} usada fora do embrulho: ${uses - inside})`); continue; }
    // primeiro parâmetro = next
    let nr = null;
    let r;
    if ((r = rhs.match(/^(async\s+)?\(([^)]*)\)\s*=>/))) nr = `${r[1] || ''}(${st.v}${r[2].trim() ? ', ' + r[2] : ''}) =>` + rhs.slice(r[0].length);
    else if ((r = rhs.match(/^(async\s+)?(\w+)\s*=>/))) nr = `${r[1] || ''}(${st.v}, ${r[2]}) =>` + rhs.slice(r[0].length);
    else if ((r = rhs.match(/^(async\s+)?function\s*(\w*)\s*\(([^)]*)\)/))) nr = `${r[1] || ''}function ${r[2]}(${st.v}${r[3].trim() ? ', ' + r[3] : ''})` + rhs.slice(r[0].length);
    if (!nr) { skipped.push(`${m}: ${st.target} (não é uma função simples)`); continue; }
    count[st.target] = (count[st.target] || 0) + 1;
    const name = count[st.target] > 1 ? `${m}#${count[st.target]}` : m;
    edits.push({ declAt: st.at, declLen: st.len, aStart, end, text: `${amatch[1] || ''}Hooks.around('${st.obj}', ${st.obj}, '${st.key}', '${name}', ${nr})` });
  }
  if (!edits.length) continue;
  total += edits.length;
  console.log(`${m}: ${edits.length} gancho(s)`);
  if (apply) {
    // aplica de trás para frente
    edits.sort((a, b) => b.aStart - a.aStart).forEach(e => {
      s = s.slice(0, e.aStart) + e.text + s.slice(e.end);
      s = s.slice(0, e.declAt) + s.slice(e.declAt + e.declLen);
    });
    fs.writeFileSync(file, s);
  }
}
console.log(`total: ${total} gancho(s)${apply ? ' aplicados' : ' (simulação)'}`);
if (skipped.length) { console.log(`pulados (${skipped.length}):`); skipped.forEach(x => console.log('  ', x)); }
