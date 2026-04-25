/**
 * File purpose
 * - API layer for "Moje síť" and profile relationship insights.
 * Main responsibilities
 * - Manage connection requests, follows, blocked users, search, suggestions, and shared network stats.
 * Related APIs, components, or modules
 * - app/network/page.tsx
 * - app/users/[userId]/page.tsx
 * - lib/api/messages
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabase } from "@/lib/supabaseClient";
import { createNetworkNotification } from "@/lib/api/notifications";
import {
  createDeclineMessageThread,
  createRequestMessageThread,
  upgradeRequestThreadToConnected,
} from "@/lib/api/messages";

export type NetworkUserLite = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  connection_since?: string | null;
  following_since?: string | null;
  blocked_reason?: string | null;
  connections_count?: number;
  following_count?: number;
  followers_count?: number;
  mutual_connections_count?: number;
  common_following_count?: number;
  account_status?: string | null;
};

export type NetworkSearchResult = NetworkUserLite & {
  allow_connections: boolean;
  allow_following: boolean;
  connection_state: "none" | "connected" | "outgoing_request" | "incoming_request";
  request_id: string | null;
  is_following: boolean;
};

export type ConnectionRequestRow = {
  id: string;
  requester_id: string;
  target_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
  responded_at: string | null;
  request_message?: string | null;
};

export type NetworkSearchFilters = {
  occupation?: string;
  educationLevel?: string;
  isStudent?: boolean | null;
  nativeLanguage?: string;
  relationshipStatus?: string;
  primaryInterest?: string;
  lifeGoal?: string;
  activity?: string;
  dietPreference?: string;
};

export type NetworkProfileInsights = {
  connections_count: number;
  following_count: number;
  followers_count: number;
  mutual_connections_count: number;
  common_following_count: number;
  mutual_connections: NetworkUserLite[];
  common_following: NetworkUserLite[];
  is_blocked_by_me: boolean;
  blocked_reason: string | null;
};

type SearchProfileRow = {
  user_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  allow_connections: boolean | null;
  allow_following: boolean | null;
  education_level?: string | null;
  education_level_hidden?: boolean | null;
  primary_interests?: string[] | null;
  primary_interests_hidden?: boolean | null;
  life_goals?: string[] | null;
  life_goals_custom?: string[] | null;
  life_goals_hidden?: boolean | null;
  activities?: string[] | null;
  activities_custom?: string[] | null;
  activities_hidden?: boolean | null;
  account_status?: string | null;
};

type ConnectionRow = {
  user_id_a: string | null;
  user_id_b: string | null;
  created_at?: string | null;
};

type FollowRow = {
  follower_id: string | null;
  following_id: string | null;
  created_at?: string | null;
};

type EnrichStats = {
  connections_count: number;
  following_count: number;
  followers_count: number;
  mutual_connections_count: number;
  common_following_count: number;
  connected_ids: Set<string>;
  following_ids: Set<string>;
};

const LEGACY_RELATIONSHIP_STATUS_VALUES: Record<string, string[]> = {
  Single: ["Single", "single"],
  "Ve vztahu": ["Ve vztahu", "in_relationship"],
  "Manželství": ["Manželství", "V manželství", "married"],
  "Rozvedený/á": ["Rozvedený/á", "divorced"],
  "Je to komplikované": ["Je to komplikované", "complicated"],
  "Nechci uvádět": ["Nechci uvádět", "Nechci uvést", "hidden"],
};

const LEGACY_DIET_PREFERENCE_VALUES: Record<string, string[]> = {
  "Vegetarián": ["Vegetarián", "vegetarian"],
  Vegan: ["Vegan", "vegan"],
};

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean)));
}

function getAllowedFilterValues(value: string, legacyMap?: Record<string, string[]>) {
  const normalized = String(value).trim();
  if (!normalized) return [] as string[];
  return uniqueStrings([normalized, ...(legacyMap?.[normalized] ?? [])]);
}

function applyVisibleProfileFieldFilter(queryBuilder: any, hiddenColumn: string) {
  return queryBuilder.not(hiddenColumn, "is", true);
}

function normalizeLooseSearchValue(value: string | null | undefined) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesLooseSearch(text: string | null | undefined, search: string) {
  const normalizedSearch = normalizeLooseSearchValue(search);
  if (!normalizedSearch) return true;
  return normalizeLooseSearchValue(text).includes(normalizedSearch);
}

function matchesLooseSearchInList(values: Array<string | null | undefined> | null | undefined, search: string) {
  const normalizedSearch = normalizeLooseSearchValue(search);
  if (!normalizedSearch) return true;
  return (values ?? []).some((value) => normalizeLooseSearchValue(value).includes(normalizedSearch));
}

function toNetworkUserLite(row: any): NetworkUserLite {
  const suspended = row?.account_status === "suspended";
  return {
    user_id: String(row?.user_id ?? ""),
    display_name: row?.display_name ?? null,
    avatar_url: suspended ? null : row?.avatar_url ?? null,
    bio: suspended ? "Tento uživatel byl pozastaven." : row?.bio ?? null,
    account_status: row?.account_status ?? "active",
  };
}

function isMissingBlockedUsersTableError(error: unknown) {
  const status = Number((error as any)?.status ?? 0);
  const code = String((error as any)?.code ?? "");
  const message = String((error as any)?.message ?? "");

  return (
    status === 404 ||
    code === "PGRST205" ||
    message.includes("Could not find the table 'public.blocked_users'") ||
    message.includes("relation \"public.blocked_users\" does not exist")
  );
}

async function getAuthUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data.user?.id;
  if (!uid) throw new Error("Nejsi přihlášen/a.");
  return uid;
}

async function getUserPrivacy(targetUserId: string): Promise<{
  allow_connections: boolean;
  allow_following: boolean;
}> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("allow_connections, allow_following, account_status")
    .eq("user_id", targetUserId)
    .maybeSingle();

  if (error) throw error;

  if ((data as any)?.account_status === "suspended") {
    return { allow_connections: false, allow_following: false };
  }

  return {
    allow_connections: Boolean((data as any)?.allow_connections ?? true),
    allow_following: Boolean((data as any)?.allow_following ?? true),
  };
}

async function fetchProfiles(userIds: string[]): Promise<Record<string, NetworkUserLite>> {
  const ids = uniqueStrings(userIds);
  if (!ids.length) return {};

  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, avatar_url, bio, account_status")
    .in("user_id", ids);

  if (error) throw error;

  const map: Record<string, NetworkUserLite> = {};
  for (const row of data ?? []) {
    const user = toNetworkUserLite(row);
    if (user.user_id) map[user.user_id] = user;
  }
  return map;
}

async function getMyConnectionMap(me: string) {
  const { data, error } = await supabase
    .from("connections")
    .select("user_id_a, user_id_b, created_at")
    .or(`user_id_a.eq.${me},user_id_b.eq.${me}`)
    .eq("status", "accepted");

  if (error) throw error;

  const out = new Map<string, { created_at: string | null }>();
  for (const row of data ?? []) {
    const otherId = (row as any).user_id_a === me ? (row as any).user_id_b : (row as any).user_id_a;
    if (!otherId) continue;
    out.set(String(otherId), { created_at: (row as any).created_at ?? null });
  }
  return out;
}

async function getMyFollowingMap(me: string) {
  const { data, error } = await supabase.from("follows").select("following_id, created_at").eq("follower_id", me);

  if (error) throw error;

  const out = new Map<string, { created_at: string | null }>();
  for (const row of data ?? []) {
    const otherId = (row as any).following_id;
    if (!otherId) continue;
    out.set(String(otherId), { created_at: (row as any).created_at ?? null });
  }
  return out;
}

async function getMyPendingRequestMaps(me: string) {
  const [{ data: outgoing, error: e1 }, { data: incoming, error: e2 }] = await Promise.all([
    supabase
      .from("connection_requests")
      .select("id, target_id, created_at")
      .eq("requester_id", me)
      .eq("status", "pending"),
    supabase
      .from("connection_requests")
      .select("id, requester_id, created_at")
      .eq("target_id", me)
      .eq("status", "pending"),
  ]);

  if (e1) throw e1;
  if (e2) throw e2;

  const outgoingMap = new Map<string, { id: string; created_at: string | null }>();
  const incomingMap = new Map<string, { id: string; created_at: string | null }>();

  for (const row of outgoing ?? []) {
    const otherId = String((row as any).target_id ?? "");
    const id = String((row as any).id ?? "");
    if (!otherId || !id) continue;
    outgoingMap.set(otherId, { id, created_at: (row as any).created_at ?? null });
  }

  for (const row of incoming ?? []) {
    const otherId = String((row as any).requester_id ?? "");
    const id = String((row as any).id ?? "");
    if (!otherId || !id) continue;
    incomingMap.set(otherId, { id, created_at: (row as any).created_at ?? null });
  }

  return { outgoingMap, incomingMap };
}

async function getAcceptedConnectionRowsForTargets(targetIds: string[]) {
  const ids = uniqueStrings(targetIds);
  if (!ids.length) return [] as ConnectionRow[];

  const [{ data: aRows, error: e1 }, { data: bRows, error: e2 }] = await Promise.all([
    supabase.from("connections").select("user_id_a, user_id_b, created_at").in("user_id_a", ids).eq("status", "accepted"),
    supabase.from("connections").select("user_id_a, user_id_b, created_at").in("user_id_b", ids).eq("status", "accepted"),
  ]);

  if (e1) throw e1;
  if (e2) throw e2;

  const merged = new Map<string, ConnectionRow>();
  for (const row of [...(aRows ?? []), ...(bRows ?? [])]) {
    const userA = String((row as any).user_id_a ?? "");
    const userB = String((row as any).user_id_b ?? "");
    if (!userA || !userB) continue;
    merged.set(`${userA}:${userB}`, row as ConnectionRow);
  }
  return Array.from(merged.values());
}

async function getFollowRowsForTargets(targetIds: string[]) {
  const ids = uniqueStrings(targetIds);
  if (!ids.length) return [] as FollowRow[];

  const [{ data: followerRows, error: e1 }, { data: followingRows, error: e2 }] = await Promise.all([
    supabase.from("follows").select("follower_id, following_id, created_at").in("follower_id", ids),
    supabase.from("follows").select("follower_id, following_id, created_at").in("following_id", ids),
  ]);

  if (e1) throw e1;
  if (e2) throw e2;

  const merged = new Map<string, FollowRow>();
  for (const row of [...(followerRows ?? []), ...(followingRows ?? [])]) {
    const followerId = String((row as any).follower_id ?? "");
    const followingId = String((row as any).following_id ?? "");
    if (!followerId || !followingId) continue;
    merged.set(`${followerId}:${followingId}`, row as FollowRow);
  }
  return Array.from(merged.values());
}

function createEmptyStats(): EnrichStats {
  return {
    connections_count: 0,
    following_count: 0,
    followers_count: 0,
    mutual_connections_count: 0,
    common_following_count: 0,
    connected_ids: new Set<string>(),
    following_ids: new Set<string>(),
  };
}

async function buildUserNetworkStats(me: string, userIds: string[]) {
  const ids = uniqueStrings(userIds);
  const statsMap = new Map<string, EnrichStats>();
  for (const userId of ids) statsMap.set(userId, createEmptyStats());

  if (!ids.length) return statsMap;

  const [connectionRows, followRows, myConnectionMap, myFollowingMap] = await Promise.all([
    getAcceptedConnectionRowsForTargets(ids),
    getFollowRowsForTargets(ids),
    getMyConnectionMap(me),
    getMyFollowingMap(me),
  ]);

  const myConnectionIds = new Set(Array.from(myConnectionMap.keys()));
  const myFollowingIds = new Set(Array.from(myFollowingMap.keys()));

  for (const row of connectionRows) {
    const userA = String(row.user_id_a ?? "");
    const userB = String(row.user_id_b ?? "");
    if (!userA || !userB) continue;

    if (statsMap.has(userA)) {
      const stats = statsMap.get(userA)!;
      stats.connections_count += 1;
      stats.connected_ids.add(userB);
    }

    if (statsMap.has(userB)) {
      const stats = statsMap.get(userB)!;
      stats.connections_count += 1;
      stats.connected_ids.add(userA);
    }
  }

  for (const row of followRows) {
    const followerId = String(row.follower_id ?? "");
    const followingId = String(row.following_id ?? "");
    if (!followerId || !followingId) continue;

    if (statsMap.has(followerId)) {
      const stats = statsMap.get(followerId)!;
      stats.following_count += 1;
      stats.following_ids.add(followingId);
    }

    if (statsMap.has(followingId)) {
      const stats = statsMap.get(followingId)!;
      stats.followers_count += 1;
    }
  }

  for (const userId of ids) {
    const stats = statsMap.get(userId)!;
    stats.mutual_connections_count = Array.from(stats.connected_ids).filter((id) => id !== me && myConnectionIds.has(id)).length;
    stats.common_following_count = Array.from(stats.following_ids).filter((id) => id !== me && myFollowingIds.has(id)).length;
  }

  return statsMap;
}

async function enrichUsersWithNetworkMeta<T extends NetworkUserLite>(me: string, users: T[]): Promise<T[]> {
  const statsMap = await buildUserNetworkStats(me, users.map((user) => user.user_id));
  return users.map((user) => {
    const stats = statsMap.get(user.user_id);
    return {
      ...user,
      connections_count: stats?.connections_count ?? 0,
      following_count: stats?.following_count ?? 0,
      followers_count: stats?.followers_count ?? 0,
      mutual_connections_count: stats?.mutual_connections_count ?? 0,
      common_following_count: stats?.common_following_count ?? 0,
    };
  });
}

function decorateSearchRows(params: {
  rows: SearchProfileRow[];
  connectionMap: Map<string, { created_at: string | null }>;
  followingMap: Map<string, { created_at: string | null }>;
  outgoingMap: Map<string, { id: string; created_at: string | null }>;
  incomingMap: Map<string, { id: string; created_at: string | null }>;
}): NetworkSearchResult[] {
  const { rows, connectionMap, followingMap, outgoingMap, incomingMap } = params;

  return rows.map((row) => {
    const userId = String(row.user_id ?? "");
    const suspended = row.account_status === "suspended";
    const connection = connectionMap.get(userId);
    const following = followingMap.get(userId);
    const outgoing = outgoingMap.get(userId);
    const incoming = incomingMap.get(userId);

    let connectionState: NetworkSearchResult["connection_state"] = "none";
    let requestId: string | null = null;

    if (connection) {
      connectionState = "connected";
    } else if (outgoing) {
      connectionState = "outgoing_request";
      requestId = outgoing.id;
    } else if (incoming) {
      connectionState = "incoming_request";
      requestId = incoming.id;
    }

    return {
      user_id: userId,
      display_name: row.display_name ?? null,
      avatar_url: suspended ? null : row.avatar_url ?? null,
      bio: suspended ? "Tento uživatel byl pozastaven." : row.bio ?? null,
      account_status: row.account_status ?? "active",
      allow_connections: suspended ? false : Boolean(row.allow_connections ?? true),
      allow_following: suspended ? false : Boolean(row.allow_following ?? true),
      connection_state: connectionState,
      request_id: requestId,
      is_following: Boolean(following),
      connection_since: connection?.created_at ?? null,
      following_since: following?.created_at ?? null,
    };
  });
}

async function insertConnection(params: {
  userA: string;
  userB: string;
  requesterId: string;
}) {
  const { userA, userB, requesterId } = params;

  const { error } = await supabase.from("connections").insert({
    user_id_a: userA,
    user_id_b: userB,
    requested_by: requesterId,
    status: "accepted",
  } as any);

  if (error) {
    const msg = String((error as any)?.message ?? "").toLowerCase();
    if (msg.includes("duplicate")) return;
    throw error;
  }
}

function applySearchFilters(queryBuilder: any, filters?: NetworkSearchFilters) {
  const normalized: NetworkSearchFilters = {
    occupation: String(filters?.occupation ?? "").trim(),
    educationLevel: String(filters?.educationLevel ?? "").trim(),
    isStudent: filters?.isStudent,
    nativeLanguage: String(filters?.nativeLanguage ?? "").trim(),
    relationshipStatus: String(filters?.relationshipStatus ?? "").trim(),
    primaryInterest: String(filters?.primaryInterest ?? "").trim(),
    lifeGoal: String(filters?.lifeGoal ?? "").trim(),
    activity: String(filters?.activity ?? "").trim(),
    dietPreference: String(filters?.dietPreference ?? "").trim(),
  };

  if (normalized.occupation) {
    queryBuilder = applyVisibleProfileFieldFilter(queryBuilder, "occupation_hidden").ilike("occupation", `%${normalized.occupation}%`);
  }

  if (normalized.educationLevel) {
    queryBuilder = applyVisibleProfileFieldFilter(queryBuilder, "education_level_hidden").ilike(
      "education_level",
      `%${normalized.educationLevel}%`
    );
  }

  if (typeof normalized.isStudent === "boolean") {
    queryBuilder = applyVisibleProfileFieldFilter(queryBuilder, "is_student_hidden").eq("is_student", normalized.isStudent);
  }

  if (normalized.nativeLanguage) {
    queryBuilder = applyVisibleProfileFieldFilter(queryBuilder, "native_languages_hidden").contains("native_languages", [normalized.nativeLanguage]);
  }

  if (normalized.relationshipStatus) {
    queryBuilder = applyVisibleProfileFieldFilter(queryBuilder, "relationship_status_hidden").in(
      "relationship_status",
      getAllowedFilterValues(normalized.relationshipStatus, LEGACY_RELATIONSHIP_STATUS_VALUES)
    );
  }

  if (normalized.dietPreference) {
    queryBuilder = applyVisibleProfileFieldFilter(queryBuilder, "diet_preference_hidden").in(
      "diet_preference",
      getAllowedFilterValues(normalized.dietPreference, LEGACY_DIET_PREFERENCE_VALUES)
    );
  }

  return queryBuilder;
}

function matchesArrayAndTextFilters(row: SearchProfileRow, filters?: NetworkSearchFilters) {
  const normalized: NetworkSearchFilters = {
    educationLevel: String(filters?.educationLevel ?? "").trim(),
    primaryInterest: String(filters?.primaryInterest ?? "").trim(),
    lifeGoal: String(filters?.lifeGoal ?? "").trim(),
    activity: String(filters?.activity ?? "").trim(),
  };

  if (normalized.educationLevel) {
    if (row.education_level_hidden === true) return false;
    if (!matchesLooseSearch(row.education_level, normalized.educationLevel)) return false;
  }

  if (normalized.primaryInterest) {
    if (row.primary_interests_hidden === true) return false;
    if (!matchesLooseSearchInList(row.primary_interests, normalized.primaryInterest)) return false;
  }

  if (normalized.lifeGoal) {
    if (row.life_goals_hidden === true) return false;
    if (!matchesLooseSearchInList([...(row.life_goals ?? []), ...(row.life_goals_custom ?? [])], normalized.lifeGoal)) return false;
  }

  if (normalized.activity) {
    if (row.activities_hidden === true) return false;
    if (!matchesLooseSearchInList([...(row.activities ?? []), ...(row.activities_custom ?? [])], normalized.activity)) return false;
  }

  return true;
}

export async function getMyNetworkCounts(): Promise<{
  connections: number;
  following: number;
  followers: number;
  incomingRequests: number;
  outgoingRequests: number;
  blocked: number;
}> {
  const me = await getAuthUserId();

  const [
    { count: c1, error: e1 },
    { count: c2, error: e2 },
    { count: c3, error: e3 },
    { count: blockedCount, error: e6 },
  ] = await Promise.all([
    supabase
      .from("connections")
      .select("id", { count: "exact", head: true })
      .or(`user_id_a.eq.${me},user_id_b.eq.${me}`)
      .eq("status", "accepted"),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("follower_id", me),
    supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("following_id", me),
    supabase.from("blocked_users").select("blocker_user_id", { count: "exact", head: true }).eq("blocker_user_id", me),
  ]);

  if (e1) throw e1;
  if (e2) throw e2;
  if (e3) throw e3;
  if (e6 && !isMissingBlockedUsersTableError(e6)) throw e6;

  const [{ count: inReq, error: e4 }, { count: outReq, error: e5 }] = await Promise.all([
    supabase.from("connection_requests").select("id", { count: "exact", head: true }).eq("target_id", me).eq("status", "pending"),
    supabase.from("connection_requests").select("id", { count: "exact", head: true }).eq("requester_id", me).eq("status", "pending"),
  ]);

  if (e4) throw e4;
  if (e5) throw e5;

  return {
    connections: c1 ?? 0,
    following: c2 ?? 0,
    followers: c3 ?? 0,
    incomingRequests: inReq ?? 0,
    outgoingRequests: outReq ?? 0,
    blocked: e6 ? 0 : blockedCount ?? 0,
  };
}

export async function listMyConnections(): Promise<NetworkUserLite[]> {
  const me = await getAuthUserId();

  const { data, error } = await supabase
    .from("connections")
    .select("user_id_a, user_id_b, created_at")
    .or(`user_id_a.eq.${me},user_id_b.eq.${me}`)
    .eq("status", "accepted")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const otherIds = (data ?? []).map((row: any) => (row.user_id_a === me ? row.user_id_b : row.user_id_a));
  const profiles = await fetchProfiles(otherIds);
  const users = otherIds.map((id, index) => ({
    ...(profiles[id] ?? { user_id: id, display_name: null, avatar_url: null, bio: null }),
    connection_since: (data?.[index] as any)?.created_at ?? null,
  }));

  return enrichUsersWithNetworkMeta(me, users);
}

export async function listMyFollowing(): Promise<NetworkUserLite[]> {
  const me = await getAuthUserId();

  const { data, error } = await supabase
    .from("follows")
    .select("following_id, created_at")
    .eq("follower_id", me)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const ids = (data ?? []).map((row: any) => row.following_id);
  const profiles = await fetchProfiles(ids);
  const users = ids.map((id, index) => ({
    ...(profiles[id] ?? { user_id: id, display_name: null, avatar_url: null, bio: null }),
    following_since: (data?.[index] as any)?.created_at ?? null,
  }));

  return enrichUsersWithNetworkMeta(me, users);
}

export async function listMyFollowers(): Promise<NetworkUserLite[]> {
  const me = await getAuthUserId();

  const { data, error } = await supabase
    .from("follows")
    .select("follower_id, created_at")
    .eq("following_id", me)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const ids = (data ?? []).map((row: any) => row.follower_id);
  const profiles = await fetchProfiles(ids);
  const users = ids.map((id) => profiles[id] ?? { user_id: id, display_name: null, avatar_url: null, bio: null });

  return enrichUsersWithNetworkMeta(me, users);
}

export async function listBlockedUsers(): Promise<NetworkUserLite[]> {
  const me = await getAuthUserId();
  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocked_user_id, reason, created_at")
    .eq("blocker_user_id", me)
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingBlockedUsersTableError(error)) return [];
    throw error;
  }

  const ids = (data ?? []).map((row: any) => row.blocked_user_id);
  const profiles = await fetchProfiles(ids);
  const users = ids.map((id, index) => ({
    ...(profiles[id] ?? { user_id: id, display_name: null, avatar_url: null, bio: null }),
    blocked_reason: (data?.[index] as any)?.reason ?? null,
  }));

  return enrichUsersWithNetworkMeta(me, users);
}

export async function listMyRequests(): Promise<{
  incoming: Array<ConnectionRequestRow & { requester?: NetworkUserLite }>;
  outgoing: Array<ConnectionRequestRow & { target?: NetworkUserLite }>;
}> {
  const me = await getAuthUserId();

  const [{ data: incoming, error: e1 }, { data: outgoing, error: e2 }] = await Promise.all([
    supabase
      .from("connection_requests")
      .select("*")
      .eq("target_id", me)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("connection_requests")
      .select("*")
      .eq("requester_id", me)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  if (e1) throw e1;
  if (e2) throw e2;

  const requesterIds = (incoming ?? []).map((row: any) => row.requester_id);
  const targetIds = (outgoing ?? []).map((row: any) => row.target_id);
  const requestIds = uniqueStrings([
    ...(incoming ?? []).map((row: any) => row.id),
    ...(outgoing ?? []).map((row: any) => row.id),
  ]);

  const [{ data: requestThreadRows, error: requestThreadError }, reqProfiles, tgtProfiles] = await Promise.all([
    requestIds.length
      ? supabase
          .from("message_threads")
          .select("connection_request_id, last_message_preview, thread_kind")
          .in("connection_request_id", requestIds)
          .eq("thread_kind", "connection_request_dm")
      : Promise.resolve({ data: [], error: null }),
    fetchProfiles(requesterIds),
    fetchProfiles(targetIds),
  ]);

  if (requestThreadError) throw requestThreadError;

  const requestMessageById = new Map<string, string | null>();
  for (const row of (requestThreadRows ?? []) as Array<Record<string, unknown>>) {
    const requestId = String(row.connection_request_id ?? "");
    if (!requestId) continue;
    requestMessageById.set(requestId, (row.last_message_preview as string | null | undefined) ?? null);
  }

  return {
    incoming: (incoming ?? []).map((row: any) => ({
      ...(row as any),
      requester: reqProfiles[row.requester_id],
      request_message: requestMessageById.get(String(row.id ?? "")) ?? null,
    })),
    outgoing: (outgoing ?? []).map((row: any) => ({
      ...(row as any),
      target: tgtProfiles[row.target_id],
      request_message: requestMessageById.get(String(row.id ?? "")) ?? null,
    })),
  };
}

export async function requestConnection(targetUserId: string, initialMessage?: string | null): Promise<void> {
  const me = await getAuthUserId();
  if (me === targetUserId) throw new Error("Nemůžeš poslat žádost sám/sama sobě.");

  const privacy = await getUserPrivacy(targetUserId);
  if (!privacy.allow_connections) throw new Error("Tento uživatel nepřijímá žádosti o spojení.");

  const { data, error } = await supabase
    .from("connection_requests")
    .insert({
      requester_id: me,
      target_id: targetUserId,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw error;

  const requestId = String((data as any)?.id ?? "");
  if (requestId) {
    const cleanMessage = String(initialMessage ?? "").trim();
    if (cleanMessage) {
      await createRequestMessageThread(requestId, cleanMessage);
    }

    await createNetworkNotification({
      targetUserId,
      type: "connection_request_received",
      entityId: requestId,
    });
  }
}

export async function removeConnection(targetUserId: string): Promise<void> {
  const me = await getAuthUserId();
  if (me === targetUserId) throw new Error("Nemůžeš zrušit spojení sám/sama se sebou.");

  const a = me < targetUserId ? me : targetUserId;
  const b = me < targetUserId ? targetUserId : me;

  const { error } = await supabase
    .from("connections")
    .delete()
    .eq("user_id_a", a)
    .eq("user_id_b", b)
    .eq("status", "accepted");

  if (error) throw error;

  await createNetworkNotification({
    targetUserId,
    type: "connection_removed",
  });
}

export async function cancelConnectionRequest(requestId: string): Promise<void> {
  const me = await getAuthUserId();

  const { data, error } = await supabase
    .from("connection_requests")
    .select("id, requester_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Žádost neexistuje.");
  if ((data as any).requester_id !== me) throw new Error("Tuto žádost může zrušit jen odesílatel.");
  if ((data as any).status !== "pending") return;

  const { error: e2 } = await supabase
    .from("connection_requests")
    .update({ status: "cancelled", responded_at: new Date().toISOString() })
    .eq("id", requestId);

  if (e2) throw e2;
}

export async function acceptConnectionRequest(requestId: string): Promise<void> {
  const me = await getAuthUserId();

  const { data, error } = await supabase
    .from("connection_requests")
    .select("id, requester_id, target_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Žádost neexistuje.");
  if ((data as any).target_id !== me) throw new Error("Tuto žádost může přijmout jen příjemce.");
  if ((data as any).status !== "pending") return;

  const requester = String((data as any).requester_id);
  const target = String((data as any).target_id);
  const a = requester < target ? requester : target;
  const b = requester < target ? target : requester;

  const { error: e1 } = await supabase
    .from("connection_requests")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", requestId);

  if (e1) throw e1;

  await insertConnection({ userA: a, userB: b, requesterId: requester });
  await upgradeRequestThreadToConnected(requestId);

  await createNetworkNotification({
    targetUserId: requester,
    type: "connection_request_accepted",
    entityId: requestId,
  });
}

export async function declineConnectionRequest(requestId: string, declineMessage?: string | null): Promise<void> {
  const me = await getAuthUserId();

  const { data, error } = await supabase
    .from("connection_requests")
    .select("id, requester_id, target_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Žádost neexistuje.");
  if ((data as any).target_id !== me) throw new Error("Tuto žádost může zamítnout jen příjemce.");
  if ((data as any).status !== "pending") return;

  const { error: e2 } = await supabase
    .from("connection_requests")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", requestId);

  if (e2) throw e2;

  const cleanMessage = String(declineMessage ?? "").trim();
  if (cleanMessage) {
    await createDeclineMessageThread(requestId, cleanMessage);
  }

  const requester = String((data as any).requester_id ?? "");
  if (requester) {
    await createNetworkNotification({
      targetUserId: requester,
      type: "connection_request_declined",
      entityId: requestId,
    });
  }
}

export async function followUser(targetUserId: string): Promise<void> {
  const me = await getAuthUserId();
  if (me === targetUserId) throw new Error("Nemůžeš sledovat sám/sama sebe.");

  const privacy = await getUserPrivacy(targetUserId);
  if (!privacy.allow_following) throw new Error("Tento uživatel nepovoluje sledování.");

  const { error } = await supabase.from("follows").insert({
    follower_id: me,
    following_id: targetUserId,
  });

  if (error) {
    const message = String((error as any).message || "").toLowerCase();
    if (message.includes("duplicate")) return;
    throw error;
  }

  await createNetworkNotification({
    targetUserId,
    type: "follow_started",
  });
}

export async function unfollowUser(targetUserId: string): Promise<void> {
  const me = await getAuthUserId();
  const { error } = await supabase.from("follows").delete().eq("follower_id", me).eq("following_id", targetUserId);
  if (error) throw error;

  await createNetworkNotification({
    targetUserId,
    type: "follow_stopped",
  });
}

export async function unblockUser(targetUserId: string): Promise<void> {
  const me = await getAuthUserId();
  const { error } = await supabase.from("blocked_users").delete().eq("blocker_user_id", me).eq("blocked_user_id", targetUserId);
  if (error && !isMissingBlockedUsersTableError(error)) throw error;
}

export async function searchNetworkUsers(query: string, filters?: NetworkSearchFilters): Promise<NetworkSearchResult[]> {
  const me = await getAuthUserId();
  const q = query.trim();
  const hasAdvancedFilters = Object.values(filters ?? {}).some((value) =>
    typeof value === "boolean" ? true : String(value ?? "").trim().length > 0
  );

  if (!q && !hasAdvancedFilters) return [];

  let queryBuilder = supabase
    .from("user_profiles")
    .select(`
      user_id, display_name, avatar_url, bio, account_status, allow_connections, allow_following,
      occupation, occupation_hidden, education_level, education_level_hidden, is_student, is_student_hidden,
      native_languages, native_languages_hidden,
      relationship_status, relationship_status_hidden,
      primary_interests, primary_interests_hidden,
      life_goals, life_goals_custom, life_goals_hidden,
      activities, activities_custom, activities_hidden,
      diet_preference, diet_preference_hidden
    `)
    .neq("user_id", me)
    .eq("account_status", "active");

  if (q) {
    queryBuilder = queryBuilder.or(`display_name.ilike.%${q}%,bio.ilike.%${q}%`);
  }

  queryBuilder = applySearchFilters(queryBuilder, filters)
    .order("display_name", { ascending: true })
    .limit(hasAdvancedFilters ? 200 : 24);

  const { data, error } = await queryBuilder;
  if (error) throw error;

  const [connectionMap, followingMap, requestMaps] = await Promise.all([
    getMyConnectionMap(me),
    getMyFollowingMap(me),
    getMyPendingRequestMaps(me),
  ]);

  const decorated = decorateSearchRows({
    rows: ((data ?? []) as SearchProfileRow[]).filter((row) => matchesArrayAndTextFilters(row, filters)),
    connectionMap,
    followingMap,
    outgoingMap: requestMaps.outgoingMap,
    incomingMap: requestMaps.incomingMap,
  });

  return enrichUsersWithNetworkMeta(me, decorated);
}

export async function listSuggestedNetworkUsers(limit = 12): Promise<NetworkSearchResult[]> {
  const me = await getAuthUserId();

  const { data, error } = await supabase
    .from("user_profiles")
    .select(`
      user_id, display_name, avatar_url, bio, account_status, allow_connections, allow_following,
      primary_interests, primary_interests_hidden, life_goals, life_goals_hidden
    `)
    .neq("user_id", me)
    .eq("account_status", "active")
    .order("display_name", { ascending: true })
    .limit(Math.max(limit * 5, 40));

  if (error) throw error;

  const [connectionMap, followingMap, requestMaps] = await Promise.all([
    getMyConnectionMap(me),
    getMyFollowingMap(me),
    getMyPendingRequestMaps(me),
  ]);

  const decorated = await enrichUsersWithNetworkMeta(
    me,
    decorateSearchRows({
      rows: (data ?? []) as SearchProfileRow[],
      connectionMap,
      followingMap,
      outgoingMap: requestMaps.outgoingMap,
      incomingMap: requestMaps.incomingMap,
    })
  );

  return decorated
    .filter((user) => user.connection_state === "none" && !user.is_following)
    .sort((a, b) => {
      const scoreA = (a.mutual_connections_count ?? 0) * 3 + (a.common_following_count ?? 0) * 2;
      const scoreB = (b.mutual_connections_count ?? 0) * 3 + (b.common_following_count ?? 0) * 2;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return String(a.display_name ?? "").localeCompare(String(b.display_name ?? ""), "cs");
    })
    .slice(0, limit);
}

export async function getNetworkProfileInsights(targetUserId: string): Promise<NetworkProfileInsights> {
  const me = await getAuthUserId();
  const statsMap = await buildUserNetworkStats(me, [targetUserId]);
  const stats = statsMap.get(targetUserId) ?? createEmptyStats();

  const mutualIds = Array.from(stats.connected_ids).filter((id) => id !== me);
  const commonFollowingIds = Array.from(stats.following_ids).filter((id) => id !== me);

  const [myConnectionMap, myFollowingMap, mutualProfiles, commonFollowingProfiles, blockedRow] = await Promise.all([
    getMyConnectionMap(me),
    getMyFollowingMap(me),
    fetchProfiles(mutualIds),
    fetchProfiles(commonFollowingIds),
    supabase
      .from("blocked_users")
      .select("reason")
      .eq("blocker_user_id", me)
      .eq("blocked_user_id", targetUserId)
      .maybeSingle(),
  ]);

  const mutualConnections = Array.from(myConnectionMap.keys() as IterableIterator<string>)
    .filter((id) => stats.connected_ids.has(id))
    .map((id) => mutualProfiles[id] ?? { user_id: id, display_name: null, avatar_url: null, bio: null })
    .slice(0, 8);

  const commonFollowing = Array.from(myFollowingMap.keys() as IterableIterator<string>)
    .filter((id) => stats.following_ids.has(id))
    .map((id) => commonFollowingProfiles[id] ?? { user_id: id, display_name: null, avatar_url: null, bio: null })
    .slice(0, 8);

  if (blockedRow.error && !isMissingBlockedUsersTableError(blockedRow.error)) throw blockedRow.error;

  return {
    connections_count: stats.connections_count,
    following_count: stats.following_count,
    followers_count: stats.followers_count,
    mutual_connections_count: mutualConnections.length,
    common_following_count: commonFollowing.length,
    mutual_connections: mutualConnections,
    common_following: commonFollowing,
    is_blocked_by_me: blockedRow.error ? false : Boolean(blockedRow.data),
    blocked_reason: blockedRow.error ? null : blockedRow.data?.reason ?? null,
  };
}
