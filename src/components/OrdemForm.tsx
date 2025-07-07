
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient, OrdemCompleta, Cliente, Tecnico } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { OrdemBasicInfo } from '@/components/OrdemBasicInfo'
import { OrdemItensManager } from '@/components/OrdemItensManager'
import { OrdemStatusSection } from '@/components/OrdemStatusSection'
import { useEstoqueManager } from '@/hooks/useEstoqueManager'

interface OrdemFormProps {
  ordem?: OrdemCompleta | null
  readOnly?: boolean
  onSuccess: () => void
}

interface ItemForm {
  peca_id?: string
  nome_item: string
  quantidade: number
  preco_unitario: number
  is_from_estoque?: boolean
}

export function OrdemForm({ ordem, readOnly = false, onSuccess }: OrdemFormProps) {
  // Estados básicos
  const [clienteId, setClienteId] = useState(ordem?.cliente_id || '')
  const [tecnicoId, setTecnicoId] = useState(ordem?.tecnico_id || '')
  const [dispositivo, setDispositivo] = useState(ordem?.dispositivo || '')
  const [descricaoProblema, setDescricaoProblema] = useState(ordem?.descricao_problema || '')
  const [diagnostico, setDiagnostico] = useState(ordem?.diagnostico || '')
  const [servicoRealizado, setServicoRealizado] = useState(ordem?.servico_realizado || '')
  const [status, setStatus] = useState<'aberta' | 'em_andamento' | 'concluida' | 'cancelada'>(ordem?.status || 'aberta')
  const [valor, setValor] = useState(ordem?.valor?.toString() || '')
  
  // Estados para itens
  const [itens, setItens] = useState<ItemForm[]>([])
  const [originalItens, setOriginalItens] = useState<ItemForm[]>([])
  
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { processarMudancasEstoque } = useEstoqueManager()

// useEffect para carregar itens
const [hasLoadedOriginalItens, setHasLoadedOriginalItens] = useState(false)

useEffect(() => {
  if (ordem?.itens && !hasLoadedOriginalItens) {
    const itensCarregados = ordem.itens.map(item => ({
      peca_id: item.peca_id,
      nome_item: item.nome_item,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      is_from_estoque: item.is_from_estoque === true,
    }))

    const unicos = Array.from(new Map(itensCarregados.map(item => [item.peca_id, item])).values())

    setItens(unicos)
    setOriginalItens(unicos)
    setHasLoadedOriginalItens(true)
    console.log('Itens originais carregados pela primeira vez:', unicos)
  } else if (ordem?.itens && hasLoadedOriginalItens) {
    // Apenas atualiza os itens atuais, mantém os originais
    const itensCarregados = ordem.itens.map(item => ({
      peca_id: item.peca_id,
      nome_item: item.nome_item,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      is_from_estoque: item.is_from_estoque === true,
    }))

    const unicos = Array.from(new Map(itensCarregados.map(item => [item.peca_id, item])).values())
    setItens(unicos)
    console.log('Itens atuais atualizados:', unicos)
    console.log('Itens originais preservados:', originalItens)
  }
}, [ordem?.itens, hasLoadedOriginalItens])



  // queries para dados
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const client = await getSupabaseClient()
      if (!client) throw new Error('Cliente Supabase não disponível')
      
      const { data, error } = await client
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
      const client = await getSupabaseClient()
      if (!client) throw new Error('Cliente Supabase não disponível')
      
      const { data, error } = await client
        .from('tecnicos')
        .select('*')
        .order('nome')
      
      if (error) throw error
      return data as Tecnico[]
    }
  })

  // mutation para salvar ordem
  const saveOrdem = useMutation({
    mutationFn: async (data: any) => {
      console.log('=== SALVANDO ORDEM ===')
      console.log('Dados da ordem:', data.ordemData)
      console.log('Itens atuais:', data.itens)
      console.log('Itens originais:', originalItens)
      
      const client = await getSupabaseClient()
      if (!client) throw new Error('Cliente Supabase não disponível')
      
      let ordemId = ordem?.id

      // Salvar dados da ordem
      if (ordem) {
        const { error } = await client
          .from('ordens_servico')
          .update(data.ordemData)
          .eq('id', ordem.id)
        
        if (error) throw error
      } else {
        const { data: newOrdem, error } = await client
          .from('ordens_servico')
          .insert([{ ...data.ordemData, data_abertura: new Date().toISOString() }])
          .select()
          .single()
        
        if (error) throw error
        ordemId = newOrdem.id
      }

      // Processar mudanças no estoque ANTES de gerenciar itens
      console.log('🔍 DEBUGGING - Chamando processarMudancasEstoque com:')
      console.log('  Novos itens:', data.itens)
      console.log('  Itens originais:', originalItens)
      await processarMudancasEstoque(data.itens, originalItens)

      // Gerenciar itens da ordem
      if (ordemId) {
        // Deletar itens existentes
        if (ordem) {
          const { error: deleteError } = await client
            .from('itens_ordem')
            .delete()
            .eq('ordem_id', ordemId)
          
          if (deleteError) throw deleteError
        }

        // Inserir novos itens
        if (data.itens.length > 0) {
        const itensToInsert = data.itens.map((item: ItemForm) => ({
  ordem_id: ordemId,
  peca_id: item.peca_id || null,
  nome_item: item.nome_item,
  quantidade: item.quantidade,
  preco_unitario: item.preco_unitario,
  is_from_estoque: !!item.is_from_estoque
}))


          const { error: itensError } = await client
            .from('itens_ordem')
            .insert(itensToInsert)

          if (itensError) throw itensError
        }
      }
    },
    onSuccess: () => {
      // Invalidar TODOS os caches relacionados
      queryClient.invalidateQueries({ queryKey: ['ordens'] })
      queryClient.invalidateQueries({ queryKey: ['pecas'] })
      queryClient.invalidateQueries({ queryKey: ['pecas_manutencao'] })
      queryClient.invalidateQueries({ queryKey: ['estoque'] })
      
      toast({
        title: ordem ? "Ordem atualizada" : "Ordem criada",
        description: ordem ? 
          "A ordem foi atualizada com sucesso. O estoque foi ajustado automaticamente." :
          "A ordem foi criada com sucesso. O estoque foi ajustado automaticamente.",
      })
      onSuccess()
    },
    onError: (error: any) => {
      console.error('Erro ao salvar ordem:', error)
      
      let errorMessage = "Erro inesperado ao salvar ordem"
      
      // Verificar se é erro de estoque
      if (error.message && error.message.includes('Estoque insuficiente')) {
        errorMessage = error.message
      } else if (error.message && error.message.includes('estoque')) {
        errorMessage = error.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: "Erro ao salvar ordem",
        description: errorMessage,
        variant: "destructive",
      })
    }
  })

  // handleSubmit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!clienteId || !descricaoProblema.trim() || !dispositivo.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Cliente, dispositivo e descrição do problema são obrigatórios.",
        variant: "destructive",
      })
      return
    }

    const ordemData = {
      cliente_id: clienteId,
      tecnico_id: tecnicoId === 'none' || !tecnicoId ? null : tecnicoId,
      dispositivo: dispositivo.trim(),
      descricao_problema: descricaoProblema.trim(),
      diagnostico: diagnostico.trim() || null,
      servico_realizado: servicoRealizado.trim() || null,
      status,
      valor: valor ? parseFloat(valor) : null,
      ...(status === 'concluida' && !ordem?.data_conclusao ? 
        { data_conclusao: new Date().toISOString() } : {})
    }

    saveOrdem.mutate({ ordemData, itens })
  }

  return (
    <div className="w-full">
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {ordem ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {readOnly ? 'Visualizando ordem de serviço' : 'Preencha os dados da ordem de serviço'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              Informações Básicas
            </h3>
            <OrdemBasicInfo
              clienteId={clienteId}
              setClienteId={setClienteId}
              tecnicoId={tecnicoId}
              setTecnicoId={setTecnicoId}
              dispositivo={dispositivo}
              setDispositivo={setDispositivo}
              descricaoProblema={descricaoProblema}
              setDescricaoProblema={setDescricaoProblema}
              diagnostico={diagnostico}
              setDiagnostico={setDiagnostico}
              servicoRealizado={servicoRealizado}
              setServicoRealizado={setServicoRealizado}
              clientes={clientes}
              tecnicos={tecnicos}
              readOnly={readOnly}
            />
          </div>

          {/* Peças e Materiais */}
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              Peças e Materiais
            </h3>
            <OrdemItensManager
              itens={itens}
              setItens={setItens}
              readOnly={readOnly}
            />
          </div>

          {/* Status e Valores */}
          <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
            <h3 className="text-lg font-semibold mb-4 text-card-foreground flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              Status e Valores
            </h3>
            <OrdemStatusSection
              status={status}
              setStatus={setStatus}
              valor={valor}
              setValor={setValor}
              totalItens={itens.reduce((total, item) => total + (item.quantidade * item.preco_unitario), 0)}
              readOnly={readOnly}
            />
          </div>

          {/* Botões de Ação */}
          {!readOnly && (
            <div className="flex justify-end gap-4 pt-4">
              <Button 
                type="submit" 
                disabled={saveOrdem.isPending}
                className="min-w-40"
                size="lg"
              >
                {saveOrdem.isPending ? 'Salvando...' : (ordem ? 'Atualizar Ordem' : 'Criar Ordem')}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
