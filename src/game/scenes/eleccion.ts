// Página con las dos ediciones: al abrir el juego se elige Escherichia o Salmonella. Cada edición tiene su
// partida guardada, su portada, su legendario y sus exclusivos; las dos se pueden conectar entre sí.
import type { Game, Scene } from "../game";
import { Gfx, W, H } from "../gfx";
import { IMG } from "../assets";
import type { Edicion } from "../edicion";

const RECUERDO = "micromon-edicion";
const NOMBRES: Record<Edicion, string> = { escherichia: "Escherichia", salmonella: "Salmonella" };

export class EleccionEdicion implements Scene {
  sel = 0; t = 0;
  opciones: Edicion[] = ["escherichia", "salmonella"];
  constructor(public game: Game, public alElegir: (e: Edicion) => void) {
    try { if (localStorage.getItem(RECUERDO) === "salmonella") this.sel = 1; } catch { /* sin almacenamiento */ }
  }
  update(game: Game) {
    this.t++;
    const i = game.input;
    if (i.pressed("left") || i.pressed("right")) this.sel = 1 - this.sel;
    if (i.pressed("a") || i.pressed("start")) {
      const e = this.opciones[this.sel];
      try { localStorage.setItem(RECUERDO, e); } catch { /* sin almacenamiento */ }
      this.alElegir(e);
    }
  }
  draw(g: Gfx) {
    const c = g.ctx;
    g.clear("#0c0e16");
    const alto = 150, y = 26;
    g.text("Elige tu edición", W / 2 - g.measure("Elige tu edición") / 2, 6, "white");
    this.opciones.forEach((e, k) => {
      const img = IMG[`portada_${e}`];
      const ancho = img ? Math.round((alto * img.width) / img.height) : 112;
      const x = k === 0 ? W / 2 - ancho - 8 : W / 2 + 8;
      const on = k === this.sel;
      const borde = on ? (Math.floor(this.t / 12) % 2 ? "#fff8c0" : "#f8d038") : "#3a4058";
      g.rect(x - 3, y - 3, ancho + 6, alto + 6, borde);
      c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
      if (img) c.drawImage(img, x, y, ancho, alto); else g.rect(x, y, ancho, alto, "#222");
      c.restore();
      if (!on) g.alpha(0.55, () => g.rect(x, y, ancho, alto, "#000"));
      const n = NOMBRES[e];
      g.text(n, x + ancho / 2 - g.measure(n) / 2, y + alto + 5, on ? "white" : "gray");
    });
  }
}
