// Comprobaciones de las ciudades de Micromón V2: se aplican sobre los mapas y se verifica que desde cada
// entrada se llega a todas las puertas y salidas, que los PNJ y objetos están en casillas transitables y que
// los warps de ida y vuelta casan. Uso: bun run tools/v2_check.ts
import { MAPS, checkMaps } from "../src/game/world/maps";
import { aplicarCiudadesV2 } from "../src/game/world/ciudades_v2";
import { tileAt, passable, type MapDef } from "../src/game/world/builder";

aplicarCiudadesV2();
const errores: string[] = [...checkMaps()];
const CIUDADES = Object.values(MAPS).filter((m) => m.outdoor && (m.props ?? []).some((p) => p.sprite.startsWith("v2_") || p.sprite === "farola"));
for (const m of CIUDADES) {
  const ok = (x: number, y: number) => x >= 0 && y >= 0 && x < m.w && y < m.h && (passable(tileAt(m, x, y)) || tileAt(m, x, y) === "puerta_hd");
  const npc = new Set(m.npcs.filter((n) => !n.hideIf && !n.showIf && n.sprite !== "").map((n) => `${n.x},${n.y}`));
  // punto de partida: la primera casilla de entrada desde fuera
  const entrada = Object.values(MAPS).flatMap((o) => o.warps.filter((w) => w.to === m.id).map((w) => [w.tx, w.ty] as [number, number]))[0];
  if (!entrada) { errores.push(`${m.id}: nadie entra`); continue; }
  const visto = new Set<string>([`${entrada}`]);
  const cola = [entrada];
  while (cola.length) {
    const [x, y] = cola.shift()!;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const k = `${x + dx},${y + dy}`;
      if (visto.has(k) || !ok(x + dx, y + dy) || npc.has(k)) continue;
      visto.add(k); cola.push([x + dx, y + dy]);
    }
  }
  for (const w of m.warps) {
    const celdas = Array.from({ length: (w.w ?? 1) * (w.h ?? 1) }, (_, i) => `${w.x + (i % (w.w ?? 1))},${w.y + Math.floor(i / (w.w ?? 1))}`);
    if (!celdas.some((c) => visto.has(c))) errores.push(`${m.id}: no se llega a la puerta/salida de ${w.to} (${w.x},${w.y})`);
    const t = MAPS[w.to];
    if (t && !(passable(tileAt(t, w.tx, w.ty)))) errores.push(`${m.id} → ${w.to}: llegada (${w.tx},${w.ty}) no transitable (${tileAt(t, w.tx, w.ty)})`);
  }
  for (const n of m.npcs) if (n.sprite !== "" && !passable(tileAt(m, n.x, n.y)) && !n.sprite.startsWith("@")) errores.push(`${m.id}: PNJ ${n.id} sobre ${tileAt(m, n.x, n.y)} (${n.x},${n.y})`);
  for (const it of m.items) if (!passable(tileAt(m, it.x, it.y))) errores.push(`${m.id}: objeto ${it.item} sobre ${tileAt(m, it.x, it.y)}`);
  const p = (m as MapDef & { puntos?: Record<string, [number, number]> }).puntos?.ferri;
  if (p && !passable(tileAt(m, p[0], p[1]))) errores.push(`${m.id}: llegada del ferri (${p}) no transitable`);
  // la vuelta desde cada interior cae delante de su puerta
  for (const w of m.warps) {
    const t = MAPS[w.to];
    if (!t || t.outdoor || w.x === 0 || w.y === 0 || w.x === m.w - 1 || w.y === m.h - 1) continue;
    const v = t.warps.find((u) => u.to === m.id);
    if (!v || v.tx !== w.x || v.ty !== w.y + 1) errores.push(`${m.id}: la salida de ${w.to} no vuelve a su puerta (${v?.tx},${v?.ty} ≠ ${w.x},${w.y + 1})`);
  }
}
console.log(`${CIUDADES.length} ciudades V2 · ${errores.length} errores`);
for (const e of errores) console.log(" -", e);
process.exit(errores.length ? 1 : 0);
