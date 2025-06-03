
import { ItemSelector } from '@/components/ItemSelector'
import { PecaManutencao } from '@/lib/supabase'

interface ItemForm {
  peca_id?: string
  nome_item: string
  quantidade: number
  preco_unitario: number
  is_from_estoque?: boolean
}

interface EstoquePickerProps {
  onSelectPeca: (peca: PecaManutencao, quantidade: number) => void
  usedPecas: string[]
}

export function EstoquePicker({ onSelectPeca, usedPecas }: EstoquePickerProps) {
  const handleAddItem = (item: ItemForm) => {
    if (item.peca_id) {
      // Buscar a peça completa para passar para onSelectPeca
      // Como o ItemSelector já validou, podemos criar um objeto PecaManutencao mock
      const pecaMock: PecaManutencao = {
        id: item.peca_id,
        nome: item.nome_item,
        preco_unitario: item.preco_unitario,
        estoque: item.quantidade, // Este valor não é usado na validação
        fabricante: '',
        modelo: null,
        codigo_fabricante: null,
        localizacao: null,
        observacoes: null,
        created_at: '',
        updated_at: ''
      }
      onSelectPeca(pecaMock, item.quantidade)
    }
  }

  return (
    <ItemSelector 
      onAddItem={handleAddItem}
      usedPecas={usedPecas}
    />
  )
}
