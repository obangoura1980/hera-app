# Hera — Manifestation App (PRD)

## Original problem statement
"https://github.com/inamrana/Hera---Manifestation-App.git — here is existing app hera which is manifestation app". User chose: rebuild the full app fresh on Emergent with all features (affirmations & journal, vision board with images, guided visualizations, AI coach, discover feed). Other choices skipped → defaults: GPT (gpt-5.4 via Emergent key), JWT email/password auth, Emergent object storage, premium UI only.

## Architecture
- Expo Router (SDK 57) frontend: onboarding, auth, 4 tabs (Today, Journal/Vision, Hera coach, Discover), modals (journal-new, goal-new, premium), visualization player, article detail, profile. NativeTabs on iOS 26+, classic Tabs elsewhere.
- FastAPI + MongoDB backend (`/app/backend/server.py`, static content in `content.py`).
- AI: emergentintegrations LlmChat (openai gpt-5.4), SSE streaming for coach.
- Storage: Emergent Object Storage for vision-board uploads (`/api/upload`, `/api/files/{path}?token=`).
- Design: "Hand-drawn journal" theme — parchment + sage, Fraunces + Nunito, Feather icons.

## Implemented (2026-10-01)
- JWT auth (register/login/me), 30-day token, stored in secure storage
- Daily affirmation, "I affirm" streak tracking, saved favorites, AI-written affirmations
- Journal (gratitude/intention/reflection, mood) CRUD
- Vision board polaroid grid: preset images or photo upload, mark as manifested, delete
- Hera AI coach with streaming replies, persisted history, aware of user's goals
- Discover feed with category chips + article detail; quotes
- 4 guided visualization sessions with breathing circle, timer, step text; completion logs streak
- Profile with stats, saved affirmations, logout; Premium paywall (MOCKED activation)
- Tested: backend 21/21, frontend flows all pass

## Backlog
- P0: Real in-app subscriptions (RevenueCat) to replace mocked premium
- P1: Daily reminder notifications; edit journal entries; AI journal prompts
- P1: Audio narration for visualizations (TTS)
- P2: Share affirmation cards as images; refresh tokens; Supabase data import from old app

## Update (2026-10-01) — Original brand restored
- BRAND_GUIDE.md created (original repo vs rebuild); original assets copied to /app/brand-assets/original
- Landing splash (logo, glowing HERA, aura rings, "tap anywhere to begin")
- Theme: dark "Ethereal Aura" + light "Blush Rose" with in-app toggle (persisted, works on web too); system font
- Floating capsule tab bar: Home, Discover, Journal, Profile; coach moved to /coach, vision board to /vision
- Home redesigned (orb, "what do you want to manifest?" → coach, trending chips, For you cards); Journal (stats, filters, emoji moods); Discover (featured hero + row cards); Settings (stats, achievements, appearance switch, account); Premium paywall ($6.99/mo annual, $9.99/mo monthly — still MOCKED)
- App icon / splash / adaptive icon / favicon set to Hera logo

## Update (2026-10-01) — Matched to the 18 original screenshots
- No zip was attached; used the GitHub repo plus 18 screenshots (findings in BRAND_GUIDE.md, section 4)
- Discover: Affirmation Audio player (on-device voice via expo-speech, 16 affirmations from GET /api/affirmations/list), featured "Morning Manifestation Method", Manifestation/Mindset/Meditations tabs, Lesson/Article cards
- Journal: Wins entry type and 🏆 Wins filter
- Home: emoji labels (🔥 ✨ 🔮 💜), Explore More link
- Settings: version footer
- Backlog: daily reminders, profile photo upload, Privacy & Data / Help & Support / Reset Journey / Delete Account rows, paywall bonus card and legal links

## Update (2026-10-01) — Claude coach
- Hera coach and affirmation generation now use Anthropic claude-sonnet-5-5 via Emergent Universal Key (streaming SSE)
- Warm, spiritually grounded system prompt; personalized with user name + vision board goals; plain text replies
- History: all messages stored in MongoDB (coach_messages); last 30 included as context each turn; clear button resets
- Tested: backend 29/29, frontend chat flows pass

## Update (2026-10-01) — REPLACED with the original repo code (user choice)
- /app/frontend now runs the ORIGINAL Hera repo code (app/, components/, constants/, contexts/, hooks/, services/, template/) ported to Expo SDK 57
- Previous Emergent-built screens archived in /app/legacy-rebuild (not routed); unused web subscription context in /app/legacy-rebuild/repo-unused
- Port shims: template/core/emergent-client.ts (Supabase-compatible client calling FastAPI), template/auth/emergent.tsx (auth), src/utils/async-storage.ts, src/utils/av-shim.ts (expo-audio), icons -> @react-native-vector-icons/ionicons + material-icons
- Backend: email OTP login (4-digit, Emergent managed email, from name "Hera"), /api/hera-chat (Claude claude-sonnet-5-5, original SSE protocol), /api/subscription, DELETE /api/account, /api/account/reset, PATCH /api/auth/me
- Free trial on the paywall is a DEMO (POST /api/premium/activate); real App Store / Play Store purchases not connected
- Data (journal, vision, chat, mood) stays on-device as in the original; cloud sync is a no-op
- Verified: login via OTP -> paywall -> Home tab renders; backend 13/13 tests
- Backlog: real in-app subscriptions (RevenueCat), cloud sync to backend, avatar upload to storage, Google sign-in

## Update (2026-06) — Gender fix, avatar storage, reminders polish
- Onboarding gender: Female / Male / Non-binary / Prefer not to say
- Profile photo: expo-image-picker -> POST /api/upload (Emergent object storage) -> PATCH /api/auth/me avatar_path; shown on Home + Settings; remove clears avatar_path
- Daily reminders: expo-notifications (morning/evening), permission check -> request -> Open Settings when blocked; web shows "Mobile Only"; plugin added to app.json
- Reset Journey fixed (updateUser) and now calls POST /api/account/reset; Privacy Policy link wired
- Tested: iteration_5 backend 8/8, frontend pass

## Update (2026-06) — UI polish batch (iterations 15-24)
- Onboarding: follows app light/dark theme (style factories + T() palette mapper), theme toggle next to mute on splash/welcome/questions; answers cached in src/onboarding-progress.ts; email gate back = real pop to Q20
- Edit Profile screen (/edit-profile) edits name, goals + all onboarding answers (user.profile)
- In-app Privacy Policy (/privacy-policy) & Terms (/terms) placeholder screens
- Themed custom alert modal for all showAlert calls (template/ui/context.tsx), Delete Account popup theme-aware
- Vision: gesture-handler/reanimated slider, honest image-error state (no random fallback), Pixabay UA header, Android back → Home
- Journal: detail sheet height fix, mood label one line; ambient music never auto-plays, pauses on leaving Discover
- Chat: reset (refresh) icon; offline top toast; sync icon blink fixed
- RevenueCat deferred by user (demo trial still mocked)

## Update (2026-09) — Android EAS build fix (AppsFlyer Kotlin conflict)
- EAS Android build failed at :react-native-appsflyer:compileReleaseKotlin (7.0.2-v2 built with Kotlin 2.4 metadata vs EAS Kotlin 2.1)
- Pinned react-native-appsflyer@6.18.0 (via yarn expo install); service rewritten to v6 API (initSdk/startSdk/positional logEvent), same exported interface
- AppsFlyer dev key + iOS app id moved from source to frontend/.env (EXPO_PUBLIC_APPSFLYER_DEV_KEY / EXPO_PUBLIC_APPSFLYER_IOS_APP_ID)
- Added NSUserTrackingUsageDescription to ios.infoPlist; added shouldUsePurchaseConnector:false to appsflyer plugin options
- Added GET /health to backend (deployment probes were getting 404)
- Deployment agent re-check: no blockers; warns remain (placeholder legal copy, mocked cloud sync)
- PENDING: user must redeploy via Emergent Publish to verify the Android build now completes; then native AppsFlyer event validation on device
