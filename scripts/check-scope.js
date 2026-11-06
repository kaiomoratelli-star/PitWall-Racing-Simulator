// Verificação estática de escopo (roda no npm test).
// Os módulos são concatenados num único script, então as funções globais (util.js, ui-core.js...)
// convivem com variáveis locais de mesmo nome. Esta verificação acusa toda chamada `nome(...)`
// em que `nome` é uma função global mas, naquele ponto, resolve para uma variável local que
// não é função. Foi assim que nasceu o "tr is not a function" da 0.7.0: a torre de tempos
// tinha `const tr = Career.track(...)` e chamava a função global de idioma `tr(...)`.
'use strict';
const fs = require('fs');
const path = require('path');
const acorn = require('acorn');
const { core, ui, data } = require('./modules');

const root = path.join(__dirname, '..', 'app', 'src');
const files = [...data, ...core, ...ui].map(m => ({ m, file: path.join(root, m + '.js') }));
const asts = files.map(({ m, file }) => ({ m, src: fs.readFileSync(file, 'utf8') })).map(x => ({ ...x, ast: acorn.parse(x.src, { ecmaVersion: 'latest', sourceType: 'script', locations: true, allowHashBang: true }) }));

const isFnNode = (n) => n && (n.type === 'FunctionExpression' || n.type === 'ArrowFunctionExpression');
const patternNames = (p, out = []) => {
  if (!p) return out;
  if (p.type === 'Identifier') out.push(p.name);
  else if (p.type === 'ObjectPattern') p.properties.forEach(pr => patternNames(pr.type === 'RestElement' ? pr.argument : pr.value, out));
  else if (p.type === 'ArrayPattern') p.elements.forEach(e => patternNames(e, out));
  else if (p.type === 'AssignmentPattern') patternNames(p.left, out);
  else if (p.type === 'RestElement') patternNames(p.argument, out);
  return out;
};

// funções globais: declarações de função e const/let/var com função no topo de cada módulo
const globalFns = new Set();
const globalNames = new Set();
asts.forEach(({ ast }) => ast.body.forEach(st => {
  if (st.type === 'FunctionDeclaration' || st.type === 'ClassDeclaration') globalNames.add(st.id.name);
  if (st.type === 'VariableDeclaration') st.declarations.forEach(d => patternNames(d.id).forEach(nm => globalNames.add(nm)));
}));
// nomes do ambiente (navegador, Electron e Node, onde os testes rodam)
const ENV = new Set([...Object.getOwnPropertyNames(globalThis), 'require', 'alert', 'confirm', 'prompt', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle', 'matchMedia', 'fetch', 'Image', 'Audio', 'AudioContext', 'MutationObserver', 'ResizeObserver', 'IntersectionObserver', 'FileReader', 'Blob', 'URL', 'performance', 'Event', 'CustomEvent', 'HTMLElement', 'DOMParser', 'XMLSerializer', 'Path2D', 'OffscreenCanvas', 'createImageBitmap', 'atob', 'btoa', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask', 'structuredClone']);
asts.forEach(({ ast }) => ast.body.forEach(st => {
  if (st.type === 'FunctionDeclaration') globalFns.add(st.id.name);
  if (st.type === 'VariableDeclaration') st.declarations.forEach(d => { if (d.id.type === 'Identifier' && isFnNode(d.init)) globalFns.add(d.id.name); });
}));

const children = (n) => {
  const out = [];
  for (const k of Object.keys(n)) {
    if (k === 'loc' || k === 'start' || k === 'end') continue;
    const v = n[k];
    if (Array.isArray(v)) v.forEach(x => { if (x && typeof x.type === 'string') out.push(x); });
    else if (v && typeof v.type === 'string') out.push(v);
  }
  return out;
};
// var e funções do corpo de uma função (sem entrar em funções internas)
const hoisted = (body, scope) => {
  const visit = (n, top) => {
    if (!n) return;
    if (n.type === 'FunctionDeclaration') { if (top || true) scope.set(n.id.name, { kind: 'func', fn: true }); return; }
    if (isFnNode(n) || n.type === 'ClassExpression' || n.type === 'ClassDeclaration') return;
    if (n.type === 'VariableDeclaration' && n.kind === 'var') n.declarations.forEach(d => patternNames(d.id).forEach(nm => scope.set(nm, { kind: 'var', fn: isFnNode(d.init) })));
    children(n).forEach(c => visit(c, false));
  };
  visit(body, true);
};
const blockDecls = (stmts, scope) => stmts.forEach(st => {
  if (st.type === 'VariableDeclaration' && st.kind !== 'var') st.declarations.forEach(d => patternNames(d.id).forEach(nm => scope.set(nm, { kind: st.kind, fn: isFnNode(d.init) })));
  if (st.type === 'ClassDeclaration') scope.set(st.id.name, { kind: 'class', fn: false });
});

const problems = [];
const resolve = (chain, name) => { for (let i = chain.length - 1; i >= 0; i--) if (chain[i].has(name)) return chain[i].get(name); return null; };
const walk = (n, chain, m) => {
  if (!n) return;
  let scope = null;
  if (n.type === 'FunctionDeclaration' || isFnNode(n)) {
    scope = new Map();
    n.params.forEach(p => patternNames(p).forEach(nm => scope.set(nm, { kind: 'param', fn: false })));
    if (n.type === 'FunctionExpression' && n.id) scope.set(n.id.name, { kind: 'func', fn: true });
    hoisted(n.body, scope);
    if (n.body.type === 'BlockStatement') blockDecls(n.body.body, scope);
  } else if (n.type === 'BlockStatement' || n.type === 'Program' && false) {
    scope = new Map(); blockDecls(n.body, scope);
  } else if (n.type === 'ForStatement' || n.type === 'ForInStatement' || n.type === 'ForOfStatement') {
    scope = new Map(); const init = n.init || n.left; if (init && init.type === 'VariableDeclaration' && init.kind !== 'var') blockDecls([init], scope);
  } else if (n.type === 'SwitchStatement') {
    scope = new Map(); n.cases.forEach(c => blockDecls(c.consequent, scope));
  } else if (n.type === 'CatchClause') {
    scope = new Map(); patternNames(n.param).forEach(nm => scope.set(nm, { kind: 'param', fn: false }));
  }
  const next = scope ? [...chain, scope] : chain;
  if ((n.type === 'CallExpression' || n.type === 'NewExpression') && n.callee.type === 'Identifier' && !resolve(next, n.callee.name) && !globalNames.has(n.callee.name) && !ENV.has(n.callee.name)) {
    problems.push(`${m}.js:${n.loc.start.line}: chama ${n.callee.name}(), que não existe em nenhum módulo (ReferenceError)`);
  }
  if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && globalFns.has(n.callee.name)) {
    const b = resolve(next, n.callee.name);
    if (b && !b.fn) problems.push(`${m}.js:${n.loc.start.line}: chama a função global ${n.callee.name}(), mas aqui "${n.callee.name}" é ${b.kind === 'param' ? 'um parâmetro' : 'uma variável local'}`);
  }
  // o corpo de função já ganhou o escopo da própria função: não cria um bloco extra para ele
  for (const c of children(n)) {
    if (scope && (n.type === 'FunctionDeclaration' || isFnNode(n)) && c === n.body && c.type === 'BlockStatement') { children(c).forEach(cc => walk(cc, next, m)); continue; }
    walk(c, next, m);
  }
};
asts.forEach(({ m, ast }) => ast.body.forEach(st => walk(st, [], m)));

if (problems.length) {
  console.log(`Verificação de escopo: ${problems.length} problema(s)`);
  problems.forEach(p => console.log('  ' + p));
  process.exit(1);
}
console.log(`Verificação de escopo ok (${files.length} módulos, ${globalFns.size} funções globais)`);
