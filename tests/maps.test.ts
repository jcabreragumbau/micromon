import { describe, expect, test } from "bun:test";
import { MAPS, checkMaps } from "../src/game/world/maps";
import { tileAt, passable } from "../src/game/world/builder";

describe("Mapas del primer tramo", () => {
  test("coherencia de filas y destinos de puertas", () => { expect(checkMaps()).toEqual([]); });
  test("todas las salidas, objetos y personajes son alcanzables desde cada entrada", () => {
    const problems: string[] = [];
    for (const m of Object.values(MAPS)) {
      const solidNpc = new Set(m.npcs.filter((n) => !n.hideIf || !n.hideIf.startsWith("rival")).map((n) => `${n.x},${n.y}`));
      const items = new Set(m.items.map((i) => `${i.x},${i.y}`));
      const free = (x: number, y: number) => x >= 0 && y >= 0 && x < m.w && y < m.h && passable(tileAt(m, x, y)) && tileAt(m, x, y) !== "bordillo" && !solidNpc.has(`${x},${y}`) && !items.has(`${x},${y}`);
      // Entradas: destinos de warps de otros mapas hacia este
      const entries = Object.values(MAPS).flatMap((o) => o.warps.filter((w) => w.to === m.id).map((w) => [w.tx, w.ty] as [number, number]));
      if (!entries.length) continue;
      const seen = new Set<string>();
      const q = [entries[0]];
      seen.add(`${entries[0][0]},${entries[0][1]}`);
      while (q.length) {
        const [x, y] = q.shift()!;
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
          if (seen.has(k)) continue;
          // los bordillos se saltan hacia abajo
          if (dy === 1 && tileAt(m, nx, ny) === "bordillo" && free(nx, ny + 1)) { seen.add(`${nx},${ny + 1}`); q.push([nx, ny + 1]); continue; }
          if (!free(nx, ny)) continue;
          seen.add(k); q.push([nx, ny]);
        }
      }
      const near = (x: number, y: number) => [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => seen.has(`${x + dx},${y + dy}`)) || seen.has(`${x},${y}`);
      for (const [x, y] of entries) if (!seen.has(`${x},${y}`)) problems.push(`${m.id}: entrada ${x},${y} aislada`);
      for (const w of m.warps) {
        let ok = false;
        for (let i = 0; i < (w.w ?? 1); i++) for (let j = 0; j < (w.h ?? 1); j++) if (near(w.x + i, w.y + j)) ok = true;
        if (!ok) problems.push(`${m.id}: salida a ${w.to} inalcanzable`);
      }
      for (const n of m.npcs) if (n.sprite !== "" && !near(n.x, n.y) && !(tileAt(m, n.x + 0, n.y + 1) === "mostrador" && seen.has(`${n.x},${n.y + 2}`))) problems.push(`${m.id}: PNJ ${n.id} inalcanzable`);
      for (const i of m.items) if (!near(i.x, i.y)) problems.push(`${m.id}: objeto ${i.item} inalcanzable`);
    }
    expect(problems).toEqual([]);
  });
});
