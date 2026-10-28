// Generador pseudoaleatorio con semilla (mulberry32). El estado se puede guardar y restaurar.
export class Rng {
  state: number;
  constructor(seed: number = Date.now()) { this.state = seed >>> 0; }
  /** Real en [0, 1). */
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** Entero en [min, max] (ambos incluidos). */
  int(min: number, max: number): number { return min + Math.floor(this.next() * (max - min + 1)); }
  /** true con probabilidad p (0..1). */
  chance(p: number): boolean { return this.next() < p; }
  pick<T>(arr: readonly T[]): T { return arr[Math.floor(this.next() * arr.length)]; }
}
