
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Search } from 'lucide-react'

interface Item {
  id: string
  nome: string
  categoria: string
  preco_padrao: number
}

interface ItemForm {
  nome_item: string
  quantidade: number
  preco_unitario: number
}

interface ItemSelectorProps {
  onAddItem: (item: ItemForm) => void
}

export function ItemSelector({ onAddItem }: ItemSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [quantity, setQuantity] = useState(1)
  const [customPrice, setCustomPrice] = useState('')
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  // Mock data - em produção viria do banco
  const [items] = useState<Item[]>([
    { id: '1', nome: 'Tela LCD', categoria: 'Display', preco_padrao: 150.00 },
    { id: '2', nome: 'Bateria', categoria: 'Energia', preco_padrao: 80.00 },
    { id: '3', nome: 'Placa Mãe', categoria: 'Hardware', preco_padrao: 300.00 },
    { id: '4', nome: 'Memória RAM', categoria: 'Hardware', preco_padrao: 120.00 },
    { id: '5', nome: 'Carregador', categoria: 'Acessórios', preco_padrao: 45.00 },
    { id: '6', nome: 'Cabo USB', categoria: 'Acessórios', preco_padrao: 15.00 },
    { id: '7', nome: 'Touch Screen', categoria: 'Display', preco_padrao: 200.00 },
  ])

  const categories = ['all', ...Array.from(new Set(items.map(item => item.categoria)))]

  const filteredItems = items.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.categoria === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleAddItem = () => {
    if (!selectedItem) return

    const itemToAdd: ItemForm = {
      nome_item: selectedItem.nome,
      quantidade: quantity,
      preco_unitario: customPrice ? parseFloat(customPrice) : selectedItem.preco_padrao
    }

    onAddItem(itemToAdd)
    setIsOpen(false)
    setSelectedItem(null)
    setQuantity(1)
    setCustomPrice('')
    setSearchTerm('')
    setSelectedCategory('all')
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Search className="h-4 w-4 mr-2" />
          Buscar Peça
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buscar e Adicionar Peça</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Digite o nome da peça..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {categories.filter(cat => cat !== 'all').map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lista de itens */}
          <div className="border rounded-lg max-h-60 overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Nenhuma peça encontrada
              </div>
            ) : (
              <div className="divide-y">
                {filteredItems.map(item => (
                  <div 
                    key={item.id}
                    className={`p-3 cursor-pointer hover:bg-muted transition-colors ${
                      selectedItem?.id === item.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{item.nome}</div>
                        <div className="text-sm text-muted-foreground">{item.categoria}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">R$ {item.preco_padrao.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Configurações do item selecionado */}
          {selectedItem && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium mb-3">Item Selecionado: {selectedItem.nome}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço Unitário (deixe vazio para usar padrão)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={`R$ ${selectedItem.preco_padrao.toFixed(2)}`}
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button onClick={handleAddItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
