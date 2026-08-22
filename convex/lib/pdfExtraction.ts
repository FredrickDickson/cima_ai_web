// Native-speed PDF text extraction via @hyzyla/pdfium (genuine PDFium WASM —
// the engine PyMuPDF/pypdfium2 wrap natively — not a repackaged pdf.js).
// Validated directly against a real 20,000-page document inside a Convex
// Node action: 57s total, linear scaling, vs. pdf.js's multi-hour non-linear
// blowup for the same document (pdf.js accumulates per-page state across a
// document session with no eviction — a known upstream limitation, not a
// calling-code bug). See the large-document ingestion plan for the full
// investigation.
//
// Must run in a "use node" Convex action — the ONNX/WASM runtime needs
// Node's runtime, and pdfium's Node build does `fs.readFileSync` on a
// wasm path that doesn't exist in Convex's bundled artifact (Convex ships
// only the bundled JS, not sibling binary assets). Importing the package's
// own base64-encoded WASM constant (an asset it already publishes at a path
// covered by its `./dist/*` wildcard export) and passing it directly via
// `wasmBinary` sidesteps both that missing-file problem and the *other*
// trap (`/browser/base64`, which is compiled with Emscripten's
// `ENVIRONMENT=web` baked in and throws "not compiled for this environment"
// under Node).

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- not part of the package's public API surface (its own
// internal asset, reached via the `./dist/*` wildcard export); no .d.ts for
// this exact path.
import { PDFIUM_WASM_BASE64 } from "@hyzyla/pdfium/dist/pdfium.wasm.base64-B4io7kt4.js";

let libraryPromise: Promise<import("@hyzyla/pdfium").PDFiumLibrary> | null = null;

async function getLibrary() {
  if (!libraryPromise) {
    const { PDFiumLibrary } = await import("@hyzyla/pdfium");
    const wasmBinary = Buffer.from(PDFIUM_WASM_BASE64 as string, "base64").buffer;
    libraryPromise = PDFiumLibrary.init({ wasmBinary });
  }
  return libraryPromise;
}

export interface ExtractedPageRange {
  pageCount: number;
  /** One entry per extracted page, 1-based page number paired with its text. */
  pages: { page: number; text: string }[];
}

/**
 * Extracts text for pages [pageStart, pageEnd] (1-based, inclusive) from a
 * PDF's raw bytes. Opens the document once per call — safe to call
 * repeatedly for different shards of the same document without the
 * accumulation problem pdf.js has, since PDFium's page objects are
 * explicitly scoped and the whole document is closed at the end of each call.
 */
export async function extractPageRange(
  bytes: Uint8Array,
  pageStart: number,
  pageEnd: number,
): Promise<ExtractedPageRange> {
  const library = await getLibrary();
  const doc = await library.loadDocument(bytes);
  try {
    const pageCount = doc.getPageCount();
    const from = Math.max(1, pageStart);
    const to = Math.min(pageCount, pageEnd);
    const pages: { page: number; text: string }[] = [];
    for (let p = from; p <= to; p++) {
      const page = doc.getPage(p - 1); // pdfium is 0-based internally
      pages.push({ page: p, text: page.getText() });
    }
    return { pageCount, pages };
  } finally {
    doc.destroy();
  }
}

/** Just the page count — used once per document to decide sharding, before any extraction. */
export async function getPageCount(bytes: Uint8Array): Promise<number> {
  const library = await getLibrary();
  const doc = await library.loadDocument(bytes);
  try {
    return doc.getPageCount();
  } finally {
    doc.destroy();
  }
}
