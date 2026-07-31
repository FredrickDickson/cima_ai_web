// Content for the first-time-user guided tour. `target` matches the
// `data-tour` attribute on the corresponding Sidebar.tsx nav item; a null
// target means a centered, un-cutout step (welcome/closing).

export interface TourStep {
  target: string | null;
  title: string;
  description: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: null,
    title: "Welcome to CIMA AI",
    description: "Let's take a quick look around — this will only take a minute. You can skip at any time.",
  },
  {
    target: "sidebar-/",
    title: "Dashboard",
    description: "Your home base — active matters, upcoming hearings, recent documents, and quick links to everything below.",
  },
  {
    target: "sidebar-/research",
    title: "Research",
    description: "Semantic search across case law, legislation, and live sources. Type @ in a query to ground the AI's answer in specific cases or documents you tag.",
  },
  {
    target: "sidebar-/cases",
    title: "Cases",
    description: "Manage your arbitration, litigation, and mediation matters — parties, issues, hearings, deadlines, and evidence in one place.",
  },
  {
    target: "sidebar-/documents",
    title: "Documents",
    description: "Upload and organize your own files into folders. Extracted text powers search and AI context across the app.",
  },
  {
    target: "sidebar-/library",
    title: "Legal Library",
    description: "Browse Ghanaian case law and legislation, organized by jurisdiction — with room to grow as we add other countries.",
  },
  {
    target: "sidebar-/drafting",
    title: "Drafting Studio",
    description: "Generate legal documents from a template or a plain-language description, complete with a short-form and plain-English summary.",
  },
  {
    target: "sidebar-/review",
    title: "Document Review",
    description: "AI-powered contract and document review — risk scoring, clause-by-clause analysis, and missing-provision detection.",
  },
  {
    target: "sidebar-/assistant",
    title: "AI Assistant",
    description: "A general-purpose chat for legal questions, drafting help, and case strategy — switch modes to focus it on the task at hand.",
  },
  {
    target: null,
    title: "You're all set",
    description: "That's the whole app. You can replay this tour anytime from the help icon in the top bar.",
  },
];
