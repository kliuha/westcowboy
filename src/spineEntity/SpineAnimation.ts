import { Application, Assets, Texture } from "pixi.js";
import { Spine } from "@pixi-spine/loader-uni";
import { TextureAtlas } from "@pixi-spine/base";
import { AtlasAttachmentLoader, SkeletonJson } from "@pixi-spine/runtime-3.7";

export class SpineAnimation {
  private app: Application;

  constructor(app: Application) {
    this.app = app;
  }

  async create(
    assetUrl: string,
    options: {
      scale?: number;
      animation?: string;
      loop?: boolean;
      timeScale?: number;
      x?: number;
      y?: number;
    }
  ): Promise<Spine> {
    try {
      const baseUrl = assetUrl.substring(0, assetUrl.lastIndexOf("/") + 1);
      const baseName = assetUrl
        .substring(assetUrl.lastIndexOf("/") + 1)
        .replace(".json", "");

      const atlasUrl = `${baseUrl}${baseName}.atlas`;

      const [jsonData, atlasText] = await Promise.all([
        fetch(assetUrl).then((r) => r.json()),
        fetch(atlasUrl).then((r) => r.text()),
      ]);

      const atlasLines = atlasText.split("\n");
      const textureMap = new Map<string, any>();

      for (const line of atlasLines) {
        const trimmed = line.trim();
        if (trimmed.endsWith(".png")) {
          const texturePath = `${baseUrl}${trimmed}`;
          const pixiTexture = await Assets.load<Texture>(texturePath);

          const baseTexture = pixiTexture.baseTexture;

          textureMap.set(trimmed, baseTexture);
        }
      }

      const rawAtlas = new TextureAtlas(
        atlasText,
        (path: string, callback: (baseTexture: any) => void) => {
          const baseTexture = textureMap.get(path);
          if (baseTexture) {
            callback(baseTexture);
          } else {
            console.error("Texture not found in preloaded map:", path);
          }
        }
      );

      const atlasLoader = new AtlasAttachmentLoader(rawAtlas);
      const skeletonJson = new SkeletonJson(atlasLoader);

      const skeletonData = skeletonJson.readSkeletonData(jsonData);

      const spine = new Spine(skeletonData);

      const x = options.x ?? this.app.screen.width / 2;
      const y = options.y ?? this.app.screen.height / 2;

      spine.position.set(x, y);
      spine.scale.set(options.scale ?? 0.5);
      spine.autoUpdate = true;

      if (options.animation) {
        try {
          spine.state.setAnimation(0, options.animation, options.loop ?? true);
          if (options.timeScale) {
            spine.state.timeScale = options.timeScale;
          }
        } catch (e) {
          console.warn(`Could not set animation '${options.animation}':`, e);
        }
      }

      return spine;
    } catch (error) {
      console.error(`Error loading Spine asset from ${assetUrl}:`, error);
      throw error;
    }
  }
}
