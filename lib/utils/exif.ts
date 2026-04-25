/**
 * File: lib/utils/exif.ts
 * Description:
 *   Pomocné funkce pro čtení EXIF metadata z obrázků na klientu.
 *   Cíl: pokusně načíst datum pořízení fotky (DateTimeOriginal / CreateDate).
 */

import * as exifr from "exifr";

/**
 * Vrátí datum pořízení z EXIF jako string "YYYY-MM-DD", nebo null.
 *
 * Pozn.: U některých fotek může být EXIF odstraněný (IG/FB export), pak vrátíme null.
 * Pozn.: EXIF datum bývá lokální čas bez timezone – pro naše použití stačí den.
 */
export async function tryGetTakenAtFromExif(file: File): Promise<string | null> {
  try {
    // Vytáhneme jen relevantní tagy, ať je to rychlé
    const data: any = await exifr.parse(file, {
      pick: ["DateTimeOriginal", "CreateDate", "ModifyDate"],
    });

    const dt: Date | undefined =
      data?.DateTimeOriginal ?? data?.CreateDate ?? data?.ModifyDate;

    if (!dt || !(dt instanceof Date) || Number.isNaN(dt.getTime())) {
      return null;
    }

    // Převod na YYYY-MM-DD
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  } catch (e) {
    // EXIF nemusí být, nebo formát není podporovaný
    return null;
  }
}
