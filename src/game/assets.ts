// Carga de imágenes y metadatos de los atlas. Las imágenes van incrustadas como data URL
// (src/game/assets_data.ts lo genera tools/build_game.ts), así el juego es un único HTML.
import DATA from "./assets_data";
import fontMeta from "../../assets/atlas/font.json";
import tilesMeta from "../../assets/atlas/tiles.json";
import charMeta from "../../assets/atlas/personajes.json";
import microMeta from "../../assets/atlas/microos.json";
import propsMeta from "../../assets/atlas/props_hd.json";

export const IMG: Record<string, HTMLImageElement> = {};
export const FONT = fontMeta as unknown as { cell: [number, number]; cols: number; height: number; glyphs: Record<string, [number, number]> };
export const TILES = tilesMeta as Record<string, number>;
export const CHARS = charMeta as { sheets: Record<string, number>; portraits: Record<string, number>; hdScale?: number; hd?: Record<string, number>; hdPortraits?: Record<string, number> };
export const MICRO = microMeta as { cols: number; index: Record<string, number>; cell?: number };

export async function loadAssets(): Promise<void> {
  await Promise.all(Object.entries(DATA as Record<string, string>).map(([k, url]) => new Promise<void>((res, rej) => {
    const im = new Image();
    im.onload = () => { IMG[k] = im; res(); };
    im.onerror = () => rej(new Error(`No se pudo cargar ${k}`));
    im.src = url;
  })));
}
/** Ilustraciones HD de edificios y árboles (rectángulo en el atlas, puerta y fachada en px del atlas). */
export const PROPS = propsMeta as unknown as Record<string, { x: number; y: number; w: number; h: number; door?: [number, number]; wall?: [number, number] }>;
