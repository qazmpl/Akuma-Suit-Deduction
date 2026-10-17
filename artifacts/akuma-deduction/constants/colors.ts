/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    text: '#f2eee5',
    tint: '#d7b777',
    background: '#0d1010',
    foreground: '#f2eee5',
    card: '#171b1a',
    cardForeground: '#f2eee5',
    primary: '#d7b777',
    primaryForeground: '#171715',
    secondary: '#202523',
    secondaryForeground: '#f2eee5',
    muted: '#1b201e',
    mutedForeground: '#909891',
    accent: '#30271c',
    accentForeground: '#e7ca91',
    destructive: '#c6535d',
    destructiveForeground: '#fff7f0',
    destructiveSurface: '#281b1c',
    border: '#303735',
    input: '#252b29',
    surface: '#111514',
    surfaceRaised: '#1c2220',
    teamA: '#d7b777',
    teamB: '#89aeb0',
    suits: {
      SPADES: '#bdc8ce',
      HEARTS: '#cf7379',
      DIAMONDS: '#dfbd78',
      CLUBS: '#88b294',
      DEMON: '#d05d52',
    },
  },
  dark: {
    text: '#f2eee5',
    tint: '#d7b777',
    background: '#0d1010',
    foreground: '#f2eee5',
    card: '#171b1a',
    cardForeground: '#f2eee5',
    primary: '#d7b777',
    primaryForeground: '#171715',
    secondary: '#202523',
    secondaryForeground: '#f2eee5',
    muted: '#1b201e',
    mutedForeground: '#909891',
    accent: '#30271c',
    accentForeground: '#e7ca91',
    destructive: '#c6535d',
    destructiveForeground: '#fff7f0',
    destructiveSurface: '#281b1c',
    border: '#303735',
    input: '#252b29',
    surface: '#111514',
    surfaceRaised: '#1c2220',
    teamA: '#d7b777',
    teamB: '#89aeb0',
    suits: {
      SPADES: '#bdc8ce',
      HEARTS: '#cf7379',
      DIAMONDS: '#dfbd78',
      CLUBS: '#88b294',
      DEMON: '#d05d52',
    },
  },
  radius: 16,
};

export default colors;
