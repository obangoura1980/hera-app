import React from 'react';
import { LegalScreen } from '@/components/LegalScreen';

// Placeholder content — replace with your final, lawyer-reviewed terms before launch.
export default function TermsScreen() {
  return (
    <LegalScreen
      title="Terms & Conditions"
      updated="June 2026"
      intro="By using Hera you agree to these Terms & Conditions. Please read them carefully."
      sections={[
        { heading: 'Using Hera', body: 'Hera is a personal wellbeing and manifestation companion. You must be at least 13 years old and provide accurate account information.' },
        { heading: 'Not Professional Advice', body: 'Hera’s affirmations and AI coaching are for inspiration only and are not medical, psychological, financial or legal advice.' },
        { heading: 'Subscriptions & Free Trial', body: 'Premium features require a subscription. Free trials convert to a paid plan unless cancelled before the trial ends. Manage or cancel anytime in your App Store or Google Play account settings.' },
        { heading: 'Your Content', body: 'You own the journal entries, vision items and other content you create. You grant Hera permission to store and process it only to provide the service.' },
        { heading: 'Acceptable Use', body: 'Do not misuse the app, attempt to access other users’ data, or use Hera for unlawful purposes.' },
        { heading: 'Termination', body: 'You may delete your account at any time from Settings. We may suspend accounts that violate these terms.' },
        { heading: 'Limitation of Liability', body: 'Hera is provided “as is”. To the extent permitted by law, we are not liable for indirect or consequential damages.' },
        { heading: 'Changes', body: 'We may update these terms. Continued use after changes means you accept the updated terms.' },
      ]}
    />
  );
}
