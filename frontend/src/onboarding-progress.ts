/**
 * onboarding-progress.ts
 * Module-level memory of the furthest onboarding step, so navigating away
 * (e.g. to the sign-in gate) and coming back resumes the same page instead
 * of restarting at the splash.
 */
let last = 1;

export const getLastOnboardingScreen = () => last;
export const setLastOnboardingScreen = (n: number) => { last = n; };
export const resetOnboardingProgress = () => { last = 1; };
