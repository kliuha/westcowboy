export const layout = {
  REEL_WIDTH: 160,
  SYMBOL_SIZE: 150,
};

export function updateLayoutConfig(screenWidth: number) {
  const designWidth = 3840;
  const designReelWidth = 540;
  const designSymbolSize = 500;

  const scale = (0.9 * screenWidth) / designWidth;
  layout.REEL_WIDTH = Math.round(designReelWidth * scale);
  layout.SYMBOL_SIZE = Math.round(designSymbolSize * scale);
}
