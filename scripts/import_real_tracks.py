"""Traçados reais dos circuitos de Grau 2 da FIA -> app/data/real-tracks.js

- Lista e extensão oficiais: app/data/fia-circuits.js (lista da FIA de 04/11/2026).
- Localização: coordenadas do artigo da Wikipedia.
- Traçado: vias highway=raceway do OpenStreetMap (© colaboradores do OpenStreetMap, ODbL),
  via Overpass. Entre as voltas fechadas possíveis, fica a de extensão mais próxima da oficial
  (até 15% de diferença); sem volta compatível, o circuito não entra (nada de traçado inventado).
Uso: python3 scripts/import_real_tracks.py
"""
import json, math, os, re, subprocess, time, urllib.parse

ROOT = os.path.join(os.path.dirname(__file__), '..')
UA = 'PitWallRacingSimulator/0.8 (fan project; https://github.com/kaiomoratelli-star/PitWall-Racing-Simulator)'
OVERPASS = 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
CACHE = '/tmp/res/tracks'; os.makedirs(CACHE, exist_ok=True)

# nome na lista da FIA -> (id no jogo, artigo da Wikipedia, nome no jogo, rua?)
VENUES = [
    ('AUTOPOLIS', 'autopolis', 'Autopolis', 'Autopolis', False),
    ('BALATON PARK CIRCUIT', 'balaton-park', 'Balaton Park Circuit', 'Balaton Park', False),
    ('BARBER MOTORSPORTS PARK', 'barber', 'Barber Motorsports Park', 'Barber Motorsports Park', False),
    ('BRANDS HATCH GRAND PRIX', 'brands-hatch', 'Brands Hatch', 'Brands Hatch', False),
    ('BRNO', 'brno', 'Brno Circuit', 'Autodrom Brno', False),
    ('CANADIAN TYRE MOTORSPORT PARK', 'mosport', 'Canadian Tire Motorsport Park', 'Canadian Tire Motorsport Park', False),
    ('CHENGDU TIANFU INTERNATIONAL', 'chengdu', 'Chengdu Tianfu International Circuit', 'Chengdu Tianfu', False),
    ('DIJON-PRENOIS', 'dijon', 'Dijon-Prenois', 'Dijon-Prenois', False),
    ('DONINGTON PARK', 'donington', 'Donington Park', 'Donington Park', False),
    ('EUROSPEEDWAY LAUSITZ GRAND PRIX', 'lausitzring', 'Lausitzring', 'Lausitzring', False),
    ('INJE', 'inje', 'Inje Speedium', 'Inje Speedium', False),
    ('JARAMA', 'jarama', 'Circuito del Jarama', 'Circuito del Jarama', False),
    ('KOREA', 'yeongam', 'Korea International Circuit', 'Korea International Circuit', False),
    ('LAGUNA SECA RACEWAY', 'laguna-seca', 'WeatherTech Raceway Laguna Seca', 'Laguna Seca', False),
    ('LE MANS 24 HEURES', 'le-mans', 'Circuit de la Sarthe', 'Circuit de la Sarthe', False),
    ('LE MANS BUGATTI', 'le-mans-bugatti', 'Bugatti Circuit', 'Circuito Bugatti', False),
    ('LIME ROCK', 'lime-rock', 'Lime Rock Park', 'Lime Rock Park', False),
    ('LONG BEACH', 'long-beach', 'Grand Prix of Long Beach', 'Long Beach', True),
    ('MARRAKECH MOULAY EL HASSAN', 'marrakech', 'Circuit International Automobile Moulay El Hassan', 'Marrakech', True),
    ('MID-OHIO', 'mid-ohio', 'Mid-Ohio Sports Car Course', 'Mid-Ohio', False),
    ('MISANO ADRIATICO', 'misano', 'Misano World Circuit Marco Simoncelli', 'Misano', False),
    ('MOST', 'most', 'Autodrom Most', 'Autodrom Most', False),
    ('NAVARRA', 'navarra', 'Circuito de Navarra', 'Circuito de Navarra', False),
    ('NINGBO SPEEDPARK', 'ningbo', 'Ningbo International Speedpark', 'Ningbo Speedpark', False),
    ('NOGARO', 'nogaro', 'Circuit Paul Armagnac', 'Nogaro', False),
    ('NOLA', 'nola', 'NOLA Motorsports Park', 'NOLA Motorsports Park', False),
    ('NORISRING', 'norisring', 'Norisring', 'Norisring', True),
    ('OKAYAMA', 'okayama', 'Okayama International Circuit', 'Okayama', False),
    ('PORTLAND', 'portland', 'Portland International Raceway', 'Portland', False),
    ('ROAD AMERICA – ELKHART LAKE', 'road-america', 'Road America', 'Road America', False),
    ('ROAD ATLANTA', 'road-atlanta', 'Michelin Raceway Road Atlanta', 'Road Atlanta', False),
    ('SEBRING', 'sebring', 'Sebring International Raceway', 'Sebring', False),
    ('SLOVAKIARING', 'slovakiaring', 'Slovakia Ring', 'Slovakia Ring', False),
    ('SONOMA RACEWAY', 'sonoma', 'Sonoma Raceway', 'Sonoma', False),
    ('ST. PETERSBURG', 'st-petersburg', 'Grand Prix of St. Petersburg', 'St. Petersburg', True),
    ('SUGO', 'sugo', 'Sportsland Sugo', 'Sportsland Sugo', False),
    ('SURFERS PARADISE, QUEENSLAND', 'surfers-paradise', 'Surfers Paradise Street Circuit', 'Surfers Paradise', True),
    ('SYDNEY MOTORSPORTS PARK - BRABHAM', 'sydney', 'Sydney Motorsport Park', 'Sydney Motorsport Park', False),
    ('THE BEND MOTORSPORTS PARK', 'the-bend', 'The Bend Motorsport Park', 'The Bend', False),
    ('THERMAL CLUB', 'thermal', 'Thermal Club', 'Thermal Club', False),
    ('TT CIRCUIT ASSEN', 'assen', 'TT Circuit Assen', 'TT Circuit Assen', False),
    ('TWIN RING MOTEGI GRAND PRIX', 'motegi', 'Mobility Resort Motegi', 'Motegi', False),
    ('VALENCIA RICARDO TORMO', 'valencia', 'Circuit Ricardo Tormo', 'Circuit Ricardo Tormo', False),
    ('VALLELUNGA INTERNATIONAL', 'vallelunga', 'Vallelunga Circuit', 'Vallelunga', False),
    ('ZHUHAI', 'zhuhai', 'Zhuhai International Circuit', 'Zhuhai', False),
    ('ZHUZHOU INTERNATIONAL', 'zhuzhou', 'Zhuzhou International Circuit', 'Zhuzhou', False),
    ('ZOLDER', 'zolder', 'Circuit Zolder', 'Circuit Zolder', False),
]


def get(url, data=None, tries=2):
    for i in range(tries):
        cmd = ['curl', '-sS', '-L', '-A', UA, '--max-time', '60', '-w', '\n%{http_code}', url]
        if data: cmd += ['--data-urlencode', 'data=' + data]
        r = subprocess.run(cmd, capture_output=True)
        body, code = r.stdout.rsplit(b'\n', 1) if b'\n' in r.stdout else (r.stdout, b'0')
        if code == b'200': return body.decode('utf-8', 'ignore')
        time.sleep(4 * (i + 1))
    return None


def coords(title):
    c = os.path.join(CACHE, 'c_' + re.sub(r'\W+', '_', title) + '.json')
    if os.path.exists(c): return json.load(open(c))
    t = get('https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=coordinates&titles=' + urllib.parse.quote(title))
    out = None
    try:
        p = next(iter(json.loads(t)['query']['pages'].values()))
        if p.get('coordinates'): out = [p['coordinates'][0]['lat'], p['coordinates'][0]['lon']]
    except Exception:
        pass
    json.dump(out, open(c, 'w'))
    return out


def ways(lat, lon, r=2600):
    c = os.path.join(CACHE, f'w_{lat:.4f}_{lon:.4f}_{r}.json')
    if os.path.exists(c): return json.load(open(c))
    q = f'[out:json][timeout:60];way["highway"="raceway"](around:{r},{lat},{lon});out body geom;'
    t = get(OVERPASS, q)
    if not t: return None
    j = json.loads(t)
    json.dump(j, open(c, 'w'))
    time.sleep(2)
    return j


def hav(a, b):
    R = 6371000.0
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


BAD = re.compile(r'pit|kart|drift|paddock|service|test|skid|dirt|motocross|oval|drag|rally|offroad|off-road|slalom', re.I)


def best_loop(j, target_m):
    # grafo de nós; arestas = trechos entre nós (com geometria)
    edges = []
    for w in j.get('elements', []):
        if w.get('type') != 'way' or 'geometry' not in w: continue
        tg = w.get('tags', {})
        if tg.get('area') == 'yes' or tg.get('service') or tg.get('sport') == 'karting': continue
        if BAD.search(' '.join(str(v) for v in tg.values())): continue
        nds, geo = w['nodes'], [(g['lat'], g['lon']) for g in w['geometry']]
        for k in range(len(nds) - 1):
            edges.append((nds[k], nds[k + 1], geo[k], geo[k + 1]))
    if not edges: return None
    adj = {}
    for a, b, ga, gb in edges:
        L = hav(ga, gb)
        adj.setdefault(a, []).append((b, L, gb)); adj.setdefault(b, []).append((a, L, ga))
    pos = {}
    for a, b, ga, gb in edges: pos[a] = ga; pos[b] = gb
    # comprime cadeias (nós de grau 2) em arestas entre junções
    junc = {n for n, v in adj.items() if len(v) != 2}
    chains, seen = [], set()
    def walk(s, nxt):
        path, L, prev, cur = [s, nxt[0]], nxt[1], s, nxt[0]
        while cur not in junc and cur != s:
            cand = [x for x in adj[cur] if x[0] != prev]
            if not cand: break
            prev, (cur, l, _) = cur, cand[0]
            path.append(cur); L += l
        return path, L
    starts = junc if junc else {next(iter(adj))}
    if not junc: junc = set(starts)
    for s in starts:
        for nb in adj[s]:
            p, L = walk(s, nb)
            key = frozenset([(p[i], p[i + 1]) if p[i] < p[i + 1] else (p[i + 1], p[i]) for i in range(len(p) - 1)])
            if key in seen: continue
            seen.add(key); chains.append((p[0], p[-1], L, p))
    # ciclos simples no grafo comprimido (busca limitada)
    g = {}
    for idx, (a, b, L, p) in enumerate(chains): g.setdefault(a, []).append((b, idx)); g.setdefault(b, []).append((a, idx))
    best = [None, 1e18]
    def dfs(start, cur, used_e, used_n, L, depth):
        if depth > 14 or L > target_m * 1.3: return
        for nxt, ei in g.get(cur, []):
            if ei in used_e: continue
            l2 = L + chains[ei][2]
            if nxt == start:
                d = abs(l2 - target_m)
                if d < best[1]: best[0], best[1] = used_e + [ei], d
                continue
            if nxt in used_n: continue
            dfs(start, nxt, used_e + [ei], used_n | {nxt}, l2, depth + 1)
    for s in list(g.keys())[:60]:
        dfs(s, s, [], {s}, 0.0, 0)
    if not best[0] or best[1] > target_m * 0.15: return None
    # monta a sequência de pontos na ordem do ciclo
    pts, cur = [], None
    es = [chains[i] for i in best[0]]
    a0, b0 = es[0][0], es[0][1]
    # descobre o sentido inicial pelo encadeamento com a próxima aresta
    if len(es) > 1 and a0 in (es[1][0], es[1][1]): seq, cur = list(reversed(es[0][3])), a0
    else: seq, cur = list(es[0][3]), b0
    pts += seq
    for e in es[1:]:
        p = e[3] if e[0] == cur else list(reversed(e[3]))
        cur = e[1] if e[0] == cur else e[0]
        pts += p[1:]
    geo = [pos[n] for n in pts if n in pos]
    return geo, sum(e[2] for e in es)


def shape_of(geo, n=180):
    lat0 = sum(p[0] for p in geo) / len(geo)
    xy = [((p[1]) * math.cos(math.radians(lat0)) * 111320, -p[0] * 110540) for p in geo]
    # reamostra por distância
    d = [0.0]
    for i in range(1, len(xy)): d.append(d[-1] + math.dist(xy[i - 1], xy[i]))
    tot = d[-1]; out = []; k = 0
    for i in range(n):
        t = tot * i / n
        while k < len(d) - 2 and d[k + 1] < t: k += 1
        f = (t - d[k]) / max(1e-9, d[k + 1] - d[k])
        out.append((xy[k][0] + (xy[k + 1][0] - xy[k][0]) * f, xy[k][1] + (xy[k + 1][1] - xy[k][1]) * f))
    xs, ys = [p[0] for p in out], [p[1] for p in out]
    s = max(max(xs) - min(xs), max(ys) - min(ys))
    norm = [[round((x - min(xs)) / s, 4), round((y - min(ys)) / s, 4)] for x, y in out]
    # curvas e maior reta (para o perfil do circuito)
    seg = tot / n
    turns, longest, run, ang_acc = 0, 0.0, 0.0, 0.0
    for i in range(n):
        a, b, c = out[i - 1], out[i], out[(i + 1) % n]
        h1 = math.atan2(b[1] - a[1], b[0] - a[0]); h2 = math.atan2(c[1] - b[1], c[0] - b[0])
        dh = abs((h2 - h1 + math.pi) % (2 * math.pi) - math.pi)
        if dh < 0.035: run += seg; longest = max(longest, run); ang_acc = 0
        else:
            run = 0; ang_acc += dh
            if ang_acc > 0.5: turns += 1; ang_acc = -10
    return norm, max(8, turns), round(longest)


def main():
    t = open(os.path.join(ROOT, 'app', 'data', 'fia-circuits.js'), encoding='utf-8').read()
    fia = {r['name']: r for r in json.loads(t[t.index('{'):t.rstrip().rindex('}') + 1])['list']}
    out = []
    for fname, tid, wiki, name, street in VENUES:
        f = fia.get(fname)
        if not f: print('fora da lista:', fname); continue
        c = coords(wiki)
        if not c: print('sem coordenadas:', fname, wiki); continue
        j = ways(c[0], c[1], 6000 if f['km'] > 9 else 2600)
        if not j: print('sem resposta do OSM:', fname); continue
        r = best_loop(j, f['km'] * 1000)
        if not r: print('sem volta compatível:', fname, f['km'], 'km'); continue
        geo, L = r
        shape, turns, longest = shape_of(geo)
        out.append({'id': tid, 'fia': fname, 'circuit': name, 'country': f['country'], 'km': f['km'], 'osmKm': round(L / 1000, 3), 'lat': c[0], 'lon': c[1], 'street': street, 'turns': turns, 'longest': longest, 'shape': shape, 'width': f['width']})
        print(f"{fname:38} {f['km']:.3f} km · OSM {L / 1000:.3f} km · {turns} curvas · reta {longest} m")
    meta = {'source': 'Traçados: © colaboradores do OpenStreetMap (ODbL), via Overpass; extensão e grau: lista oficial da FIA de 04/11/2026; localização: Wikipedia.', 'count': len(out)}
    open(os.path.join(ROOT, 'app', 'data', 'real-tracks.js'), 'w', encoding='utf-8').write('/* gerado por scripts/import_real_tracks.py — não editar à mão */\nconst REAL_TRACKS = ' + json.dumps({'meta': meta, 'list': out}, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('real-tracks.js:', len(out), 'circuitos')


if __name__ == '__main__':
    main()
