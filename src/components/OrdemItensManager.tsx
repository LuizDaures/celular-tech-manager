
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

  const addItemFromSelector = (item: ItemForm) => {
    const pecaJaAdicionada = itens.some(existingItem => existingItem.peca_id === item.peca_id)
    
    if (pecaJaAdicionada) {
      toast({
        title: "Peça já adicionada",
        description: "Esta peça já foi adicionada à ordem. Edite a quantidade se necessário.",
        variant: "destructive",
      })
      return
    }

    setItens([...itens, item])
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

  if (readOnly) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Package2 className="h-5 w-5 text-muted-foreground" />
          <Label className="text-lg font-medium">Peças Utilizadas</Label>
        </div>
        
        {itens.length > 0 ? (
          <div className="space-y-4">
            {itens.map((item, index) => (
              <div key={index} className="p-4 bg-muted/30 rounded-lg border">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <p className="font-medium text-foreground">{item.nome_item}</p>
                      {item.is_from_estoque && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full self-start">
                          📦 Do Estoque
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground space-y-1">
                      <p>Quantidade: <span className="font-medium">{item.quantidade}</span></p>
                      <p>Preço unitário: <span className="font-medium">R$ {item.preco_unitario.toFixed(2)}</span></p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-lg font-bold text-green-600">
                      R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Subtotal
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex justify-between items-center">
                <Label className="font-medium text-lg">Total das Peças</Label>
                <p className="font-bold text-xl text-primary">R$ {totalItens.toFixed(2)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/20">
            <Package2 className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhuma peça utilizada</p>
            <p className="text-sm">Esta ordem não possui peças cadastradas</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Package2 className="h-5 w-5 text-muted-foreground" />
          <Label className="text-lg font-medium">Peças Utilizadas</Label>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <div className="flex-1">
            <ItemSelector 
              onAddItem={addItemFromSelector} 
              itensJaAdicionados={itens}
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addItem} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Item Manual
          </Button>
        </div>
      </div>
      
      {itens.length > 0 && (
        <div className="space-y-4">
          {itens.map((item, index) => (
            <div key={index} className="flex flex-col gap-4 p-4 border rounded-lg bg-card shadow-sm">
              {/* Mobile Layout */}
              <div className="block sm:hidden space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nome do Item</Label>
                  <Input
                    value={item.nome_item}
                    onChange={(e) => updateItem(index, 'nome_item', e.target.value)}
                    placeholder="Ex: Tela LCD"
                    className="mt-1"
                    disabled={item.is_from_estoque}
                    readOnly={item.is_from_estoque}
                  />
                  {item.is_from_estoque && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      📦 Peça do estoque - nome não editável
                    </p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Quantidade</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantidade}
                      onChange={(e) => updateItem(index, 'quantidade', parseInt(e.target.value) || 1)}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Preço Unit.</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.preco_unitario}
                      onChange={(e) => updateItem(index, 'preco_unitario', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Total</Label>
                    <div className="font-medium text-lg text-green-600">
                      R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden sm:flex sm:items-start sm:gap-4">
                <div className="flex-1">
                  <Label className="text-sm font-medium text-muted-foreground">Nome do Item</Label>
                  <Input
                    value={item.nome_item}
                    onChange={(e) => updateItem(index, 'nome_item', e.target.value)}
                    placeholder="Ex: Tela LCD"
                    className="mt-1"
                    disabled={item.is_from_estoque}
                    readOnly={item.is_from_estoque}
                  />
                  {item.is_from_estoque && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      📦 Peça do estoque - nome não editável
                    </p>
                  )}
                </div>
                
                <div className="w-28">
                  <Label className="text-sm font-medium text-muted-foreground">Qtd</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantidade}
                    onChange={(e) => updateItem(index, 'quantidade', parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                </div>
                
                <div className="w-32">
                  <Label className="text-sm font-medium text-muted-foreground">Preço Unit.</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.preco_unitario}
                    onChange={(e) => updateItem(index, 'preco_unitario', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
                
                <div className="w-32">
                  <Label className="text-sm font-medium text-muted-foreground">Total</Label>
                  <div className="font-medium bg-muted px-3 py-2 rounded mt-1 text-center text-green-600">
                    R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex justify-between items-center">
              <Label className="font-medium text-lg">Total das Peças</Label>
              <p className="font-bold text-xl text-primary">R$ {totalItens.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
      
      {itens.length === 0 && (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <Package2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma peça adicionada</p>
          <p className="text-sm">Use os botões acima para adicionar peças</p>
        </div>
      )}
    </div>
  )
}
