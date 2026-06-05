/**
 * File purpose
 * - Shared AW direction catalog for upload/edit UI and image metadata.
 * Main responsibilities
 * - Define stable AW direction keys and their suggested existing tag values.
 * - Keep direction labels and tag labels in one place.
 * Related APIs, components, or modules
 * - components/NewPostForm.tsx
 * - components/EditImageModal.tsx
 * - lib/api/images.ts
 */

export const AW_DIRECTIONS = [
  { key: "sport_movement", label: "Sport a pohyb" },
  { key: "cosmetics_style", label: "Kosmetika a styl" },
  { key: "nutrition_lifestyle", label: "Výživa a životní styl" },
  { key: "supplements_superfoods", label: "Doplňky a superpotraviny" },
  { key: "recovery_energy", label: "Regenerace a energie" },
  { key: "aesthetic_care", label: "Estetická péče a zákroky" },
] as const;

export type AwDirectionKey = (typeof AW_DIRECTIONS)[number]["key"];

export const AW_DIRECTION_LABELS: Record<AwDirectionKey, string> = Object.fromEntries(
  AW_DIRECTIONS.map((direction) => [direction.key, direction.label])
) as Record<AwDirectionKey, string>;

export const AW_DIRECTION_TAGS: Record<AwDirectionKey, Array<{ tag: string; label: string }>> = {
  sport_movement: [
    { tag: "sport", label: "Sport" },
    { tag: "fitness", label: "Fitness" },
    { tag: "posilovna", label: "Posilovna" },
    { tag: "beh", label: "Běh" },
    { tag: "kolo", label: "Kolo" },
    { tag: "joga", label: "Jóga" },
    { tag: "plavani", label: "Plavání" },
    { tag: "turistika", label: "Turistika" },
    { tag: "sportovni_promena", label: "Sportovní proměna" },
  ],
  cosmetics_style: [
    { tag: "makeup_stylizace", label: "Make-up / stylizace" },
    { tag: "skincare", label: "Skincare" },
    { tag: "uces", label: "Účes" },
    { tag: "outfit", label: "Outfit" },
    { tag: "fashion", label: "Fashion" },
    { tag: "vousy", label: "Vousy" },
    { tag: "barva_vlasu", label: "Barva vlasů" },
    { tag: "pece_o_plet", label: "Péče o pleť" },
  ],
  nutrition_lifestyle: [
    { tag: "jidelnicek", label: "Jídelníček" },
    { tag: "pitny_rezim", label: "Pitný režim" },
    { tag: "bez_alkoholu", label: "Bez alkoholu" },
    { tag: "spanek", label: "Spánek" },
    { tag: "denni_rezim", label: "Denní režim" },
    { tag: "zdravejsi_volba", label: "Zdravější volba" },
  ],
  supplements_superfoods: [
    { tag: "vitaminy", label: "Vitaminy" },
    { tag: "mineraly", label: "Minerály" },
    { tag: "protein", label: "Protein" },
    { tag: "kolagen", label: "Kolagen" },
    { tag: "superpotraviny", label: "Superpotraviny" },
    { tag: "bylinky", label: "Bylinky" },
  ],
  recovery_energy: [
    { tag: "odpocinek", label: "Odpočinek" },
    { tag: "mene_stresu", label: "Méně stresu" },
    { tag: "sauna", label: "Sauna" },
    { tag: "otuzovani", label: "Otužování" },
    { tag: "wellbeing", label: "Wellbeing" },
    { tag: "dovolena", label: "Dovolená" },
    { tag: "navrat_do_rezimu", label: "Návrat do režimu" },
  ],
  aesthetic_care: [
    { tag: "neinvazivni_pece", label: "Neinvazivní péče" },
    { tag: "odborna_pece", label: "Odborná péče" },
    { tag: "esteticky_zakrok", label: "Estetický zákrok" },
    { tag: "rekonvalescence", label: "Rekonvalescence" },
    { tag: "pred_a_po", label: "Před a po" },
  ],
};

export function normalizeAwDirectionKey(input: unknown): AwDirectionKey | null {
  const value = String(input ?? "").trim();
  return AW_DIRECTIONS.some((direction) => direction.key === value) ? (value as AwDirectionKey) : null;
}

export function normalizeAwDirectionKeys(inputs: unknown[]): AwDirectionKey[] {
  const out: AwDirectionKey[] = [];
  for (const input of inputs) {
    const key = normalizeAwDirectionKey(input);
    if (key && !out.includes(key)) out.push(key);
  }
  return out;
}

export function getAwDirectionTags(directionKeys: unknown[]) {
  const seen = new Set<string>();
  const out: Array<{ tag: string; label: string; directionKey: AwDirectionKey }> = [];

  for (const directionKey of normalizeAwDirectionKeys(directionKeys)) {
    for (const option of AW_DIRECTION_TAGS[directionKey] ?? []) {
      if (seen.has(option.tag)) continue;
      seen.add(option.tag);
      out.push({ ...option, directionKey });
    }
  }

  return out;
}
