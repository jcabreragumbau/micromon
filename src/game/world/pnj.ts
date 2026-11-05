// Aspecto de los PNJ genéricos con los sprites de 4.ª generación del usuario (npc01…npc37, de tools/art/npcs_ds.py).
// Los personajes con nombre propio (líderes, Alto Mando, Unidad de Genética, Koch, la profesora, el rival, la madre
// del jugador) y los oficios con uniforme propio (enfermeras, dependientes de tienda) conservan su sprite.
import { MAPS } from "./maps";
import type { NpcDef } from "./builder";

const n = (...k: number[]) => k.map((i) => `npc${String(i).padStart(2, "0")}`);

// Personajes de las hojas, por grupos
const CHICAS = n(1, 19, 20, 22, 24, 26, 28, 30, 32);
const CHICOS = n(5, 6, 7, 9, 10, 13, 14, 16, 17, 29, 31, 33);
const MUJERES = n(18, 19, 22, 30, 4);
const MAYORES_H = n(2, 15, 35, 34);
const MAYORES_M = n(36, 37, 23);
const CIENTIFICOS_H = n(3), CIENTIFICAS = n(4, 23);
const POLICIA = n(25), MARINERO = n(27);
const GENERICOS = new Set(["chica", "chico", "estudiante", "becario", "madre", "jubilado", "dependiente", "enfermera"]);

/** Oficio del entrenador -> aspecto (por palabras de la clase). */
const POR_OFICIO: [RegExp, string[]][] = [
  [/Excursionista|Montañer|Espeleólog/, n(21, 11)],
  [/Culturista/, n(13)],
  [/Agrónom|Granjer|Salinero/, n(12)],
  [/Biólogo de campo|Paleomicro|Arqueólog/, n(11)],
  [/Micólog|Coleccionista de Esporas/, n(8)],
  [/Surfista|Pescador|Oceanógraf|Marin/, n(28, 9)],
  [/Catedrático Emérito/, n(15)],
];

/** Mujer u hombre: por el sprite que tenía (chica/chico) o, si no, por el género del oficio. */
function femenina(d: NpcDef): boolean {
  if (d.sprite === "chica" || d.sprite === "madre") return true;
  if (d.sprite === "chico") return false;
  const [a, b = ""] = (d.trainer?.clase ?? "").split(" ");
  return a.endsWith("ista") ? b.endsWith("a") : a.endsWith("a");
}

function opciones(m: string, d: NpcDef): string[] | null {
  const talk = Array.isArray(d.talk) ? d.talk.join(" ") : d.talk ?? "";
  const clase = d.trainer?.clase ?? "";
  if (!GENERICOS.has(d.sprite) || d.sprite === "enfermera") return null;   // los reclutas de la Unidad, etc., no se tocan
  if (d.sprite === "madre" && m === "casa-jugador") return null;
  if (d.sprite === "dependiente") {
    if (d.script === "ferri" || /marinero/.test(d.id)) return MARINERO;
    if (/guarda/.test(d.id) || talk.startsWith("Guarda")) return POLICIA;
    return null;                                     // dependientes de tienda y del casino: uniforme propio
  }
  if (d.trainer) {
    const f = femenina(d);
    for (const [re, pool] of POR_OFICIO) if (re.test(clase)) {
      const p = pool.filter((s) => f === (s === "npc28" || s === "npc24"));
      if (p.length) return p;
    }
    return f ? CHICAS.concat(CIENTIFICAS) : CHICOS.concat(CIENTIFICOS_H);
  }
  switch (d.sprite) {
    case "becario": return CIENTIFICOS_H.concat(CIENTIFICAS);
    case "chica": return CHICAS;
    case "chico": return CHICOS;
    case "madre": return MUJERES;
    case "jubilado": return MAYORES_H.concat(MAYORES_M);
    case "estudiante": return CHICOS.concat(CHICAS);
    default: return null;
  }
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Sustituye los sprites genéricos por los nuevos. Determinista (por id) y sin repetir aspecto dentro de un mapa
 *  mientras haya opciones. */
export function asignarAspectos() {
  for (const m of Object.values(MAPS)) {
    const usados = new Set<string>();
    for (const d of m.npcs) {
      const op = opciones(m.id, d);
      if (!op?.length) continue;
      const h = hash(d.id + "@" + m.id);
      let elegido = op[h % op.length];
      for (let k = 0; k < op.length; k++) {
        const c = op[(h + k) % op.length];
        if (!usados.has(c)) { elegido = c; break; }
      }
      usados.add(elegido);
      d.sprite = elegido;
    }
  }
}
