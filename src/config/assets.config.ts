import { AssetConfig } from "../managers/AssetManager";

/**
 * Asset configuration for the game
 * Add all game assets here
 */
export const GAME_ASSETS: AssetConfig[] = [
  // Spine Characters
  {
    name: "character-man",
    type: "spine",
    path: "/SPINE-Json/Man/WEST-SLOTS-character-Man.json",
  },
  {
    name: "character-woman",
    type: "spine",
    path: "/SPINE-Json/Woman/WEST-SLOTS-character-Woman.json",
  },
  {
    name: "symbols",
    type: "spritesheet",
    path: "../../assets/ui/symbols/symbols.json",
  },
  {
    name: "background",
    type: "image",
    path: "../../assets/ui/bg.jpg",
  },
  {
    name: "slotmachine-bg",
    type: "image",
    path: "../../assets/ui/slotmachine-bg.png",
  },
  {
    name: "slot-header",
    type: "image",
    path: "../../assets/ui/slot-header.png",
  },
];

/**
 * Asset names as constants for type safety
 */
export const ASSET_NAMES = {
  CHARACTER_MAN: "character-man",
  CHARACTER_WOMAN: "character-woman",
  SYMBOLS: "symbols",
  BACKGROUND: "background",
  SLOTMACHINE_BG: "slotmachine-bg",
  SLOT_HEADER: "slot-header",
} as const;

export const SYMBOLS_CONFIG = {
  // Existing symbols
  BAG_OF_GOLD: { filename: "bag_of_gold.png", value: 100 },
  BARRELS: { filename: "barrels.png", value: 50 },
  BOOTS: { filename: "boots.png", value: 75 },
  DYNAMITE_CRATE: { filename: "dynamite_crate.png", value: 200 },
  GAS_LAMP: { filename: "gas_lamp.png", value: 150 },
  PILE_OF_GOLD: { filename: "pile_of_gold.png", value: 300 },
  SNAKE: { filename: "snake.png", value: 25 },
  WILD: { filename: "wild.png", value: 175 },
  MAN: { filename: "character_man_symbol.png", value: 500 },
  WOMAN: { filename: "character_woman_symbol.png", value: 500 },

  // New symbols generated from Spine characters
  CHARACTER_MAN_SYMBOL: { filename: "character_man_symbol.png", value: 500 },
  CHARACTER_WOMAN_SYMBOL: {
    filename: "character_woman_symbol.png",
    value: 500,
  },
} as const;
