
import { useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase'

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
    
    const client = await getSupabaseClient()
    if (!client) throw new Error('Cliente Supabase não disponível')
    
    const { data: peca, error: fetchError } = await client
      .from('pecas_manutencao')
      .select('estoque')
      .eq('id', pecaId)
      .single()
    
    if (fetchError) {
      console.error('Erro ao buscar estoque atual:', fetchError)
      throw fetchError
    }
    
    const novoEstoque = peca.estoque + quantidadeAlterada
    console.log(`Estoque atual: ${peca.estoque}, alteração: ${quantidadeAlterada}, novo estoque: ${novoEstoque}`)
    
    if (novoEstoque < 0) {
      throw new Error(`Estoque insuficiente. Estoque atual: ${peca.estoque}, tentativa de débito: ${Math.abs(quantidadeAlterada)}`)
    }
    
    const { error } = await client
      .from('pecas_manutencao')
      .update({ estoque: novoEstoque })
      .eq('id', pecaId)
    
    if (error) {
      console.error('Erro ao atualizar estoque:', error)
      throw error
    }

    console.log(`Estoque atualizado com sucesso para peça ${pecaId}: ${novoEstoque}`)
    // Invalidar todos os caches relacionados
    await queryClient.invalidateQueries({ queryKey: ['pecas'] })
    await queryClient.invalidateQueries({ queryKey: ['pecas_manutencao'] })
  }

  const processarMudancasEstoque = async (novosItens: ItemForm[], itensOriginais: ItemForm[] = []) => {
    console.log('=== INICIANDO PROCESSAMENTO DE MUDANÇAS NO ESTOQUE ===')
    console.log('Itens originais:', itensOriginais)
    console.log('Novos itens:', novosItens)

    // Criar mapas apenas para itens do estoque
    const itensOriginaisMap = new Map<string, number>()
    const novosItensMap = new Map<string, number>()

    // Processar itens originais do estoque
    itensOriginais.forEach(item => {
      if (item.peca_id && item.is_from_estoque) {
        itensOriginaisMap.set(item.peca_id, item.quantidade)
        console.log(`Item original do estoque: ${item.peca_id} - Qtd: ${item.quantidade}`)
      }
    })

    // Processar novos itens do estoque
    novosItens.forEach(item => {
      if (item.peca_id && item.is_from_estoque) {
        novosItensMap.set(item.peca_id, item.quantidade)
        console.log(`Novo item do estoque: ${item.peca_id} - Qtd: ${item.quantidade}`)
      }
    })

    try {
      // 1. Processar itens removidos - devolver ao estoque (CRÍTICO: ESTE ERA O BUG)
      for (const [pecaId, quantidadeOriginal] of itensOriginaisMap) {
        if (!novosItensMap.has(pecaId)) {
          console.log(`🔄 DEVOLVENDO ${quantidadeOriginal} unidades da peça ${pecaId} ao estoque (item removido)`)
          await updateEstoque(pecaId, quantidadeOriginal)
        }
      }

      // 2. Processar itens adicionados - debitar do estoque
      for (const [pecaId, novaQuantidade] of novosItensMap) {
        if (!itensOriginaisMap.has(pecaId)) {
          console.log(`➖ DEBITANDO ${novaQuantidade} unidades da peça ${pecaId} do estoque (item adicionado)`)
          await updateEstoque(pecaId, -novaQuantidade)
        }
      }

      // 3. Processar itens com quantidade alterada
      for (const [pecaId, novaQuantidade] of novosItensMap) {
        const quantidadeOriginal = itensOriginaisMap.get(pecaId)
        if (quantidadeOriginal !== undefined) {
          const diferenca = quantidadeOriginal - novaQuantidade
          if (diferenca !== 0) {
            console.log(`📊 AJUSTANDO estoque da peça ${pecaId}: diferença de ${diferenca} unidades (original: ${quantidadeOriginal}, nova: ${novaQuantidade})`)
            await updateEstoque(pecaId, diferenca)
          }
        }
      }

      console.log('=== PROCESSAMENTO DE ESTOQUE CONCLUÍDO COM SUCESSO ===')
    } catch (error) {
      console.error('=== ERRO NO PROCESSAMENTO DE ESTOQUE ===', error)
      throw error
    }
  }

  return {
    updateEstoque,
    processarMudancasEstoque
  }
}
