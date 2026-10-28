#!/usr/bin/env python3
"""Personajes de mapa dibujados a mano en rejilla (16 px de ancho dentro de un marco de 32×32).

Mismo estilo chibi que los sprites de referencia: cabeza grande, bata, contorno oscuro.
Cada personaje = cabeza (varias opciones) + cuerpo + paleta. Los pasos de la animación
se generan moviendo las piernas. Salida: assets/sprites/characters/<id>_mapa.png
(hoja 96×128: 3 fotogramas × 4 direcciones en orden abajo, arriba, izquierda, derecha).
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "sprites" / "characters"

HEADS = {
 "gorra": {
  "frente": [
   "....oooooooo....",
   "...occccccccoo..",
   "..occcccccccCco.",
   "..occcccccccCco.",
   ".oCCCCCCCCCCCCCo",
   ".ohhsssssssshhho",
   ".ohsssssssssssho",
   ".ohssessssessho.",
   ".ohssessssessho.",
   ".oSssssssssssSo.",
   "..oSssssssssSo..",
   "...ooSSSSSSoo...",
  ],
  "espalda": [
   "....oooooooo....",
   "...occccccccoo..",
   "..occcccccccCco.",
   "..occcccccccCco.",
   ".oCCCCCCCCCCCCo.",
   ".ohhhhhhhhhhhhho",
   ".ohhhhhhhhhhhhho",
   ".ohhhhhhhhhhhHho",
   ".oHhhhhhhhhhhHo.",
   ".oHHhhhhhhhhHHo.",
   "..oHHHhhhhHHHo..",
   "...oooSSSSooo...",
  ],
  "lado": [
   ".....ooooooo....",
   "....occccccco...",
   "...occcccccCco..",
   "...occcccccCco..",
   ".ooCCCCCCCCCCo..",
   ".osssshhhhhhho..",
   "..osssshhhhhho..",
   "..oesssshhhhho..",
   "..oesssshhhhHo..",
   "..osssssshhHo...",
   "...oSssssSHo....",
   "....ooSSSoo.....",
  ],
 },
 "melena": {
  "frente": [
   "....oooooooo....",
   "...ohhhhhhhhoo..",
   "..ohhhhhhhhhhHo.",
   ".ohhhhhhhhhhhhHo",
   ".ohhhhhhhhhhhhHo",
   ".ohhsssssssshhho",
   ".ohsssssssssssho",
   ".ohssessssessho.",
   ".ohssessssessho.",
   ".oHssssssssssHo.",
   "..oHsssssssssHo.",
   "...ooSSSSSSoo...",
  ],
  "espalda": [
   "....oooooooo....",
   "...ohhhhhhhhoo..",
   "..ohhhhhhhhhhHo.",
   ".ohhhhhhhhhhhhHo",
   ".ohhhhhhhhhhhhHo",
   ".ohhhhhhhhhhhhho",
   ".ohhhhhhhhhhhhho",
   ".ohhhhhhhhhhhHho",
   ".oHhhhhhhhhhhHo.",
   ".oHHhhhhhhhhHHo.",
   "..oHHHhhhhHHHo..",
   "...oooSSSSooo...",
  ],
  "lado": [
   ".....ooooooo....",
   "....ohhhhhhho...",
   "...ohhhhhhhhHo..",
   "..ohhhhhhhhhhHo.",
   "..ohhhhhhhhhhHo.",
   ".ohhsshhhhhhho..",
   ".osssssshhhhho..",
   "..oesssshhhhho..",
   "..oesssshhhhHo..",
   "..osssssshhHHo..",
   "...oSssssSHHo...",
   "....ooSSSoo.....",
  ],
 },
}

BODY = {
 "frente": [
  "..owwwcccccwwwo.",
  ".owwwwcccccwwwwo",
  ".owWwwcccccwwWwo",
  ".owWwwccgccwwWwo",
  ".owWwwccgccwwWwo",
  ".osWwwcccccwwWso",
  "..owwppppppwwo..",
  "..owwppppppwwo..",
  "...oppppoppppo..",
  "...opPppoppPpo..",
  "...okkkkookkkko.",
  "...oooooooooooo.",
 ],
 "espalda": [
  "..owwwwwwwwwwwo.",
  ".owwbbbbbbbbwwwo",
  ".owWbBBBBBBbwWwo",
  ".owWbBBBBBBbwWwo",
  ".owWbbbbbbbbwWwo",
  ".osWwwwwwwwwwWso",
  "..owwwwwwwwwwo..",
  "..oWWppppppWWo..",
  "...oppppoppppo..",
  "...opPppoppPpo..",
  "...okkkkookkkko.",
  "...oooooooooooo.",
 ],
 "lado": [
  "...owwwwwwbbo...",
  "..owwccwwwwbBo..",
  "..owcccwwWwbBo..",
  "..owcccwWWwbBo..",
  "..owcccwWWwbbo..",
  "..oswccwWWwwo...",
  "...owwwwwwwwo...",
  "...owwppppwwo...",
  "....oppppppo....",
  "....opPppPpo....",
  "....okkkkkko....",
  "....oooooooo....",
 ],
}

PALETTES = {
 # protagonista: gorra y camiseta turquesa, bata blanca, mochila naranja
 "protagonista": {"o": "#1a1420", "c": "#2fa39a", "C": "#1c6b66", "h": "#5a3a24", "H": "#3a2416",
                  "s": "#f2c9a0", "S": "#d89e78", "e": "#20182a", "w": "#f4f4f8", "W": "#b8c4d8",
                  "g": "#e8c040", "p": "#3a3f5a", "P": "#262a40", "k": "#5a2e22", "b": "#e0782a", "B": "#a84e18"},
 # becario genérico: melena, camiseta gris, bata con manchas, sin mochila (bolso gris)
 "becario": {"o": "#1a1420", "c": "#7a8494", "C": "#4e5664", "h": "#2a2228", "H": "#141014",
             "s": "#e8b890", "S": "#c48e6a", "e": "#20182a", "w": "#ecebe4", "W": "#aab0b8",
             "g": "#3c8ad8", "p": "#5c4a3a", "P": "#3e3024", "k": "#2a2428", "b": "#9aa0a8", "B": "#6e747c"},
}
CHARACTERS = {"protagonista": "gorra", "becario": "melena"}

def hex2rgba(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5)) + (255,)

def frame(head, body, pal, step=0, mirror=False):
    rows = head + body
    # paso: alterna qué pierna adelanta (desplaza una fila de pierna)
    rows = list(rows)
    if step:
        legs = rows[-4:-1]
        if step == 1:
            legs = [legs[0], legs[1][1:] + ".", legs[2]]
        else:
            legs = [legs[0], "." + legs[1][:-1], legs[2]]
        rows[-4:-1] = legs
    im = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    top = 32 - len(rows) - 2 + (1 if step else 0)
    for y, r in enumerate(rows):
        assert len(r) == 16, (r, len(r))
        for x, ch in enumerate(r):
            if ch != ".":
                im.putpixel((8 + x, top + y), hex2rgba(pal[ch]))
    return im.transpose(Image.FLIP_LEFT_RIGHT) if mirror else im

def sheet(cid):
    pal = PALETTES[cid]; head = HEADS[CHARACTERS[cid]]
    out = Image.new("RGBA", (96, 128), (0, 0, 0, 0))
    views = [("frente", False), ("espalda", False), ("lado", False), ("lado", True)]
    for row, (v, mir) in enumerate(views):
        for col, step in enumerate((0, 1, 2)):
            out.alpha_composite(frame(head[v], BODY[v], pal, step, mir), (col * 32, row * 32))
    OUT.mkdir(parents=True, exist_ok=True)
    out.save(OUT / f"{cid}_mapa.png")
    return out

if __name__ == "__main__":
    for c in CHARACTERS:
        sheet(c)
    print("OK", list(CHARACTERS))
