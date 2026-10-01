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
