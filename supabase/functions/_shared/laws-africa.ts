/**
 * Shared Laws.Africa API utilities for CIMA AI Edge Functions.
 *
 * Provides:
 *  - COUNTRY_MAP        — country name → ISO code
 *  - COUNTRY_NAMES      — ISO code → display name
 *  - detectJurisdiction — extracts a country code from free text
 *  - extractLegalQuery  — strips stop words from message history
 *  - fetchLawsAfricaContext  — returns formatted string for system prompts
 *  - fetchLawsAfricaSources  — returns structured Source[] for legal-search RAG
 */

export const COUNTRY_MAP: Record<string, string> = {
  ghana: "gh",
  kenya: "ke",
  "south africa": "za",
  nigeria: "ng",
  uganda: "ug",
  tanzania: "tz",
  zambia: "zm",
  zimbabwe: "zw",
  malawi: "mw",
  namibia: "na",
  botswana: "bw",
  rwanda: "rw",
  mauritius: "mu",
  eswatini: "sz",
  swaziland: "sz",
  lesotho: "ls",
  mozambique: "mz",
  ethiopia: "et",
  senegal: "sn",
  cameroon: "cm",
  angola: "ao",
};

export const COUNTRY_NAMES: Record<string, string> = {
  gh: "Ghana",
  ke: "Kenya",
  za: "South Africa",
  ng: "Nigeria",
  ug: "Uganda",
  tz: "Tanzania",
  zm: "Zambia",
  zw: "Zimbabwe",
  mw: "Malawi",
  na: "Namibia",
  bw: "Botswana",
  rw: "Rwanda",
  mu: "Mauritius",
  sz: "Eswatini",
  ls: "Lesotho",
  mz: "Mozambique",
  et: "Ethiopia",
  sn: "Senegal",
  cm: "Cameroon",
  ao: "Angola",
};

const STOP_WORDS = new Set([
  "what", "when", "where", "which", "who", "whom", "how", "why",
  "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did",
  "will", "would", "could", "should", "may", "might", "shall",
  "the", "a", "an", "and", "or", "but", "if", "in", "on", "at",
  "to", "for", "of", "with", "by", "from", "about", "as",
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "they",
  "it", "this", "that", "these", "those", "please", "can", "tell",
  "explain", "describe", "give", "provide", "need", "want", "like",
  "know", "understand", "help", "find", "get", "make", "use",
]);

/** Detect an African jurisdiction from free text; defaults to "gh". */
export function detectJurisdiction(text: string): string {
  const lower = text.toLowerCase();
  // Longest match wins to avoid "south" matching before "south africa"
  const sorted = Object.keys(COUNTRY_MAP).sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    if (lower.includes(name)) return COUNTRY_MAP[name];
  }
  return "gh";
}

/** Extract key legal terms from the last user message (max 150 chars). */
export function extractLegalQuery(messages: { role: string; content: string }[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      const words = messages[i].content
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));
      return words.join(" ").slice(0, 150);
    }
  }
  return "";
}

export interface LawsAfricaSource {
  id: string;
  source_name: string;
  citation: string;
  source_type: "statute";
  jurisdiction: string;
  content: string;
  url?: string;
}

interface SearchItem {
  frbr_uri?: string;
  url?: string;
  title?: string;
  source_title?: string;
  document?: { title?: string };
  citation?: string;
  snippet?: string;
  content?: string;
  document_content?: string;
  text?: string;
}

async function queryContentApi(
  query: string,
  countryCode: string,
  apiKey: string,
): Promise<LawsAfricaSource[]> {
  const url =
    `https://api.laws.africa/v3/search/?q=${encodeURIComponent(query)}&country=${countryCode}&page_size=5`;
  const res = await fetch(url, { headers: { Authorization: `Token ${apiKey}` } });
  if (!res.ok) return [];
  const data = await res.json();
  return ((data.results ?? []) as SearchItem[]).slice(0, 5).map((item, i) => ({
    id: `laws-africa-v3-${item.frbr_uri ?? item.url ?? i}`,
    source_name: item.title ?? item.document?.title ?? "Laws.Africa",
    citation: item.citation ?? "",
    source_type: "statute" as const,
    jurisdiction: countryCode,
    content: (item.snippet ?? item.content ?? "").slice(0, 1000),
    url: item.url ?? (item.frbr_uri ? `https://api.laws.africa${item.frbr_uri}` : undefined),
  }));
}

async function queryAIApi(
  query: string,
  countryCode: string,
  apiKey: string,
): Promise<LawsAfricaSource[]> {
  const kbCode = `${countryCode}-legislation`;
  const url = `https://api.laws.africa/ai/v1/knowledge-bases/${kbCode}/retrieve`;
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, limit: 3 })
  });

  if (!res.ok) {
    console.error("Laws.Africa AI retrieve failed:", res.status, await res.text());
    return [];
  }
  const data = await res.json();
  console.log(`Laws.Africa AI response for ${kbCode}:`, JSON.stringify(data).slice(0, 500));
  
  const results: SearchItem[] = Array.isArray(data.results)
    ? data.results
    : Array.isArray(data)
    ? data
    : [];
    
  return results.map((item, i) => ({
    id: `laws-africa-ai-${item.frbr_uri ?? item.url ?? i}`,
    source_name: item.source_title ?? item.title ?? item.document?.title ?? "Laws.Africa AI",
    citation: item.citation ?? "",
    source_type: "statute" as const,
    jurisdiction: countryCode,
    content: (item.text ?? item.document_content ?? item.snippet ?? item.content ?? "").slice(0, 1000),
    url: item.url ?? (item.frbr_uri ? `https://api.laws.africa${item.frbr_uri}` : undefined),
  }));
}

/**
 * Fetch Laws.Africa sources as a structured array (for legal-search RAG pipeline).
 */
export async function fetchLawsAfricaSources(
  query: string,
  apiKey: string,
  jurisdiction = "gh",
): Promise<LawsAfricaSource[]> {
  if (!apiKey || !query) return [];
  try {
    const [v3, ai] = await Promise.allSettled([
      queryContentApi(query, jurisdiction, apiKey),
      queryAIApi(query, jurisdiction, apiKey),
    ]);
    const v3Results = v3.status === "fulfilled" ? v3.value : [];
    const aiResults = ai.status === "fulfilled" ? ai.value : [];

    // Deduplicate by id
    const seen = new Set<string>();
    const merged: LawsAfricaSource[] = [];
    for (const s of [...v3Results, ...aiResults]) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        merged.push(s);
      }
    }
    return merged;
  } catch {
    return [];
  }
}

/**
 * Fetch Laws.Africa context as a formatted string (for system prompts).
 */
export async function fetchLawsAfricaContext(
  query: string,
  apiKey: string,
  jurisdiction = "gh",
): Promise<string> {
  const sources = await fetchLawsAfricaSources(query, apiKey, jurisdiction);
  if (sources.length === 0) return "";

  const countryName = COUNTRY_NAMES[jurisdiction] ?? jurisdiction.toUpperCase();
  const entries = sources.map((s, i) => {
    const header = `[LA${i + 1}] ${s.source_name}${s.citation ? ` (${s.citation})` : ""}`;
    const ref = s.url ? `\nSource: ${s.url}` : "";
    return `${header}${ref}\n${s.content}`;
  });

  return `\n\n--- Laws.Africa Legal Sources (${countryName}) ---\n${entries.join("\n\n")}`;
}
