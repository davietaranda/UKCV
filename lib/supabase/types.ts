/**
 * Hand-written mirror of supabase/migrations/0001_init.sql.
 *
 * Once a real Supabase project exists, regenerate this from the live schema
 * and replace this file entirely:
 *   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
 */

export type RequestStatus =
  | "new"
  | "processing"
  | "draft_ready"
  | "review"
  | "approved"
  | "delivered"
  | "archived";

export type AiOperation =
  | "cv_extraction"
  | "job_analysis"
  | "evidence_matching"
  | "cv_tailoring"
  | "cover_letter"
  | "application_answers";

export type AiRunStatus = "success" | "error" | "timeout";

export interface Database {
  __InternalSupabase: {
    PostgrestVersion: string;
  };
  public: {
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      request_status: RequestStatus;
      ai_operation: AiOperation;
      ai_run_status: AiRunStatus;
    };
    CompositeTypes: Record<string, never>;
    Tables: {
      admin_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_profiles"]["Insert"]>;
        Relationships: [];
      };
      requests: {
        Row: {
          id: string;
          customer_name: string;
          email: string;
          phone: string | null;
          job_title: string | null;
          company: string | null;
          job_url: string | null;
          job_description: string;
          package: string;
          urgency: string | null;
          ip_hash: string | null;
          consent_given_at: string;
          status: RequestStatus;
          match_score: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_name: string;
          email: string;
          phone?: string | null;
          job_title?: string | null;
          company?: string | null;
          job_url?: string | null;
          job_description: string;
          package: string;
          urgency?: string | null;
          ip_hash?: string | null;
          consent_given_at?: string;
          status?: RequestStatus;
          match_score?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["requests"]["Insert"]>;
        Relationships: [];
      };
      cv_documents: {
        Row: {
          id: string;
          request_id: string;
          original_file_path: string;
          original_filename: string;
          extracted_text: string | null;
          structured_cv: unknown | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          original_file_path: string;
          original_filename: string;
          extracted_text?: string | null;
          structured_cv?: unknown | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cv_documents"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "cv_documents_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "requests";
            referencedColumns: ["id"];
          },
        ];
      };
      job_analysis: {
        Row: {
          id: string;
          request_id: string;
          requirements: unknown | null;
          responsibilities: unknown | null;
          keywords: unknown | null;
          skills: unknown | null;
          qualifications: unknown | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          requirements?: unknown | null;
          responsibilities?: unknown | null;
          keywords?: unknown | null;
          skills?: unknown | null;
          qualifications?: unknown | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["job_analysis"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "job_analysis_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "requests";
            referencedColumns: ["id"];
          },
        ];
      };
      matching: {
        Row: {
          id: string;
          request_id: string;
          strong_matches: unknown | null;
          partial_matches: unknown | null;
          missing_requirements: unknown | null;
          evidence_map: unknown | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          strong_matches?: unknown | null;
          partial_matches?: unknown | null;
          missing_requirements?: unknown | null;
          evidence_map?: unknown | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["matching"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "matching_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "requests";
            referencedColumns: ["id"];
          },
        ];
      };
      outputs: {
        Row: {
          id: string;
          request_id: string;
          tailored_cv: unknown | null;
          cv_pdf_path: string | null;
          cv_docx_path: string | null;
          cover_letter: string | null;
          cover_letter_path: string | null;
          application_answers: unknown | null;
          truth_guard_flags: unknown | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_id: string;
          tailored_cv?: unknown | null;
          cv_pdf_path?: string | null;
          cv_docx_path?: string | null;
          cover_letter?: string | null;
          cover_letter_path?: string | null;
          application_answers?: unknown | null;
          truth_guard_flags?: unknown | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["outputs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "outputs_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "requests";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_runs: {
        Row: {
          id: string;
          request_id: string | null;
          operation: AiOperation;
          model: string;
          input_tokens: number | null;
          output_tokens: number | null;
          duration_ms: number | null;
          status: AiRunStatus;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_id?: string | null;
          operation: AiOperation;
          model: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          duration_ms?: number | null;
          status: AiRunStatus;
          error_message?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ai_runs"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "ai_runs_request_id_fkey";
            columns: ["request_id"];
            isOneToOne: false;
            referencedRelation: "requests";
            referencedColumns: ["id"];
          },
        ];
      };
    };
  };
}
