// Mapa de la región: ciudades, rutas, mazmorras e islas, con la posición del jugador.
import type { Game, Overlay } from "../game";
import { Gfx, W, H } from "../gfx";
import { IMG } from "../assets";
import { MAPS } from "../world/maps";
import mapaMeta from "../../../assets/atlas/mapa_region.json";

interface Lugar { id: string; nombre: string; tipo: string; x: number; y: number; mapas: string[]; desc: string }
const LUGARES = (mapaMeta as unknown as { lugares: Lugar[] }).lugares;

/** Lugar del mapa en el que está un mapa del juego (los interiores se buscan por su puerta de salida). */
export function lugarDe(id: string, prof = 0): Lugar | null {
  const l = LUGARES.find((x) => x.mapas.includes(id));
  if (l || prof > 4) return l ?? null;
  for (const w of MAPS[id]?.warps ?? []) { const r = lugarDe(w.to, prof + 1); if (r) return r; }
  return null;
}

export class RegionMap implements Overlay {
  sel = 0; t = 0; aqui: Lugar | null;
  constructor(game: Game) {
    this.aqui = lugarDe(game.state.map);
    this.sel = Math.max(0, LUGARES.findIndex((l) => l === this.aqui));
  }
  visitado(game: Game, l: Lugar) { return l.mapas.some((m) => game.state.flags[`visitado:${m}`]); }
  update(game: Game) {
    this.t++;
    const i = game.input, cur = LUGARES[this.sel];
    const mover = (dx: number, dy: number) => {
      // el lugar más cercano en esa dirección
      let best = -1, bd = 1e9;
      LUGARES.forEach((l, k) => {
        if (k === this.sel) return;
        const vx = l.x - cur.x, vy = l.y - cur.y, along = vx * dx + vy * dy;
        if (along <= 0) return;
        const cross = Math.abs(vx * dy - vy * dx), dist = along + cross * 2.2;
        if (dist < bd) { bd = dist; best = k; }
      });
      if (best >= 0) this.sel = best;
    };
    if (i.repeat("up")) mover(0, -1);
    if (i.repeat("down")) mover(0, 1);
    if (i.repeat("left")) mover(-1, 0);
    if (i.repeat("right")) mover(1, 0);
    return i.pressed("b") || i.pressed("start");
  }
  draw(g: Gfx, game: Game) {
    const c = g.ctx;
    c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
    if (IMG.mapa_region) c.drawImage(IMG.mapa_region, 0, 0, W, H); else g.clear("#3068b0");
    c.restore();
    // marcadores
    for (const l of LUGARES) {
      const v = this.visitado(game, l), x = l.x, y = l.y;
      if (l.tipo === "ciudad" || l.tipo === "pueblo") {
        const s = l.tipo === "ciudad" ? 8 : 6;
        g.rect(x - s / 2 - 1, y - s / 2 - 1, s + 2, s + 2, "#301818");
        g.rect(x - s / 2, y - s / 2, s, s, v ? "#e04848" : "#a09090");
        g.rect(x - s / 2 + 1, y - s / 2 + 1, s - 2, 2, v ? "#ff9c8c" : "#c8c0c0");
      } else if (l.tipo === "ruta") {
        g.round(x - 2, y - 2, 4, 4, 2, v ? "#fff4c8" : "#b8b0a0");
      } else {
        const col = { cueva: "#7a5a3a", torre: "#6a4a9a", bosque: "#2e7a44", isla: "#e0a040", hielo: "#78c8f0" }[l.tipo] ?? "#808080";
        g.round(x - 4, y - 4, 8, 8, 2, "#202028"); g.round(x - 3, y - 3, 6, 6, 2, v ? col : "#909098");
      }
    }
    // tú estás aquí
    if (this.aqui && Math.floor(this.t / 16) % 2 === 0) {
      const { x, y } = this.aqui;
      g.round(x - 6, y - 15, 12, 10, 5, "#ffffff"); g.round(x - 5, y - 14, 10, 8, 4, "#3070e0");
      g.rect(x - 1, y - 7, 2, 3, "#ffffff");
    }
    // cursor
    const l = LUGARES[this.sel], k = 6 + (Math.floor(this.t / 8) % 2);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      g.rect(l.x + dx * k - (dx < 0 ? 0 : 3), l.y + dy * k - (dy < 0 ? 0 : 1), 4, 1, "#ffe040");
      g.rect(l.x + dx * k - (dx < 0 ? 0 : 1), l.y + dy * k - (dy < 0 ? 0 : 3), 1, 4, "#ffe040");
    }
    // título y ficha del lugar (arriba o abajo, donde no tape el cursor)
    g.panel(2, 2, 84, 15, "#384058", "#283048", "#101828", 4);
    g.text("MAPA", 8, 4, "white", false);
    const arriba = l.y > 110, py = arriba ? 20 : H - 40;
    g.panel(4, py, W - 8, 37, "#ffffff", "#e8e8f0", "#384058", 6);
    const aquí = this.aqui === l ? "  · Estás aquí" : "";
    g.text(g.fit(l.nombre + aquí, W - 24), 12, py + 4, this.aqui === l ? "blue" : "dark");
    g.text(g.fit(this.visitado(game, l) ? l.desc : "Aún no has estado aquí.", W - 24), 12, py + 20, "gray");
  }
}
