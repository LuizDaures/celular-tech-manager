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
      configuracoes_loja: {
        Row: {
          cor_primaria: string | null
          cor_secundaria: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          nome_loja: string
          tempo_preparo_medio: number | null
          updated_at: string | null
        }
        Insert: {
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nome_loja?: string
          tempo_preparo_medio?: number | null
          updated_at?: string | null
        }
        Update: {
          cor_primaria?: string | null
          cor_secundaria?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nome_loja?: string
          tempo_preparo_medio?: number | null
          updated_at?: string | null
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
      ingredientes: {
        Row: {
          ativo: boolean | null
          categoria: string
          criado_em: string | null
          id: string
          imagem_url: string | null
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          criado_em?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          criado_em?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
        }
        Relationships: []
      }
      itens_ordem: {
        Row: {
          id: string
          nome_item: string | null
          ordem_id: string | null
          peca_id: string | null
          preco_unitario: number | null
          quantidade: number | null
        }
        Insert: {
          id?: string
          nome_item?: string | null
          ordem_id?: string | null
          peca_id?: string | null
          preco_unitario?: number | null
          quantidade?: number | null
        }
        Update: {
          id?: string
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
      pedidos: {
        Row: {
          atualizado_em: string | null
          cliente_endereco: string | null
          cliente_nome: string
          cliente_telefone: string
          criado_em: string | null
          id: string
          itens: Json
          numero_pedido: string
          observacoes: string | null
          status: string
          valor_total: number
        }
        Insert: {
          atualizado_em?: string | null
          cliente_endereco?: string | null
          cliente_nome: string
          cliente_telefone: string
          criado_em?: string | null
          id?: string
          itens: Json
          numero_pedido: string
          observacoes?: string | null
          status?: string
          valor_total: number
        }
        Update: {
          atualizado_em?: string | null
          cliente_endereco?: string | null
          cliente_nome?: string
          cliente_telefone?: string
          criado_em?: string | null
          id?: string
          itens?: Json
          numero_pedido?: string
          observacoes?: string | null
          status?: string
          valor_total?: number
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean | null
          atualizado_em: string | null
          categoria: string
          criado_em: string | null
          descricao: string | null
          destaque: boolean | null
          disponivel: boolean | null
          id: string
          imagem_url: string | null
          ingredientes: string[] | null
          nome: string
          preco_opcoes: Json
          tempo_preparo: number | null
        }
        Insert: {
          ativo?: boolean | null
          atualizado_em?: string | null
          categoria: string
          criado_em?: string | null
          descricao?: string | null
          destaque?: boolean | null
          disponivel?: boolean | null
          id?: string
          imagem_url?: string | null
          ingredientes?: string[] | null
          nome: string
          preco_opcoes: Json
          tempo_preparo?: number | null
        }
        Update: {
          ativo?: boolean | null
          atualizado_em?: string | null
          categoria?: string
          criado_em?: string | null
          descricao?: string | null
          destaque?: boolean | null
          disponivel?: boolean | null
          id?: string
          imagem_url?: string | null
          ingredientes?: string[] | null
          nome?: string
          preco_opcoes?: Json
          tempo_preparo?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          endereco?: string | null
          id: string
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string | null
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
