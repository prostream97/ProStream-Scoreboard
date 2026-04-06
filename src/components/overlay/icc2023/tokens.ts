// ICC Cricket World Cup 2023 design tokens
// Extracted directly from the Figma source code
export const ICC = {
  // Core palette
  purple:       '#320075',   // primary bg + text on light backgrounds
  pink:         '#FD02A3',   // primary accent: 4s ball dot, table headers, highlights
  pinkAlt:      '#FA00A0',   // left score bar block in center scorebug
  blue:         '#4293F0',   // sixes ball dot, rank column backgrounds
  yellow:       '#FFCD07',   // right score bar block, period indicator
  white:        '#FEFEFE',   // text on dark, card/row backgrounds
  cream:        '#FBF9F9',   // scorebug bar background
  pinkStrike:   '#E73493',   // striker indicator bar (10×20px)
  red:          '#FB0000',   // LIVE badge background

  // Image overlay
  purpleOverlay: 'rgba(49, 0, 116, 0.24)',

  // Shadows
  scorebox:     '0px 6.17px 6.17px rgba(0,0,0,0.25)',
  imgShadow:    '0px 4px 4px rgba(0,0,0,0.25)',

  // Typography — Kufam is the ICC CWC 2023 display font
  font:         '"Kufam", "Inter", sans-serif',
} as const
