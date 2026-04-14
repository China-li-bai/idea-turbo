import type { SpriteData } from '../types.js';

export function spriteToBoxShadow(sprite: SpriteData): string {
  const shadows: string[] = [];
  const pixelSize = 1;

  for (let y = 0; y < sprite.grid.length; y++) {
    const row = sprite.grid[y]!;
    for (let x = 0; x < row.length; x++) {
      const colorCode = row[x]!;
      if (colorCode === '0') continue;
      const color = sprite.palette[colorCode];
      if (!color) continue;
      shadows.push(`${x * pixelSize}px ${y * pixelSize}px 0 ${pixelSize}px ${color}`);
    }
  }

  return shadows.join(', ');
}

export function getSpriteDimensions(sprite: SpriteData, scale: number = 4): {
  width: number;
  height: number;
} {
  return {
    width: sprite.width * scale,
    height: sprite.height * scale,
  };
}
