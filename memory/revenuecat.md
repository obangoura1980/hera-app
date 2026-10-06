# RevenueCat — integrated (2026-10-04)
This file serves as memory for interacting with the user's RevenueCat account via the integration proxy.

## Identifiers (from /setup response — copy verbatim)
- rc_project_id: proj5cf7090a
- apple_app_id: appb3cae346b2
- play_app_id: appaad0eb062e
- entitlement_lookup_key: pro
- offering_lookup_key: default
- Packages (package -> product_id, current price):
  - $rc_monthly -> prod8616d8b006   (Test Store: $9.99 / P1M, trial: none)
  - $rc_annual  -> prod48d640878f   (Test Store: $79.99 / P1Y, trial: none)
- NOTE (2026-10-04): Test Store prices/trial are IMMUTABLE once a product has transactions — /products upsert returns 200 but does not change them; DELETE fails with "Could not delete product because it has transactions". Intended PRODUCTION pricing is $12.99/mo and $89.99/yr with a 7-day free trial (P1W) — these are configured STORE-SIDE (App Store Connect subscription price + introductory offer; Play Console base plan price + free trial) when the user creates pro.monthly / pro.annual. Subscription prices and trials ALWAYS live in the stores; RevenueCat reflects them.
- Dashboard: https://app.revenuecat.com/projects/proj5cf7090a
- bundle_id: com.emergent.manifestdreams.qc3zvj (iOS, app.json)
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
