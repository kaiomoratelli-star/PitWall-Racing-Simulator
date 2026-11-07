/* ============================================================
   PIT WALL — serviço central de assets (bandeiras, fotos, logos)
   Toda tela resolve imagens por aqui: natTag (bandeira), headshot,
   teamLogo e carImg (via imgUrl). O registro gerado por
   scripts/make-asset-registry.js guarda origem, licença, data e
   fallback de cada arquivo. Bandeiras: SVG locais (flag-icons, MIT),
   iguais em todas as telas e no Windows, que não desenha emojis de bandeira.
   ============================================================ */
'use strict';

const Assets = {};
Assets.FLAG = {"ARE":"ae","UAE":"ae","ARG":"ar","AUS":"au","AUT":"at","AZE":"az","BEL":"be","BRA":"br","BRB":"bb","BUL":"bg","BGR":"bg","CAN":"ca","CHE":"ch","SUI":"ch","CHI":"cl","CHL":"cl","CHN":"cn","COL":"co","CRI":"cr","CZE":"cz","DEN":"dk","DNK":"dk","DEU":"de","GER":"de","ESP":"es","EST":"ee","FIN":"fi","FRA":"fr","GBR":"gb","GEO":"ge","GRE":"gr","GRC":"gr","HKG":"hk","HUN":"hu","INA":"id","IDN":"id","IND":"in","IRL":"ie","ITA":"it","JPN":"jp","KAZ":"kz","KGZ":"kg","KOR":"kr","KSA":"sa","SAU":"sa","KUW":"kw","KWT":"kw","LAT":"lv","LVA":"lv","LKA":"lk","MEX":"mx","MLT":"mt","MON":"mc","MCO":"mc","NED":"nl","NLD":"nl","NOR":"no","NZL":"nz","PAR":"py","PRY":"py","POL":"pl","POR":"pt","PRT":"pt","QAT":"qa","ROU":"ro","RSA":"za","ZAF":"za","RUS":"ru","SGP":"sg","SMR":"sm","SRB":"rs","SWE":"se","THA":"th","TUR":"tr","UKR":"ua","URU":"uy","URY":"uy","USA":"us","BRN":"bh","BHR":"bh","MAS":"my","MYS":"my","ISR":"il","LIE":"li","LUX":"lu","MAR":"ma","PER":"pe","PHI":"ph","PHL":"ph","SVK":"sk","SLO":"si","SVN":"si","CRO":"hr","HRV":"hr","LTU":"lt","TPE":"tw","TWN":"tw","VIE":"vn","VNM":"vn","OMA":"om","OMN":"om","LBN":"lb","EGY":"eg","KEN":"ke","ZIM":"zw","ZWE":"zw","VEN":"ve","ECU":"ec","BOL":"bo","CUB":"cu","DOM":"do","PUR":"pr","JAM":"jm","ISL":"is","CYP":"cy","AND":"ad","ARM":"am","BLR":"by","MDA":"md","MKD":"mk","BIH":"ba","MNE":"me","ALB":"al","KOS":"xk","UZB":"uz","PAK":"pk","BAN":"bd","NEP":"np","MGL":"mn","MNG":"mn","NGR":"ng","GHA":"gh","ANG":"ao","MOZ":"mz","NAM":"na","BOT":"bw","TUN":"tn","ALG":"dz","JOR":"jo","IRQ":"iq","IRN":"ir","SYR":"sy","KHM":"kh","LAO":"la","MAC":"mo","PNG":"pg","FIJ":"fj","GUA":"gt","HON":"hn","NCA":"ni","PAN":"pa","ESA":"sv","TTO":"tt","BAH":"bs","BER":"bm","CAY":"ky","EUR":"eu","RHO":"zw","FRG":"de","GDR":"de","URS":"ru","TCH":"cz","YUG":"rs"};
Assets.flagUrl = (code) => (typeof HAS_IMG !== 'undefined' && HAS_IMG && Assets.FLAG[code] ? `assets/flags/${Assets.FLAG[code]}.svg` : null);
Assets.flag = (code, cls = '') => { const u = Assets.flagUrl(code); return u ? `<img class="ctry ${cls}" src="${u}" alt="" loading="lazy" onerror="this.remove()">` : ''; };
Assets._idx = null;
Assets.info = (p) => {
  if (typeof ASSET_REGISTRY === 'undefined' || !p) return null;
  if (!Assets._idx) { Assets._idx = {}; ASSET_REGISTRY.forEach(a => (Assets._idx[a.path] = a)); }
  return Assets._idx[p.startsWith('assets/') ? p : 'assets/img/' + p] || null;
};
/* resumo de licenças (tela Diagnóstico) */
Assets.licenseSummary = () => {
  const out = {};
  (typeof ASSET_REGISTRY !== 'undefined' ? ASSET_REGISTRY : []).forEach(a => (out[a.license] = (out[a.license] || 0) + 1));
  return out;
};

/* retrato centralizado: faces/<id do jogo>.webp (fotos oficiais) ou faces/<uid>.webp (base de pilotos) */
Assets.slug = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
Assets.has = (rel) => { if (typeof ASSET_REGISTRY === 'undefined') return false; Assets.info('x'); return !!Assets._idx['assets/img/' + rel]; };
Assets.face = (d) => {
  if (!d) return null;
  const a = d.img ? `faces/${String(d.img).replace(/^drivers\//, '').replace(/\.webp$/, '')}.webp` : null;
  if (a && Assets.has(a)) return imgUrl(a);
  if (d.uid && Assets.has(`faces/${d.uid}.webp`)) return imgUrl(`faces/${d.uid}.webp`);
  return null;
};
/* logo por nome (equipes das categorias, fabricantes, patrocinadores, entidades) */
Assets.logoByName = (kind, name) => { const rel = `logos/${kind}/${Assets.slug(String(name || '').split(' (')[0])}.png`; return Assets.has(rel) ? imgUrl(rel) : null; };

/* logo de uma competição pelo id (categorias simuladas e séries da base) */
Assets.compLogo = (id, cls = '') => { const u = Assets.has(`logos/categories/${id}.png`) ? imgUrl(`logos/categories/${id}.png`) : null; return u ? `<img class="complogo ${cls}" src="${u}" alt="" loading="lazy" onerror="this.remove()">` : ''; };
