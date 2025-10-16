# Spine Animation Integration Documentation

## Overview

This project integrates Spine skeletal animations into a PixiJS v7 application. It loads Spine 3.6.52 format files (JSON + Atlas + PNG textures) and renders animated characters on an HTML5 canvas.

## Table of Contents

- [Architecture](#architecture)
- [File Structure](#file-structure)
- [main.ts - Application Entry Point](#maints---application-entry-point)
- [SpineAnimation.ts - Animation Loader](#spineanimationts---animation-loader)
- [Technical Details](#technical-details)
- [Common Issues & Solutions](#common-issues--solutions)
- [Customization Guide](#customization-guide)

---

## Architecture

### Component Overview

```
┌─────────────────┐
│    main.ts      │ ← Entry point, creates PixiJS app
└────────┬────────┘
         │ creates
         ▼
┌─────────────────┐
│ SpineAnimation  │ ← Manages Spine asset loading
└────────┬────────┘
         │ loads
         ▼
┌─────────────────┐
│  Spine Assets   │ ← JSON, Atlas, PNG files
│  - Man          │
│  - Woman        │
└─────────────────┘
```

### Technology Stack

| Library                 | Version | Purpose                           |
| ----------------------- | ------- | --------------------------------- |
| PixiJS                  | v7.x    | WebGL/Canvas rendering engine     |
| pixi-spine              | v4.0.6  | Spine runtime for PixiJS          |
| @pixi-spine/runtime-3.7 | v4.0.6  | Spine 3.6.52 format parser        |
| TypeScript              | Latest  | Type safety and modern JavaScript |
| Vite                    | Latest  | Build tool and dev server         |

---

## File Structure

```
westcowboy/
├── public/
│   └── SPINE-Json/
│       ├── Man/
│       │   ├── WEST-SLOTS-character-Man.json      # Skeleton definition
│       │   ├── WEST-SLOTS-character-Man.atlas     # Texture atlas mapping
│       │   ├── WEST-SLOTS-character-Man.png       # Texture page 1
│       │   └── WEST-SLOTS-character-Man2.png      # Texture page 2
│       └── Woman/
│           ├── WEST-SLOTS-character-Woman.json
│           ├── WEST-SLOTS-character-Woman.atlas
│           ├── WEST-SLOTS-character-Woman.png
│           └── WEST-SLOTS-character-Woman2.png
├── src/
│   ├── main.ts              # Application entry point
│   └── SpineAnimation.ts    # Spine loader class
└── index.html
```

---

## main.ts - Application Entry Point

### Purpose

Initializes the PixiJS application and creates Spine character instances.

### Complete Code Breakdown

```typescript
import { Application } from "pixi.js";
import { SpineAnimation } from "./SpineAnimation";

(async () => {
  // Step 1: Create PixiJS Application
  const app = new Application({
    background: "#1099bb", // Cyan background color
    resizeTo: window, // Auto-resize canvas to window size
  });

  // Step 2: Attach canvas to DOM
  document.getElementById("pixi-container")!.appendChild(app.view as any);

  // Step 3: Create animation manager
  const spineAnim = new SpineAnimation(app);

  try {
    // Step 4: Load Man character (left side)
    const man = await spineAnim.create(
      "/SPINE-Json/Man/WEST-SLOTS-character-Man.json",
      {
        scale: 0.2, // 20% of original size
        animation: "animation", // Animation track name from Spine
        x: app.screen.width / 2 - 250, // 250px left of center
        y: app.screen.height - 100, // 100px from bottom
      }
    );

    // Step 5: Load Woman character (right side)
    const woman = await spineAnim.create(
      "/SPINE-Json/Woman/WEST-SLOTS-character-Woman.json",
      {
        scale: 0.2, // 20% of original size
        animation: "animation", // Animation track name from Spine
        x: app.screen.width / 2 + 250, // 250px right of center
        y: app.screen.height - 100, // 100px from bottom
      }
    );
  } catch (error) {
    console.error("Failed to create Spine animation:", error);
  }
})();
```

### Key Features

#### 1. PixiJS v7 Initialization

```typescript
const app = new Application({
  background: "#1099bb",
  resizeTo: window,
});
```

- **Note**: PixiJS v7 uses constructor-based initialization (not `await app.init()` like v8)
- `background`: Sets the background color (hex format)
- `resizeTo: window`: Automatically resizes canvas when window changes

#### 2. Async/Await Pattern

```typescript
(async () => {
  const man = await spineAnim.create(...);
  const woman = await spineAnim.create(...);
})();
```

- Self-executing async function for clean async code
- Sequential loading ensures proper initialization
- Error handling with try-catch

#### 3. Character Positioning

```typescript
x: app.screen.width / 2 - 250,  // Left character
x: app.screen.width / 2 + 250,  // Right character
y: app.screen.height - 100,     // Both at bottom
```

- Centers characters horizontally with 500px spacing
- Positions characters near bottom (100px from edge)
- Responsive to window size

---

## SpineAnimation.ts - Animation Loader

### Class Overview

```typescript
export class SpineAnimation {
  private app: Application;  // Reference to PixiJS app

  constructor(app: Application) {
    this.app = app;
  }

  async create(assetUrl: string, options: {...}): Promise<Spine> {
    // Loading and rendering logic
  }
}
```

### Loading Process Flow

```
1. Parse URLs
   ↓
2. Load JSON + Atlas files (parallel)
   ↓
3. Parse Atlas to find texture pages
   ↓
4. Preload ALL textures
   ↓
5. Create TextureAtlas with preloaded textures
   ↓
6. Parse Skeleton JSON
   ↓
7. Create Spine instance
   ↓
8. Configure and add to stage
```

### Step-by-Step Breakdown

#### Step 1: Parse Asset URLs

```typescript
const baseUrl = assetUrl.substring(0, assetUrl.lastIndexOf("/") + 1);
const baseName = assetUrl
  .substring(assetUrl.lastIndexOf("/") + 1)
  .replace(".json", "");

const atlasUrl = `${baseUrl}${baseName}.atlas`;
```

**Example:**

- Input: `/SPINE-Json/Man/WEST-SLOTS-character-Man.json`
- baseUrl: `/SPINE-Json/Man/`
- baseName: `WEST-SLOTS-character-Man`
- atlasUrl: `/SPINE-Json/Man/WEST-SLOTS-character-Man.atlas`

#### Step 2: Load JSON and Atlas (Parallel)

```typescript
const [jsonData, atlasText] = await Promise.all([
  fetch(assetUrl).then((r) => r.json()),
  fetch(atlasUrl).then((r) => r.text()),
]);
```

**Why parallel?**

- Faster loading (both files load simultaneously)
- Uses `Promise.all` for concurrent requests
- JSON parsed as JSON, Atlas as text

#### Step 3: Parse Atlas for Texture Filenames

```typescript
const atlasLines = atlasText.split("\n");
const textureMap = new Map<string, any>();

for (const line of atlasLines) {
  const trimmed = line.trim();
  if (trimmed.endsWith(".png")) {
    // Found a texture page reference
  }
}
```

**Atlas Format Example:**

```
WEST-SLOTS-character-Man.png
size: 2048,2048
format: RGBA8888
filter: Linear,Linear
repeat: none
Back_hair
  rotate: false
  xy: 1889, 1260
  ...
```

Lines ending with `.png` are texture page filenames.

#### Step 4: Preload All Textures

```typescript
for (const line of atlasLines) {
  const trimmed = line.trim();
  if (trimmed.endsWith(".png")) {
    const texturePath = `${baseUrl}${trimmed}`;
    const pixiTexture = await Assets.load<Texture>(texturePath);

    const baseTexture = pixiTexture.baseTexture; // PixiJS v7 API

    textureMap.set(trimmed, baseTexture);
  }
}
```

**Critical Detail:**

- **Must** preload before creating TextureAtlas
- TextureAtlas constructor is synchronous but expects textures immediately
- Map stores textures by filename for quick lookup
- Uses `baseTexture` (PixiJS v7) not `source` (PixiJS v8)

#### Step 5: Create TextureAtlas

```typescript
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
```

**How it works:**

1. TextureAtlas parses atlas text synchronously
2. When it encounters a texture page reference, calls the callback
3. Callback immediately returns the preloaded texture from the Map
4. TextureAtlas creates regions linked to the correct textures

**Why synchronous callback?**

- If textures aren't preloaded, regions won't link to textures
- Results in "Region not found in atlas" errors

#### Step 6: Parse Skeleton Data

```typescript
const atlasLoader = new AtlasAttachmentLoader(rawAtlas);
const skeletonJson = new SkeletonJson(atlasLoader);

const skeletonData = skeletonJson.readSkeletonData(jsonData);
```

**Component Roles:**

- **AtlasAttachmentLoader**: Links skeleton slots to atlas regions
- **SkeletonJson**: Parses Spine JSON format
- **@pixi-spine/runtime-3.7**: Compatible with Spine 3.6.52 exports

**Parsed Data Includes:**

- Bones hierarchy
- Slots (draw order)
- Skins (texture sets)
- Animations (timelines)
- Constraints (IK, transform, path)

#### Step 7: Create Spine Instance

```typescript
const spine = new Spine(skeletonData);

const x = options.x ?? this.app.screen.width / 2;
const y = options.y ?? this.app.screen.height / 2;

spine.position.set(x, y);
spine.scale.set(options.scale ?? 0.5);
spine.autoUpdate = true;
```

**Configuration:**

- `position`: World coordinates in pixels
- `scale`: Uniform scaling (1.0 = 100%)
- `autoUpdate`: Automatically update skeleton each frame

#### Step 8: Set Animation

```typescript
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
```

**Parameters:**

- `0`: Track index (allows multiple animations)
- `options.animation`: Animation name from Spine project
- `options.loop ?? true`: Loop by default
- `timeScale`: Animation speed multiplier (1.0 = normal)

#### Step 9: Add to Stage

```typescript
this.app.stage.addChild(spine as any);
return spine;
```

- Adds to PixiJS render tree
- Returns Spine instance for further manipulation

---

## Technical Details

### Dependencies Explained

```json
{
  "pixi.js": "^7.4.2", // PixiJS v7 (v8 incompatible)
  "pixi-spine": "^4.0.6", // Main spine plugin
  "@pixi-spine/base": "^4.0.6", // Base classes (TextureAtlas)
  "@pixi-spine/loader-uni": "^4.0.6", // Universal Spine loader
  "@pixi-spine/runtime-3.7": "^4.0.6" // Spine 3.6.52 parser
}
```

### Version Compatibility Matrix

| Spine Version | Runtime Package         | PixiJS Version |
| ------------- | ----------------------- | -------------- |
| 3.6.52        | @pixi-spine/runtime-3.7 | v7.x           |
| 3.8.x         | @pixi-spine/runtime-3.8 | v7.x           |
| 4.0.x         | @pixi-spine/runtime-4.0 | v7.x           |
| 4.1.x         | @pixi-spine/runtime-4.1 | v7.x           |

**Important:** pixi-spine v4 does NOT support PixiJS v8 yet.

### API Options Reference

```typescript
interface SpineAnimationOptions {
  scale?: number; // Default: 0.5 (50%)
  animation?: string; // Default: undefined (no animation)
  loop?: boolean; // Default: true
  timeScale?: number; // Default: 1.0 (normal speed)
  x?: number; // Default: app.screen.width / 2
  y?: number; // Default: app.screen.height / 2
}
```

### Performance Characteristics

- **Texture Sharing**: Multiple Spine instances share the same textures via TextureAtlas
- **Batching**: PixiJS automatically batches draw calls
- **Frame Rate**: Animations update on PixiJS ticker (60 FPS)
- **Memory**: Each Spine instance creates its own skeleton state (bones, slots)

---

## Common Issues & Solutions

### ❌ Error: "Region not found in atlas: [name]"

**Cause:** Textures loaded after TextureAtlas parsing

**Solution:** Preload ALL textures before creating TextureAtlas

```typescript
// ✅ Correct - Preload first
const textureMap = new Map();
for (const png of pngFiles) {
  textureMap.set(png, await Assets.load(png));
}
const atlas = new TextureAtlas(atlasText, (path, cb) =>
  cb(textureMap.get(path))
);

// ❌ Wrong - Async loading in callback
const atlas = new TextureAtlas(atlasText, async (path, cb) => {
  const tex = await Assets.load(path); // Too late!
  cb(tex);
});
```

### ❌ Error: "Spine 3.8 loader can't load version 3.6.52"

**Cause:** Using wrong runtime version

**Solution:** Match runtime to Spine export version

```typescript
// ✅ Correct for Spine 3.6.52
import { SkeletonJson } from "@pixi-spine/runtime-3.7";

// ❌ Wrong
import { SkeletonJson } from "@pixi-spine/runtime-3.8";
```

### ❌ Error: "Cannot read properties of undefined (reading 'width')"

**Cause:** Using PixiJS v8 API in v7 project

**Solution:** Use v7 API

```typescript
// ✅ PixiJS v7
const baseTexture = pixiTexture.baseTexture;

// ❌ PixiJS v8
const source = pixiTexture.source;
```

### ❌ Error: "app.init is not a function"

**Cause:** Using PixiJS v8 initialization in v7

**Solution:** Use constructor-based init

```typescript
// ✅ PixiJS v7
const app = new Application({ background: "#000" });

// ❌ PixiJS v8
const app = new Application();
await app.init({ background: "#000" });
```

### ⚠️ Characters too big/small

**Solution:** Adjust scale value

```typescript
// Smaller
{
  scale: 0.1;
} // 10% size

// Normal
{
  scale: 0.5;
} // 50% size

// Larger
{
  scale: 1.0;
} // 100% size
```

### ⚠️ Characters positioned incorrectly

**Solution:** Adjust x/y values

```typescript
// Center
{ x: app.screen.width / 2, y: app.screen.height / 2 }

// Bottom center
{ x: app.screen.width / 2, y: app.screen.height - 100 }

// Top left
{ x: 100, y: 100 }
```

---

## Customization Guide

### Adding New Characters

```typescript
const newCharacter = await spineAnim.create(
  "/SPINE-Json/NewCharacter/character.json",
  {
    scale: 0.2,
    animation: "idle",
    x: app.screen.width / 2,
    y: app.screen.height - 150,
  }
);
```

### Changing Animation at Runtime

```typescript
// Switch to different animation
spine.state.setAnimation(0, "walk", true);

// Queue next animation
spine.state.addAnimation(0, "jump", false, 0);

// Change speed
spine.state.timeScale = 2.0; // Double speed
```

### Animation Event Listeners

```typescript
spine.state.addListener({
  start: (entry) => {
    console.log("Animation started:", entry.animation.name);
  },
  complete: (entry) => {
    console.log("Animation completed:", entry.animation.name);
  },
  event: (entry, event) => {
    console.log("Animation event:", event.data.name);
  },
});
```

### Mixing Multiple Animations

```typescript
// Play attack on track 1 (overlays on track 0)
spine.state.setAnimation(0, "idle", true); // Track 0: idle loop
spine.state.setAnimation(1, "shoot", false); // Track 1: shoot once

// Adjust mixing duration
spine.stateData.setMix("idle", "walk", 0.2); // 0.2s blend
```

### Changing Skins

```typescript
// Switch to different skin
spine.skeleton.setSkinByName("armor");
spine.skeleton.setSlotsToSetupPose();

// Mix multiple skins
const skin = new spine.Skin("custom");
skin.addSkin(spine.skeleton.data.findSkin("base"));
skin.addSkin(spine.skeleton.data.findSkin("cape"));
spine.skeleton.setSkin(skin);
```

### Accessing Bones

```typescript
// Get bone reference
const headBone = spine.skeleton.findBone("head");

// Modify bone transform
headBone.rotation = 45; // Rotate head 45 degrees
headBone.scaleX = 1.5; // Scale width 1.5x

// Update skeleton
spine.skeleton.updateWorldTransform();
```

### Interactive Characters

```typescript
// Make clickable
spine.interactive = true;
spine.buttonMode = true;

spine.on("pointerdown", () => {
  console.log("Character clicked!");
  spine.state.setAnimation(0, "react", false);
});
```

### Advanced: Custom Update Loop

```typescript
// Disable auto-update
spine.autoUpdate = false;

// Manual update in game loop
app.ticker.add((delta) => {
  const deltaTime = delta / 60; // Convert to seconds
  spine.update(deltaTime);
});
```

---

## Best Practices

### ✅ Do's

- Preload all textures before creating TextureAtlas
- Use correct runtime version for your Spine export
- Handle errors with try-catch blocks
- Dispose of unused Spine instances to free memory
- Use `timeScale` for animation speed instead of custom updates

### ❌ Don'ts

- Don't load textures in TextureAtlas callback (async issue)
- Don't mix PixiJS v7 and v8 APIs
- Don't modify skeleton in animation event callbacks (can cause recursion)
- Don't create multiple TextureAtlas instances for same character (memory waste)

---

## Debugging Tips

### Enable Verbose Logging

```typescript
// In SpineAnimation.ts, add console.logs
console.log("Skeleton data:", {
  bones: skeletonData.bones.length,
  slots: skeletonData.slots.length,
  skins: skeletonData.skins.length,
  animations: skeletonData.animations.map((a) => a.name),
});
```

### Inspect Spine Instance

```typescript
console.log(
  "Available animations:",
  spine.skeleton.data.animations.map((a) => a.name)
);
console.log(
  "Available skins:",
  spine.skeleton.data.skins.map((s) => s.name)
);
console.log("Bounds:", spine.getBounds());
```

### Check Texture Loading

```typescript
console.log("Atlas pages:", rawAtlas.pages.length);
console.log("Atlas regions:", rawAtlas.regions.length);
rawAtlas.regions.forEach((r) => console.log("Region:", r.name));
```

---

## References

- [PixiJS Documentation](https://pixijs.download/release/docs/index.html)
- [pixi-spine GitHub](https://github.com/pixijs/spine)
- [Spine Runtime Documentation](http://esotericsoftware.com/spine-runtimes-guide)
- [Spine User Guide](http://esotericsoftware.com/spine-user-guide)

---

## License

This documentation is provided as-is for the westcowboy project.
