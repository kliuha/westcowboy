import { StateManager } from "../core/StateManager";
import { BaseScene } from "./BaseScene";
import { SlotMachine } from "../components/SlotMachine";

import { AssetManager } from "../managers/AssetManager";
import * as PIXI from "pixi.js";
import { ASSET_NAMES } from "../config/assets.config";
import { SpineAnimation } from "../spineEntity/SpineAnimation";
import { Spine } from "@pixi-spine/loader-uni";

export class MainScene extends BaseScene {
  private slotMachine?: SlotMachine;
  private spinButton?: PIXI.Graphics;
  private balanceText?: PIXI.Text;
  private winText?: PIXI.Text;
  private slotMachineBackground?: PIXI.Sprite;
  private backgroundMask?: PIXI.Graphics;

  private balance: number = 10000;
  private currentBet: number = 10;
  private activeSpineAnimations: Spine[] = [];

  constructor(stateManager: StateManager) {
    super(stateManager);
  }

  public createScene(app: PIXI.Application): void {
    super.createScene(app);
    const assetManager = AssetManager.getInstance();

    // Create slot machine
    this.slotMachine = new SlotMachine();
    this.slotMachine.events.on("columnWin", this.handleColumnWin);

    // Center it on screen
    const slotDimensions = this.slotMachine.dimensions;
    this.slotMachine.position.set(
      (app.screen.width - slotDimensions.width) / 2 + 15,
      150
    );

    const slotmachineBgTexture = assetManager.getTexture(
      ASSET_NAMES.SLOTMACHINE_BG
    );
    const slotmachineHeaderTexture = assetManager.getTexture(
      ASSET_NAMES.SLOT_HEADER
    );

    if (slotmachineBgTexture) {
      const backgroundSprite = new PIXI.Sprite(slotmachineBgTexture);
      backgroundSprite.width = slotDimensions.width + 25;
      backgroundSprite.height = slotDimensions.height + 25;
      backgroundSprite.position.set(
        (app.screen.width - slotDimensions.width - 10) / 2,
        135
      );
      this.addChild(backgroundSprite);
      this.slotMachineBackground = backgroundSprite;
    }

    this.addChild(this.slotMachine);

    if (slotmachineHeaderTexture && this.slotMachineBackground) {
      const headerSprite = new PIXI.Sprite(slotmachineHeaderTexture);
      headerSprite.width = slotDimensions.width + 25;
      const originalAspectRatio = 1434 / 174;
      headerSprite.height = headerSprite.width / originalAspectRatio;
      headerSprite.position.set(
        this.slotMachineBackground.x,
        this.slotMachineBackground.y - 70
      );
      this.addChild(headerSprite);
    }

    // Create UI
    this.createUI(app);

    // Add to ticker for animation updates
    app.ticker.add((delta) => {
      if (this.slotMachine) {
        this.slotMachine.update(delta);
      }
    });
  }

  private createUI(app: PIXI.Application): void {
    const assetManager = AssetManager.getInstance();
    // Balance display
    this.balanceText = new PIXI.Text(`Balance: $${this.balance}`, {
      fontFamily: "Arial",
      fontSize: 32,
      fill: 0xffffff,
      fontWeight: "bold",
      stroke: 0x000000,
      strokeThickness: 4,
    });
    this.balanceText.position.set(50, 50);
    this.addChild(this.balanceText);

    // Win display
    this.winText = new PIXI.Text("", {
      fontFamily: "Arial",
      fontSize: 48,
      fill: 0xffff00,
      fontWeight: "bold",
      stroke: 0x000000,
      strokeThickness: 5,
    });
    this.winText.position.set(app.screen.width / 2, app.screen.height - 200);
    this.winText.anchor.set(0.5);
    this.addChild(this.winText);

    // Spin button
    this.spinButton = new PIXI.Graphics();
    this.spinButton.beginFill(0x00aa00);
    this.spinButton.drawRoundedRect(0, 0, 200, 80, 10);
    this.spinButton.endFill();

    this.spinButton.position.set(
      (app.screen.width - 200) / 2,
      app.screen.height - 120
    );

    this.spinButton.interactive = true;
    this.spinButton.cursor = "pointer";

    this.spinButton.on("pointerdown", () => this.handleSpin());

    this.addChild(this.spinButton);

    // Spin button text
    const buttonText = new PIXI.Text("SPIN", {
      fontFamily: "Arial",
      fontSize: 36,
      fill: 0xffffff,
      fontWeight: "bold",
    });
    buttonText.anchor.set(0.5);
    buttonText.position.set(100, 40);
    this.spinButton.addChild(buttonText);
  }

  private async handleSpin(): Promise<void> {
    if (!this.slotMachine || this.slotMachine.spinning) {
      return;
    }

    this.clearSpineAnimations();

    // Deduct bet
    if (this.balance < this.currentBet) {
      this.showMessage("Insufficient balance!");
      return;
    }

    this.balance -= this.currentBet;
    this.updateBalance();

    // Disable button
    if (this.spinButton) {
      this.spinButton.alpha = 0.5;
      this.spinButton.interactive = false;
    }

    // Clear previous win message
    if (this.winText) {
      this.winText.text = "";
    }

    // Spin!
    const result = await this.slotMachine.spin();

    // Show results
    if (result.totalWin > 0) {
      this.balance += result.totalWin;
      this.showWin(result.totalWin);

      console.log("Winning lines:", result.winningLines);
    }

    this.updateBalance();

    // Re-enable button
    if (this.spinButton) {
      this.spinButton.alpha = 1;
      this.spinButton.interactive = true;
    }
  }

  private updateBalance(): void {
    if (this.balanceText) {
      this.balanceText.text = `Balance: $${this.balance}`;
    }
  }

  private showWin(amount: number): void {
    if (this.winText) {
      this.winText.text = `WIN: $${amount}!`;

      // Animate win text
      this.winText.scale.set(0);

      // Simple scale animation
      const animateWin = () => {
        if (this.winText && this.winText.scale.x < 1) {
          this.winText.scale.x += 0.05;
          this.winText.scale.y += 0.05;
          requestAnimationFrame(animateWin);
        }
      };
      animateWin();
    }
  }

  private showMessage(message: string): void {
    console.log(message);
    if (this.winText) {
      this.winText.text = message;
      setTimeout(() => {
        if (this.winText) {
          this.winText.text = "";
        }
      }, 2000);
    }
  }

  private createCharacter(
    name: "Man" | "Woman",
    x: number,
    y: number
  ): Promise<Spine> {
    const spineAnim = new SpineAnimation(this.app);
    return spineAnim.create(
      `/SPINE-Json/${name}/WEST-SLOTS-character-${name}.json`,
      {
        scale: 0.25,
        animation: "animation",
        x,
        y,
      }
    );
  }

  private handleColumnWin = async (event: {
    reelIndex: number;
    character: "Man" | "Woman";
  }) => {
    console.log("handleColumnWin called", event);
    if (!this.slotMachine) {
      console.log("No slotMachine");
      return;
    }

    const reel = this.slotMachine.getReel(event.reelIndex);
    if (!reel) {
      console.log("No reel for index", event.reelIndex);
      return;
    }

    const reelPosition = this.slotMachine.getReelPosition(event.reelIndex);
    if (!reelPosition) {
      console.log("No reelPosition for index", event.reelIndex);
      return;
    }

    console.log("Creating mask for reel", event.reelIndex);
    // Create a mask to hide only the specific reel area
    this.createReelMask(event.reelIndex);

    console.log("Creating character", event.character);
    try {
      const character = await this.createCharacter(
        event.character,
        reelPosition.x + reel.width / 2,
        reelPosition.y + reel.height / 2 + 100
      );

      console.log("Character created", character);
      reel.visible = false;
      this.activeSpineAnimations.push(character);
      this.addChild(character);
      console.log("Added spine animation for", event.character);
    } catch (error) {
      console.error("Error creating character:", error);
    }
  };

  private createReelMask(reelIndex: number): void {
    if (!this.slotMachine || !this.slotMachineBackground) return;

    const reel = this.slotMachine.getReel(reelIndex);
    if (!reel) return;

    const reelPosition = this.slotMachine.getReelPosition(reelIndex);
    if (!reelPosition) return;

    // Remove existing mask if any
    if (this.backgroundMask) {
      this.removeChild(this.backgroundMask);
      this.backgroundMask.destroy();
    }

    // Create a new mask that covers all reels EXCEPT the one with spine animation
    this.backgroundMask = new PIXI.Graphics();

    // Start by filling the entire background area (this will be visible)
    this.backgroundMask.beginFill(0xffffff);
    this.backgroundMask.drawRect(
      this.slotMachineBackground.x,
      this.slotMachineBackground.y,
      this.slotMachineBackground.width,
      this.slotMachineBackground.height
    );
    this.backgroundMask.endFill();

    // Cut out the area where the spine animation will be (the specific reel)
    this.backgroundMask.beginHole();
    this.backgroundMask.drawRect(
      reelPosition.x - 5, // Small padding to ensure full coverage
      reelPosition.y - 5,
      reel.width + 10,
      reel.height + 10
    );
    this.backgroundMask.endHole();

    // Apply the mask to the background
    this.slotMachineBackground.mask = this.backgroundMask;
    this.addChild(this.backgroundMask);
  }

  private clearSpineAnimations() {
    // Clear spine animations
    this.activeSpineAnimations.forEach((anim) => {
      if (anim.parent) {
        anim.parent.removeChild(anim);
      }
      anim.destroy();
    });
    this.activeSpineAnimations = [];

    // Remove the mask to show the full background again
    if (this.slotMachineBackground) {
      this.slotMachineBackground.mask = null;
    }

    // Remove mask graphics
    if (this.backgroundMask) {
      if (this.backgroundMask.parent) {
        this.backgroundMask.parent.removeChild(this.backgroundMask);
      }
      this.backgroundMask.destroy();
      this.backgroundMask = undefined;
    }

    // Make all reels visible again
    if (this.slotMachine) {
      for (let i = 0; i < 5; i++) {
        const reel = this.slotMachine.getReel(i);
        if (reel) {
          reel.visible = true;
        }
      }
    }
  }

  // Clean up method to ensure proper destruction
  public destroy(): void {
    this.clearSpineAnimations();

    if (this.slotMachine) {
      this.slotMachine.events.off("columnWin", this.handleColumnWin);
    }

    super.destroy();
  }
}
