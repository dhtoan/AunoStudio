from pathlib import Path

path = Path('apps/web/src/lib/auno/documentary/compiler.ts')
text = path.read_text()
old = '''\t\tbackground: {\n\t\t\tkind: 'shader',\n\t\t\tshader: 'paper:paper-01',\n\t\t\tcolors: ['#D7C3A3', '#B8A489', '#69635B', '#171411'],\n\t\t\tspeed: 0,\n\t\t\tphase: index * 0.07,\n\t\t\tdetail: 0.35,\n\t\t\trotation: 0,\n\t\t\tscale: 1.04,\n\t\t\toffsetX: 0,\n\t\t\toffsetY: 0\n\t\t}\n'''
new = '''\t\tbackground: {\n\t\t\tkind: 'pattern',\n\t\t\tpattern: 'grid',\n\t\t\tforeground: '#69635B',\n\t\t\tbackground: '#D7C3A3',\n\t\t\tscale: 1.15,\n\t\t\trotation: index % 2 === 0 ? -0.7 : 0.7,\n\t\t\toffsetX: 0,\n\t\t\toffsetY: 0,\n\t\t\tdensity: 0.18,\n\t\t\tforegroundOpacity: 0.08\n\t\t}\n'''
if old not in text:
    raise SystemExit('placeholder background anchor missing')
path.write_text(text.replace(old, new, 1))
