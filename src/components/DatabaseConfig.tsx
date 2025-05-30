import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, ClipboardCopy, Eye, EyeOff, XCircle, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { recreateSupabaseClient } from '@/lib/supabase'
import { Separator } from '@/components/ui/separator'
import { useState as useClipboardState } from 'react'
import { Moon, Sun } from 'lucide-react'

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
CREATE POLICY "itens_ordem_policy" ON public.itens_ordem FOR ALL TO public USING (true) WITH CHECK (true);
`

export function DatabaseConfig({ forceShow }: { forceShow?: boolean }) {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [showAnonKey, setShowAnonKey] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('disconnected')
  const [copied, setCopied] = useClipboardState(false)
  const [isDark, setIsDark] = useState(false)
  const [isConnectionValid, setIsConnectionValid] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const config = localStorage.getItem('supabase_config')
    if (config) {
      const parsed = JSON.parse(config)
      setUrl(parsed.url || '')
      setAnonKey(parsed.anonKey || '')
      setConnectionStatus('connected')
    } else {
      window.location.hash = '#configuracoes'
    }
  }, [])

useEffect(() => {
  const blockDangerousShortcuts = (e: KeyboardEvent) => {
    const ctrlOrMeta = e.ctrlKey || e.metaKey

    if (connectionStatus !== 'connected' && !forceShow) {
      const blocked = (
        (ctrlOrMeta && ['r', 'w'].includes(e.key.toLowerCase())) || // Ctrl+R, Ctrl+W
        ['F5'].includes(e.key)                                     // F5
      )

      if (blocked) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
  }

  document.addEventListener('keydown', blockDangerousShortcuts, true)
  return () => document.removeEventListener('keydown', blockDangerousShortcuts, true)
}, [connectionStatus, forceShow])


  useEffect(() => {
    const body = document.body
    const aside = document.querySelector('aside')
    const header = document.querySelector('header')
    const empresaCard = document.querySelector('[data-config-empresa]')
    if (connectionStatus !== 'connected' && !forceShow) {
      body.classList.add('overflow-hidden', 'h-screen')
      aside?.classList.add('hidden')
      header?.classList.add('hidden')
      empresaCard?.classList.add('hidden')
    } else {
      body.classList.remove('overflow-hidden', 'h-screen')
      aside?.classList.remove('hidden')
      header?.classList.remove('hidden')
      empresaCard?.classList.remove('hidden')
    }
  }, [connectionStatus, forceShow])

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

  const handleSave = () => {
    if (!url || !anonKey || !isConnectionValid) {
      toast({
        title: 'Erro',
        description: 'É necessário testar e validar a conexão antes de salvar.',
        variant: 'destructive',
      })
      return
    }

    localStorage.setItem('supabase_config', JSON.stringify({ url, anonKey }))
    localStorage.setItem('db_configured', 'true')
    setConnectionStatus('connected')
    toast({ title: 'Conexão salva', description: 'Banco de dados conectado com sucesso.' })
    window.location.reload()
  }

  const handleTest = async () => {
    if (!url || !anonKey) {
      toast({ title: 'Erro', description: 'Preencha a URL e a chave pública.', variant: 'destructive' })
      return
    }

    setConnectionStatus('testing')
    setIsConnectionValid(false)

    let timeoutId: NodeJS.Timeout
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('timeout')), 8000)
    })

    try {
      const testClient = recreateSupabaseClient({ url, anonKey })
      const testRequest = testClient.from('clientes').select('id', { count: 'exact', head: true })
      await Promise.race([testRequest, timeoutPromise])
      clearTimeout(timeoutId)
      setIsConnectionValid(true)
      setConnectionStatus('disconnected') // ainda não conectado até salvar
      toast({
        title: 'Conexão válida',
        description: 'Conexão testada com sucesso! Agora você pode salvar.',
      })
    } catch {
      clearTimeout(timeoutId)
      setIsConnectionValid(false)
      setConnectionStatus('disconnected')
      toast({
        title: 'Erro ao testar conexão',
        description: 'Não foi possível conectar. Verifique as credenciais e tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const handleReset = () => {
    localStorage.removeItem('supabase_config')
    localStorage.removeItem('db_configured')
    setUrl('')
    setAnonKey('')
    setConnectionStatus('disconnected')
    setIsConnectionValid(false)
    window.location.reload()
  }

  if (connectionStatus !== 'connected' && !forceShow) {
    return (
      <div className={`fixed inset-0 z-50 overflow-auto ${isDark ? 'dark bg-background text-foreground' : 'bg-white'}`}>
        <div className="flex justify-end p-4">
          <Button variant="ghost" size="icon" onClick={() => {
            setIsDark(!isDark)
            document.documentElement.classList.toggle('dark')
          }}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        <div className="max-w-4xl mx-auto py-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-600" />
                Configuração do Banco de Dados
              </CardTitle>
              <CardDescription>Conecte-se ao Supabase antes de acessar o sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/2 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="url">URL do Projeto *</Label>
                    <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="anon-key">Anon Public Key *</Label>
                    <div className="relative">
                      <Input
                        id="anon-key"
                        type={showAnonKey ? 'text' : 'password'}
                        value={anonKey}
                        onChange={(e) => setAnonKey(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAnonKey(!showAnonKey)}
                        className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                      >
                        {showAnonKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={handleTest} className="flex-1" disabled={connectionStatus === 'testing'}>
                      {connectionStatus === 'testing' ? 'Testando conexão...' : 'Testar Conexão'}
                    </Button>
                    <Button onClick={handleSave} className="flex-1">Salvar</Button>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>* Campos obrigatórios</p>
                    <p>As configurações são salvas localmente no navegador.</p>
                    <p>Você deve criar manualmente a estrutura do banco pelo Supabase.</p>
                  </div>
                </div>
                <Separator orientation="vertical" className="hidden md:block" />
                <div className="md:w-1/2 space-y-2">
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
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-config-empresa>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-green-600" />
            Banco de Dados Conectado
          </CardTitle>
          <CardDescription>Você está conectado ao Supabase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground break-words">
            <p><strong>URL:</strong> {url}</p>
            <p><strong>Chave:</strong> {anonKey.slice(0, 10)}...{anonKey.slice(-6)}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Desconectar / Nova Conexão
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}




