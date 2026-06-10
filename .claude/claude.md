# CIMA AI - Project Guidelines & System Instructions

Welcome to the CIMA AI project. This file (`claude.md`) provides context, architectural guidelines, and technical standards for AI assistants (like Claude, Cascade, or Windsurf) working on this codebase.

## 🏗️ Project Overview
This project is a React-based web application tailored for legal professionals (Arbitration, Litigation, Mediation). It features case management, AI-driven legal research, contract review, document drafting, and general AI assistance. 

## 🛠️ Tech Stack & Dependencies
- **Frontend Framework**: React 18, Vite, TypeScript
- **Routing**: `react-router-dom` v6
- **Styling**: Tailwind CSS v3.4 (with `clsx` and `tailwind-merge` for class utility)
- **Icons**: `lucide-react` (primary) and `@tabler/icons-react` (secondary/file attachments)
- **Backend & Auth**: Supabase (`@supabase/supabase-js`)
- **Document Processing**: 
  - `pdfjs-dist` (PDF parsing)
  - `tesseract.js` (OCR for scanned documents)
  - `mammoth` (DOCX parsing)
  - `docx` & `html2pdf.js` (Exporting generated drafts to Word/PDF)
- **Markdown Rendering**: `react-markdown`, `remark-gfm`
- **Testing**: Vitest (Unit), Playwright (E2E)

## 📁 Project Structure
The application follows a standard React structure under `src/`:
- `/components`: Reusable UI elements, layout wrappers (`AppLayout`, `Header`), and domain-specific subcomponents (e.g., `/cases/tabs`).
- `/contexts`: Global state providers (`AuthContext`, `SidebarContext`).
- `/lib`: Utility functions and clients (`supabase.ts`, `fileUtils.ts`, `exportDraft.ts`).
- `/pages`: High-level route views (`Dashboard.tsx`, `ContractReview.tsx`, `AIAssistant.tsx`, `DraftingStudio.tsx`, `Documents.tsx`, `Research.tsx`).
- `/types`: Global TypeScript definitions (e.g., `database.ts` representing Supabase schema).
- `/test`: Unit and integration testing configurations.

## 📝 Coding Standards & Conventions

### 1. TypeScript & Types
- Use strict typing. Interface and Type definitions should be centralized in `src/types/database.ts` for DB entities.
- Avoid `any` where possible, though fallback to `any` for Supabase `Json` types is currently accepted to bypass strict DB type inference issues.
- Prefer explicit optional chaining `?.` and nullish coalescing `??`.

### 2. React Components
- Use Functional Components with React Hooks.
- Define props using explicit TypeScript types.
- Ensure all hooks (`useEffect`, `useMemo`, `useCallback`) correctly specify dependencies.

### 3. Tailwind CSS & Styling
- Stick to utility-first styling with Tailwind CSS.
- **Theme Palette**: The app heavily utilizes a dark theme by default, with navy/slate color mappings (`bg-navy-900`, `bg-navy-800`, `text-slate-300`, `text-gold-400`). 
- **Merging Classes**: Use the custom `cn()` utility (`twMerge(clsx(...))`) to merge conditional Tailwind classes without conflicts.

### 4. Supabase Integration
- Access the Supabase client via `import { supabase } from "../lib/supabase"`.
- Edge Functions are actively used (e.g., `ai-chat`, `embed-document`, `contract-analyze`). When invoking them via `fetch`, remember to pass the Supabase session token in the `Authorization` header.
- Maintain DB schema synchronization in `src/types/database.ts`.

### 5. Document Processing
- Text extraction from uploaded files (`.txt`, `.pdf`, `.docx`) is handled entirely client-side using `fileUtils.ts` (using PDF.js, Tesseract, Mammoth). Do not send raw file binaries to Edge Functions unless explicitly required; send extracted text instead.

## 🚦 Testing Standards
- **Unit Tests**: Add to `src/test/` or alongside components using `.test.tsx` / `.test.ts`. Run via `npm run test`.
- **E2E Tests**: Managed via Playwright.

## 🤖 How AI Should Assist
- **No Unsolicited Refactoring**: Focus exactly on the requested task. Do not rewrite large chunks of adjacent code unless requested.
- **Preserve Imports**: Do not remove existing valid imports. Group standard React imports first, third-party libraries second, and local paths third.
- **Provide Actionable Code**: When giving code, prefer providing the exact updated blocks using correct edit tool procedures.
- **Acknowledge Environment**: This app deals with large documents. Keep memory usage and state size in mind when editing code.
