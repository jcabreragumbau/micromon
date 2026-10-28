// Construye el juego como un único HTML: incrusta los atlas, empaqueta con Bun y escribe dist/index.html.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const ATLAS = ["tiles", "font", "personajes", "retratos", "microos_frente", "microos_espalda", "microos_iconos"];
const lines = ATLAS.map((n) => `  ${JSON.stringify(n)}: "data:image/png;base64,${readFileSync(join(ROOT, "assets/atlas", `${n}.png`)).toString("base64")}",`);
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
@media (pointer:coarse){#mando{display:flex}#ayuda{display:none}}
</style></head><body>
<canvas id="pantalla" width="240" height="160"></canvas>
<div id="ayuda">Flechas: moverse · Z / Espacio: A · X / Esc: B (mantén para correr) · Intro: menú</div>
<div id="mando">
 <div id="cruz"><span></span><button data-key="up">▲</button><span></span><button data-key="left">◀</button><span></span><button data-key="right">▶</button><span></span><button data-key="down">▼</button><span></span></div>
 <button id="start" data-key="start">START</button>
 <div id="ab"><button class="r" data-key="b">B</button><button class="r" data-key="a">A</button></div>
</div>
<script>${js.replaceAll("</script", "<\\/script")}</script>
</body></html>`;
mkdirSync(join(ROOT, "dist"), { recursive: true });
writeFileSync(join(ROOT, "dist/index.html"), html);
console.log("dist/index.html:", (html.length / 1024).toFixed(0), "KB");
