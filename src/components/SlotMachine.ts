import * as PIXI from "pixi.js";
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
  private spinStartDelay: number = 100; // ms delay between reel starts
  private spinStopDelay: number = 100; // ms delay between reel stops
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

    // Start reels with staggered delay
    for (let i = 0; i < this.reels.length; i++) {
      await this.delay(this.spinStartDelay);
      this.reels[i].spin();
    }

    // Generate random outcome (in a real game, this comes from server)
    const spinResult = this.generateSpinOutcome();

    // Wait a bit before stopping
    await this.delay(2000);

    // Stop reels with staggered delay
    for (let i = 0; i < this.reels.length; i++) {
      this.reels[i].setTargetSymbols(spinResult.reelSymbols[i]);
      await this.delay(this.spinStopDelay);
    }

    // Wait for all reels to fully stop
    await this.waitForReelsToStop();

    this.isSpinning = false;

    // Calculate wins
    spinResult.winningLines = this.calculateWins(spinResult.reelSymbols);
    spinResult.totalWin = spinResult.winningLines.reduce(
      (sum, line) => sum + line.payout,
      0
    );

    return spinResult;
  }

  /**
   * Generate a random spin outcome
   * In a real game, this would come from a backend server
   */
  private generateSpinOutcome(): SpinResult {
    const reelSymbols: string[][] = [];
    const symbolKeys = Object.keys(SYMBOLS_CONFIG);

    // Mock data for testing: 100% chance to force a column win on reel 1
    const forceWin = true;
    const winningReel = 0; // Reel 1
    const winSymbol = "MAN";

    for (let i = 0; i < this.NUM_REELS; i++) {
      const reelResult: string[] = [];
      for (let j = 0; j < this.NUM_ROWS; j++) {
        if (forceWin && i === winningReel) {
          reelResult.push(winSymbol);
        } else {
          const randomSymbol =
            symbolKeys[Math.floor(Math.random() * symbolKeys.length)];
          reelResult.push(randomSymbol);
        }
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
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
