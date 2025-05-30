
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Database } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function DatabaseConfig() {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const { toast } = useToast()

  useEffect(() => {
    const config = localStorage.getItem('supabase_config')
    if (config) {
      const parsed = JSON.parse(config)
      setUrl(parsed.url || '')
      setAnonKey(parsed.anonKey || '')
    }
  }, [])

  const handleReset = () => {
    localStorage.removeItem('supabase_config')
    localStorage.removeItem('db_configured')
    toast({ 
      title: 'Desconectado', 
      description: 'Recarregando aplicação...' 
    })
    setTimeout(() => window.location.reload(), 1000)
  }

  if (!url || !anonKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-gray-400" />
            Banco de Dados
          </CardTitle>
          <CardDescription>Nenhuma conexão configurada</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Configure uma conexão com o banco de dados para usar o sistema.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-green-600" />
          Banco de Dados Conectado
        </CardTitle>
        <CardDescription>Conexão ativa com o Supabase</CardDescription>
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
  )
}
