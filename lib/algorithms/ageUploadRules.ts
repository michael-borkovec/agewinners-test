/**
 * File: lib/algorithms/ageUploadRules.ts
 * Description:
 *   Validace pravidel pro upload fotek (images.taken_at) v AgeWinners.
 *
 * Pravidla:
 * 1) takenAt je povinné (YYYY-MM-DD)
 * 2) takenAt nesmí být v budoucnosti
 * 3) takenAt nesmí být starší než 5 let (max 5 let zpět)
 * 4) Pokud je uživateli DNES <= 21 let, nesmí uploadovat fotku,
 *    kde by skutečný věk na fotce (real_age) byl < 16.
 *
 * Poznámky:
 * - Věk počítáme v celých letech (floor).
 * - takenAt bereme jako datum pořízení fotky, ne datum uploadu.
 */

import { calculateRealAgeYears, MIN_AGE } from "@/lib/algorithms/ageCalculations";

export type UploadRulesValidationOk = { ok: true };
export type UploadRulesValidationFail = { ok: false; message: string };
export type UploadRulesValidationResult = UploadRulesValidationOk | UploadRulesValidationFail;

/**
 * Vstupy validace.
 * - dateOfBirth: 'YYYY-MM-DD' z user_profiles.date_of_birth
 * - takenAt: 'YYYY-MM-DD' z date inputu (images.taken_at)
 */
export type ValidateTakenAtAndAgeRulesParams = {
  dateOfBirth: string | null;
  takenAt: string | null;
};

/**
 * Validuje takenAt a věkové podmínky pro upload.
 */
export function validateTakenAtAndAgeRules(
  params: ValidateTakenAtAndAgeRulesParams
): UploadRulesValidationResult {
  const { dateOfBirth, takenAt } = params;

  if (!dateOfBirth) {
    return { ok: false, message: "Chybí datum narození v profilu (date_of_birth)." };
  }

  if (!takenAt) {
    return { ok: false, message: "Datum pořízení fotky je povinné." };
  }

  // --- parse dates ---
  const taken = new Date(takenAt);
  if (Number.isNaN(taken.getTime())) {
    return { ok: false, message: "Neplatné datum pořízení fotky." };
  }

  const today = new Date();
  // normalizace na půlnoc kvůli porovnání "date"
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const takenDate = new Date(taken.getFullYear(), taken.getMonth(), taken.getDate());

  // --- rules: not in future ---
  if (takenDate > todayDate) {
    return { ok: false, message: "Datum pořízení fotky nemůže být v budoucnosti." };
  }

  // --- rules: max 5 years back ---
  const minAllowed = new Date(todayDate);
  minAllowed.setFullYear(minAllowed.getFullYear() - 5);

  if (takenDate < minAllowed) {
    return { ok: false, message: "Fotka nesmí být starší než 5 let." };
  }

  // --- age today (user current age) ---
  const todayIso = todayDate.toISOString().slice(0, 10); // YYYY-MM-DD
  const userCurrentAge = calculateRealAgeYears(dateOfBirth, todayIso);

  if (userCurrentAge === null) {
    return { ok: false, message: "Nešlo spočítat věk uživatele (zkontroluj datum narození)." };
  }

  // --- real age at photo ---
  const realAgeAtPhoto = calculateRealAgeYears(dateOfBirth, takenAt);

  if (realAgeAtPhoto === null) {
    return { ok: false, message: "Nešlo spočítat skutečný věk na fotce." };
  }

  // --- extra rule for young users ---
  if (userCurrentAge <= 21 && realAgeAtPhoto < MIN_AGE) {
    return {
      ok: false,
      message: "U uživatelů do 21 let nelze nahrát fotku, kde je skutečný věk méně než 16 let.",
    };
  }

  return { ok: true };
}
