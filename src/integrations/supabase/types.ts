export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      assessment_answers: {
        Row: {
          answered_at: string
          attempt_id: string
          question_id: string
          selected_option_ids: string[]
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          question_id: string
          selected_option_ids: string[]
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          question_id?: string
          selected_option_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "assessment_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_attempts: {
        Row: {
          assessment_id: string
          assessment_version: number
          attempt_number: number
          created_at: string
          earned_points: number | null
          enrollment_id: string
          expires_at: string | null
          graded_at: string | null
          id: string
          passed: boolean | null
          passing_score: number
          question_snapshot: Json
          score_percent: number | null
          show_correct_answers: boolean
          started_at: string
          status: Database["public"]["Enums"]["assessment_attempt_status"]
          submitted_at: string | null
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assessment_id: string
          assessment_version: number
          attempt_number: number
          created_at?: string
          earned_points?: number | null
          enrollment_id: string
          expires_at?: string | null
          graded_at?: string | null
          id?: string
          passed?: boolean | null
          passing_score: number
          question_snapshot: Json
          score_percent?: number | null
          show_correct_answers?: boolean
          started_at?: string
          status?: Database["public"]["Enums"]["assessment_attempt_status"]
          submitted_at?: string | null
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assessment_id?: string
          assessment_version?: number
          attempt_number?: number
          created_at?: string
          earned_points?: number | null
          enrollment_id?: string
          expires_at?: string | null
          graded_at?: string | null
          id?: string
          passed?: boolean | null
          passing_score?: number
          question_snapshot?: Json
          score_percent?: number | null
          show_correct_answers?: boolean
          started_at?: string
          status?: Database["public"]["Enums"]["assessment_attempt_status"]
          submitted_at?: string | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_attempts_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_attempts_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_events: {
        Row: {
          actor_user_id: string | null
          assessment_id: string
          attempt_id: string | null
          created_at: string
          details: Json
          event_type: Database["public"]["Enums"]["assessment_event_type"]
          id: string
          question_id: string | null
          version: number | null
        }
        Insert: {
          actor_user_id?: string | null
          assessment_id: string
          attempt_id?: string | null
          created_at?: string
          details?: Json
          event_type: Database["public"]["Enums"]["assessment_event_type"]
          id?: string
          question_id?: string | null
          version?: number | null
        }
        Update: {
          actor_user_id?: string | null
          assessment_id?: string
          attempt_id?: string | null
          created_at?: string
          details?: Json
          event_type?: Database["public"]["Enums"]["assessment_event_type"]
          id?: string
          question_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_events_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_events_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "assessment_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_events_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_options: {
        Row: {
          created_at: string
          id: string
          is_correct: boolean
          option_text: string
          ordem: number
          question_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text: string
          ordem?: number
          question_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_correct?: boolean
          option_text?: string
          ordem?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assessment_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "assessment_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      assessment_questions: {
        Row: {
          archived_at: string | null
          assessment_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          explanation: string | null
          id: string
          ordem: number
          points: number
          prompt: string
          published_at: string | null
          question_type: Database["public"]["Enums"]["assessment_question_type"]
          required: boolean
          status: Database["public"]["Enums"]["assessment_status"]
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        Insert: {
          archived_at?: string | null
          assessment_id: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          explanation?: string | null
          id?: string
          ordem?: number
          points?: number
          prompt: string
          published_at?: string | null
          question_type: Database["public"]["Enums"]["assessment_question_type"]
          required?: boolean
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string
          updated_by_user_id?: string | null
          version?: number
        }
        Update: {
          archived_at?: string | null
          assessment_id?: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          explanation?: string | null
          id?: string
          ordem?: number
          points?: number
          prompt?: string
          published_at?: string | null
          question_type?: Database["public"]["Enums"]["assessment_question_type"]
          required?: boolean
          status?: Database["public"]["Enums"]["assessment_status"]
          updated_at?: string
          updated_by_user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessment_questions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "assessments"
            referencedColumns: ["id"]
          },
        ]
      }
      assessments: {
        Row: {
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          course_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          lesson_id: string | null
          max_attempts: number
          module_id: string | null
          passing_score: number
          published_at: string | null
          required: boolean
          scope: Database["public"]["Enums"]["assessment_scope"]
          show_correct_answers: boolean
          shuffle_options: boolean
          shuffle_questions: boolean
          status: Database["public"]["Enums"]["assessment_status"]
          time_limit_minutes: number | null
          title: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        Insert: {
          archived_at?: string | null
          availability_ends_at?: string | null
          availability_starts_at?: string | null
          course_id: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          lesson_id?: string | null
          max_attempts?: number
          module_id?: string | null
          passing_score?: number
          published_at?: string | null
          required?: boolean
          scope?: Database["public"]["Enums"]["assessment_scope"]
          show_correct_answers?: boolean
          shuffle_options?: boolean
          shuffle_questions?: boolean
          status?: Database["public"]["Enums"]["assessment_status"]
          time_limit_minutes?: number | null
          title: string
          updated_at?: string
          updated_by_user_id?: string | null
          version?: number
        }
        Update: {
          archived_at?: string | null
          availability_ends_at?: string | null
          availability_starts_at?: string | null
          course_id?: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          lesson_id?: string | null
          max_attempts?: number
          module_id?: string | null
          passing_score?: number
          published_at?: string | null
          required?: boolean
          scope?: Database["public"]["Enums"]["assessment_scope"]
          show_correct_answers?: boolean
          shuffle_options?: boolean
          shuffle_questions?: boolean
          status?: Database["public"]["Enums"]["assessment_status"]
          time_limit_minutes?: number | null
          title?: string
          updated_at?: string
          updated_by_user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assessments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_access_grants: {
        Row: {
          asset_id: string
          created_at: string
          enrollment_id: string | null
          expires_at: string | null
          granted_by_user_id: string
          id: string
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          enrollment_id?: string | null
          expires_at?: string | null
          granted_by_user_id: string
          id?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          enrollment_id?: string | null
          expires_at?: string | null
          granted_by_user_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_access_grants_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_access_grants_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_events: {
        Row: {
          actor_user_id: string | null
          asset_id: string
          created_at: string
          details: Json
          event_type: Database["public"]["Enums"]["asset_event_type"]
          from_state: Database["public"]["Enums"]["asset_state"] | null
          id: string
          to_state: Database["public"]["Enums"]["asset_state"] | null
        }
        Insert: {
          actor_user_id?: string | null
          asset_id: string
          created_at?: string
          details?: Json
          event_type: Database["public"]["Enums"]["asset_event_type"]
          from_state?: Database["public"]["Enums"]["asset_state"] | null
          id?: string
          to_state?: Database["public"]["Enums"]["asset_state"] | null
        }
        Update: {
          actor_user_id?: string | null
          asset_id?: string
          created_at?: string
          details?: Json
          event_type?: Database["public"]["Enums"]["asset_event_type"]
          from_state?: Database["public"]["Enums"]["asset_state"] | null
          id?: string
          to_state?: Database["public"]["Enums"]["asset_state"] | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_events_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          bucket_id: string
          checksum_sha256: string | null
          created_at: string
          created_by_user_id: string
          deleted_at: string | null
          extension: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string
          lesson_id: string | null
          metadata: Json
          mime_type: string
          normalized_name: string
          object_path: string | null
          original_name: string
          owner_user_id: string
          processing_started_at: string | null
          published_at: string | null
          purpose: Database["public"]["Enums"]["asset_purpose"]
          size_bytes: number
          state: Database["public"]["Enums"]["asset_state"]
          updated_at: string
          uploaded_at: string | null
        }
        Insert: {
          bucket_id?: string
          checksum_sha256?: string | null
          created_at?: string
          created_by_user_id: string
          deleted_at?: string | null
          extension: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key: string
          lesson_id?: string | null
          metadata?: Json
          mime_type: string
          normalized_name: string
          object_path?: string | null
          original_name: string
          owner_user_id: string
          processing_started_at?: string | null
          published_at?: string | null
          purpose: Database["public"]["Enums"]["asset_purpose"]
          size_bytes: number
          state?: Database["public"]["Enums"]["asset_state"]
          updated_at?: string
          uploaded_at?: string | null
        }
        Update: {
          bucket_id?: string
          checksum_sha256?: string | null
          created_at?: string
          created_by_user_id?: string
          deleted_at?: string | null
          extension?: string
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key?: string
          lesson_id?: string | null
          metadata?: Json
          mime_type?: string
          normalized_name?: string
          object_path?: string | null
          original_name?: string
          owner_user_id?: string
          processing_started_at?: string | null
          published_at?: string | null
          purpose?: Database["public"]["Enums"]["asset_purpose"]
          size_bytes?: number
          state?: Database["public"]["Enums"]["asset_state"]
          updated_at?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      aulas: {
        Row: {
          archived_at: string | null
          audio_asset_id: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          completion_mode: Database["public"]["Enums"]["lesson_completion_mode"]
          completion_percent: number | null
          content_kind: Database["public"]["Enums"]["lesson_content_kind"]
          conteudo_texto: string | null
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          descricao: string | null
          drip_delay_days: number | null
          duplicated_from_lesson_id: string | null
          duracao: number | null
          id: string
          modulo_id: string
          obrigatoria: boolean
          ordem: number
          preview_enabled: boolean
          release_at: string | null
          release_mode: Database["public"]["Enums"]["curriculum_release_mode"]
          status: Database["public"]["Enums"]["curriculum_item_status"]
          titulo: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        Insert: {
          archived_at?: string | null
          audio_asset_id?: string | null
          availability_ends_at?: string | null
          availability_starts_at?: string | null
          completion_mode?: Database["public"]["Enums"]["lesson_completion_mode"]
          completion_percent?: number | null
          content_kind?: Database["public"]["Enums"]["lesson_content_kind"]
          conteudo_texto?: string | null
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          descricao?: string | null
          drip_delay_days?: number | null
          duplicated_from_lesson_id?: string | null
          duracao?: number | null
          id?: string
          modulo_id: string
          obrigatoria?: boolean
          ordem?: number
          preview_enabled?: boolean
          release_at?: string | null
          release_mode?: Database["public"]["Enums"]["curriculum_release_mode"]
          status?: Database["public"]["Enums"]["curriculum_item_status"]
          titulo: string
          updated_at?: string
          updated_by_user_id?: string | null
          version?: number
        }
        Update: {
          archived_at?: string | null
          audio_asset_id?: string | null
          availability_ends_at?: string | null
          availability_starts_at?: string | null
          completion_mode?: Database["public"]["Enums"]["lesson_completion_mode"]
          completion_percent?: number | null
          content_kind?: Database["public"]["Enums"]["lesson_content_kind"]
          conteudo_texto?: string | null
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          descricao?: string | null
          drip_delay_days?: number | null
          duplicated_from_lesson_id?: string | null
          duracao?: number | null
          id?: string
          modulo_id?: string
          obrigatoria?: boolean
          ordem?: number
          preview_enabled?: boolean
          release_at?: string | null
          release_mode?: Database["public"]["Enums"]["curriculum_release_mode"]
          status?: Database["public"]["Enums"]["curriculum_item_status"]
          titulo?: string
          updated_at?: string
          updated_by_user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "aulas_audio_asset_id_fkey"
            columns: ["audio_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aulas_duplicated_from_lesson_id_fkey"
            columns: ["duplicated_from_lesson_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aulas_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_intent_events: {
        Row: {
          actor_user_id: string | null
          checkout_intent_id: string
          created_at: string
          details: Json
          event_type: Database["public"]["Enums"]["checkout_intent_event_type"]
          from_status:
            | Database["public"]["Enums"]["checkout_intent_status"]
            | null
          id: string
          to_status: Database["public"]["Enums"]["checkout_intent_status"]
        }
        Insert: {
          actor_user_id?: string | null
          checkout_intent_id: string
          created_at?: string
          details?: Json
          event_type: Database["public"]["Enums"]["checkout_intent_event_type"]
          from_status?:
            | Database["public"]["Enums"]["checkout_intent_status"]
            | null
          id?: string
          to_status: Database["public"]["Enums"]["checkout_intent_status"]
        }
        Update: {
          actor_user_id?: string | null
          checkout_intent_id?: string
          created_at?: string
          details?: Json
          event_type?: Database["public"]["Enums"]["checkout_intent_event_type"]
          from_status?:
            | Database["public"]["Enums"]["checkout_intent_status"]
            | null
          id?: string
          to_status?: Database["public"]["Enums"]["checkout_intent_status"]
        }
        Relationships: [
          {
            foreignKeyName: "checkout_intent_events_checkout_intent_id_fkey"
            columns: ["checkout_intent_id"]
            isOneToOne: false
            referencedRelation: "checkout_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      checkout_intents: {
        Row: {
          amount_cents: number
          created_at: string
          currency_code: string
          expires_at: string | null
          failure_code: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string
          item_snapshot: Json
          license_id: string | null
          provider: string
          provider_checkout_id: string | null
          provider_checkout_url: string | null
          provider_request_started_at: string | null
          provider_request_token: string | null
          status: Database["public"]["Enums"]["checkout_intent_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["checkout_subject_type"]
          title_snapshot: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency_code: string
          expires_at?: string | null
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key: string
          item_snapshot: Json
          license_id?: string | null
          provider?: string
          provider_checkout_id?: string | null
          provider_checkout_url?: string | null
          provider_request_started_at?: string | null
          provider_request_token?: string | null
          status?: Database["public"]["Enums"]["checkout_intent_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["checkout_subject_type"]
          title_snapshot: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency_code?: string
          expires_at?: string | null
          failure_code?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key?: string
          item_snapshot?: Json
          license_id?: string | null
          provider?: string
          provider_checkout_id?: string | null
          provider_checkout_url?: string | null
          provider_request_started_at?: string | null
          provider_request_token?: string | null
          status?: Database["public"]["Enums"]["checkout_intent_status"]
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["checkout_subject_type"]
          title_snapshot?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "checkout_intents_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "digital_product_licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_editor_events: {
        Row: {
          actor_user_id: string | null
          course_id: string
          created_at: string
          details: Json
          event_type: Database["public"]["Enums"]["course_editor_event_type"]
          id: string
          version: number
        }
        Insert: {
          actor_user_id?: string | null
          course_id: string
          created_at?: string
          details?: Json
          event_type: Database["public"]["Enums"]["course_editor_event_type"]
          id?: string
          version: number
        }
        Update: {
          actor_user_id?: string | null
          course_id?: string
          created_at?: string
          details?: Json
          event_type?: Database["public"]["Enums"]["course_editor_event_type"]
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_editor_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          access_duration_days: number | null
          affiliate_eligible: boolean
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          category: string | null
          certificate_enabled: boolean
          certificate_min_completion_percent: number
          completion_mode: Database["public"]["Enums"]["course_completion_mode"]
          completion_required_percent: number
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          drip_interval_days: number | null
          duplicated_from_course_id: string | null
          id: string
          language_code: string
          level: Database["public"]["Enums"]["course_level"]
          objectives: string[]
          prerequisites: string[]
          preview_enabled: boolean
          price_amount: number
          promotion_ends_at: string | null
          promotion_starts_at: string | null
          promotional_price_amount: number | null
          published_at: string | null
          release_at: string | null
          release_mode: Database["public"]["Enums"]["course_release_mode"]
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          thumbnail_asset_id: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        Insert: {
          access_duration_days?: number | null
          affiliate_eligible?: boolean
          archived_at?: string | null
          availability_ends_at?: string | null
          availability_starts_at?: string | null
          category?: string | null
          certificate_enabled?: boolean
          certificate_min_completion_percent?: number
          completion_mode?: Database["public"]["Enums"]["course_completion_mode"]
          completion_required_percent?: number
          cover_asset_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          drip_interval_days?: number | null
          duplicated_from_course_id?: string | null
          id?: string
          language_code?: string
          level?: Database["public"]["Enums"]["course_level"]
          objectives?: string[]
          prerequisites?: string[]
          preview_enabled?: boolean
          price_amount?: number
          promotion_ends_at?: string | null
          promotion_starts_at?: string | null
          promotional_price_amount?: number | null
          published_at?: string | null
          release_at?: string | null
          release_mode?: Database["public"]["Enums"]["course_release_mode"]
          short_description?: string | null
          slug: string
          status?: Database["public"]["Enums"]["course_status"]
          thumbnail_asset_id?: string | null
          title: string
          unpublished_at?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
          version?: number
        }
        Update: {
          access_duration_days?: number | null
          affiliate_eligible?: boolean
          archived_at?: string | null
          availability_ends_at?: string | null
          availability_starts_at?: string | null
          category?: string | null
          certificate_enabled?: boolean
          certificate_min_completion_percent?: number
          completion_mode?: Database["public"]["Enums"]["course_completion_mode"]
          completion_required_percent?: number
          cover_asset_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          drip_interval_days?: number | null
          duplicated_from_course_id?: string | null
          id?: string
          language_code?: string
          level?: Database["public"]["Enums"]["course_level"]
          objectives?: string[]
          prerequisites?: string[]
          preview_enabled?: boolean
          price_amount?: number
          promotion_ends_at?: string | null
          promotion_starts_at?: string | null
          promotional_price_amount?: number | null
          published_at?: string | null
          release_at?: string | null
          release_mode?: Database["public"]["Enums"]["course_release_mode"]
          short_description?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["course_status"]
          thumbnail_asset_id?: string | null
          title?: string
          unpublished_at?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_cover_asset_id_fkey"
            columns: ["cover_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_duplicated_from_course_id_fkey"
            columns: ["duplicated_from_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_thumbnail_asset_id_fkey"
            columns: ["thumbnail_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_editor_events: {
        Row: {
          actor_user_id: string | null
          course_id: string
          created_at: string
          details: Json
          entity_id: string
          entity_type: Database["public"]["Enums"]["curriculum_entity_type"]
          event_type: Database["public"]["Enums"]["curriculum_editor_event_type"]
          id: string
          version: number
        }
        Insert: {
          actor_user_id?: string | null
          course_id: string
          created_at?: string
          details?: Json
          entity_id: string
          entity_type: Database["public"]["Enums"]["curriculum_entity_type"]
          event_type: Database["public"]["Enums"]["curriculum_editor_event_type"]
          id?: string
          version: number
        }
        Update: {
          actor_user_id?: string | null
          course_id?: string
          created_at?: string
          details?: Json
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["curriculum_entity_type"]
          event_type?: Database["public"]["Enums"]["curriculum_editor_event_type"]
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_editor_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_accesses: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by_user_id: string | null
          id: string
          license_id: string
          license_snapshot: Json
          product_id: string
          revocation_reason: string | null
          revoked_at: string | null
          source: Database["public"]["Enums"]["digital_product_access_source"]
          source_reference: string | null
          status: Database["public"]["Enums"]["digital_product_access_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by_user_id?: string | null
          id?: string
          license_id: string
          license_snapshot: Json
          product_id: string
          revocation_reason?: string | null
          revoked_at?: string | null
          source: Database["public"]["Enums"]["digital_product_access_source"]
          source_reference?: string | null
          status?: Database["public"]["Enums"]["digital_product_access_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_at?: string
          granted_by_user_id?: string | null
          id?: string
          license_id?: string
          license_snapshot?: Json
          product_id?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          source?: Database["public"]["Enums"]["digital_product_access_source"]
          source_reference?: string | null
          status?: Database["public"]["Enums"]["digital_product_access_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_accesses_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "digital_product_licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_accesses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_deliverables: {
        Row: {
          asset_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          position: number
          product_id: string
          required: boolean
          title: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          position?: number
          product_id: string
          required?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          description?: string | null
          id?: string
          position?: number
          product_id?: string
          required?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_deliverables_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_deliverables_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_events: {
        Row: {
          access_id: string | null
          actor_user_id: string | null
          created_at: string
          deliverable_id: string | null
          details: Json
          event_type: Database["public"]["Enums"]["digital_product_event_type"]
          id: string
          license_id: string | null
          product_id: string
          version: number | null
        }
        Insert: {
          access_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          deliverable_id?: string | null
          details?: Json
          event_type: Database["public"]["Enums"]["digital_product_event_type"]
          id?: string
          license_id?: string | null
          product_id: string
          version?: number | null
        }
        Update: {
          access_id?: string | null
          actor_user_id?: string | null
          created_at?: string
          deliverable_id?: string | null
          details?: Json
          event_type?: Database["public"]["Enums"]["digital_product_event_type"]
          id?: string
          license_id?: string | null
          product_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_events_access_id_fkey"
            columns: ["access_id"]
            isOneToOne: false
            referencedRelation: "digital_product_accesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_events_deliverable_id_fkey"
            columns: ["deliverable_id"]
            isOneToOne: false
            referencedRelation: "digital_product_deliverables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_events_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "digital_product_licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_licenses: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by_user_id: string | null
          id: string
          is_default: boolean
          kind: Database["public"]["Enums"]["digital_license_kind"]
          product_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["digital_license_status"]
          summary: string | null
          terms_text: string
          title: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_default?: boolean
          kind: Database["public"]["Enums"]["digital_license_kind"]
          product_id: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["digital_license_status"]
          summary?: string | null
          terms_text: string
          title: string
          version: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          is_default?: boolean
          kind?: Database["public"]["Enums"]["digital_license_kind"]
          product_id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["digital_license_status"]
          summary?: string | null
          terms_text?: string
          title?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_licenses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "digital_products"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_products: {
        Row: {
          affiliate_eligible: boolean
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          category: string | null
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          id: string
          price_amount: number
          promotion_ends_at: string | null
          promotion_starts_at: string | null
          promotional_price_amount: number | null
          published_at: string | null
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["digital_product_status"]
          thumbnail_asset_id: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        Insert: {
          affiliate_eligible?: boolean
          archived_at?: string | null
          availability_ends_at?: string | null
          availability_starts_at?: string | null
          category?: string | null
          cover_asset_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          price_amount?: number
          promotion_ends_at?: string | null
          promotion_starts_at?: string | null
          promotional_price_amount?: number | null
          published_at?: string | null
          short_description?: string | null
          slug: string
          status?: Database["public"]["Enums"]["digital_product_status"]
          thumbnail_asset_id?: string | null
          title: string
          unpublished_at?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
          version?: number
        }
        Update: {
          affiliate_eligible?: boolean
          archived_at?: string | null
          availability_ends_at?: string | null
          availability_starts_at?: string | null
          category?: string | null
          cover_asset_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          currency_code?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          price_amount?: number
          promotion_ends_at?: string | null
          promotion_starts_at?: string | null
          promotional_price_amount?: number | null
          published_at?: string | null
          short_description?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["digital_product_status"]
          thumbnail_asset_id?: string | null
          title?: string
          unpublished_at?: string | null
          updated_at?: string
          updated_by_user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "digital_products_cover_asset_id_fkey"
            columns: ["cover_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_products_thumbnail_asset_id_fkey"
            columns: ["thumbnail_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          details: Json
          enrollment_id: string
          event_type: Database["public"]["Enums"]["enrollment_event_type"]
          from_status: Database["public"]["Enums"]["enrollment_status"] | null
          id: string
          to_status: Database["public"]["Enums"]["enrollment_status"] | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          enrollment_id: string
          event_type: Database["public"]["Enums"]["enrollment_event_type"]
          from_status?: Database["public"]["Enums"]["enrollment_status"] | null
          id?: string
          to_status?: Database["public"]["Enums"]["enrollment_status"] | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          enrollment_id?: string
          event_type?: Database["public"]["Enums"]["enrollment_event_type"]
          from_status?: Database["public"]["Enums"]["enrollment_status"] | null
          id?: string
          to_status?: Database["public"]["Enums"]["enrollment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollment_events_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          course_id: string
          created_at: string
          expires_at: string | null
          granted_by_user_id: string | null
          id: string
          payment_confirmed_at: string | null
          revoked_at: string | null
          source: Database["public"]["Enums"]["enrollment_source"]
          source_reference: string | null
          starts_at: string
          status: Database["public"]["Enums"]["enrollment_status"]
          status_reason: string | null
          suspended_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          expires_at?: string | null
          granted_by_user_id?: string | null
          id?: string
          payment_confirmed_at?: string | null
          revoked_at?: string | null
          source: Database["public"]["Enums"]["enrollment_source"]
          source_reference?: string | null
          starts_at?: string
          status: Database["public"]["Enums"]["enrollment_status"]
          status_reason?: string | null
          suspended_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          expires_at?: string | null
          granted_by_user_id?: string | null
          id?: string
          payment_confirmed_at?: string | null
          revoked_at?: string | null
          source?: Database["public"]["Enums"]["enrollment_source"]
          source_reference?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          status_reason?: string | null
          suspended_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_media: {
        Row: {
          asset_id: string | null
          created_at: string
          created_by_user_id: string
          external_video_id: string | null
          id: string
          is_active: boolean
          lesson_id: string
          provider: Database["public"]["Enums"]["lesson_media_provider"]
          updated_at: string
          watermark_enabled: boolean
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          created_by_user_id: string
          external_video_id?: string | null
          id?: string
          is_active?: boolean
          lesson_id: string
          provider: Database["public"]["Enums"]["lesson_media_provider"]
          updated_at?: string
          watermark_enabled?: boolean
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          created_by_user_id?: string
          external_video_id?: string | null
          id?: string
          is_active?: boolean
          lesson_id?: string
          provider?: Database["public"]["Enums"]["lesson_media_provider"]
          updated_at?: string
          watermark_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lesson_media_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_media_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_prerequisites: {
        Row: {
          created_at: string
          created_by_user_id: string
          lesson_id: string
          prerequisite_lesson_id: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          lesson_id: string
          prerequisite_lesson_id: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          lesson_id?: string
          prerequisite_lesson_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_prerequisites_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_prerequisites_prerequisite_lesson_id_fkey"
            columns: ["prerequisite_lesson_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress_events: {
        Row: {
          accepted: boolean
          aula_id: string
          auth_session_id: string
          calculated_progress_percent: number
          client_instance_id: string
          duration_seconds: number | null
          event_sequence: number
          event_type: Database["public"]["Enums"]["lesson_progress_event_type"]
          id: string
          ignored_reason: string | null
          observed_at: string
          position_seconds: number
          received_at: string
          resulting_completed: boolean
          resulting_revision: number
          user_id: string
        }
        Insert: {
          accepted: boolean
          aula_id: string
          auth_session_id: string
          calculated_progress_percent: number
          client_instance_id: string
          duration_seconds?: number | null
          event_sequence: number
          event_type: Database["public"]["Enums"]["lesson_progress_event_type"]
          id: string
          ignored_reason?: string | null
          observed_at: string
          position_seconds: number
          received_at?: string
          resulting_completed: boolean
          resulting_revision: number
          user_id: string
        }
        Update: {
          accepted?: boolean
          aula_id?: string
          auth_session_id?: string
          calculated_progress_percent?: number
          client_instance_id?: string
          duration_seconds?: number | null
          event_sequence?: number
          event_type?: Database["public"]["Enums"]["lesson_progress_event_type"]
          id?: string
          ignored_reason?: string | null
          observed_at?: string
          position_seconds?: number
          received_at?: string
          resulting_completed?: boolean
          resulting_revision?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_events_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress_streams: {
        Row: {
          aula_id: string
          auth_session_id: string
          client_instance_id: string
          created_at: string
          last_event_id: string
          last_event_sequence: number
          last_position_seconds: number
          updated_at: string
          user_id: string
        }
        Insert: {
          aula_id: string
          auth_session_id: string
          client_instance_id: string
          created_at?: string
          last_event_id: string
          last_event_sequence: number
          last_position_seconds: number
          updated_at?: string
          user_id: string
        }
        Update: {
          aula_id?: string
          auth_session_id?: string
          client_instance_id?: string
          created_at?: string
          last_event_id?: string
          last_event_sequence?: number
          last_position_seconds?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_streams_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      module_prerequisites: {
        Row: {
          created_at: string
          created_by_user_id: string
          module_id: string
          prerequisite_module_id: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          module_id: string
          prerequisite_module_id: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          module_id?: string
          prerequisite_module_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_prerequisites_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "module_prerequisites_prerequisite_module_id_fkey"
            columns: ["prerequisite_module_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          archived_at: string | null
          course_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          descricao: string | null
          drip_delay_days: number | null
          duplicated_from_module_id: string | null
          id: string
          obrigatorio: boolean
          ordem: number
          preview_enabled: boolean
          release_at: string | null
          release_mode: Database["public"]["Enums"]["curriculum_release_mode"]
          status: Database["public"]["Enums"]["curriculum_item_status"]
          titulo: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        Insert: {
          archived_at?: string | null
          course_id: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          descricao?: string | null
          drip_delay_days?: number | null
          duplicated_from_module_id?: string | null
          id?: string
          obrigatorio?: boolean
          ordem?: number
          preview_enabled?: boolean
          release_at?: string | null
          release_mode?: Database["public"]["Enums"]["curriculum_release_mode"]
          status?: Database["public"]["Enums"]["curriculum_item_status"]
          titulo: string
          updated_at?: string
          updated_by_user_id?: string | null
          version?: number
        }
        Update: {
          archived_at?: string | null
          course_id?: string
          created_at?: string
          created_by_user_id?: string | null
          deleted_at?: string | null
          descricao?: string | null
          drip_delay_days?: number | null
          duplicated_from_module_id?: string | null
          id?: string
          obrigatorio?: boolean
          ordem?: number
          preview_enabled?: boolean
          release_at?: string | null
          release_mode?: Database["public"]["Enums"]["curriculum_release_mode"]
          status?: Database["public"]["Enums"]["curriculum_item_status"]
          titulo?: string
          updated_at?: string
          updated_by_user_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "modulos_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modulos_duplicated_from_module_id_fkey"
            columns: ["duplicated_from_module_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          amount_cents: number
          billing_type: Database["public"]["Enums"]["payment_billing_type"]
          checkout_intent_id: string
          confirmed_at: string | null
          created_at: string
          currency_code: string
          failure_code: string | null
          id: string
          last_provider_event_at: string | null
          last_provider_event_id: string | null
          order_id: string
          provider: string
          provider_checkout_id: string
          provider_payment_id: string | null
          provider_status: string | null
          received_at: string | null
          status: Database["public"]["Enums"]["payment_attempt_status"]
          updated_at: string
          version: number
        }
        Insert: {
          amount_cents: number
          billing_type?: Database["public"]["Enums"]["payment_billing_type"]
          checkout_intent_id: string
          confirmed_at?: string | null
          created_at?: string
          currency_code: string
          failure_code?: string | null
          id?: string
          last_provider_event_at?: string | null
          last_provider_event_id?: string | null
          order_id: string
          provider?: string
          provider_checkout_id: string
          provider_payment_id?: string | null
          provider_status?: string | null
          received_at?: string | null
          status?: Database["public"]["Enums"]["payment_attempt_status"]
          updated_at?: string
          version?: number
        }
        Update: {
          amount_cents?: number
          billing_type?: Database["public"]["Enums"]["payment_billing_type"]
          checkout_intent_id?: string
          confirmed_at?: string | null
          created_at?: string
          currency_code?: string
          failure_code?: string | null
          id?: string
          last_provider_event_at?: string | null
          last_provider_event_id?: string | null
          order_id?: string
          provider?: string
          provider_checkout_id?: string
          provider_payment_id?: string | null
          provider_status?: string | null
          received_at?: string | null
          status?: Database["public"]["Enums"]["payment_attempt_status"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_checkout_intent_id_fkey"
            columns: ["checkout_intent_id"]
            isOneToOne: true
            referencedRelation: "checkout_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "payment_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_orders: {
        Row: {
          amount_cents: number
          checkout_intent_id: string
          created_at: string
          currency_code: string
          id: string
          item_snapshot: Json
          license_id: string | null
          payment_confirmed_at: string | null
          status: Database["public"]["Enums"]["payment_order_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["checkout_subject_type"]
          title_snapshot: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          amount_cents: number
          checkout_intent_id: string
          created_at?: string
          currency_code: string
          id?: string
          item_snapshot: Json
          license_id?: string | null
          payment_confirmed_at?: string | null
          status?: Database["public"]["Enums"]["payment_order_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["checkout_subject_type"]
          title_snapshot: string
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          amount_cents?: number
          checkout_intent_id?: string
          created_at?: string
          currency_code?: string
          id?: string
          item_snapshot?: Json
          license_id?: string | null
          payment_confirmed_at?: string | null
          status?: Database["public"]["Enums"]["payment_order_status"]
          subject_id?: string
          subject_type?: Database["public"]["Enums"]["checkout_subject_type"]
          title_snapshot?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_orders_checkout_intent_id_fkey"
            columns: ["checkout_intent_id"]
            isOneToOne: true
            referencedRelation: "checkout_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_orders_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "digital_product_licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_provider_events: {
        Row: {
          error_code: string | null
          event_type: string
          external_reference: string | null
          id: string
          payload: Json
          payment_attempt_id: string | null
          processed_at: string | null
          provider: string
          provider_event_id: string
          provider_payment_id: string | null
          received_at: string
          status: Database["public"]["Enums"]["payment_provider_event_status"]
        }
        Insert: {
          error_code?: string | null
          event_type: string
          external_reference?: string | null
          id?: string
          payload: Json
          payment_attempt_id?: string | null
          processed_at?: string | null
          provider?: string
          provider_event_id: string
          provider_payment_id?: string | null
          received_at?: string
          status?: Database["public"]["Enums"]["payment_provider_event_status"]
        }
        Update: {
          error_code?: string | null
          event_type?: string
          external_reference?: string | null
          id?: string
          payload?: Json
          payment_attempt_id?: string | null
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          provider_payment_id?: string | null
          received_at?: string
          status?: Database["public"]["Enums"]["payment_provider_event_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payment_provider_events_payment_attempt_id_fkey"
            columns: ["payment_attempt_id"]
            isOneToOne: false
            referencedRelation: "payment_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      playback_events: {
        Row: {
          created_at: string
          details: Json
          event_type: Database["public"]["Enums"]["playback_event_type"]
          id: string
          lesson_media_id: string | null
          playback_token_id: string | null
          reason: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          event_type: Database["public"]["Enums"]["playback_event_type"]
          id?: string
          lesson_media_id?: string | null
          playback_token_id?: string | null
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          event_type?: Database["public"]["Enums"]["playback_event_type"]
          id?: string
          lesson_media_id?: string | null
          playback_token_id?: string | null
          reason?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playback_events_lesson_media_id_fkey"
            columns: ["lesson_media_id"]
            isOneToOne: false
            referencedRelation: "lesson_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playback_events_playback_token_id_fkey"
            columns: ["playback_token_id"]
            isOneToOne: false
            referencedRelation: "playback_tokens"
            referencedColumns: ["id"]
          },
        ]
      }
      playback_tokens: {
        Row: {
          auth_session_id: string
          created_at: string
          enrollment_id: string | null
          expires_at: string
          fingerprint_hash: string
          id: string
          last_used_at: string | null
          lesson_media_id: string
          revoked_at: string | null
          token_hash: string
          use_count: number
          user_id: string
          watermark_text: string | null
        }
        Insert: {
          auth_session_id: string
          created_at?: string
          enrollment_id?: string | null
          expires_at: string
          fingerprint_hash: string
          id?: string
          last_used_at?: string | null
          lesson_media_id: string
          revoked_at?: string | null
          token_hash: string
          use_count?: number
          user_id: string
          watermark_text?: string | null
        }
        Update: {
          auth_session_id?: string
          created_at?: string
          enrollment_id?: string | null
          expires_at?: string
          fingerprint_hash?: string
          id?: string
          last_used_at?: string | null
          lesson_media_id?: string
          revoked_at?: string | null
          token_hash?: string
          use_count?: number
          user_id?: string
          watermark_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playback_tokens_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playback_tokens_lesson_media_id_fkey"
            columns: ["lesson_media_id"]
            isOneToOne: false
            referencedRelation: "lesson_media"
            referencedColumns: ["id"]
          },
        ]
      }
      progresso_aulas: {
        Row: {
          aula_id: string
          completada: boolean
          created_at: string
          id: string
          last_client_instance_id: string | null
          last_event_id: string | null
          last_event_received_at: string | null
          progresso_percentual: number
          revision: number
          tempo_assistido: number
          ultima_visualizacao: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aula_id: string
          completada?: boolean
          created_at?: string
          id?: string
          last_client_instance_id?: string | null
          last_event_id?: string | null
          last_event_received_at?: string | null
          progresso_percentual?: number
          revision?: number
          tempo_assistido?: number
          ultima_visualizacao?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aula_id?: string
          completada?: boolean
          created_at?: string
          id?: string
          last_client_instance_id?: string | null
          last_event_id?: string | null
          last_event_received_at?: string | null
          progresso_percentual?: number
          revision?: number
          tempo_assistido?: number
          ultima_visualizacao?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "progresso_aulas_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_asset_id: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_asset_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_asset_id?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_avatar_asset_id_fkey"
            columns: ["avatar_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_assessment: {
        Args: { p_assessment_id: string; p_expected_version: number }
        Returns: {
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          course_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          lesson_id: string | null
          max_attempts: number
          module_id: string | null
          passing_score: number
          published_at: string | null
          required: boolean
          scope: Database["public"]["Enums"]["assessment_scope"]
          show_correct_answers: boolean
          shuffle_options: boolean
          shuffle_questions: boolean
          status: Database["public"]["Enums"]["assessment_status"]
          time_limit_minutes: number | null
          title: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "assessments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_assessment_question: {
        Args: { p_expected_version: number; p_question_id: string }
        Returns: {
          archived_at: string | null
          assessment_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          explanation: string | null
          id: string
          ordem: number
          points: number
          prompt: string
          published_at: string | null
          question_type: Database["public"]["Enums"]["assessment_question_type"]
          required: boolean
          status: Database["public"]["Enums"]["assessment_status"]
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "assessment_questions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_course: {
        Args: { p_course_id: string; p_expected_version: number }
        Returns: {
          access_duration_days: number | null
          affiliate_eligible: boolean
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          category: string | null
          certificate_enabled: boolean
          certificate_min_completion_percent: number
          completion_mode: Database["public"]["Enums"]["course_completion_mode"]
          completion_required_percent: number
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          drip_interval_days: number | null
          duplicated_from_course_id: string | null
          id: string
          language_code: string
          level: Database["public"]["Enums"]["course_level"]
          objectives: string[]
          prerequisites: string[]
          preview_enabled: boolean
          price_amount: number
          promotion_ends_at: string | null
          promotion_starts_at: string | null
          promotional_price_amount: number | null
          published_at: string | null
          release_at: string | null
          release_mode: Database["public"]["Enums"]["course_release_mode"]
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          thumbnail_asset_id: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "courses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_digital_product: {
        Args: { p_expected_version: number; p_product_id: string }
        Returns: {
          affiliate_eligible: boolean
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          category: string | null
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          id: string
          price_amount: number
          promotion_ends_at: string | null
          promotion_starts_at: string | null
          promotional_price_amount: number | null
          published_at: string | null
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["digital_product_status"]
          thumbnail_asset_id: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "digital_products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_lesson: {
        Args: { p_expected_version: number; p_lesson_id: string }
        Returns: {
          archived_at: string | null
          audio_asset_id: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          completion_mode: Database["public"]["Enums"]["lesson_completion_mode"]
          completion_percent: number | null
          content_kind: Database["public"]["Enums"]["lesson_content_kind"]
          conteudo_texto: string | null
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          descricao: string | null
          drip_delay_days: number | null
          duplicated_from_lesson_id: string | null
          duracao: number | null
          id: string
          modulo_id: string
          obrigatoria: boolean
          ordem: number
          preview_enabled: boolean
          release_at: string | null
          release_mode: Database["public"]["Enums"]["curriculum_release_mode"]
          status: Database["public"]["Enums"]["curriculum_item_status"]
          titulo: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "aulas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_lesson_material: {
        Args: { p_asset_id: string; p_lesson_id: string }
        Returns: {
          bucket_id: string
          checksum_sha256: string | null
          created_at: string
          created_by_user_id: string
          deleted_at: string | null
          extension: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string
          lesson_id: string | null
          metadata: Json
          mime_type: string
          normalized_name: string
          object_path: string | null
          original_name: string
          owner_user_id: string
          processing_started_at: string | null
          published_at: string | null
          purpose: Database["public"]["Enums"]["asset_purpose"]
          size_bytes: number
          state: Database["public"]["Enums"]["asset_state"]
          updated_at: string
          uploaded_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "assets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      archive_module: {
        Args: { p_expected_version: number; p_module_id: string }
        Returns: {
          archived_at: string | null
          course_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          descricao: string | null
          drip_delay_days: number | null
          duplicated_from_module_id: string | null
          id: string
          obrigatorio: boolean
          ordem: number
          preview_enabled: boolean
          release_at: string | null
          release_mode: Database["public"]["Enums"]["curriculum_release_mode"]
          status: Database["public"]["Enums"]["curriculum_item_status"]
          titulo: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "modulos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      attach_digital_product_deliverable: {
        Args: { p_asset_id: string; p_payload: Json; p_product_id: string }
        Returns: {
          asset_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          position: number
          product_id: string
          required: boolean
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "digital_product_deliverables"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      claim_checkout_provider_request: {
        Args: {
          p_intent_id: string
          p_lease_seconds?: number
          p_user_id: string
        }
        Returns: Json
      }
      complete_checkout_provider_request: {
        Args: {
          p_expires_at: string
          p_intent_id: string
          p_provider_checkout_id: string
          p_provider_checkout_url: string
          p_request_token: string
          p_user_id: string
        }
        Returns: {
          amount_cents: number
          created_at: string
          currency_code: string
          expires_at: string | null
          failure_code: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string
          item_snapshot: Json
          license_id: string | null
          provider: string
          provider_checkout_id: string | null
          provider_checkout_url: string | null
          provider_request_started_at: string | null
          provider_request_token: string | null
          status: Database["public"]["Enums"]["checkout_intent_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["checkout_subject_type"]
          title_snapshot: string
          updated_at: string
          user_id: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "checkout_intents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_asset_upload: {
        Args: { p_asset_id: string }
        Returns: {
          bucket_id: string
          checksum_sha256: string | null
          created_at: string
          created_by_user_id: string
          deleted_at: string | null
          extension: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string
          lesson_id: string | null
          metadata: Json
          mime_type: string
          normalized_name: string
          object_path: string | null
          original_name: string
          owner_user_id: string
          processing_started_at: string | null
          published_at: string | null
          purpose: Database["public"]["Enums"]["asset_purpose"]
          size_bytes: number
          state: Database["public"]["Enums"]["asset_state"]
          updated_at: string
          uploaded_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "assets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      confirm_course_purchase: {
        Args: {
          p_confirmed_at: string
          p_course_id: string
          p_expires_at?: string
          p_source_reference: string
          p_starts_at?: string
          p_user_id: string
        }
        Returns: {
          course_id: string
          created_at: string
          expires_at: string | null
          granted_by_user_id: string | null
          id: string
          payment_confirmed_at: string | null
          revoked_at: string | null
          source: Database["public"]["Enums"]["enrollment_source"]
          source_reference: string | null
          starts_at: string
          status: Database["public"]["Enums"]["enrollment_status"]
          status_reason: string | null
          suspended_at: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "enrollments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_assessment: {
        Args: { p_payload: Json }
        Returns: {
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          course_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          lesson_id: string | null
          max_attempts: number
          module_id: string | null
          passing_score: number
          published_at: string | null
          required: boolean
          scope: Database["public"]["Enums"]["assessment_scope"]
          show_correct_answers: boolean
          shuffle_options: boolean
          shuffle_questions: boolean
          status: Database["public"]["Enums"]["assessment_status"]
          time_limit_minutes: number | null
          title: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "assessments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_assessment_question: {
        Args: {
          p_assessment_id: string
          p_expected_assessment_version: number
          p_payload: Json
        }
        Returns: {
          archived_at: string | null
          assessment_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          explanation: string | null
          id: string
          ordem: number
          points: number
          prompt: string
          published_at: string | null
          question_type: Database["public"]["Enums"]["assessment_question_type"]
          required: boolean
          status: Database["public"]["Enums"]["assessment_status"]
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "assessment_questions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_course: {
        Args: { p_payload: Json }
        Returns: {
          access_duration_days: number | null
          affiliate_eligible: boolean
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          category: string | null
          certificate_enabled: boolean
          certificate_min_completion_percent: number
          completion_mode: Database["public"]["Enums"]["course_completion_mode"]
          completion_required_percent: number
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          drip_interval_days: number | null
          duplicated_from_course_id: string | null
          id: string
          language_code: string
          level: Database["public"]["Enums"]["course_level"]
          objectives: string[]
          prerequisites: string[]
          preview_enabled: boolean
          price_amount: number
          promotion_ends_at: string | null
          promotion_starts_at: string | null
          promotional_price_amount: number | null
          published_at: string | null
          release_at: string | null
          release_mode: Database["public"]["Enums"]["course_release_mode"]
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          thumbnail_asset_id: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "courses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_digital_product: {
        Args: { p_payload: Json }
        Returns: {
          affiliate_eligible: boolean
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          category: string | null
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          id: string
          price_amount: number
          promotion_ends_at: string | null
          promotion_starts_at: string | null
          promotional_price_amount: number | null
          published_at: string | null
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["digital_product_status"]
          thumbnail_asset_id: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "digital_products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_digital_product_license: {
        Args: { p_payload: Json; p_product_id: string }
        Returns: {
          archived_at: string | null
          created_at: string
          created_by_user_id: string | null
          id: string
          is_default: boolean
          kind: Database["public"]["Enums"]["digital_license_kind"]
          product_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["digital_license_status"]
          summary: string | null
          terms_text: string
          title: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "digital_product_licenses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_lesson: {
        Args: { p_module_id: string; p_payload: Json }
        Returns: {
          archived_at: string | null
          audio_asset_id: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          completion_mode: Database["public"]["Enums"]["lesson_completion_mode"]
          completion_percent: number | null
          content_kind: Database["public"]["Enums"]["lesson_content_kind"]
          conteudo_texto: string | null
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          descricao: string | null
          drip_delay_days: number | null
          duplicated_from_lesson_id: string | null
          duracao: number | null
          id: string
          modulo_id: string
          obrigatoria: boolean
          ordem: number
          preview_enabled: boolean
          release_at: string | null
          release_mode: Database["public"]["Enums"]["curriculum_release_mode"]
          status: Database["public"]["Enums"]["curriculum_item_status"]
          titulo: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "aulas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_module: {
        Args: { p_course_id: string; p_payload: Json }
        Returns: {
          archived_at: string | null
          course_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          descricao: string | null
          drip_delay_days: number | null
          duplicated_from_module_id: string | null
          id: string
          obrigatorio: boolean
          ordem: number
          preview_enabled: boolean
          release_at: string | null
          release_mode: Database["public"]["Enums"]["curriculum_release_mode"]
          status: Database["public"]["Enums"]["curriculum_item_status"]
          titulo: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "modulos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_assessment: {
        Args: { p_assessment_id: string; p_expected_version: number }
        Returns: boolean
      }
      delete_assessment_question: {
        Args: { p_expected_version: number; p_question_id: string }
        Returns: boolean
      }
      delete_course: {
        Args: { p_course_id: string; p_expected_version: number }
        Returns: {
          access_duration_days: number | null
          affiliate_eligible: boolean
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          category: string | null
          certificate_enabled: boolean
          certificate_min_completion_percent: number
          completion_mode: Database["public"]["Enums"]["course_completion_mode"]
          completion_required_percent: number
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          drip_interval_days: number | null
          duplicated_from_course_id: string | null
          id: string
          language_code: string
          level: Database["public"]["Enums"]["course_level"]
          objectives: string[]
          prerequisites: string[]
          preview_enabled: boolean
          price_amount: number
          promotion_ends_at: string | null
          promotion_starts_at: string | null
          promotional_price_amount: number | null
          published_at: string | null
          release_at: string | null
          release_mode: Database["public"]["Enums"]["course_release_mode"]
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          thumbnail_asset_id: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "courses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_digital_product: {
        Args: { p_expected_version: number; p_product_id: string }
        Returns: boolean
      }
      delete_lesson: {
        Args: { p_expected_version: number; p_lesson_id: string }
        Returns: boolean
      }
      delete_module: {
        Args: { p_expected_version: number; p_module_id: string }
        Returns: boolean
      }
      disable_lesson_media: { Args: { p_lesson_id: string }; Returns: boolean }
      duplicate_course: {
        Args: { p_course_id: string; p_slug: string; p_title: string }
        Returns: {
          access_duration_days: number | null
          affiliate_eligible: boolean
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          category: string | null
          certificate_enabled: boolean
          certificate_min_completion_percent: number
          completion_mode: Database["public"]["Enums"]["course_completion_mode"]
          completion_required_percent: number
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          drip_interval_days: number | null
          duplicated_from_course_id: string | null
          id: string
          language_code: string
          level: Database["public"]["Enums"]["course_level"]
          objectives: string[]
          prerequisites: string[]
          preview_enabled: boolean
          price_amount: number
          promotion_ends_at: string | null
          promotion_starts_at: string | null
          promotional_price_amount: number | null
          published_at: string | null
          release_at: string | null
          release_mode: Database["public"]["Enums"]["course_release_mode"]
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          thumbnail_asset_id: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "courses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      duplicate_lesson: {
        Args: { p_lesson_id: string; p_title: string }
        Returns: {
          archived_at: string | null
          audio_asset_id: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          completion_mode: Database["public"]["Enums"]["lesson_completion_mode"]
          completion_percent: number | null
          content_kind: Database["public"]["Enums"]["lesson_content_kind"]
          conteudo_texto: string | null
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          descricao: string | null
          drip_delay_days: number | null
          duplicated_from_lesson_id: string | null
          duracao: number | null
          id: string
          modulo_id: string
          obrigatoria: boolean
          ordem: number
          preview_enabled: boolean
          release_at: string | null
          release_mode: Database["public"]["Enums"]["curriculum_release_mode"]
          status: Database["public"]["Enums"]["curriculum_item_status"]
          titulo: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "aulas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      duplicate_module: {
        Args: { p_module_id: string; p_title: string }
        Returns: {
          archived_at: string | null
          course_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          descricao: string | null
          drip_delay_days: number | null
          duplicated_from_module_id: string | null
          id: string
          obrigatorio: boolean
          ordem: number
          preview_enabled: boolean
          release_at: string | null
          release_mode: Database["public"]["Enums"]["curriculum_release_mode"]
          status: Database["public"]["Enums"]["curriculum_item_status"]
          titulo: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "modulos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fail_asset_upload: {
        Args: {
          p_asset_id: string
          p_object_removed?: boolean
          p_reason: string
        }
        Returns: {
          bucket_id: string
          checksum_sha256: string | null
          created_at: string
          created_by_user_id: string
          deleted_at: string | null
          extension: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string
          lesson_id: string | null
          metadata: Json
          mime_type: string
          normalized_name: string
          object_path: string | null
          original_name: string
          owner_user_id: string
          processing_started_at: string | null
          published_at: string | null
          purpose: Database["public"]["Enums"]["asset_purpose"]
          size_bytes: number
          state: Database["public"]["Enums"]["asset_state"]
          updated_at: string
          uploaded_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "assets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fail_checkout_provider_request: {
        Args: {
          p_failure_code: string
          p_failure_reason: string
          p_intent_id: string
          p_request_token: string
          p_user_id: string
        }
        Returns: {
          amount_cents: number
          created_at: string
          currency_code: string
          expires_at: string | null
          failure_code: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string
          item_snapshot: Json
          license_id: string | null
          provider: string
          provider_checkout_id: string | null
          provider_checkout_url: string | null
          provider_request_started_at: string | null
          provider_request_token: string | null
          status: Database["public"]["Enums"]["checkout_intent_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["checkout_subject_type"]
          title_snapshot: string
          updated_at: string
          user_id: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "checkout_intents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_assessment_attempt_result: {
        Args: { p_attempt_id: string }
        Returns: Json
      }
      grant_asset_access: {
        Args: { p_asset_id: string; p_expires_at?: string; p_user_id: string }
        Returns: {
          asset_id: string
          created_at: string
          enrollment_id: string | null
          expires_at: string | null
          granted_by_user_id: string
          id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "asset_access_grants"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      grant_course_enrollment: {
        Args: {
          p_course_id: string
          p_expires_at?: string
          p_reason?: string
          p_starts_at?: string
          p_user_id: string
        }
        Returns: {
          course_id: string
          created_at: string
          expires_at: string | null
          granted_by_user_id: string | null
          id: string
          payment_confirmed_at: string | null
          revoked_at: string | null
          source: Database["public"]["Enums"]["enrollment_source"]
          source_reference: string | null
          starts_at: string
          status: Database["public"]["Enums"]["enrollment_status"]
          status_reason: string | null
          suspended_at: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "enrollments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      grant_digital_product_access: {
        Args: {
          p_expires_at?: string
          p_license_id: string
          p_product_id: string
          p_reason?: string
          p_source: Database["public"]["Enums"]["digital_product_access_source"]
          p_source_reference?: string
          p_user_id: string
        }
        Returns: {
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by_user_id: string | null
          id: string
          license_id: string
          license_snapshot: Json
          product_id: string
          revocation_reason: string | null
          revoked_at: string | null
          source: Database["public"]["Enums"]["digital_product_access_source"]
          source_reference: string | null
          status: Database["public"]["Enums"]["digital_product_access_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "digital_product_accesses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      move_lesson: {
        Args: {
          p_expected_lesson_version: number
          p_expected_source_module_version: number
          p_expected_target_module_version: number
          p_lesson_id: string
          p_target_module_id: string
        }
        Returns: {
          archived_at: string | null
          audio_asset_id: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          completion_mode: Database["public"]["Enums"]["lesson_completion_mode"]
          completion_percent: number | null
          content_kind: Database["public"]["Enums"]["lesson_content_kind"]
          conteudo_texto: string | null
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          descricao: string | null
          drip_delay_days: number | null
          duplicated_from_lesson_id: string | null
          duracao: number | null
          id: string
          modulo_id: string
          obrigatoria: boolean
          ordem: number
          preview_enabled: boolean
          release_at: string | null
          release_mode: Database["public"]["Enums"]["curriculum_release_mode"]
          status: Database["public"]["Enums"]["curriculum_item_status"]
          titulo: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "aulas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      prepare_asset_upload: {
        Args: {
          p_idempotency_key: string
          p_lesson_id?: string
          p_mime_type: string
          p_original_name: string
          p_purpose: Database["public"]["Enums"]["asset_purpose"]
          p_size_bytes: number
        }
        Returns: {
          bucket_id: string
          checksum_sha256: string | null
          created_at: string
          created_by_user_id: string
          deleted_at: string | null
          extension: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string
          lesson_id: string | null
          metadata: Json
          mime_type: string
          normalized_name: string
          object_path: string | null
          original_name: string
          owner_user_id: string
          processing_started_at: string | null
          published_at: string | null
          purpose: Database["public"]["Enums"]["asset_purpose"]
          size_bytes: number
          state: Database["public"]["Enums"]["asset_state"]
          updated_at: string
          uploaded_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "assets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      prepare_checkout_intent: {
        Args: {
          p_idempotency_key: string
          p_license_id: string
          p_subject_id: string
          p_subject_type: Database["public"]["Enums"]["checkout_subject_type"]
        }
        Returns: {
          amount_cents: number
          created_at: string
          currency_code: string
          expires_at: string | null
          failure_code: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string
          item_snapshot: Json
          license_id: string | null
          provider: string
          provider_checkout_id: string | null
          provider_checkout_url: string | null
          provider_request_started_at: string | null
          provider_request_token: string | null
          status: Database["public"]["Enums"]["checkout_intent_status"]
          subject_id: string
          subject_type: Database["public"]["Enums"]["checkout_subject_type"]
          title_snapshot: string
          updated_at: string
          user_id: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "checkout_intents"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      process_asaas_payment_webhook: {
        Args: { p_event_id: string; p_event_type: string; p_payload: Json }
        Returns: Json
      }
      publish_assessment: {
        Args: { p_assessment_id: string; p_expected_version: number }
        Returns: {
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          course_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          lesson_id: string | null
          max_attempts: number
          module_id: string | null
          passing_score: number
          published_at: string | null
          required: boolean
          scope: Database["public"]["Enums"]["assessment_scope"]
          show_correct_answers: boolean
          shuffle_options: boolean
          shuffle_questions: boolean
          status: Database["public"]["Enums"]["assessment_status"]
          time_limit_minutes: number | null
          title: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "assessments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_course: {
        Args: { p_course_id: string; p_expected_version: number }
        Returns: {
          access_duration_days: number | null
          affiliate_eligible: boolean
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          category: string | null
          certificate_enabled: boolean
          certificate_min_completion_percent: number
          completion_mode: Database["public"]["Enums"]["course_completion_mode"]
          completion_required_percent: number
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          drip_interval_days: number | null
          duplicated_from_course_id: string | null
          id: string
          language_code: string
          level: Database["public"]["Enums"]["course_level"]
          objectives: string[]
          prerequisites: string[]
          preview_enabled: boolean
          price_amount: number
          promotion_ends_at: string | null
          promotion_starts_at: string | null
          promotional_price_amount: number | null
          published_at: string | null
          release_at: string | null
          release_mode: Database["public"]["Enums"]["course_release_mode"]
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          thumbnail_asset_id: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "courses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_digital_product: {
        Args: { p_expected_version: number; p_product_id: string }
        Returns: {
          affiliate_eligible: boolean
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          category: string | null
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          id: string
          price_amount: number
          promotion_ends_at: string | null
          promotion_starts_at: string | null
          promotional_price_amount: number | null
          published_at: string | null
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["digital_product_status"]
          thumbnail_asset_id: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "digital_products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      publish_digital_product_license: {
        Args: { p_license_id: string }
        Returns: {
          archived_at: string | null
          created_at: string
          created_by_user_id: string | null
          id: string
          is_default: boolean
          kind: Database["public"]["Enums"]["digital_license_kind"]
          product_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["digital_license_status"]
          summary: string | null
          terms_text: string
          title: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "digital_product_licenses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      remove_digital_product_deliverable: {
        Args: { p_deliverable_id: string; p_expected_product_version: number }
        Returns: boolean
      }
      renew_course_enrollment: {
        Args: { p_enrollment_id: string; p_expires_at: string }
        Returns: {
          course_id: string
          created_at: string
          expires_at: string | null
          granted_by_user_id: string | null
          id: string
          payment_confirmed_at: string | null
          revoked_at: string | null
          source: Database["public"]["Enums"]["enrollment_source"]
          source_reference: string | null
          starts_at: string
          status: Database["public"]["Enums"]["enrollment_status"]
          status_reason: string | null
          suspended_at: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "enrollments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reorder_assessment_questions: {
        Args: {
          p_assessment_id: string
          p_expected_assessment_version: number
          p_items: Json
        }
        Returns: {
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          course_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          lesson_id: string | null
          max_attempts: number
          module_id: string | null
          passing_score: number
          published_at: string | null
          required: boolean
          scope: Database["public"]["Enums"]["assessment_scope"]
          show_correct_answers: boolean
          shuffle_options: boolean
          shuffle_questions: boolean
          status: Database["public"]["Enums"]["assessment_status"]
          time_limit_minutes: number | null
          title: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "assessments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reorder_digital_product_deliverables: {
        Args: {
          p_expected_product_version: number
          p_items: Json
          p_product_id: string
        }
        Returns: {
          affiliate_eligible: boolean
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          category: string | null
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          id: string
          price_amount: number
          promotion_ends_at: string | null
          promotion_starts_at: string | null
          promotional_price_amount: number | null
          published_at: string | null
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["digital_product_status"]
          thumbnail_asset_id: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "digital_products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reorder_lessons: {
        Args: {
          p_expected_module_version: number
          p_items: Json
          p_module_id: string
        }
        Returns: {
          archived_at: string | null
          course_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          descricao: string | null
          drip_delay_days: number | null
          duplicated_from_module_id: string | null
          id: string
          obrigatorio: boolean
          ordem: number
          preview_enabled: boolean
          release_at: string | null
          release_mode: Database["public"]["Enums"]["curriculum_release_mode"]
          status: Database["public"]["Enums"]["curriculum_item_status"]
          titulo: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "modulos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reorder_modules: {
        Args: {
          p_course_id: string
          p_expected_course_version: number
          p_items: Json
        }
        Returns: {
          access_duration_days: number | null
          affiliate_eligible: boolean
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          category: string | null
          certificate_enabled: boolean
          certificate_min_completion_percent: number
          completion_mode: Database["public"]["Enums"]["course_completion_mode"]
          completion_required_percent: number
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          drip_interval_days: number | null
          duplicated_from_course_id: string | null
          id: string
          language_code: string
          level: Database["public"]["Enums"]["course_level"]
          objectives: string[]
          prerequisites: string[]
          preview_enabled: boolean
          price_amount: number
          promotion_ends_at: string | null
          promotion_starts_at: string | null
          promotional_price_amount: number | null
          published_at: string | null
          release_at: string | null
          release_mode: Database["public"]["Enums"]["course_release_mode"]
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          thumbnail_asset_id: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "courses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      request_lesson_playback_token: {
        Args: { p_fingerprint_hash: string; p_lesson_id: string }
        Returns: {
          expires_at: string
          granted: boolean
          provider: Database["public"]["Enums"]["lesson_media_provider"]
          reason: string
          token: string
          watermark_text: string
        }[]
      }
      resolve_lesson_playback_token: {
        Args: { p_fingerprint_hash: string; p_token: string }
        Returns: {
          bucket_id: string
          embed_url: string
          expires_at: string
          granted: boolean
          mime_type: string
          object_path: string
          provider: Database["public"]["Enums"]["lesson_media_provider"]
          reason: string
          watermark_text: string
        }[]
      }
      revoke_asset_access: {
        Args: { p_asset_id: string; p_user_id: string }
        Returns: boolean
      }
      revoke_course_enrollment: {
        Args: { p_enrollment_id: string; p_reason: string }
        Returns: {
          course_id: string
          created_at: string
          expires_at: string | null
          granted_by_user_id: string | null
          id: string
          payment_confirmed_at: string | null
          revoked_at: string | null
          source: Database["public"]["Enums"]["enrollment_source"]
          source_reference: string | null
          starts_at: string
          status: Database["public"]["Enums"]["enrollment_status"]
          status_reason: string | null
          suspended_at: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "enrollments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_digital_product_access: {
        Args: { p_access_id: string; p_reason: string }
        Returns: {
          created_at: string
          expires_at: string | null
          granted_at: string
          granted_by_user_id: string | null
          id: string
          license_id: string
          license_snapshot: Json
          product_id: string
          revocation_reason: string | null
          revoked_at: string | null
          source: Database["public"]["Enums"]["digital_product_access_source"]
          source_reference: string | null
          status: Database["public"]["Enums"]["digital_product_access_status"]
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "digital_product_accesses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      revoke_lesson_playback_token: {
        Args: { p_token: string }
        Returns: boolean
      }
      save_assessment_answer: {
        Args: {
          p_attempt_id: string
          p_question_id: string
          p_selected_option_ids: string[]
        }
        Returns: {
          answered_at: string
          attempt_id: string
          question_id: string
          selected_option_ids: string[]
        }
        SetofOptions: {
          from: "*"
          to: "assessment_answers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_lesson_progress_event: {
        Args: {
          p_client_instance_id: string
          p_duration_seconds: number
          p_event_id: string
          p_event_sequence: number
          p_event_type: Database["public"]["Enums"]["lesson_progress_event_type"]
          p_lesson_id: string
          p_observed_at: string
          p_position_seconds: number
        }
        Returns: {
          aula_id: string
          completada: boolean
          created_at: string
          id: string
          last_client_instance_id: string | null
          last_event_id: string | null
          last_event_received_at: string | null
          progresso_percentual: number
          revision: number
          tempo_assistido: number
          ultima_visualizacao: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "progresso_aulas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_lesson_prerequisites: {
        Args: {
          p_expected_version: number
          p_lesson_id: string
          p_prerequisite_ids: string[]
        }
        Returns: {
          archived_at: string | null
          audio_asset_id: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          completion_mode: Database["public"]["Enums"]["lesson_completion_mode"]
          completion_percent: number | null
          content_kind: Database["public"]["Enums"]["lesson_content_kind"]
          conteudo_texto: string | null
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          descricao: string | null
          drip_delay_days: number | null
          duplicated_from_lesson_id: string | null
          duracao: number | null
          id: string
          modulo_id: string
          obrigatoria: boolean
          ordem: number
          preview_enabled: boolean
          release_at: string | null
          release_mode: Database["public"]["Enums"]["curriculum_release_mode"]
          status: Database["public"]["Enums"]["curriculum_item_status"]
          titulo: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "aulas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_module_prerequisites: {
        Args: {
          p_expected_version: number
          p_module_id: string
          p_prerequisite_ids: string[]
        }
        Returns: {
          archived_at: string | null
          course_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          descricao: string | null
          drip_delay_days: number | null
          duplicated_from_module_id: string | null
          id: string
          obrigatorio: boolean
          ordem: number
          preview_enabled: boolean
          release_at: string | null
          release_mode: Database["public"]["Enums"]["curriculum_release_mode"]
          status: Database["public"]["Enums"]["curriculum_item_status"]
          titulo: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "modulos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_assessment_attempt: {
        Args: { p_assessment_id: string }
        Returns: {
          assessment_id: string
          assessment_version: number
          attempt_number: number
          created_at: string
          earned_points: number | null
          enrollment_id: string
          expires_at: string | null
          graded_at: string | null
          id: string
          passed: boolean | null
          passing_score: number
          question_snapshot: Json
          score_percent: number | null
          show_correct_answers: boolean
          started_at: string
          status: Database["public"]["Enums"]["assessment_attempt_status"]
          submitted_at: string | null
          total_points: number | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "assessment_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_assessment_attempt: {
        Args: { p_attempt_id: string }
        Returns: {
          assessment_id: string
          assessment_version: number
          attempt_number: number
          created_at: string
          earned_points: number | null
          enrollment_id: string
          expires_at: string | null
          graded_at: string | null
          id: string
          passed: boolean | null
          passing_score: number
          question_snapshot: Json
          score_percent: number | null
          show_correct_answers: boolean
          started_at: string
          status: Database["public"]["Enums"]["assessment_attempt_status"]
          submitted_at: string | null
          total_points: number | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "assessment_attempts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      suspend_course_enrollment: {
        Args: { p_enrollment_id: string; p_reason: string }
        Returns: {
          course_id: string
          created_at: string
          expires_at: string | null
          granted_by_user_id: string | null
          id: string
          payment_confirmed_at: string | null
          revoked_at: string | null
          source: Database["public"]["Enums"]["enrollment_source"]
          source_reference: string | null
          starts_at: string
          status: Database["public"]["Enums"]["enrollment_status"]
          status_reason: string | null
          suspended_at: string | null
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "enrollments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transition_asset_state: {
        Args: {
          p_asset_id: string
          p_target_state: Database["public"]["Enums"]["asset_state"]
        }
        Returns: {
          bucket_id: string
          checksum_sha256: string | null
          created_at: string
          created_by_user_id: string
          deleted_at: string | null
          extension: string
          failed_at: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string
          lesson_id: string | null
          metadata: Json
          mime_type: string
          normalized_name: string
          object_path: string | null
          original_name: string
          owner_user_id: string
          processing_started_at: string | null
          published_at: string | null
          purpose: Database["public"]["Enums"]["asset_purpose"]
          size_bytes: number
          state: Database["public"]["Enums"]["asset_state"]
          updated_at: string
          uploaded_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "assets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unpublish_assessment: {
        Args: { p_assessment_id: string; p_expected_version: number }
        Returns: {
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          course_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          lesson_id: string | null
          max_attempts: number
          module_id: string | null
          passing_score: number
          published_at: string | null
          required: boolean
          scope: Database["public"]["Enums"]["assessment_scope"]
          show_correct_answers: boolean
          shuffle_options: boolean
          shuffle_questions: boolean
          status: Database["public"]["Enums"]["assessment_status"]
          time_limit_minutes: number | null
          title: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "assessments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unpublish_course: {
        Args: { p_course_id: string; p_expected_version: number }
        Returns: {
          access_duration_days: number | null
          affiliate_eligible: boolean
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          category: string | null
          certificate_enabled: boolean
          certificate_min_completion_percent: number
          completion_mode: Database["public"]["Enums"]["course_completion_mode"]
          completion_required_percent: number
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          drip_interval_days: number | null
          duplicated_from_course_id: string | null
          id: string
          language_code: string
          level: Database["public"]["Enums"]["course_level"]
          objectives: string[]
          prerequisites: string[]
          preview_enabled: boolean
          price_amount: number
          promotion_ends_at: string | null
          promotion_starts_at: string | null
          promotional_price_amount: number | null
          published_at: string | null
          release_at: string | null
          release_mode: Database["public"]["Enums"]["course_release_mode"]
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          thumbnail_asset_id: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "courses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unpublish_digital_product: {
        Args: { p_expected_version: number; p_product_id: string }
        Returns: {
          affiliate_eligible: boolean
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          category: string | null
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          id: string
          price_amount: number
          promotion_ends_at: string | null
          promotion_starts_at: string | null
          promotional_price_amount: number | null
          published_at: string | null
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["digital_product_status"]
          thumbnail_asset_id: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "digital_products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_assessment: {
        Args: {
          p_assessment_id: string
          p_expected_version: number
          p_payload: Json
        }
        Returns: {
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          course_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          lesson_id: string | null
          max_attempts: number
          module_id: string | null
          passing_score: number
          published_at: string | null
          required: boolean
          scope: Database["public"]["Enums"]["assessment_scope"]
          show_correct_answers: boolean
          shuffle_options: boolean
          shuffle_questions: boolean
          status: Database["public"]["Enums"]["assessment_status"]
          time_limit_minutes: number | null
          title: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "assessments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_assessment_question: {
        Args: {
          p_expected_question_version: number
          p_payload: Json
          p_question_id: string
        }
        Returns: {
          archived_at: string | null
          assessment_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          explanation: string | null
          id: string
          ordem: number
          points: number
          prompt: string
          published_at: string | null
          question_type: Database["public"]["Enums"]["assessment_question_type"]
          required: boolean
          status: Database["public"]["Enums"]["assessment_status"]
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "assessment_questions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_course: {
        Args: { p_course_id: string; p_expected_version: number; p_patch: Json }
        Returns: {
          access_duration_days: number | null
          affiliate_eligible: boolean
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          category: string | null
          certificate_enabled: boolean
          certificate_min_completion_percent: number
          completion_mode: Database["public"]["Enums"]["course_completion_mode"]
          completion_required_percent: number
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          drip_interval_days: number | null
          duplicated_from_course_id: string | null
          id: string
          language_code: string
          level: Database["public"]["Enums"]["course_level"]
          objectives: string[]
          prerequisites: string[]
          preview_enabled: boolean
          price_amount: number
          promotion_ends_at: string | null
          promotion_starts_at: string | null
          promotional_price_amount: number | null
          published_at: string | null
          release_at: string | null
          release_mode: Database["public"]["Enums"]["course_release_mode"]
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          thumbnail_asset_id: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "courses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_digital_product: {
        Args: {
          p_expected_version: number
          p_patch: Json
          p_product_id: string
        }
        Returns: {
          affiliate_eligible: boolean
          archived_at: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          category: string | null
          cover_asset_id: string | null
          created_at: string
          created_by_user_id: string | null
          currency_code: string
          deleted_at: string | null
          description: string | null
          id: string
          price_amount: number
          promotion_ends_at: string | null
          promotion_starts_at: string | null
          promotional_price_amount: number | null
          published_at: string | null
          short_description: string | null
          slug: string
          status: Database["public"]["Enums"]["digital_product_status"]
          thumbnail_asset_id: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "digital_products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_digital_product_deliverable: {
        Args: {
          p_deliverable_id: string
          p_expected_product_version: number
          p_patch: Json
        }
        Returns: {
          asset_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          description: string | null
          id: string
          position: number
          product_id: string
          required: boolean
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "digital_product_deliverables"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_lesson: {
        Args: {
          p_expected_version: number
          p_lesson_id: string
          p_payload: Json
        }
        Returns: {
          archived_at: string | null
          audio_asset_id: string | null
          availability_ends_at: string | null
          availability_starts_at: string | null
          completion_mode: Database["public"]["Enums"]["lesson_completion_mode"]
          completion_percent: number | null
          content_kind: Database["public"]["Enums"]["lesson_content_kind"]
          conteudo_texto: string | null
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          descricao: string | null
          drip_delay_days: number | null
          duplicated_from_lesson_id: string | null
          duracao: number | null
          id: string
          modulo_id: string
          obrigatoria: boolean
          ordem: number
          preview_enabled: boolean
          release_at: string | null
          release_mode: Database["public"]["Enums"]["curriculum_release_mode"]
          status: Database["public"]["Enums"]["curriculum_item_status"]
          titulo: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "aulas"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_module: {
        Args: {
          p_expected_version: number
          p_module_id: string
          p_payload: Json
        }
        Returns: {
          archived_at: string | null
          course_id: string
          created_at: string
          created_by_user_id: string | null
          deleted_at: string | null
          descricao: string | null
          drip_delay_days: number | null
          duplicated_from_module_id: string | null
          id: string
          obrigatorio: boolean
          ordem: number
          preview_enabled: boolean
          release_at: string | null
          release_mode: Database["public"]["Enums"]["curriculum_release_mode"]
          status: Database["public"]["Enums"]["curriculum_item_status"]
          titulo: string
          updated_at: string
          updated_by_user_id: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "modulos"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_external_lesson_media: {
        Args: {
          p_lesson_id: string
          p_provider: Database["public"]["Enums"]["lesson_media_provider"]
          p_source_url: string
          p_watermark_enabled?: boolean
        }
        Returns: {
          asset_id: string | null
          created_at: string
          created_by_user_id: string
          external_video_id: string | null
          id: string
          is_active: boolean
          lesson_id: string
          provider: Database["public"]["Enums"]["lesson_media_provider"]
          updated_at: string
          watermark_enabled: boolean
        }
        SetofOptions: {
          from: "*"
          to: "lesson_media"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_private_lesson_media: {
        Args: {
          p_asset_id: string
          p_lesson_id: string
          p_watermark_enabled?: boolean
        }
        Returns: {
          asset_id: string | null
          created_at: string
          created_by_user_id: string
          external_video_id: string | null
          id: string
          is_active: boolean
          lesson_id: string
          provider: Database["public"]["Enums"]["lesson_media_provider"]
          updated_at: string
          watermark_enabled: boolean
        }
        SetofOptions: {
          from: "*"
          to: "lesson_media"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "aluno" | "afiliado" | "administrador_proprietario"
      assessment_attempt_status:
        | "in_progress"
        | "graded"
        | "expired"
        | "cancelled"
      assessment_event_type:
        | "created"
        | "updated"
        | "published"
        | "unpublished"
        | "archived"
        | "deleted"
        | "question_created"
        | "question_updated"
        | "question_archived"
        | "question_deleted"
        | "options_replaced"
        | "questions_reordered"
        | "attempt_started"
        | "answer_saved"
        | "attempt_graded"
        | "attempt_expired"
        | "attempt_cancelled"
      assessment_question_type:
        | "single_choice"
        | "multiple_choice"
        | "true_false"
      assessment_scope: "course" | "module" | "lesson"
      assessment_status: "draft" | "published" | "archived"
      asset_event_type:
        | "intent_created"
        | "upload_confirmed"
        | "processing_started"
        | "published"
        | "failed"
        | "cleanup_requested"
        | "object_removed"
        | "associated"
      asset_purpose:
        | "avatar"
        | "video"
        | "audio"
        | "image"
        | "document"
        | "sample"
        | "preset"
        | "stem"
        | "project"
        | "archive"
        | "template"
        | "support_file"
        | "digital_product"
      asset_state:
        | "pending"
        | "uploaded"
        | "processing"
        | "published"
        | "failed"
      checkout_intent_event_type:
        | "prepared"
        | "provider_claimed"
        | "provider_created"
        | "provider_failed"
        | "expired"
        | "cancelled"
      checkout_intent_status:
        | "prepared"
        | "provider_creating"
        | "checkout_created"
        | "provider_failed"
        | "expired"
        | "cancelled"
      checkout_subject_type: "course" | "digital_product"
      course_completion_mode: "all_required_lessons" | "percentage" | "manual"
      course_editor_event_type:
        | "created"
        | "updated"
        | "duplicated"
        | "published"
        | "unpublished"
        | "archived"
        | "deleted"
      course_level: "beginner" | "intermediate" | "advanced" | "all_levels"
      course_release_mode: "immediate" | "scheduled" | "drip"
      course_status: "draft" | "published" | "archived"
      curriculum_editor_event_type:
        | "created"
        | "updated"
        | "duplicated"
        | "reordered"
        | "moved"
        | "archived"
        | "deleted"
        | "prerequisites_updated"
        | "media_updated"
        | "material_archived"
      curriculum_entity_type: "module" | "lesson"
      curriculum_item_status: "draft" | "published" | "archived"
      curriculum_release_mode:
        | "immediate"
        | "scheduled"
        | "drip"
        | "after_prerequisites"
      digital_license_kind: "personal" | "commercial" | "extended" | "custom"
      digital_license_status: "draft" | "published" | "archived"
      digital_product_access_source:
        | "manual_grant"
        | "complimentary"
        | "purchase"
      digital_product_access_status: "active" | "revoked"
      digital_product_event_type:
        | "created"
        | "updated"
        | "published"
        | "unpublished"
        | "archived"
        | "deleted"
        | "deliverable_attached"
        | "deliverable_updated"
        | "deliverable_removed"
        | "license_created"
        | "license_published"
        | "license_archived"
        | "access_granted"
        | "access_revoked"
      digital_product_status: "draft" | "published" | "archived"
      enrollment_event_type:
        | "created"
        | "payment_confirmed"
        | "activated"
        | "renewed"
        | "suspended"
        | "revoked"
        | "access_denied"
      enrollment_source: "manual_grant" | "purchase"
      enrollment_status: "pending" | "active" | "suspended" | "revoked"
      lesson_completion_mode:
        | "manual"
        | "media_progress"
        | "reading_acknowledgement"
        | "any_activity"
      lesson_content_kind: "text" | "video" | "audio" | "mixed"
      lesson_media_provider: "private_asset" | "youtube" | "vimeo"
      lesson_progress_event_type:
        | "heartbeat"
        | "pause"
        | "ended"
        | "manual_complete"
        | "reading_acknowledgement"
        | "visibility_hidden"
      payment_attempt_status:
        | "checkout_created"
        | "pending"
        | "confirmed"
        | "received"
        | "failed"
        | "expired"
        | "cancelled"
        | "refund_pending"
        | "refunded"
        | "chargeback_pending"
        | "chargeback_dispute"
        | "chargeback_won"
        | "chargeback_lost"
      payment_billing_type: "unknown" | "pix" | "credit_card"
      payment_order_status:
        | "checkout_pending"
        | "payment_pending"
        | "paid"
        | "cancelled"
        | "expired"
        | "refund_pending"
        | "refunded"
        | "chargeback_pending"
        | "chargeback_won"
        | "chargeback_lost"
      payment_provider_event_status:
        | "received"
        | "processed"
        | "ignored"
        | "failed"
      playback_event_type:
        | "issued"
        | "resolved"
        | "denied"
        | "expired"
        | "revoked"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["aluno", "afiliado", "administrador_proprietario"],
      assessment_attempt_status: [
        "in_progress",
        "graded",
        "expired",
        "cancelled",
      ],
      assessment_event_type: [
        "created",
        "updated",
        "published",
        "unpublished",
        "archived",
        "deleted",
        "question_created",
        "question_updated",
        "question_archived",
        "question_deleted",
        "options_replaced",
        "questions_reordered",
        "attempt_started",
        "answer_saved",
        "attempt_graded",
        "attempt_expired",
        "attempt_cancelled",
      ],
      assessment_question_type: [
        "single_choice",
        "multiple_choice",
        "true_false",
      ],
      assessment_scope: ["course", "module", "lesson"],
      assessment_status: ["draft", "published", "archived"],
      asset_event_type: [
        "intent_created",
        "upload_confirmed",
        "processing_started",
        "published",
        "failed",
        "cleanup_requested",
        "object_removed",
        "associated",
      ],
      asset_purpose: [
        "avatar",
        "video",
        "audio",
        "image",
        "document",
        "sample",
        "preset",
        "stem",
        "project",
        "archive",
        "template",
        "support_file",
        "digital_product",
      ],
      asset_state: ["pending", "uploaded", "processing", "published", "failed"],
      checkout_intent_event_type: [
        "prepared",
        "provider_claimed",
        "provider_created",
        "provider_failed",
        "expired",
        "cancelled",
      ],
      checkout_intent_status: [
        "prepared",
        "provider_creating",
        "checkout_created",
        "provider_failed",
        "expired",
        "cancelled",
      ],
      checkout_subject_type: ["course", "digital_product"],
      course_completion_mode: ["all_required_lessons", "percentage", "manual"],
      course_editor_event_type: [
        "created",
        "updated",
        "duplicated",
        "published",
        "unpublished",
        "archived",
        "deleted",
      ],
      course_level: ["beginner", "intermediate", "advanced", "all_levels"],
      course_release_mode: ["immediate", "scheduled", "drip"],
      course_status: ["draft", "published", "archived"],
      curriculum_editor_event_type: [
        "created",
        "updated",
        "duplicated",
        "reordered",
        "moved",
        "archived",
        "deleted",
        "prerequisites_updated",
        "media_updated",
        "material_archived",
      ],
      curriculum_entity_type: ["module", "lesson"],
      curriculum_item_status: ["draft", "published", "archived"],
      curriculum_release_mode: [
        "immediate",
        "scheduled",
        "drip",
        "after_prerequisites",
      ],
      digital_license_kind: ["personal", "commercial", "extended", "custom"],
      digital_license_status: ["draft", "published", "archived"],
      digital_product_access_source: [
        "manual_grant",
        "complimentary",
        "purchase",
      ],
      digital_product_access_status: ["active", "revoked"],
      digital_product_event_type: [
        "created",
        "updated",
        "published",
        "unpublished",
        "archived",
        "deleted",
        "deliverable_attached",
        "deliverable_updated",
        "deliverable_removed",
        "license_created",
        "license_published",
        "license_archived",
        "access_granted",
        "access_revoked",
      ],
      digital_product_status: ["draft", "published", "archived"],
      enrollment_event_type: [
        "created",
        "payment_confirmed",
        "activated",
        "renewed",
        "suspended",
        "revoked",
        "access_denied",
      ],
      enrollment_source: ["manual_grant", "purchase"],
      enrollment_status: ["pending", "active", "suspended", "revoked"],
      lesson_completion_mode: [
        "manual",
        "media_progress",
        "reading_acknowledgement",
        "any_activity",
      ],
      lesson_content_kind: ["text", "video", "audio", "mixed"],
      lesson_media_provider: ["private_asset", "youtube", "vimeo"],
      lesson_progress_event_type: [
        "heartbeat",
        "pause",
        "ended",
        "manual_complete",
        "reading_acknowledgement",
        "visibility_hidden",
      ],
      payment_attempt_status: [
        "checkout_created",
        "pending",
        "confirmed",
        "received",
        "failed",
        "expired",
        "cancelled",
        "refund_pending",
        "refunded",
        "chargeback_pending",
        "chargeback_dispute",
        "chargeback_won",
        "chargeback_lost",
      ],
      payment_billing_type: ["unknown", "pix", "credit_card"],
      payment_order_status: [
        "checkout_pending",
        "payment_pending",
        "paid",
        "cancelled",
        "expired",
        "refund_pending",
        "refunded",
        "chargeback_pending",
        "chargeback_won",
        "chargeback_lost",
      ],
      payment_provider_event_status: [
        "received",
        "processed",
        "ignored",
        "failed",
      ],
      playback_event_type: [
        "issued",
        "resolved",
        "denied",
        "expired",
        "revoked",
      ],
    },
  },
} as const

