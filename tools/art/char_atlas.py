#!/usr/bin/env python3
"""Atlas de personajes para el juego.

  assets/atlas/personajes.png: una fila de 96×128 por personaje (3 pasos × 4 direcciones:
  abajo, arriba, izquierda, derecha). Incluye los dibujados a mano y los convertidos del GDD.
  assets/atlas/retratos.png:  retratos de combate 64×96 en fila.
  assets/atlas/personajes.json: índices.
"""
import json, sys
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
import characters

ROOT = Path(__file__).resolve().parents[2]
C = ROOT / "assets/sprites/characters"
# Personajes convertidos de las hojas del GDD (nombre en el juego -> prefijo de archivo)
REFS = {"urtaza": "ref1", "barbadilla": "ref2", "casillas": "ref3", "salazar": "ref4", "hernandez": "ref5",
        "conchillo": "ref6", "mas": "ref7", "guardia": "ref8", "campoy": "ref9", "yero": "ref10", "gaju": "ref11",
        "luquin": "luquin", "sole": "ref13", "tusell": "ref22", "pasteur": "ref23"}

def step(im, d):
    """Fotograma de paso: desplaza las piernas (6 filas inferiores con contenido) un píxel."""
    a = im.copy()
    bbox = im.getbbox()
    if not bbox: return a
    y1 = bbox[3]
    legs = im.crop((0, y1 - 5, 32, y1))
    a.paste((0, 0, 0, 0), (0, y1 - 5, 32, y1))
    a.alpha_composite(legs, (d, 0 if d else 0) if False else (0, y1 - 5))
    sh = Image.new("RGBA", (32, 32)); sh.alpha_composite(a.crop((0, 0, 32, y1 - 5)), (0, 0))
    l = legs.crop((0, 0, 16, 5)); r = legs.crop((16, 0, 32, 5))
    sh.alpha_composite(l, (0, y1 - 5 - (1 if d > 0 else 0))); sh.alpha_composite(r, (16, y1 - 5 - (1 if d < 0 else 0)))
    return sh

def ref_sheet(prefix):
    out = Image.new("RGBA", (96, 128))
    views = ["frente", "espalda", "izquierda", "derecha"]
    for row, v in enumerate(views):
        base = Image.open(C / f"{prefix}_mapa_{v}.png").convert("RGBA")
        frames = [base, step(base, 1), step(base, -1)]
        for col, f in enumerate(frames): out.alpha_composite(f, (col * 32, row * 32))
    return out

def main():
    sheets, idx = [], {}
    for cid in characters.CHARACTERS:
        sheets.append(characters.sheet(cid)); idx[cid] = len(sheets) - 1
    for cid, pre in REFS.items():
        if (C / f"{pre}_mapa_frente.png").exists():
            sheets.append(ref_sheet(pre)); idx[cid] = len(sheets) - 1
    atlas = Image.new("RGBA", (96, 128 * len(sheets)))
    for i, s in enumerate(sheets): atlas.alpha_composite(s, (0, i * 128))
    out = ROOT / "assets/atlas"; out.mkdir(parents=True, exist_ok=True)
    atlas.save(out / "personajes.png")
    ports = [cid for cid, pre in REFS.items() if (C / f"{pre}_combate.png").exists()]
    P = Image.new("RGBA", (64 * len(ports), 96))
    for i, cid in enumerate(ports): P.alpha_composite(Image.open(C / f"{REFS[cid]}_combate.png").convert("RGBA"), (i * 64, 0))
    P.save(out / "retratos.png")
    json.dump({"sheets": idx, "portraits": {c: i for i, c in enumerate(ports)}}, open(out / "personajes.json", "w"))
    print("OK", len(sheets), "personajes;", len(ports), "retratos")

if __name__ == "__main__":
    main()
