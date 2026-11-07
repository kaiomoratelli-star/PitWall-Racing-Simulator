#!/usr/bin/env python3
"""Conferência com o DriverDB (driverdb.com) — V0.8.2.

1. Baixa as classificações de 2026 das séries do jogo e a página de cada piloto (dados estruturados
   schema.org: nome, nascimento, nacionalidade, foto, equipe atual).
2. Gera app/data/driverdb-2026.js (DRIVERDB_2026): por série, [slug, nome, número, equipe, pontos, posição];
   por pessoa, nascimento, nacionalidade, equipe e a URL da foto.
3. --photos: baixa as fotos da lista scripts/.driverdb-photo-todo.json (gerada por scripts/driverdb-photos.js,
   que decide no jogo quem não tem foto), recorta com o rosto no centro (mesmo método de import_images.py)
   e grava em app/assets/img/faces/ddb/<slug>.webp.

O DriverDB é fonte de conferência, não de verdade: o jogo só usa estes dados para preencher o que falta
(apelidos, nascimento ausente, foto ausente) e para o relatório docs/VERIFICACAO-DATABASE.md. Divergências
com a Wikipedia/Wikidata ficam registradas, não sobrescritas.

Downloads resilientes: cache em /tmp/res/driverdb (retoma de onde parou), um pedido a cada ~0,7 s,
arquivos válidos nunca são baixados de novo nem substituídos por arquivos incompletos.

Uso: python3 scripts/import_driverdb.py [--photos] [--no-people]"""
import html, io, json, os, re, subprocess, sys, time, datetime

ROOT = os.path.join(os.path.dirname(__file__), '..')
CACHE = '/tmp/res/driverdb'
IMG = os.path.join(ROOT, 'app', 'assets', 'img')
SRC = os.path.join(IMG, 'sources.json')
UA = 'Mozilla/5.0 (compatible; PitWallRacingSimulator/0.8.2; fan project)'
TODAY = datetime.date.today().isoformat()
os.makedirs(CACHE, exist_ok=True)

# série do jogo → endereço no DriverDB
SERIES = {
    'f1': 'formula-1', 'f2': 'fia-formula-2', 'f3': 'fia-formula-3', 'fe': 'fia-formula-e-championship', 'indycar': 'indycar-series',
    'wec': 'fia-world-endurance-championship-2', 'dtm': 'dtm', 'nascup': 'nascar-sprint-cup-series', 'stockcar': 'stock-car-brasil',
    'sf': 'super-formula', 'f1a': 'f1-academy', 'freca': 'formula-regional-european-championship', 'f4it': 'italian-f4-championship',
    'f4es': 'f4-spanish-championship', 'f4br': 'f4-brazilian-championship', 'e4': 'euro-4-championship', 'frj': 'formula-regional-japanese-championship',
    'sfl': 'super-formula-lights', 'nastr': 'nascar-truck-series', 'supercars': 'v8-supercar-championship-series', 'eurocup3': 'eurocup-3', 'fws': 'formula-winter-series',
}
DEMONYM = {
    'Australian': 'AUS', 'British': 'GBR', 'English': 'GBR', 'Scottish': 'GBR', 'Welsh': 'GBR', 'Northern Irish': 'GBR', 'American': 'USA', 'Brazilian': 'BRA', 'Italian': 'ITA',
    'German': 'GER', 'French': 'FRA', 'Spanish': 'ESP', 'Dutch': 'NED', 'Belgian': 'BEL', 'Swiss': 'SUI', 'Austrian': 'AUT', 'Finnish': 'FIN', 'Swedish': 'SWE', 'Danish': 'DEN',
    'Norwegian': 'NOR', 'Polish': 'POL', 'Czech': 'CZE', 'Hungarian': 'HUN', 'Portuguese': 'POR', 'Irish': 'IRL', 'Mexican': 'MEX', 'Canadian': 'CAN', 'Argentine': 'ARG',
    'Argentinian': 'ARG', 'Colombian': 'COL', 'Chilean': 'CHI', 'Venezuelan': 'VEN', 'Uruguayan': 'URU', 'Peruvian': 'PER', 'Japanese': 'JPN', 'Chinese': 'CHN', 'Korean': 'KOR',
    'South Korean': 'KOR', 'Indian': 'IND', 'Thai': 'THA', 'Indonesian': 'INA', 'Malaysian': 'MAS', 'Singaporean': 'SGP', 'Filipino': 'PHI', 'New Zealander': 'NZL', 'New Zealand': 'NZL',
    'South African': 'RSA', 'Monegasque': 'MON', 'Monacan': 'MON', 'Russian': 'RUS', 'Ukrainian': 'UKR', 'Estonian': 'EST', 'Latvian': 'LAT', 'Lithuanian': 'LTU', 'Romanian': 'ROU',
    'Bulgarian': 'BUL', 'Greek': 'GRE', 'Turkish': 'TUR', 'Israeli': 'ISR', 'Emirati': 'UAE', 'Saudi': 'KSA', 'Saudi Arabian': 'KSA', 'Qatari': 'QAT', 'Kuwaiti': 'KUW', 'Omani': 'OMA',
    'Bahraini': 'BRN', 'Lebanese': 'LBN', 'Egyptian': 'EGY', 'Moroccan': 'MAR', 'Kenyan': 'KEN', 'Zimbabwean': 'ZIM', 'Hong Kong': 'HKG', 'Hongkonger': 'HKG', 'Taiwanese': 'TPE',
    'Vietnamese': 'VIE', 'Croatian': 'CRO', 'Slovenian': 'SLO', 'Slovak': 'SVK', 'Serbian': 'SRB', 'Luxembourgish': 'LUX', 'Liechtensteiner': 'LIE', 'Icelandic': 'ISL', 'Cypriot': 'CYP',
    'Maltese': 'MLT', 'Kazakh': 'KAZ', 'Kazakhstani': 'KAZ', 'Georgian': 'GEO', 'Armenian': 'ARM', 'Belarusian': 'BLR', 'Bolivian': 'BOL', 'Ecuadorian': 'ECU', 'Paraguayan': 'PAR',
    'Portugese': 'POR', 'Quatari': 'QAT', 'Monégasque': 'MON', 'Paraguay': 'PAR', 'Kyrgyz': 'KGZ', 'Andorran': 'AND', 'Angolan': 'ANG', 'Hong Konger': 'HKG',
    'Costa Rican': 'CRI', 'Guatemalan': 'GUA', 'Puerto Rican': 'PUR', 'Dominican': 'DOM', 'Jamaican': 'JAM', 'Barbadian': 'BRB', 'Pakistani': 'PAK', 'Sri Lankan': 'LKA', 'Macanese': 'MAC',
}


def get(url, cache_name=None, binary=False, tries=4):
    f = os.path.join(CACHE, cache_name) if cache_name else None
    if f and os.path.exists(f) and os.path.getsize(f) > 2000:
        return open(f, 'rb').read() if binary else open(f, encoding='utf-8', errors='ignore').read()
    for i in range(tries):
        r = subprocess.run(['curl', '-sSL', '-A', UA, '--max-time', '40', '-w', '\n%{http_code}', url], capture_output=True)
        body, code = r.stdout.rsplit(b'\n', 1) if b'\n' in r.stdout else (r.stdout, b'0')
        time.sleep(0.7)
        if code == b'200' and len(body) > 2000:
            if f:
                tmp = f + '.part'; open(tmp, 'wb').write(body); os.replace(tmp, f)   # nunca deixa arquivo incompleto
            return body if binary else body.decode('utf-8', 'ignore')
        if code in (b'404', b'410'): return None
        time.sleep(3 * (i + 1) if code != b'429' else 15 * (i + 1))
    return None


def standings(sid, slug):
    s = get(f'https://www.driverdb.com/championships/{slug}/2026/standings', f'st_{sid}.html')
    if not s: return []
    out = []
    for r in re.findall(r'<tr data-slot="table-row".*?</tr>', s, flags=re.S)[1:]:
        m = re.findall(r'd1=([a-z0-9-]+)', r)
        if not m: continue
        parts = [p.strip() for p in html.unescape(re.sub(r'<[^>]+>', '|', r)).split('|') if p.strip()]
        pos = int(parts[0]) if parts and parts[0].isdigit() else None
        name = parts[1] if len(parts) > 1 else m[0]
        no = parts[2] if len(parts) > 2 and re.fullmatch(r'\d{1,3}', parts[2]) else ''
        team = parts[3] if no and len(parts) > 3 else (parts[2] if len(parts) > 2 and not no else '')
        pts = None
        for p in reversed(parts):
            if re.fullmatch(r'\d+(?:\.\d+)?', p.replace(',', '')) and not p.startswith(('+', '-')):
                pts = float(p.replace(',', '')); break
        out.append([m[0], name, no, team, pts, pos])
    return out


def person(slug):
    s = get(f'https://www.driverdb.com/drivers/{slug}', f'p_{slug}.html')
    if not s: return None
    m = re.search(r'"@type":"Person"(.*?)(?:"@type":"(?:WebPage|BreadcrumbList)"|$)', s, flags=re.S)
    blob = m.group(1) if m else ''
    def field(k):
        mm = re.search(r'"' + k + r'":"([^"]*)"', blob)
        return html.unescape(mm.group(1)) if mm else None
    nat = re.search(r'"nationality":\{"@type":"Country","name":"([^"]+)"', blob)
    team = re.search(r'"memberOf":\{"@type":"SportsTeam","name":"([^"]+)"(?:,"logo":"([^"]+)")?', blob)
    natname = nat.group(1) if nat else None
    return {'name': field('name'), 'dob': field('birthDate'), 'natName': natname, 'nat': DEMONYM.get(natname) if natname else None,
            'img': field('image'), 'team': html.unescape(team.group(1)) if team else None, 'teamLogo': team.group(2) if team and team.group(2) else None}


def photos():
    import cv2, numpy as np
    from PIL import Image
    todo_f = os.path.join(os.path.dirname(__file__), '.driverdb-photo-todo.json')
    if not os.path.exists(todo_f): print('sem lista de fotos: rode node scripts/driverdb-photos.js'); return
    todo = json.load(open(todo_f))
    out_dir = os.path.join(IMG, 'faces', 'ddb'); os.makedirs(out_dir, exist_ok=True)
    sources = json.load(open(SRC)) if os.path.exists(SRC) else {}
    front = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    alt = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_alt2.xml')

    def center(im):
        rgb = im.convert('RGBA')
        bg = Image.new('RGB', rgb.size, (34, 36, 46)); bg.paste(rgb, mask=rgb.split()[3])
        arr = cv2.cvtColor(np.array(bg), cv2.COLOR_RGB2GRAY)
        H, Wd = arr.shape
        best = None
        for cas in (front, alt):
            fs = cas.detectMultiScale(arr, scaleFactor=1.08, minNeighbors=6, minSize=(max(28, Wd // 12), max(28, Wd // 12)))
            if len(fs): best = max(fs, key=lambda f: f[2] * f[3] - f[1] * 0.5); break
        side = min(H, Wd)
        if best is not None:
            x, y, w, h = best; cx, cy = x + w / 2, y + h * 0.5
            left = int(min(max(0, cx - side / 2), Wd - side)); top = int(min(max(0, cy - side / 2), H - side))
        else:
            left = (Wd - side) // 2; top = 0 if H > Wd else (H - side) // 2
        return bg.crop((left, top, left + side, top + side)).resize((256, 256), Image.LANCZOS), best is not None

    ok = fail = skip = 0
    for t in todo:
        dest = os.path.join(out_dir, t['slug'] + '.webp')
        if os.path.exists(dest) and os.path.getsize(dest) > 1500: skip += 1; continue    # arquivo válido: não baixa de novo
        b = get(t['url'], 'img_' + t['slug'] + '.bin', binary=True)
        try:
            im = Image.open(io.BytesIO(b)); im.load()
            if min(im.size) < 80: raise ValueError('pequena demais')
            face, found = center(im)
            tmp = dest + '.part.webp'; face.save(tmp, 'WEBP', quality=80); os.replace(tmp, dest)
            sources['faces/ddb/' + t['slug'] + '.webp'] = {'origin': 'DriverDB (driverdb.com), recorte centralizado' + ('' if found else ' (sem rosto detectado)'), 'page': 'https://www.driverdb.com/drivers/' + t['slug'], 'date': TODAY}
            ok += 1
        except Exception as e:
            fail += 1
    tmp = SRC + '.part'; json.dump(sources, open(tmp, 'w'), ensure_ascii=False, indent=0); os.replace(tmp, SRC)
    print(f'fotos: {ok} novas, {skip} já existiam, {fail} falharam')


def team_logos():
    from PIL import Image
    todo_f = os.path.join(os.path.dirname(__file__), '.driverdb-logo-todo.json')
    if not os.path.exists(todo_f): return
    sources = json.load(open(SRC)) if os.path.exists(SRC) else {}
    out_dir = os.path.join(IMG, 'logos', 'teams'); ok = 0
    for t in json.load(open(todo_f)):
        dest = os.path.join(out_dir, t['slug'] + '.png')
        if os.path.exists(dest): continue
        b = get(t['url'], 'logo_' + t['slug'] + '.bin', binary=True)
        try:
            im = Image.open(io.BytesIO(b)); im.load()
            if min(im.size) < 24: raise ValueError('pequeno')
            im = im.convert('RGBA'); im.thumbnail((320, 320))
            tmp = dest + '.part.png'; im.save(tmp, 'PNG', optimize=True); os.replace(tmp, dest)
            sources['logos/teams/' + t['slug'] + '.png'] = {'origin': 'DriverDB (logo da equipe no perfil de piloto; marca registrada do titular)', 'page': 'https://www.driverdb.com', 'date': TODAY}
            ok += 1
        except Exception:
            pass
    tmp = SRC + '.part'; json.dump(sources, open(tmp, 'w'), ensure_ascii=False, indent=0); os.replace(tmp, SRC)
    print(f'logos de equipe: {ok} novos')


def main():
    if '--photos' in sys.argv: photos(); return team_logos()
    series, people = {}, {}
    for sid, slug in SERIES.items():
        rows = standings(sid, slug)
        series[sid] = rows
        print(f'{sid:9} {len(rows):3} pilotos', flush=True)
    if '--no-people' not in sys.argv:
        slugs = sorted({r[0] for rows in series.values() for r in rows})
        for i, sl in enumerate(slugs):
            p = person(sl)
            if p: people[sl] = p
            if i % 50 == 0: print(f'pessoas {i}/{len(slugs)}', flush=True)
    out = {'source': 'DriverDB (driverdb.com) — classificações 2026 e perfis de pilotos', 'verified': TODAY, 'series': series, 'people': people}
    js = '/* gerado por scripts/import_driverdb.py — não editar à mão. Fonte de CONFERÊNCIA (não substitui Wikipedia/Wikidata). */\nconst DRIVERDB_2026 = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
    dest = os.path.join(ROOT, 'app', 'data', 'driverdb-2026.js'); tmp = dest + '.part'
    open(tmp, 'w', encoding='utf-8').write(js); os.replace(tmp, dest)
    print('driverdb-2026.js', len(js) // 1024, 'KB', len(people), 'pessoas')


if __name__ == '__main__':
    main()
