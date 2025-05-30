import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { CheckCircle, Eye, EyeOff, Moon, Sun, XCircle } from 'lucide-react'
import { recreateSupabaseClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export function DatabaseSetupScreen() {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [darkMode, setDarkMode] = useState(false)
  const { toast } = useToast()

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark')
    setDarkMode((d) => !d)
  }

  useEffect(() => {
    const existing = localStorage.getItem('supabase_config')
    if (existing) {
      window.location.reload()
    }
  }, [])

  const handleTest = async () => {
    if (!url || !anonKey) {
      toast({ title: 'Erro', description: 'Preencha todos os campos.', variant: 'destructive' })
      return
    }

    setStatus('testing')
    let timeoutId: NodeJS.Timeout

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('timeout')), 8000)
    })

    try {
      const client = recreateSupabaseClient({ url, anonKey })
      const req = client.from('clientes').select('id', { count: 'exact', head: true })
      const result = await Promise.race([req, timeoutPromise])
      clearTimeout(timeoutId)

      if (
        typeof result === 'object' &&
        result !== null &&
        'error' in result &&
        (result as any).error?.code === 'PGRST116'
      ) {
        throw new Error('Estrutura de banco não criada')
      }

      toast({ title: 'Sucesso', description: 'Conexão validada e estrutura detectada.' })
      setStatus('success')
    } catch {
      clearTimeout(timeoutId)
      setStatus('error')
      toast({ title: 'Erro', description: 'Falha na conexão ou estrutura inválida.', variant: 'destructive' })
    }
  }

  const handleSave = () => {
    if (status !== 'success') {
      toast({ title: 'Erro', description: 'Você precisa validar a conexão primeiro.', variant: 'destructive' })
      return
    }

    localStorage.setItem('supabase_config', JSON.stringify({ url, anonKey }))
    localStorage.setItem('db_configured', 'true')
    toast({ title: 'Credenciais salvas', description: 'Recarregando...' })
    window.location.reload()
  }

  return (
    <div className={`fixed inset-0 z-50 overflow-auto ${darkMode ? 'dark bg-background text-foreground' : 'bg-white'}`}>
      <div className="flex justify-end p-4">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="max-w-2xl mx-auto py-4">
        <Card>
          <CardHeader>
            <CardTitle>Configuração do Banco</CardTitle>
            <CardDescription>Preencha as credenciais do Supabase antes de continuar.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <Label>URL do Supabase</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://projeto.supabase.co" />
            </div>

            <div>
              <Label>Anon Public Key</Label>
              <div className="relative">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((s) => !s)}
                  className="absolute right-2 inset-y-0 flex items-center text-muted-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleTest} disabled={status === 'testing'}>
                {status === 'testing' ? 'Testando...' : 'Testar Conexão'}
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={status !== 'success'}>
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
