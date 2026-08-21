import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type Tesseract from "tesseract.js";

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
// Not a real-world document-length limit — every page is processed. This
// only guards against a corrupt/malicious PDF lying about its page count
// (e.g. reporting millions) and hanging the browser tab indefinitely.
const MAX_PDF_PAGES = 20000;
const MAX_OCR_PAGES = 20000;
// A page with less native text than this is treated as scanned/image-only
// and OCR'd individually — evaluated per page, not summed across the whole
// document, so a mostly-scanned PDF with one native-text page (e.g. a cover
// page) still gets OCR'd for the rest instead of being skipped entirely.
const PER_PAGE_OCR_THRESHOLD = 20;
// Tesseract confidence (0-100) below this on a page is surfaced to the
// caller as a quality warning rather than silently accepted.
const LOW_CONFIDENCE_THRESHOLD = 60;
// Guards against a single pathological page (huge embedded image, corrupt
// stream) hanging extraction indefinitely with no way to cancel.
const PAGE_TIMEOUT_MS = 45000;

export interface ExtractedText {
  text: string;
  truncated: boolean;
  extractedPages: number;
  totalPages: number;
  /** Number of pages that went through OCR rather than native text extraction. */
  ocrPages: number;
  /** Average Tesseract confidence (0-100) across OCR'd pages, or null if none were OCR'd. */
  avgConfidence: number | null;
  /** Number of OCR'd pages that scored below LOW_CONFIDENCE_THRESHOLD. */
  lowConfidencePages: number;
}

export interface ExtractProgress {
  page: number;
  totalPages: number;
  phase: "extract" | "ocr";
}

export interface ExtractOptions {
  /** Tesseract language code(s), e.g. "eng" or "eng+fra". Defaults to "eng". */
  ocrLanguage?: string;
  onProgress?: (progress: ExtractProgress) => void;
}

const MAGIC_BYTES: Record<string, number[]> = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  docx: [0x50, 0x4b, 0x03, 0x04], // PK.. (zip container)
};

async function readMagicBytes(file: File, length: number): Promise<number[]> {
  const buf = await file.slice(0, length).arrayBuffer();
  return Array.from(new Uint8Array(buf));
}

function matchesMagicBytes(actual: number[], expected: number[]): boolean {
  return expected.every((byte, i) => actual[i] === byte);
}

/**
 * Rejects files before they're parsed (or uploaded) based on size and actual
 * file content, not just the filename extension / browser-supplied MIME type
 * — both of which are trivially spoofable and previously the only checks
 * performed. Throws a user-facing Error on rejection.
 */
export async function validateFile(file: File): Promise<void> {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB) — the limit is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`);
  }

  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const bytes = await readMagicBytes(file, 4);
    if (!matchesMagicBytes(bytes, MAGIC_BYTES.pdf)) {
      throw new Error("This file has a .pdf name but its contents don't look like a real PDF.");
    }
    return;
  }
  if (name.endsWith(".docx")) {
    const bytes = await readMagicBytes(file, 4);
    if (!matchesMagicBytes(bytes, MAGIC_BYTES.docx)) {
      throw new Error("This file has a .docx name but its contents don't look like a real DOCX.");
    }
    return;
  }
  // .txt and other plain-text fallbacks have no reliable magic-byte
  // signature to check — file size and downstream text decoding are the
  // only practical guards.
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

export async function extractTextFromFile(file: File, options: ExtractOptions = {}): Promise<ExtractedText> {
  await validateFile(file);
  const name = file.name.toLowerCase();
  const ocrLanguage = options.ocrLanguage ?? "eng";

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);

    const pageTexts: string[] = [];
    let failedPages = 0;
    let ocrPageCountUsed = 0;
    let confidenceSum = 0;
    let confidenceCount = 0;
    let lowConfidencePages = 0;

    // Lazily created on first page that needs OCR, then reused for every
    // subsequent page instead of Tesseract.recognize()'s one-shot API, which
    // spins up (and reloads traineddata for) a brand-new worker per call.
    // Held in an object rather than a bare `let` so TS doesn't try (and fail)
    // to narrow its type across the async closure that reassigns it.
    const ocrWorkerBox: { current: Tesseract.Worker | null } = { current: null };

    async function getOcrWorker(): Promise<Tesseract.Worker> {
      if (!ocrWorkerBox.current) {
        const ocrModule = await import("tesseract.js");
        const createWorker = ocrModule.createWorker ?? (ocrModule as unknown as { default: typeof ocrModule }).default.createWorker;
        ocrWorkerBox.current = await createWorker(ocrLanguage);
      }
      return ocrWorkerBox.current;
    }

    try {
      for (let i = 1; i <= pageCount; i++) {
        options.onProgress?.({ page: i, totalPages: pageCount, phase: "extract" });
        try {
          const page = await withTimeout(pdf.getPage(i), PAGE_TIMEOUT_MS, `Page ${i} load`);
          const content = await withTimeout(page.getTextContent(), PAGE_TIMEOUT_MS, `Page ${i} text extraction`);
          const nativeText = content.items.map((item) => ("str" in item ? (item as { str: string }).str : "")).join(" ");

          if (nativeText.trim().length >= PER_PAGE_OCR_THRESHOLD || ocrPageCountUsed >= MAX_OCR_PAGES) {
            pageTexts.push(nativeText);
            continue;
          }

          // This page looks scanned/image-only — OCR it individually rather
          // than deciding OCR for the whole document up front, which used to
          // miss scanned pages entirely whenever any other page in the same
          // PDF had native text.
          options.onProgress?.({ page: i, totalPages: pageCount, phase: "ocr" });
          const worker = await getOcrWorker();
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            pageTexts.push(nativeText);
            continue;
          }
          await page.render({ canvasContext: ctx, viewport }).promise;
          const dataUrl = canvas.toDataURL("image/png");

          const { data } = await withTimeout(worker.recognize(dataUrl), PAGE_TIMEOUT_MS, `Page ${i} OCR`);
          pageTexts.push(data.text);
          ocrPageCountUsed++;
          if (typeof data.confidence === "number") {
            confidenceSum += data.confidence;
            confidenceCount++;
            if (data.confidence < LOW_CONFIDENCE_THRESHOLD) lowConfidencePages++;
          }
        } catch (pageErr) {
          console.error(`Failed to extract page ${i}:`, pageErr);
          failedPages++;
        }
      }
    } finally {
      await ocrWorkerBox.current?.terminate();
    }

    return {
      text: pageTexts.join("\n\n"),
      truncated: pdf.numPages > pageCount || failedPages > 0,
      extractedPages: pageCount - failedPages,
      totalPages: pdf.numPages,
      ocrPages: ocrPageCountUsed,
      avgConfidence: confidenceCount > 0 ? confidenceSum / confidenceCount : null,
      lowConfidencePages,
    };
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.default.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { text: result.value, truncated: false, extractedPages: 1, totalPages: 1, ocrPages: 0, avgConfidence: null, lowConfidencePages: 0 };
  }

  const text = await file.text();
  return { text, truncated: false, extractedPages: 1, totalPages: 1, ocrPages: 0, avgConfidence: null, lowConfidencePages: 0 };
}

/**
 * extractTextFromFile with one automatic retry on failure (including a
 * result with no text at all) — a transient browser hiccup (memory
 * pressure, a backgrounded tab throttling the rAF-driven extraction loop,
 * etc.) on a large document can succeed on a second attempt. A second
 * failure propagates to the caller.
 */
export async function extractTextWithRetry(file: File, options: ExtractOptions = {}): Promise<ExtractedText> {
  async function attempt() {
    const result = await extractTextFromFile(file, options);
    if (!result.text.trim()) throw new Error("EMPTY_EXTRACTION");
    return result;
  }
  try {
    return await attempt();
  } catch {
    return await attempt();
  }
}

export type ExtractionErrorReason = "empty_extraction" | "extraction_exception";

/** Builds the structured failure metadata callers persist/display instead of a generic "processing failed" message. */
export function describeExtractionError(err: unknown): { error_reason: ExtractionErrorReason; error_detail?: string } {
  if (err instanceof Error && err.message === "EMPTY_EXTRACTION") {
    return { error_reason: "empty_extraction" };
  }
  return {
    error_reason: "extraction_exception",
    error_detail: (err instanceof Error ? err.message : String(err)).slice(0, 300),
  };
}
