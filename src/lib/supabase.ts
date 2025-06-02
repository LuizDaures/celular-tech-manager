
import { createClient } from '@supabase/supabase-js'

// Função para validar estrutura do banco no Supabase
const validateDatabaseStructure = async (client: any) => {
  try {
    console.log('Validando estrutura do banco de dados...')
    
    // Testar conexão básica
    const { data: testConnection, error: connectionError } = await client
      .from('clientes')
      .select('count')
      .limit(1)
    
    if (connectionError) {
      console.error('Erro de conexão:', connectionError)
      return false
    }

    // Verificar se todas as tabelas necessárias existem
    const requiredTables = [
      'clientes',
      'tecnicos', 
      'ordens_servico',
      'pecas_manutencao',
      'itens_ordem'
    ]

    for (const table of requiredTables) {
      const { error } = await client
        .from(table)
        .select('*')
        .limit(1)

      if (error) {
        console.error(`Tabela ${table} não encontrada ou inacessível:`, error)
        return false
      }
    }

    console.log('Estrutura do banco validada com sucesso!')
    return true
  } catch (error) {
    console.error('Erro na validação do banco:', error)
    return false
  }
}

// Função para limpar localStorage preservando apenas o tema
const clearLocalStorageExceptTheme = () => {
  const theme = localStorage.getItem('theme')
  localStorage.clear()
  if (theme) {
    localStorage.setItem('theme', theme)
  }
  console.log('localStorage limpo, apenas tema preservado')
}

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
const createSupabaseClient = async () => {
  const config = getSupabaseConfig()
  if (!config.url || !config.anonKey) {
    console.log('Configuração Supabase não encontrada ou inválida')
    return null
  }
  
  try {
    const client = createClient(config.url, config.anonKey)
    
    // Validar estrutura do banco
    const isValid = await validateDatabaseStructure(client)
    
    if (!isValid) {
      console.log('Estrutura do banco inválida, limpando localStorage...')
      clearLocalStorageExceptTheme()
      return null
    }
    
    return client
  } catch (error) {
    console.error('Erro ao criar cliente Supabase:', error)
    clearLocalStorageExceptTheme()
    return null
  }
}

// Variable to store the initialized client
let supabaseClient: any = null
let clientInitPromise: Promise<any> | null = null

// Function to get or initialize the Supabase client
export const getSupabaseClient = async () => {
  if (supabaseClient) {
    return supabaseClient
  }
  
  if (clientInitPromise) {
    return await clientInitPromise
  }
  
  clientInitPromise = createSupabaseClient()
  supabaseClient = await clientInitPromise
  clientInitPromise = null
  
  return supabaseClient
}

// Export the client as null initially - components should use getSupabaseClient()
export const supabase = null

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
export const recreateSupabaseClient = async ({ url, anonKey }: { url: string; anonKey: string }) => {
  if (url && anonKey) {
    try {
      const client = createClient(url, anonKey)
      
      // Validar estrutura antes de aceitar a nova configuração
      const isValid = await validateDatabaseStructure(client)
      
      if (!isValid) {
        throw new Error('Estrutura do banco de dados inválida')
      }
      
      // Reset the cached client
      supabaseClient = client
      
      return client
    } catch (error) {
      console.error('Erro ao recriar cliente Supabase:', error)
      clearLocalStorageExceptTheme()
      throw error
    }
  }
  clearLocalStorageExceptTheme()
  supabaseClient = null
  return null
}

// Função para desconectar e limpar dados
export const disconnectDatabase = () => {
  console.log('Desconectando banco e limpando dados...')
  supabaseClient = null
  clearLocalStorageExceptTheme()
  // Recarregar a página para garantir que todos os estados sejam limpos
  window.location.reload()
}
