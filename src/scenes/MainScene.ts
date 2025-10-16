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
      app.stage.addChild(backgroundSprite);
    }

    app.stage.addChild(this.slotMachine);

    if (slotmachineHeaderTexture) {
      const headerSprite = new PIXI.Sprite(slotmachineHeaderTexture);
      headerSprite.width = slotDimensions.width + 25;
      const originalAspectRatio = 1434 / 174;
      headerSprite.height = headerSprite.width / originalAspectRatio;
      headerSprite.position.set(
        (app.screen.width - slotDimensions.width - 10) / 2,
        80
      );
      app.stage.addChild(headerSprite);
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
    app.stage.addChild(this.balanceText);

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
    app.stage.addChild(this.winText);

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

    app.stage.addChild(this.spinButton);

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
        scale: 0.2,
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
    if (!this.slotMachine) return;

    const reel = this.slotMachine.getReel(event.reelIndex);
    if (!reel) return;

    const reelPosition = this.slotMachine.getReelPosition(event.reelIndex);
    if (!reelPosition) return;

    const character = await this.createCharacter(
      event.character,
      reelPosition.x + reel.width / 2,
      reelPosition.y + reel.height / 2
    );

    this.activeSpineAnimations.push(character);
    this.addChild(character);
  };

  private clearSpineAnimations() {
    this.activeSpineAnimations.forEach((anim) => anim.destroy());
    this.activeSpineAnimations = [];
  }
}
