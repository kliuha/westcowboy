import { Application } from "pixi.js";
import { StateManager } from "./StateManager";
import { STATES } from "./types/type";
import { LoadingScene } from "../scenes/LoadingScene";
import { MainScene } from "../scenes/MainScene";

export class GameController {
  private app: Application;
  private stateManager: StateManager;
  private loadingScene: LoadingScene;
  private mainScene: MainScene;

  constructor(app: Application) {
    this.app = app;
    this.stateManager = new StateManager();
    this.loadingScene = new LoadingScene(this.stateManager);
    this.mainScene = new MainScene(this.stateManager);
  }

  public async init(): Promise<void> {
    this.stateManager.setAppState(STATES.LOADING);
    await this.loadingScene.preloadAssets(this.app);
    this.stateManager.setAppState(STATES.READY);
    this.setupScene();
  }

  private setupScene(): void {
    switch (this.stateManager.getAppState()) {
      case STATES.READY:
        this.app.stage.addChild(this.mainScene);
        this.mainScene.createScene(this.app);
        break;
      default:
        break;
    }
  }
}
