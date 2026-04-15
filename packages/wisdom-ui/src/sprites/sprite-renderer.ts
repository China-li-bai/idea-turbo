import type { SpriteData } from '../types.js';

export interface SpriteRect {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

export function spriteToRects(sprite: SpriteData): SpriteRect[] {
  const rects: SpriteRect[] = [];

  for (let y = 0; y < sprite.grid.length; y++) {
    const row = sprite.grid[y]!;
    for (let x = 0; x < row.length; x++) {
      const colorCode = row[x]!;
      if (colorCode === '0') continue;
      const color = sprite.palette[colorCode];
      if (!color) continue;

      rects.push({
        x,
        y,
        width: 1,
        height: 1,
        fill: color,
      });
    }
  }

  return rects;
}

export function getSpriteDimensions(sprite: SpriteData): {
  width: number;
  height: number;
} {
  return {
    width: sprite.width,
    height: sprite.height,
  };
}
