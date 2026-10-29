// Construye el juego como un único HTML: incrusta los atlas, empaqueta con Bun y escribe dist/index.html.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const ATLAS = ["portada.jpg", "portada_fondo.jpg", "tiles", "font", "personajes", "retratos", "personajes_hd", "retratos_hd", "props_hd", "medallas_hd", "microos_frente", "microos_espalda", "microos_iconos"];
const lines = ATLAS.map((f) => {
  const [n, ext] = f.includes(".") ? f.split(".") : [f, "png"];
  const mime = ext === "jpg" ? "image/jpeg" : "image/png";
  return `  ${JSON.stringify(n)}: "data:${mime};base64,${readFileSync(join(ROOT, "assets/atlas", `${n}.${ext}`)).toString("base64")}",`;
});
writeFileSync(join(ROOT, "src/game/assets_data.ts"), `// Generado por tools/build_game.ts. No editar.\nexport default {\n${lines.join("\n")}\n};\n`);

const res = await Bun.build({ entrypoints: [join(ROOT, "src/game/main.ts")], minify: { whitespace: true, syntax: true, identifiers: false }, target: "browser" });
if (!res.success) { console.error(res.logs); process.exit(1); }
const js = await res.outputs[0].text();
const html = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<title>Micromón</title>
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
#start{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);width:84px;height:30px;border-radius:15px!important;font-size:12px!important}
#x2{position:absolute;bottom:48px;left:50%;transform:translateX(-50%);width:52px;height:26px;border-radius:13px!important;font-size:12px!important}
@media (pointer:coarse){#mando{display:flex}#ayuda{display:none}}
</style></head><body>
<canvas id="pantalla" width="240" height="160"></canvas>
<div id="ayuda">Flechas: moverse · Z / Espacio: A · X / Esc: B (mantén para correr) · Intro: menú · Tab o V: velocidad ×2 · También con mando de Xbox</div>
<div id="mando">
 <div id="cruz"><span></span><button data-key="up">▲</button><span></span><button data-key="left">◀</button><span></span><button data-key="right">▶</button><span></span><button data-key="down">▼</button><span></span></div>
 <button id="start" data-key="start">START</button><button id="x2" data-speed="1">x2</button>
 <div id="ab"><button class="r" data-key="b">B</button><button class="r" data-key="a">A</button></div>
</div>
<script>${js.replaceAll("</script", "<\\/script")}</script>
</body></html>`;
mkdirSync(join(ROOT, "dist"), { recursive: true });
writeFileSync(join(ROOT, "dist/index.html"), html);
console.log("dist/index.html:", (html.length / 1024).toFixed(0), "KB");

// Versión para publicar como página de Claude: sin esqueleto propio, márgenes seguros y aspecto oscuro único.
const page = `<title>Micromón</title>
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
#start{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:84px;height:30px;border-radius:15px!important;font-size:12px!important}
#x2{position:absolute;bottom:36px;left:50%;transform:translateX(-50%);width:52px;height:26px;border-radius:13px!important;font-size:12px!important}
@media (pointer:coarse){#mando{display:flex}#ayuda{display:none}}
</style>
<canvas id="pantalla" width="240" height="160" aria-label="Pantalla del juego Micromón"></canvas>
<div id="ayuda">Flechas: moverse · Z o Espacio: A · X o Esc: B (mantén para correr) · Intro: menú · Tab o V: velocidad ×2 · También con mando de Xbox · La partida se guarda en este navegador desde el menú</div>
<div id="mando">
 <div id="cruz"><span></span><button id="b-arriba" data-key="up" aria-label="Arriba">▲</button><span></span><button id="b-izq" data-key="left" aria-label="Izquierda">◀</button><span></span><button id="b-der" data-key="right" aria-label="Derecha">▶</button><span></span><button id="b-abajo" data-key="down" aria-label="Abajo">▼</button><span></span></div>
 <button id="start" data-key="start">START</button><button id="x2" data-speed="1">x2</button>
 <div id="ab"><button id="b-b" class="r" data-key="b">B</button><button id="b-a" class="r" data-key="a">A</button></div>
</div>
<script>${js.replaceAll("</script", "<\\/script")}</script>
`;
writeFileSync(join(ROOT, "dist/micromon.html"), page);
console.log("dist/micromon.html:", (page.length / 1024).toFixed(0), "KB");
