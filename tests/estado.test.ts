import { test, expect } from "bun:test";
import { createMicroo, Rng } from "../src/engine";
import { newState, repararUids } from "../src/game/state";

test("una partida guardada con uid repetidos se renumera y los Microos nuevos no chocan", () => {
  const s = newState(), r = new Rng(1);
  const a = createMicroo("anabaen", 31, { rng: r }), g = createMicroo("giardia", 20, { rng: r });
  // simula una partida guardada: dos Microos con el mismo uid y uid bajos
  a.uid = 1; g.uid = 1;
  s.party = [a, g];
  repararUids(s);
  expect(new Set(s.party.map((m) => m.uid)).size).toBe(2);
  const nuevo = createMicroo("giardia", 5, { rng: r });
  expect(s.party.map((m) => m.uid)).not.toContain(nuevo.uid);
});
