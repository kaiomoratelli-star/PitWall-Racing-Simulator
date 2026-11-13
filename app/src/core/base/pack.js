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
  Pack.installed = { id: p.id, name: p.name, version: p.version, ref: p.ref || null, license: p.license || null };
  return r;
};
