// app/profile/security/page.tsx
// Popis: Sekce – Bezpečnost

'use client';

export default function ProfileSecurityPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-semibold text-gray-900">Bezpečnost</h1>

      <p className="mb-4 text-sm text-gray-600">
        Po aktivaci přihlášení přes Supabase zde přidáme:
      </p>

      <ul className="list-disc pl-6 text-sm text-gray-700 space-y-2">
        <li>Změnu hesla</li>
        <li>Dvoufaktorové ověření (2FA)</li>
        <li>Správu aktivních zařízení</li>
        <li>Nastavení obnovy účtu</li>
        <li>Možnost smazání účtu</li>
      </ul>
    </div>
  );
}
