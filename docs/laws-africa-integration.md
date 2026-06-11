# Laws.Africa API — Developer Reference Guide

## Overview

CIMA AI uses the Laws.Africa API to ground AI responses in real African legislation. When a user asks a legal question, the system fetches relevant statutes from Laws.Africa and injects them into the AI's context before generating a response. This ensures the AI cites actual law rather than hallucinating provisions.

The integration spans three Supabase Edge Functions:

| Edge Function | How Laws.Africa is used |
|---|---|
| `ai-chat` | Appended to system prompt as `--- Laws.Africa Legal Sources ---` block |
| `legal-search` | Prepended as `Primary Legislation` section in the RAG synthesis prompt |
| `contract-analyze` | Appended as `Applicable legislation to reference` in the analysis prompt |

All shared logic lives in a single module:
```
supabase/functions/_shared/laws-africa.ts
```

---

## API Credentials

| Item | Detail |
|---|---|
| **Auth method** | Token-based: `Authorization: Token <YOUR_TOKEN>` |
| **Get a token** | Sign up at https://edit.laws.africa/accounts/login/ then visit https://edit.laws.africa/accounts/profile/api/ |
| **Supabase secret name** | `LAWS_AFRICA_API_KEY` |

Set the secret in Supabase:
```bash
supabase secrets set LAWS_AFRICA_API_KEY=your_token_here
```

---

## API Endpoints Used

### 1. Content API — Full-text Search
```
GET https://api.laws.africa/v3/search/
    ?q={query}
    &country={country_code}
    &page_size=5
Authorization: Token {token}
```
Returns legislation matching the search query for a given country. Used to find acts and regulations relevant to the user's question.

**Example:**
```
GET https://api.laws.africa/v3/search/?q=enforcement+arbitral+awards&country=gh&page_size=5
```

**Response shape:**
```json
{
  "count": 12,
  "next": "https://api.laws.africa/v3/search/?page=2&...",
  "previous": null,
  "results": [
    {
      "title": "Alternative Dispute Resolution Act, 2010",
      "citation": "Act 798",
      "frbr_uri": "/akn/gh/act/2010/798",
      "url": "https://api.laws.africa/v3/akn/gh/act/2010/798.json",
      "snippet": "An Act to provide for arbitration, mediation...",
      "content": "..."
    }
  ]
}
```

---

### 2. AI API — Semantic Knowledge Base Search
```
GET https://api.laws.africa/ai/v1/knowledge-bases/{country_code}/search/
    ?q={query}
Authorization: Token {token}
```
Purpose-built endpoint for feeding AI context. Uses semantic (vector) search rather than keyword matching — better at finding conceptually related legislation even when exact terms differ.

**Example:**
```
GET https://api.laws.africa/ai/v1/knowledge-bases/gh/search/?q=setting+aside+arbitral+award
```

**Response shape:**
```json
{
  "results": [
    {
      "title": "Alternative Dispute Resolution Act, 2010",
      "frbr_uri": "/akn/gh/act/2010/798",
      "text": "A party may apply to the High Court to set aside an arbitral award...",
      "citation": "Act 798"
    }
  ]
}
```

> Both APIs are called in **parallel** via `Promise.allSettled`. Results are merged and deduplicated by `frbr_uri`.

---

## Supported Jurisdictions

The country map is defined in `_shared/laws-africa.ts` and covers:

| Country | Code | Country | Code |
|---------|------|---------|------|
| Ghana | `gh` | Malawi | `mw` |
| Kenya | `ke` | Namibia | `na` |
| South Africa | `za` | Botswana | `bw` |
| Nigeria | `ng` | Rwanda | `rw` |
| Uganda | `ug` | Mauritius | `mu` |
| Tanzania | `tz` | Eswatini | `sz` |
| Zambia | `zm` | Lesotho | `ls` |
| Zimbabwe | `zw` | Mozambique | `mz` |
| Ethiopia | `et` | Senegal | `sn` |
| Cameroon | `cm` | Angola | `ao` |

Default jurisdiction when none is detected: **Ghana (`gh`)**.

---

## Shared Module Reference

**File:** `supabase/functions/_shared/laws-africa.ts`

### `detectJurisdiction(text: string): string`
Scans free text for any country name and returns its ISO code. Uses longest-match-first to correctly handle "South Africa" before "Africa".

```typescript
detectJurisdiction("What are enforcement rights under Kenyan law?")
// → "ke"

detectJurisdiction("Tell me about contract law")
// → "gh"  (default)
```

---

### `extractLegalQuery(messages: Message[]): string`
Takes the last user message, strips common English stop words, and returns up to 150 chars of key legal terms. Produces cleaner search queries than raw message text.

```typescript
extractLegalQuery([
  { role: "user", content: "What are the grounds for setting aside an arbitral award in Ghana?" }
])
// → "grounds setting aside arbitral award Ghana"
```

---

### `fetchLawsAfricaSources(query, apiKey, jurisdiction): Promise<LawsAfricaSource[]>`
Calls both the Content API and AI API in parallel, merges results, deduplicates by ID, and returns a structured array. Use this in the **legal-search** RAG pipeline where you need typed objects.

```typescript
const sources = await fetchLawsAfricaSources(
  "enforcement arbitral award",
  Deno.env.get("LAWS_AFRICA_API_KEY"),
  "gh"
);
// Returns LawsAfricaSource[] with id, source_name, citation, content, url
```

---

### `fetchLawsAfricaContext(query, apiKey, jurisdiction): Promise<string>`
Calls `fetchLawsAfricaSources` internally and formats results as a string block ready to inject into a system prompt. Use this in **ai-chat** and **contract-analyze**.

```typescript
const context = await fetchLawsAfricaContext("arbitration enforcement", apiKey, "ke");
// Returns:
// "\n\n--- Laws.Africa Legal Sources (Kenya) ---\n[LA1] Arbitration Act (No. 4 of 1995)\nSource: https://...\n..."
```

---

### `LawsAfricaSource` interface

```typescript
interface LawsAfricaSource {
  id: string;           // "laws-africa-v3-/akn/gh/act/2010/798" or "laws-africa-ai-..."
  source_name: string;  // Human-readable title
  citation: string;     // e.g. "Act 798" or "No. 4 of 1995"
  source_type: "statute";
  jurisdiction: string; // ISO code e.g. "gh"
  content: string;      // Snippet, max 1000 chars
  url?: string;         // Direct link to the legislation on Laws.Africa
}
```

---

## How Context Is Injected Per Function

### `ai-chat`
```
[System Prompt]
You are CIMA AI...
[Context mode instructions]

--- Laws.Africa Legal Sources (Ghana) ---
[LA1] Alternative Dispute Resolution Act, 2010 (Act 798)
Source: https://api.laws.africa/v3/akn/gh/act/2010/798.json
An Act to provide for arbitration...

[LA2] ...
```
Jurisdiction is auto-detected from the user's last message. If the user mentions "Kenya", Kenya's laws are fetched.

---

### `legal-search`
Laws.Africa sources are fetched **first** and placed in a dedicated `Primary Legislation` block at the top of the synthesis prompt, guaranteeing they appear in the AI's context regardless of how many other sources (vector search, CourtListener) are found.

```
Primary Legislation (Laws.Africa):
[L1] Alternative Dispute Resolution Act, 2010 (Act 798)
Source: https://...
An Act to provide for arbitration...

Additional Sources:
[1] Document: uploaded-brief.pdf
...

Query: What are the enforcement grounds under the Ghana ADR Act?
Jurisdiction: ghana
```

---

### `contract-analyze`
The Laws.Africa query is constructed from the contract's industry type and jurisdiction:
```typescript
const lawsQuery = `contract ${industry_type} law ${jurisdiction}`;
// e.g. "contract employment law kenya"
```
Results are appended to the analysis prompt as:
```
Applicable legislation to reference:
--- Laws.Africa Legal Sources (Kenya) ---
[LA1] Employment Act, 2007...
```

---

## Adding a New Country

1. Open `supabase/functions/_shared/laws-africa.ts`
2. Add to `COUNTRY_MAP`:
   ```typescript
   "côte d'ivoire": "ci",
   ```
3. Add to `COUNTRY_NAMES`:
   ```typescript
   ci: "Côte d'Ivoire",
   ```
4. Verify the country has coverage on Laws.Africa:
   ```bash
   curl -H "Authorization: Token YOUR_TOKEN" https://api.laws.africa/v3/places/
   ```
5. Redeploy all three edge functions.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `LAWS_AFRICA_API_KEY` | Yes | Token from https://edit.laws.africa/accounts/profile/api/ |
| `DEEPSEEK_API_KEY` | Yes | LLM used to synthesize the legislation into answers |
| `SUPABASE_URL` | Yes (auto) | Injected by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (auto) | Injected by Supabase runtime |

---

## Deploying Edge Functions

After any change to the shared module or edge functions:

```bash
supabase functions deploy ai-chat
supabase functions deploy legal-search
supabase functions deploy contract-analyze
```

Or all at once:
```bash
supabase functions deploy ai-chat legal-search contract-analyze
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| AI responds with irrelevant foreign case law | `LAWS_AFRICA_API_KEY` not set | Set the secret in Supabase dashboard → Edge Functions → Secrets |
| AI always uses Ghana laws even when asking about Kenya | Jurisdiction not detected in message | Ensure the country name appears in the message text |
| 401 from Laws.Africa API | Invalid or expired token | Regenerate token at https://edit.laws.africa/accounts/profile/api/ |
| AI API returns empty results | Country not in Laws.Africa Knowledge Base yet | Fall back to Content API only (already handled gracefully) |
| Laws.Africa sources missing from legal-search response | Old deployment still running | Redeploy `legal-search` edge function |

---

## Reference Links

- Laws.Africa Developer Portal: https://developers.laws.africa/
- Content API docs: https://developers.laws.africa/api/about-the-api
- AI API docs: https://developers.laws.africa/ai-api/about-the-api
- Knowledge Bases: https://developers.laws.africa/ai-api/knowledge-bases
- OpenAPI schema (Content): https://api.laws.africa/v3/schema/swagger-ui
- OpenAPI schema (AI): https://api.laws.africa/ai/v1/schema/swagger-ui
- Shared module: `supabase/functions/_shared/laws-africa.ts`
