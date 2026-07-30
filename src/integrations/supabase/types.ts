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
      asset_access_grants: {
        Row: {
          asset_id: string
          created_at: string
          expires_at: string | null
          granted_by_user_id: string
          user_id: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          expires_at?: string | null
          granted_by_user_id: string
          user_id: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          expires_at?: string | null
          granted_by_user_id?: string
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
          created_at: string
          descricao: string | null
          duracao: number | null
          id: string
          modulo_id: string
          ordem: number
          titulo: string
          updated_at: string
          video: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          duracao?: number | null
          id?: string
          modulo_id: string
          ordem?: number
          titulo: string
          updated_at?: string
          video?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          duracao?: number | null
          id?: string
          modulo_id?: string
          ordem?: number
          titulo?: string
          updated_at?: string
          video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "aulas_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          ordem: number
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          ordem?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      progresso_aulas: {
        Row: {
          aula_id: string
          completada: boolean
          created_at: string
          id: string
          progresso_percentual: number
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
          progresso_percentual?: number
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
          progresso_percentual?: number
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
      grant_asset_access: {
        Args: { p_asset_id: string; p_expires_at?: string; p_user_id: string }
        Returns: {
          asset_id: string
          created_at: string
          expires_at: string | null
          granted_by_user_id: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "asset_access_grants"
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
      revoke_asset_access: {
        Args: { p_asset_id: string; p_user_id: string }
        Returns: boolean
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
    }
    Enums: {
      app_role: "aluno" | "afiliado" | "administrador_proprietario"
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
    },
  },
} as const

