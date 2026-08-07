// Shared jurisdiction label vocabulary for the Legal Library. Keys mirror the
// lowercase country-name values already stored in `legal_library_documents.jurisdiction`
// and used as keys in `supabase/functions/_shared/laws-africa.ts`'s COUNTRY_MAP,
// so labels stay consistent with how the rest of the app (Laws.Africa lookups,
// jurisdiction detection) already identifies countries.

export const JURISDICTION_LABELS: Record<string, string> = {
  ghana: "Ghana",
  international: "International",
  kenya: "Kenya",
  "south africa": "South Africa",
  nigeria: "Nigeria",
  uganda: "Uganda",
  tanzania: "Tanzania",
  zambia: "Zambia",
  zimbabwe: "Zimbabwe",
  malawi: "Malawi",
  namibia: "Namibia",
  botswana: "Botswana",
  rwanda: "Rwanda",
  mauritius: "Mauritius",
  eswatini: "Eswatini",
  swaziland: "Eswatini",
  lesotho: "Lesotho",
  mozambique: "Mozambique",
  ethiopia: "Ethiopia",
  senegal: "Senegal",
  cameroon: "Cameroon",
  angola: "Angola",
};

/** Falls back to a capitalized version of the raw value for jurisdictions not yet in the map above. */
export function jurisdictionLabel(value: string | null | undefined): string {
  if (!value) return "Unspecified";
  const known = JURISDICTION_LABELS[value.toLowerCase()];
  if (known) return known;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
