/**
 * File purpose
 * - Render the messaging page with a conversation detail panel.
 * Main responsibilities
 * - Open and display one selected conversation
 * - Create a new conversation from my connections
 * - Manage thread preferences, block/report actions, replies and reactions
 * - Keep selection synchronized through URL query params for sidebar integration
 * Related APIs, components, or modules
 * - lib/api/messages
 * - lib/api/network
 * - components/LeftSidebar.tsx
 * - components/ReportThreadModal.tsx
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Avatar from "@/components/avatar";
import { PageSectionTitle } from "@/components/PageSectionTitle";
import AwButton from "@/components/AwButton";
import CloseButton from "@/components/CloseButton";
import { awAlert } from "@/components/AwDialog";
import { useAuth } from "@/components/auth/AuthContext";
import { BASIC_EMOJIS, QUICK_REACTIONS, normalizeTypedEmoji } from "@/lib/utils/emoji";
import { listMyConnections, type NetworkUserLite } from "@/lib/api/network";
import ReportThreadModal from "@/components/ReportThreadModal";
import {
  blockUserInThread,
  getOrCreateConnectedMessageThread,
  listMyMessageThreads,
  listThreadMessages,
  markThreadRead,
  sendThreadMessage,
  setMessageThreadPreferences,
  toggleMessageReaction,
  touchMyPresence,
  unblockUserInThread,
  type MessageThreadKind,
  type MessageThreadListItem,
  type ThreadMessage,
} from "@/lib/api/messages";

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  const maybeMessage = (error as { message?: unknown } | null)?.message;
  if (typeof maybeMessage === "string" && maybeMessage.trim()) return maybeMessage;
  return fallback;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("cs-CZ");
}

function formatReadReceipt(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}. ${day}. ${hours}:${minutes}`;
}

function threadKindLabel(kind: MessageThreadKind) {
  if (kind === "connected_dm") return "Chat";
  if (kind === "admin_contact") return "Zpráva správci";
  if (kind === "admin_support") return "Admin zprávy";
  if (kind === "moderator_outreach") return "Moderátor zprávy";
  if (kind === "connection_request_dm") return "Žádost o spojení";
  return "Zamítnutí žádosti";
}

function isSpecialStaffThread(kind: MessageThreadKind) {
  return kind === "admin_support" || kind === "moderator_outreach";
}

function getThreadPeerLabel(thread: MessageThreadListItem | null) {
  if (!thread) return "Kontakt";
  return thread.otherDisplayName ?? thread.otherUserId ?? "Kontakt";
}

function initialFromName(name: string | null | undefined) {
  const safe = (name ?? "").trim();
  return safe ? safe.charAt(0).toUpperCase() : "U";
}

function matchesContactQuery(user: NetworkUserLite, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return false;

  return [user.display_name ?? "", user.bio ?? "", user.user_id].some((value) =>
    String(value).toLowerCase().includes(q)
  );
}

function formatPresence(thread: MessageThreadListItem | null) {
  if (!thread) return "";
  if (isSpecialStaffThread(thread.threadKind)) return "";
  if (thread.otherIsOnline) return "Online";
  if (thread.otherLastSeenAt) return `Naposledy aktivní ${formatDateTime(thread.otherLastSeenAt)}`;
  return "Stav není k dispozici";
}

function getMessageReceiptState(thread: MessageThreadListItem | null, message: ThreadMessage, isMine: boolean) {
  if (!thread || !isMine) return null;
  const wasRead = Boolean(thread.otherLastReadMessageId && thread.otherLastReadMessageId >= message.id);
  return {
    label: wasRead ? `Precteno ${formatReadReceipt(thread.otherLastReadAt)}` : "Odesláno",
    icon: wasRead ? "??" : "?",
    className: wasRead ? "text-sky-200" : "text-emerald-50/80",
  };
}

function toggleReactionInMessages(messages: ThreadMessage[], messageId: number, emoji: string) {
  return messages.map((message) => {
    if (message.id !== messageId) return message;

    const existingReaction = message.reactions.find((reaction) => reaction.emoji === emoji);
    if (!existingReaction) {
      return {
        ...message,
        reactions: [...message.reactions, { emoji, count: 1, reactedByMe: true }].sort((a, b) =>
          a.emoji.localeCompare(b.emoji, "cs")
        ),
      };
    }

    if (existingReaction.reactedByMe) {
      const nextReactions = message.reactions
        .map((reaction) => {
          if (reaction.emoji !== emoji) return reaction;
          const nextCount = reaction.count - 1;
          if (nextCount <= 0) return null;
          return {
            ...reaction,
            count: nextCount,
            reactedByMe: false,
          };
        })
        .filter((reaction): reaction is NonNullable<typeof reaction> => reaction !== null);

      return {
        ...message,
        reactions: nextReactions,
      };
    }

    return {
      ...message,
      reactions: message.reactions
        .map((reaction) =>
          reaction.emoji === emoji
            ? {
                ...reaction,
                count: reaction.count + 1,
                reactedByMe: true,
              }
            : reaction
        )
        .sort((a, b) => a.emoji.localeCompare(b.emoji, "cs")),
    };
  });
}

export default function MessagesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userId } = useAuth();
  const openUserId = searchParams.get("user");
  const threadParam = Number(searchParams.get("thread") ?? 0) || null;

  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<MessageThreadListItem[]>([]);
  const [connections, setConnections] = useState<NetworkUserLite[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);
  const [contactQuery, setContactQuery] = useState("");
  const [openingThreadForUserId, setOpeningThreadForUserId] = useState<string | null>(null);
  const [messagesSystemNotice, setMessagesSystemNotice] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(threadParam);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ThreadMessage | null>(null);
  const [reactionPickerForMessageId, setReactionPickerForMessageId] = useState<number | null>(null);
  const [localReplyPreviewByMessageId, setLocalReplyPreviewByMessageId] = useState<
    Record<number, { senderUserId: string; senderName: string; body: string }>
  >({});
  const composerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const threadsPollingRef = useRef<number | null>(null);
  const messagesPollingRef = useRef<number | null>(null);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.threadId === selectedThreadId) ?? null,
    [threads, selectedThreadId]
  );
  const selectedThreadLabel = getThreadPeerLabel(selectedThread);
  const selectedThreadPresence = formatPresence(selectedThread);
  const canOpenSelectedProfile = Boolean(selectedThread?.otherUserId) && !isSpecialStaffThread(selectedThread?.threadKind ?? "connected_dm");
  const canModerateSelectedUser = Boolean(selectedThread?.otherUserId);

  const filteredConnections = useMemo(() => {
    const query = contactQuery.trim();
    if (!query) return connections;
    return connections.filter((user) => matchesContactQuery(user, query));
  }, [connections, contactQuery]);

  function replaceQuery(next: { thread?: number | null; user?: string | null }) {
    const params = new URLSearchParams(searchParams.toString());

    if (next.thread === null || next.thread === undefined) {
      params.delete("thread");
    } else {
      params.set("thread", String(next.thread));
    }

    if (!next.user) {
      params.delete("user");
    } else {
      params.set("user", next.user);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  async function loadThreads(preferredThreadId?: number | null) {
    setLoading(true);
    try {
      const [threadsResult, connectionsResult] = await Promise.allSettled([listMyMessageThreads(), listMyConnections()]);
      const safeThreads = threadsResult.status === "fulfilled" ? threadsResult.value : [];

      if (connectionsResult.status === "fulfilled") {
        setConnections(connectionsResult.value);
      } else {
        throw connectionsResult.reason;
      }

      if (threadsResult.status === "fulfilled") {
        setThreads(threadsResult.value);
        setMessagesSystemNotice(null);
      } else {
        setThreads([]);
        const message = threadsResult.reason instanceof Error ? threadsResult.reason.message : "Systém zpráv se nepodarilo nacíst.";
        setMessagesSystemNotice(message);
      }

      const fallbackThreadId = preferredThreadId ?? threadParam ?? selectedThreadId ?? (safeThreads.length > 0 ? safeThreads[0].threadId : null);
      setSelectedThreadId(fallbackThreadId);
    } catch (e: any) {
      await awAlert(e?.message ?? "Zprávy se nepodarilo nacíst.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(threadId: number) {
    setMessagesLoading(true);
    try {
      const rows = await listThreadMessages(threadId, 200);
      setMessages(rows);
      const openedThread = threads.find((thread) => thread.threadId === threadId);
      const hadUnread = (openedThread?.unreadCount ?? 0) > 0;

      if (hadUnread) {
        await markThreadRead(threadId);
        setThreads((current) =>
          current.map((thread) => (thread.threadId === threadId ? { ...thread, unreadCount: 0 } : thread))
        );
        window.dispatchEvent(new Event("aw-messages-changed"));
      }
    } catch (e: any) {
      await awAlert(e?.message ?? "Konverzaci se nepodarilo nacíst.");
    } finally {
      setMessagesLoading(false);
    }
  }

  async function refreshThreadsSilently(preferredThreadId?: number | null) {
    try {
      const rows = await listMyMessageThreads();
      setThreads(rows);
      setMessagesSystemNotice(null);

      if (preferredThreadId != null) {
        setSelectedThreadId((current) => current ?? preferredThreadId);
      }
    } catch {
      // Ignore silent polling errors.
    }
  }

  async function refreshMessagesSilently(threadId: number) {
    try {
      const rows = await listThreadMessages(threadId, 200);
      setMessages(rows);
    } catch {
      // Ignore silent polling errors.
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        let preferredThreadId: number | null = threadParam;

        if (openUserId) {
          preferredThreadId = await getOrCreateConnectedMessageThread(openUserId);
          if (!cancelled) replaceQuery({ thread: preferredThreadId, user: null });
        }

        if (!cancelled) {
          await loadThreads(preferredThreadId);
        }
      } catch (e: any) {
        if (!cancelled) {
          await awAlert(e?.message ?? "Nepodarilo se otevrít chat.");
          await loadThreads(threadParam);
        }
      }
    }

    void init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openUserId, threadParam]);

  useEffect(() => {
    if (threadParam !== selectedThreadId) {
      setSelectedThreadId(threadParam);
    }
  }, [threadParam, selectedThreadId]);

  useEffect(() => {
    if (!selectedThreadId) {
      setMessages([]);
      return;
    }

    void loadMessages(selectedThreadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThreadId]);

  useEffect(() => {
    if (threadsPollingRef.current) {
      window.clearInterval(threadsPollingRef.current);
      threadsPollingRef.current = null;
    }

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void refreshThreadsSilently(selectedThreadId);
    };

    threadsPollingRef.current = window.setInterval(tick, 12000);

    return () => {
      if (threadsPollingRef.current) {
        window.clearInterval(threadsPollingRef.current);
        threadsPollingRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThreadId]);

  useEffect(() => {
    if (messagesPollingRef.current) {
      window.clearInterval(messagesPollingRef.current);
      messagesPollingRef.current = null;
    }

    if (!selectedThreadId) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void refreshMessagesSilently(selectedThreadId);
    };

    messagesPollingRef.current = window.setInterval(tick, 4000);

    return () => {
      if (messagesPollingRef.current) {
        window.clearInterval(messagesPollingRef.current);
        messagesPollingRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThreadId]);

  useEffect(() => {
    void touchMyPresence();
    const presenceTimer = window.setInterval(() => {
      void touchMyPresence();
    }, 60000);

    return () => {
      window.clearInterval(presenceTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThreadId]);

  async function openThreadForUser(userId: string) {
    setOpeningThreadForUserId(userId);
    try {
      const threadId = await getOrCreateConnectedMessageThread(userId);
      setComposerOpen(false);
      setContactQuery("");
      setMessagesSystemNotice(null);
      setSelectedThreadId(threadId);
      replaceQuery({ thread: threadId, user: null });
      await loadThreads(threadId);
    } catch (e: any) {
      await awAlert(e?.message ?? "Chat se nepodarilo otevrít.");
    } finally {
      setOpeningThreadForUserId(null);
    }
  }

  async function handleSend() {
    if (!selectedThread?.canReply || !selectedThreadId) return;

    const cleanDraft = draft.trim();
    if (!cleanDraft) return;

    setSending(true);
    try {
      const createdMessageId = await sendThreadMessage({
        threadId: selectedThreadId,
        body: cleanDraft,
        replyToMessageId: replyTarget?.id ?? null,
      });
      if (replyTarget) {
        setLocalReplyPreviewByMessageId((current) => ({
          ...current,
          [createdMessageId]: {
            senderUserId: replyTarget.senderUserId,
            senderName:
              replyTarget.senderDisplayName ??
              (replyTarget.senderUserId === userId ? "Ty" : selectedThreadLabel),
            body: replyTarget.body,
          },
        }));
      }
      setDraft("");
      setReplyTarget(null);
      await loadThreads(selectedThreadId);
      await loadMessages(selectedThreadId);
      window.dispatchEvent(new Event("aw-messages-changed"));
    } catch (e: any) {
      await awAlert(e?.message ?? "Zprávu se nepodarilo odeslat.");
    } finally {
      setSending(false);
    }
  }

  function startReplyToMessage(message: ThreadMessage) {
    setReplyTarget(message);
    window.setTimeout(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      textareaRef.current?.focus();
    }, 0);
  }

  function insertEmoji(emoji: string) {
    setDraft((current) => `${current}${emoji}`);
    setEmojiOpen(false);
  }

  async function handleToggleStar() {
    if (!selectedThread) return;
    await setMessageThreadPreferences({
      threadId: selectedThread.threadId,
      isStarred: !selectedThread.isStarred,
    });
    await loadThreads(selectedThread.threadId);
    window.dispatchEvent(new Event("aw-messages-changed"));
  }

  async function handleToggleMute() {
    if (!selectedThread) return;
    await setMessageThreadPreferences({
      threadId: selectedThread.threadId,
      isMuted: !selectedThread.isMuted,
    });
    await loadThreads(selectedThread.threadId);
    window.dispatchEvent(new Event("aw-messages-changed"));
  }

  async function handleBlockToggle() {
    if (!selectedThread || !selectedThread.otherUserId) return;
    if (selectedThread.isBlockedByMe) {
      await unblockUserInThread({
        threadId: selectedThread.threadId,
        otherUserId: selectedThread.otherUserId,
      });
    } else {
      await blockUserInThread({
        threadId: selectedThread.threadId,
        otherUserId: selectedThread.otherUserId,
      });
    }
    setActionsOpen(false);
    await loadThreads(selectedThread.threadId);
    window.dispatchEvent(new Event("aw-messages-changed"));
  }

  async function handleReaction(messageId: number, emoji: string) {
    const previousMessages = messages;
    setMessages((current) => toggleReactionInMessages(current, messageId, emoji));
    setReactionPickerForMessageId(null);

    try {
      await toggleMessageReaction({ messageId, emoji });
    } catch (error) {
      setMessages(previousMessages);
      await awAlert(getErrorMessage(error, "Reakci se nepodarilo uložit."));
    }
  }

  return (
    <div className="mx-auto w-full p-4">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <PageSectionTitle
                title="Zprávy"
                iconPath="/ui/Menu-Zpravy.ico"
                sizeClassName="text-[1.95rem]"
              />
              <p className="mt-1 text-sm text-slate-600">
                Ve spojení si mužete psát bez omezení. Mimo spojení se zprávy objeví jen u žádosti o spojení nebo jejího zamítnutí.
              </p>
              {messagesSystemNotice ? (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  {messagesSystemNotice}
                </div>
              ) : null}
            </div>

            <AwButton variant="primary" onClick={() => setComposerOpen(true)}>
              Nová zpráva
            </AwButton>
          </div>
        </div>

        <section className="flex min-h-[620px] flex-col">
          {!selectedThread ? (
            <div className="flex flex-1 items-center justify-center p-6 text-sm text-slate-600">
              {loading ? "Nacítám konverzace..." : "Vyber konverzaci vlevo nebo založ novou zprávu."}
            </div>
          ) : (
            <>
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200">
                      {selectedThread.otherAvatarUrl ? (
                        <img
                          src={selectedThread.otherAvatarUrl}
                          alt={selectedThreadLabel}
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-700">{initialFromName(selectedThreadLabel)}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-slate-900">
                        {selectedThreadLabel}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>{threadKindLabel(selectedThread.threadKind)}</span>
                        {selectedThreadPresence ? <span>{selectedThreadPresence}</span> : null}
                        {canOpenSelectedProfile ? <Link href={`/users/${selectedThread.otherUserId}`} className="font-medium text-emerald-700 hover:underline">
                          Otevrít profil
                        </Link> : null}
                      </div>
                    </div>
                  </div>

                  <div className="relative flex items-center gap-2">
                    {selectedThread.isStarred ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Hvezdicka</span>
                    ) : null}
                    {selectedThread.threadFolder === "blocked" ? (
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">Blokované</span>
                    ) : null}
                    {selectedThread.isMuted ? (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">Mute</span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setActionsOpen((current) => !current)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Akce
                    </button>
                    {actionsOpen ? (
                      <div className="absolute right-0 top-full z-20 mt-2 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                        <button type="button" onClick={() => void handleToggleStar()} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50">
                          {selectedThread.isStarred ? "Odebrat hvezdicku" : "Pridat hvezdicku"}
                        </button>
                        <button type="button" onClick={() => void handleToggleMute()} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50">
                          {selectedThread.isMuted ? "Zapnout upozornení" : "Ztlumit konverzaci"}
                        </button>
                        {canModerateSelectedUser ? <button type="button" onClick={() => void handleBlockToggle()} className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50">
                          {selectedThread.isBlockedByMe ? "Odblokovat uživatele" : "Blokovat uživatele"}
                        </button> : null}
                        {canModerateSelectedUser ? <button
                          type="button"
                          onClick={() => {
                            setActionsOpen(false);
                            setReportOpen(true);
                          }}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                        >
                          Nahlásit konverzaci
                        </button> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-white px-5 py-4">
                {selectedThread.hasBlocking ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                    Tato konverzace je blokovaná. Zprávy zustávají viditelné, ale nové odesílat nelze.
                  </div>
                ) : null}

                {messagesLoading ? (
                  <div className="text-sm text-slate-600">Nacítám zprávy...</div>
                ) : messages.length === 0 ? (
                  <div className="text-sm text-slate-600">Ve vlákne zatím nejsou žádné zprávy.</div>
                ) : (
                  messages.map((message) => {
                    const isMine = message.senderUserId === userId;
                    const receiptState = getMessageReceiptState(selectedThread, message, isMine);
                    const localReplyPreview = localReplyPreviewByMessageId[message.id] ?? null;
                    const replyPreviewSenderId =
                      message.replyToSenderUserId ??
                      localReplyPreview?.senderUserId ??
                      (message.replyToMessageId
                        ? messages.find((candidate) => candidate.id === message.replyToMessageId)?.senderUserId ?? null
                        : null);
                    const replyPreviewSenderName =
                      localReplyPreview?.senderName ??
                      replyPreviewSenderId === userId
                        ? "Ty"
                        : replyPreviewSenderId
                          ? selectedThreadLabel
                          : "Puvodní zpráva";
                    const replyPreviewBody =
                      message.replyToBody ??
                      localReplyPreview?.body ??
                      (message.replyToMessageId
                        ? messages.find((candidate) => candidate.id === message.replyToMessageId)?.body ?? null
                        : null);
                    return (
                      <div key={message.id} className={`group flex ${isMine ? "justify-end" : "justify-start"}`}>
                        <div className={`flex max-w-[90%] items-start gap-2 sm:max-w-[82%] ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                          {!isMine ? (
                            <Avatar
                              avatarUrl={selectedThread.otherAvatarUrl}
                              name={selectedThreadLabel}
                              size={32}
                              className="mt-7 ring-slate-300"
                            />
                          ) : null}

                          <div className={`flex min-w-0 flex-1 flex-col gap-2 ${isMine ? "items-end" : "items-start"}`}>
                            <div
                              className={`relative px-4 py-3 text-sm shadow-sm ${
                                isMine
                                  ? "rounded-2xl bg-emerald-600 text-white"
                                  : "rounded-2xl bg-slate-100 text-slate-900"
                              }`}
                            >
                              {replyPreviewBody ? (
                                <div className={`mb-2 rounded-xl px-3 py-2 text-xs ${isMine ? "bg-emerald-500/60 text-emerald-50" : "bg-white text-slate-600"}`}>
                                  <div className={`border-l-4 pl-3 ${isMine ? "border-emerald-100" : "border-sky-500"}`}>
                                    <div className={`font-semibold ${isMine ? "text-emerald-50" : "text-sky-700"}`}>
                                      {replyPreviewSenderName}
                                    </div>
                                    <div className="mt-1 line-clamp-2 whitespace-pre-wrap break-words">{replyPreviewBody}</div>
                                  </div>
                                </div>
                              ) : null}
                              <div className="whitespace-pre-wrap break-words">{message.body}</div>
                              <div className={`mt-2 flex flex-wrap items-center gap-2 text-[11px] ${isMine ? "text-emerald-50/90" : "text-slate-500"}`}>
                                <span>{formatDateTime(message.createdAt)}</span>
                                {message.reactions.map((reaction) => (
                                  <button
                                    key={`${message.id}-${reaction.emoji}`}
                                    type="button"
                                    onClick={() => void handleReaction(message.id, reaction.emoji)}
                                    className={`rounded-full border px-2 py-0.5 text-[11px] leading-none ${reaction.reactedByMe ? "border-emerald-300 bg-emerald-50 text-emerald-700" : isMine ? "border-emerald-200/40 bg-emerald-500/20 text-emerald-50" : "border-slate-200 bg-white text-slate-700"}`}
                                  >
                                    {reaction.emoji} {reaction.count}
                                  </button>
                                ))}
                                {receiptState ? (
                                  <span
                                    title={receiptState.label}
                                    aria-label={receiptState.label}
                                    className={`font-semibold tracking-[-0.08em] ${receiptState.className}`}
                                  >
                                    {receiptState.icon}
                                  </span>
                                ) : null}
                              </div>
                            </div>

                            <div className="relative flex flex-wrap gap-2 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                              {QUICK_REACTIONS.map((emoji) => (
                                <button
                                  key={`${message.id}-${emoji}-quick`}
                                  type="button"
                                  onClick={() => void handleReaction(message.id, emoji)}
                                  className="flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 text-base hover:bg-slate-50"
                                >
                                  {emoji}
                                </button>
                              ))}

                              <button
                                type="button"
                                aria-label="další emoji"
                                title="další emoji"
                                onClick={() =>
                                  setReactionPickerForMessageId((current) => (current === message.id ? null : message.id))
                                }
                                className="flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-900 bg-white px-2.5 text-base text-slate-900 hover:bg-slate-100"
                              >
                                <span className="flex items-start gap-0.5 leading-none">
                                  <span className="text-[27px]">{"\u263A"}</span>
                                  <span className="text-xs font-bold">+</span>
                                </span>
                              </button>

                              <button
                                type="button"
                                aria-label="odpovedet na zprávu"
                                title="Odpovedet na zprávu"
                                onClick={() => startReplyToMessage(message)}
                                className="flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 text-base font-semibold text-slate-900 hover:bg-slate-50"
                              >
                                ?
                              </button>

                              {reactionPickerForMessageId === message.id ? (
                                <div className={`absolute top-full z-10 mt-2 grid w-[240px] grid-cols-5 gap-1.5 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-lg ${isMine ? "right-0" : "left-0"}`}>
                                  {BASIC_EMOJIS.filter((emoji) => !QUICK_REACTIONS.includes(emoji)).map((emoji) => (
                                    <button
                                      key={`${message.id}-${emoji}-more`}
                                      type="button"
                                      onClick={() => void handleReaction(message.id, emoji)}
                                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-base hover:bg-slate-50"
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border-t border-slate-200 bg-slate-50 px-5 py-4">
                {selectedThread.canReply ? (
                  <div className="flex flex-col gap-3">
                    {replyTarget ? (
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-start justify-between gap-3 px-4 py-3">
                          <div className="min-w-0 flex-1 border-l-4 border-sky-500 pl-3">
                            <div className="text-sm font-semibold text-sky-700">
                              {replyTarget.senderDisplayName ?? (replyTarget.senderUserId === userId ? "Ty" : selectedThreadLabel)}
                            </div>
                            <div className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-sm text-slate-600">
                              {replyTarget.body}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setReplyTarget(null)}
                            className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div ref={composerRef} className="relative">
                      {emojiOpen ? (
                        <div className="absolute bottom-full left-0 mb-2 rounded-2xl border border-slate-200 bg-white p-2.5 shadow-lg">
                          <div className="grid w-[240px] grid-cols-5 gap-1.5">
                            {BASIC_EMOJIS.filter((emoji) => !QUICK_REACTIONS.includes(emoji)).map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => insertEmoji(emoji)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-base hover:bg-slate-50"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <textarea
                        ref={textareaRef}
                        value={draft}
                        onChange={(e) => setDraft(normalizeTypedEmoji(e.target.value))}
                        rows={3}
                        placeholder="Napiš zprávu..."
                        className="min-h-[84px] w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <div className="relative flex flex-wrap gap-2">
                          {QUICK_REACTIONS.map((emoji) => (
                            <button
                              key={`${emoji}-composer-quick`}
                              type="button"
                              onClick={() => insertEmoji(emoji)}
                              className="flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-200 bg-white px-2.5 text-base hover:bg-slate-50"
                            >
                              {emoji}
                            </button>
                          ))}

                          <button
                            type="button"
                            aria-label="další emoji"
                            title="další emoji"
                            onClick={() => setEmojiOpen((current) => !current)}
                            className="flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-900 bg-white px-2.5 text-base text-slate-900 hover:bg-slate-100"
                          >
                            <span className="flex items-start gap-0.5 leading-none">
                              <span className="text-[27px]">{"\u263A"}</span>
                              <span className="text-xs font-bold">+</span>
                            </span>
                          </button>
                        </div>
                      </div>

                      <AwButton variant="primary" onClick={() => void handleSend()} disabled={sending || !draft.trim()} className="px-5 py-3">
                        {sending ? "Odesílám..." : "Odeslat"}
                      </AwButton>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                    {selectedThread.hasBlocking
                      ? "Blokovaná konverzace je jen pro ctení."
                      : "Toto vlákno je jen informacní. Odpovedi jsou dostupné až po prijetí spojení."}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {composerOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/50 p-4 pt-16" onClick={() => setComposerOpen(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-slate-900">Nová zpráva</div>
                  <div className="mt-1 text-sm text-slate-500">Vyber kontakt ze svých spojení. Vyhledávání níže jen zúží seznam.</div>
                </div>
                <CloseButton onClick={() => setComposerOpen(false)} label="Zavřít" />
              </div>

              <div className="mt-4">
                <input
                  type="text"
                  value={contactQuery}
                  onChange={(e) => setContactQuery(e.target.value)}
                  placeholder="Hledat kontakt podle jména nebo bio"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4">
              {filteredConnections.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                    {contactQuery.trim()
                      ? `Kontakty odpovídající hledání (${filteredConnections.length})`
                      : `Moje kontakty (${filteredConnections.length})`}
                  </div>

                  <div className="space-y-2">
                    {filteredConnections.map((user) => (
                      <button
                        key={user.user_id}
                        type="button"
                        onClick={() => void openThreadForUser(user.user_id)}
                        disabled={openingThreadForUserId === user.user_id}
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-left hover:bg-slate-50 disabled:opacity-60"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.display_name ?? "Uživatel"} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <span className="text-sm font-bold text-slate-700">{initialFromName(user.display_name)}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-slate-900">{user.display_name ?? user.user_id}</div>
                          <div className="truncate text-xs text-slate-500">{user.bio ?? "Ve spojení"}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {contactQuery.trim()
                    ? "Ve tvých spojeních nikdo neodpovídá tomuto hledání."
                    : "Zatím nemáš žádné kontakty, kterým by šlo napsat."}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <ReportThreadModal
        open={reportOpen}
        threadId={selectedThread?.threadId ?? null}
        onClose={() => setReportOpen(false)}
        onReported={() => setActionsOpen(false)}
      />
    </div>
  );
}
