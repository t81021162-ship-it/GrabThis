#!/usr/bin/env python3
"""Bundle Witherholm into one self-contained HTML file (three.js, CSS and every script inlined).

    python3 tools/build.py            ->  dist/witherholm.html

Only the Google Fonts stylesheet stays external; without internet the game falls back to
system fonts and looks the same otherwise.
"""
import re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()

def inline_js(src):
    return src.replace('</script', '<\\/script')

def script(m):
    path = root / m.group(1)
    body = inline_js(path.read_text())
    label = '' if 'vendor' in m.group(1) else f'/* ---- {m.group(1)} ---- */\n'
    return f'<script>\n{label}{body}\n</script>'

html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + (root / 'style.css').read_text() + '</style>')
html = re.sub(r'<script src="([^"]+)"></script>', script, html)

assert 'src="js/' not in html and 'href="style.css"' not in html and 'src="vendor' not in html
out = root / 'dist' / 'witherholm.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html)
print(f'wrote {out.relative_to(root)} ({len(html.encode()) // 1024} KB)')
