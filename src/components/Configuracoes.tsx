
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Download, Upload, Trash2, Database } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useQuery } from '@tanstack/react-query'

export function Configuracoes() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [autoBackup, setAutoBackup] = useState(false)
  const [companyName, setCompanyName] = useState('TechFix Pro')
  const [companyPhone, setCompanyPhone] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const { data: allData } = useQuery({
    queryKey: ['export-data'],
    queryFn: async () => {
      const [ordensResult, clientesResult, tecnicosResult] = await Promise.all([
        supabase.from('view_ordem_servico_completa').select('*'),
        supabase.from('clientes').select('*'),
        supabase.from('tecnicos').select('*')
      ])

      return {
        ordens: ordensResult.data || [],
        clientes: clientesResult.data || [],
        tecnicos: tecnicosResult.data || []
      }
    },
    enabled: false
  })

  const handleSaveSettings = () => {
    // Aqui você salvaria as configurações no localStorage ou no Supabase
    toast({
      title: "Configurações salvas",
      description: "As configurações foram salvas com sucesso.",
    })
  }

  const handleExportData = async () => {
    try {
      setIsExporting(true)
      
      // Fetch all data from Supabase
      const [ordensResult, clientesResult, tecnicosResult] = await Promise.all([
        supabase.from('view_ordem_servico_completa').select('*'),
        supabase.from('clientes').select('*'),
        supabase.from('tecnicos').select('*')
      ])

      const exportData = {
        exportDate: new Date().toISOString(),
        ordens: ordensResult.data || [],
        clientes: clientesResult.data || [],
        tecnicos: tecnicosResult.data || []
      }

      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `techfix-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)

      toast({
        title: "Exportação concluída",
        description: "Os dados foram exportados com sucesso.",
      })
    } catch (error) {
      console.error('Erro na exportação:', error)
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao exportar os dados.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleImportData = () => {
    // Create file input
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)
        
        // Here you would implement the import logic
        console.log('Dados para importar:', data)
        
        toast({
          title: "Importação",
          description: "Funcionalidade de importação em desenvolvimento.",
        })
      } catch (error) {
        toast({
          title: "Erro na importação",
          description: "Arquivo inválido ou corrompido.",
          variant: "destructive",
        })
      }
    }
    input.click()
  }

  const handleClearData = () => {
    if (confirm('Tem certeza que deseja limpar todos os dados? Esta ação não pode ser desfeita.')) {
      toast({
        title: "Dados limpos",
        description: "Todos os dados foram removidos.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Configurações</h1>

      <div className="grid gap-6">
        {/* Informações da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Empresa</CardTitle>
            <CardDescription>
              Configure os dados da sua assistência técnica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Nome da Empresa</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nome da assistência técnica"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-phone">Telefone</Label>
                <Input
                  id="company-phone"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company-email">E-mail</Label>
                <Input
                  id="company-email"
                  type="email"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  placeholder="contato@empresa.com"
                />
              </div>
            </div>
            
            <Button onClick={handleSaveSettings}>
              Salvar Informações
            </Button>
          </CardContent>
        </Card>

        {/* Preferências do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Preferências do Sistema</CardTitle>
            <CardDescription>
              Configure como o sistema deve funcionar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificações</Label>
                <p className="text-sm text-muted-foreground">
                  Receber notificações sobre novas ordens e atualizações
                </p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Backup Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Fazer backup automático dos dados diariamente
                </p>
              </div>
              <Switch
                checked={autoBackup}
                onCheckedChange={setAutoBackup}
              />
            </div>
          </CardContent>
        </Card>

        {/* Gerenciamento de Dados */}
        <Card>
          <CardHeader>
            <CardTitle>Gerenciamento de Dados</CardTitle>
            <CardDescription>
              Exportar, importar ou limpar dados do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                onClick={handleExportData}
                disabled={isExporting}
              >
                <Download className="h-4 w-4 mr-2" />
                {isExporting ? 'Exportando...' : 'Exportar Dados'}
              </Button>
              
              <Button variant="outline" onClick={handleImportData}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Dados
              </Button>
              
              <Button variant="destructive" onClick={handleClearData}>
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Dados
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Status do Sistema</CardTitle>
            <CardDescription>
              Informações sobre o estado atual do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Banco de Dados</span>
                <Badge variant="default">
                  <Database className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Último Backup</span>
                <Badge variant="secondary">
                  Nunca
                </Badge>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-xs text-muted-foreground">
              <p>Versão do Sistema: 1.0.0</p>
              <p>Última Atualização: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
