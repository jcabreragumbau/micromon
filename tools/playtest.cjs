// Partida automática en Chromium: recorre el primer tramo y guarda capturas de cada pantalla.
// Uso: NODE_PATH=$(npm root -g) node tools/playtest.cjs <carpeta>
const { chromium } = require("playwright");
const path = require("node:path");
(async () => {
  const out = process.argv[2] ?? "shots";
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 720, height: 560 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("file://" + path.resolve("dist/index.html"));
  await page.waitForTimeout(400);
  await page.evaluate(() => { try { localStorage.clear(); } catch {} });
  const G = (f, a) => page.evaluate(f, a);
  const shot = async (n) => { await page.waitForTimeout(80); await page.locator("canvas").screenshot({ path: `${out}/${n}.png` }); };
  const press = async (k, n = 1, wait = 70) => { for (let i = 0; i < n; i++) { await page.evaluate((k) => window.micromon.input.press(k), k); await page.waitForTimeout(wait); } };
  const top = () => G(() => { const o = window.micromon.overlays.at(-1); return o ? o.ov.constructor.name : ""; });
  const scene = () => G(() => window.micromon.scene?.constructor.name ?? "");
  const idle = () => G(() => { const g = window.micromon; return !g.overlays.length && g.scene && g.scene.constructor.name === "Overworld" && !g.scene.busy && !g.scene.moving; });
  async function advance(max = 200) { for (let i = 0; i < max; i++) { if (await idle()) return true; if ((await scene()) === "BattleScene") return false; await press("a", 1, 60); } return false; }
  async function walk(dir, n) {
    for (let i = 0; i < n; i++) {
      await G((d) => window.micromon.input.hold(d, true), dir);
      for (let t = 0; t < 30 && !(await G(() => window.micromon.scene.moving > 0 || window.micromon.overlays.length > 0)); t++) await page.waitForTimeout(8);
      await G((d) => window.micromon.input.hold(d, false), dir);
      for (let t = 0; t < 80 && !(await G(() => !window.micromon.scene.moving)); t++) await page.waitForTimeout(16);
      await page.waitForTimeout(40);
      if ((await top()) || (await scene()) !== "Overworld") return;
    }
  }
  async function autobattle(tag, shots = true, max = 600) {
    let k = 0;
    for (let i = 0; i < max; i++) {
      if ((await scene()) !== "BattleScene") { await page.waitForTimeout(300); if ((await scene()) !== "BattleScene") return; }
      const t = await top();
      if (shots && t === "ActionMenu" && k < 2) await shot(`${tag}-${k++}`);
      if (t === "PartyScreen") { await press("down"); await press("a"); continue; }
      if (t === "Choice") { await press("b"); continue; }
      if (t === "MoveMenu") {
        await G(() => { const ov = window.micromon.overlays.at(-1).ov, E = micromonDebug.engine;
          let best = ov.legal[0], bp = -1;
          for (const i of ov.legal) { const m = E.getMove(ov.mon.moves[i].id); const p = m.category === "status" ? 0 : (m.power ?? 40); if (p > bp) { bp = p; best = i; } }
          ov.sel = best; });
      }
      await press("a", 1, 60);
    }
  }
  const pos = () => G(() => ({ map: window.micromon.state.map, x: window.micromon.scene.px, y: window.micromon.scene.py }));
  await G(() => (window.micromon.turbo = 3));

  // --- Título y presentación
  await shot("01-titulo"); await press("a", 1, 300); await press("a", 1, 500);
  for (let i = 0; i < 60 && !(await G(() => window.micromon.overlays.some((o) => o.ov.options))); i++) await press("a");
  await press("a", 1, 300);
  for (let i = 0; i < 60 && !(await G(() => window.micromon.overlays.some((o) => o.ov.options && o.ov.options.length === 3))); i++) await press("a");
  await press("down"); await press("a", 1, 200);
  await advance(); await shot("02-casa");
  // --- Pueblo y laboratorio
  await walk("down", 2); await advance(); await shot("03-pueblo");
  await walk("left", 1); await walk("down", 7); await walk("right", 5); await shot("04-frente-lab"); await walk("up", 1);
  await page.waitForTimeout(400); await shot("05-lab-intro"); await advance();
  await walk("up", 3); await shot("06-mesa");
  await press("a", 1, 200); await shot("07-elegir");
  for (let i = 0; i < 40 && (await scene()) !== "BattleScene"; i++) await press("a", 1, 90);
  await page.waitForTimeout(600); await shot("08-combate-rival-intro");
  await autobattle("09-combate-rival");
  await advance(); await shot("10-tras-rival");
  const st1 = await G(() => ({ party: window.micromon.state.party.map((m) => [m.species, m.level, m.hp]), bag: window.micromon.state.bag, flags: window.micromon.state.flags }));
  // --- Menús
  await press("start", 1, 300); await shot("11-menu-inicio");
  await press("down", 1); await press("a", 1, 300); await shot("12-equipo");
  await press("a", 1, 200); await press("a", 1, 300); await shot("13-resumen"); await press("right", 1, 200); await shot("14-resumen-movs");
  await press("b", 3, 200); await press("down", 1); await press("a", 1, 300); await shot("15-mochila"); await press("right", 1, 150); await shot("16-mochila-criobolas");
  await press("b", 1, 200); await press("up", 2); await press("a", 1, 300); await shot("17-microdex"); await press("b", 2, 200);
  await advance();
  // --- Ruta 1 con combate salvaje y captura
  await G(() => micromonDebug.enterWorld(window.micromon, "ruta-1", 6, 22, 1)); await page.waitForTimeout(800); await shot("18-ruta1");
  await G(() => { const g = window.micromon; g.scene.busy = true; micromonDebug.wildBattle(g, g.scene, "coli-k12", 3).finally(() => (g.scene.busy = false)); });
  await page.waitForTimeout(1500); await shot("19-salvaje");
  // lanzar Criobola: MOCHILA → CRIOBOLAS → primera
  for (let i = 0; i < 30 && (await top()) !== "ActionMenu"; i++) await press("a");
  await press("right"); await press("a", 1, 300); await press("right", 1, 150); await press("a", 1, 300);
  await page.waitForTimeout(300); await shot("20-lanzar");
  await autobattle("21-captura", false); await advance(); await shot("22-tras-captura");
  // --- Entrenador que ve al jugador y encuentro en hierba alta caminando
  await G(() => { const g = window.micromon; for (const m of g.state.party) { m.level = Math.max(m.level, 10); micromonDebug.engine.recalcStats(m); m.hp = m.stats.hp; } });
  await G(() => micromonDebug.enterWorld(window.micromon, "ruta-1", 6, 20, 1)); await page.waitForTimeout(700);
  await walk("up", 5);
  for (let i = 0; i < 40 && (await scene()) !== "BattleScene"; i++) await press("a", 1, 90);
  await page.waitForTimeout(500); await shot("22b-entrenador");
  await autobattle("22c-entrenador", false); await advance();
  const trainerFlag = await G(() => !!window.micromon.state.flags["entrenador:r1-estudiante"]);
  await G(() => micromonDebug.enterWorld(window.micromon, "ruta-1", 3, 23, 0)); await page.waitForTimeout(700);
  let wild = false;
  for (let i = 0; i < 80 && !wild; i++) { await walk(i % 2 ? "up" : "down", 1); if ((await scene()) === "BattleScene") wild = true; }
  if (wild) { await page.waitForTimeout(900); await shot("22d-salvaje-hierba"); await autobattle("22e", false); await advance(); }
  // --- Ciudades, Incubadora, tienda, bosque
  await G(() => micromonDebug.enterWorld(window.micromon, "ciudad-viral", 11, 17, 1)); await page.waitForTimeout(800); await shot("23-ciudad-viral");
  await G(() => micromonDebug.enterWorld(window.micromon, "incubadora-viral", 5, 3, 1)); await page.waitForTimeout(700); await press("a", 1, 200); await shot("24-incubadora"); await advance(); await press("a"); await advance();
  await G(() => micromonDebug.enterWorld(window.micromon, "tienda-viral", 2, 4, 1)); await page.waitForTimeout(700); await press("a", 1, 300); await press("a", 1, 300); await shot("25-tienda"); await press("b", 4, 150); await advance();
  await G(() => micromonDebug.enterWorld(window.micromon, "bosque-viral", 2, 9, 3)); await page.waitForTimeout(800); await shot("26-bosque");
  await G(() => micromonDebug.enterWorld(window.micromon, "ciudad-petri", 11, 12, 1)); await page.waitForTimeout(800); await shot("27-ciudad-petri");
  // --- Gimnasio: subir el equipo para ganar y probar el combate de líder
  await G(() => { const g = window.micromon, e = micromonDebug.engine; g.state.party = [e.createMicroo(g.state.flags.starter, 25), e.createMicroo("anthracis", 22)]; });
  await G(() => micromonDebug.enterWorld(window.micromon, "gimnasio-petri", 5, 3, 1)); await page.waitForTimeout(800); await shot("28-gimnasio");
  await press("a", 1, 200);
  for (let i = 0; i < 40 && (await scene()) !== "BattleScene"; i++) await press("a", 1, 90);
  await page.waitForTimeout(900); await shot("29-lider-intro");
  await autobattle("30-lider");
  for (let i = 0; i < 60 && !(await idle()); i++) { await press("a", 1, 80); if (i === 3) await shot("31-medalla"); }
  const st2 = await G(() => ({ badges: window.micromon.state.badges, money: window.micromon.state.money, caught: window.micromon.state.caught, party: window.micromon.state.party.map((m) => [m.species, m.level, m.hp]) }));
  console.log(JSON.stringify({ errors, st1, st2, trainerFlag, wild }, null, 0));
  await browser.close();
})();
