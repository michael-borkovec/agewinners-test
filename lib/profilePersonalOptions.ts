/**
 * File purpose
 * - Shared option dictionaries for personal-profile fields used across multiple UIs.
 * Main responsibilities
 * - Keep display labels and stored values aligned between profile editing and network search.
 * Related APIs, components, or modules
 * - app/profile/personal/page.tsx
 * - app/network/page.tsx
 * - types/db.ts
 */

import type { DietPreference, RelationshipStatus } from "@/types/db";

export const PERSONAL_RELATIONSHIP_STATUS_OPTIONS: RelationshipStatus[] = [
  "Single",
  "Ve vztahu",
  "Manželství",
  "Rozvedený/á",
  "Je to komplikované",
  "Nechci uvádět",
];

export const PERSONAL_DIET_PREFERENCE_OPTIONS: DietPreference[] = [
  "Běžná",
  "Zdravá",
  "Občasný vegetarián",
  "Vegetarián",
  "Vegan",
  "Pescetarián",
  "Maso, maso a zase maso",
  "Nechci uvádět",
];
