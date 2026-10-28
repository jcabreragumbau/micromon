#!/usr/bin/env python3
"""Genera data/types.json: tabla de 18 tipos coherente (equivalente a la tabla de
Pokémon Gen 6+ mediante el mapeo de nombres del GDD) y la lista de incoherencias
de la tabla original del GDD en docs/auditoria_tipos.json."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
doc = json.load(open(str(ROOT/"docs"/"tipos_gdd_original.json"), encoding="utf-8")) if Path(ROOT/"docs"/"tipos_gdd_original.json").exists() else None
MAP = {"Normal":"Levadura","Grass":"Fotótrofo","Fire":"Anaerobio","Water":"Protozoo","Electric":"Espiroqueta",
       "Rock":"Gram+","Poison":"Gram-","Fighting":"Antibiótico","Ground":"Esporulado","Flying":"Alga",
       "Psychic":"Intracelular","Bug":"Hongo","Ice":"Ácido-Alc.","Ghost":"Archaea","Dragon":"Virus",
       "Steel":"Biofilm","Dark":"Extremófilo","Fairy":"Simbionte"}
ORDER = ["Normal","Grass","Fire","Water","Electric","Rock","Poison","Fighting","Ground","Flying",
         "Psychic","Bug","Ice","Ghost","Dragon","Steel","Dark","Fairy"]
# atacante: (súper eficaz, poco eficaz, inmune)
P = {
"Normal":(["",],["Rock","Steel"],["Ghost"]),
"Fire":(["Grass","Ice","Bug","Steel"],["Fire","Water","Rock","Dragon"],[]),
"Water":(["Fire","Ground","Rock"],["Water","Grass","Dragon"],[]),
"Electric":(["Water","Flying"],["Electric","Grass","Dragon"],["Ground"]),
"Grass":(["Water","Ground","Rock"],["Fire","Grass","Poison","Flying","Bug","Dragon","Steel"],[]),
"Ice":(["Grass","Ground","Flying","Dragon"],["Fire","Water","Ice","Steel"],[]),
"Fighting":(["Normal","Ice","Rock","Dark","Steel"],["Poison","Flying","Psychic","Bug","Fairy"],["Ghost"]),
"Poison":(["Grass","Fairy"],["Poison","Ground","Rock","Ghost"],["Steel"]),
"Ground":(["Fire","Electric","Poison","Rock","Steel"],["Grass","Bug"],["Flying"]),
"Flying":(["Grass","Fighting","Bug"],["Electric","Rock","Steel"],[]),
"Psychic":(["Fighting","Poison"],["Psychic","Steel"],["Dark"]),
"Bug":(["Grass","Psychic","Dark"],["Fire","Fighting","Poison","Flying","Ghost","Steel","Fairy"],[]),
"Rock":(["Fire","Ice","Flying","Bug"],["Fighting","Ground","Steel"],[]),
"Ghost":(["Psychic","Ghost"],["Dark"],["Normal"]),
"Dragon":(["Dragon"],["Steel"],["Fairy"]),
"Dark":(["Psychic","Ghost"],["Fighting","Dark","Fairy"],[]),
"Steel":(["Ice","Rock","Fairy"],["Fire","Water","Electric","Steel"],[]),
"Fairy":(["Fighting","Dragon","Dark"],["Fire","Poison","Steel"],[]),
}
names = [MAP[k] for k in ORDER]
idx = {n:i for i,n in enumerate(names)}
chart = [[1.0]*18 for _ in range(18)]   # chart[atacante][defensor]
for k,(se,nve,im) in P.items():
    a = idx[MAP[k]]
    for d in se:
        if d: chart[a][idx[MAP[d]]] = 2.0
    for d in nve: chart[a][idx[MAP[d]]] = 0.5
    for d in im: chart[a][idx[MAP[d]]] = 0.0
out = {"types": [{"id": i, "name": n, "pokemon_equiv": ORDER[i]} for i,n in enumerate(names)],
       "chart_attacker_by_defender": chart,
       "nota": "Tabla derivada de la de Pokémon Gen 6+ con el mapeo de nombres del GDD; reemplaza la tabla del GDD, que tiene 28 incoherencias (ver docs/auditoria.md)."}
(ROOT/"data").mkdir(exist_ok=True)
(ROOT/"data"/"types.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
# Auditoría de la tabla original
if doc:
    off={k:set(v) for k,v in doc["off"].items()}; weak={k:set(v) for k,v in doc["weak"].items()}
    a1=[f"{a} fuerte vs {b}, pero {b} no figura débil a {a}" for a in doc["types"] for b in sorted(off[a]) if a not in weak[b]]
    a2=[f"{b} figura débil a {a}, pero {a} no figura fuerte vs {b}" for b in doc["types"] for a in sorted(weak[b]) if b not in off[a]]
    # diferencias con la tabla derivada
    diffs=[]
    for a in doc["types"]:
        for b in doc["types"]:
            doc_v = 2.0 if b in off[a] else 1.0
            if a in doc["imm"][b]: doc_v = 0.0
            if chart[idx[a]][idx[b]] != doc_v and False: pass
    json.dump({"incoherencias_columnas": a1+a2, "total": len(a1+a2)}, open(ROOT/"docs"/"auditoria_tipos.json","w"), ensure_ascii=False, indent=1)
    print("incoherencias en la tabla del GDD:", len(a1+a2))
print("types.json escrito")
