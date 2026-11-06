"""Leitor simples de tabelas wikitext (Wikipedia) com rowspan/colspan.
Usado por scripts/import_categories.py."""
import re

FLAG = re.compile(r'\{\{\s*(?:flagicon|flag|flagathlete|flagdeco)\s*\|\s*([A-Za-z]{2,3})[^}]*\}\}', re.I)
LINK = re.compile(r'\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]')


def split_top(s, sep):
    """divide s por sep apenas fora de [[ ]] e {{ }}"""
    out, depth_l, depth_t, cur, i = [], 0, 0, '', 0
    while i < len(s):
        if s.startswith('[[', i): depth_l += 1; cur += '[['; i += 2; continue
        if s.startswith(']]', i): depth_l = max(0, depth_l - 1); cur += ']]'; i += 2; continue
        if s.startswith('{{', i): depth_t += 1; cur += '{{'; i += 2; continue
        if s.startswith('}}', i): depth_t = max(0, depth_t - 1); cur += '}}'; i += 2; continue
        if depth_l == 0 and depth_t == 0 and s.startswith(sep, i):
            out.append(cur); cur = ''; i += len(sep); continue
        cur += s[i]; i += 1
    out.append(cur)
    return out


def parse_cell(raw):
    parts = split_top(raw, '|')
    attrs, content = '', raw
    if len(parts) > 1 and re.search(r'(rowspan|colspan|style|nowrap|align|class|bgcolor|data-sort|width)', parts[0], re.I) and '[[' not in parts[0] and '{{' not in parts[0]:
        attrs, content = parts[0], '|'.join(parts[1:])
    rs = re.search(r'rowspan\s*=\s*"?(\d+)', attrs)
    cs = re.search(r'colspan\s*=\s*"?(\d+)', attrs)
    return {'attrs': attrs, 'text': content.strip(), 'rowspan': int(rs.group(1)) if rs else 1, 'colspan': int(cs.group(1)) if cs else 1}


def flatten_nested(wikitext):
    """substitui tabelas aninhadas (dentro de células) pelo texto da primeira célula com conteúdo"""
    for _ in range(200):
        changed = False
        for m in re.finditer(r'\{\|((?:(?!\{\|).)*?)\n\|\}', wikitext, re.S):
            before = wikitext[:m.start()]
            depth = len(re.findall(r'(?:^|\n)\{\|', before)) - len(re.findall(r'\n\|\}', before))
            if depth <= 0:
                continue
            body = m.group(1)
            # só achata mini-tabelas de célula (sem cabeçalho e com poucas linhas); tabelas de layout ficam
            if re.search(r'\n!', body) or body.count('\n|-') > 4:
                continue
            cells = [c.strip() for line in m.group(1).split('\n') if line.startswith('|') and not line.startswith(('|-', '|+'))
                     for c in [split_top(line[1:], '|')[-1]] if c.strip()]
            good = [c for c in cells if re.search(r'[A-Za-z]{3}', plain(c))]
            wikitext = wikitext[:m.start()] + (good[0] if good else (cells[0] if cells else '')) + wikitext[m.end():]
            changed = True
            break
        if not changed:
            break
    return wikitext


def tables(wikitext):
    """retorna as tabelas como listas de linhas; cada linha é lista de células já expandidas por rowspan/colspan"""
    out = []
    wikitext = flatten_nested(wikitext)
    for m in re.finditer(r'\{\|((?:(?!\{\|).)*?)\n\|\}', wikitext, re.S):  # só as tabelas mais internas
        body = m.group(1)
        # tabelas aninhadas: ignora
        rows_raw = re.split(r'\n\|-[^\n]*', body)
        header, rows = [], []
        pending = {}  # col -> [restante, celula]
        for rr in rows_raw:
            cells = []
            is_header = False
            has_data = False
            for line in rr.split('\n'):
                line = line.rstrip()
                if not line or line.startswith('{|') or line.startswith('|+'):
                    continue
                if line.startswith('!'):
                    is_header = True
                    for c in split_top(line[1:], '!!'):
                        for c2 in split_top(c, '||'):
                            cells.append(parse_cell(c2))
                elif line.startswith('|') and not line.startswith('|}'):
                    has_data = True
                    for c in split_top(line[1:], '||'):
                        cells.append(parse_cell(c))
                elif cells:
                    cells[-1]['text'] += '\n' + line
            if not cells:
                continue
            row, col, ci = [], 0, 0
            while ci < len(cells) or col in pending:
                if col in pending:
                    left, cell = pending[col]
                    row.append(cell)
                    if left - 1 > 0: pending[col] = [left - 1, cell]
                    else: del pending[col]
                    col += 1
                    continue
                if ci >= len(cells):
                    break
                cell = cells[ci]; ci += 1
                for k in range(cell['colspan']):
                    row.append(cell)
                    if cell['rowspan'] > 1:
                        pending[col] = [cell['rowspan'] - 1, cell]
                    col += 1
            if is_header and not has_data and not rows:
                header.append([c['text'] for c in row])
            else:
                rows.append(row)
        out.append({'header': header, 'rows': rows, 'start': m.start()})
    return out


def clean(t):
    t = re.sub(r'<ref[^>]*/>', '', t)
    t = re.sub(r'<ref[^>]*>.*?</ref>', '', t, flags=re.S)
    t = re.sub(r'\{\{\s*efn[^{}]*(\{\{[^{}]*\}\}[^{}]*)*\}\}', '', t, flags=re.I)
    t = re.sub(r'\{\{\s*(?:nowrap|sortname)\s*\|([^{}]*)\}\}', lambda m: m.group(1).replace('|', ' '), t, flags=re.I)
    return t


def link_names(t):
    t = clean(t)
    return [(m.group(2) or m.group(1)).strip() for m in LINK.finditer(t) if not m.group(1).lower().startswith(('file:', 'image:'))]


def link_targets(t):
    t = clean(t)
    return [(m.group(1).strip(), (m.group(2) or m.group(1)).strip()) for m in LINK.finditer(t) if not m.group(1).lower().startswith(('file:', 'image:'))]


def flags(t):
    return [f.upper() for f in FLAG.findall(t)]


def plain(t):
    t = clean(t)
    t = LINK.sub(lambda m: (m.group(2) or m.group(1)), t)
    t = re.sub(r'\{\{[^{}]*\}\}', '', t)
    t = re.sub(r"'''?", '', t)
    t = re.sub(r'<[^>]+>', '', t)
    return re.sub(r'\s+', ' ', t).strip()


def section(wikitext, *names):
    """texto da seção cujo título contém um dos nomes (até a próxima seção de mesmo nível ou superior)"""
    for n in names:
        m = re.search(r'^(=+)\s*' + re.escape(n) + r'[^=\n]*\1\s*$', wikitext, re.M | re.I)
        if m:
            lvl = len(m.group(1))
            rest = wikitext[m.end():]
            m2 = re.search(r'^={1,%d}[^=].*?={1,%d}\s*$' % (lvl, lvl), rest, re.M)
            return rest[:m2.start()] if m2 else rest
    return ''
