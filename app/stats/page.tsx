/**
 * File: app/stats/page.tsx
 *
 * Purpose:
 * - Detailní statistiky uživatele
 * - Grafy + trajectory graf
 * - Tabulka aktivity
 */

"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getMyActivity50Days,
  getMyAwScoreTrend,
  getMyGenerationAwPerception,
  getMyImageTagOptions,
  getMyStatsHistory,
  getMyTipCountHistory,
  getMyTopPostsByMetric,
  getMyTopAwInfluencePosts,
  type AwAgeTrajectoryView,
  type AwScoreTrendGranularity,
  type DailyActivityRow,
  type GenerationAwPerceptionRow,
  type ImageTagOption,
  type StatsHistoryRow,
  type StatsHistoryView,
  type TipCountHistoryView,
  type TipCountHistoryPoint,
  type TopAwInfluencePost,
  type TopPostMetric,
  type TopPostSortDirection,
  type TopPostStatsRow,
} from "@/lib/api/stats";
import { listMyAwChallengeStats, type AwChallenge, type AwChallengeStatsRow } from "@/lib/api/challenges";
import {
  getTodayWellbeingDate,
  getMyTodayWellbeingEntry,
  getMyWellbeingEntries,
  getMyWellbeingEntriesForMonth,
  getMyWellbeingPlansForMonth,
  getMyWellbeingVisibilityDefaults,
  upsertMyTodayWellbeingEntry,
  upsertMyWellbeingPlan,
  type WellbeingDailyEntry,
  type WellbeingFoodAmount,
  type WellbeingFoodType,
  type WellbeingMood,
  type WellbeingPlanEntry,
} from "@/lib/api/wellbeing";
import { getMyProfileTraffic, type ProfileTrafficSummary, type RecentProfileVisit } from "@/lib/api/profileVisits";
import type { ContentVisibility } from "@/types/db";

import RealVsGuessedScatter from "@/components/stats/RealVsGuessedScatter";
import AwAgeTrajectoryChart from "@/components/stats/AwAgeTrajectoryChart";
import StatsMiniChart, { type StatsMiniChartPoint } from "@/components/stats/StatsMiniChart";
import HelpIconButton from "@/components/HelpIconButton";
import RefreshIconButton from "@/components/RefreshIconButton";
import AwButton from "@/components/AwButton";

const PREDEFINED_TAG_OPTIONS: Array<{ tag: string; label: string }> = [
  { tag: "oblicej", label: "Obličej" },
  { tag: "cela_postava", label: "Celá postava" },
  { tag: "postava_bez_obliceje", label: "Postava bez obličeje" },
  { tag: "v_plavkach", label: "Plavky" },
  { tag: "makeup_stylizace", label: "Make-up" },
  { tag: "spolecenske_saty", label: "Společenské šaty" },
  { tag: "sport", label: "Sport" },
];

const STATS_SECTIONS = [
  {
    id: "aw-age",
    title: "AW věk",
    description: "Vývoj AW věku v čase, detail po fotkách a generační pohled na tipování.",
    items: ["AW věk v čase.", "Po jednotlivých fotkách.", "AW věk podle generací."],
  },
  {
    id: "activity",
    title: "Aktivita",
    description: "Historie aktivity po dnech: fotky, posty, komentáře, tipy a lajky.",
    items: ["Aktivita za posledních až 50 dní."],
  },
  {
    id: "posts",
    title: "Statistiky příspěvků",
    description: "Výkon jednotlivých příspěvků, jejich dosah a komentářová aktivita.",
    items: [
      "Nejvýkonnější příspěvky: podle zobrazení, komentářů, reakcí a uložení.",
      "Vývoj dosahu příspěvku: kolik lidí příspěvek vidělo v čase.",
      "Komentářová aktivita: počet komentářů a tempo růstu diskuze.",
    ],
  },
  {
    id: "traffic",
    title: "Návštěvnost",
    description: "Přehled návštěv profilu a růstu sociální sítě.",
    items: [
      "Návštěvy profilu: počet zobrazení profilu v čase.",
      "Nové kontakty / sledující: růst sociální sítě uživatele.",
    ],
  },
  {
    id: "wellbeing",
    title: "Wellbeing / Lifestyle",
    description: "Dobrovolné osobní záznamy nálady, energie, spánku, pohybu, stravy a pozitivních návyků.",
    items: [
      "Mood tracking: uživatel si může zvolit náladu dne.",
      "Energy score: subjektivní energie 1-10.",
      "Sleep / pohyb / hydratace: dobrovolné denní záznamy pohybu, spánku, stravy a příjmu tekutin.",
      "Wellbeing trend: dlouhodobý graf nálady, energie a aktivity.",
      "Plány a návyky: dlouhodobé nastavení spánku, pohybu, tekutin a stravy.",
      "Osobní výzvy: např. 30 dní chůze, meditace nebo péče o pleť.",
    ],
  },
  {
    id: "challenges",
    title: "Výzvy",
    description: "Přehled AW výzev, jejich startů, cílů, termínů a rozsahu fotek.",
    items: [
      "Startovní a cílové AW skóre podle uložených hodnot výzvy.",
      "Rozsah fotek: období výzvy nebo speciální tag výzvy.",
      "Veřejný odkaz na kartu výzvy pro sdílení v postech.",
    ],
  },
  {
    id: "my-tips",
    title: "Moje přesnost",
    description: "Vývoj přesnosti tipování a počty provedených tipů v čase.",
    items: ["Přesnost tipů.", "Počet provedených tipů po dnech, měsících a letech."],
  },
  {
    id: "aw-score",
    title: "AW skóre",
    description: "Detailní trend, rozklad a největší vlivy na AW skóre.",
    items: [
      "AW skóre trend: denní, týdenní a měsíční.",
      "Rozklad AW skóre: z čeho se skóre skládá.",
      "Příspěvky s největším vlivem na AW.",
    ],
  },
  {
    id: "recommendations",
    title: "Chytré doporučení",
    description: "Jemná doporučení podle toho, co uživateli funguje a kde může najít další inspiraci.",
    items: [
      "Co funguje nejlépe: třeba že sportovní příspěvky mají nejvíce reakcí.",
      "Kdy publikovat: doporučení podle historické aktivity kontaktů.",
      "Jaký obsah zkusit: podle kategorií, které uživatele zajímají.",
      "Jemné wellbeing návrhy: např. jednoduchá 5min výzva po méně aktivním týdnu.",
      "Vyvážení obsahu: nabídnout pestřejší tipy, pokud uživatel přidává hlavně jeden typ obsahu.",
    ],
  },
] as const;

const AW_AGE_HELP_TEXT =
  "Graf ukazuje vývoj tvého AW věku v čase.\n\nZelená čára je AW věk, šedá diagonála je referenční věk. Když je zelená níž než diagonála, fotky působí mladším dojmem.\n\nPlná zelená čára spojuje období s dostupnými daty. Přerušovaná zelená čára znamená, že mezi dvěma body chybí fotky nebo výpočet, takže graf jen naznačuje přechod a nedopočítává chybějící roky jako nulu.\n\nPřepínačem Pohled měníš časový rozsah. Kliknutím na zelený bod otevřeš detail daného roku a můžeš přejít na fotky z tohoto období.";

const WELLBEING_MOOD_OPTIONS: Array<{ value: WellbeingMood; label: string; score: number }> = [
  { value: "lehka", label: "Lehká", score: 8 },
  { value: "klid", label: "Klidná", score: 7 },
  { value: "radost", label: "Radostná", score: 9 },
  { value: "unava", label: "Unavená", score: 4 },
  { value: "napeti", label: "V napětí", score: 3 },
];

const WELLBEING_WATER_LITERS = ["0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "4.5", "5"];
const WELLBEING_FOOD_AMOUNT_OPTIONS: Array<{ value: WellbeingFoodAmount; label: string; height: number }> = [
  { value: "malo", label: "málo", height: 1 },
  { value: "bezne", label: "běžně", height: 2 },
  { value: "moc", label: "moc", height: 3 },
  { value: "bez_jidla", label: "dnes bez jídla", height: 0.3 },
];
const WELLBEING_FOOD_TYPE_OPTIONS: Array<{ value: WellbeingFoodType; label: string; color: string }> = [
  { value: "dietni", label: "dietní", color: "#eab308" },
  { value: "vegan", label: "vegan", color: "#86efac" },
  { value: "vegetarian", label: "vegetarián", color: "#15803d" },
  { value: "vyvazena", label: "zdravá", color: "#14b8a6" },
  { value: "bezna", label: "běžná", color: "#2563eb" },
  { value: "sladke", label: "sladké", color: "#9333ea" },
  { value: "maso", label: "maso", color: "#dc2626" },
  { value: "nezdrava", label: "nezdravá", color: "#111827" },
];

const WELLBEING_DEFAULTS = {
  mood: "",
  energy: "",
  sleep: "",
  movement: "",
  water: "",
  foodAmount: "",
  foodType: "",
};

const WELLBEING_VISIBILITY_OPTIONS: Array<{ value: ContentVisibility; label: string }> = [
  { value: "everyone", label: "Všichni" },
  { value: "contacts", label: "Kontakty" },
  { value: "private", label: "Soukromé" },
];

type StatsSectionId = (typeof STATS_SECTIONS)[number]["id"];
type StatsSection = (typeof STATS_SECTIONS)[number];

function getStatsSectionId(value: string | null): StatsSectionId {
  return STATS_SECTIONS.some((section) => section.id === value) ? (value as StatsSectionId) : "aw-age";
}

function formatDateCZ(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("cs-CZ");
}

function formatDayMonthCZ(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "numeric" });
}

function formatDayOfMonthCZ(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return String(d.getDate());
}

function formatAwScoreForUi(rawAwScoreNormPct: number | null) {
  if (rawAwScoreNormPct == null || !Number.isFinite(rawAwScoreNormPct)) return "—";
  if (rawAwScoreNormPct === 100) return "0.0 %";
  if (rawAwScoreNormPct > 100) return `+${(rawAwScoreNormPct - 100).toFixed(1)} %`;
  return `-${(100 - rawAwScoreNormPct).toFixed(1)} %`;
}

export default function ProfileStatsPage() {
  const searchParams = useSearchParams();
  const activeSectionId = getStatsSectionId(searchParams?.get("section") ?? null);
  const activeSection = STATS_SECTIONS.find((section) => section.id === activeSectionId) ?? STATS_SECTIONS[0];
  const [loading, setLoading] = useState(true);
  const [activityRows, setActivityRows] = useState<DailyActivityRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [availableTags, setAvailableTags] = useState<ImageTagOption[]>([]);
  const [includeExperimental, setIncludeExperimental] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [awAgeView, setAwAgeView] = useState<AwAgeTrajectoryView>("life");
  const [generationRows, setGenerationRows] = useState<GenerationAwPerceptionRow[]>([]);
  const [generationLoading, setGenerationLoading] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [tipHistoryView, setTipHistoryView] = useState<StatsHistoryView>("1m");
  const [tipCountView, setTipCountView] = useState<TipCountHistoryView>("30d");
  const [tipAccuracyRows, setTipAccuracyRows] = useState<StatsHistoryRow[]>([]);
  const [tipCountRows, setTipCountRows] = useState<TipCountHistoryPoint[]>([]);
  const [tipChartsLoading, setTipChartsLoading] = useState(false);
  const [tipChartsError, setTipChartsError] = useState<string | null>(null);
  const [topPostMetric, setTopPostMetric] = useState<TopPostMetric>("guesses");
  const [topPostSortDirection, setTopPostSortDirection] = useState<TopPostSortDirection>("desc");
  const [topPostRows, setTopPostRows] = useState<TopPostStatsRow[]>([]);
  const [topPostsLoading, setTopPostsLoading] = useState(false);
  const [topPostsError, setTopPostsError] = useState<string | null>(null);
  const [awTrendGranularity, setAwTrendGranularity] = useState<AwScoreTrendGranularity>("daily");
  const [awTrendRows, setAwTrendRows] = useState<Array<{ label: string; awScoreNormPct: number | null }>>([]);
  const [topAwPosts, setTopAwPosts] = useState<TopAwInfluencePost[]>([]);
  const [awScoreSectionLoading, setAwScoreSectionLoading] = useState(false);
  const [awScoreSectionError, setAwScoreSectionError] = useState<string | null>(null);
  const [challengeRows, setChallengeRows] = useState<AwChallengeStatsRow[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(false);
  const [challengesError, setChallengesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (activeSectionId !== "activity") {
        setActivityRows([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const activityRes = await getMyActivity50Days();

        if (cancelled) return;

        setActivityRows(activityRes);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Statistiky se nepodařilo načíst.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [activeSectionId]);

  useEffect(() => {
    if (activeSectionId !== "aw-age") return;

    let cancelled = false;

    async function loadGenerationRows() {
      setGenerationLoading(true);
      setGenerationError(null);

      try {
        const rows = await getMyGenerationAwPerception();
        if (!cancelled) setGenerationRows(rows);
      } catch (generationLoadError: unknown) {
        if (!cancelled) {
          setGenerationRows([]);
          setGenerationError(generationLoadError instanceof Error ? generationLoadError.message : "Generační rozložení se nepodařilo načíst.");
        }
      } finally {
        if (!cancelled) setGenerationLoading(false);
      }
    }

    void loadGenerationRows();

    return () => {
      cancelled = true;
    };
  }, [activeSectionId]);

  useEffect(() => {
    if (activeSectionId !== "aw-age") return;

    let cancelled = false;

    async function loadTags() {
      try {
        const rows = await getMyImageTagOptions();
        if (!cancelled) setAvailableTags(rows);
      } catch (tagError) {
        console.warn("stats: image tag options load failed", tagError);
        if (!cancelled) setAvailableTags([]);
      }
    }

    void loadTags();

    return () => {
      cancelled = true;
    };
  }, [activeSectionId]);

  useEffect(() => {
    if (activeSectionId !== "my-tips") return;

    let cancelled = false;

    async function loadTipCharts() {
      setTipChartsLoading(true);
      setTipChartsError(null);

      try {
        const [accuracyRows, countRows] = await Promise.all([getMyStatsHistory(tipHistoryView), getMyTipCountHistory(tipCountView)]);
        if (!cancelled) {
          setTipAccuracyRows(accuracyRows);
          setTipCountRows(countRows);
        }
      } catch (tipLoadError: unknown) {
        if (!cancelled) {
          setTipAccuracyRows([]);
          setTipCountRows([]);
          setTipChartsError(tipLoadError instanceof Error ? tipLoadError.message : "Grafy tipů se nepodařilo načíst.");
        }
      } finally {
        if (!cancelled) setTipChartsLoading(false);
      }
    }

    void loadTipCharts();

    return () => {
      cancelled = true;
    };
  }, [activeSectionId, tipHistoryView, tipCountView]);

  useEffect(() => {
    if (activeSectionId !== "posts") return;

    let cancelled = false;

    async function loadTopPosts() {
      setTopPostsLoading(true);
      setTopPostsError(null);

      try {
        const rows = await getMyTopPostsByMetric(topPostMetric, topPostSortDirection, 10);
        if (!cancelled) setTopPostRows(rows);
      } catch (topPostsLoadError: unknown) {
        if (!cancelled) {
          setTopPostRows([]);
          setTopPostsError(topPostsLoadError instanceof Error ? topPostsLoadError.message : "Statistiky příspěvků se nepodařilo načíst.");
        }
      } finally {
        if (!cancelled) setTopPostsLoading(false);
      }
    }

    void loadTopPosts();

    return () => {
      cancelled = true;
    };
  }, [activeSectionId, topPostMetric, topPostSortDirection]);

  useEffect(() => {
    if (activeSectionId !== "aw-score") return;

    let cancelled = false;

    async function loadAwScoreSection() {
      setAwScoreSectionLoading(true);
      setAwScoreSectionError(null);

      try {
        const [trendRows, postRows] = await Promise.all([getMyAwScoreTrend(awTrendGranularity), getMyTopAwInfluencePosts()]);
        if (!cancelled) {
          setAwTrendRows(trendRows);
          setTopAwPosts(postRows);
        }
      } catch (awScoreLoadError: unknown) {
        if (!cancelled) {
          setAwTrendRows([]);
          setTopAwPosts([]);
          setAwScoreSectionError(awScoreLoadError instanceof Error ? awScoreLoadError.message : "AW skóre se nepodařilo načíst.");
        }
      } finally {
        if (!cancelled) setAwScoreSectionLoading(false);
      }
    }

    void loadAwScoreSection();

    return () => {
      cancelled = true;
    };
  }, [activeSectionId, awTrendGranularity]);

  useEffect(() => {
    if (activeSectionId !== "challenges") return;

    let cancelled = false;

    async function loadChallenges() {
      setChallengesLoading(true);
      setChallengesError(null);

      try {
        const rows = await listMyAwChallengeStats();
        if (!cancelled) setChallengeRows(rows);
      } catch (challengeLoadError: unknown) {
        if (!cancelled) {
          setChallengeRows([]);
          setChallengesError(challengeLoadError instanceof Error ? challengeLoadError.message : "Výzvy se nepodařilo načíst.");
        }
      } finally {
        if (!cancelled) setChallengesLoading(false);
      }
    }

    void loadChallenges();

    return () => {
      cancelled = true;
    };
  }, [activeSectionId]);

  const availableTagMap = useMemo(() => new Map(availableTags.map((option) => [option.tag, option])), [availableTags]);
  const customTagMatches = useMemo(() => {
    const query = tagSearch.trim().toLowerCase();
    if (!query) return availableTags.filter((option) => !option.predefined).slice(0, 8);
    return availableTags
      .filter((option) => !option.predefined)
      .filter((option) => option.tag.toLowerCase().includes(query) || option.label.toLowerCase().includes(query))
      .slice(0, 8);
  }, [availableTags, tagSearch]);
  const hasActiveChartFilters = selectedTags.length > 0 || includeExperimental;

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
  }

  function clearTagFilters() {
    setSelectedTags([]);
    setTagSearch("");
  }

  function handleTopPostSort(metric: TopPostMetric, direction: TopPostSortDirection) {
    setTopPostMetric(metric);
    setTopPostSortDirection(direction);
  }

  if (activeSectionId === "my-tips") {
    return (
      <MyTipsStatsSection
        section={activeSection}
        view={tipHistoryView}
        onViewChange={setTipHistoryView}
        countView={tipCountView}
        onCountViewChange={setTipCountView}
        accuracyRows={tipAccuracyRows}
        countRows={tipCountRows}
        loading={tipChartsLoading}
        error={tipChartsError}
      />
    );
  }

  if (activeSectionId === "aw-score") {
    return (
      <AwScoreStatsSection
        section={activeSection}
        granularity={awTrendGranularity}
        onGranularityChange={setAwTrendGranularity}
        trendRows={awTrendRows}
        topPosts={topAwPosts}
        loading={awScoreSectionLoading}
        error={awScoreSectionError}
      />
    );
  }

  if (activeSectionId === "posts") {
    return (
      <PostsStatsSection
        section={activeSection}
        metric={topPostMetric}
        direction={topPostSortDirection}
        onSort={handleTopPostSort}
        rows={topPostRows}
        loading={topPostsLoading}
        error={topPostsError}
      />
    );
  }

  if (activeSectionId === "traffic") {
    return <TrafficStatsSection section={activeSection} />;
  }

  if (activeSectionId === "wellbeing") {
    return <WellbeingStatsSection section={activeSection} />;
  }

  if (activeSectionId === "challenges") {
    return <ChallengesStatsSection section={activeSection} rows={challengeRows} loading={challengesLoading} error={challengesError} />;
  }

  if (activeSectionId === "aw-age") {
    return (
      <div className="space-y-6">
        <StatsPageHeader title={activeSection.title} description={activeSection.description} />

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="relative min-h-[72px]">
            <div className="-ml-2 pr-24 text-sm font-semibold text-slate-900 sm:-ml-3">AW věk v čase</div>

            <div className="absolute right-0 top-0 flex items-center justify-end gap-2">
              <HelpIconButton
                helpText={AW_AGE_HELP_TEXT}
                modalTitle="Nápověda - AW věk v čase"
                className="p-2"
                iconClassName="h-5 w-5"
              />
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                className="rounded-xl border border-slate-300 bg-white p-2 hover:bg-slate-50"
                aria-label="Filtry grafů"
                title="Filtry grafů"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={hasActiveChartFilters ? "/funnel-full.ico" : "/funnel-empty.ico"}
                  alt=""
                  className="h-5 w-5"
                />
              </button>
            </div>

            <div className="mt-4 flex justify-end pt-6">
              <label>
                <span className="sr-only">Časový rozsah grafu</span>
                <select
                  value={awAgeView}
                  onChange={(e) => setAwAgeView(e.target.value as AwAgeTrajectoryView)}
                  className="w-full min-w-[180px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 sm:w-auto"
                >
                  <option value="50d">Posledních 50 dní</option>
                  <option value="1y">Poslední rok</option>
                  <option value="10y">Posledních 10 let</option>
                  <option value="life">Celý život</option>
                </select>
              </label>
            </div>
          </div>

          {filtersOpen ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-col gap-3">
                <div>
                  <div className="text-xs font-semibold text-slate-700">Tagy</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={clearTagFilters}
                      className={[
                        "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                        selectedTags.length === 0
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-white",
                      ].join(" ")}
                    >
                      Všechny tagy
                    </button>

                    {PREDEFINED_TAG_OPTIONS.map((option) => {
                      const active = selectedTags.includes(option.tag);
                      const count = availableTagMap.get(option.tag)?.count ?? 0;
                      return (
                        <button
                          key={option.tag}
                          type="button"
                          onClick={() => toggleTag(option.tag)}
                          className={[
                            "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                            active
                              ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-white",
                          ].join(" ")}
                        >
                          {option.label}
                          {count > 0 ? <span className="ml-1 text-slate-400">{count}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="grid gap-1">
                    <span className="text-xs font-semibold text-slate-700">Vyhledat další tagy</span>
                    <input
                      value={tagSearch}
                      onChange={(event) => setTagSearch(event.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400"
                      placeholder="Začni psát název tagu..."
                    />
                  </label>

                  {customTagMatches.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {customTagMatches.map((option) => {
                        const active = selectedTags.includes(option.tag);
                        return (
                          <button
                            key={option.tag}
                            type="button"
                            onClick={() => toggleTag(option.tag)}
                            className={[
                              "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                              active
                                ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-white",
                            ].join(" ")}
                          >
                            {option.label}
                            <span className="ml-1 text-slate-400">{option.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : tagSearch.trim() ? (
                    <div className="mt-2 text-xs text-slate-500">Žádný takový tag zatím u tvých fotek není.</div>
                  ) : null}
                </div>

                <label className="inline-flex w-fit items-center gap-2 px-1 py-1 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={includeExperimental}
                    onChange={(e) => setIncludeExperimental(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-200"
                  />
                  <span>Zahrnout experimentální</span>
                </label>
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <AwAgeTrajectoryChart view={awAgeView} tags={selectedTags} includeExperimental={includeExperimental} />
          </div>
        </div>

        <RealVsGuessedScatter tags={selectedTags} includeExperimental={includeExperimental} />

        <GenerationAwPerceptionTable rows={generationRows} loading={generationLoading} error={generationError} />
      </div>
    );
  }

  if (activeSectionId === "activity") {
    return (
      <ActivityStatsSection
        title={activeSection.title}
        description={activeSection.description}
        rows={activityRows}
        loading={loading}
        error={error}
      />
    );
  }

  return <StatsSectionPlaceholder title={activeSection.title} description={activeSection.description} items={[...activeSection.items]} />;
}

function StatsPageHeader({
  title,
  description,
  items,
  rightSlot,
}: {
  title: string;
  description?: string;
  items?: string[];
  rightSlot?: ReactNode;
}) {
  const helpText = [description, ...(items ?? [])].filter(Boolean).join("\n\n");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Statistiky</div>
      <div className="mt-2 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
        <div className="flex shrink-0 items-center gap-2">
          {rightSlot}
          {helpText ? (
            <HelpIconButton
              helpText={helpText}
              modalTitle={`Nápověda - ${title}`}
              className="p-1"
              iconClassName="h-4 w-4"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatsSectionPlaceholder({ title, description, items }: { title: string; description: string; items: string[] }) {
  return (
    <div className="space-y-6">
      <StatsPageHeader title={title} />

      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl font-black text-emerald-700">
          AW
        </div>
        <div className="mt-4 text-lg font-bold text-slate-950">Sekce je připravená</div>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{description}</p>
        {items.length ? (
          <ul className="mx-auto mt-4 max-w-xl space-y-2 text-left text-sm leading-6 text-slate-700">
            {items.map((item) => (
              <li key={item} className="rounded-xl bg-slate-50 px-3 py-2">
                {item}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function ActivityStatsSection({
  title,
  description,
  rows,
  loading,
  error,
}: {
  title: string;
  description: string;
  rows: DailyActivityRow[];
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div className="space-y-6">
        <StatsPageHeader title={title} description={description} />
        <div className="rounded-xl bg-white p-6 shadow">Načítám aktivitu…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <StatsPageHeader title={title} description={description} />
        <div className="rounded-xl bg-white p-6 text-rose-700 shadow">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatsPageHeader title={title} description={description} />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">Aktivita po dnech</div>
          <HelpIconButton
            helpText="Historie po dnech za posledních až 50 dní: fotky, posty, komentáře, tipy a lajky."
            modalTitle="Nápověda - aktivita po dnech"
            className="shrink-0 p-1"
            iconClassName="h-4 w-4"
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full overflow-hidden rounded-xl border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Den</th>
                <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Fotky</th>
                <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Posty</th>
                <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Komentáře</th>
                <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Tipy</th>
                <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Dané lajky fotek</th>
                <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Dané lajky komentářů</th>
                <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Získané lajky fotek</th>
                <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Získané lajky komentářů</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-sm text-slate-500">
                    Zatím nejsou k dispozici data aktivity.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={`${row.day}-${index}`} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-800">{formatDateCZ(row.day)}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-800">{row.photos}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-800">{row.posts}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-800">{row.comments}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-800">{row.ratings}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-800">{row.imageLikesGiven}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-800">{row.commentLikesGiven}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-800">{row.imageLikesReceived}</td>
                    <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-800">{row.commentLikesReceived}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatsHistorySelect({
  value,
  onChange,
}: {
  value: StatsHistoryView;
  onChange: (view: StatsHistoryView) => void;
}) {
  const options: Array<{ value: StatsHistoryView; label: string }> = [
    { value: "1m", label: "Poslední měsíc" },
    { value: "1y", label: "Poslední rok" },
  ];

  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-slate-700">Časové přiblížení</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as StatsHistoryView)}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TipCountHistorySelect({
  value,
  onChange,
}: {
  value: TipCountHistoryView;
  onChange: (view: TipCountHistoryView) => void;
}) {
  const options: Array<{ value: TipCountHistoryView; label: string }> = [
    { value: "30d", label: "30 dní" },
    { value: "1y", label: "Rok" },
    { value: "life", label: "Celý život" },
  ];

  return (
    <label className="grid gap-1">
      <span className="text-xs font-semibold text-slate-700">Časové přiblížení</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as TipCountHistoryView)}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
      >
      {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
      ))}
      </select>
    </label>
  );
}

function SortableTopPostHeader({
  label,
  metricKey,
  activeMetric,
  direction,
  onSort,
}: {
  label: string;
  metricKey: TopPostMetric;
  activeMetric: TopPostMetric;
  direction: TopPostSortDirection;
  onSort: (metric: TopPostMetric, direction: TopPostSortDirection) => void;
}) {
  const ascActive = activeMetric === metricKey && direction === "asc";
  const descActive = activeMetric === metricKey && direction === "desc";

  return (
    <div className="flex items-center justify-center gap-2">
      <span>{label}</span>
      <span className="inline-flex rounded-lg border border-slate-200 bg-white/70">
        <button
          type="button"
          onClick={() => onSort(metricKey, "asc")}
          className={`px-1.5 py-0.5 text-xs leading-none ${ascActive ? "font-bold text-emerald-700" : "text-slate-500 hover:text-slate-900"}`}
          aria-label={`Řadit ${label.toLowerCase()} vzestupně`}
          title="Řadit od nejméně"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onSort(metricKey, "desc")}
          className={`px-1.5 py-0.5 text-xs leading-none ${descActive ? "font-bold text-emerald-700" : "text-slate-500 hover:text-slate-900"}`}
          aria-label={`Řadit ${label.toLowerCase()} sestupně`}
          title="Řadit od nejvíc"
        >
          ↓
        </button>
      </span>
    </div>
  );
}

type AwInfluenceSortKey = "imageCount" | "guessesCount" | "avgAwAge" | "avgDeltaYears" | "influenceScore";

function SortableAwInfluenceHeader({
  label,
  sortKey,
  activeSortKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: AwInfluenceSortKey;
  activeSortKey: AwInfluenceSortKey;
  direction: TopPostSortDirection;
  onSort: (sortKey: AwInfluenceSortKey, direction: TopPostSortDirection) => void;
}) {
  const ascActive = activeSortKey === sortKey && direction === "asc";
  const descActive = activeSortKey === sortKey && direction === "desc";

  return (
    <div className="flex items-center justify-center gap-2">
      <span>{label}</span>
      <span className="inline-flex rounded-lg border border-slate-200 bg-white/70">
        <button
          type="button"
          onClick={() => onSort(sortKey, "asc")}
          className={`px-1.5 py-0.5 text-xs leading-none ${ascActive ? "font-bold text-emerald-700" : "text-slate-500 hover:text-slate-900"}`}
          aria-label={`Řadit ${label.toLowerCase()} vzestupně`}
          title="Řadit od nejméně"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onSort(sortKey, "desc")}
          className={`px-1.5 py-0.5 text-xs leading-none ${descActive ? "font-bold text-emerald-700" : "text-slate-500 hover:text-slate-900"}`}
          aria-label={`Řadit ${label.toLowerCase()} sestupně`}
          title="Řadit od nejvíc"
        >
          ↓
        </button>
      </span>
    </div>
  );
}

function PostsStatsSection({
  section,
  metric,
  direction,
  onSort,
  rows,
  loading,
  error,
}: {
  section: StatsSection;
  metric: TopPostMetric;
  direction: TopPostSortDirection;
  onSort: (metric: TopPostMetric, direction: TopPostSortDirection) => void;
  rows: TopPostStatsRow[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-6">
      <StatsPageHeader title={section.title} />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">Top 10 příspěvků</div>
          <HelpIconButton
            helpText="Tabulka ukazuje tvých 10 nejlepších příspěvků podle zvoleného sloupce.\n\nKomentáře zahrnují komentáře k příspěvku i komentáře k fotkám v příspěvku. Lajky jsou zatím součtem lajků na fotkách v příspěvku. Tipy jsou součtem tipů na fotkách v příspěvku.\n\nZobrazení jsou připravená jako metrika, ale zatím se v databázi nesbírají, takže budou nulová, dokud nepřidáme tracking zobrazení."
            modalTitle="Nápověda - top příspěvky"
            className="shrink-0 p-1"
            iconClassName="h-4 w-4"
          />
        </div>

        {loading ? <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Načítám příspěvky…</div> : null}
        {error ? <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

        {!loading && !error ? (
          rows.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Zatím nejsou dostupné příspěvky.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full overflow-hidden rounded-xl border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">#</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Příspěvek</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Fotky</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                      <SortableTopPostHeader label="Zobrazení" metricKey="views" activeMetric={metric} direction={direction} onSort={onSort} />
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                      <SortableTopPostHeader label="Komentáře" metricKey="comments" activeMetric={metric} direction={direction} onSort={onSort} />
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                      <SortableTopPostHeader label="Lajky" metricKey="likes" activeMetric={metric} direction={direction} onSort={onSort} />
                    </th>
                    <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                      <SortableTopPostHeader label="Tipy" metricKey="guesses" activeMetric={metric} direction={direction} onSort={onSort} />
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.postId} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-900">{index + 1}</td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                        {row.title}
                        <div className="mt-1 text-xs font-normal text-slate-500">ID {row.postId}</div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-center text-sm text-slate-800">{row.imageCount}</td>
                      <td className={["border-b border-slate-100 px-4 py-3 text-center text-sm", metric === "views" ? "font-bold text-emerald-800" : "text-slate-800"].join(" ")}>
                        {row.viewsCount}
                      </td>
                      <td className={["border-b border-slate-100 px-4 py-3 text-center text-sm", metric === "comments" ? "font-bold text-emerald-800" : "text-slate-800"].join(" ")}>
                        {row.commentsCount}
                      </td>
                      <td className={["border-b border-slate-100 px-4 py-3 text-center text-sm", metric === "likes" ? "font-bold text-emerald-800" : "text-slate-800"].join(" ")}>
                        {row.likesCount}
                      </td>
                      <td className={["border-b border-slate-100 px-4 py-3 text-center text-sm", metric === "guesses" ? "font-bold text-emerald-800" : "text-slate-800"].join(" ")}>
                        {row.guessesCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

function TrafficStatsSection({ section }: { section: StatsSection }) {
  const [traffic, setTraffic] = useState<ProfileTrafficSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTraffic() {
      setLoading(true);
      setError(null);

      try {
        const summary = await getMyProfileTraffic(30);
        if (!cancelled) setTraffic(summary);
      } catch (trafficError: unknown) {
        if (!cancelled) {
          setTraffic(null);
          setError(trafficError instanceof Error ? trafficError.message : "Návštěvnost se nepodařilo načíst.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadTraffic();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <StatsPageHeader title={section.title} description={section.description} />

      <div className="grid gap-3 sm:grid-cols-2">
        <TrafficSummaryCard label="Návštěvy profilu za 30 dní" value={traffic?.totalVisits ?? 0} loading={loading} />
        <TrafficSummaryCard label="Unikátní návštěvníci za 30 dní" value={traffic?.uniqueVisitors ?? 0} loading={loading} />
      </div>

      <StatsMiniChart
        title="Návštěvy profilu"
        helpText="Graf ukazuje počet zobrazení tvé profilové karty za posledních 30 dní.\n\nVlastní zobrazení vlastního profilu se nepočítá. Kvůli ochraně proti opakovanému zápisu se stejné zobrazení ze stejného prohlížeče zapíše nejvýše jednou za 30 minut."
        points={(traffic?.trend ?? []).map((point) => ({ label: point.label, value: point.count }))}
        loading={loading}
        error={error}
        variant="line"
        color="#2563eb"
        valueLabel={(value) => (typeof value === "number" && Number.isFinite(value) ? String(Math.round(value)) : "—")}
        emptyText="Zatím nemáš žádné návštěvy profilu za posledních 30 dní."
      />

      <RecentProfileVisitsTable rows={traffic?.recentVisits ?? []} loading={loading} error={error} />
    </div>
  );
}

function TrafficSummaryCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-black tabular-nums text-slate-950">{loading ? "…" : value}</div>
    </div>
  );
}

function formatVisitDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "—";
  return date.toLocaleString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RecentProfileVisitsTable({
  rows,
  loading,
  error,
}: {
  rows: RecentProfileVisit[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Poslední návštěvy profilu</div>
          <p className="mt-1 text-xs text-slate-500">Zobrazuje posledních 20 návštěv tvé profilové karty.</p>
        </div>
        <HelpIconButton
          helpText="Seznam ukazuje, kdo si zobrazil tvoji veřejnou profilovou kartu a kdy.\n\nVidíš pouze návštěvy svého profilu. Ostatní uživatelé tvoje návštěvy nevidí."
          modalTitle="Nápověda - poslední návštěvy"
          className="shrink-0 p-1"
          iconClassName="h-4 w-4"
        />
      </div>

      {loading ? <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Načítám návštěvy…</div> : null}
      {error ? <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      {!loading && !error ? (
        rows.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Zatím tu nejsou žádné návštěvy profilu.</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-xl border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Návštěvník</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Kdy</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((row, index) => {
                  const label = row.viewerDisplayName?.trim() || row.viewerUserId;

                  return (
                    <tr key={row.id || `${row.viewerUserId}-${row.viewedAt}`} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                      <td className="border-b border-slate-100 px-4 py-3">
                        <Link href={`/users/${row.viewerUserId}`} className="flex w-fit items-center gap-3 rounded-xl px-1 py-1 hover:bg-slate-100">
                          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                            {row.viewerAvatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={row.viewerAvatarUrl} alt={label} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              label.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{label}</div>
                            <div className="text-xs text-slate-500">{row.viewerUserId}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{formatVisitDateTime(row.viewedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}

function wellbeingDateLabel(isoDate: string) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("cs-CZ", { day: "2-digit", month: "2-digit" });
}

function wellbeingPoints(entries: WellbeingDailyEntry[], getValue: (entry: WellbeingDailyEntry) => number | null): StatsMiniChartPoint[] {
  return entries.map((entry) => ({
    label: wellbeingDateLabel(entry.entryDate),
    value: getValue(entry),
  }));
}

function wellbeingFoodAmountHeight(amount: WellbeingFoodAmount | null) {
  if (!amount) return null;
  return WELLBEING_FOOD_AMOUNT_OPTIONS.find((option) => option.value === amount)?.height ?? null;
}

function wellbeingFoodColor(type: WellbeingFoodType | null, amount: WellbeingFoodAmount | null) {
  if (amount === "bez_jidla") return "#94a3b8";
  return WELLBEING_FOOD_TYPE_OPTIONS.find((option) => option.value === type)?.color ?? "#64748b";
}

function wellbeingFoodPlanColor(type: WellbeingFoodType | null, amount: WellbeingFoodAmount | null) {
  if (amount === "bez_jidla") return "#e2e8f0";
  const lightColors: Partial<Record<WellbeingFoodType, string>> = {
    dietni: "#fef08a",
    vegan: "#bbf7d0",
    vegetarian: "#86efac",
    vyvazena: "#99f6e4",
    bezna: "#bfdbfe",
    sladke: "#e9d5ff",
    maso: "#fecaca",
    nezdrava: "#cbd5e1",
  };
  return type ? lightColors[type] ?? "#cbd5e1" : "#cbd5e1";
}

function compactNumber(value: string) {
  return Number(value).toString();
}

function daysInMonth(year: number, monthIndex: number) {
  return Array.from({ length: new Date(year, monthIndex + 1, 0).getDate() }, (_, index) => {
    const date = new Date(year, monthIndex, index + 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });
}

function isFutureLocalDate(isoDate: string) {
  return isoDate > getTodayWellbeingDate();
}

function WellbeingStatsSection({ section }: { section: StatsSection }) {
  const [mood, setMood] = useState<string>(WELLBEING_DEFAULTS.mood);
  const [energy, setEnergy] = useState(WELLBEING_DEFAULTS.energy);
  const [sleep, setSleep] = useState(WELLBEING_DEFAULTS.sleep);
  const [movement, setMovement] = useState(WELLBEING_DEFAULTS.movement);
  const [water, setWater] = useState(WELLBEING_DEFAULTS.water);
  const [foodAmount, setFoodAmount] = useState(WELLBEING_DEFAULTS.foodAmount);
  const [foodType, setFoodType] = useState(WELLBEING_DEFAULTS.foodType);
  const [entryVisibility, setEntryVisibility] = useState<ContentVisibility>("everyone");
  const [entries, setEntries] = useState<WellbeingDailyEntry[]>([]);
  const [historyEntries, setHistoryEntries] = useState<WellbeingDailyEntry[]>([]);
  const [historyMonth, setHistoryMonth] = useState(() => new Date());
  const [historyTab, setHistoryTab] = useState<"overview" | "edit">("overview");
  const [selectedHistoryDates, setSelectedHistoryDates] = useState<string[]>([]);
  const [plans, setPlans] = useState<WellbeingPlanEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [entriesError, setEntriesError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadWellbeingEntries = useCallback(async () => {
    setEntriesLoading(true);
    setEntriesError(null);

    try {
      const year = historyMonth.getFullYear();
      const month = historyMonth.getMonth();
      const [rows, today, defaults, monthRows, planRows] = await Promise.all([
        getMyWellbeingEntries(30),
        getMyTodayWellbeingEntry(),
        getMyWellbeingVisibilityDefaults(),
        getMyWellbeingEntriesForMonth(year, month),
        getMyWellbeingPlansForMonth(year, month),
      ]);
      setEntries(rows);
      setHistoryEntries(monthRows);
      setPlans(planRows);

      if (today) {
        setMood(today.mood ?? "");
        setEnergy(today.energyScore == null ? "" : String(today.energyScore));
        setSleep(today.sleepHours == null ? "" : compactNumber(String(today.sleepHours)));
        setMovement(today.movementMinutes == null ? "" : String(today.movementMinutes));
        setWater(today.waterLiters == null ? "" : compactNumber(String(today.waterLiters)));
        setFoodAmount(today.foodAmount ?? "");
        setFoodType(today.foodType ?? "");
      } else {
        const last = [...rows].reverse().find(Boolean);
        if (last) {
          setMood(last.mood ?? "");
          setEnergy(last.energyScore == null ? "" : String(last.energyScore));
          setSleep(last.sleepHours == null ? "" : compactNumber(String(last.sleepHours)));
          setMovement(last.movementMinutes == null ? "" : String(last.movementMinutes));
          setWater(last.waterLiters == null ? "" : compactNumber(String(last.waterLiters)));
          setFoodAmount(last.foodAmount ?? "");
          setFoodType(last.foodType ?? "");
        }
      }
      setEntryVisibility(defaults.entryVisibility);
    } catch (e: unknown) {
      setEntriesError(e instanceof Error ? e.message : "Wellbeing zápisy se nepodařilo načíst.");
    } finally {
      setEntriesLoading(false);
    }
  }, [historyMonth]);

  useEffect(() => {
    void loadWellbeingEntries();
  }, [loadWellbeingEntries]);

  async function handleSaveToday() {
    setSaveMessage(null);
    setSaveError(null);
    setSaveLoading(true);

    const moodOption = WELLBEING_MOOD_OPTIONS.find((option) => option.value === mood) ?? WELLBEING_MOOD_OPTIONS[1];
    const resolvedFoodAmount = foodAmount ? (foodAmount as WellbeingFoodAmount) : null;

    try {
      await upsertMyTodayWellbeingEntry({
        mood: mood ? (mood as WellbeingMood) : null,
        moodScore: mood ? moodOption.score : null,
        energyScore: energy ? Number(energy) : null,
        sleepHours: sleep ? Number(sleep) : null,
        movementMinutes: movement ? Number(movement) : null,
        waterLiters: water ? Number(water) : null,
        foodAmount: resolvedFoodAmount,
        foodType: resolvedFoodAmount === "bez_jidla" || !foodType ? null : (foodType as WellbeingFoodType),
        entryVisibility,
      });
      await loadWellbeingEntries();
      setSaveMessage("Dnešní zápis je uložený.");
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Dnešní zápis se nepodařilo uložit.");
    } finally {
      setSaveLoading(false);
    }
  }

  const moodPoints = wellbeingPoints(entries, (entry) => entry.moodScore);
  const energyPoints = wellbeingPoints(entries, (entry) => entry.energyScore);
  const sleepPoints = wellbeingPoints(entries, (entry) => entry.sleepHours);
  const movementPoints = wellbeingPoints(entries, (entry) => entry.movementMinutes);
  const waterPoints = wellbeingPoints(entries, (entry) => entry.waterLiters);
  const foodPoints = entries.map((entry) => ({
    label: wellbeingDateLabel(entry.entryDate),
    value: wellbeingFoodAmountHeight(entry.foodAmount),
    color: wellbeingFoodColor(entry.foodType, entry.foodAmount),
  }));
  const sleepPlanPoints = plans
    .filter((plan) => !isFutureLocalDate(plan.planDate))
    .map((plan) => ({ label: wellbeingDateLabel(plan.planDate), value: plan.sleepHours, color: "#bfdbfe" }));
  const movementPlanPoints = plans
    .filter((plan) => !isFutureLocalDate(plan.planDate))
    .map((plan) => ({ label: wellbeingDateLabel(plan.planDate), value: plan.movementMinutes, color: "#99f6e4" }));
  const waterPlanPoints = plans
    .filter((plan) => !isFutureLocalDate(plan.planDate))
    .map((plan) => ({ label: wellbeingDateLabel(plan.planDate), value: plan.waterLiters, color: "#a5f3fc" }));
  const foodPlanPoints = plans
    .filter((plan) => !isFutureLocalDate(plan.planDate))
    .map((plan) => ({
      label: wellbeingDateLabel(plan.planDate),
      value: wellbeingFoodAmountHeight(plan.foodAmount),
      color: wellbeingFoodPlanColor(plan.foodType, plan.foodAmount),
    }));
  const todaySaved = entries.some((entry) => entry.entryDate === getTodayWellbeingDate());

  return (
    <div className="space-y-6">
      <StatsPageHeader
        title={section.title}
        description={section.description}
        items={[...section.items]}
        rightSlot={
          <RefreshIconButton
            onClick={() => void loadWellbeingEntries()}
            disabled={entriesLoading}
            activeIconPath="/ui/refresh-rot.gif"
            activeDurationMs={5000}
            title="Aktualizovat statistiky"
            ariaLabel="Aktualizovat statistiky"
          />
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">Dnešní zápis</div>
            <div className="mt-1 text-sm text-slate-600">Krátký check-in pro náladu, energii a malé návyky.</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <label className="grid gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <WellbeingFieldLabel label="Nálada" />
            <select
              value={mood}
              onChange={(event) => setMood(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">---</option>
              {WELLBEING_MOOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <WellbeingFieldLabel label="Energie" />
            <select
              value={energy}
              onChange={(event) => setEnergy(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">---</option>
              {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((value) => (
                <option key={value} value={value}>
                  {value} / 10
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <WellbeingFieldLabel label="Spánek" />
            <select
              value={sleep}
              onChange={(event) => setSleep(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">---</option>
              {["4", "5", "6", "7", "8", "9", "10"].map((value) => (
                <option key={value} value={value}>
                  {value} h
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <WellbeingFieldLabel label="Pohyb" />
            <select
              value={movement}
              onChange={(event) => setMovement(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">---</option>
              {["0", "10", "20", "30", "45", "60", "90"].map((value) => (
                <option key={value} value={value}>
                  {value} min
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <WellbeingFieldLabel label="Tekutiny" />
            <select
              value={water}
              onChange={(event) => setWater(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">---</option>
              {WELLBEING_WATER_LITERS.map((value) => (
                <option key={value} value={value}>
                  {value} l
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <WellbeingFieldLabel label="Strava" />
            <select
              value={foodAmount}
              onChange={(event) => {
                setFoodAmount(event.target.value);
                if (event.target.value === "bez_jidla") setFoodType("");
              }}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">---</option>
              {WELLBEING_FOOD_AMOUNT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={foodType}
              onChange={(event) => setFoodType(event.target.value)}
              disabled={!foodAmount || foodAmount === "bez_jidla"}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="">---</option>
              {WELLBEING_FOOD_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3 md:col-span-2 xl:col-span-3">
            <div className="flex items-start justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-cyan-800">Dnešní rytmus</div>
              <HelpIconButton
                helpText="Tady je souhrn dnešního zápisu a jeho ovládání.\n\nNahoře vidíš rychlý přehled energie, spánku, pohybu a tekutin. Níže nastavuješ viditelnost celého dnešního zápisu: Všichni, Kontakty nebo Soukromé.\n\nVýchozí viditelnost se načítá z nastavení profilu. Tlačítko Uložit dnešní zápis uloží všechny vyplněné položky najednou. Hodnota --- znamená, že danou položku pro dnešek nechceš vyplnit."
                modalTitle="Nápověda - dnešní rytmus"
                className="shrink-0 p-1"
                iconClassName="h-4 w-4"
              />
            </div>
            <div className="mt-2 text-sm font-semibold text-slate-900 sm:text-base">
              {energy || "---"}/10 energie, {sleep || "---"} h spánku, {movement || "---"} min pohybu, {water || "---"} l tekutin
            </div>
            <div className="mt-1 text-xs leading-5 text-slate-600">
              {todaySaved ? "Dnešní zápis je v databázi." : "Změny se uloží po kliknutí na tlačítko."}
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_auto_auto] lg:items-end">
              <label className="grid gap-1">
                <WellbeingFieldLabel label="Viditelnost dnešního zápisu" />
                <WellbeingVisibilitySelect value={entryVisibility} onChange={setEntryVisibility} />
              </label>
              <AwButton variant="primary" onClick={handleSaveToday} disabled={saveLoading}>
                {saveLoading ? "Ukládám..." : "Uložit dnešní zápis"}
              </AwButton>
              <div className="min-h-[22px] text-sm lg:text-right">
                {saveMessage ? <span className="font-medium text-emerald-700">{saveMessage}</span> : null}
                {saveError ? <span className="font-medium text-rose-700">{saveError}</span> : null}
                {!saveMessage && !saveError && entriesError ? <span className="font-medium text-rose-700">{entriesError}</span> : null}
              </div>
            </div>
          </div>
        </div>

      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Historie</h2>
          <div className="mt-1 text-sm text-slate-600">Přehled uložených denních zápisů a jejich zpětná editace.</div>
        </div>

        <div className="inline-flex rounded-xl bg-white p-1 shadow-sm">
          <AwButton
            variant={historyTab === "overview" ? "primary" : "tertiary"}
            onClick={() => setHistoryTab("overview")}
            className="shadow-none no-underline"
          >
            Přehled
          </AwButton>
          <AwButton
            variant={historyTab === "edit" ? "primary" : "tertiary"}
            onClick={() => setHistoryTab("edit")}
            className="shadow-none no-underline"
          >
            Editace
          </AwButton>
        </div>

        {historyTab === "overview" ? (
          <div className="grid gap-6">
            <StatsMiniChart
              title="Nálada"
              points={moodPoints}
              loading={entriesLoading}
              error={entriesError}
              variant="line"
              color="#e11d48"
              valueLabel={(value) => (typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)} / 10` : "—")}
              emptyText="Zatím nejsou uložené denní zápisy nálady."
            />

            <StatsMiniChart
              title="Energie"
              points={energyPoints}
              loading={entriesLoading}
              error={entriesError}
              variant="line"
              color="#0f766e"
              valueLabel={(value) => (typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)} / 10` : "—")}
              emptyText="Zatím nejsou uložené zápisy energie."
            />

            <StatsMiniChart
              title="Spánek"
              points={sleepPoints}
              secondaryPoints={sleepPlanPoints}
              loading={entriesLoading}
              error={entriesError}
              variant="bar"
              color="#2563eb"
              valueLabel={(value) => (typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)} h` : "—")}
              emptyText="Zatím nejsou uložená data spánku."
            />

            <StatsMiniChart
              title="Pohyb"
              points={movementPoints}
              secondaryPoints={movementPlanPoints}
              loading={entriesLoading}
              error={entriesError}
              variant="bar"
              color="#0f766e"
              valueLabel={(value) => (typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)} min` : "—")}
              emptyText="Zatím nejsou uložená data pohybu."
            />

            <StatsMiniChart
              title="Tekutiny"
              points={waterPoints}
              secondaryPoints={waterPlanPoints}
              loading={entriesLoading}
              error={entriesError}
              variant="bar"
              color="#0891b2"
              yDomain={{ min: 0, max: 5 }}
              valueLabel={(value) => (typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1).replace(".0", "")} l` : "—")}
              emptyText="Zatím nejsou uložená data tekutin."
            />

            <StatsMiniChart
              title="Strava"
              points={foodPoints}
              secondaryPoints={foodPlanPoints}
              loading={entriesLoading}
              error={entriesError}
              variant="bar"
              color="#64748b"
              yDomain={{ min: 0, max: 3 }}
              valueLabel={(value) => {
                if (value === 1) return "málo";
                if (value === 2) return "běžně";
                if (value === 3) return "moc";
                if (value === 0.3) return "bez jídla";
                return "—";
              }}
              emptyText="Zatím nejsou uložená data stravy."
              legend={<FoodChartLegend />}
            />
          </div>
        ) : (
          <WellbeingHistoryTable
            month={historyMonth}
            onMonthChange={setHistoryMonth}
            rows={historyEntries}
            selectedDates={selectedHistoryDates}
            onSelectedDatesChange={setSelectedHistoryDates}
            entryVisibilityDefault={entryVisibility}
            onSave={async (entryDate, patch) => {
              await upsertMyTodayWellbeingEntry({ entryDate, ...patch });
              await loadWellbeingEntries();
            }}
            onBulkSave={async (patch) => {
              await Promise.all(
                selectedHistoryDates.map((entryDate) => {
                  const existing = historyEntries.find((entry) => entry.entryDate === entryDate);
                  return upsertMyTodayWellbeingEntry({
                    entryDate,
                    mood: existing?.mood ?? null,
                    moodScore: existing?.moodScore ?? null,
                    energyScore: existing?.energyScore ?? null,
                    sleepHours: existing?.sleepHours ?? null,
                    movementMinutes: existing?.movementMinutes ?? null,
                    waterLiters: existing?.waterLiters ?? null,
                    foodAmount: existing?.foodAmount ?? null,
                    foodType: existing?.foodType ?? null,
                    entryVisibility: existing?.entryVisibility ?? entryVisibility,
                    ...patch,
                  });
                })
              );
              setSelectedHistoryDates([]);
              await loadWellbeingEntries();
            }}
          />
        )}
      </section>

      <WellbeingPlansSection
        month={historyMonth}
        onMonthChange={setHistoryMonth}
        plans={plans}
        onRefresh={loadWellbeingEntries}
        onSave={async (plan) => {
          await upsertMyWellbeingPlan(plan);
        }}
        loading={entriesLoading}
        error={entriesError}
      />
    </div>
  );
}

function WellbeingVisibilitySelect({
  value,
  onChange,
  disabled = false,
}: {
  value: ContentVisibility;
  onChange: (value: ContentVisibility) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ContentVisibility)}
      disabled={disabled}
      className="mt-1 w-full min-w-0 rounded-xl border border-slate-300 bg-white py-2 pl-3 pr-7 text-xs font-semibold text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
    >
      {WELLBEING_VISIBILITY_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function WellbeingFieldLabel({ label }: { label: string }) {
  return (
    <span className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
      <span>{label}</span>
    </span>
  );
}

function FoodChartLegend() {
  return (
    <div className="flex flex-wrap gap-2 text-xs text-slate-600">
      {WELLBEING_FOOD_TYPE_OPTIONS.map((option) => (
        <span key={option.value} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: option.color }} />
          {option.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
        <span className="h-2.5 w-2.5 rounded-sm bg-slate-300" />
        bez jídla
      </span>
      <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
        <span className="h-2.5 w-2.5 rounded-sm bg-teal-100" />
        světlý odstín = plán
      </span>
    </div>
  );
}

function WellbeingHistoryTable({
  month,
  onMonthChange,
  rows,
  selectedDates,
  onSelectedDatesChange,
  entryVisibilityDefault,
  onSave,
  onBulkSave,
}: {
  month: Date;
  onMonthChange: (date: Date) => void;
  rows: WellbeingDailyEntry[];
  selectedDates: string[];
  onSelectedDatesChange: (dates: string[]) => void;
  entryVisibilityDefault: ContentVisibility;
  onSave: (entryDate: string, patch: Partial<Parameters<typeof upsertMyTodayWellbeingEntry>[0]>) => Promise<void>;
  onBulkSave: (patch: Partial<Parameters<typeof upsertMyTodayWellbeingEntry>[0]>) => Promise<void>;
}) {
  const [bulkDraft, setBulkDraft] = useState({
    mood: "",
    energy: "",
    sleep: "",
    movement: "",
    water: "",
    foodAmount: "",
    foodType: "",
    entryVisibility: entryVisibilityDefault,
  });
  const rowMap = useMemo(() => new Map(rows.map((row) => [row.entryDate, row])), [rows]);
  const dates = daysInMonth(month.getFullYear(), month.getMonth());
  const monthLabel = month.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });

  function toggleDate(date: string) {
    if (isFutureLocalDate(date)) return;
    onSelectedDatesChange(selectedDates.includes(date) ? selectedDates.filter((item) => item !== date) : [...selectedDates, date]);
  }

  async function saveCell(entryDate: string, field: string, value: string) {
    if (isFutureLocalDate(entryDate)) return;
    const existing = rowMap.get(entryDate);
    const base = {
      mood: existing?.mood ?? null,
      moodScore: existing?.moodScore ?? null,
      energyScore: existing?.energyScore ?? null,
      sleepHours: existing?.sleepHours ?? null,
      movementMinutes: existing?.movementMinutes ?? null,
      waterLiters: existing?.waterLiters ?? null,
      foodAmount: existing?.foodAmount ?? null,
      foodType: existing?.foodType ?? null,
      entryVisibility: existing?.entryVisibility ?? entryVisibilityDefault,
    };
    const patch: Partial<Parameters<typeof upsertMyTodayWellbeingEntry>[0]> = { ...base };

    if (field === "mood") {
      const option = WELLBEING_MOOD_OPTIONS.find((item) => item.value === value);
      patch.mood = value ? (value as WellbeingMood) : null;
      patch.moodScore = option?.score ?? null;
    }
    if (field === "energy") patch.energyScore = value ? Number(value) : null;
    if (field === "sleep") patch.sleepHours = value ? Number(value) : null;
    if (field === "movement") patch.movementMinutes = value ? Number(value) : null;
    if (field === "water") patch.waterLiters = value ? Number(value) : null;
    if (field === "foodAmount") {
      patch.foodAmount = value ? (value as WellbeingFoodAmount) : null;
      if (value === "bez_jidla") patch.foodType = null;
    }
    if (field === "foodType") patch.foodType = value ? (value as WellbeingFoodType) : null;
    if (field === "entryVisibility") patch.entryVisibility = value as ContentVisibility;

    await onSave(entryDate, patch);
  }

  function buildPatchFromDraft(draft: typeof bulkDraft) {
    const patch: Partial<Parameters<typeof upsertMyTodayWellbeingEntry>[0]> = {};
    if (draft.mood) {
      const option = WELLBEING_MOOD_OPTIONS.find((item) => item.value === draft.mood);
      patch.mood = draft.mood as WellbeingMood;
      patch.moodScore = option?.score ?? null;
    }
    if (draft.energy) patch.energyScore = Number(draft.energy);
    if (draft.sleep) patch.sleepHours = Number(draft.sleep);
    if (draft.movement) patch.movementMinutes = Number(draft.movement);
    if (draft.water) patch.waterLiters = Number(draft.water);
    if (draft.foodAmount) patch.foodAmount = draft.foodAmount as WellbeingFoodAmount;
    if (draft.foodType && draft.foodAmount !== "bez_jidla") patch.foodType = draft.foodType as WellbeingFoodType;
    if (draft.foodAmount === "bez_jidla") patch.foodType = null;
    patch.entryVisibility = draft.entryVisibility;
    return patch;
  }

  async function handleBulkSave() {
    const patch = buildPatchFromDraft(bulkDraft);
    await onBulkSave(patch);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">Editace historie</div>
          <div className="mt-1 text-xs text-slate-500">Aktuální měsíc, s možností přechodu do hlubší historie.</div>
        </div>
        <div className="inline-flex items-center gap-1">
          <AwButton size="sm" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="px-3 text-lg font-bold leading-none" aria-label="Předchozí měsíc" title="Předchozí měsíc">
            ‹
          </AwButton>
          <div className="min-w-[130px] text-center text-sm font-semibold text-slate-800">{monthLabel}</div>
          <AwButton size="sm" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="px-3 text-lg font-bold leading-none" aria-label="Další měsíc" title="Další měsíc">
            ›
          </AwButton>
        </div>
      </div>

      {selectedDates.length > 1 ? (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
          <div className="mb-2 text-xs font-semibold text-emerald-900">Hromadná editace vybraných dnů</div>
          <div className="grid grid-cols-[40px_42px_88px_82px_82px_88px_82px_112px_minmax(120px,1fr)_140px] gap-2">
            {["", "Den", "Nálada", "Energie", "Spánek", "Pohyb", "Tekutiny", "Množství stravy", "Druh stravy", "Viditelnost"].map((label, index) => (
              <div key={`${label}-${index}`} className="text-[11px] font-bold uppercase tracking-wide text-emerald-900">{label}</div>
            ))}
            <div className="self-center text-xs font-semibold text-emerald-900">{selectedDates.length} dnů</div>
            <div className="self-center text-xs text-emerald-900">vybrané</div>
            <HistoryValueSelect field="mood" value={bulkDraft.mood} onChange={(value) => setBulkDraft((prev) => ({ ...prev, mood: value }))} />
            <HistoryValueSelect field="energy" value={bulkDraft.energy} onChange={(value) => setBulkDraft((prev) => ({ ...prev, energy: value }))} />
            <HistoryValueSelect field="sleep" value={bulkDraft.sleep} onChange={(value) => setBulkDraft((prev) => ({ ...prev, sleep: value }))} />
            <HistoryValueSelect field="movement" value={bulkDraft.movement} onChange={(value) => setBulkDraft((prev) => ({ ...prev, movement: value }))} />
            <HistoryValueSelect field="water" value={bulkDraft.water} onChange={(value) => setBulkDraft((prev) => ({ ...prev, water: value }))} />
            <HistoryValueSelect field="foodAmount" value={bulkDraft.foodAmount} onChange={(value) => setBulkDraft((prev) => ({ ...prev, foodAmount: value, foodType: value === "bez_jidla" ? "" : prev.foodType }))} />
            <HistoryValueSelect field="foodType" value={bulkDraft.foodType} disabled={bulkDraft.foodAmount === "bez_jidla"} onChange={(value) => setBulkDraft((prev) => ({ ...prev, foodType: value }))} />
            <WellbeingVisibilitySelect value={bulkDraft.entryVisibility} onChange={(value) => setBulkDraft((prev) => ({ ...prev, entryVisibility: value }))} />
          </div>
          <AwButton variant="primary" onClick={handleBulkSave} className="mt-3">
            Upravit {selectedDates.length} položek
          </AwButton>
        </div>
      ) : null}

      <div className="mt-4">
        <table className="w-full table-fixed border-separate border-spacing-0">
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "15%" }} />
          </colgroup>
          <thead>
            <tr className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
              <th className="border-b border-slate-200 px-2 py-3"></th>
              <th className="border-b border-slate-200 px-2 py-3">Den</th>
              <th className="border-b border-slate-200 px-2 py-3">Nálada</th>
              <th className="border-b border-slate-200 px-2 py-3">Energie</th>
              <th className="border-b border-slate-200 px-2 py-3">Spánek</th>
              <th className="border-b border-slate-200 px-2 py-3">Pohyb</th>
              <th className="border-b border-slate-200 px-2 py-3">Tekutiny</th>
              <th className="border-b border-slate-200 px-2 py-3">Množství stravy</th>
              <th className="border-b border-slate-200 px-2 py-3">Druh stravy</th>
              <th className="border-b border-slate-200 px-2 py-3">Viditelnost</th>
            </tr>
          </thead>
          <tbody>
            {dates.map((date, index) => {
              const row = rowMap.get(date);
              const disabled = isFutureLocalDate(date);
              return (
                <tr key={date} className={disabled ? "bg-slate-100 text-slate-400" : index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                  <td className="border-b border-slate-100 px-2 py-2">
                    <input type="checkbox" checked={selectedDates.includes(date)} onChange={() => toggleDate(date)} disabled={disabled} className="h-4 w-4 accent-emerald-600 disabled:opacity-40" />
                  </td>
                  <td className="border-b border-slate-100 px-2 py-2 text-sm font-semibold text-slate-800">{formatDayOfMonthCZ(date)}</td>
                  <td className="border-b border-slate-100 px-2 py-2"><HistoryValueSelect field="mood" value={row?.mood ?? ""} disabled={disabled} onChange={(value) => saveCell(date, "mood", value)} /></td>
                  <td className="border-b border-slate-100 px-2 py-2"><HistoryValueSelect field="energy" value={row?.energyScore == null ? "" : String(row.energyScore)} disabled={disabled} onChange={(value) => saveCell(date, "energy", value)} /></td>
                  <td className="border-b border-slate-100 px-2 py-2"><HistoryValueSelect field="sleep" value={row?.sleepHours == null ? "" : compactNumber(String(row.sleepHours))} disabled={disabled} onChange={(value) => saveCell(date, "sleep", value)} /></td>
                  <td className="border-b border-slate-100 px-2 py-2"><HistoryValueSelect field="movement" value={row?.movementMinutes == null ? "" : String(row.movementMinutes)} disabled={disabled} onChange={(value) => saveCell(date, "movement", value)} /></td>
                  <td className="border-b border-slate-100 px-2 py-2"><HistoryValueSelect field="water" value={row?.waterLiters == null ? "" : compactNumber(String(row.waterLiters))} disabled={disabled} onChange={(value) => saveCell(date, "water", value)} /></td>
                  <td className="border-b border-slate-100 px-2 py-2"><HistoryValueSelect field="foodAmount" value={row?.foodAmount ?? ""} disabled={disabled} onChange={(value) => saveCell(date, "foodAmount", value)} /></td>
                  <td className="border-b border-slate-100 px-2 py-2"><HistoryValueSelect field="foodType" value={row?.foodType ?? ""} disabled={disabled || row?.foodAmount === "bez_jidla"} onChange={(value) => saveCell(date, "foodType", value)} /></td>
                  <td className="border-b border-slate-100 px-2 py-2"><WellbeingVisibilitySelect value={row?.entryVisibility ?? entryVisibilityDefault} disabled={disabled} onChange={(value) => saveCell(date, "entryVisibility", value)} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HistoryValueSelect({ field, value, onChange, disabled = false }: { field: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  let options: Array<{ value: string; label: string }> = [{ value: "", label: "---" }];
  if (field === "mood") options = [...options, ...WELLBEING_MOOD_OPTIONS.map((item) => ({ value: item.value, label: item.label }))];
  if (field === "energy") options = [...options, ...Array.from({ length: 10 }, (_, index) => ({ value: String(index + 1), label: `${index + 1}/10` }))];
  if (field === "sleep") options = [...options, ...["4", "5", "6", "7", "8", "9", "10"].map((item) => ({ value: item, label: `${item} h` }))];
  if (field === "movement") options = [...options, ...["0", "10", "20", "30", "45", "60", "90"].map((item) => ({ value: item, label: `${item} min` }))];
  if (field === "water") options = [...options, ...WELLBEING_WATER_LITERS.map((item) => ({ value: item, label: `${item} l` }))];
  if (field === "foodAmount") options = [...options, ...WELLBEING_FOOD_AMOUNT_OPTIONS.map((item) => ({ value: item.value, label: item.label }))];
  if (field === "foodType") options = [...options, ...WELLBEING_FOOD_TYPE_OPTIONS.map((item) => ({ value: item.value, label: item.label }))];

  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="w-full min-w-0 rounded-lg border border-slate-300 bg-white py-2 pl-2 pr-7 text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-400">
      {options.map((option) => (
        <option key={`${field}-${option.value}`} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function WellbeingPlansSection({
  month,
  onMonthChange,
  plans,
  onRefresh,
  onSave,
  loading,
  error,
}: {
  month: Date;
  onMonthChange: (date: Date) => void;
  plans: WellbeingPlanEntry[];
  onRefresh: () => Promise<void>;
  onSave: (plan: Parameters<typeof upsertMyWellbeingPlan>[0]) => Promise<void>;
  loading: boolean;
  error: string | null;
}) {
  const planMap = useMemo(() => new Map(plans.map((plan) => [plan.planDate, plan])), [plans]);
  const dates = daysInMonth(month.getFullYear(), month.getMonth());
  const monthLabel = month.toLocaleDateString("cs-CZ", { month: "long", year: "numeric" });
  const [selectedPlanDates, setSelectedPlanDates] = useState<string[]>([]);
  const [dirtyPlanDates, setDirtyPlanDates] = useState<string[]>([]);
  const [planDrafts, setPlanDrafts] = useState<Record<string, { sleep: string; movement: string; water: string; foodAmount: string; foodType: string }>>({});
  const [bulkDraft, setBulkDraft] = useState({ sleep: "", movement: "", water: "", foodAmount: "", foodType: "" });
  const [savingPlans, setSavingPlans] = useState(false);

  useEffect(() => {
    const next: Record<string, { sleep: string; movement: string; water: string; foodAmount: string; foodType: string }> = {};
    for (const date of dates) {
      const plan = planMap.get(date);
      next[date] = {
        sleep: plan?.sleepHours == null ? "" : compactNumber(String(plan.sleepHours)),
        movement: plan?.movementMinutes == null ? "" : String(plan.movementMinutes),
        water: plan?.waterLiters == null ? "" : compactNumber(String(plan.waterLiters)),
        foodAmount: plan?.foodAmount ?? "",
        foodType: plan?.foodType ?? "",
      };
    }
    setPlanDrafts(next);
    setDirtyPlanDates([]);
    setSelectedPlanDates([]);
  }, [plans, month.getFullYear(), month.getMonth()]);

  function markPlanDirty(date: string) {
    setDirtyPlanDates((prev) => (prev.includes(date) ? prev : [...prev, date]));
  }

  function updatePlanDraft(planDate: string, field: "sleep" | "movement" | "water" | "foodAmount" | "foodType", value: string) {
    setPlanDrafts((prev) => {
      const current = prev[planDate] ?? { sleep: "", movement: "", water: "", foodAmount: "", foodType: "" };
      return {
        ...prev,
        [planDate]: {
          ...current,
          [field]: value,
          ...(field === "foodAmount" && value === "bez_jidla" ? { foodType: "" } : {}),
        },
      };
    });
    markPlanDirty(planDate);
  }

  function togglePlanDate(date: string) {
    setSelectedPlanDates((prev) => (prev.includes(date) ? prev.filter((item) => item !== date) : [...prev, date]));
  }

  function applyPlanBulkDraft() {
    setPlanDrafts((prev) => {
      const next = { ...prev };
      for (const date of selectedPlanDates) {
        const current = next[date] ?? { sleep: "", movement: "", water: "", foodAmount: "", foodType: "" };
        next[date] = {
          sleep: bulkDraft.sleep || current.sleep,
          movement: bulkDraft.movement || current.movement,
          water: bulkDraft.water || current.water,
          foodAmount: bulkDraft.foodAmount || current.foodAmount,
          foodType: bulkDraft.foodAmount === "bez_jidla" ? "" : bulkDraft.foodType || current.foodType,
        };
      }
      return next;
    });
    setDirtyPlanDates((prev) => Array.from(new Set([...prev, ...selectedPlanDates])));
  }

  async function handleSavePlans() {
    setSavingPlans(true);
    try {
      await Promise.all(
        dirtyPlanDates.map((planDate) => {
          const draft = planDrafts[planDate] ?? { sleep: "", movement: "", water: "", foodAmount: "", foodType: "" };
          return onSave({
            planDate,
            sleepHours: draft.sleep ? Number(draft.sleep) : null,
            movementMinutes: draft.movement ? Number(draft.movement) : null,
            waterLiters: draft.water ? Number(draft.water) : null,
            foodAmount: draft.foodAmount ? (draft.foodAmount as WellbeingFoodAmount) : null,
            foodType: draft.foodAmount === "bez_jidla" || !draft.foodType ? null : (draft.foodType as WellbeingFoodType),
          });
        })
      );
      setDirtyPlanDates([]);
    } finally {
      setSavingPlans(false);
    }
  }

  const draftSleepChartPoints = dates
    .map((date) => ({ label: wellbeingDateLabel(date), value: planDrafts[date]?.sleep ? Number(planDrafts[date].sleep) : null }))
    .filter((point) => typeof point.value === "number" && Number.isFinite(point.value));
  const draftMovementChartPoints = dates
    .map((date) => ({ label: wellbeingDateLabel(date), value: planDrafts[date]?.movement ? Number(planDrafts[date].movement) : null }))
    .filter((point) => typeof point.value === "number" && Number.isFinite(point.value));
  const draftWaterChartPoints = dates
    .map((date) => ({ label: wellbeingDateLabel(date), value: planDrafts[date]?.water ? Number(planDrafts[date].water) : null }))
    .filter((point) => typeof point.value === "number" && Number.isFinite(point.value));
  const draftFoodChartPoints = dates
    .map((date) => {
      const draft = planDrafts[date];
      const amount = draft?.foodAmount ? (draft.foodAmount as WellbeingFoodAmount) : null;
      const type = draft?.foodType ? (draft.foodType as WellbeingFoodType) : null;
      return {
        label: wellbeingDateLabel(date),
        value: wellbeingFoodAmountHeight(amount),
        color: wellbeingFoodPlanColor(type, amount),
      };
    })
    .filter((point) => typeof point.value === "number" && Number.isFinite(point.value));

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Plány a návyky</h2>
            <div className="mt-1 text-sm text-slate-600">Dlouhodobé nastavení spánku, pohybu, tekutin a stravy.</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <HelpIconButton
            helpText="Plány a návyky jsou dopředné nastavení pro spánek, pohyb, tekutiny a stravu.\n\nNa rozdíl od historie je možné upravovat i budoucí dny. Změny se ukládají až tlačítkem Uložit změny, aby tabulka nereagovala pomalu po každé položce.\n\nPokud plánovaný den už nastal, jeho plán se v historických grafech ukáže světle vedle skutečného zápisu."
            modalTitle="Nápověda - plány a návyky"
            className="p-1"
            iconClassName="h-4 w-4"
          />
          <RefreshIconButton
            onClick={() => void onRefresh()}
            disabled={loading}
            activeIconPath="/ui/refresh-rot.gif"
            activeDurationMs={5000}
            title="Aktualizovat plány a návyky"
            ariaLabel="Aktualizovat plány a návyky"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-semibold text-slate-900">Přehled měsíce</div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1">
              <AwButton size="sm" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="px-3 text-lg font-bold leading-none" aria-label="Předchozí měsíc" title="Předchozí měsíc">‹</AwButton>
              <div className="min-w-[130px] text-center text-sm font-semibold text-slate-800">{monthLabel}</div>
              <AwButton size="sm" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="px-3 text-lg font-bold leading-none" aria-label="Další měsíc" title="Další měsíc">›</AwButton>
            </div>
            <AwButton variant="primary" onClick={handleSavePlans} disabled={savingPlans || dirtyPlanDates.length === 0}>
              {savingPlans ? "Ukládám..." : `Uložit změny${dirtyPlanDates.length ? ` (${dirtyPlanDates.length})` : ""}`}
            </AwButton>
          </div>
        </div>

        {selectedPlanDates.length > 1 ? (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
            <div className="mb-2 text-xs font-semibold text-emerald-900">Hromadná editace plánů</div>
            <div className="grid grid-cols-[76px_96px_repeat(5,minmax(92px,1fr))] gap-2">
              {["Vybráno", "Den", "Spánek", "Pohyb", "Tekutiny", "Množství stravy", "Druh stravy"].map((label) => (
                <div key={label} className="text-[11px] font-bold uppercase tracking-wide text-emerald-900">{label}</div>
              ))}
              <div className="self-center text-xs font-semibold text-emerald-900">{selectedPlanDates.length} dnů</div>
              <div className="self-center text-xs text-emerald-900">vybrané</div>
              <HistoryValueSelect field="sleep" value={bulkDraft.sleep} onChange={(value) => setBulkDraft((prev) => ({ ...prev, sleep: value }))} />
              <HistoryValueSelect field="movement" value={bulkDraft.movement} onChange={(value) => setBulkDraft((prev) => ({ ...prev, movement: value }))} />
              <HistoryValueSelect field="water" value={bulkDraft.water} onChange={(value) => setBulkDraft((prev) => ({ ...prev, water: value }))} />
              <HistoryValueSelect field="foodAmount" value={bulkDraft.foodAmount} onChange={(value) => setBulkDraft((prev) => ({ ...prev, foodAmount: value, foodType: value === "bez_jidla" ? "" : prev.foodType }))} />
              <HistoryValueSelect field="foodType" value={bulkDraft.foodType} disabled={bulkDraft.foodAmount === "bez_jidla"} onChange={(value) => setBulkDraft((prev) => ({ ...prev, foodType: value }))} />
            </div>
            <AwButton variant="primary" onClick={applyPlanBulkDraft} className="mt-3">
              Přepsat vybrané plány
            </AwButton>
          </div>
        ) : null}

        <div className="mt-4 max-h-[520px] overflow-auto">
          <table className="w-full table-fixed border-separate border-spacing-0">
            <colgroup>
              <col style={{ width: "7%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "11.2%" }} />
              <col style={{ width: "26.8%" }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-700">
                <th className="border-b border-slate-200 px-3 py-3">Vybrat</th>
                <th className="border-b border-slate-200 px-3 py-3">Den</th>
                <th className="border-b border-slate-200 px-3 py-3">Spánek</th>
                <th className="border-b border-slate-200 px-3 py-3">Pohyb</th>
                <th className="border-b border-slate-200 px-3 py-3">Tekutiny</th>
                <th className="border-b border-slate-200 px-3 py-3">Množství stravy</th>
                <th className="border-b border-slate-200 px-3 py-3">Druh stravy</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((date, index) => {
                const draft = planDrafts[date] ?? { sleep: "", movement: "", water: "", foodAmount: "", foodType: "" };
                return (
                  <tr key={date} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                    <td className="border-b border-slate-100 px-3 py-2">
                      <input type="checkbox" checked={selectedPlanDates.includes(date)} onChange={() => togglePlanDate(date)} className="h-4 w-4 accent-emerald-600" />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">{formatDateCZ(date)}</td>
                    <td className="border-b border-slate-100 px-3 py-2"><HistoryValueSelect field="sleep" value={draft.sleep} onChange={(value) => updatePlanDraft(date, "sleep", value)} /></td>
                    <td className="border-b border-slate-100 px-3 py-2"><HistoryValueSelect field="movement" value={draft.movement} onChange={(value) => updatePlanDraft(date, "movement", value)} /></td>
                    <td className="border-b border-slate-100 px-3 py-2"><HistoryValueSelect field="water" value={draft.water} onChange={(value) => updatePlanDraft(date, "water", value)} /></td>
                    <td className="border-b border-slate-100 px-3 py-2"><HistoryValueSelect field="foodAmount" value={draft.foodAmount} onChange={(value) => updatePlanDraft(date, "foodAmount", value)} /></td>
                    <td className="border-b border-slate-100 px-3 py-2"><HistoryValueSelect field="foodType" value={draft.foodType} disabled={draft.foodAmount === "bez_jidla"} onChange={(value) => updatePlanDraft(date, "foodType", value)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-6 grid gap-5">
          <PlanInlineChart
            title="Graf plánovaného spánku"
            points={draftSleepChartPoints}
            loading={loading}
            error={error}
            color="#2563eb"
            unit="h"
            emptyText="Zatím nejsou uložené plány spánku pro aktuální měsíc."
          />
          <PlanInlineChart
            title="Graf plánovaného pohybu"
            points={draftMovementChartPoints}
            loading={loading}
            error={error}
            color="#0f766e"
            unit="min"
            emptyText="Zatím nejsou uložené plány pohybu pro aktuální měsíc."
          />
          <PlanInlineChart
            title="Graf plánovaných tekutin"
            points={draftWaterChartPoints}
            loading={loading}
            error={error}
            color="#0891b2"
            unit="l"
            maxFloor={5}
            emptyText="Zatím nejsou uložené plány tekutin pro aktuální měsíc."
          />
          <PlanInlineChart
            title="Graf plánované stravy"
            points={draftFoodChartPoints}
            loading={loading}
            error={error}
            color="#64748b"
            maxFloor={3}
            valueLabel={(value) => {
              if (value === 1) return "málo";
              if (value === 2) return "běžně";
              if (value === 3) return "moc";
              if (value === 0.3) return "bez jídla";
              return "—";
            }}
            emptyText="Zatím nejsou uložené plány stravy pro aktuální měsíc."
            legend={<FoodChartLegend />}
          />
        </div>
      </div>
    </div>
  );
}

function PlanInlineChart({
  title,
  points,
  loading,
  error,
  color,
  unit,
  maxFloor = 30,
  valueLabel,
  emptyText,
  legend,
}: {
  title: string;
  points: StatsMiniChartPoint[];
  loading: boolean;
  error: string | null;
  color: string;
  unit?: string;
  maxFloor?: number;
  valueLabel?: (value: number) => string;
  emptyText: string;
  legend?: ReactNode;
}) {
  const chartPoints = points.filter((point) => typeof point.value === "number" && Number.isFinite(point.value));
  const max = Math.max(maxFloor, ...chartPoints.map((point) => point.value ?? 0));
  const planDayNumber = (label: string) => {
    const day = Number.parseInt(label, 10);
    return Number.isFinite(day) ? day : null;
  };

  if (loading || error || chartPoints.length === 0) {
    return (
      <div>
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        {loading ? <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Načítám plány...</div> : null}
        {error ? <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
        {!loading && !error && chartPoints.length === 0 ? <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{emptyText}</div> : null}
      </div>
    );
  }

  return (
    <div>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-3 border-l border-b border-slate-300 px-3 pb-2 pt-4">
        <div className="flex h-36 items-end gap-1">
          {chartPoints.map((point, index) => {
            const value = point.value ?? 0;
            const height = Math.max(4, (value / max) * 128);
            const label = valueLabel ? valueLabel(value) : `${unit === "min" ? Math.round(value) : value.toFixed(1).replace(".0", "")}${unit ? ` ${unit}` : ""}`;
            return (
              <div key={`${point.label}-bar-${index}`} className="flex min-w-0 flex-1 justify-center">
                <div title={`${point.label}: ${label}`} className="w-full max-w-6 rounded-t" style={{ height, backgroundColor: point.color ?? color }} />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex h-4 gap-1">
          {chartPoints.map((point, index) => {
            const day = planDayNumber(point.label);
            return (
              <div key={`${point.label}-label-${index}`} className="min-w-0 flex-1 text-center text-[10px] leading-none text-slate-500">
                {day && day % 5 === 0 ? `${day}.` : ""}
              </div>
            );
          })}
        </div>
      </div>
      {legend ? <div className="mt-3">{legend}</div> : null}
    </div>
  );
}

function tipCountDescription(view: TipCountHistoryView) {
  if (view === "30d") return "Počet tipů vytvořených v jednotlivých dnech za posledních 30 dní.";
  if (view === "1y") return "Počet tipů seskupený po měsících za poslední rok.";
  return "Počet tipů seskupený po letech za celé dostupné období.";
}

function challengeVisibilityLabel(value: AwChallenge["visibility"]) {
  if (value === "private") return "Soukromá";
  if (value === "contacts") return "Pro kontakty";
  return "Veřejná";
}

function challengeScopeLabel(challenge: AwChallenge) {
  if (challenge.photo_scope === "challenge_tag") return challenge.challenge_tag ? `#${challenge.challenge_tag}` : "Tag výzvy";
  return challenge.include_experimental_images ? "Období včetně experimentálních" : "Období bez experimentálních";
}

function ChallengesStatsSection({
  section,
  rows,
  loading,
  error,
}: {
  section: StatsSection;
  rows: AwChallengeStatsRow[];
  loading: boolean;
  error: string | null;
}) {
  const activeCount = rows.filter((row) => row.challenge.status === "active").length;
  const publicCount = rows.filter((row) => row.challenge.visibility === "everyone").length;
  const taggedCount = rows.filter((row) => row.challenge.photo_scope === "challenge_tag").length;
  const totalImages = rows.reduce((sum, row) => sum + row.imageCount, 0);
  const avgTargetShift = useMemo(() => {
    const deltas = rows
      .map((row) =>
        typeof row.challenge.baseline_aw_score_norm_pct === "number"
          ? row.challenge.target_aw_score_norm_pct - row.challenge.baseline_aw_score_norm_pct
          : null
      )
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

    if (deltas.length === 0) return null;
    return deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
  }, [rows]);

  return (
    <div className="space-y-6">
      <StatsPageHeader title={section.title} description={section.description} items={[...section.items]} />

      <div className="grid gap-3 md:grid-cols-5">
        <StatsSummaryCell label="Aktivní výzvy" value={String(activeCount)} />
        <StatsSummaryCell label="Veřejné výzvy" value={String(publicCount)} />
        <StatsSummaryCell label="Výzvy s tagem" value={String(taggedCount)} />
        <StatsSummaryCell label="Fotky ve výzvách" value={String(totalImages)} />
        <StatsSummaryCell
          label="Průměrný cílový posun"
          value={avgTargetShift === null ? "—" : `${avgTargetShift > 0 ? "+" : ""}${avgTargetShift.toFixed(1)} p. b.`}
        />
      </div>

      {!loading && !error && rows.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map((row) => {
            const challenge = row.challenge;
            const targetShift =
              typeof challenge.baseline_aw_score_norm_pct === "number"
                ? challenge.target_aw_score_norm_pct - challenge.baseline_aw_score_norm_pct
                : null;
            const elapsed = row.daysElapsed ?? 0;
            const total = row.daysTotal ?? 0;
            const pct = total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : 0;

            return (
              <div key={challenge.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/challenges/${challenge.id}`} className="text-base font-bold text-slate-950 hover:text-emerald-700 hover:underline">
                      {challenge.title}
                    </Link>
                    <div className="mt-1 text-xs text-slate-500">{challengeScopeLabel(challenge)}</div>
                  </div>
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                    {challengeVisibilityLabel(challenge.visibility)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-4">
                  <StatsSummaryCell label="Start" value={formatAwScoreForUi(challenge.baseline_aw_score_norm_pct)} />
                  <StatsSummaryCell label="Cíl" value={formatAwScoreForUi(challenge.target_aw_score_norm_pct)} />
                  <StatsSummaryCell label="Posun" value={targetShift === null ? "—" : `${targetShift > 0 ? "+" : ""}${targetShift.toFixed(1)} p. b.`} />
                  <StatsSummaryCell label="Fotky" value={String(row.imageCount)} />
                </div>

                <div className="mt-4">
                  <div className="flex justify-between gap-3 text-xs font-semibold text-slate-600">
                    <span>{formatDateCZ(challenge.start_date)}</span>
                    <span>{row.daysRemaining ?? 0} dní zbývá</span>
                    <span>{formatDateCZ(challenge.target_date_current)}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900">Moje výzvy</div>
          <HelpIconButton
            helpText="Statistika výzev zatím používá uložené hodnoty výzvy: startovní AW skóre, cílové AW skóre, termín, viditelnost a rozsah fotek.\n\nAW skóre se nepočítá jinak. Výzva jen porovnává hodnotu na začátku a na konci podle existujících pravidel."
            modalTitle="Nápověda - statistika výzev"
            className="shrink-0 p-1"
            iconClassName="h-4 w-4"
          />
        </div>

        {loading ? <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Načítám výzvy...</div> : null}
        {error ? <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

        {!loading && !error ? (
          rows.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Zatím nemáš žádnou výzvu.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full overflow-hidden rounded-xl border-separate border-spacing-0">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Výzva</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Start</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Cíl</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Termín</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Fotky</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Posty</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Rozsah</th>
                    <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Viditelnost</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const challenge = row.challenge;
                    return (
                    <tr key={challenge.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                      <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                        <Link href={`/challenges/${challenge.id}`} className="hover:text-emerald-700 hover:underline">
                          {challenge.title}
                        </Link>
                        <div className="mt-1 text-xs font-normal text-slate-500">{challenge.status}</div>
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-center text-sm text-slate-800">
                        {formatAwScoreForUi(challenge.baseline_aw_score_norm_pct)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-900">
                        {formatAwScoreForUi(challenge.target_aw_score_norm_pct)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-center text-sm text-slate-800">
                        {formatDateCZ(challenge.target_date_current)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-900">
                        {row.imageCount}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-center text-sm text-slate-800">
                        {row.postCount}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-center text-sm text-slate-800">
                        {challengeScopeLabel(challenge)}
                      </td>
                      <td className="border-b border-slate-100 px-4 py-3 text-center text-sm text-slate-800">
                        {challengeVisibilityLabel(challenge.visibility)}
                      </td>
                    </tr>
                  );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
}

function StatsSummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-950">{value}</div>
    </div>
  );
}

function MyTipsStatsSection({
  section,
  view,
  onViewChange,
  countView,
  onCountViewChange,
  accuracyRows,
  countRows,
  loading,
  error,
}: {
  section: StatsSection;
  view: StatsHistoryView;
  onViewChange: (view: StatsHistoryView) => void;
  countView: TipCountHistoryView;
  onCountViewChange: (view: TipCountHistoryView) => void;
  accuracyRows: StatsHistoryRow[];
  countRows: TipCountHistoryPoint[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-6">
      <StatsPageHeader title={section.title} description={section.description} />

      <div className="space-y-3">
        <div className="flex justify-end">
          <StatsHistorySelect value={view} onChange={onViewChange} />
        </div>
        <StatsMiniChart
          title="Přesnost tipů"
          description="Denní historický snapshot průměrné přesnosti tipování."
          helpText="Graf ukazuje, jak se v čase vyvíjí tvoje průměrná přesnost tipů.\n\nVyšší procento znamená přesnější odhady věku. Hodnoty vznikají z denních snapshotů, takže graf ukazuje trend, ne každé jednotlivé tipnutí.\n\nSnapshoty se ukládají do databáze automaticky jako avg_accuracy_pct v tabulce aw_user_stats_history, takže nezávisí na tom, jestli otevřeš stránku statistik.\n\nDropdownem nad grafem změníš časový rozsah."
          points={accuracyRows.map((row) => ({ label: formatDateCZ(row.snapshot_date), value: row.avg_accuracy_pct }))}
          loading={loading}
          error={error}
          variant="line"
          color="#2563eb"
          valueLabel={(value) => (typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)} %` : "—")}
        />
      </div>

      <div className="space-y-3">
        <div className="flex justify-end">
          <TipCountHistorySelect value={countView} onChange={onCountViewChange} />
        </div>
        <StatsMiniChart
          title="Počet provedených tipů"
          description={tipCountDescription(countView)}
          helpText="Graf ukazuje, kolik tipů věku jsi provedl v daném období.\n\nV pohledu 30 dní je každý sloupec jeden den. V ročním pohledu jsou data po měsících. V celoživotním pohledu jsou data po letech.\n\nPoužij ho pro rychlou kontrolu, kdy jsi byl v tipování nejaktivnější."
          points={countRows.map((row) => ({ label: row.label, value: row.count }))}
          loading={loading}
          error={error}
          variant="bar"
          color="#10b981"
          valueLabel={(value) => (typeof value === "number" && Number.isFinite(value) ? String(Math.round(value)) : "—")}
        />
      </div>
    </div>
  );
}

function AwScoreGranularityToggle({
  value,
  onChange,
}: {
  value: AwScoreTrendGranularity;
  onChange: (value: AwScoreTrendGranularity) => void;
}) {
  const options: Array<{ value: AwScoreTrendGranularity; label: string }> = [
    { value: "daily", label: "Denní" },
    { value: "weekly", label: "Týdenní" },
    { value: "monthly", label: "Měsíční" },
  ];

  return (
    <div className="inline-flex rounded-2xl bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-xl px-3 py-2 text-sm font-semibold ${value === option.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function AwScoreStatsSection({
  section,
  granularity,
  onGranularityChange,
  trendRows,
  topPosts,
  loading,
  error,
}: {
  section: StatsSection;
  granularity: AwScoreTrendGranularity;
  onGranularityChange: (value: AwScoreTrendGranularity) => void;
  trendRows: Array<{ label: string; awScoreNormPct: number | null }>;
  topPosts: TopAwInfluencePost[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-6">
      <StatsPageHeader title={section.title} description={section.description} items={[...section.items]} />

      <div className="flex justify-end">
        <AwScoreGranularityToggle value={granularity} onChange={onGranularityChange} />
      </div>

      <StatsMiniChart
        title="AW skóre trend"
        description="Trend vychází z denních snapshotů v aw_user_stats_history. Týdenní a měsíční pohled průměruje uložené body v daném období."
        helpText="Graf ukazuje trend AW skóre v denním, týdenním nebo měsíčním pohledu.\n\nDenní pohled ukazuje jednotlivé snapshoty. Týdenní a měsíční pohled průměruje dostupné hodnoty v daném období.\n\nPoužij ho pro sledování, jestli se tvůj AW výsledek dlouhodobě zlepšuje, zhoršuje nebo drží stabilně."
        points={trendRows.map((row) => ({ label: row.label, value: row.awScoreNormPct }))}
        loading={loading}
        error={error}
        variant="line"
        color="#0f766e"
        valueLabel={formatAwScoreForUi}
      />

      <TopAwInfluencePostsTable rows={topPosts} loading={loading} error={error} />
    </div>
  );
}

function GenerationAwPerceptionTable({
  rows,
  loading,
  error,
}: {
  rows: GenerationAwPerceptionRow[];
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">Tvůj AW věk podle generací</div>
        <HelpIconButton
          helpText="Tabulka ukazuje, na kolik let tě v průměru tipují jednotlivé generace.\n\nPočítá se z tipů na tvoje fotky podle data narození tipujícího."
          modalTitle="Nápověda - AW věk podle generací"
          className="shrink-0 p-1"
          iconClassName="h-4 w-4"
        />
      </div>

      {loading ? <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Načítám generační rozložení…</div> : null}
      {error ? <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      {!loading && !error ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full overflow-hidden rounded-xl border-separate border-spacing-0">
            <thead>
              <tr className="bg-slate-100 text-slate-700">
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Generace</th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Narození</th>
                <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Tipujících</th>
                <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Tipů</th>
                <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Průměrný AW věk</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.generation} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                  <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
                    {row.generation}
                    {row.note ? <div className="mt-1 text-xs font-normal text-slate-500">{row.note}</div> : null}
                  </td>
                  <td className="border-b border-slate-100 px-4 py-3 text-sm text-slate-700">{row.bornRange}</td>
                  <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-800">{row.guesserCount}</td>
                  <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-800">{row.tipsCount}</td>
                  <td className="border-b border-slate-100 px-4 py-3 text-center text-sm font-bold text-slate-900">
                    {row.avgGuessedAge !== null ? `${row.avgGuessedAge.toFixed(1)} let` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function TopAwInfluencePostsTable({
  rows,
  loading,
  error,
}: {
  rows: TopAwInfluencePost[];
  loading: boolean;
  error: string | null;
}) {
  const [sortKey, setSortKey] = useState<AwInfluenceSortKey>("guessesCount");
  const [sortDirection, setSortDirection] = useState<TopPostSortDirection>("desc");
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      const aNumber = typeof aValue === "number" && Number.isFinite(aValue) ? aValue : null;
      const bNumber = typeof bValue === "number" && Number.isFinite(bValue) ? bValue : null;

      if (aNumber === null && bNumber === null) {
        return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
      }
      if (aNumber === null) return 1;
      if (bNumber === null) return -1;

      const metricSort = sortDirection === "asc" ? aNumber - bNumber : bNumber - aNumber;
      return metricSort || new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
    });
  }, [rows, sortKey, sortDirection]);

  function handleSort(nextSortKey: AwInfluenceSortKey, nextDirection: TopPostSortDirection) {
    setSortKey(nextSortKey);
    setSortDirection(nextDirection);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-semibold text-slate-900">Příspěvky s největším vlivem na AW</div>
        <HelpIconButton
          helpText="Zatím jde o orientační výpis podle dostupných image metrik: rozdíl průměrného AW věku a skutečného věku násobený počtem tipů.\n\nNení to náhrada finálního oficiálního AW výpočtu."
          modalTitle="Nápověda - příspěvky s největším vlivem na AW"
          className="shrink-0 p-1"
          iconClassName="h-4 w-4"
        />
      </div>

      {loading ? <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Načítám příspěvky…</div> : null}
      {error ? <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      {!loading && !error ? (
        rows.length === 0 ? (
          <div className="mt-4 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">Zatím nejsou dostupné příspěvky s AW daty.</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full overflow-hidden rounded-xl border-separate border-spacing-0">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Příspěvek</th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                    <SortableAwInfluenceHeader label="Fotky" sortKey="imageCount" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                    <SortableAwInfluenceHeader label="Tipů" sortKey="guessesCount" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                    <SortableAwInfluenceHeader label="AW věk" sortKey="avgAwAge" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                    <SortableAwInfluenceHeader label="Rozdíl" sortKey="avgDeltaYears" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                    <SortableAwInfluenceHeader label="Index" sortKey="influenceScore" activeSortKey={sortKey} direction={sortDirection} onSort={handleSort} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, index) => (
                  <tr key={row.postId} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                    <td className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">{row.title}</td>
                    <td className={["border-b border-slate-100 px-4 py-3 text-center text-sm", sortKey === "imageCount" ? "font-bold text-emerald-800" : "text-slate-800"].join(" ")}>
                      {row.imageCount}
                    </td>
                    <td className={["border-b border-slate-100 px-4 py-3 text-center text-sm", sortKey === "guessesCount" ? "font-bold text-emerald-800" : "text-slate-800"].join(" ")}>
                      {row.guessesCount}
                    </td>
                    <td className={["border-b border-slate-100 px-4 py-3 text-center text-sm", sortKey === "avgAwAge" ? "font-bold text-emerald-800" : "text-slate-800"].join(" ")}>
                      {row.avgAwAge !== null ? `${row.avgAwAge.toFixed(1)} let` : "—"}
                    </td>
                    <td className={["border-b border-slate-100 px-4 py-3 text-center text-sm", sortKey === "avgDeltaYears" ? "font-bold text-emerald-800" : "font-semibold text-slate-900"].join(" ")}>
                      {row.avgDeltaYears !== null ? `${row.avgDeltaYears > 0 ? "+" : ""}${row.avgDeltaYears.toFixed(1)} let` : "—"}
                    </td>
                    <td className={["border-b border-slate-100 px-4 py-3 text-center text-sm", sortKey === "influenceScore" ? "font-bold text-emerald-800" : "font-bold text-slate-900"].join(" ")}>
                      {row.influenceScore !== null ? row.influenceScore.toFixed(1) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}
