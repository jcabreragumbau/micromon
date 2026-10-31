#!/usr/bin/env python3
"""Terreno HD a partir de la lámina del usuario (assets/reference/props/terreno.png, 4×2 texturas).

- Cada textura se recorta, se hace repetible sin costuras (fundido con su copia desplazada media
  textura) y se escala a 128×128: cubre 2×2 casillas a 4× (el juego dibuja a 4×), así se nota
  menos la repetición. Cada casilla usa el cuarto que le toca según su posición (x%2, y%2).
- Los bordes de camino, arena y agua (autotiles de 4 vecinos) usan la forma de los bordes de los
  tiles actuales (tiles.png): donde el tile viejo tenía césped va el césped nuevo, y el resto es el
  material nuevo, con el contorno suavizado y una sombra o espuma en el borde.
- Los objetos sobre césped (flores, setos, vallas, carteles, rocas...) se guardan sin su césped
  viejo para dibujarlos encima del nuevo.
Escribe assets/atlas/terreno_hd.png (celdas de 64×64) y terreno_hd.json (nombre -> índice).
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, distance_transform_edt

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets/reference/props/terreno.png"
ATL = ROOT / "assets/atlas"
C = 64            # una casilla a 4×
P = 128           # periodo de la textura (2×2 casillas)

# celdas de la lámina: (x0, y0) de cada cuadrado de 224 px
CELDAS = {
    "hierba_alta": (16, 22), "hierba_oscura": (272, 22), "hierba": (528, 22), "hierba2": (784, 22),
    "camino": (16, 304), "arena": (272, 304), "agua0": (528, 304), "agua1": (784, 304),
}
LADO = 224

def recorte(nombre: str) -> np.ndarray:
    hoja = Image.open(SRC).convert("RGB")
    x0, y0 = CELDAS[nombre]
    m = 36 if nombre == "camino" else 5           # el camino tiene el borde oscurecido: solo el centro
    im = hoja.crop((x0 + m, y0 + m, x0 + LADO - m, y0 + LADO - m))
    return np.array(im).astype(float)

def repetible(a: np.ndarray) -> np.ndarray:
    """Fundido con la copia desplazada media textura: los bordes pasan a ser continuos al repetir."""
    n = a.shape[0]
    s = np.roll(a, (n // 2, n // 2), axis=(0, 1))
    r = np.abs(np.linspace(-1, 1, n))
    w = np.clip((1 - np.maximum.outer(r, r)) * 2.2, 0, 1) ** 1.2
    return a * w[..., None] + s * (1 - w[..., None])

def textura(nombre: str) -> np.ndarray:
    a = repetible(recorte(nombre))
    im = Image.fromarray(a.clip(0, 255).astype(np.uint8)).resize((P, P), Image.LANCZOS)
    return np.array(im).astype(float)

def cuarto(t: np.ndarray, q: int) -> np.ndarray:
    qx, qy = q % 2, q // 2
    return t[qy * C:(qy + 1) * C, qx * C:(qx + 1) * C]

def main():
    tiles_meta = json.load(open(ATL / "tiles.json"))
    viejo = np.array(Image.open(ATL / "tiles.png").convert("RGBA"))
    def tile_viejo(n):
        i = tiles_meta[n]
        return viejo[(i // 16) * 16:(i // 16) * 16 + 16, (i % 16) * 16:(i % 16) * 16 + 16]
    cesped_viejo = {tuple(p) for n in ("hierba", "hierba2") for p in tile_viejo(n).reshape(-1, 4)}
    def es_cesped(t):
        return np.array([[tuple(p) in cesped_viejo for p in fila] for fila in t])

    tex = {n: textura(n) for n in CELDAS}
    out: dict[str, np.ndarray] = {}
    for n in ("hierba", "hierba2", "hierba_alta", "hierba_oscura", "camino", "arena"):
        for q in range(4): out[f"{n}#{q}"] = cuarto(tex[n], q)
    for f in (0, 1):
        for q in range(4): out[f"agua{f}#{q}"] = cuarto(tex[f"agua{f}"], q)
    # tramos sin bordes (máscara 0 del autotile): la textura tal cual
    for q in range(4):
        out[f"camino_0#{q}"] = out[f"camino#{q}"]; out[f"arena_0#{q}"] = out[f"arena#{q}"]
        for f in (0, 1): out[f"agua_0_{f}#{q}"] = out[f"agua{f}#{q}"]

    # bordes: forma del tile viejo, suavizada y escalada a 64 px
    def mascara(nombre):
        m = (~es_cesped(tile_viejo(nombre))).astype(float)
        m = np.array(Image.fromarray((m * 255).astype(np.uint8)).resize((C, C), Image.BILINEAR)).astype(float) / 255
        m = gaussian_filter(m, 2.2)
        return np.clip((m - 0.5) * 6 + 0.5, 0, 1)          # contorno nítido con 1-2 px de suavizado
    for base, mat in (("camino", "camino"), ("arena", "arena")):
        for k in range(1, 16):
            a = mascara(f"{base}_{k}")
            dist = distance_transform_edt(a > 0.5)
            sombra = np.clip(0.78 + 0.22 * dist / 7, 0.78, 1.0)
            for q in range(4):
                m = cuarto(tex[mat], q) * sombra[..., None]
                g = cuarto(tex["hierba"], q)
                out[f"{base}_{k}#{q}"] = g * (1 - a[..., None]) + m * a[..., None]
    for k in range(1, 16):
        a = mascara(f"agua_{k}_0")
        dist = distance_transform_edt(a > 0.5)
        espuma = np.clip(1 - dist / 5, 0, 1) * 0.55
        for f in (0, 1):
            for q in range(4):
                w = cuarto(tex[f"agua{f}"], q)
                w = w * (1 - espuma[..., None]) + np.array([235, 250, 255]) * espuma[..., None]
                g = cuarto(tex["hierba"], q) * 0.9                 # orilla algo más oscura
                out[f"agua_{k}_{f}#{q}"] = g * (1 - a[..., None]) + w * a[..., None]

    # objetos sobre césped: sin el césped viejo (se dibujan encima del nuevo)
    objetos = ["flores0", "flores1", "seto", "valla", "cartel", "roca", "bordillo", "acantilado", "cueva_entrada", "hifas_bloqueo"]
    rgba: dict[str, np.ndarray] = {}
    for n in objetos:
        if n not in tiles_meta: continue
        t = tile_viejo(n).copy()
        t[es_cesped(t), 3] = 0
        rgba[f"obj:{n}"] = np.array(Image.fromarray(t).resize((C, C), Image.NEAREST))

    nombres = list(out) + list(rgba)
    cols = 32
    filas = (len(nombres) + cols - 1) // cols
    atlas = np.zeros((filas * C, cols * C, 4), np.uint8)
    idx = {}
    for i, n in enumerate(nombres):
        y, x = (i // cols) * C, (i % cols) * C
        if n in out:
            atlas[y:y + C, x:x + C, :3] = out[n].clip(0, 255).astype(np.uint8); atlas[y:y + C, x:x + C, 3] = 255
        else:
            atlas[y:y + C, x:x + C] = rgba[n]
        idx[n] = i
    Image.fromarray(atlas).save(ATL / "terreno_hd.png", optimize=True)
    json.dump({"cell": C, "cols": cols, "index": idx}, open(ATL / "terreno_hd.json", "w"))
    print("OK", len(nombres), "celdas", atlas.shape)

if __name__ == "__main__":
    main()
