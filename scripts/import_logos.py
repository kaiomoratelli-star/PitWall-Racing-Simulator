"""Logos de competições e equipes -> app/assets/img/logos/{categories,teams}/

Fonte: o campo "logo" da ficha (infobox) do artigo da Wikipedia em inglês; arquivo baixado
pela API (miniatura PNG). Imagens que parecem foto (muitas cores, sem transparência) são
descartadas: sem logo de verdade, o jogo usa a sigla. Logos são marcas dos titulares.
Uso: python3 scripts/import_logos.py [--teams] [--comps]
"""
import io, json, os, re, subprocess, sys, time, unicodedata, urllib.parse

ROOT = os.path.join(os.path.dirname(__file__), '..')
IMG = os.path.join(ROOT, 'app', 'assets', 'img')
SRC = os.path.join(IMG, 'sources.json')
UA = 'PitWallRacingSimulator/0.8 (fan project; https://github.com/kaiomoratelli-star/PitWall-Racing-Simulator)'
API = 'https://en.wikipedia.org/w/api.php'
CACHE = '/tmp/res/logos'; os.makedirs(CACHE, exist_ok=True)
sources = json.load(open(SRC)) if os.path.exists(SRC) else {}
TODAY = time.strftime('%Y-%m-%d')

# séries da base de pilotos (id do jogo -> artigo da Wikipedia)
SERIES = {
    'f1': 'Formula One', 'fe': 'Formula E', 'indycar': 'IndyCar Series', 'sf': 'Super Formula', 'f2': 'FIA Formula 2 Championship', 'f3': 'FIA Formula 3 Championship',
    'f1a': 'F1 Academy', 'freca': 'Formula Regional European Championship', 'frme': 'Formula Regional Middle East Trophy', 'fram': 'Formula Regional Americas Championship',
    'frj': 'Formula Regional Japanese Championship', 'froc': 'Formula Regional Oceania Championship', 'eurocup3': 'Eurocup-3', 'efo': 'Euroformula Open Championship',
    'gb3': 'GB3 Championship', 'fws': 'Formula Winter Series', 'f4it': 'Italian F4 Championship', 'f4es': 'F4 Spanish Championship', 'f4gb': 'F4 British Championship',
    'e4': 'E4 Championship', 'f4br': 'F4 Brazilian Championship', 'f4us': 'Formula 4 United States Championship', 'f4jp': 'F4 Japanese Championship',
    'f4uae': 'F4 Middle East Championship', 'f4cez': 'Formula 4 CEZ Championship', 'f4au': 'Australian Formula 4 Championship', 'f4de': 'ADAC Formula 4',
    'nxt': 'Indy NXT', 'usfpro': 'USF Pro 2000 Championship', 'usf2000': 'USF2000 Championship', 'sfl': 'Super Formula Lights', 'wec': 'FIA World Endurance Championship',
    'imsa': 'IMSA SportsCar Championship', 'elms': 'European Le Mans Series', 'alms': 'Asian Le Mans Series', 'nascup': 'NASCAR Cup Series',
    'nasxf': "NASCAR O'Reilly Auto Parts Series", 'nastr': 'NASCAR Craftsman Truck Series', 'dtm': 'Deutsche Tourenwagen Masters', 'stockcar': 'Stock Car Pro Series',
    'supercars': 'Supercars Championship', 'kart': 'FIA Karting World Championship',
}


def slug(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def get(url, binary=False, tries=3):
    for i in range(tries):
        r = subprocess.run(['curl', '-sSL', '-A', UA, '--max-time', '40', '-w', '\n%{http_code}', url], capture_output=True)
        body, code = r.stdout.rsplit(b'\n', 1) if b'\n' in r.stdout else (r.stdout, b'0')
        if code == b'200': return body if binary else body.decode('utf-8', 'ignore')
        if code in (b'404', b'400', b'403'): return None
        time.sleep(4 * (i + 1))
    return None


def api(params):
    key = os.path.join(CACHE, slug(json.dumps(params, sort_keys=True))[:180] + '.json')
    if os.path.exists(key): return json.load(open(key))
    t = get(API + '?' + urllib.parse.urlencode({**params, 'format': 'json'}))
    j = json.loads(t) if t else None
    if j is not None: json.dump(j, open(key, 'w'))
    time.sleep(0.35)
    return j


def wikitext(title):
    j = api({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main', 'redirects': 1, 'titles': title})
    try:
        p = next(iter(j['query']['pages'].values()))
        return p['title'], p['revisions'][0]['slots']['main']['*']
    except Exception:
        return None, None


LOGO_RE = re.compile(r'\|\s*(?:logo|logo_image|image_logo|logo_file)\s*=\s*(?:\[\[(?:File|Image):)?([^|\]\n{}]+\.(?:svg|png|jpg|jpeg|gif|webp))', re.I)
IMG_RE = re.compile(r'\|\s*(?:image|image_file)\s*=\s*(?:\[\[(?:File|Image):)?([^|\]\n{}]*(?:logo|emblem|wordmark|badge|crest)[^|\]\n{}]*\.(?:svg|png|jpg|jpeg|gif|webp))', re.I)


def logo_file(text):
    m = LOGO_RE.search(text) or IMG_RE.search(text)
    return m.group(1).strip() if m else None


def thumb(fname):
    j = api({'action': 'query', 'prop': 'imageinfo', 'iiprop': 'url', 'iiurlwidth': 330, 'titles': 'File:' + fname})
    try:
        p = next(iter(j['query']['pages'].values()))
        ii = p['imageinfo'][0]
        return ii.get('thumburl') or ii['url'], ii.get('descriptionurl')
    except Exception:
        return None, None


def looks_like_logo(im):
    from PIL import Image
    a = im.convert('RGBA')
    if a.getchannel('A').getextrema()[0] < 200: return True       # tem transparência: logo
    # logo: poucas cores dominam a imagem (áreas chapadas); foto: cores espalhadas
    small = a.convert('RGB').resize((64, 64)).quantize(colors=32)
    hist = sorted(small.histogram()[:32], reverse=True)
    top = sum(hist[:6]) / max(1, sum(hist))
    return top >= 0.36


def save_logo(kind, key, fname, page):
    from PIL import Image
    d = os.path.join(IMG, 'logos', kind); os.makedirs(d, exist_ok=True)
    dest = os.path.join(d, slug(key) + '.png')
    if os.path.exists(dest): return 'ok'
    url, desc = thumb(fname)
    if not url: return None
    b = get(url, binary=True)
    if not b: return None
    try:
        im = Image.open(io.BytesIO(b))
        if not looks_like_logo(im): return 'foto'
        im = im.convert('RGBA'); im.thumbnail((320, 320)); im.save(dest, 'PNG', optimize=True)
    except Exception:
        return None
    sources[f'logos/{kind}/{os.path.basename(dest)}'] = {'origin': 'Wikipedia (logo da ficha do artigo; marca registrada do titular)', 'page': desc or ('https://en.wikipedia.org/wiki/' + urllib.parse.quote(page.replace(' ', '_'))), 'date': TODAY}
    time.sleep(0.5)
    return 'ok'


def search_title(name, hint):
    j = api({'action': 'query', 'list': 'search', 'srlimit': 5, 'srsearch': f'{name} {hint}'})
    toks = {t for t in slug(name).split('-') if len(t) > 2 and t not in ('racing', 'team', 'motorsport', 'motorsports', 'with')}
    for r in (j or {}).get('query', {}).get('search', []):
        st = set(slug(r['title']).split('-'))
        if toks and len(toks & st) >= max(1, min(2, len(toks))): return r['title']
    return None


def comps():
    got = 0
    for sid, title in SERIES.items():
        t, text = wikitext(title)
        f = logo_file(text) if text else None
        r = save_logo('categories', sid, f, t or title) if f else None
        got += r == 'ok'
        print(f'competição {sid:9} {title:42} -> {r or "sem logo"}', flush=True)
    print('competições com logo:', got, '/', len(SERIES))


# instituções, organizadores e fornecedores de pneus (V0.8.2)
INST = {'aco': "Automobile Club de l'Ouest", 'imsa': 'International Motor Sports Association', 'formula-one-group': 'Formula One Group',
        'nascar': 'NASCAR', 'indycar': 'IndyCar', 'fia': 'Fédération Internationale de l\'Automobile', 'jaf': 'Japan Automobile Federation',
        'cbsa': 'Confederação Brasileira de Automobilismo', 'itr': 'ITR (company)', 'motorsport-uk': 'Motorsport UK', 'aci': "Automobile Club d'Italia"}
TYRES = {'pirelli': 'Pirelli', 'hankook': 'Hankook Tire', 'bridgestone': 'Bridgestone', 'firestone': 'Firestone Tire and Rubber Company', 'goodyear': 'Goodyear Tire and Rubber Company',
         'yokohama': 'Yokohama Rubber Company', 'michelin': 'Michelin', 'dunlop': 'Dunlop Tyres', 'kumho': 'Kumho Tire'}
MISSING_COMPS = {'fram': 'Formula Regional Americas Championship', 'e4': 'E4 Championship', 'f4cez': 'Formula 4 CEZ Championship', 'fws': 'Formula Winter Series'}


def inst():
    for kind, table in (('institutions', INST), ('tyres', TYRES), ('categories', MISSING_COMPS)):
        for key, title in table.items():
            t, text = wikitext(title)
            f = logo_file(text) if text else None
            r = save_logo(kind, key, f, t or title) if f else None
            print(f'{kind:12} {key:18} {title:42} -> {r or "sem logo"}', flush=True)


def inst_wd():
    """instituições e categorias sem logo na ficha: logo (P154) do item na Wikidata"""
    global API
    for kind, table in (('institutions', INST), ('tyres', TYRES), ('categories', MISSING_COMPS)):
        for key, title in table.items():
            dest = os.path.join(IMG, 'logos', kind, slug(key) + '.png')
            if os.path.exists(dest): continue
            API = 'https://www.wikidata.org/w/api.php'
            j = api({'action': 'wbsearchentities', 'search': title, 'language': 'en', 'type': 'item', 'limit': 3})
            f = None
            for e in (j or {}).get('search', [])[:3]:
                c = api({'action': 'wbgetclaims', 'entity': e['id'], 'property': 'P154'})
                cl = (c or {}).get('claims', {}).get('P154') or []
                if cl: f = cl[0]['mainsnak'].get('datavalue', {}).get('value'); break
            API = 'https://commons.wikimedia.org/w/api.php'
            r = save_logo(kind, key, f, title) if f else None
            print(f'wikidata {kind:12} {key:18} -> {r or "sem logo"}', flush=True)
    API = 'https://en.wikipedia.org/w/api.php'


def teams():
    t = open(os.path.join(ROOT, 'app', 'data', 'categories.js'), encoding='utf-8').read()
    cats = json.loads(t[t.index('{'):t.rstrip().rindex('}') + 1])['cats']
    names = {}
    for c in cats:
        hint = {'nascup': 'NASCAR team', 'stockcar': 'Stock Car team', 'dtm': 'DTM team', 'wec': 'endurance racing team', 'indycar': 'IndyCar team'}.get(c['id'], 'motor racing team')
        for tm in c['teams']: names.setdefault(tm['name'], hint)
    t2 = open(os.path.join(ROOT, 'app', 'data', 'real-db.js'), encoding='utf-8').read()
    for m in re.finditer(r'"name":"([^"]+?)","short":"[A-Z]{2,4}"', t2): names.setdefault(m.group(1), 'Formula One team')
    got = foto = 0
    for name, hint in sorted(names.items()):
        dest = os.path.join(IMG, 'logos', 'teams', slug(name.split(' (')[0]) + '.png')
        if os.path.exists(dest): got += 1; continue
        base = re.sub(r'\s+(with|by|powered by)\s+.*$', '', name, flags=re.I)
        cand = [base, base + ' (racing team)', base + ' (motorsport)']
        r = None
        for title in cand + [search_title(base, hint)]:
            if not title: continue
            pt, text = wikitext(title)
            if not text or '{{disambiguation' in text.lower(): continue
            f = logo_file(text)
            if not f: continue
            r = save_logo('teams', name.split(' (')[0], f, pt)
            if r: break
        got += r == 'ok'; foto += r == 'foto'
        print(f'equipe {name:45} -> {r or "sem logo"}', flush=True)
    print('equipes com logo:', got, '/', len(names), '· recusadas por parecer foto:', foto)


def wikidata_pass():
    """Segunda fonte: logo (P154) do item da equipe na Wikidata (arquivo do Commons)."""
    global API
    t = open(os.path.join(ROOT, 'app', 'data', 'categories.js'), encoding='utf-8').read()
    cats = json.loads(t[t.index('{'):t.rstrip().rindex('}') + 1])['cats']
    names = sorted({tm['name'] for c in cats for tm in c['teams']})
    got = 0
    for name in names:
        dest = os.path.join(IMG, 'logos', 'teams', slug(name.split(' (')[0]) + '.png')
        if os.path.exists(dest): continue
        base = re.sub(r'\s+(with|by|powered by)\s+.*$', '', name, flags=re.I)
        base = re.sub(r'\s*#\d+$', '', base)
        API = 'https://www.wikidata.org/w/api.php'
        j = api({'action': 'wbsearchentities', 'search': base, 'language': 'en', 'type': 'item', 'limit': 5})
        f = None
        for e in (j or {}).get('search', [])[:5]:
            c = api({'action': 'wbgetclaims', 'entity': e['id'], 'property': 'P154'})
            cl = (c or {}).get('claims', {}).get('P154') or []
            if cl:
                f = cl[0]['mainsnak'].get('datavalue', {}).get('value'); break
        API = 'https://commons.wikimedia.org/w/api.php'
        r = save_logo('teams', name.split(' (')[0], f, base) if f else None
        got += r == 'ok'
        print(f'wikidata {name:45} -> {r or "sem logo"}', flush=True)
    API = 'https://en.wikipedia.org/w/api.php'
    print('logos novos pela Wikidata:', got)


def langs_pass():
    """Terceira fonte: Wikipedias em outros idiomas (busca pelo nome; campo de logo da ficha)."""
    global API
    t = open(os.path.join(ROOT, 'app', 'data', 'categories.js'), encoding='utf-8').read()
    cats = json.loads(t[t.index('{'):t.rstrip().rindex('}') + 1])['cats']
    names = sorted({tm['name'] for c in cats for tm in c['teams']})
    got = 0
    for name in names:
        dest = os.path.join(IMG, 'logos', 'teams', slug(name.split(' (')[0]) + '.png')
        if os.path.exists(dest): continue
        base = re.sub(r'\s+(with|by|powered by)\s+.*$', '', name, flags=re.I)
        base = re.sub(r'\s*#\d+$', '', base)
        r = None
        for lang in ('it', 'de', 'fr', 'es', 'pt', 'ja', 'nl'):
            API = f'https://{lang}.wikipedia.org/w/api.php'
            title = search_title(base, '')
            if not title: continue
            pt, text = wikitext(title)
            if not text: continue
            m = re.search(r'\|\s*(?:logo|Logo|logotipo|logotype|immagine_logo|image_logo)\s*=\s*(?:\[\[(?:\w+):)?([^|\]\n{}]+\.(?:svg|png|jpg|jpeg|gif))', text)
            if not m: continue
            r = save_logo('teams', name.split(' (')[0], m.group(1).strip(), pt)
            if r == 'ok': break
        got += r == 'ok'
        print(f'idiomas {name:45} -> {r or "sem logo"}', flush=True)
    API = 'https://en.wikipedia.org/w/api.php'
    print('logos novos em outros idiomas:', got)


if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or '--comps' in a: comps(); json.dump(sources, open(SRC, 'w'), ensure_ascii=False, indent=0)
    if not a or '--teams' in a: teams(); json.dump(sources, open(SRC, 'w'), ensure_ascii=False, indent=0)
    if not a or '--wd' in a: wikidata_pass(); json.dump(sources, open(SRC, 'w'), ensure_ascii=False, indent=0)
    if not a or '--langs' in a: langs_pass(); json.dump(sources, open(SRC, 'w'), ensure_ascii=False, indent=0)
    if '--inst' in a: inst(); inst_wd(); json.dump(sources, open(SRC, 'w'), ensure_ascii=False, indent=0)
