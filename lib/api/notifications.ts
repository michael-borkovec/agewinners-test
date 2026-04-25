/**
 * File purpose
 * - Client API for in-app notifications.
 * Main responsibilities
 * - Load unread notification count and notification list.
 * - Mark notifications as read.
 * - Create network event notifications through RPC.
 * Related APIs, components, or modules
 * - supabase/migrations/20260329_notifications.sql
 * - components/AuthShell.tsx
 * - app/notifications/page.tsx
 */

import { supabase } from "@/lib/supabaseClient";

export type NetworkNotificationType =
  | "connection_request_received"
  | "connection_request_accepted"
  | "connection_request_declined"
  | "connection_removed"
  | "follow_started"
  | "follow_stopped"
  | "photo_commented"
  | "comment_replied";

export type AppNotification = {
  id: number;
  user_id: string;
  actor_user_id: string | null;
  type: NetworkNotificationType;
  entity_id: string | null;
  entity_bigint_id: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  entity_status: string | null;
  request_message: string | null;
  actor: {
    user_id: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  image_owner_user_id: string | null;
};

function toInt(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

async function getAuthUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data.user?.id ?? null;
  if (!userId) throw new Error("Nejsi přihlášen/a.");
  return userId;
}

export async function getMyUnreadNotificationCount(): Promise<number> {
  const userId = await getAuthUserId();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (error) throw error;
  return count ?? 0;
}

export async function listMyNotifications(limit = 50): Promise<AppNotification[]> {
  const userId = await getAuthUserId();

  const { data, error } = await supabase
    .from("notifications")
    .select("id, user_id, actor_user_id, type, entity_id, entity_bigint_id, is_read, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const imageIds = Array.from(
    new Set(
      rows
        .filter((row) => ["photo_commented", "comment_replied"].includes(String(row.type ?? "")))
        .map((row) => toInt(row.entity_bigint_id))
        .filter((id) => id > 0)
    )
  );
  const actorIds = Array.from(
    new Set(rows.map((row) => String(row.actor_user_id ?? "")).filter(Boolean))
  );
  const requestIds = Array.from(
    new Set(
      rows
        .filter((row) => String(row.type ?? "") === "connection_request_received")
        .map((row) => String(row.entity_id ?? ""))
        .filter(Boolean)
    )
  );

  const { data: actorRows, error: actorError } = actorIds.length
    ? await supabase.from("user_profiles").select("user_id, display_name, avatar_url").in("user_id", actorIds)
    : { data: [], error: null };

  if (actorError) throw actorError;

  const { data: requestRows, error: requestError } = requestIds.length
    ? await supabase.from("connection_requests").select("id, status").in("id", requestIds)
    : { data: [], error: null };

  if (requestError) throw requestError;

  const { data: requestThreadRows, error: requestThreadError } = requestIds.length
    ? await supabase
        .from("message_threads")
        .select("connection_request_id, last_message_preview, thread_kind")
        .in("connection_request_id", requestIds)
        .eq("thread_kind", "connection_request_dm")
    : { data: [], error: null };

  if (requestThreadError) throw requestThreadError;

  const { data: imageRows, error: imageError } = imageIds.length
    ? await supabase.from("images").select("id, uploader_user_id").in("id", imageIds)
    : { data: [], error: null };

  if (imageError) throw imageError;

  const actorById = new Map<string, { user_id: string; display_name: string | null; avatar_url: string | null }>();
  for (const row of (actorRows ?? []) as Array<Record<string, unknown>>) {
    const actorId = String(row.user_id ?? "");
    if (!actorId) continue;
    actorById.set(actorId, {
      user_id: actorId,
      display_name: (row.display_name as string | null | undefined) ?? null,
      avatar_url: (row.avatar_url as string | null | undefined) ?? null,
    });
  }

  const requestStatusById = new Map<string, string>();
  for (const row of (requestRows ?? []) as Array<Record<string, unknown>>) {
    const requestId = String(row.id ?? "");
    if (!requestId) continue;
    requestStatusById.set(requestId, String(row.status ?? ""));
  }

  const requestMessageById = new Map<string, string | null>();
  for (const row of (requestThreadRows ?? []) as Array<Record<string, unknown>>) {
    const requestId = String(row.connection_request_id ?? "");
    if (!requestId) continue;
    requestMessageById.set(requestId, (row.last_message_preview as string | null | undefined) ?? null);
  }

  const imageOwnerById = new Map<number, string | null>();
  for (const row of (imageRows ?? []) as Array<Record<string, unknown>>) {
    const imageId = toInt(row.id);
    if (!imageId) continue;
    imageOwnerById.set(imageId, row.uploader_user_id ? String(row.uploader_user_id) : null);
  }

  return rows.map((row) => {
    const actorUserId = row.actor_user_id ? String(row.actor_user_id) : null;
    const entityId = row.entity_id ? String(row.entity_id) : null;
    return {
      id: toInt(row.id),
      user_id: String(row.user_id ?? ""),
      actor_user_id: actorUserId,
      type: String(row.type ?? "") as NetworkNotificationType,
      entity_id: entityId,
      entity_bigint_id: row.entity_bigint_id ? toInt(row.entity_bigint_id) : null,
      is_read: Boolean(row.is_read),
      read_at: row.read_at ? String(row.read_at) : null,
      created_at: String(row.created_at ?? ""),
      entity_status: entityId ? requestStatusById.get(entityId) ?? null : null,
      request_message: entityId ? requestMessageById.get(entityId) ?? null : null,
      actor: actorUserId ? actorById.get(actorUserId) ?? null : null,
      image_owner_user_id: row.entity_bigint_id ? imageOwnerById.get(toInt(row.entity_bigint_id)) ?? null : null,
    };
  });
}

export async function markMyNotificationsRead(notificationIds?: number[]): Promise<void> {
  const userId = await getAuthUserId();

  let query = supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);

  if (notificationIds && notificationIds.length > 0) {
    query = query.in("id", notificationIds);
  }

  const { error } = await query;
  if (error) throw error;
}

export async function createNetworkNotification(params: {
  targetUserId: string;
  type: NetworkNotificationType;
  entityId?: string | null;
  entityBigintId?: number | null;
}): Promise<number> {
  const { data, error } = await supabase.rpc("create_app_notification", {
    p_target_user_id: params.targetUserId,
    p_notification_type: params.type,
    p_entity_id: params.entityId ?? null,
    p_entity_bigint_id: params.entityBigintId ?? null,
  });

  if (error) throw error;
  return toInt(data);
}
