import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { CheckCircle, Eye, EyeOff, Moon, Sun, XCircle, Database, ClipboardCopy, ExternalLink, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

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

type SetupStep = 'credentials' | 'validation' | 'schema' | 'complete'

interface EnhancedDatabaseSetupModalProps {
  isOpen: boolean
  onConnectionSuccess: () => void
}

export function EnhancedDatabaseSetupModal({ isOpen, onConnectionSuccess }: EnhancedDatabaseSetupModalProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('credentials')
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [validationResults, setValidationResults] = useState<{
    connection: boolean | null
    tables: { [key: string]: boolean }
    progress: number
  }>({
    connection: null,
    tables: {},
    progress: 0
  })
  const [error, setError] = useState<string>('')
  const { toast } = useToast()

  // Reset everything when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('Enhanced modal opened - resetting state')
      localStorage.clear()
      setCurrentStep('credentials')
      setUrl('')
      setAnonKey('')
      setShowKey(false)
      setCopied(false)
      setIsLoading(false)
      setValidationResults({ connection: null, tables: {}, progress: 0 })
      setError('')
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

  const validateAnonKey = (key: string): boolean => {
    // Validação básica da estrutura da anon key do Supabase
    // Uma anon key válida deve:
    // 1. Começar com "eyJ" (início de um JWT)
    // 2. Ter pelo menos 100 caracteres
    // 3. Conter pontos separando as seções do JWT
    if (!key || key.length < 100) {
      return false
    }
    
    if (!key.startsWith('eyJ')) {
      return false
    }
    
    const parts = key.split('.')
    if (parts.length !== 3) {
      return false
    }
    
    return true
  }

  const validateSupabaseUrl = (testUrl: string): boolean => {
    // Validação da URL do Supabase
    try {
      const urlObj = new URL(testUrl)
      return urlObj.hostname.includes('supabase.co') || urlObj.hostname.includes('localhost')
    } catch {
      return false
    }
  }

  const validateDatabaseStructure = async (testClient: any) => {
    console.log('Validando estrutura do banco...')
    setValidationResults(prev => ({ ...prev, connection: true, progress: 20 }))
    
    const results: { [key: string]: boolean } = {}
    let validatedCount = 0
    
    for (const tableName of REQUIRED_TABLES) {
      try {
        setValidationResults(prev => ({ 
          ...prev, 
          progress: 20 + ((validatedCount / REQUIRED_TABLES.length) * 60)
        }))
        
        const testResult = await Promise.race([
          testClient.from(tableName).select('*', { count: 'exact', head: true }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 3000)
          )
        ])
        
        results[tableName] = !testResult?.error
        validatedCount++
        
        setValidationResults(prev => ({ 
          ...prev, 
          tables: { ...prev.tables, [tableName]: !testResult?.error }
        }))
        
        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error: any) {
        console.log(`Erro ao verificar tabela ${tableName}:`, error)
        results[tableName] = false
        validatedCount++
        
        setValidationResults(prev => ({ 
          ...prev, 
          tables: { ...prev.tables, [tableName]: false }
        }))
      }
    }
    
    const allValid = Object.values(results).every(Boolean)
    setValidationResults(prev => ({ 
      ...prev, 
      progress: allValid ? 100 : 80
    }))
    
    return {
      isValid: allValid,
      results,
      summary: `${Object.values(results).filter(Boolean).length}/${REQUIRED_TABLES.length} tabelas encontradas`
    }
  }

  const handleTestConnection = async () => {
    if (!url || !anonKey) {
      setError('Preencha todos os campos obrigatórios.')
      return
    }

    // Validar formato da URL
    if (!validateSupabaseUrl(url)) {
      setError('URL inválida. Use o formato: https://projeto.supabase.co')
      return
    }

    // Validar formato da anon key
    if (!validateAnonKey(anonKey)) {
      setError('Anon key inválida. Verifique se você copiou corretamente a chave do painel do Supabase.')
      return
    }

    setIsLoading(true)
    setError('')
    setCurrentStep('validation')
    setValidationResults({ connection: null, tables: {}, progress: 0 })

    try {
      // Test basic connection
      const testClient = createClient(url, anonKey)
      setValidationResults(prev => ({ ...prev, progress: 10 }))
      
      // Tentar uma operação simples para validar a conexão
      const { error: connectionError } = await Promise.race([
        testClient.auth.getSession(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na conexão')), 5000)
        )
      ]) as any

      if (connectionError && connectionError.message.includes('Invalid API key')) {
        throw new Error('Chave de API inválida. Verifique a anon key.')
      }

      // Validate database structure
      const structureValidation = await validateDatabaseStructure(testClient)
      
      if (structureValidation.isValid) {
        setCurrentStep('complete')
        toast({ 
          title: 'Conexão validada!', 
          description: 'Todas as tabelas foram encontradas. Configuração completa.' 
        })
      } else {
        setCurrentStep('schema')
        toast({ 
          title: 'Estrutura incompleta', 
          description: 'Algumas tabelas estão faltando. Configure o esquema para continuar.',
          variant: 'destructive'
        })
      }

    } catch (error: any) {
      console.error('Erro na validação:', error)
      setError(error.message?.includes('Timeout') ? 
        'Timeout na conexão. Verifique a URL e tente novamente.' :
        error.message?.includes('Invalid API key') ?
        'Chave de API inválida. Verifique a anon key.' :
        'Falha na conexão. Verifique suas credenciais.'
      )
      setCurrentStep('credentials')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRetryValidation = async () => {
    if (!url || !anonKey) return
    
    setIsLoading(true)
    setError('')
    setCurrentStep('validation')
    setValidationResults({ connection: null, tables: {}, progress: 0 })

    try {
      const testClient = createClient(url, anonKey)
      const structureValidation = await validateDatabaseStructure(testClient)
      
      if (structureValidation.isValid) {
        setCurrentStep('complete')
        toast({ 
          title: 'Estrutura validada!', 
          description: 'Todas as tabelas foram encontradas.' 
        })
      } else {
        // Manter no estado 'schema' para mostrar o botão novamente
        setCurrentStep('schema')
        toast({ 
          title: 'Ainda faltam tabelas', 
          description: 'Execute o SQL fornecido e tente novamente.',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      setError('Erro na validação: ' + error.message)
      setCurrentStep('schema') // Manter no estado schema para permitir nova tentativa
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = () => {
    console.log('Salvando configuração validada')
    localStorage.setItem('supabase_config', JSON.stringify({ url, anonKey }))
    localStorage.setItem('db_configured', 'true')
    
    toast({ title: 'Configuração salva!', description: 'Sistema configurado com sucesso!' })
    onConnectionSuccess()
  }

  const getStepProgress = () => {
    switch (currentStep) {
      case 'credentials': return 25
      case 'validation': return validationResults.progress * 0.5 + 25
      case 'schema': return 75
      case 'complete': return 100
      default: return 0
    }
  }

  return (
    <Dialog open={isOpen} modal>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Configuração do Banco de Dados
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso da Configuração</span>
              <span>{Math.round(getStepProgress())}%</span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
          </div>

          {/* Step Indicators */}
          <div className="flex items-center justify-between">
            {[
              { key: 'credentials', label: 'Credenciais' },
              { key: 'validation', label: 'Validação' },
              { key: 'schema', label: 'Esquema' },
              { key: 'complete', label: 'Completo' }
            ].map((step, index) => (
              <div key={step.key} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === step.key ? 'bg-blue-600 text-white' :
                  ['validation', 'schema', 'complete'].includes(currentStep) && index < ['credentials', 'validation', 'schema', 'complete'].indexOf(currentStep) ?
                  'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {['validation', 'schema', 'complete'].includes(currentStep) && index < ['credentials', 'validation', 'schema', 'complete'].indexOf(currentStep) ?
                    <CheckCircle className="h-4 w-4" /> : index + 1}
                </div>
                <span className="ml-2 text-sm">{step.label}</span>
                {index < 3 && <ArrowRight className="h-4 w-4 text-gray-400 mx-4" />}
              </div>
            ))}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content */}
            <div className="lg:w-1/2 space-y-4">
              {currentStep === 'credentials' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Conectar ao Supabase</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="url">URL do Projeto *</Label>
                      <Input 
                        id="url" 
                        value={url} 
                        onChange={(e) => setUrl(e.target.value)} 
                        placeholder="https://projeto.supabase.co"
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

                    <Button 
                      onClick={handleTestConnection} 
                      disabled={!url || !anonKey || isLoading}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testando Conexão...
                        </>
                      ) : (
                        'Testar Conexão'
                      )}
                    </Button>

                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• Encontre suas credenciais no painel do Supabase</p>
                      <p>• As configurações são salvas localmente</p>
                      <p>• A anon key deve começar com "eyJ" e ter mais de 100 caracteres</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentStep === 'validation' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Validando Estrutura</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        {validationResults.connection === null ? 
                          <Loader2 className="h-4 w-4 animate-spin" /> :
                          validationResults.connection ? 
                            <CheckCircle className="h-4 w-4 text-green-600" /> :
                            <XCircle className="h-4 w-4 text-red-600" />
                        }
                        <span>Conexão com o banco</span>
                      </div>

                      <div className="space-y-2">
                        <span className="text-sm font-medium">Verificando tabelas:</span>
                        <div className="grid grid-cols-2 gap-2">
                          {REQUIRED_TABLES.map(table => (
                            <div key={table} className="flex items-center gap-2 text-sm">
                              {validationResults.tables[table] === undefined ? 
                                <Loader2 className="h-3 w-3 animate-spin" /> :
                                validationResults.tables[table] ? 
                                  <CheckCircle className="h-3 w-3 text-green-600" /> :
                                  <XCircle className="h-3 w-3 text-red-600" />
                              }
                              <span className="truncate">{table}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentStep === 'schema' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Configurar Esquema</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Algumas tabelas estão faltando. Execute o SQL abaixo no painel do Supabase para criar a estrutura necessária.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Status das tabelas:</div>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {REQUIRED_TABLES.map(table => (
                          <div key={table} className="flex items-center gap-1">
                            <Badge variant={validationResults.tables[table] ? "default" : "destructive"} className="text-xs">
                              {validationResults.tables[table] ? '✓' : '✗'} {table}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleRetryValidation} disabled={isLoading} className="flex-1">
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Validando...
                          </>
                        ) : (
                          'Tentar Novamente'
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => window.open(`${url.replace('.supabase.co', '')}.supabase.co/sql`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Abrir SQL Editor
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentStep === 'complete' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600">Configuração Completa!</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span>Todas as {REQUIRED_TABLES.length} tabelas foram encontradas e validadas.</span>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Sua aplicação está pronta para uso. Todas as funcionalidades do sistema de gestão estão disponíveis.
                    </div>

                    <Button onClick={handleComplete} className="w-full">
                      Finalizar Configuração
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator orientation="vertical" className="hidden lg:block" />

            {/* SQL Schema */}
            <div className="lg:w-1/2 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Esquema SQL do Sistema</span>
                <Button variant="outline" size="sm" onClick={handleCopySQL}>
                  <ClipboardCopy className="h-4 w-4 mr-1" />
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
              <pre className="text-xs p-3 bg-muted rounded overflow-auto max-h-96 whitespace-pre-wrap">
                {schemaSQL}
              </pre>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
