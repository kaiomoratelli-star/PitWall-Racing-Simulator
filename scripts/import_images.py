#!/usr/bin/env python3
"""Fase 2 da 0.8: imagens (retratos centralizados e logos).

1. Retratos: para cada piloto da base (DRIVER_DB) com foto no Wikimedia Commons, baixa a foto,
   detecta o rosto (OpenCV, cascata Haar frontal e de perfil) e recorta um quadrado com o rosto
   centralizado (olhos a ~40% da altura, rosto ocupando ~45% da largura). Saída 320x320 WebP em
   app/assets/img/faces/<uid>.webp. As fotos oficiais que o jogo já tem (drivers/*.webp) ganham a
   mesma versão centralizada em faces/<id>.webp, para tabelas e cards ficarem consistentes.
2. Logos: equipes de todas as categorias, fabricantes, fornecedores de pneus, patrocinadores,
   categorias e entidades, pela imagem principal do artigo da Wikipedia (pageimages), em
   app/assets/img/logos/<tipo>/<slug>.png.
Cada arquivo baixado ganha uma linha em app/assets/img/sources.json (origem, arquivo, data),
que scripts/make-asset-registry.js junta ao registro central.

Uso: python3 scripts/import_images.py [--faces] [--logos] [--limit N]"""
import io, json, os, re, subprocess, sys, time, unicodedata, urllib.parse, datetime

ROOT = os.path.join(os.path.dirname(__file__), '..')
IMG = os.path.join(ROOT, 'app', 'assets', 'img')
SRC = os.path.join(IMG, 'sources.json')
UA = 'PitWallRacingSimulator/0.8 (fan project; https://github.com/kaiomoratelli-star/PitWall-Racing-Simulator)'
TODAY = datetime.date.today().isoformat()
ARGS = sys.argv[1:]
LIMIT = int(ARGS[ARGS.index('--limit') + 1]) if '--limit' in ARGS else 10 ** 9
sources = json.load(open(SRC)) if os.path.exists(SRC) else {}


def slug(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def get(url, binary=True, tries=4):
    for i in range(tries):
        r = subprocess.run(['curl', '-sSL', '-A', UA, '--max-time', '60', '-w', '\n%{http_code}', url], capture_output=True)
        body, code = r.stdout.rsplit(b'\n', 1) if b'\n' in r.stdout else (r.stdout, b'0')
        if code == b'200': return body if binary else body.decode('utf-8', 'ignore')
        if code in (b'404', b'403'): return None
        time.sleep(4 * (i + 1))  # 429: o Commons limita o ritmo
    return None


def save_src(rel, origin, page):
    sources[rel] = {'origin': origin, 'page': page, 'date': TODAY}


# ---------- retratos ----------
def faces():
    import cv2, numpy as np
    from PIL import Image
    front = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    alt = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt2.xml')
    prof = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_profileface.xml')
    out_dir = os.path.join(IMG, 'faces'); os.makedirs(out_dir, exist_ok=True)

    def center(im):
        rgb = im.convert('RGBA')
        bg = Image.new('RGB', rgb.size, (34, 36, 46)); bg.paste(rgb, mask=rgb.split()[3])
        arr = cv2.cvtColor(np.array(bg), cv2.COLOR_RGB2GRAY)
        H, Wd = arr.shape
        best = None
        for cas, sc in ((front, 1.08), (alt, 1.08), (prof, 1.1)):
            fs = cas.detectMultiScale(arr, scaleFactor=sc, minNeighbors=5, minSize=(max(24, Wd // 20), max(24, Wd // 20)))
            if len(fs):
                # o maior rosto mais próximo do topo (fotos de corpo inteiro, pódios)
                best = max(fs, key=lambda f: f[2] * f[3] - f[1] * 0.5); break
        if best is not None:
            x, y, w, h = best
            side = min(int(w / 0.45), H, Wd)
            cx, cy = x + w / 2, y + h * 0.5
            left = int(min(max(0, cx - side / 2), Wd - side)); top = int(min(max(0, cy - side * 0.45), H - side))
            ok = True
        else:
            side = min(H, Wd); left = (Wd - side) // 2; top = 0 if H > Wd else (H - side) // 2; ok = False
        return bg.crop((left, top, left + side, top + side)).resize((320, 320), Image.LANCZOS), ok

    done = ok_n = 0
    # 1) fotos oficiais que já estão no jogo
    for f in sorted(os.listdir(os.path.join(IMG, 'drivers'))):
        if not f.endswith('.webp'): continue
        dest = os.path.join(out_dir, f)
        im, ok = center(Image.open(os.path.join(IMG, 'drivers', f)))
        im.save(dest, 'WEBP', quality=86); ok_n += ok; done += 1
        save_src('faces/' + f, 'formula1.com (Formula One Management), recorte centralizado', 'drivers/' + f)
    # 2) Commons para todos os pilotos da base
    db = open(os.path.join(ROOT, 'app', 'data', 'drivers-db.js'), encoding='utf-8').read()
    data = json.loads(db[db.index('{'):db.rstrip().rindex('}') + 1])
    todo = [d for d in data['drivers'] if d.get('img') and not os.path.exists(os.path.join(out_dir, d['uid'] + '.webp'))][:LIMIT]
    print(f'retratos: {done} oficiais centralizados; {len(todo)} do Commons para baixar', flush=True)
    for i, d in enumerate(todo):
        url = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + urllib.parse.quote(d['img'].replace(' ', '_')) + '?width=640'
        b = get(url)
        if not b: continue
        try:
            im, ok = center(Image.open(io.BytesIO(b)))
        except Exception:
            continue
        im.save(os.path.join(out_dir, d['uid'] + '.webp'), 'WEBP', quality=84)
        save_src('faces/' + d['uid'] + '.webp', 'Wikimedia Commons (licença do arquivo, ver página)', 'https://commons.wikimedia.org/wiki/File:' + d['img'].replace(' ', '_'))
        done += 1; ok_n += ok
        if i % 25 == 0:
            json.dump(sources, open(SRC, 'w'), ensure_ascii=False, indent=0)
            print(f'  {i + 1}/{len(todo)} ({ok_n} com rosto detectado)', flush=True)
        time.sleep(1.1)
    json.dump(sources, open(SRC, 'w'), ensure_ascii=False, indent=0)
    print(f'retratos prontos: {done} ({ok_n} com rosto detectado e centralizado)')


# ---------- logos ----------
LOGOS = {
    'manufacturers': ['Porsche', 'Lamborghini', 'Koenigsegg', 'BMW', 'Nissan', 'Honda', 'Peugeot', 'Audi', 'Ford Motor Company', 'Mercedes-Benz', 'Ferrari', 'Renault', 'Toyota', 'Hyundai Motor Company', 'Cadillac', 'Alpine (automobile)', 'Aston Martin', 'McLaren Automotive', 'Lexus', 'Chevrolet', 'Acura', 'Genesis Motor', 'Maserati', 'Alfa Romeo', 'Mazda', 'Stellantis', 'Volkswagen', 'Jaguar Cars', 'Lotus Cars', 'Red Bull Powertrains'],
    'tyres': ['Pirelli', 'Bridgestone', 'Michelin', 'Goodyear Tire and Rubber Company', 'Hankook Tire', 'Dunlop Tyres', 'Yokohama Rubber Company', 'Firestone Tire and Rubber Company', 'Kumho Tire', 'Continental AG'],
    'institutions': ['Fédération Internationale de l\'Automobile', 'Formula One Group', 'Automobile Club de l\'Ouest', 'IndyCar', 'NASCAR', 'International Motor Sports Association', 'SRO Motorsports Group', 'Confederação Brasileira de Automobilismo', 'Automobile Club d\'Italia', 'Motorsport UK', 'Fédération Française du Sport Automobile', 'ADAC', 'Japan Automobile Federation', 'Motorsport Australia', 'Real Federación Española de Automovilismo', 'Automobile Competition Committee for the United States'],
    'categories': ['Formula One', 'FIA Formula 2 Championship', 'FIA Formula 3 Championship', 'F1 Academy', 'Formula E', 'IndyCar Series', 'Indy NXT', 'USF Pro 2000 Championship', 'USF2000 Championship', 'Super Formula', 'Super Formula Lights', 'FIA World Endurance Championship', 'IMSA SportsCar Championship', 'European Le Mans Series', 'Asian Le Mans Series', 'NASCAR Cup Series', "NASCAR O'Reilly Auto Parts Series", 'NASCAR Craftsman Truck Series', 'Deutsche Tourenwagen Masters', 'Stock Car Pro Series', 'Supercars Championship', 'Formula Regional European Championship', 'Formula Regional Middle East Trophy', 'Formula Regional Americas Championship', 'Formula Regional Japanese Championship', 'Eurocup-3', 'Euroformula Open Championship', 'GB3 Championship', 'Italian F4 Championship', 'F4 Spanish Championship', 'F4 British Championship', 'F4 Brazilian Championship', 'Formula 4 United States Championship', 'F4 Japanese Championship', 'E4 Championship', 'GT World Challenge Europe', 'TCR International Series', 'FIA Karting World Championship'],
    'sponsors': ['Petronas', 'Shell plc', 'Santander Group', 'Mastercard', 'Oracle Corporation', 'Visa Inc.', 'Aramco', 'Cognizant', 'Hewlett-Packard', 'IBM', 'UniCredit', 'Qualcomm', 'Microsoft', 'TeamViewer', 'Google', 'DP World', 'Dell Technologies', 'Hugo Boss', 'Block, Inc.', 'BWT AG', 'Castore', 'Kick (service)', 'Atlassian', 'Duracell', 'Gulf Oil', 'Revolut', 'Adidas', 'BP', 'MoneyGram', 'Stake (online casino)', 'Tommy Hilfiger', 'Gucci', 'Heineken N.V.', 'Rolex', 'DHL', 'Lenovo', 'Amazon Web Services', 'Salesforce', 'Crypto.com', 'Moët Hennessy', 'LVMH', 'Puma (brand)', 'Puma SE', 'Pepe Jeans', 'Valvoline', 'Coca-Cola', 'Monster Energy', 'Red Bull GmbH', 'Ineos', 'Haas Automation', 'Kraken (company)', 'Globant', 'Bybit', 'Okta, Inc.', 'Workday, Inc.', 'Snowflake Inc.', 'Mobil 1', 'Castrol', 'Motul', 'Tag Heuer', 'Richard Mille', 'Ray-Ban', 'Tissot', 'Lego', 'Uber', 'Allwyn (company)', 'Bitpanda', 'Stellantis', 'Chandon (winery)', 'Ferrari Trento'],
}


def page_image(title):
    q = 'https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=pageimages|pageprops&piprop=original|thumbnail&pithumbsize=320&titles=' + urllib.parse.quote(title)
    t = get(q, binary=False)
    if not t: return None, None
    try:
        pages = json.loads(t)['query']['pages']
        p = next(iter(pages.values()))
        img = (p.get('thumbnail') or p.get('original') or {}).get('source')
        return img, p.get('pageimage')
    except Exception:
        return None, None


def team_titles():
    """equipes de todas as séries da base, pelos links de equipe das páginas de temporada"""
    db = open(os.path.join(ROOT, 'app', 'data', 'drivers-db.js'), encoding='utf-8').read()
    data = json.loads(db[db.index('{'):db.rstrip().rindex('}') + 1])
    teams = {}
    for d in data['drivers']:
        for s in d['seasons']:
            if s.get('team') and s['y'] >= 2025: teams[s['team']] = teams.get(s['team'], 0) + 1
    return [t for t, n in sorted(teams.items(), key=lambda x: -x[1]) if len(t) > 2]


def logos():
    from PIL import Image
    groups = dict(LOGOS)
    groups['teams'] = team_titles()
    for kind, titles in groups.items():
        d = os.path.join(IMG, 'logos', kind); os.makedirs(d, exist_ok=True)
        got = 0
        for title in titles[:LIMIT]:
            dest = os.path.join(d, slug(title.split(' (')[0]) + '.png')
            if os.path.exists(dest): got += 1; continue
            url, fname = page_image(title)
            time.sleep(0.5)
            if not url: continue
            # foto de pessoa ou de carro não é logo: aceita arquivos com cara de logo ou SVG
            if kind != 'teams' and fname and not re.search(r'(logo|\.svg|emblem|wordmark|badge|symbol|icon)', fname, re.I): continue
            if kind == 'teams' and fname and not re.search(r'(logo|\.svg|emblem|wordmark|badge)', fname, re.I): continue
            b = get(url)
            if not b: continue
            try:
                im = Image.open(io.BytesIO(b)).convert('RGBA'); im.thumbnail((320, 320)); im.save(dest, 'PNG', optimize=True)
            except Exception:
                continue
            rel = f'logos/{kind}/{os.path.basename(dest)}'
            save_src(rel, 'Wikipedia/Wikimedia (logo; marca registrada do titular)', 'https://en.wikipedia.org/wiki/' + urllib.parse.quote(title.replace(' ', '_')))
            got += 1
            time.sleep(0.8)
        json.dump(sources, open(SRC, 'w'), ensure_ascii=False, indent=0)
        print(f'logos {kind}: {got}/{len(titles)}', flush=True)


if __name__ == '__main__':
    if '--faces' in ARGS or not ARGS or ARGS == ['--limit', str(LIMIT)]: faces()
    if '--logos' in ARGS or not [a for a in ARGS if a.startswith('--') and a != '--limit']: logos()
