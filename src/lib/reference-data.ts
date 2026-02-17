// ---------------------------------------------------------------------------
// Ferment — Reference Data (Styles & Yeast Strains)
// ---------------------------------------------------------------------------
// Static constants used by the batch wizard comboboxes and (eventually) smart
// warnings. Both datasets are small enough to live client-side — no DB tables
// or API routes needed. The *string value* (e.g. "EC-1118") is what gets
// persisted in batches.yeast_strain / batches.style.
// ---------------------------------------------------------------------------

// ── Style Options ──────────────────────────────────────────────────────────

export interface StyleOption {
  name: string;
  category: string;
}

export const STYLES: StyleOption[] = [
  // Wine — Red
  { name: "Cabernet Sauvignon", category: "Wine — Red" },
  { name: "Merlot", category: "Wine — Red" },
  { name: "Pinot Noir", category: "Wine — Red" },
  { name: "Syrah / Shiraz", category: "Wine — Red" },
  { name: "Zinfandel", category: "Wine — Red" },
  { name: "Malbec", category: "Wine — Red" },
  { name: "Tempranillo", category: "Wine — Red" },
  { name: "Sangiovese", category: "Wine — Red" },
  { name: "Grenache", category: "Wine — Red" },
  { name: "Nebbiolo", category: "Wine — Red" },
  { name: "Mourvèdre", category: "Wine — Red" },
  { name: "Petite Sirah", category: "Wine — Red" },
  { name: "Cabernet Franc", category: "Wine — Red" },
  { name: "Gamay", category: "Wine — Red" },

  // Wine — White
  { name: "Chardonnay", category: "Wine — White" },
  { name: "Sauvignon Blanc", category: "Wine — White" },
  { name: "Riesling", category: "Wine — White" },
  { name: "Pinot Grigio", category: "Wine — White" },
  { name: "Gewürztraminer", category: "Wine — White" },
  { name: "Viognier", category: "Wine — White" },
  { name: "Chenin Blanc", category: "Wine — White" },
  { name: "Semillon", category: "Wine — White" },
  { name: "Roussanne", category: "Wine — White" },
  { name: "Muscadet", category: "Wine — White" },

  // Wine — Rosé
  { name: "Rosé (Provence-style)", category: "Wine — Rosé" },
  { name: "Rosé (Saignée)", category: "Wine — Rosé" },
  { name: "White Zinfandel", category: "Wine — Rosé" },

  // Wine — Other
  { name: "Port-style", category: "Wine — Other" },
  { name: "Sparkling (Méthode Champenoise)", category: "Wine — Other" },
  { name: "Pétillant Naturel", category: "Wine — Other" },
  { name: "Ice Wine", category: "Wine — Other" },
  { name: "Orange Wine", category: "Wine — Other" },
  { name: "Fruit Wine", category: "Wine — Other" },

  // Beer — Ale
  { name: "IPA", category: "Beer — Ale" },
  { name: "Pale Ale", category: "Beer — Ale" },
  { name: "Stout", category: "Beer — Ale" },
  { name: "Porter", category: "Beer — Ale" },
  { name: "Wheat Beer", category: "Beer — Ale" },
  { name: "Belgian Tripel", category: "Beer — Ale" },
  { name: "Saison", category: "Beer — Ale" },
  { name: "Brown Ale", category: "Beer — Ale" },
  { name: "Amber Ale", category: "Beer — Ale" },
  { name: "Sour / Wild Ale", category: "Beer — Ale" },

  // Beer — Lager
  { name: "Pilsner", category: "Beer — Lager" },
  { name: "Helles", category: "Beer — Lager" },
  { name: "Märzen / Oktoberfest", category: "Beer — Lager" },
  { name: "Bock", category: "Beer — Lager" },
  { name: "Dunkel", category: "Beer — Lager" },
  { name: "Vienna Lager", category: "Beer — Lager" },

  // Mead
  { name: "Traditional Mead", category: "Mead" },
  { name: "Melomel (Fruit Mead)", category: "Mead" },
  { name: "Metheglin (Spiced Mead)", category: "Mead" },
  { name: "Cyser (Apple Mead)", category: "Mead" },
  { name: "Bochet (Caramelized Mead)", category: "Mead" },

  // Cider
  { name: "Dry Cider", category: "Cider" },
  { name: "Sweet Cider", category: "Cider" },
  { name: "Perry", category: "Cider" },
  { name: "Cyser", category: "Cider" },
];

// ── Yeast Options ──────────────────────────────────────────────────────────

export interface AromaProfile {
  redFruit: number;
  stoneFruit: number;
  tropicalFruit: number;
  citrus: number;
  whiteFlowers: number;
  spicy: number;
  mineral: number;
  ester: number;
  mouthfeel: number;
}

export interface YeastOption {
  name: string;
  fullName: string;
  brand: string;
  species: string;
  category: string;

  tempRangeLowF: number;
  tempRangeHighF: number;
  alcoholTolerance: number;

  nitrogenDemand: "low" | "medium" | "high";
  fermentVigor: "moderate" | "vigorous" | "very vigorous";
  h2sProduction: "very low" | "low" | "medium";
  so2Production: "low" | "medium" | "high";
  foaming: "low" | "medium";
  killerFactor: boolean;
  mlCompatibility: "none" | "moderate" | "high" | "very high";
  malicAcidConsumption?: "high";

  aroma: string;
  wineStyles: string;
  description: string;
  varietals: string[];
  aromaProfile: AromaProfile;
}

// ── Lalvin Strains ─────────────────────────────────────────────────────────

const LALVIN: YeastOption[] = [
  {
    name: "EC-1118",
    fullName: "Lalvin EC-1118 (Prise de Mousse)",
    brand: "Lalvin",
    species: "Saccharomyces cerevisiae",
    category: "Universal",
    tempRangeLowF: 50,
    tempRangeHighF: 86,
    alcoholTolerance: 18,
    nitrogenDemand: "low",
    fermentVigor: "vigorous",
    h2sProduction: "very low",
    so2Production: "low",
    foaming: "low",
    killerFactor: true,
    mlCompatibility: "none",
    aroma: "Neutral",
    wineStyles: "Sparkling, white, rosé, late harvest, cider, restart stuck fermentations",
    description:
      "The workhorse. Ferments clean and fast in almost any condition. Neutral profile lets fruit speak for itself.",
    varietals: [],
    aromaProfile: {
      redFruit: 0,
      stoneFruit: 0,
      tropicalFruit: 0,
      citrus: 0,
      whiteFlowers: 0,
      spicy: 0,
      mineral: 0,
      ester: 0,
      mouthfeel: 0,
    },
  },
  {
    name: "RC-212",
    fullName: "Lalvin RC-212 (Bourgorouge)",
    brand: "Lalvin",
    species: "Saccharomyces cerevisiae",
    category: "Wine",
    tempRangeLowF: 64,
    tempRangeHighF: 86,
    alcoholTolerance: 16,
    nitrogenDemand: "medium",
    fermentVigor: "moderate",
    h2sProduction: "low",
    so2Production: "medium",
    foaming: "medium",
    killerFactor: false,
    mlCompatibility: "moderate",
    aroma: "Ripe cherry, bright fruity and spicy",
    wineStyles: "Full-bodied reds, Burgundy-style Pinot Noir, fruit-forward reds",
    description:
      "The Pinot Noir specialist. Emphasizes berry and spice aromatics with good color stability. Short lag phase.",
    varietals: [
      "Pinot Noir",
      "Grenache",
      "Zinfandel",
      "Merlot",
      "Syrah",
      "Cabernet Sauvignon",
    ],
    aromaProfile: {
      redFruit: 4,
      stoneFruit: 3,
      tropicalFruit: 2,
      citrus: 1,
      whiteFlowers: 2,
      spicy: 3,
      mineral: 1,
      ester: 2,
      mouthfeel: 3,
    },
  },
  {
    name: "71B",
    fullName: "Lalvin 71B (Narbonne)",
    brand: "Lalvin",
    species: "Saccharomyces cerevisiae",
    category: "Wine",
    tempRangeLowF: 59,
    tempRangeHighF: 86,
    alcoholTolerance: 14,
    nitrogenDemand: "low",
    fermentVigor: "moderate",
    h2sProduction: "low",
    so2Production: "low",
    foaming: "low",
    killerFactor: false,
    mlCompatibility: "very high",
    malicAcidConsumption: "high",
    aroma: "Ester-forward, tropical and stone fruit",
    wineStyles: "Semi-sweet whites, blush, nouveau-style reds, fruit wines",
    description:
      "Metabolizes up to 40% of malic acid during fermentation. Produces fruity esters that soften young wines.",
    varietals: [
      "Cabernet Franc",
      "Gewürztraminer",
      "Grenache",
      "Pinot Gris",
      "Riesling",
      "Viognier",
      "Zinfandel",
      "Gamay",
    ],
    aromaProfile: {
      redFruit: 3,
      stoneFruit: 2,
      tropicalFruit: 4,
      citrus: 3,
      whiteFlowers: 1,
      spicy: 1,
      mineral: 0,
      ester: 4,
      mouthfeel: 2,
    },
  },
  {
    name: "QA23",
    fullName: "Lalvin QA23",
    brand: "Lalvin",
    species: "Saccharomyces cerevisiae",
    category: "Wine",
    tempRangeLowF: 57,
    tempRangeHighF: 82,
    alcoholTolerance: 16,
    nitrogenDemand: "low",
    fermentVigor: "vigorous",
    h2sProduction: "very low",
    so2Production: "low",
    foaming: "low",
    killerFactor: true,
    mlCompatibility: "very high",
    aroma: "Tropical fruit, passion fruit, citrus zest",
    wineStyles: "Aromatic whites, Sauvignon Blanc, Colombard, cool-climate whites",
    description:
      "Thiol-releasing strain that maximizes tropical and citrus aromatics. Excellent for cool-fermented whites.",
    varietals: [
      "Sauvignon Blanc",
      "Chenin Blanc",
      "Colombard",
      "Gewürztraminer",
      "Muscadelle",
      "Pinot Gris",
      "Riesling",
      "Semillon",
      "Viognier",
      "Roussanne",
    ],
    aromaProfile: {
      redFruit: 1,
      stoneFruit: 2,
      tropicalFruit: 5,
      citrus: 4,
      whiteFlowers: 3,
      spicy: 1,
      mineral: 1,
      ester: 2,
      mouthfeel: 2,
    },
  },
  {
    name: "D47",
    fullName: "Lalvin D47 (ICV)",
    brand: "Lalvin",
    species: "Saccharomyces cerevisiae",
    category: "Wine",
    tempRangeLowF: 59,
    tempRangeHighF: 86,
    alcoholTolerance: 15,
    nitrogenDemand: "low",
    fermentVigor: "moderate",
    h2sProduction: "low",
    so2Production: "low",
    foaming: "low",
    killerFactor: true,
    mlCompatibility: "very high",
    aroma: "Floral, tropical, rich mouthfeel",
    wineStyles: "Full-bodied whites, barrel-fermented Chardonnay, Viognier, mead",
    description:
      "Enhances mouthfeel and body with a floral, tropical aromatic profile. Excellent for barrel-fermented whites.",
    varietals: [
      "Chardonnay",
      "Gewürztraminer",
      "Riesling",
      "Roussanne",
      "Sauvignon Blanc",
      "Viognier",
    ],
    aromaProfile: {
      redFruit: 0,
      stoneFruit: 2,
      tropicalFruit: 4,
      citrus: 4,
      whiteFlowers: 4,
      spicy: 2,
      mineral: 1,
      ester: 2,
      mouthfeel: 4,
    },
  },
  {
    name: "K1-V1116",
    fullName: "Lalvin K1-V1116 (Montpellier)",
    brand: "Lalvin",
    species: "Saccharomyces cerevisiae",
    category: "Wine",
    tempRangeLowF: 50,
    tempRangeHighF: 95,
    alcoholTolerance: 18,
    nitrogenDemand: "medium",
    fermentVigor: "vigorous",
    h2sProduction: "low",
    so2Production: "medium",
    foaming: "low",
    killerFactor: true,
    mlCompatibility: "moderate",
    aroma: "Fresh, fruity esters, floral notes",
    wineStyles: "White, rosé, late harvest, ice wine, fruit wines, restarting stuck fermentations",
    description:
      "Produces fresh fruity esters while preserving varietal character. Wide temp tolerance makes it reliable.",
    varietals: [
      "Sauvignon Blanc",
      "Chenin Blanc",
      "Pinot Grigio",
    ],
    aromaProfile: {
      redFruit: 3,
      stoneFruit: 2,
      tropicalFruit: 3,
      citrus: 3,
      whiteFlowers: 3,
      spicy: 1,
      mineral: 1,
      ester: 4,
      mouthfeel: 2,
    },
  },
];

// ── Red Star Strains ───────────────────────────────────────────────────────

const RED_STAR: YeastOption[] = [
  {
    name: "Côte des Blancs",
    fullName: "Red Star Côte des Blancs",
    brand: "Red Star",
    species: "Saccharomyces cerevisiae",
    category: "Wine",
    tempRangeLowF: 55,
    tempRangeHighF: 86,
    alcoholTolerance: 14,
    nitrogenDemand: "medium",
    fermentVigor: "moderate",
    h2sProduction: "low",
    so2Production: "low",
    foaming: "low",
    killerFactor: false,
    mlCompatibility: "moderate",
    aroma: "Fruity, aromatic",
    wineStyles: "Aromatic whites, fruit wines, ciders, residual-sugar styles",
    description:
      "Slow fermenter that tends to leave residual sweetness. Great for fruit wines and off-dry whites.",
    varietals: ["Chardonnay", "Riesling"],
    aromaProfile: {
      redFruit: 1,
      stoneFruit: 3,
      tropicalFruit: 2,
      citrus: 2,
      whiteFlowers: 3,
      spicy: 0,
      mineral: 1,
      ester: 3,
      mouthfeel: 2,
    },
  },
  {
    name: "Montrachet",
    fullName: "Red Star Montrachet",
    brand: "Red Star",
    species: "Saccharomyces cerevisiae",
    category: "Wine",
    tempRangeLowF: 54,
    tempRangeHighF: 95,
    alcoholTolerance: 15,
    nitrogenDemand: "high",
    fermentVigor: "vigorous",
    h2sProduction: "medium",
    so2Production: "medium",
    foaming: "medium",
    killerFactor: false,
    mlCompatibility: "moderate",
    aroma: "Complex, full-bodied",
    wineStyles: "Full-bodied reds and whites, Chardonnay, Merlot, Zinfandel",
    description:
      "Workhorse strain for reds and full-bodied whites. Can produce H₂S under stress — keep nitrogen levels up.",
    varietals: ["Chardonnay", "Merlot", "Syrah", "Zinfandel"],
    aromaProfile: {
      redFruit: 2,
      stoneFruit: 2,
      tropicalFruit: 1,
      citrus: 1,
      whiteFlowers: 1,
      spicy: 2,
      mineral: 2,
      ester: 1,
      mouthfeel: 3,
    },
  },
  {
    name: "Pasteur Red",
    fullName: "Red Star Pasteur Red",
    brand: "Red Star",
    species: "Saccharomyces cerevisiae",
    category: "Wine",
    tempRangeLowF: 63,
    tempRangeHighF: 86,
    alcoholTolerance: 15,
    nitrogenDemand: "medium",
    fermentVigor: "vigorous",
    h2sProduction: "low",
    so2Production: "medium",
    foaming: "medium",
    killerFactor: false,
    mlCompatibility: "high",
    aroma: "Varietal fruit character",
    wineStyles: "Full-bodied reds, Zinfandel, Cabernet, Merlot",
    description:
      "Classic red wine strain that lets varietal character shine through. Reliable and straightforward.",
    varietals: [
      "Zinfandel",
      "Cabernet Sauvignon",
      "Gamay",
      "Merlot",
      "Pinot Noir",
      "Syrah",
    ],
    aromaProfile: {
      redFruit: 3,
      stoneFruit: 1,
      tropicalFruit: 0,
      citrus: 0,
      whiteFlowers: 0,
      spicy: 2,
      mineral: 1,
      ester: 1,
      mouthfeel: 3,
    },
  },
  {
    name: "Premier Blanc",
    fullName: "Red Star Premier Blanc (Pasteur Champagne)",
    brand: "Red Star",
    species: "Saccharomyces cerevisiae",
    category: "Universal",
    tempRangeLowF: 50,
    tempRangeHighF: 95,
    alcoholTolerance: 18,
    nitrogenDemand: "low",
    fermentVigor: "vigorous",
    h2sProduction: "very low",
    so2Production: "low",
    foaming: "low",
    killerFactor: true,
    mlCompatibility: "none",
    aroma: "Neutral",
    wineStyles: "All-purpose, sparkling, restarts, mead, cider",
    description:
      "Clean, neutral, and high-tolerance. The Red Star equivalent of EC-1118 — reliable for anything.",
    varietals: [],
    aromaProfile: {
      redFruit: 0,
      stoneFruit: 0,
      tropicalFruit: 0,
      citrus: 0,
      whiteFlowers: 0,
      spicy: 0,
      mineral: 0,
      ester: 0,
      mouthfeel: 0,
    },
  },
  {
    name: "Premier Cuvée",
    fullName: "Red Star Premier Cuvée",
    brand: "Red Star",
    species: "Saccharomyces cerevisiae",
    category: "Universal",
    tempRangeLowF: 50,
    tempRangeHighF: 104,
    alcoholTolerance: 16,
    nitrogenDemand: "low",
    fermentVigor: "very vigorous",
    h2sProduction: "very low",
    so2Production: "low",
    foaming: "low",
    killerFactor: true,
    mlCompatibility: "none",
    aroma: "Clean, neutral",
    wineStyles: "All-purpose, sparkling, restarts, high-sugar musts",
    description:
      "Fast, clean, and nearly impossible to stall. Widest temperature range of any common wine yeast.",
    varietals: [],
    aromaProfile: {
      redFruit: 0,
      stoneFruit: 0,
      tropicalFruit: 0,
      citrus: 0,
      whiteFlowers: 0,
      spicy: 0,
      mineral: 0,
      ester: 0,
      mouthfeel: 0,
    },
  },
];

// ── Exports ────────────────────────────────────────────────────────────────

export const YEASTS: YeastOption[] = [...LALVIN, ...RED_STAR];

export function getYeastByName(name: string): YeastOption | undefined {
  return YEASTS.find(
    (y) => y.name.toLowerCase() === name.toLowerCase(),
  );
}

export function getYeastsForVarietal(varietal: string): YeastOption[] {
  const q = varietal.toLowerCase();
  return YEASTS.filter((y) =>
    y.varietals.some((v) => v.toLowerCase() === q),
  );
}

export function getStyleCategory(styleName: string): string | undefined {
  return STYLES.find((s) => s.name === styleName)?.category;
}
