
import { PecaManutencao } from '@/lib/supabase'

interface ItemForm {
  peca_id?: string
  nome_item: string
  quantidade: number
  preco_unitario: number
  is_from_estoque?: boolean
}

export class ItemValidator {
  static validateItem(item: ItemForm, pecas: PecaManutencao[]): string | null {
    if (!item.nome_item.trim()) {
      return 'Nome do item é obrigatório'
    }
    
    if (item.quantidade <= 0) {
      return 'Quantidade deve ser maior que zero'
    }
    
    if (item.preco_unitario < 0) {
      return 'Preço não pode ser negativo'
    }
    
    // Validar estoque disponível
    if (item.peca_id && item.is_from_estoque) {
      const peca = pecas.find(p => p.id === item.peca_id)
      if (peca && peca.estoque < item.quantidade) {
        return `Estoque insuficiente. Disponível: ${peca.estoque}, solicitado: ${item.quantidade}`
      }
    }
    
    return null
  }
  
  static validateItems(itens: ItemForm[], pecas: PecaManutencao[]): string[] {
    const errors: string[] = []
    const pecasUsadas = new Map<string, number>()
    
    itens.forEach((item, index) => {
      const itemError = this.validateItem(item, pecas)
      if (itemError) {
        errors.push(`Item ${index + 1}: ${itemError}`)
      }
      
      // Verificar duplicatas de peças do estoque
      if (item.peca_id && item.is_from_estoque) {
        const quantidadeTotal = (pecasUsadas.get(item.peca_id) || 0) + item.quantidade
        pecasUsadas.set(item.peca_id, quantidadeTotal)
        
        const peca = pecas.find(p => p.id === item.peca_id)
        if (peca && quantidadeTotal > peca.estoque) {
          errors.push(`Total de ${peca.nome} excede estoque (${peca.estoque} disponível, ${quantidadeTotal} solicitado)`)
        }
      }
    })
    
    return errors
  }
}
