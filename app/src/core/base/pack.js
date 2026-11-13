/* ============================================================
   PIT WALL — Pacote de dados (0.9, Onda 3).
   O jogo base é fictício. Os dados reais (pilotos, equipes, categorias, história, fotos)
   vêm num Pacote de dados à parte: um JSON versionado com o conteúdo das mesmas variáveis
   globais que o jogo já usa (REAL_DB, REAL_EXTRA, REAL_CATS...).
   Pack.check(p) só confere; Pack.install(p) confere e, se estiver tudo certo, publica as
   variáveis antes de o mundo ser criado. Um pacote inválido é recusado sem mudar nada.
   ============================================================ */
'use strict';

const Pack = {
  FORMAT: 'pitwall-pack',
  VERSION: 1,
  /* variáveis que um pacote pode trazer, com o tipo esperado */
  GLOBALS: {
    REAL_DB: 'object', REAL_EXTRA: 'object', REAL_HISTORY: 'object', REAL_RECORDS: 'object', TEAM_LORE: 'object',
    REAL_CATS: 'object', ASSET_REGISTRY: 'array', DRIVER_DB: 'object', FIA_CIRCUITS: 'object', REAL_TRACKS: 'object',
    DRIVER_WOMEN: 'array', F1_CALENDAR_2027: 'object', DRIVERDB_2026: 'object', DRIVER_TIERS: 'object',
    SPONSOR_BRANDS: 'object', TEAM_CANDIDATES: 'array', TEAM_OWNERS: 'object', GENERIC_LOGOS: 'array',
  },
  installed: null,
};

Pack.typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);

/* confere o pacote sem instalar nada; devolve { ok, errors, warnings } */
Pack.check = (p) => {
  const errors = [], warnings = [];
  if (!p || Pack.typeOf(p) !== 'object') return { ok: false, errors: ['o arquivo não é um Pacote de dados'], warnings };
  if (p.format !== Pack.FORMAT) errors.push(`formato "${p.format}" desconhecido (esperado ${Pack.FORMAT})`);
  if (!Number.isInteger(p.version)) errors.push('pacote sem versão');
  else if (p.version > Pack.VERSION) errors.push(`pacote da versão ${p.version}, mais nova que este jogo (${Pack.VERSION})`);
  if (!p.id || typeof p.id !== 'string' || !/^[a-z0-9][a-z0-9._-]{1,63}$/.test(p.id)) errors.push('pacote sem identificador válido');
  if (!p.name || typeof p.name !== 'string') errors.push('pacote sem nome');
  const c = p.content;
  if (!c || Pack.typeOf(c) !== 'object') { errors.push('pacote sem conteúdo'); return { ok: false, errors, warnings }; }
  Object.keys(c).forEach(k => {
    if (!Pack.GLOBALS[k]) errors.push(`conteúdo desconhecido: ${k}`);
    else if (Pack.typeOf(c[k]) !== Pack.GLOBALS[k]) errors.push(`${k} é ${Pack.typeOf(c[k])}, esperado ${Pack.GLOBALS[k]}`);
  });
  const db = c.REAL_DB;
  if (!db) errors.push('o pacote precisa de REAL_DB (equipes, pilotos e pistas)');
  else if (Pack.typeOf(db) === 'object') {
    ['teams', 'drivers', 'tracks', 'engines'].forEach(k => { if (!Array.isArray(db[k]) || !db[k].length) errors.push(`REAL_DB.${k} vazio ou ausente`); });
    if (!db.rules || Pack.typeOf(db.rules) !== 'object') errors.push('REAL_DB.rules ausente');
    ['teams', 'drivers', 'tracks', 'engines'].forEach(k => {
      if (!Array.isArray(db[k])) return;
      const ids = new Set();
      db[k].forEach((x, i) => {
        if (!x || typeof x.id !== 'string' || !x.id) errors.push(`REAL_DB.${k}[${i}] sem id`);
        else if (ids.has(x.id)) errors.push(`REAL_DB.${k}: id repetido ${x.id}`);
        else ids.add(x.id);
      });
    });
    if (Array.isArray(db.drivers) && Array.isArray(db.teams)) {
      const teams = new Set(db.teams.map(t => t && t.id));
      const orphan = db.drivers.filter(d => d && d.team && !teams.has(d.team)).length;
      if (orphan) errors.push(`${orphan} piloto(s) ligados a equipes que não existem`);
    }
  }
  if (!c.REAL_EXTRA) warnings.push('sem REAL_EXTRA: contratos, staff e superlicença ficam com os valores padrão');
  return { ok: !errors.length, errors: errors.slice(0, 30), warnings };
};

/* instala o pacote (antes de criar o mundo). Recusa um pacote inválido sem mudar nada. */
Pack.install = (p, root) => {
  const r = Pack.check(p);
  if (!r.ok) return r;
  const g = root || (typeof globalThis !== 'undefined' ? globalThis : this);
  Object.entries(p.content).forEach(([k, v]) => { g[k] = v; });
  Pack.installed = { id: p.id, name: p.name, nameEn: p.nameEn || p.name, version: p.version, ref: p.ref || null, license: p.license || null };
  return r;
};

/* (passo 3) o pacote real que vem com o jogo. Saves de antes do Pacote de dados (até a 0.8.7 e os da 0.9
   anteriores a este passo) foram todos criados com os dados reais embutidos: a migração marca esses saves
   com este pacote. */
Pack.REAL = { id: 'pitwall-dados-reais', name: 'Dados reais (F1 e categorias de base)', nameEn: 'Real-world data (F1 and feeder series)' };

/* pacotes que vêm com o jogo: cada arquivo app/dist/packs/*.js (no desktop) ou bloco embutido (na versão web)
   só acrescenta o JSON do pacote à lista PITWALL_PACKS. Instala o primeiro válido; os inválidos ficam no
   relatório e não mudam nada. Lista vazia = mundo fictício (edição gratuita). */
Pack.boot = (list) => {
  const packs = Array.isArray(list) ? list : [];
  const report = { found: packs.length, installed: null, errors: [] };
  for (const p of packs) {
    if (Pack.installed) break;
    const r = Pack.install(p);
    if (r.ok) report.installed = Pack.installed.id;
    else report.errors.push(`${(p && p.id) || '?'}: ${r.errors.join('; ')}`);
  }
  Pack.bootReport = report;
  return report;
};

/* o que o save guarda (G.pack): de qual pacote o mundo veio. null = mundo fictício, sem pacote. */
Pack.summary = () => (Pack.installed ? { id: Pack.installed.id, name: Pack.installed.name, nameEn: Pack.installed.nameEn, version: Pack.installed.version, ref: Pack.installed.ref } : null);

/* um save só abre com o mesmo pacote com que foi criado: o mundo do save mistura-se com os dados
   instalados (categorias, histórico, fotos), então um pacote diferente, ou a falta dele, corromperia o universo.
   Devolve { ok } ou { ok: false, why: 'missing' | 'other' | 'fictional', need, have }. */
Pack.canOpen = (G) => {
  const need = G && G.pack ? G.pack : null;
  const have = Pack.installed;
  if (!need) return have ? { ok: false, why: 'fictional', need: null, have } : { ok: true };
  if (!have) return { ok: false, why: 'missing', need, have: null };
  if (have.id !== need.id) return { ok: false, why: 'other', need, have };
  return { ok: true };
};
