import * as PIXI from "pixi.js";
import { StateManager } from "../core/StateManager";
import { STATES } from "../core/types/type";

import gsap from "gsap";
import { AssetManager } from "../managers/AssetManager";
import {
  ASSET_NAMES,
  GAME_ASSETS,
  SYMBOLS_CONFIG,
} from "../config/assets.config";
import { Sprite } from "pixi.js";

export class LoadingScene {
  private stateManager: StateManager;
  private radius: number = 0;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  private showMaskLoadingScreen(app: PIXI.Application): void {
    let graphics = new PIXI.Graphics();
    app.stage.addChild(graphics);
    app.stage.mask = graphics;
    let circle = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      r: this.radius,
    };

    updateCircle();

    gsap.to(circle, {
      r: window.innerWidth,
      duration: 1,
      onUpdate: updateCircle,
      onComplete: () => {
        app.stage.removeChild(graphics);
        graphics.destroy();
        app.stage.mask = null;
      },
    });

    function updateCircle() {
      graphics
        .clear()
        .beginFill()
        .drawCircle(circle.x, circle.y, circle.r)
        .endFill();
    }
  }

  public async preloadAssets(app: PIXI.Application) {
    const assetManager = AssetManager.getInstance();

    // Load all assets first
    await assetManager.loadAssets(GAME_ASSETS);

    // Generate character symbol textures from Spine models
    assetManager.generateSpineSymbolTextures(app.renderer);

    // Add background
    const backgroundTexture = assetManager.getTexture(ASSET_NAMES.BACKGROUND);
    if (backgroundTexture) {
      const backgroundSprite = new Sprite(backgroundTexture);
      backgroundSprite.width = app.screen.width;
      backgroundSprite.height = app.screen.height;
      backgroundSprite.position.set(0, 0);
      app.stage.addChild(backgroundSprite);
    }

    // Show loading screen animation
    this.showMaskLoadingScreen(app);

    this.stateManager.setAppState(STATES.READY);
  }
}
