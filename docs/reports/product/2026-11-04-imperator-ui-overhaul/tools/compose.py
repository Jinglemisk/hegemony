# Rebuild artifact/index.html from v1 plus the parts. usage: python3 tools/compose.py
import json, re, pathlib
R = pathlib.Path(__file__).resolve().parent.parent
v1 = (R / 'artifact/v1.html').read_text()
P = lambda n: (R / 'parts' / n).read_text()

def cut(s, a, b, new):
    i = s.index(a); j = s.index(b, i)
    return s[:i] + new + s[j:]

doc_css = """
.jumpset { display: grid; gap: 8px; margin-bottom: 14px; }
.jumps { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.jumps > span { font: 700 11px/1 var(--f-sans); letter-spacing: .16em; text-transform: uppercase; color: var(--bone-2); width: 84px; }
.jumps button { padding: 5px 10px; font-size: 13.5px; }
.stage-wrap { margin-top: 34px; overflow: visible !important; }
.stage-tag { bottom: auto !important; top: -30px !important; right: 0 !important; transform: none !important; }
.alljumps > summary { cursor: pointer; width: max-content; font: 700 11px/1 var(--f-sans); letter-spacing: .16em; text-transform: uppercase; color: var(--bone-2); padding: 6px 0; }
.alljumps > summary:hover { color: var(--bone); }
.alljumps[open] > summary { margin-bottom: 8px; }
table.spec.steps td.o { font-family: inherit; font-weight: inherit; color: inherit; white-space: normal; }
"""
out = cut(v1, '/* ── the stage: 1440×900', '/* ── document parts ── */', P('stage.css'))
out = out.replace('/* ── document parts ── */', '/* ── document parts ── */' + doc_css, 1)
study = P('study.htm') if (R / 'parts/study.htm').exists() else ''
out = cut(out, '<section class="block" id="verdict">', '<section class="block" id="imperator">', P('sections.htm') + '\n' + study + '\n')
out = cut(out, '<section class="block" id="imperator">', '<section class="block" id="spec">', P('imperator.htm') + '\n')
out = cut(out, '<section class="block" id="spec">', '<section class="block" id="sources">', P('spec.htm') + '\n')

# data for the script
codex = json.loads(P('codex.json'))
for c in codex:
    intro = [s for s in c['subs'] if len(s) > 48]
    c['subs'] = [s for s in c['subs'] if len(s) <= 48]
    c['intro'] = ' '.join(intro)
chron_txt = P('chron.txt')
groups = []
for block in [b.strip() for b in chron_txt.split('\n\n') if b.strip()]:
    lines = block.split('\n')
    if re.fullmatch(r'YEAR [IVX]+', lines[0]):
        groups.append([lines[0].title().replace('Year ', 'Year '), []])
        lines = lines[1:]
        if not lines: continue
    seal = lines[0] if lines[0] in 'ΔΝΘΚ' and len(lines) > 1 else None
    text = ' '.join(lines[1:] if seal else lines)
    if text.strip() in ('Δ', 'Ν', 'Θ', 'Κ', ''): continue
    groups[-1][1].append([seal, text])
chron = []
for year, entries in reversed(groups):
    chron.append(['Y', year.replace('Year Xii', 'Year XII').replace('Year Xi', 'Year XI')])
    chron.extend(reversed(entries))
tiles_line = next(l for l in v1.split('\n') if l.strip().startswith('const TILES = '))
script = P('script.js').replace('/*CODEX*/[]', json.dumps(codex, ensure_ascii=False)).replace('/*CHRON*/[]', json.dumps(chron, ensure_ascii=False)).replace('  /*TILES*/', tiles_line)
i = out.index('<script>'); j = out.index('</script>', i) + len('</script>')
out = out[:i] + script.strip() + out[j:]
out = out.replace('<div class="eyebrow">Hegemony · shell research · 3 November 2026</div>', '<div class="eyebrow">Hegemony · shell research · 3 November 2026 · seventh version</div>')
toc_a = out.index('<nav class="toc" aria-label="Sections">'); toc_b = out.index('</nav>', toc_a) + len('</nav>')
toc = [('prototype', 'Prototype'), ('verb-steps', 'Verb steps'), ('imperator', 'What Imperator does'), ('spec', 'The overhaul'), ('build', 'Build order'), ('sources', 'Sources')]
out = out[:toc_a] + '<nav class="toc" aria-label="Sections">\n' + ''.join(f'      <a href="#{i}">{n}</a>\n' for i, n in toc) + '    </nav>' + out[toc_b:]
(R / 'artifact/index.html').write_text(out)
used = sorted(set(re.findall(r"icons/([a-z-]+/[a-z-]+)\.svg", out)) | set(re.findall(r"ico\('([a-z-]+/[a-z-]+)'\)", out)) | set(re.findall(r"icon: '([a-z-]+/[a-z-]+)'", out)) | set(re.findall(r"\['([a-z-]+/[a-z-]+)', '", out)))
(R / 'artifact/used_icons.txt').write_text('\n'.join(used) + '\n')
missing = [u for u in used if not (R / 'artifact/icons' / (u + '.svg')).exists()]
print(len(out), 'bytes;', len(used), 'icons; missing:', missing, '; chron', len(chron))
