/**
 * Brand colors sampled from public/images/meti-class-export-logo.png (red logo pixels).
 * Keep in sync if the logo asset changes.
 */
export const METI_LOGO_RED_RGB = { r: 219, g: 65, b: 56 } as const;

export function metiRedRgbTuple(): [number, number, number] {
  const { r, g, b } = METI_LOGO_RED_RGB;
  return [r, g, b];
}

/** Light panel background: blend logo red toward white (same red hue as METI_LOGO_RED_RGB). */
export function metiRedTintRgbTuple(): [number, number, number] {
  const { r, g, b } = METI_LOGO_RED_RGB;
  const t = 0.88;
  return [
    Math.round(255 * t + r * (1 - t)),
    Math.round(255 * t + g * (1 - t)),
    Math.round(255 * t + b * (1 - t)),
  ];
}
