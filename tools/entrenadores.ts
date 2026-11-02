// Coloca entrenadores para que sean inesquivables: para cada mapa busca, cerca de la posición original de cada
// entrenador, una casilla y una dirección cuya línea de visión corte todos los caminos entre la entrada y la
// salida (o el líder, en los gimnasios) sin bloquear el paso. Uso:
//   bun run tools/entrenadores.ts            → informe de qué entrenadores se pueden esquivar
//   bun run tools/entrenadores.ts --colocar  → además propone posiciones (JSON) para los que falten
//   bun run tools/entrenadores.ts --colocar --rehacer id1,id2 → vuelve a buscar sitio para esos entrenadores
import { MAPS } from "../src/game/world/maps";
import { tileAt, passable, type MapDef, type NpcDef } from "../src/game/world/builder";

const DX = [0, 0, -1, 1], DY = [1, -1, 0, 0];
type P = [number, number];

/** Extremos del recorrido obligatorio de un mapa: de la primera entrada a la última, o al líder en los gimnasios. */
export function extremos(m: MapDef): [P, P] | null {
  const ents: P[] = [];
  const vistos = new Set<string>();
  for (const o of Object.values(MAPS)) for (const w of o.warps) if (w.to === m.id && !vistos.has(o.id)) { vistos.add(o.id); ents.push([w.tx, w.ty]); }
  const lider = m.npcs.find((n) => n.id.startsWith("lider-"));
  if (lider && ents.length) return [ents[0], [lider.x, lider.y + 1]];
  if (ents.length >= 2) return [ents[0], ents[ents.length - 1]];
  return null;
}

export function analiza(m: MapDef, extraSolidos: Set<string> = new Set()) {
  const ocupado = new Set([...m.npcs.filter((n) => !n.hideIf).map((n) => `${n.x},${n.y}`), ...extraSolidos]);
  const libre = (x: number, y: number) => x >= 0 && y >= 0 && x < m.w && y < m.h && passable(tileAt(m, x, y)) && tileAt(m, x, y) !== "bordillo" && !ocupado.has(`${x},${y}`);
  const dirsDe = (n: NpcDef) => { const mv = n.move ?? ""; return mv.startsWith("mirar:") ? mv.slice(6).split(",").map(Number) : mv === "reloj" ? [0, 1, 2, 3] : mv.startsWith("patrulla:h") ? [2, 3] : mv.startsWith("patrulla:v") ? [0, 1] : [n.dir ?? 0]; };
  const cono = (x: number, y: number, d: number, L: number) => { const s = new Set<string>(); for (let k = 1; k <= L; k++) { const cx = x + DX[d] * k, cy = y + DY[d] * k; if (!libre(cx, cy)) break; s.add(`${cx},${cy}`); } return s; };
  const vista = (n: NpcDef) => { const s = new Set<string>(); for (const d of dirsDe(n)) cono(n.x, n.y, d, Math.max(4, n.trainer!.sight)).forEach((k) => s.add(k)); return s; };
  const llega = (a: P, b: P, prohibido: Set<string>, solidoExtra?: string) => {
    const seen = new Set([`${a}`]), q: P[] = [a];
    while (q.length) {
      const [x, y] = q.shift()!;
      if (x === b[0] && y === b[1]) return true;
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d], ny = y + DY[d], k = `${nx},${ny}`;
        if (seen.has(k) || prohibido.has(k) || k === solidoExtra) continue;
        const destino = nx === b[0] && ny === b[1];
        if (!libre(nx, ny) && !destino) {
          if (d === 0 && tileAt(m, nx, ny) === "bordillo" && libre(nx, ny + 1) && !prohibido.has(`${nx},${ny + 1}`)) { seen.add(`${nx},${ny + 1}`); q.push([nx, ny + 1]); }
          continue;
        }
        seen.add(k); q.push([nx, ny]);
      }
    }
    return false;
  };
  return { libre, cono, vista, llega };
}

if (import.meta.main) {
  const colocar = process.argv.includes("--colocar");
  const propuestas: Record<string, { x: number; y: number; dir: number }> = {};
  const ia = process.argv.indexOf("--rehacer"), rehacer = new Set(ia > 0 ? process.argv[ia + 1].split(",") : []);
  for (const m of Object.values(MAPS)) {
    const trs = m.npcs.filter((n) => n.trainer);
    const ext = extremos(m);
    if (!trs.length || !ext) continue;
    const [a, b] = ext;
    let A = analiza(m);
    const ines = trs.filter((n) => !rehacer.has(n.id) && !A.llega(a, b, A.vista(n)));
    const objetivo = m.npcs.some((n) => n.id.startsWith("lider-")) ? Math.max(1, Math.ceil(trs.length / 2)) : m.outdoor ? Math.ceil((trs.length * 2) / 3) : Math.ceil(trs.length / 2);
    console.log(`${m.id.padEnd(20)} ${trs.length} entrenadores · inesquivables ${ines.length}/${objetivo}`);
    if (!colocar || (ines.length >= objetivo && !trs.some((n) => rehacer.has(n.id)))) continue;
    // candidatos: lejos de las entradas, fuera de puertas, objetos, carteles y disparadores
    const prohibidas = new Set<string>();
    for (const w of m.warps) for (let i = -1; i <= (w.w ?? 1); i++) for (let j = -1; j <= (w.h ?? 1); j++) prohibidas.add(`${w.x + i},${w.y + j}`);
    for (const t of m.triggers) for (let i = -1; i <= (t.w ?? 1); i++) for (let j = -1; j <= (t.h ?? 1); j++) prohibidas.add(`${t.x + i},${t.y + j}`);
    m.items.forEach((i) => prohibidas.add(`${i.x},${i.y}`)); m.signs.forEach((s) => prohibidas.add(`${s.x},${s.y}`));
    const fijados = new Set(ines.map((n) => `${n.x},${n.y}`));
    let faltan = objetivo - ines.length;
    for (const n of trs.filter((t) => !ines.includes(t)).sort((p, q) => Number(rehacer.has(q.id)) - Number(rehacer.has(p.id)))) {
      if (faltan <= 0 && !rehacer.has(n.id)) break;
      A = analiza(m, new Set([...fijados]));
      let mejor: { x: number; y: number; dir: number; score: number } | null = null;
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
        const k = `${x},${y}`;
        if (prohibidas.has(k) || !(A.libre(x, y) || (x === n.x && y === n.y))) continue;
        if (Math.abs(x - a[0]) + Math.abs(y - a[1]) < 4 || Math.abs(x - b[0]) + Math.abs(y - b[1]) < 3) continue;
        if (m.npcs.some((o) => o !== n && Math.abs(o.x - x) + Math.abs(o.y - y) < 3)) continue;   // repartidos
        if (!A.llega(a, b, new Set(), k)) continue;                     // el entrenador no puede tapar el paso
        for (let d = 0; d < 4; d++) {
          const c = A.cono(x, y, d, Math.max(4, n.trainer!.sight));
          if (c.size < 2 || A.llega(a, b, c, k)) continue;
          const score = Math.abs(x - n.x) + Math.abs(y - n.y) + (d === (n.dir ?? 0) ? 0 : 0.5);
          if (!mejor || score < mejor.score) mejor = { x, y, dir: d, score };
        }
      }
      if (mejor) { propuestas[n.id] = { x: mejor.x, y: mejor.y, dir: mejor.dir }; fijados.add(`${mejor.x},${mejor.y}`); faltan--; console.log(`   → ${n.id}: (${n.x},${n.y}) → (${mejor.x},${mejor.y}) dir ${mejor.dir}`); }
      else console.log(`   ✗ ${n.id}: sin posición que corte el paso`);
    }
  }
  if (colocar) console.log(JSON.stringify(propuestas));
}
