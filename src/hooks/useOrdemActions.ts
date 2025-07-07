import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export function useOrdemActions() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const deleteOrdem = useMutation({
    mutationFn: async (ordemId: string) => {
      const client = await getSupabaseClient()
      if (!client) throw new Error('Banco não configurado')

      // Buscar itens da ordem
      const { data: itens, error: itensError } = await client
        .from('itens_ordem')
        .select('*')
        .eq('ordem_id', ordemId)

      if (itensError) throw itensError

      // Restaurar estoque apenas se veio do estoque
      for (const item of itens || []) {
        if (item.peca_id && item.is_from_estoque) {
          try {
            const { data: peca, error: fetchError } = await client
              .from('pecas_manutencao')
              .select('estoque')
              .eq('id', item.peca_id)
              .single()

            if (fetchError || !peca || typeof peca.estoque !== 'number') {
              console.warn(`Não foi possível recuperar estoque da peça ${item.peca_id}`, fetchError)
              continue
            }

            const novoEstoque = peca.estoque + item.quantidade

            const { error: updateError } = await client
              .from('pecas_manutencao')
              .update({ estoque: novoEstoque })
              .eq('id', item.peca_id)

            if (updateError) {
              console.warn(`Erro ao atualizar estoque da peça ${item.peca_id}`, updateError)
            }
          } catch (e) {
            console.error(`Erro ao tentar devolver peça ${item.peca_id} ao estoque`, e)
          }
        }
      }

      // Excluir itens
      const { error: deleteItensError } = await client
        .from('itens_ordem')
        .delete()
        .eq('ordem_id', ordemId)

      if (deleteItensError) throw deleteItensError

      // Excluir a ordem
      const { error: deleteOrdemError } = await client
        .from('ordens_servico')
        .delete()
        .eq('id', ordemId)

      if (deleteOrdemError) throw deleteOrdemError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens'] })
      queryClient.invalidateQueries({ queryKey: ['pecas'] })
      toast({
        title: 'Ordem excluída',
        description: 'A ordem foi excluída e o estoque restaurado.',
      })
    },
    onError: (error: any) => {
      console.error('Erro ao excluir ordem:', error)
      toast({
        title: 'Erro ao excluir',
        description: error.message || 'Erro inesperado ao excluir a ordem.',
        variant: 'destructive',
      })
    }
  })

  return {
    deleteOrdem
  }
}
