import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { CheckCircle, Eye, EyeOff, Moon, Sun, XCircle, Database, ClipboardCopy } from 'lucide-react'
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
  preco_unitario numeric
);
ALTER TABLE public.itens_ordem ENABLE ROW LEVEL SECURITY;
CREATE POLICY "itens_ordem_policy" ON public.itens_ordem FOR ALL TO public USING (true) WITH CHECK (true);`

interface DatabaseSetupModalProps {
  isOpen: boolean
  onConnectionSuccess: () => void
}

export function DatabaseSetupModal({ isOpen, onConnectionSuccess }: DatabaseSetupModalProps) {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // Gerenciar tema independentemente, preservando a configuração atual
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      return savedTheme === 'dark'
    }
    return document.documentElement.classList.contains('dark')
  })

  // Limpar status e campos quando o modal é aberto
  useEffect(() => {
    if (isOpen) {
      console.log('Modal aberto - limpando estados e localStorage')
      
      // Limpar completamente o localStorage, exceto o tema
      const savedTheme = localStorage.getItem('theme')
      localStorage.clear()
      if (savedTheme) {
        localStorage.setItem('theme', savedTheme)
      }
      
      // Resetar todos os estados
      setStatus('idle')
      setUrl('')
      setAnonKey('')
      setShowKey(false)
      setCopied(false)
    }
  }, [isOpen])

  const toggleTheme = () => {
    const newTheme = !darkMode
    setDarkMode(newTheme)
    
    // Salvar no localStorage
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
    
    // Aplicar ao documento
    if (newTheme) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
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

  const handleTest = async () => {
    if (!url || !anonKey) {
      toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' })
      return
    }

    console.log('Iniciando teste de conexão com URL:', url)
    setStatus('testing')

    try {
      // Criar um cliente Supabase temporário apenas para teste
      let testClient
      try {
        testClient = createClient(url, anonKey)
      } catch (clientError) {
        console.error('Erro ao criar cliente Supabase:', clientError)
        throw new Error('Credenciais inválidas - não foi possível criar cliente')
      }

      if (!testClient) {
        throw new Error('Não foi possível criar cliente Supabase')
      }

      console.log('Cliente criado, testando conexão básica...')

      // Teste 1: Verificar se as credenciais são válidas fazendo uma query básica
      const authTestPromise = testClient.auth.getSession()
      const authResult = await Promise.race([
        authTestPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout na autenticação')), 8000)
        )
      ])

      console.log('Teste de autenticação concluído, testando tabelas...')

      // Teste 2: Verificar se consegue acessar as tabelas (estrutura existe)
      const tablesTestPromise = testClient
        .from('clientes')
        .select('id', { count: 'exact', head: true })

      const tablesResult = await Promise.race([
        tablesTestPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout ao testar tabelas')), 8000)
        )
      ]) as any

      console.log('Resultado do teste de tabelas:', tablesResult)

      // Verificar se houve erro específico de tabela não encontrada
      if (tablesResult?.error) {
        if (tablesResult.error.code === 'PGRST116' || 
            tablesResult.error.message?.includes('does not exist') ||
            tablesResult.error.message?.includes('relation') ||
            tablesResult.error.message?.includes('table')) {
          throw new Error('Estrutura de banco não criada')
        }
        
        // Outros erros de permissão ou configuração
        if (tablesResult.error.code === '42501' || 
            tablesResult.error.message?.includes('permission') ||
            tablesResult.error.message?.includes('policy')) {
          throw new Error('Problema de permissões - verifique as políticas RLS')
        }

        throw new Error(`Erro no banco: ${tablesResult.error.message}`)
      }

      console.log('Conexão validada com sucesso!')
      toast({ title: 'Sucesso', description: 'Conexão validada e estrutura detectada.' })
      setStatus('success')

    } catch (error: any) {
      console.error('Erro no teste de conexão:', error)
      setStatus('error')
      
      let errorMessage = 'Falha na conexão.'
      
      if (error.message?.includes('Timeout')) {
        errorMessage = 'Timeout na conexão. Verifique a URL e tente novamente.'
      } else if (error.message?.includes('não foi possível criar cliente') || 
                 error.message?.includes('Credenciais inválidas')) {
        errorMessage = 'URL ou chave inválida. Verifique os dados inseridos.'
      } else if (error.message?.includes('Estrutura de banco não criada')) {
        errorMessage = 'Conexão válida, mas estrutura do banco não encontrada. Execute o script SQL no Supabase.'
      } else if (error.message?.includes('permissões')) {
        errorMessage = 'Problema nas permissões do banco. Verifique as políticas RLS.'
      } else if (error.message?.includes('Failed to fetch') || 
                 error.message?.includes('NetworkError')) {
        errorMessage = 'Erro de rede. Verifique a URL do projeto.'
      }
      
      toast({ title: 'Erro', description: errorMessage, variant: 'destructive' })
    }
  }

  const handleSave = () => {
    if (status !== 'success') {
      toast({ title: 'Erro', description: 'Você precisa validar a conexão primeiro.', variant: 'destructive' })
      return
    }

    console.log('Salvando configuração validada')
    
    // Salvar apenas após validação bem-sucedida
    localStorage.setItem('supabase_config', JSON.stringify({ url, anonKey }))
    localStorage.setItem('db_configured', 'true')
    
    toast({ title: 'Credenciais salvas', description: 'Conexão configurada com sucesso!' })
    onConnectionSuccess()
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
            Conecte-se ao Supabase antes de acessar o sistema
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

              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={handleTest} 
                  disabled={status === 'testing'}
                >
                  {status === 'testing' ? 'Testando...' : 'Testar Conexão'}
                </Button>
                <Button 
                  className="flex-1" 
                  onClick={handleSave} 
                  disabled={status !== 'success'}
                >
                  Salvar
                </Button>
              </div>

              {status === 'success' && (
                <div className="text-green-600 text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Conexão validada com sucesso.
                </div>
              )}

              {status === 'error' && (
                <div className="text-red-600 text-sm flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Não foi possível validar a conexão.
                </div>
              )}

              <div className="text-xs text-muted-foreground space-y-1">
                <p>* Campos obrigatórios</p>
                <p>As configurações são salvas localmente no navegador.</p>
                <p>Você deve criar manualmente a estrutura do banco pelo Supabase.</p>
              </div>
            </div>

            <Separator orientation="vertical" className="hidden lg:block" />

            <div className="lg:w-1/2 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Esquema SQL do sistema</span>
                <Button variant="outline" size="sm" onClick={handleCopySQL}>
                  <ClipboardCopy className="h-4 w-4 mr-1" />
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
              <pre className="text-xs p-2 bg-muted rounded overflow-auto max-h-64 whitespace-pre-wrap">
                {schemaSQL}
              </pre>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
