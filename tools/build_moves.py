#!/usr/bin/env python3
"""Genera data/moves.json: los 165 movimientos del GDD.

Del GDD salen nombre, tipo microbiológico, categoría, potencia y probabilidades de
efecto secundario. Precisión, PP, prioridad, objetivo y la mecánica de cada efecto
salen de los datos de Pokémon Showdown (licencia MIT) para el movimiento original
con el mismo número (tools/source/showdown_moves_1-165.json).
"""
import json, re, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
gdd = (ROOT / "docs" / "gdd.txt").read_text(encoding="utf-8").splitlines()
ps = {m["num"]: m for m in json.load(open(ROOT / "tools/source/showdown_moves_1-165.json", encoding="utf-8"))}
TYPES = {t["name"] for t in json.load(open(ROOT / "data/types.json", encoding="utf-8"))["types"]}

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def detex(s):
    s = re.sub(r"\$H_\{2\}S\$", "H₂S", s)
    s = re.sub(r"\$CO_\{2\}\$", "CO₂", s)
    s = s.replace("$\\times 2$", "×2").replace("( × 2", "(×2").replace(" × ", "×")
    s = re.sub(r"\$0\.5 \\times\$ a \$1\.5 \\times\$", "0,5× a 1,5×", s)
    return s.replace("$", "").replace("\u2005", "").replace("( ×", "(×")

line_re = re.compile(r"^(\d+)\.\s+(.*?)\s+—\s+(.*)$")
moves = []
start = next(i for i, l in enumerate(gdd) if l.startswith("4. Los 165 Movimientos"))
for l in gdd[start:]:
    m = line_re.match(l.strip())
    if not m:
        continue
    num = int(m.group(1))
    if num > 165 or len(moves) == 165:
        break
    head, tail = detex(m.group(2)), detex(m.group(3))
    pm = re.match(r"^(.*)\s+\(([^()]*)\)$", head)
    name, orig_es = pm.group(1).strip(), pm.group(2).strip()
    hm = None
    mo = re.search(r"\s*\((MO0\d)\)", name)
    if mo:
        hm = mo.group(1); name = name.replace(mo.group(0), "").strip()
    parts = [p.strip() for p in tail.split("|")]
    mtype = parts[0]
    assert mtype in TYPES, (num, mtype)
    cat_raw = parts[1]
    if cat_raw.startswith("Estado"):
        category = "status"; effect_text = cat_raw[len("Estado"):].strip().strip("().")
        power_text = ""
    else:
        cw = cat_raw.split(" ", 1)
        category = {"Físico": "physical", "Especial": "special"}[cw[0]]
        power_text = parts[2] if len(parts) > 2 else (cw[1] if len(cw) > 1 else "")
        effect_text = ""
        em = re.search(r"\((.*)\)\.?$", power_text)
        if em:
            effect_text = em.group(1)
    pw = re.match(r"^(\d+)\s*Pot", power_text)
    s = ps[num]
    fl = s.get("flags") if isinstance(s.get("flags"), dict) else {}
    rec = {
        "num": num, "id": slug(name), "name": name, "orig": s["id"], "orig_es": orig_es,
        "type": mtype, "category": category,
        "power": int(pw.group(1)) if pw else (s["basePower"] or None),
        "accuracy": s["accuracy"], "pp": s["pp"], "priority": s["priority"],
        "target": s["target"], "desc": (power_text if category != "status" else effect_text).rstrip("."),
        "contact": bool(fl.get("contact")),
    }
    if hm: rec["hm"] = hm
    for k in ("multihit", "drain", "recoil", "critRatio", "ohko", "damage", "selfdestruct", "boosts",
              "volatileStatus", "status", "heal", "forceSwitch", "sideCondition", "hasCrashDamage"):
        if k in s and not (isinstance(s[k], list) and s[k] and s[k][0] == "RAW"):
            rec[k] = s[k]
    if s.get("self") and isinstance(s["self"], dict):
        rec["self"] = s["self"]
    if s.get("secondary") and isinstance(s["secondary"], dict):
        sec = dict(s["secondary"])
        cm = re.search(r"(\d+)%", effect_text)
        if cm and category != "status":
            sec["chance"] = int(cm.group(1))
        rec["secondary"] = sec
    flags = fl
    if flags.get("charge"): rec["charge"] = True
    if flags.get("recharge"): rec["recharge"] = True
    if s["id"] in ("fly", "dig"): rec["semiInvulnerable"] = s["id"]
    if s.get("callbacks"):
        rec["special"] = s["id"]
    moves.append(rec)

# Ajustes explícitos del GDD que contradicen el movimiento original
by = {m["num"]: m for m in moves}
by[41]["secondary"] = {"chance": 20, "status": "psn"}          # Doble Hifa: ×2, 20 % intoxicar
by[24]["multihit"] = 2; by[41]["multihit"] = 2; by[155]["multihit"] = 2
by[158]["secondary"] = {"chance": 30, "volatileStatus": "flinch"}  # Beta-Lactamasa: 30 % retroceso
by[150]["power"] = None
by[107]["boosts"] = {"evasion": 2}                             # Forma L: evasión +2
by[74]["boosts"] = {"atk": 1, "spa": 1}                          # Enriquecimiento Medio: Ataque y At. Esp.                                         # Agitación en Placa (Salpicadura)

assert len(moves) == 165, len(moves)
ids = [m["id"] for m in moves]
dups = {i for i in ids if ids.count(i) > 1}
assert not dups, dups
(ROOT / "data/moves.json").write_text(json.dumps(moves, ensure_ascii=False, indent=1), encoding="utf-8")
print("OK", len(moves), "movimientos;", sum(1 for m in moves if "special" in m), "con lógica especial")
