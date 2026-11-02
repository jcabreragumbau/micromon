#!/usr/bin/env python3
"""Copia en WebP sin pérdida (idéntica píxel a píxel) de los atlas HD grandes, para que el HTML
publicado no pase de 16 MB. La llama tools/build_game.ts cuando el PNG es más nuevo que el WebP."""
import sys
from pathlib import Path
from PIL import Image
RAIZ = Path(__file__).resolve().parents[2]
V2 = "--v2" in sys.argv          # Micromón V2: también los atlas propios de assets/atlas_v2/
for n in [a for a in sys.argv[1:] if not a.startswith("--")]:
    ATL = RAIZ / "assets/atlas_v2" if V2 and (RAIZ / "assets/atlas_v2" / f"{n}.png").exists() else RAIZ / "assets/atlas"
    png, webp = ATL / f"{n}.png", ATL / f"{n}.webp"
    if not webp.exists() or webp.stat().st_mtime < png.stat().st_mtime:
        Image.open(png).save(webp, "WEBP", lossless=True, method=6)
        print("WebP", n, webp.stat().st_size)
