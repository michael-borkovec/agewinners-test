/**
 * File purpose
 * - Render the "My Network" page with tabs, search, suggestions, and inline network actions.
 * Main responsibilities
 * - Load connections, follows, followers, pending requests, and simple suggestions.
 * - Search users by name or bio and filter results in the UI.
 * Related APIs, components, or modules
 * - lib/api/network
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import HelpIconButton from "@/components/HelpIconButton";
import { PageSectionTitle } from "@/components/PageSectionTitle";
import RefreshIconButton from "@/components/RefreshIconButton";
import AwButton from "@/components/AwButton";
import { awAlert, awPrompt } from "@/components/AwDialog";
import {
  PERSONAL_DIET_PREFERENCE_OPTIONS,
  PERSONAL_RELATIONSHIP_STATUS_OPTIONS,
} from "@/lib/profilePersonalOptions";
import {
  PROFILE_SEARCH_ACTIVITY_OPTIONS,
  PROFILE_SEARCH_EDUCATION_LEVEL_OPTIONS,
  PROFILE_SEARCH_LIFE_GOAL_OPTIONS,
  PROFILE_SEARCH_NATIVE_LANGUAGE_OPTIONS,
  PROFILE_SEARCH_PRIMARY_INTEREST_OPTIONS,
} from "@/lib/profileSearchOptions";
import {
  acceptConnectionRequest,
  cancelConnectionRequest,
  declineConnectionRequest,
  followUser,
  getMyNetworkCounts,
  getNetworkProfileInsights,
  listBlockedUsers,
  listMyConnections,
  listMyFollowers,
  listMyFollowing,
  listMyRequests,
  listSuggestedNetworkUsers,
  removeConnection,
  requestConnection,
  searchNetworkUsers,
  unblockUser,
  unfollowUser,
  type ConnectionRequestRow,
  type NetworkProfileInsights,
  type NetworkSearchFilters,
  type NetworkSearchResult,
  type NetworkUserLite,
} from "@/lib/api/network";
import { formatAbsoluteUiTimestamp, formatRelativeUiTimestamp } from "@/lib/utils/timeFormat";

type TabKey = "connections" | "following" | "followers" | "requests" | "suggestions" | "blocked";
type ModalUser = (NetworkUserLite & { connection_state?: NetworkSearchResult["connection_state"] }) | null;
type RequestViewKey = "incoming" | "outgoing";
type NetworkPanelKey = "overview" | "search";

const SECONDARY_LINK_CLASS =
  "inline-flex min-h-9 items-center justify-center rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:ring-offset-2";

type SearchFilterState = {
  occupation: string;
  educationLevel: string;
  isStudentOnly: boolean;
  nativeLanguage: string;
  relationshipStatus: string;
  primaryInterest: string;
  lifeGoal: string;
  activity: string;
  dietPreference: string;
};

function shortUuid(u: string) {
  if (!u) return "";
  return u.length > 18 ? `${u.slice(0, 8)}...${u.slice(-6)}` : u;
}

function displayNameOrUuid(p: NetworkUserLite) {
  const name = (p.display_name ?? "").trim();
  return name.length ? name : shortUuid(p.user_id);
}

function displayInitial(p: NetworkUserLite) {
  const name = (p.display_name ?? "").trim();
  if (name.length) return name.charAt(0).toUpperCase();
  return "U";
}

function formatDateTime(value: string | null | undefined) {
  return formatAbsoluteUiTimestamp(value, "—");
}

function formatListRelativeTime(value: string | null | undefined, prefix?: string) {
  const text = formatRelativeUiTimestamp(value, "—");
  return prefix ? `${prefix} ${text}` : text;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function getConnectionStateLabel(state: NetworkSearchResult["connection_state"] | undefined) {
  if (state === "connected") return "Ve spojení";
  if (state === "outgoing_request") return "Žádost čeká";
  if (state === "incoming_request") return "Příchozí žádost";
  return "Bez spojení";
}

function getConnectionStateTone(state: NetworkSearchResult["connection_state"] | undefined): "emerald" | "slate" | "amber" {
  if (state === "connected") return "emerald";
  if (state === "none") return "slate";
  return "amber";
}

function getSuggestionReasonChips(user: NetworkSearchResult) {
  const chips: string[] = [];

  if ((user.mutual_connections_count ?? 0) > 0) {
    chips.push(`${user.mutual_connections_count} společných spojení`);
  }
  if ((user.common_following_count ?? 0) > 0) {
    chips.push(`${user.common_following_count} oba sledujete`);
  }
  if (user.allow_connections && chips.length === 0) {
    chips.push("Přijímá spojení");
  }
  if (chips.length === 0) {
    chips.push("Doporučeno podle podobného profilu");
  }

  return chips.slice(0, 2);
}

function getCompactNetworkSummary(user: {
  connections_count?: number | null;
  followers_count?: number | null;
  following_count?: number | null;
  mutual_connections_count?: number | null;
  common_following_count?: number | null;
}) {
  const items = [
    `${user.connections_count ?? 0} spojení`,
    `${user.followers_count ?? 0} sledujících`,
    `${user.following_count ?? 0} sleduje`,
  ];

  if ((user.mutual_connections_count ?? 0) > 0) {
    items.push(`${user.mutual_connections_count} společných spojení`);
  }

  if ((user.common_following_count ?? 0) > 0) {
    items.push(`${user.common_following_count} společně sledujete`);
  }

  return items;
}

async function promptOptionalMessage(title: string) {
  return awPrompt({
    title: "Volitelná zpráva",
    message: title,
    confirmLabel: "Pokračovat",
  });
}

function toSearchFilters(filters: SearchFilterState): NetworkSearchFilters {
  return {
    occupation: filters.occupation.trim() || undefined,
    educationLevel: filters.educationLevel.trim() || undefined,
    isStudent: filters.isStudentOnly ? true : undefined,
    nativeLanguage: filters.nativeLanguage.trim() || undefined,
    relationshipStatus: filters.relationshipStatus || undefined,
    primaryInterest: filters.primaryInterest.trim() || undefined,
    lifeGoal: filters.lifeGoal.trim() || undefined,
    activity: filters.activity.trim() || undefined,
    dietPreference: filters.dietPreference || undefined,
  };
}

function hasAdvancedFilters(filters: SearchFilterState) {
  return Object.values(filters).some((value) => (typeof value === "boolean" ? value : String(value).trim().length > 0));
}

function getActiveSearchFilterChips(filters: SearchFilterState) {
  const chips: Array<{ key: keyof SearchFilterState; label: string; value: string }> = [];

  if (filters.occupation.trim()) chips.push({ key: "occupation", label: "Povolání", value: filters.occupation.trim() });
  if (filters.educationLevel.trim()) chips.push({ key: "educationLevel", label: "Vzdělání", value: filters.educationLevel.trim() });
  if (filters.nativeLanguage.trim()) chips.push({ key: "nativeLanguage", label: "Rodný jazyk", value: filters.nativeLanguage.trim() });
  if (filters.relationshipStatus) chips.push({ key: "relationshipStatus", label: "Status", value: filters.relationshipStatus });
  if (filters.primaryInterest.trim()) chips.push({ key: "primaryInterest", label: "Primární zájem", value: filters.primaryInterest.trim() });
  if (filters.lifeGoal.trim()) chips.push({ key: "lifeGoal", label: "Životní cíl", value: filters.lifeGoal.trim() });
  if (filters.activity.trim()) chips.push({ key: "activity", label: "Sport / pohyb", value: filters.activity.trim() });
  if (filters.dietPreference) chips.push({ key: "dietPreference", label: "Strava", value: filters.dietPreference });
  if (filters.isStudentOnly) chips.push({ key: "isStudentOnly", label: "Typ profilu", value: "Jen studenti" });

  return chips;
}

export default function NetworkPage() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabKey>("connections");
  const [requestView, setRequestView] = useState<RequestViewKey>("incoming");
  const [panel, setPanel] = useState<NetworkPanelKey>("overview");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [counts, setCounts] = useState({
    connections: 0,
    following: 0,
    followers: 0,
    incomingRequests: 0,
    outgoingRequests: 0,
    blocked: 0,
  });

  const [connections, setConnections] = useState<NetworkUserLite[]>([]);
  const [following, setFollowing] = useState<NetworkUserLite[]>([]);
  const [followers, setFollowers] = useState<NetworkUserLite[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<NetworkUserLite[]>([]);
  const [suggestions, setSuggestions] = useState<NetworkSearchResult[]>([]);
  const [incomingReq, setIncomingReq] = useState<Array<ConnectionRequestRow & { requester?: NetworkUserLite }>>([]);
  const [outgoingReq, setOutgoingReq] = useState<Array<ConnectionRequestRow & { target?: NetworkUserLite }>>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchTouched, setSearchTouched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<NetworkSearchResult[]>([]);
  const [filters, setFilters] = useState<SearchFilterState>({
    occupation: "",
    educationLevel: "",
    isStudentOnly: false,
    nativeLanguage: "",
    relationshipStatus: "",
    primaryInterest: "",
    lifeGoal: "",
    activity: "",
    dietPreference: "",
  });
  const [filterNotConnected, setFilterNotConnected] = useState(true);
  const [filterNotFollowing, setFilterNotFollowing] = useState(false);
  const [filterOnlyConnectable, setFilterOnlyConnectable] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [detailUser, setDetailUser] = useState<ModalUser>(null);
  const [detailInsights, setDetailInsights] = useState<NetworkProfileInsights | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const advancedFiltersActive = hasAdvancedFilters(filters);
  const activeFilterChips = useMemo(() => getActiveSearchFilterChips(filters), [filters]);

  function openOverviewTab(nextTab: TabKey) {
    setPanel("overview");
    setTab(nextTab);
  }

  function openRequestSection(nextView: RequestViewKey) {
    setPanel("overview");
    setTab("requests");
    setRequestView(nextView);
  }

  const header = useMemo(() => {
    if (tab === "connections") return "Spojení";
    if (tab === "following") return "Sleduji";
    if (tab === "followers") return "Sledují mě";
    if (tab === "requests") return requestView === "incoming" ? "Nové žádosti" : "Moje žádosti";
    if (tab === "suggestions") return "Možná znáš";
    if (tab === "blocked") return "Blokovaní uživatelé";
    return "Žádosti o spojení";
  }, [requestView, tab]);

  const filteredSearchResults = useMemo(() => {
    return searchResults.filter((user) => {
      if (filterNotConnected && user.connection_state !== "none") return false;
      if (filterNotFollowing && user.is_following) return false;
      if (filterOnlyConnectable && !user.allow_connections) return false;
      return true;
    });
  }, [filterNotConnected, filterNotFollowing, filterOnlyConnectable, searchResults]);

  async function reloadAll() {
    setLoading(true);
    try {
      const [c, conns, fol, fers, blocked, req, suggested] = await Promise.all([
        getMyNetworkCounts(),
        listMyConnections(),
        listMyFollowing(),
        listMyFollowers(),
        listBlockedUsers(),
        listMyRequests(),
        listSuggestedNetworkUsers(),
      ]);

      setCounts(c);
      setConnections(conns);
      setFollowing(fol);
      setFollowers(fers);
      setBlockedUsers(blocked);
      setIncomingReq(req.incoming);
      setOutgoingReq(req.outgoing);
      setSuggestions(suggested);
    } catch (e: unknown) {
      await awAlert(getErrorMessage(e, "Moji síť se nepodařilo načíst."));
    } finally {
      setLoading(false);
    }
  }

  async function openDetail(user: ModalUser) {
    setDetailUser(user);
    if (!user) {
      setDetailInsights(null);
      return;
    }

    setDetailLoading(true);
    try {
      const insights = await getNetworkProfileInsights(user.user_id);
      setDetailInsights(insights);
    } catch (e: unknown) {
      setDetailInsights(null);
      await awAlert(getErrorMessage(e, "Detail sítě se nepodařilo načíst."));
    } finally {
      setDetailLoading(false);
    }
  }

  async function runSearch(queryOverride?: string) {
    const q = (queryOverride ?? searchQuery).trim();
    const advanced = hasAdvancedFilters(filters);
    setSearchTouched(true);

    if (!q && !advanced) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const data = await searchNetworkUsers(q, toSearchFilters(filters));
      setSearchResults(data);
    } catch (e: unknown) {
      await awAlert(getErrorMessage(e, "Vyhledávání se nepodařilo."));
    } finally {
      setSearchLoading(false);
    }
  }

  async function refreshSearchIfNeeded() {
    if (searchTouched && (searchQuery.trim() || hasAdvancedFilters(filters))) {
      await runSearch(searchQuery);
    }
  }

  async function requestConnectionWithOptionalMessage(targetUserId: string) {
    const message = await promptOptionalMessage("Chceš přidat zprávu k žádosti o spojení? Můžeš nechat prázdné.");
    if (message === null) return;
    await requestConnection(targetUserId, message);
  }

  async function declineRequestWithOptionalMessage(requestId: string) {
    const message = await promptOptionalMessage("Chceš přidat zprávu k zamítnutí žádosti? Můžeš nechat prázdné.");
    if (message === null) return;
    await declineConnectionRequest(requestId, message);
  }

  useEffect(() => {
    void reloadAll();
  }, []);

  useEffect(() => {
    const requestedTab = searchParams?.get("tab");
    const requestedSection = searchParams?.get("section");
    const requestedPanel = searchParams?.get("panel");
    if (
      requestedTab === "connections" ||
      requestedTab === "following" ||
      requestedTab === "followers" ||
      requestedTab === "requests" ||
      requestedTab === "suggestions" ||
      requestedTab === "blocked"
    ) {
      setTab(requestedTab);
    }
    if (requestedSection === "incoming" || requestedSection === "outgoing") {
      setRequestView(requestedSection);
    }
    setPanel(requestedPanel === "search" ? "search" : "overview");
  }, [searchParams]);

  useEffect(() => {
    if (advancedFiltersActive) setShowAdvancedFilters(true);
  }, [advancedFiltersActive]);

  function clearAdvancedFilters() {
    setFilters({
      occupation: "",
      educationLevel: "",
      isStudentOnly: false,
      nativeLanguage: "",
      relationshipStatus: "",
      primaryInterest: "",
      lifeGoal: "",
      activity: "",
      dietPreference: "",
    });
  }

  function clearSingleAdvancedFilter(key: keyof SearchFilterState) {
    setFilters((prev) => ({
      ...prev,
      [key]: key === "isStudentOnly" ? false : "",
    }));
  }

  async function withBusy(key: string, action: () => Promise<void>, fallbackMessage: string) {
    setBusyKey(key);
    try {
      await action();
      await reloadAll();
      await refreshSearchIfNeeded();
      if (detailUser) {
        await openDetail(detailUser);
      }
    } catch (e: unknown) {
      await awAlert(getErrorMessage(e, fallbackMessage));
    } finally {
      setBusyKey(null);
    }
  }

  function renderSearchRow(user: NetworkSearchResult) {
    return (
      <SearchResultRow
        key={user.user_id}
        user={user}
        busyKey={busyKey}
        onOpenDetail={() => void openDetail(user)}
        onRequestConnection={() =>
          withBusy(
            `request-${user.user_id}`,
            () => requestConnectionWithOptionalMessage(user.user_id),
            "Nepodařilo se odeslat žádost o spojení."
          )
        }
        onCancelRequest={() =>
          user.request_id
            ? withBusy(
                `cancel-request-${user.user_id}`,
                () => cancelConnectionRequest(user.request_id as string),
                "Nepodařilo se zrušit žádost."
              )
            : Promise.resolve()
        }
        onAcceptRequest={() =>
          user.request_id
            ? withBusy(
                `accept-request-${user.user_id}`,
                () => acceptConnectionRequest(user.request_id as string),
                "Nepodařilo se přijmout žádost."
              )
            : Promise.resolve()
        }
        onDeclineRequest={() =>
          user.request_id
            ? withBusy(
                `decline-request-${user.user_id}`,
                () => declineRequestWithOptionalMessage(user.request_id as string),
                "Nepodařilo se zamítnout žádost."
              )
            : Promise.resolve()
        }
        onRemoveConnection={() =>
          withBusy(
            `remove-connection-${user.user_id}`,
            () => removeConnection(user.user_id),
            "Nepodařilo se zrušit spojení."
          )
        }
        onFollowToggle={() =>
          withBusy(
            `toggle-follow-${user.user_id}`,
            () => (user.is_following ? unfollowUser(user.user_id) : followUser(user.user_id)),
            user.is_following ? "Nepodařilo se přestat sledovat." : "Nepodařilo se zahájit sledování."
          )
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <PageSectionTitle
              title="Moje síť"
              iconPath="/ui/Menu-Moje-sit.ico"
              sizeClassName="text-[1.625rem]"
            />
            <p className="mt-1 text-sm text-slate-600">Spojení jsou rovnocenná. Sledování je jednostranné. Blokace vychází z aktuálního seznamu blokovaných uživatelů.</p>
          </div>

          <div className="ml-auto flex shrink-0 items-center justify-end gap-1">
            <HelpIconButton
              helpText="Moje síť spojuje kontakty, sledování, žádosti i doporučení. Trychtýř otevře pokročilé hledání lidí. Obnovení stáhne aktuální přehled spojení, sledujících i čekajících žádostí."
              modalTitle="Nápověda – Moje síť"
            />
            <button
              type="button"
              onClick={() => {
                setPanel("search");
                setShowAdvancedFilters((prev) => (panel === "search" ? !prev : true));
              }}
              className="rounded-md p-2 hover:bg-slate-100"
              aria-label="Filtry sítě"
              title="Filtry sítě"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={showAdvancedFilters || advancedFiltersActive ? "/funnel-full.ico" : "/funnel-empty.ico"} alt="" className="h-5 w-5" />
            </button>
            <RefreshIconButton
              onClick={() => {
                void reloadAll();
                void refreshSearchIfNeeded();
              }}
              disabled={loading || searchLoading || busyKey !== null}
              activeIconPath="/ui/refresh-rot.gif"
              activeDurationMs={5000}
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <CountPill label="Spojení" value={counts.connections} active={tab === "connections"} onClick={() => openOverviewTab("connections")} />
          <CountPill label="Sleduji" value={counts.following} active={tab === "following"} onClick={() => openOverviewTab("following")} />
          <CountPill label="Sledují mě" value={counts.followers} active={tab === "followers"} onClick={() => openOverviewTab("followers")} />
          <CountPill label="Možná znáš" value={suggestions.length} active={tab === "suggestions"} onClick={() => openOverviewTab("suggestions")} />
          <CountPill label="Blokovaní" value={counts.blocked} active={tab === "blocked"} onClick={() => openOverviewTab("blocked")} />
        </div>

        {panel === "search" ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Vyhledat uživatele</div>
                <div className="mt-1 text-xs text-slate-500">
                  Hledej podle jména nebo bio. Přesnější výběr otevři přes filtry, podobně jako na běžných sociálních sítích.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvancedFilters((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 transition hover:bg-slate-100"
                aria-label="Filtry vyhledávání"
                title="Filtry vyhledávání"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={showAdvancedFilters || advancedFiltersActive ? "/funnel-full.ico" : "/funnel-empty.ico"}
                  alt=""
                  className="h-5 w-5"
                />
              </button>
            </div>

            <form
              className="mt-3 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void runSearch();
              }}
            >
              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Hledaný uživatel</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Zadej jméno nebo část bio"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                  />
                </div>

              <div className="flex gap-3 lg:items-end">
                  <AwButton
                    type="submit"
                    disabled={searchLoading}
                    variant="primary"
                    className="flex-1 lg:flex-none"
                  >
                    {searchLoading ? "Hledám..." : "Vyhledat"}
                  </AwButton>
                </div>
              </div>

              {showAdvancedFilters ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">Upřesnit hledání</div>
                      <div className="mt-1 text-xs text-slate-500">Vyber pár parametrů navíc. Nemusíš vyplňovat všechno.</div>
                    </div>

                    {advancedFiltersActive ? (
                      <AwButton
                        type="button"
                        onClick={clearAdvancedFilters}
                        variant="tertiary"
                      >
                        Vyčistit rozšířené filtry
                      </AwButton>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <SearchTextField
                      label="Povolání"
                      placeholder="Např. designér, lékař..."
                      value={filters.occupation}
                      onChange={(value) => setFilters((prev) => ({ ...prev, occupation: value }))}
                    />
                    <SearchSelectField
                      label="Vzdělání"
                      placeholder="Nezáleží"
                      value={filters.educationLevel}
                      options={PROFILE_SEARCH_EDUCATION_LEVEL_OPTIONS as unknown as string[]}
                      onChange={(value) => setFilters((prev) => ({ ...prev, educationLevel: value }))}
                    />
                    <SearchSelectField
                      label="Rodný jazyk"
                      placeholder="Nezáleží"
                      value={filters.nativeLanguage}
                      options={PROFILE_SEARCH_NATIVE_LANGUAGE_OPTIONS as unknown as string[]}
                      onChange={(value) => setFilters((prev) => ({ ...prev, nativeLanguage: value }))}
                    />
                    <SearchSelectField
                      label="Vztahový status"
                      value={filters.relationshipStatus}
                      placeholder="Nezáleží"
                      options={PERSONAL_RELATIONSHIP_STATUS_OPTIONS}
                      onChange={(value) => setFilters((prev) => ({ ...prev, relationshipStatus: value }))}
                    />
                    <SearchSelectField
                      label="Stravovací preference"
                      value={filters.dietPreference}
                      placeholder="Nezáleží"
                      options={PERSONAL_DIET_PREFERENCE_OPTIONS}
                      onChange={(value) => setFilters((prev) => ({ ...prev, dietPreference: value }))}
                    />
                    <SearchSelectField
                      label="Primární zájem"
                      placeholder="Nezáleží"
                      value={filters.primaryInterest}
                      options={PROFILE_SEARCH_PRIMARY_INTEREST_OPTIONS as unknown as string[]}
                      onChange={(value) => setFilters((prev) => ({ ...prev, primaryInterest: value }))}
                    />
                    <SearchComboboxField
                      label="Životní cíl"
                      placeholder="Vyber nebo napiš vlastní hodnotu"
                      value={filters.lifeGoal}
                      options={PROFILE_SEARCH_LIFE_GOAL_OPTIONS as unknown as string[]}
                      onChange={(value) => setFilters((prev) => ({ ...prev, lifeGoal: value }))}
                    />
                    <SearchComboboxField
                      label="Sport / pohyb"
                      placeholder="Vyber nebo napiš vlastní hodnotu"
                      value={filters.activity}
                      options={PROFILE_SEARCH_ACTIVITY_OPTIONS as unknown as string[]}
                      onChange={(value) => setFilters((prev) => ({ ...prev, activity: value }))}
                    />
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Typ profilu</label>
                      <label className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900">
                        <input
                          type="checkbox"
                          checked={filters.isStudentOnly}
                          onChange={(e) => setFilters((prev) => ({ ...prev, isStudentOnly: e.target.checked }))}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                        />
                        Jen studenti
                      </label>
                    </div>
                  </div>
                </div>
              ) : null}
            </form>

            {activeFilterChips.length ? (
              <div className="mt-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Aktivní rozšířené filtry</div>
                <div className="flex flex-wrap gap-2">
                  {activeFilterChips.map((chip) => (
                    <AwButton
                      key={chip.key}
                      type="button"
                      onClick={() => clearSingleAdvancedFilter(chip.key)}
                      variant="secondary"
                      size="sm"
                      className="rounded-full text-xs"
                    >
                      {chip.label}: {chip.value} ×
                    </AwButton>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-3">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Zúžit výsledky</div>
              <div className="flex flex-wrap gap-2">
                <FilterChip active={filterNotConnected} onClick={() => setFilterNotConnected((v) => !v)} label="Jen mimo spojení" />
                <FilterChip active={filterNotFollowing} onClick={() => setFilterNotFollowing((v) => !v)} label="Jen ty, které nesleduji" />
                <FilterChip active={filterOnlyConnectable} onClick={() => setFilterOnlyConnectable((v) => !v)} label="Jen s povoleným spojením" />
                <FilterChip active={advancedFiltersActive} onClick={clearAdvancedFilters} label="Vyčistit filtry" />
              </div>
            </div>

            <div className="mt-4">
              {searchLoading ? (
                <div className="rounded-xl bg-white p-4 text-sm text-slate-600">Vyhledávám...</div>
              ) : searchTouched && !searchQuery.trim() && !hasAdvancedFilters(filters) ? (
                <div className="rounded-xl bg-white p-4 text-sm text-slate-600">Zadej prosím dotaz nebo nastav alespoň jeden filtr.</div>
              ) : searchTouched && filteredSearchResults.length === 0 ? (
                <div className="rounded-xl bg-white p-4 text-sm text-slate-600">Nikdo neodpovídá zadaným filtrům.</div>
              ) : filteredSearchResults.length > 0 ? (
                <div className="space-y-3">{filteredSearchResults.map((user) => renderSearchRow(user))}</div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="mt-6">
          <h2 className="text-sm font-semibold text-slate-800">{header}</h2>

          {loading ? (
            <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Načítám...</div>
          ) : tab === "connections" ? (
            <UserList
              users={connections}
              emptyText="Zatím nemáš žádná spojení."
              showDetailButton={false}
              extraMeta={(user) => (
                <>
                  <NetworkNumbers user={user} />
                  <div className="mt-1 text-xs text-slate-500">
                    Ve spojení od {user.connection_since ? formatDateTime(user.connection_since) : "neuvedeno"}
                  </div>
                </>
              )}
              onOpenDetail={(user) => void openDetail({ ...user, connection_state: "connected" })}
              renderActions={(user) => (
                <>
                  <Link
                    href={`/messages?user=${user.user_id}`}
                    className={SECONDARY_LINK_CLASS}
                  >
                    Zprávy
                  </Link>
                  <ActionButton
                    disabled={busyKey === `remove-list-connection-${user.user_id}`}
                    onClick={() =>
                      void withBusy(
                        `remove-list-connection-${user.user_id}`,
                        () => removeConnection(user.user_id),
                        "Nepodařilo se zrušit spojení."
                      )
                    }
                  >
                    Zrušit spojení
                  </ActionButton>
                  <ActionButton onClick={() => void openDetail({ ...user, connection_state: "connected" })}>Detail</ActionButton>
                </>
              )}
            />
          ) : tab === "following" ? (
            <UserList
              users={following}
              emptyText="Zatím nikoho nesleduješ."
              onOpenDetail={(user) => void openDetail(user)}
              extraMeta={(user) => (
                <>
                  <NetworkNumbers user={user} />
                  <div className="mt-1 text-xs text-slate-500">
                    Sleduješ od {user.following_since ? formatDateTime(user.following_since) : "neuvedeno"}
                  </div>
                </>
              )}
              renderActions={(user) => (
                <ActionButton
                  disabled={busyKey === `unfollow-list-${user.user_id}`}
                  onClick={() =>
                    void withBusy(`unfollow-list-${user.user_id}`, () => unfollowUser(user.user_id), "Nepodařilo se přestat sledovat.")
                  }
                >
                  Přestat sledovat
                </ActionButton>
              )}
            />
          ) : tab === "followers" ? (
            <UserList
              users={followers}
              emptyText="Zatím tě nikdo nesleduje."
              onOpenDetail={(user) => void openDetail(user)}
              extraMeta={(user) => <NetworkNumbers user={user} />}
            />
          ) : tab === "suggestions" ? (
            suggestions.length === 0 ? (
              <EmptyStateCard text="Teď tu nejsou žádné doporučené kontakty." ctaHref="/network?panel=search" ctaLabel="Vyhledat uživatele" />
            ) : (
              <div className="mt-3 space-y-3">{suggestions.map((user) => renderSearchRow(user))}</div>
            )
          ) : tab === "blocked" ? (
            <UserList
              users={blockedUsers}
              emptyText="Zatím nemáš žádné blokované uživatele."
              onOpenDetail={(user) => void openDetail(user)}
              extraMeta={(user) => (
                <>
                  <NetworkNumbers user={user} />
                  {user.blocked_reason ? <div className="mt-1 text-xs text-slate-500">Důvod blokace: {user.blocked_reason}</div> : null}
                </>
              )}
              renderActions={(user) => (
                <ActionButton
                  disabled={busyKey === `unblock-${user.user_id}`}
                  onClick={() => void withBusy(`unblock-${user.user_id}`, () => unblockUser(user.user_id), "Nepodařilo se odblokovat uživatele.")}
                >
                  Odblokovat
                </ActionButton>
              )}
            />
          ) : (
            <div className="mt-3 space-y-3">
              {requestView === "incoming" ? (
                <RequestsPanel
                  title="Nové žádosti"
                  emptyText="Nemáš žádné nové žádosti."
                  rows={incomingReq}
                  getUser={(row) => row.requester ?? { user_id: row.requester_id, display_name: null, avatar_url: null, bio: null }}
                  renderPrimaryAction={(row) => (
                    <ActionButton
                      variant="primary"
                      disabled={busyKey === `accept-list-${row.id}`}
                      onClick={() => void withBusy(`accept-list-${row.id}`, () => acceptConnectionRequest(row.id), "Nepodařilo se žádost přijmout.")}
                    >
                      Přijmout
                    </ActionButton>
                  )}
                  renderSecondaryActions={(row) => (
                    <TextActionButton
                      disabled={busyKey === `decline-list-${row.id}`}
                      onClick={() =>
                        void withBusy(
                          `decline-list-${row.id}`,
                          () => declineRequestWithOptionalMessage(row.id),
                          "Nepodařilo se žádost zamítnout."
                        )
                      }
                    >
                      Zamítnout
                    </TextActionButton>
                  )}
                  onOpenDetail={(user) => void openDetail({ ...user, connection_state: "incoming_request" })}
                />
              ) : (
                <RequestsPanel
                  title="Moje žádosti"
                  emptyText="Nemáš žádné odeslané žádosti."
                  rows={outgoingReq}
                  getUser={(row) => row.target ?? { user_id: row.target_id, display_name: null, avatar_url: null, bio: null }}
                  renderPrimaryAction={(row) => (
                    <ActionButton
                      disabled={busyKey === `cancel-list-${row.id}`}
                      onClick={() => void withBusy(`cancel-list-${row.id}`, () => cancelConnectionRequest(row.id), "Nepodařilo se zrušit žádost.")}
                    >
                      Zrušit žádost
                    </ActionButton>
                  )}
                  onOpenDetail={(user) => void openDetail({ ...user, connection_state: "outgoing_request" })}
                />
              )}
            </div>
          )}
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Nastavení <span className="font-medium">&quot;Povolit žádosti o spojení&quot;</span> a{" "}
          <span className="font-medium">&quot;Povolit sledování&quot;</span> najdeš v{" "}
          <Link className="underline" href="/profile/privacy">
            Soukromí & personalizace
          </Link>
          . Typy upozornění pro síť a komentáře upravíš v{" "}
          <Link className="underline" href="/notifications/settings">
            Nastavení upozornění
          </Link>
          .
        </p>
      </div>

      <RelationshipDetailModal
        user={detailUser}
        insights={detailInsights}
        loading={detailLoading}
        onClose={() => {
          setDetailUser(null);
          setDetailInsights(null);
        }}
      />
    </div>
  );
}

function CountPill(props: { label: string; value: number; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={`rounded-xl border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-emerald-200 ${
        props.active ? "border-emerald-300 bg-emerald-50 text-emerald-950" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="text-xs font-semibold text-slate-600">{props.label}</div>
      <div className="text-lg font-extrabold text-slate-900">{props.value}</div>
    </button>
  );
}

function FilterChip(props: { active: boolean; label: string; onClick: () => void }) {
  return (
    <AwButton
      type="button"
      onClick={props.onClick}
      variant={props.active ? "primary" : "secondary"}
      size="sm"
      className="rounded-full text-xs"
    >
      {props.label}
    </AwButton>
  );
}

function SearchTextField(props: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{props.label}</label>
      <input
        type="text"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      />
    </div>
  );
}

function SearchSelectField(props: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{props.label}</label>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      >
        <option value="">{props.placeholder}</option>
        {props.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function SearchComboboxField(props: {
  label: string;
  value: string;
  placeholder: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const listId = `search-combobox-${props.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">{props.label}</label>
      <input
        type="text"
        list={listId}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        placeholder={props.placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
      />
      <datalist id={listId}>
        {props.options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </div>
  );
}

function UserAvatar({ user }: { user: NetworkUserLite }) {
  return (
    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-slate-100">
      {user.avatar_url ? (
        <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="text-sm font-bold text-slate-600">{displayInitial(user)}</span>
      )}
    </div>
  );
}

function UserIdentity({ user }: { user: NetworkUserLite }) {
  const bio = (user.bio ?? "").trim();

  return (
    <div className="min-w-0">
      <Link href={`/users/${user.user_id}`} className="truncate text-sm font-semibold text-slate-900 hover:underline">
        {displayNameOrUuid(user)}
      </Link>
      {bio ? <div className="truncate text-xs text-slate-600">{bio}</div> : null}
    </div>
  );
}

function NetworkNumbers({ user }: { user: NetworkUserLite }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
      <span>{user.connections_count ?? 0} spojení</span>
      <span>{user.followers_count ?? 0} sledujících</span>
      <span>{user.following_count ?? 0} sleduje</span>
      {typeof user.mutual_connections_count === "number" ? <span>{user.mutual_connections_count} společných spojení</span> : null}
      {typeof user.common_following_count === "number" ? <span>{user.common_following_count} společně sledovaných</span> : null}
    </div>
  );
}

function SuggestionReasonChips({ user }: { user: NetworkSearchResult }) {
  const chips = getSuggestionReasonChips(user);

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <span key={chip} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
          {chip}
        </span>
      ))}
    </div>
  );
}

function TextActionButton(props: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  const className =
    "px-2 py-1 text-sm font-semibold text-slate-600 transition hover:text-slate-900 disabled:opacity-60";

  if (props.href) {
    return (
      <Link href={props.href} className={className}>
        {props.children}
      </Link>
    );
  }

  return (
    <AwButton type="button" onClick={props.onClick} disabled={props.disabled} variant="tertiary" size="sm" className="px-2 py-1 no-underline">
      {props.children}
    </AwButton>
  );
}

function EmptyStateCard(props: { text: string; ctaHref?: string; ctaLabel?: string }) {
  return (
    <div className="mt-2 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-600">
      <div>{props.text}</div>
      {props.ctaHref && props.ctaLabel ? (
        <Link
          href={props.ctaHref}
          className={`${SECONDARY_LINK_CLASS} mt-3`}
        >
          {props.ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

function SearchResultRow(props: {
  user: NetworkSearchResult;
  busyKey: string | null;
  onOpenDetail: () => void;
  onRequestConnection: () => Promise<void>;
  onCancelRequest: () => Promise<void>;
  onAcceptRequest: () => Promise<void>;
  onDeclineRequest: () => Promise<void>;
  onRemoveConnection: () => Promise<void>;
  onFollowToggle: () => Promise<void>;
}) {
  const { user, busyKey } = props;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start gap-3">
        <UserAvatar user={user} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <UserIdentity user={user} />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:justify-end">
              {user.connection_state === "connected" ? (
                <>
                  <Link
                    href={`/messages?user=${user.user_id}`}
                    className={SECONDARY_LINK_CLASS}
                  >
                    Zprávy
                  </Link>
                  <TextActionButton disabled={busyKey === `remove-connection-${user.user_id}`} onClick={() => void props.onRemoveConnection()}>
                    Zrušit spojení
                  </TextActionButton>
                </>
              ) : user.connection_state === "outgoing_request" ? (
                <ActionButton disabled={busyKey === `cancel-request-${user.user_id}`} onClick={() => void props.onCancelRequest()}>
                  Zrušit žádost
                </ActionButton>
              ) : user.connection_state === "incoming_request" ? (
                <>
                  <ActionButton
                    variant="primary"
                    disabled={busyKey === `accept-request-${user.user_id}`}
                    onClick={() => void props.onAcceptRequest()}
                  >
                    Přijmout
                  </ActionButton>
                  <TextActionButton disabled={busyKey === `decline-request-${user.user_id}`} onClick={() => void props.onDeclineRequest()}>
                    Zamítnout
                  </TextActionButton>
                </>
              ) : (
                <ActionButton
                  variant="primary"
                  disabled={!user.allow_connections || busyKey === `request-${user.user_id}`}
                  onClick={() => void props.onRequestConnection()}
                >
                  {user.allow_connections ? "Požádat o spojení" : "Spojení zakázáno"}
                </ActionButton>
              )}

              <TextActionButton
                disabled={(!user.allow_following && !user.is_following) || busyKey === `toggle-follow-${user.user_id}`}
                onClick={() => void props.onFollowToggle()}
              >
                {user.is_following ? "Přestat sledovat" : user.allow_following ? "Sledovat" : "Sledování zakázáno"}
              </TextActionButton>
              <TextActionButton onClick={props.onOpenDetail}>Detail</TextActionButton>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <SuggestionReasonChips user={user} />
            <StatusBadge tone={getConnectionStateTone(user.connection_state)}>{getConnectionStateLabel(user.connection_state)}</StatusBadge>
            <StatusBadge tone={user.is_following ? "slate" : "amber"}>{user.is_following ? "Sleduješ" : "Nesleduješ"}</StatusBadge>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {getCompactNetworkSummary(user).map((item) => (
              <span key={`${user.user_id}-${item}`}>{item}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestRow(props: {
  user: NetworkUserLite;
  onOpenDetail: () => void;
  primaryAction: React.ReactNode;
  secondaryActions?: React.ReactNode;
  requestMessage?: string | null;
  createdAt?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start gap-3">
        <UserAvatar user={props.user} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <UserIdentity user={props.user} />
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:justify-end">
              {props.primaryAction}
              {props.secondaryActions}
              <TextActionButton onClick={props.onOpenDetail}>Detail</TextActionButton>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
            {getCompactNetworkSummary(props.user).map((item) => (
              <span key={`${props.user.user_id}-${item}`}>{item}</span>
            ))}
            {props.createdAt ? <span>{formatListRelativeTime(props.createdAt, "Odesláno")}</span> : null}
          </div>

          {props.requestMessage?.trim() ? (
            <div className="mt-2 line-clamp-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-slate-700">
              {props.requestMessage.trim()}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RequestsPanel<T extends ConnectionRequestRow>(props: {
  title: string;
  emptyText: string;
  rows: T[];
  getUser: (row: T) => NetworkUserLite;
  renderPrimaryAction: (row: T) => React.ReactNode;
  renderSecondaryActions?: (row: T) => React.ReactNode;
  onOpenDetail: (user: NetworkUserLite) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{props.title}</div>

      {props.rows.length === 0 ? (
        <EmptyStateCard text={props.emptyText} ctaHref="/network?panel=search" ctaLabel="Vyhledat uživatele" />
      ) : (
        <div className="mt-2 space-y-2">
          {props.rows.map((row) => {
            const user = props.getUser(row);
            return (
              <RequestRow
                key={row.id}
                user={user}
                requestMessage={row.request_message ?? null}
                createdAt={row.created_at ?? null}
                onOpenDetail={() => props.onOpenDetail(user)}
                primaryAction={props.renderPrimaryAction(row)}
                secondaryActions={props.renderSecondaryActions ? props.renderSecondaryActions(row) : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserList(props: {
  users: NetworkUserLite[];
  emptyText: string;
  onOpenDetail: (user: NetworkUserLite) => void;
  renderActions?: (user: NetworkUserLite) => React.ReactNode;
  extraMeta?: (user: NetworkUserLite) => React.ReactNode;
  showDetailButton?: boolean;
}) {
  if (!props.users.length) {
    return <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{props.emptyText}</div>;
  }

  return (
    <div className="mt-3 space-y-2">
      {props.users.map((user) => (
        <div key={user.user_id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow-md">
          <div className="flex items-start gap-3">
            <UserAvatar user={user} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <UserIdentity user={user} />
                </div>

                <div className="flex flex-wrap gap-2 sm:justify-end">
                  {props.renderActions ? props.renderActions(user) : null}
                  {props.showDetailButton === false ? null : <ActionButton onClick={() => props.onOpenDetail(user)}>Detail</ActionButton>}
                </div>
              </div>

              <div className="mt-3 min-w-0">
                {props.extraMeta ? props.extraMeta(user) : <NetworkNumbers user={user} />}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionButton(props: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary";
}) {
  return (
    <AwButton
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      variant={props.variant === "primary" ? "primary" : "secondary"}
      size="sm"
    >
      {props.children}
    </AwButton>
  );
}

function StatusBadge(props: { children: React.ReactNode; tone: "emerald" | "slate" | "amber" }) {
  const cls =
    props.tone === "emerald"
      ? "bg-emerald-50 text-emerald-800"
      : props.tone === "amber"
        ? "bg-amber-50 text-amber-800"
        : "bg-slate-100 text-slate-700";

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>{props.children}</span>;
}

function SharedPeopleBlock(props: { title: string; users: NetworkUserLite[]; emptyText: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{props.title}</div>
      {props.users.length ? (
        <div className="mt-2 space-y-2">
          {props.users.map((user) => (
            <Link key={user.user_id} href={`/users/${user.user_id}`} className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-2 hover:bg-slate-100">
              <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                {user.avatar_url ? <img src={user.avatar_url} alt={displayNameOrUuid(user)} className="h-full w-full object-cover" /> : displayInitial(user)}
              </div>
              <div className="min-w-0 text-sm text-slate-800">{displayNameOrUuid(user)}</div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-sm text-slate-500">{props.emptyText}</div>
      )}
    </div>
  );
}

function RelationshipDetailModal({
  user,
  insights,
  loading,
  onClose,
}: {
  user: ModalUser;
  insights: NetworkProfileInsights | null;
  loading: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!user) return;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, user]);

  if (!user) return null;
  const canMessage = user.connection_state === "connected";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[1px]" onClick={onClose}>
      <div
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <UserAvatar user={user} />
              <div className="min-w-0">
                <div className="text-base font-semibold text-slate-900">{displayNameOrUuid(user)}</div>
                <div className="break-all text-xs text-slate-500">{user.user_id}</div>
              </div>
            </div>

            <AwButton type="button" onClick={onClose} variant="tertiary" size="sm" className="px-2 no-underline">
              Zavřít
            </AwButton>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="space-y-4">
          {user.bio ? <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{user.bio}</div> : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <MiniStat label="Spojení" value={loading ? "…" : String(insights?.connections_count ?? user.connections_count ?? 0)} />
            <MiniStat label="Sleduje" value={loading ? "…" : String(insights?.following_count ?? user.following_count ?? 0)} />
            <MiniStat label="Sledující" value={loading ? "…" : String(insights?.followers_count ?? user.followers_count ?? 0)} />
            <MiniStat label="Společná spojení" value={loading ? "…" : String(insights?.mutual_connections_count ?? user.mutual_connections_count ?? 0)} />
            <MiniStat label="Oba sledujete" value={loading ? "…" : String(insights?.common_following_count ?? user.common_following_count ?? 0)} />
          </div>

          {user.connection_since ? (
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ve spojení od</div>
              <div className="mt-1 text-sm text-slate-900">{formatDateTime(user.connection_since)}</div>
            </div>
          ) : null}

          {user.following_since ? (
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sleduješ od</div>
              <div className="mt-1 text-sm text-slate-900">{formatDateTime(user.following_since)}</div>
            </div>
          ) : null}

          {insights?.is_blocked_by_me ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Uživatele máš blokovaného{insights.blocked_reason ? `: ${insights.blocked_reason}` : "."}
            </div>
          ) : null}

          {user.connection_state ? (
            <div className="text-xs text-slate-500">
              Stav spojení: <span className="font-semibold text-slate-700">{getConnectionStateLabel(user.connection_state)}</span>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <SharedPeopleBlock
              title="Společná spojení"
              users={insights?.mutual_connections ?? []}
              emptyText={loading ? "Načítám..." : "Zatím tu nejsou žádná společná spojení."}
            />
            <SharedPeopleBlock
              title="Oba sledujete"
              users={insights?.common_following ?? []}
              emptyText={loading ? "Načítám..." : "Zatím nesledujete stejné lidi."}
            />
          </div>

          <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-slate-100 bg-white/95 pt-4 backdrop-blur">
            <Link
              href={`/users/${user.user_id}`}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Otevřít profil
            </Link>
            {canMessage ? (
              <Link
                href={`/messages?user=${user.user_id}`}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Napsat zprávu
              </Link>
            ) : null}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

function MiniStat(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{props.label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{props.value}</div>
    </div>
  );
}
