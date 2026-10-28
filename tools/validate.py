#!/usr/bin/env python3
"""Valida la coherencia de los datos de la fase 0. Sale con código 1 si hay errores."""
import json, sys
from pathlib import Path
R = Path(__file__).resolve().parent.parent / "data"
dex = json.load(open(R/"microdex.json", encoding="utf-8"))
types = json.load(open(R/"types.json", encoding="utf-8"))
trs = json.load(open(R/"trainers.json", encoding="utf-8"))
err, warn = [], []
tnames = {t["name"] for t in types["types"]}
ids = [m["id"] for m in dex]
if len(dex) != 150: err.append(f"{len(dex)} Microos (esperados 150)")
if len(set(ids)) != len(ids): err.append("ids duplicados")
if [m["dex"] for m in dex] != list(range(1,151)): err.append("numeración dex no consecutiva")
by = {m["id"]: m for m in dex}
for m in dex:
    for t in m["types"]:
        if t not in tnames: err.append(f"{m['id']}: tipo desconocido {t}")
    if not 1 <= len(m["types"]) <= 2: err.append(f"{m['id']}: nº de tipos inválido")
    p = m["evolves_from"]
    if p:
        if p not in by: err.append(f"{m['id']}: evolves_from {p} no existe")
        elif by[p]["dex"] > m["dex"]: warn.append(f"{m['id']}: evoluciona de {p} con dex mayor")
        if not m["evolution"]: err.append(f"{m['id']}: evolución sin método")
for t in trs:
    for s in t["team"]:
        if s["species"] not in by: err.append(f"{t['id']}: especie {s['species']} no existe")
        else:
            m = by[s["species"]]
            ev = m["evolution"]
            if ev and ev["method"] == "level" and s["level"] < ev["level"]:
                warn.append(f"{t['id']}: {m['id']} Nv.{s['level']} < nivel de evolución {ev['level']}")
n = len(types["chart_attacker_by_defender"])
if n != 18 or any(len(r) != 18 for r in types["chart_attacker_by_defender"]): err.append("tabla de tipos no es 18x18")
print(f"Microos: {len(dex)} | Entrenadores: {len(trs)} | líneas evolutivas: {sum(1 for m in dex if not m['evolves_from'] and any(x['evolves_from']==m['id'] for x in dex))}")
for w in warn: print("AVISO:", w)
for e in err: print("ERROR:", e)
sys.exit(1 if err else 0)
