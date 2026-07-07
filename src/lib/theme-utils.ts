export interface CustomThemeColors {
  primary: string;
  background: string;
  sidebar: string;
  sidebarText?: string;
  contentText?: string;
}

function hexToRgb(hex: string) {
  const h = hex.replace("#", "");
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function rgbToHex(r: number, g: number, b: number) {
  return "#" + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function getLuminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function getFg(hex: string) { return getLuminance(hex) > 0.35 ? "#111111" : "#FFFFFF"; }
function lighten(hex: string, t: number) { const { r, g, b } = hexToRgb(hex); return rgbToHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t); }
function darken(hex: string, t: number) { const { r, g, b } = hexToRgb(hex); return rgbToHex(r * (1 - t), g * (1 - t), b * (1 - t)); }
function muted(hex: string) { return getLuminance(hex) > 0.5 ? darken(hex, 0.06) : lighten(hex, 0.1); }
function border(hex: string) { return getLuminance(hex) > 0.5 ? darken(hex, 0.12) : lighten(hex, 0.15); }
function mutedFg(hex: string) { return getLuminance(hex) > 0.5 ? darken(hex, 0.45) : lighten(hex, 0.55); }
function sidebarAccent(hex: string) { return getLuminance(hex) > 0.5 ? darken(hex, 0.08) : lighten(hex, 0.1); }

export function buildCustomThemeCSS(c: CustomThemeColors): string {
  const primaryAccent = lighten(c.primary, 0.5);
  const fg = c.contentText ?? getFg(c.background);
  const sidebarFg = c.sidebarText ?? getFg(c.sidebar);
  return `
:root[data-theme="custom"] {
  --background: ${c.background};
  --foreground: ${fg};
  --card: ${c.background};
  --card-foreground: ${fg};
  --popover: ${c.background};
  --popover-foreground: ${fg};
  --primary: ${c.primary};
  --primary-foreground: ${getFg(c.primary)};
  --secondary: ${muted(c.background)};
  --secondary-foreground: ${fg};
  --muted: ${muted(c.background)};
  --muted-foreground: ${mutedFg(c.background)};
  --accent: ${primaryAccent};
  --accent-foreground: ${c.primary};
  --destructive: oklch(0.577 0.245 27.325);
  --border: ${border(c.background)};
  --input: ${border(c.background)};
  --ring: ${c.primary};
  --radius: 0.625rem;
  --sidebar: ${c.sidebar};
  --sidebar-foreground: ${sidebarFg};
  --sidebar-primary: ${c.primary};
  --sidebar-primary-foreground: ${getFg(c.primary)};
  --sidebar-accent: ${sidebarAccent(c.sidebar)};
  --sidebar-accent-foreground: ${sidebarFg};
  --sidebar-border: ${border(c.sidebar)};
  --sidebar-ring: ${c.primary};
}`.trim();
}
