
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface ItemForm {
  peca_id?: string
  nome_item: string
  quantidade: number
  preco_unitario: number
  is_from_estoque?: boolean
}

export function useEstoqueManager() {
  const queryClient = useQueryClient()

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
    
    if (novoEstoque < 0) {
      throw new Error('Estoque insuficiente')
    }
    
    const { error } = await supabase
      .from('pecas_manutencao')
      .update({ estoque: novoEstoque })
      .eq('id', pecaId)
    
    if (error) {
      console.error('Erro ao atualizar estoque:', error)
      throw error
    }

    // Invalidar cache
    queryClient.invalidateQueries({ queryKey: ['pecas'] })
  }

  const processarMudancasEstoque = async (novosItens: ItemForm[], itensOriginais: ItemForm[] = []) => {
    console.log('Processando mudanças no estoque...')

    // Criar mapas apenas para itens do estoque
    const itensOriginaisMap = new Map(
      itensOriginais
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
        console.log(`Devolvido ${quantidadeOriginal} unidades da peça ${pecaId}`)
      }
    }

    // Itens adicionados - debitar estoque
    for (const [pecaId, novaQuantidade] of novosItensMap) {
      if (!itensOriginaisMap.has(pecaId)) {
        await updateEstoque(pecaId, -novaQuantidade)
        console.log(`Debitado ${novaQuantidade} unidades da peça ${pecaId}`)
      }
    }

    // Itens com quantidade alterada
    for (const [pecaId, novaQuantidade] of novosItensMap) {
      if (itensOriginaisMap.has(pecaId)) {
        const quantidadeOriginal = itensOriginaisMap.get(pecaId)!
        const diferenca = quantidadeOriginal - novaQuantidade
        if (diferenca !== 0) {
          await updateEstoque(pecaId, diferenca)
          console.log(`Ajustado ${diferenca} unidades da peça ${pecaId}`)
        }
      }
    }
  }

  return {
    updateEstoque,
    processarMudancasEstoque
  }
}
