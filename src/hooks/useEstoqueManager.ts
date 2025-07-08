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
    const log = (...args: any[]) => {
      console.log(...args) // Debug temporário
    }
    
    const mapa = new Map<string, number>()
    
    log('🔍 Analisando itens para agrupar:', itens)
    
    for (const item of itens) {
      log(`📋 Item: ${item.nome_item}, peca_id: ${item.peca_id}, is_from_estoque: ${item.is_from_estoque}`)
      
      // Se tem peca_id, é do estoque (independente do is_from_estoque)
      if (item.peca_id) {
        const quantidadeAtual = mapa.get(item.peca_id) || 0
        const novaQuantidade = quantidadeAtual + item.quantidade
        mapa.set(item.peca_id, novaQuantidade)
        log(`➕ Adicionado ao mapa: ${item.peca_id} = ${novaQuantidade}`)
      } else {
        log(`⚠️ Item sem peca_id, ignorado para controle de estoque`)
      }
    }
    
    log('🗺️ Mapa final:', Array.from(mapa.entries()))
    return mapa
  }

  const processarMudancasEstoque = async (novosItens: ItemForm[], itensOriginais: ItemForm[] = []) => {
    const log = (...args: any[]) => {
      console.log(...args) // Sempre mostrar logs para debug
    }

    log('=== INICIANDO PROCESSAMENTO DE MUDANÇAS NO ESTOQUE ===')
    log('📋 Itens originais recebidos:', JSON.stringify(itensOriginais, null, 2))
    log('📋 Novos itens recebidos:', JSON.stringify(novosItens, null, 2))

    const itensOriginaisMap = agruparPorPecaComSoma(itensOriginais)
    const novosItensMap = agruparPorPecaComSoma(novosItens)

    log('🗺️ Mapa itens originais:', Array.from(itensOriginaisMap.entries()))
    log('🗺️ Mapa novos itens:', Array.from(novosItensMap.entries()))

    const ajustes: { pecaId: string, quantidadeAlterada: number }[] = []

    // 1. Itens removidos (devolver ao estoque)
    for (const [pecaId, quantidadeOriginal] of itensOriginaisMap.entries()) {
      if (!novosItensMap.has(pecaId)) {
        ajustes.push({ pecaId, quantidadeAlterada: quantidadeOriginal })
        log(`🔁 Devolver ao estoque: ${pecaId} +${quantidadeOriginal}`)
      }
    }

    // 2. Itens adicionados (retirar do estoque)
    for (const [pecaId, novaQuantidade] of novosItensMap.entries()) {
      if (!itensOriginaisMap.has(pecaId)) {
        // Verificar se há estoque suficiente antes de debitar
        const client = await getSupabaseClient()
        if (client) {
          const { data: peca, error } = await client
            .from('pecas_manutencao')
            .select('estoque, nome')
            .eq('id', pecaId)
            .single()

          if (error) {
            log(`Erro ao buscar peça ${pecaId}:`, error)
            throw new Error(`Erro ao verificar estoque da peça`)
          }

          if (peca.estoque < novaQuantidade) {
            throw new Error(`Estoque insuficiente para ${peca.nome}. Disponível: ${peca.estoque}, Solicitado: ${novaQuantidade}`)
          }
        }
        
        ajustes.push({ pecaId, quantidadeAlterada: -novaQuantidade })
        log(`➖ Retirar do estoque: ${pecaId} -${novaQuantidade}`)
      }
    }

    // 3. Itens alterados (ajustar estoque)
    for (const [pecaId, novaQuantidade] of novosItensMap.entries()) {
      if (itensOriginaisMap.has(pecaId)) {
        const quantidadeOriginal = itensOriginaisMap.get(pecaId)!
        const diferenca = quantidadeOriginal - novaQuantidade
        
        if (diferenca !== 0) {
          // Se a diferença é negativa (aumentou a quantidade), verificar estoque
          if (diferenca < 0) {
            const quantidadeAdicional = Math.abs(diferenca)
            const client = await getSupabaseClient()
            if (client) {
              const { data: peca, error } = await client
                .from('pecas_manutencao')
                .select('estoque, nome')
                .eq('id', pecaId)
                .single()

              if (error) {
                log(`Erro ao buscar peça ${pecaId}:`, error)
                throw new Error(`Erro ao verificar estoque da peça`)
              }

              if (peca.estoque < quantidadeAdicional) {
                throw new Error(`Estoque insuficiente para ${peca.nome}. Disponível: ${peca.estoque}, Necessário adicionar: ${quantidadeAdicional}`)
              }
            }
          }
          
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
