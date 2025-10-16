import * as PIXI from "pixi.js";

/**
 * Represents a single symbol in the slot machine.
 * Contains the sprite and metadata about the symbol type.
 */
export class Symbol extends PIXI.Container {
  public sprite: PIXI.Sprite;
  public symbolType: string;
  public value: number;
  public texture: PIXI.Texture;

  constructor(texture: PIXI.Texture, symbolType: string, value: number) {
    super();

    this.symbolType = symbolType;
    this.value = value;
    this.texture = texture;

    this.sprite = new PIXI.Sprite(texture);

    this.addChild(this.sprite);
  }

  /**
   * Scale the symbol to fit within the given size.
   */
  public scaleToFit(width: number, height: number): void {
    const scale = Math.min(
      width / this.sprite.width,
      height / this.sprite.height
    );
    this.sprite.scale.set(scale);
  }

  /**
   * Center the symbol within the given dimensions.
   */
  public center(width: number, height: number): void {
    this.x = (width - this.width) / 2;
    this.y = (height - this.height) / 2;
  }

  public setTexture(
    texture: PIXI.Texture,
    type?: string,
    value?: number
  ): void {
    this.texture = texture;
    if (type !== undefined) this.symbolType = type;
    if (value !== undefined) this.value = value;
  }
}
