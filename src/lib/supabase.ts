
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

// Interface para o resultado das operações
interface SupabaseResponse<T = any> {
  data: T | null
  error: any
  count?: number
}

// Classe principal do Supabase que imita a API oficial
class SupabaseProxy {
  from(tableName: string) {
    return {
      select: (columns?: string) => this.buildQuery(tableName, 'select', columns || '*'),
      insert: (values: any) => this.buildMutation(tableName, 'insert', values),
      update: (values: any) => this.buildMutation(tableName, 'update', values),
      delete: () => this.buildMutation(tableName, 'delete'),
    }
  }

  private buildQuery(tableName: string, method: string, columns?: string) {
    const operations = [{ method: 'select', args: [columns] }]
    
    return {
      eq: (column: string, value: any) => this.addFilter(tableName, operations, 'eq', column, value),
      neq: (column: string, value: any) => this.addFilter(tableName, operations, 'neq', column, value),
      gt: (column: string, value: any) => this.addFilter(tableName, operations, 'gt', column, value),
      gte: (column: string, value: any) => this.addFilter(tableName, operations, 'gte', column, value),
      lt: (column: string, value: any) => this.addFilter(tableName, operations, 'lt', column, value),
      lte: (column: string, value: any) => this.addFilter(tableName, operations, 'lte', column, value),
      like: (column: string, pattern: string) => this.addFilter(tableName, operations, 'like', column, pattern),
      ilike: (column: string, pattern: string) => this.addFilter(tableName, operations, 'ilike', column, pattern),
      is: (column: string, value: any) => this.addFilter(tableName, operations, 'is', column, value),
      in: (column: string, values: any[]) => this.addFilter(tableName, operations, 'in', column, values),
      order: (column: string, options?: { ascending?: boolean }) => this.addFilter(tableName, operations, 'order', column, options),
      limit: (count: number) => this.addFilter(tableName, operations, 'limit', count),
      range: (from: number, to: number) => this.addFilter(tableName, operations, 'range', from, to),
      single: () => this.executeQuery(tableName, operations, 'single'),
      maybeSingle: () => this.executeQuery(tableName, operations, 'maybeSingle'),
      execute: () => this.executeQuery(tableName, operations),
    }
  }

  private buildMutation(tableName: string, method: string, values?: any) {
    return {
      eq: (column: string, value: any) => this.addMutationFilter(tableName, method, values, 'eq', column, value),
      neq: (column: string, value: any) => this.addMutationFilter(tableName, method, values, 'neq', column, value),
      execute: () => this.executeMutation(tableName, method, values, []),
    }
  }

  private addFilter(tableName: string, operations: any[], filterMethod: string, ...args: any[]) {
    const newOperations = [...operations, { method: filterMethod, args }]
    
    return {
      eq: (column: string, value: any) => this.addFilter(tableName, newOperations, 'eq', column, value),
      neq: (column: string, value: any) => this.addFilter(tableName, newOperations, 'neq', column, value),
      gt: (column: string, value: any) => this.addFilter(tableName, newOperations, 'gt', column, value),
      gte: (column: string, value: any) => this.addFilter(tableName, newOperations, 'gte', column, value),
      lt: (column: string, value: any) => this.addFilter(tableName, newOperations, 'lt', column, value),
      lte: (column: string, value: any) => this.addFilter(tableName, newOperations, 'lte', column, value),
      like: (column: string, pattern: string) => this.addFilter(tableName, newOperations, 'like', column, pattern),
      ilike: (column: string, pattern: string) => this.addFilter(tableName, newOperations, 'ilike', column, pattern),
      is: (column: string, value: any) => this.addFilter(tableName, newOperations, 'is', column, value),
      in: (column: string, values: any[]) => this.addFilter(tableName, newOperations, 'in', column, values),
      order: (column: string, options?: { ascending?: boolean }) => this.addFilter(tableName, newOperations, 'order', column, options),
      limit: (count: number) => this.addFilter(tableName, newOperations, 'limit', count),
      range: (from: number, to: number) => this.addFilter(tableName, newOperations, 'range', from, to),
      single: () => this.executeQuery(tableName, newOperations, 'single'),
      maybeSingle: () => this.executeQuery(tableName, newOperations, 'maybeSingle'),
      execute: () => this.executeQuery(tableName, newOperations),
    }
  }

  private addMutationFilter(tableName: string, method: string, values: any, filterMethod: string, ...args: any[]) {
    const filters = [{ method: filterMethod, args }]
    
    return {
      eq: (column: string, value: any) => this.addMutationFilter(tableName, method, values, 'eq', column, value),
      neq: (column: string, value: any) => this.addMutationFilter(tableName, method, values, 'neq', column, value),
      execute: () => this.executeMutation(tableName, method, values, [...filters, { method: filterMethod, args }]),
    }
  }

  private async executeQuery(tableName: string, operations: any[], finalMethod?: string): Promise<SupabaseResponse> {
    const client = await getSupabaseClient()
    if (!client) throw new Error('Cliente Supabase não disponível')
    
    let query = client.from(tableName)
    
    // Aplicar todas as operações
    for (const op of operations) {
      query = query[op.method](...op.args)
    }
    
    // Aplicar método final se especificado
    if (finalMethod) {
      query = query[finalMethod]()
    }
    
    return query
  }

  private async executeMutation(tableName: string, method: string, values: any, filters: any[]): Promise<SupabaseResponse> {
    const client = await getSupabaseClient()
    if (!client) throw new Error('Cliente Supabase não disponível')
    
    let query = client.from(tableName)
    
    // Aplicar filtros primeiro
    for (const filter of filters) {
      query = query[filter.method](...filter.args)
    }
    
    // Aplicar operação de mutação
    if (method === 'insert') {
      return query.insert(values)
    } else if (method === 'update') {
      return query.update(values)
    } else if (method === 'delete') {
      return query.delete()
    }
    
    return query
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
