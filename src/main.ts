import { Application } from "pixi.js";
import * as PIXI from "pixi.js";
import { initDevtools } from "@pixi/devtools";
import { GameController } from "./core/GameController";
import { gsap } from "gsap";

import { PixiPlugin } from "gsap/PixiPlugin";
import { updateLayoutConfig } from "./config/layout.config";

(async () => {
  const app = new Application({
    resizeTo: window,
  });

  document.getElementById("pixi-container")!.appendChild(app.view as any);

  updateLayoutConfig(app.screen.width);
  app.renderer.on("resize", (width) => {
    updateLayoutConfig(width);
  });

  initDevtools({
    app,
  });

  gsap.registerPlugin(PixiPlugin);
  PixiPlugin.registerPIXI(PIXI);
  const gameController = new GameController(app);
  await gameController.init();
})();
