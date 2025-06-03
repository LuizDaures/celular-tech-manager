
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { CheckCircle, Eye, EyeOff, Moon, Sun, XCircle, Database, ClipboardCopy, AlertCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

const schemaSQL = `-- Estrutura do banco de dados para o Sistema de Gestão

-- Tabela dados_empresa
CREATE TABLE IF NOT EXISTS public.dados_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp DEFAULT current_timestamp,
  nome text,
  cnpj text,
  logo_base64 text
);
ALTER TABLE public.dados_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dados_empresa_policy" ON public.dados_empresa FOR ALL TO public USING (true) WITH CHECK (true);

-- Tabela pecas_manutencao
CREATE TABLE IF NOT EXISTS public.pecas_manutencao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text,
  fabricante text,
  modelo text,
  codigo_fabricante text,
  preco_unitario numeric,
  estoque int4,
  criado_em timestamp DEFAULT current_timestamp,
  atualizado_em timestamp
);
ALTER TABLE public.pecas_manutencao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pecas_policy" ON public.pecas_manutencao FOR ALL TO public USING (true) WITH CHECK (true);

-- Tabela clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text,
  telefone text,
  email text,
  endereco text,
  criado_em timestamp DEFAULT current_timestamp,
  cpf text
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clientes_policy" ON public.clientes FOR ALL TO public USING (true) WITH CHECK (true);

-- Tabela tecnicos
CREATE TABLE IF NOT EXISTS public.tecnicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text,
  criado_em timestamp DEFAULT current_timestamp,
  telefone text,
  email text,
  endereco text,
  cpf text
);
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tecnicos_policy" ON public.tecnicos FOR ALL TO public USING (true) WITH CHECK (true);

-- Tabela ordens_servico
CREATE TABLE IF NOT EXISTS public.ordens_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
  tecnico_id uuid REFERENCES public.tecnicos(id) ON DELETE CASCADE,
  descricao_problema text,
  diagnostico text,
  servico_realizado text,
  status text,
  data_abertura timestamp,
  data_conclusao timestamp,
  valor float,
  dispositivo text
);
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ordens_servico_policy" ON public.ordens_servico FOR ALL TO public USING (true) WITH CHECK (true);

-- Tabela itens_ordem
CREATE TABLE IF NOT EXISTS public.itens_ordem (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id uuid REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  nome_item text,
  quantidade int4,
  peca_id uuid,
  preco_unitario numeric
);
ALTER TABLE public.itens_ordem ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itens_ordem_policy" ON public.itens_ordem FOR ALL TO public USING (true) WITH CHECK (true);`

const REQUIRED_TABLES = [
  'dados_empresa',
  'pecas_manutencao', 
  'clientes',
  'tecnicos',
  'ordens_servico',
  'itens_ordem'
]

interface DatabaseSetupModalProps {
  isOpen: boolean
  onConnectionSuccess: () => void
}

type ValidationStep = 'idle' | 'validating-credentials' | 'validating-connection' | 'validating-structure' | 'success' | 'error'

export function DatabaseSetupModal({ isOpen, onConnectionSuccess }: DatabaseSetupModalProps) {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [validationStep, setValidationStep] = useState<ValidationStep>('idle')
  const [darkMode, setDarkMode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [validationDetails, setValidationDetails] = useState<string>('')
  const [errorType, setErrorType] = useState<'credentials' | 'connection' | 'structure' | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen) {
      console.log('Modal aberto - limpando estados')
      setValidationStep('idle')
      setUrl('')
      setAnonKey('')
      setShowKey(false)
      setCopied(false)
      setValidationDetails('')
      setErrorType(null)
    }
  }, [isOpen])

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark')
    setDarkMode((d) => !d)
  }

  const handleCopySQL = async () => {
    try {
      await navigator.clipboard.writeText(schemaSQL)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({ title: 'Esquema copiado', description: 'SQL copiado para a área de transferência.' })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível copiar o esquema.', variant: 'destructive' })
    }
  }

  const validateCredentials = (testUrl: string, testKey: string): boolean => {
    // Validar formato da URL
    try {
      const urlObj = new URL(testUrl)
      if (!urlObj.hostname.includes('supabase')) {
        return false
      }
    } catch {
      return false
    }

    // Validar formato da chave anon
    if (!testKey || testKey.length < 100 || !testKey.startsWith('eyJ')) {
      return false
    }

    return true
  }

  const testConnection = async (client: any): Promise<boolean> => {
    try {
      // Teste simples de conexão
      const { data, error } = await Promise.race([
        client.from('information_schema.tables').select('table_name').limit(1),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na conexão')), 10000)
        )
      ])

      return !error
    } catch (error) {
      console.log('Erro na conexão:', error)
      return false
    }
  }

  const validateDatabaseStructure = async (client: any): Promise<{ isValid: boolean; details: string }> => {
    const missingTables = []
    const existingTables = []
    
    for (const tableName of REQUIRED_TABLES) {
      try {
        const { error } = await client
          .from(tableName)
          .select('*', { count: 'exact', head: true })
        
        if (error) {
          if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            missingTables.push(tableName)
          } else {
            missingTables.push(`${tableName} (erro: ${error.message})`)
          }
        } else {
          existingTables.push(tableName)
        }
      } catch (error: any) {
        missingTables.push(`${tableName} (timeout/erro)`)
      }
    }
    
    const details = [
      `Encontradas: ${existingTables.length}/${REQUIRED_TABLES.length} tabelas`,
      existingTables.length > 0 ? `\nTabelas encontradas: ${existingTables.join(', ')}` : '',
      missingTables.length > 0 ? `\nTabelas faltando: ${missingTables.join(', ')}` : ''
    ].filter(Boolean).join('')

    return {
      isValid: missingTables.length === 0,
      details
    }
  }

  const handleTest = async () => {
    if (!url || !anonKey) {
      toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' })
      return
    }

    console.log('Iniciando validação completa...')
    setValidationDetails('')
    setErrorType(null)

    try {
      // Passo 1: Validar credenciais
      setValidationStep('validating-credentials')
      console.log('Validando formato das credenciais...')
      
      if (!validateCredentials(url, anonKey)) {
        setErrorType('credentials')
        throw new Error('URL ou Anon Key com formato inválido')
      }

      // Passo 2: Testar conexão
      setValidationStep('validating-connection')
      console.log('Testando conexão com Supabase...')
      
      let testClient
      try {
        testClient = createClient(url, anonKey)
      } catch (error) {
        setErrorType('connection')
        throw new Error('Não foi possível criar cliente com essas credenciais')
      }

      const isConnected = await testConnection(testClient)
      if (!isConnected) {
        setErrorType('connection')
        throw new Error('Falha na conexão com o banco de dados')
      }

      // Passo 3: Validar estrutura
      setValidationStep('validating-structure')
      console.log('Validando estrutura do banco...')
      
      const structureValidation = await validateDatabaseStructure(testClient)
      setValidationDetails(structureValidation.details)

      if (!structureValidation.isValid) {
        setErrorType('structure')
        throw new Error('Estrutura do banco incompleta')
      }

      console.log('Validação completa bem-sucedida!')
      setValidationStep('success')
      toast({ 
        title: 'Sucesso!', 
        description: 'Conexão validada e estrutura completa detectada.' 
      })

    } catch (error: any) {
      console.error('Erro na validação:', error)
      setValidationStep('error')
      
      let errorMessage = 'Falha na validação.'
      
      if (errorType === 'credentials') {
        errorMessage = 'URL ou Anon Key inválidos. Verifique o formato das credenciais.'
      } else if (errorType === 'connection') {
        errorMessage = 'Não foi possível conectar ao banco. Verifique as credenciais.'
      } else if (errorType === 'structure') {
        errorMessage = 'Banco conectado, mas estrutura incompleta. Execute o script SQL.'
      }
      
      toast({ title: 'Erro', description: errorMessage, variant: 'destructive' })
    }
  }

  const handleSave = () => {
    if (validationStep !== 'success') {
      toast({ title: 'Erro', description: 'Você precisa validar a conexão primeiro.', variant: 'destructive' })
      return
    }

    console.log('Salvando configuração validada')
    localStorage.setItem('supabase_config', JSON.stringify({ url, anonKey }))
    localStorage.setItem('db_configured', 'true')
    
    toast({ title: 'Credenciais salvas', description: 'Conexão configurada com sucesso!' })
    onConnectionSuccess()
  }

  const getValidationIcon = () => {
    switch (validationStep) {
      case 'validating-credentials':
      case 'validating-connection':
      case 'validating-structure':
        return <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
      case 'success':
        return <CheckCircle className="h-4 w-4" />
      case 'error':
        return <XCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const getValidationMessage = () => {
    switch (validationStep) {
      case 'validating-credentials':
        return 'Validando credenciais...'
      case 'validating-connection':
        return 'Testando conexão...'
      case 'validating-structure':
        return 'Verificando estrutura do banco...'
      case 'success':
        return 'Conexão validada com sucesso!'
      case 'error':
        return getErrorMessage()
      default:
        return ''
    }
  }

  const getErrorMessage = () => {
    switch (errorType) {
      case 'credentials':
        return 'Credenciais inválidas'
      case 'connection':
        return 'Falha na conexão'
      case 'structure':
        return 'Estrutura do banco incompleta'
      default:
        return 'Erro na validação'
    }
  }

  const getValidationColor = () => {
    switch (validationStep) {
      case 'success':
        return 'text-green-600'
      case 'error':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  return (
    <Dialog open={isOpen} modal>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-600" />
              Configuração do Banco de Dados
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          <p className="text-muted-foreground">
            Conecte-se ao Supabase para acessar o sistema
          </p>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL do Projeto *</Label>
                <Input 
                  id="url" 
                  value={url} 
                  onChange={(e) => setUrl(e.target.value)} 
                  placeholder="https://projeto.supabase.co"
                  disabled={validationStep === 'validating-credentials' || validationStep === 'validating-connection' || validationStep === 'validating-structure'}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="anon-key">Anon Public Key *</Label>
                <div className="relative">
                  <Input
                    id="anon-key"
                    type={showKey ? 'text' : 'password'}
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    className="pr-10"
                    disabled={validationStep === 'validating-credentials' || validationStep === 'validating-connection' || validationStep === 'validating-structure'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={handleTest} 
                  disabled={validationStep === 'validating-credentials' || validationStep === 'validating-connection' || validationStep === 'validating-structure'}
                >
                  {validationStep === 'validating-credentials' || validationStep === 'validating-connection' || validationStep === 'validating-structure' ? 'Validando...' : 'Validar Conexão'}
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleSave} 
                  disabled={validationStep !== 'success'}
                >
                  Salvar e Conectar
                </Button>
              </div>

              {validationStep !== 'idle' && (
                <div className={`text-sm flex items-center gap-2 ${getValidationColor()}`}>
                  {getValidationIcon()}
                  {getValidationMessage()}
                </div>
              )}

              {validationDetails && validationStep !== 'idle' && (
                <div className="text-xs bg-muted p-3 rounded border">
                  <p className="font-medium mb-1">Detalhes da validação:</p>
                  <pre className="whitespace-pre-wrap">{validationDetails}</pre>
                </div>
              )}

              {errorType === 'structure' && (
                <div className="text-xs bg-yellow-50 border border-yellow-200 p-3 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Estrutura Incompleta</span>
                  </div>
                  <p className="text-yellow-700">
                    Execute o script SQL ao lado para criar as tabelas necessárias no seu projeto Supabase.
                  </p>
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p>* Campos obrigatórios</p>
                <p>O sistema valida credenciais, conexão e estrutura antes de permitir acesso.</p>
              </div>
            </div>

            <Separator orientation="vertical" className="hidden lg:block" />

            <div className="lg:w-1/2 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Script para criação das tabelas</span>
                <Button variant="outline" size="sm" onClick={handleCopySQL}>
                  <ClipboardCopy className="h-4 w-4 mr-1" />
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
              <pre className="text-xs p-2 bg-muted rounded overflow-auto max-h-64 whitespace-pre-wrap">
                {schemaSQL}
              </pre>
              <p className="text-xs text-muted-foreground">
                Execute este script no editor SQL do seu projeto Supabase para criar a estrutura necessária.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
