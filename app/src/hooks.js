'use strict';
/* =============================================================
   GANCHOS (0.8.7) — no lugar das cadeias de embrulho
   Antes, cada módulo que queria fazer algo "depois da corrida" guardava a função antiga e escrevia uma
   nova por cima (Career.finishWeekend chegou a ter 15 camadas). Uma camada escrita sem guardar a anterior
   apagava todas as outras em silêncio.

   Agora:
     Hooks.around('Career', Career, 'finishWeekend', 'sl:comissarios', (next, G, ...a) => { ...; const r = next(G, ...a); ...; return r; });
   - cada gancho tem nome; nome repetido no mesmo alvo dá erro;
   - a ordem é a de registro (o último registrado fica por fora, igual ao embrulho antigo), então o
     comportamento é idêntico ao de antes;
   - Hooks.base(...) troca a função de base de propósito (com motivo) sem derrubar os ganchos;
   - Hooks.verify() acusa qualquer código que tenha reescrito um alvo por fora do registro;
   - Hooks.list() mostra tudo (tela de Diagnóstico).
   ============================================================= */
const Hooks = { targets: {} };
Hooks._target = (label, obj, key) => {
  const id = `${label}.${key}`;
  let T = Hooks.targets[id];
  if (!T) {
    const base = obj[key];
    if (typeof base !== 'function') throw new Error(`Hooks: ${id} não é uma função`);
    T = Hooks.targets[id] = { id, obj, key, base, layers: [], baseWhy: null };
    const dispatch = function (...args) {
      const L = T.layers; const self = this;
      const run = (i, a) => (i < 0 ? T.base.apply(self, a) : L[i].fn.call(self, (...b) => run(i - 1, b), ...a));
      return run(L.length - 1, args);
    };
    dispatch.__hooks = id;
    T.dispatch = dispatch;
    obj[key] = dispatch;
  }
  return T;
};
/* acrescenta uma camada por fora das anteriores */
Hooks.around = (label, obj, key, name, fn) => {
  const T = Hooks._target(label, obj, key);
  if (T.layers.some(l => l.name === name)) throw new Error(`Hooks: gancho "${name}" registrado duas vezes em ${T.id}`);
  T.layers.push({ name, fn });
  return T;
};
/* troca a função de base de propósito; os ganchos continuam valendo */
Hooks.base = (label, obj, key, name, fn, why) => {
  const T = Hooks._target(label, obj, key);
  T.base = fn; T.baseWhy = `${name}: ${why || ''}`;
  return T;
};
/* algum código reescreveu um alvo sem passar pelo registro? */
Hooks.verify = () => Object.values(Hooks.targets).filter(T => T.obj[T.key] !== T.dispatch).map(T => T.id);
Hooks.list = () => Object.values(Hooks.targets).map(T => ({ id: T.id, base: T.baseWhy, layers: T.layers.map(l => l.name) }));
/* substitui a base E derruba as camadas anteriores, de propósito (fica registrado o que saiu e por quê) */
Hooks.replace = (label, obj, key, name, fn, why) => {
  const T = Hooks._target(label, obj, key);
  T.dropped = (T.dropped || []).concat(T.layers.map(l => l.name));
  T.layers = []; T.base = fn; T.baseWhy = `${name}: ${why || ''}`;
  return T;
};
Hooks.list = () => Object.values(Hooks.targets).map(T => ({ id: T.id, base: T.baseWhy, layers: T.layers.map(l => l.name), dropped: T.dropped || [] }));
