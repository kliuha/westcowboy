import * as PIXI from "pixi.js";

export function createGradientTexture(
  width: number,
  height: number,
  color1: string,
  color2: string,
  color3: string
): PIXI.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(0.5, color2);
  gradient.addColorStop(1, color3);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return PIXI.Texture.from(canvas);
}
