# Loading Screen Configuration Guide

## Overview

The `LoadingScene` now has a **minimum duration guarantee** that ensures the loading animation always looks smooth, even if assets load very quickly.

---

## How It Works

### 1. **Minimum Duration**

```typescript
private minLoadingDuration: number = 2; // Minimum 2 seconds
```

- The loading animation will ALWAYS take at least this many seconds
- If assets load in 0.5s, the animation will still play for 2s
- If assets take 5s to load, the animation will take 5s (not shortened)

### 2. **Progress Updates**

```typescript
private updateLoadingProgress(progress: number): void {
  if (this.loadingTween) {
    gsap.to(this.loadingTween, {
      progress: progress,
      duration: 0.3, // Smooth 0.3s transition
      ease: "none",
    });
  }
}
```

- Each progress update smoothly animates over 0.3 seconds
- Prevents jerky animation when there are few progress updates
- Creates smooth interpolation between breakpoints

### 3. **Timing Logic**

```typescript
const startTime = Date.now();
await assetManager.loadAssets(GAME_ASSETS);
const elapsedTime = (Date.now() - startTime) / 1000;
const remainingTime = Math.max(0, this.minLoadingDuration - elapsedTime);

if (remainingTime > 0) {
  await new Promise((resolve) => setTimeout(resolve, remainingTime * 1000));
}
```

**Flow:**

1. Track when loading starts
2. Load assets (may be fast or slow)
3. Calculate how long it took
4. If faster than minimum, wait the difference
5. Always reach 100% progress smoothly

---

## Configuration Options

### Adjust Minimum Duration

Change how long the loading screen shows (minimum):

```typescript
// Fast loading (1 second minimum)
private minLoadingDuration: number = 1;

// Medium loading (2 seconds minimum) - DEFAULT
private minLoadingDuration: number = 2;

// Slow/cinematic loading (3-5 seconds minimum)
private minLoadingDuration: number = 3;
```

### Adjust Progress Smoothing

Change how quickly progress updates animate:

```typescript
private updateLoadingProgress(progress: number): void {
  if (this.loadingTween) {
    gsap.to(this.loadingTween, {
      progress: progress,
      duration: 0.1, // ⚡ Very fast/snappy (0.1s)
      // duration: 0.3, // 🎯 Smooth default (0.3s)
      // duration: 0.5, // 🐢 Very smooth/slow (0.5s)
      ease: "none",
    });
  }
}
```

### Adjust Animation Easing

Change the feel of the circle expansion:

```typescript
this.loadingTween = gsap.to(circle, {
  r: window.innerWidth,
  duration: this.minLoadingDuration,
  ease: "power2.inOut", // 🎯 DEFAULT - smooth acceleration/deceleration
  // ease: "linear",     // ⚡ Constant speed
  // ease: "power4.out", // 🚀 Fast start, slow end
  // ease: "elastic.out", // 🎪 Bouncy effect
  // ease: "back.out",   // 🎢 Slight overshoot
  onUpdate: updateCircle,
  // ...
});
```

Popular easing options:

- `"linear"` - Constant speed
- `"power1.inOut"` - Subtle ease
- `"power2.inOut"` - Smooth ease (default)
- `"power3.inOut"` - Strong ease
- `"power4.inOut"` - Very strong ease
- `"elastic.out"` - Bouncy
- `"back.out"` - Slight overshoot

### Dynamic Minimum Duration

Set duration based on asset count:

```typescript
constructor(stateManager: StateManager) {
  this.stateManager = stateManager;

  // Calculate minimum duration based on asset count
  const assetCount = GAME_ASSETS.length;
  this.minLoadingDuration = Math.max(1.5, assetCount * 0.3);
  // 5 assets = 1.5s, 10 assets = 3s, etc.
}
```

---

## Advanced Customizations

### Add Loading Percentage Text

```typescript
private initLoadingScreen(app: PIXI.Application): PIXI.Graphics {
  const graphics = new PIXI.Graphics();
  app.stage.addChild(graphics);
  app.stage.mask = graphics;

  // Add percentage text
  const percentText = new PIXI.Text('0%', {
    fontSize: 48,
    fill: 0xffffff,
    fontWeight: 'bold',
  });
  percentText.anchor.set(0.5);
  percentText.position.set(window.innerWidth / 2, window.innerHeight / 2);
  app.stage.addChild(percentText);

  const circle = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    r: this.radius,
  };

  const updateCircle = () => {
    graphics
      .clear()
      .beginFill()
      .drawCircle(circle.x, circle.y, circle.r)
      .endFill();
  };

  updateCircle();

  this.loadingTween = gsap.to(circle, {
    r: window.innerWidth,
    duration: this.minLoadingDuration,
    ease: "power2.inOut",
    onUpdate: () => {
      updateCircle();
      // Update percentage text
      const progress = (this.loadingTween?.progress() || 0) * 100;
      percentText.text = `${Math.round(progress)}%`;
    },
    onComplete: () => {
      app.stage.removeChild(graphics);
      app.stage.removeChild(percentText);
      graphics.destroy();
      percentText.destroy();
      app.stage.mask = null;
      this.loadingTween = null;
    },
  });

  this.loadingTween.pause();

  return graphics;
}
```

### Add Color Gradient

```typescript
const updateCircle = () => {
  const progress = this.loadingTween?.progress() || 0;

  // Color gradient from blue to green
  const color = PIXI.utils.rgb2hex([
    0.06 + progress * 0.3, // R: 0.06 -> 0.36
    0.6 + progress * 0.4, // G: 0.6 -> 1.0
    0.73 - progress * 0.33, // B: 0.73 -> 0.4
  ]);

  graphics
    .clear()
    .beginFill(color)
    .drawCircle(circle.x, circle.y, circle.r)
    .endFill();
};
```

### Add Loading Tips

```typescript
private loadingTips = [
  "Tip: Press SPACE to spin!",
  "Tip: Click characters to make them react!",
  "Fun fact: This game uses Spine animations!",
];

private initLoadingScreen(app: PIXI.Application): PIXI.Graphics {
  // ... existing code ...

  // Add random tip
  const randomTip = this.loadingTips[Math.floor(Math.random() * this.loadingTips.length)];
  const tipText = new PIXI.Text(randomTip, {
    fontSize: 24,
    fill: 0xcccccc,
    align: 'center',
  });
  tipText.anchor.set(0.5);
  tipText.position.set(window.innerWidth / 2, window.innerHeight / 2 + 100);
  app.stage.addChild(tipText);

  // Remember to destroy in onComplete
}
```

### Use Different Animation Shapes

#### Horizontal Bar

```typescript
const updateBar = () => {
  const barWidth = 400;
  const barHeight = 30;
  const progress = this.loadingTween?.progress() || 0;

  graphics.clear();

  // Background bar
  graphics.beginFill(0x333333);
  graphics.drawRect(
    window.innerWidth / 2 - barWidth / 2,
    window.innerHeight / 2,
    barWidth,
    barHeight
  );
  graphics.endFill();

  // Progress bar
  graphics.beginFill(0x00ff00);
  graphics.drawRect(
    window.innerWidth / 2 - barWidth / 2,
    window.innerHeight / 2,
    barWidth * progress,
    barHeight
  );
  graphics.endFill();
};
```

#### Spinning Circle

```typescript
let rotation = { value: 0 };

this.loadingTween = gsap.to(rotation, {
  value: Math.PI * 2,
  duration: this.minLoadingDuration,
  ease: "none",
  onUpdate: () => {
    graphics.clear();
    graphics.lineStyle(10, 0xffffff);
    graphics.arc(
      window.innerWidth / 2,
      window.innerHeight / 2,
      50,
      rotation.value,
      rotation.value + Math.PI
    );
  },
});
```

---

## Common Scenarios

### Scenario 1: Very Few Assets (1-2 files)

**Problem:** Animation looks too fast, completes in 0.1s

**Solution:** Increase minimum duration

```typescript
private minLoadingDuration: number = 2; // At least 2 seconds
```

### Scenario 2: Many Small Progress Updates

**Problem:** Animation looks jerky with many small jumps

**Solution:** Increase smoothing duration

```typescript
gsap.to(this.loadingTween, {
  progress: progress,
  duration: 0.5, // Longer smooth transition
  ease: "none",
});
```

### Scenario 3: Want Instant Loading for Testing

**Problem:** Loading screen is annoying during development

**Solution:** Add development mode check

```typescript
constructor(stateManager: StateManager) {
  this.stateManager = stateManager;

  // Skip animation in dev mode
  const isDev = import.meta.env.DEV;
  this.minLoadingDuration = isDev ? 0 : 2;
}
```

Or disable entirely:

```typescript
public async preloadAssets(app: PIXI.Application) {
  const assetManager = AssetManager.getInstance();

  // Quick mode for development
  if (import.meta.env.DEV) {
    await assetManager.loadAssets(GAME_ASSETS);
    this.stateManager.setAppState(STATES.READY);
    return;
  }

  // Full animation for production
  // ... rest of code
}
```

### Scenario 4: Want to Show Fake Progress

**Problem:** Large assets don't provide progress updates

**Solution:** Add fake progress tween

```typescript
public async preloadAssets(app: PIXI.Application) {
  const assetManager = AssetManager.getInstance();

  this.initLoadingScreen(app);

  let actualProgress = 0;
  let fakeProgress = 0;

  assetManager.onProgress((progress) => {
    actualProgress = progress;
  });

  // Fake progress that smoothly increases
  const fakeTween = gsap.to({ value: 0 }, {
    value: 0.9, // Go to 90% fake
    duration: this.minLoadingDuration * 0.8,
    ease: "power1.inOut",
    onUpdate: function() {
      fakeProgress = this.targets()[0].value;
      // Use the maximum of fake and actual
      const displayProgress = Math.max(fakeProgress, actualProgress);
      this.updateLoadingProgress(displayProgress);
    }.bind(this),
  });

  await assetManager.loadAssets(GAME_ASSETS);

  fakeTween.kill();
  this.updateLoadingProgress(1.0);

  // ... rest of code
}
```

---

## Performance Tips

1. **Don't recreate graphics every frame**
   - ✅ Current implementation: Clears and redraws efficiently
   - ❌ Bad: Creating new Graphics() every update

2. **Use appropriate durations**
   - Too short (< 0.5s): Looks rushed
   - Sweet spot (1-3s): Professional feel
   - Too long (> 5s): Frustrating

3. **Match duration to asset size**
   - Small game (< 5 MB): 1-2 seconds
   - Medium game (5-20 MB): 2-3 seconds
   - Large game (> 20 MB): 3-5 seconds

4. **Consider user patience**
   - Mobile users: Shorter is better (1-2s)
   - Desktop users: Can handle 2-3s
   - First-time load: Show tips/story to justify time

---

## Testing

### Test Fast Loading

```typescript
// Temporarily set to 0 assets to test minimum duration
await assetManager.loadAssets([]);
```

### Test Slow Loading

```typescript
// Add artificial delay
await assetManager.loadAssets(GAME_ASSETS);
await new Promise((r) => setTimeout(r, 5000)); // +5s delay
```

### Test Progress Updates

```typescript
assetManager.onProgress((progress) => {
  console.log(`Progress: ${(progress * 100).toFixed(1)}%`);
  // Should log smooth values, not jumps
});
```

---

## Summary

✅ **Minimum duration ensures smooth animations even with fast loading**  
✅ **Progress smoothing prevents jerky updates**  
✅ **Configurable timing and easing for your needs**  
✅ **Easy to extend with percentage text, tips, etc.**  
✅ **Works well with few or many assets**

The loading screen will now always look professional, regardless of loading speed!
