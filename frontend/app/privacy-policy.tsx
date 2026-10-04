import React from 'react';
import { LegalScreen } from '@/components/LegalScreen';

// Placeholder content — replace with your final, lawyer-reviewed policy before launch.
export default function PrivacyPolicyScreen() {
  return (
    <LegalScreen
      title="Privacy Policy"
      updated="June 2026"
      intro="Your privacy matters to us. This Privacy Policy explains what information Hera collects, how we use it, and the choices you have."
      sections={[
        { heading: 'Information We Collect', body: 'Your email address for sign-in, the answers you share during onboarding, and the content you create in Hera — journal entries, vision board items, affirmations and chat messages.' },
        { heading: 'How We Use Your Information', body: 'To personalize your affirmations, AI coaching and reminders, to sync your journey across devices, and to improve the app. We never sell your personal data.' },
        { heading: 'Data Storage & Security', body: 'Your data is stored on secure servers and protected with encryption in transit. Access is restricted to your account.' },
        { heading: 'AI Processing', body: 'Messages you send to the AI coach are processed by our AI provider solely to generate responses. They are not used to advertise to you.' },
        { heading: 'Your Choices', body: 'You can edit your profile at any time, reset your journey, or permanently delete your account and all associated data from Settings.' },
        { heading: 'Children', body: 'Hera is not intended for children under 13, and we do not knowingly collect their data.' },
        { heading: 'Changes to This Policy', body: 'We may update this policy from time to time. Significant changes will be communicated in the app.' },
      ]}
    />
  );
}
