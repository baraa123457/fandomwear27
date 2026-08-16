import { UniverseInfo } from "@/lib/types";

export const universes: UniverseInfo[] = [
  {
    id: "marvel",
    label: "Marvel",
    tagline: "Heroes, reimagined in thread",
    color: "#ED1D24",
    icon: "Zap",
    productCount: 6,
  },
  {
    id: "dc",
    label: "DC",
    tagline: "Gotham to Metropolis",
    color: "#2E7DFF",
    icon: "ShieldHalf",
    productCount: 4,
  },
  {
    id: "potter",
    label: "Harry Potter",
    tagline: "Wands, houses, legends",
    color: "#C9A227",
    icon: "Sparkles",
    productCount: 3,
  },
  {
    id: "anime",
    label: "Anime",
    tagline: "Shonen energy, everyday fit",
    color: "#B14CFF",
    icon: "Flame",
    productCount: 7,
  },
  {
    id: "gaming",
    label: "Gaming",
    tagline: "Loot for the real world",
    color: "#22D3EE",
    icon: "Gamepad2",
    productCount: 7,
  },
  {
    id: "fantasy",
    label: "Fantasy",
    tagline: "Dragons, realms, relics",
    color: "#22C55E",
    icon: "Swords",
    productCount: 2,
  },
  {
    id: "movies",
    label: "Movies",
    tagline: "Cult classics on cotton",
    color: "#F59E0B",
    icon: "Clapperboard",
    productCount: 1,
  },
];

// A small rotating palette for universes that don't have a curated color.
export const FALLBACK_PALETTE = [
  "#7C5CFF",
  "#22D3EE",
  "#FF3B4E",
  "#22C55E",
  "#F59E0B",
  "#EC4899",
  "#38BDF8",
  "#A855F7",
];

/**
 * Safely converts an input string into a deterministic palette index.
 *
 * If input is missing/undefined, it falls back to "other"
 * instead of crashing the application.
 */
export function hashToIndex(
  input: string | undefined | null,
  mod: number
): number {
  if (!input || mod <= 0) {
    return 0;
  }

  let h = 0;

  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }

  return h % mod;
}

/**
 * Always returns a usable UniverseInfo.
 *
 * Handles:
 * - Known universe IDs
 * - Custom universe IDs
 * - Missing/undefined universe IDs
 * - Universes removed from the catalog
 */
export function resolveUniverse(
  list: UniverseInfo[],
  id: string | undefined | null
): UniverseInfo {
  // If no universe ID exists, return a safe default universe.
  if (!id) {
    return {
      id: "other",
      label: "Other",
      tagline: "",
      color: FALLBACK_PALETTE[0],
      icon: "Sparkles",
      productCount: 0,
    };
  }

  const found = list.find((u) => u.id === id);

  if (found) {
    return found;
  }

  return {
    id,
    label: id.charAt(0).toUpperCase() + id.slice(1),
    tagline: "",
    color:
      FALLBACK_PALETTE[
        hashToIndex(id, FALLBACK_PALETTE.length)
      ],
    icon: "Sparkles",
    productCount: 0,
  };
}

export function getUniverse(
  id: string | undefined | null
): UniverseInfo {
  return resolveUniverse(universes, id);
}