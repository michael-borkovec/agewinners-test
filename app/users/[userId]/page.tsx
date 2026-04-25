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
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800">
          {item}
        </span>
      ))}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

function SectionCard(props: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-bold uppercase tracking-wide text-slate-500">{props.title}</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{props.children}</div>
    </div>
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
        .select(`
          user_id, display_name, avatar_url, date_of_birth, bio, created_at, account_status,
          allow_age_visible, allow_connections, allow_following,
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
        `)
        .eq("user_id", userId)
        .single();

      if (profileError) throw profileError;
      setProfile(p as PublicProfile);

      if ((p as any)?.account_status === "suspended") {
        setRel({ kind: "none" });
        setIsFollowing(false);
        setProfileChallenges([]);
        setStatsSummary({ awAge: null, awScoreNormPct: null });
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

  function detailText(hiddenFlag: boolean | null | undefined, value: unknown) {
    if (!(isConnected || isSelf)) return "—";
    if (Boolean(hiddenFlag)) return "Skryto";
    if (value === null || value === undefined) return "—";
    if (typeof value === "string") return value.trim() ? value : "—";
    if (typeof value === "number") return Number.isFinite(value) ? String(value) : "—";
    if (typeof value === "boolean") return value ? "Ano" : "Ne";
    return String(value);
  }

  function detailList(hiddenFlag: boolean | null | undefined, values: string[] | null | undefined) {
    if (!(isConnected || isSelf)) return <div className="text-sm text-slate-500">—</div>;
    if (Boolean(hiddenFlag)) return <div className="text-sm text-slate-500">Skryto</div>;
    const items = Array.isArray(values) ? values : [];
    return <BadgeList items={items} />;
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
  const canShowAgeInfo = (isConnected || isSelf) && Boolean(profile.allow_age_visible ?? true);

  const combinedInterests = joinList(profile.interests, profile.interests_custom);
  const combinedGoals = joinList(profile.life_goals, profile.life_goals_custom);
  const combinedAreas = joinList(profile.improvement_areas, profile.improvement_areas_custom);
  const combinedActivities = joinList(profile.activities, profile.activities_custom);

  const connectionArea = (() => {
    if (isSelf) return <div className="text-xs text-slate-600">Tohle je tvůj profil.</div>;

    if (rel.kind === "connected") {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold text-emerald-700">Jste ve spojení</div>
          <Link
            href={`/messages?user=${userId}`}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Zprávy
          </Link>
          <button
            onClick={() => onRemoveConnection().catch((e: any) => void awAlert(e?.message ?? "Chyba"))}
            disabled={busy === "remove-connection"}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Zrušit spojení
          </button>
        </div>
      );
    }

    if (rel.kind === "outgoing_request") {
      return (
        <button
          onClick={() => onCancelRequest().catch((e: any) => void awAlert(e?.message ?? "Chyba"))}
          disabled={busy === "cancel-request"}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Zrušit žádost
        </button>
      );
    }

    if (rel.kind === "incoming_request") {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onDecline().catch((e: any) => void awAlert(e?.message ?? "Chyba"))}
            disabled={busy === "decline-request"}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Zamítnout
          </button>
          <button
            onClick={() => onAccept().catch((e: any) => void awAlert(e?.message ?? "Chyba"))}
            disabled={busy === "accept-request"}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
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
        className={`rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-60 ${
          canRequest ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-slate-200 text-slate-500"
        }`}
      >
        {canRequest ? "Požádat o spojení" : "Spojení zakázáno"}
      </button>
    );
  })();

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-100">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={displayName} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <span className="text-lg font-semibold text-slate-600">{initial}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-xl font-semibold text-slate-900">{displayName}</div>
            <div className="mt-1 break-all text-xs text-slate-500">{profile.user_id}</div>
            <div className="mt-2 text-sm text-slate-700">{safeText(profile.bio) || "—"}</div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {connectionArea}

              <button
                onClick={() => onFollowToggle().catch((e: any) => void awAlert(e?.message ?? "Chyba"))}
                disabled={isSelf || (!canFollow && !isFollowing) || busy === "toggle-follow"}
                className={`rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-60 ${
                  isSelf
                    ? "bg-slate-200 text-slate-500"
                    : isFollowing
                    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : canFollow
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isFollowing ? "Přestat sledovat" : canFollow ? "Sledovat" : "Sledování zakázáno"}
              </button>

              {!canRequest && rel.kind === "none" ? <div className="text-xs text-slate-500">Uživatel nepřijímá žádosti o spojení.</div> : null}
              {!canFollow && !isFollowing ? <div className="text-xs text-slate-500">Uživatel nepovoluje sledování.</div> : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <InfoRow label="Spojení" value={networkSummary.connections_count} />
              <InfoRow label="Sleduje" value={networkSummary.following_count} />
              <InfoRow label="Sledující" value={networkSummary.followers_count} />
              <InfoRow label="Společná spojení" value={networkSummary.mutual_connections_count} />
              <InfoRow label="Oba sledujete" value={networkSummary.common_following_count} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="Datum narození" value={canShowAgeInfo ? formatDateCZ(profile.date_of_birth) : "Skryto"} />
          <InfoRow label="AW věk" value={canShowAgeInfo && statsSummary.awAge !== null ? `${statsSummary.awAge.toFixed(1)} let` : canShowAgeInfo ? "—" : "Skryto"} />
          <InfoRow label="AW skóre" value={canShowAgeInfo ? formatAwScoreForUi(statsSummary.awScoreNormPct) : "Skryto"} />
          <InfoRow label="Povolání" value={detailText(profile.occupation_hidden, profile.occupation)} />
          <InfoRow label="Student" value={detailText(profile.is_student_hidden, profile.is_student)} />
          <InfoRow label="Vzdělání" value={detailText(profile.education_level_hidden, profile.education_level)} />
          <InfoRow label="Rodný jazyk" value={detailList(profile.native_languages_hidden, profile.native_languages)} />
          <InfoRow label="Další jazyky" value={detailList(profile.other_languages_hidden, profile.other_languages)} />
          <InfoRow label="Bio pro kontakty" value={detailText(profile.bio_contacts_hidden, profile.bio_contacts)} />
        </div>

        {profileChallenges.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Výzvy</div>
            <div className="mt-3 grid gap-2">
              {profileChallenges.map((challenge) => (
                <Link
                  key={challenge.id}
                  href={`/challenges/${challenge.id}`}
                  className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:text-emerald-700 hover:underline"
                >
                  {challenge.title}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {formatAwScoreForUi(challenge.baseline_aw_score_norm_pct)} → {formatAwScoreForUi(challenge.target_aw_score_norm_pct)}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {!Boolean(profile.primary_interests_hidden) && (profile.primary_interests?.length ?? 0) > 0 ? (
          <div className="mt-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Primární zájem</div>
            <div className="mt-2">
              <BadgeList items={profile.primary_interests ?? []} />
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Společná spojení</div>
            {networkSummary.mutual_connections.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {networkSummary.mutual_connections.map((user) => (
                  <PersonChip key={user.user_id} user={user} />
                ))}
              </div>
            ) : (
              <div className="mt-2 text-sm text-slate-500">Zatím tu nejsou žádná společná spojení.</div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-900">Oba sledujete</div>
            {networkSummary.common_following.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {networkSummary.common_following.map((user) => (
                  <PersonChip key={user.user_id} user={user} />
                ))}
              </div>
            ) : (
              <div className="mt-2 text-sm text-slate-500">Zatím nesledujete stejné lidi.</div>
            )}
          </div>
        </div>

        {!isConnected && !isSelf ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm font-semibold text-slate-800">Více informací</div>
            <div className="mt-1 text-sm text-slate-600">Podrobnější informace uvidíš po navázání spojení, případně pokud nejsou pole skrytá.</div>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <SectionCard title="Identita">
              <InfoRow label="Status" value={detailText(profile.relationship_status_hidden, profile.relationship_status)} />
              <InfoRow label="Motivační věta" value={detailText(profile.motivation_text_hidden, profile.motivation_text)} />
              <InfoRow label="Výška" value={Boolean(profile.height_cm_hidden) ? "Skryto" : profile.height_cm != null ? `${profile.height_cm} cm` : "—"} />
              <InfoRow label="Váha" value={Boolean(profile.weight_kg_hidden) ? "Skryto" : profile.weight_kg != null ? `${profile.weight_kg} kg` : "—"} />
            </SectionCard>

            <SectionCard title="Zájmy">
              <InfoRow label="O mně" value={detailText(profile.about_me_hidden, profile.about_me)} />
              <InfoRow label="Zájmy" value={detailList(profile.interests_hidden, combinedInterests)} />
              <InfoRow label="Životní cíle" value={detailList(profile.life_goals_hidden, combinedGoals)} />
              <InfoRow label="Považuji se za" value={detailText(profile.self_view_hidden, profile.self_view)} />
              <InfoRow label="Chci se zlepšit v" value={detailList(profile.improvement_areas_hidden, combinedAreas)} />
            </SectionCard>

            <SectionCard title="Životní styl">
              <InfoRow label="Pohyb / Sport" value={detailList(profile.activities_hidden, combinedActivities)} />
              <InfoRow label="Strava" value={detailText(profile.diet_preference_hidden, profile.diet_preference)} />
              <InfoRow label="Alkohol" value={detailText(profile.alcohol_use_hidden, profile.alcohol_use)} />
              <InfoRow label="Kouření" value={detailText(profile.smoking_hidden, profile.smoking)} />
              <InfoRow
                label="Drogy"
                value={
                  Boolean(profile.drugs_hidden)
                    ? "Skryto"
                    : profile.drug_light !== null || profile.drug_hard !== null
                    ? (
                        <div className="space-y-1">
                          {profile.drug_light !== null ? <div>Lehké drogy: {profile.drug_light ? "Ano" : "Ne"}</div> : null}
                          {profile.drug_hard !== null ? <div>Tvrdé drogy: {profile.drug_hard ? "Ano" : "Ne"}</div> : null}
                        </div>
                      )
                    : "—"
                }
              />
              <InfoRow label="Mindset" value={detailText(profile.mindset_hidden, profile.mindset)} />
              <InfoRow label="Tempo života" value={detailText(profile.life_pace_hidden, profile.life_pace)} />
            </SectionCard>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <button className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50" onClick={() => router.back()}>
            Zpět
          </button>

          {profile.created_at ? <div className="text-xs text-slate-500">Členem od: {formatDateCZ(profile.created_at)}</div> : null}
        </div>
      </div>
    </div>
  );
}
