
import { createClient } from '@supabase/supabase-js'

// Função para obter configuração do localStorage
const getSupabaseConfig = () => {
  try {
    const config = localStorage.getItem('supabase_config')
    if (config) {
      return JSON.parse(config)
    }
  } catch (error) {
    console.error('Erro ao ler configuração do localStorage:', error)
  }
  return { url: '', anonKey: '' }
}

// Criar cliente Supabase com configuração dinâmica
const createSupabaseClient = () => {
  const config = getSupabaseConfig()
  if (!config.url || !config.anonKey) {
    console.log('Configuração Supabase não encontrada ou inválida')
    return null
  }
  
  try {
    return createClient(config.url, config.anonKey)
  } catch (error) {
    console.error('Erro ao criar cliente Supabase:', error)
    return null
  }
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
  peca_id: string,
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
export const recreateSupabaseClient = ({ url, anonKey }: { url: string; anonKey: string }) => {
  if (url && anonKey) {
    try {
      return createClient(url, anonKey)
    } catch (error) {
      console.error('Erro ao recriar cliente Supabase:', error)
      return null
    }
  }
  return null
}
