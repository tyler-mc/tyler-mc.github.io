#!/usr/bin/env python3
"""Contact sheet of the mascot bodies: python3 tools/mascot_sheet.py [out.png] [scale]. Needs Pillow. One row per body level (3 boil variants), then faces on every level."""
import json, os, subprocess, sys
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MB = {'B':'#F1E9D2','b':'#C9BFA5','Y':'#F6B92B','k':'#1A1716','r':'#FF3333','p':'#FF9A9A','R':'#B01E23','w':'#ffffff','m':'#7A0A12','n':'#0B5A55','T':'#3FC2B5','o':'#FFD94A','h':'#00393B','c':'#FF7A7A','H':'#FF2E88','u':'#CF9A62','U':'#965F34','v':'#6E4324','V':'#2B1B10','a':'#7A5030','A':'#A2744A','g':'#7D8A38','G':'#9FD45A','e':'#22160D'}
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'mascot_sheet.png')
S = int(sys.argv[2]) if len(sys.argv) > 2 else 6
rows = json.loads(subprocess.check_output(['node', os.path.join(ROOT, 'tools', 'mascot_sheet.mjs')]))
W, H, PAD, LAB = 32, 48, 6, 70
cols = max(len(r['frames']) for r in rows)
img = Image.new('RGB', (LAB + cols * (W * S + PAD), len(rows) * (H * S + PAD + 12)), '#EDE3CF')
d = ImageDraw.Draw(img)
for ri, r in enumerate(rows):
    y0 = ri * (H * S + PAD + 12)
    d.text((4, y0 + 4), r['label'], fill='#1A1716')
    for ci, f in enumerate(r['frames']):
        x0 = LAB + ci * (W * S + PAD)
        d.rectangle([x0, y0, x0 + W * S - 1, y0 + H * S - 1], fill='#F7F0DE')
        for y, row in enumerate(f['g']):
            for x, c in enumerate(row):
                if c != '.': d.rectangle([x0 + x * S, y0 + y * S, x0 + (x + 1) * S - 1, y0 + (y + 1) * S - 1], fill=MB[c])
        d.text((x0, y0 + H * S + 1), f['name'], fill='#555')
img.save(out)
print('wrote', out, img.size)
