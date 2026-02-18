// ---------------------------------------------------------------------------
// Dynamic Color Theming by Wine Type
// ---------------------------------------------------------------------------
// Defines accent palettes for red, white, rosé, and other wine types.
// Applied via CSS custom properties at the batch detail layout level.
// ---------------------------------------------------------------------------

import { getStyleCategory } from "./reference-data";

export type WineType = "red" | "white" | "rose" | "other";

export interface WinePalette {
  accent100: string;
  accent200: string;
  accent400: string;
  accent500: string;
  accent600: string;
  accent700: string;
}

export const WINE_PALETTES: Record<WineType, WinePalette> = {
  red: {
    accent100: "#f0e0e6",
    accent200: "#ddbcc7",
    accent400: "#a8677a",
    accent500: "#8b3f58",
    accent600: "#722e46",
    accent700: "#5c2038",
  },
  white: {
    accent100: "#f7f0d8",
    accent200: "#efe0b0",
    accent400: "#c4a44a",
    accent500: "#b89a3e",
    accent600: "#9a7e2e",
    accent700: "#7d6524",
  },
  rose: {
    accent100: "#fbe8ee",
    accent200: "#f2cdd8",
    accent400: "#d4849a",
    accent500: "#c46b84",
    accent600: "#a8566c",
    accent700: "#8c4358",
  },
  other: {
    accent100: "#f0e0e6",
    accent200: "#ddbcc7",
    accent400: "#a8677a",
    accent500: "#8b3f58",
    accent600: "#722e46",
    accent700: "#5c2038",
  },
};

export function getWineType(style: string | null): WineType {
  if (!style) return "other";
  const category = getStyleCategory(style);
  if (!category) return "other";
  if (category.includes("Red")) return "red";
  if (category.includes("White")) return "white";
  if (category.includes("Rosé")) return "rose";
  return "other";
}

export function getWinePalette(style: string | null): WinePalette {
  return WINE_PALETTES[getWineType(style)];
}

export function batchAccentStyle(style: string | null): Record<string, string> {
  const palette = getWinePalette(style);
  return {
    "--batch-accent-100": palette.accent100,
    "--batch-accent-200": palette.accent200,
    "--batch-accent-400": palette.accent400,
    "--batch-accent-500": palette.accent500,
    "--batch-accent-600": palette.accent600,
    "--batch-accent-700": palette.accent700,
  };
}
