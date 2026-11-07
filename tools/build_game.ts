// Construye el juego como un único HTML: incrusta los atlas, empaqueta con Bun y escribe dist/index.html.
// Con --v2 construye Micromón V2 (dist/micromonV2.html): los atlas de assets/atlas_v2/ sustituyen a los
// de assets/atlas/ cuando existen (tileset de 4.ª generación: terreno, árboles, casas e interiores).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
// Ediciones (--ed=escherichia | --ed=salmonella): parten de la V2 y cambian portada, legendario y exclusivos
const ED = (process.argv.find((a) => a.startsWith("--ed=")) ?? "").slice(5) || null;
if (ED && !["escherichia", "salmonella", "ambas"].includes(ED)) { console.error("Edición desconocida:", ED); process.exit(1); }
const V2 = !!ED || process.argv.includes("--v2");
const ED_NOMBRE = ED === "ambas" ? "Ediciones" : ED ? ED[0].toUpperCase() + ED.slice(1) : "";
const NOMBRE = ED === "ambas" ? "Micromón" : ED ? `Micromón ${ED_NOMBRE}` : V2 ? "Micromón V2" : "Micromón";
/** Carpeta de un atlas: la de la V2 si esta versión tiene el suyo. */
const dirAtlas = (f: string) => (ED && existsSync(join(ROOT, "assets/atlas_ed", ED, f)) ? `assets/atlas_ed/${ED}`
  : V2 && existsSync(join(ROOT, "assets/atlas_v2", f)) ? "assets/atlas_v2" : "assets/atlas");
const ATLAS: string[] = ["portada.jpg", "portada_fondo.jpg", ...["hierba", "bosque", "interior", "laboratorio", "gimnasio", "cueva", "invernadero", "casino", "torre", "hielo"].map((e) => `fondo_${e}.jpg`), "tiles", "font", "personajes", "retratos", "personajes_hd", "retratos_hd.webp", "retratos_npc", "props_hd.webp", "terreno_hd.webp", "medallas_hd.webp", "protas_intro.webp", "protas_espalda.webp", "logo_micromon.webp", "mapa_region", "microos_frente.webp", "microos_espalda.webp", "microos_iconos.webp", "microos_hd_frente.webp", "microos_hd_espalda.webp", "microos_hd_iconos.webp"];
// página con las dos ediciones: las dos portadas (de assets/atlas_ed/<edición>/)
if (ED === "ambas") for (const e of ["escherichia", "salmonella"]) ATLAS.push(`portada_${e}.jpg`, `portada_fondo_${e}.jpg`);
// WebP sin pérdida de los atlas HD grandes (idénticos al PNG, pero ocupan menos)
const WEBP = ATLAS.filter((f) => f.endsWith(".webp")).map((f) => f.slice(0, -5));
const conv = Bun.spawnSync(["python3", join(ROOT, "tools/art/a_webp.py"), ...(V2 ? ["--v2"] : []), ...WEBP]);
if (conv.exitCode !== 0) { console.error(conv.stderr.toString()); process.exit(1); }
// Dos versiones del juego: «local» (todo incrustado en un único HTML, para abrirlo sin servidor y para las pruebas)
// y «publicada» (las imágenes y la música van como archivos aparte junto a la página: el HTML no pasa del límite
// de 16 MB y el arte se puede guardar a resolución completa).
const PUB = join(ROOT, "dist", ED ? `pub_${ED}` : V2 ? "pub_v2" : "pub");
mkdirSync(join(PUB, "a"), { recursive: true });
const fuente = (f: string) => {
  const [n, ext] = f.includes(".") ? f.split(".") : [f, "png"];
  const p = n.match(/^(portada(?:_fondo)?)_(escherichia|salmonella)$/);
  if (p) return { n, ext, path: join(ROOT, "assets/atlas_ed", p[2], `${p[1]}.${ext}`) };
  return { n, ext, path: join(ROOT, dirAtlas(`${n}.${ext}`), `${n}.${ext}`) };
};
const MIME: Record<string, string> = { jpg: "image/jpeg", webp: "image/webp", png: "image/png", mp3: "audio/mpeg" };
const AUDIO: Record<string, string> = { entrenador: "combate_entrenador.mp3", titulo: "titulo.mp3" };
function generarModulos(externo: boolean) {
  const lines = ATLAS.map((f) => {
    const { n, ext, path } = fuente(f);
    if (externo) { writeFileSync(join(PUB, "a", `${n}.${ext}`), readFileSync(path)); return `  ${JSON.stringify(n)}: "a/${n}.${ext}",`; }
    return `  ${JSON.stringify(n)}: "data:${MIME[ext]};base64,${readFileSync(path).toString("base64")}",`;
  });
  const audio = Object.entries(AUDIO).map(([k, f]) => {
    const src = join(ROOT, "assets/audio", f);
    if (externo) { writeFileSync(join(PUB, "a", f), readFileSync(src)); return `  ${JSON.stringify(k)}: "a/${f}",`; }
    return `  ${JSON.stringify(k)}: "data:audio/mpeg;base64,${readFileSync(src).toString("base64")}",`;
  });
  writeFileSync(join(ROOT, "src/game/assets_audio.ts"), `// Generado por tools/build_game.ts. No editar.\nexport default {\n${audio.join("\n")}\n};\n`);
  writeFileSync(join(ROOT, "src/game/assets_data.ts"), `// Generado por tools/build_game.ts. No editar.\nexport const V2 = ${V2};\nexport const EDICION: string | null = ${JSON.stringify(ED)};\nexport default {\n${lines.join("\n")}\n};\n`);
}

// V2: los metadatos JSON de los atlas también salen de assets/atlas_v2/
const atlasV2 = { name: "atlas-v2", setup(b: any) {
  b.onResolve({ filter: /assets\/atlas\/[a-z_]+\.json$/ }, (a: any) => {
    const f = a.path.split("/").pop();
    return { path: join(ROOT, dirAtlas(f), f) };
  });
} };
async function empaquetar(externo: boolean) {
  generarModulos(externo);
  const res = await Bun.build({ entrypoints: [join(ROOT, "src/game/main.ts")], minify: { whitespace: true, syntax: true, identifiers: false }, target: "browser", plugins: V2 ? [atlasV2] : [] });
  if (!res.success) { console.error(res.logs); process.exit(1); }
  return await res.outputs[0].text();
}
const js = await empaquetar(false);
const jsPub = await empaquetar(true);
const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>${NOMBRE}</title>
<style>
:root{--fondo:#14161e;--texto:#c8ccd8;--boton:#2a2e3e;--borde:#454b63}
html,body{margin:0;height:100%;background:var(--fondo);color:var(--texto);font-family:system-ui,sans-serif;overflow:hidden;touch-action:none}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px}
canvas{image-rendering:pixelated;image-rendering:crisp-edges;background:#000;box-shadow:0 0 0 4px #000,0 8px 30px #0008}
#ayuda{font-size:12px;opacity:.7;text-align:center;padding:0 16px}
#mando{display:none;width:100%;max-width:520px;justify-content:space-between;align-items:center;padding:0 16px;box-sizing:border-box;user-select:none;-webkit-user-select:none}
#cruz{display:grid;grid-template-columns:repeat(3,48px);grid-template-rows:repeat(3,48px);gap:2px}
#mando button{background:var(--boton);color:var(--texto);border:2px solid var(--borde);border-radius:10px;font-size:18px;font-weight:700;touch-action:none}
#mando button.on{background:#4a5170}
#ab{display:flex;gap:14px;align-items:center}
#ab .r{width:64px;height:64px;border-radius:50%}
#start{position:absolute;bottom:12px;left:50%;transform:translateX(3px);width:70px;height:30px;border-radius:15px!important;font-size:12px!important}
#select{position:absolute;bottom:12px;left:50%;transform:translateX(-73px);width:70px;height:30px;border-radius:15px!important;font-size:12px!important}
#x2{position:absolute;bottom:48px;left:50%;transform:translateX(-50%);width:52px;height:26px;border-radius:13px!important;font-size:12px!important}
@media (pointer:coarse){#mando{display:flex}#ayuda{display:none}}
</style></head><body>
<canvas id="pantalla" width="240" height="160"></canvas>
<div id="ayuda">Flechas: moverse · Z / Espacio: A · X / Esc: B (mantén para correr) · Intro: menú · Q o Mayús: SELECT (tabla de tipos en combate) · Tab o V: velocidad ×2 · También con mando de Xbox</div>
<div id="mando">
 <div id="cruz"><span></span><button data-key="up">▲</button><span></span><button data-key="left">◀</button><span></span><button data-key="right">▶</button><span></span><button data-key="down">▼</button><span></span></div>
 <button id="select" data-key="select">SELECT</button><button id="start" data-key="start">START</button><button id="x2" data-speed="1">x2</button>
 <div id="ab"><button class="r" data-key="b">B</button><button class="r" data-key="a">A</button></div>
</div>
<script>${js.replaceAll("</script", "<\\/script")}</script>
</body></html>`;
mkdirSync(join(ROOT, "dist"), { recursive: true });
const SAL = ED ? [`index${ED_NOMBRE}.html`, `micromon${ED_NOMBRE}.html`] : V2 ? ["indexV2.html", "micromonV2.html"] : ["index.html", "micromon.html"];
writeFileSync(join(ROOT, "dist", SAL[0]), html);
console.log(`dist/${SAL[0]}:`, (html.length / 1024).toFixed(0), "KB");

// Versión para publicar como página de Claude: sin esqueleto propio, márgenes seguros y aspecto oscuro único.
const page = `<title>${NOMBRE}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<style>
/* Consola portátil: pantalla centrada sobre fondo de carcasa, mando táctil debajo en móviles */
:root{--carcasa:#14161e;--texto:#c8ccd8;--boton:#2a2e3e;--boton-on:#4a5170;--borde:#454b63;--marco:#000;color-scheme:dark}
html,body{height:100%}
body{margin:0;background:var(--carcasa);color:var(--texto);font-family:system-ui,sans-serif;overflow:hidden;touch-action:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;box-sizing:border-box;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:8px}
canvas{image-rendering:pixelated;image-rendering:crisp-edges;background:var(--marco);box-shadow:0 0 0 4px var(--marco),0 8px 30px #0008;max-width:100%;height:auto}
#ayuda{font-size:12px;opacity:.75;text-align:center}
#mando{display:none;width:100%;max-width:520px;justify-content:space-between;align-items:center;user-select:none;-webkit-user-select:none;position:relative;padding-bottom:40px}
#cruz{display:grid;grid-template-columns:repeat(3,48px);grid-template-rows:repeat(3,48px);gap:2px}
#mando button{background:var(--boton);color:var(--texto);border:2px solid var(--borde);border-radius:10px;font-size:18px;font-weight:700;touch-action:none}
#mando button.on{background:var(--boton-on)}
#mando button:focus-visible{outline:2px solid var(--texto)}
#ab{display:flex;gap:14px;align-items:center}
#ab .r{width:64px;height:64px;border-radius:50%}
#start{position:absolute;bottom:0;left:50%;transform:translateX(3px);width:70px;height:30px;border-radius:15px!important;font-size:12px!important}
#select{position:absolute;bottom:0;left:50%;transform:translateX(-73px);width:70px;height:30px;border-radius:15px!important;font-size:12px!important}
#x2{position:absolute;bottom:36px;left:50%;transform:translateX(-50%);width:52px;height:26px;border-radius:13px!important;font-size:12px!important}
@media (pointer:coarse){#mando{display:flex}#ayuda{display:none}}
</style>
<canvas id="pantalla" width="240" height="160" aria-label="Pantalla del juego ${NOMBRE}"></canvas>
<div id="ayuda">Flechas: moverse · Z o Espacio: A · X o Esc: B (mantén para correr) · Intro: menú · Q o Mayús: SELECT (tabla de tipos en combate) · Tab o V: velocidad ×2 · También con mando de Xbox · La partida se guarda en este navegador desde el menú</div>
<div id="mando">
 <div id="cruz"><span></span><button id="b-arriba" data-key="up" aria-label="Arriba">▲</button><span></span><button id="b-izq" data-key="left" aria-label="Izquierda">◀</button><span></span><button id="b-der" data-key="right" aria-label="Derecha">▶</button><span></span><button id="b-abajo" data-key="down" aria-label="Abajo">▼</button><span></span></div>
 <button id="select" data-key="select">SELECT</button><button id="start" data-key="start">START</button><button id="x2" data-speed="1">x2</button>
 <div id="ab"><button id="b-b" class="r" data-key="b">B</button><button id="b-a" class="r" data-key="a">A</button></div>
</div>
<script>${jsPub.replaceAll("</script", "<\\/script")}</script>
`;
writeFileSync(join(ROOT, "dist", SAL[1]), page);
writeFileSync(join(PUB, "index.html"), `<meta charset="utf-8">\n${page}`);   // copia para probar con un servidor local
console.log(`dist/${SAL[1]}:`, (page.length / 1024).toFixed(0), "KB (+ archivos en", PUB.replace(ROOT + "/", "") + "/a)");
