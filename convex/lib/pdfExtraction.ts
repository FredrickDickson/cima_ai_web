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

// getPage() opens a native page (FPDF_LoadPage) and getText() only closes
// the text layer — the library never exposes a page close, and
// doc.destroy() doesn't free open pages. Left open, every page leaks into
// the WASM heap, which outlives the call because the library is cached per
// warm action instance: measured on a synthetic 20,000-page PDF, the heap
// grew ~38MB per 500-page shard (204MB → 1.5GB over 40 shards) versus a
// flat ~170-200MB with pages closed. That growth is what killed shard
// actions mid-extraction partway through a 20,000-page document.
type PageHandle = import("@hyzyla/pdfium").PDFiumPage;
type LibraryHandle = import("@hyzyla/pdfium").PDFiumLibrary;
function closePage(library: LibraryHandle, page: PageHandle) {
  const internals = library as unknown as { module: { _FPDF_ClosePage(pageIdx: number): void } };
  const pageIdx = (page as unknown as { pageIdx: number }).pageIdx;
  if (pageIdx) internals.module._FPDF_ClosePage(pageIdx);
}

// PDFium returns raw UTF-16, which in real-world PDFs can include lone
// surrogates and NULs. Convex rejects strings that aren't valid Unicode, so
// one such page would fail its shard's chunk insert on every retry.
function toStorableText(text: string): string {
  return text
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "�")
    .replace(/\u0000/g, "");
}

/** A PDF to open: its exact byte size and its bytes, streamed in order. */
export interface PdfSource {
  size: number;
  chunks: AsyncIterable<Uint8Array>;
}

interface PdfiumModule {
  HEAPU8: Uint8Array;
  wasmExports: { malloc(size: number): number; free(ptr: number): void };
  _FPDF_LoadMemDocument(ptr: number, size: number, password: number): number;
  _FPDF_GetLastError(): number;
}

const LOAD_ERRORS: Record<number, string> = {
  2: "The file could not be read",
  3: "The file is not a PDF or is corrupted",
  4: "The PDF is password-protected",
  5: "The PDF uses an unsupported security scheme",
};

// Streams the file straight into PDFium's WASM memory instead of using
// library.loadDocument(bytes), which needs the whole file as a JS buffer and
// then copies it — two full copies at once, plus fetch's own buffering. For
// a 146MB, 20,000-page PDF that exceeded the 512MB Convex Node action limit
// as soon as a warm instance (whose WASM heap had already grown to fit one
// copy) processed a second shard. Streaming keeps it to one copy.
async function openDocument(library: LibraryHandle, openSource: () => Promise<PdfSource>) {
  const { PDFiumDocument } = await import("@hyzyla/pdfium");
  const module = (library as unknown as { module: PdfiumModule }).module;
  const source = await openSource();
  const ptr = module.wasmExports.malloc(source.size);
  if (!ptr) throw new Error("Not enough memory to open the PDF");
  try {
    let offset = 0;
    for await (const chunk of source.chunks) {
      if (offset + chunk.length > source.size) throw new Error("The PDF is larger than expected");
      // Re-read HEAPU8 each time: it's replaced whenever WASM memory grows.
      module.HEAPU8.set(chunk, ptr + offset);
      offset += chunk.length;
    }
    if (offset !== source.size) throw new Error("The PDF download was incomplete");
    const documentIdx = module._FPDF_LoadMemDocument(ptr, source.size, 0);
    if (!documentIdx) {
      const code = module._FPDF_GetLastError();
      throw new Error(LOAD_ERRORS[code] ?? `The PDF could not be opened (PDFium error ${code})`);
    }
    // destroy() closes the document and frees ptr.
    return new PDFiumDocument({ module: module as never, documentPtr: ptr, documentIdx });
  } catch (err) {
    module.wasmExports.free(ptr);
    throw err;
  }
}

export interface ExtractedPageRange {
  pageCount: number;
  /** One entry per extracted page, 1-based page number paired with its text. */
  pages: { page: number; text: string }[];
}

/**
 * Extracts text for pages [pageStart, pageEnd] (1-based, inclusive) from the
 * PDF `openSource` streams. Opens the document once per call — safe to call
 * repeatedly for different shards of the same document without the
 * accumulation problem pdf.js has, since PDFium's page objects are
 * explicitly scoped and the whole document is closed at the end of each call.
 */
export async function extractPageRange(
  openSource: () => Promise<PdfSource>,
  pageStart: number,
  pageEnd: number,
): Promise<ExtractedPageRange> {
  const library = await getLibrary();
  const doc = await openDocument(library, openSource);
  try {
    const pageCount = doc.getPageCount();
    const from = Math.max(1, pageStart);
    const to = Math.min(pageCount, pageEnd);
    const pages: { page: number; text: string }[] = [];
    for (let p = from; p <= to; p++) {
      const page = doc.getPage(p - 1); // pdfium is 0-based internally
      try {
        pages.push({ page: p, text: toStorableText(page.getText()) });
      } finally {
        closePage(library, page);
      }
    }
    return { pageCount, pages };
  } finally {
    doc.destroy();
  }
}

/** Just the page count — used once per document to decide sharding, before any extraction. */
export async function getPageCount(openSource: () => Promise<PdfSource>): Promise<number> {
  const library = await getLibrary();
  const doc = await openDocument(library, openSource);
  try {
    return doc.getPageCount();
  } finally {
    doc.destroy();
  }
}
