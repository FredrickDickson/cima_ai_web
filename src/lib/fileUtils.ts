export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    let totalTextLength = 0;

    for (let i = 1; i <= pdf.numPages; i++) {
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
      
      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) { // Limit OCR to 10 pages for perf
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
