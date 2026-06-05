/**
 * app/users/[userId]/page.tsx
 *
 * Purpose:
 * - Profile view of another user (public/other user's profile)
 * - Shows richer connection detail including key personal/profile fields and network actions
 * - Respects privacy toggles from /profile/personal by showing "Skryto" instead of hidden values
 */

"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { awAlert, awPrompt } from "@/components/AwDialog";
import { supabase } from "@/lib/supabaseClient";
import {
  acceptConnectionRequest,
  cancelConnectionRequest,
  declineConnectionRequest,
  followUser,
  getNetworkProfileInsights,
  removeConnection,
  requestConnection,
  unfollowUser,
} from "@/lib/api/network";
import type { AwChallenge } from "@/lib/api/challenges";
import { recordProfileVisit } from "@/lib/api/profileVisits";

type PublicProfile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  bio: string | null;
  created_at: string | null;
  account_status: string | null;

  allow_age_visible: boolean | null;
  allow_connections: boolean | null;
  allow_following: boolean | null;
  social_links_visibility: "everyone" | "contacts" | "private" | null;
  profile_age_visibility: "everyone" | "contacts" | "private" | null;
  profile_occupation_visibility: "everyone" | "contacts" | "private" | null;
  profile_education_visibility: "everyone" | "contacts" | "private" | null;
  profile_languages_visibility: "everyone" | "contacts" | "private" | null;
  profile_relationship_visibility: "everyone" | "contacts" | "private" | null;
  profile_motivation_visibility: "everyone" | "contacts" | "private" | null;
  profile_body_visibility: "everyone" | "contacts" | "private" | null;

  bio_contacts: string | null;
  bio_contacts_hidden: boolean | null;

  occupation: string | null;
  occupation_hidden: boolean | null;
  is_student: boolean | null;
  is_student_hidden: boolean | null;

  education_level: string | null;
  education_level_hidden: boolean | null;

  native_languages: string[] | null;
  native_languages_hidden: boolean | null;
  other_languages: string[] | null;
  other_languages_hidden: boolean | null;

  relationship_status: string | null;
  relationship_status_hidden: boolean | null;
  motivation_text: string | null;
  motivation_text_hidden: boolean | null;
  height_cm: number | null;
  height_cm_hidden: boolean | null;
  weight_kg: number | null;
  weight_kg_hidden: boolean | null;

  about_me: string | null;
  about_me_hidden: boolean | null;
  primary_interests: string[] | null;
  primary_interests_hidden: boolean | null;
  interests: string[] | null;
  interests_custom: string[] | null;
  interests_hidden: boolean | null;
  life_goals: string[] | null;
  life_goals_custom: string[] | null;
  life_goals_hidden: boolean | null;
  self_view: string | null;
  self_view_hidden: boolean | null;
  improvement_areas: string[] | null;
  improvement_areas_custom: string[] | null;
  improvement_areas_hidden: boolean | null;

  activities: string[] | null;
  activities_custom: string[] | null;
  activities_hidden: boolean | null;
  diet_preference: string | null;
  diet_preference_hidden: boolean | null;
  alcohol_use: string | null;
  alcohol_use_hidden: boolean | null;
  smoking: string | null;
  smoking_hidden: boolean | null;
  drug_light: boolean | null;
  drug_hard: boolean | null;
  drugs_hidden: boolean | null;
  mindset: string | null;
  mindset_hidden: boolean | null;
  life_pace: string | null;
  life_pace_hidden: boolean | null;

  website_url: string | null;
  website_url_hidden: boolean | null;
  public_email: string | null;
  public_email_hidden: boolean | null;
  instagram_url: string | null;
  instagram_url_hidden: boolean | null;
  facebook_url: string | null;
  facebook_url_hidden: boolean | null;
  tiktok_url: string | null;
  tiktok_url_hidden: boolean | null;
  youtube_url: string | null;
  youtube_url_hidden: boolean | null;
  linkedin_url: string | null;
  linkedin_url_hidden: boolean | null;
  x_url: string | null;
  x_url_hidden: boolean | null;
  contact_note: string | null;
  contact_note_hidden: boolean | null;
};

type RelationshipState =
  | { kind: "self" }
  | { kind: "connected" }
  | { kind: "outgoing_request"; requestId: string }
  | { kind: "incoming_request"; requestId: string }
  | { kind: "none" };

type ProfileStatsSummary = {
  awAge: number | null;
  awScoreNormPct: number | null;
};

type SharedNetworkSummary = {
  connections_count: number;
  following_count: number;
  followers_count: number;
  mutual_connections_count: number;
  common_following_count: number;
  mutual_connections: Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>;
  common_following: Array<{ user_id: string; display_name: string | null; avatar_url: string | null }>;
};

const CURRENT_AW_WINDOW_YEARS = 5;
const PROFILE_VISIT_THROTTLE_MS = 30 * 60 * 1000;
const BASE_PUBLIC_PROFILE_COLUMNS = `
  user_id, display_name, avatar_url, date_of_birth, bio, created_at, account_status,
  allow_age_visible, allow_connections, allow_following,
  social_links_visibility,
  profile_age_visibility,
  profile_occupation_visibility, profile_education_visibility, profile_languages_visibility,
  profile_relationship_visibility, profile_motivation_visibility, profile_body_visibility,
  bio_contacts, bio_contacts_hidden,
  occupation, occupation_hidden,
  is_student, is_student_hidden,
  education_level, education_level_hidden,
  native_languages, native_languages_hidden,
  other_languages, other_languages_hidden,
  relationship_status, relationship_status_hidden,
  motivation_text, motivation_text_hidden,
  height_cm, height_cm_hidden,
  weight_kg, weight_kg_hidden,
  about_me, about_me_hidden,
  primary_interests, primary_interests_hidden,
  interests, interests_custom, interests_hidden,
  life_goals, life_goals_custom, life_goals_hidden,
  self_view, self_view_hidden,
  improvement_areas, improvement_areas_custom, improvement_areas_hidden,
  activities, activities_custom, activities_hidden,
  diet_preference, diet_preference_hidden,
  alcohol_use, alcohol_use_hidden,
  smoking, smoking_hidden,
  drug_light, drug_hard, drugs_hidden,
  mindset, mindset_hidden,
  life_pace, life_pace_hidden
`;
const CONTACT_PUBLIC_PROFILE_COLUMNS = `
  website_url, website_url_hidden,
  public_email, public_email_hidden,
  instagram_url, instagram_url_hidden,
  facebook_url, facebook_url_hidden,
  tiktok_url, tiktok_url_hidden,
  youtube_url, youtube_url_hidden,
  linkedin_url, linkedin_url_hidden,
  x_url, x_url_hidden,
  contact_note, contact_note_hidden
`;
const CONTACT_PUBLIC_PROFILE_KEYS = [
  "website_url",
  "public_email",
  "instagram_url",
  "facebook_url",
  "tiktok_url",
  "youtube_url",
  "linkedin_url",
  "x_url",
  "contact_note",
];
const EMPTY_CONTACT_PUBLIC_PROFILE_FIELDS = {
  website_url: null,
  website_url_hidden: null,
  public_email: null,
  public_email_hidden: null,
  instagram_url: null,
  instagram_url_hidden: null,
  facebook_url: null,
  facebook_url_hidden: null,
  tiktok_url: null,
  tiktok_url_hidden: null,
  youtube_url: null,
  youtube_url_hidden: null,
  linkedin_url: null,
  linkedin_url_hidden: null,
  x_url: null,
  x_url_hidden: null,
  contact_note: null,
  contact_note_hidden: null,
};

function safeText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function joinList(a?: string[] | null, b?: string[] | null): string[] {
  const one = Array.isArray(a) ? a : [];
  const two = Array.isArray(b) ? b : [];
  return Array.from(new Set([...one, ...two].map((x) => String(x).trim()).filter(Boolean)));
}

function formatDateCZ(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("cs-CZ");
}

function maxErr(realAge: number) {
  return Math.max(realAge - 16, 116 - realAge);
}

function computeAwScoreNormPct(realAgeRaw: unknown, awAgeRaw: unknown) {
  const realAge = Number(realAgeRaw);
  const awAge = Number(awAgeRaw);
  if (!Number.isFinite(realAge) || !Number.isFinite(awAge)) return null;
  const me = maxErr(realAge);
  if (!Number.isFinite(me) || me <= 0) return null;
  return 100 + ((awAge - realAge) / me) * 100;
}

function formatAwScoreForUi(rawAwScoreNormPct: number | null) {
  if (rawAwScoreNormPct == null || !Number.isFinite(rawAwScoreNormPct)) return "—";
  if (rawAwScoreNormPct === 100) return "0.0 %";
  if (rawAwScoreNormPct > 100) return `+${(rawAwScoreNormPct - 100).toFixed(1)} %`;
  return `-${(100 - rawAwScoreNormPct).toFixed(1)} %`;
}

function average(values: number[]) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("cs-CZ").format(value);
}

function isMissingOptionalContactColumn(error: unknown) {
  const err = error as { code?: string; message?: string; details?: string; hint?: string } | null;
  const text = `${err?.code ?? ""} ${err?.message ?? ""} ${err?.details ?? ""} ${err?.hint ?? ""}`.toLowerCase();
  return err?.code === "PGRST204" || err?.code === "42703" || CONTACT_PUBLIC_PROFILE_KEYS.some((key) => text.includes(key));
}

async function promptOptionalMessage(title: string) {
  return awPrompt({
    title: "Volitelná zpráva",
    message: title,
    confirmLabel: "Pokračovat",
  });
}

function shouldRecordProfileVisit(viewedUserId: string) {
  if (typeof window === "undefined") return true;

  try {
    const key = `aw-profile-visit:${viewedUserId}`;
    const now = Date.now();
    const last = Number(window.localStorage.getItem(key) ?? 0);

    if (Number.isFinite(last) && now - last < PROFILE_VISIT_THROTTLE_MS) return false;

    window.localStorage.setItem(key, String(now));
    return true;
  } catch {
    return true;
  }
}

function BadgeList({ items }: { items: string[] }) {
  if (!items.length) return <div className="text-sm text-slate-500">—</div>;
  return (
    <span className="inline-flex flex-wrap gap-1.5 align-middle">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800">
          {item}
        </span>
      ))}
    </span>
  );
}

type IntroIconName = "activity" | "briefcase" | "cake" | "calendar" | "chart" | "globe" | "heart" | "link" | "mail" | "ruler" | "school" | "spark" | "star" | "target" | "text";

type IntroItemData = {
  icon: IntroIconName;
  text: React.ReactNode;
};

function compactIntroItems(items: Array<IntroItemData | null>) {
  return items.filter((item): item is IntroItemData => Boolean(item));
}

function IntroPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function IntroList({ items, emptyText }: { items: IntroItemData[]; emptyText?: string }) {
  if (!items.length) return <div className="text-sm leading-6 text-slate-500">{emptyText ?? "Zatím bez dalších informací."}</div>;
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
          <ProfileMiniIcon name={item.icon} />
          <div className="min-w-0 flex-1">{item.text}</div>
        </div>
      ))}
    </div>
  );
}

function NetworkMiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xl font-black text-slate-950">{formatCount(value)}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

function ProfileMiniIcon({ name }: { name: IntroIconName }) {
  const common = "stroke-current";
  return (
    <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {name === "briefcase" ? <><path className={common} d="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1" /><path className={common} d="M4 7h16v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" /><path className={common} d="M4 12h16" /></> : null}
        {name === "school" ? <><path className={common} d="m3 10 9-5 9 5-9 5-9-5Z" /><path className={common} d="M7 12v4c3 2 7 2 10 0v-4" /></> : null}
        {name === "globe" ? <><circle className={common} cx="12" cy="12" r="9" /><path className={common} d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></> : null}
        {name === "cake" ? <><path className={common} d="M4 21h16v-8H4v8Z" /><path className={common} d="M4 16h16M8 13V9M12 13V9M16 13V9" /><path className={common} d="M8 7h.01M12 7h.01M16 7h.01" /></> : null}
        {name === "heart" ? <path className={common} d="M20 8.5c0 5-8 10.5-8 10.5S4 13.5 4 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 2.5Z" /> : null}
        {name === "spark" ? <><path className={common} d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" /><path className={common} d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z" /></> : null}
        {name === "ruler" ? <><path className={common} d="M4 17 17 4l3 3L7 20l-3-3Z" /><path className={common} d="m8 13 2 2M11 10l2 2M14 7l2 2" /></> : null}
        {name === "chart" ? <><path className={common} d="M4 19V5" /><path className={common} d="M4 19h16" /><path className={common} d="M8 15l3-4 3 2 4-6" /></> : null}
        {name === "calendar" ? <><path className={common} d="M5 5h14v15H5V5Z" /><path className={common} d="M8 3v4M16 3v4M5 10h14" /></> : null}
        {name === "text" ? <><path className={common} d="M5 7h14M5 12h14M5 17h9" /></> : null}
        {name === "star" ? <path className={common} d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" /> : null}
        {name === "target" ? <><circle className={common} cx="12" cy="12" r="8" /><circle className={common} cx="12" cy="12" r="4" /><path className={common} d="M12 12h.01" /></> : null}
        {name === "activity" ? <path className={common} d="M4 12h4l2-6 4 12 2-6h4" /> : null}
        {name === "link" ? <><path className={common} d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" /><path className={common} d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" /></> : null}
        {name === "mail" ? <><path className={common} d="M4 6h16v12H4V6Z" /><path className={common} d="m4 7 8 6 8-6" /></> : null}
      </svg>
    </span>
  );
}

function KebabIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  );
}

function PersonChip({ user }: { user: { user_id: string; display_name: string | null; avatar_url: string | null } }) {
  const label = safeText(user.display_name) || user.user_id;
  return (
    <Link href={`/users/${user.user_id}`} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50">
      <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
        {user.avatar_url ? <img src={user.avatar_url} alt={label} className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : label.charAt(0).toUpperCase()}
      </div>
      <span className="text-sm text-slate-800">{label}</span>
    </Link>
  );
}

export default function OtherUserProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [rel, setRel] = useState<RelationshipState>({ kind: "none" });
  const [isFollowing, setIsFollowing] = useState(false);
  const [statsSummary, setStatsSummary] = useState<ProfileStatsSummary>({ awAge: null, awScoreNormPct: null });
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [profileChallenges, setProfileChallenges] = useState<AwChallenge[]>([]);
  const [networkSummary, setNetworkSummary] = useState<SharedNetworkSummary>({
    connections_count: 0,
    following_count: 0,
    followers_count: 0,
    mutual_connections_count: 0,
    common_following_count: 0,
    mutual_connections: [],
    common_following: [],
  });

  const displayName = useMemo(() => safeText(profile?.display_name) || profile?.user_id || "Uživatel", [profile]);
  const initial = displayName.charAt(0).toUpperCase();
  const isConnected = rel.kind === "connected";
  const isSelf = rel.kind === "self";

  async function loadAll() {
    setLoading(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const me = auth.user?.id;
      if (!me) throw new Error("Nejsi přihlášen/a.");

      const { data: p, error: profileError } = await supabase
        .from("user_profiles")
        .select(BASE_PUBLIC_PROFILE_COLUMNS)
        .eq("user_id", userId)
        .single();

      if (profileError) throw profileError;

      const { data: contactData, error: contactError } = await supabase
        .from("user_profiles")
        .select(CONTACT_PUBLIC_PROFILE_COLUMNS)
        .eq("user_id", userId)
        .single();

      if (contactError && !isMissingOptionalContactColumn(contactError)) throw contactError;

      const publicProfile = { ...EMPTY_CONTACT_PUBLIC_PROFILE_FIELDS, ...(p as object), ...((contactData ?? {}) as object) } as PublicProfile;
      setProfile(publicProfile);

      if (publicProfile.account_status === "suspended") {
        setRel({ kind: "none" });
        setIsFollowing(false);
        setProfileChallenges([]);
        setStatsSummary({ awAge: null, awScoreNormPct: null });
        setCoverImages([]);
        setNetworkSummary({
          connections_count: 0,
          following_count: 0,
          followers_count: 0,
          mutual_connections_count: 0,
          common_following_count: 0,
          mutual_connections: [],
          common_following: [],
        });
        return;
      }

      if (me !== userId && shouldRecordProfileVisit(userId)) {
        recordProfileVisit(userId).catch((visitError) => {
          console.warn("users/[userId]: profile visit tracking failed", visitError);
        });
      }

      const { data: challenges, error: challengesError } = await supabase
        .from("aw_challenges")
        .select("*")
        .eq("owner_user_id", userId)
        .in("status", ["active", "completed", "extended"])
        .order("created_at", { ascending: false })
        .limit(6);

      if (challengesError) {
        console.warn("users/[userId]: challenges load failed", challengesError);
        setProfileChallenges([]);
      } else {
        setProfileChallenges((challenges ?? []) as AwChallenge[]);
      }

      try {
        const insights = await getNetworkProfileInsights(userId);
        setNetworkSummary({
          connections_count: insights.connections_count,
          following_count: insights.following_count,
          followers_count: insights.followers_count,
          mutual_connections_count: insights.mutual_connections_count,
          common_following_count: insights.common_following_count,
          mutual_connections: insights.mutual_connections,
          common_following: insights.common_following,
        });
      } catch (networkError) {
        console.warn("users/[userId]: network summary load failed", networkError);
        setNetworkSummary({
          connections_count: 0,
          following_count: 0,
          followers_count: 0,
          mutual_connections_count: 0,
          common_following_count: 0,
          mutual_connections: [],
          common_following: [],
        });
      }

      const currentWindowStart = new Date();
      currentWindowStart.setFullYear(currentWindowStart.getFullYear() - CURRENT_AW_WINDOW_YEARS);

      const { data: images, error: imagesError } = await supabase
        .from("images")
        .select("taken_at, real_age_years, aw_age_image, include_in_global_aw")
        .eq("uploader_user_id", userId)
        .eq("include_in_global_aw", true)
        .not("aw_age_image", "is", null);

      if (imagesError) {
        console.warn("users/[userId]: image stats load failed", imagesError);
        setStatsSummary({ awAge: null, awScoreNormPct: null });
      } else {
        const filtered = (images ?? []).filter((row: any) => {
          const takenAt = row?.taken_at ? new Date(String(row.taken_at)) : null;
          if (!takenAt || Number.isNaN(takenAt.getTime())) return false;
          return takenAt >= currentWindowStart;
        });

        const awAges = filtered
          .map((row: any) => Number(row?.aw_age_image))
          .filter((value: number) => Number.isFinite(value));

        const awScores = filtered
          .map((row: any) => computeAwScoreNormPct(row?.real_age_years, row?.aw_age_image))
          .filter((value: number | null): value is number => value != null && Number.isFinite(value));

        setStatsSummary({ awAge: average(awAges), awScoreNormPct: average(awScores) });
      }

      const { data: coverRows, error: coverError } = await supabase
        .from("images")
        .select("public_url_thumb, public_url_medium, public_url")
        .eq("uploader_user_id", userId)
        .eq("hidden_by_admin", false)
        .order("created_at", { ascending: false })
        .limit(4);

      if (coverError) {
        console.warn("users/[userId]: cover images load failed", coverError);
        setCoverImages([]);
      } else {
        setCoverImages(
          (coverRows ?? [])
            .map((row: any) => row.public_url_thumb ?? row.public_url_medium ?? row.public_url)
            .filter((url: unknown): url is string => typeof url === "string" && url.trim().length > 0)
        );
      }

      const { data: followingRow, error: followingError } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", me)
        .eq("following_id", userId)
        .maybeSingle();

      if (followingError) throw followingError;
      setIsFollowing(Boolean(followingRow));

      if (me === userId) {
        setRel({ kind: "self" });
        return;
      }

      const { data: connectionRows, error: connectionError } = await supabase
        .from("connections")
        .select("user_id_a, user_id_b, status")
        .or(`user_id_a.eq.${me},user_id_b.eq.${me}`)
        .eq("status", "accepted")
        .limit(500);

      if (connectionError) throw connectionError;

      const connected = (connectionRows ?? []).some((row: any) => row.user_id_a === userId || row.user_id_b === userId);
      if (connected) {
        setRel({ kind: "connected" });
        return;
      }

      const [{ data: out, error: outError }, { data: inc, error: incError }] = await Promise.all([
        supabase
          .from("connection_requests")
          .select("id")
          .eq("requester_id", me)
          .eq("target_id", userId)
          .eq("status", "pending")
          .maybeSingle(),
        supabase
          .from("connection_requests")
          .select("id")
          .eq("requester_id", userId)
          .eq("target_id", me)
          .eq("status", "pending")
          .maybeSingle(),
      ]);

      if (outError) throw outError;
      if (incError) throw incError;

      if (out?.id) {
        setRel({ kind: "outgoing_request", requestId: out.id });
        return;
      }

      if (inc?.id) {
        setRel({ kind: "incoming_request", requestId: inc.id });
        return;
      }

      setRel({ kind: "none" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll().catch((e: any) => void awAlert(e?.message ?? "Profil se nepodařilo načíst."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function runBusy(key: string, action: () => Promise<void>) {
    setBusy(key);
    try {
      await action();
      await loadAll();
    } finally {
      setBusy(null);
    }
  }

  async function onRequestConnection() {
    const message = await promptOptionalMessage("Chceš přidat zprávu k žádosti o spojení? Můžeš nechat prázdné.");
    if (message === null) return;
    await runBusy("request", () => requestConnection(userId, message));
  }

  async function onCancelRequest() {
    if (rel.kind !== "outgoing_request") return;
    await runBusy("cancel-request", () => cancelConnectionRequest(rel.requestId));
  }

  async function onAccept() {
    if (rel.kind !== "incoming_request") return;
    await runBusy("accept-request", () => acceptConnectionRequest(rel.requestId));
  }

  async function onDecline() {
    if (rel.kind !== "incoming_request") return;
    const message = await promptOptionalMessage("Chceš přidat zprávu k zamítnutí žádosti? Můžeš nechat prázdné.");
    if (message === null) return;
    await runBusy("decline-request", () => declineConnectionRequest(rel.requestId, message));
  }

  async function onRemoveConnection() {
    if (rel.kind !== "connected") return;
    await runBusy("remove-connection", () => removeConnection(userId));
  }

  async function onFollowToggle() {
    if (isSelf) return;
    await runBusy("toggle-follow", () => (isFollowing ? unfollowUser(userId) : followUser(userId)));
  }

  function visibleValue(hiddenFlag: boolean | null | undefined, value: unknown): React.ReactNode | null {
    if (!(isConnected || isSelf)) return null;
    if (Boolean(hiddenFlag)) return null;
    if (value === null || value === undefined) return null;
    if (typeof value === "string") return value.trim() ? value : null;
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
    if (typeof value === "boolean") return value ? "Ano" : "Ne";
    return String(value);
  }

  function visibleList(hiddenFlag: boolean | null | undefined, values: string[] | null | undefined): React.ReactNode | null {
    if (!(isConnected || isSelf)) return null;
    if (Boolean(hiddenFlag)) return null;
    const items = Array.isArray(values) ? values.filter((value) => safeText(value)) : [];
    return items.length ? <BadgeList items={items} /> : null;
  }

  function visibleContact(hiddenFlag: boolean | null | undefined, value: string | null | undefined, isEmail = false): React.ReactNode | null {
    if (!canSeeGroup(profile?.social_links_visibility ?? (hiddenFlag ? "private" : "contacts"))) return null;
    if (Boolean(hiddenFlag)) return null;
    const clean = safeText(value);
    if (!clean) return null;
    const href = isEmail ? `mailto:${clean}` : clean;
    return (
      <a href={href} target={isEmail ? undefined : "_blank"} rel={isEmail ? undefined : "noreferrer"} className="break-all text-emerald-700 hover:underline">
        {clean}
      </a>
    );
  }

  function canSeeGroup(visibility: "everyone" | "contacts" | "private" | null | undefined) {
    if (isSelf) return true;
    if (visibility === "everyone") return true;
    if (visibility === "private") return false;
    return isConnected;
  }

  function groupedValue(visibility: "everyone" | "contacts" | "private" | null | undefined, hiddenFlag: boolean | null | undefined, value: unknown) {
    if (!canSeeGroup(visibility ?? (hiddenFlag ? "private" : "contacts"))) return null;
    if (Boolean(hiddenFlag)) return null;
    if (value === null || value === undefined) return null;
    if (typeof value === "string") return value.trim() ? value : null;
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
    if (typeof value === "boolean") return value ? "Ano" : "Ne";
    return String(value);
  }

  function groupedList(visibility: "everyone" | "contacts" | "private" | null | undefined, hiddenFlag: boolean | null | undefined, values: string[] | null | undefined) {
    if (!canSeeGroup(visibility ?? (hiddenFlag ? "private" : "contacts"))) return null;
    if (Boolean(hiddenFlag)) return null;
    const items = Array.isArray(values) ? values.filter((value) => safeText(value)) : [];
    return items.length ? <BadgeList items={items} /> : null;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="text-slate-600">Načítám profil…</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="text-slate-700">Uživatel nenalezen.</div>
          <button className="mt-3 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50" onClick={() => router.back()}>
            Zpět
          </button>
        </div>
      </div>
    );
  }

  if (profile.account_status === "suspended") {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-600">
              {initial}
            </div>
            <div>
              <div className="text-xl font-semibold text-slate-900">{displayName}</div>
              <div className="mt-1 text-sm text-slate-600">Tento uživatel byl pozastaven.</div>
            </div>
          </div>
          <button className="mt-5 rounded-xl border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50" onClick={() => router.back()}>
            Zpět
          </button>
        </div>
      </div>
    );
  }

  const canRequest = Boolean(profile.allow_connections ?? true);
  const canFollow = Boolean(profile.allow_following ?? true);
  const canShowAgeInfo =
    canSeeGroup(profile.profile_age_visibility ?? (profile.allow_age_visible === false ? "private" : "contacts")) &&
    Boolean(profile.allow_age_visible ?? true);

  const combinedInterests = joinList(profile.interests, profile.interests_custom);
  const combinedGoals = joinList(profile.life_goals, profile.life_goals_custom);
  const combinedAreas = joinList(profile.improvement_areas, profile.improvement_areas_custom);
  const combinedActivities = joinList(profile.activities, profile.activities_custom);
  const connectionArea = (() => {
    if (isSelf) return null;

    if (rel.kind === "connected") {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/messages?user=${userId}`}
            className="rounded-xl bg-[#32CD32] px-4 py-2 text-sm font-bold text-white hover:bg-[#28b828]"
          >
            Zpráva
          </Link>
          <button type="button" className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-800">
            Ve spojení
          </button>
        </div>
      );
    }

    if (rel.kind === "outgoing_request") {
      return (
        <button
          onClick={() => onCancelRequest().catch((e: any) => void awAlert(e?.message ?? "Chyba"))}
          disabled={busy === "cancel-request"}
          className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
        >
          Žádost odeslána
        </button>
      );
    }

    if (rel.kind === "incoming_request") {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onDecline().catch((e: any) => void awAlert(e?.message ?? "Chyba"))}
            disabled={busy === "decline-request"}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
          >
            Zamítnout
          </button>
          <button
            onClick={() => onAccept().catch((e: any) => void awAlert(e?.message ?? "Chyba"))}
            disabled={busy === "accept-request"}
            className="rounded-xl bg-[#32CD32] px-4 py-2 text-sm font-bold text-white hover:bg-[#28b828] disabled:opacity-60"
          >
            Přijmout
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => onRequestConnection().catch((e: any) => void awAlert(e?.message ?? "Chyba"))}
        disabled={!canRequest || busy === "request"}
        className={`rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60 ${
          canRequest ? "bg-[#32CD32] text-white hover:bg-[#28b828]" : "bg-slate-200 text-slate-500"
        }`}
      >
        {canRequest ? "Požádat o spojení" : "Spojení zakázáno"}
      </button>
    );
  })();

  const networkLine = [
    `${formatCount(networkSummary.connections_count)} spojení`,
    `${formatCount(networkSummary.followers_count)} sledujících`,
    networkSummary.mutual_connections_count > 0 ? `${formatCount(networkSummary.mutual_connections_count)} společných` : null,
  ].filter(Boolean);

  const introItems = compactIntroItems([
    groupedValue(profile.profile_occupation_visibility, profile.occupation_hidden, profile.occupation)
      ? { icon: "briefcase", text: groupedValue(profile.profile_occupation_visibility, profile.occupation_hidden, profile.occupation) }
      : null,
    groupedValue(profile.profile_education_visibility, profile.is_student_hidden, profile.is_student)
      ? { icon: "school", text: profile.is_student ? "Studuje" : "Nestuduje" }
      : null,
    groupedValue(profile.profile_education_visibility, profile.education_level_hidden, profile.education_level)
      ? { icon: "school", text: groupedValue(profile.profile_education_visibility, profile.education_level_hidden, profile.education_level) }
      : null,
    groupedList(profile.profile_languages_visibility, profile.native_languages_hidden, profile.native_languages)
      ? { icon: "globe", text: <>Rodný jazyk: {groupedList(profile.profile_languages_visibility, profile.native_languages_hidden, profile.native_languages)}</> }
      : null,
    groupedList(profile.profile_languages_visibility, profile.other_languages_hidden, profile.other_languages)
      ? { icon: "globe", text: <>Další jazyky: {groupedList(profile.profile_languages_visibility, profile.other_languages_hidden, profile.other_languages)}</> }
      : null,
    canShowAgeInfo && profile.date_of_birth
      ? { icon: "cake", text: <>Narozen/a {formatDateCZ(profile.date_of_birth)}</> }
      : null,
    groupedValue(profile.profile_relationship_visibility, profile.relationship_status_hidden, profile.relationship_status)
      ? { icon: "heart", text: groupedValue(profile.profile_relationship_visibility, profile.relationship_status_hidden, profile.relationship_status) }
      : null,
    groupedValue(profile.profile_motivation_visibility, profile.motivation_text_hidden, profile.motivation_text)
      ? { icon: "spark", text: groupedValue(profile.profile_motivation_visibility, profile.motivation_text_hidden, profile.motivation_text) }
      : null,
    groupedValue(profile.profile_body_visibility, profile.height_cm_hidden, profile.height_cm)
      ? { icon: "ruler", text: `${profile.height_cm} cm` }
      : null,
    groupedValue(profile.profile_body_visibility, profile.weight_kg_hidden, profile.weight_kg)
      ? { icon: "ruler", text: `${profile.weight_kg} kg` }
      : null,
  ]);

  const awItems: IntroItemData[] = canShowAgeInfo
    ? [
        { icon: "chart", text: <>AW věk {statsSummary.awAge !== null ? `${statsSummary.awAge.toFixed(1)} let` : "zatím není dostupný"}</> },
        { icon: "chart", text: <>AW skóre {formatAwScoreForUi(statsSummary.awScoreNormPct)}</> },
      ]
    : [];

  const aboutItems = compactIntroItems([
    visibleValue(profile.bio_contacts_hidden, profile.bio_contacts)
      ? { icon: "text", text: visibleValue(profile.bio_contacts_hidden, profile.bio_contacts) }
      : null,
    visibleValue(profile.about_me_hidden, profile.about_me) ? { icon: "text", text: visibleValue(profile.about_me_hidden, profile.about_me) } : null,
    visibleList(profile.primary_interests_hidden, profile.primary_interests)
      ? { icon: "star", text: <>Primární zájem: {visibleList(profile.primary_interests_hidden, profile.primary_interests)}</> }
      : null,
    visibleList(profile.interests_hidden, combinedInterests) ? { icon: "star", text: <>Zájmy: {visibleList(profile.interests_hidden, combinedInterests)}</> } : null,
    visibleList(profile.life_goals_hidden, combinedGoals) ? { icon: "target", text: <>Cíle: {visibleList(profile.life_goals_hidden, combinedGoals)}</> } : null,
    visibleValue(profile.self_view_hidden, profile.self_view) ? { icon: "spark", text: <>Považuje se za {visibleValue(profile.self_view_hidden, profile.self_view)}</> } : null,
    visibleList(profile.improvement_areas_hidden, combinedAreas)
      ? { icon: "target", text: <>Chce se zlepšit v: {visibleList(profile.improvement_areas_hidden, combinedAreas)}</> }
      : null,
  ]);

  const lifestyleItems = compactIntroItems([
    visibleList(profile.activities_hidden, combinedActivities) ? { icon: "activity", text: <>Pohyb / sport: {visibleList(profile.activities_hidden, combinedActivities)}</> } : null,
    visibleValue(profile.diet_preference_hidden, profile.diet_preference) ? { icon: "activity", text: <>Strava: {visibleValue(profile.diet_preference_hidden, profile.diet_preference)}</> } : null,
    visibleValue(profile.alcohol_use_hidden, profile.alcohol_use) ? { icon: "activity", text: <>Alkohol: {visibleValue(profile.alcohol_use_hidden, profile.alcohol_use)}</> } : null,
    visibleValue(profile.smoking_hidden, profile.smoking) ? { icon: "activity", text: <>Kouření: {visibleValue(profile.smoking_hidden, profile.smoking)}</> } : null,
    !profile.drugs_hidden && (profile.drug_light !== null || profile.drug_hard !== null)
      ? {
          icon: "activity",
          text: (
            <>
              {profile.drug_light !== null ? `Lehké drogy: ${profile.drug_light ? "Ano" : "Ne"}` : null}
              {profile.drug_light !== null && profile.drug_hard !== null ? " · " : null}
              {profile.drug_hard !== null ? `Tvrdé drogy: ${profile.drug_hard ? "Ano" : "Ne"}` : null}
            </>
          ),
        }
      : null,
    visibleValue(profile.mindset_hidden, profile.mindset) ? { icon: "spark", text: <>Mindset: {visibleValue(profile.mindset_hidden, profile.mindset)}</> } : null,
    visibleValue(profile.life_pace_hidden, profile.life_pace) ? { icon: "activity", text: <>Tempo života: {visibleValue(profile.life_pace_hidden, profile.life_pace)}</> } : null,
  ]);

  const contactItems = compactIntroItems([
    visibleContact(profile.instagram_url_hidden, profile.instagram_url) ? { icon: "link", text: <>Instagram: {visibleContact(profile.instagram_url_hidden, profile.instagram_url)}</> } : null,
    visibleContact(profile.facebook_url_hidden, profile.facebook_url) ? { icon: "link", text: <>Facebook: {visibleContact(profile.facebook_url_hidden, profile.facebook_url)}</> } : null,
    visibleContact(profile.tiktok_url_hidden, profile.tiktok_url) ? { icon: "link", text: <>TikTok: {visibleContact(profile.tiktok_url_hidden, profile.tiktok_url)}</> } : null,
    visibleContact(profile.youtube_url_hidden, profile.youtube_url) ? { icon: "link", text: <>YouTube: {visibleContact(profile.youtube_url_hidden, profile.youtube_url)}</> } : null,
    visibleContact(profile.linkedin_url_hidden, profile.linkedin_url) ? { icon: "link", text: <>LinkedIn: {visibleContact(profile.linkedin_url_hidden, profile.linkedin_url)}</> } : null,
    visibleContact(profile.x_url_hidden, profile.x_url) ? { icon: "link", text: <>X: {visibleContact(profile.x_url_hidden, profile.x_url)}</> } : null,
  ]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="overflow-hidden rounded-2xl bg-white">
        <div className="relative h-24 bg-[linear-gradient(135deg,#e8fbe8_0%,#ffffff_48%,#f3f6fb_100%)] sm:h-32">
          {coverImages.length > 0 ? (
            <div className="grid h-full grid-cols-4 gap-1 opacity-95">
              {coverImages.slice(0, 4).map((src, index) => (
                <div key={`${src}-${index}`} className="overflow-hidden bg-slate-100">
                  <img src={src} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}
            </div>
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-white/10 to-transparent" />
        </div>

        <div className="relative px-5 pb-6 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:gap-5">
              <div className="-mt-12 flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-sm sm:-mt-16 sm:h-32 sm:w-32">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="text-3xl font-black text-slate-600">{initial}</span>
                )}
              </div>

              <div className="min-w-0 pt-0 sm:pt-2">
                <h1 className="truncate text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{displayName}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-slate-600">
                  {networkLine.map((item, index) => (
                    <span key={item} className="inline-flex items-center gap-2">
                      {index > 0 ? <span className="h-1 w-1 rounded-full bg-slate-400" /> : null}
                      {item}
                    </span>
                  ))}
                </div>
                {safeText(profile.bio) ? <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">{safeText(profile.bio)}</p> : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              {connectionArea}
              {!isSelf && rel.kind !== "connected" ? (
                <button
                  onClick={() => onFollowToggle().catch((e: any) => void awAlert(e?.message ?? "Chyba"))}
                  disabled={(!canFollow && !isFollowing) || busy === "toggle-follow"}
                  className={`rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60 ${
                    isFollowing
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      : canFollow
                        ? "bg-slate-900 text-white hover:bg-slate-800"
                        : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {isFollowing ? "Sleduješ" : canFollow ? "Sledovat" : "Sledování zakázáno"}
                </button>
              ) : null}
              {!isSelf ? (
                <details className="relative">
                  <summary
                    className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-white text-slate-700 hover:bg-slate-50"
                    style={{ listStyle: "none" }}
                    aria-label="Další akce"
                    title="Další akce"
                  >
                    <span className="sr-only">Další akce</span>
                    <KebabIcon />
                  </summary>
                  <div className="absolute right-0 z-20 mt-2 min-w-[220px] rounded-2xl bg-white p-2 shadow-xl">
                    {rel.kind === "connected" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onFollowToggle().catch((e: any) => void awAlert(e?.message ?? "Chyba"))}
                          disabled={(!canFollow && !isFollowing) || busy === "toggle-follow"}
                          className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                        >
                          {isFollowing ? "Přestat sledovat" : canFollow ? "Sledovat" : "Sledování zakázáno"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveConnection().catch((e: any) => void awAlert(e?.message ?? "Chyba"))}
                          disabled={busy === "remove-connection"}
                          className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                        >
                          Zrušit spojení
                        </button>
                      </>
                    ) : null}
                    {rel.kind === "outgoing_request" ? (
                      <button
                        type="button"
                        onClick={() => onCancelRequest().catch((e: any) => void awAlert(e?.message ?? "Chyba"))}
                        disabled={busy === "cancel-request"}
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                      >
                        Zrušit žádost
                      </button>
                    ) : null}
                    {rel.kind !== "connected" && rel.kind !== "outgoing_request" ? (
                      <div className="px-3 py-2 text-sm text-slate-500">Žádné další akce.</div>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(280px,360px)_1fr]">
        <div className="space-y-5">
          <IntroPanel title="Osobní údaje">
            <IntroList
              items={[
                ...introItems,
                ...awItems,
                profile.created_at ? { icon: "calendar", text: <>Členem od {formatDateCZ(profile.created_at)}</> } : null,
              ].filter((item): item is IntroItemData => Boolean(item))}
              emptyText={
                isConnected || isSelf
                  ? "Uživatel zatím nevyplnil další osobní údaje."
                  : "Další osobní údaje se zobrazí až po navázání spojení."
              }
            />
          </IntroPanel>

          {aboutItems.length > 0 ? (
            <IntroPanel title="O mně">
              <IntroList items={aboutItems} />
            </IntroPanel>
          ) : null}

          {lifestyleItems.length > 0 ? (
            <IntroPanel title="Životní styl">
              <IntroList items={lifestyleItems} />
            </IntroPanel>
          ) : null}

          {contactItems.length > 0 ? (
            <IntroPanel title="Kontakt">
              <IntroList items={contactItems} />
            </IntroPanel>
          ) : null}
        </div>

        <div className="space-y-5">
          {profileChallenges.length > 0 ? (
            <IntroPanel title="Výzvy">
              <div className="space-y-2">
                {profileChallenges.map((challenge) => (
                  <Link
                    key={challenge.id}
                    href={`/challenges/${challenge.id}`}
                    className="block rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:text-emerald-700 hover:underline"
                  >
                    {challenge.title}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {formatAwScoreForUi(challenge.baseline_aw_score_norm_pct)} → {formatAwScoreForUi(challenge.target_aw_score_norm_pct)}
                    </span>
                  </Link>
                ))}
              </div>
            </IntroPanel>
          ) : null}

          <IntroPanel title="Síť">
            <div className="grid gap-3 sm:grid-cols-2">
              <NetworkMiniStat label="Sleduje" value={networkSummary.following_count} />
              <NetworkMiniStat label="Sledující" value={networkSummary.followers_count} />
              <NetworkMiniStat label="Společná spojení" value={networkSummary.mutual_connections_count} />
              <NetworkMiniStat label="Oba sledujete" value={networkSummary.common_following_count} />
            </div>
          </IntroPanel>

          <IntroPanel title="Společná spojení">
            {networkSummary.mutual_connections.length ? (
              <div className="flex flex-wrap gap-2">
                {networkSummary.mutual_connections.map((user) => (
                  <PersonChip key={user.user_id} user={user} />
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">Zatím tu nejsou žádná společná spojení.</div>
            )}
          </IntroPanel>

          <IntroPanel title="Oba sledujete">
            {networkSummary.common_following.length ? (
              <div className="flex flex-wrap gap-2">
                {networkSummary.common_following.map((user) => (
                  <PersonChip key={user.user_id} user={user} />
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">Zatím nesledujete stejné lidi.</div>
            )}
          </IntroPanel>

          <div className="flex justify-end">
            <button className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => router.back()}>
              Zpět
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
