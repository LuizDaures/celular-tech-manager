
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, Package2 } from 'lucide-react'
import { ItemSelector } from '@/components/ItemSelector'
import { useToast } from '@/hooks/use-toast'

interface ItemForm {
  peca_id?: string
  nome_item: string
  quantidade: number
  preco_unitario: number
  is_from_estoque?: boolean
}

interface OrdemItensManagerProps {
  itens: ItemForm[]
  setItens: (itens: ItemForm[]) => void
  readOnly?: boolean
}

export function OrdemItensManager({ itens, setItens, readOnly = false }: OrdemItensManagerProps) {
  const { toast } = useToast()

  const addItem = () => {
    setItens([...itens, { nome_item: '', quantidade: 1, preco_unitario: 0, is_from_estoque: false }])
  }

  const addItemFromSelector = (item: any) => {
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
      is_from_estoque: true
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

  const totalItens = itens.reduce((total, item) => total + (item.quantidade * item.preco_unitario), 0)

  if (readOnly && itens.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Package2 className="h-5 w-5 text-muted-foreground" />
          <Label className="text-base font-medium">Peças Utilizadas</Label>
        </div>
        
        <div className="space-y-3">
          {itens.map((item, index) => (
            <div key={index} className="p-4 bg-muted/50 rounded-lg border">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{item.nome_item}</p>
                    {item.is_from_estoque && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">📦 Estoque</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Qtd: {item.quantidade} × R$ {item.preco_unitario.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
          
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex justify-between items-center">
              <Label className="font-medium">Total das Peças</Label>
              <p className="font-bold text-lg">R$ {totalItens.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Package2 className="h-5 w-5 text-muted-foreground" />
          <Label className="text-base font-medium">Peças Utilizadas</Label>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <ItemSelector onAddItem={addItemFromSelector} />
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Item Manual
          </Button>
        </div>
      </div>
      
      {itens.length > 0 && (
        <div className="space-y-3">
          {itens.map((item, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-card">
              <div className="flex-1">
                <Label className="text-xs font-medium text-muted-foreground">Nome do Item</Label>
                <Input
                  value={item.nome_item}
                  onChange={(e) => updateItem(index, 'nome_item', e.target.value)}
                  placeholder="Ex: Tela LCD"
                  className="h-9 text-sm mt-1"
                  disabled={item.is_from_estoque}
                  readOnly={item.is_from_estoque}
                />
              </div>
              
              <div className="w-24">
                <Label className="text-xs font-medium text-muted-foreground">Qtd</Label>
                <Input
                  type="number"
                  min="1"
                  value={item.quantidade}
                  onChange={(e) => updateItem(index, 'quantidade', parseInt(e.target.value) || 1)}
                  className="h-9 text-sm mt-1"
                />
              </div>
              
              <div className="w-28">
                <Label className="text-xs font-medium text-muted-foreground">Preço Unit.</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={item.preco_unitario}
                  onChange={(e) => updateItem(index, 'preco_unitario', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="h-9 text-sm mt-1"
                />
              </div>
              
              <div className="w-28">
                <Label className="text-xs font-medium text-muted-foreground">Total</Label>
                <div className="text-sm font-medium bg-muted px-3 py-2 rounded mt-1 text-center">
                  R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                </div>
              </div>
              
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => removeItem(index)}
                className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex justify-between items-center">
              <Label className="font-medium">Total das Peças</Label>
              <p className="font-bold text-lg">R$ {totalItens.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
      
      {itens.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <Package2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma peça adicionada</p>
          <p className="text-xs">Use os botões acima para adicionar peças</p>
        </div>
      )}
    </div>
  )
}
