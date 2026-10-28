// Entrada: teclado y botones táctiles. A = Z/Espacio, B = X/Escape/Retroceso, START = Intro.
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

  /** Se llama una vez por fotograma antes de actualizar. */
  tick() {
    this.justPressed = this.queued; this.queued = new Set();
    for (const k of ["up", "down", "left", "right", "a", "b", "start"] as Key[]) {
      this.holdTime[k] = this.held.has(k) ? (this.holdTime[k] ?? 0) + 1 : 0;
    }
  }
  down(k: Key) { return this.held.has(k); }
  pressed(k: Key) { return this.justPressed.has(k); }
  /** Pulsación con autorrepetición para menús. */
  repeat(k: Key) {
    const t = this.holdTime[k] ?? 0;
    return this.justPressed.has(k) || (t > 18 && t % 5 === 0);
  }
  consume() { this.justPressed.clear(); }
}
