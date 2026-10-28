# Auditoría del GDD (Fase 0)

Resultado: `data/microdex.json` (150 Microos únicos), `data/types.json` (18×18 coherente) y `data/trainers.json` (14 equipos) validados con `python3 tools/validate.py`.
Todo se regenera con `tools/build_microdex.py`, `tools/build_types.py` y `tools/build_trainers.py`. Las decisiones de abajo están pendientes de aprobación.

## 1. Microdex: el GDD describe 162 Microos, no 150

El primer listado ocupa #001–#150 sin virus. El «cierre» redefine #116–#127 como las 4 líneas de Virus (12 Microos) sin retirar nada, mientras que los equipos del Alto Mando, el Gimnasio 6 y el Campeón siguen usando la numeración antigua para esos mismos números (por ejemplo #123 es a la vez *Plasmodium* y *Marburg-V*; #127, *Yersinia* y *Pandoravir*). Además #128 (*Listeria*) aparece dos veces y el apartado de Vibrio sustituye #058–#059 y #108.

Decisión propuesta:

| Cambio | Detalle |
| --- | --- |
| Se añaden las 4 líneas de Virus | 12 Microos: Phage-X174, Lambda-V, T4-Titan, Rous-V, Lentivir, Retrovir-X, Lyssavir, Marburg-V, Filovir-Z, Poxvir, Mimivir, Pandoravir |
| Se retiran 12 Microos sin uso en ningún equipo | Epidermi, Aureus, Mirabilis, Vulgaris, Micrococ, Sarcina, Klebsi, Pneumonia-K, Pelagibac, Prochloron, Bifidum, Longum (se quitan líneas enteras para no dejar evoluciones huérfanas) |
| Vibrio, según el lore | Fischeri y Cholerae pasan a Paracholerae y Parahaemolyticus; Helicobac pasa a Vulnificus |
| El Campeón usa Paracholerae | donde el GDD decía «#059 Cholerae» |
| Flavus | evoluciona a Nv. 25 (el GDD decía 31 pero el Gimnasio 3 lo usa a Nv. 25) |
| Numeración | consecutiva 1–150 por orden de la Microdex; el campo `gdd_ref` conserva el número original. Todo el código usa ids (`lambda-v`), nunca números |

Alternativa: si prefieres conservar otros Microos, dime cuáles y los cambio por cualquiera de la lista de retirados.

## 2. Tabla de tipos: 28 incoherencias entre columnas

Las columnas «Fuerte contra» y «Débil contra» deben ser espejo una de otra, pero no lo son (19 casos en un sentido y 9 en el otro; lista en `docs/auditoria_tipos.json`). Algunos ejemplos: *Archaea* (Fantasma) figura inmune a Antibiótico y Gram-, cuando Fantasma es inmune a Normal y Lucha, y *Levadura* (Normal) es fuerte contra Simbionte, cuando Normal no es superefectivo contra nada.
Nota: que Virus sea fuerte y débil contra Virus **no** es un error (igual que Dragón).

Decisión propuesta: `data/types.json` usa la tabla de Pokémon Gen 6+ trasladada con el mapeo de nombres que ya trae el GDD (Levadura=Normal, Fotótrofo=Planta, Anaerobio=Fuego, …). La tabla original queda en `docs/tipos_gdd_original.json`.

## 3. Sistemas del GDD que no estaban en el roadmap (fase 1)

Combates dobles 2v2 (Co-cultivo), reparto de experiencia (100 % participantes, 50 % reserva), tres dificultades (Fácil, Normal, Difícil con Level Cap estricto) y modo RandomLocke con randomizador configurable.

## 4. Lo que el GDD aún no define (se genera en la fase 1)

Estadísticas base, movimientos por nivel, tablas de encuentros por zona, mapas, diálogos, tiendas y música.
