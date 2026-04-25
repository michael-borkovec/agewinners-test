/**
 * File: app/profile/page.tsx
 *
 * Purpose:
 * - Redirect /profile to /profile/basic.
 *
 * Why:
 * - The real profile sections live in /profile/basic, /profile/privacy, /profile/personal.
 * - Statistics are a standalone section at /stats.
 * - We added app/profile/layout.tsx which provides the profile navigation.
 * - The old monolithic ProfilePage with mock data is deprecated.
 */

import { redirect } from "next/navigation";

export default function ProfileIndexPage() {
  redirect("/profile/basic");
}
