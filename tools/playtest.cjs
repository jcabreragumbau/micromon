// Partida automática en Chromium: recorre el primer tramo y guarda capturas de cada pantalla.
// Uso: NODE_PATH=$(npm root -g) node tools/playtest.cjs <carpeta>
const { chromium } = require("playwright");
const path = require("node:path");
(async () => {
  const out = process.argv[2] ?? "shots";
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 720, height: 560 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e) + " @ " + String(e.stack).split("\n").slice(1, 6).join(" | ")));
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
  const blog = [];
  async function autobattle(tag, shots = true, max = 600) {
    let k = 0;
    for (let i = 0; i < max; i++) {
      if ((await scene()) !== "BattleScene") { await page.waitForTimeout(300); if ((await scene()) !== "BattleScene") return; }
      const t = await top();
      const txt = await G(() => String(window.micromon.overlays.at(-1)?.ov.text ?? ""));
      if (txt && blog.at(-1) !== `${tag}: ${txt}`) blog.push(`${tag}: ${txt}`);
      if (shots && t === "ActionMenu" && k < 2) await shot(`${tag}-${k++}`);
      if (t === "PartyScreen") {
        await G(() => { const ov = window.micromon.overlays.at(-1).ov, p = window.micromon.state.party;
          const act = ov.o.battle?.sides[0].active.map((x) => x?.party) ?? [];
          const i = p.findIndex((m, k) => m.hp > 0 && !act.includes(k)); ov.sel = i >= 0 ? i : p.length; });
        await press("a"); continue;
      }
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
  for (let i = 0; i < 60 && !(await G(() => window.micromon.overlays.some((o) => o.ov.constructor.name === "AvatarSelect"))); i++) await press("a");
  await G((k) => { window.micromon.overlays.find((o) => o.ov.constructor.name === "AvatarSelect").ov.sel = k; }, Number(process.env.AVATAR ?? 2));
  await page.waitForTimeout(500); await shot("01b-personaje"); await press("a", 1, 300);
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
  await press("b", 2, 250); await press("down", 2, 150); await press("a", 1, 300); await shot("15-mochila"); await press("right", 1, 150); await shot("16-mochila-criobolas");
  await press("b", 1, 250); await press("a", 1, 300); await shot("17-microdex"); await press("down", 3, 120); await shot("17b-microdex"); await press("b", 1, 250); await press("down", 3, 120); await press("a", 1, 300); await shot("17c-ficha"); await press("b", 1, 250); await press("b", 1, 250);
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
  await press("start", 1, 300); await press("down", 1, 150); await press("a", 1, 300); await press("right", 1, 150); await shot("27b-equipo2"); await press("a", 1, 200); await press("a", 1, 300); await shot("27c-resumen2"); await press("right", 1, 200); await shot("27d-movs2"); await press("b", 3, 250);
  await G(() => micromonDebug.enterWorld(window.micromon, "gimnasio-petri", 5, 3, 1)); await page.waitForTimeout(800); await shot("28-gimnasio");
  await press("a", 1, 200);
  for (let i = 0; i < 40 && (await scene()) !== "BattleScene"; i++) await press("a", 1, 90);
  await page.waitForTimeout(900); await shot("29-lider-intro");
  await autobattle("30-lider");
  for (let i = 0; i < 300 && !(await idle()); i++) { if ((await scene()) === "BattleScene") { await autobattle("30b", false); continue; } await press("a", 1, 80); if (i === 3) await shot("31-medalla"); }
  const st2 = await G(() => ({ badges: window.micromon.state.badges, money: window.micromon.state.money, caught: window.micromon.state.caught, party: window.micromon.state.party.map((m) => [m.species, m.level, m.hp]) }));
  // --- Segundo tramo: Ruta 2, Monte Micelio, Ruta 3, Ciudad Cultivo y Gimnasio 2
  await G(() => { const g = window.micromon, e = micromonDebug.engine; if (!g.state.badges.includes("probiotico")) g.state.badges.push("probiotico");
    g.state.party = [e.createMicroo(g.state.flags.starter, 32), e.createMicroo("anthracis", 30), e.createMicroo("chrysogenum", 30)]; });
  await G(() => micromonDebug.enterWorld(window.micromon, "ruta-2", 13, 6, 1)); await page.waitForTimeout(800); await shot("32-ruta2");
  await press("a", 1, 300); await press("a", 1, 300); await shot("33-hifas"); await press("a", 1, 300); await advance();
  const hifas = await G(() => !!window.micromon.state.flags["hifas-r2"]);
  await walk("up", 1); await walk("up", 1); await page.waitForTimeout(900); await shot("34-cueva");
  const enCueva = await G(() => window.micromon.state.map);
  await G(() => micromonDebug.enterWorld(window.micromon, "monte-micelio", 24, 5, 1)); await page.waitForTimeout(800); await shot("35-salazar-sala");
  await press("a", 1, 200);
  for (let i = 0; i < 40 && (await scene()) !== "BattleScene"; i++) await press("a", 1, 90);
  await page.waitForTimeout(900); await shot("36-salazar-combate");
  await autobattle("37-salazar", false); await advance();
  const salazar = await G(() => !!window.micromon.state.flags.salazar1);
  await G(() => micromonDebug.enterWorld(window.micromon, "monte-micelio", 25, 5, 1)); await page.waitForTimeout(800);
  await press("a", 1, 300); await shot("38-disco"); await advance();
  const disco = await G(() => !!window.micromon.state.bag["disco-duro"]);
  await G(() => { for (const m of window.micromon.state.party) micromonDebug.engine.fullHeal?.(m); });
  await G(() => micromonDebug.enterWorld(window.micromon, "ruta-3", 9, 9, 1)); await page.waitForTimeout(800); await shot("39-ruta3");
  await walk("up", 1); await walk("up", 1);
  for (let i = 0; i < 40 && (await scene()) !== "BattleScene"; i++) await press("a", 1, 90);
  await page.waitForTimeout(900); await shot("40-rival3");
  await autobattle("41-rival3", false); await advance();
  const rival3 = await G(() => !!window.micromon.state.flags.rival3);
  await G(() => micromonDebug.enterWorld(window.micromon, "ciudad-cultivo", 8, 17, 1)); await page.waitForTimeout(800); await shot("42-ciudad-cultivo");
  await G(() => micromonDebug.enterWorld(window.micromon, "gimnasio-cultivo", 6, 14, 1)); await page.waitForTimeout(800); await shot("43-gimnasio2");
  await G(() => { const g = window.micromon, e = micromonDebug.engine; g.state.party = [e.createMicroo("chrysogenum", 30), e.createMicroo("anthracis", 30), e.createMicroo(g.state.flags.starter, 32)]; });
  await G(() => micromonDebug.enterWorld(window.micromon, "gimnasio-cultivo", 6, 3, 1)); await page.waitForTimeout(800);
  await press("a", 1, 200);
  for (let i = 0; i < 40 && (await scene()) !== "BattleScene"; i++) await press("a", 1, 90);
  await page.waitForTimeout(900); await shot("44-gaju");
  await autobattle("45-gaju", false);
  for (let i = 0; i < 60 && !(await idle()); i++) await press("a", 1, 80);
  const st3 = await G(() => ({ badges: window.micromon.state.badges, map: window.micromon.state.map }));
  // --- Tercer tramo: máscara, Cueva Anaeróbica, Túnel Endospórico a oscuras y Gimnasio 3
  const mascara = await G(() => !!window.micromon.state.bag["mascara-de-gases"]);
  await G(() => micromonDebug.enterWorld(window.micromon, "ruta-4", 10, 15, 1)); await page.waitForTimeout(800); await shot("46-ruta4");
  await press("a", 1, 300); await advance();
  const guarda = await G(() => !!window.micromon.state.flags["mascara-ok"]);
  await walk("up", 1); await walk("up", 1); await page.waitForTimeout(900); await advance(); await shot("47-cueva-anaerobica");
  const enCA = await G(() => window.micromon.state.map);
  await G(() => micromonDebug.enterWorld(window.micromon, "ruta-4", 35, 9, 1)); await page.waitForTimeout(800);
  await walk("up", 1); await walk("up", 1); await page.waitForTimeout(900); await shot("48-tunel-oscuro");
  for (let i = 0; i < 6 && !(await G(() => window.micromon.overlays.some((o) => o.ov.constructor.name === "Choice"))); i++) await press("a", 1, 200);
  await press("a", 1, 300); await advance(); await page.waitForTimeout(300); await shot("49-tunel-lux");
  const lux = await G(() => [window.micromon.state.map, window.micromon.scene.lux]);
  await G(() => micromonDebug.enterWorld(window.micromon, "ciudad-gram", 3, 9, 3)); await page.waitForTimeout(800); await shot("50-ciudad-gram");
  await G(() => micromonDebug.enterWorld(window.micromon, "gimnasio-gram", 6, 14, 1)); await page.waitForTimeout(800); await shot("51-gimnasio3");
  await G(() => { const g = window.micromon, e = micromonDebug.engine; g.state.party = [e.createMicroo("thermocel", 34), e.createMicroo("anthracis", 32), e.createMicroo("pinnularia", 32)]; });
  await G(() => micromonDebug.enterWorld(window.micromon, "gimnasio-gram", 6, 3, 1)); await page.waitForTimeout(800);
  await press("a", 1, 200);
  for (let i = 0; i < 40 && (await scene()) !== "BattleScene"; i++) await press("a", 1, 90);
  await page.waitForTimeout(900); await shot("52-guardia");
  await autobattle("53-guardia", false);
  for (let i = 0; i < 300 && !(await idle()); i++) { if ((await scene()) === "BattleScene") { await autobattle("53b", false); continue; } await press("a", 1, 80); }
  const tramo3 = { mascara, guarda, enCA, lux, badges: await G(() => window.micromon.state.badges) };
  // --- Cuarto tramo: Pueblo Levadura, casino, guarida, Torre Prión y Gimnasio 4
  const beat = async (tag) => { for (let i = 0; i < 300 && !(await idle()); i++) { if ((await scene()) === "BattleScene") { await autobattle(tag, false); continue; } await press("a", 1, 80); } };
  const strong = () => G(() => { const g = window.micromon, e = micromonDebug.engine; g.state.party = [e.createMicroo("thermocel", 40), e.createMicroo("anthracis", 38), e.createMicroo("pinnularia", 38), e.createMicroo("spirulmax", 38)]; });
  await strong();
  await G(() => micromonDebug.enterWorld(window.micromon, "pueblo-levadura", 15, 7, 1)); await page.waitForTimeout(800); await shot("54-pueblo-levadura");
  await G(() => micromonDebug.enterWorld(window.micromon, "torre-prion-1", 9, 4, 1)); await page.waitForTimeout(800);
  await walk("up", 1); await press("a", 1, 300); await shot("55-torre-niebla"); await advance();
  await G(() => micromonDebug.enterWorld(window.micromon, "ciudad-aerobia", 22, 7, 1)); await page.waitForTimeout(800); await shot("56-ciudad-aerobia");
  await G(() => { const s = window.micromon.state; s.money = 9000; });
  await G(() => micromonDebug.enterWorld(window.micromon, "casino", 2, 3, 1)); await page.waitForTimeout(800);
  await press("a", 1, 300); await press("a", 1, 300); await press("a", 1, 300); await advance();
  const fich = await G(() => window.micromon.state.flags.fichas);
  await G(() => micromonDebug.enterWorld(window.micromon, "casino", 3, 5, 2)); await page.waitForTimeout(600);
  await press("a", 1, 400); await press("a", 1, 300); await press("a", 1, 200); await press("a", 1, 200); await press("a", 1, 1200); await shot("57-tragaperras"); await press("b", 1, 300); await advance();
  await G(() => micromonDebug.enterWorld(window.micromon, "casino", 11, 3, 1)); await page.waitForTimeout(800);
  await walk("up", 1); await beat("58-recluta-casino");
  await G(() => micromonDebug.enterWorld(window.micromon, "casino", 10, 2, 1)); await page.waitForTimeout(600);
  await press("a", 1, 300); await advance(); await shot("59-guarida-abierta");
  const guarida = await G(() => !!window.micromon.state.flags.guarida);
  await G(() => micromonDebug.enterWorld(window.micromon, "guarida-1", 18, 10, 0)); await page.waitForTimeout(800); await shot("60-guarida");
  await press("a", 1, 200); await beat("61-barbadilla");
  await strong();
  await G(() => micromonDebug.enterWorld(window.micromon, "guarida-2", 5, 8, 0)); await page.waitForTimeout(800);
  await press("a", 1, 200);
  for (let i = 0; i < 40 && (await scene()) !== "BattleScene"; i++) await press("a", 1, 90);
  await page.waitForTimeout(900); await shot("62-casillas-doble");
  for (let i = 0; i < 10 && (await top()) !== "ActionMenu"; i++) await press("a", 1, 200);
  await shot("62b-casillas-doble"); await beat("63-casillas");
  await strong();
  await G(() => micromonDebug.enterWorld(window.micromon, "guarida-2", 13, 4, 1)); await page.waitForTimeout(800);
  await press("a", 1, 200); await beat("64-urtaza");
  const blot = await G(() => [!!window.micromon.state.bag["western-blot"], !!window.micromon.state.flags.barbadilla1, !!window.micromon.state.flags.casillas1]);
  await G(() => micromonDebug.enterWorld(window.micromon, "torre-prion-3", 1, 12, 1)); await page.waitForTimeout(800); await shot("65-torre3");
  await walk("up", 1); await walk("up", 1); await walk("up", 1); await page.waitForTimeout(300); await shot("66-hernandez"); await advance();
  await G(() => micromonDebug.enterWorld(window.micromon, "torre-prion-3", 5, 4, 1)); await page.waitForTimeout(600);
  await press("a", 1, 300); await advance();
  const vir = await G(() => [!!window.micromon.state.flags.hernandez1, !!window.micromon.state.bag["plasmido-vir"]]);
  await strong();
  await G(() => micromonDebug.enterWorld(window.micromon, "gimnasio-aerobia", 6, 3, 1)); await page.waitForTimeout(800);
  await press("a", 1, 200);
  for (let i = 0; i < 40 && (await scene()) !== "BattleScene"; i++) await press("a", 1, 90);
  await page.waitForTimeout(900); await shot("67-yero");
  await beat("68-yero");
  const tramo4 = { fich, guarida, blot, vir, badges: await G(() => window.micromon.state.badges) };
  if (process.env.BLOG) console.error(blog.filter((l) => l.startsWith(process.env.BLOG)).join("\n"));
  console.log(JSON.stringify({ errors, st1, st2, trainerFlag, wild, tramo2: { hifas, enCueva, salazar, disco, rival3, st3 }, tramo3, tramo4 }, null, 0));
  await browser.close();
})();
