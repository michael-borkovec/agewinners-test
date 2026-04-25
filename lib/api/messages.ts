/**
 * File purpose
 * - Client API for private messages and message threads.
 * Main responsibilities
 * - Load threads and messages
 * - Send connected DM messages, replies, reactions, reports and preference changes
 * - Create request / decline message threads
 * - Mark threads as read and load unread count
 * - Fall back to direct table queries when RPC functions are not available
 * Related APIs, components, or modules
 * - supabase/migrations/20260330_messages.sql
 * - supabase/migrations/20260330_messages_phase2.sql
 * - app/messages/page.tsx
 * - components/LeftSidebar.tsx
 * - lib/api/network.ts
 */

import { supabase } from "@/lib/supabaseClient";

export type MessageThreadKind =
  | "connected_dm"
  | "connection_request_dm"
  | "connection_decline_dm"
  | "admin_contact"
  | "admin_support"
  | "moderator_outreach";

export type MessageThreadFolder = "inbox" | "blocked";

export type MessageReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
};

export type MessageThreadListItem = {
  threadId: number;
  threadKind: MessageThreadKind;
  otherUserId: string | null;
  otherDisplayName: string | null;
  otherAvatarUrl: string | null;
  lastMessageId: number | null;
  lastMessageBody: string | null;
  lastMessageCreatedAt: string | null;
  lastMessageSenderUserId: string | null;
  unreadCount: number;
  canReply: boolean;
  threadFolder: MessageThreadFolder;
  isStarred: boolean;
  isMuted: boolean;
  otherLastReadMessageId: number | null;
  otherLastReadAt: string | null;
  otherLastSeenAt: string | null;
  otherIsOnline: boolean;
  isBlockedByMe: boolean;
  hasBlocking: boolean;
};

export type ThreadMessage = {
  id: number;
  threadId: number;
  senderUserId: string;
  body: string;
  createdAt: string;
  senderDisplayName: string | null;
  senderAvatarUrl: string | null;
  replyToMessageId: number | null;
  replyToBody: string | null;
  replyToSenderUserId: string | null;
  reactions: MessageReactionSummary[];
};

type MessageThreadRow = {
  id: number;
  thread_kind: MessageThreadKind;
  connection_request_id: string | null;
  connection_user_id_a: string;
  connection_user_id_b: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;
  last_message_preview: string | null;
};

type ParticipantRow = {
  thread_id: number;
  user_id: string;
  last_read_message_id: number | null;
  last_read_at: string | null;
  is_archived: boolean | null;
  is_muted: boolean | null;
  is_starred?: boolean | null;
  thread_folder?: MessageThreadFolder | null;
};

type MessageRow = {
  id: number;
  thread_id: number;
  sender_user_id: string;
  body: string;
  created_at: string;
  reply_to_message_id?: number | null;
};

const MESSAGE_THREAD_REPORT_REASONS = [
  "Spam / nevyžádané zprávy",
  "Obtěžování / šikana",
  "Sexuální obsah",
  "Rasismus / projev nenávisti",
  "Podvod / manipulace",
  "Ostatní - uveďte v komentáři",
] as const;

export { MESSAGE_THREAD_REPORT_REASONS };
export type MessageThreadReportReason = (typeof MESSAGE_THREAD_REPORT_REASONS)[number];

const unavailableMessageRpcs = new Set<string>();
const MESSAGE_RPC_STORAGE_KEY = "aw-unavailable-message-rpcs";

function toInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function asMessageThreadKind(value: unknown): MessageThreadKind {
  const safe = String(value ?? "");
  if (
    safe === "connected_dm" ||
    safe === "connection_request_dm" ||
    safe === "connection_decline_dm" ||
    safe === "admin_contact" ||
    safe === "admin_support" ||
    safe === "moderator_outreach"
  ) {
    return safe;
  }
  return "connected_dm";
}

function asThreadFolder(value: unknown): MessageThreadFolder {
  return String(value ?? "") === "blocked" ? "blocked" : "inbox";
}

function isMissingRpcError(error: unknown) {
  const message = String((error as { message?: unknown } | null)?.message ?? "").toLowerCase();
  return message.includes("could not find the function") || message.includes("schema cache");
}

function isMissingMessagesSchemaError(error: unknown) {
  const message = String((error as { message?: unknown } | null)?.message ?? "").toLowerCase();
  return (
    isMissingRpcError(error) ||
    message.includes("could not find the table") ||
    message.includes("message_thread_participants") ||
    message.includes("message_threads") ||
    message.includes("message_reactions") ||
    message.includes("blocked_users") ||
    message.includes("public.messages")
  );
}

function isMissingMessageReactionsTableError(error: unknown) {
  const message = String((error as { message?: unknown } | null)?.message ?? "").toLowerCase();
  return message.includes("could not find the table 'public.message_reactions'") || message.includes("message_reactions");
}

function isRetryableMessagesRpcError(error: unknown) {
  const message = String((error as { message?: unknown } | null)?.message ?? "").toLowerCase();
  return (
    isMissingMessagesSchemaError(error) ||
    message.includes("there is no unique or exclusion constraint matching the on conflict specification")
  );
}

function getStoredUnavailableMessageRpcs(): Set<string> {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.sessionStorage.getItem(MESSAGE_RPC_STORAGE_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map((item) => String(item)) : []);
  } catch {
    return new Set<string>();
  }
}

function isMessageRpcUnavailable(name: string) {
  return unavailableMessageRpcs.has(name) || getStoredUnavailableMessageRpcs().has(name);
}

function rememberUnavailableMessageRpc(name: string, error: unknown) {
  if (isMissingRpcError(error)) {
    unavailableMessageRpcs.add(name);
    if (typeof window !== "undefined") {
      try {
        const next = Array.from(new Set([...getStoredUnavailableMessageRpcs(), name]));
        window.sessionStorage.setItem(MESSAGE_RPC_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors and keep in-memory fallback only.
      }
    }
  }
}

function parseReactionSummary(value: unknown): MessageReactionSummary[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      emoji: String((item as Record<string, unknown> | null)?.emoji ?? ""),
      count: toInt((item as Record<string, unknown> | null)?.count),
      reactedByMe: Boolean((item as Record<string, unknown> | null)?.reactedByMe),
    }))
    .filter((item) => item.emoji && item.count > 0);
}

function rpcMessageRowsSupportReactions(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return true;
  return rows.every((row) => Object.prototype.hasOwnProperty.call(row, "reaction_summary"));
}

function compareThreads(a: MessageThreadListItem, b: MessageThreadListItem) {
  const aRank = a.unreadCount > 0 ? 0 : 1;
  const bRank = b.unreadCount > 0 ? 0 : 1;
  if (aRank !== bRank) return aRank - bRank;

  const aTime = a.lastMessageCreatedAt ? new Date(a.lastMessageCreatedAt).getTime() : 0;
  const bTime = b.lastMessageCreatedAt ? new Date(b.lastMessageCreatedAt).getTime() : 0;
  if (aTime !== bTime) return bTime - aTime;

  return b.threadId - a.threadId;
}

export function sortMessageThreads(threads: MessageThreadListItem[]) {
  return [...threads].sort(compareThreads);
}

async function getAuthUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("Nejsi přihlášen/a.");
  return userId;
}

async function getAuthRole(): Promise<string> {
  const me = await getAuthUserId();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("user_id", me)
    .maybeSingle();

  if (error) throw error;
  return String((data as Record<string, unknown> | null)?.role ?? "user");
}

async function getConnectionRequestById(requestId: string) {
  const { data, error } = await supabase
    .from("connection_requests")
    .select("id, requester_id, target_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Žádost o spojení neexistuje.");
  return data as Record<string, unknown>;
}

async function ensureUsersConnected(me: string, otherUserId: string) {
  const a = me < otherUserId ? me : otherUserId;
  const b = me < otherUserId ? otherUserId : me;

  const { data, error } = await supabase
    .from("connections")
    .select("id")
    .eq("user_id_a", a)
    .eq("user_id_b", b)
    .eq("status", "accepted")
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Chat lze otevřít jen s uživatelem, se kterým jsi ve spojení.");
}

async function loadThreadRows(threadIds?: number[]) {
  let query = supabase
    .from("message_threads")
    .select(
      "id, thread_kind, connection_request_id, connection_user_id_a, connection_user_id_b, created_at, updated_at, last_message_at, last_message_preview"
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (threadIds && threadIds.length > 0) {
    query = query.in("id", threadIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as MessageThreadRow[];
}

async function loadParticipantRows(threadIds: number[]) {
  if (!threadIds.length) return [] as ParticipantRow[];

  const { data, error } = await supabase
    .from("message_thread_participants")
    .select("thread_id, user_id, last_read_message_id, last_read_at, is_archived, is_muted, is_starred, thread_folder")
    .in("thread_id", threadIds);

  if (error) throw error;
  return (data ?? []) as ParticipantRow[];
}
async function loadLatestMessagesByThread(threadIds: number[]) {
  if (!threadIds.length) return new Map<number, MessageRow>();

  const { data, error } = await supabase
    .from("messages")
    .select("id, thread_id, sender_user_id, body, created_at")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const map = new Map<number, MessageRow>();
  for (const row of (data ?? []) as MessageRow[]) {
    if (!map.has(row.thread_id)) {
      map.set(row.thread_id, row);
    }
  }
  return map;
}

async function loadUnreadCountsByThread(threadIds: number[], participantRows: ParticipantRow[], me: string) {
  const unreadMap = new Map<number, number>();
  if (!threadIds.length) return unreadMap;

  const { data, error } = await supabase
    .from("messages")
    .select("id, thread_id, sender_user_id")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const readMap = new Map<number, number>();
  for (const participant of participantRows) {
    readMap.set(participant.thread_id, Number(participant.last_read_message_id ?? 0));
  }

  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const threadId = toInt(row.thread_id);
    const messageId = toInt(row.id);
    const senderUserId = String(row.sender_user_id ?? "");
    const lastReadId = readMap.get(threadId) ?? 0;
    if (senderUserId !== me && messageId > lastReadId) {
      unreadMap.set(threadId, (unreadMap.get(threadId) ?? 0) + 1);
    }
  }

  return unreadMap;
}

async function loadProfilesMap(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueIds.length) {
    return new Map<string, { display_name: string | null; avatar_url: string | null }>();
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, display_name, avatar_url")
    .in("user_id", uniqueIds);

  if (error) throw error;

  const map = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    map.set(String(row.user_id ?? ""), {
      display_name: (row.display_name as string | null | undefined) ?? null,
      avatar_url: (row.avatar_url as string | null | undefined) ?? null,
    });
  }
  return map;
}

async function loadPresenceMap(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (!uniqueIds.length) return new Map<string, string | null>();

  const { data, error } = await supabase
    .from("user_presence")
    .select("user_id, last_seen_at")
    .in("user_id", uniqueIds);

  if (error) throw error;

  const map = new Map<string, string | null>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    map.set(String(row.user_id ?? ""), (row.last_seen_at as string | null | undefined) ?? null);
  }
  return map;
}

async function loadBlockingStateMap(me: string, otherUserIds: string[]) {
  const uniqueIds = Array.from(new Set(otherUserIds.filter(Boolean)));
  const map = new Map<string, { isBlockedByMe: boolean; hasBlocking: boolean }>();
  for (const userId of uniqueIds) {
    map.set(userId, { isBlockedByMe: false, hasBlocking: false });
  }
  if (!uniqueIds.length) return map;

  const csv = uniqueIds.join(",");
  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocker_user_id, blocked_user_id")
    .or(`and(blocker_user_id.eq.${me},blocked_user_id.in.(${csv})),and(blocked_user_id.eq.${me},blocker_user_id.in.(${csv}))`);

  if (error) throw error;

  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const blocker = String(row.blocker_user_id ?? "");
    const blocked = String(row.blocked_user_id ?? "");
    const otherUserId = blocker === me ? blocked : blocker;
    const state = map.get(otherUserId) ?? { isBlockedByMe: false, hasBlocking: false };
    state.hasBlocking = true;
    if (blocker === me) state.isBlockedByMe = true;
    map.set(otherUserId, state);
  }

  return map;
}

async function loadMessageReactionsMap(messageIds: number[]) {
  const uniqueIds = Array.from(new Set(messageIds.filter((id) => Number.isFinite(id) && id > 0)));
  const map = new Map<number, MessageReactionSummary[]>();
  if (!uniqueIds.length) return map;

  const me = await getAuthUserId();
  const { data, error } = await supabase
    .from("message_reactions")
    .select("message_id, user_id, emoji")
    .in("message_id", uniqueIds);

  if (error) throw error;

  const grouped = new Map<number, Map<string, { count: number; reactedByMe: boolean }>>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const messageId = toInt(row.message_id);
    const emoji = String(row.emoji ?? "");
    const reactedUserId = String(row.user_id ?? "");
    const perMessage = grouped.get(messageId) ?? new Map<string, { count: number; reactedByMe: boolean }>();
    const reaction = perMessage.get(emoji) ?? { count: 0, reactedByMe: false };
    reaction.count += 1;
    if (reactedUserId === me) reaction.reactedByMe = true;
    perMessage.set(emoji, reaction);
    grouped.set(messageId, perMessage);
  }

  for (const [messageId, reactions] of grouped.entries()) {
    map.set(
      messageId,
      Array.from(reactions.entries()).map(([emoji, summary]) => ({
        emoji,
        count: summary.count,
        reactedByMe: summary.reactedByMe,
      }))
    );
  }

  return map;
}

function mapThreadListRow(row: Record<string, unknown>): MessageThreadListItem {
  return {
    threadId: toInt(row.thread_id),
    threadKind: asMessageThreadKind(row.thread_kind),
    otherUserId: row.other_user_id == null ? null : String(row.other_user_id),
    otherDisplayName: (row.other_display_name as string | null | undefined) ?? null,
    otherAvatarUrl: (row.other_avatar_url as string | null | undefined) ?? null,
    lastMessageId: row.last_message_id == null ? null : toInt(row.last_message_id),
    lastMessageBody: (row.last_message_body as string | null | undefined) ?? null,
    lastMessageCreatedAt: (row.last_message_created_at as string | null | undefined) ?? null,
    lastMessageSenderUserId: (row.last_message_sender_user_id as string | null | undefined) ?? null,
    unreadCount: toInt(row.unread_count),
    canReply: Boolean(row.can_reply),
    threadFolder: asThreadFolder(row.thread_folder),
    isStarred: Boolean(row.is_starred),
    isMuted: Boolean(row.is_muted),
    otherLastReadMessageId: row.other_last_read_message_id == null ? null : toInt(row.other_last_read_message_id),
    otherLastReadAt: (row.other_last_read_at as string | null | undefined) ?? null,
    otherLastSeenAt: (row.other_last_seen_at as string | null | undefined) ?? null,
    otherIsOnline: Boolean(row.other_is_online),
    isBlockedByMe: Boolean(row.is_blocked_by_me),
    hasBlocking: Boolean(row.has_blocking),
  };
}

async function listMyMessageThreadsDirect(): Promise<MessageThreadListItem[]> {
  const me = await getAuthUserId();
  const role = await getAuthRole();
  const { data, error } = await supabase
    .from("message_thread_participants")
    .select("thread_id, user_id, last_read_message_id, last_read_at, is_archived, is_muted, is_starred, thread_folder")
    .eq("user_id", me)
    .eq("is_archived", false);

  if (error) throw error;

  const myParticipants = (data ?? []) as ParticipantRow[];
  const threadIds = myParticipants.map((row) => row.thread_id);
  if (!threadIds.length) return [];

  const [threads, allParticipants, latestMessages] = await Promise.all([
    loadThreadRows(threadIds),
    loadParticipantRows(threadIds),
    loadLatestMessagesByThread(threadIds),
  ]);

  const otherUserIds = allParticipants.filter((row) => row.user_id !== me).map((row) => row.user_id);
  const [profilesMap, unreadMap, presenceMap, blockingStateMap] = await Promise.all([
    loadProfilesMap(otherUserIds),
    loadUnreadCountsByThread(threadIds, myParticipants, me),
    loadPresenceMap(otherUserIds),
    loadBlockingStateMap(me, otherUserIds),
  ]);

  const otherParticipantMap = new Map<number, ParticipantRow>();
  for (const participant of allParticipants) {
    if (participant.user_id !== me && !otherParticipantMap.has(participant.thread_id)) {
      otherParticipantMap.set(participant.thread_id, participant);
    }
  }

  const rows = threads
    .filter((thread) => {
      if (role !== "admin" && role !== "moderator") return true;
      return thread.thread_kind !== "admin_support" && thread.thread_kind !== "moderator_outreach";
    })
    .map((thread) => {
    const myParticipant = myParticipants.find((item) => item.thread_id === thread.id);
    const otherParticipant = otherParticipantMap.get(thread.id);
    const otherUserId =
      thread.thread_kind === "admin_support" || thread.thread_kind === "moderator_outreach"
        ? null
        : (otherParticipant?.user_id ?? (thread.connection_user_id_a === me ? thread.connection_user_id_b : thread.connection_user_id_a));
    const profile = otherUserId ? profilesMap.get(otherUserId) : undefined;
    const lastMessage = latestMessages.get(thread.id);
    const unreadCount = unreadMap.get(thread.id) ?? 0;
    const otherLastSeenAt = otherUserId ? (presenceMap.get(otherUserId) ?? null) : null;
    const otherLastSeenMs = otherLastSeenAt ? new Date(otherLastSeenAt).getTime() : 0;
    const blockingState = otherUserId ? (blockingStateMap.get(otherUserId) ?? { isBlockedByMe: false, hasBlocking: false }) : { isBlockedByMe: false, hasBlocking: false };

    return {
      threadId: thread.id,
      threadKind: thread.thread_kind,
      otherUserId,
      otherDisplayName:
        thread.thread_kind === "admin_support"
          ? "Správce"
          : thread.thread_kind === "moderator_outreach"
            ? "Moderátor"
            : (profile?.display_name ?? null),
      otherAvatarUrl: thread.thread_kind === "admin_support" || thread.thread_kind === "moderator_outreach" ? null : (profile?.avatar_url ?? null),
      lastMessageId: lastMessage?.id ?? null,
      lastMessageBody: lastMessage?.body ?? thread.last_message_preview ?? null,
      lastMessageCreatedAt: lastMessage?.created_at ?? thread.last_message_at ?? null,
      lastMessageSenderUserId: lastMessage?.sender_user_id ?? null,
      unreadCount,
      canReply:
        (
          thread.thread_kind === "connected_dm" ||
          thread.thread_kind === "admin_contact" ||
          thread.thread_kind === "admin_support" ||
          thread.thread_kind === "moderator_outreach"
        ) && !blockingState.hasBlocking,
      threadFolder: asThreadFolder(myParticipant?.thread_folder),
      isStarred: Boolean(myParticipant?.is_starred),
      isMuted: Boolean(myParticipant?.is_muted),
      otherLastReadMessageId: otherParticipant?.last_read_message_id ?? null,
      otherLastReadAt: otherParticipant?.last_read_at ?? null,
      otherLastSeenAt: thread.thread_kind === "admin_support" || thread.thread_kind === "moderator_outreach" ? null : otherLastSeenAt,
      otherIsOnline:
        thread.thread_kind === "admin_support" || thread.thread_kind === "moderator_outreach"
          ? false
          : Boolean(otherLastSeenMs && otherLastSeenMs >= Date.now() - 5 * 60 * 1000),
      isBlockedByMe: thread.thread_kind === "admin_support" || thread.thread_kind === "moderator_outreach" ? false : blockingState.isBlockedByMe,
      hasBlocking: thread.thread_kind === "admin_support" || thread.thread_kind === "moderator_outreach" ? false : blockingState.hasBlocking,
    } satisfies MessageThreadListItem;
    });

  return sortMessageThreads(rows);
}
async function listThreadMessagesDirect(threadId: number, limit = 100): Promise<ThreadMessage[]> {
  const me = await getAuthUserId();
  const { data: membership, error: membershipError } = await supabase
    .from("message_thread_participants")
    .select("thread_id")
    .eq("thread_id", threadId)
    .eq("user_id", me)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) throw new Error("K tomuto vláknu nemáš přístup.");

  const { data, error } = await supabase
    .from("messages")
    .select("id, thread_id, sender_user_id, body, created_at, reply_to_message_id")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;

  const rows = (data ?? []) as MessageRow[];
  const replyIds = Array.from(new Set(rows.map((row) => toInt(row.reply_to_message_id)).filter((id) => id > 0)));
  const [profilesMap, reactionMap] = await Promise.all([
    loadProfilesMap(rows.map((row) => row.sender_user_id)),
    loadMessageReactionsMap(rows.map((row) => row.id)),
  ]);

  const replyMap = new Map<number, MessageRow>();
  if (replyIds.length > 0) {
    const { data: replyRows, error: replyError } = await supabase
      .from("messages")
      .select("id, thread_id, sender_user_id, body, created_at")
      .in("id", replyIds);
    if (replyError) throw replyError;
    for (const row of (replyRows ?? []) as MessageRow[]) {
      replyMap.set(row.id, row);
    }
  }

  return rows.map((row) => {
    const replyMessage = row.reply_to_message_id ? replyMap.get(toInt(row.reply_to_message_id)) : null;
    return {
      id: row.id,
      threadId: row.thread_id,
      senderUserId: row.sender_user_id,
      body: row.body,
      createdAt: row.created_at,
      senderDisplayName: profilesMap.get(row.sender_user_id)?.display_name ?? null,
      senderAvatarUrl: profilesMap.get(row.sender_user_id)?.avatar_url ?? null,
      replyToMessageId: row.reply_to_message_id ?? null,
      replyToBody: replyMessage?.body ?? null,
      replyToSenderUserId: replyMessage?.sender_user_id ?? null,
      reactions: reactionMap.get(row.id) ?? [],
    };
  });
}

async function markThreadReadDirect(threadId: number): Promise<void> {
  const me = await getAuthUserId();
  const { data: latestMessage, error: latestError } = await supabase
    .from("messages")
    .select("id")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) throw latestError;

  const payload = {
    thread_id: threadId,
    user_id: me,
    last_read_message_id: latestMessage ? toInt((latestMessage as Record<string, unknown>).id) : null,
    last_read_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("message_thread_participants")
    .upsert(payload, { onConflict: "thread_id,user_id" });
  if (error) throw error;
}

async function ensureUsersNotBlocked(me: string, otherUserId: string) {
  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocker_user_id, blocked_user_id")
    .or(`and(blocker_user_id.eq.${me},blocked_user_id.eq.${otherUserId}),and(blocker_user_id.eq.${otherUserId},blocked_user_id.eq.${me})`);

  if (error) throw error;
  if ((data ?? []).length > 0) {
    throw new Error("Konverzace je blokovaná. Nejprve uživatele odblokuj.");
  }
}

async function sendThreadMessageDirect(threadId: number, body: string, replyToMessageId?: number | null): Promise<number> {
  const me = await getAuthUserId();
  const cleanBody = String(body ?? "").trim();
  if (!cleanBody) throw new Error("Zpráva je prázdná.");

  const { data: thread, error: threadError } = await supabase
    .from("message_threads")
    .select("id, thread_kind, connection_user_id_a, connection_user_id_b")
    .eq("id", threadId)
    .maybeSingle();

  if (threadError) throw threadError;
  if (!thread) throw new Error("Vlákno neexistuje.");
  const threadKind = asMessageThreadKind((thread as Record<string, unknown>).thread_kind);
  if (
    threadKind !== "connected_dm" &&
    threadKind !== "admin_contact" &&
    threadKind !== "admin_support" &&
    threadKind !== "moderator_outreach"
  ) {
    throw new Error("Do tohoto vlákna zatím nelze odpovědět.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("message_thread_participants")
    .select("thread_id")
    .eq("thread_id", threadId)
    .eq("user_id", me)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) throw new Error("K tomuto vláknu nemáš přístup.");

  const otherUserId =
    threadKind === "admin_support" || threadKind === "moderator_outreach"
      ? null
      : String((thread as Record<string, unknown>).connection_user_id_a ?? "") === me
        ? String((thread as Record<string, unknown>).connection_user_id_b ?? "")
        : String((thread as Record<string, unknown>).connection_user_id_a ?? "");

  if (threadKind === "connected_dm" && otherUserId) {
    await ensureUsersConnected(me, otherUserId);
    await ensureUsersNotBlocked(me, otherUserId);
  }

  if (replyToMessageId) {
    const { data: replyRow, error: replyError } = await supabase
      .from("messages")
      .select("id")
      .eq("id", replyToMessageId)
      .eq("thread_id", threadId)
      .maybeSingle();
    if (replyError) throw replyError;
    if (!replyRow) throw new Error("Na tuto zprávu už nelze odpovědět.");
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("messages")
    .insert({
      thread_id: threadId,
      sender_user_id: me,
      body: cleanBody,
      reply_to_message_id: replyToMessageId ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;

  const messageId = toInt((data as Record<string, unknown> | null)?.id);
  await Promise.all([
    supabase
      .from("message_threads")
      .update({ last_message_at: nowIso, updated_at: nowIso, last_message_preview: cleanBody.slice(0, 160) })
      .eq("id", threadId),
    supabase
      .from("message_thread_participants")
      .update({ last_read_message_id: messageId, last_read_at: nowIso })
      .eq("thread_id", threadId)
      .eq("user_id", me),
  ]);

  return messageId;
}

async function ensureParticipants(threadId: number, userIds: string[]) {
  if (!userIds.length) return;
  const rows = userIds.map((userId) => ({
    thread_id: threadId,
    user_id: userId,
    last_read_message_id: null,
    last_read_at: null,
    is_archived: false,
    is_muted: false,
    is_starred: false,
    thread_folder: "inbox",
  }));
  const { error } = await supabase.from("message_thread_participants").upsert(rows, { onConflict: "thread_id,user_id" });
  if (error) throw error;
}

async function createMessageThreadForConnectionRequestDirect(
  requestId: string,
  body: string | null | undefined,
  threadKind: "connection_request_dm" | "connection_decline_dm"
): Promise<number> {
  const request = await getConnectionRequestById(requestId);
  const requesterId = String(request.requester_id ?? "");
  const targetId = String(request.target_id ?? "");

  const { data: existing, error: existingError } = await supabase
    .from("message_threads")
    .select("id")
    .eq("connection_request_id", requestId)
    .maybeSingle();

  if (existingError) throw existingError;

  let threadId = existing ? toInt((existing as Record<string, unknown>).id) : 0;
  if (!threadId) {
    const { data, error } = await supabase
      .from("message_threads")
      .insert({
        thread_kind: threadKind,
        connection_request_id: requestId,
        connection_user_id_a: requesterId,
        connection_user_id_b: targetId,
      })
      .select("id")
      .single();

    if (error) throw error;
    threadId = toInt((data as Record<string, unknown> | null)?.id);
    await ensureParticipants(threadId, [requesterId, targetId]);
  }

  const cleanBody = String(body ?? "").trim();
  if (cleanBody) {
    const senderUserId = threadKind === "connection_request_dm" ? requesterId : targetId;
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from("messages").insert({
      thread_id: threadId,
      sender_user_id: senderUserId,
      body: cleanBody,
    });
    if (error) throw error;

    await supabase
      .from("message_threads")
      .update({ last_message_at: nowIso, updated_at: nowIso, last_message_preview: cleanBody.slice(0, 160) })
      .eq("id", threadId);
  }

  return threadId;
}

async function upgradeRequestThreadToConnectedDirect(requestId: string): Promise<number> {
  const request = await getConnectionRequestById(requestId);
  const requesterId = String(request.requester_id ?? "");
  const targetId = String(request.target_id ?? "");

  const { data: existing, error: existingError } = await supabase
    .from("message_threads")
    .select("id")
    .eq("connection_request_id", requestId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) {
    const threadId = toInt((existing as Record<string, unknown>).id);
    const { error } = await supabase
      .from("message_threads")
      .update({ thread_kind: "connected_dm" })
      .eq("id", threadId);
    if (error) throw error;
    await ensureParticipants(threadId, [requesterId, targetId]);
    return threadId;
  }

  const me = await getAuthUserId();
  const otherUserId = requesterId === me ? targetId : requesterId;
  return getOrCreateConnectedMessageThreadDirect(otherUserId);
}
async function getOrCreateConnectedMessageThreadDirect(otherUserId: string): Promise<number> {
  const me = await getAuthUserId();
  if (!otherUserId || otherUserId === me) throw new Error("Neplatný kontakt pro chat.");

  await ensureUsersConnected(me, otherUserId);

  const [userA, userB] = me < otherUserId ? [me, otherUserId] : [otherUserId, me];
  const { data: existing, error: existingError } = await supabase
    .from("message_threads")
    .select("id")
    .eq("thread_kind", "connected_dm")
    .eq("connection_user_id_a", userA)
    .eq("connection_user_id_b", userB)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return toInt((existing as Record<string, unknown>).id);

  const { data, error } = await supabase
    .from("message_threads")
    .insert({
      thread_kind: "connected_dm",
      connection_user_id_a: userA,
      connection_user_id_b: userB,
    })
    .select("id")
    .single();

  if (error) throw error;
  const threadId = toInt((data as Record<string, unknown> | null)?.id);
  await ensureParticipants(threadId, [me, otherUserId]);
  return threadId;
}

async function setMessageThreadPreferencesDirect(params: {
  threadId: number;
  isMuted?: boolean;
  isStarred?: boolean;
  threadFolder?: MessageThreadFolder;
}) {
  const me = await getAuthUserId();
  const patch: Record<string, unknown> = {};
  if (typeof params.isMuted === "boolean") patch.is_muted = params.isMuted;
  if (typeof params.isStarred === "boolean") patch.is_starred = params.isStarred;
  if (params.threadFolder) patch.thread_folder = params.threadFolder;

  const { error } = await supabase
    .from("message_thread_participants")
    .update(patch)
    .eq("thread_id", params.threadId)
    .eq("user_id", me);

  if (error) throw error;
}

async function blockUserInThreadDirect(threadId: number, otherUserId: string, reason?: string) {
  const me = await getAuthUserId();
  const cleanReason = String(reason ?? "").trim();
  const { error } = await supabase.from("blocked_users").upsert({
    blocker_user_id: me,
    blocked_user_id: otherUserId,
    reason: cleanReason || null,
  });
  if (error) throw error;
  await setMessageThreadPreferencesDirect({ threadId, threadFolder: "blocked" });
}

async function unblockUserInThreadDirect(threadId: number, otherUserId: string) {
  const me = await getAuthUserId();
  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_user_id", me)
    .eq("blocked_user_id", otherUserId);
  if (error) throw error;
  await setMessageThreadPreferencesDirect({ threadId, threadFolder: "inbox" });
}

async function toggleMessageReactionDirect(messageId: number, emoji: string) {
  const me = await getAuthUserId();
  const { data: existing, error: existingError } = await supabase
    .from("message_reactions")
    .select("message_id")
    .eq("message_id", messageId)
    .eq("user_id", me)
    .eq("emoji", emoji)
    .maybeSingle();
  if (existingError) throw existingError;

  if (existing) {
    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", me)
      .eq("emoji", emoji);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("message_reactions").insert({
    message_id: messageId,
    user_id: me,
    emoji,
  });
  if (error) throw error;
}

async function touchMyPresenceDirect() {
  const me = await getAuthUserId();
  const { error } = await supabase.from("user_presence").upsert(
    {
      user_id: me,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
}

export async function getMyUnreadMessageCount(): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("get_my_unread_message_count");
    if (error) throw error;
    return toInt(data);
  } catch (error) {
    if (isRetryableMessagesRpcError(error)) {
      try {
        const threads = await listMyMessageThreadsDirect();
        return threads
          .filter((thread) => !thread.isMuted && thread.threadFolder === "inbox")
          .reduce((sum, thread) => sum + thread.unreadCount, 0);
      } catch (fallbackError) {
        if (isRetryableMessagesRpcError(fallbackError)) return 0;
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function listMyMessageThreads(): Promise<MessageThreadListItem[]> {
  try {
    const { data, error } = await supabase.rpc("list_my_message_threads");
    if (error) throw error;

    return sortMessageThreads(((data ?? []) as Array<Record<string, unknown>>).map(mapThreadListRow));
  } catch (error) {
    if (isRetryableMessagesRpcError(error)) {
      try {
        return await listMyMessageThreadsDirect();
      } catch (fallbackError) {
        if (isRetryableMessagesRpcError(fallbackError)) return [];
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function listThreadMessages(threadId: number, limit = 100): Promise<ThreadMessage[]> {
  try {
    const { data, error } = await supabase.rpc("list_thread_messages", {
      p_thread_id: threadId,
      p_limit: limit,
    });
    if (error) throw error;

    const rows = ((data ?? []) as Array<Record<string, unknown>>);
    if (!rpcMessageRowsSupportReactions(rows)) {
      return await listThreadMessagesDirect(threadId, limit);
    }

    return rows.map((row) => ({
      id: toInt(row.id),
      threadId: toInt(row.thread_id),
      senderUserId: String(row.sender_user_id ?? ""),
      body: String(row.body ?? ""),
      createdAt: String(row.created_at ?? ""),
      senderDisplayName: (row.sender_display_name as string | null | undefined) ?? null,
      senderAvatarUrl: (row.sender_avatar_url as string | null | undefined) ?? null,
      replyToMessageId: row.reply_to_message_id == null ? null : toInt(row.reply_to_message_id),
      replyToBody: (row.reply_to_body as string | null | undefined) ?? null,
      replyToSenderUserId: (row.reply_to_sender_user_id as string | null | undefined) ?? null,
      reactions: parseReactionSummary(row.reaction_summary),
    }));
  } catch (error) {
    if (isRetryableMessagesRpcError(error)) {
      try {
        return await listThreadMessagesDirect(threadId, limit);
      } catch (fallbackError) {
        if (isRetryableMessagesRpcError(fallbackError)) {
          throw new Error("Systém zpráv ještě není aktivovaný v databázi.");
        }
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function sendThreadMessage(params: {
  threadId: number;
  body: string;
  replyToMessageId?: number | null;
}): Promise<number> {
  if (isMessageRpcUnavailable("send_thread_message")) {
    return sendThreadMessageDirect(params.threadId, params.body, params.replyToMessageId);
  }

  try {
    const { data, error } = await supabase.rpc("send_thread_message", {
      p_thread_id: params.threadId,
      p_body: params.body,
      p_reply_to_message_id: params.replyToMessageId ?? null,
    });
    if (error) throw error;
    return toInt(data);
  } catch (error) {
    rememberUnavailableMessageRpc("send_thread_message", error);
    if (isRetryableMessagesRpcError(error)) {
      try {
        return await sendThreadMessageDirect(params.threadId, params.body, params.replyToMessageId);
      } catch (fallbackError) {
        if (isRetryableMessagesRpcError(fallbackError)) {
          throw new Error("Systém zpráv ještě není aktivovaný v databázi.");
        }
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function markThreadRead(threadId: number): Promise<void> {
  try {
    const { error } = await supabase.rpc("mark_thread_read", {
      p_thread_id: threadId,
    });
    if (error) throw error;
  } catch (error) {
    if (isRetryableMessagesRpcError(error)) {
      try {
        await markThreadReadDirect(threadId);
        return;
      } catch (fallbackError) {
        if (isRetryableMessagesRpcError(fallbackError)) return;
        throw fallbackError;
      }
    }
    throw error;
  }
}
export async function createRequestMessageThread(requestId: string, body?: string | null): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("create_message_thread_for_connection_request", {
      p_request_id: requestId,
      p_initial_body: body ?? null,
      p_thread_kind: "connection_request_dm",
    });
    if (error) throw error;
    return toInt(data);
  } catch (error) {
    if (isRetryableMessagesRpcError(error)) {
      try {
        return await createMessageThreadForConnectionRequestDirect(requestId, body, "connection_request_dm");
      } catch (fallbackError) {
        if (isRetryableMessagesRpcError(fallbackError)) return 0;
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function createDeclineMessageThread(requestId: string, body?: string | null): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("create_message_thread_for_connection_request", {
      p_request_id: requestId,
      p_initial_body: body ?? null,
      p_thread_kind: "connection_decline_dm",
    });
    if (error) throw error;
    return toInt(data);
  } catch (error) {
    if (isRetryableMessagesRpcError(error)) {
      try {
        return await createMessageThreadForConnectionRequestDirect(requestId, body, "connection_decline_dm");
      } catch (fallbackError) {
        if (isRetryableMessagesRpcError(fallbackError)) return 0;
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function upgradeRequestThreadToConnected(requestId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("upgrade_request_message_thread_to_connected", {
      p_request_id: requestId,
    });
    if (error) throw error;
    return toInt(data);
  } catch (error) {
    if (isRetryableMessagesRpcError(error)) {
      try {
        return await upgradeRequestThreadToConnectedDirect(requestId);
      } catch (fallbackError) {
        if (isRetryableMessagesRpcError(fallbackError)) return 0;
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function getOrCreateConnectedMessageThread(otherUserId: string): Promise<number> {
  try {
    const { data, error } = await supabase.rpc("get_or_create_connected_message_thread", {
      p_other_user_id: otherUserId,
    });
    if (error) throw error;
    return toInt(data);
  } catch (error) {
    if (isRetryableMessagesRpcError(error)) {
      try {
        return await getOrCreateConnectedMessageThreadDirect(otherUserId);
      } catch (fallbackError) {
        if (isRetryableMessagesRpcError(fallbackError)) {
          throw new Error("Systém zpráv ještě není aktivovaný v databázi.");
        }
        throw fallbackError;
      }
    }
    throw error;
  }
}

export async function setMessageThreadPreferences(params: {
  threadId: number;
  isMuted?: boolean;
  isStarred?: boolean;
  threadFolder?: MessageThreadFolder;
}) {
  try {
    const { error } = await supabase.rpc("set_message_thread_preferences", {
      p_thread_id: params.threadId,
      p_is_muted: params.isMuted ?? null,
      p_is_starred: params.isStarred ?? null,
      p_thread_folder: params.threadFolder ?? null,
    });
    if (error) throw error;
  } catch (error) {
    if (isRetryableMessagesRpcError(error)) {
      await setMessageThreadPreferencesDirect(params);
      return;
    }
    throw error;
  }
}

export async function blockUserInThread(params: {
  threadId: number;
  otherUserId: string;
  reason?: string;
}) {
  try {
    const { error } = await supabase.rpc("block_message_thread_user", {
      p_thread_id: params.threadId,
      p_other_user_id: params.otherUserId,
      p_reason: params.reason ?? null,
    });
    if (error) throw error;
  } catch (error) {
    if (isRetryableMessagesRpcError(error)) {
      await blockUserInThreadDirect(params.threadId, params.otherUserId, params.reason);
      return;
    }
    throw error;
  }
}

export async function unblockUserInThread(params: { threadId: number; otherUserId: string }) {
  try {
    const { error } = await supabase.rpc("unblock_message_thread_user", {
      p_thread_id: params.threadId,
      p_other_user_id: params.otherUserId,
    });
    if (error) throw error;
  } catch (error) {
    if (isRetryableMessagesRpcError(error)) {
      await unblockUserInThreadDirect(params.threadId, params.otherUserId);
      return;
    }
    throw error;
  }
}

export async function toggleMessageReaction(params: { messageId: number; emoji: string }) {
  if (isMessageRpcUnavailable("toggle_message_reaction")) {
    try {
      await toggleMessageReactionDirect(params.messageId, params.emoji);
      return;
    } catch (error) {
      if (isMissingMessageReactionsTableError(error)) {
        throw new Error("Reakce na zprávy ještě nejsou aktivované v databázi.");
      }
      throw error;
    }
  }

  try {
    const { error } = await supabase.rpc("toggle_message_reaction", {
      p_message_id: params.messageId,
      p_emoji: params.emoji,
    });
    if (error) throw error;
  } catch (error) {
    rememberUnavailableMessageRpc("toggle_message_reaction", error);
    if (isRetryableMessagesRpcError(error)) {
      try {
        await toggleMessageReactionDirect(params.messageId, params.emoji);
        return;
      } catch (fallbackError) {
        if (isMissingMessageReactionsTableError(fallbackError)) {
          throw new Error("Reakce na zprávy ještě nejsou aktivované v databázi.");
        }
        throw fallbackError;
      }
    }
    if (isMissingMessageReactionsTableError(error)) {
      throw new Error("Reakce na zprávy ještě nejsou aktivované v databázi.");
    }
    throw error;
  }
}

export async function reportMessageThread(params: {
  threadId: number;
  reason: MessageThreadReportReason;
  details?: string;
}) {
  const res = await fetch("/api/message-thread-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      threadId: params.threadId,
      reason: params.reason,
      details: params.details ?? "",
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Nahlášení konverzace se nepodařilo.");
  }
}

export async function touchMyPresence() {
  try {
    const { error } = await supabase.rpc("touch_my_presence");
    if (error) throw error;
  } catch (error) {
    if (isRetryableMessagesRpcError(error)) {
      try {
        await touchMyPresenceDirect();
        return;
      } catch (fallbackError) {
        if (isRetryableMessagesRpcError(fallbackError)) return;
        throw fallbackError;
      }
    }
    throw error;
  }
}
