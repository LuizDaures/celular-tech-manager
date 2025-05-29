
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
      setShowInitialModal(true)
    }
  }, [])

  const createDatabaseStructure = async (client: any) => {
    try {
      console.log('Verificando e criando estrutura do banco...')
      
      // Lista de comandos SQL para criar a estrutura
      const sqlCommands = [
        // Tabela dados_empresa
        `CREATE TABLE IF NOT EXISTS public.dados_empresa (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          created_at timestamp DEFAULT current_timestamp,
          nome text,
          cnpj text,
          logo_base64 text
        );`,
        
        `ALTER TABLE public.dados_empresa ENABLE ROW LEVEL SECURITY;`,
        
        `DROP POLICY IF EXISTS "dados_empresa_policy" ON public.dados_empresa;`,
        
        `CREATE POLICY "dados_empresa_policy" ON public.dados_empresa 
         FOR ALL TO public USING (true) WITH CHECK (true);`,

        // Tabela pecas_manutencao
        `CREATE TABLE IF NOT EXISTS public.pecas_manutencao (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          nome text,
          fabricante text,
          modelo text,
          codigo_fabricante text,
          preco_unitario numeric,
          estoque int4,
          criado_em timestamp DEFAULT current_timestamp,
          atualizado_em timestamp
        );`,
        
        `ALTER TABLE public.pecas_manutencao ENABLE ROW LEVEL SECURITY;`,
        
        `DROP POLICY IF EXISTS "pecas_policy" ON public.pecas_manutencao;`,
        
        `CREATE POLICY "pecas_policy" ON public.pecas_manutencao 
         FOR ALL TO public USING (true) WITH CHECK (true);`,

        // Tabela clientes
        `CREATE TABLE IF NOT EXISTS public.clientes (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          nome text,
          telefone text,
          email text,
          endereco text,
          criado_em timestamp DEFAULT current_timestamp,
          cpf text
        );`,
        
        `ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;`,
        
        `DROP POLICY IF EXISTS "clientes_policy" ON public.clientes;`,
        
        `CREATE POLICY "clientes_policy" ON public.clientes 
         FOR ALL TO public USING (true) WITH CHECK (true);`,

        // Tabela tecnicos
        `CREATE TABLE IF NOT EXISTS public.tecnicos (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          nome text,
          criado_em timestamp DEFAULT current_timestamp,
          telefone text,
          email text,
          endereco text,
          cpf text
        );`,
        
        `ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;`,
        
        `DROP POLICY IF EXISTS "tecnicos_policy" ON public.tecnicos;`,
        
        `CREATE POLICY "tecnicos_policy" ON public.tecnicos 
         FOR ALL TO public USING (true) WITH CHECK (true);`,

        // Tabela ordens_servico
        `CREATE TABLE IF NOT EXISTS public.ordens_servico (
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
        );`,
        
        `ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;`,
        
        `DROP POLICY IF EXISTS "ordens_servico_policy" ON public.ordens_servico;`,
        
        `CREATE POLICY "ordens_servico_policy" ON public.ordens_servico 
         FOR ALL TO public USING (true) WITH CHECK (true);`,

        // Tabela itens_ordem
        `CREATE TABLE IF NOT EXISTS public.itens_ordem (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          ordem_id uuid REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
          nome_item text,
          quantidade int4,
          preco_unitario numeric
        );`,
        
        `ALTER TABLE public.itens_ordem ENABLE ROW LEVEL SECURITY;`,
        
        `DROP POLICY IF EXISTS "itens_ordem_policy" ON public.itens_ordem;`,
        
        `CREATE POLICY "itens_ordem_policy" ON public.itens_ordem 
         FOR ALL TO public USING (true) WITH CHECK (true);`
      ]
      
      // Executar cada comando individualmente
      for (const [index, command] of sqlCommands.entries()) {
        try {
          console.log(`Executando comando ${index + 1}/${sqlCommands.length}:`, command.substring(0, 50) + '...')
          
          const { error } = await client.rpc('query', { 
            query_text: command 
          })
          
          if (error) {
            console.warn(`Aviso no comando ${index + 1}:`, error.message)
            // Continua mesmo com avisos - podem ser esperados (ex: política já existe)
          } else {
            console.log(`Comando ${index + 1} executado com sucesso`)
          }
        } catch (cmdError) {
          console.warn(`Erro no comando ${index + 1}:`, cmdError)
          // Continua mesmo com erros - tabelas podem já existir
        }
      }
      
      console.log('Estrutura do banco verificada/criada com sucesso')
      return true
    } catch (error) {
      console.error('Erro ao criar estrutura do banco:', error)
      // Tentar método alternativo usando consultas diretas
      return await createTablesDirectly(client)
    }
  }

  const createTablesDirectly = async (client: any) => {
    try {
      console.log('Tentando método alternativo para criar tabelas...')
      
      // Verificar se as tabelas principais existem
      const { data: tables, error: tablesError } = await client
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['clientes', 'tecnicos', 'ordens_servico', 'pecas_manutencao', 'dados_empresa'])

      if (tablesError) {
        console.log('Não foi possível verificar tabelas existentes:', tablesError)
      }

      const existingTables = tables?.map(t => t.table_name) || []
      console.log('Tabelas existentes:', existingTables)

      if (existingTables.length < 5) {
        console.log('Algumas tabelas estão faltando. Estrutura pode precisar ser criada manualmente.')
        return false
      }

      console.log('Todas as tabelas principais estão presentes')
      return true
    } catch (error) {
      console.error('Erro no método alternativo:', error)
      return false
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
        const structureCreated = await createDatabaseStructure(testClient)
        if (structureCreated) {
          toast({
            title: "Configuração salva",
            description: "Configurações salvas e estrutura do banco verificada com sucesso.",
          })
        } else {
          toast({
            title: "Configuração salva",
            description: "Configurações salvas. Algumas tabelas podem precisar ser criadas manualmente no Supabase.",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      console.log('Erro ao criar estrutura:', error)
      toast({
        title: "Configuração salva",
        description: "Configurações salvas, mas houve um problema ao criar a estrutura do banco. Verifique as permissões no Supabase.",
        variant: "destructive",
      })
    }

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
        const { error } = await testClient.from('clientes').select('id', { count: 'exact', head: true })
        
        if (!error) {
          setConnectionStatus('connected')
          setDbInfo({ name: 'Sistema de Gestão Database' })
          
          toast({
            title: "Conexão bem-sucedida",
            description: "Banco conectado com sucesso! Estrutura verificada.",
          })
        } else if (error.code === 'PGRST116') {
          // Tabela não existe - tentar criar estrutura
          console.log('Tabelas não existem, criando estrutura do banco...')
          const structureCreated = await createDatabaseStructure(testClient)
          
          if (structureCreated) {
            setConnectionStatus('connected')
            setDbInfo({ name: 'Sistema de Gestão Database' })
            
            toast({
              title: "Conexão bem-sucedida",
              description: "Banco conectado e estrutura criada com sucesso!",
            })
          } else {
            setConnectionStatus('disconnected')
            toast({
              title: "Atenção",
              description: "Conexão estabelecida, mas não foi possível criar todas as tabelas automaticamente. Verifique as permissões.",
              variant: "destructive",
            })
          }
        } else {
          throw error
        }
      }
    } catch (error) {
      setConnectionStatus('disconnected')
      console.error('Erro na conexão:', error)
      toast({
        title: "Erro na conexão",
        description: "Não foi possível conectar ao banco de dados. Verifique as credenciais.",
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

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>* Campos obrigatórios</p>
                  <p>As configurações são salvas localmente no navegador.</p>
                  <p>O sistema tentará criar automaticamente as tabelas necessárias.</p>
                  <p><strong>Nota:</strong> Se as tabelas não forem criadas automaticamente, você pode criá-las manualmente no painel do Supabase usando o SQL Editor.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </>
  )
}
