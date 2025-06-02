
import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient, PecaManutencao } from '@/lib/supabase'
import { ItemValidator } from '@/components/ItemValidator'
import { useToast } from '@/hooks/use-toast'

interface ItemForm {
  peca_id?: string
  nome_item: string
  quantidade: number
  preco_unitario: number
  is_from_estoque?: boolean
}

export function useItensManager(initialItens: ItemForm[] = []) {
  const [itens, setItens] = useState<ItemForm[]>(initialItens)
  const { toast } = useToast()
  
  const { data: pecas = [] } = useQuery({
    queryKey: ['pecas_manutencao'],
    queryFn: async () => {
      const supabase = await getSupabaseClient()
      if (!supabase) return []
      
      const { data, error } = await supabase
        .from('pecas_manutencao')
        .select('*')
        .order('nome')
      
      if (error) throw error
      return data as PecaManutencao[]
    }
  })

  const addItem = useCallback(() => {
    setItens(prev => [...prev, { 
      nome_item: '', 
      quantidade: 1, 
      preco_unitario: 0, 
      is_from_estoque: false 
    }])
  }, [])

  const addItemFromEstoque = useCallback((peca: PecaManutencao, quantidade: number = 1) => {
    // Verificar se a peça já foi adicionada
    const pecaExistente = itens.find(item => item.peca_id === peca.id)
    if (pecaExistente) {
      toast({
        title: "Peça já adicionada",
        description: "Esta peça já está na ordem. Edite a quantidade se necessário.",
        variant: "destructive",
      })
      return false
    }

    // Verificar estoque disponível
    if (peca.estoque < quantidade) {
      toast({
        title: "Estoque insuficiente",
        description: `Apenas ${peca.estoque} unidades disponíveis.`,
        variant: "destructive",
      })
      return false
    }

    const newItem: ItemForm = {
      peca_id: peca.id,
      nome_item: peca.nome,
      quantidade,
      preco_unitario: peca.preco_unitario,
      is_from_estoque: true
    }

    setItens(prev => [...prev, newItem])
    return true
  }, [itens, toast])

  const removeItem = useCallback((index: number) => {
    setItens(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateItem = useCallback((index: number, field: keyof ItemForm, value: string | number) => {
    setItens(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }, [])

  const validateItens = useCallback(() => {
    return ItemValidator.validateItems(itens, pecas)
  }, [itens, pecas])

  const totalValue = itens.reduce((total, item) => total + (item.quantidade * item.preco_unitario), 0)

  return {
    itens,
    setItens,
    addItem,
    addItemFromEstoque,
    removeItem,
    updateItem,
    validateItens,
    totalValue,
    pecas
  }
}
