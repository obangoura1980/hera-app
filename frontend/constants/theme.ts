/**
 * Hera Design System — Dual Theme
 * Light: Warm White + Soft Lavender  (Headspace · Apple · Notion · Calm)
 * Dark:  Charcoal + Soft Lavender    (Apple Vision Pro · Aura · Calm)
 *
 * Philosophy: Calm · Premium · Spiritual (not cliché) · Trustworthy · Warm
 * Updated: cache refresh 37
 */

export type ThemeColors = {
  // ── Core backgrounds ─────────────────────────────────────────────────────
  background: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  cardAlt: string;
  // ── Brand ────────────────────────────────────────────────────────────────
  primary: string;
  primaryLight: string;
  primaryDark: string;
  // ── Accent ───────────────────────────────────────────────────────────────
  gold: string;
  goldLight: string;
  // ── Text ─────────────────────────────────────────────────────────────────
  text: string;
  textWhite: string;    // main readable text (flips with theme)
  textMuted: string;
  textSubtle: string;
  textSecondary: string;
  // ── Glass / borders ───────────────────────────────────────────────────────
  glassBg: string;
  glassBorder: string;
  glassPurple: string;
  glassGold: string;
  border: string;
  borderGold: string;
  // ── Semantic ──────────────────────────────────────────────────────────────
  success: string;
  error: string;
  warning: string;
  // ── Legacy aliases (kept for backward compat) ─────────────────────────────
  midnight: string;      // ≈ background
  midnightCard: string;  // ≈ card
  midnightLight: string; // ≈ subtle divider
};

/** ── Light Theme — Blush Rose (Soft Feminine · Premium · Warm) ─────────────── */
export const LightColors: ThemeColors = {
  background:    '#FDE8EA',
  surface:       '#FFFFFF',
  surfaceAlt:    '#FEF0F2',
  card:          '#FFFFFF',
  cardAlt:       '#FEF4F6',
  primary:       '#C4707A',   // dusty rose
  primaryLight:  '#D4939A',   // soft rose
  primaryDark:   '#A85560',   // deep rose
  gold:          '#C4707A',   // rose-as-accent
  goldLight:     '#D4939A',
  text:          '#1A0A14',
  textWhite:     '#1A0A14',   // dark text on light backgrounds
  textMuted:     'rgba(26,10,20,0.62)',
  textSubtle:    'rgba(26,10,20,0.38)',
  textSecondary: '#6B4050',
  glassBg:       'rgba(255,255,255,0.78)',
  glassBorder:   'rgba(255,255,255,0.6)',
  glassPurple:   'rgba(196,112,122,0.08)',
  glassGold:     'rgba(196,112,122,0.1)',
  border:        'rgba(0,0,0,0.08)',
  borderGold:    'rgba(196,112,122,0.3)',
  success:       '#34D399',
  error:         '#EF4444',
  warning:       '#F59E0B',
  midnight:      '#FDE8EA',
  midnightCard:  '#FFFFFF',
  midnightLight: '#FEF0F2',
};

/** ── Dark Theme — Ethereal Aura (Deep Space + Violet/Rose) ──────────────── */
export const DarkColors: ThemeColors = {
  background:    '#080A18',
  surface:       '#0F1025',
  surfaceAlt:    '#141530',
  card:          '#0D0F22',
  cardAlt:       '#111330',
  primary:       '#A855F7',
  primaryLight:  '#C084FC',
  primaryDark:   '#7C3AED',
  gold:          '#F472B6',
  goldLight:     '#FB7AB8',
  text:          '#FFFFFF',
  textWhite:     '#FFFFFF',
  textMuted:     'rgba(192,132,252,0.85)',
  textSubtle:    'rgba(192,132,252,0.5)',
  textSecondary: '#C084FC',
  glassBg:       'rgba(255,255,255,0.06)',
  glassBorder:   'rgba(168,85,247,0.3)',
  glassPurple:   'rgba(168,85,247,0.15)',
  glassGold:     'rgba(244,114,182,0.12)',
  border:        'rgba(168,85,247,0.25)',
  borderGold:    'rgba(244,114,182,0.35)',
  success:       '#34D399',
  error:         '#F87171',
  warning:       '#FBBF24',
  midnight:      '#080A18',
  midnightCard:  '#0D0F22',
  midnightLight: 'rgba(168,85,247,0.2)',
};

/** Static Colors — used by Subscription & Visualization (intentional dark aesthetic) */
export const Colors = DarkColors;

export const Spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
};

export const Radius = {
  sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, full: 9999,
};

export const FontSize = {
  xs: 11, sm: 13, base: 15, md: 17, lg: 20, xl: 24, xxl: 28, xxxl: 32,
};

export const Shadow = {
  card: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  gold: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 8,
  },
  sm: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  lift: {
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
};
