// Punto de entrada del juego en el navegador.
import { Game } from "./game";
import { W, H } from "./gfx";
import { loadAssets } from "./assets";
import { TitleScene, enterWorld } from "./scenes/title";
import { runScript, wildBattle, startBattle, battleFor } from "./scripts";
import { MAPS } from "./world/maps";
import * as engine from "../engine";

async function boot() {
  const canvas = document.getElementById("pantalla") as HTMLCanvasElement;
  const game = new Game(canvas);
  game.input.attach(window);
  const pad = document.getElementById("mando");
  if (pad) game.input.attachTouch(pad);
  await loadAssets();
  game.scene = new TitleScene();
  game.start();
  (window as unknown as { micromon: Game }).micromon = game;   // para pruebas automáticas
  (window as unknown as { micromonDebug: unknown }).micromonDebug = { runScript, wildBattle, enterWorld, MAPS, engine, startBattle, battleFor };
  const fit = () => {
    const s = Math.max(1, Math.floor(Math.min((window.innerWidth - 32) / W, (window.innerHeight - (pad && getComputedStyle(pad).display !== "none" ? 170 : 0)) / H)));
    canvas.style.width = `${W * s}px`; canvas.style.height = `${H * s}px`; canvas.style.maxWidth = "100%";
  };
  window.addEventListener("resize", fit); fit();
}
boot().catch((e) => { document.body.insertAdjacentHTML("beforeend", `<pre style="color:#f88">${String(e)}</pre>`); });

// Al conectar un mando, la ayuda muestra sus botones.
window.addEventListener("gamepadconnected", () => {
  const el = document.getElementById("ayuda");
  if (el) el.textContent = "Mando: joystick o cruceta para moverse · B: aceptar (A) · A: cancelar / mantener para correr · Menú: START";
});
window.addEventListener("gamepaddisconnected", () => {
  const el = document.getElementById("ayuda");
  if (el) el.textContent = "Mando desconectado. Flechas: moverse · Z / Espacio: A · X / Esc: B (mantén para correr) · Intro: menú";
});
