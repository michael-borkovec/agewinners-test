/**
 * File: lib/profileSchema.ts
 * Description:
 *   Konfigurační schema sekcí a polí uživatelského profilu.
 *
 * ✅ Updated:
 * - Přesun sekce "Moje fotky & věkové tipy" hned pod "Sítě & kontakt".
 */

import { ProfileField, ProfileSectionId } from "@/types/profile";

export const PROFILE_SECTIONS: { id: ProfileSectionId; label: string }[] = [
  { id: "basic", label: "Základní profil" },
  { id: "personal", label: "Osobní & lifestyle" },
  { id: "social", label: "Sítě & kontakt" },

  // ✅ moved here (right under social)
  { id: "photos", label: "Moje fotky & věkové tipy" },

  { id: "stats", label: "Můj vývoj" },
  { id: "privacy", label: "Soukromí & personalizace" },
  { id: "security", label: "Bezpečnost" },
];

export const PROFILE_FIELDS: ProfileField[] = [
  // B. Základní volitelné údaje po přihlášení (basic)
  {
    id: "displayName",
    section: "basic",
    label: "Zobrazované jméno",
    type: "text",
    required: true,
  },
  {
    id: "username",
    section: "basic",
    label: "Uživatelské jméno (@handle)",
    type: "text",
    required: true,
    helperText: "Např. @agewinners_anna",
  },
  {
    id: "avatarUrl",
    section: "basic",
    label: "Avatar (URL obrázku – zatím technický)",
    type: "text",
    helperText: "Později nahradíme uploadem souboru.",
  },
  {
    id: "bio",
    section: "basic",
    label: "Krátké bio",
    type: "textarea",
    helperText: "Napiš pár vět o sobě (max 200 znaků).",
  },
  {
    id: "location",
    section: "basic",
    label: "Lokalita",
    type: "text",
    helperText: "Např. Praha, Česká republika.",
  },
  {
    id: "websiteUrl",
    section: "basic",
    label: "Web / odkaz",
    type: "text",
  },
  {
    id: "phone",
    section: "basic",
    label: "Telefon",
    type: "text",
    helperText: "Pro bezpečnost účtu (nebude veřejný).",
  },

  // C. Další osobní údaje + AgeWinners lifestyle (personal)
  {
    id: "occupation",
    section: "personal",
    label: "Povolání / čím se zabývám",
    type: "text",
  },
  {
    id: "education",
    section: "personal",
    label: "Vzdělání",
    type: "text",
  },
  {
    id: "languages",
    section: "personal",
    label: "Jazyky",
    type: "text",
    helperText: "Např. čeština, angličtina.",
  },
  {
    id: "relationshipStatus",
    section: "personal",
    label: "Vztahový status",
    type: "select",
    options: [
      { value: "single", label: "Single" },
      { value: "in_relationship", label: "Ve vztahu" },
      { value: "married", label: "V manželství" },
      { value: "complicated", label: "Je to komplikované" },
      { value: "hidden", label: "Nechci uvést" },
    ],
  },
  {
    id: "pronouns",
    section: "personal",
    label: "Oslovení / zájmena",
    type: "text",
    helperText: "Např. ona/ji, on/jeho…",
  },
  {
    id: "interests",
    section: "personal",
    label: "Zájmy",
    type: "multiselect",
    options: [
      { value: "sport", label: "Sport" },
      { value: "travel", label: "Cestování" },
      { value: "music", label: "Hudba" },
      { value: "art", label: "Umění" },
      { value: "food", label: "Jídlo" },
      { value: "books", label: "Knihy" },
    ],
  },
  {
    id: "favoriteActivities",
    section: "personal",
    label: "Oblíbené aktivity",
    type: "multiselect",
    options: [
      { value: "running", label: "Běhání" },
      { value: "gym", label: "Posilovna" },
      { value: "yoga", label: "Jóga" },
      { value: "dancing", label: "Tanec" },
      { value: "walking", label: "Procházky" },
    ],
  },
  {
    id: "dietStyle",
    section: "personal",
    label: "Stravovací styl",
    type: "select",
    options: [
      { value: "none", label: "Nemám specifický styl" },
      { value: "balanced", label: "Vyvážená strava" },
      { value: "vegetarian", label: "Vegetarián" },
      { value: "vegan", label: "Vegan" },
      { value: "lowcarb", label: "Low-carb" },
      { value: "keto", label: "Keto" },
    ],
  },
  {
    id: "focusAreas",
    section: "personal",
    label: "Na co se chci zaměřit",
    type: "multiselect",
    options: [
      { value: "sport", label: "Sport / pohyb" },
      { value: "food", label: "Zdravé jídlo" },
      { value: "beauty", label: "Krása / péče o sebe" },
      { value: "mindset", label: "Mindset / psychická pohoda" },
      { value: "sleep", label: "Spánek a energie" },
    ],
  },
  {
    id: "goals",
    section: "personal",
    label: "Moje cíle",
    type: "multiselect",
    options: [
      { value: "feel_younger", label: "Chci se cítit mladší" },
      { value: "move_better", label: "Chci se lépe hýbat" },
      { value: "eat_better", label: "Chci jíst zdravěji" },
      { value: "look_better", label: "Chci zlepšit vzhled / sebevědomí" },
      { value: "more_energy", label: "Chci mít více energie" },
    ],
  },

  // D. Sociální & kontakt (social)
  { id: "instagram", section: "social", label: "Instagram", type: "text" },
  { id: "facebook", section: "social", label: "Facebook", type: "text" },
  { id: "tiktok", section: "social", label: "TikTok", type: "text" },
  { id: "youtube", section: "social", label: "YouTube", type: "text" },
  { id: "linkedin", section: "social", label: "LinkedIn", type: "text" },
  { id: "twitter", section: "social", label: "X (Twitter)", type: "text" },
  {
    id: "publicEmail",
    section: "social",
    label: "Veřejný e-mail (pro spolupráce)",
    type: "text",
  },

  // E. Statistika – jen pro čtení (zatím jen placeholder ve UI)
];
