
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
      // Mostrar modal inicial se nunca foi configurado
      setShowInitialModal(true)
    }
  }, [])

  const handleSave = () => {
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
      // Testar conexão real com o banco
      const testClient = recreateSupabaseClient()
      if (testClient) {
        const { data, error } = await testClient.from('ordens_servico').select('id', { count: 'exact', head: true })
        
        if (!error) {
          setConnectionStatus('connected')
          setDbInfo({ name: 'Sistema de Gestão Database' })
          
          toast({
            title: "Conexão bem-sucedida",
            description: "Banco conectado com sucesso!",
          })
        } else {
          throw error
        }
      }
    } catch (error) {
      setConnectionStatus('disconnected')
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
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </>
  )
}
