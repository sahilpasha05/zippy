// Brand values taken from the zippy app (green #16A34A, dark #111827, orange from the logo tagline).
// Drop the original logo at public/zippy-logo.png (or .svg) and set LOGO_FILE.
export const LOGO_FILE: string | null = 'zippy-logo.png'; // original logo from the zippy repo (public/logo-zippy.png)
export const BRAND = {
  primary: '#22C55E', // brand green, brightened for glow on dark
  brand: '#16A34A', // exact brand green
  secondary: '#F97316', // orange accent (logo tagline)
  warm: '#FBBF24', // warm window lights
  dark: '#07110B',
  light: '#FFFFFF',
};
export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const S = {s1: [0, 90], s2: [90, 210], s3: [210, 360], s4: [360, 540], s5: [540, 750]} as const;
export const TOTAL = 750;
export const FONT = "'Arial Black','DejaVu Sans','Liberation Sans',Arial,sans-serif";
