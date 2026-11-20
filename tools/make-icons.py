#!/usr/bin/env python3
"""Draw Twirlwood icons with Pillow (original, code-drawn art)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import math
OUT = Path(__file__).resolve().parents[1] / "icons"
OUT.mkdir(exist_ok=True)
S = 1024

def base(maskable):
    im = Image.new("RGBA", (S, S))
    d = ImageDraw.Draw(im)
    top, bot = (58, 42, 110), (240, 138, 176)
    for y in range(S):
        t = y / S
        d.line([(0, y), (S, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    # moon glow
    d.ellipse([640, 120, 860, 340], fill=(255, 245, 210))
    # hills
    d.polygon([(0, 700)] + [(x, 640 - 70 * math.sin(x / 160)) for x in range(0, S + 1, 16)] + [(S, S), (0, S)], fill=(91, 63, 138))
    d.polygon([(0, 800)] + [(x, 760 - 40 * math.sin(x / 110 + 1)) for x in range(0, S + 1, 16)] + [(S, S), (0, S)], fill=(79, 166, 90))
    # winding path ribbon
    pts = []
    for i in range(60):
        t = i / 59
        y = 1024 - t * 380
        x = 512 + math.sin(t * 6) * 180 * (1 - t * 0.6)
        w = 150 * (1 - t * 0.85) + 10
        pts.append((x, y, w))
    left = [(x - w, y) for x, y, w in pts]
    right = [(x + w, y) for x, y, w in reversed(pts)]
    d.polygon(left + right, fill=(232, 181, 106))
    # star gem
    cx, cy, R, r = 512, 400, 230, 100
    star = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = R if i % 2 == 0 else r
        star.append((cx + math.cos(a) * rr, cy + math.sin(a) * rr))
    glow = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([cx - 300, cy - 300, cx + 300, cy + 300], fill=(255, 230, 140, 120))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(60)))
    d = ImageDraw.Draw(im)
    d.polygon(star, fill=(176, 124, 255), outline=(255, 255, 255), width=18)
    inner = [(cx + (x - cx) * 0.55, cy + (y - cy) * 0.55 - 20) for x, y in star]
    d.polygon(inner, fill=(213, 180, 255))
    if maskable:
        return im
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, S - 1, S - 1], radius=200, fill=255)
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0)); out.paste(im, (0, 0), m)
    return out

for mask in (False, True):
    im = base(mask)
    suf = "-maskable" if mask else ""
    for size in (512, 192):
        im.resize((size, size), Image.LANCZOS).save(OUT / f"icon-{size}{suf}.png")
base(False).resize((32, 32), Image.LANCZOS).save(OUT / "favicon-32.png")
print("icons ok")
