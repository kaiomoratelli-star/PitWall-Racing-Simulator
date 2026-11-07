"""Lista oficial de circuitos licenciados pela FIA -> app/data/fia-circuits.js

Fonte: https://www.fia.com/circuit-safety  (PDF "List of FIA licensed circuits").
Uso: python3 scripts/import_fia_circuits.py caminho/para/circuits.txt
     (texto gerado com: pdftotext -layout circuits_fiaAAAAMMDD.pdf circuits.txt)
Só dados factuais da lista (nome, país, grau, extensão, lado da pole, validade, largura).
"""
import json, re, sys

src = sys.argv[1]
url = sys.argv[2] if len(sys.argv) > 2 else 'https://www.fia.com/sites/default/files/circuits_fia20261104.pdf'
txt = open(src, encoding='utf-8').read().splitlines()
updated = None
rows, seen = [], set()
row = re.compile(r'^(?P<name>\S.*?)\s{2,}(?P<cty>[A-Z]{3})\s+(?P<grade>[0-9A-Z]+)\s+(?P<len>\d+(?:\.\d+)?)\s+(?P<pole>Left|Right)?\s*(?P<exp>\d{2}\.\d{2}\.\d{4})\s+(?P<w>\d+(?:\.\d+)?)\s*$')
for line in txt:
    m = re.search(r'UPDATED ON : (\d{4}-\d{2}-\d{2})', line)
    if m: updated = m.group(1)
    m = row.match(line.strip())
    if not m: continue
    d = m.groupdict()
    dd, mm, yy = d['exp'].split('.')
    key = (d['name'].strip(), d['grade'])
    if key in seen: continue
    seen.add(key)
    rows.append({'name': re.sub(r'\s+', ' ', d['name'].strip()), 'country': d['cty'], 'grade': d['grade'], 'km': float(d['len']), 'pole': d['pole'] or None, 'expiry': f'{yy}-{mm}-{dd}', 'width': float(d['w'])})
out = {'meta': {'source': 'FIA — List of FIA licensed circuits', 'url': url, 'updated': updated, 'note': 'Dados factuais da lista oficial; licenças futuras no jogo são simuladas e não representam decisões reais da FIA.'}, 'list': rows}
open('app/data/fia-circuits.js', 'w', encoding='utf-8').write('/* gerado por scripts/import_fia_circuits.py — não editar à mão */\nconst FIA_CIRCUITS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
from collections import Counter
print(updated, len(rows), Counter(r['grade'] for r in rows))
