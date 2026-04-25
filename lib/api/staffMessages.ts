/**
 * File purpose
 * - Staff-only shared inbox helpers for moderator/admin conversations.
 * - Reuses the existing messages schema while keeping special inboxes out of regular user DMs.
 * - Related APIs, components, or modules
 *   - lib/api/messages.ts
 *   - app/admin/moderator-messages/page.tsx
 *   - app/admin/admin-messages/page.tsx
 */

import { supabase } from "@/lib/supabaseClient";

export type StaffThreadScope = "admin_support" | "moderator_outreach";

export type StaffThreadListItem = {
  threadId: number;
  threadKind: StaffThreadScope;
  subjectUserId: string;
  subjectDisplayName: string | null;
  subjectAvatarUrl: string | null;
  lastMessageId: number | null;
  lastMessageBody: string | null;
  lastMessageCreatedAt: string | null;
  lastMessageSenderUserId: string | null;
  unreadCount: number;
};

export type StaffInboxUserOption = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

function toInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

async function getAuthUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("Nejsi přihlášen/a.");
  return userId;
}

export async function getOrCreateModeratorOutreachThread(targetUserId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_or_create_moderator_outreach_thread", {
    p_target_user_id: targetUserId,
  });

  if (error) throw error;
  return toInt(data);
}

export async function getOrCreateAdminSupportThread(targetUserId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_or_create_admin_support_thread", {
    p_target_user_id: targetUserId,
  });

  if (error) throw error;
  return toInt(data);
}

export async function listStaffThreads(scope: StaffThreadScope): Promise<StaffThreadListItem[]> {
  const me = await getAuthUserId();

  const { data: participantRows, error: participantError } = await supabase
    .from("message_thread_participants")
    .select("thread_id, last_read_message_id")
    .eq("user_id", me);

  if (participantError) throw participantError;

  const threadIds = (participantRows ?? []).map((row) => toInt((row as Record<string, unknown>).thread_id)).filter((id) => id > 0);
  if (threadIds.length === 0) return [];

  const { data: threadRows, error: threadError } = await supabase
    .from("message_threads")
    .select("id, thread_kind, subject_user_id, last_message_at, last_message_preview")
    .in("id", threadIds)
    .eq("thread_kind", scope)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (threadError) throw threadError;

  const threads = (threadRows ?? []) as Array<Record<string, unknown>>;
  if (threads.length === 0) return [];

  const subjectUserIds = Array.from(
    new Set(
      threads
        .map((row) => String(row.subject_user_id ?? "").trim())
        .filter(Boolean)
    )
  );

  const [{ data: profiles, error: profileError }, { data: messageRows, error: messageError }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", subjectUserIds),
    supabase
      .from("messages")
      .select("id, thread_id, sender_user_id, body, created_at")
      .in("thread_id", threads.map((row) => toInt(row.id)))
      .order("created_at", { ascending: false }),
  ]);

  if (profileError) throw profileError;
  if (messageError) throw messageError;

  const profileById = new Map<string, { displayName: string | null; avatarUrl: string | null }>();
  for (const row of (profiles ?? []) as Array<Record<string, unknown>>) {
    profileById.set(String(row.user_id), {
      displayName: (row.display_name as string | null | undefined) ?? null,
      avatarUrl: (row.avatar_url as string | null | undefined) ?? null,
    });
  }

  const participantByThreadId = new Map<number, number>();
  for (const row of (participantRows ?? []) as Array<Record<string, unknown>>) {
    participantByThreadId.set(toInt(row.thread_id), toInt(row.last_read_message_id));
  }

  const latestMessageByThreadId = new Map<number, Record<string, unknown>>();
  const unreadCountByThreadId = new Map<number, number>();
  for (const row of (messageRows ?? []) as Array<Record<string, unknown>>) {
    const threadId = toInt(row.thread_id);
    if (!latestMessageByThreadId.has(threadId)) latestMessageByThreadId.set(threadId, row);

    const senderUserId = String(row.sender_user_id ?? "");
    const messageId = toInt(row.id);
    const lastReadMessageId = participantByThreadId.get(threadId) ?? 0;
    if (senderUserId !== me && messageId > lastReadMessageId) {
      unreadCountByThreadId.set(threadId, (unreadCountByThreadId.get(threadId) ?? 0) + 1);
    }
  }

  return threads.map((thread) => {
    const threadId = toInt(thread.id);
    const subjectUserId = String(thread.subject_user_id ?? "");
    const profile = profileById.get(subjectUserId);
    const lastMessage = latestMessageByThreadId.get(threadId);

    return {
      threadId,
      threadKind: scope,
      subjectUserId,
      subjectDisplayName: profile?.displayName ?? null,
      subjectAvatarUrl: profile?.avatarUrl ?? null,
      lastMessageId: lastMessage ? toInt(lastMessage.id) : null,
      lastMessageBody: lastMessage ? String(lastMessage.body ?? "") : String(thread.last_message_preview ?? ""),
      lastMessageCreatedAt: lastMessage ? String(lastMessage.created_at ?? "") : null,
      lastMessageSenderUserId: lastMessage ? String(lastMessage.sender_user_id ?? "") : null,
      unreadCount: unreadCountByThreadId.get(threadId) ?? 0,
    };
  });
}

export async function getMyStaffUnreadCounts(): Promise<{ adminSupportUnread: number; moderatorOutreachUnread: number }> {
  const [adminRows, moderatorRows] = await Promise.all([
    listStaffThreads("admin_support").catch(() => []),
    listStaffThreads("moderator_outreach").catch(() => []),
  ]);

  return {
    adminSupportUnread: adminRows.reduce((sum, row) => sum + row.unreadCount, 0),
    moderatorOutreachUnread: moderatorRows.reduce((sum, row) => sum + row.unreadCount, 0),
  };
}

export async function searchStaffInboxUsers(query: string, limit = 12): Promise<StaffInboxUserOption[]> {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  params.set("limit", String(limit));

  const res = await fetch(`/api/admin/staff-users?${params.toString()}`, { method: "GET" });
  if (!res.ok) throw new Error(await res.text());

  const data = (await res.json()) as { users?: StaffInboxUserOption[] };
  return data.users ?? [];
}
