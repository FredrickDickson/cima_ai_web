import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const MAX_PDF_PAGES = 300;

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

export async function extractTextFromFile(file: File): Promise<string> {
  await validateFile(file);
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    let totalTextLength = 0;

    const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => ("str" in item ? (item as { str: string }).str : "")).join(" ");
      pages.push(pageText);
      totalTextLength += pageText.trim().length;
    }

    if (totalTextLength < 50 && pdf.numPages > 0) {
      console.log("No embedded text found in PDF, falling back to OCR...");
      const Tesseract = await import("tesseract.js");
      const ocrPages: string[] = [];

      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport }).promise;

        const dataUrl = canvas.toDataURL("image/png");
        const recognize = Tesseract.recognize || (Tesseract as any).default?.recognize;
        const { data: { text } } = await recognize(dataUrl, "eng");
        ocrPages.push(text);
      }
      return ocrPages.join("\n\n");
    }

    return pages.join("\n\n");
  }

  if (name.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.default.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }

  return file.text();
}
