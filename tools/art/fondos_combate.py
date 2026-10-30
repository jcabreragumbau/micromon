#!/usr/bin/env python3
"""Escenarios de combate del usuario (assets/reference/props/fondos_combate.png, rejilla 2×5 con rótulos).

Recorta cada escenario (sin el rótulo ni los bordes verdes), lo ajusta a 16:9 recortando lo justo
por los lados y lo guarda como assets/atlas/fondo_<entorno>.jpg (512×288). No se redibuja nada.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets/reference/props/fondos_combate.png"
FILAS = [(15, 219), (234, 418), (433, 617), (632, 817), (832, 1022)]
COLS = [(2, 380), (385, 763)]
ORDEN = ["hierba", "bosque", "interior", "laboratorio", "gimnasio", "cueva", "invernadero", "casino", "torre", "hielo"]

def main():
    im = Image.open(SRC).convert("RGB")
    for i, env in enumerate(ORDEN):
        (y0, y1), (x0, x1) = FILAS[i // 2], COLS[i % 2]
        t = im.crop((x0, y0 + 2, x1, y1))
        w, h = t.size
        cw = min(w, round(h * 16 / 9))
        t = t.crop(((w - cw) // 2, 0, (w - cw) // 2 + cw, h)).resize((512, 288), Image.LANCZOS)
        t.save(ROOT / "assets/atlas" / f"fondo_{env}.jpg", quality=90)
    print("OK", len(ORDEN), "escenarios")

if __name__ == "__main__":
    main()
