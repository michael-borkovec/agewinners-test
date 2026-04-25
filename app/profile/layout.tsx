/**
 * File: app/profile/layout.tsx
 *
 * Purpose:
 * - Layout wrapper for all /profile/* pages.
 * - Provides consistent content container.
 *
 * Updated:
 * - Profile navigation was moved to the global LeftSidebar (between user card and quick stats),
 *   so this layout no longer renders profile menu.
 */

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* Profile content only (menu lives in LeftSidebar now) */}
      <main className="min-w-0">{children}</main>
    </div>
  );
}
