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
import characters_ds as characters

ROOT = Path(__file__).resolve().parents[2]
C = ROOT / "assets/sprites/characters"
# Personajes convertidos de las hojas del GDD (nombre en el juego -> prefijo de archivo)
REFS = {"urtaza": "ref1", "barbadilla": "ref2", "casillas": "ref3", "salazar": "ref4", "hernandez": "ref5",
        "conchillo": "ref6", "mas": "ref7", "guardia": "ref8", "campoy": "ref9", "yero": "ref10", "gaju": "ref11",
        "luquin": "luquin", "sole": "ref13", "tusell": "ref22", "pasteur": "ref23",
        "llagostera": "ref14", "marti": "ref15", "barbe": "ref19",
        "protagonista": "ref24", "protagonista-chica": "ref25", "hesse": "ref26", "rival": "ref27"}
CHD = ROOT / "assets/sprites/characters_hd"
K = 4  # escala de la versión HD

def step(im, d, k=1, leg=None, lift=None, shift=None, bounce=None):
    """Fotograma de paso: una pierna se levanta 2 px y se abre 1 px; la otra queda apoyada. d = +1 / -1 elige la pierna."""
    import numpy as np
    a = np.array(im.convert("RGBA"))
    ys, xs = np.where(a[..., 3] > 0)
    if not len(ys): return im.copy()
    y1, x0, x1 = ys.max() + 1, xs.min(), xs.max() + 1
    cx = (x0 + x1) // 2
    leg = leg or 5 * k; lift_px = lift or 2 * k; shift = k if shift is None else shift; bounce = bounce or k
    leg_top = y1 - leg
    out = a.copy()
    out[leg_top:y1] = 0
    legs = a[leg_top:y1]
    left, right = legs.copy(), legs.copy()
    left[:, cx:] = 0; right[:, :cx] = 0
    lift, keep = (right, left) if d > 0 else (left, right)
    side = 1 if d > 0 else -1
    # pierna apoyada
    m = keep[..., 3] > 0
    out[leg_top:y1][m] = keep[m]
    # pierna levantada: sube 2 px y se separa 1 px
    lifted = np.zeros_like(legs)
    lifted[:-lift_px] = lift[lift_px:]
    lifted = np.roll(lifted, side * shift, axis=1)
    m = lifted[..., 3] > 0
    region = out[leg_top:y1]
    region[m] = lifted[m]
    # leve rebote del cuerpo: 1 px arriba
    body = out[:leg_top].copy()
    out[:leg_top] = 0
    out[:leg_top - bounce] = body[bounce:]
    for r in range(leg_top - bounce, leg_top):
        m = a[r][..., 3] > 0
        out[r][m] = a[r][m]
    return Image.fromarray(out, "RGBA")

def ref_sheet(prefix):
    out = Image.new("RGBA", (96, 128))
    views = ["frente", "espalda", "izquierda", "derecha"]
    for row, v in enumerate(views):
        base = Image.open(C / f"{prefix}_mapa_{v}.png").convert("RGBA")
        frames = [base, step(base, 1), step(base, -1)]
        for col, f in enumerate(frames): out.alpha_composite(f, (col * 32, row * 32))
    return out

def ref_sheet_hd(prefix):
    """Hoja en alta resolución: las ilustraciones originales sin reducir colores (celdas de 128×128)."""
    C4 = 32 * K
    out = Image.new("RGBA", (3 * C4, 4 * C4))
    for row, v in enumerate(["frente", "espalda", "izquierda", "derecha"]):
        base = Image.open(CHD / f"{prefix}_mapa_{v}.png").convert("RGBA")
        for col, f in enumerate([base, step(base, 1, leg=13, lift=4, shift=1, bounce=2), step(base, -1, leg=13, lift=4, shift=1, bounce=2)]): out.alpha_composite(f, (col * C4, row * C4))
    return out

def main():
    sheets, idx = [], {}
    for cid in characters.CHARACTERS:
        if cid in REFS and (C / f"{REFS[cid]}_mapa_frente.png").exists(): continue
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
    # Versión HD (fiel a las ilustraciones originales)
    hd = [cid for cid, pre in REFS.items() if (CHD / f"{pre}_mapa_frente.png").exists()]
    # PNJ con hoja completa del usuario (12 fotogramas propios, tools/art/npc_sheets.py)
    npc = sorted(p.stem[:-5] for p in CHD.glob("*_hoja.png"))
    hd += [n for n in npc if n not in hd]
    A = Image.new("RGBA", (96 * K, 128 * K * len(hd)))
    for i, cid in enumerate(hd):
        sheet = Image.open(CHD / f"{cid}_hoja.png").convert("RGBA") if cid in npc else ref_sheet_hd(REFS[cid])
        A.alpha_composite(sheet, (0, i * 128 * K))
    A.save(out / "personajes_hd.png", optimize=True)
    hdp = [cid for cid, pre in REFS.items() if (CHD / f"{pre}_combate.png").exists()]
    # retratos de combate de PNJ genéricos dibujados por el usuario
    hdp += [n for n in npc if (CHD / f"{n}_combate.png").exists() and n not in hdp]
    R = Image.new("RGBA", (64 * K * len(hdp), 96 * K))
    for i, cid in enumerate(hdp): R.alpha_composite(Image.open(CHD / f"{REFS.get(cid, cid)}_combate.png").convert("RGBA"), (i * 64 * K, 0))
    R.save(out / "retratos_hd.png", optimize=True)
    json.dump({"sheets": idx, "portraits": {c: i for i, c in enumerate(ports)}, "hdScale": K,
               "hd": {c: i for i, c in enumerate(hd)}, "hdPortraits": {c: i for i, c in enumerate(hdp)}}, open(out / "personajes.json", "w"))
    print("OK", len(sheets), "personajes;", len(ports), "retratos")

if __name__ == "__main__":
    main()
