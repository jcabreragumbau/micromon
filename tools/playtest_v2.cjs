// Prueba rápida de Micromón V2 en el navegador: en cada ciudad nueva entra por cada puerta y vuelve a salir, y
// recorre las salidas. Uso: NODE_PATH=$(npm root -g) node tools/playtest_v2.cjs <carpeta>
const { chromium } = require("playwright");
const path = require("path");
(async () => {
  const dir = process.argv[2] ?? "/tmp";
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 1100, height: 800 } });
  const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("file://" + path.resolve("dist/indexV2.html"));
  const G = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => !!window.micromon);
  await page.keyboard.press("KeyZ"); await page.waitForTimeout(150); await page.keyboard.press("Enter"); await page.waitForTimeout(600);
  await G(() => { const g = window.micromon, E = micromonDebug.engine; g.state.party = [E.createMicroo("synechoc", 30, {})]; g.noEncounters = true;
    for (const m of Object.values(micromonDebug.MAPS)) for (const n of m.npcs) if (n.trainer) g.state.flags[`entrenador:${n.id}`] = true; });
  const press = async (d) => {
    await G((d) => window.micromon.input.hold(d, true), d);
    for (let t = 0; t < 40 && !(await G(() => window.micromon.scene.moving > 0)); t++) await page.waitForTimeout(10);
    await G((d) => window.micromon.input.hold(d, false), d);
    await page.waitForTimeout(900);
  };
  const calma = async () => { for (let i = 0; i < 60; i++) { const ok = await G(() => { const g = window.micromon; return !g.overlays.length && g.scene?.constructor.name === "Overworld" && !g.scene.busy; }); if (ok) return; await G(() => window.micromon.input.press("a")); await page.waitForTimeout(120); } };
  const ciudades = await G(() => Object.values(micromonDebug.MAPS).filter((m) => m.outdoor && (m.props ?? []).some((p) => p.sprite.startsWith("v2_"))).map((m) => [m.id, m.warps.filter((w) => !micromonDebug.MAPS[w.to].outdoor && w.y > 0 && w.x > 0).map((w) => [w.x, w.y, w.to])]));
  const fallos = [];
  let n = 0;
  for (const [id, puertas] of ciudades) {
    for (const [x, y, to] of puertas) {
      await G(([id, x, y]) => micromonDebug.enterWorld(window.micromon, id, x, y + 1, 1), [id, x, y]); await page.waitForTimeout(400); await calma();
      if (n++ < 3) await page.screenshot({ path: `${dir}/v2_${id}_${to}.png` });
      await press("up");
      const dentro = await G(() => window.micromon.state.map);
      if (dentro !== to) { fallos.push(`${id}: la puerta (${x},${y}) no lleva a ${to} (${dentro})`); continue; }
      // salir: buscar la alfombra de salida y bajar
      await calma();
      await G((id) => { const g = window.micromon, m = micromonDebug.MAPS[g.state.map]; const w = m.warps.find((w) => w.to === id); micromonDebug.enterWorld(g, m.id, w.x, w.y - 1, 0); }, id);
      await page.waitForTimeout(400); await calma(); await press("down");
      const fuera = await G(() => [window.micromon.state.map, window.micromon.state.x, window.micromon.state.y]);
      if (fuera[0] !== id || fuera[1] !== x || fuera[2] !== y + 1) fallos.push(`${id}: al salir de ${to} se aparece en ${fuera}`);
    }
  }
  console.log(JSON.stringify({ errors, fallos, puertas: n }));
  await b.close();
})();
