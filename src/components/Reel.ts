import * as PIXI from "pixi.js";
import { AssetManager } from "../managers/AssetManager";
import { ASSET_NAMES, SYMBOLS_CONFIG } from "../config/assets.config";
import { Symbol } from "./Symbol";

export const REEL_WIDTH = 160;
export const SYMBOL_SIZE = 150;
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

  private targetSymbols: string[] = [];
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
      symbol.scaleToFit(SYMBOL_SIZE, SYMBOL_SIZE);
      symbol.center(REEL_WIDTH, SYMBOL_SIZE);
      symbol.y = i * SYMBOL_SIZE;

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
    this.isSlowingDown = true;
  }

  /** Frame update */
  public update(delta: number): void {
    if (!this.isSpinning && !this.isStopping) return;

    // Smooth final alignment
    if (this.isStopping) {
      let allInPlace = true;
      this.symbols.forEach((symbol, i) => {
        const targetY = i * SYMBOL_SIZE;
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
        return;
      }
    }

    // Move symbols
    this.symbols.forEach((s) => (s.y += this.spinSpeed * delta));

    // Recycle symbols
    this.recycleSymbols();
  }

  /** Recycle symbols that leave bottom, inject target symbols when slowing */
  private recycleSymbols(): void {
    const firstSymbol = this.symbols[0];
    const totalHeight = SYMBOL_SIZE * (VISIBLE_SYMBOLS + EXTRA_SYMBOLS - 1);

    if (firstSymbol.y > totalHeight) {
      this.symbols.shift();
      this.removeChild(firstSymbol);

      const lastSymbol = this.symbols[this.symbols.length - 1];
      let newTexture: PIXI.Texture;
      let newType: string;
      let newValue: number;

      const sheet = this.assetManager.getSpritesheet(ASSET_NAMES.SYMBOLS);

      if (this.isSlowingDown && this.targetSymbols.length > 0) {
        // When slowing, fill next symbols from targetSymbols (in reverse order)
        const offset = this.symbols.length - EXTRA_SYMBOLS;
        const nextIndex = offset % this.targetSymbols.length;
        const targetKey = this.targetSymbols[nextIndex];
        const cfg = SYMBOLS_CONFIG[targetKey as keyof typeof SYMBOLS_CONFIG];

        newTexture = sheet!.textures[cfg.filename];
        newType = targetKey;
        newValue = cfg.value;
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
      newSymbol.scaleToFit(SYMBOL_SIZE, SYMBOL_SIZE);
      newSymbol.center(REEL_WIDTH, SYMBOL_SIZE);
      newSymbol.y = lastSymbol.y - SYMBOL_SIZE;

      this.symbols.push(newSymbol);
      this.addChild(newSymbol);
    }
  }

  /** Final stop after smooth alignment */
  private stop(): void {
    this.isSpinning = false;
    this.isSlowingDown = false;
    this.isStopping = false;
    this.spinSpeed = 0;
    this.blurFilter.blurY = 0;

    // Ensure final visible symbols exactly match targetSymbols
    if (this.targetSymbols.length === VISIBLE_SYMBOLS) {
      const startIndex = this.symbols.length - VISIBLE_SYMBOLS - EXTRA_SYMBOLS;
      for (let i = 0; i < VISIBLE_SYMBOLS; i++) {
        const symbolIndex = startIndex + i;
        const targetKey = this.targetSymbols[i];
        const cfg = SYMBOLS_CONFIG[targetKey as keyof typeof SYMBOLS_CONFIG];
        const sheet = this.assetManager.getSpritesheet(ASSET_NAMES.SYMBOLS);

        if (symbolIndex >= 0 && symbolIndex < this.symbols.length && sheet) {
          const texture = sheet.textures[cfg.filename];
          const sym = this.symbols[symbolIndex];
          sym.setTexture(texture, targetKey, cfg.value);
        }
      }
    }
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
