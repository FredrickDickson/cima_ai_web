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
        Row: Document;
        Insert: Omit<Document, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Document, "id" | "created_at">>;
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
      contract_analyses: {
        Row: ContractAnalysis;
        Insert: Omit<ContractAnalysis, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ContractAnalysis, "id" | "created_at">>;
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
  role: string;
  organization: string;
  jurisdiction: string;
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
  parties: Party[];
  next_hearing: string | null;
  created_at: string;
  updated_at: string;
}

export interface Party {
  name: string;
  role: "claimant" | "respondent" | "third_party";
  counsel?: string;
}

export interface Document {
  id: string;
  user_id: string;
  case_id: string | null;
  name: string;
  type: "contract" | "brief" | "award" | "evidence" | "statute" | "document";
  file_path: string;
  file_size: number;
  mime_type: string;
  extracted_text: string;
  ai_summary: string;
  risk_score: number;
  status: "uploading" | "processing" | "ready" | "error";
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ResearchSession {
  id: string;
  user_id: string;
  query: string;
  jurisdiction: string;
  results: ResearchResult[];
  ai_analysis: string;
  created_at: string;
}

export interface ResearchResult {
  title: string;
  citation: string;
  type: "case" | "statute" | "rule" | "article";
  jurisdiction: string;
  summary: string;
  relevance: number;
}

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
}

export interface ContractAnalysis {
  id: string;
  document_id: string | null;
  user_id: string;
  case_id: string | null;
  overall_risk_score: number;
  risk_items: Record<string, unknown>[];
  clauses_data: Record<string, unknown>[];
  missing_clauses: Record<string, unknown>[];
  obligations: Record<string, unknown>;
  recommendations: string[];
  ai_summary: string;
  contract_text: string;
  arbitration_clause_valid: boolean;
  arbitration_clause_issues: string;
  governing_law_found: boolean;
  governing_law: string;
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
  variables: TemplateVariable[];
  content: string;
  created_at: string;
}
