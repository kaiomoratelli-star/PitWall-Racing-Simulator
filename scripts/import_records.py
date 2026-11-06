#!/usr/bin/env python3
"""Recordes reais por circuito e linhagem das equipes a partir do f1db (CC BY 4.0).
Uso: python3 scripts/import_records.py /caminho/para/f1db.json
Gera app/data/records.js (REAL_RECORDS)."""
import json, os, sys

F = json.load(open(sys.argv[1] if len(sys.argv) > 1 else '/tmp/f1db/f1db.json'))
root = os.path.join(os.path.dirname(__file__), '..')

def ms(t):
    return t if isinstance(t, int) else None

eff = {}
for c in F['circuits']:
    lay = [l for l in (c.get('layouts') or []) if l.get('effective')]
    eff[c['id']] = lay[-1]['id'] if lay else None

circ = {}
for r in F['races']:
    cid = r['circuitId']
    rec = circ.setdefault(cid, {'layout': eff.get(cid), 'lap': None, 'quali': None, 'held': 0, 'first': r['year'], 'last': r['year']})
    rec['held'] += 1 if r.get('raceResults') else 0
    rec['first'] = min(rec['first'], r['year']); rec['last'] = max(rec['last'], r['year'])
    if rec['layout'] and r.get('circuitLayoutId') != rec['layout']:
        continue
    fl = (r.get('fastestLaps') or [])
    if fl and ms(fl[0].get('timeMillis')):
        x = fl[0]
        if not rec['lap'] or x['timeMillis'] < rec['lap'][0]:
            rec['lap'] = [x['timeMillis'], x['driverId'], x['constructorId'], r['year']]
    for q in (r.get('qualifyingResults') or [])[:3]:
        best = min([v for v in [q.get('q1Millis'), q.get('q2Millis'), q.get('q3Millis'), q.get('timeMillis')] if isinstance(v, int)] or [None]) if any(isinstance(q.get(k), int) for k in ('q1Millis', 'q2Millis', 'q3Millis', 'timeMillis')) else None
        if best and (not rec['quali'] or best < rec['quali'][0]):
            rec['quali'] = [best, q['driverId'], q['constructorId'], r['year']]

chron = {}
for c in F['constructors']:
    if c.get('chronology'):
        chron[c['id']] = [[x['constructorId'], x['yearFrom'], x['yearTo']] for x in c['chronology']]
names = {c['id']: c['name'] for c in F['constructors']}

out = {'source': 'f1db (github.com/f1db/f1db), licença CC BY 4.0', 'circuits': circ, 'chronology': chron, 'names': {k: names[k] for ch in chron.values() for k, _, _ in ch}}
js = 'const REAL_RECORDS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(root, 'app', 'data', 'records.js'), 'w').write('/* Recordes por circuito e linhagem das equipes — gerado por scripts/import_records.py. Não editar à mão. */\n' + js)
print('records.js', len(js) // 1024, 'KB ·', len(circ), 'circuitos ·', len(chron), 'linhagens')
