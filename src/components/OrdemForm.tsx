import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, OrdemCompleta, Cliente, Tecnico } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Trash2, Plus } from 'lucide-react'
import { ItemSelector } from '@/components/ItemSelector'

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
  is_from_estoque?: boolean // Nova propriedade para identificar origem
}

export function OrdemForm({ ordem, readOnly = false, onSuccess }: OrdemFormProps) {
  const [clienteId, setClienteId] = useState(ordem?.cliente_id || '')
  const [tecnicoId, setTecnicoId] = useState(ordem?.tecnico_id || '')
  const [dispositivo, setDispositivo] = useState(ordem?.dispositivo || '')
  const [descricaoProblema, setDescricaoProblema] = useState(ordem?.descricao_problema || '')
  const [diagnostico, setDiagnostico] = useState(ordem?.diagnostico || '')
  const [servicoRealizado, setServicoRealizado] = useState(ordem?.servico_realizado || '')
  const [status, setStatus] = useState<'aberta' | 'em_andamento' | 'concluida' | 'cancelada'>(ordem?.status || 'aberta')
  const [valor, setValor] = useState(ordem?.valor?.toString() || '')
  const [itens, setItens] = useState<ItemForm[]>([])
  const [originalItens, setOriginalItens] = useState<ItemForm[]>([]) // Para comparar mudanças
  
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Carregar itens da ordem se estiver editando
  useEffect(() => {
    if (ordem?.itens) {
      const itensCarregados = ordem.itens.map(item => ({
        peca_id: item.peca_id,
        nome_item: item.nome_item,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        is_from_estoque: !!item.peca_id // Se tem peca_id, veio do estoque
      }))
      setItens(itensCarregados)
      setOriginalItens(itensCarregados) // Salvar estado original para comparações
    }
  }, [ordem?.itens])

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

  // Função para atualizar estoque
  const updateEstoque = async (pecaId: string, quantidadeAlterada: number) => {
    if (!pecaId) return
    
    console.log(`Atualizando estoque da peça ${pecaId} em ${quantidadeAlterada} unidades`)
    
    const { data: peca, error: fetchError } = await supabase
      .from('pecas_manutencao')
      .select('estoque')
      .eq('id', pecaId)
      .single()
    
    if (fetchError) {
      console.error('Erro ao buscar estoque atual:', fetchError)
      throw fetchError
    }
    
    const novoEstoque = peca.estoque + quantidadeAlterada
    console.log(`Estoque atual: ${peca.estoque}, novo estoque: ${novoEstoque}`)
    
    const { error } = await supabase
      .from('pecas_manutencao')
      .update({ estoque: novoEstoque })
      .eq('id', pecaId)
    
    if (error) {
      console.error('Erro ao atualizar estoque:', error)
      throw error
    }

    // Invalidar cache imediatamente após atualização
    queryClient.invalidateQueries({ queryKey: ['pecas'] })
  }

  // Função para processar mudanças no estoque
  const processarMudancasEstoque = async (novosItens: ItemForm[]) => {
    console.log('Processando mudanças no estoque...')
    console.log('Itens originais:', originalItens)
    console.log('Novos itens:', novosItens)

    // Se é uma nova ordem, apenas debitar estoque das peças do estoque
    if (!ordem) {
      for (const item of novosItens) {
        if (item.peca_id && item.is_from_estoque) {
          await updateEstoque(item.peca_id, -item.quantidade)
          console.log(`Debitado ${item.quantidade} unidades da peça ${item.peca_id}`)
        }
      }
      return
    }

    // Para ordens existentes, calcular diferenças apenas para itens do estoque
    const itensOriginaisMap = new Map(
      originalItens
        .filter(item => item.peca_id && item.is_from_estoque)
        .map(item => [item.peca_id!, item.quantidade])
    )
    
    const novosItensMap = new Map(
      novosItens
        .filter(item => item.peca_id && item.is_from_estoque)
        .map(item => [item.peca_id!, item.quantidade])
    )

    // Itens removidos - devolver ao estoque
    for (const [pecaId, quantidadeOriginal] of itensOriginaisMap) {
      if (!novosItensMap.has(pecaId)) {
        await updateEstoque(pecaId, quantidadeOriginal)
        console.log(`Devolvido ${quantidadeOriginal} unidades da peça ${pecaId} (item removido)`)
      }
    }

    // Itens adicionados - debitar estoque
    for (const [pecaId, novaQuantidade] of novosItensMap) {
      if (!itensOriginaisMap.has(pecaId)) {
        await updateEstoque(pecaId, -novaQuantidade)
        console.log(`Debitado ${novaQuantidade} unidades da peça ${pecaId} (item adicionado)`)
      }
    }

    // Itens com quantidade alterada - ajustar diferença
    for (const [pecaId, novaQuantidade] of novosItensMap) {
      if (itensOriginaisMap.has(pecaId)) {
        const quantidadeOriginal = itensOriginaisMap.get(pecaId)!
        const diferenca = quantidadeOriginal - novaQuantidade
        if (diferenca !== 0) {
          await updateEstoque(pecaId, diferenca)
          console.log(`Ajustado ${diferenca} unidades da peça ${pecaId} (quantidade alterada)`)
        }
      }
    }
  }

  const saveOrdem = useMutation({
    mutationFn: async (data: any) => {
      console.log('Saving ordem with data:', data)
      
      let ordemId = ordem?.id

      if (ordem) {
        const { error } = await supabase
          .from('ordens_servico')
          .update(data.ordemData)
          .eq('id', ordem.id)
        
        if (error) {
          console.error('Error updating ordem:', error)
          throw error
        }
      } else {
        const { data: newOrdem, error } = await supabase
          .from('ordens_servico')
          .insert([{ ...data.ordemData, data_abertura: new Date().toISOString() }])
          .select()
          .single()
        
        if (error) {
          console.error('Error creating ordem:', error)
          throw error
        }
        
        ordemId = newOrdem.id
      }

      // Processar mudanças no estoque ANTES de salvar os itens
      await processarMudancasEstoque(data.itens)

      // Gerenciar itens da ordem
      if (ordemId && data.itens.length >= 0) {
        // Deletar itens existentes se estiver editando
        if (ordem) {
          await supabase
            .from('itens_ordem')
            .delete()
            .eq('ordem_id', ordemId)
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

          if (itensError) {
            console.error('Error saving itens:', itensError)
            throw itensError
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens'] })
      queryClient.invalidateQueries({ queryKey: ['pecas'] })
      toast({
        title: ordem ? "Ordem atualizada" : "Ordem criada",
        description: ordem ? 
          "A ordem foi atualizada com sucesso." :
          "A ordem foi criada com sucesso.",
      })
      onSuccess()
    },
    onError: (error: any) => {
      console.error('Error saving ordem:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar ordem: " + error.message,
        variant: "destructive",
      })
    }
  })

  const addItem = () => {
    setItens([...itens, { nome_item: '', quantidade: 1, preco_unitario: 0, is_from_estoque: false }])
  }

  const addItemFromSelector = (item: any) => {
    // Verificar se a peça já foi adicionada
    const pecaJaAdicionada = itens.some(existingItem => existingItem.peca_id === item.peca_id)
    
    if (pecaJaAdicionada) {
      toast({
        title: "Peça já adicionada",
        description: "Esta peça já foi adicionada à ordem. Edite a quantidade se necessário.",
        variant: "destructive",
      })
      return
    }

    const newItem: ItemForm = {
      peca_id: item.peca_id,
      nome_item: item.nome_peca,
      quantidade: item.quantidade,
      preco_unitario: item.preco_unitario,
      is_from_estoque: true // Marcado como vindo do estoque
    }
    setItens([...itens, newItem])
  }

  const removeItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof ItemForm, value: string | number) => {
    const updatedItens = [...itens]
    updatedItens[index] = { ...updatedItens[index], [field]: value }
    setItens(updatedItens)
  }

  const calculateTotal = () => {
    const itensTotal = itens.reduce((total, item) => total + (item.quantidade * item.preco_unitario), 0)
    const valorManutencao = parseFloat(valor) || 0
    return itensTotal + valorManutencao
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!clienteId || !descricaoProblema.trim() || !dispositivo.trim()) {
      toast({
        title: "Erro",
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

  if (readOnly && ordem) {
    const totalItens = ordem.itens?.reduce((total, item) => total + (item.quantidade * item.preco_unitario), 0) || 0
    
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
          <Label>Dispositivo</Label>
          <p className="mt-1 p-2 bg-muted rounded">{ordem.dispositivo || 'Não informado'}</p>
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

        {ordem.itens && ordem.itens.length > 0 && (
          <div>
            <Label>Peças Utilizadas</Label>
            <div className="mt-1 space-y-2">
              {ordem.itens.map((item, index) => (
                <div key={index} className="p-3 bg-muted rounded flex justify-between items-center">
                  <div>
                    <p className="font-medium">{item.nome_item}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantidade: {item.quantidade} | Preço unitário: R$ {item.preco_unitario.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Status</Label>
            <p className="mt-1 p-2 bg-muted rounded capitalize">{ordem.status.replace('_', ' ')}</p>
          </div>
          <div>
            <Label>Valor da Manutenção</Label>
            <p className="mt-1 p-2 bg-muted rounded">
              {ordem.valor ? `R$ ${ordem.valor.toFixed(2)}` : 'R$ 0,00'}
            </p>
          </div>
          <div>
            <Label>Total Geral</Label>
            <p className="mt-1 p-2 bg-muted rounded font-semibold">
              R$ {((ordem.valor || 0) + totalItens).toFixed(2)}
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
          <Select value={tecnicoId || 'none'} onValueChange={(value) => setTecnicoId(value === 'none' ? '' : value)}>
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
        <Label htmlFor="dispositivo">Dispositivo *</Label>
        <Input
          id="dispositivo"
          value={dispositivo}
          onChange={(e) => setDispositivo(e.target.value)}
          placeholder="Ex: iPhone 12, Samsung Galaxy S21, Notebook Dell"
          required
        />
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

      {/* Seção de Peças */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label>Peças Utilizadas</Label>
          <div className="flex gap-2">
            <ItemSelector onAddItem={addItemFromSelector} />
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Item Manual
            </Button>
          </div>
        </div>
        
        {itens.map((item, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 border rounded">
            <div className="space-y-1">
              <Label>Nome do Item</Label>
              <Input
                value={item.nome_item}
                onChange={(e) => updateItem(index, 'nome_item', e.target.value)}
                placeholder="Ex: Tela LCD"
              />
              {item.is_from_estoque && (
                <p className="text-xs text-blue-600">📦 Peça do estoque</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={item.quantidade}
                onChange={(e) => updateItem(index, 'quantidade', parseInt(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-1">
              <Label>Preço Unitário</Label>
              <Input
                type="number"
                step="0.01"
                value={item.preco_unitario}
                onChange={(e) => updateItem(index, 'preco_unitario', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as 'aberta' | 'em_andamento' | 'concluida' | 'cancelada')}>
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

        <div className="space-y-2">
          <Label htmlFor="valor">Valor da Manutenção</Label>
          <Input
            id="valor"
            type="number"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label>Total Geral</Label>
          <div className="p-2 bg-muted rounded font-semibold">
            R$ {calculateTotal().toFixed(2)}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={saveOrdem.isPending}>
          {saveOrdem.isPending ? 'Salvando...' : (ordem ? 'Atualizar' : 'Criar Ordem')}
        </Button>
      </div>
    </form>
  )
}
