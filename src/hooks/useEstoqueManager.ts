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

    const log = (...args: any[]) => {
      if (process.env.NODE_ENV !== 'production') console.log(...args)
    }

    log(`🔧 Atualizando estoque da peça ${pecaId} em ${quantidadeAlterada} unidades`)

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

    log(`✅ Estoque atualizado com sucesso para peça ${pecaId}: ${novoEstoque}`)

    await queryClient.invalidateQueries({ queryKey: ['pecas'] })
    await queryClient.invalidateQueries({ queryKey: ['pecas_manutencao'] })
    await queryClient.invalidateQueries({ queryKey: ['estoque'] })
  }

  const agruparPorPecaComSoma = (itens: ItemForm[]) => {
    const mapa = new Map<string, number>()
    for (const item of itens) {
      if (item.peca_id && item.is_from_estoque) {
        mapa.set(item.peca_id, (mapa.get(item.peca_id) || 0) + item.quantidade)
      }
    }
    return mapa
  }

  const processarMudancasEstoque = async (novosItens: ItemForm[], itensOriginais: ItemForm[] = []) => {
    const log = (...args: any[]) => {
      if (process.env.NODE_ENV !== 'production') console.log(...args)
    }

    log('=== INICIANDO PROCESSAMENTO DE MUDANÇAS NO ESTOQUE ===')
    log('Itens originais:', itensOriginais)
    log('Novos itens:', novosItens)

    const itensOriginaisMap = agruparPorPecaComSoma(itensOriginais)
    const novosItensMap = agruparPorPecaComSoma(novosItens)

    const ajustes: { pecaId: string, quantidadeAlterada: number }[] = []

    // 1. Itens removidos
    for (const [pecaId, quantidadeOriginal] of itensOriginaisMap.entries()) {
      if (!novosItensMap.has(pecaId)) {
        ajustes.push({ pecaId, quantidadeAlterada: quantidadeOriginal })
        log(`🔁 Devolver ao estoque: ${pecaId} +${quantidadeOriginal}`)
      }
    }

    // 2. Itens adicionados
    for (const [pecaId, novaQuantidade] of novosItensMap.entries()) {
      if (!itensOriginaisMap.has(pecaId)) {
        ajustes.push({ pecaId, quantidadeAlterada: -novaQuantidade })
        log(`➖ Retirar do estoque: ${pecaId} -${novaQuantidade}`)
      }
    }

    // 3. Itens alterados
    for (const [pecaId, novaQuantidade] of novosItensMap.entries()) {
      if (itensOriginaisMap.has(pecaId)) {
        const quantidadeOriginal = itensOriginaisMap.get(pecaId)!
        const diferenca = quantidadeOriginal - novaQuantidade
        if (diferenca !== 0) {
          ajustes.push({ pecaId, quantidadeAlterada: diferenca })
          log(`📊 Ajustar estoque: ${pecaId} ${diferenca > 0 ? '+' : ''}${diferenca}`)
        }
      }
    }

    try {
      await Promise.all(
        ajustes.map(({ pecaId, quantidadeAlterada }) =>
          updateEstoque(pecaId, quantidadeAlterada)
        )
      )
      log('✅ Processamento de estoque concluído com sucesso')
    } catch (error) {
      console.error('❌ Erro durante o processamento de estoque:', error)
      throw error
    }
  }

  return {
    updateEstoque,
    processarMudancasEstoque,
  }
}
