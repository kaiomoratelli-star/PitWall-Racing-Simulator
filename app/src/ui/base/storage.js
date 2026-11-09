/* ============================================================
   PIT WALL — salvamento: nuvem (db da conta), navegador e arquivo
   ============================================================ */
'use strict';

const Store = {
  db: null, user: null, uid: null, downloads: null, sample: null, ready: false,
  CHUNK: 180000,
  SLOTS: ['slot1', 'slot2', 'slot3'],
};

/* No aplicativo desktop o preload expõe window.pitwallNative (arquivos em %APPDATA%) */
Store.native = (typeof window !== 'undefined' && window.pitwallNative) || null;
Store.where = () => Store.native ? 'Disco: pasta de dados do Windows' : Store.cloud() ? 'Nuvem: sua conta Claude' : 'Somente neste navegador';
Store.log = (level, msg) => {
  try { if (Store.native) Store.native.log(level, String(msg)); else if (level === 'error') console.error(msg); } catch (e) { /* sem log */ }
};

Store.init = async () => {
  if (Store.native) { Store.ready = true; try { UI.appInfo = await Store.native.info(); } catch (e) { UI.appInfo = null; } return; }
  const c = window.claude;
  if (!c || !c.use) { Store.ready = true; return; }
  const [db, user, downloads, sample] = await Promise.all([
    c.use('db').catch(() => null), c.use('user').catch(() => null), c.use('downloads').catch(() => null), c.use('sample').catch(() => null),
  ]);
  Store.db = db; Store.user = user; Store.downloads = downloads; Store.sample = sample;
  if (user && user.id) { try { Store.uid = await user.id(); } catch (e) { Store.uid = null; } }
  Store.ready = true;
};

Store.cloud = () => !!(Store.db && Store.uid);
Store.base = () => 'data/users/' + Store.uid;

/* ---- navegador ---- */
Store.lsGet = (k) => { try { return localStorage.getItem('pitwall:' + k); } catch (e) { return null; } };
Store.lsSet = (k, v) => { try { localStorage.setItem('pitwall:' + k, v); return true; } catch (e) { return false; } };
Store.lsDel = (k) => { try { localStorage.removeItem('pitwall:' + k); } catch (e) { /* sem acesso */ } };

/* ---- nuvem com pedaços (cada documento tem limite de 256 KiB) ---- */
Store.cloudWrite = async (key, str, meta) => {
  const n = Math.ceil(str.length / Store.CHUNK) || 1;
  const col = Store.db.collection(Store.base());
  for (let i = 0; i < n; i++) await col.doc(`${key}_c${i}`).set({ s: str.slice(i * Store.CHUNK, (i + 1) * Store.CHUNK) });
  await col.doc(key).set({ chunks: n, meta: meta || {}, at: Date.now() });
};
Store.cloudRead = async (key) => {
  const col = Store.db.collection(Store.base());
  const head = await col.doc(key).get();
  const h = head && head.data();
  if (!h || !h.chunks) return null;
  let s = '';
  for (let i = 0; i < h.chunks; i++) { const c = await col.doc(`${key}_c${i}`).get(); const d = c && c.data(); s += d ? d.s : ''; }
  return s;
};
Store.cloudMeta = async (key) => {
  try { const h = await Store.db.collection(Store.base()).doc(key).get(); const d = h && h.data(); return d ? { ...d.meta, at: d.at } : null; } catch (e) { return null; }
};
Store.cloudDelete = async (key) => {
  const col = Store.db.collection(Store.base());
  const h = await col.doc(key).get();
  const d = h && h.data();
  if (d) for (let i = 0; i < d.chunks; i++) await col.doc(`${key}_c${i}`).delete().catch(() => {});
  await col.doc(key).delete().catch(() => {});
};

Store.metaOf = (G) => {
  const t = Career.isObs(G) ? null : Career.team(G);
  return { player: G.player.name, team: t ? t.name : 'Modo Observador', color: t ? t.color : '#e10600', mode: G.mode, year: G.season.year, round: G.season.round, total: G.season.calendar.length, seed: G.seed };
};

/* ---- compactação (0.8.7): navegador e nuvem guardam "gz1:" + gzip em base64 (~6x menor que o JSON).
   Saves antigos, sem o marcador, continuam sendo lidos como JSON puro. Sem CompressionStream, grava como antes. ---- */
Store.GZ = 'gz1:';
Store.canZip = () => typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined' && typeof Blob !== 'undefined';
Store.b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
Store.unb64 = (b) => { const s = atob(b); const u8 = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i); return u8; };
Store.pack = async (str) => {
  if (!Store.canZip()) return str;
  try {
    const buf = await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    const packed = Store.GZ + Store.b64(new Uint8Array(buf));
    // confere antes de usar: se a volta não bater, grava sem compactar
    return (await Store.unpack(packed)) === str ? packed : str;
  } catch (e) { Store.log('warn', 'compactação do save falhou: ' + (e && e.message)); return str; }
};
Store.unpack = async (str) => {
  if (typeof str !== 'string' || !str.startsWith(Store.GZ)) return str;
  const u8 = Store.unb64(str.slice(Store.GZ.length));
  return new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
};
Store.parse = async (str) => { if (!str) return null; try { return JSON.parse(await Store.unpack(str)); } catch (e) { Store.log('error', 'save ilegível: ' + (e && e.message)); return null; } };

/* ---- API do jogo ---- */
let saveChain = Promise.resolve();
Store.saveGame = (slot, G) => {
  G.savedAt = Date.now();
  G.rngState = RNG.state;
  // (0.8.7) nunca grava um jogo sem as peças centrais: o save anterior fica como está
  if (typeof Schema !== 'undefined') { const r = Schema.check(G); if (r.fatal.length) { Store.log('error', 'save não gravado: ' + r.fatal.join('; ')); return Promise.resolve('invalid'); } }
  const str = JSON.stringify(G);
  const meta = Store.metaOf(G);
  // desktop: o processo principal compacta, confere e grava (desktop/storage.js)
  if (Store.native) return Store.native.saveSlot(slot, str, { ...meta, at: G.savedAt, version: G.version }).then(() => 'disk');
  // navegador: o armazenamento local tem limite (~5 MB); compactado cabe muito mais — se ainda assim não couber, avisa.
  // As gravações entram numa fila: a compactação é assíncrona e um save antigo nunca pode terminar por cima de um novo.
  const at = G.savedAt;
  const job = saveChain.catch(() => {}).then(async () => {
    const packed = await Store.pack(str);
    const okLocal = Store.lsSet('save:' + slot, packed);
    if (okLocal) Store.lsSet('meta:' + slot, JSON.stringify({ ...meta, at }));
    if (!Store.cloud()) return okLocal ? 'local' : 'full';
    try { await Store.cloudWrite('save_' + slot, packed, meta); return 'cloud'; } catch (e) { console.warn('save', e); return okLocal ? 'local' : 'full'; }
  });
  saveChain = job;
  return job;
};

Store.loadGame = async (slot) => {
  if (Store.native) {
    const r = await Store.native.loadSlot(slot);
    if (!r || !r.data) return null;
    if (r.recovered) setTimeout(() => toast(byLang(`O save principal estava danificado. Recuperamos a cópia de segurança de ${new Date(r.recoveredAt).toLocaleString('pt-BR')}.`, `The main save was damaged. We restored the backup from ${new Date(r.recoveredAt).toLocaleString('en-GB')}.`), 'bad'), 300);
    try { return JSON.parse(r.data); } catch (e) { return null; }
  }
  let g = null;
  if (Store.cloud()) { try { g = await Store.parse(await Store.cloudRead('save_' + slot)); } catch (e) { g = null; } }
  if (!g) g = await Store.parse(Store.lsGet('save:' + slot));
  return g;
};

Store.slotMeta = async (slot) => {
  if (Store.native) return Store.native.slotMeta(slot);
  let m = null;
  if (Store.cloud()) m = await Store.cloudMeta('save_' + slot);
  if (!m) { try { m = JSON.parse(Store.lsGet('meta:' + slot) || 'null'); } catch (e) { m = null; } }
  return m;
};

Store.deleteGame = async (slot) => {
  if (Store.native) return Store.native.deleteSlot(slot);
  Store.lsDel('save:' + slot); Store.lsDel('meta:' + slot);
  if (Store.cloud()) await Store.cloudDelete('save_' + slot).catch(() => {});
};

Store.saveBaseDb = async (db) => {
  const str = JSON.stringify(db);
  if (Store.native) return Store.native.saveBase(str);
  const packed = await Store.pack(str);
  Store.lsSet('basedb', packed);
  if (Store.cloud()) return Store.cloudWrite('basedb', packed, { name: db.name }).catch(() => {});
};
Store.loadBaseDb = async () => {
  if (Store.native) { const str = await Store.native.loadBase(); if (!str) return null; try { return JSON.parse(str); } catch (e) { return null; } }
  let db = null;
  if (Store.cloud()) { try { db = await Store.parse(await Store.cloudRead('basedb')); } catch (e) { db = null; } }
  if (!db) db = await Store.parse(Store.lsGet('basedb'));
  return db;
};

/* ---- arquivos ---- */
Store.exportFile = async (filename, obj) => {
  const data = JSON.stringify(obj, null, 1);
  if (Store.native) { const r = await Store.native.exportFile(filename, data); return r && r.ok ? { ok: true } : { ok: false, msg: r && r.canceled ? 'Exportação cancelada.' : 'Não foi possível gravar o arquivo.' }; }
  if (!Store.downloads) return { ok: false, msg: 'Download indisponível nesta visualização. Use "Copiar JSON".', data };
  try { await Store.downloads.save({ filename, data }); return { ok: true }; }
  catch (e) { return { ok: false, msg: e && e.code === 'declined' ? 'Download cancelado.' : 'Não foi possível baixar o arquivo aqui. Use "Copiar JSON".', data }; }
};

Store.readFile = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => { try { res(JSON.parse(r.result)); } catch (e) { rej(new Error('O arquivo não é um JSON válido.')); } };
  r.onerror = () => rej(new Error('Não foi possível ler o arquivo.'));
  r.readAsText(file);
});
