import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from "docx";
import { saveAs } from "file-saver";

// ---------------------------------------------------------------------------
// Markdown → docx paragraph converter (lightweight, no heavy parser needed)
// ---------------------------------------------------------------------------

interface ParsedBlock {
  type: "heading" | "paragraph" | "list-item" | "hr";
  level?: number; // heading level 1-4 or list nesting
  ordered?: boolean;
  runs: { text: string; bold?: boolean; italic?: boolean }[];
}

function parseInlineFormatting(text: string): { text: string; bold?: boolean; italic?: boolean }[] {
  const runs: { text: string; bold?: boolean; italic?: boolean }[] = [];
  // Match **bold**, *italic*, ***bold+italic***
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      runs.push({ text: text.slice(lastIndex, match.index) });
    }
    if (match[2]) {
      runs.push({ text: match[2], bold: true, italic: true });
    } else if (match[3]) {
      runs.push({ text: match[3], bold: true });
    } else if (match[4]) {
      runs.push({ text: match[4], italic: true });
    }
    lastIndex = re.lastIndex;
  }

  if (lastIndex < text.length) {
    runs.push({ text: text.slice(lastIndex) });
  }
  if (runs.length === 0) runs.push({ text });
  return runs;
}

function markdownToBlocks(md: string): ParsedBlock[] {
  const lines = md.split("\n");
  const blocks: ParsedBlock[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: "hr", runs: [] });
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        runs: parseInlineFormatting(headingMatch[2]),
      });
      continue;
    }

    // Ordered list items
    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      blocks.push({
        type: "list-item",
        ordered: true,
        runs: parseInlineFormatting(olMatch[1]),
      });
      continue;
    }

    // Unordered list items
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      blocks.push({
        type: "list-item",
        ordered: false,
        runs: parseInlineFormatting(ulMatch[1]),
      });
      continue;
    }

    // Regular paragraph
    blocks.push({
      type: "paragraph",
      runs: parseInlineFormatting(trimmed),
    });
  }

  return blocks;
}

const HEADING_MAP: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
};

function blocksToDocxParagraphs(blocks: ParsedBlock[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  for (const block of blocks) {
    if (block.type === "hr") {
      paragraphs.push(
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "999999" } },
          spacing: { before: 200, after: 200 },
        })
      );
      continue;
    }

    const textRuns = block.runs.map(
      (r) =>
        new TextRun({
          text: r.text,
          bold: r.bold,
          italics: r.italic,
          size: block.type === "heading" ? (block.level === 1 ? 32 : block.level === 2 ? 28 : 24) : 22,
          font: "Times New Roman",
        })
    );

    if (block.type === "heading") {
      paragraphs.push(
        new Paragraph({
          children: textRuns,
          heading: HEADING_MAP[block.level ?? 1],
          spacing: { before: 240, after: 120 },
          alignment: block.level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
        })
      );
    } else if (block.type === "list-item") {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun({ text: "    \u2022  ", font: "Times New Roman", size: 22 }), ...textRuns],
          spacing: { before: 40, after: 40 },
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: textRuns,
          spacing: { before: 80, after: 80 },
          alignment: AlignmentType.JUSTIFIED,
        })
      );
    }
  }

  return paragraphs;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function exportToWord(content: string, title: string) {
  const blocks = markdownToBlocks(content);
  const doc = new Document({
    creator: "CIMA AI — Legal Intelligence Platform",
    title,
    styles: {
      default: {
        document: {
          run: { font: "Times New Roman", size: 22 },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: blocksToDocxParagraphs(blocks),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${sanitizeFilename(title)}.docx`);
}

export async function exportToPdf(elementId: string, title: string) {
  // html2pdf.js is a UMD module — dynamic import avoids SSR issues
  const html2pdf = (await import("html2pdf.js")).default;
  const element = document.getElementById(elementId);
  if (!element) return;

  const opt = {
    margin: [15, 15, 15, 15],
    filename: `${sanitizeFilename(title)}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
    pagebreak: { mode: ["avoid-all", "css", "legacy"] },
  };

  await html2pdf().set(opt).from(element).save();
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "_").slice(0, 100);
}
