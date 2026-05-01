/**
 * Brand colors sampled from public/images/meti-class-export-logo.png (red logo pixels).
 * Keep in sync if the logo asset changes.
 */
export const METI_LOGO_RED_RGB = { r: 219, g: 65, b: 56 } as const;

export function metiRedRgbTuple(): [number, number, number] {
  const { r, g, b } = METI_LOGO_RED_RGB;
  return [r, g, b];
}

/** Light tint on white for PDF panels (same hue family). */
export function metiRedTintRgbTuple(): [number, number, number] {
  return [255, 242, 241];
}
