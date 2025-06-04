

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

// Cache para o cliente Supabase
let supabaseClient: any = null
let isInitializing = false

// Função para obter o cliente Supabase de forma lazy
const getSupabaseClient = async () => {
  if (supabaseClient) {
    return supabaseClient
  }
  
  if (isInitializing) {
    // Se já está inicializando, aguardar um pouco e tentar novamente
    await new Promise(resolve => setTimeout(resolve, 100))
    return getSupabaseClient()
  }
  
  isInitializing = true
  try {
    supabaseClient = await createSupabaseClient()
    return supabaseClient
  } finally {
    isInitializing = false
  }
}

// Interface que define os métodos do query builder do Supabase
interface SupabaseQueryBuilder {
  select: (columns?: string) => Promise<any>
  insert: (values: any) => Promise<any>
  update: (values: any) => Promise<any>
  delete: () => Promise<any>
  eq: (column: string, value: any) => SupabaseQueryBuilder
  neq: (column: string, value: any) => SupabaseQueryBuilder
  gt: (column: string, value: any) => SupabaseQueryBuilder
  gte: (column: string, value: any) => SupabaseQueryBuilder
  lt: (column: string, value: any) => SupabaseQueryBuilder
  lte: (column: string, value: any) => SupabaseQueryBuilder
  like: (column: string, pattern: string) => SupabaseQueryBuilder
  ilike: (column: string, pattern: string) => SupabaseQueryBuilder
  is: (column: string, value: any) => SupabaseQueryBuilder
  in: (column: string, values: any[]) => SupabaseQueryBuilder
  contains: (column: string, value: any) => SupabaseQueryBuilder
  containedBy: (column: string, value: any) => SupabaseQueryBuilder
  rangeGt: (column: string, value: any) => SupabaseQueryBuilder
  rangeGte: (column: string, value: any) => SupabaseQueryBuilder
  rangeLt: (column: string, value: any) => SupabaseQueryBuilder
  rangeLte: (column: string, value: any) => SupabaseQueryBuilder
  rangeAdjacent: (column: string, value: any) => SupabaseQueryBuilder
  overlaps: (column: string, value: any) => SupabaseQueryBuilder
  textSearch: (column: string, query: string, config?: any) => SupabaseQueryBuilder
  match: (query: Record<string, any>) => SupabaseQueryBuilder
  not: (column: string, operator: string, value: any) => SupabaseQueryBuilder
  or: (filters: string) => SupabaseQueryBuilder
  filter: (column: string, operator: string, value: any) => SupabaseQueryBuilder
  order: (column: string, options?: { ascending?: boolean }) => SupabaseQueryBuilder
  limit: (count: number) => SupabaseQueryBuilder
  range: (from: number, to: number) => SupabaseQueryBuilder
  single: () => Promise<any>
  maybeSingle: () => Promise<any>
  csv: () => Promise<any>
}

// Proxy que mantém a interface síncrona do Supabase mas funciona de forma assíncrona internamente
class SupabaseProxy {
  from(tableName: string): SupabaseQueryBuilder {
    const createAsyncMethod = (methodName: string) => {
      return (...args: any[]) => {
        return getSupabaseClient().then(client => {
          if (!client) {
            throw new Error('Cliente Supabase não disponível')
          }
          
          const table = client.from(tableName)
          const method = table[methodName]
          if (typeof method === 'function') {
            const result = method.apply(table, args)
            
            // Se o resultado tem métodos de query builder, criar um novo proxy para eles
            if (result && typeof result === 'object' && result.select) {
              return createQueryBuilderProxy(result)
            }
            return result
          }
          return method
        })
      }
    }

    const createQueryBuilderProxy = (queryBuilder: any): any => {
      return new Proxy(queryBuilder, {
        get(target, prop: string) {
          if (typeof target[prop] === 'function') {
            return (...args: any[]) => {
              const result = target[prop](...args)
              // Se o resultado ainda é um query builder, envolver em proxy
              if (result && typeof result === 'object' && result.select && prop !== 'select') {
                return createQueryBuilderProxy(result)
              }
              return result
            }
          }
          return target[prop]
        }
      })
    }

    // Criar o proxy inicial que implementa a interface SupabaseQueryBuilder
    const queryProxy = new Proxy({} as any, {
      get(target, prop: string) {
        return createAsyncMethod(prop)
      }
    })
    
    return queryProxy as SupabaseQueryBuilder
  }

  get auth() {
    return {
      getSession: async () => {
        const client = await getSupabaseClient()
        if (!client) throw new Error('Cliente Supabase não disponível')
        return client.auth.getSession()
      },
      signInWithPassword: async (credentials: any) => {
        const client = await getSupabaseClient()
        if (!client) throw new Error('Cliente Supabase não disponível')
        return client.auth.signInWithPassword(credentials)
      },
      signOut: async () => {
        const client = await getSupabaseClient()
        if (!client) throw new Error('Cliente Supabase não disponível')
        return client.auth.signOut()
      }
    }
  }

  get storage() {
    return {
      from: async (bucketName: string) => {
        const client = await getSupabaseClient()
        if (!client) throw new Error('Cliente Supabase não disponível')
        return client.storage.from(bucketName)
      }
    }
  }
}

// Instância principal do Supabase
export const supabase = new SupabaseProxy()

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
      
      // Atualizar o cache
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

