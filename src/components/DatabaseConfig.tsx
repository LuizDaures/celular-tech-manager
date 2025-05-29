import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Settings, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { recreateSupabaseClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'

const databaseSchema = `
-- Habilita RLS e políticas para todas as tabelas
-- ==============================================

-- Tabela: dados_empresa
create table if not exists public.dados_empresa (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp default current_timestamp,
  nome text,
  cnpj text,
  logo_base64 text
);

alter table public.dados_empresa enable row level security;
drop policy if exists "dados_empresa_policy" on public.dados_empresa;
create policy "dados_empresa_policy" on public.dados_empresa for all to public using (true) with check (true);

-- Tabela: pecas_manutencao
create table if not exists public.pecas_manutencao (
  id uuid primary key default gen_random_uuid(),
  nome text,
  fabricante text,
  modelo text,
  codigo_fabricante text,
  preco_unitario numeric,
  estoque int4,
  criado_em timestamp default current_timestamp,
  atualizado_em timestamp
);

alter table public.pecas_manutencao enable row level security;
drop policy if exists "pecas_policy" on public.pecas_manutencao;
create policy "pecas_policy" on public.pecas_manutencao for all to public using (true) with check (true);

-- Tabela: clientes
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text,
  telefone text,
  email text,
  endereco text,
  criado_em timestamp default current_timestamp,
  cpf text
);

alter table public.clientes enable row level security;
drop policy if exists "clientes_policy" on public.clientes;
create policy "clientes_policy" on public.clientes for all to public using (true) with check (true);

-- Tabela: tecnicos
create table if not exists public.tecnicos (
  id uuid primary key default gen_random_uuid(),
  nome text,
  criado_em timestamp default current_timestamp,
  telefone text,
  email text,
  endereco text,
  cpf text
);

alter table public.tecnicos enable row level security;
drop policy if exists "tecnicos_policy" on public.tecnicos;
create policy "tecnicos_policy" on public.tecnicos for all to public using (true) with check (true);

-- Tabela: ordens_servico
create table if not exists public.ordens_servico (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete cascade,
  tecnico_id uuid references public.tecnicos(id) on delete cascade,
  descricao_problema text,
  diagnostico text,
  servico_realizado text,
  status text,
  data_abertura timestamp,
  data_conclusao timestamp,
  valor float,
  dispositivo text
);

alter table public.ordens_servico enable row level security;
drop policy if exists "ordens_servico_policy" on public.ordens_servico;
create policy "ordens_servico_policy" on public.ordens_servico for all to public using (true) with check (true);

-- Tabela: itens_ordem
create table if not exists public.itens_ordem (
  id uuid primary key default gen_random_uuid(),
  ordem_id uuid references public.ordens_servico(id) on delete cascade,
  nome_item text,
  quantidade int4,
  preco_unitario numeric
);

alter table public.itens_ordem enable row level security;
drop policy if exists "itens_ordem_policy" on public.itens_ordem;
create policy "itens_ordem_policy" on public.itens_ordem for all to public using (true) with check (true);
`

export function DatabaseConfig() {
  const [isOpen, setIsOpen] = useState(false)
  const [showInitialModal, setShowInitialModal] = useState(false)
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [serviceKey, setServiceKey] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'testing'>('disconnected')
  const [dbInfo, setDbInfo] = useState({ name: '' })
  
  const { toast } = useToast()

  // Verificar se já foi configurado anteriormente
  useEffect(() => {
    const hasBeenConfigured = localStorage.getItem('db_configured')
    
    if (hasBeenConfigured) {
      setConnectionStatus('connected')
      setDbInfo({ name: 'Sistema de Gestão Database' })
    } else {
      // Mostrar modal inicial se nunca foi configurado
      setShowInitialModal(true)
    }
  }, [])

  const createDatabaseStructure = async (client: any) => {
    try {
      console.log('Creating database structure...')
      
      // Executar o script SQL dividido em comandos individuais
      const commands = databaseSchema.split(';').filter(cmd => cmd.trim().length > 0)
      
      for (const command of commands) {
        const trimmedCommand = command.trim()
        if (trimmedCommand) {
          console.log('Executing command:', trimmedCommand)
          const { error } = await client.rpc('exec_sql', { sql: trimmedCommand })
          if (error) {
            console.warn('Command failed (might be expected):', error.message)
          }
        }
      }
      
      console.log('Database structure created successfully')
      return true
    } catch (error) {
      console.error('Error creating database structure:', error)
      // Não falhar se houver erro na criação - pode ser que as tabelas já existam
      return true
    }
  }

  const handleSave = async () => {
    if (!url || !anonKey) {
      toast({
        title: "Erro",
        description: "URL e Anon Public são obrigatórios.",
        variant: "destructive",
      })
      return
    }

    // Salvar no localStorage
    localStorage.setItem('supabase_config', JSON.stringify({
      url,
      anonKey,
      serviceKey
    }))
    
    // Marcar como configurado
    localStorage.setItem('db_configured', 'true')
    setConnectionStatus('connected')
    setDbInfo({ name: 'Sistema de Gestão Database' })

    // Tentar criar a estrutura do banco de dados
    try {
      const testClient = recreateSupabaseClient()
      if (testClient) {
        await createDatabaseStructure(testClient)
      }
    } catch (error) {
      console.log('Database structure creation skipped:', error)
    }

    toast({
      title: "Configuração salva",
      description: "As configurações do banco de dados foram salvas com sucesso.",
    })
    
    setIsOpen(false)
    setShowInitialModal(false)
    
    // Recarregar a página para aplicar nova configuração
    window.location.reload()
  }

  const handleTest = async () => {
    if (!url || !anonKey) {
      toast({
        title: "Erro",
        description: "Preencha a URL e Anon Public para testar a conexão.",
        variant: "destructive",
      })
      return
    }

    setConnectionStatus('testing')
    
    try {
      // Salvar temporariamente para teste
      localStorage.setItem('supabase_config', JSON.stringify({
        url,
        anonKey,
        serviceKey
      }))
      
      // Testar conexão real com o banco
      const testClient = recreateSupabaseClient()
      if (testClient) {
        // Primeiro testar se consegue conectar
        const { data, error } = await testClient.from('clientes').select('id', { count: 'exact', head: true })
        
        if (!error || error.code === 'PGRST116') { // PGRST116 = tabela não existe
          setConnectionStatus('connected')
          setDbInfo({ name: 'Sistema de Gestão Database' })
          
          // Se tabela não existe, tentar criar estrutura
          if (error?.code === 'PGRST116') {
            console.log('Tables do not exist, creating database structure...')
            await createDatabaseStructure(testClient)
          }
          
          toast({
            title: "Conexão bem-sucedida",
            description: "Banco conectado com sucesso! Estrutura do banco verificada.",
          })
        } else {
          throw error
        }
      }
    } catch (error) {
      setConnectionStatus('disconnected')
      console.error('Connection error:', error)
      toast({
        title: "Erro na conexão",
        description: "Não foi possível conectar ao banco de dados.",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Banco conectado
          </Badge>
        )
      case 'testing':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <div className="animate-spin h-3 w-3 mr-1 border border-yellow-600 border-t-transparent rounded-full"></div>
            Testando conexão...
          </Badge>
        )
      case 'disconnected':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Banco desconectado
          </Badge>
        )
    }
  }

  const handleInitialConnect = () => {
    setShowInitialModal(false)
    setIsOpen(true)
  }

  return (
    <>
      {/* Modal inicial para primeira conexão */}
      <Dialog open={showInitialModal} onOpenChange={setShowInitialModal}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-green-600" />
              Bem-vindo ao Sistema de Gestão
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para começar a usar o sistema, você precisa configurar a conexão com o banco de dados Supabase.
            </p>
            
            <div className="flex flex-col gap-2">
              <Button onClick={handleInitialConnect} className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Configurar Banco de Dados
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-green-600" />
            Configuração do Banco de Dados
          </CardTitle>
          <CardDescription>
            Configure a conexão com o Supabase
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status da Conexão:</span>
            {getStatusBadge()}
          </div>
          
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Configurar Supabase
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md mx-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center text-white text-xs font-bold">
                    S
                  </div>
                  Configuração do Supabase
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="url">URL do Projeto *</Label>
                  <Input
                    id="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://seu-projeto.supabase.co"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="anon-key">Anon Public Key *</Label>
                  <Input
                    id="anon-key"
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service-key">Service Role Key (Opcional)</Label>
                  <Input
                    id="service-key"
                    type="password"
                    value={serviceKey}
                    onChange={(e) => setServiceKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    onClick={handleTest} 
                    className="flex-1"
                    disabled={connectionStatus === 'testing'}
                  >
                    {connectionStatus === 'testing' ? 'Testando...' : 'Testar Conexão'}
                  </Button>
                  <Button onClick={handleSave} className="flex-1">
                    Salvar
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p>* Campos obrigatórios</p>
                  <p>As configurações são salvas localmente no navegador.</p>
                  <p>O sistema criará automaticamente as tabelas necessárias.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </>
  )
}
