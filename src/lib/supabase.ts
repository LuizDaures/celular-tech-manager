
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

// Interface para operações de query
interface QueryOperation {
  method: string
  args: any[]
}

// Interface para o resultado das operações
interface SupabaseResponse<T = any> {
  data: T | null
  error: any
  count?: number
}

// Classe que implementa o padrão builder
class AsyncQueryBuilder {
  private tableName: string
  private operations: QueryOperation[] = []

  constructor(tableName: string) {
    this.tableName = tableName
  }

  // Métodos de filtragem que retornam o builder para chaining
  eq(column: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'eq', args: [column, value] })
    return this
  }

  neq(column: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'neq', args: [column, value] })
    return this
  }

  gt(column: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'gt', args: [column, value] })
    return this
  }

  gte(column: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'gte', args: [column, value] })
    return this
  }

  lt(column: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'lt', args: [column, value] })
    return this
  }

  lte(column: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'lte', args: [column, value] })
    return this
  }

  like(column: string, pattern: string): AsyncQueryBuilder {
    this.operations.push({ method: 'like', args: [column, pattern] })
    return this
  }

  ilike(column: string, pattern: string): AsyncQueryBuilder {
    this.operations.push({ method: 'ilike', args: [column, pattern] })
    return this
  }

  is(column: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'is', args: [column, value] })
    return this
  }

  in(column: string, values: any[]): AsyncQueryBuilder {
    this.operations.push({ method: 'in', args: [column, values] })
    return this
  }

  contains(column: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'contains', args: [column, value] })
    return this
  }

  containedBy(column: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'containedBy', args: [column, value] })
    return this
  }

  rangeGt(column: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'rangeGt', args: [column, value] })
    return this
  }

  rangeGte(column: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'rangeGte', args: [column, value] })
    return this
  }

  rangeLt(column: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'rangeLt', args: [column, value] })
    return this
  }

  rangeLte(column: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'rangeLte', args: [column, value] })
    return this
  }

  rangeAdjacent(column: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'rangeAdjacent', args: [column, value] })
    return this
  }

  overlaps(column: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'overlaps', args: [column, value] })
    return this
  }

  textSearch(column: string, query: string, config?: any): AsyncQueryBuilder {
    this.operations.push({ method: 'textSearch', args: [column, query, config] })
    return this
  }

  match(query: Record<string, any>): AsyncQueryBuilder {
    this.operations.push({ method: 'match', args: [query] })
    return this
  }

  not(column: string, operator: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'not', args: [column, operator, value] })
    return this
  }

  or(filters: string): AsyncQueryBuilder {
    this.operations.push({ method: 'or', args: [filters] })
    return this
  }

  filter(column: string, operator: string, value: any): AsyncQueryBuilder {
    this.operations.push({ method: 'filter', args: [column, operator, value] })
    return this
  }

  order(column: string, options?: { ascending?: boolean }): AsyncQueryBuilder {
    this.operations.push({ method: 'order', args: [column, options] })
    return this
  }

  limit(count: number): AsyncQueryBuilder {
    this.operations.push({ method: 'limit', args: [count] })
    return this
  }

  range(from: number, to: number): AsyncQueryBuilder {
    this.operations.push({ method: 'range', args: [from, to] })
    return this
  }

  // Método especial para select que pode estar no meio da cadeia
  select(columns?: string): AsyncQueryBuilder {
    this.operations.push({ method: 'select', args: [columns] })
    return this
  }

  // Método privado para aplicar operações
  private async applyOperations(query: any): Promise<any> {
    let result = query
    for (const op of this.operations) {
      result = result[op.method](...op.args)
    }
    return result
  }

  // Métodos finais que executam a query e retornam promises
  async then(onFulfilled?: any, onRejected?: any): Promise<SupabaseResponse> {
    const client = await getSupabaseClient()
    if (!client) throw new Error('Cliente Supabase não disponível')
    
    const query = client.from(this.tableName)
    const queryWithOperations = await this.applyOperations(query)
    
    // Se não há select nas operações, adicionar um select padrão
    const hasSelect = this.operations.some(op => op.method === 'select')
    if (!hasSelect) {
      return queryWithOperations.select('*')
    }
    
    return queryWithOperations
  }

  async insert(values: any): Promise<SupabaseResponse> {
    const client = await getSupabaseClient()
    if (!client) throw new Error('Cliente Supabase não disponível')
    
    const query = client.from(this.tableName)
    const queryWithOperations = await this.applyOperations(query)
    return queryWithOperations.insert(values)
  }

  async update(values: any): Promise<SupabaseResponse> {
    const client = await getSupabaseClient()
    if (!client) throw new Error('Cliente Supabase não disponível')
    
    const query = client.from(this.tableName)
    const queryWithOperations = await this.applyOperations(query)
    return queryWithOperations.update(values)
  }

  async delete(): Promise<SupabaseResponse> {
    const client = await getSupabaseClient()
    if (!client) throw new Error('Cliente Supabase não disponível')
    
    const query = client.from(this.tableName)
    const queryWithOperations = await this.applyOperations(query)
    return queryWithOperations.delete()
  }

  async single(): Promise<SupabaseResponse> {
    const client = await getSupabaseClient()
    if (!client) throw new Error('Cliente Supabase não disponível')
    
    const query = client.from(this.tableName)
    const queryWithOperations = await this.applyOperations(query)
    const result = await queryWithOperations
    return result.single()
  }

  async maybeSingle(): Promise<SupabaseResponse> {
    const client = await getSupabaseClient()
    if (!client) throw new Error('Cliente Supabase não disponível')
    
    const query = client.from(this.tableName)
    const queryWithOperations = await this.applyOperations(query)
    const result = await queryWithOperations
    return result.maybeSingle()
  }
}

// Classe principal do Supabase
class SupabaseProxy {
  from(tableName: string): AsyncQueryBuilder {
    return new AsyncQueryBuilder(tableName)
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
