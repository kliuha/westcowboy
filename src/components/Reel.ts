import * as PIXI from "pixi.js";
import { AssetManager } from "../managers/AssetManager";
import { ASSET_NAMES, SYMBOLS_CONFIG } from "../config/assets.config";
import { Symbol } from "./Symbol";
import { layout } from "../config/layout.config";

const VISIBLE_SYMBOLS = 3;
const EXTRA_SYMBOLS = 2; // for smooth scrolling

export class Reel extends PIXI.Container {
  private symbols: Symbol[] = [];
  private assetManager = AssetManager.getInstance();
  private symbolTextures: PIXI.Texture[] = [];
  private symbolTypes: string[] = [];

  private isSpinning = false;
  private spinSpeed = 0;
  private targetSpeed = 50;
  private acceleration = 2;
  private deceleration = 1;
  private direction = 1; // 1 for down, -1 for up

  private targetSymbols: string[] = [];
  private addedCount = 0;
  private isSlowingDown = false;
  private isStopping = false;
  private blurFilter: PIXI.BlurFilter;

  constructor() {
    super();

    this.blurFilter = new PIXI.BlurFilter(0);
    this.blurFilter.blurY = 0;
    this.filters = [this.blurFilter];

    this.loadSymbolTextures();
    this.create();
  }

  /** Set spin direction: 1 for down, -1 for up */
  public setDirection(dir: 1 | -1): void {
    this.direction = dir;
  }

  /** Load all symbol textures */
  private loadSymbolTextures(): void {
    const symbolsSpritesheet = this.assetManager.getSpritesheet(
      ASSET_NAMES.SYMBOLS
    );
    if (!symbolsSpritesheet) {
      console.error("Symbols spritesheet not found!");
      return;
    }

    Object.entries(SYMBOLS_CONFIG).forEach(([key, config]) => {
      const texture = symbolsSpritesheet.textures[config.filename];
      if (texture) {
        this.symbolTextures.push(texture);
        this.symbolTypes.push(key);
      }
    });
  }

  /** Create initial symbols */
  private create(): void {
    const total = VISIBLE_SYMBOLS + EXTRA_SYMBOLS;
    for (let i = 0; i < total; i++) {
      const randomIndex = Math.floor(
        Math.random() * this.symbolTextures.length
      );
      const texture = this.symbolTextures[randomIndex];
      const symbolType = this.symbolTypes[randomIndex];
      const value = Object.values(SYMBOLS_CONFIG)[randomIndex].value;

      const symbol = new Symbol(texture, symbolType, value);
      symbol.scaleToFit(layout.SYMBOL_SIZE, layout.SYMBOL_SIZE);
      symbol.center(layout.REEL_WIDTH, layout.SYMBOL_SIZE);
      symbol.y = i * layout.SYMBOL_SIZE;

      this.symbols.push(symbol);
      this.addChild(symbol);
    }
  }

  /** Start spinning */
  public spin(): void {
    this.isSpinning = true;
    this.isSlowingDown = false;
    this.isStopping = false;
    this.spinSpeed = 0;
  }

  /** Define final target symbols (top-to-bottom visible) */
  public setTargetSymbols(targets: string[]): void {
    if (targets.length !== VISIBLE_SYMBOLS) {
      console.error(
        `Expected ${VISIBLE_SYMBOLS} target symbols, got ${targets.length}`
      );
      return;
    }

    this.targetSymbols = targets;
    this.addedCount = 0;
    this.isSlowingDown = true;
  }

  /** Frame update */
  public update(delta: number): void {
    if (!this.isSpinning && !this.isStopping) return;

    // Smooth final alignment
    if (this.isStopping) {
      let allInPlace = true;
      const sortedSymbols = [...this.symbols].sort((a, b) => a.y - b.y);
      sortedSymbols.forEach((symbol, i) => {
        const targetY = i * layout.SYMBOL_SIZE;
        if (Math.abs(symbol.y - targetY) > 0.5) {
          symbol.y += (targetY - symbol.y) * 0.2 * delta;
          allInPlace = false;
        } else {
          symbol.y = targetY;
        }
      });

      if (allInPlace) this.stop();
      return;
    }

    // Accelerate to target speed
    if (!this.isSlowingDown && this.spinSpeed < this.targetSpeed) {
      this.spinSpeed = Math.min(
        this.spinSpeed + this.acceleration,
        this.targetSpeed
      );
      this.blurFilter.blurY = Math.min(this.spinSpeed / 2, 15);
    }

    // Decelerate smoothly
    if (this.isSlowingDown) {
      this.spinSpeed = Math.max(this.spinSpeed - this.deceleration, 0);
      this.blurFilter.blurY = this.spinSpeed / 2;

      // When speed hits zero, begin smooth alignment
      if (this.spinSpeed === 0 && !this.isStopping) {
        this.isSpinning = false;
        this.isStopping = true;

        // Set correct textures on visible symbols at start of stopping animation
        const visibleSymbols = this.symbols
          .filter((s) => s.y >= 0 && s.y < VISIBLE_SYMBOLS * layout.SYMBOL_SIZE)
          .sort((a, b) => a.y - b.y);
        for (let i = 0; i < visibleSymbols.length && i < VISIBLE_SYMBOLS; i++) {
          const targetKey = this.targetSymbols[i];
          const cfg = SYMBOLS_CONFIG[targetKey as keyof typeof SYMBOLS_CONFIG];
          const sheet = this.assetManager.getSpritesheet(ASSET_NAMES.SYMBOLS);

          if (sheet) {
            console.log(`159 row: ${cfg.filename}`);
            const texture = sheet.textures[cfg.filename];
            visibleSymbols[i].setTexture(texture, targetKey, cfg.value);
          }
        }
        return;
      }
    }

    // Move symbols
    this.symbols.forEach(
      (s) => (s.y += this.spinSpeed * delta * this.direction)
    );

    // Recycle symbols
    this.recycleSymbols();
  }

  /** Recycle symbols that leave bottom/top, inject target symbols when slowing */
  private recycleSymbols(): void {
    if (this.direction === 1) {
      // Down spin: recycle when top symbol goes below bottom
      const firstSymbol = this.symbols[0];
      const totalHeight =
        layout.SYMBOL_SIZE * (VISIBLE_SYMBOLS + EXTRA_SYMBOLS - 1);

      if (firstSymbol.y > totalHeight) {
        this.symbols.shift();
        this.removeChild(firstSymbol);
        this.addNewSymbolAtBottom();
      }
    } else {
      // Up spin: recycle when top symbol goes above top
      const firstSymbol = this.symbols[0];

      if (firstSymbol.y < -layout.SYMBOL_SIZE) {
        this.symbols.shift();
        this.removeChild(firstSymbol);
        this.addNewSymbolAtBottom();
      }
    }
  }

  private addNewSymbolAtBottom(): void {
    const lastSymbol = this.symbols[this.symbols.length - 1];
    let newTexture: PIXI.Texture;
    let newType: string;
    let newValue: number;

    const sheet = this.assetManager.getSpritesheet(ASSET_NAMES.SYMBOLS);

    if (this.isSlowingDown && this.targetSymbols.length > 0) {
      // When slowing, fill next symbols from targetSymbols (in reverse order for down)
      const nextIndex = this.targetSymbols.length - 1 - this.addedCount;
      const targetKey = this.targetSymbols[nextIndex];
      const cfg = SYMBOLS_CONFIG[targetKey as keyof typeof SYMBOLS_CONFIG];
      console.log(`213 row: ${cfg.filename}`);
      newTexture = sheet!.textures[cfg.filename];
      newType = targetKey;
      newValue = cfg.value;
      this.addedCount++;
    } else {
      // Random symbol during spin
      const randomIndex = Math.floor(
        Math.random() * this.symbolTextures.length
      );
      newTexture = this.symbolTextures[randomIndex];
      newType = this.symbolTypes[randomIndex];
      newValue = Object.values(SYMBOLS_CONFIG)[randomIndex].value;
    }

    const newSymbol = new Symbol(newTexture, newType, newValue);
    newSymbol.scaleToFit(layout.SYMBOL_SIZE, layout.SYMBOL_SIZE);
    newSymbol.center(layout.REEL_WIDTH, layout.SYMBOL_SIZE);
    newSymbol.y =
      lastSymbol.y +
      (this.direction === 1 ? -layout.SYMBOL_SIZE : layout.SYMBOL_SIZE);

    this.symbols.push(newSymbol);
    this.addChild(newSymbol);
  }

  /** Final stop after smooth alignment */
  private stop(): void {
    this.isSpinning = false;
    this.isSlowingDown = false;
    this.isStopping = false;
    this.spinSpeed = 0;
    this.blurFilter.blurY = 0;
  }

  /** Get the visible symbols */
  public getVisibleSymbols(): Symbol[] {
    return this.symbols.slice(0, VISIBLE_SYMBOLS);
  }

  /** Is the reel spinning */
  public get spinning(): boolean {
    return this.isSpinning;
  }
}
