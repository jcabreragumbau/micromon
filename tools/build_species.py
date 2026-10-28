#!/usr/bin/env python3
"""Genera data/species.json: estadísticas base, crecimiento, captura, experiencia,
tamaño celular, compatibilidad con MO y movimientos por nivel de los 162 Microos.

Todo es determinista (semilla = id del Microo o de su línea), así que regenerar da
siempre el mismo resultado. Los valores a mano están en OVERRIDES.
"""
import json, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
dex = json.load(open(ROOT / "data/microdex.json", encoding="utf-8"))
moves = json.load(open(ROOT / "data/moves.json", encoding="utf-8"))
by_id = {m["id"]: m for m in dex}
mv = {m["id"]: m for m in moves}

def h(s, n=1):
    """Número pseudoaleatorio estable en [0, 1)."""
    return int(hashlib.sha256(f"{s}:{n}".encode()).hexdigest()[:8], 16) / 0xFFFFFFFF

# --- Estructura de líneas evolutivas ---------------------------------------------
children = {}
for m in dex:
    if m["evolves_from"]:
        children.setdefault(m["evolves_from"], []).append(m["id"])
def root(i):
    while by_id[i]["evolves_from"]:
        i = by_id[i]["evolves_from"]
    return i
def stage(i):
    s = 1
    while by_id[i]["evolves_from"]:
        i = by_id[i]["evolves_from"]; s += 1
    return s
def depth(r):
    return 1 + max((depth(c) for c in children.get(r, [])), default=0)

STARTERS = {"synechoc", "butyricum", "paramec"}
LEGEND = {"prion-sc": 580, "viroid-cad": 580, "sputnik-v": 580,
          "ecoli-o157": 680, "salmonella-typhimurium": 680, "luca": 600}

def bst_for(i):
    if i in LEGEND: return LEGEND[i]
    r, s, d = root(i), stage(i), depth(root(i))
    special = {"coli-k12": 200, "coli-bl21": 540, "tardigrad": 540, "myxococcus": 288,
               "pleomorph": 325, "halomorph": 525, "electromorph": 525, "pyromorph": 525,
               "poxvir": 300, "mimivir": 420, "pandoravir": 600, "kefirgran": 450,
               "stromatol": 355, "cyanofossil": 495, "amberspor": 355, "palaeobacil": 495,
               "radiodurans": 490, "deinococ": 500, "pyrococcus": 500, "lokiarca": 500,
               "thiomargar": 500}
    if i in special: return special[i]
    first_evo = next((by_id[c]["evolution"] for c in children.get(r, [])), None)
    if d == 3:
        if first_evo and first_evo["method"] == "level" and first_evo["level"] <= 10:
            return [205, 215, 395][s - 1]                 # líneas tipo «bicho temprano»
        if by_id[r]["types"][0] == "Virus":
            return [300, 410, 530][s - 1]
        if r in STARTERS:
            return [318, 405, 525][s - 1]
        return [305, 405, 505][s - 1]
    if d == 2:
        return [330, 485][s - 1]
    return 470 + int(h(i, 9) * 30)                          # fase única

W = {  # hp atk def spa spd spe
 "Levadura":    [1.15,1.00,0.90,0.85,1.00,1.00], "Fotótrofo":  [1.00,0.90,1.00,1.15,1.10,0.85],
 "Anaerobio":   [0.95,1.10,0.90,1.15,0.95,1.05], "Protozoo":   [1.10,0.95,1.05,1.00,1.10,0.85],
 "Espiroqueta": [0.85,0.95,0.85,1.15,0.95,1.25], "Gram+":      [1.00,1.15,1.30,0.75,0.85,0.75],
 "Gram-":       [1.00,1.05,0.95,1.00,1.00,1.00], "Antibiótico":[1.00,1.30,0.90,0.75,0.90,1.00],
 "Esporulado":  [1.05,1.20,1.15,0.80,0.85,0.85], "Alga":       [0.95,1.00,0.90,1.00,0.95,1.20],
 "Intracelular":[0.90,0.75,0.85,1.30,1.15,1.10], "Hongo":      [1.00,1.10,1.00,0.85,0.95,0.95],
 "Ácido-Alc.":  [1.05,0.95,1.10,1.10,1.05,0.80], "Archaea":    [0.90,0.90,1.00,1.20,1.05,1.00],
 "Virus":       [1.05,1.20,0.95,1.15,0.90,1.00], "Biofilm":    [1.00,1.00,1.35,0.85,1.15,0.70],
 "Extremófilo": [1.05,1.15,1.05,0.95,0.95,1.00], "Simbionte":  [1.05,0.85,0.95,1.05,1.25,0.95],
}
SHAPE = {  # formas fijadas a mano
 "tardigrad": [1.9,1.05,1.05,0.6,1.1,0.3], "kefirgran": [2.6,0.45,0.55,0.8,1.35,0.6],
 "coli-k12": [0.8,0.4,1.4,0.6,0.8,1.6], "myxococcus": [1,1,1,1,1,1], "luca": [1,1,1,1,1,1],
 "ecoli-o157": [1.0,1.2,0.9,1.2,0.9,1.1], "salmonella-typhimurium": [1.0,0.9,0.9,1.3,1.0,1.2],
}
STATS = ["hp", "atk", "def", "spa", "spd", "spe"]

def base_stats(i):
    m = by_id[i]; b = bst_for(i)
    if i in SHAPE:
        w = SHAPE[i]
    else:
        t = m["types"]
        w = [W[t[0]][k] * (0.6 if len(t) > 1 else 1) + (W[t[1]][k] * 0.4 if len(t) > 1 else 0) for k in range(6)]
        r = root(i)   # la forma de la línea es estable entre fases
        w = [w[k] * (0.88 + 0.24 * h(r, k)) for k in range(6)]
    tot = sum(w)
    st = [max(10, round(b * x / tot)) for x in w]
    st[5] += b - sum(st)   # cuadrar el total
    return dict(zip(STATS, st))

def growth(i):
    r = root(i)
    if i in LEGEND or r in ("poxvir", "tardigrad") or i == "tardigrad": return "slow"
    if r in STARTERS or r in ("pleomorph", "stromatol", "amberspor"): return "medium_slow"
    if depth(r) == 3 and bst_for(r) <= 215: return "medium_fast"
    if any(t in ("Simbionte", "Levadura") for t in by_id[i]["types"]) and depth(r) == 1: return "fast"
    return "medium_fast"

def catch_rate(i):
    if i in LEGEND: return 3
    if i in ("myxococcus",): return 35
    r, b = root(i), bst_for(i)
    if r in STARTERS or r in ("poxvir", "pleomorph", "stromatol", "amberspor") or i == "tardigrad": return 45
    return max(25, min(255, round(255 - (b - 200) * 0.62)))

def exp_yield(i):
    b = bst_for(i)
    if i in LEGEND: return round(b * 0.5)
    r, s, d = root(i), stage(i), depth(root(i))
    if d == 1: return round(b * 0.35)
    return round(b * (0.2 if s == 1 else 0.33 if s < d else 0.45))

def size_class(i):
    m = by_id[i]
    if i in ("thiomargar", "tardigrad", "volvox", "spirulmax"): return 6
    if "Virus" in m["types"] and i not in ("mimivir", "pandoravir"): return 1
    return max(1, min(6, stage(i) + round(bst_for(i) / 200) - 1))

# --- Movimientos ------------------------------------------------------------------
EXCLUSIVE = {"mimetismo-molecular": {"myxococcus", "luca"}, "agitacion-en-placa": {"coli-k12", "luca"},
             "agotamiento-de-nutrientes": set()}
HM = {m["id"] for m in moves if m.get("hm")}
POOL = [m for m in moves if m["id"] not in EXCLUSIVE and m["id"] not in HM]
def tier(m):
    if m["category"] == "status": return None
    p = m["power"] or 60
    if m.get("ohko") or p > 100: return 5
    if m.get("multihit") and p < 30: return 1
    return 1 if p <= 40 else 2 if p <= 65 else 3 if p <= 85 else 4 if p <= 100 else 5
TIER_LV = {1: (1, 12), 2: (10, 24), 3: (20, 36), 4: (32, 46), 5: (42, 56)}
STARTER_HIT = ["contacto-celular", "fimbria-afilada", "golpe-peptidoglicano"]
STARTER_DEBUFF = ["senal-quimica", "resonancia-magnetica", "deteccion-quorum"]

def pick(lst, seed, n):
    lst = sorted(lst, key=lambda m: h(seed, m["num"]))
    return lst[:n]

def learnset(i, doc_moves):
    m = by_id[i]; r = root(i); s = stage(i); d = depth(r)
    if i == "luca":
        return [{"level": 1 + (k * 99) // 164, "move": x["id"]} for k, x in enumerate(moves) if x["id"] != "agotamiento-de-nutrientes"]
    if i == "myxococcus": return [{"level": 1, "move": "mimetismo-molecular"}]
    if i == "coli-k12": return [{"level": 1, "move": "agitacion-en-placa"}, {"level": 15, "move": "contacto-celular"}]
    seed = r
    chosen = {}
    chosen[pick([mv[x] for x in STARTER_HIT], seed, 1)[0]["id"]] = 1
    chosen[pick([mv[x] for x in STARTER_DEBUFF], seed + "d", 1)[0]["id"]] = 1
    types = m["types"]
    # Progresión de daño: un movimiento de daño nuevo cada ~5-6 niveles, de menos a más potencia.
    SLOTS = [5, 9, 13, 17, 21, 26, 31, 36, 42, 48, 55]
    def pw(x): return 160 if x.get("ohko") else (x["power"] or 60)
    stab = [x for x in POOL if x["type"] in types and x["category"] != "status"]
    stab = sorted(pick(stab, seed + "stab", len(stab)), key=pw)
    # nunca más de 7 de STAB; repartidos por potencia
    if len(stab) > 7:
        idx = sorted({round(k * (len(stab) - 1) / 6) for k in range(7)})
        stab = [stab[k] for k in idx]
    fill = [x for x in POOL if x["type"] == "Levadura" and x["category"] != "status" and x["id"] not in chosen]
    cov = [x for x in POOL if x["type"] not in types and x["type"] != "Levadura" and x["category"] != "status" and 50 <= pw(x) <= 90]
    seq = list(stab)
    seq += pick([x for x in fill if 50 <= pw(x) <= 90], seed + "f", 1)
    seq += pick(cov, seed + "c", 2 if len(stab) < 4 else 1)
    seq = sorted({x["id"]: x for x in seq}.values(), key=pw)
    slots = SLOTS[: len(seq)] if len(seq) <= len(SLOTS) else SLOTS
    # repartir: si hay pocos movimientos, se espacian más
    if len(seq) < len(SLOTS):
        step = (len(SLOTS) - 1) / max(1, len(seq) - 1)
        slots = [SLOTS[min(len(SLOTS) - 1, round(k * step))] for k in range(len(seq))]
    for x, lv in zip(seq, slots):
        chosen.setdefault(x["id"], lv)
    # Movimientos de estado de sus tipos
    st = [x for x in POOL if x["type"] in types and x["category"] == "status"]
    for k, x in enumerate(pick(st, seed + "s", 3)):
        chosen.setdefault(x["id"], [7, 19, 34][k])
    # Movimientos que el GDD asigna a este Microo en algún equipo
    for x in doc_moves:
        if x in mv and x not in chosen:
            t = tier(mv[x]) or 2
            lo, hi = TIER_LV[t]
            chosen[x] = lo + int(h(i, mv[x]["num"]) * (hi - lo))
    # Las fases evolucionadas aprenden los movimientos fuertes algo más tarde
    out = []
    for k, lv in chosen.items():
        if lv > 1 and s > 1:
            lv = min(70, lv + 2 * (s - 1))
        out.append({"level": lv, "move": k})
    out.sort(key=lambda e: (e["level"], mv[e["move"]]["num"]))
    return out

def mo_compat(i):
    t = set(by_id[i]["types"])
    res = []
    rules = {"celulasa": {"Hongo", "Fotótrofo", "Antibiótico", "Gram-", "Biofilm", "Levadura", "Esporulado", "Extremófilo"},
             "bioaerosol": {"Alga", "Hongo", "Espiroqueta"},
             "flagelo-polar": {"Protozoo", "Espiroqueta", "Alga", "Ácido-Alc.", "Gram-"},
             "pili-tipo-iv": {"Biofilm", "Gram+", "Gram-", "Antibiótico", "Esporulado", "Extremófilo", "Levadura", "Virus"},
             "quorum-sensing-lux": {"Simbionte", "Gram-", "Intracelular", "Archaea", "Espiroqueta", "Alga"}}
    for k, tys in rules.items():
        if t & tys or i == "luca": res.append(k)
    if by_id[i]["id"] in ("coli-k12", "myxococcus"): return []
    return res

def main():
    tr = json.load(open(ROOT / "data/trainers.json", encoding="utf-8"))
    doc_moves = {}
    for t in tr:
        for p in t["team"]:
            doc_moves.setdefault(p["species"], set()).update(p.get("moves", []))
    out = []
    for m in dex:
        i = m["id"]
        out.append({"id": i, "baseStats": base_stats(i), "bst": bst_for(i), "growth": growth(i),
                    "catchRate": catch_rate(i), "expYield": exp_yield(i), "size": size_class(i),
                    "stage": stage(i), "learnset": learnset(i, sorted(doc_moves.get(i, []))),
                    "mo": mo_compat(i)})
    (ROOT / "data/species.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print("OK", len(out), "especies")

if __name__ == "__main__":
    main()
