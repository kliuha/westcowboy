import { StateManager } from "../core/StateManager";
import { Application, Container } from "pixi.js";

export class BaseScene extends Container {
  protected stateManager: StateManager;
  protected app!: Application;

  constructor(stateManager: StateManager) {
    super();
    this.stateManager = stateManager;
  }

  public createScene(app: Application): void {
    this.app = app;
  }
}
