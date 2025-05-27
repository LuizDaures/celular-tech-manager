import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://mowmyemymytbjfirhlhh.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vd215ZW15bXl0YmpmaXJobGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxOTc4MjUsImV4cCI6MjA2Mzc3MzgyNX0.0UZbgc8FNc9B5xUu8uEcj88PDNEPFkBhAV4NlCMtyKI"

export const supabase = createClient(supabaseUrl, supabaseKey)

// Types for our database tables
export interface Cliente {
  id: string
  nome: string
  telefone?: string
  email?: string
  endereco?: string
  cpf?: string
  criado_em: string
}

export interface Tecnico {
  id: string
  nome: string
  telefone?: string
  email?: string
  endereco?: string
  cpf?: string
  criado_em: string
}

export interface OrdemServico {
  id: string
  cliente_id: string
  tecnico_id?: string
  dispositivo: string
  descricao_problema: string
  diagnostico?: string
  servico_realizado?: string
  status: 'aberta' | 'em_andamento' | 'concluida' | 'cancelada'
  data_abertura: string
  data_conclusao?: string
  valor?: number
}

export interface PecaManutencao {
  id: string
  nome: string
  fabricante?: string
  modelo?: string
  codigo_fabricante?: string
  preco_unitario: number
  estoque: number
  criado_em: string
  atualizado_em: string
}

export interface ItemOrdem {
  id: string
  ordem_id: string
  nome_item: string
  quantidade: number
  preco_unitario: number
}

export interface DadosEmpresa {
  id: number
  created_at: string
  nome: string
  cnpj?: string
  logo_base64?: string
}

export interface OrdemCompleta extends Omit<OrdemServico, 'id'> {
  id: string
  ordem_id?: string
  cliente: Cliente
  tecnico?: Tecnico
  itens: ItemOrdem[]
  total: number
  cliente_nome?: string
  cliente_cpf?: string
  cliente_telefone?: string
  cliente_email?: string
  cliente_endereco?: string
  tecnico_nome?: string
  tecnico_cpf?: string
  total_ordem?: number
  valor_manutencao?: number
}
