// app/profile/social/page.tsx
// Popis: Sekce – Sítě & kontakt

'use client';

import { UserProfileForm } from '@/app/profile/components/UserProfileForm';

export default function ProfileSocialPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">Sítě & kontakt</h1>
      <p className="mb-6 text-sm text-gray-600">
        Propoj své účty a přidej veřejný kontakt pro spolupráce.
      </p>

      <UserProfileForm visibleSection="social" />
    </div>
  );
}
