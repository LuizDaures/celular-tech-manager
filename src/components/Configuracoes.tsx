
import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Building, ImageIcon } from 'lucide-react'
import { DatabaseConfig } from '@/components/DatabaseConfig'

export function Configuracoes() {
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Buscar dados da empresa
  const { data: dadosEmpresa } = useQuery({
    queryKey: ['dados-empresa'],
    queryFn: async () => {
      if (!supabase) {
        return null
      }
      
      const { data, error } = await supabase
        .from('dados_empresa')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching empresa data:', error)
        throw error
      }
      
      return data
    }
  })

  // Mutation para salvar dados da empresa
  const saveEmpresaMutation = useMutation({
    mutationFn: async (data: { nome: string; cnpj?: string; logo_base64?: string }) => {
      if (!supabase) {
        throw new Error('Banco não configurado')
      }
      
      if (dadosEmpresa) {
        const { error } = await supabase
          .from('dados_empresa')
          .update(data)
          .eq('id', dadosEmpresa.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('dados_empresa')
          .insert([data])
        
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dados-empresa'] })
      toast({
        title: "Configurações salvas",
        description: "Os dados da empresa foram salvos com sucesso.",
      })
    },
    onError: (error) => {
      console.error('Error saving empresa data:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar os dados da empresa.",
        variant: "destructive",
      })
    }
  })

  useEffect(() => {
    if (dadosEmpresa) {
      setNome(dadosEmpresa.nome || '')
      setCnpj(dadosEmpresa.cnpj || '')
      setLogoPreview(dadosEmpresa.logo_base64 || '')
    }
  }, [dadosEmpresa])

  const handleSaveSettings = () => {
    saveEmpresaMutation.mutate({
      nome: nome.trim(),
      cnpj: cnpj.trim() || null,
      logo_base64: logoPreview || null,
    })
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Erro",
        description: "Por favor, selecione um arquivo de imagem.",
        variant: "destructive",
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      const base64Data = base64.split(',')[1] // Remove o prefixo data:image/...;base64,
      setLogoFile(file)
      setLogoPreview(base64Data)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Configure os dados da sua empresa e outras preferências do sistema.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Configurações da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Dados da Empresa
            </CardTitle>
            <CardDescription>
              Configure as informações que aparecerão nos relatórios e documentos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Nome da Empresa</Label>
                <Input
                  id="company-name"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome da assistência técnica"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="company-cnpj">CNPJ</Label>
                <Input
                  id="company-cnpj"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-logo">Logo da Empresa</Label>
                <Input
                  id="company-logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="max-w-md"
                />
              </div>
              
              {logoPreview && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">Logo carregada com sucesso</span>
                  </div>
                  <div className="border rounded-lg p-4 bg-gray-50 inline-block">
                    <img 
                      src={`data:image/png;base64,${logoPreview}`} 
                      alt="Logo da empresa"
                      className="max-h-24 max-w-48 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="pt-4">
              <Button 
                onClick={handleSaveSettings} 
                disabled={saveEmpresaMutation.isPending}
                className="w-full md:w-auto"
              >
                {saveEmpresaMutation.isPending ? 'Salvando...' : 'Salvar Informações'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Configurações do Banco de Dados */}
        <DatabaseConfig />
      </div>
    </div>
  )
}
