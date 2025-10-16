# AssetManager Usage Guide

## Overview

The `AssetManager` is a singleton class that handles loading and caching of game assets (Spine animations, images, spritesheets). It provides progress tracking and prevents duplicate loading.

---

## Basic Setup

### 1. Configure Assets

Edit `src/config/assets.config.ts` to define your assets:

```typescript
export const GAME_ASSETS: AssetConfig[] = [
  {
    name: "character-man", // Unique identifier
    type: "spine", // Asset type
    path: "/SPINE-Json/Man/WEST-SLOTS-character-Man.json",
  },
  {
    name: "background",
    type: "image",
    path: "/images/bg.png",
  },
];
```

### 2. Load Assets in LoadingScene

Update your `LoadingScene.ts`:

```typescript
import { AssetManager } from "../core/AssetManager";
import { GAME_ASSETS } from "../config/assets.config";

export class LoadingScene {
  private assetManager: AssetManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
    this.assetManager = AssetManager.getInstance();
  }

  public async preloadAssets(app: PIXI.Application) {
    // Register progress callback
    this.assetManager.onProgress((progress) => {
      console.log(`Loading: ${Math.round(progress * 100)}%`);
      // Update your loading bar here
    });

    // Register completion callback
    this.assetManager.onComplete(() => {
      console.log("All assets loaded!");
      this.stateManager.setAppState(STATES.READY);
    });

    // Start loading
    this.showMaskLoadingScreen(app);
    await this.assetManager.loadAssets(GAME_ASSETS);
  }
}
```

---

## Using Loaded Assets

### Get Spine Data

```typescript
import { AssetManager } from "../core/AssetManager";
import { ASSET_NAMES } from "../config/assets.config";
import { Spine } from "@pixi-spine/loader-uni";

const assetManager = AssetManager.getInstance();

// Get cached Spine data
const spineData = assetManager.getSpineData(ASSET_NAMES.CHARACTER_MAN);

if (spineData) {
  // Create Spine instance
  const spine = new Spine(spineData.skeletonData);

  // Configure
  spine.position.set(400, 600);
  spine.scale.set(0.2);
  spine.state.setAnimation(0, "animation", true);

  // Add to stage
  app.stage.addChild(spine);
}
```

### Get Texture

```typescript
const texture = assetManager.getTexture("background");

if (texture) {
  const sprite = new PIXI.Sprite(texture);
  app.stage.addChild(sprite);
}
```

---

## Integration with SpineAnimation Class

Update your `SpineAnimation.ts` to use AssetManager:

```typescript
import { AssetManager } from "./core/AssetManager";

export class SpineAnimation {
  private app: Application;
  private assetManager: AssetManager;

  constructor(app: Application) {
    this.app = app;
    this.assetManager = AssetManager.getInstance();
  }

  async create(
    assetName: string, // Changed from path to asset name
    options: {
      scale?: number;
      animation?: string;
      loop?: boolean;
      timeScale?: number;
      x?: number;
      y?: number;
    } = {}
  ): Promise<Spine> {
    // Get from cache instead of loading
    const spineData = this.assetManager.getSpineData(assetName);

    if (!spineData) {
      throw new Error(`Spine asset '${assetName}' not found. Did you load it?`);
    }

    // Create Spine instance
    const spine = new Spine(spineData.skeletonData);

    // Configure position
    const x = options.x ?? this.app.screen.width / 2;
    const y = options.y ?? this.app.screen.height / 2;
    spine.position.set(x, y);
    spine.scale.set(options.scale ?? 0.5);
    spine.autoUpdate = true;

    // Set animation
    if (options.animation) {
      try {
        spine.state.setAnimation(0, options.animation, options.loop ?? true);
        if (options.timeScale) {
          spine.state.timeScale = options.timeScale;
        }
      } catch (e) {
        console.warn(`Animation '${options.animation}' not found`, e);
      }
    }

    this.app.stage.addChild(spine as any);
    return spine;
  }
}
```

### Updated main.ts Usage

```typescript
import { ASSET_NAMES } from "./config/assets.config";

// Use asset names instead of paths
const man = await spineAnim.create(ASSET_NAMES.CHARACTER_MAN, {
  scale: 0.2,
  animation: "animation",
  x: app.screen.width / 2 - 250,
  y: app.screen.height - 100,
});

const woman = await spineAnim.create(ASSET_NAMES.CHARACTER_WOMAN, {
  scale: 0.2,
  animation: "animation",
  x: app.screen.width / 2 + 250,
  y: app.screen.height - 100,
});
```

---

## Advanced Features

### Loading Progress Bar

```typescript
export class LoadingScene {
  private progressBar: PIXI.Graphics;

  private createProgressBar(app: PIXI.Application): void {
    this.progressBar = new PIXI.Graphics();
    app.stage.addChild(this.progressBar);
  }

  private updateProgressBar(progress: number): void {
    const width = 400;
    const height = 30;
    const x = window.innerWidth / 2 - width / 2;
    const y = window.innerHeight / 2;

    this.progressBar.clear();

    // Background
    this.progressBar.beginFill(0x333333);
    this.progressBar.drawRect(x, y, width, height);
    this.progressBar.endFill();

    // Progress fill
    this.progressBar.beginFill(0x00ff00);
    this.progressBar.drawRect(x, y, width * progress, height);
    this.progressBar.endFill();
  }

  public async preloadAssets(app: PIXI.Application) {
    this.createProgressBar(app);

    this.assetManager.onProgress((progress) => {
      this.updateProgressBar(progress);
    });

    this.assetManager.onComplete(() => {
      app.stage.removeChild(this.progressBar);
      this.stateManager.setAppState(STATES.READY);
    });

    await this.assetManager.loadAssets(GAME_ASSETS);
  }
}
```

### Lazy Loading

Load assets on-demand instead of all at once:

```typescript
// Load a single asset dynamically
await assetManager.loadSpineAsset(
  "boss-character",
  "/SPINE-Json/Boss/boss.json"
);

const bossData = assetManager.getSpineData("boss-character");
```

### Check if Loaded

```typescript
if (assetManager.isLoaded("character-man")) {
  console.log("Character already loaded!");
} else {
  await assetManager.loadSpineAsset(
    "character-man",
    "/SPINE-Json/Man/WEST-SLOTS-character-Man.json"
  );
}
```

### Memory Management

```typescript
// Unload specific asset
assetManager.unload("character-man");

// Clear all cached assets
assetManager.clearCache();

// Get list of loaded assets
const loadedAssets = assetManager.getLoadedAssets();
console.log("Loaded:", loadedAssets);
```

---

## Complete Example: main.ts with AssetManager

```typescript
import { Application } from "pixi.js";
import { AssetManager } from "./core/AssetManager";
import { SpineAnimation } from "./SpineAnimation";
import { GAME_ASSETS, ASSET_NAMES } from "./config/assets.config";

(async () => {
  // Create app
  const app = new Application({
    background: "#1099bb",
    resizeTo: window,
  });
  document.getElementById("pixi-container")!.appendChild(app.view as any);

  // Get AssetManager instance
  const assetManager = AssetManager.getInstance();

  // Setup loading callbacks
  assetManager.onProgress((progress) => {
    console.log(`Loading: ${Math.round(progress * 100)}%`);
  });

  assetManager.onComplete(() => {
    console.log("Assets loaded! Creating characters...");
  });

  // Load all assets
  console.log("Starting asset load...");
  await assetManager.loadAssets(GAME_ASSETS);

  // Create characters using loaded assets
  const spineAnim = new SpineAnimation(app);

  const man = await spineAnim.create(ASSET_NAMES.CHARACTER_MAN, {
    scale: 0.2,
    animation: "animation",
    x: app.screen.width / 2 - 250,
    y: app.screen.height - 100,
  });

  const woman = await spineAnim.create(ASSET_NAMES.CHARACTER_WOMAN, {
    scale: 0.2,
    animation: "animation",
    x: app.screen.width / 2 + 250,
    y: app.screen.height - 100,
  });

  console.log("Game ready!");
})();
```

---

## Benefits

✅ **Centralized Loading**: All asset loading in one place  
✅ **Caching**: Prevents duplicate loading  
✅ **Progress Tracking**: Easy to implement loading screens  
✅ **Type Safety**: Asset names as constants  
✅ **Error Handling**: Graceful failure handling  
✅ **Memory Management**: Easy cleanup  
✅ **Debugging**: Comprehensive logging

---

## Migration Guide

### Before (Direct Loading)

```typescript
// Old way - loading inline
const spine = await spineAnim.create(
  "/SPINE-Json/Man/WEST-SLOTS-character-Man.json",
  { scale: 0.2 }
);
```

### After (AssetManager)

```typescript
// 1. Load once in LoadingScene
await assetManager.loadAssets(GAME_ASSETS);

// 2. Use anywhere via cache
const spine = await spineAnim.create(ASSET_NAMES.CHARACTER_MAN, { scale: 0.2 });
```

---

## Troubleshooting

### Asset Not Found Error

```
[AssetManager] Spine asset 'character-man' not found in cache
```

**Solution**: Make sure you loaded the asset first:

```typescript
await assetManager.loadAssets(GAME_ASSETS);
```

### Progress Not Updating

**Solution**: Register callbacks BEFORE calling `loadAssets()`:

```typescript
assetManager.onProgress((p) => console.log(p)); // Register first
await assetManager.loadAssets(GAME_ASSETS); // Then load
```

### Duplicate Loading

The AssetManager prevents duplicate loading automatically. If you call `loadSpineAsset()` twice with the same name, it will skip the second load.

---

## API Reference

### Methods

| Method                       | Description                    |
| ---------------------------- | ------------------------------ |
| `getInstance()`              | Get singleton instance         |
| `loadAssets(assets)`         | Load multiple assets in batch  |
| `loadSpineAsset(name, path)` | Load single Spine animation    |
| `loadImageAsset(name, path)` | Load single image              |
| `getSpineData(name)`         | Get cached Spine data          |
| `getTexture(name)`           | Get cached texture             |
| `isLoaded(name)`             | Check if asset is loaded       |
| `getProgress()`              | Get loading progress (0-1)     |
| `onProgress(callback)`       | Register progress callback     |
| `onComplete(callback)`       | Register completion callback   |
| `clearCache()`               | Clear all cached assets        |
| `unload(name)`               | Remove specific asset          |
| `getLoadedAssets()`          | Get list of loaded asset names |

---

## Best Practices

1. **Define assets in config**: Keep all asset paths in `assets.config.ts`
2. **Use constants**: Reference assets via `ASSET_NAMES` for type safety
3. **Load early**: Load assets in LoadingScene before gameplay
4. **Handle errors**: Wrap loading in try-catch blocks
5. **Clean up**: Unload assets when switching levels/scenes
6. **Log progress**: Use progress callbacks for user feedback

---

## Next Steps

- ✅ Add more assets to `assets.config.ts`
- ✅ Implement loading screen progress bar
- ✅ Update `SpineAnimation.ts` to use AssetManager
- ✅ Add sound/music loading support
- ✅ Implement asset preloading strategies
