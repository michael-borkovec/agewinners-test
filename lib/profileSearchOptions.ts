/**
 * File purpose
 * - Shared search-friendly option dictionaries aligned with personal profile fields.
 * Main responsibilities
 * - Provide preset choices for network search filters.
 * - Keep filter options consistent with personal-profile onboarding and editing.
 * Related APIs, components, or modules
 * - app/profile/personal/page.tsx
 * - app/network/page.tsx
 */

import type { EducationLevel } from "@/types/db";

export const PROFILE_SEARCH_EDUCATION_LEVEL_OPTIONS: EducationLevel[] = [
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

export const PROFILE_SEARCH_NATIVE_LANGUAGE_OPTIONS = [
  "Čeština",
  "Slovenština",
  "Angličtina",
  "Němčina",
  "Francouzština",
  "Španělština",
  "Italština",
  "Polština",
  "Maďarština",
  "Rumunština",
  "Bulharština",
  "Srbština/Chorvatština",
  "Slovinština",
  "Ruština",
  "Ukrajinština",
  "Čínština",
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
  "Turečtina",
  "Řečtina",
] as const;

export const PROFILE_SEARCH_PRIMARY_INTEREST_OPTIONS = [
  "Sport & pohyb",
  "Životní styl & wellbeing",
  "Móda & beauty",
  "Kosmetika & péče",
  "Pozitivní myšlení & mindset",
  "Zdravé stravování",
  "Osobní rozvoj",
  "Zdraví & prevence",
  "Relax & mindfulness",
] as const;

export const PROFILE_SEARCH_LIFE_GOAL_OPTIONS = [
  "Vypadat mladší",
  "Cítit se mladší",
  "Mít lepší fyzičku",
  "Zhubnout",
  "Nabrat svaly",
  "Zlepšit zdraví",
  "Zlepšit spánek",
  "Mít víc energie",
  "Zlepšit jídelníček",
  "Zvládat stres",
  "Najít rovnováhu",
  "Být spokojenější",
  "Být úspěšný ve sportu",
  "Být úspěšný v práci",
  "Změnit práci / najít práci",
  "Naučit se nový skill",
  "Najít partnera",
  "Zlepšit vztahy",
  "Založit rodinu",
  "Založit firmu / podnikat",
  "Víc cestovat",
  "Více času pro sebe",
  "Zlepšit sebevědomí",
  "Být disciplinovanější",
] as const;

export const PROFILE_SEARCH_ACTIVITY_OPTIONS = [
  "Běh",
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
  "Chůze",
  "Turistika",
  "Nordic walking",
  "Domácí cvičení",
  "Protažení / mobilita",
  "Venčení psů",
  "Práce na zahradě",
  "Aktivní dojíždění (pěšky/kolo)",
] as const;
