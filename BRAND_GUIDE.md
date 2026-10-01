# Hera — Brand Guide

This guide covers two codebases:

1. **Original Hera app** (GitHub repo `inamrana/Hera---Manifestation-App`). This is the established brand: logo, purple and gold, rose light theme.
2. **Current rebuilt app** (`/app/frontend`). It uses a new "hand-drawn journal" look with sage and parchment.

> ⚠️ **The two brands don't match.** The rebuild doesn't use the original logo or colors. To make the app match the original brand, apply Section 1 to `/app/frontend/src/theme.ts`.

Copies of the original logo and image files are in `/app/brand-assets/original/`.

---

## 1. Original Hera app (source repo)

Source files: `constants/theme.ts` (main design system), `contexts/ThemeContext.tsx`, `components/ui/Button.tsx`, `app/(tabs)/_layout.tsx`, `app.json`.

The original describes itself as *"Calm · Premium · Spiritual (not cliché) · Trustworthy · Warm"*. It has two themes. Dark is the default; it follows the device setting and the user can switch it, with the choice saved under the key `@hera_theme`.

### 1.1 Dark theme: "Ethereal Aura" (default)
| Token | Value | Role |
|---|---|---|
| background | `#080A18` | Main background (deep space navy) |
| surface | `#0F1025` | Surfaces |
| surfaceAlt | `#141530` | Alternate surface |
| card | `#0D0F22` | Cards |
| cardAlt | `#111330` | Alternate card |
| **primary** | `#A855F7` | Brand violet |
| primaryLight | `#C084FC` | Light violet; active tab color |
| primaryDark | `#7C3AED` | Deep violet |
| **gold** (accent) | `#F472B6` | Pink accent (named "gold") |
| goldLight | `#FB7AB8` | Light pink accent |
| text / textWhite | `#FFFFFF` | Main text |
| textSecondary | `#C084FC` | Secondary text |
| textMuted | `rgba(192,132,252,0.85)` | Muted text |
| textSubtle | `rgba(192,132,252,0.5)` | Subtle text |
| glassBg | `rgba(255,255,255,0.06)` | Glass fill |
| glassBorder | `rgba(168,85,247,0.3)` | Glass border |
| glassPurple | `rgba(168,85,247,0.15)` | Violet tint |
| glassGold | `rgba(244,114,182,0.12)` | Pink tint |
| border | `rgba(168,85,247,0.25)` | Borders |
| borderGold | `rgba(244,114,182,0.35)` | Accent borders |
| success | `#34D399` | Success |
| error | `#F87171` | Error |
| warning | `#FBBF24` | Warning |
| midnight / midnightCard / midnightLight | `#080A18` / `#0D0F22` / `rgba(168,85,247,0.2)` | Older names for background, card and divider |

### 1.2 Light theme: "Blush Rose"
| Token | Value | Role |
|---|---|---|
| background | `#FDE8EA` | Blush background |
| surface / card | `#FFFFFF` | Surfaces and cards |
| surfaceAlt | `#FEF0F2` | Alternate surface |
| cardAlt | `#FEF4F6` | Alternate card |
| **primary** | `#C4707A` | Dusty rose |
| primaryLight | `#D4939A` | Soft rose |
| primaryDark | `#A85560` | Deep rose |
| gold / goldLight | `#C4707A` / `#D4939A` | Rose used as the accent |
| text / textWhite | `#1A0A14` | Main text |
| textSecondary | `#6B4050` | Secondary text |
| textMuted | `rgba(26,10,20,0.62)` | Muted text |
| textSubtle | `rgba(26,10,20,0.38)` | Subtle text |
| glassBg / glassBorder | `rgba(255,255,255,0.78)` / `rgba(255,255,255,0.6)` | Glass |
| glassPurple / glassGold | `rgba(196,112,122,0.08)` / `rgba(196,112,122,0.1)` | Rose tints |
| border / borderGold | `rgba(0,0,0,0.08)` / `rgba(196,112,122,0.3)` | Borders |
| success / error / warning | `#34D399` / `#EF4444` / `#F59E0B` | Status |

### 1.3 Other brand colors used directly in screens (most frequent)
| Value | Count | Use |
|---|---|---|
| `#EC4899` | 20 | Pink; end color of the main gradient |
| `#F5C2C7`, `#F9D5D9` | 18 / 13 | Light-theme rose tints |
| `#131838`, `#0D1035`, `#060B18`, `#190940`, `#3B0764` | many | Dark gradient colors |
| `#5B21B6` | 10 | Deep violet (button gradient end) |
| `#D4AF37`, `#EDD95C`, `#B8941F`, `#F4D35E` | – | True metallic gold (gold button, logo) |
| `#0F172A` | 5 | Splash and notification background; text on gold buttons |
| `#1E0A3C` | – | Android adaptive icon background |
| `#2D1520` / `#B0909A` | – | Light-theme tab bar: active / inactive |
| `rgba(30,27,46,0.85)` / `rgba(255,255,255,0.78)` | – | Floating tab bar background (dark / light) |

### 1.4 Gradients
| Colors | Use |
|---|---|
| `#A855F7 → #EC4899` | **Signature gradient** (used 14 times) |
| `#7C3AED → #5B21B6` | Primary button (left to right) |
| `#7C3AED → #5B21B6 → #3B0764` | Deep violet hero areas |
| `#EDD95C → #D4AF37 → #B8941F` | Gold button |
| `#080A18 → #0D1035 → #131838` | Dark screen backgrounds |
| `#060B18 → #190940 → #060B18` | Subscription and visualization screens |
| `transparent → rgba(0,0,0,0.7–0.92)` | Dark overlays on images |

### 1.5 Typography
- **Font family:** the system font (San Francisco on iOS, Roboto on Android). No custom font is loaded. `SpaceMono-Regular.ttf` came with the starter template and isn't used. `monospace` appears once, in the "DELETE" confirmation.
- **Font size tokens (`FontSize`):** xs 11 · sm 13 · base 15 · md 17 · lg 20 · xl 24 · xxl 28 · xxxl 32. The most used are sm (115 times), xs (102) and base (76).
- **Sizes set directly in screens:** 10, 11, 13–18, 20, 22, 24, 26, 28, 30, 34, 36, 38, 44, 52, 56. The large sizes are hero and display text.
- **Weights (by usage):** 700 (100) · 600 (80) · 500 (32) · 800 (29) · 900 (4) · bold (2) · 400 (1).
- **Italic:** used 15 times, for affirmation and quote text. The affirmation hero uses size 17, weight 500, italic, line height 28.
- **Letter spacing:** usually 0.3 on buttons. Also 0.5, 0.8, 1, 1.2, 3 for small uppercase labels, and -0.5 on large titles.
- **Email template** (`assets/email-templates/otp-email.html`): `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Helvetica, Arial, sans-serif`.

### 1.6 Spacing, corners and shadows
- **Spacing:** xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48
- **Corner radius:** sm 8 · md 12 · lg 16 · xl 20 · xxl 28 · full 9999. Buttons are fully rounded pills; the floating tab bar uses radius 52.
- **Shadows** (all violet `#A855F7`): card (y4, opacity 0.4, blur 16, elevation 6) · gold (y4, 0.4, 18, 8) · sm (y2, 0.2, 8, 3) · lift (y6, 0.35, 20, 6). The tab bar has a black shadow (y8, 0.18, 24, 20).

### 1.7 Buttons (`components/ui/Button.tsx`)
| Variant | Style |
|---|---|
| primary | Gradient `#7C3AED → #5B21B6`, white text, weight 600, violet card shadow |
| gold | Gradient `#EDD95C → #D4AF37 → #B8941F`, text `#080A18`, weight 700 |
| secondary | Glass fill with a 1.5 glass border, weight 500 |
| ghost | Muted text, weight 500 |
| Sizes | sm: padding 10×20, font 13 · md: 14×28, font 15 · lg: 17×36, font 17 |

### 1.8 Logos and image files
| File | Size | Description |
|---|---|---|
| `logo.png` | 512×512 | **Main logo**: gold "H" with a woman's profile, a star and a crescent above, the word "HERA", and the tagline "AI MANIFESTATION COACH", on deep purple (≈`#1E0A3C`). Used in 7 places. |
| `icon.png` | 1024×1024 | App icon, splash image and notification icon (same artwork as the logo, higher resolution) |
| `icon-android.png` | 512×512 | Android adaptive icon (an exact copy of `logo.png`) |
| `hera-orb.png` | 500×500 | Faceted violet gem "orb" (Hera's avatar, dark theme) |
| `hera-orb-light.png` | 500×500 | Faceted amber/gold gem orb (light theme) |
| `onboarding-hero.png` | 672×1200 | Onboarding hero image (not referenced in the code) |
| `future-self.png` | 768×1360 | Future-self visualization image (not referenced in the code) |
| `favicon.ico` | 32×32 | Web favicon |
| `onspace-4.png` | — | **Not a brand asset**: a screenshot of a third-party Stripe checkout page. Not copied. |

**Brand tagline:** "AI Manifestation Coach". **Bundle ID:** `com.hera.app`.

### 1.9 Icons
- **Icon set:** Ionicons, from `@expo/vector-icons`. MaterialIcons is used once (`photo-camera`).
- **Style:** outline icons when inactive, filled when active.
- **Tab bar** (floating capsule, size 24, a dot under the active tab): `home`, `headset` (Discover), `images` (Vision), `heart` (Journal), `person` (Profile).
- **Most used icons:** `sparkles` (14 times, the signature icon), `time-outline`, `arrow-back`, `checkmark-circle`, `trash-outline`, `shield-checkmark`, `chevron-forward`, `send`, `play-circle`, `gift`, `sunny`, `moon`, `lock-closed`, `logo-apple`.

### 1.10 Effects
- Glass-style surfaces (semi-transparent white fills with violet borders). No blur library is used.
- `LinearGradient` is used heavily (185 places).
- The app is set to dark style (`userInterfaceStyle: "dark"`), with a dark splash screen (`#0F172A`).

---

## 2. Current rebuilt app (`/app/frontend`)

Source files: `src/theme.ts`, `/app/design_guidelines.json`, `app/_layout.tsx`.
Style: "Hand-drawn journal". Light theme only, flat (no shadows, no glass).

### 2.1 Colors (`src/theme.ts`)
| Token | Value | Role |
|---|---|---|
| surface | `#FDFBF7` | Parchment background |
| onSurface | `#2E2C29` | Main text (ink) |
| surfaceSecondary / onSurfaceSecondary | `#F4EFE6` / `#3A3835` | Cards |
| surfaceTertiary / onSurfaceTertiary | `#EBE3D5` / `#474440` | Inputs and chips |
| surfaceInverse / onSurfaceInverse | `#2E2C29` / `#FDFBF7` | Inverse surfaces |
| muted | `#7E7972` | Captions and placeholders |
| brand | `#748773` | Sage |
| **brandPrimary** / onBrandPrimary | `#5F725E` / `#FFFFFF` | Main buttons; active tab |
| brandSecondary / onBrandSecondary | `#96A695` / `#FFFFFF` | Secondary color |
| brandTertiary / onBrandTertiary | `#DCE3DB` / `#2E3A2E` | Chips and tags |
| gold (accent) | `#D5A05B` | Premium accent |
| scrim / scrimClear | `rgba(46,44,41,0.78)` / `rgba(46,44,41,0)` | Dark overlay on images |
| success / warning / error / info | `#728965` / `#D5A05B` / `#B86B5D` / `#848B89` | Status (each with white text) |
| border / borderStrong / divider | `#E6DFD3` / `#BDB6A8` / `#EFE9DF` | Lines |

### 2.2 Typography
- **Headings:** `Fraunces`, a variable serif font (`assets/fonts/Fraunces.ttf`). Sizes 16–48: page titles 32, hero text 26–40, card titles 19–24.
- **Body text:** `Nunito`, a variable sans-serif font (`assets/fonts/Nunito.ttf`). Sizes 11–17; weights 600, 700 and 800 for labels and buttons.
- **Size scale:** sm 12 · base 14 · lg 16 · xl 20 · 2xl 24
- **Small uppercase labels:** size 11–12, weight 800, letter spacing 1–1.5.

### 2.3 Spacing and corners
- **Spacing (`space`):** xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48
- **Corner radius (`radius`):** sm 6 · md 12 · lg 20 · pill 999. Corners are deliberately mixed for a hand-made feel.
- **Shadows:** none.

### 2.4 Icons and image files
- **Icon set:** Feather (`@react-native-vector-icons/feather`). On iOS 26 and later, the native tab bar uses SF Symbols: `sun.max.fill`, `book.fill`, `bubble.left.and.bubble.right.fill`, `sparkles`.
- **App icon, splash and favicon:** still the default Expo template images in `assets/images/`. **The Hera logo is not applied yet.**
- **Photos:** Unsplash images loaded from the web (listed under `images` in `design_guidelines.json`).

---

## 3. Recommended next step
To restore the original brand, apply the colors from Section 1, set the app icon and splash to `/app/brand-assets/original/icon.png`, and show `logo.png` and `hera-orb.png` on the onboarding and coach screens.
