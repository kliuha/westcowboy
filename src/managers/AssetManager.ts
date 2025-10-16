import * as PIXI from "pixi.js";
import { TextureAtlas } from "@pixi-spine/base";
import { SkeletonJson, AtlasAttachmentLoader } from "@pixi-spine/runtime-3.7";
import { Spine } from "pixi-spine";
import { ASSET_NAMES, SYMBOLS_CONFIG } from "../config/assets.config";

/**
 * Asset configuration interface
 */
export interface AssetConfig {
  name: string;
  type: "spine" | "image" | "spritesheet" | "sound";
  path: string;
}

/**
 * Spine asset data structure
 */
export interface SpineAssetData {
  skeletonData: any;
  atlas: TextureAtlas;
}

/**
 * AssetManager - Centralized asset loading and caching
 *
 * Features:
 * - Loads and caches Spine animations
 * - Loads and caches images/textures
 * - Progress tracking
 * - Error handling
 * - Prevents duplicate loading
 */
export class AssetManager {
  private static instance: AssetManager;

  // Asset caches
  private spineCache: Map<string, SpineAssetData> = new Map();
  private textureCache: Map<string, PIXI.Texture> = new Map();
  private spritesheetCache = new Map<string, PIXI.Spritesheet>();
  private isLoadedMap = new Map<string, boolean>();

  // Loading state
  private loadingProgress: number = 0;
  private totalAssets: number = 0;
  private loadedAssets: number = 0;

  // Callbacks
  private onProgressCallbacks: Array<(progress: number) => void> = [];
  private onCompleteCallbacks: Array<() => void> = [];

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  /**
   * Register progress callback
   */
  public onProgress(callback: (progress: number) => void): void {
    this.onProgressCallbacks.push(callback);
  }

  /**
   * Register completion callback
   */
  public onComplete(callback: () => void): void {
    this.onCompleteCallbacks.push(callback);
  }

  /**
   * Update loading progress
   */
  private updateProgress(): void {
    this.loadedAssets++;
    this.loadingProgress = this.loadedAssets / this.totalAssets;

    // Notify all progress callbacks

    this.onProgressCallbacks.forEach((cb) => cb(this.loadingProgress));

    // Check if loading is complete
    if (this.loadedAssets >= this.totalAssets) {
      this.onCompleteCallbacks.forEach((cb) => cb());
    }
  }

  /**
   * Load multiple assets in batch
   */
  public async loadAssets(assets: AssetConfig[]): Promise<void> {
    this.totalAssets = assets.length;
    this.loadedAssets = 0;
    this.loadingProgress = 0;

    // Load all assets in parallel
    const promises = assets.map(async (asset) => {
      try {
        switch (asset.type) {
          case "spine":
            await this.loadSpineAsset(asset.name, asset.path);
            break;
          case "image":
            await this.loadImageAsset(asset.name, asset.path);
            break;
          case "spritesheet":
            try {
              const spritesheet = await PIXI.Assets.load<PIXI.Spritesheet>(
                asset.path
              );
              this.spritesheetCache.set(asset.name, spritesheet);
              this.isLoadedMap.set(asset.name, true);
              console.log(`Loaded spritesheet: ${asset.name}`);
            } catch (error) {
              console.error(`Failed to load spritesheet: ${asset.name}`, error);
            }
            break;
          default:
            console.warn(`[AssetManager] Unknown asset type: ${asset.type}`);
        }

        this.updateProgress();
      } catch (error) {
        console.error(`[AssetManager] Failed to load ${asset.name}:`, error);
        this.updateProgress();
      }
    });

    await Promise.all(promises);
  }

  /**
   * Load a single Spine animation
   */
  public async loadSpineAsset(name: string, jsonPath: string): Promise<void> {
    // Check cache
    if (this.spineCache.has(name)) {
      console.log(
        `[AssetManager] Spine asset '${name}' already loaded (cached)`
      );
      return;
    }

    try {
      // Parse paths
      const baseUrl = jsonPath.substring(0, jsonPath.lastIndexOf("/") + 1);
      const baseName = jsonPath
        .substring(jsonPath.lastIndexOf("/") + 1)
        .replace(".json", "");
      const atlasUrl = `${baseUrl}${baseName}.atlas`;

      // Load JSON and Atlas in parallel
      const [jsonData, atlasText] = await Promise.all([
        fetch(jsonPath).then((r) => r.json()),
        fetch(atlasUrl).then((r) => r.text()),
      ]);

      // Parse atlas to find texture pages
      const atlasLines = atlasText.split("\n");
      const textureMap = new Map<string, any>();

      // Preload all textures
      for (const line of atlasLines) {
        const trimmed = line.trim();
        if (trimmed.endsWith(".png")) {
          const texturePath = `${baseUrl}${trimmed}`;
          const pixiTexture = await PIXI.Assets.load<PIXI.Texture>(texturePath);
          const baseTexture = pixiTexture.baseTexture;
          textureMap.set(trimmed, baseTexture);
        }
      }

      // Create TextureAtlas with preloaded textures
      const atlas = new TextureAtlas(
        atlasText,
        (path: string, callback: (baseTexture: any) => void) => {
          const baseTexture = textureMap.get(path);
          if (baseTexture) {
            callback(baseTexture);
          } else {
            console.error(`[AssetManager] Texture not found: ${path}`);
          }
        }
      );

      // Parse skeleton data
      const atlasLoader = new AtlasAttachmentLoader(atlas);
      const skeletonJson = new SkeletonJson(atlasLoader);
      const skeletonData = skeletonJson.readSkeletonData(jsonData);

      // Cache the parsed data
      this.spineCache.set(name, { skeletonData, atlas });
    } catch (error) {
      console.error(`[AssetManager] Failed to load Spine '${name}':`, error);
      throw error;
    }
  }

  /**
   * Load a single image/texture
   */
  public async loadImageAsset(name: string, path: string): Promise<void> {
    // Check cache
    if (this.textureCache.has(name)) {
      console.log(`[AssetManager] Texture '${name}' already loaded (cached)`);
      return;
    }

    try {
      const texture = await PIXI.Assets.load<PIXI.Texture>(path);
      this.textureCache.set(name, texture);
    } catch (error) {
      console.error(`[AssetManager] Failed to load image '${name}':`, error);
      throw error;
    }
  }

  /**
   * Load a spritesheet
   */
  public async loadSpritesheetAsset(name: string, path: string): Promise<void> {
    try {
      await PIXI.Assets.load(path);
    } catch (error) {
      console.error(
        `[AssetManager] Failed to load spritesheet '${name}':`,
        error
      );
      throw error;
    }
  }

  /**
   * Get cached Spine asset data
   */
  public getSpineData(name: string): SpineAssetData | undefined {
    const data = this.spineCache.get(name);
    if (!data) {
      console.warn(`[AssetManager] Spine asset '${name}' not found in cache`);
    }
    return data;
  }

  public getSpine(name: string): Spine | undefined {
    const spineData = this.spineCache.get(name);
    if (!spineData) {
      console.warn(`Spine data not found: ${name}`);
      return undefined;
    }

    // Create a new Spine instance from the skeleton data
    return new Spine(spineData.skeletonData);
  }

  /**
   * Get cached texture
   */
  public getTexture(name: string): PIXI.Texture | undefined {
    const texture = this.textureCache.get(name);
    if (!texture) {
      console.warn(`[AssetManager] Texture '${name}' not found in cache`);
    }
    return texture;
  }

  /**
   * Get a loaded spritesheet by name.
   * @param name The name of the spritesheet asset.
   * @returns The PIXI.Spritesheet object or undefined if not found.
   */
  public getSpritesheet(name: string): PIXI.Spritesheet | undefined {
    return this.spritesheetCache.get(name);
  }

  /**
   * Check if asset is loaded
   */
  public isLoaded(name: string): boolean {
    return this.spineCache.has(name) || this.textureCache.has(name);
  }

  /**
   * Get loading progress (0-1)
   */
  public getProgress(): number {
    return this.loadingProgress;
  }

  /**
   * Clear all cached assets
   */
  public clearCache(): void {
    this.spineCache.clear();
    this.textureCache.clear();
    this.loadingProgress = 0;
    this.loadedAssets = 0;
    this.totalAssets = 0;
  }

  /**
   * Remove specific asset from cache
   */
  public unload(name: string): void {
    this.spineCache.delete(name);
    this.textureCache.delete(name);
  }

  /**
   * Get all loaded asset names
   */
  public getLoadedAssets(): string[] {
    return [
      ...Array.from(this.spineCache.keys()),
      ...Array.from(this.textureCache.keys()),
    ];
  }

  /**
   * Generates static textures from Spine models and adds them to the symbols spritesheet.
   * This should be called after all assets are loaded.
   * @param renderer The PIXI.Renderer instance to use for texture generation.
   */
  public generateSpineSymbolTextures(renderer: PIXI.IRenderer): void {
    const symbolsSpritesheet = this.getSpritesheet(ASSET_NAMES.SYMBOLS);
    if (!symbolsSpritesheet) {
      console.error(
        "Cannot generate Spine symbols: 'SYMBOLS' spritesheet not loaded."
      );
      return;
    }

    const charactersToGenerate = [
      {
        name: ASSET_NAMES.CHARACTER_MAN,
        newSymbolName: SYMBOLS_CONFIG.MAN.filename,
      },
      {
        name: ASSET_NAMES.CHARACTER_WOMAN,
        newSymbolName: SYMBOLS_CONFIG.WOMAN.filename,
      },
    ];

    for (const char of charactersToGenerate) {
      const spine = this.getSpine(char.name);
      if (!spine) {
        console.warn(`Spine object for '${char.name}' not found. Skipping.`);
        continue;
      }

      spine.update(0);
      const bounds = spine.getBounds();

      if (bounds.width <= 0 || bounds.height <= 0) {
        console.error(
          `Invalid bounds for '${char.name}'. Cannot generate texture.`
        );
        continue;
      }

      const renderTexture = PIXI.RenderTexture.create({
        width: bounds.width,
        height: bounds.height,
      });

      const originalPos = { x: spine.x, y: spine.y };
      spine.position.set(-bounds.x, -bounds.y);

      renderer.render(spine, { renderTexture });

      spine.position.set(originalPos.x, originalPos.y);

      symbolsSpritesheet.textures[char.newSymbolName] = renderTexture;
    }
  }
}
