#!/usr/bin/env python3
"""Sprites de Microos dibujados por el usuario: láminas en assets/reference/microos/ con una rejilla de especies
(nombre arriba; frente a la izquierda y espalda a la derecha) sobre fondo claro.

Quita el fondo y los rótulos, separa cada figura y la escala a la celda de 80 px del juego con la misma escala para
toda la lámina (se respetan los tamaños relativos que dibujó el usuario). Escribe
assets/sprites/microos_usuario/<id>_frente.png y _espalda.png, que species_art.py usa en lugar de los generados.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import label, binary_fill_holes

ROOT = Path(__file__).resolve().parents[2]
SRC, OUT = ROOT / "assets/reference/microos", ROOT / "assets/sprites/microos_usuario"
C, MAXF = 80, 76

LAMINAS = {
    "iniciales.png": [["synechoc", "anabaen", "spirulmax"], ["butyricum", "acetobuty", "thermocel"], ["paramec", "vorticel", "stentorox"]],
    "lineas_4_8.png": [["mucorin", "rhizopupa", "pilobolus"], ["griseus", "coelicol", "avermitil"], ["sacchari", "pastorian", "pichiamax"],
                       ["epidermi", "aureus", None], ["navicula", "pinnularia", None]],
    "lineas_9_13.png": [["mirabilis", "vulgaris"], ["leptospir", "interrogan"], ["micrococ", "sarcina"], ["subtilis", "lichenifor"],
                        ["thuringien", "cereus"], ["mycoides", "anthracis"]],
    "lineas_14_18.png": [["casei", "acidophilus"], ["thermus", "aquaticus"], ["bifidum", "longum"], ["serratia", "marcescens"],
                         ["rhizobi", "meliloti", "agrobacter"]],
    "lineas_19_23.png": [["roqueforti", "chrysogenum"], ["niger", "flavus"], ["bacteroid", "fragilis"], ["albicans", "auris"],
                         ["euglena", "volvox"]],
    "lineas_24_28a.png": [["zymomonas", "mobilis"], ["cholerae", "parahaemolyticus"], ["proteus-am", "entamoeba"], ["naegleria", None]],
    "lineas_24_28b.png": [["mycoplas", "genitalium", "pneumoniae"]],
    "lineas_24_28c.png": [["mutans", "pyogenes", "agalactiae"]],
    "lineas_29_33.png": [["noctiluca", "ceratium", "alexandrium"], ["pelagibac", "prochloron"], ["smegmatis", "bovis", "tuberculos"],
                         ["borrelia", "treponema"], ["klebsi", "pneumonia-k"]],
    "lineas_34_38.png": [["geobacter", "sulfurreduc"], ["perfringens", "tetani"], ["psychrobac", "colwellia"], ["putida", "aeruginosa"],
                         ["giardia", "cryptospor"]],
    "lineas_39_43.png": [["methanococ", "methanosar", "pyrolobus"], ["rickettsia", "prowazekii"], ["halobacter", "salinarum"],
                         ["neisseria", "meningitid"], ["cryptococ", "neoformans"]],
    "lineas_44_48.png": [["bdellovib", "bacteriovor"], ["desulfovib", "thiomargar"], ["baylyi", "baumannii"], ["caulobac", "crescentus"],
                         ["leishmania", "trypanosom"]],
    "lineas_49_53.png": [["acantharia", "radiolaria"], ["phage-x174", "lambda-v", "t4-titan"], ["rous-v", "lentivir", "retrovir-x"],
                         ["lyssavir", "marburg-v", "filovir-z"], ["poxvir", "mimivir", "pandoravir"]],
}

# láminas con figuras que no ocupan columnas iguales: cortes en x (px) por fila; entre cada par de cortes va una figura
# (frente, espalda, frente, espalda…)
CORTES = {
    "lineas_29_33.png": [[0, 215, 410, 620, 810, 1005, 1199], [0, 220, 430, 720, 1199], [0, 222, 420, 625, 800, 1012, 1199],
                         [0, 238, 530, 720, 1199], [0, 288, 570, 888, 1199]],
    "lineas_34_38.png": [[0, 300, 580, 925, 9999], [0, 305, 600, 935, 9999], [0, 310, 600, 905, 9999], [0, 300, 608, 910, 9999],
                         [0, 315, 615, 912, 9999]],
    "lineas_39_43.png": [[0, 205, 410, 625, 800, 1028, 9999], [0, 220, 420, 628, 9999], [0, 286, 630, 972, 9999],
                         [0, 288, 580, 898, 9999], [0, 285, 585, 905, 9999]],
    "lineas_44_48.png": [[0, 302, 540, 823, 9999], [0, 272, 540, 818, 9999], [0, 270, 545, 822, 9999], [0, 272, 545, 820, 9999],
                         [0, 295, 545, 815, 9999]],
    "lineas_49_53.png": [[0, 283, 580, 890, 9999], [0, 195, 400, 608, 800, 1030, 9999], [0, 200, 405, 610, 820, 1020, 9999],
                         [0, 208, 400, 585, 820, 988, 9999], [0, 203, 405, 605, 810, 1012, 9999]],
}

def figuras(path, rejilla, cortes=None):
    a = np.array(Image.open(path).convert("RGB")); f = a.astype(int)
    fondo = (f.min(2) > 215) & (f.max(2) - f.min(2) < 26)
    lab, _ = label(fondo)
    borde = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    fg = binary_fill_holes(~np.isin(lab, list(borde)))
    fl, n = label(fg); tam = np.bincount(fl.ravel()); tam[0] = 0
    # piezas grandes (figuras); los rótulos son letras sueltas pequeñas y oscuras sobre una franja
    comps = []
    for k in range(1, n + 1):
        if tam[k] < 12: continue
        ys, xs = np.where(fl == k)
        if tam[k] < 30:                            # fragmento suelto de letra (azul marino)
            m = f[ys, xs].mean(0)
            if m.sum() < 450 and m[2] > m[0] + 20 and abs(m[0] - m[1]) < 20: continue
        # letras de los rótulos: piezas pequeñas casi negras
        tinta = ~fondo[ys, xs]
        if tam[k] < 8000 and tinta.any() and (ys.max() - ys.min()) < 90 and (xs.max() - xs.min()) < 90:
            px = f[ys, xs][tinta]
            # letra: tinta oscura y poco saturada (azul marino); las burbujas y destellos son de colores vivos
            peque = tam[k] < 4000 and (ys.max() - ys.min()) < 50 and (xs.max() - xs.min()) < 50
            morado = px[:, 0].mean() > px[:, 1].mean() + 10          # garabatos morados del dibujo (las letras tienen r≈g)
            if peque and not morado and px.sum(1).mean() < 420 and (px.max(1) - px.min(1)).mean() < 70: continue
            # rótulos grandes o suavizados: azul marino (b > r) y oscuro en conjunto
            # letras finas (mucho borde suavizado): sus píxeles oscuros son azul marino puro (r≈g, b alto)
            osc = px[px.sum(1) < 300]
            if len(osc) > 0.5 * len(px) and abs(osc[:, 0].mean() - osc[:, 1].mean()) < 20 and osc[:, 2].mean() > 90: continue
            if tam[k] >= 20 and px.sum(1).mean() < 380 and (px[:, 2] > px[:, 0] + 20).mean() > 0.6 and (px[:, 0] < 90).mean() > 0.6 and (abs(px[:, 0] - px[:, 1]) < 15).mean() > 0.7: continue
        comps.append(dict(k=k, x=xs.mean(), y=ys.mean(), x0=xs.min(), x1=xs.max() + 1, y0=ys.min(), y1=ys.max() + 1, n=tam[k]))
    H, W = fg.shape
    Y0, Y1 = min(q["y0"] for q in comps), max(q["y1"] for q in comps)       # zona con figuras
    filas, cols = len(rejilla), len(rejilla[0])
    out = {}
    for r in range(filas):
        cols = len(rejilla[r])                     # cada fila puede tener su número de especies
        for c in range(cols):
            if rejilla[r][c] is None: continue
            fila = [q for q in comps if min(filas - 1, int((q["y"] - Y0) / ((Y1 - Y0) / filas))) == r]
            if cortes:
                k0, k1, k2 = cortes[r][2 * c], cortes[r][2 * c + 1], cortes[r][2 * c + 2]
                cuerpo = [q for q in fila if k0 <= q["x"] < k2]; xm = k1
            else:
                cuerpo = [q for q in fila if int(q["x"] / (W / cols)) == c]
                xm = c * W / cols + W / cols / 2
            for lado, sel in (("frente", [q for q in cuerpo if q["x"] < xm]), ("espalda", [q for q in cuerpo if q["x"] >= xm])):
                if not sel: raise SystemExit(f"{rejilla[r][c]} {lado}: sin figura")
                x0 = min(q["x0"] for q in sel); x1 = max(q["x1"] for q in sel); y0 = min(q["y0"] for q in sel); y1 = max(q["y1"] for q in sel)
                m = np.isin(fl[y0:y1, x0:x1], [q["k"] for q in sel])
                out[(rejilla[r][c], lado)] = Image.fromarray(np.dstack([a[y0:y1, x0:x1], np.where(m, 255, 0).astype(np.uint8)]))
    return out

CHD = 320          # celda HD (4× la del juego): se dibuja a su tamaño real, sin reducir el dibujo del usuario
OUT_HD = ROOT / "assets/sprites/microos_usuario_hd"

def a_celda_hd(im, k):
    """Versión HD: misma composición que la de 80 px pero a 4×, con el borde suavizado (alfa parcial)."""
    k4 = k * CHD / C
    s = im.convert("RGBa").resize((max(1, round(im.width * k4)), max(1, round(im.height * k4))), Image.LANCZOS).convert("RGBA")
    cel = Image.new("RGBA", (CHD, CHD)); cel.alpha_composite(s, ((CHD - s.width) // 2, CHD - 8 - s.height))
    return cel

def a_celda(im, k, alto_celda=C):
    s = im.convert("RGBa").resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS).convert("RGBA")
    arr = np.array(s); arr[..., 3] = np.where(arr[..., 3] > 120, 255, 0)
    s = Image.fromarray(arr)
    cel = Image.new("RGBA", (C, C)); cel.alpha_composite(s, ((C - s.width) // 2, alto_celda - 2 - s.height))
    return cel

def main():
    OUT.mkdir(parents=True, exist_ok=True); OUT_HD.mkdir(parents=True, exist_ok=True)
    for lam, rejilla in LAMINAS.items():
        figs = figuras(SRC / lam, rejilla, CORTES.get(lam))
        k = MAXF / max(max(im.width, im.height) for im in figs.values())
        for (sp, lado), im in figs.items():
            if sp is None: continue
            a_celda(im, k).save(OUT / f"{sp}_{lado}.png")
            a_celda_hd(im, k).save(OUT_HD / f"{sp}_{lado}.png")
        print("OK", lam, len(figs), "figuras")

if __name__ == "__main__":
    main()
