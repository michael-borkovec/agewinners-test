/**
 * File: app/admin/page.tsx
 *
 * Purpose:
 * - Admin dashboard:
 *   - Users (admin only)
 *   - Photos (admin + moderator) with verification + reported info
 *
 * UX changes:
 * - Users: role is saved only via "Změnit roli" button
 * - Users: super_user is saved only via "Uložit super_user" button
 * - Users: local column sorting with toggle arrows
 * - All actions show confirm "Opravdu chcete: ...?"
 * - Photos: per-image check actions (mutually exclusive):
 *    - Unverified: [Verifikovat] or [Smazat]
 *    - Verified:   [Odverifikovat] or [Smazat]
 *   + Top button "Provést změny" with summary confirm
 * - NEW: Report reason filter + show report reason/details on reported images
 * - NEW: Report review actions (confirm/reject) + change category + admin note
 * - NEW: For "Ostatní", admin can set penalty coef (0.0..1.0, default 0.5)
 *
 * IMPORTANT FIX:
 * - /api/admin/images returns total_count: null (unknown), so paging must use "rows.length === PAGE_SIZE"
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { DbUserRole } from "@/types/db";
import RefreshIconButton from "@/components/RefreshIconButton";
import { awAlert, awConfirm } from "@/components/AwDialog";
import CloseButton from "@/components/CloseButton";
import ImageGalleryModal, { type GalleryImage } from "@/components/ImageGalleryModal";
import EditImageModal, { type EditImageInitial } from "@/components/EditImageModal";
import { updateMyImageFile } from "@/lib/api/images";
import { getMyAdminAlerts } from "@/lib/api/adminAlerts";
import { getOrCreateModeratorOutreachThread } from "@/lib/api/staffMessages";

type TabKey = "users" | "images" | "settings";

type AdminUserRow = {
  user_id: string;
  registration_number: number | null;
  display_name: string | null;
  email: string | null;
  role: DbUserRole;
  super_user: boolean;
  account_status: "active" | "suspended";
  suspended_at: string | null;
  suspension_reason: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
};

const REPORT_REASONS = [
  "Nelze tipovat věk - více osob",
  "Nelze tipovat věk - žádná osoba",
  "Nelze tipovat věk - nedostatečný záběr",
  "Sexuální podtext",
  "Rasismus/projev nenávisti",
  "Ostatní - uveďte v komentáři",
] as const;

type ReportReason = (typeof REPORT_REASONS)[number];

type AdminImageRow = {
  image_id: number;
  uploader_user_id: string;
  owner_display_name: string | null;
  public_url: string | null;
  public_url_medium: string | null;
  public_url_thumb: string | null;
  taken_at: string | null;
  created_at: string;
  hidden_by_admin: boolean;
  hidden_by_admin_at: string | null;

  verified_at: string | null;
  verified_by: string | null;
  verified_by_display_name: string | null;

  reported_at: string | null;
  report_id: number | null;
  reporter_user_id: string | null;
  reporter_display_name: string | null;

  report_reason?: string | null;
  report_details?: string | null;
  real_age_years?: number | null;
  aw_age_image?: number | null;
  avg_guessed_age?: number | null;
  guesses_count?: number | null;
  include_in_global_aw?: boolean | null;
  comment?: string | null;
  photo_category?: string | null;
  tags?: string[] | null;
};

type AdminRevealDelayResponse = {
  days: number;
  updated_at?: string | null;
};

const PAGE_SIZE = 50;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("cs-CZ");
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("cs-CZ");
}

async function apiGetJSON<T>(url: string) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as T;
}

async function apiSendJSON<T>(url: string, method: "POST" | "PATCH" | "DELETE", body?: any) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json().catch(() => null)) as T;
}

function AdminTabButton(props: { active: boolean; onClick?: () => void; href?: string; children: React.ReactNode }) {
  const className = cx(
    "inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold transition",
    props.active ? "bg-blue-950 text-white shadow-sm" : "text-slate-700 hover:bg-white hover:text-slate-950"
  );

  if (props.href) {
    return (
      <Link href={props.href} className={className}>
        {props.children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      className={className}
    >
      {props.children}
    </button>
  );
}

function RangeInfo(props: { page: number; pageSize: number; total: number | null; currentCount: number }) {
  const { page, pageSize, total, currentCount } = props;

  if (currentCount === 0) return <span className="text-xs text-slate-600">Žádné výsledky</span>;

  const start = page * pageSize + 1;
  const end = page * pageSize + currentCount;

  return (
    <span className="text-xs text-slate-600">
      Zobrazuji <span className="font-semibold">{start}</span>–{" "}
      <span className="font-semibold">{end}</span> z{" "}
      <span className="font-semibold">{total === null ? "—" : total}</span>
    </span>
  );
}

function Pager(props: {
  page: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="text-xs text-slate-600">
          Stránka: <span className="font-semibold">{props.page + 1}</span>
        </div>
        {props.rightSlot}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={props.onPrev}
          disabled={!props.canPrev}
          className="rounded-xl border bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
        >
          Předchozí
        </button>
        <button
          type="button"
          onClick={props.onNext}
          disabled={!props.canNext}
          className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Další
        </button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const searchParams = useSearchParams();
  const [role, setRole] = useState<DbUserRole>("user");
  const [roleLoading, setRoleLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("images");
  const [adminUnread, setAdminUnread] = useState(0);
  const [moderatorUnread, setModeratorUnread] = useState(0);
  const [imageReportCount, setImageReportCount] = useState(0);
  const [messageReportCount, setMessageReportCount] = useState(0);

  const canEnter = role === "admin" || role === "moderator";
  const canSeeUsers = role === "admin";
  const canSeeSettings = role === "admin";

  useEffect(() => {
    let mounted = true;
    apiGetJSON<{ role: DbUserRole }>("/api/admin/me")
      .then((x) => {
        if (!mounted) return;
        setRole(x.role);
        const requestedTab = searchParams.get("tab");
        if (requestedTab === "users" || requestedTab === "images" || requestedTab === "settings") {
          setTab(requestedTab);
        } else {
          setTab(x.role === "admin" ? "users" : "images");
        }
      })
      .catch(() => {
        if (!mounted) return;
        setRole("user");
      })
      .finally(() => {
        if (!mounted) return;
        setRoleLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [searchParams]);

  useEffect(() => {
    const nextTab = searchParams.get("tab") as TabKey | null;
    if (nextTab === "users" || nextTab === "images" || nextTab === "settings") setTab(nextTab);
  }, [searchParams]);

  useEffect(() => {
    if (!canEnter) return;

    let cancelled = false;
    async function loadAdminAlerts() {
      try {
        const { counts } = await getMyAdminAlerts();
        if (cancelled) return;
        setAdminUnread(counts.adminSupportUnread);
        setModeratorUnread(counts.moderatorOutreachUnread);
        setImageReportCount(counts.imageReportsOpen);
        setMessageReportCount(counts.messageReportsOpen);
      } catch {
        if (cancelled) return;
        setAdminUnread(0);
        setModeratorUnread(0);
        setImageReportCount(0);
        setMessageReportCount(0);
      }
    }

    void loadAdminAlerts();
    const handler = () => {
      void loadAdminAlerts();
    };
    window.addEventListener("aw-messages-changed", handler);
    window.addEventListener("aw-notifications-changed", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("aw-messages-changed", handler);
      window.removeEventListener("aw-notifications-changed", handler);
    };
  }, [canEnter]);

  if (roleLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-800">Administrace</h1>
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-slate-700">Načítám oprávnění administrace…</p>
        </div>
      </div>
    );
  }

  if (!canEnter) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-800">Administrace</h1>
        <div className="rounded-2xl border bg-white p-6">
          <p className="text-slate-700">Nemáš oprávnění pro administraci.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Administrace</h1>
          <p className="text-sm text-slate-600">
            Role: <span className="font-medium">{role}</span>
          </p>
        </div>

        <nav className="mt-5 flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-1">
          <AdminTabButton active={false} href="/admin/message-reports">
            Reporty konverzací
            {messageReportCount > 0 ? (
              <span className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-amber-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                {messageReportCount > 99 ? "99+" : messageReportCount}
              </span>
            ) : null}
          </AdminTabButton>
          <AdminTabButton active={false} href="/admin/moderator-messages">
            Moderátor zprávy
            {moderatorUnread > 0 ? (
              <span className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-sky-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                {moderatorUnread > 99 ? "99+" : moderatorUnread}
              </span>
            ) : null}
          </AdminTabButton>
          {canSeeSettings && (
            <AdminTabButton active={false} href="/admin/admin-messages">
              Admin zprávy
              {adminUnread > 0 ? (
                <span className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                  {adminUnread > 99 ? "99+" : adminUnread}
                </span>
              ) : null}
            </AdminTabButton>
          )}
          {canSeeUsers && (
            <AdminTabButton active={tab === "users"} href="/admin?tab=users">
              Uživatelé
            </AdminTabButton>
          )}
          <AdminTabButton active={tab === "images"} href="/admin?tab=images">
            Fotky
            {imageReportCount > 0 ? (
              <span className="ml-2 inline-flex min-w-[20px] items-center justify-center rounded-full bg-amber-600 px-1.5 py-0.5 text-[11px] font-bold text-white">
                {imageReportCount > 99 ? "99+" : imageReportCount}
              </span>
            ) : null}
          </AdminTabButton>
          {canSeeSettings && (
            <AdminTabButton active={tab === "settings"} href="/admin?tab=settings">
              Ostatní nastavení
            </AdminTabButton>
          )}
        </nav>
      </header>

      {tab === "users" && canSeeUsers && <UsersPanel />}
      {tab === "images" && <ImagesPanel />}
      {tab === "settings" && canSeeSettings && <RuntimeSettingsPanel />}
    </div>
  );
}

function RuntimeSettingsPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [daysDraft, setDaysDraft] = useState("10");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const data = await apiGetJSON<AdminRevealDelayResponse>("/api/admin/settings/reveal-delay");
      setDaysDraft(String(data.days));
      setUpdatedAt(data.updated_at ?? null);
    } catch (e: any) {
      setError(e?.message ?? "Nepodařilo se načíst runtime nastavení.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const days = Number(daysDraft);
      const data = await apiSendJSON<AdminRevealDelayResponse>("/api/admin/settings/reveal-delay", "PATCH", { days });
      setDaysDraft(String(data.days));
      setSuccess(`Uloženo: ${data.days} dní`);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Nepodařilo se uložit runtime nastavení.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Globální odhalení postů</h2>
          <p className="mt-1 text-sm text-slate-600">
            Nastavení se použije pro všechny běžné uživatele, kteří čekají na odanonymizování obsahu postů.
          </p>
          {updatedAt ? <p className="mt-1 text-xs text-slate-500">Naposledy změněno: {formatDateTime(updatedAt)}</p> : null}
        </div>

        <RefreshIconButton
          onClick={() => void load()}
          title="Obnovit nastavení"
          ariaLabel="Obnovit nastavení"
          disabled={loading || saving}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="grid gap-1">
          <span className="text-xs font-semibold text-slate-700">Počet dní do odhalení postu</span>
          <input
            type="number"
            min={1}
            max={365}
            step={1}
            value={daysDraft}
            onChange={(e) => setDaysDraft(e.target.value)}
            className="w-40 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500"
            disabled={loading || saving}
          />
        </label>

        <button
          type="button"
          onClick={() => void save()}
          disabled={loading || saving}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Ukládám…" : "Uložit"}
        </button>
      </div>

      {loading ? <div className="mt-3 text-sm text-slate-500">Načítám nastavení…</div> : null}
      {error ? <div className="mt-3 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="mt-3 text-sm font-semibold text-emerald-700">{success}</div> : null}
    </section>
  );
}

/* ----------------------------- USERS PANEL (admin only) ----------------------------- */

type UserSortKey = "registration_number" | "display_name" | "email" | "role" | "account_status" | "super_user" | "created_at" | "last_sign_in_at";
type SortDirection = "desc" | "asc";

type EditUserModalProps = {
  user: AdminUserRow;
  onClose: () => void;
  onChanged: () => Promise<void>;
};

function accountStatusLabel(status: AdminUserRow["account_status"]) {
  return status === "suspended" ? "Pozastaven" : "Aktivní";
}

function UsersPanel() {
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<UserSortKey | null>("registration_number");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);

  const canNext = (page + 1) * PAGE_SIZE < totalCount;

  async function load(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", String(PAGE_SIZE));
      qs.set("page", String(nextPage));

      const data = await apiGetJSON<{ users: AdminUserRow[]; total_count: number }>(`/api/admin/users?${qs.toString()}`);
      const list = data.users ?? [];
      setRows(list);
      setTotalCount(Number(data.total_count ?? 0));
      setEditingUser((current) => (current ? list.find((row) => row.user_id === current.user_id) ?? current : null));
    } catch (e: any) {
      setError(e?.message ?? "Chyba načtení uživatelů");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSortClick(key: UserSortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection(key === "registration_number" ? "asc" : "desc");
      return;
    }

    setSortDirection((prev) => (prev === "desc" ? "asc" : "desc"));
  }

  function renderSortArrows(key: UserSortKey) {
    const isActive = sortKey === key;
    return (
      <button
        type="button"
        onClick={() => handleSortClick(key)}
        className={cx("ml-1 text-xs", isActive ? "text-blue-950" : "text-slate-300 hover:text-slate-500")}
        title="Řadit"
      >
        {isActive && sortDirection === "asc" ? "▲" : "▼"}
      </button>
    );
  }

  const sortedRows = useMemo(() => {
    const list = [...rows];
    if (!sortKey) return list;
    const dir = sortDirection === "asc" ? 1 : -1;

    function compareText(a: unknown, b: unknown) {
      return String(a ?? "").toLocaleLowerCase("cs").localeCompare(String(b ?? "").toLocaleLowerCase("cs"), "cs");
    }

    function compareDate(a: string | null | undefined, b: string | null | undefined) {
      return (a ? new Date(a).getTime() : 0) - (b ? new Date(b).getTime() : 0);
    }

    list.sort((a, b) => {
      let result = 0;
      switch (sortKey) {
        case "registration_number":
          result = Number(a.registration_number ?? Number.MAX_SAFE_INTEGER) - Number(b.registration_number ?? Number.MAX_SAFE_INTEGER);
          break;
        case "display_name":
          result = compareText(a.display_name, b.display_name);
          break;
        case "email":
          result = compareText(a.email, b.email);
          break;
        case "role":
          result = compareText(a.role, b.role);
          break;
        case "account_status":
          result = compareText(a.account_status, b.account_status);
          break;
        case "super_user":
          result = Number(Boolean(a.super_user)) - Number(Boolean(b.super_user));
          break;
        case "created_at":
          result = compareDate(a.created_at, b.created_at);
          break;
        case "last_sign_in_at":
          result = compareDate(a.last_sign_in_at, b.last_sign_in_at);
          break;
      }
      return (result || compareText(a.display_name, b.display_name)) * dir;
    });

    return list;
  }, [rows, sortDirection, sortKey]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Uživatelé</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Přehled účtů je záměrně jen přehled. Správcovské zásahy jsou v modálu, aby se role, stav účtu a krajní akce nepletly přímo v tabulce.
          </p>
          <div className="mt-2">
            <RangeInfo page={page} pageSize={PAGE_SIZE} total={totalCount} currentCount={rows.length} />
          </div>
        </div>

        <RefreshIconButton onClick={() => load(page)} disabled={loading} />
      </div>

      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <span className="font-semibold">Mazání uživatele používejte pouze v krajním případě.</span> Standardní zásah je pozastavení uživatele, které skryje jeho veřejný obsah a zachová historii hodnocení.
      </div>

      <div className="mb-4">
        <Pager
          page={page}
          canPrev={page > 0}
          canNext={canNext}
          onPrev={() => {
            const p = Math.max(0, page - 1);
            setPage(p);
            load(p);
          }}
          onNext={() => {
            const p = page + 1;
            setPage(p);
            load(p);
          }}
        />
      </div>

      {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      {loading ? (
        <p className="text-slate-600">Načítám…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3"># {renderSortArrows("registration_number")}</th>
                <th className="px-3 py-3">Jméno {renderSortArrows("display_name")}</th>
                <th className="px-3 py-3">Email {renderSortArrows("email")}</th>
                <th className="px-3 py-3">Role {renderSortArrows("role")}</th>
                <th className="px-3 py-3">Stav {renderSortArrows("account_status")}</th>
                <th className="px-3 py-3">super_user {renderSortArrows("super_user")}</th>
                <th className="px-3 py-3">Vytvořen {renderSortArrows("created_at")}</th>
                <th className="px-3 py-3">Poslední aktivita {renderSortArrows("last_sign_in_at")}</th>
                <th className="px-3 py-3 text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedRows.map((u, index) => (
                <tr key={u.user_id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-3 font-mono text-xs text-slate-600">{u.registration_number ?? page * PAGE_SIZE + index + 1}</td>
                  <td className="px-3 py-3 font-medium text-slate-900">{u.display_name ?? "—"}</td>
                  <td className="px-3 py-3 text-slate-600">{u.email ?? "—"}</td>
                  <td className="px-3 py-3 text-slate-700">{u.role}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cx(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        u.account_status === "suspended" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      )}
                    >
                      {accountStatusLabel(u.account_status)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-700">{u.super_user ? "Ano" : "Ne"}</td>
                  <td className="px-3 py-3 text-slate-600">{formatDateTime(u.created_at)}</td>
                  <td className="px-3 py-3 text-slate-600">{formatDateTime(u.last_sign_in_at)}</td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditingUser(u)}
                      className="rounded-xl bg-blue-950 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900"
                    >
                      Upravit
                    </button>
                  </td>
                </tr>
              ))}

              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
                    Žádná data.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {editingUser ? (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onChanged={async () => {
            await load(page);
          }}
        />
      ) : null}
    </section>
  );
}

function EditUserModal({ user, onClose, onChanged }: EditUserModalProps) {
  const [roleDraft, setRoleDraft] = useState<DbUserRole>(user.role);
  const [superUserDraft, setSuperUserDraft] = useState(Boolean(user.super_user));
  const [passwordDraft, setPasswordDraft] = useState("");
  const [suspensionReason, setSuspensionReason] = useState(user.suspension_reason ?? "");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    setRoleDraft(user.role);
    setSuperUserDraft(Boolean(user.super_user));
    setPasswordDraft("");
    setSuspensionReason(user.suspension_reason ?? "");
  }, [user]);

  const name = user.display_name ?? user.email ?? user.user_id;
  const profileChanged = roleDraft !== user.role || superUserDraft !== Boolean(user.super_user);
  const isSuspended = user.account_status === "suspended";

  async function run(action: string, work: () => Promise<void>) {
    setBusy(action);
    try {
      await work();
      await onChanged();
    } finally {
      setBusy(null);
    }
  }

  async function saveProfileSettings() {
    if (!profileChanged) return;
    const ok = await awConfirm(`Uložit změny u uživatele "${name}"?`);
    if (!ok) return;

    await run("profile", async () => {
      await apiSendJSON("/api/admin/users", "PATCH", { userId: user.user_id, role: roleDraft, superUser: superUserDraft });
      await awAlert("Změny uživatele byly uloženy.");
    });
  }

  async function suspendUser() {
    const ok = await awConfirm({
      title: "Pozastavit uživatele",
      message: `Pozastavit uživatele "${name}"? Jeho posty, fotky a komentáře se skryjí. Historická hodnocení zůstanou beze změny.`,
      confirmLabel: "Pozastavit",
      danger: true,
    });
    if (!ok) return;

    await run("suspend", async () => {
      await apiSendJSON("/api/admin/users", "PATCH", {
        userId: user.user_id,
        accountStatus: "suspended",
        suspensionReason: suspensionReason.trim() || null,
      });
      await awAlert("Uživatel byl pozastaven.");
    });
  }

  async function restoreUser() {
    const ok = await awConfirm(`Obnovit uživatele "${name}"? Jeho obsah se znovu zobrazí podle původní viditelnosti.`);
    if (!ok) return;

    await run("restore", async () => {
      await apiSendJSON("/api/admin/users", "PATCH", { userId: user.user_id, accountStatus: "active" });
      await awAlert("Uživatel byl obnoven.");
    });
  }

  async function resetPassword() {
    const newPassword = passwordDraft.trim();
    if (newPassword.length < 8) {
      await awAlert("Nové heslo musí mít alespoň 8 znaků.");
      return;
    }

    const ok = await awConfirm(`Přepsat heslo uživatele "${name}"?`);
    if (!ok) return;

    await run("password", async () => {
      await apiSendJSON("/api/admin/users/password", "POST", { userId: user.user_id, newPassword });
      setPasswordDraft("");
      await awAlert("Heslo bylo změněno.");
    });
  }

  async function deleteUser() {
    const ok = await awConfirm({
      title: "Smazat uživatele",
      message: `Smazání uživatele "${name}" je nevratné a spoléhá na databázové vazby. Používejte ho pouze v krajním případě.`,
      confirmLabel: "Smazat",
      danger: true,
    });
    if (!ok) return;

    await run("delete", async () => {
      await apiSendJSON("/api/admin/users", "DELETE", { userId: user.user_id });
      await awAlert("Uživatel byl smazán.");
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Upravit uživatele</h3>
            <p className="mt-1 text-sm text-slate-600">{name}</p>
          </div>
          <CloseButton onClick={onClose} disabled={Boolean(busy)} />
        </div>

        <div className="max-h-[calc(92vh-8rem)] space-y-5 overflow-y-auto px-5 py-5">
          <section className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-slate-700">Role</span>
              <select
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-700"
                value={roleDraft}
                onChange={(e) => setRoleDraft(e.target.value as DbUserRole)}
                disabled={Boolean(busy)}
              >
                <option value="user">user</option>
                <option value="moderator">moderator</option>
                <option value="admin">admin</option>
              </select>
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <input
                type="checkbox"
                checked={superUserDraft}
                onChange={(e) => setSuperUserDraft(e.target.checked)}
                className="h-4 w-4"
                disabled={Boolean(busy)}
              />
              <span className="text-sm font-medium text-slate-800">super_user</span>
            </label>
          </section>

          <button
            type="button"
            onClick={() => void saveProfileSettings()}
            disabled={!profileChanged || Boolean(busy)}
            className={cx(
              "rounded-xl px-4 py-2 text-sm font-semibold",
              profileChanged && !busy ? "bg-blue-950 text-white hover:bg-blue-900" : "bg-slate-200 text-slate-500"
            )}
          >
            Uložit nastavení
          </button>

          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="font-semibold text-slate-950">Stav účtu</h4>
                <p className="mt-1 text-sm text-slate-600">Aktuálně: {accountStatusLabel(user.account_status)}</p>
                {user.suspended_at ? <p className="mt-1 text-xs text-slate-500">Pozastaveno: {formatDateTime(user.suspended_at)}</p> : null}
              </div>
              {isSuspended ? (
                <button
                  type="button"
                  onClick={() => void restoreUser()}
                  disabled={Boolean(busy)}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  Obnovit uživatele
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void suspendUser()}
                  disabled={Boolean(busy)}
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  Pozastavit uživatele
                </button>
              )}
            </div>

            <label className="mt-4 grid gap-1">
              <span className="text-xs font-semibold text-slate-700">Důvod pozastavení</span>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Interní poznámka pro administraci..."
                rows={3}
                disabled={Boolean(busy) || isSuspended}
                className="resize-none rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-700 disabled:bg-slate-100"
              />
            </label>
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <h4 className="font-semibold text-slate-950">Reset hesla</h4>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-700"
                type="password"
                placeholder="Nové heslo..."
                value={passwordDraft}
                onChange={(e) => setPasswordDraft(e.target.value)}
                disabled={Boolean(busy)}
              />
              <button
                type="button"
                onClick={() => void resetPassword()}
                disabled={passwordDraft.trim().length < 8 || Boolean(busy)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500"
              >
                Přepsat heslo
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <h4 className="font-semibold text-rose-950">Krajní akce</h4>
            <p className="mt-1 text-sm text-rose-800">
              Smazání uživatele používejte pouze v krajním případě. Standardní zásah je pozastavení uživatele.
            </p>
            <button
              type="button"
              onClick={() => void deleteUser()}
              disabled={Boolean(busy)}
              className="mt-3 rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
            >
              Smazat uživatele
            </button>
          </section>
        </div>

        <div className="flex justify-end border-t border-slate-200 bg-white px-5 py-4">
          <button type="button" onClick={onClose} disabled={Boolean(busy)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- IMAGES PANEL (admin+moderator) ----------------------------- */

type ImageAction = "none" | "verify" | "unverify" | "hide" | "unhide" | "delete";

function clamp01(v: number) {
  if (!Number.isFinite(v)) return 0.5;
  return Math.min(1, Math.max(0, v));
}

function ImagesPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<AdminImageRow[]>([]);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [galleryImageId, setGalleryImageId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editInitial, setEditInitial] = useState<EditImageInitial | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [page, setPage] = useState(0);

  type ImageVisibilityFilter = "active" | "hidden" | "all";
  type ImageStatusFilter = "new_reported" | "all" | "verified" | "hidden" | "no_action";

  const requestedVisibilityFilter = searchParams.get("visibilityFilter");
  const requestedStatusFilter = searchParams.get("statusFilter");
  const requestedOrderBy = searchParams.get("orderBy");
  const requestedOwnerQuery = searchParams.get("owner");

  const [visibilityFilter, setVisibilityFilter] = useState<ImageVisibilityFilter>(
    requestedVisibilityFilter === "hidden" || requestedVisibilityFilter === "all" ? requestedVisibilityFilter : "active"
  );
  const [statusFilter, setStatusFilter] = useState<ImageStatusFilter>(
    requestedStatusFilter === "new_reported" ||
      requestedStatusFilter === "verified" ||
      requestedStatusFilter === "hidden" ||
      requestedStatusFilter === "no_action"
      ? requestedStatusFilter
      : "all"
  );
  const [reportReasonFilter, setReportReasonFilter] = useState<"" | ReportReason>("");

  const [orderBy, setOrderBy] = useState<"uploaded_desc" | "uploaded_asc" | "user_asc" | "user_desc">(
    requestedOrderBy === "uploaded_asc" ||
      requestedOrderBy === "user_asc" ||
      requestedOrderBy === "user_desc"
      ? requestedOrderBy
      : "uploaded_desc"
  );

  const [ownerQuery, setOwnerQuery] = useState<string>(requestedOwnerQuery ?? "");

  const [actionByImageId, setActionByImageId] = useState<Record<number, ImageAction>>({});

  const [reviewReasonByReportId, setReviewReasonByReportId] = useState<Record<number, ReportReason>>({});
  const [reviewNoteByReportId, setReviewNoteByReportId] = useState<Record<number, string>>({});
  const [reviewOtherCoefByReportId, setReviewOtherCoefByReportId] = useState<Record<number, number>>({});
  const [reviewBusyReportId, setReviewBusyReportId] = useState<number | null>(null);

  const isReportMode = statusFilter === "new_reported";

  useEffect(() => {
    if (!isReportMode) setReportReasonFilter("");
  }, [isReportMode]);

  useEffect(() => {
    const nextVisibilityFilter =
      requestedVisibilityFilter === "hidden" || requestedVisibilityFilter === "all" ? requestedVisibilityFilter : "active";
    const nextStatusFilter: ImageStatusFilter =
      requestedStatusFilter === "new_reported" ||
      requestedStatusFilter === "verified" ||
      requestedStatusFilter === "hidden" ||
      requestedStatusFilter === "no_action"
        ? requestedStatusFilter
        : "all";
    const nextOrderBy =
      requestedOrderBy === "uploaded_asc" ||
      requestedOrderBy === "user_asc" ||
      requestedOrderBy === "user_desc"
        ? requestedOrderBy
        : "uploaded_desc";
    const nextOwnerQuery = requestedOwnerQuery ?? "";

    setVisibilityFilter((current) => (current === nextVisibilityFilter ? current : nextVisibilityFilter));
    setStatusFilter((current) => (current === nextStatusFilter ? current : nextStatusFilter));
    setOrderBy((current) => (current === nextOrderBy ? current : nextOrderBy));
    setOwnerQuery((current) => (current === nextOwnerQuery ? current : nextOwnerQuery));
    setPage(0);
  }, [requestedOrderBy, requestedOwnerQuery, requestedStatusFilter, requestedVisibilityFilter]);

  const canPrev = page > 0;
  const canNext = totalCount === null ? rows.length === PAGE_SIZE : (page + 1) * PAGE_SIZE < totalCount;

  async function load(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set("limit", String(PAGE_SIZE));
      qs.set("offset", String(nextPage * PAGE_SIZE));
      qs.set("orderBy", orderBy);
      qs.set("visibilityFilter", visibilityFilter);
      qs.set("statusFilter", statusFilter);
      if (ownerQuery.trim()) qs.set("owner", ownerQuery.trim());

      if (isReportMode && reportReasonFilter) {
        qs.set("reportReason", reportReasonFilter);
      }

      const data = await apiGetJSON<{ images: AdminImageRow[]; total_count: number | null }>(
        `/api/admin/images?${qs.toString()}`
      );

      const list = data.images ?? [];
      setRows(list);
      setTotalCount(data.total_count === null || data.total_count === undefined ? null : Number(data.total_count));

      setActionByImageId((prev) => {
        const allowed = new Set(list.map((x) => x.image_id));
        const next: Record<number, ImageAction> = {};
        for (const [k, v] of Object.entries(prev)) {
          const id = Number(k);
          if (allowed.has(id)) next[id] = v;
        }
        return next;
      });

      setReviewReasonByReportId((prev) => {
        const next = { ...prev };
        for (const img of list) {
          if (img.report_id && img.report_reason && REPORT_REASONS.includes(img.report_reason as any)) {
            if (!next[img.report_id]) next[img.report_id] = img.report_reason as any;
          }
        }
        return next;
      });

      setReviewOtherCoefByReportId((prev) => {
        const next = { ...prev };
        for (const img of list) {
          if (img.report_id && !Number.isFinite(next[img.report_id] as any)) {
            next[img.report_id] = 0.5;
          }
        }
        return next;
      });
    } catch (e: any) {
      setError(e?.message ?? "Chyba načtení fotek");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(0);
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibilityFilter, statusFilter, orderBy, reportReasonFilter]);

  function setAction(imageId: number, action: ImageAction) {
    setActionByImageId((p) => ({
      ...p,
      [imageId]: p[imageId] === action ? "none" : action,
    }));
  }

  const summary = useMemo(() => {
    let verify = 0;
    let unverify = 0;
    let hide = 0;
    let unhide = 0;
    let del = 0;

    for (const v of Object.values(actionByImageId)) {
      if (v === "verify") verify += 1;
      if (v === "unverify") unverify += 1;
      if (v === "hide") hide += 1;
      if (v === "unhide") unhide += 1;
      if (v === "delete") del += 1;
    }

    return { verify, unverify, hide, unhide, del, total: verify + unverify + hide + unhide + del };
  }, [actionByImageId]);

  async function applyChanges() {
    const { verify, unverify, hide, unhide, del, total } = summary;
    if (total === 0) {
      await awAlert("Nejsou vybrané žádné změny.");
      return;
    }

    const message =
      del > 0
        ? `Opravdu chcete trvale smazat vybrané fotky? Dojde k přepočítání skóre. Běžná akce je fotku skrýt. Současně: ${verify} verifikovat, ${unverify} odverifikovat, ${hide} skrýt, ${unhide} obnovit zobrazení, ${del} trvale smazat.`
        : `Opravdu chcete provést změny? Verifikovat: ${verify}, odverifikovat: ${unverify}, skrýt: ${hide}, obnovit zobrazení: ${unhide}.`;

    const ok = await awConfirm({
      title: "Provést změny",
      message,
      confirmLabel: "Provést",
      danger: del > 0,
    });
    if (!ok) return;

    try {
      for (const [k, v] of Object.entries(actionByImageId)) {
        const imageId = Number(k);
        if (!Number.isFinite(imageId)) continue;
        if (v !== "verify") continue;
        await apiSendJSON("/api/admin/images/verify", "POST", { imageId, verified: true });
      }

      for (const [k, v] of Object.entries(actionByImageId)) {
        const imageId = Number(k);
        if (!Number.isFinite(imageId)) continue;
        if (v !== "unverify") continue;
        await apiSendJSON("/api/admin/images/verify", "POST", { imageId, verified: false });
      }

      for (const [k, v] of Object.entries(actionByImageId)) {
        const imageId = Number(k);
        if (!Number.isFinite(imageId)) continue;
        if (v !== "hide" && v !== "unhide") continue;
        await apiSendJSON("/api/admin/images", "PATCH", { imageId, hidden: v === "hide" });
      }

      for (const [k, v] of Object.entries(actionByImageId)) {
        const imageId = Number(k);
        if (!Number.isFinite(imageId)) continue;
        if (v !== "delete") continue;
        await apiSendJSON("/api/admin/images", "DELETE", { imageId });
      }

      setActionByImageId({});
      load(page);

      await awAlert("Změny byly provedeny.");
    } catch (e: any) {
      await awAlert(e?.message ?? "Změny se nepodařilo provést.");
    }
  }
  async function reviewReport(opts: { reportId: number; action: "confirm" | "reject" }) {
    const reportId = Number(opts.reportId);
    if (!Number.isFinite(reportId)) return;

    const reason = reviewReasonByReportId[reportId];
    const note = (reviewNoteByReportId[reportId] ?? "").trim();
    const otherCoef = clamp01(Number(reviewOtherCoefByReportId[reportId] ?? 0.5));

    const actionLabel = opts.action === "confirm" ? "potvrdit" : "zamítnout";
    const ok = await awConfirm(`Opravdu chcete ${actionLabel} nahlášení (#${reportId})?`);
    if (!ok) return;

    setReviewBusyReportId(reportId);
    try {
      const payload: any = {
        reportId,
        action: opts.action,
        reason: reason ?? null,
        adminNote: note.length ? note : null,
      };

      if (opts.action === "confirm" && reason === "Ostatní - uveďte v komentáři") {
        payload.otherCoef = otherCoef;
      }

      await apiSendJSON("/api/admin/image-reports", "POST", payload);

      await load(page);
      window.dispatchEvent(new Event("aw-notifications-changed"));
      await awAlert("Nahlášení bylo zpracováno.");
    } catch (e: any) {
      await awAlert(e?.message ?? "Zpracování nahlášení se nepodařilo.");
    } finally {
      setReviewBusyReportId(null);
    }
  }

  function openAdminEditImage(img: AdminImageRow) {
    setEditInitial({
      id: img.image_id,
      taken_at: img.taken_at ?? null,
      photo_category: (img.photo_category as any) ?? null,
      tags: Array.isArray(img.tags) ? (img.tags as any) : null,
      include_in_global_aw: img.include_in_global_aw ?? true,
      comment: img.comment ?? null,
      public_url: img.public_url ?? null,
      public_url_medium: img.public_url_medium ?? null,
      public_url_thumb: img.public_url_thumb ?? null,
    });
    setEditError(null);
    setEditOpen(true);
  }

  async function saveAdminImageEdit(payload: {
    imageId: number;
    takenAt: string;
    photoTags: string[];
    includeInGlobalAw: boolean;
    comment: string | null;
    replacementFile?: File | null;
  }) {
    setEditBusy(true);
    setEditError(null);
    try {
      if (payload.replacementFile) {
        await updateMyImageFile({
          imageId: payload.imageId,
          file: payload.replacementFile,
        });
      }
      await apiSendJSON("/api/admin/images", "PATCH", payload);
      setEditOpen(false);
      setEditInitial(null);
      await load(page);
      await awAlert("Fotka byla upravena.");
    } catch (e: any) {
      setEditError(e?.message ?? "Fotku se nepodařilo upravit.");
    } finally {
      setEditBusy(false);
    }
  }

  async function hardDeleteImage(imageId: number) {
    const ok = await awConfirm({
      title: "Trvale smazat fotku",
      message: "Opravdu chcete trvale smazat vybranou fotku? Dojde k přepočítání skóre. Běžná akce je fotku skrýt.",
      confirmLabel: "Trvale smazat",
      danger: true,
    });
    if (!ok) return;
    await apiSendJSON("/api/admin/images", "DELETE", { imageId });
    setGalleryImageId(null);
    await load(page);
    await awAlert("Fotka byla trvale smazána.");
  }

  function buildModeratorPhotoDraft(img: AdminImageRow) {
    const photoLink = img.public_url ?? img.public_url_medium ?? img.public_url_thumb ?? "";
    return [
      "Dobrý den,",
      `kontaktuji Vás ohledně Vámi publikované fotografie: ${photoLink || "[odkaz na fotku není k dispozici]"}`,
      "",
      "....",
      "",
      "Děkujeme",
      "",
      "Tým správců sítě AgeWinners",
    ].join("\n");
  }

  async function openModeratorThread(img: AdminImageRow) {
    try {
      const threadId = await getOrCreateModeratorOutreachThread(img.uploader_user_id);
      const params = new URLSearchParams({
        thread: String(threadId),
        draft: buildModeratorPhotoDraft(img),
      });
      const href = `/admin/moderator-messages?${params.toString()}`;
      if (typeof window !== "undefined") {
        const opened = window.open(href, "_blank", "noopener,noreferrer");
        if (!opened) router.push(href);
      } else {
        router.push(href);
      }
    } catch (e: any) {
      await awAlert(e?.message ?? "Konverzaci s uživatelem se nepodařilo otevřít.");
    }
  }

  const galleryImages = useMemo(
    () =>
      rows
        .filter((img) => img.public_url || img.public_url_medium || img.public_url_thumb)
        .map((img) => ({
          id: img.image_id,
          src: img.public_url ?? img.public_url_medium ?? img.public_url_thumb ?? "",
          alt: img.comment || "Fotka",
          image: img,
        })),
    [rows]
  );

  const galleryInitialIndex = galleryImageId
    ? Math.max(0, galleryImages.findIndex((item) => Number(item.id) === galleryImageId))
    : 0;

  return (
    <section className="rounded-2xl border bg-white p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Fotky</h2>
          <div className="mt-1">
            <RangeInfo page={page} pageSize={PAGE_SIZE} total={totalCount} currentCount={rows.length} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[auto_minmax(220px,420px)_auto_auto_auto_auto_auto] sm:items-center">
          <label className="text-sm text-slate-700">Filtr jména:</label>
          <input
            className="w-full rounded-xl border px-3 py-2 text-sm"
            value={ownerQuery}
            onChange={(e) => setOwnerQuery(e.target.value)}
            placeholder="např. Jana…"
          />
          <select
            className="rounded-xl border px-3 py-2 text-sm"
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as ImageVisibilityFilter)}
          >
            <option value="active">Aktivní</option>
            <option value="hidden">Jen skryté</option>
            <option value="all">Všechny fotky</option>
          </select>
          <select
            className="rounded-xl border px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ImageStatusFilter)}
          >
            <option value="new_reported">Nově hlášené</option>
            <option value="all">Všechny</option>
            <option value="verified">Verifikované</option>
            <option value="no_action">Bez akce</option>
          </select>
          <select className="rounded-xl border px-3 py-2 text-sm" value={orderBy} onChange={(e) => setOrderBy(e.target.value as any)}>
            <option value="uploaded_desc">Upload: nejnovější</option>
            <option value="uploaded_asc">Upload: nejstarší</option>
            <option value="user_asc">Jméno: A → Z</option>
            <option value="user_desc">Jméno: Z → A</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setPage(0);
              load(0);
            }}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Použít filtr
          </button>
          <RefreshIconButton onClick={() => load(page)} />
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-700">
          Vybráno: <span className="font-semibold text-slate-900">{summary.total}</span>
          {" • "}Verifikovat: <span className="font-semibold">{summary.verify}</span>
          {" • "}Odverifikovat: <span className="font-semibold">{summary.unverify}</span>
          {" • "}Skrýt: <span className="font-semibold">{summary.hide}</span>
          {" • "}Obnovit: <span className="font-semibold">{summary.unhide}</span>
          {" • "}Smazat: <span className="font-semibold">{summary.del}</span>
        </div>

        <button
          type="button"
          onClick={applyChanges}
          disabled={summary.total === 0}
          className={cx(
            "rounded-xl px-4 py-2 text-sm font-semibold",
            summary.total === 0 ? "bg-slate-200 text-slate-600 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700"
          )}
        >
          Provést změny
        </button>
      </div>

      <div className="mb-4">
        <Pager
          page={page}
          canPrev={canPrev}
          canNext={canNext}
          onPrev={() => {
            const p = Math.max(0, page - 1);
            setPage(p);
            load(p);
          }}
          onNext={() => {
            const p = page + 1;
            setPage(p);
            load(p);
          }}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-slate-600">Načítám…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((img) => {
            const thumb = img.public_url_thumb || img.public_url_medium || img.public_url;
            const isVerified = Boolean(img.verified_at);
            const isReported = Boolean(img.reported_at);
            const isHidden = Boolean(img.hidden_by_admin);
            const reportId = img.report_id ?? null;

            const selected = actionByImageId[img.image_id] ?? "none";
            const canVerify = !isVerified;
            const canUnverify = isVerified;

            const reviewBusy = reportId !== null && reviewBusyReportId === reportId;
            const selectedReason = reportId ? (reviewReasonByReportId[reportId] ?? (img.report_reason as any)) : null;
            const isOther = selectedReason === "Ostatní - uveďte v komentáři";

            return (
              <div
                key={img.image_id}
                className={cx(
                  "rounded-2xl border p-3 xl:grid xl:grid-cols-[160px_minmax(0,1fr)] xl:items-start xl:gap-x-3 xl:gap-y-3",
                  isReported ? "border-rose-400" : isHidden ? "border-amber-300 bg-amber-50/40" : "border-slate-200"
                )}
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt="Fotka"
                    className="h-44 w-full cursor-zoom-in rounded-xl bg-slate-100 object-contain xl:row-span-2 xl:h-52 xl:w-40"
                    onClick={() => setGalleryImageId(img.image_id)}
                    title="Klikni pro otevření"
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-600 xl:row-span-2 xl:h-52 xl:w-40">
                    Bez náhledu
                  </div>
                )}

                <div className="mt-3 space-y-1 xl:mt-0 xl:min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{img.owner_display_name ?? "—"}</p>

                  <p className="text-xs text-slate-500">
                    Upload: {formatDateTime(img.created_at)} • Taken: {formatDate(img.taken_at)}
                  </p>

                  {isReported && (
                    <div className="rounded-xl bg-rose-50 p-2 text-xs text-rose-800">
                      <div>
                        <span className="font-semibold">Nahlášeno:</span> {formatDateTime(img.reported_at)} {" • "}
                        <span className="font-semibold">{img.reporter_display_name ?? img.reporter_user_id ?? "—"}</span>
                        {reportId ? <span className="text-rose-700">{" • "}#{reportId}</span> : null}
                      </div>
                      <div className="mt-1">
                        <span className="font-semibold">Kategorie:</span> {img.report_reason ?? "—"}
                      </div>
                      {img.report_details ? (
                        <div className="mt-1">
                          <span className="font-semibold">Komentář:</span> {img.report_details}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {isVerified && (
                    <p className="text-xs text-emerald-700">
                      Verifikováno: <span className="font-semibold">{formatDateTime(img.verified_at)}</span>
                      {" • "}
                      <span className="font-semibold">{img.verified_by_display_name ?? img.verified_by ?? "—"}</span>
                    </p>
                  )}
                  {isHidden ? (
                    <p className="text-xs font-semibold text-amber-700">Skryto: {formatDateTime(img.hidden_by_admin_at)}</p>
                  ) : null}
                </div>

                {isReported && reportId ? (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-white p-3 xl:col-span-2 xl:row-start-4 xl:mt-0">
                    <div className="text-xs font-semibold text-slate-800">Zpracování nahlášení</div>

                    <div className="mt-2">
                      <label className="text-xs font-semibold text-slate-700">Kategorie po revizi:</label>
                      <select
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        value={reviewReasonByReportId[reportId] ?? (img.report_reason as any) ?? ""}
                        onChange={(e) =>
                          setReviewReasonByReportId((p) => ({
                            ...p,
                            [reportId]: e.target.value as any,
                          }))
                        }
                        disabled={reviewBusy}
                      >
                        {REPORT_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    {isOther ? (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                        <div className="text-xs font-semibold text-slate-700">Koeficient penalizace (0.0 – 1.0)</div>
                        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_80px] sm:items-center">
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.1}
                            value={clamp01(Number(reviewOtherCoefByReportId[reportId] ?? 0.5))}
                            onChange={(e) =>
                              setReviewOtherCoefByReportId((p) => ({
                                ...p,
                                [reportId]: clamp01(Number(e.target.value)),
                              }))
                            }
                            disabled={reviewBusy}
                            className="w-full"
                          />
                          <input
                            type="number"
                            min={0}
                            max={1}
                            step={0.1}
                            value={clamp01(Number(reviewOtherCoefByReportId[reportId] ?? 0.5))}
                            onChange={(e) =>
                              setReviewOtherCoefByReportId((p) => ({
                                ...p,
                                [reportId]: clamp01(Number(e.target.value)),
                              }))
                            }
                            disabled={reviewBusy}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          />
                        </div>
                        <div className="mt-1 text-xs text-slate-600">
                          Default: <span className="font-semibold">0.5</span>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-2">
                      <label className="text-xs font-semibold text-slate-700">Poznámka správce (volitelné):</label>
                      <textarea
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        rows={2}
                        value={reviewNoteByReportId[reportId] ?? ""}
                        onChange={(e) => setReviewNoteByReportId((p) => ({ ...p, [reportId]: e.target.value }))}
                        placeholder="např. důvod rozhodnutí…"
                        disabled={reviewBusy}
                      />
                    </div>

                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => reviewReport({ reportId, action: "reject" })}
                        disabled={reviewBusy}
                        className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-200 disabled:opacity-50"
                      >
                        Zamítnout nahlášení
                      </button>
                      <button
                        type="button"
                        onClick={() => reviewReport({ reportId, action: "confirm" })}
                        disabled={reviewBusy}
                        className="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                      >
                        Potvrdit nahlášení
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-3 grid gap-2 xl:col-start-2 xl:row-start-2 xl:mt-0">
                  {canVerify && (
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                      <input type="checkbox" checked={selected === "verify"} onChange={() => setAction(img.image_id, "verify")} />
                      <span className="font-medium text-slate-800">Verifikovat</span>
                    </label>
                  )}

                  {canUnverify && (
                    <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                      <input type="checkbox" checked={selected === "unverify"} onChange={() => setAction(img.image_id, "unverify")} />
                      <span className="font-medium text-slate-800">Odverifikovat</span>
                    </label>
                  )}

                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <input type="checkbox" checked={selected === (isHidden ? "unhide" : "hide")} onChange={() => setAction(img.image_id, isHidden ? "unhide" : "hide")} />
                    <span className="font-medium text-slate-800">{isHidden ? "Obnovit zobrazení" : "Skrýt"}</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                    <input type="checkbox" checked={selected === "delete"} onChange={() => setAction(img.image_id, "delete")} />
                    <span className="font-medium text-rose-700">Trvale smazat</span>
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 xl:col-start-2 xl:row-start-3 xl:mt-0">
                  <button
                    type="button"
                    onClick={() => void openModeratorThread(img)}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200"
                  >
                    Napsat uživateli
                  </button>
                </div>
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="rounded-xl border bg-slate-50 p-6 text-center text-slate-600 sm:col-span-2 lg:col-span-3">
              Žádné fotky dle filtrů.
            </div>
          )}
        </div>
      )}

      <ImageGalleryModal
        open={galleryImageId != null && galleryImages.length > 0}
        images={galleryImages}
        initialIndex={galleryInitialIndex}
        onClose={() => setGalleryImageId(null)}
        renderCaption={(item) => (
          <div className="mb-3 rounded-xl bg-black/55 px-4 py-2 text-center text-sm font-semibold text-white shadow">
            {item.image.owner_display_name ?? "Bez autora"} · {formatDate(item.image.taken_at)}
          </div>
        )}
        renderFooter={(item) => (
          <div className="mx-auto mt-3 flex max-w-3xl flex-col gap-3 rounded-2xl bg-white/95 p-4 text-sm text-slate-800 shadow-xl">
            <div className="grid gap-2 sm:grid-cols-4">
              <div><span className="font-semibold">Věk:</span> {item.image.real_age_years ?? "—"}</div>
              <div><span className="font-semibold">AW věk:</span> {item.image.aw_age_image ?? item.image.avg_guessed_age ?? "—"}</div>
              <div><span className="font-semibold">Tipů:</span> {item.image.guesses_count ?? 0}</div>
              <div><span className="font-semibold">Stav:</span> {item.image.hidden_by_admin ? "Skrytá" : "Viditelná"}</div>
            </div>
            {item.image.comment ? <div className="text-slate-700">{item.image.comment}</div> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => openAdminEditImage(item.image)}
                className="rounded-xl bg-blue-950 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
              >
                Editovat fotku
              </button>
              <button
                type="button"
                onClick={() => void hardDeleteImage(item.image.image_id)}
                className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
              >
                Smazat fotku
              </button>
            </div>
          </div>
        )}
      />

      <EditImageModal
        open={editOpen}
        initial={editInitial}
        busy={editBusy}
        error={editError}
        onClose={() => {
          if (editBusy) return;
          setEditOpen(false);
          setEditInitial(null);
          setEditError(null);
        }}
        onSave={saveAdminImageEdit}
      />
    </section>
  );
}


