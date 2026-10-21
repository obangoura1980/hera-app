# RevenueCat — integrated (2026-10-04; re-provisioned 2026-10-13)
This file serves as memory for interacting with the user's RevenueCat account via the integration proxy.

## Identifiers (from /setup response — copy verbatim)
- rc_project_id: proj5cf7090a
- apple_app_id: app8070880860   # NEW apps created by user in RC dashboard (old appb3cae346b2 / appaad0eb062e were DELETED upstream — /build-config returned rc_upstream resource_missing for them)
- play_app_id: appe751ded2e4    # NEW
- entitlement_lookup_key: pro
- offering_lookup_key: default
- Packages (package -> product_id, current price):
  - $rc_monthly -> prod8616d8b006   (upserted 2026-10-13: $12.99 / P1M, trial: P1W)
  - $rc_annual  -> prod48d640878f   (upserted 2026-10-13: $89.99 / P1Y, trial: P1W)
- entitlement_products['pro'] = 6 products (test store + Apple/Play mirrors), confirmed 2026-10-13
- NOTE: /setup response is CACHED/STALE (returns old app ids + old keys). The live SDK keys are the NEW ones in frontend/.env. Old-key builds will fail to fetch offerings.
- NOTE (2026-10-13): /products upsert returned success with trial P1W + new prices — verify on a production build whether the new-app products actually carry trial/pricing (Test Store products with transactions were previously immutable).
- Dashboard: https://app.revenuecat.com/projects/proj5cf7090a
- bundle_id: com.hera.herapp (iOS, app.json — changed 2026-10-21 to match the live App Store app; was com.emergent.manifestdreams.qc3zvj). Version 6.0.0 (previous live App Store version 5.0.0)
- package_name: com.hera.herapp (Android, app.json — changed 2026-10-06 for AppsFlyer; /setup re-run with it)

## Status check
`curl -sS -H "Authorization: Bearer <emergent key from playbook>" "$INTEGRATION_PROXY_URL/internal/revenuecat/projects/134257bb-ac6c-4253-88d7-c4cbab316e61/status"`
→ connection_state was "connected", project_state "connected" at setup time.

## App wiring
- SDK keys in /app/frontend/.env (EXPO_PUBLIC_REVENUECAT_TEST/IOS/ANDROID_API_KEY)
- Client: /app/frontend/src/lib/revenuecat.tsx (RCSubscriptionProvider, useRCSubscription, entitlement 'pro')
- Bridge: /app/frontend/contexts/SubscriptionContext.tsx — same legacy interface (isSubscribed, plan, purchasePlan('monthly'|'yearly'), restoreSubscription, iapProducts mapped from packages, productId = package identifier $rc_monthly/$rc_annual)
- IAP_SKUS in services/iapService.ts = RC package identifiers
- Owner bypass: backend GET /api/subscription whitelists iaminamrana@gmail.com (PREMIUM_BYPASS_EMAILS in server.py) — honored on top of RC entitlement
- Identity: Purchases.logIn(backend user id) in SubscriptionContext auth effect
- _layout.tsx: QueryClientProvider + RCSubscriptionProvider; initializeRevenueCat() at module scope
- Demo checkout (POST /api/premium/activate) REMOVED from purchase path — RC is the only purchase path now

## Later updates (integration proxy ONLY — never RevenueCat REST)
- Change price/trial/add package: POST .../projects/134257bb-ac6c-4253-88d7-c4cbab316e61/products (upsert; amount_micros = price × 1,000,000; trial "P1W")
- Remove package: DELETE .../products/%24rc_monthly
- Repopulate keys: re-run idempotent /setup then /build-config?environment=sandbox

## Taking IAP LIVE (USER does these — see FAQ in payments panel)
1. Upload store credentials to RevenueCat dashboard (ASC .p8 in-app purchase key + App Store Connect API key; Google Play service-account JSON)
2. Payment profiles in App Store Connect / Play Console
3. Create matching store products with SAME product IDs as RevenueCat dashboard (pro.monthly / pro.annual; Play base plans monthly / annual)
4. Release build → TestFlight / Play internal testing → submit for review

## 2026-10-13 — RESOLVED: production offerings live (user re-attached packages)
- User re-attached packages to offering 'default' in the RC dashboard, mapped to THEIR store products:
  - Android: $rc_monthly → hera_premium:monthly, $rc_annual → hera_premium:annual (Play Console subscription 'hera_premium' with base plans monthly/annual + trial offers, configured by user in Play Console)
  - iOS: $rc_monthly → com.hera.premium.monthly, $rc_annual → com.hera.premium.yearly (App Store Connect, user-confirmed created)
- VERIFIED via RC public offerings endpoint with the NEW appl_/goog_ keys: both platforms return both packages. App code unchanged (reads packages by RC identifier; prices/trial come from the store products)
- REMAINING GAP (preview only): Test Store offerings still packages: [] — proxy /products upsert does not backfill Test Store products into the manually re-attached packages. Web preview/Expo Go cannot simulate purchases until user adds Test Store products to the packages in the RC dashboard (Offerings → default → package → add Test Store product). Production builds are unaffected
- Prices/trial: configured store-side by user ($12.99/$89.99 + 7-day trial per plan); RC reflects store data on device
- Code hardening shipped: offerings auto-refetch every 15s while empty, purchase does live refetch before unavailable alert, paywall empty state has Tap-to-retry
