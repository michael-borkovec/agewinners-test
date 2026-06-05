/**
 * File purpose
 * - Short public referral route.
 * Main responsibilities
 * - Convert /ref/{slug} into the registration page referral parameter.
 * Related APIs, components, or modules
 * - app/register/page.tsx
 * - lib/api/referrals.ts
 */

import { redirect } from "next/navigation";

function normalizeReferralSlug(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw ?? "").toLowerCase().replace(/[^a-z]/g, "").slice(0, 8);
}

export default async function ReferralRedirectPage({ params }: { params: Promise<{ slug?: string }> }) {
  const { slug } = await params;
  const referralSlug = normalizeReferralSlug(slug);
  redirect(referralSlug ? `/register?ref=${referralSlug}` : "/register");
}
