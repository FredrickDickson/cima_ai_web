import { Page } from "@playwright/test";

/**
 * Mocks the ai-chat edge function for both call styles used across the app:
 * - streaming (AIAssistant.tsx, Research.tsx): body has `stream: true`, response
 *   is an OpenAI-style SSE body terminated with `data: [DONE]`.
 * - non-streaming (ContractReview.tsx callAiChat, DraftingStudio.tsx, Documents.tsx):
 *   response is a plain JSON object with a `content` field.
 */
export async function mockAiChat(page: Page, replyText = "This is a mocked AI response for testing purposes.") {
  await page.route("**/functions/v1/ai-chat", async (route) => {
    const postData = safeJson(route.request().postData());
    const streaming = postData?.stream === true;

    if (streaming) {
      const sse = `data: ${JSON.stringify({ choices: [{ delta: { content: replyText } }] })}\n\ndata: [DONE]\n\n`;
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        body: sse,
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ content: replyText }),
      });
    }
  });
}

function safeJson(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function mockContractAnalyze(page: Page) {
  await page.route("**/functions/v1/contract-analyze", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "mock-analysis-id",
        overall_risk_score: 42,
        detected_document_type: "Commercial Contract",
        ai_summary: "This mocked contract has moderate risk. Key clauses reviewed for testing purposes.",
        arbitration_clause_valid: true,
        arbitration_clause_issues: "",
        arbitration_seat: "Accra, Ghana",
        arbitration_institution: "ICC",
        governing_law_found: true,
        governing_law: "Laws of Ghana",
        detected_parties: { party_a_name: "Acme Corp", party_b_name: "Delta Industries" },
        clauses: [],
        missing_clauses: [],
        obligations: { party_a: ["Deliver goods on time"], party_b: ["Pay invoices within 30 days"] },
        recommendations: ["Clarify termination notice period."],
        contract_text: "Mock contract text used for e2e testing.",
      }),
    });
  });
}

export async function mockGenerateDraft(page: Page) {
  await page.route("**/functions/v1/generate-draft", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        content: "# Mocked Draft\n\nThis is mocked generated draft content for e2e testing.",
      }),
    });
  });
}

export async function mockLegalSearch(page: Page) {
  await page.route("**/functions/v1/legal-search", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        sources: [
          {
            source_name: "Mock v. Example Case",
            citation: "[2025] MOCK 1",
            jurisdiction: "Ghana",
            snippet: "Mocked source snippet for e2e testing.",
          },
        ],
        ai_analysis: "This is a mocked legal research analysis for e2e testing purposes.",
        tavily_results: [],
        sources_count: 1,
      }),
    });
  });
}

export async function mockCaseCitator(page: Page) {
  await page.route("**/functions/v1/case-citator", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ results: [] }),
    });
  });
}

export async function mockEmbedDocument(page: Page) {
  await page.route("**/functions/v1/embed-document", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
}

/** Mocks every AI edge function the app calls — use in beforeEach for pages with heavy AI usage. */
export async function mockAllAI(page: Page) {
  await mockAiChat(page);
  await mockContractAnalyze(page);
  await mockGenerateDraft(page);
  await mockLegalSearch(page);
  await mockCaseCitator(page);
  await mockEmbedDocument(page);
}
