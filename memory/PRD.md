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

## Update (2026-09) — Android EAS build fix #2 (manifest merger conflict)
- After AppsFlyer 6.18.0 pin, build progressed past Kotlin but failed at :app:processReleaseMainManifest
- Cause: expo-secure-store's backup rules (secure_store_backup_rules / secure_store_data_extraction_rules) conflict with af-android-sdk's appsflyer_backup_rules / appsflyer_data_extraction_rules on <application>
- Fix: custom config plugin frontend/plugins/withAndroidBackupRulesFix.js adds tools:replace="android:dataExtractionRules,android:fullBackupContent" keeping secure-store rules (NOT preferAppsFlyerBackupRules=true, which would delete them); listed last in app.json plugins
- Verified locally: expo prebuild --platform android --no-install succeeds; generated AndroidManifest.xml has tools:replace on <application> + secure-store rules retained, XML parses; android/ dir and package.json prebuild side-effects cleaned up
- PENDING: user redeploy via Emergent Publish to confirm the EAS build completes end-to-end

## Update (2026-10-13) — Permanent demo/reviewer account
- demo@heraapp.com / HeraDemo2024! — seeded on every backend startup (idempotent upsert, is_premium=true), whitelisted in PREMIUM_BYPASS_EMAILS so full premium access without any purchase
- Never deletable/resettable: DELETE /api/account and POST /api/account/reset return 403 for it; register with the email returns 409; password works from any location (no OTP dependency)
- Login screen (app/login.tsx): entering the demo email switches to a "Demo Sign In" password stage (invisible to regular users, OTP flow unchanged); routes into the app with premium active
- Testing agent iteration 29: 6/6 flows pass (demo detection, login, wrong password, back-to-email, OTP regression, premium access)
- NOTE: production Atlas DB gets the seed only after the NEXT backend deploy — reviewer credentials go live on redeploy

## Update (2026-10-21) — GitHub repo merge (repo = source of truth, careful merge)
- Pulled public repo github.com/obangoura1980/hera-app and merged user's changes on top of our work
- Backend: demo login accepts reviewer passwords (HeraDemo2024!/1234/123456/demo1234/12345678); demo OTP send returns fixed code 1234 (no email, 365-day expiry); demo OTP verify accepts 1234/password; User.public() reflects premium for bypass emails; OtpVerifyIn max_length 8→16. KEPT ours: startup seed, delete/reset 403 protection, /health. Single get_or_create_demo_user helper instead of repo's 3 duplicated blocks
- Frontend: subscription stack replaced with RevenueCat native paywall — new RevenueCatPaywall.native.tsx (RevenueCatUI.Paywall, offeringId support, purchase/restore callbacks) + web fallback RevenueCatPaywall.tsx (no purchases-ui on web: premium notice + Restore); PaywallModal now thin Modal wrapper; SubscriptionContext showPaywall(feature, offeringId) presents native paywall when PaywallView exists, demo email = subscribed client-side; login.tsx repo demo flow (demo email → OTP stage with Password/Code field, marks hera_onboarded); app.json version 1.0.6 + versionCode 10
- SKIPPED from repo deliberately: emergent-client.ts fake demo token fallback (would fabricate invalid session; backend handles demo verify for real) — adopted only its OTP-send demo short-circuit; repo frontend/android dir (managed workflow); revenuecat.tsx repo version (older — kept our retry/refetch hardening)
- Verified: lint clean (frontend+backend), demo login via code 1234 lands on Home with premium, /subscription web fallback renders, 10/10 backend curl checks pass
- NOTE: native RC paywall UI needs a device build to validate; if no paywall is designed in RC Paywall Editor, the SDK shows its default paywall

## Update (2026-10-21) — App Store identity
- iOS bundleIdentifier changed to com.hera.herapp (matches user's live App Store app; same as Android package)
- expo.version 6.0.0 (live App Store version was 5.0.0); iOS buildNumber/Android versionCode managed remotely by EAS
- User must confirm RevenueCat iOS app (app8070880860) bundle ID = com.hera.herapp

## Update (2026-10-21) — pre-iOS-build hardening
- Removed mocked POST /api/premium/activate (unused by app; let any signed-in user grant themselves premium). Now 404. Premium only via RevenueCat or PREMIUM_BYPASS_EMAILS
- Deployment check: iOS config OK (bundle com.hera.herapp, v6.0.0, permission strings present, plugins resolve, compiles)
- Deliberately NOT changed: .gitignore .env patterns (flagged by deploy agent, but earlier builds received frontend/.env fine and the repo is public — un-ignoring would publish keys)

## Update (2026-10-21) — iOS build missing from App Store Connect
- Likely cause: expo-image-picker plugin had cameraPermission:false + microphonePermission:false -> NSCameraUsageDescription/NSMicrophoneUsageDescription absent while the linked picker binary references camera APIs -> Apple post-upload processing rejects (ITMS-90683), build never appears in ASC (Apple emails the account holder)
- Fix: real camera/mic purpose strings + ios.infoPlist ITSAppUsesNonExemptEncryption=false. Verified via expo config introspect: all Usage strings present, bundle com.hera.herapp, version 6.0.0
- Other possible causes if it recurs: build uploaded under a different Apple team/app record; still processing (up to ~1h); build number already used

## Update (2026-10-21) — demo premium confirm + restore message
- Demo premium (already in place, re-verified): DB is_premium=true (seed + get_or_create_demo_user re-asserts), PREMIUM_BYPASS_EMAILS (GET /api/subscription subscribed:true, /auth/me is_premium:true), frontend isDemoEmail -> isSubscribed
- Restore messages: SubscriptionContext restore catch no longer shows raw store SDK text (could mention 'Apple ID'); shows 'No Active Subscription' / 'No active subscription was found for this account.' Native RevenueCat paywall: onRestoreCompleted without entitlement + onRestoreError now show the same message. RevenueCatUI's own native dialogs (if any) are not app-controllable

## Update (2026-10-21) — Paywall 'not available' + onboarding->paywall loop fix
- Root cause: repo's thin subscription.tsx rendered only RevenueCatUI.Paywall. When StoreKit returns no products (TestFlight: products not fetchable), RevenueCatUI shows dead-end 'Paywall is not available'; its Close -> router.back()/replace('/(tabs)') -> (tabs) SubscriptionGuard replace('/subscription') -> remount -> loop. Repo version had also dropped AuthGate + local plan steps + refetchOfferings
- Fix: restored our full subscription.tsx (AuthGate -> TrialSummary -> Checkout, retry). Native RevenueCatPaywall used ONLY when PaywallView exists AND target offering has packages; native onDismiss/onLoadError -> local paywall (no navigation -> no loop)
- RevenueCatPaywall.native: calls onLoadError on fetch error or empty offering. PaywallModal: onLoadError -> onViewPlans (opens local /subscription). SubscriptionContext.showPaywall: skips presentPaywall when offering has no packages. Re-added refetchOfferings + purchasePlan live-refetch to SubscriptionContext (repo version dropped them)
- index.tsx waits for statusLoaded (onboarded users) before redirecting, so subscribers don't flash through /subscription
- Testing agent iteration 30: 6/6 flows pass (onboarding -> /subscription once, stable 12s; hera_onboarded persisted; local paywall + Tap-to-retry; no loop; demo stays on Home; no max-update-depth). Added 6s timeout fallback in index.tsx so a hung status check never leaves a blank screen

## Update (2026-10-21) — paywall prices matched
- subscription.tsx fallback prices now $12.99/mo, $89.99/yr ($7.50/mo); savings labels 30% -> 42% (89.99 vs 12.99x12=155.88)
- OPEN: onboarding.tsx PLANS shows a 'Founding Member $7.99/month' option with no matching store product — awaiting user decision
- Removed 'Founding Member $7.99/month' from onboarding PLANS (no store product); selectedPlan type now 'annual'|'premium'. selectedPlan is display-only (purchase happens on /subscription)
