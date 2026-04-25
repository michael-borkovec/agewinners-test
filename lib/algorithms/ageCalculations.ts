/**
 * File: lib/algorithms/ageCalculations.ts
 * Description:
 *   Výpočty kolem věku pro AgeGuesses dle finální specifikace.
 *
 *   - real_age se počítá k okamžiku pořízení fotky (typicky images.created_at),
 *     ne "dnešní věk".
 *   - Výsledek je celé číslo (floor na celé roky).
 *   - Přidány helpery pro clamp a maxErr normalizaci.
 */

import dayjs from "dayjs";

/** Specifikační limity pro guess_age (backend musí clampovat). */
export const MIN_AGE = 16;
export const MAX_AGE = 116;

/**
 * Bezpečný clamp věku do rozsahu [MIN_AGE, MAX_AGE].
 * Pozn.: Backend je "source of truth", ale UI může být konzistentní.
 */
export function clampAge(age: number): number {
  if (!Number.isFinite(age)) return MIN_AGE;
  return Math.min(MAX_AGE, Math.max(MIN_AGE, Math.round(age)));
}

/**
 * maxErr(real_age) = max(real_age − MIN_AGE, MAX_AGE − real_age)
 * Používá se pro normalizaci chyby (odstranění zvýhodnění okrajů).
 */
export function maxErrForRealAge(realAge: number): number {
  // Pokud by realAge byl mimo rozsah, pořád spočítáme maxErr smysluplně.
  const left = realAge - MIN_AGE;
  const right = MAX_AGE - realAge;
  return Math.max(left, right);
}

/**
 * Vypočítá real_age v letech na základě data narození a timestampu fotky.
 *
 * Vstupy:
 * - dateOfBirth: 'YYYY-MM-DD' (z user_profiles.date_of_birth)
 * - takenAt: ISO string timestamp (typicky images.created_at),
 *            nebo 'YYYY-MM-DD', nebo null
 *
 * Vrací:
 * - number (věk v letech, celé roky) nebo null, pokud vstupy nejsou použitelné.
 */
export function calculateRealAgeYears(
  dateOfBirth: string,
  takenAt: string | null
): number | null {
  if (!dateOfBirth || !takenAt) return null;

  // DOB je typicky bez času, takenAt může být ISO (s časem) – dayjs zvládne oboje.
  const dob = dayjs(dateOfBirth);
  const taken = dayjs(takenAt);

  if (!dob.isValid() || !taken.isValid()) return null;
  if (taken.isBefore(dob)) return null;

  // Přesný výpočet "celých let" k okamžiku fotky.
  // diff("year") dává floored počet let mezi dob a taken.
  const age = taken.diff(dob, "year");

  // Ochrana proti extrémům / nesmyslům (neclampujeme real_age,
  // jen vracíme číslo; clamp je určený pro guess_age).
  if (!Number.isFinite(age) || age < 0) return null;

  return age;
}
