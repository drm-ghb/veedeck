export const ACCENT_HUES = ["260", "200", "150", "25", "300", "340", "90", "60"] as const;
export type AccentHue = typeof ACCENT_HUES[number];

export function randomAccentHue(): string {
  return ACCENT_HUES[Math.floor(Math.random() * ACCENT_HUES.length)];
}

function hexToRgb(hex: string): [number, number, number] | null {
  const c = hex.replace("#", "");
  if (c.length !== 6) return null;
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

/** Returns the three CSS color values for a given hue string (e.g. "260") or hex (e.g. "#3b82f6"). */
export function accentColors(hue: string | null | undefined) {
  const h = hue ?? "260";
  if (h.startsWith("#")) {
    const rgb = hexToRgb(h);
    if (rgb) {
      const [r, g, b] = rgb;
      const tint = `rgb(${Math.round(r + (255 - r) * 0.88)},${Math.round(g + (255 - g) * 0.88)},${Math.round(b + (255 - b) * 0.88)})`;
      const deep = `rgb(${Math.round(r * 0.45)},${Math.round(g * 0.45)},${Math.round(b * 0.45)})`;
      return { bar: h, tint, deep };
    }
  }
  return {
    bar:  `oklch(62% .14 ${h})`,
    tint: `oklch(96% .02 ${h})`,
    deep: `oklch(38% .10 ${h})`,
  };
}
