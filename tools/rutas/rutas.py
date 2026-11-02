"""Diseños de las rutas 1-3 como texto + validación (árboles 2x2 alineados y recorrido completo)."""
import sys
from collections import deque

SOLIDO = set("T%A~*klrSv") | {"#"}   # v (bordillo) solo se cruza saltando hacia abajo

RUTA1 = [  # 22 x 36 · vertical, con bordillos escalonados, parches de arena y hierba alta (como la Ruta 201)
    "TTTTTTTTTTssTTTTTTTTTT",
    "TTTTTTTTTTssTTTTTTTTTT",
    "TTTTf...sss.....r.TTTT",
    "TTTT.......f......TTTT",
    "TTTTvvvvvv..vvvvvvTTTT",
    "TTTT..ss.....gggggTTTT",
    "TTTT..ss..TT.gggggTTTT",
    "TTTT......TT.gggggTTTT",
    "TTTTf.........ggggTTTT",
    "TTTTvvv..vvvvvvvvvTTTT",
    "TTTT.ss....f......TTTT",
    "TTTT.ss.k...ggggggTTTT",
    "TTTT........ggggggTTTT",
    "TTTT..f.....ggggggTTTT",
    "TTTTvvvvvvv..vvvvvTTTT",
    "TTTT......s.......TTTT",
    "TTTT....ssss..r...TTTT",
    "TTTT...........f..TTTT",
    "TTTTgggggg....vvvvTTTT",
    "TTTTgggggg.k......TTTT",
    "TTTTgggggg........TTTT",
    "TTTTvvvvv..vvvvvvvTTTT",
    "TTTT..f.....ggggggTTTT",
    "TTTT.sssss..ggggggTTTT",
    "TTTT.s......ggggggTTTT",
    "TTTT....r...ggggggTTTT",
    "TTTTvvvvvvvv..vvvvTTTT",
    "TTTT..............TTTT",
    "TTTTgggg...ss..gggTTTT",
    "TTTTgggg.......gggTTTT",
    "TTTTgggg..ss...gggTTTT",
    "TTTT...l......l...TTTT",
    "TTTT...l..gg..l...TTTT",
    "TTTT...l..gg..l...TTTT",
    "TTTTTTTTTT..TTTTTTTTTT",
    "TTTTTTTTTT..TTTTTTTTTT",
]

RUTA2 = [  # 40 x 22 · bosque horizontal con estanque; la cueva del Monte Micelio en el risco del noreste
    "TTTTTTTTTTTTTTTTTTTTTTTTTTAAAAAAAAAAAATT",
    "TTTTTTTTTTTTTTTTTTTTTTTTTTAAAAAAAAAAAATT",
    "TT.f....gggggggg..TT....TTAAAAAAAOAAAATT",
    "TT......gggggggg..TT.....f.........p..TT",
    "TT..TT..gggggggg........ss.........p..TT",
    "TT..TT........f.........ss....TT...p..TT",
    "TTggg......TT.....gggg.......TT...p..TT ",
    "TTggg......TT.....gggg.......TTppppp..TT",
    "TTggg...pppppppppppppppppppppppp......TT",
    "TTggg...p....f....gggg........ggggg...TT",
    "TT......p.........gggg..TT....ggggg...TT",
    "TTTT....p..TT.............TT..ggggg...TT",
    "TTTT....p..TT....~~~~~~...TT..ggggg...TT",
    "TT......p.......S~~~~~~~..............TT",
    "TT.ss...p........~~~~~~~.....f........TT",
    "TT.ss...p..gggggg.~~~~~......TT..gggg.TT",
    "TT......p..gggggg............TT..gggg.TT",
    "TTll....p..gggggg....TT..........gggg.TT",
    "TT..f...p..gggggg....TT...f......gggg.TT",
    "TT.....pp..........................f..TT",
    "TTTTTTlppTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
    "TTTTTTlppTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT",
]

RUTA3 = [  # 40 x 26 · montaña con río, cascada, puentes y escalones; pradera al este con la salida a Ciudad Cultivo
    "%%%%%%%%%%%%%%%%%%%*%%%%%%%%TTTTTTppTTTT",
    "%%%%%%%%%%%%%%%%%%%*%%%%%%%%TTTTTTppTTTT",
    "%%pppppppppppppp%%%*%%%pppp%TT....pp..TT",
    "%%p~~~~~~~~~~~~~~~~~~~~~~~p%TT.ggggp..TT",
    "%%p~r~~~~~~~~~~~~~~~~~~r~~p%...ggggp..TT",
    "%%pppppppppp=ppppp|pp^ppppp^...ggggp..TT",
    "%%%%%%%%%pp~~~%%%%|%%%%%%%%%...ggggpS.TT",
    "%%pppppppp%~~~%ppp|pppp%.....ppppppp..TT",
    "%%p%%%%%%^%~~~%p%%%%%%p%.....p........TT",
    "%%p%pppppp%~~~%p%pppp%p%..TT.p..gggg..TT",
    "%%p%p%%%%%%~~~%p%p%%p%p%..TT.p..gggg..TT",
    "%%p%p%pppp=~~~=p%p%pp%p%.....p..gggg..TT",
    "%%p%p%p%%%%~~~%%%p%p%%p%gggg.p..gggg..TT",
    "%%p^p^p%ppp~~~ppp^p^pp^pgggg.p........TT",
    "%%ppppp%p%%~~~%%%%%%%%%%gggg.p.TT.....TT",
    "%%%%%%p%p%%~~~%ppppppppp.....p.TT..f..TT",
    "%%pppp^pp%%~~~=p%%%%%%%%..f..ppppppp..TT",
    "%%p%%%%%%%%~~~%p%..........TT......p..TT",
    "%%p%pppppppp=pppp..gggggg..TT......p..TT",
    "%%p%p%%%%%%%~~%%%..gggggg..........p..TT",
    "%%ppp%pppppp~~ppp..gggggg....TT....p..TT",
    "%%%%%%%%%%%p~~p%%..gggggg....TT....p..TT",
    "%%%%%%%%%%Op~~p%%.................pp..TT",
    "%%%%%%%%%%%%~~%%%TTTTTTTTTTTTTTTTTTTTTTT",
    "%%%%%%%%%%%%~~%%%TTTTTTTTTTTTTTTTTTTTTTT",
    "%%%%%%%%%%%%~~%%%TTTTTTTTTTTTTTTTTTTTTTT",
]

def normaliza(rows):
    w, h = len(rows[0]), len(rows)
    g = [list(r) for r in rows]
    for r in rows: assert len(r) == w, (len(r), r)
    avisos = []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            cel = [(x + i, y + j) for j in (0, 1) for i in (0, 1) if x + i < w and y + j < h]
            n = sum(g[yy][xx] == "T" for xx, yy in cel)
            if 0 < n < len(cel):
                avisos.append((x, y, n))
                for xx, yy in cel: g[yy][xx] = "T" if n >= 2 else ("." if g[yy][xx] == "T" else g[yy][xx])
    return ["".join(r) for r in g], avisos

def alcanzable(rows, inicio, extra_solidos=()):
    w, h = len(rows[0]), len(rows)
    sol = SOLIDO | set(extra_solidos)
    vis = {inicio}; q = deque([inicio])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not (0 <= nx < w and 0 <= ny < h): continue
            c = rows[ny][nx]
            if c == "v" and dy == 1 and ny + 1 < h and rows[ny + 1][nx] not in sol:   # salto
                nx, ny = nx, ny + 1
            elif c in sol: continue
            if (nx, ny) not in vis: vis.add((nx, ny)); q.append((nx, ny))
    return vis

if __name__ == "__main__":
    for nombre, rows, ini, fin in (("RUTA1", RUTA1, (10, 35), (10, 0)), ("RUTA2", RUTA2, (7, 21), (33, 3)), ("RUTA3", RUTA3, (11, 22), (34, 0))):
        rr, av = normaliza(rows)
        vis = alcanzable(rr, ini)
        print(nombre, len(rr[0]), "x", len(rr), "árboles corregidos:", av, "llega:", fin in vis)
        if "--ver" in sys.argv:
            for y, r in enumerate(rr): print(f"{y:2d} " + "".join("@" if (x, y) == fin else ("·" if (x, y) in vis and c in ".gspf=|^" else c) for x, c in enumerate(r)))
