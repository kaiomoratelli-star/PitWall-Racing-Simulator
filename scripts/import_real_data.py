#!/usr/bin/env python3
"""
Importa dados reais para o PitWall (ferramenta de desenvolvimento; a saída fica versionada).

Fontes:
  - f1db (https://github.com/f1db/f1db, CC BY 4.0): pilotos, equipes, motores, circuitos,
    corridas e classificações de 1950 até a última corrida disputada.
  - formula1.com / media.formula1.com: fotos dos pilotos, carros, logos, traçados e fotos dos GPs 2026.
  - bacinger/f1-circuits (MIT): geometria real dos traçados para o mapa ao vivo.

Saída:
  app/data/real-db.js       base "F1 2026" (equipes, pilotos, motores, pistas, calendário, regras)
  app/data/history.js       histórico real 1950-2026 (temporadas, corridas, totais de carreira)
  app/assets/img/...        imagens
Uso: python3 scripts/import_real_data.py [--no-images]
"""
import zlib, json, os, re, sys, math, unicodedata, urllib.request, zipfile, io, datetime, time

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT_DATA = os.path.join(ROOT, 'app', 'data')
OUT_IMG = os.path.join(ROOT, 'app', 'assets', 'img')
CACHE = '/tmp/pitwall-import'
os.makedirs(OUT_DATA, exist_ok=True); os.makedirs(CACHE, exist_ok=True)
NO_IMG = '--no-images' in sys.argv
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'}

def get(url, binary=False, cache=True):
    fn = os.path.join(CACHE, re.sub(r'[^a-zA-Z0-9.]+', '_', url)[-180:])
    if cache and os.path.exists(fn):
        data = open(fn, 'rb').read()
    else:
        for attempt in range(3):
            try:
                data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read(); break
            except Exception as e:
                if attempt == 2: raise
                time.sleep(2)
        open(fn, 'wb').write(data)
    return data if binary else data.decode('utf-8', 'replace')

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z]', '', s)

# ---------------- f1db ----------------
zf = zipfile.ZipFile(io.BytesIO(get('https://github.com/f1db/f1db/releases/latest/download/f1db-json-single.zip', True)))
F = json.loads(zf.read('f1db.json'))
COUNTRY = {c['id']: c for c in F['countries']}
def nat(cid):
    c = COUNTRY.get(cid) or {}
    return c.get('iocCode') or c.get('alpha3Code') or 'UNK'
DRV = {d['id']: d for d in F['drivers']}
CON = {c['id']: c for c in F['constructors']}
CIR = {c['id']: c for c in F['circuits']}
GP = {g['id']: g for g in F['grandsPrix']}
RACES = sorted(F['races'], key=lambda r: (r['year'], r['round']))
SEASONS = {s['year']: s for s in F['seasons']}
LAST_YEAR = max(r['year'] for r in RACES if r.get('raceResults'))
done = [r for r in RACES if r['year'] == LAST_YEAR and r.get('raceResults')]
REF_RACE = done[-1]
REF_DATE = REF_RACE['date']
print(f'f1db: {len(DRV)} pilotos, {len(CON)} equipes, {len(RACES)} corridas; última com resultado: {REF_RACE["year"]} etapa {REF_RACE["round"]} ({REF_DATE})')

NAT_PT = {'BRA': 'Brasil', 'GBR': 'Reino Unido', 'ITA': 'Itália', 'GER': 'Alemanha', 'FRA': 'França', 'ESP': 'Espanha', 'NED': 'Países Baixos', 'JPN': 'Japão', 'USA': 'Estados Unidos', 'AUS': 'Austrália', 'MEX': 'México', 'ARG': 'Argentina', 'FIN': 'Finlândia', 'CHN': 'China', 'CAN': 'Canadá', 'POR': 'Portugal', 'IND': 'Índia', 'SWE': 'Suécia', 'BEL': 'Bélgica', 'DEN': 'Dinamarca', 'MON': 'Mônaco', 'SUI': 'Suíça', 'AUT': 'Áustria', 'IRL': 'Irlanda', 'NOR': 'Noruega', 'NZL': 'Nova Zelândia', 'THA': 'Tailândia', 'BRN': 'Bahrein', 'KSA': 'Arábia Saudita', 'HUN': 'Hungria', 'AZE': 'Azerbaijão', 'SGP': 'Singapura', 'QAT': 'Catar', 'UAE': 'Emirados Árabes Unidos', 'RSA': 'África do Sul', 'MAS': 'Malásia', 'RUS': 'Rússia', 'TUR': 'Turquia', 'POL': 'Polônia', 'COL': 'Colômbia', 'VEN': 'Venezuela', 'CHI': 'Chile', 'URU': 'Uruguai', 'EST': 'Estônia', 'ISR': 'Israel', 'LIE': 'Liechtenstein', 'RHO': 'Rodésia', 'MAR': 'Marrocos', 'CZE': 'Tchéquia', 'KOR': 'Coreia do Sul', 'IDN': 'Indonésia', 'INA': 'Indonésia'}

# ---------------- histórico real ----------------
def main_team(year, did):
    cnt = {}
    for r in RACES:
        if r['year'] != year: continue
        for x in r.get('raceResults') or []:
            if x['driverId'] == did: cnt[x['constructorId']] = cnt.get(x['constructorId'], 0) + 1
    return max(cnt, key=cnt.get) if cnt else None

race_team = {}  # (year, driver) -> constructor (mais corridas)
for r in RACES:
    for x in r.get('raceResults') or []:
        k = (r['year'], x['driverId']); race_team.setdefault(k, {}); race_team[k][x['constructorId']] = race_team[k].get(x['constructorId'], 0) + 1
def team_of(y, d):
    m = race_team.get((y, d)); return max(m, key=m.get) if m else None

hist = {'source': 'f1db (github.com/f1db/f1db), licença CC BY 4.0', 'ref': REF_DATE, 'lastYear': LAST_YEAR, 'drivers': {}, 'constructors': {}, 'circuits': {}, 'seasons': []}
for d in F['drivers']:
    if not d.get('totalRaceEntries'): continue
    hist['drivers'][d['id']] = [d['name'], nat(d['nationalityCountryId']), d.get('dateOfBirth'), d.get('totalRaceStarts') or 0, d.get('totalRaceWins') or 0, d.get('totalPodiums') or 0, d.get('totalPolePositions') or 0, d.get('totalFastestLaps') or 0, d.get('totalPoints') or 0, d.get('totalChampionshipWins') or 0, d.get('bestChampionshipPosition'), d.get('dateOfDeath')]
for c in F['constructors']:
    if not c.get('totalRaceEntries'): continue
    hist['constructors'][c['id']] = [c['name'], nat(c['countryId']), c.get('totalRaceStarts') or 0, c.get('totalRaceWins') or 0, c.get('totalPodiums') or 0, c.get('totalPolePositions') or 0, c.get('totalChampionshipWins') or 0, c.get('totalPoints') or 0]
for c in F['circuits']:
    hist['circuits'][c['id']] = [c['fullName'], c['placeName'], nat(c['countryId']), c['length'], c['turns'], c['totalRacesHeld'], c['type']]
for y in sorted(SEASONS):
    s = SEASONS[y]
    ds = sorted(s.get('driverStandings') or [], key=lambda x: x['positionDisplayOrder'])
    cs = sorted(s.get('constructorStandings') or [], key=lambda x: x['positionDisplayOrder'])
    races = []
    for r in RACES:
        if r['year'] != y: continue
        res = r.get('raceResults') or []
        pod = [x for x in res if x.get('positionNumber') in (1, 2, 3)]
        pod.sort(key=lambda x: x['positionNumber'])
        pole = next((x['driverId'] for x in (r.get('qualifyingResults') or []) if x.get('positionNumber') == 1), None) or next((x['driverId'] for x in res if x.get('polePosition')), None)
        fl = next((x['driverId'] for x in (r.get('fastestLaps') or []) if x.get('positionNumber') == 1), None)
        g = GP.get(r['grandPrixId'], {})
        races.append([r['round'], r['date'], g.get('fullName', r['grandPrixId']), r['circuitId'], [x['driverId'] for x in pod], [x['constructorId'] for x in pod], pole, fl, len(res), sum(1 for x in res if x.get('positionNumber') is None)])
    hist['seasons'].append({
        'y': y, 'complete': not any(r['year'] == y and not r.get('raceResults') for r in RACES),
        'd': [[x['driverId'], team_of(y, x['driverId']), x['points'], x['positionNumber']] for x in ds],
        'c': [[x['constructorId'], x['points'], x['positionNumber']] for x in cs],
        'r': races,
    })
js = 'const REAL_HISTORY = ' + json.dumps(hist, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(OUT_DATA, 'history.js'), 'w').write('/* Histórico real da F1 — gerado por scripts/import_real_data.py. Não editar à mão. */\n' + js)
print(f'history.js: {len(js)/1024:.0f} KB, {len(hist["seasons"])} temporadas')

# ---------------- base 2026 ----------------
YEAR = LAST_YEAR
S = SEASONS[YEAR]
cur_races = [r for r in RACES if r['year'] == YEAR]
last = REF_RACE
# titulares: pilotos com mais largadas nas 4 últimas corridas disputadas (ignora substitutos de uma corrida)
lineups = {}
cnt = {}
for rc in done[-4:]:
    for x in rc['raceResults']:
        cnt.setdefault(x['constructorId'], {}); cnt[x['constructorId']][x['driverId']] = cnt[x['constructorId']].get(x['driverId'], 0) + 1 + (0.1 if rc is last else 0)
for cid, m in cnt.items():
    lineups[cid] = sorted(m, key=lambda k: -m[k])[:2]

TEAM_META = {  # cores das pinturas 2026, pasta das imagens no site oficial, chefe de equipe, base
    'mercedes': ('#00D7B6', '#0B0B0B', 'mercedes', 'Toto Wolff', 'GBR'),
    'ferrari': ('#ED1131', '#FFD700', 'ferrari', 'Frédéric Vasseur', 'ITA'),
    'red-bull': ('#4781D7', '#FFD12E', 'redbullracing', 'Laurent Mekies', 'GBR'),
    'mclaren': ('#F47600', '#111111', 'mclaren', 'Andrea Stella', 'GBR'),
    'racing-bulls': ('#6C98FF', '#FFFFFF', 'racingbulls', 'Alan Permane', 'ITA'),
    'alpine': ('#00A1E8', '#F282B4', 'alpine', 'Flavio Briatore', 'FRA'),
    'haas': ('#9C9FA2', '#E6002B', 'haasf1team', 'Ayao Komatsu', 'USA'),
    'audi': ('#E00400', '#BFC4C9', 'audi', 'Jonathan Wheatley', 'GER'),
    'williams': ('#1868DB', '#00A3E0', 'williams', 'James Vowles', 'GBR'),
    'aston-martin': ('#229971', '#CEDC00', 'astonmartin', 'Adrian Newey', 'GBR'),
    'cadillac': ('#AAAAAD', '#141414', 'cadillac', 'Graeme Lowdon', 'USA'),
}
ENGINE_NAMES = {'mercedes': 'Mercedes', 'ferrari': 'Ferrari', 'honda': 'Honda', 'red-bull-ford': 'Red Bull Ford', 'audi': 'Audi'}
SPONSORS = {  # parceiros principais conhecidos publicamente (referência 2026)
    'mclaren': ['Mastercard', 'OKX', 'Google', 'DP World', 'Dell Technologies'],
    'ferrari': ['HP', 'Shell', 'Santander', 'UniCredit', 'IBM'],
    'red-bull': ['Oracle', 'Ford', 'Mobil 1', 'Bybit'],
    'mercedes': ['Petronas', 'Microsoft', 'TeamViewer', 'Qualcomm'],
    'aston-martin': ['Aramco', 'Cognizant', 'Valvoline', 'Coca-Cola'],
    'alpine': ['BWT', 'Castore', 'Kick'],
    'williams': ['Atlassian', 'Santander', 'Duracell', 'Gulf'],
    'racing-bulls': ['Visa', 'Cash App', 'Hugo Boss'],
    'audi': ['Revolut', 'adidas', 'bp'],
    'haas': ['Toyota Gazoo Racing', 'Hantec Markets'],
    'cadillac': ['TWG', 'Tommy Hilfiger'],
}
BUDGET = {'ferrari': 260, 'mercedes': 255, 'red-bull': 255, 'mclaren': 255, 'aston-martin': 235, 'audi': 230, 'cadillac': 215, 'alpine': 205, 'williams': 200, 'racing-bulls': 195, 'haas': 185}

cs = {x['constructorId']: x for x in S['constructorStandings']}
maxpts = max(x['points'] for x in S['constructorStandings']) or 1
eng_of = {x['constructorId']: x['engineManufacturerId'] for x in S['constructorStandings']}
# força do motor: média dos pontos das equipes clientes
eng_pts = {}
for cid, x in cs.items(): eng_pts.setdefault(x['engineManufacturerId'], []).append(x['points'])
engines = []
for e, pts in eng_pts.items():
    power = round(86 + 7 * math.sqrt(max(pts) / maxpts), 1)
    engines.append({'id': e, 'name': ENGINE_NAMES.get(e, e.title()), 'power': power, 'reliability': round(85 + 5 * math.sqrt(sum(pts) / len(pts) / maxpts), 1), 'cost': 18 if e in ('mercedes', 'ferrari') else 16, 'real': True})
eng_power = {e['id']: e['power'] for e in engines}

teams = []
for cid in [x['constructorId'] for x in sorted(S['constructorStandings'], key=lambda x: x['positionDisplayOrder'])]:
    c = CON[cid]; meta = TEAM_META.get(cid, ('#888888', '#222222', cid, '—', 'GBR'))
    entrant = next((e['entrantId'] for e in S['entrants'] for k in e['constructors'] if k['constructorId'] == cid), cid)
    ename = next((ent['name'] for ent in F['entrants'] if ent['id'] == entrant), c['name'])
    pts = cs[cid]['points']
    target = 82 + 10 * math.sqrt(pts / maxpts)
    base = (target - 0.30 * eng_power[eng_of[cid]]) / 0.70
    rnk = cs[cid]['positionNumber']
    teams.append({
        'id': cid, 'name': c['name'], 'fullName': ename, 'short': (c['name'][:3]).upper().replace(' ', ''), 'country': meta[4],
        'color': meta[0], 'color2': meta[1], 'engine': eng_of[cid], 'budget': BUDGET.get(cid, 200),
        'reputation': round(min(99, 55 + 25 * math.sqrt(pts / maxpts) + min(15, (c.get('totalChampionshipWins') or 0) * 1.2))),
        'car': {'aero': round(base + 0.5, 2), 'chassis': round(base - 0.5, 2), 'reliability': round(84 + 8 * math.sqrt(pts / maxpts), 1), 'tyreCare': round(80 + 8 * math.sqrt(pts / maxpts), 1)},
        'pitCrew': round(80 + 12 * math.sqrt(pts / maxpts)), 'facilities': round(70 + 25 * (BUDGET.get(cid, 200) - 180) / 80),
        'principal': meta[3], 'staff': {'technical': round(78 + 14 * math.sqrt(pts / maxpts)), 'aero': round(78 + 14 * math.sqrt(pts / maxpts)), 'strategy': round(80 + 10 * math.sqrt(pts / maxpts)), 'engineering': round(78 + 14 * math.sqrt(pts / maxpts))},
        'sponsors': SPONSORS.get(cid, []), 'img': meta[2], 'founded': None, 'realStats': {'starts': c.get('totalRaceStarts'), 'wins': c.get('totalRaceWins'), 'titles': c.get('totalChampionshipWins'), 'podiums': c.get('totalPodiums'), 'poles': c.get('totalPolePositions')},
        'champ2026': rnk,
    })
shorts = {'red-bull': 'RBR', 'racing-bulls': 'RB', 'aston-martin': 'AMR', 'mclaren': 'MCL', 'mercedes': 'MER', 'ferrari': 'FER', 'williams': 'WIL', 'alpine': 'ALP', 'haas': 'HAA', 'audi': 'AUD', 'cadillac': 'CAD'}
for t in teams: t['short'] = shorts.get(t['id'], t['short'])

# ---- habilidade dos pilotos estimada a partir de resultados reais (últimas 3 temporadas) ----
def teammate_deltas(did):
    q, r, n = [], [], 0
    for rc in RACES:
        if rc['year'] < YEAR - 2 or not rc.get('raceResults'): continue
        w = 1.0 if rc['year'] == YEAR else 0.7 if rc['year'] == YEAR - 1 else 0.45
        me = next((x for x in rc['raceResults'] if x['driverId'] == did), None)
        if not me: continue
        n += 1
        mates = [x for x in rc['raceResults'] if x['constructorId'] == me['constructorId'] and x['driverId'] != did]
        for m in mates:
            if me.get('qualificationPositionNumber') and m.get('qualificationPositionNumber'):
                q.append((max(-8, min(8, m['qualificationPositionNumber'] - me['qualificationPositionNumber'])), w))
            if me.get('positionNumber') and m.get('positionNumber'):
                r.append((max(-8, min(8, m['positionNumber'] - me['positionNumber'])), w))
    wm = lambda a: sum(v * w for v, w in a) / sum(w for v, w in a) if a else 0
    return wm(q), wm(r), n

MAX_PPR = max(x['points'] for x in S['driverStandings']) / max(1, len(done))
team_rank = {}
for y in (YEAR - 1, YEAR):
    for x in SEASONS[y].get('constructorStandings') or []: team_rank[(y, x['constructorId'])] = x['positionNumber']
def abs_vs_car(did):
    vals = []
    for rc in RACES:
        if rc['year'] < YEAR - 1 or not rc.get('raceResults'): continue
        me = next((x for x in rc['raceResults'] if x['driverId'] == did), None)
        if not me or not me.get('positionNumber'): continue
        exp = team_rank.get((rc['year'], me['constructorId']), 6) * 2 - 0.5
        vals.append(max(-8, min(8, exp - me['positionNumber'])))
    return sum(vals) / len(vals) if vals else 0

def age_at(dob, year):
    b = datetime.date.fromisoformat(dob); return year - b.year - (1 if (b.month, b.day) > (1, 1) else 0)

def driver_entry(did, team, seat):
    d = DRV[did]
    q, r, n = teammate_deltas(did)
    titles = d.get('totalChampionshipWins') or 0; wins = d.get('totalRaceWins') or 0; poles = d.get('totalPolePositions') or 0; starts = d.get('totalRaceStarts') or 0
    prestige = min(7.5, titles * 1.1 + math.sqrt(wins) * 0.55 + math.sqrt(poles) * 0.25)
    # forma absoluta: pontos por corrida em {YEAR} e resultado contra o esperado para o carro
    sp = next((x for x in S['driverStandings'] if x['driverId'] == did), None)
    ppr = (sp['points'] / max(1, len(done))) if sp else 0
    form = 5.0 * ppr / MAX_PPR - 1.2 if sp else 0
    absd = abs_vs_car(did)
    if n == 0:  # sem corridas de F1 recentes: estreante vindo das categorias de base
        ovr = 76.5 + min(2, prestige)
    else:
        ovr = 81.5 + max(-4, min(4, q)) * 0.45 + max(-4, min(4, r)) * 0.35 + max(-6, min(6, absd)) * 0.3 + prestige * 0.45 + form * 1.6 + min(1.5, starts / 120)
    ovr = max(72, min(96, ovr))
    style = 'complete'
    if q - r > 1.2: style = 'qualifier'
    elif r - q > 1.2: style = 'tyre'
    if titles >= 3: style = 'complete'
    age = age_at(d['dateOfBirth'], YEAR + 1)
    pot = round(max(ovr, min(97, ovr + max(0, (25 - age)) * 1.4)))
    return {
        'id': did, 'name': d['name'], 'firstName': d['firstName'], 'lastName': d['lastName'], 'abbr': d.get('abbreviation'),
        'nat': nat(d['nationalityCountryId']), 'dob': d['dateOfBirth'], 'age': age, 'number': int(d['permanentNumber']) if d.get('permanentNumber') else 99,
        'style': style, 'team': team, 'seat': seat, 'ovr': round(ovr, 1), 'potential': pot,
        'career': {'starts': starts, 'wins': wins, 'podiums': d.get('totalPodiums') or 0, 'poles': poles, 'titles': titles, 'points': d.get('totalPoints') or 0, 'fl': d.get('totalFastestLaps') or 0},
        'evidence': {'qVsMate': round(q, 2), 'rVsMate': round(r, 2), 'races3y': n},
    }

drivers = []
used = set()
for t in teams:
    for i, did in enumerate(lineups.get(t['id'], [])[:2]):
        drivers.append(driver_entry(did, t['id'], i + 1)); used.add(did)
# reservas oficiais listados na temporada
for e in S['entrants']:
    for k in e['constructors']:
        for x in k.get('drivers', []):
            did = x['driverId']
            if did in used or did not in DRV: continue
            if any(dd['id'] == did for dd in drivers): continue
            if not DRV[did].get('dateOfBirth'): continue
            drivers.append(driver_entry(did, k['constructorId'], 'R')); used.add(did)
# fora do grid: pilotos que correram em 2024-2026 e não têm vaga
for rc in RACES:
    if rc['year'] < YEAR - 2: continue
    for x in rc.get('raceResults') or []:
        did = x['driverId']
        if did in used or not DRV[did].get('dateOfBirth'): continue
        last_y = max(r2['year'] for r2 in RACES if r2.get('raceResults') and any(z['driverId'] == did for z in r2['raceResults']))
        if age_at(DRV[did]['dateOfBirth'], YEAR + 1) >= 33 and last_y < YEAR - 1: continue  # aposentado de fato
        if age_at(DRV[did]['dateOfBirth'], YEAR + 1) > 42: continue
        drivers.append(driver_entry(did, None, None)); used.add(did)
# no máximo 1 reserva por equipe
seenR = set()
for d in drivers:
    if d['seat'] == 'R':
        if d['team'] in seenR: d['team'] = None; d['seat'] = None
        else: seenR.add(d['team'])
print(f'pilotos: {len(drivers)} ({sum(1 for d in drivers if d["seat"] in (1,2))} titulares)')

# ---- pistas e calendário ----
GAME_PARAMS = {  # aero, chassi, motor, ultrapassagem, estresse pneus, chuva, fator SC, perda pit, DRS, rua
    'bahrain': (.32, .33, .35, .70, 1.20, .03, .9, 22.5, 3, 0), 'jeddah': (.28, .27, .45, .55, .80, .02, 1.5, 20.5, 3, 1),
    'melbourne': (.34, .34, .32, .45, .85, .18, 1.3, 19.5, 4, 1), 'suzuka': (.44, .36, .20, .35, 1.25, .28, 1.0, 22.5, 1, 0),
    'shanghai': (.34, .32, .34, .65, 1.0, .22, 1.0, 23.0, 2, 0), 'miami': (.32, .34, .34, .50, .90, .20, 1.3, 20.0, 3, 1),
    'imola': (.40, .36, .24, .25, .95, .22, 1.1, 27.5, 1, 0), 'monaco': (.48, .40, .12, .05, .65, .15, 1.6, 19.5, 1, 1),
    'montreal': (.26, .32, .42, .60, .85, .28, 1.7, 18.5, 3, 1), 'catalunya': (.45, .35, .20, .40, 1.2, .08, .8, 21.5, 2, 0),
    'spielberg': (.28, .30, .42, .70, .95, .22, 1.0, 20.5, 3, 0), 'silverstone': (.46, .32, .22, .55, 1.3, .38, 1.0, 20.0, 2, 0),
    'hungaroring': (.44, .40, .16, .25, 1.05, .15, .9, 20.5, 1, 0), 'spa-francorchamps': (.30, .28, .42, .70, 1.0, .45, 1.2, 19.0, 2, 0),
    'zandvoort': (.46, .38, .16, .20, 1.05, .30, 1.1, 21.0, 2, 0), 'monza': (.18, .27, .55, .70, .80, .12, 1.0, 24.0, 2, 0),
    'baku': (.24, .30, .46, .65, .75, .05, 1.8, 20.5, 2, 1), 'marina-bay': (.46, .40, .14, .25, 1.0, .28, 2.0, 28.0, 3, 1),
    'austin': (.36, .34, .30, .60, 1.2, .15, 1.0, 20.5, 2, 0), 'mexico-city': (.30, .34, .36, .50, .85, .12, 1.1, 22.0, 3, 0),
    'interlagos': (.32, .34, .34, .65, 1.0, .42, 1.6, 20.5, 2, 0), 'las-vegas': (.20, .30, .50, .65, .70, .02, 1.4, 20.0, 2, 1),
    'lusail': (.44, .36, .20, .45, 1.45, .02, .9, 26.0, 1, 0), 'yas-marina': (.34, .34, .32, .50, .90, .02, .9, 21.5, 2, 0),
    'madring': (.36, .36, .28, .45, .95, .10, 1.4, 21.0, 2, 1), 'sepang': (.36, .32, .32, .65, 1.3, .55, 1.1, 21.0, 2, 0),
    'portimao': (.38, .34, .28, .45, 1.1, .10, 1.0, 21.0, 2, 0), 'istanbul': (.38, .34, .28, .55, 1.15, .15, 1.0, 21.0, 2, 0),
    'nurburgring': (.38, .34, .28, .50, 1.0, .35, 1.0, 21.0, 2, 0), 'hockenheimring': (.30, .32, .38, .60, 1.0, .25, 1.0, 20.0, 2, 0),
    'paul-ricard': (.34, .34, .32, .50, 1.0, .10, .9, 21.0, 2, 0), 'mugello': (.42, .38, .20, .35, 1.2, .15, 1.3, 21.0, 1, 0),
    'sochi': (.30, .34, .36, .50, .85, .10, 1.1, 22.0, 2, 0), 'magny-cours': (.36, .36, .28, .40, 1.0, .20, 1.0, 21.0, 2, 0),
    'estoril': (.38, .36, .26, .40, 1.05, .15, 1.0, 21.0, 2, 0), 'jacarepagua': (.34, .34, .32, .50, 1.1, .30, 1.0, 21.0, 2, 0),
    'indianapolis': (.24, .30, .46, .60, .85, .15, 1.0, 20.0, 2, 0), 'buenos-aires': (.36, .36, .28, .40, 1.0, .15, 1.0, 21.0, 2, 0),
    'kyalami': (.34, .34, .32, .50, 1.0, .10, 1.0, 21.0, 2, 0), 'watkins-glen': (.34, .34, .32, .50, 1.0, .20, 1.0, 21.0, 2, 0),
}
GEO_MAP = {'melbourne': 'au-1953', 'bahrain': 'bh-2002', 'shanghai': 'cn-2004', 'catalunya': 'es-1991', 'monaco': 'mc-1929', 'montreal': 'ca-1978', 'paul-ricard': 'fr-1969', 'spielberg': 'at-1969', 'silverstone': 'gb-1948', 'hockenheimring': 'de-1932', 'hungaroring': 'hu-1986', 'spa-francorchamps': 'be-1925', 'monza': 'it-1922', 'marina-bay': 'sg-2008', 'sochi': 'ru-2014', 'suzuka': 'jp-1962', 'austin': 'us-2012', 'mexico-city': 'mx-1962', 'interlagos': 'br-1940', 'yas-marina': 'ae-2009', 'imola': 'it-1953', 'nurburgring': 'de-1927', 'portimao': 'pt-2008', 'mugello': 'it-1914', 'sepang': 'my-1999', 'istanbul': 'tr-2005', 'zandvoort': 'nl-1948', 'magny-cours': 'fr-1960', 'estoril': 'pt-1972', 'jacarepagua': 'br-1977', 'jeddah': 'sa-2021', 'miami': 'us-2022', 'lusail': 'qa-2004', 'madring': 'es-2026', 'baku': 'az-2016', 'las-vegas': 'us-2023', 'indianapolis': 'us-1909', 'buenos-aires': 'ar-1952', 'kyalami': 'za-1961', 'watkins-glen': 'us-1956'}
geo = json.loads(get('https://raw.githubusercontent.com/bacinger/f1-circuits/master/f1-circuits.geojson'))
GEO = {f['properties']['id']: f for f in geo['features']}
def shape(cid):
    f = GEO.get(GEO_MAP.get(cid, ''))
    if not f: return None
    pts = f['geometry']['coordinates']
    lat0 = sum(p[1] for p in pts) / len(pts)
    xy = [(p[0] * math.cos(math.radians(lat0)), -p[1]) for p in pts]
    minx = min(p[0] for p in xy); miny = min(p[1] for p in xy); span = max(max(p[0] for p in xy) - minx, max(p[1] for p in xy) - miny)
    out = [[round((x - minx) / span, 4), round((y - miny) / span, 4)] for x, y in xy]
    if out[0] != out[-1]: out.append(out[0])
    return out

def best_lap(cid):
    for y in range(YEAR, YEAR - 4, -1):
        for rc in RACES:
            if rc['year'] == y and rc['circuitId'] == cid and rc.get('fastestLaps'):
                t = rc['fastestLaps'][0].get('timeMillis')
                if t: return round(t / 1000 * 1.012, 1), y
    return None, None

def track_entry(cid, gp_id=None, laps=None, date=None, sprint=False):
    c = CIR[cid]; p = GAME_PARAMS.get(cid, (.34, .33, .33, .5, 1.0, .15, 1.0, 21.0, 2, 1 if c['type'] == 'STREET' else 0))
    bl, bly = best_lap(cid)
    length = c['length']
    if not bl: bl = round(length / 205 * 3600, 1)
    if not laps: laps = math.ceil(305 / length)
    g = GP.get(gp_id) if gp_id else None
    return {
        'id': cid, 'gp': ('GP ' + PT_GP.get(gp_id, g['name'])) if g else c['name'], 'gpId': gp_id, 'circuit': c['fullName'], 'place': c['placeName'],
        'country': nat(c['countryId']), 'laps': laps, 'length': length, 'turns': c['turns'], 'baseLap': bl, 'baseLapRef': bly,
        'weights': {'aero': p[0], 'chassis': p[1], 'engine': p[2]}, 'overtaking': p[3], 'tyreStress': p[4], 'rain': p[5], 'scFactor': p[6], 'pitLoss': p[7], 'drs': p[8], 'street': bool(p[9]) or c['type'] == 'STREET',
        'type': c['type'], 'direction': c['direction'], 'lat': c['latitude'], 'lon': c['longitude'], 'racesHeld': c['totalRacesHeld'],
        'shape': shape(cid), 'shapeSeed': zlib.crc32(cid.encode()) % 100000, 'sprint': sprint, 'date': date, 'real': True,
    }
PT_GP = {'australia': 'da Austrália', 'china': 'da China', 'japan': 'do Japão', 'miami': 'de Miami', 'canada': 'do Canadá', 'monaco': 'de Mônaco', 'barcelona-catalunya': 'de Barcelona-Catalunha', 'austria': 'da Áustria', 'great-britain': 'da Grã-Bretanha', 'belgium': 'da Bélgica', 'hungary': 'da Hungria', 'netherlands': 'dos Países Baixos', 'italy': 'da Itália', 'spain': 'da Espanha', 'azerbaijan': 'do Azerbaijão', 'bahrain': 'do Bahrein', 'singapore': 'de Singapura', 'united-states': 'dos Estados Unidos', 'mexico': 'da Cidade do México', 'sao-paulo': 'de São Paulo', 'las-vegas': 'de Las Vegas', 'qatar': 'do Catar', 'abu-dhabi': 'de Abu Dhabi', 'saudi-arabia': 'da Arábia Saudita', 'emilia-romagna': 'da Emília-Romanha', 'brazil': 'do Brasil'}

tracks, calendar, seen = [], [], set()
for rc in cur_races:
    cid = rc['circuitId']
    if cid in seen: continue
    seen.add(cid)
    tracks.append(track_entry(cid, rc['grandPrixId'], rc.get('scheduledLaps') or rc.get('laps'), rc['date'], bool(rc.get('sprintRaceDate') or rc.get('sprintRaceResults'))))
    calendar.append(cid)
for cid, gp in [('bahrain', 'bahrain'), ('jeddah', 'saudi-arabia'), ('imola', 'emilia-romagna')] + [(k, None) for k in GEO_MAP if k not in seen]:
    if cid in seen or cid not in CIR: continue
    seen.add(cid)
    tracks.append(track_entry(cid, gp))
print(f'pistas: {len(tracks)} ({len(calendar)} no calendário {YEAR})')

rules = {
    'seriesName': 'FIA Formula One World Championship', 'startYear': YEAR + 1,
    'points': [25, 18, 15, 12, 10, 8, 6, 4, 2, 1], 'sprintPoints': [8, 7, 6, 5, 4, 3, 2, 1], 'sprintDistancePct': 33,
    'fastestLapPoint': 0, 'fastestLapTopN': 10, 'mandatoryTwoCompounds': True, 'budgetCap': 215,
    'raceDistancePct': 100, 'practiceRuns': 6, 'regulationChangeEvery': 5,
    'prizePerPosition': [140, 130, 120, 110, 100, 90, 80, 70, 60, 50, 40],
}
db = {'version': 1, 'name': f'F1 {YEAR} — dados reais', 'real': True, 'source': hist['source'], 'ref': REF_DATE, 'rules': rules, 'engines': engines, 'teams': teams, 'drivers': drivers, 'tracks': tracks, 'calendar': calendar,
      'natNames': NAT_PT}
js = 'const REAL_DB = ' + json.dumps(db, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(OUT_DATA, 'real-db.js'), 'w').write(f'/* Base F1 {YEAR} com dados reais — gerado por scripts/import_real_data.py ({REF_DATE}). */\n' + js)
print(f'real-db.js: {len(js)/1024:.0f} KB')

# ---------------- imagens ----------------
if NO_IMG: sys.exit(0)
def save(url, path):
    full = os.path.join(OUT_IMG, path); os.makedirs(os.path.dirname(full), exist_ok=True)
    if os.path.exists(full): return True
    try:
        open(full, 'wb').write(get(url, True)); return True
    except Exception as e:
        print('  sem imagem:', path, e); return False
M = 'https://media.formula1.com/image/upload'
dhtml = get('https://www.formula1.com/en/drivers')
codes = set(re.findall(r'common/f1/%d/([a-z0-9]+)/([a-z]{6}\d{2})/' % YEAR, dhtml))
def code_for(d):
    first = slug((DRV[d['id']].get('fullName') or d['firstName']).split(' ')[0]); last = slug(d['lastName'])
    return (first[:3] + last[:3])
img_ok = 0
for d in drivers:
    c = code_for(d)
    hit = next(((tf, cc) for tf, cc in codes if cc.startswith(c)), None)
    if not hit:
        alt = slug(d['firstName'])[:3] + slug(d['lastName'])[:3]
        hit = next(((tf, cc) for tf, cc in codes if cc.startswith(alt)), None)
    if hit:
        tf, cc = hit
        if save(f'{M}/c_lfill,w_440/q_auto/v1740000001/common/f1/{YEAR}/{tf}/{cc}/{YEAR}{tf}{cc}right.webp', f'drivers/{d["id"]}.webp'):
            d['img'] = f'drivers/{d["id"]}.webp'; img_ok += 1
print(f'fotos de pilotos: {img_ok}/{len(drivers)}')
for t in teams:
    f = t['img']
    save(f'{M}/c_lfill,w_96/q_auto/v1740000001/common/f1/{YEAR}/{f}/{YEAR}{f}logowhite.webp', f'teams/{t["id"]}-logo.webp')
    save(f'{M}/c_lfill,h_224/q_auto/v1740000001/common/f1/{YEAR}/{f}/{YEAR}{f}carright.webp', f'cars/{t["id"]}.webp')
    t['logo'] = f'teams/{t["id"]}-logo.webp'; t['carImg'] = f'cars/{t["id"]}.webp'
GPSLUG = {'australia': 'australia', 'china': 'china', 'japan': 'japan', 'miami': 'miami', 'canada': 'canada', 'monaco': 'monaco', 'barcelona-catalunya': 'barcelona-catalunya', 'austria': 'austria', 'great-britain': 'great-britain', 'belgium': 'belgium', 'hungary': 'hungary', 'netherlands': 'netherlands', 'italy': 'italy', 'spain': 'spain', 'azerbaijan': 'azerbaijan', 'bahrain': 'bahrain', 'singapore': 'singapore', 'united-states': 'united-states', 'mexico': 'mexico', 'sao-paulo': 'brazil', 'las-vegas': 'las-vegas', 'qatar': 'qatar', 'abu-dhabi': 'united-arab-emirates'}
for t in tracks:
    s = GPSLUG.get(t.get('gpId'))
    if not s or t['id'] not in calendar: continue
    page = get(f'https://www.formula1.com/en/racing/{YEAR}/{s}')
    m = re.search(r'common/f1/%d/track/(%dtrack[a-z0-9]+detailed)' % (YEAR, YEAR), page)
    if m and save(f'{M}/c_fit,h_704/q_auto/v1740000001/common/f1/{YEAR}/track/{m.group(1)}.webp', f'tracks/{t["id"]}-map.webp'): t['mapImg'] = f'tracks/{t["id"]}-map.webp'
    h = re.search(r'Racehub%20header%20images%2016x9/([A-Za-z_%0-9-]+)\.(?:webp|jpg)', page)
    if h and save(f'{M}/c_lfill,w_1600/q_auto/v1740000001/content/dam/fom-website/2018-redesign-assets/Racehub%20header%20images%2016x9/{h.group(1)}.webp', f'tracks/{t["id"]}-hero.webp'): t['heroImg'] = f'tracks/{t["id"]}-hero.webp'
open(os.path.join(OUT_DATA, 'real-db.js'), 'w').write(f'/* Base F1 {YEAR} com dados reais — gerado por scripts/import_real_data.py ({REF_DATE}). */\nconst REAL_DB = ' + json.dumps(db, ensure_ascii=False, separators=(',', ':')) + ';\n')
tot = sum(os.path.getsize(os.path.join(dp, f)) for dp, dn, fn in os.walk(OUT_IMG) for f in fn)
print(f'imagens: {tot/1024/1024:.1f} MB')
