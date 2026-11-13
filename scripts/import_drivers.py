#!/usr/bin/env python3
"""Base de pilotos reais (Fase 1 da 0.8): todos os pilotos das temporadas 2022–2027 de dezenas de
campeonatos, a partir das listas de inscritos e das classificações das páginas de temporada da
Wikipedia (CC BY-SA), com identidade, nascimento, nacionalidade e foto do Wikidata (CC0).

Por que não o DriverDB: os termos do DriverDB (RAFA Media LLC) proíbem extração em massa e montar
base semelhante, mesmo para uso não comercial. Esta base cobre os mesmos campeonatos com fontes que
permitem reutilização. Ver docs/PLANO-0.8.md.

Cada piloto tem um id único (QID do Wikidata quando existe), apelidos (variações de nome reunidas),
e uma lista de temporadas com série, equipe, número, status, posição, pontos, vitórias, pódios e
poles (contados nas tabelas de resultados), fonte e data de verificação.

Uso: python3 scripts/import_drivers.py            (cache em /tmp/res/wiki)
Gera app/data/drivers-db.js (DRIVER_DB)."""
import datetime, json, os, re, sys, time, unicodedata

sys.path.insert(0, os.path.dirname(__file__))
import wikitable as W
import import_categories as IC

ROOT = os.path.join(os.path.dirname(__file__), '..')
TODAY = datetime.date.today().isoformat()
YEARS = [2022, 2023, 2024, 2025, 2026, 2027]

# id, nome, ecossistema, grupo de exibição, páginas (formato com {y}, {p} = ano anterior, {yy} = 2 dígitos)
SERIES = [
    ('f1', 'Fórmula 1', 'monopostos', 'principal', ['{y} Formula One World Championship']),
    ('fe', 'Fórmula E', 'eletricos', 'principal', ['{p}–{yy} Formula E World Championship']),
    ('indycar', 'IndyCar', 'indy', 'principal', ['{y} IndyCar Series']),
    ('sf', 'Super Formula', 'japao', 'principal', ['{y} Super Formula Championship']),
    ('f2', 'Fórmula 2', 'monopostos', 'formacao', ['{y} Formula 2 Championship', '{y} FIA Formula 2 Championship']),
    ('f3', 'Fórmula 3', 'monopostos', 'formacao', ['{y} FIA Formula 3 Championship']),
    ('f1a', 'F1 Academy', 'monopostos', 'formacao', ['{y} F1 Academy season']),
    ('freca', 'Fórmula Regional Europeia', 'monopostos', 'regional', ['{y} Formula Regional European Championship']),
    ('frme', 'Fórmula Regional do Oriente Médio', 'monopostos', 'regional', ['{y} Formula Regional Middle East Trophy', '{y} Formula Regional Middle East Championship']),
    ('fram', 'Fórmula Regional das Américas', 'monopostos', 'regional', ['{y} Formula Regional Americas Championship']),
    ('frj', 'Fórmula Regional do Japão', 'japao', 'regional', ['{y} Formula Regional Japanese Championship']),
    ('froc', 'Fórmula Regional da Oceania', 'monopostos', 'regional', ['{y} Formula Regional Oceania Championship', '{y} Formula Regional Oceania Trophy']),
    ('eurocup3', 'Eurocup-3', 'monopostos', 'regional', ['{y} Eurocup-3']),
    ('efo', 'Euroformula Open', 'monopostos', 'regional', ['{y} Euroformula Open Championship']),
    ('gb3', 'GB3', 'monopostos', 'regional', ['{y} GB3 Championship']),
    ('fws', 'Formula Winter Series', 'monopostos', 'f4', ['{y} Formula Winter Series']),
    ('f4it', 'F4 Italiana', 'monopostos', 'f4', ['{y} Italian F4 Championship']),
    ('f4es', 'F4 Espanhola', 'monopostos', 'f4', ['{y} F4 Spanish Championship']),
    ('f4gb', 'F4 Britânica', 'monopostos', 'f4', ['{y} F4 British Championship']),
    ('e4', 'E4 Championship', 'monopostos', 'f4', ['{y} E4 Championship']),
    ('f4br', 'F4 Brasil', 'monopostos', 'f4', ['{y} F4 Brazilian Championship']),
    ('f4us', 'F4 Estados Unidos', 'indy', 'f4', ['{y} Formula 4 United States Championship']),
    ('f4jp', 'F4 Japonesa', 'japao', 'f4', ['{y} F4 Japanese Championship']),
    ('f4uae', 'F4 Emirados Árabes', 'monopostos', 'f4', ['{y} Formula 4 UAE Championship', '{y} F4 UAE Championship']),
    ('f4cez', 'F4 CEZ', 'monopostos', 'f4', ['{y} F4 CEZ Championship']),
    ('f4au', 'F4 Australiana', 'monopostos', 'f4', ['{y} Australian Formula 4 Championship']),
    ('f4de', 'F4 Alemã', 'monopostos', 'f4', ['{y} ADAC Formula 4 Championship']),
    ('nxt', 'Indy NXT', 'indy', 'formacao', ['{y} Indy NXT']),
    ('usfpro', 'USF Pro 2000', 'indy', 'formacao', ['{y} USF Pro 2000 Championship']),
    ('usf2000', 'USF2000', 'indy', 'formacao', ['{y} USF2000 Championship', '{y} U.S. F2000 National Championship']),
    ('sfl', 'Super Formula Lights', 'japao', 'formacao', ['{y} Super Formula Lights']),
    ('wec', 'FIA WEC', 'endurance', 'endurance', ['{y} FIA World Endurance Championship']),
    ('imsa', 'IMSA', 'endurance', 'endurance', ['{y} IMSA SportsCar Championship']),
    ('elms', 'ELMS', 'endurance', 'endurance', ['{y} European Le Mans Series']),
    ('alms', 'Asian Le Mans Series', 'endurance', 'endurance', ['{p}–{yy} Asian Le Mans Series', '{y} Asian Le Mans Series']),
    ('nascup', 'NASCAR Cup Series', 'nascar', 'outras', ['{y} NASCAR Cup Series']),
    ('nasxf', 'NASCAR O\'Reilly / Xfinity', 'nascar', 'outras', ["{y} NASCAR O'Reilly Auto Parts Series", '{y} NASCAR Xfinity Series']),
    ('nastr', 'NASCAR Truck Series', 'nascar', 'outras', ['{y} NASCAR Craftsman Truck Series']),
    ('dtm', 'DTM', 'turismo', 'outras', ['{y} Deutsche Tourenwagen Masters', '{y} DTM']),
    ('stockcar', 'Stock Car Pro Series', 'turismo', 'outras', ['{y} Stock Car Pro Series', '{y} Stock Car Brasil']),
    ('supercars', 'Supercars', 'turismo', 'outras', ['{y} Supercars Championship']),
]
ECOS = {'monopostos': 'Monopostos', 'eletricos': 'Fórmula E', 'indy': 'Ecossistema Indy', 'japao': 'Ecossistema Super Formula', 'endurance': 'Endurance', 'nascar': 'NASCAR', 'turismo': 'Turismo e GT'}
BAD = re.compile(r'^(tba|tbc|tbd|to be announced|sources?|refs?|notes?|n/?a|vacant)$', re.I)


def raw_fast(title):
    """como IC.raw, mas uma página inexistente (404) é marcada no cache e não é pedida de novo"""
    import subprocess, urllib.parse
    f = os.path.join(IC.CACHE, title.replace(' ', '_').replace('/', '_') + '.txt')
    miss = f + '.missing'
    if os.path.exists(miss): return ''
    if not os.path.exists(f) or os.path.getsize(f) < 200:
        url = 'https://en.wikipedia.org/w/index.php?title=' + urllib.parse.quote(title.replace(' ', '_')) + '&action=raw'
        for i in range(3):
            r = subprocess.run(['curl', '-sS', '-A', IC.UA, '--max-time', '40', '-o', f, '-w', '%{http_code}', url], capture_output=True, text=True)
            if r.stdout == '200': break
            if r.stdout == '404':
                open(miss, 'w').close()
                if os.path.exists(f): os.remove(f)
                return ''
            time.sleep(3 * (i + 1))
        time.sleep(0.6)
    s = open(f, encoding='utf-8').read() if os.path.exists(f) else ''
    m = re.match(r'#REDIRECT\s*\[\[([^\]]+)\]\]', s, re.I)
    return raw_fast(m.group(1)) if m else s


COUNTRY = {'netherlands': 'NED', 'new zealand': 'NZL', 'united kingdom': 'GBR', 'great britain': 'GBR', 'england': 'GBR', 'scotland': 'GBR', 'wales': 'GBR', 'monaco': 'MON', 'spain': 'ESP', 'mexico': 'MEX', 'germany': 'GER', 'france': 'FRA', 'italy': 'ITA', 'australia': 'AUS', 'canada': 'CAN', 'japan': 'JPN', 'china': 'CHN', 'thailand': 'THA', 'denmark': 'DEN', 'finland': 'FIN', 'united states': 'USA', 'usa': 'USA', 'brazil': 'BRA', 'argentina': 'ARG', 'belgium': 'BEL', 'switzerland': 'SUI', 'austria': 'AUT', 'sweden': 'SWE', 'norway': 'NOR', 'poland': 'POL', 'israel': 'ISR', 'india': 'IND', 'estonia': 'EST', 'bulgaria': 'BUL', 'czech republic': 'CZE', 'czechia': 'CZE', 'ireland': 'IRL', 'portugal': 'POR', 'russia': 'RUS', 'colombia': 'COL', 'chile': 'CHI', 'south africa': 'RSA', 'united arab emirates': 'UAE', 'saudi arabia': 'KSA', 'singapore': 'SGP', 'malaysia': 'MAS', 'indonesia': 'INA', 'hong kong': 'HKG', 'south korea': 'KOR', 'barbados': 'BRB', 'venezuela': 'VEN', 'uruguay': 'URU', 'paraguay': 'PAR', 'peru': 'PER', 'hungary': 'HUN', 'romania': 'ROU', 'ukraine': 'UKR', 'latvia': 'LAT', 'lithuania': 'LTU', 'greece': 'GRE', 'turkey': 'TUR', 'philippines': 'PHI', 'taiwan': 'TPE', 'luxembourg': 'LUX', 'liechtenstein': 'LIE', 'serbia': 'SRB', 'croatia': 'CRO', 'slovakia': 'SVK', 'slovenia': 'SLO', 'morocco': 'MAR', 'kazakhstan': 'KAZ', 'kyrgyzstan': 'KGZ', 'qatar': 'QAT', 'kuwait': 'KUW', 'bahrain': 'BRN', 'oman': 'OMA', 'sri lanka': 'LKA', 'vietnam': 'VIE', 'malta': 'MLT', 'san marino': 'SMR', 'georgia': 'GEO', 'costa rica': 'CRI', 'jamaica': 'JAM', 'puerto rico': 'PUR', 'zimbabwe': 'ZIM'}
FLAGS_ANY = re.compile(r'\{\{\s*(?:flagicon|flag|flagathlete|flagdeco)\s*\|\s*([A-Za-z]{2,3})\b[^}]*\}\}|\{\{\s*flagg\s*\|[^|}]*\|\s*([^|}]+?)\s*(?:\||\}\})', re.I)


def cell_flags(t):
    out = []
    for code, name in FLAGS_ANY.findall(t or ''):
        out.append(IC.norm_nat(code) if code else COUNTRY.get(name.strip().lower(), ''))
    return out


def norm(s):
    s = unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z]+', ' ', s).strip()


def page_for(pats, y):
    for p in pats:
        t = p.format(y=y, p=y - 1, yy=str(y)[2:])
        txt = raw_fast(t)
        if len(txt) > 1500:
            return t, txt
    return None, ''


def driver_links(cell):
    """todos os pilotos de uma célula (endurance e NASCAR têm vários por carro)"""
    out = []
    for target, label in W.link_targets(cell):
        if not target or re.match(r'(File|Image|Category|Template):', target, re.I): continue
        if re.search(r'(Racing|Motorsport|Team|Autosport|Engineering|Grand Prix$|Championship|Series|Cup$|season)', target): continue
        if BAD.match(label.strip()): continue
        out.append((target, label.strip()))
    return out


def entries(text):
    sec = W.section(text, 'Entries', 'Teams and drivers', 'Drivers and teams', 'Entry list', 'Entry List', 'Teams', 'Teams and Drivers', 'Full-time entries', 'Chartered entries', 'Team and driver changes')
    if not sec: sec = text
    res = []
    for t in W.tables(sec):
        head = [W.plain(h).lower() for h in (t['header'][-1] if t['header'] else [])]
        if not any('driver' in h for h in head): continue
        ci = lambda *n: next((i for i, h in enumerate(head) if any(x in h for x in n)), None)
        cd, ct, cn = ci('driver'), ci('team', 'entrant'), ci('no.', 'no', '#', 'number')
        last_team = ''
        for r in t['rows']:
            if cd is None or cd >= len(r): continue
            ds = driver_links(r[cd]['text'])
            if not ds: continue
            team = W.plain(r[ct]['text']) if ct is not None and ct < len(r) else last_team
            team = re.sub(r'\s*\(.*?\)\s*', '', team or '').strip()
            team = re.sub(r'\{\{\s*(?:nowrap|sortname)\s*\|\s*([^{}]*?)\s*\}\}', lambda m: m.group(1).replace('|', ' ').strip(), team).strip()  # (0.9) {{nowrap|...}} sobrava no nome da equipe
            last_team = team or last_team
            nos = [n for part in re.split(r'<br\s*/?>|\n', r[cn]['text'], flags=re.I) for n in re.findall(r'\d+', W.plain(part))[:1]] if cn is not None and cn < len(r) else []
            flags = cell_flags(r[cd]['text'])
            for k, (target, label) in enumerate(ds):
                no = nos[k] if k < len(nos) else (nos[0] if len(nos) == 1 else '')
                res.append({'wiki': target, 'name': label, 'team': team, 'no': no, 'nat': flags[k] if k < len(flags) else ''})
        if len(res) > 5: break
    seen, out = set(), []
    for e in res:
        if e['wiki'] in seen: continue
        seen.add(e['wiki']); out.append(e)
    return out


def standings(text):
    sec = W.section(text, "World Drivers' Championship standings", "Hypercar World Endurance Drivers' Championship", "World Endurance Drivers' Championship", 'Driver standings', "Drivers' championships", "Drivers' Championship standings", "Drivers' championship standings", "Drivers' Championship", "Drivers' championship", "Drivers' standings", 'Drivers', "Drivers' Championship classification", 'Championship standings', 'Standings')
    if not sec: return {}
    out = {}
    for t in W.tables(sec):
        for r in t['rows']:
            cells = [c['text'] for c in r]
            if len(cells) < 3: continue
            pos = W.plain(cells[0])
            if not re.fullmatch(r'\d{1,3}', pos): continue
            idx, lk = None, None
            for i, c in enumerate(cells[1:4], 1):
                l = driver_links(c)
                if l: idx, lk = i, l[0]; break
            if not lk: continue
            res = cells[idx + 1:-1]
            pts = None
            for c in reversed(cells):
                p = W.plain(c).replace(',', '.')
                if re.fullmatch(r'\d+(\.\d+)?', p): pts = float(p); break
            vals = [W.plain(c) for c in res]
            out.setdefault(lk[0], {'pos': int(pos), 'pts': pts or 0,
                                   'w': sum(1 for v in vals if re.match(r'^1(?!\d)', v)),
                                   'pod': sum(1 for v in vals if re.match(r'^[123](?!\d)', v)),
                                   'pl': sum(1 for c, v in zip(res, vals) if re.match(r'^\d+\s*P', v) or ("'''" in c and re.match(r'^\d', v))),
                                   'st': sum(1 for v in vals if v and v not in ('', '—', '-'))})
        if out: break
    return out


def wikidata_full(titles):
    """QID, nascimento, nacionalidade (ISO3 do país de cidadania) e foto, pelos títulos da Wikipedia"""
    cf = os.path.join(IC.CACHE, '_wd_drivers.json')
    cache = json.load(open(cf)) if os.path.exists(cf) else {}
    todo = [t for t in titles if t and (t not in cache or ('qid' in cache[t] and 'human' not in cache[t] and not cache[t].get('nonhuman')))]
    for t in todo:
        if t in cache: cache[t]['nonhuman'] = True  # vira False abaixo se o Wikidata disser que é pessoa
    for i in range(0, len(todo), 50):
        chunk = todo[i:i + 50]
        vals = ' '.join('"%s"@en' % t.replace('"', '\\"') for t in chunk)
        q = ('SELECT ?t ?item ?inst ?dob ?img ?iso ?dod WHERE { VALUES ?t { %s } ?a schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?t . '
             'OPTIONAL { ?item wdt:P31 ?inst } OPTIONAL { ?item wdt:P569 ?dob } OPTIONAL { ?item wdt:P570 ?dod } OPTIONAL { ?item wdt:P18 ?img } OPTIONAL { ?item wdt:P1532 ?sc . ?sc wdt:P298 ?iso } OPTIONAL { ?item wdt:P27 ?c . ?c wdt:P298 ?iso } }') % vals
        import subprocess, urllib.parse
        for attempt in range(3):
            r = subprocess.run(['curl', '-sS', '-G', 'https://query.wikidata.org/sparql', '--data-urlencode', 'query=' + q, '-H', 'Accept: application/sparql-results+json', '-A', IC.UA, '--max-time', '90'], capture_output=True, text=True)
            try:
                bs = json.loads(r.stdout)['results']['bindings']; break
            except Exception:
                time.sleep(8); bs = None
        if bs is None: continue
        for t in chunk: cache.setdefault(t, {})
        for b in bs:
            o = cache[b['t']['value']]
            o['qid'] = b['item']['value'].split('/')[-1]
            if b.get('inst', {}).get('value', '').endswith('/Q5'): o['human'] = True; o.pop('nonhuman', None)
            if 'dob' in b and 'dob' not in o: o['dob'] = b['dob']['value'][:10]
            if 'dod' in b and 'dod' not in o: o['dod'] = b['dod']['value'][:10]
            if 'img' in b and 'img' not in o: o['img'] = urllib.parse.unquote(b['img']['value'].split('/')[-1])
            if 'iso' in b and 'nat' not in o: o['nat'] = IC.norm_nat(b['iso']['value'])
        json.dump(cache, open(cf, 'w'))
        time.sleep(2)
        print(f'  wikidata {min(i + 50, len(todo))}/{len(todo)}', flush=True)
    return cache


def main():
    by_wiki = {}
    series_meta = {}
    for sid, name, eco, group, pats in SERIES:
        series_meta[sid] = {'name': name, 'eco': eco, 'ecoName': ECOS[eco], 'group': group, 'seasons': {}}
        for y in YEARS:
            title, txt = page_for(pats, y)
            if not title: continue
            ent = entries(txt)
            st = standings(txt) if y <= 2026 else {}
            if not ent and not st: continue
            status = 'disputou' if y <= 2025 else ('inscrito' if y == 2026 else 'anunciado (lista provisória)')
            series_meta[sid]['seasons'][y] = {'page': title, 'n': len(ent) or len(st)}
            names = {e['wiki']: e for e in ent}
            for w in st:
                names.setdefault(w, {'wiki': w, 'name': w, 'team': '', 'no': '', 'nat': ''})
            for w, e in names.items():
                d = by_wiki.setdefault(w, {'wiki': w, 'names': set(), 'nat': '', 'seasons': []})
                d['names'].add(e['name'])
                if e['nat'] and not d['nat']: d['nat'] = e['nat']
                rec = {'y': y, 's': sid, 'team': e['team'], 'no': e['no'], 'status': status, 'src': f'Wikipedia: {title}', 'ver': TODAY}
                if w in st: rec.update(st[w])
                d['seasons'].append(rec)
            print(f'{sid} {y}: {len(names)} pilotos ({title})', flush=True)
    wd = wikidata_full(list(by_wiki))
    # junta registros que apontam para a mesma pessoa (QID) e remove duplicados por nome+nascimento
    people = {}
    for w, d in by_wiki.items():
        info = wd.get(w, {})
        if info.get('qid') and not info.get('human'): continue  # item do Wikidata que não é pessoa (cidade, evento, equipe)
        key = info.get('qid') or ('n:' + norm(re.sub(r'\s*\(.*?\)', '', w)))
        if not info.get('qid'):
            # sem item no Wikidata: junta com a pessoa de mesmo nome, se houver
            same = next((k for k, p in people.items() if norm(re.sub(r'\s*\(.*?\)', '', p['wiki'])) == key[2:]), None)
            if same: key = same
        # nacionalidade esportiva: a bandeira da lista de inscritos vale mais que a cidadania do Wikidata (dupla cidadania)
        p = people.setdefault(key, {'uid': key if key.startswith('Q') else 'pw-' + IC.slug(w), 'qid': info.get('qid'), 'wiki': w, 'names': set(), 'aliases': set(), 'dob': info.get('dob'), 'dod': info.get('dod'), 'nat': d['nat'] or info.get('nat'), 'img': info.get('img'), 'seasons': []})
        p['names'] |= d['names']; p['aliases'].add(re.sub(r'\s*\(.*?\)', '', w))
        p['seasons'] += d['seasons']
    out = []
    for p in people.values():
        name = sorted(p['names'], key=lambda n: (-sum(1 for s in p['seasons']), len(n)))[0] if p['names'] else p['wiki']
        name = re.sub(r'\s*\(.*?\)', '', p['wiki']) if len(re.sub(r'\s*\(.*?\)', '', p['wiki'])) >= len(name) else name
        seasons = sorted({(s['y'], s['s']): s for s in p['seasons']}.values(), key=lambda s: (s['y'], s['s']))
        out.append({'uid': p['uid'], 'qid': p['qid'], 'name': name, 'aliases': sorted((p['names'] | p['aliases']) - {name}), 'dob': p['dob'], 'dod': p['dod'], 'nat': p['nat'], 'img': p['img'], 'wiki': p['wiki'], 'seasons': seasons})
    out.sort(key=lambda d: d['name'])
    meta = {'source': 'Wikipedia (CC BY-SA, páginas de temporada) e Wikidata (CC0)', 'verified': TODAY, 'years': YEARS, 'statusNote': '2022–2025: disputou; 2026: inscrito; 2027: anunciado (lista provisória). Rumores não entram como fato. Vitórias, pódios e poles fora da F1 são contados nas tabelas de resultados (aproximados).'}
    body = '/* gerado por scripts/import_drivers.py — não editar à mão */\nconst DRIVER_DB = ' + json.dumps({'meta': meta, 'series': series_meta, 'drivers': out}, ensure_ascii=False, separators=(',', ':')) + ';\n'
    open(os.path.join(ROOT, 'app', 'data', 'drivers-db.js'), 'w', encoding='utf-8').write(body)
    # (0.9) correcoes e confirmacoes com fonte que a Wikipedia ainda nao tem (scripts/driverdb-manual.json)
    import subprocess
    subprocess.run(['node', os.path.join(ROOT, 'scripts', 'driverdb-fixes.js')], check=True)
    with_dob = sum(1 for d in out if d['dob'])
    print(f'{len(out)} pilotos · {with_dob} com nascimento · {sum(1 for d in out if d["img"])} com foto no Commons · {sum(len(d["seasons"]) for d in out)} temporadas · {len(body) // 1024} KB')


if __name__ == '__main__':
    main()
