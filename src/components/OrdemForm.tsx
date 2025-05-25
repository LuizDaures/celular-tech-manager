import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, OrdemCompleta, Cliente, Tecnico } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'

interface OrdemFormProps {
  ordem?: OrdemCompleta | null
  readOnly?: boolean
  onSuccess: () => void
}

export function OrdemForm({ ordem, readOnly = false, onSuccess }: OrdemFormProps) {
  const [clienteId, setClienteId] = useState(ordem?.cliente_id || '')
  const [tecnicoId, setTecnicoId] = useState(ordem?.tecnico_id || '')
  const [descricaoProblema, setDescricaoProblema] = useState(ordem?.descricao_problema || '')
  const [diagnostico, setDiagnostico] = useState(ordem?.diagnostico || '')
  const [servicoRealizado, setServicoRealizado] = useState(ordem?.servico_realizado || '')
  const [status, setStatus] = useState<'aberta' | 'em_andamento' | 'concluida' | 'cancelada'>(ordem?.status || 'aberta')
  
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('nome')
      
      if (error) throw error
      return data as Cliente[]
    }
  })

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tecnicos')
        .select('*')
        .order('nome')
      
      if (error) throw error
      return data as Tecnico[]
    }
  })

  const saveOrdem = useMutation({
    mutationFn: async (data: any) => {
      if (ordem) {
        const { error } = await supabase
          .from('ordens_servico')
          .update(data)
          .eq('id', ordem.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('ordens_servico')
          .insert([{ ...data, data_abertura: new Date().toISOString() }])
        
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens'] })
      toast({
        title: ordem ? "Ordem atualizada" : "Ordem criada",
        description: ordem ? 
          "A ordem foi atualizada com sucesso." :
          "A ordem foi criada com sucesso.",
      })
      onSuccess()
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar ordem.",
        variant: "destructive",
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!clienteId || !descricaoProblema.trim()) {
      toast({
        title: "Erro",
        description: "Cliente e descrição do problema são obrigatórios.",
        variant: "destructive",
      })
      return
    }

    const dataToSave = {
      cliente_id: clienteId,
      tecnico_id: tecnicoId === 'none' || !tecnicoId ? null : tecnicoId,
      descricao_problema: descricaoProblema.trim(),
      diagnostico: diagnostico.trim() || null,
      servico_realizado: servicoRealizado.trim() || null,
      status,
      ...(status === 'concluida' && !ordem?.data_conclusao ? 
        { data_conclusao: new Date().toISOString() } : {})
    }

    saveOrdem.mutate(dataToSave)
  }

  const handleStatusChange = (value: string) => {
    setStatus(value as 'aberta' | 'em_andamento' | 'concluida' | 'cancelada')
  }

  const handleTecnicoChange = (value: string) => {
    setTecnicoId(value === 'none' ? '' : value)
  }

  if (readOnly && ordem) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Cliente</Label>
            <p className="mt-1 p-2 bg-muted rounded">{ordem.cliente?.nome || 'Cliente não encontrado'}</p>
          </div>
          <div>
            <Label>Técnico</Label>
            <p className="mt-1 p-2 bg-muted rounded">{ordem.tecnico?.nome || 'Não atribuído'}</p>
          </div>
        </div>
        
        <div>
          <Label>Descrição do Problema</Label>
          <p className="mt-1 p-2 bg-muted rounded">{ordem.descricao_problema}</p>
        </div>
        
        {ordem.diagnostico && (
          <div>
            <Label>Diagnóstico</Label>
            <p className="mt-1 p-2 bg-muted rounded">{ordem.diagnostico}</p>
          </div>
        )}
        
        {ordem.servico_realizado && (
          <div>
            <Label>Serviço Realizado</Label>
            <p className="mt-1 p-2 bg-muted rounded">{ordem.servico_realizado}</p>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Status</Label>
            <p className="mt-1 p-2 bg-muted rounded capitalize">{ordem.status.replace('_', ' ')}</p>
          </div>
          <div>
            <Label>Total</Label>
            <p className="mt-1 p-2 bg-muted rounded">
              {ordem.total ? `R$ ${ordem.total.toFixed(2)}` : 'R$ 0,00'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente *</Label>
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tecnico">Técnico</Label>
          <Select value={tecnicoId || 'none'} onValueChange={handleTecnicoChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um técnico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {tecnicos.map((tecnico) => (
                <SelectItem key={tecnico.id} value={tecnico.id}>
                  {tecnico.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição do Problema *</Label>
        <Textarea
          id="descricao"
          value={descricaoProblema}
          onChange={(e) => setDescricaoProblema(e.target.value)}
          placeholder="Descreva o problema reportado pelo cliente"
          rows={3}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="diagnostico">Diagnóstico</Label>
        <Textarea
          id="diagnostico"
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
          placeholder="Diagnóstico técnico do problema"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="servico">Serviço Realizado</Label>
        <Textarea
          id="servico"
          value={servicoRealizado}
          onChange={(e) => setServicoRealizado(e.target.value)}
          placeholder="Descrição do serviço realizado"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aberta">Aberta</SelectItem>
            <SelectItem value="em_andamento">Em Andamento</SelectItem>
            <SelectItem value="concluida">Concluída</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={saveOrdem.isPending}>
          {saveOrdem.isPending ? 'Salvando...' : (ordem ? 'Atualizar' : 'Criar Ordem')}
        </Button>
      </div>
    </form>
  )
}
