
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
  criado_em: string
}

export interface Tecnico {
  id: string
  nome: string
  criado_em: string
}

export interface OrdemServico {
  id: string
  cliente_id: string
  tecnico_id?: string
  descricao_problema: string
  diagnostico?: string
  servico_realizado?: string
  status: 'aberta' | 'em_andamento' | 'concluida' | 'cancelada'
  data_abertura: string
  data_conclusao?: string
}

export interface ItemOrdem {
  id: string
  ordem_id: string
  nome_item: string
  quantidade: number
  preco_unitario: number
}

export interface OrdemCompleta extends Omit<OrdemServico, 'id'> {
  id: string
  ordem_id?: string
  cliente: Cliente
  tecnico?: Tecnico
  itens: ItemOrdem[]
  total: number
  cliente_nome?: string
  tecnico_nome?: string
  total_ordem?: number
}
