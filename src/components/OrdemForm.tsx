
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient, OrdemCompleta, Cliente, Tecnico } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { OrdemBasicInfo } from '@/components/OrdemBasicInfo'
import { OrdemStatusSection } from '@/components/OrdemStatusSection'
import { OrdemItensManager } from '@/components/OrdemItensManager'
import { useEstoqueManager } from '@/hooks/useEstoqueManager'
import { ItemValidator } from '@/components/ItemValidator'

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
  const [valorManutencao, setValorManutencao] = useState(ordem?.valor_manutencao?.toString() || '')
  
  // Estados para itens
  const [itens, setItens] = useState<ItemForm[]>([])
  const [originalItens, setOriginalItens] = useState<ItemForm[]>([])
  
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { processarMudancasEstoque } = useEstoqueManager()

  // Carregar itens da ordem
  useEffect(() => {
    if (ordem?.itens) {
      const itensCarregados = ordem.itens.map(item => ({
        peca_id: item.peca_id,
        nome_item: item.nome_item,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        is_from_estoque: !!item.peca_id
      }))
      setItens(itensCarregados)
      setOriginalItens(itensCarregados)
      console.log('Itens originais carregados:', itensCarregados)
    }
  }, [ordem?.itens])

  // Queries para dados
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const supabase = await getSupabaseClient()
      if (!supabase) throw new Error('Database connection not available')

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
      const supabase = await getSupabaseClient()
      if (!supabase) throw new Error('Database connection not available')

      const { data, error } = await supabase
        .from('tecnicos')
        .select('*')
        .order('nome')
      
      if (error) throw error
      return data as Tecnico[]
    }
  })

  // Mutation para salvar ordem
  const saveOrdem = useMutation({
    mutationFn: async (data: any) => {
      console.log('=== SALVANDO ORDEM ===')
      console.log('Dados da ordem:', data.ordemData)
      console.log('Itens atuais:', data.itens)
      console.log('Itens originais:', originalItens)
      
      const supabase = await getSupabaseClient()
      if (!supabase) throw new Error('Database connection not available')
      
      let ordemId = ordem?.id

      // Salvar dados da ordem
      if (ordem) {
        const { error } = await supabase
          .from('ordens_servico')
          .update(data.ordemData)
          .eq('id', ordem.id)
        
        if (error) throw error
      } else {
        const { data: newOrdem, error } = await supabase
          .from('ordens_servico')
          .insert([{ ...data.ordemData, data_abertura: new Date().toISOString() }])
          .select()
          .single()
        
        if (error) throw error
        ordemId = newOrdem.id
      }

      // Processar mudanças no estoque apenas se for uma ordem existente com itens
      if (ordem && data.itens.length > 0) {
        await processarMudancasEstoque(data.itens, originalItens)
      }

      // Gerenciar itens da ordem
      if (ordemId) {
        // Deletar itens existentes
        if (ordem) {
          const { error: deleteError } = await supabase
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
            preco_unitario: item.preco_unitario
          }))

          const { error: itensError } = await supabase
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
          "A ordem foi atualizada com sucesso." :
          "A ordem foi criada com sucesso.",
      })
      onSuccess()
    },
    onError: (error: any) => {
      console.error('Erro ao salvar ordem:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar ordem: " + error.message,
        variant: "destructive",
      })
    }
  })

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

    // Validar itens se houver
    if (itens.length > 0) {
      const itemErrors = ItemValidator.validateItems(itens, [])
      if (itemErrors.length > 0) {
        toast({
          title: "Problemas com os itens",
          description: itemErrors[0],
          variant: "destructive",
        })
        return
      }
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
      valor_manutencao: valorManutencao ? parseFloat(valorManutencao) : null,
      ...(status === 'concluida' && !ordem?.data_conclusao ? 
        { data_conclusao: new Date().toISOString() } : {})
    }

    saveOrdem.mutate({ ordemData, itens })
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 gap-6">
        {/* Formulário Principal */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações Básicas */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Informações Básicas</h3>
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
            <div className="bg-card border rounded-lg p-6">
              <OrdemItensManager
                itens={itens}
                setItens={setItens}
                readOnly={readOnly}
              />
            </div>

            {/* Status e Valores */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Status e Valores</h3>
              <OrdemStatusSection
                status={status}
                setStatus={setStatus}
                valor={valor}
                setValor={setValor}
                valorManutencao={valorManutencao}
                setValorManutencao={setValorManutencao}
                totalItens={itens.reduce((total, item) => total + (item.quantidade * item.preco_unitario), 0)}
                readOnly={readOnly}
              />
            </div>

            {/* Botões de Ação */}
            {!readOnly && (
              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  disabled={saveOrdem.isPending}
                  className="min-w-32"
                  size="lg"
                >
                  {saveOrdem.isPending ? 'Salvando...' : (ordem ? 'Atualizar Ordem' : 'Criar Ordem')}
                </Button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
