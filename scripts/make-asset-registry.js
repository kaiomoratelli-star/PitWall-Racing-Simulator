// Gera app/data/asset-registry.js: um registro por imagem do jogo, com tipo, entidade,
// caminho, origem, licença, data e fallback. A interface consulta este registro
// (Assets.info) e a tela Diagnóstico mostra o que ainda precisa de licença antes da venda.
// uso: node scripts/make-asset-registry.js
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'app', 'assets');
const ORIGIN = {
  drivers: ['formula1.com (Formula One Management)', 'direitos reservados: licenciar ou substituir antes da venda'],
  teams: ['formula1.com (Formula One Management)', 'marca registrada da equipe: licenciar antes da venda'],
  cars: ['formula1.com (Formula One Management)', 'direitos reservados: licenciar ou substituir antes da venda'],
  tracks: ['formula1.com (Formula One Management)', 'direitos reservados: licenciar ou substituir antes da venda'],
  cats: ['sites oficiais das categorias', 'marca registrada: licenciar antes da venda'],
  brand: ['Moratelli Game Company', 'próprio'],
  flags: ['flag-icons 7.2.3 (github.com/lipis/flag-icons)', 'MIT'],
  faces: ['ver sources.json', 'uso em projeto de fã; licenciar ou substituir antes de qualquer venda'],
  logos: ['Wikipedia/Wikimedia', 'marca registrada do titular: licenciar antes de qualquer venda'],
  news: ['Wikimedia Commons', 'ver sources.json (licenças livres com atribuição)'],
};
const TYPE = { faces: 'driver-face', logos: 'logo', drivers: 'driver-photo', teams: 'team-logo', cars: 'car', tracks: 'circuit', cats: 'category-logo', brand: 'brand', flags: 'flag', news: 'news-photo' };
const FALLBACK = { 'driver-photo': 'iniciais na cor da equipe', 'team-logo': 'sigla da equipe', car: 'sem imagem', circuit: 'traçado desenhado pelo jogo', 'category-logo': 'nome da categoria', brand: 'texto', flag: 'código do país' };
const out = [];
const SOURCES = fs.existsSync(path.join(root, 'img', 'sources.json')) ? JSON.parse(fs.readFileSync(path.join(root, 'img', 'sources.json'), 'utf8')) : {};
const walk = (dir, rel) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f), r = rel ? `${rel}/${f}` : f;
    if (fs.statSync(p).isDirectory()) walk(p, r);
    else if (/\.(webp|png|jpe?g|svg)$/i.test(f)) {
      const group = r.split('/')[0] === 'img' ? r.split('/')[1] : r.split('/')[0];
      const type = TYPE[group] || 'other';
      const [origin, license] = ORIGIN[group] || ['desconhecida', 'verificar'];
      const st = fs.statSync(p);
      const entity = f.replace(/\.(webp|png|jpe?g|svg)$/i, '').replace(/-(logo|hero|map)$/, '');
      const sk = r.replace(/^img\//, ''); const src = SOURCES[sk];
      out.push({ origin: src ? src.origin : origin, page: src ? src.page : undefined, id: `${type}:${entity}${/-(hero|map)\./.test(f) ? ':' + f.match(/-(hero|map)\./)[1] : ''}`, type, entity, path: `assets/${r}`, license: src && src.license ? src.license : license, format: f.split('.').pop().toLowerCase(), bytes: st.size, updated: st.mtime.toISOString().slice(0, 10), fallback: FALLBACK[type] || 'nenhum' });
    }
  }
};
walk(root, '');
const body = `/* gerado por scripts/make-asset-registry.js — não editar à mão */\nconst ASSET_REGISTRY = ${JSON.stringify(out)};\n`;
fs.writeFileSync(path.join(__dirname, '..', 'app', 'data', 'asset-registry.js'), body);
const byLic = {}; out.forEach(a => (byLic[a.license] = (byLic[a.license] || 0) + 1));
console.log(`${out.length} assets registrados`, byLic);
