
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase, PecaManutencao } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Search } from 'lucide-react'

interface ItemForm {
  peca_id: string
  nome_peca: string
  quantidade: number
  preco_unitario: number
}

interface ItemSelectorProps {
  onAddItem: (item: ItemForm) => void
}

export function ItemSelector({ onAddItem }: ItemSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFabricante, setSelectedFabricante] = useState('all')
  const [quantity, setQuantity] = useState(1)
  const [customPrice, setCustomPrice] = useState('')
  const [selectedPeca, setSelectedPeca] = useState<PecaManutencao | null>(null)

  const { data: pecas = [] } = useQuery({
    queryKey: ['pecas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pecas_manutencao')
        .select('*')
        .order('nome')
      
      if (error) throw error
      return data as PecaManutencao[]
    }
  })

  const fabricantes = ['all', ...Array.from(new Set(pecas.map(peca => peca.fabricante).filter(Boolean)))]

  const filteredPecas = pecas.filter(peca => {
    const matchesSearch = peca.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         peca.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         peca.codigo_fabricante?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFabricante = selectedFabricante === 'all' || peca.fabricante === selectedFabricante
    return matchesSearch && matchesFabricante
  })

  const handleAddItem = () => {
    if (!selectedPeca) return

    const itemToAdd: ItemForm = {
      peca_id: selectedPeca.id,
      nome_peca: selectedPeca.nome,
      quantidade: quantity,
      preco_unitario: customPrice ? parseFloat(customPrice) : selectedPeca.preco_unitario
    }

    onAddItem(itemToAdd)
    setIsOpen(false)
    setSelectedPeca(null)
    setQuantity(1)
    setCustomPrice('')
    setSearchTerm('')
    setSelectedFabricante('all')
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto">
          <Search className="h-4 w-4 mr-2" />
          Buscar Peça
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
        <DialogHeader>
          <DialogTitle>Buscar e Adicionar Peça</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              <Label>Fabricante</Label>
              <Select value={selectedFabricante} onValueChange={setSelectedFabricante}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Fabricantes</SelectItem>
                  {fabricantes.filter(fab => fab !== 'all').map(fabricante => (
                    <SelectItem key={fabricante} value={fabricante!}>
                      {fabricante}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Lista de peças */}
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {filteredPecas.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Nenhuma peça encontrada
              </div>
            ) : (
              <div className="divide-y">
                {filteredPecas.map(peca => (
                  <div 
                    key={peca.id}
                    className={`p-3 cursor-pointer hover:bg-muted transition-colors ${
                      selectedPeca?.id === peca.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedPeca(peca)}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div className="flex-1">
                        <div className="font-medium break-words">{peca.nome}</div>
                        <div className="text-sm text-muted-foreground break-words">
                          {peca.fabricante} {peca.modelo && `- ${peca.modelo}`}
                          {peca.codigo_fabricante && ` (${peca.codigo_fabricante})`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Estoque: {peca.estoque}
                        </div>
                      </div>
                      <div className="text-right sm:text-left">
                        <div className="font-medium">R$ {peca.preco_unitario.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Configurações da peça selecionada */}
          {selectedPeca && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium mb-3 break-words">Peça Selecionada: {selectedPeca.nome}</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedPeca.estoque}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                  <div className="text-xs text-muted-foreground">
                    Disponível em estoque: {selectedPeca.estoque}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Preço Unitário (deixe vazio para usar padrão)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder={`R$ ${selectedPeca.preco_unitario.toFixed(2)}`}
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <Button 
                  onClick={handleAddItem}
                  disabled={quantity > selectedPeca.estoque}
                  className="w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Peça
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
