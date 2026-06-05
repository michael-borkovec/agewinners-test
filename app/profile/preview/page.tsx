/**
 * File purpose
 * - Redirect legacy /profile/preview to the current profile visibility preview.
 * Main responsibilities
 * - Avoid maintaining two separate "how others see me" implementations.
 * Related APIs, components, or modules
 * - app/profile/as-seen/page.tsx
 */

import { redirect } from "next/navigation";

export default function ProfilePreviewRedirectPage() {
  redirect("/profile/as-seen");
}
