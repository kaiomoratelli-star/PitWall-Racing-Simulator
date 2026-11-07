/* ============================================================
   PIT WALL — licenças de circuito e circuitos reserva
   - Ponto de partida: a lista oficial de circuitos licenciados pela FIA
     (app/data/fia-circuits.js, atualizada em 04/11/2026), com grau e
     validade de cada licença.
   - A F1 só corre em circuito com licença de Grau 1 válida na data da
     corrida. Daqui em diante, renovações são SIMULADAS pelo jogo (quase
     sempre renovam; raramente não) e aparecem marcadas como simulação.
   - Circuito do calendário sem licença válida sai e dá lugar a um circuito
     reserva com Grau 1 (de preferência da mesma região).
   - Circuitos criados no editor/gerador passam por uma checagem básica
     do jogo; nunca recebem "homologação da FIA": no máximo uma licença
     simulada, depois de uma inspeção simulada.
   ============================================================ */
'use strict';

const Circuits = {};
Circuits.MAP = {
  shanghai: 'SHANGHAI INTERNATIONAL', suzuka: 'SUZUKA', miami: 'MIAMI', montreal: 'MONTREAL GILLES VILLENEUVE', monaco: 'MONACO', catalunya: 'CATALUNYA',
  spielberg: 'RED BULL RING - SPIELBERG', silverstone: 'SILVERSTONE GRAND PRIX', 'spa-francorchamps': 'SPA-FRANCORCHAMPS', hungaroring: 'HUNGARORING', zandvoort: 'ZANDVOORT',
  monza: 'MONZA', madring: 'MADRID IFEMA', baku: 'BAKU', sepang: 'SEPANG', 'marina-bay': 'SINGAPORE - MARINA BAY', austin: 'CIRCUIT OF THE AMERICAS',
  'mexico-city': 'AUTODROMO HERMANOS RODRIGUEZ', interlagos: 'INTERLAGOS', 'las-vegas': 'LAS VEGAS GRAND PRIX', 'yas-marina': 'ABU DHABI - YAS MARINA', bahrain: 'BAHRAIN',
  jeddah: 'JEDDAH CORNICHE CIRCUIT', imola: 'IMOLA', 'paul-ricard': 'PAUL RICARD', hockenheimring: 'HOCKENHEIM GRAND PRIX', nurburgring: 'NÜRBURGRING GRAND PRIX',
  portimao: 'ALGARVE', mugello: 'MUGELLO', 'magny-cours': 'MAGNY-COURS', estoril: 'ESTORIL', indianapolis: 'INDIANAPOLIS GRAND PRIX', 'buenos-aires': 'BUENOS AIRES',
};
/* fatos que explicam a ausência na lista (só o que é verificável) */
Circuits.NOTE = {
  jacarepagua: 'Autódromo demolido em 2012.',
  melbourne: 'Circuito de rua temporário: não consta na lista de 04/11/2026.',
  lusail: 'Não consta na lista de 04/11/2026.',
  istanbul: 'Na lista de 04/11/2026 só aparece um traçado curto (Grau 6R), não o traçado de Grande Prêmio.',
  kyalami: 'Não consta na lista de 04/11/2026.',
  'watkins-glen': 'Não consta na lista de 04/11/2026.',
};
Circuits.REGION = {
  AUS: 'oc', NZL: 'oc', CHN: 'as', JPN: 'as', SGP: 'as', MAS: 'as', KOR: 'as', THA: 'as', IND: 'as', AZE: 'me', BRN: 'me', KSA: 'me', QAT: 'me', UAE: 'me', TUR: 'eu',
  USA: 'am', CAN: 'am', MEX: 'am', BRA: 'am', ARG: 'am', RSA: 'af',
};
Circuits.region = (c) => Circuits.REGION[c] || 'eu';
Circuits.fia = (id) => {
  if (typeof FIA_CIRCUITS === 'undefined') return null;
  const n = Circuits.MAP[id];
  return n ? FIA_CIRCUITS.list.find(r => r.name === n) || null : null;
};
Circuits.listDate = () => (typeof FIA_CIRCUITS !== 'undefined' ? FIA_CIRCUITS.meta.updated : null);

Circuits.state = (G) => (G.circ = G.circ || { lic: {} });
/* licença atual: src 'fia' (lista oficial), 'sim' (renovada ou concedida no jogo), 'none' */
Circuits.lic = (G, id) => {
  const S = Circuits.state(G);
  if (S.lic[id]) return S.lic[id];
  const f = Circuits.fia(id);
  if (f) return { grade: f.grade, expiry: f.expiry, src: 'fia', width: f.width };
  const t = Career.track(G, id);
  return { grade: null, expiry: null, src: 'none', generated: !!(t && t.generated), note: Circuits.NOTE[id] || null };
};
Circuits.validOn = (G, id, date) => { const L = Circuits.lic(G, id); return L.grade === '1' && !!L.expiry && L.expiry >= date; };

/* data aproximada da corrida de um circuito num ano (mês/dia do calendário real) */
Circuits.dateFor = (G, id, year) => {
  const t = Career.track(G, id);
  return t && t.date && /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? `${year}-${t.date.slice(5)}` : `${year}-12-31`;
};

/* checagem básica do jogo (inspirada nas diretrizes da FIA para circuitos novos; não é homologação) */
Circuits.check = (t) => {
  const km = +t.length || 0, laps = +t.laps || 0;
  return [
    { ok: km >= 3.5 && km <= 7, txt: byLang(`Extensão entre 3,5 e 7 km (${km.toFixed(3)} km)`, `Length between 3.5 and 7 km (${km.toFixed(3)} km)`) },
    { ok: km * laps >= 260, txt: byLang(`Distância de corrida de pelo menos 260 km (${Math.round(km * laps)} km)`, `Race distance of at least 260 km (${Math.round(km * laps)} km)`) },
    { ok: (t.turns || 0) >= 8, txt: byLang(`Pelo menos 8 curvas (${t.turns || 0})`, `At least 8 corners (${t.turns || 0})`) },
    { ok: (t.drs || 0) >= 1, txt: byLang('Pelo menos uma reta com zona de ultrapassagem', 'At least one straight with an overtaking zone') },
    { ok: (t.pitLoss || 0) >= 14 && (t.pitLoss || 0) <= 32, txt: byLang(`Pit lane com perda plausível (${(+t.pitLoss || 0).toFixed(1)} s)`, `Plausible pit lane loss (${(+t.pitLoss || 0).toFixed(1)} s)`) },
  ];
};
Circuits.passes = (t) => Circuits.check(t).every(c => c.ok);

/* antes de cada temporada: renova licenças vencidas (simulação) e troca circuitos sem licença */
Circuits.prepare = (G, year, first) => {
  const S = Circuits.state(G);
  const cal = G.db.calendar && G.db.calendar.length ? G.db.calendar : null;
  const inCal = new Set(cal || []);
  const out = [];
  G.db.tracks.forEach(t => {
    const date = Circuits.dateFor(G, t.id, year);
    if (Circuits.validOn(G, t.id, date)) return;
    const L = Circuits.lic(G, t.id);
    if (t.generated && !Circuits.passes(t)) return;          // não passa na checagem: não pode receber licença
    if (!t.generated && L.src === 'none' && !inCal.has(t.id)) return;  // fora da lista e fora do calendário: segue sem licença
    const r = localRng(`lic:${G.seed}:${t.id}:${year}`)();
    // renovar Grau 1 é rotina; subir de grau (ou licenciar um circuito novo) exige obras e inspeção
    const upgrade = L.grade !== '1';
    const works = !!L.grade && L.grade !== '1';   // circuito licenciado em grau menor: precisa de obras
    // primeira temporada da carreira: o calendário real é mantido (renovações dadas como certas)
    const chance = first && inCal.has(t.id) ? 1 : t.generated ? 0.9 : upgrade ? (inCal.has(t.id) ? 0.75 : 0) : inCal.has(t.id) ? 0.97 : 0.85;
    if (r < chance) {
      S.lic[t.id] = { grade: '1', expiry: `${year + 2 + Math.floor(r * 3)}-12-31`, src: 'sim', since: year, upgrade: works || undefined };
      out.push({ id: t.id, ok: true });
    } else {
      S.lic[t.id] = { ...L, grade: L.grade === '1' ? '1' : L.grade, src: L.src === 'fia' ? 'fia' : L.src, lapsed: year };
      out.push({ id: t.id, ok: false });
    }
  });
  // calendário: sai quem não tem Grau 1 válido na data; entra um reserva
  if (cal) {
    cal.forEach((id, i) => {
      const date = Circuits.dateFor(G, id, year);
      if (Circuits.validOn(G, id, date)) return;
      const t = Career.track(G, id);
      const res = Circuits.reserves(G, year, t ? t.country : null).find(x => !cal.includes(x.id));
      if (!res) return;
      cal[i] = res.id;
      const nm = t ? t.gp : id;
      Career.news(G, `${nm} fica fora do calendário de ${year}; ${res.t.gp} entra no lugar`, 'regulamento', `Sem licença de Grau 1 válida para a data da corrida (renovação simulada pelo jogo). ${res.t.circuit} tem a licença necessária.`);
      Career.record(G, 'calendario', `${year}: ${nm} substituído por ${res.t.gp} (licença de Grau 1 não renovada a tempo — simulação).`, {});
    });
  }
  return out;
};
/* circuitos reserva: Grau 1 válido no ano, fora do calendário; mesma região primeiro */
Circuits.reserves = (G, year, country) => {
  const cal = new Set(G.db.calendar || []);
  const reg = country ? Circuits.region(country) : null;
  return G.db.tracks.filter(t => !cal.has(t.id) && Circuits.validOn(G, t.id, Circuits.dateFor(G, t.id, year)))
    .map(t => ({ id: t.id, t, s: (reg && Circuits.region(t.country) === reg ? 10 : 0) + (localRng(`res:${G.seed}:${t.id}:${year}`)() * 4) }))
    .sort((a, b) => b.s - a.s);
};

(function () {
  const ss = Career.startSeason;
  Career.startSeason = (G, first) => {
    const year = G.season ? G.season.year + 1 : G.db.rules.startYear;
    if (G.db && G.db.tracks) Circuits.prepare(G, year, !G.season);
    return ss(G, first);
  };
})();
