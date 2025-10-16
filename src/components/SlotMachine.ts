import * as PIXI from "pixi.js";
import { gsap } from "gsap";
import { Reel, REEL_WIDTH, SYMBOL_SIZE } from "./Reel";
import { SYMBOLS_CONFIG } from "../config/assets.config";
import { EventEmitter } from "eventemitter3";

export interface SpinResult {
  reelSymbols: string[][];
  winningLines: WinLine[];
  totalWin: number;
}

export interface WinLine {
  lineNumber: number;
  symbols: string[];
  count: number;
  payout: number;
}

export class SlotMachine extends PIXI.Container {
  private reels: Reel[] = [];
  private readonly NUM_REELS = 5;
  private readonly NUM_ROWS = 3;

  private reelContainer: PIXI.Container;
  private maskGraphics: PIXI.Graphics | undefined;

  private isSpinning: boolean = false;
  public events: EventEmitter = new EventEmitter();

  constructor() {
    super();

    this.reelContainer = new PIXI.Container();
    this.addChild(this.reelContainer);

    this.createReels();
    this.createMask();
  }

  /**
   * Create all 5 reels
   */
  private createReels(): void {
    for (let i = 0; i < this.NUM_REELS; i++) {
      const reel = new Reel();
      reel.x = i * REEL_WIDTH;
      reel.y = 0;

      this.reels.push(reel);
      this.reelContainer.addChild(reel);

      // Add separator after each reel except the last one
      if (i < this.NUM_REELS - 1) {
        const separatorTexture = createGradientTexture(
          4, // width of the separator
          this.dimensions.height,
          "#23193c",
          "#7da0dd",
          "#23193c"
        );
        const separator = new PIXI.Sprite(separatorTexture);
        separator.x = (i + 1) * REEL_WIDTH - separator.width / 2;
        separator.y = 0;
        this.reelContainer.addChild(separator);
      }
    }
  }

  /**
   * Create a mask to only show 3 rows of symbols
   */
  private createMask(): void {
    this.maskGraphics = new PIXI.Graphics();
    this.maskGraphics.beginFill(0xffffff);
    this.maskGraphics.drawRect(
      0,
      0,
      this.NUM_REELS * REEL_WIDTH,
      this.NUM_ROWS * SYMBOL_SIZE
    );
    this.maskGraphics.endFill();

    this.addChild(this.maskGraphics);
    this.reelContainer.mask = this.maskGraphics;
  }

  /**
   * Start spinning all reels
   */
  public async spin(): Promise<SpinResult> {
    if (this.isSpinning) {
      console.warn("Already spinning!");
      return {
        reelSymbols: [],
        winningLines: [],
        totalWin: 0,
      };
    }

    this.isSpinning = true;

    // Set random direction for each reel
    this.reels.forEach((reel) => {
      reel.setDirection(Math.random() > 0.5 ? 1 : -1);
    });

    const tl = gsap.timeline();

    // Start reels with staggered delay
    this.reels.forEach((_, i) => {
      tl.call(() => this.reels[i].spin(), [], i * 0.1);
    });

    // Generate random outcome (in a real game, this comes from server)
    const spinResult = this.generateSpinOutcome();

    // Wait for realistic spin duration (2-4 seconds)
    const spinDuration = 2 + Math.random() * 2;
    tl.to({}, { duration: spinDuration }, "+=0");

    // Stop reels with staggered delay
    this.reels.forEach((_, i) => {
      tl.call(
        () => this.reels[i].setTargetSymbols(spinResult.reelSymbols[i]),
        [],
        "+=0.1"
      );
    });

    // Wait for all to stop and calculate wins
    return new Promise((resolve) => {
      tl.call(() => {
        this.waitForReelsToStop().then(() => {
          spinResult.winningLines = this.calculateWins(spinResult.reelSymbols);
          spinResult.totalWin = spinResult.winningLines.reduce(
            (sum, line) => sum + line.payout,
            0
          );
          this.isSpinning = false;
          resolve(spinResult);
        });
      });
    });
  }

  /**
   * Generate a random spin outcome
   * In a real game, this would come from a backend server
   */
  private generateSpinOutcome(): SpinResult {
    const reelSymbols: string[][] = [];

    for (let i = 0; i < this.NUM_REELS; i++) {
      const reelResult: string[] = [];
      for (let j = 0; j < this.NUM_ROWS; j++) {
        const randomSymbol = this.getRandomSymbol();
        reelResult.push(randomSymbol);
      }
      reelSymbols.push(reelResult);
    }

    return {
      reelSymbols,
      winningLines: [],
      totalWin: 0,
    };
  }

  /**
   * Get a random symbol based on weights
   */
  private getRandomSymbol(): string {
    const symbols = Object.entries(SYMBOLS_CONFIG);
    const totalWeight = symbols.reduce(
      (sum, [_, config]) => sum + config.weight,
      0
    );
    let random = Math.random() * totalWeight;

    for (const [key, config] of symbols) {
      random -= config.weight;
      if (random <= 0) return key;
    }

    return symbols[0][0]; // fallback
  }

  /**
   * Calculate wins from the spin result
   * This is a simplified version - checks only horizontal lines
   */
  private calculateWins(reelSymbols: string[][]): WinLine[] {
    const winningLines: WinLine[] = [];

    // Check for full column wins of MAN or WOMAN
    for (let reel = 0; reel < this.NUM_REELS; reel++) {
      const firstSymbol = reelSymbols[reel][0];
      if (
        (firstSymbol === "MAN" || firstSymbol === "WOMAN") &&
        reelSymbols[reel].every((s) => s === firstSymbol)
      ) {
        console.log(`Full column win on reel ${reel + 1} with ${firstSymbol}`);
        this.events.emit("columnWin", {
          reelIndex: reel,
          character: firstSymbol === "MAN" ? "Man" : "Woman",
        });
      }
    }

    // Check each row (3 paylines)
    for (let row = 0; row < this.NUM_ROWS; row++) {
      const lineSymbols: string[] = [];

      // Get symbols from each reel for this row
      for (let reel = 0; reel < this.NUM_REELS; reel++) {
        lineSymbols.push(reelSymbols[reel][row]);
      }

      // Count matching symbols from left
      const firstSymbol = lineSymbols[0];
      let matchCount = 1;

      for (let i = 1; i < lineSymbols.length; i++) {
        if (lineSymbols[i] === firstSymbol || lineSymbols[i] === "WILD") {
          matchCount++;
        } else {
          break;
        }
      }

      // Check if we have a winning combination (3 or more)
      if (matchCount >= 3) {
        const symbolConfig =
          SYMBOLS_CONFIG[firstSymbol as keyof typeof SYMBOLS_CONFIG];
        const payout = symbolConfig.value * matchCount;

        // Create a version of the line where WILDs are replaced by the winning symbol for clarity
        const concreteLineSymbols = lineSymbols
          .slice(0, matchCount)
          .map((s) => (s === "WILD" ? firstSymbol : s));

        winningLines.push({
          lineNumber: row + 1,
          symbols: concreteLineSymbols,
          count: matchCount,
          payout: payout,
        });
      }
    }

    return winningLines;
  }

  /**
   * Update all reels (call this every frame)
   */
  public update(delta: number): void {
    this.reels.forEach((reel) => reel.update(delta));
  }

  /**
   * Wait for all reels to stop spinning
   */
  private async waitForReelsToStop(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const allStopped = this.reels.every((reel) => !reel.spinning);
        if (allStopped) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });
  }

  /**
   * Get current spinning state
   */
  public get spinning(): boolean {
    return this.isSpinning;
  }

  public getReel(index: number): Reel | undefined {
    return this.reels[index];
  }

  public getReelPosition(index: number): { x: number; y: number } | null {
    if (this.reels[index]) {
      return {
        x: this.x + this.reels[index].x,
        y: this.y + this.reels[index].y,
      };
    }
    return null;
  }

  /**
   * Get overall dimensions
   */
  public get dimensions(): { width: number; height: number } {
    return {
      width: this.NUM_REELS * REEL_WIDTH,
      height: this.NUM_ROWS * SYMBOL_SIZE,
    };
  }
}

/**
 * Create a gradient texture for separators
 */
function createGradientTexture(
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
