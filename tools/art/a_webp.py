#!/usr/bin/env python3
"""Copia en WebP sin pérdida (idéntica píxel a píxel) de los atlas HD grandes, para que el HTML
publicado no pase de 16 MB. La llama tools/build_game.ts cuando el PNG es más nuevo que el WebP."""
import sys
from pathlib import Path
from PIL import Image
ATL = Path(__file__).resolve().parents[2] / "assets/atlas"
for n in sys.argv[1:]:
    png, webp = ATL / f"{n}.png", ATL / f"{n}.webp"
    if not webp.exists() or webp.stat().st_mtime < png.stat().st_mtime:
        Image.open(png).save(webp, "WEBP", lossless=True, method=6)
        print("WebP", n, webp.stat().st_size)
