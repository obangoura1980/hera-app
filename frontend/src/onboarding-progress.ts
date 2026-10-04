/**
 * onboarding-progress.ts
 * Module-level memory of the furthest onboarding step, so navigating away
 * (e.g. to the sign-in gate) and coming back resumes the same page instead
 * of restarting at the splash.
 */
let last = 1;

// Cached answers so leaving onboarding (e.g. to the sign-in gate) and coming
// back restores every field, not just the screen number.
const answers: Record<string, unknown> = {};
export const getAnswer = <T,>(key: string): T | undefined => answers[key] as T | undefined;
export const setAnswer = (key: string, value: unknown) => { answers[key] = value; };
const clearOnboardingAnswers = () => { Object.keys(answers).forEach(k => delete answers[k]); };

export const getLastOnboardingScreen = () => last;
export const setLastOnboardingScreen = (n: number) => { last = n; };
export const resetOnboardingProgress = () => { last = 1; clearOnboardingAnswers(); };
