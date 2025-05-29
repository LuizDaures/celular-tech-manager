
import { createClient } from '@supabase/supabase-js'

// Função para obter configuração do localStorage
const getSupabaseConfig = () => {
  const config = localStorage.getItem('supabase_config')
  if (config) {
    return JSON.parse(config)
  }
  return { url: '', anonKey: '' }
}

// Criar cliente Supabase com configuração dinâmica
const createSupabaseClient = () => {
  const config = getSupabaseConfig()
  if (!config.url || !config.anonKey) {
    // Retorna um cliente mock se não configurado
    return null
  }
  return createClient(config.url, config.anonKey)
}

export const supabase = createSupabaseClient()

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

// Função para recriar o cliente quando a configuração mudar
export const recreateSupabaseClient = () => {
  const config = getSupabaseConfig()
  if (config.url && config.anonKey) {
    return createClient(config.url, config.anonKey)
  }
  return null
}
