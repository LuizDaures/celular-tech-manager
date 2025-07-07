export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          cpf: string | null
          criado_em: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string | null
          telefone: string | null
        }
        Insert: {
          cpf?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
        }
        Update: {
          cpf?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      dados_empresa: {
        Row: {
          cnpj: string | null
          created_at: string | null
          id: string
          logo_base64: string | null
          nome: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          logo_base64?: string | null
          nome?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          id?: string
          logo_base64?: string | null
          nome?: string | null
        }
        Relationships: []
      }
      itens_ordem: {
        Row: {
          id: string
          is_from_estoque: boolean | null
          nome_item: string | null
          ordem_id: string | null
          peca_id: string | null
          preco_unitario: number | null
          quantidade: number | null
        }
        Insert: {
          id?: string
          is_from_estoque?: boolean | null
          nome_item?: string | null
          ordem_id?: string | null
          peca_id?: string | null
          preco_unitario?: number | null
          quantidade?: number | null
        }
        Update: {
          id?: string
          is_from_estoque?: boolean | null
          nome_item?: string | null
          ordem_id?: string | null
          peca_id?: string | null
          preco_unitario?: number | null
          quantidade?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_ordem_ordem_id_fkey"
            columns: ["ordem_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          cliente_id: string | null
          data_abertura: string | null
          data_conclusao: string | null
          descricao_problema: string | null
          diagnostico: string | null
          dispositivo: string | null
          id: string
          servico_realizado: string | null
          status: string | null
          tecnico_id: string | null
          valor: number | null
        }
        Insert: {
          cliente_id?: string | null
          data_abertura?: string | null
          data_conclusao?: string | null
          descricao_problema?: string | null
          diagnostico?: string | null
          dispositivo?: string | null
          id?: string
          servico_realizado?: string | null
          status?: string | null
          tecnico_id?: string | null
          valor?: number | null
        }
        Update: {
          cliente_id?: string | null
          data_abertura?: string | null
          data_conclusao?: string | null
          descricao_problema?: string | null
          diagnostico?: string | null
          dispositivo?: string | null
          id?: string
          servico_realizado?: string | null
          status?: string | null
          tecnico_id?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "tecnicos"
            referencedColumns: ["id"]
          },
        ]
      }
      pecas_manutencao: {
        Row: {
          atualizado_em: string | null
          codigo_fabricante: string | null
          criado_em: string | null
          estoque: number | null
          fabricante: string | null
          id: string
          modelo: string | null
          nome: string | null
          preco_unitario: number | null
        }
        Insert: {
          atualizado_em?: string | null
          codigo_fabricante?: string | null
          criado_em?: string | null
          estoque?: number | null
          fabricante?: string | null
          id?: string
          modelo?: string | null
          nome?: string | null
          preco_unitario?: number | null
        }
        Update: {
          atualizado_em?: string | null
          codigo_fabricante?: string | null
          criado_em?: string | null
          estoque?: number | null
          fabricante?: string | null
          id?: string
          modelo?: string | null
          nome?: string | null
          preco_unitario?: number | null
        }
        Relationships: []
      }
      tecnicos: {
        Row: {
          cpf: string | null
          criado_em: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string | null
          telefone: string | null
        }
        Insert: {
          cpf?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
        }
        Update: {
          cpf?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
