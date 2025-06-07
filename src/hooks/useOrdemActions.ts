
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export function useOrdemActions() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const deleteOrdem = useMutation({
    mutationFn: async (ordemId: string) => {
      const client = await getSupabaseClient()
      if (!client) {
        throw new Error('Banco não configurado')
      }

      // Primeiro, buscar os itens da ordem que vieram do estoque
      const { data: itens, error: itensError } = await client
        .from('itens_ordem')
        .select('*')
        .eq('ordem_id', ordemId)

      if (itensError) throw itensError

      // Devolver ao estoque apenas itens que têm peca_id (vieram do estoque)
      for (const item of itens || []) {
        if (item.peca_id) {
          console.log(`Devolvendo ${item.quantidade} unidades da peça ${item.peca_id} ao estoque`)
          
          // Buscar estoque atual
          const { data: peca, error: fetchError } = await client
            .from('pecas_manutencao')
            .select('estoque')
            .eq('id', item.peca_id)
            .single()

          if (fetchError) {
            console.error('Erro ao buscar estoque atual:', fetchError)
            continue // Continua mesmo se não conseguir devolver uma peça
          }

          // Atualizar estoque
          const novoEstoque = peca.estoque + item.quantidade
          const { error: updateError } = await client
            .from('pecas_manutencao')
            .update({ estoque: novoEstoque })
            .eq('id', item.peca_id)

          if (updateError) {
            console.error('Erro ao devolver estoque:', updateError)
          }
        }
      }

      // Deletar itens da ordem
      const { error: deleteItensError } = await client
        .from('itens_ordem')
        .delete()
        .eq('ordem_id', ordemId)

      if (deleteItensError) throw deleteItensError

      // Deletar a ordem
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
        title: "Ordem excluída",
        description: "A ordem foi excluída e o estoque foi restaurado.",
      })
    },
    onError: (error: any) => {
      console.error('Error deleting ordem:', error)
      toast({
        title: "Erro",
        description: "Erro ao excluir ordem: " + error.message,
        variant: "destructive",
      })
    }
  })

  return {
    deleteOrdem
  }
}
