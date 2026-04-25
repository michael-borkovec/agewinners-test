/**
 * app/profile/personal/page.tsx
 *
 * Purpose:
 * - "Muj profil ? Personal" (/profile/personal)
 * - Edit user personal profile fields:
 *   A) Identita & Sebevyjádrení
 *   B) Zájmy
 *   C) Životní styl
 *
 * Key requirements:
 * - Nic není povinné.
 * - Limity výberu:
 *   - primary_interests: max 3
 *   - interests: max 5 (vcetne vlastních)
 *   - life_goals: max 5 (vcetne vlastních)
 *   - activities: max 5 (vcetne vlastních)
 *   - improvement_areas: max 5 (vcetne vlastních)
 *   - jazyky: neomezene
 * - Per-field privacy toggle je boolean (*_hidden).
 *
 * ? UX:
 * - místo checkboxu "Nezobrazovat ostatním" používáme ikony:
 *   - hidden=false -> /ShowOthers-icon.png (vidí ostatní)
 *   - hidden=true  -> /DoNotShowOthers-icon.png (nevidí ostatní)
 * - tooltip (title) vysvetluje stav a akci po kliknutí
 */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AwButton from "@/components/AwButton";
import CloseButton from "@/components/CloseButton";
import { awAlert } from "@/components/AwDialog";
import type {
  DbUserProfile,
  EducationLevel,
  RelationshipStatus,
  SelfView,
  DietPreference,
  AlcoholUse,
  Smoking,
  Mindset,
  LifePace,
} from "@/types/db";
import { getMyProfile, updateMyPersonalProfile } from "@/lib/api/userProfiles";
import {
  PERSONAL_DIET_PREFERENCE_OPTIONS,
  PERSONAL_RELATIONSHIP_STATUS_OPTIONS,
} from "@/lib/profilePersonalOptions";

/* ----------------------------- */
/*  Dictionaries (approved)      */
/* ----------------------------- */

const EDUCATION_LEVELS: EducationLevel[] = [
  "Základní",
  "Vyučen / odborné vzdělání",
  "Střední škola bez maturity",
  "Střední škola s maturitou",
  "Vyšší odborná škola (VOŠ)",
  "Vysokoškolské – bakalářské",
  "Vysokoškolské – magisterské",
  "Vysokoškolské – doktorské",
  "Nechci uvádět",
];

const REL_STATUS: RelationshipStatus[] = PERSONAL_RELATIONSHIP_STATUS_OPTIONS;

const LANGUAGES = [
  "Ceština",
  "Slovenština",
  "Anglictina",
  "Nemcina",
  "Francouzština",
  "Španelština",
  "Italština",
  "Polština",
  "Madarština",
  "Rumunština",
  "Bulharština",
  "Srbština/Chorvatština",
  "Slovinština",
  "Ruština",
  "Ukrajinština",
  "Cínština",
  "Japonština",
  "Korejština",
  "Arabština",
  "Hebrejština",
  "Portugalština",
  "Nizozemština",
  "Švédština",
  "Norština",
  "Dánština",
  "Finština",
  "Turectina",
  "Rectina",
];

const PRIMARY_INTERESTS = [
  "Sport & pohyb",
  "Životní styl & wellbeing",
  "Móda & beauty",
  "Kosmetika & péce",
  "Pozitivní myšlení & mindset",
  "Zdravé stravování",
  "Osobní rozvoj",
  "Zdraví & prevence",
  "Relax & mindfulness",
];

const INTERESTS = [
  "Sport obecne",
  "Fitness / posilování",
  "Beh",
  "Kolo",
  "Turistika",
  "Jóga / pilates",
  "Plavání",
  "Tanec",
  "Knihy",
  "Audioknihy",
  "Podcasty",
  "Hudba",
  "Filmy & seriály",
  "Fotografie",
  "Cestování",
  "Príroda",
  "Varení",
  "Zdravá výživa",
  "Móda",
  "Kosmetika",
  "Osobní rozvoj",
  "Meditace / mindfulness",
  "Moderní technologie",
  "Umelá inteligence",
  "Veda",
  "Historie",
  "Umení",
  "Dobrovolnictví",
  "Podnikání",
  "Finance",
  "Vztahy & komunikace",
  "Politika & dení",
  "Spolecnost",
];

const LIFE_GOALS = [
  "Vypadat mladší",
  "Cítit se mladší",
  "Mít lepší fyzicku",
  "Zhubnout",
  "Nabrat svaly",
  "Zlepšit zdraví",
  "Zlepšit spánek",
  "Mít víc energie",
  "Zlepšit jídelnícek",
  "Zvládat stres",
  "Najít rovnováhu",
  "Být spokojenejší",
  "Být úspešný ve sportu",
  "Být úspešný v práci",
  "Zmenit práci / najít práci",
  "Naucit se nový skill",
  "Najít partnera",
  "Zlepšit vztahy",
  "Založit rodinu",
  "Založit firmu / podnikat",
  "Víc cestovat",
  "Více casu pro sebe",
  "Zlepšit sebevedomí",
  "Být disciplinovanejší",
];

const SELF_VIEW: SelfView[] = [
  "Optimista",
  "Spíše optimista",
  "Realista",
  "Spíše pesimista",
  "Pesimista",
  "Nevím / nechci řešit",
];

const IMPROVEMENT_AREAS = [
  "Škola / studium",
  "Práce / kariéra",
  "Vztahy",
  "Komunikace",
  "Sebevedomí",
  "Disciplína",
  "Organizace casu",
  "Financní gramotnost",
  "Zdraví",
  "Fyzická kondice",
  "Psychická pohoda",
  "Kreativita",
  "Trpelivost",
  "Soustredení",
  "Anglictina / jazyky",
  "Prezentace / vystupování",
];

const ACTIVITIES = [
  // Sports
  "Beh",
  "Fitness / posilování",
  "Kolo",
  "Plavání",
  "Jóga",
  "Pilates",
  "Tanec",
  "Tenis",
  "Badminton",
  "Fotbal",
  "Hokej",
  "Basketbal",
  "Volejbal",
  "Lezení",
  "Lyže / snowboard",
  "Bruslení",
  "Bojové sporty",
  "Golf",
  // Movement
  "Chuze",
  "Turistika",
  "Nordic walking",
  "Domácí cvicení",
  "Protažení / mobilita",
  "Vencení psu",
  "Práce na zahrade",
  "Aktivní dojíždení (pešky/kolo)",
];

const DIET: DietPreference[] = PERSONAL_DIET_PREFERENCE_OPTIONS;

const ALCOHOL: AlcoholUse[] = ["Abstinent", "Výjimečně", "Občas", "Často", "Každý den", "Závislý", "Nechci uvádět"];
const SMOKING: Smoking[] = ["Nekouřím", "Výjimečně", "Občas", "Denně", "Závislý", "Nechci uvádět"];
const MINDSET: Mindset[] = ["Klid", "Motivace", "Růst", "Radost", "Rovnováha", "Nechci uvádět"];
const LIFE_PACE: LifePace[] = ["Pomalé", "Vyvážené", "Aktivní", "Velmi aktivní", "Nechci uvádět"];
const SENSITIVE_BOOLEAN_OPTIONS = ["Ano", "Ne", "Nechci uvádet"] as const;
const SENSITIVE_FIELD_INFO_TEXT =
  "Dobrovolný citlivý údaj. Nemusíš jej uvádet a mužeš jej kdykoli skrýt. Muže být využit pro personalizaci služby a – s tvým souhlasem – i pro cílení obsahu a reklamy.";

/* ----------------------------- */
/*  Helpers                      */
/* ----------------------------- */

function uniq(arr: string[]) {
  return Array.from(new Set(arr.map((x) => x.trim()).filter(Boolean)));
}

function clampInt(n: any, min: number, max: number): number | null {
  if (n === "" || n === null || n === undefined) return null;
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  const t = Math.trunc(v);
  if (t < min || t > max) return null;
  return t;
}

function limitAdd(list: string[], value: string, max: number) {
  const next = uniq([...list, value]);
  if (next.length > max) return { ok: false, next: list };
  return { ok: true, next };
}

function nullableBooleanToChoice(value: boolean | null): string {
  if (value === true) return "Ano";
  if (value === false) return "Ne";
  return "Nechci uvádet";
}

function choiceToNullableBoolean(value: string): boolean | null {
  if (value === "Ano") return true;
  if (value === "Ne") return false;
  return null;
}

function removeItem(list: string[], value: string) {
  return list.filter((x) => x !== value);
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/* ----------------------------- */
/*  UI: privacy icon toggle      */
/* ----------------------------- */

function PrivacyIconToggle({
  hidden,
  setHidden,
  disabled,
  titleVisible,
  titleHidden,
}: {
  hidden: boolean;
  setHidden: (v: boolean) => void;
  disabled?: boolean;
  titleVisible?: string; // when hidden=false
  titleHidden?: string; // when hidden=true
}) {
  // hidden=false => visible to others
  const iconSrc = hidden ? "/DoNotShowOthers-icon.png" : "/ShowOthers-icon.png";

  const tooltip =
    disabled
      ? "Toto pole zatím nemá podporu skrytí."
      : hidden
      ? titleHidden ?? "Nezobrazuje se ostatním (klikni pro zobrazení)"
      : titleVisible ?? "Zobrazuje se ostatním (klikni pro skrytí)";

  return (
    <button
      type="button"
      onClick={() => !disabled && setHidden(!hidden)}
      disabled={disabled}
      aria-label={tooltip}
      aria-pressed={hidden}
      title={tooltip}
      className={`inline-flex items-center justify-center rounded-lg border px-2 py-2 transition
        ${disabled ? "cursor-not-allowed opacity-40" : "hover:bg-slate-100"}
        ${hidden ? "border-slate-300 bg-white" : "border-slate-200 bg-white"}
      `}
    >
      <img src={iconSrc} alt="" className={`h-5 w-5 ${disabled ? "opacity-60" : "opacity-100"}`} />
    </button>
  );
}

function SensitiveInfoButton({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={text}
        title={text}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
      >
        ?
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Informace k citlivému údaji"
            className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Citlivý údaj</div>
                <p className="mt-2 text-sm leading-6 text-slate-700">{text}</p>
              </div>

              <CloseButton onClick={() => setOpen(false)} label="Zavřít" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ----------------------------- */
/*  Components                   */
/* ----------------------------- */

/** Searchable chip multi-select with visible selected values and optional custom input */
function SearchableChipSelect({
  title,
  subtitle,
  options,
  selected,
  setSelected,
  max,
  allowCustom,
  customValues,
  setCustomValues,
  hidden,
  setHidden,
}: {
  title: string;
  subtitle?: string;
  options: string[];
  selected: string[];
  setSelected: (v: string[]) => void;
  max: number;
  allowCustom?: boolean;
  customValues?: string[];
  setCustomValues?: (v: string[]) => void;
  hidden: boolean;
  setHidden: (v: boolean) => void;
}) {
  const [customInput, setCustomInput] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const count = (selected?.length ?? 0) + (customValues?.length ?? 0);

  function toggle(value: string) {
    if (selected.includes(value)) {
      setSelected(removeItem(selected, value));
      return;
    }

    if (count >= max) {
      void awAlert(`Mužeš vybrat max. ${max} položek (vcetne vlastních).`);
      return;
    }

    setSelected(uniq([...selected, value]));
  }

  function addCustom() {
    if (!allowCustom || !setCustomValues) return;
    const v = customInput.trim();
    if (!v) return;
    if (selected.includes(v)) {
      setCustomInput("");
      return;
    }

    const current = customValues ?? [];
    if (current.includes(v)) {
      setCustomInput("");
      return;
    }

    if (count >= max) {
      void awAlert(`Mužeš vybrat max. ${max} položek (vcetne vlastních).`);
      return;
    }

    setCustomValues(uniq([...current, v]));
    setCustomInput("");
  }

  function removeCustom(value: string) {
    if (!setCustomValues) return;
    setCustomValues(removeItem(customValues ?? [], value));
  }

  const remaining = Math.max(0, max - count);
  const normalizedSearch = normalizeSearch(search);
  const filteredOptions = options.filter((opt) => normalizeSearch(opt).includes(normalizedSearch));
  const visibleOptions = search.trim() || expanded ? filteredOptions : filteredOptions.slice(0, 16);
  const hasMore = !search.trim() && filteredOptions.length > visibleOptions.length;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">{title}</div>
          {subtitle && <div className="text-xs text-slate-600">{subtitle}</div>}
          <div className="mt-1 text-[11px] text-slate-500">
            {max < 900 ? `Vybráno: ${count}/${max} • Zbývá ${remaining}` : `Vybráno: ${count}`}
          </div>
        </div>

        <PrivacyIconToggle hidden={hidden} setHidden={setHidden} />
      </div>

      {count > 0 ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Vybrané hodnoty</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {selected.map((item) => (
              <button
                key={`selected-${item}`}
                type="button"
                onClick={() => toggle(item)}
                className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                title="Klikni pro odebrání"
              >
                {item} ×
              </button>
            ))}
            {(customValues ?? []).map((item) => (
              <button
                key={`custom-${item}`}
                type="button"
                onClick={() => removeCustom(item)}
                className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
                title="Klikni pro odebrání"
              >
                {item} ×
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {options.length > 8 ? (
        <div className="mt-3">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setExpanded(false);
            }}
            placeholder="Hledat v možnostech…"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {visibleOptions.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                active
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {filteredOptions.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
          Žádná možnost neodpovídá hledání.
        </div>
      ) : null}

      {hasMore ? (
        <AwButton variant="tertiary" size="sm" onClick={() => setExpanded(true)} className="mt-3 px-0 text-xs text-emerald-700 no-underline hover:text-emerald-800">
          Zobrazit dalších {filteredOptions.length - visibleOptions.length} možností
        </AwButton>
      ) : null}

      {allowCustom && setCustomValues && (
        <div className="mt-3">
          <div className="flex gap-2">
            <input
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Pridat vlastní…"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <AwButton onClick={addCustom}>
              Pridat
            </AwButton>
          </div>

          {(customValues ?? []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {(customValues ?? []).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => removeCustom(c)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  title="Klikni pro odebrání"
                >
                  {c} ?
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChoiceGrid({
  options,
  value,
  onChange,
  emptyLabel = "Nevybráno",
}: {
  options: string[];
  value: string;
  onChange: (next: string) => void;
  emptyLabel?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Aktuální volba</div>
        <div className="mt-1 text-sm font-semibold text-slate-900">{value || emptyLabel}</div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange("")}
          className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
            !value
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {emptyLabel}
        </button>

        {options.map((option) => {
          const active = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
                active
                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FieldRow({
  label,
  description,
  hidden,
  setHidden,
  children,
  infoText,
  disablePrivacyToggle,
  privacyTooltipVisible,
  privacyTooltipHidden,
}: {
  label: string;
  description?: string;
  hidden: boolean;
  setHidden: (v: boolean) => void;
  children: React.ReactNode;
  infoText?: string;
  disablePrivacyToggle?: boolean;
  privacyTooltipVisible?: string;
  privacyTooltipHidden?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">{label}</div>
          {description && <div className="text-xs text-slate-600">{description}</div>}
        </div>

        <div className="flex items-center gap-2">
          {infoText ? <SensitiveInfoButton text={infoText} /> : null}

          <PrivacyIconToggle
            hidden={hidden}
            setHidden={setHidden}
            disabled={disablePrivacyToggle}
            titleVisible={privacyTooltipVisible}
            titleHidden={privacyTooltipHidden}
          />
        </div>
      </div>

      <div className="mt-3">{children}</div>
    </div>
  );
}

/* ----------------------------- */
/*  Page                         */
/* ----------------------------- */

export default function ProfilePersonalPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<DbUserProfile | null>(null);

  // A) Identita & Sebevyjádrení
  const [occupation, setOccupation] = useState("");
  const [occupationHidden, setOccupationHidden] = useState(false);

  const [isStudent, setIsStudent] = useState(false);
  const [isStudentHidden, setIsStudentHidden] = useState(false);

  const [educationLevel, setEducationLevel] = useState<string>("");
  const [educationLevelHidden, setEducationLevelHidden] = useState(false);

  const [nativeLanguages, setNativeLanguages] = useState<string[]>([]);
  const [nativeLanguagesHidden, setNativeLanguagesHidden] = useState(false);

  const [otherLanguages, setOtherLanguages] = useState<string[]>([]);
  const [otherLanguagesHidden, setOtherLanguagesHidden] = useState(false);

  const [relationshipStatus, setRelationshipStatus] = useState<string>("");
  const [relationshipStatusHidden, setRelationshipStatusHidden] = useState(false);

  const [motivationText, setMotivationText] = useState("");
  const [motivationTextHidden, setMotivationTextHidden] = useState(false);

  const [heightCm, setHeightCm] = useState<string>("");
  const [heightCmHidden, setHeightCmHidden] = useState(false);

  const [weightKg, setWeightKg] = useState<string>("");
  const [weightKgHidden, setWeightKgHidden] = useState(false);

  // B) Zájmy
  const [aboutMe, setAboutMe] = useState("");
  const [aboutMeHidden, setAboutMeHidden] = useState(false);

  const [primaryInterests, setPrimaryInterests] = useState<string[]>([]);
  const [primaryInterestsHidden, setPrimaryInterestsHidden] = useState(false);

  const [interests, setInterests] = useState<string[]>([]);
  const [interestsCustom, setInterestsCustom] = useState<string[]>([]);
  const [interestsHidden, setInterestsHidden] = useState(false);

  const [lifeGoals, setLifeGoals] = useState<string[]>([]);
  const [lifeGoalsCustom, setLifeGoalsCustom] = useState<string[]>([]);
  const [lifeGoalsHidden, setLifeGoalsHidden] = useState(false);

  const [selfView, setSelfView] = useState<string>("");
  const [selfViewHidden, setSelfViewHidden] = useState(false);

  const [improvementAreas, setImprovementAreas] = useState<string[]>([]);
  const [improvementAreasCustom, setImprovementAreasCustom] = useState<string[]>([]);
  const [improvementAreasHidden, setImprovementAreasHidden] = useState(false);

  // C) Životní styl
  const [activities, setActivities] = useState<string[]>([]);
  const [activitiesCustom, setActivitiesCustom] = useState<string[]>([]);
  const [activitiesHidden, setActivitiesHidden] = useState(false);

  const [dietPreference, setDietPreference] = useState<string>("");
  const [dietPreferenceHidden, setDietPreferenceHidden] = useState(false);

  const [alcoholUse, setAlcoholUse] = useState<string>("");
  const [alcoholUseHidden, setAlcoholUseHidden] = useState(false);

  const [smoking, setSmoking] = useState<string>("");
  const [smokingHidden, setSmokingHidden] = useState(false);

  const [drugLight, setDrugLight] = useState<boolean | null>(null);
  const [drugHard, setDrugHard] = useState<boolean | null>(null);
  const [drugsHidden, setDrugsHidden] = useState(false);

  const [mindset, setMindset] = useState<string>("");
  const [mindsetHidden, setMindsetHidden] = useState(false);

  const [lifePace, setLifePace] = useState<string>("");
  const [lifePaceHidden, setLifePaceHidden] = useState(false);
  const [personalizationConsentChecked, setPersonalizationConsentChecked] = useState(false);
  const [personalizationConsentAt, setPersonalizationConsentAt] = useState<string | null>(null);

  const canSave = useMemo(
    () => !loading && !saving && personalizationConsentChecked,
    [loading, personalizationConsentChecked, saving]
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const p: any = await getMyProfile();
        if (cancelled) return;

        setProfile(p);

        // A
        setOccupation((p.occupation ?? "") as string);
        setOccupationHidden(Boolean(p.occupation_hidden ?? false));

        setIsStudent(Boolean(p.is_student ?? false));
        setIsStudentHidden(Boolean(p.is_student_hidden ?? false));

        setEducationLevel((p.education_level ?? "") as string);
        setEducationLevelHidden(Boolean(p.education_level_hidden ?? false));

        setNativeLanguages(Array.isArray(p.native_languages) ? (p.native_languages as string[]) : []);
        setNativeLanguagesHidden(Boolean(p.native_languages_hidden ?? false));

        setOtherLanguages(Array.isArray(p.other_languages) ? (p.other_languages as string[]) : []);
        setOtherLanguagesHidden(Boolean(p.other_languages_hidden ?? false));

        setRelationshipStatus((p.relationship_status ?? "") as string);
        setRelationshipStatusHidden(Boolean(p.relationship_status_hidden ?? false));

        setMotivationText((p.motivation_text ?? "") as string);
        setMotivationTextHidden(Boolean(p.motivation_text_hidden ?? false));

        setHeightCm(p.height_cm !== null && p.height_cm !== undefined ? String(p.height_cm) : "");
        setHeightCmHidden(Boolean(p.height_cm_hidden ?? false));

        setWeightKg(p.weight_kg !== null && p.weight_kg !== undefined ? String(p.weight_kg) : "");
        setWeightKgHidden(Boolean(p.weight_kg_hidden ?? false));

        // B
        setAboutMe((p.about_me ?? "") as string);
        setAboutMeHidden(Boolean(p.about_me_hidden ?? false));

        setPrimaryInterests(Array.isArray(p.primary_interests) ? (p.primary_interests as string[]) : []);
        setPrimaryInterestsHidden(Boolean(p.primary_interests_hidden ?? false));

        setInterests(Array.isArray(p.interests) ? (p.interests as string[]) : []);
        setInterestsCustom(Array.isArray(p.interests_custom) ? (p.interests_custom as string[]) : []);
        setInterestsHidden(Boolean(p.interests_hidden ?? false));

        setLifeGoals(Array.isArray(p.life_goals) ? (p.life_goals as string[]) : []);
        setLifeGoalsCustom(Array.isArray(p.life_goals_custom) ? (p.life_goals_custom as string[]) : []);
        setLifeGoalsHidden(Boolean(p.life_goals_hidden ?? false));

        setSelfView((p.self_view ?? "") as string);
        setSelfViewHidden(Boolean(p.self_view_hidden ?? false));

        setImprovementAreas(Array.isArray(p.improvement_areas) ? (p.improvement_areas as string[]) : []);
        setImprovementAreasCustom(
          Array.isArray(p.improvement_areas_custom) ? (p.improvement_areas_custom as string[]) : []
        );
        setImprovementAreasHidden(Boolean(p.improvement_areas_hidden ?? false));

        // C
        setActivities(Array.isArray(p.activities) ? (p.activities as string[]) : []);
        setActivitiesCustom(Array.isArray(p.activities_custom) ? (p.activities_custom as string[]) : []);
        setActivitiesHidden(Boolean(p.activities_hidden ?? false));

        setDietPreference((p.diet_preference ?? "") as string);
        setDietPreferenceHidden(Boolean(p.diet_preference_hidden ?? false));

        setAlcoholUse((p.alcohol_use ?? "") as string);
        setAlcoholUseHidden(Boolean(p.alcohol_use_hidden ?? false));

        setSmoking((p.smoking ?? "") as string);
        setSmokingHidden(Boolean(p.smoking_hidden ?? false));

        setDrugLight(p.drug_light === null || p.drug_light === undefined ? null : Boolean(p.drug_light));
        setDrugHard(p.drug_hard === null || p.drug_hard === undefined ? null : Boolean(p.drug_hard));
        setDrugsHidden(Boolean(p.drugs_hidden ?? false));

        setMindset((p.mindset ?? "") as string);
        setMindsetHidden(Boolean(p.mindset_hidden ?? false));

        setLifePace((p.life_pace ?? "") as string);
        setLifePaceHidden(Boolean(p.life_pace_hidden ?? false));
        setPersonalizationConsentChecked(Boolean(p.personalization_ads_consent ?? false));
        setPersonalizationConsentAt((p.personalization_ads_consent_at as string | null) ?? null);
      } catch (e: any) {
        await awAlert(e?.message ?? "Personal profil se nepodarilo nacíst.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    if (!canSave) return;
    if (!personalizationConsentChecked) {
      await awAlert("Pro uložení je potreba zaškrtnout souhlas s využitím údaju pro personalizaci a cílení reklamy.");
      return;
    }

    // Safety validation (UI also enforces)
    if (primaryInterests.length > 3) return void (await awAlert("Primární zájem: max 3."));
    if (interests.length + interestsCustom.length > 5) return void (await awAlert("Zájmy: max 5 (vcetne vlastních)."));
    if (lifeGoals.length + lifeGoalsCustom.length > 5) return void (await awAlert("Životní cíle: max 5 (vcetne vlastních)."));
    if (activities.length + activitiesCustom.length > 5) return void (await awAlert("Pohyb/Sport: max 5 (vcetne vlastních)."));
    if (improvementAreas.length + improvementAreasCustom.length > 5)
      return void (await awAlert("V cem se chci zlepšit: max 5 (vcetne vlastních)."));

    setSaving(true);
    try {
      const consentAtToSave = personalizationConsentAt ?? new Date().toISOString();
      const patch: Record<string, any> = {
        // A
        occupation: occupation.trim() || null,
        occupation_hidden: Boolean(occupationHidden),

        is_student: Boolean(isStudent),
        is_student_hidden: Boolean(isStudentHidden),

        education_level: educationLevel || null,
        education_level_hidden: Boolean(educationLevelHidden),

        native_languages: nativeLanguages.length ? nativeLanguages : null,
        native_languages_hidden: Boolean(nativeLanguagesHidden),

        other_languages: otherLanguages.length ? otherLanguages : null,
        other_languages_hidden: Boolean(otherLanguagesHidden),

        relationship_status: relationshipStatus || null,
        relationship_status_hidden: Boolean(relationshipStatusHidden),

        motivation_text: motivationText.trim() || null,
        motivation_text_hidden: Boolean(motivationTextHidden),

        height_cm: clampInt(heightCm, 50, 250),
        height_cm_hidden: Boolean(heightCmHidden),

        weight_kg: clampInt(weightKg, 20, 300),
        weight_kg_hidden: Boolean(weightKgHidden),

        // B
        about_me: aboutMe.trim() || null,
        about_me_hidden: Boolean(aboutMeHidden),

        primary_interests: primaryInterests.length ? primaryInterests : null,
        primary_interests_hidden: Boolean(primaryInterestsHidden),

        interests: interests.length ? interests : null,
        interests_custom: interestsCustom.length ? interestsCustom : null,
        interests_hidden: Boolean(interestsHidden),

        life_goals: lifeGoals.length ? lifeGoals : null,
        life_goals_custom: lifeGoalsCustom.length ? lifeGoalsCustom : null,
        life_goals_hidden: Boolean(lifeGoalsHidden),

        self_view: selfView || null,
        self_view_hidden: Boolean(selfViewHidden),

        improvement_areas: improvementAreas.length ? improvementAreas : null,
        improvement_areas_custom: improvementAreasCustom.length ? improvementAreasCustom : null,
        improvement_areas_hidden: Boolean(improvementAreasHidden),

        // C
        activities: activities.length ? activities : null,
        activities_custom: activitiesCustom.length ? activitiesCustom : null,
        activities_hidden: Boolean(activitiesHidden),

        diet_preference: dietPreference || null,
        diet_preference_hidden: Boolean(dietPreferenceHidden),

        alcohol_use: alcoholUse || null,
        alcohol_use_hidden: Boolean(alcoholUseHidden),

        smoking: smoking || null,
        smoking_hidden: Boolean(smokingHidden),

        drug_light: drugLight,
        drug_hard: drugHard,
        drugs_hidden: Boolean(drugsHidden),

        mindset: mindset || null,
        mindset_hidden: Boolean(mindsetHidden),

        life_pace: lifePace || null,
        life_pace_hidden: Boolean(lifePaceHidden),

        personalization_ads_consent: true,
        personalization_ads_consent_at: consentAtToSave,
      };

      await updateMyPersonalProfile(patch);
      setPersonalizationConsentAt(consentAtToSave);

      const refreshed: any = await getMyProfile();
      setProfile(refreshed);

      await awAlert("Uloženo.");
    } catch (e: any) {
      await awAlert(e?.message ?? "Uložení se nepodarilo.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="text-slate-600">Nacítám Personal…</div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl bg-white p-5 shadow">
          <div className="text-slate-700">Profil není dostupný.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="rounded-2xl bg-white p-5 shadow">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Více o me</h1>
            <p className="mt-1 text-[0.7rem] italic text-slate-600">
              Vypln jen to, co chceš. Nekteré údaje slouží k personalizaci obsahu a lepšímu fungování komunity.
              Citlivé údaje jsou vždy dobrovolné, mužeš je skrýt nebo kdykoli smazat. Pro analytiku a zlepšování
              služby používáme data pouze v anonymizované podobe.
            </p>
          </div>

          <AwButton variant="primary" onClick={handleSave} disabled={!canSave}>
            {saving ? "Ukládám…" : "Uložit"}
          </AwButton>
        </div>

        {/* A) Identita */}
        <section className="mt-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Identita & Sebevyjádrení</h2>
          <div className="mt-3 grid gap-3">
            <FieldRow
              label="Povolání"
              description="Nepovinné. Mužeš vyplnit i když jsi student."
              hidden={occupationHidden}
              setHidden={setOccupationHidden}
            >
              <input
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                placeholder="Napr. Graficka, programátor, ucitel…"
              />

              {/* Student: value checkbox + privacy icon */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                <label className="flex items-center gap-2 text-sm text-slate-800">
                  <input type="checkbox" checked={isStudent} onChange={(e) => setIsStudent(e.target.checked)} />
                  Student
                </label>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">Zobrazení</span>
                  <PrivacyIconToggle hidden={isStudentHidden} setHidden={setIsStudentHidden} />
                </div>
              </div>
            </FieldRow>

            <FieldRow label="Vzdelání" hidden={educationLevelHidden} setHidden={setEducationLevelHidden}>
              <ChoiceGrid options={EDUCATION_LEVELS} value={educationLevel} onChange={setEducationLevel} emptyLabel="Nechci uvádet / bez výberu" />
            </FieldRow>

            <FieldRow label="Rodný jazyk(y)" hidden={nativeLanguagesHidden} setHidden={setNativeLanguagesHidden}>
              <SearchableChipSelect
                title="Rodný jazyk"
                subtitle="Zacni psát a rychle najdeš jazyk v seznamu."
                options={LANGUAGES}
                selected={nativeLanguages}
                setSelected={setNativeLanguages}
                max={999}
                hidden={nativeLanguagesHidden}
                setHidden={setNativeLanguagesHidden}
              />
            </FieldRow>

            <FieldRow label="Další jazyky" hidden={otherLanguagesHidden} setHidden={setOtherLanguagesHidden}>
              <SearchableChipSelect
                title="Další jazyky"
                subtitle="Kliknutím pridáš nebo odebereš jazyk. Hledání funguje i bez diakritiky."
                options={LANGUAGES}
                selected={otherLanguages}
                setSelected={setOtherLanguages}
                max={999}
                hidden={otherLanguagesHidden}
                setHidden={setOtherLanguagesHidden}
              />
            </FieldRow>

            <FieldRow label="Vztahový status" hidden={relationshipStatusHidden} setHidden={setRelationshipStatusHidden}>
              <ChoiceGrid options={REL_STATUS} value={relationshipStatus} onChange={setRelationshipStatus} />
            </FieldRow>

            <FieldRow label="Motivacní veta" hidden={motivationTextHidden} setHidden={setMotivationTextHidden}>
              <input
                value={motivationText}
                onChange={(e) => setMotivationText(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                placeholder="Napr. Každý den o krok blíž ??"
              />
            </FieldRow>

            <div className="grid gap-3 sm:grid-cols-2">
              <FieldRow label="Výška (cm)" hidden={heightCmHidden} setHidden={setHeightCmHidden}>
                <input
                  type="number"
                  min={50}
                  max={250}
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  placeholder="Napr. 172"
                />
              </FieldRow>

              <FieldRow label="Váha (kg)" hidden={weightKgHidden} setHidden={setWeightKgHidden}>
                <input
                  type="number"
                  min={20}
                  max={300}
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                  placeholder="Napr. 68"
                />
              </FieldRow>
            </div>
          </div>
        </section>

        {/* B) Zájmy */}
        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Zájmy</h2>

          <div className="mt-3 grid gap-3">
            <FieldRow
              label="Rozšírené „O mne“"
              description="Delší text, který te vystihuje."
              hidden={aboutMeHidden}
              setHidden={setAboutMeHidden}
            >
              <textarea
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                placeholder="Napiš neco o sobe…"
              />
            </FieldRow>

            <SearchableChipSelect
              title="Primární zájem (max 3)"
              subtitle="Základní kategorie pro doporucování obsahu."
              options={PRIMARY_INTERESTS}
              selected={primaryInterests}
              setSelected={setPrimaryInterests}
              max={3}
              allowCustom={false}
              hidden={primaryInterestsHidden}
              setHidden={setPrimaryInterestsHidden}
            />

            <SearchableChipSelect
              title="Zájmy (max 5)"
              subtitle="Vyber z císelníku a prípadne pridej vlastní."
              options={INTERESTS}
              selected={interests}
              setSelected={setInterests}
              max={5}
              allowCustom
              customValues={interestsCustom}
              setCustomValues={setInterestsCustom}
              hidden={interestsHidden}
              setHidden={setInterestsHidden}
            />

            <SearchableChipSelect
              title="Životní cíle (max 5)"
              subtitle="Co chceš ted nejvíc posunout?"
              options={LIFE_GOALS}
              selected={lifeGoals}
              setSelected={setLifeGoals}
              max={5}
              allowCustom
              customValues={lifeGoalsCustom}
              setCustomValues={setLifeGoalsCustom}
              hidden={lifeGoalsHidden}
              setHidden={setLifeGoalsHidden}
            />

            <FieldRow label="Považuji se za" hidden={selfViewHidden} setHidden={setSelfViewHidden}>
              <ChoiceGrid options={SELF_VIEW} value={selfView} onChange={setSelfView} />
            </FieldRow>

            <SearchableChipSelect
              title="V cem se chci zlepšit (max 5)"
              subtitle="Vyber pár oblastí – at to zustane jednoduché."
              options={IMPROVEMENT_AREAS}
              selected={improvementAreas}
              setSelected={setImprovementAreas}
              max={5}
              allowCustom
              customValues={improvementAreasCustom}
              setCustomValues={setImprovementAreasCustom}
              hidden={improvementAreasHidden}
              setHidden={setImprovementAreasHidden}
            />
          </div>
        </section>

        {/* C) Životní styl */}
        <section className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Životní styl</h2>

          <div className="mt-3 grid gap-3">
            <SearchableChipSelect
              title="Pohyb / Sport (max 5)"
              subtitle="Sporty i pohybové aktivity."
              options={ACTIVITIES}
              selected={activities}
              setSelected={setActivities}
              max={5}
              allowCustom
              customValues={activitiesCustom}
              setCustomValues={setActivitiesCustom}
              hidden={activitiesHidden}
              setHidden={setActivitiesHidden}
            />

            <FieldRow label="Stravovací preference" hidden={dietPreferenceHidden} setHidden={setDietPreferenceHidden}>
              <ChoiceGrid options={DIET} value={dietPreference} onChange={setDietPreference} />
            </FieldRow>

            <FieldRow
              label="Alkohol"
              hidden={alcoholUseHidden}
              setHidden={setAlcoholUseHidden}
              infoText={SENSITIVE_FIELD_INFO_TEXT}
            >
              <ChoiceGrid options={ALCOHOL} value={alcoholUse} onChange={setAlcoholUse} />
            </FieldRow>

            <FieldRow
              label="Kourení"
              hidden={smokingHidden}
              setHidden={setSmokingHidden}
              infoText={SENSITIVE_FIELD_INFO_TEXT}
            >
              <ChoiceGrid options={SMOKING} value={smoking} onChange={setSmoking} />
            </FieldRow>

            <FieldRow
              label="Drogy"
              hidden={drugsHidden}
              setHidden={setDrugsHidden}
              infoText={SENSITIVE_FIELD_INFO_TEXT}
            >
              <div className="space-y-4">
                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-800">Lehké drogy</div>
                  <ChoiceGrid
                    options={[...SENSITIVE_BOOLEAN_OPTIONS]}
                    value={nullableBooleanToChoice(drugLight)}
                    onChange={(next) => setDrugLight(choiceToNullableBoolean(next))}
                    emptyLabel="Nevybráno"
                  />
                </div>

                <div>
                  <div className="mb-2 text-sm font-semibold text-slate-800">Tvrdé drogy</div>
                  <ChoiceGrid
                    options={[...SENSITIVE_BOOLEAN_OPTIONS]}
                    value={nullableBooleanToChoice(drugHard)}
                    onChange={(next) => setDrugHard(choiceToNullableBoolean(next))}
                    emptyLabel="Nevybráno"
                  />
                </div>
              </div>
            </FieldRow>

            <FieldRow label="Mindset" hidden={mindsetHidden} setHidden={setMindsetHidden}>
              <ChoiceGrid options={MINDSET} value={mindset} onChange={setMindset} />
            </FieldRow>

            <FieldRow label="Tempo života" hidden={lifePaceHidden} setHidden={setLifePaceHidden}>
              <ChoiceGrid options={LIFE_PACE} value={lifePace} onChange={setLifePace} />
            </FieldRow>
          </div>
        </section>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={personalizationConsentChecked}
              onChange={(e) => setPersonalizationConsentChecked(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="italic">
              Souhlasím s využitím techto údaju pro personalizaci a cílení reklamy. Více informací o zpracování
              osobních údaju najdeš v sekci{" "}
              <Link href="/privacy-terms" className="font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
                Soukromí a podmínky používání služby AgeWinners
              </Link>
              .
            </span>
          </label>

          <AwButton variant="primary" onClick={handleSave} disabled={!canSave}>
            {saving ? "Ukládám…" : "Uložit"}
          </AwButton>
        </div>
      </div>
    </div>
  );
}
