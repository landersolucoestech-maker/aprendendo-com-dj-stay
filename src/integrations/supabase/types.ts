export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      aulas: {
        Row: {
          created_at: string
          criado_em: string | null
          descricao: string | null
          duracao: number | null
          id: string
          modulo_id: string | null
          ordem: number
          titulo: string
          updated_at: string
          video: string | null
        }
        Insert: {
          created_at?: string
          criado_em?: string | null
          descricao?: string | null
          duracao?: number | null
          id?: string
          modulo_id?: string | null
          ordem?: number
          titulo: string
          updated_at?: string
          video?: string | null
        }
        Update: {
          created_at?: string
          criado_em?: string | null
          descricao?: string | null
          duracao?: number | null
          id?: string
          modulo_id?: string | null
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
      lesson_files: {
        Row: {
          aula_id: string | null
          created_at: string | null
          id: string
          project_file_path: string | null
          samples_file_path: string | null
          updated_at: string | null
        }
        Insert: {
          aula_id?: string | null
          created_at?: string | null
          id?: string
          project_file_path?: string | null
          samples_file_path?: string | null
          updated_at?: string | null
        }
        Update: {
          aula_id?: string | null
          created_at?: string | null
          id?: string
          project_file_path?: string | null
          samples_file_path?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_files_aula_id_fkey"
            columns: ["aula_id"]
            isOneToOne: false
            referencedRelation: "aulas"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          created_at: string
          criado_em: string | null
          curso_id: string | null
          descricao: string | null
          id: string
          ordem: number
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_em?: string | null
          curso_id?: string | null
          descricao?: string | null
          id?: string
          ordem?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_em?: string | null
          curso_id?: string | null
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
          aula_id: string | null
          completada: boolean | null
          created_at: string
          id: string
          progresso_percentual: number | null
          tempo_assistido: number | null
          ultima_visualizacao: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          aula_id?: string | null
          completada?: boolean | null
          created_at?: string
          id?: string
          progresso_percentual?: number | null
          tempo_assistido?: number | null
          ultima_visualizacao?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          aula_id?: string | null
          completada?: boolean | null
          created_at?: string
          id?: string
          progresso_percentual?: number | null
          tempo_assistido?: number | null
          ultima_visualizacao?: string | null
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
          avatar_url: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          amount: number | null
          created_at: string
          expiry_date: string | null
          id: string
          payment_date: string | null
          payment_method: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          payment_date?: string | null
          payment_method?: string | null
          status?: string
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
      user_has_paid_access: {
        Args: Record<PropertyKey, never> | { user_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
