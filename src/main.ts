import { Application } from "pixi.js";
import * as PIXI from "pixi.js";
import { initDevtools } from "@pixi/devtools";
import { GameController } from "./core/GameController";
import { gsap } from "gsap";

import { PixiPlugin } from "gsap/PixiPlugin";

(async () => {
  const app = new Application({
    resizeTo: window,
  });

  document.getElementById("pixi-container")!.appendChild(app.view as any);

  initDevtools({
    app,
  });

  gsap.registerPlugin(PixiPlugin);
  PixiPlugin.registerPIXI(PIXI);
  const gameController = new GameController(app);
  await gameController.init();
})();
