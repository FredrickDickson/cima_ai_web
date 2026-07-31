export type Json = any;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id">>;
      };
      cases: {
        Row: Case;
        Insert: Omit<Case, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Case, "id" | "created_at">>;
      };
      documents: {
        Row: DbDocument;
        Insert: Omit<DbDocument, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<DbDocument, "id" | "created_at">>;
      };
      ai_conversations: {
        Row: AIConversation;
        Insert: Omit<AIConversation, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<AIConversation, "id" | "created_at">>;
      };
      ai_messages: {
        Row: AIMessage;
        Insert: Omit<AIMessage, "id" | "created_at">;
        Update: never;
      };
      research_sessions: {
        Row: ResearchSession;
        Insert: Omit<ResearchSession, "id" | "created_at">;
        Update: never;
      };
      drafts: {
        Row: Draft;
        Insert: Omit<Draft, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Draft, "id" | "created_at">>;
      };
      hearings: {
        Row: Hearing;
        Insert: Omit<Hearing, "id" | "created_at">;
        Update: Partial<Omit<Hearing, "id" | "created_at">>;
      };
      document_chunks: {
        Row: DocumentChunk;
        Insert: Omit<DocumentChunk, "id" | "created_at">;
        Update: Partial<Omit<DocumentChunk, "id" | "created_at">>;
      };
      legal_library: {
        Row: LegalLibraryEntry;
        Insert: Omit<LegalLibraryEntry, "id" | "created_at">;
        Update: Partial<Omit<LegalLibraryEntry, "id" | "created_at">>;
      };
      legal_library_documents: {
        Row: LegalLibraryDocument;
        Insert: Omit<LegalLibraryDocument, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<LegalLibraryDocument, "id" | "created_at">>;
      };
      case_citations: {
        Row: CaseCitation;
        Insert: Omit<CaseCitation, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<CaseCitation, "id" | "created_at">>;
      };
      case_citator_runs: {
        Row: CaseCitatorRun;
        Insert: Omit<CaseCitatorRun, "id" | "created_at">;
        Update: never;
      };
      case_briefs: {
        Row: CaseBrief;
        Insert: Omit<CaseBrief, "generated_at" | "updated_at">;
        Update: Partial<Omit<CaseBrief, "doc_id">>;
      };
      contract_analyses: {
        Row: ContractAnalysis;
        Insert: Omit<ContractAnalysis, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ContractAnalysis, "id" | "created_at">>;
      };
      contract_clause_actions: {
        Row: {
          id: string;
          analysis_id: string;
          clause_name: string;
          action_id: string;
          result_text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          analysis_id: string;
          clause_name: string;
          action_id: string;
          result_text: string;
          created_at?: string;
        };
        Update: Partial<{
          analysis_id: string;
          clause_name: string;
          action_id: string;
          result_text: string;
        }>;
      };
      issues: {
        Row: Issue;
        Insert: Omit<Issue, "id" | "created_at">;
        Update: Partial<Omit<Issue, "id" | "created_at">>;
      };
      deadlines: {
        Row: Deadline;
        Insert: Omit<Deadline, "id">;
        Update: Partial<Omit<Deadline, "id">>;
      };
      evidence: {
        Row: Evidence;
        Insert: Omit<Evidence, "id" | "created_at">;
        Update: Partial<Omit<Evidence, "id" | "created_at">>;
      };
      evidence_issues: {
        Row: EvidenceIssueLink;
        Insert: Omit<EvidenceIssueLink, "id" | "created_at">;
        Update: never;
      };
      case_events: {
        Row: CaseEvent;
        Insert: Omit<CaseEvent, "id" | "created_at">;
        Update: never;
      };
      procedural_orders: {
        Row: ProceduralOrder;
        Insert: Omit<ProceduralOrder, "id">;
        Update: Partial<Omit<ProceduralOrder, "id">>;
      };
      templates: {
        Row: Template;
        Insert: Omit<Template, "id" | "created_at">;
        Update: Partial<Omit<Template, "id" | "created_at">>;
      };
    };
  };
}

export interface Profile {
  id: string;
  full_name: string;
  role: string | null;
  organization: string | null;
  jurisdiction: string | null;
  avatar_url: string | null;
  title: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string;
  user_id: string;
  title: string;
  matter_number: string;
  type: "arbitration" | "litigation" | "mediation";
  status: "active" | "pending" | "closed" | "settled";
  framework: string;
  description: string;
  parties: any;
  next_hearing: string | null;
  created_at: string;
  updated_at: string;
}

export interface Party {
  name: string;
  role: "claimant" | "respondent" | "third_party";
  counsel?: string;
}

export interface DbDocument {
  id: string;
  user_id: string;
  case_id: string | null;
  name: string;
  type: "contract" | "brief" | "award" | "evidence" | "statute" | "document";
  file_path: string;
  storage_path?: string | null;
  folder_id?: string | null;
  file_size: number;
  mime_type: string;
  extracted_text: string;
  ai_summary: string;
  risk_score: number;
  status: "uploading" | "processing" | "ready" | "error";
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface DbDocumentFolder {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface AIConversation {
  id: string;
  user_id: string;
  case_id: string | null;
  title: string;
  context: "general" | "research" | "drafting" | "analysis" | "review" | "arbitration";
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  metadata: any;
  created_at: string;
}

export interface ResearchSession {
  id: string;
  user_id: string;
  case_id: string | null;
  query: string;
  jurisdiction: string;
  results: any;
  ai_analysis: string;
  created_at: string;
}

export type ResearchResult = {
  title: string;
  citation: string;
  type: "case" | "statute" | "rule" | "article";
  jurisdiction: string;
  summary: string;
  relevance: number;
};

export interface Draft {
  id: string;
  user_id: string;
  case_id: string | null;
  title: string;
  template_type: string;
  content: string;
  jurisdiction: string;
  status: "draft" | "finalized";
  created_at: string;
  updated_at: string;
}

export interface Hearing {
  id: string;
  case_id: string;
  user_id: string;
  title: string;
  scheduled_at: string;
  location: string;
  type: "preliminary" | "substantive" | "award" | "procedural";
  notes: string;
  status: "scheduled" | "completed" | "adjourned";
  created_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  user_id: string;
  chunk_index: number;
  content: string;
  embedding: number[] | null;
  created_at: string;
}

export interface LegalLibraryEntry {
  id: string;
  title: string;
  content: string;
  embedding: number[] | null;
  source_type: string;
  jurisdiction: string;
  citation: string;
  created_at: string;
  doc_id: string | null;
  chunk_index: number | null;
}

export interface LegalLibraryParty {
  role: string;
  name: string;
}

export interface LegalLibraryDocument {
  id: string;
  title: string;
  source_type: string; // 'case' | 'statute'
  jurisdiction: string;
  citation: string;
  court: string;
  decided_year: number | null;
  parties: LegalLibraryParty[];
  legislation_number: string;
  storage_path: string | null;
  original_format: string; // 'docx' | 'pdf' | 'htm-text'
  source_collection: string;
  extracted_char_count: number;
  ingestion_status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface LegalLibraryDocumentChunk {
  id: string;
  chunk_index: number | null;
  title: string;
  citation: string;
  content: string;
}

export interface LegalLibraryDocumentWithChunks extends LegalLibraryDocument {
  chunks: LegalLibraryDocumentChunk[];
}

export type CaseTreatment = "followed" | "applied" | "distinguished" | "disapproved" | "overruled" | "mentioned";
export type CaseCitationConfidence = "low" | "medium" | "high";

export interface CaseCitation {
  id: string;
  cited_doc_id: string;
  citing_doc_id: string;
  treatment: CaseTreatment;
  context_snippet: string;
  citing_chunk_id: string | null;
  reasoning: string;
  confidence: CaseCitationConfidence;
  model: string;
  analysis_run_id: string;
  created_at: string;
  updated_at: string;
}

export interface CaseCitatorRun {
  id: string;
  cited_doc_id: string;
  candidates_screened: number;
  treatments_found: number;
  corpus_doc_count: number;
  status: "completed" | "failed";
  error_message: string | null;
  created_at: string;
}

export interface CaseBriefConcurrenceDissent {
  judge: string;
  type: "concurrence" | "dissent";
  summary: string;
}

export interface CaseBrief {
  doc_id: string;
  area_of_law: string;
  facts: string;
  issues: string[];
  holding: string;
  procedural_history: string;
  principles: string[];
  concurrences_dissents: CaseBriefConcurrenceDissent[];
  raw_model_output: string;
  parse_status: "ok" | "partial" | "failed";
  model: string;
  generated_at: string;
  updated_at: string;
}

export interface ContractAnalysis {
  id: string;
  document_id: string | null;
  user_id: string;
  case_id: string | null;
  overall_risk_score: number;
  risk_items: any;
  clauses_data: any;
  missing_clauses: any;
  obligations: any;
  recommendations: string[];
  negotiation_points?: string[];
  ai_insights?: string;
  ai_summary: string;
  industry_type?: string;
  contract_text: string;
  arbitration_clause_valid: boolean;
  arbitration_clause_issues: string;
  arbitration_seat?: string;
  arbitration_institution?: string;
  arbitration_improved?: string;
  detected_parties?: { party_a_name: string; party_b_name: string };
  detected_document_type?: string;
  governing_law_found: boolean;
  governing_law: string;
  cited_sources?: any;
  tagged_authorities?: any;
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: string;
  case_id: string;
  user_id: string;
  issue_number: number;
  description: string;
  claimant_position: string;
  respondent_position: string;
  status: string;
  created_at: string;
}

export interface Deadline {
  id: string;
  case_id: string;
  user_id: string;
  title: string;
  due_date: string;
  type: string;
  status: string;
  notes: string;
}

export interface Evidence {
  id: string;
  case_id: string;
  user_id: string;
  title: string;
  type: string;
  summary: string;
  created_at: string;
}

export interface EvidenceIssueLink {
  id: string;
  evidence_id: string;
  issue_id: string;
  user_id: string;
  created_at: string;
}

export interface CaseEvent {
  id: string;
  case_id: string;
  user_id: string;
  event_type: string;
  description: string;
  created_at: string;
}

export interface ProceduralOrder {
  id: string;
  case_id: string;
  user_id: string;
  order_number: number;
  title: string;
  content: string;
  issued_at: string | null;
  status: string;
}

export interface TemplateVariable {
  name: string;
  label?: string;
  type?: "text" | "number" | "date" | "textarea" | "select";
  required?: boolean;
  description?: string;
  default?: string;
  options?: string[];
}

export interface Template {
  id: string;
  category: string;
  title: string;
  template_type: string;
  jurisdiction: string;
  framework: string;
  variables: any;
  content: string;
  created_at: string;
}

export interface ContractClauseAnalysis {
  clause_name: string;
  start_phrase: string;
  full_clause_text?: string;
  char_start?: number;
  char_end?: number;
  risk_level: "critical" | "high" | "medium" | "low";
  defect_type?: "ambiguity" | "unenforceable" | "jurisdictional" | "missing_obligation" | "liability" | "arbitration" | "risk";
  analysis: string;
  redline_suggestion?: string;
  standard_alternative?: string;
}

export interface MissingClause {
  clause_type: string;
  importance: "low" | "medium" | "high" | "critical";
  consequence_of_omission: string;
  suggested_text?: string;
}

export interface RiskItem {
  title: string;
  risk_level: "critical" | "high" | "medium" | "low";
  explanation: string;
  impact: string;
  recommendation: string;
}

export interface ArbitrationDetails {
  valid: boolean;
  seat?: string;
  institution?: string;
  governing_law?: string;
  enforceability?: string;
  issues: string[];
}

export interface AIInsights {
  key_risks: string[];
  negotiation_points: string[];
  missing_protections: string[];
  commercial_concerns: string[];
  litigation_exposure: string[];
  arbitration_concerns: string[];
}
