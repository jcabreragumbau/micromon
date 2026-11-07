// Uso: (cd dist/pub_ambas && python3 -m http.server 8765 --bind 127.0.0.1 &) ; NODE_PATH=$(npm root -g) node tools/pruebas/conexion.cjs <carpeta> intercambio|combate
// Prueba de extremo a extremo del Club de Conexión con dos pestañas y la sala falsa (mock.js).
const { chromium } = require("playwright"); const fs = require("fs");
const OUT = process.argv[2], URL = "http://127.0.0.1:8765/index.html", TIPO = process.argv[3] || "intercambio";
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1000, height: 760 } });
  await ctx.addInitScript({ content: fs.readFileSync(__dirname + "/sala_falsa.js", "utf8") });
  const errs = [];
  async function abrir(edicion, nombre, party) {
    const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(nombre + ": " + e));
    await p.goto(URL); await p.waitForFunction(() => !!window.micromon);
    await p.waitForTimeout(400);
    if (edicion === "salmonella") await p.evaluate(() => { const s = window.micromon.scene; s.sel = 1; });
    else await p.evaluate(() => { const s = window.micromon.scene; s.sel = 0; });
    await p.evaluate(() => window.micromon.input.press("a")); await p.waitForTimeout(500);
    for (let i = 0; i < 30; i++) { const n = await p.evaluate(() => window.micromon.scene?.constructor.name); if (n === "TitleScene") break; await p.evaluate(() => window.micromon.input.press("start")); await p.waitForTimeout(250); }
    await p.evaluate(([nombre, party]) => { const g = window.micromon, E = micromonDebug.engine; g.state.name = nombre; g.state.party = party.map(([s, l]) => E.createMicroo(s, l, {})); g.noEncounters = true; }, [nombre, party]);
    await p.evaluate(() => micromonDebug.enterWorld(window.micromon, "incubadora-viral", 8, 3, 1)); await p.waitForTimeout(900);
    await p.evaluate(() => { const g = window.micromon; void micromonDebug.runScript(g, g.scene, "club"); });
    return p;
  }
  const A = await abrir("escherichia", "Jordi", [["synechoc", 30], ["mycoplas", 28], ["cereus", 25]]);
  const B = await abrir("salmonella", "Laia", [["paramec", 32], ["cholerae", 29]]);
  const top = (p) => p.evaluate(() => { const g = window.micromon; const o = g.overlays[g.overlays.length - 1]?.ov; return { o: o?.constructor.name ?? null, scene: g.scene?.constructor.name, gente: o?.gente ? o.gente().length : -1 }; });
  const press = (p, k) => p.evaluate((k) => window.micromon.input.press(k), k);
  const st = { A: { invitado: false, hecho: false, salir: false }, B: { hecho: false, salir: false } };
  let vistos = 0;
  for (let paso = 0; paso < 3000; paso++) {
    for (const [nom, p] of [["A", A], ["B", B]]) {
      const t = await top(p), s = st[nom];
      if (t.o === "ListaClub") {
        if (nom === "A" && !s.invitado && t.gente > 0) { s.invitado = true; await press(p, "a"); }
        else if (s.salir) await press(p, "b");
      } else if (t.o === "Choice") {
        const opts = await p.evaluate(() => { const g = window.micromon; return g.overlays[g.overlays.length - 1].ov.options; });
        if (opts?.[0] === "INTERCAMBIAR" && TIPO === "combate") { await press(p, "down"); await p.waitForTimeout(60); }
        await press(p, "a");
      } else if (t.o === "PartyScreen") {
        // primer Microo que sirva (en «replace», uno sano que no esté en el campo)
        await p.evaluate(() => { const g = window.micromon, o = g.overlays[g.overlays.length - 1].ov; if (o.o.mode === "replace") { const b = o.o.battle; o.sel = g.state.party.findIndex((m, i) => m.hp > 0 && !b.sides[0].active.some((x) => x?.party === i)); } });
        await press(p, "a");
      } else if (t.o && t.o !== "Esperando") { await press(p, "a"); }
      else if (!t.o && t.scene === "Overworld" && s.salir) s.hecho = true;
      if (t.scene === "BattleScene") s.vioCombate = true;
      if (t.o === "ListaClub" && !s.salir) {
        // la sesión ha terminado: en un intercambio cambia el equipo; en un combate se ha visto el combate
        const firma = await p.evaluate(() => window.micromon.state.party.map((m) => m.species).join(","));
        s.firma0 ??= firma;
        if ((TIPO === "intercambio" && firma !== s.firma0) || (TIPO === "combate" && s.vioCombate)) s.salir = true;
      }
      if (t.scene === "BattleScene" && vistos < 6 && paso % 25 === 0) { await p.screenshot({ path: `${OUT}/${TIPO}_${nom}_${vistos}.png` }); if (nom === "B") vistos++; }
    }
    if (paso % 300 === 0) console.log(paso, JSON.stringify(await top(A)), JSON.stringify(await top(B)), JSON.stringify(st));
    if (st.A.hecho && st.B.hecho) break;
    await A.waitForTimeout(90);
  }
  const res = await Promise.all([A, B].map((p) => p.evaluate(() => ({ party: window.micromon.state.party.map((m) => m.species + ":" + m.level + ":" + m.hp + "/" + m.stats.hp), caught: window.micromon.state.caught.length }))));
  console.log(JSON.stringify({ st, res, errs }));
  await A.screenshot({ path: `${OUT}/${TIPO}_A_fin.png` }); await B.screenshot({ path: `${OUT}/${TIPO}_B_fin.png` });
  await b.close();
})();
