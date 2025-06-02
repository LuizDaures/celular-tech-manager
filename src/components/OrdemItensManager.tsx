
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Trash2, Plus, Package2, AlertTriangle } from 'lucide-react'
import { EstoquePicker } from '@/components/EstoquePicker'
import { useItensManager } from '@/hooks/useItensManager'
import { PecaManutencao } from '@/lib/supabase'

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
  const {
    addItem,
    addItemFromEstoque,
    removeItem,
    updateItem,
    validateItens,
    totalValue,
    pecas
  } = useItensManager(itens)

  // Sincronizar com o estado externo
  const handleItensChange = (newItens: ItemForm[]) => {
    setItens(newItens)
  }

  const addManualItem = () => {
    const newItens = [...itens, { nome_item: '', quantidade: 1, preco_unitario: 0, is_from_estoque: false }]
    handleItensChange(newItens)
  }

  const handleRemoveItem = (index: number) => {
    const newItens = itens.filter((_, i) => i !== index)
    handleItensChange(newItens)
  }

  const handleUpdateItem = (index: number, field: keyof ItemForm, value: string | number) => {
    const newItens = [...itens]
    newItens[index] = { ...newItens[index], [field]: value }
    handleItensChange(newItens)
  }

  const handleSelectFromEstoque = (peca: PecaManutencao, quantidade: number) => {
    const newItem: ItemForm = {
      peca_id: peca.id,
      nome_item: peca.nome,
      quantidade,
      preco_unitario: peca.preco_unitario,
      is_from_estoque: true
    }
    const newItens = [...itens, newItem]
    handleItensChange(newItens)
  }

  const usedPecas = itens.filter(item => item.peca_id).map(item => item.peca_id!)
  const errors = validateItens()

  if (readOnly && itens.length > 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Package2 className="h-5 w-5 text-muted-foreground" />
          <Label className="text-base font-medium">Peças Utilizadas</Label>
        </div>
        
        <div className="space-y-3">
          {itens.map((item, index) => (
            <div key={index} className="p-4 bg-muted/30 rounded-lg border">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{item.nome_item}</p>
                    {item.is_from_estoque && (
                      <Badge variant="secondary" className="text-xs">Estoque</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {item.quantidade} × R$ {item.preco_unitario.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</p>
                </div>
              </div>
            </div>
          ))}
          
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex justify-between items-center">
              <Label className="font-medium">Total das Peças</Label>
              <p className="font-bold text-lg">R$ {totalValue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com ações */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package2 className="h-5 w-5 text-muted-foreground" />
          <Label className="text-base font-medium">Peças e Materiais</Label>
        </div>
        
        <div className="flex gap-2">
          <EstoquePicker 
            onSelectPeca={handleSelectFromEstoque}
            usedPecas={usedPecas}
          />
          <Button type="button" variant="outline" onClick={addManualItem}>
            <Plus className="h-4 w-4 mr-2" />
            Item Manual
          </Button>
        </div>
      </div>

      {/* Alertas de validação */}
      {errors.length > 0 && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="font-medium text-destructive">Problemas encontrados:</span>
          </div>
          <ul className="text-sm text-destructive space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Lista de itens */}
      {itens.length > 0 ? (
        <div className="space-y-4">
          {itens.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg bg-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                  {item.is_from_estoque && (
                    <Badge variant="secondary" className="text-xs">
                      <Package2 className="h-3 w-3 mr-1" />
                      Estoque
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                  <Label className="text-sm font-medium">Nome do Item</Label>
                  <Input
                    value={item.nome_item}
                    onChange={(e) => handleUpdateItem(index, 'nome_item', e.target.value)}
                    placeholder="Ex: Tela LCD"
                    disabled={item.is_from_estoque}
                    readOnly={item.is_from_estoque}
                    className="mt-1"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantidade}
                    onChange={(e) => handleUpdateItem(index, 'quantidade', parseInt(e.target.value) || 1)}
                    className="mt-1"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">Preço Unit.</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.preco_unitario}
                    onChange={(e) => handleUpdateItem(index, 'preco_unitario', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium">Total</Label>
                  <div className="mt-1 px-3 py-2 bg-muted rounded-md text-sm font-medium">
                    R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Total geral */}
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex justify-between items-center">
              <Label className="font-medium text-lg">Total das Peças</Label>
              <p className="font-bold text-xl">R$ {totalValue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/20">
          <Package2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium mb-2">Nenhuma peça adicionada</p>
          <p className="text-muted-foreground mb-4">
            Adicione peças do estoque ou crie itens manuais
          </p>
          <div className="flex gap-2 justify-center">
            <EstoquePicker 
              onSelectPeca={handleSelectFromEstoque}
              usedPecas={usedPecas}
            />
            <Button type="button" variant="outline" onClick={addManualItem}>
              <Plus className="h-4 w-4 mr-2" />
              Item Manual
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
