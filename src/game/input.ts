// Entrada: teclado, botones táctiles y mando (API Gamepad).
// Teclado: A = Z/Espacio, B = X/Escape/Retroceso (correr), START = Intro.
// Mando de Xbox (disposición estándar): botón B = A, botón A = B (correr/cancelar), Menú = START,
// cruceta o joystick izquierdo = moverse.
export type Key = "up" | "down" | "left" | "right" | "a" | "b" | "start";
const MAP: Record<string, Key> = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
  KeyZ: "a", Space: "a", KeyX: "b", Escape: "b", Backspace: "b", Enter: "start", KeyP: "start",
};

export class Input {
  private held = new Set<Key>();
  private justPressed = new Set<Key>();
  private queued = new Set<Key>();
  private holdTime: Partial<Record<Key, number>> = {};
  /** Teclas pulsadas desde el mando en el último sondeo. */
  private padHeld = new Set<Key>();
  /** Nombre del mando conectado (o null). */
  pad: string | null = null;

  attach(target: Window = window) {
    target.addEventListener("keydown", (e) => {
      const k = MAP[e.code]; if (!k) return;
      e.preventDefault();
      if (!this.held.has(k)) this.queued.add(k);
      this.held.add(k);
    });
    target.addEventListener("keyup", (e) => { const k = MAP[e.code]; if (k) { this.held.delete(k); e.preventDefault(); } });
    target.addEventListener("blur", () => this.held.clear());
  }
  /** Botones táctiles: elementos con data-key. */
  attachTouch(root: HTMLElement) {
    root.querySelectorAll<HTMLElement>("[data-key]").forEach((el) => {
      const k = el.dataset.key as Key;
      const on = (e: Event) => { e.preventDefault(); if (!this.held.has(k)) this.queued.add(k); this.held.add(k); el.classList.add("on"); };
      const off = (e: Event) => { e.preventDefault(); this.held.delete(k); el.classList.remove("on"); };
      el.addEventListener("pointerdown", on); el.addEventListener("pointerup", off);
      el.addEventListener("pointerleave", off); el.addEventListener("pointercancel", off);
    });
  }
  /** Simula pulsaciones (pruebas automáticas). */
  press(k: Key) { this.queued.add(k); }
  hold(k: Key, on: boolean) { if (on) { if (!this.held.has(k)) this.queued.add(k); this.held.add(k); } else this.held.delete(k); }

  /** Lee el estado de los mandos conectados (la API Gamepad no tiene eventos de botón). */
  private pollPad() {
    const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
    const now = new Set<Key>();
    let name: string | null = null;
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      name ??= gp.id;
      const btn = (i: number) => !!gp.buttons[i]?.pressed;
      if (btn(1)) now.add("a");        // B del mando de Xbox: confirmar
      if (btn(0)) now.add("b");        // A del mando de Xbox: correr / cancelar
      if (btn(9)) now.add("start");    // Menú
      if (btn(12)) now.add("up"); if (btn(13)) now.add("down"); if (btn(14)) now.add("left"); if (btn(15)) now.add("right");
      // joystick izquierdo: solo el eje dominante, para no moverse en diagonal
      const x = gp.axes[0] ?? 0, y = gp.axes[1] ?? 0, DEAD = 0.5;
      if (Math.max(Math.abs(x), Math.abs(y)) > DEAD) {
        if (Math.abs(x) > Math.abs(y)) now.add(x > 0 ? "right" : "left"); else now.add(y > 0 ? "down" : "up");
      }
    }
    for (const k of now) if (!this.padHeld.has(k) && !this.held.has(k)) this.queued.add(k);
    this.padHeld = now;
    this.pad = name;
  }

  /** Se llama una vez por fotograma antes de actualizar. */
  tick() {
    this.pollPad();
    this.justPressed = this.queued; this.queued = new Set();
    for (const k of ["up", "down", "left", "right", "a", "b", "start"] as Key[]) {
      this.holdTime[k] = this.down(k) ? (this.holdTime[k] ?? 0) + 1 : 0;
    }
  }
  down(k: Key) { return this.held.has(k) || this.padHeld.has(k); }
  pressed(k: Key) { return this.justPressed.has(k); }
  /** Pulsación con autorrepetición para menús. */
  repeat(k: Key) {
    const t = this.holdTime[k] ?? 0;
    return this.justPressed.has(k) || (t > 18 && t % 5 === 0);
  }
  consume() { this.justPressed.clear(); }
}
