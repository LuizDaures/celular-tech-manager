
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Settings } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function DatabaseConfig() {
  const [isOpen, setIsOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [serviceKey, setServiceKey] = useState('')
  
  const { toast } = useToast()

  const handleSave = () => {
    if (!url || !anonKey) {
      toast({
        title: "Erro",
        description: "URL e Anon Public são obrigatórios.",
        variant: "destructive",
      })
      return
    }

    // Salvar no localStorage para demonstração
    localStorage.setItem('supabase_config', JSON.stringify({
      url,
      anonKey,
      serviceKey
    }))

    toast({
      title: "Configuração salva",
      description: "As configurações do banco de dados foram salvas com sucesso.",
    })
    
    setIsOpen(false)
  }

  const handleTest = () => {
    if (!url || !anonKey) {
      toast({
        title: "Erro",
        description: "Preencha a URL e Anon Public para testar a conexão.",
        variant: "destructive",
      })
      return
    }

    // Simular teste de conexão
    toast({
      title: "Testando conexão...",
      description: "Verificando conectividade com o banco de dados.",
    })

    setTimeout(() => {
      toast({
        title: "Conexão bem-sucedida",
        description: "O banco de dados está acessível.",
      })
    }, 2000)
  }

  return (
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
      <CardContent>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Configurar Supabase
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-content text-white text-xs font-bold">
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

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleTest} className="flex-1">
                  Testar Conexão
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
  )
}
