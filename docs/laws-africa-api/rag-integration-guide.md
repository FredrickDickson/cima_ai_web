# Integrating Laws.Africa for AI Legal Grounding (RAG)

This guide explains how to use the **Laws.Africa API** to provide our AI Assistant with authoritative, up-to-date context regarding African legislation and case law. 

By integrating Laws.Africa, we ensure the AI minimizes hallucinations and grounds its advice in verifiable statutes.

---

## 1. Authentication & Setup

To use the API, you need an API key from your Laws.Africa developer account.
Set this key in your Supabase Edge Function environment variables:

```bash
# Set locally for testing
supabase secrets set LAWS_AFRICA_API_KEY="your_api_token"
```

In your requests, authenticate using the `Authorization` header:
```http
Authorization: Token YOUR_API_TOKEN
```

---

## 2. Approach A: Using the Laws.Africa Knowledge Base API (Recommended)

Laws.Africa provides a native AI Retrieval API (`/ai/v1/`) built specifically for RAG (Retrieval-Augmented Generation) pipelines. This saves us from having to scrape, chunk, and embed thousands of laws ourselves.

**Endpoint**: `POST https://api.laws.africa/ai/v1/knowledge-bases/{kb_code}/retrieve`

### Example: Fetching Context for a User Query

When a user asks a question in `Research.tsx`, we can pass that query to the Laws.Africa retrieve endpoint inside our `ai-chat` Edge Function.

```typescript
// supabase/functions/ai-chat/lawsAfrica.ts

interface LawsAfricaRetrieveRequest {
  query: string;
  limit?: number;
}

export async function getLegalContext(query: string, kbCode: string = "za-legislation"): Promise<string> {
  const url = `https://api.laws.africa/ai/v1/knowledge-bases/${kbCode}/retrieve`;
  const token = Deno.env.get("LAWS_AFRICA_API_KEY");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Token ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: query,
      limit: 5 // Return top 5 relevant sections
    })
  });

  if (!response.ok) {
    console.error("Laws.Africa API Error:", await response.text());
    return "";
  }

  const data = await response.json();
  
  // Format the returned nodes into a readable context block for the LLM
  let contextText = "Relevant Legislation Snippets:\n\n";
  
  data.results.forEach((item: any, index: number) => {
    contextText += `[${index + 1}] Source: ${item.source_title} (${item.citation})\n`;
    contextText += `Content: ${item.text}\n\n`;
  });

  return contextText;
}
```

### Injecting into the AI Prompt

Inside `supabase/functions/ai-chat/index.ts`, append the context to the system prompt before calling Claude or OpenAI:

```typescript
const legalContext = await getLegalContext(userMessage);

const systemPrompt = `
You are CIMA AI, an expert legal assistant. 
Use the following official legislation to answer the user's question. 
If the answer is not contained in the context, state that you do not have the specific statute to answer definitively.

${legalContext}
`;
```

---

## 3. Approach B: Custom Vector DB via Content API (v3)

If you need deeper control (e.g., embedding specific contracts against specific Acts), you can use the Content API to download raw legislation, chunk it using our own chunking logic, and store it in the `document_chunks` table.

**Endpoint**: `GET https://api.laws.africa/v3/works.json`

### Example Workflow
1. **Search**: Find the relevant act (e.g., *Companies Act*).
2. **Download**: Fetch the Akoma Ntoso XML or HTML representation.
3. **Parse**: Strip HTML/XML tags.
4. **Embed**: Send the text through OpenAI's `text-embedding-3-small`.
5. **Store**: Save to `legal_library` and `document_chunks` in Supabase.

```typescript
export async function fetchRawAct(frbrUri: string) {
  // e.g., frbrUri = "/akn/za/act/2008/71/eng"
  const url = `https://api.laws.africa/v3${frbrUri}/content.html`;
  
  const response = await fetch(url, {
    headers: { "Authorization": `Token ${Deno.env.get("LAWS_AFRICA_API_KEY")}` }
  });
  
  const html = await response.text();
  // Pass to an HTML-to-text parser, then chunk and embed...
}
```

## 4. Summary of Knowledge Base Codes
*Note: Check the Laws.Africa documentation for exact active KB codes.*
- `za-legislation`: South African National Legislation
- `ke-legislation`: Kenyan National Legislation
- `ng-legislation`: Kenyan National Legislation

Use these codes in the `{kb_code}` path parameter when querying the AI API.
