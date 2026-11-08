// Recorre las escenas del guion de la Unidad de Genética (docs/guion_unidad_genetica.pdf) en una edición:
// ejecuta cada script con un equipo fuerte, gana los combates pulsando A y guarda todo el texto mostrado.
// Uso: NODE_PATH=$(npm root -g) HTML=dist/indexSalmonella.html node tools/pruebas/guion_unidad.cjs <carpeta>
const { chromium } = require("playwright");
const path = require("path"), fs = require("fs");
(async () => {
  const dir = process.argv[2] ?? "/tmp";
  const b = await chromium.launch(); const page = await b.newPage({ viewport: { width: 960, height: 720 } });
  const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto("file://" + path.resolve(process.env.HTML || "dist/indexEscherichia.html"));
  const G = (f, a) => page.evaluate(f, a);
  await page.waitForFunction(() => !!window.micromon);
  await page.keyboard.press("KeyZ"); await page.waitForTimeout(150); await page.keyboard.press("Enter"); await page.waitForTimeout(600);
  await G(() => { const g = window.micromon, E = micromonDebug.engine;
    g.state.party = [E.createMicroo("pandoravir", 100, {})]; g.noEncounters = true; g.noObey = true; g.state.textSpeed = 99;
    window.__log = []; const say = g.say.bind(g); g.say = (t, o) => { window.__log.push(t.replace(/\{nombre\}/g, g.state.name)); return say(t, o); }; });
  const escenas = [
    ["monte-micelio", 24, 5, 1, "salazar", {}],
    ["guarida-2", 13, 4, 1, "urtaza", {}],
    ["torre-prion-3", 5, 9, 1, "albaHernandez", {}],
    ["torre-prion-3", 5, 4, 1, "jubiladoTorre", { hernandez1: true }],
    ["instituto-5", 6, 7, 1, "asedioEjecutivos", { "yero-equipo": true, seguidor: "yero" }],
    ["instituto-11", 7, 6, 1, "urtazaInstituto", {}],
    ["instituto-11", 6, 3, 1, "directorInstituto", {}],
    ["mansion-2", 10, 10, 1, "campoyMansion", {}],
    ["mansion-2", 5, 4, 1, "diarioJaime", {}],
    ["mansion-2", 7, 6, 1, "urtazaFinal", {}],
    ["mansion-2", 10, 10, 1, "campoyMansion", {}],
    ["mansion-2", 10, 10, 1, "campoyMansion", { o157: true, salmonella: true }],
    ["calle-seleccion", 11, 3, 1, "hernandezFinal", {}],
    ["instituto-1", 10, 11, 1, "rebeldeIBB", { campeon: true }],
    ["instituto-1", 8, 12, 1, "pasteurEpilogo", {}],
  ];
  const res = [];
  let k = 0;
  for (const [map, x, y, dir, name, flags] of escenas) {
    await G(([map, x, y, dir, flags]) => { const g = window.micromon; Object.assign(g.state.flags, flags); micromonDebug.enterWorld(g, map, x, y, dir); }, [map, x, y, dir, flags]);
    await page.waitForTimeout(500);
    const i0 = await G(() => window.__log.length);
    await G((name) => { const g = window.micromon; window.__fin = false; micromonDebug.runScript(g, g.scene, name).then(() => { window.__fin = true; }, (e) => { window.__fin = "error " + e; }); }, name);
    let fin = false, shot = 0;
    for (let t = 0; t < 12000 && !fin; t++) {
      await G(() => { const g = window.micromon, b = g.scene?.s?.battle; if (b) for (const m of b.sides[1].party) if (m.hp > 1) m.hp = 1; const top = g.overlays.at(-1); g.input.press((top?.ov ?? top)?.constructor.name === "PartyScreen" ? "b" : "a"); }); await page.waitForTimeout(25);
      fin = await G(() => window.__fin);
      if (t === 60 && shot++ === 0) await page.screenshot({ path: `${dir}/guion_${String(k).padStart(2, "0")}_${name}.png` });
    }
    const textos = await G((i0) => window.__log.slice(i0), i0);
    const flagsDespues = await G(() => ({ ...window.micromon.state.flags }));
    res.push({ name, fin, n: textos.length, primero: textos[0], ultimo: textos.at(-1), flags: Object.keys(flagsDespues).filter((f) => /urtaza|disco|blot|hernandez|plasmido|conchillo|morada|campoy|salazar/.test(f)) });
    fs.writeFileSync(`${dir}/guion_${String(k++).padStart(2, "0")}_${name}.txt`, textos.join("\n"));
    // dejar el mundo en calma
    for (let t = 0; t < 40; t++) { await G(() => window.micromon.input.press("b")); await page.waitForTimeout(20); }
  }
  console.log(JSON.stringify({ dir, errors, res: res.map((r) => `${r.fin === true ? "OK " : "ATASCO "}${r.name} (${r.n} textos) → ${r.ultimo}`) }, null, 1));
  await b.close();
})();
