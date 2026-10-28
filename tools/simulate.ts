// Simulador de equilibrio: combates automáticos entre IAs y estadísticas por especie.
// Uso: bun run tools/simulate.ts [nº de combates]
import { Battle, Rng, SPECIES, chooseActions, createMicroo, trainerParty, TRAINERS } from "../src/engine";

const N = Number(process.argv[2] ?? 3000);
const ids = [...SPECIES.keys()];
const rng = new Rng(42);
const wins = new Map<string, [number, number]>();
let turnsTotal = 0, unfinished = 0;
function run(b: Battle) {
  let t = 0;
  while (!b.ended && t < 300) {
    b.playTurn(chooseActions(b, 0, "dificil"), chooseActions(b, 1, "dificil"));
    for (const s of [0, 1] as const) for (const slot of b.needsReplacement(s)) {
      const idx = b.sides[s].party.findIndex((m, i) => m.hp > 0 && !b.sides[s].active.some((x) => x?.party === i));
      if (idx >= 0) b.replace(s, slot, idx);
    }
    b.drain(); t++;
  }
  return t;
}
for (let n = 0; n < N; n++) {
  const a = rng.pick(ids), c = rng.pick(ids);
  const b = new Battle({ player: [createMicroo(a, 50, { rng })], foe: [createMicroo(c, 50, { rng })], seed: n });
  const t = run(b); turnsTotal += t; if (!b.ended) unfinished++;
  for (const [id, won] of [[a, b.winner === 0], [c, b.winner === 1]] as const) {
    const w = wins.get(id) ?? [0, 0]; w[0] += won ? 1 : 0; w[1]++; wins.set(id, w);
  }
}
const rows = [...wins].filter(([, w]) => w[1] >= 10).map(([id, w]) => ({ id, bst: SPECIES.get(id)!.bst, rate: w[0] / w[1] }));
rows.sort((x, y) => y.rate - x.rate);
console.log(`Combates 1v1 a Nv.50: ${N}; turnos medios ${(turnsTotal / N).toFixed(1)}; sin terminar ${unfinished}`);
console.log("Más fuertes:", rows.slice(0, 8).map((r) => `${r.id}(${r.bst}) ${(r.rate * 100).toFixed(0)}%`).join(", "));
console.log("Más débiles:", rows.slice(-8).map((r) => `${r.id}(${r.bst}) ${(r.rate * 100).toFixed(0)}%`).join(", "));
// Correlación BST-victorias
const mx = rows.reduce((s, r) => s + r.bst, 0) / rows.length, my = rows.reduce((s, r) => s + r.rate, 0) / rows.length;
const cov = rows.reduce((s, r) => s + (r.bst - mx) * (r.rate - my), 0);
const vx = rows.reduce((s, r) => s + (r.bst - mx) ** 2, 0), vy = rows.reduce((s, r) => s + (r.rate - my) ** 2, 0);
console.log("Correlación estadísticas base / victorias:", (cov / Math.sqrt(vx * vy)).toFixed(2));

// Líderes contra un equipo «típico» del jugador (inicial + capturas, un Microo más que el jefe, al nivel del jefe)
console.log("\nEquipo de prueba del jugador (nivel del líder) contra cada jefe, dificultad Normal:");
for (const t of TRAINERS.values()) {
  const lv = Math.max(...t.team.map((p) => p.level));
  let won = 0;
  for (let k = 0; k < 60; k++) {
    const r2 = new Rng(k);
    const starters = ["spirulmax", "thermocel", "stentorox"];
    const pool = ids.filter((i) => SPECIES.get(i)!.bst >= 380 && SPECIES.get(i)!.bst <= 540);
    const size = Math.min(6, t.team.length + 1);
    const team = [createMicroo(lv < 16 ? "synechoc" : lv < 32 ? "anabaen" : r2.pick(starters), lv, { rng: r2 }),
      ...Array.from({ length: size - 1 }, (_, j) => createMicroo(r2.pick(pool), lv - 1 - (j % 3), { rng: r2 }))];
    const b = new Battle({ player: team, foe: trainerParty(t.id, "normal", r2), seed: k, difficulty: "normal" });
    run(b); if (b.winner === 0) won++;
  }
  console.log(`  ${t.id.padEnd(9)} ${t.name.padEnd(28)} jugador gana ${Math.round((won / 60) * 100)}%`);
}
