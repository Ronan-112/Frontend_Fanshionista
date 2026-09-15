/**
 * Turns a free-text color description (e.g. "deep maroon", "mustard with
 * tilla embroidery", "black bomber with ivory anarkali") into one or more
 * approximate swatch colors for display.
 *
 * This is intentionally an approximation, not a color-matching system —
 * named fashion colors ("wheatish", "champagne gold") don't have a single
 * canonical hex value. The goal is to give the user a quick visual sense
 * of the color rather than making them parse text, which is what was
 * actually asked for.
 */

// Longer/more specific phrases first, so "sky blue" matches before "blue".
const HUE_KEYWORDS = [
  ["temple gold", "#C9A227"], ["champagne gold", "#D9C27E"], ["mustard yellow", "#C9A227"],
  ["rust orange", "#B5651D"], ["bright orange", "#E8710A"], ["bright red", "#D32F2F"],
  ["brick red", "#9E4732"], ["hot pink", "#E0447E"], ["dusty pink", "#D6949E"],
  ["dusty rose", "#C98A93"], ["blush pink", "#EFC9CE"], ["deep magenta", "#8E1B4B"],
  ["deep maroon", "#5C1F2C"], ["temple maroon", "#6E2430"], ["deep plum", "#4A2540"],
  ["deep purple", "#4B2E6F"], ["deep teal", "#0F5C5C"], ["deep brown", "#3E2418"],
  ["deep blue", "#1B3A6B"], ["deep red", "#8B1A1A"], ["sky blue", "#87CEEB"],
  ["royal blue", "#2352A3"], ["powder blue", "#B6D0E2"], ["peacock blue", "#1B6B93"],
  ["midnight blue", "#14213D"], ["mid-wash blue", "#5A7FA6"], ["navy blue", "#1B2A4A"],
  ["forest green", "#234F3A"], ["bottle green", "#1E4632"], ["sage green", "#9CAF88"],
  ["sea green", "#2E8B67"], ["mint green", "#A8E6C1"], ["emerald", "#2E8B57"],
  ["olive", "#6B7A3A"], ["turquoise", "#3FB6AE"], ["teal", "#2C8C99"],
  ["mustard", "#C9A227"], ["gold", "#D4AF37"], ["champagne", "#E9DFB8"],
  ["beige", "#E3D5B8"], ["cream", "#F5EFD8"], ["ivory", "#FFFFF0"],
  ["off-white", "#F2ECE1"], ["stone", "#D8CDBB"], ["khaki", "#C3B091"],
  ["mint", "#A8E6C1"], ["coral", "#FF7F6B"], ["terracotta", "#C3603C"],
  ["rust", "#A85426"], ["peach", "#FFD9B3"], ["pastel", "#E8D9E8"],
  ["blush", "#EFCFC8"], ["maroon", "#7A2E3E"], ["burgundy", "#6E1E2C"],
  ["wine", "#5E1F2E"], ["plum", "#713A5D"], ["magenta", "#B32B6D"],
  ["mustard", "#C9A227"], ["orange", "#E8710A"], ["yellow", "#F1C40F"],
  ["pink", "#EFAFC4"], ["red", "#C0392B"], ["charcoal grey", "#3A3A3A"],
  ["charcoal", "#3A3A3A"], ["steel grey", "#71797E"], ["pinstripe grey", "#7C7C7C"],
  ["grey melange", "#9A9A9A"], ["grey", "#8C8C8C"], ["gray", "#8C8C8C"],
  ["chocolate brown", "#4B2E1E"], ["chocolate", "#4B2E1E"], ["brown", "#6B4226"],
  ["denim", "#3B5D82"], ["camel", "#C19A6B"], ["black", "#232323"],
  ["white", "#FDFDFD"], ["ivory", "#FFFFF0"], ["blue", "#3B6FB6"],
  ["green", "#4C9A5B"], ["purple", "#6C3483"], ["silver", "#C7C9CB"],
];

const MULTICOLOR_HINTS = ["multicolor", "mirror-work", "phulkari", "print", "gota", "ikat", "sequins", "embroidery", "border", "buttons", "thread", "zari", "work"];

function findHue(text) {
  const lower = text.toLowerCase();
  for (const [keyword, hex] of HUE_KEYWORDS) {
    if (lower.includes(keyword)) return hex;
  }
  return null;
}

/**
 * Returns { type: 'solid', hex } | { type: 'duo', hexA, hexB } | { type: 'multi' }
 * 'duo' is used for compound descriptions like "black bomber with ivory anarkali"
 * where two garment colors are described in one string.
 */
export function getColorSwatch(description) {
  const lower = description.toLowerCase();

  if (MULTICOLOR_HINTS.some((hint) => lower.includes(hint)) && !HUE_KEYWORDS.some(([k]) => lower === k)) {
    // Still try to extract a primary hue for a partial-confidence solid swatch,
    // but flag as decorative/multicolor when the description is clearly compound.
    const hue = findHue(lower);
    if (lower.includes(" with ") || lower.includes(" and ")) {
      const parts = lower.split(/ with | and /);
      const hexA = findHue(parts[0]) || hue;
      const hexB = parts[1] ? findHue(parts[1]) : null;
      if (hexA && hexB && hexA !== hexB) return { type: "duo", hexA, hexB };
      if (hexA) return { type: "solid", hex: hexA };
    }
    return hue ? { type: "solid", hex: hue } : { type: "multi" };
  }

  if (lower.includes(" with ") || lower.includes(" and ")) {
    const parts = lower.split(/ with | and /);
    const hexA = findHue(parts[0]);
    const hexB = parts[1] ? findHue(parts[1]) : null;
    if (hexA && hexB && hexA !== hexB) return { type: "duo", hexA, hexB };
  }

  const hue = findHue(lower);
  return hue ? { type: "solid", hex: hue } : { type: "multi" };
}