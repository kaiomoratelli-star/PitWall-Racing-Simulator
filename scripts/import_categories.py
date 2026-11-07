#!/usr/bin/env python3
"""Importa as categorias de base e outras séries (temporada 2026) da Wikipedia
(texto bruto das páginas de temporada), datas de nascimento e fotos do Wikidata/Commons,
e fotos oficiais de pilotos e carros da F2 e da F3 (sites oficiais).

Uso: python3 scripts/import_categories.py [--no-images]
Gera app/data/categories.js (REAL_CATS) e app/assets/img/cats/...
Cache das páginas em /tmp/res/wiki."""
import json, os, re, subprocess, sys, time, unicodedata, urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
import wikitable as W

ROOT = os.path.join(os.path.dirname(__file__), '..')
CACHE = '/tmp/res/wiki'
IMG_DIR = os.path.join(ROOT, 'app', 'assets', 'img', 'cats')
UA = 'PitWallRacingSimulator/1.0 (https://github.com/kaiomoratelli-star/PitWall-Racing-Simulator; personal non-commercial project)'
NO_IMG = '--no-images' in sys.argv
os.makedirs(CACHE, exist_ok=True)

# id, nome em português, página da temporada 2026, nível (1 = F1), tabela de superlicença, corridas por etapa, pontuação
P25 = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]

def norm_name(n):
    import unicodedata
    return re.sub(r'[^a-z]+', ' ', unicodedata.normalize('NFD', n).encode('ascii', 'ignore').decode().lower()).strip()


def load_dbnat():
    try:
        t = open(os.path.join(ROOT, 'app', 'data', 'drivers-db.js'), encoding='utf-8').read()
        data = json.loads(t[t.index('{'):t.rstrip().rindex('}') + 1])
        return {norm_name(d['name']): d.get('nat') for d in data['drivers'] if d.get('nat')}
    except Exception:
        return {}


DBNAT = load_dbnat()

CATS = [
    dict(id='f2', name='Fórmula 2', short='F2', page='2026 Formula 2 Championship', tier=2, sl='f2', races=[['Sprint', [10, 8, 6, 5, 4, 3, 2, 1], 0, 1, 10], ['Principal', P25, 2, 1, 0]], range=(72, 81), age=20, site='f2', color='#0090d0', season='mar-dez'),
    dict(id='f3', name='Fórmula 3', short='F3', page='2026 FIA Formula 3 Championship', tier=3, sl='f3', races=[['Sprint', [10, 9, 8, 7, 6, 5, 4, 3, 2, 1], 0, 0, 12], ['Principal', P25, 2, 0, 0]], range=(66, 78), age=18, site='f3', color='#e0458b', season='mar-set'),
    dict(id='indycar', name='IndyCar', short='INDY', page='2026 IndyCar Series', tier=1.4, sl='indycar', races=[['Corrida', [50, 40, 35, 32, 30, 28, 26, 24, 22, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5], 1, 0, 0]], range=(75, 85), age=29, color='#d81e2b', season='mar-ago'),
    dict(id='wec', name='FIA WEC (Hypercar)', short='WEC', page='2026 FIA World Endurance Championship', tier=1.6, sl='wec', races=[['Corrida', P25, 1, 0, 0]], range=(70, 82), age=31, color='#0c3c8c', season='fev-nov', crew=True),
    dict(id='fe', name='Fórmula E', short='FE', page='2025–26 Formula E World Championship', tier=1.5, sl='fe', races=[['Corrida', P25, 3, 1, 0]], range=(70, 80), age=29, color='#1e1eff', season='dez-ago'),
    dict(id='sf', name='Super Formula', short='SF', page='2026 Super Formula Championship', tier=1.6, sl='sf', races=[['Corrida', [20, 15, 11, 8, 6, 5, 4, 3, 2, 1], 3, 0, 0]], range=(68, 79), age=27, color='#d4002a', season='mar-nov'),
    dict(id='freca', name='Fórmula Regional Europeia', short='FRECA', page='2026 Formula Regional European Championship', tier=4, sl='freca', races=[['Corrida 1', P25, 0, 0, 0], ['Corrida 2', P25, 0, 0, 0]], range=(61, 74), age=17, color='#00a19a', season='abr-out'),
    dict(id='frme', name='Fórmula Regional do Oriente Médio', short='FRME', page='2026 Formula Regional Middle East Trophy', tier=4.3, sl='frme', races=[['Corrida 1', P25, 0, 0, 0], ['Corrida 2', P25, 0, 0, 0], ['Corrida 3', P25, 0, 0, 0]], range=(59, 72), age=17, color='#b8860b', season='jan-fev'),
    dict(id='fram', name='Fórmula Regional das Américas', short='FRAm', page='2026 Formula Regional Americas Championship', tier=4.5, sl='fram', races=[['Corrida 1', P25, 0, 0, 0], ['Corrida 2', P25, 0, 0, 0], ['Corrida 3', P25, 0, 0, 0]], range=(57, 69), age=18, color='#2f5aa8', season='abr-out'),
    dict(id='frj', name='Fórmula Regional do Japão', short='FRJ', page='2026 Formula Regional Japanese Championship', tier=4.6, sl='fras', races=[['Corrida 1', P25, 0, 0, 0], ['Corrida 2', P25, 0, 0, 0]], range=(56, 68), age=19, color='#c41e3a', season='abr-nov'),
    dict(id='f4it', name='F4 Italiana', short='F4 ITA', page='2026 Italian F4 Championship', tier=5, sl='f4', races=[['Corrida 1', P25, 0, 0, 0], ['Corrida 2', P25, 0, 0, 0], ['Corrida 3', P25, 0, 0, 0]], range=(53, 67), age=16, color='#008c45', season='abr-out'),
    dict(id='f4es', name='F4 Espanhola', short='F4 ESP', page='2026 F4 Spanish Championship', tier=5.1, sl='f4', races=[['Corrida 1', P25, 0, 0, 0], ['Corrida 2', P25, 0, 0, 0], ['Corrida 3', P25, 0, 0, 0]], range=(52, 66), age=16, color='#c60b1e', season='abr-nov'),
    dict(id='f4gb', name='F4 Britânica', short='F4 GBR', page='2026 F4 British Championship', tier=5.1, sl='f4', races=[['Corrida 1', P25, 0, 0, 0], ['Corrida 2', P25, 0, 0, 0], ['Corrida 3', P25, 0, 0, 0]], range=(52, 66), age=16, color='#012169', season='abr-out'),
    dict(id='e4', name='E4 Championship', short='E4', page='2026 E4 Championship', tier=5.2, sl='f4', races=[['Corrida 1', P25, 0, 0, 0], ['Corrida 2', P25, 0, 0, 0], ['Corrida 3', P25, 0, 0, 0]], range=(52, 65), age=16, color='#5b2c83', season='mai-out'),
    dict(id='f4br', name='F4 Brasil', short='F4 BRA', page='2026 F4 Brazilian Championship', tier=5.4, sl='f4', races=[['Corrida 1', P25, 0, 0, 0], ['Corrida 2', P25, 0, 0, 0], ['Corrida 3', P25, 0, 0, 0]], range=(50, 63), age=16, color='#009c3b', season='abr-nov'),
    dict(id='f4us', name='F4 Estados Unidos', short='F4 USA', page='2026 Formula 4 United States Championship', tier=5.5, sl='f4', races=[['Corrida 1', P25, 0, 0, 0], ['Corrida 2', P25, 0, 0, 0], ['Corrida 3', P25, 0, 0, 0]], range=(49, 62), age=16, color='#3c3b6e', season='abr-out'),
    dict(id='f4uae', name='F4 Emirados (F4 Oriente Médio)', short='F4 ME', page='2025 F4 Middle East Championship', tier=5.3, sl='f4', races=[['Corrida 1', P25, 0, 0, 0], ['Corrida 2', P25, 0, 0, 0], ['Corrida 3', P25, 0, 0, 0]], range=(50, 63), age=16, color='#00732f', season='jan-fev', brief='Categoria de início de ano nos Emirados (antiga F4 UAE, hoje F4 Oriente Médio): pilotos saídos do kart se preparam para as F4 mais importantes.', disc='mono'),
    dict(id='f4de', name='F4 Alemã', short='F4 GER', page='2022 ADAC Formula 4 Championship', tier=5.05, sl='f4', races=[['Corrida 1', P25, 0, 0, 0], ['Corrida 2', P25, 0, 0, 0], ['Corrida 3', P25, 0, 0, 0]], range=(52, 66), age=16, color='#000000', season='abr-out', brief='Uma das principais F4 da Europa. O campeonato real terminou em 2022; no jogo ele volta a partir da última temporada real.', disc='mono', revived=2022),
    dict(id='f1a', name='F1 Academy', short='F1A', page='2026 F1 Academy season', tier=4.8, sl='f1a', races=[['Corrida 1', P25, 0, 0, 0], ['Corrida 2', P25, 2, 1, 0]], range=(48, 62), age=18, color='#ec008c', season='mar-nov', brief='Categoria oficial de base da F1, somente para mulheres.', disc='mono', women=True),
    dict(id='dtm', name='DTM', short='DTM', page='2026 Deutsche Tourenwagen Masters', tier=2.3, sl='dtm', races=[['Corrida 1', P25, 3, 0, 0], ['Corrida 2', P25, 3, 0, 0]], range=(68, 80), age=28, color='#0a1f44', season='abr-out', brief='Principal categoria GT da Europa. Recebe pilotos sem espaço no kart europeu e nas F4, mas principalmente vindos do endurance.', disc='gt'),
    dict(id='stockcar', name='Stock Car Pro Series', short='STOCK', page='2026 Stock Car Pro Series', tier=2.6, sl='stockcar', races=[['Corrida 1', P25, 0, 0, 0], ['Corrida 2', [20, 17, 15, 13, 11, 10, 9, 8, 7, 6], 0, 0, 10]], range=(62, 76), age=30, color='#ffd200', season='mar-dez', brief='Destino de quem não teve sucesso no kart ou na F4 do Brasil ou vem de outras categorias; maioria de sul-americanos.', disc='gt'),
    dict(id='nascup', name='NASCAR Cup Series', short='NASCAR', page='2026 NASCAR Cup Series', tier=2.2, sl='nascup', races=[['Corrida', [40, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1], 0, 0, 0]], range=(66, 80), age=30, color='#ffd659', season='fev-nov', brief='Um show à parte: quase só americanos, com playoffs no fim do ano e um formato próprio. Pilotos europeus raramente chegam aqui.', disc='gt', playoffs=True),
    dict(id='f4jp', name='F4 Japonesa', short='F4 JPN', page='2026 F4 Japanese Championship', tier=5.4, sl='f4', races=[['Corrida 1', P25, 0, 0, 0], ['Corrida 2', P25, 0, 0, 0]], range=(50, 63), age=17, color='#bc002d', season='abr-nov'),
]

MONTHS = {m: i + 1 for i, m in enumerate(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'])}
NAT3 = {'GER': 'DEU', 'NED': 'NLD', 'UAE': 'ARE', 'SUI': 'CHE', 'POR': 'PRT', 'DEN': 'DNK', 'CRO': 'HRV', 'GRE': 'GRC', 'RSA': 'ZAF', 'MAS': 'MYS', 'INA': 'IDN', 'PHI': 'PHL', 'CHI': 'CHL', 'URU': 'URY', 'PAR': 'PRY', 'BUL': 'BGR', 'LAT': 'LVA', 'IRI': 'IRN', 'KSA': 'SAU', 'TPE': 'TWN', 'SLO': 'SVN', 'UK': 'GBR', 'US': 'USA', 'IRE': 'IRL', 'MON': 'MCO', 'VIE': 'VNM', 'LBN': 'LBN', 'ALG': 'DZA', 'GUA': 'GTM', 'KUW': 'KWT', 'BAH': 'BHS', 'NGR': 'NGA', 'ZIM': 'ZWE', 'HAI': 'HTI'}


def norm_nat(n):
    """converte para o código de 3 letras que o jogo usa (padrão FIFA/IOC das bandeiras do jogo)"""
    n = (n or '').upper()
    back = {'DEU': 'GER', 'NLD': 'NED', 'ARE': 'UAE', 'CHE': 'SUI', 'PRT': 'POR', 'DNK': 'DEN', 'HRV': 'CRO', 'GRC': 'GRE', 'ZAF': 'RSA', 'MYS': 'MAS', 'IDN': 'INA', 'PHL': 'PHI', 'CHL': 'CHI', 'URY': 'URU', 'PRY': 'PAR', 'BGR': 'BUL', 'LVA': 'LAT', 'SAU': 'KSA', 'TWN': 'TPE', 'SVN': 'SLO', 'IRL': 'IRL', 'MCO': 'MON', 'VNM': 'VIE', 'GB': 'GBR', 'UK': 'GBR', 'US': 'USA', 'IRE': 'IRL', 'NZ': 'NZL', 'AU': 'AUS'}
    return back.get(n, n)


def raw(title):
    f = os.path.join(CACHE, title.replace(' ', '_').replace('/', '_') + '.txt')
    if not os.path.exists(f) or os.path.getsize(f) < 200:
        url = 'https://en.wikipedia.org/w/index.php?title=' + urllib.parse.quote(title.replace(' ', '_')) + '&action=raw'
        for i in range(4):
            r = subprocess.run(['curl', '-sS', '-A', UA, '--max-time', '40', '-o', f, '-w', '%{http_code}', url], capture_output=True, text=True)
            if r.stdout == '200': break
            time.sleep(3 * (i + 1))
        time.sleep(1.2)
    s = open(f, encoding='utf-8').read() if os.path.exists(f) else ''
    m = re.match(r'#REDIRECT\s*\[\[([^\]]+)\]\]', s, re.I)
    return raw(m.group(1)) if m else s


def slug(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def parse_date(t, year):
    t = W.plain(t)
    ms = re.findall(r'(\d{1,2})\s*(?:–\s*\d{1,2}\s*)?([A-Z][a-z]+)(?:\s+(\d{4}))?', t)
    out = None
    for d, mon, y in ms:
        if mon.lower() in MONTHS:
            out = '%04d-%02d-%02d' % (int(y) if y else year, MONTHS[mon.lower()], int(d))
    # formato americano: "April 11" / "April 11–12"
    for mon, d in re.findall(r'([A-Z][a-z]+)\s+(\d{1,2})(?:\s*[–-]\s*(?:[A-Z][a-z]+\s+)?\d{1,2})?', t):
        if mon.lower() in MONTHS:
            last = re.findall(r'([A-Z][a-z]+)\s+(\d{1,2})', t)
            m2, d2 = mon, d
            tail = re.search(re.escape(mon) + r'\s+\d{1,2}\s*[–-]\s*(?:([A-Z][a-z]+)\s+)?(\d{1,2})', t)
            if tail: m2, d2 = (tail.group(1) or mon), tail.group(2)
            if m2.lower() in MONTHS:
                cand = '%04d-%02d-%02d' % (year, MONTHS[m2.lower()], int(d2))
                out = max(out, cand) if out else cand
    return out


def find_table(sec, must):
    for t in W.tables(sec):
        h = ' '.join(' '.join(r) for r in t['header']).lower()
        if all(m in h for m in must):
            return t
    return None


def parse_entries(text, cat):
    sec = W.section(text, 'Entries', 'Teams and drivers', 'Drivers and teams', 'Entry list', 'Confirmed entries', 'Full-time entries', 'Teams')
    t = None
    for must in (['team', 'driver'], ['entrant', 'driver'], ['team', 'drivers'], ['driver']):
        t = find_table(sec, must)
        if t: break
    if not t:
        return []
    head = [W.plain(h).lower() for h in t['header'][-1]] if t['header'] else []
    def col(*names):
        for i, h in enumerate(head):
            if any(n in h for n in names): return i
        return None
    ct, cd, cn = col('team', 'entrant'), col('driver'), col('no')
    out = []
    for r in t['rows']:
        if cd is None or cd >= len(r): continue
        dcell = r[cd]['text']
        names = W.link_targets(dcell)
        if cat.get('crew') and names:
            # endurance: todos os pilotos do carro; cada carro é uma "equipe" (equipe + número)
            team0 = re.sub(r'\s*\(.*?\)\s*', '', W.plain(r[ct]['text']) if ct is not None and ct < len(r) else '').strip() or 'Equipe'
            nums = [W.plain(c['text']) for c in r if re.fullmatch(r'\d{1,3}', W.plain(c['text']))]
            no0 = (W.plain(r[cn]['text']) if cn is not None and cn < len(r) else '') or (nums[0] if nums else '')
            if not re.sub(r'\D', '', no0): no0 = str(sum(1 for x in out if x['team'].startswith(team0 + ' #')) // 3 + 1)
            fl = W.flags(dcell)
            for k, (target, label) in enumerate(names):
                if re.match(r'(File|Image):', target or '', re.I) or not label or label.lower() in ('tba', 'tbc', 'tbd'): continue
                out.append({'name': label.strip(), 'wiki': target, 'nat': norm_nat(fl[k] if k < len(fl) else ''), 'team': f"{team0} #{re.sub(r'\D', '', no0)[:3]}", 'tnat': '', 'no': re.sub(r'\D', '', no0)[:3], 'rounds': ''})
            continue
        nm = None
        if names:
            target, label = names[0]
            nm = label
        else:
            p = W.plain(dcell)
            if p and len(p) < 40 and not re.search(r'\d', p): target, nm = None, p
        if not nm or nm.lower() in ('tba', 'tbc', 'tbd'): continue
        nat = (W.flags(dcell) or [''])[0]
        team = W.plain(r[ct]['text']) if ct is not None and ct < len(r) else ''
        team = re.sub(r'\s*\(.*?\)\s*', '', team).strip() or 'Equipe independente'
        if re.match(r'(sources?|fonte)\b', team, re.I) or re.match(r'sources?\b', nm, re.I): continue
        tnat = (W.flags(r[ct]['text']) or [''])[0] if ct is not None and ct < len(r) else ''
        no = W.plain(r[cn]['text']) if cn is not None and cn < len(r) else ''
        rounds = W.plain(r[-1]['text']) if len(r) > cd + 1 else ''
        out.append({'name': nm.strip(), 'wiki': target, 'nat': norm_nat(nat), 'team': team, 'tnat': norm_nat(tnat), 'no': re.sub(r'\D', '', no)[:3], 'rounds': rounds})
    # mesmo piloto pode aparecer duas vezes (troca de equipe): mantém a primeira entrada com mais etapas
    seen, res = {}, []
    for e in out:
        k = e['name']
        if k in seen: continue
        seen[k] = 1; res.append(e)
    return res


def parse_calendar(text, year):
    sec = W.section(text, 'Race calendar', 'Calendar', 'Schedule', 'Race schedule')
    t = None
    for must in (['round', 'circuit'], ['circuit'], ['round'], ['venue'], ['track'], ['rd.']):
        t = find_table(sec, must)
        if t: break
    if not t: return []
    out = []
    for r in t['rows']:
        cells = [c['text'] for c in r]
        rnd = W.plain(cells[0]) if cells else ''
        m = re.match(r'R?(\d+)', rnd)
        if not m: continue
        circ, place, nat = None, '', ''
        for c in cells[1:]:
            lk = W.link_names(c)
            if lk and not circ and not re.search(r'\d{1,2}\s+[A-Z][a-z]+', W.plain(c)):
                circ = lk[0]; place = lk[1] if len(lk) > 1 else ''; nat = (W.flags(c) or [''])[0]
        dates = [parse_date(c, year) for c in cells[1:]]
        dates = [d for d in dates if d]
        if not circ:
            circ = W.plain(cells[1]) if len(cells) > 1 else '?'
        if not dates: continue
        out.append({'r': int(m.group(1)), 'circuit': circ, 'place': place, 'nat': norm_nat(nat), 'date': max(dates)})
    # rodadas duplicadas (linhas com rowspan) → uma por número
    uniq = {}
    for e in out: uniq.setdefault(e['r'], e)
    return [uniq[k] for k in sorted(uniq)]


def parse_standings(text, kind='driver'):
    names = ['Driver standings', "Hypercar World Endurance Drivers' Championship", "Drivers' Championship standings", "Drivers' championship standings", "Drivers' Championship", "Drivers' championship", "Drivers' standings", 'Drivers'] if kind == 'driver' else ["Teams' Championship standings", "Teams' championship standings", "Teams' Championship", "Teams' championship", "Teams' standings", "Teams' Trophy", 'Teams']
    sec = W.section(text, *names)
    if not sec: return []
    out = []
    for t in W.tables(sec):
        for r in t['rows']:
            cells = [c['text'] for c in r]
            if not cells: continue
            pos = W.plain(cells[0])
            if not re.fullmatch(r'\d{1,2}', pos): continue
            nm = None
            for c in cells[1:4]:
                lk = W.link_targets(c)
                if lk: nm = lk[0][1]; break
                p = W.plain(c)
                if p and not re.fullmatch(r'[\d.]+|Ret|DNS|NC|DSQ|WD|EX', p) and len(p) > 3: nm = p; break
            pts = None
            for c in reversed(cells):
                p = W.plain(c).replace(',', '.')
                if re.fullmatch(r'\d+(\.\d+)?', p): pts = float(p); break
            if nm: out.append([int(pos), nm.strip(), pts or 0])
        if out: break
    seen, res = set(), []
    for x in out:
        if x[1] in seen: continue
        seen.add(x[1]); res.append(x)
    return res


def wikidata(titles):
    """data de nascimento e imagem (Commons) pelos títulos de artigo da Wikipedia em inglês (com cache)"""
    cf = os.path.join(CACHE, '_wikidata.json')
    cache = json.load(open(cf)) if os.path.exists(cf) else {}
    todo = [t for t in titles if t and t not in cache]
    for attempt in range(3):
        if not todo: break
        got = _wikidata(todo)
        for t in todo:
            if t in got: cache[t] = got[t]
        json.dump(cache, open(cf, 'w'))
        todo = [t for t in todo if t not in cache]
        time.sleep(5)
    for t in todo: cache[t] = {}
    return {t: cache.get(t, {}) for t in titles if t}


def _wikidata(titles):
    out = {}
    titles = [t for t in titles if t]
    for i in range(0, len(titles), 60):
        chunk = titles[i:i + 60]
        vals = ' '.join('"%s"@en' % t.replace('"', '\\"') for t in chunk)
        q = 'SELECT ?t ?dob ?img WHERE { VALUES ?t { %s } ?a schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?t . OPTIONAL { ?item wdt:P569 ?dob } OPTIONAL { ?item wdt:P18 ?img } }' % vals
        r = subprocess.run(['curl', '-sS', '-G', 'https://query.wikidata.org/sparql', '--data-urlencode', 'query=' + q, '-H', 'Accept: application/sparql-results+json', '-A', UA, '--max-time', '60'], capture_output=True, text=True)
        try:
            for b in json.loads(r.stdout)['results']['bindings']:
                t = b['t']['value']
                o = out.setdefault(t, {})
                if 'dob' in b and 'dob' not in o: o['dob'] = b['dob']['value'][:10]
                if 'img' in b and 'img' not in o: o['img'] = urllib.parse.unquote(b['img']['value'].split('/')[-1])
            for t in chunk: out.setdefault(t, out.get(t, {}))
        except Exception as e:
            print('wikidata falhou', e, r.stdout[:120])
        time.sleep(1.5)
    return out


def download(url, dest, width=None):
    if os.path.exists(dest) and os.path.getsize(dest) > 1000: return True
    tmp = dest + '.src'
    r = subprocess.run(['curl', '-sSL', '-A', UA, '--max-time', '60', '-o', tmp, '-w', '%{http_code}', url], capture_output=True, text=True)
    if r.stdout != '200' or not os.path.exists(tmp) or os.path.getsize(tmp) < 1000:
        if os.path.exists(tmp): os.remove(tmp)
        return False
    args = ['convert', tmp]
    if width: args += ['-resize', '%dx%d>' % (width, width)]
    args += ['-quality', '78', dest]
    ok = subprocess.run(args, capture_output=True).returncode == 0
    os.remove(tmp)
    return ok and os.path.exists(dest)


def official_f2f3(series):
    """fotos oficiais de pilotos e carros (cloudinary do site da F2/F3)"""
    host = 'https://www.fiaformula2.com/en/teams' if series == 'f2' else 'https://www.fiaformula3.com/en/teams'
    f = os.path.join(CACHE, series + '_teams.html')
    if not os.path.exists(f) or os.path.getsize(f) < 5000:
        subprocess.run(['curl', '-sSL', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', '--max-time', '40', '-o', f, host])
    s = open(f, encoding='utf-8', errors='replace').read() if os.path.exists(f) else ''
    drivers, cars = {}, {}
    for m in re.finditer(r'https://res\.cloudinary\.com/prod-f2f3/[^"\s]*?/common/%s/2026/([a-z0-9]+)/([a-z]{6}\d\d)/2026\1\2right\.webp' % series, s):
        drivers[m.group(2)] = (m.group(1), 'https://res.cloudinary.com/prod-f2f3/c_lfill,w_420/q_auto/v1770000000/common/%s/2026/%s/%s/2026%s%sright.webp' % (series, m.group(1), m.group(2), m.group(1), m.group(2)))
    for m in re.finditer(r'https://res\.cloudinary\.com/prod-f2f3/[^"\s]*?/common/%s/2026/([a-z0-9]+)/2026\1carleft\.webp' % series, s):
        cars[m.group(1)] = 'https://res.cloudinary.com/prod-f2f3/c_lfill,w_900/q_auto/v1770000000/common/%s/2026/%s/2026%scarleft.webp' % (series, m.group(1), m.group(1))
    return drivers, cars


def code6(name):
    p = [x for x in re.split(r'\s+', unicodedata.normalize('NFD', name).encode('ascii', 'ignore').decode().lower()) if x and x not in ('jr', 'jr.', 'de', 'van', 'von', 'da', 'di')]
    if len(p) < 2: return set()
    first = re.sub(r'[^a-z]', '', p[0])[:3]
    return {first + re.sub(r'[^a-z]', '', x)[:3] for x in p[1:]}


PALETTE = ['#e10600', '#00a3e0', '#ff8700', '#2b4562', '#00d2be', '#f596c8', '#9b0000', '#006f62', '#b6babd', '#fcd700', '#5e8faa', '#7a4bd8', '#2e7d32', '#ef6c00', '#455a64', '#c2185b', '#1565c0', '#8d6e63']
TEAM_COLORS = {'prema': '#d10000', 'art': '#1a1a1a', 'mp': '#ff6c00', 'hitech': '#8c8c8c', 'campos': '#e6b800', 'dams': '#1c3f94', 'trident': '#0047bb', 'rodin': '#111111', 'invicta': '#b8932c', 'aix': '#00b3a6', 'van-amersfoort': '#f39200', 'jenzer': '#a71930', 'r-ace': '#7a1fa2', 'kic': '#e4002b', 'saintéloc': '#004b87', 'us-racecars': '#c8102e', 'team-impul': '#00205b', 'docomo': '#d0001b', 'mugen': '#d0001b', 'tom-s': '#e60012', 'cerumo': '#002e6d', 'nakajima': '#004ea2', 'kondo': '#ffcc00', 'jaguar': '#1a1a1a', 'porsche': '#a6192e', 'nissan': '#c3002f', 'mahindra': '#e31837', 'andretti': '#e4002b', 'envision': '#00be77', 'ds-penske': '#b39a6b', 'mclaren': '#ff8000', 'maserati': '#002b5c', 'kiro': '#00a0de', 'cupra': '#9c4a2f', 'lola': '#003c71', 'citroen': '#da291c'}


def team_color(name, i):
    s = slug(name)
    for k, v in TEAM_COLORS.items():
        if k in s: return v
    return PALETTE[i % len(PALETTE)]


def main():
    out = {'source': 'Wikipedia (páginas das temporadas 2026), Wikidata, sites oficiais da F2/F3; fotos: sites oficiais e Wikimedia Commons', 'ref': time.strftime('%Y-%m-%d'), 'cats': []}
    for C in CATS:
        text = raw(C['page'])
        year = 2026
        ents = parse_entries(text, C)
        cal = parse_calendar(text, 2025 if C['id'] == 'fe' and False else year)
        st = parse_standings(text, 'driver')
        tst = parse_standings(text, 'team')
        if C['id'] == 'fe':
            # temporada 2025–26: datas de dezembro são de 2025
            for e in cal:
                if e['date'][5:7] == '12': e['date'] = '2025' + e['date'][4:]
        print(f"{C['id']:6} entradas {len(ents):3} · equipes {len(set(e['team'] for e in ents)):2} · etapas {len(cal):2} · classificação {len(st):3} · equipes {len(tst):2} · campeão {st[0][1] if st else '-'}")
        C['_ents'], C['_cal'], C['_st'], C['_tst'] = ents, cal, st, tst
    # datas de nascimento e imagens
    titles = sorted({e['wiki'] for C in CATS for e in C['_ents'] if e.get('wiki')})
    wd = wikidata(titles)
    print('wikidata:', len(wd), 'de', len(titles), 'com dados')
    os.makedirs(IMG_DIR, exist_ok=True)
    for C in CATS:
        ents, st = C['_ents'], C['_st']
        stpos = {x[1]: x for x in st}
        teams, tids = [], {}
        official_d, official_c = (official_f2f3(C['site']) if C.get('site') and not NO_IMG else ({}, {}))
        for e in ents:
            if e['team'] not in tids:
                tid = slug(e['team'])[:28] or 'equipe'
                tids[e['team']] = tid
                car = None
                if official_c:
                    s6 = re.sub(r'[^a-z0-9]', '', e['team'].lower())
                    for k, url in official_c.items():
                        if k == s6 or k in s6 or s6 in k or k.startswith(s6[:6]):
                            dest = os.path.join(IMG_DIR, C['id'], 'cars', tid + '.webp'); os.makedirs(os.path.dirname(dest), exist_ok=True)
                            if download(url, dest, 900): car = 'cats/%s/cars/%s.webp' % (C['id'], tid)
                            break
                local = os.path.join(IMG_DIR, C['id'], 'cars', tid + '.webp')
                if not car and os.path.exists(local): car = 'cats/%s/cars/%s.webp' % (C['id'], tid)  # fotos já baixadas (ex.: Fórmula E, site oficial)
                teams.append({'id': tid, 'name': e['team'], 'nat': e['tnat'], 'color': team_color(e['team'], len(teams)), 'carImg': car})
        drivers = []
        for e in ents:
            info = wd.get(e.get('wiki') or '', {})
            d = {'name': e['name'], 'nat': e['nat'], 'team': tids[e['team']], 'no': e['no'], 'dob': info.get('dob'), 'wiki': e.get('wiki')}
            s = stpos.get(e['name'])
            if not s:
                for k, v in stpos.items():
                    if k.split()[-1] == e['name'].split()[-1] and k[0] == e['name'][0]: s = v; break
            if s: d['pos'], d['pts'] = s[0], s[2]
            img = None
            if not NO_IMG:
                did = slug(e['name'])
                dest = os.path.join(IMG_DIR, 'drivers', did + '.webp'); os.makedirs(os.path.dirname(dest), exist_ok=True)
                if os.path.exists(dest): img = 'cats/drivers/%s.webp' % did
                codes = code6(e['name'])
                for code, (tslug, url) in official_d.items():
                    if code[:6] in codes and not img:
                        if download(url, dest, 420): img = 'cats/drivers/%s.webp' % did
                if not img and info.get('img'):
                    url = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + urllib.parse.quote(info['img']) + '?width=420'
                    if download(url, dest, 420): img = 'cats/drivers/%s.webp' % did
                    time.sleep(0.4)
            if not img and os.path.exists(os.path.join(IMG_DIR, 'drivers', slug(e['name']) + '.webp')): img = 'cats/drivers/%s.webp' % slug(e['name'])  # mantém fotos já baixadas
            d['img'] = img
            drivers.append(d)
        # nacionalidade: tabelas sem bandeira (NASCAR) usam a base de pilotos; sem dado, o país da categoria
        DEF_NAT = {'nascup': 'USA', 'stockcar': 'BRA', 'dtm': 'GER'}
        for d in drivers:
            if not d.get('nat'):
                d['nat'] = DBNAT.get(norm_name(d['name'])) or DEF_NAT.get(C['id']) or d.get('nat')
        if C['id'] == 'stockcar':
            for ev in C['_cal']: ev['nat'] = 'BRA'
        out['cats'].append({k: C[k] for k in ('id', 'name', 'short', 'tier', 'sl', 'races', 'range', 'age', 'color', 'season', 'page')} | {'crew': bool(C.get('crew'))} | {k: C[k] for k in ('brief', 'disc', 'women', 'playoffs', 'revived') if C.get(k) is not None} | {
            'teams': teams, 'drivers': drivers, 'calendar': C['_cal'], 'standings': C['_st'][:40], 'teamStandings': C['_tst'][:20]})
        print(f"{C['id']:6} fotos {sum(1 for d in drivers if d['img'])}/{len(drivers)} · carros {sum(1 for t in teams if t['carImg'])}/{len(teams)} · nascimento {sum(1 for d in drivers if d['dob'])}/{len(drivers)}")
    js = 'const REAL_CATS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
    open(os.path.join(ROOT, 'app', 'data', 'categories.js'), 'w').write('/* Categorias (temporada 2026) — gerado por scripts/import_categories.py. Não editar à mão. */\n' + js)
    print('categories.js', len(js) // 1024, 'KB')


if __name__ == '__main__':
    main()
