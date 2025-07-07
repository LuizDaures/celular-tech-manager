
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient, PecaManutencao } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ItemForm {
  peca_id?: string
  nome_item: string
  quantidade: number
  preco_unitario: number
  is_from_estoque?: boolean
}

interface ItemSelectorProps {
  onAddItem: (item: ItemForm) => void
  itensJaAdicionados?: ItemForm[]
}

export function ItemSelector({ onAddItem, itensJaAdicionados = [] }: ItemSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFabricante, setSelectedFabricante] = useState('all')
  const [quantity, setQuantity] = useState(1)
  const [customPrice, setCustomPrice] = useState('')
  const [selectedPeca, setSelectedPeca] = useState<PecaManutencao | null>(null)
  const { toast } = useToast()

  const { data: pecas = [] } = useQuery({
    queryKey: ['pecas'],
    queryFn: async () => {
      const client = await getSupabaseClient()
      if (!client) throw new Error('Cliente Supabase não disponível')
      
      const { data, error } = await client
        .from('pecas_manutencao')
        .select('*')
        .order('nome')
      
      if (error) throw error
      return data as PecaManutencao[]
    }
  })

  const fabricantes = ['all', ...Array.from(new Set(pecas.map(peca => peca.fabricante).filter(Boolean)))]

  // IDs das peças já adicionadas para filtrar
  const pecasJaAdicionadasIds = itensJaAdicionados
    .map(item => item.peca_id)
    .filter(Boolean)

  const filteredPecas = pecas.filter(peca => {
    const matchesSearch = peca.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         peca.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         peca.codigo_fabricante?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFabricante = selectedFabricante === 'all' || peca.fabricante === selectedFabricante
    const notAlreadyAdded = !pecasJaAdicionadasIds.includes(peca.id)
    return matchesSearch && matchesFabricante && peca.estoque > 0 && notAlreadyAdded
  })

  const handleAddItem = () => {
    if (!selectedPeca) return

    // Verificar se a peça já foi adicionada
    const pecaJaAdicionada = itensJaAdicionados.some(item => item.peca_id === selectedPeca.id)
    if (pecaJaAdicionada) {
      toast({
        title: "Peça já adicionada",
        description: "Esta peça já foi adicionada à ordem. Edite a quantidade se necessário.",
        variant: "destructive",
      })
      return
    }

    // Verificar estoque disponível
    if (quantity > selectedPeca.estoque) {
      toast({
        title: "Estoque insuficiente",
        description: `Apenas ${selectedPeca.estoque} unidades disponíveis em estoque.`,
        variant: "destructive",
      })
      return
    }

    if (quantity <= 0) {
      toast({
        title: "Quantidade inválida",
        description: "A quantidade deve ser maior que zero.",
        variant: "destructive",
      })
      return
    }

    const itemToAdd: ItemForm = {
      peca_id: selectedPeca.id,
      nome_item: selectedPeca.nome,
      quantidade: quantity,
      preco_unitario: customPrice ? parseFloat(customPrice) : selectedPeca.preco_unitario,
      is_from_estoque: true
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
         Estoque
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto mx-4">
        <DialogHeader>
          <DialogTitle>Buscar e Adicionar Peça</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          <div className="border rounded-lg max-h-80 overflow-y-auto">
            {filteredPecas.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                {pecasJaAdicionadasIds.length > 0 && pecas.filter(p => p.estoque > 0).length > 0 ? 
                  'Todas as peças disponíveis já foram adicionadas ou não correspondem aos filtros' :
                  pecas.filter(p => p.estoque > 0).length === 0 ? 
                    'Nenhuma peça com estoque disponível' : 
                    'Nenhuma peça encontrada'
                }
              </div>
            ) : (
              <div className="divide-y">
                {filteredPecas.map(peca => (
                  <div 
                    key={peca.id}
                    className={`p-4 cursor-pointer hover:bg-muted transition-colors ${
                      selectedPeca?.id === peca.id ? 'bg-muted' : ''
                    }`}
                    onClick={() => setSelectedPeca(peca)}
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
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
            <div className="border rounded-lg p-6 bg-muted/50">
              <h4 className="font-medium mb-4 break-words">Peça Selecionada: {selectedPeca.nome}</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedPeca.estoque}
                    value={quantity}
                    onChange={(e) => {
                      const newQty = parseInt(e.target.value) || 1
                      setQuantity(Math.min(newQty, selectedPeca.estoque))
                    }}
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
              
              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={handleAddItem}
                  disabled={quantity > selectedPeca.estoque || quantity <= 0}
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
