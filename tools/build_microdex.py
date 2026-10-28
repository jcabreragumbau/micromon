#!/usr/bin/env python3
"""Construye data/microdex.json (150 Microos canónicos) a partir de docs/gdd.txt.

Decisiones de canonización (ver docs/auditoria.md):
  - Se mantiene la numeración original del GDD solo como referencia (gdd_ref).
  - Las 4 líneas de Virus (12 Microos) se añaden; para mantener 150 se retiran
    12 Microos de líneas sin uso en equipos de entrenadores.
  - Fischeri/Cholerae -> Paracholerae/Parahaemolyticus; Helicobac -> Vulnificus
    (según el apartado de lore de Vibrio del GDD).
"""
import json, re, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
txt = (ROOT / "docs" / "gdd.txt").read_text(encoding="utf-8").splitlines()

START = next(i for i, l in enumerate(txt) if l.startswith("3. Lista Completa de los 150"))
END = next(i for i, l in enumerate(txt) if l.startswith("4. Los 165 Movimientos"))
region = txt[START:END]

CUT = {"Epidermi", "Aureus", "Mirabilis", "Vulgaris", "Micrococ", "Sarcina",
       "Klebsi", "Pneumonia-K", "Pelagibac", "Prochloron", "Bifidum", "Longum"}
REPLACED = {"Fischeri", "Cholerae", "Helicobac"}
VIRUS_LINES = [  # (nombres) de las 4 líneas de virus
    ("Phage-X174", "Lambda-V", "T4-Titan"),
    ("Rous-V", "Lentivir", "Retrovir-X"),
    ("Lyssavir", "Marburg-V", "Filovir-Z"),
    ("Poxvir", "Mimivir", "Pandoravir"),
]
VIRUS = {n for line in VIRUS_LINES for n in line}

tok = re.compile(r"#(\d{3})\s+(.+?)\s*:?\s*\[([^\]]+)\]")
section = ""
seen = {}          # nombre -> dict
order = []         # nombres en orden de aparición
last_in_bullet = None

def slug(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def split_name(raw):
    raw = raw.strip().strip("*")
    m = re.match(r"^(.*?)\s*\((.*)\)\s*$", raw)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return raw, ""

for line in region:
    s = line.strip()
    if not s:
        continue
    if not s.startswith("-") and "#" not in s[:2] and re.match(r"^[A-ZÁÉÍÓÚ].*\(#\d{3}", s):
        section = s
    matches = list(tok.finditer(s))
    for i, m in enumerate(matches):
        num, raw, types = m.group(1), m.group(2), m.group(3)
        # el nombre puede arrastrar texto del conector previo; quedarse con lo posterior al último '$'
        raw = raw.split("$")[-1].strip()
        name, note = split_name(raw)
        name = name.strip("* ")
        between = ""
        if i > 0:
            between = s[matches[i - 1].end():m.start()]
        evo = None
        if between:
            mm = re.search(r"Nv[^0-9]*(\d+)", between)
            pm = re.search(r"Pl[aá]smido~(\w+)", between)
            if mm:
                evo = {"method": "level", "level": int(mm.group(1))}
            elif pm:
                evo = {"method": "item", "item": "Plásmido " + pm.group(1)}
            elif "Conjugaci" in between:
                evo = {"method": "conjugation"}
        types = [t.strip() for t in re.split(r"\s*/\s*", types)]
        rec = seen.get(name)
        if rec is None:
            rec = {"name": name, "note": note, "types": types, "gdd_ref": [int(num)],
                   "section": section, "prev": None, "evo_from_prev": None}
            seen[name] = rec
            order.append(name)
        else:
            if int(num) not in rec["gdd_ref"]:
                rec["gdd_ref"].append(int(num))
            if not rec["note"] and note:
                rec["note"] = note
        if i > 0 and rec["prev"] is None and evo:
            prev_name = split_name(matches[i - 1].group(2).split("$")[-1].strip())[0].strip("* ")
            rec["prev"] = prev_name
            rec["evo_from_prev"] = evo

# --- Entradas añadidas por el apartado de lore de Vibrio -------------------
extra = {
    "Paracholerae": dict(note="Vibrio paracholerae", types=["Gram-", "Protozoo"], gdd_ref=[58],
                         section="Lore Vibrio", prev=None, evo_from_prev=None),
    "Parahaemolyticus": dict(note="Vibrio parahaemolyticus", types=["Gram-", "Extremófilo"], gdd_ref=[59],
                             section="Lore Vibrio", prev="Paracholerae",
                             evo_from_prev={"method": "item", "item": "Plásmido Vir"}),
    "Vulnificus": dict(note="Vibrio vulnificus", types=["Gram-", "Protozoo"], gdd_ref=[108],
                       section="Lore Vibrio", prev=None, evo_from_prev=None),
}
for k, v in extra.items():
    seen[k] = dict(name=k, **v)

# --- Conjunto canónico ------------------------------------------------------
removed = []
canon = []
sort_key = {}
for name in order:
    if name in CUT or name in REPLACED:
        removed.append(name)
        continue
    r = seen[name]
    if name in VIRUS:
        # los virus se insertan tras Listeria (último especial del tramo medio)
        idx = [n for l in VIRUS_LINES for n in l].index(name)
        sort_key[name] = 128.5 + idx / 100
    else:
        sort_key[name] = min(r["gdd_ref"]) + 0.0
    canon.append(r)
for k in extra:
    r = seen[k]
    sort_key[k] = r["gdd_ref"][0] + (0.1 if k == "Parahaemolyticus" else 0.0)
    canon.append(r)

# Ramificada Pleomorph
for b in ("Halomorph", "Electromorph", "Pyromorph"):
    if b in seen:
        seen[b]["prev"] = "Pleomorph"
seen["Halomorph"]["evo_from_prev"] = {"method": "item", "item": "Plásmido Col"}
seen["Electromorph"]["evo_from_prev"] = {"method": "item", "item": "Plásmido F"}
seen["Pyromorph"]["evo_from_prev"] = {"method": "item", "item": "Plásmido R"}

# Virus: líneas definidas en el GDD (niveles 28/48, 30/50, 32/52, 35/55)
virus_levels = {"Lambda-V": 28, "T4-Titan": 48, "Lentivir": 30, "Retrovir-X": 50,
                "Marburg-V": 32, "Filovir-Z": 52, "Mimivir": 35, "Pandoravir": 55}
for line in VIRUS_LINES:
    for a, b in zip(line, line[1:]):
        seen[b]["prev"] = a
        seen[b]["evo_from_prev"] = {"method": "level", "level": virus_levels[b]}
    seen[line[0]]["prev"] = None
    seen[line[0]]["evo_from_prev"] = None

seen["Flavus"]["evo_from_prev"] = {"method": "level", "level": 25}  # el GDD usa Flavus Nv.25 en el Gimnasio 3
canon.sort(key=lambda r: sort_key[r["name"]])
if len(canon) != 150:
    sys.exit(f"ERROR: {len(canon)} Microos canónicos, se esperaban 150")

ID_OVERRIDE = {"Escherichia coli O157:H7": "ecoli-o157",
               "Salmonella enterica Typhimurium": "salmonella-typhimurium"}
by_name = {r["name"]: r for r in canon}
out = []
for i, r in enumerate(canon, 1):
    sid = ID_OVERRIDE.get(r["name"], slug(r["name"]))
    out.append({
        "dex": i, "id": sid, "name": r["name"], "organism": r["note"],
        "types": r["types"], "gdd_ref": r["gdd_ref"],
        "evolves_from": ID_OVERRIDE.get(r["prev"], slug(r["prev"])) if r["prev"] in by_name else None,
        "evolution": r["evo_from_prev"] if r["prev"] in by_name else None,
        "gdd_section": r["section"],
    })
ids = [o["id"] for o in out]
assert len(set(ids)) == 150, "ids duplicados"

(ROOT / "data").mkdir(exist_ok=True)
(ROOT / "data" / "microdex.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
(ROOT / "data" / "_removed.json").write_text(json.dumps({"retirados_por_cupo": sorted(CUT),
    "sustituidos_por_lore": sorted(REPLACED)}, ensure_ascii=False, indent=1), encoding="utf-8")
print("OK:", len(out), "Microos; retirados:", sorted(CUT), sorted(REPLACED))
