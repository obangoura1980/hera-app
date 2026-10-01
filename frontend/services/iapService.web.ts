/**
 * iapService.web.ts — Explicit web platform stub.
 * Metro resolves .web.ts before .ts on web builds, making it unambiguous
 * that react-native-iap is never loaded on web.
 * All exports mirror iapService.ts so consumers compile on every platform.
 */
export * from './iapService';
