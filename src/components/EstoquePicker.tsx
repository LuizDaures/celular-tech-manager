
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient, PecaManutencao } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Search, Package, Plus } from 'lucide-react'

interface EstoquePickerProps {
  onSelectPeca: (peca: PecaManutencao, quantidade: number) => void
  usedPecas: string[]
}

export function EstoquePicker({ onSelectPeca, usedPecas }: EstoquePickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedPeca, setSelectedPeca] = useState<PecaManutencao | null>(null)
  const [quantidade, setQuantidade] = useState(1)

  const { data: pecas = [], isLoading } = useQuery({
    queryKey: ['pecas_manutencao'],
    queryFn: async () => {
      const supabase = await getSupabaseClient()
      if (!supabase) return []
      
      const { data, error } = await supabase
        .from('pecas_manutencao')
        .select('*')
        .order('nome')
      
      if (error) throw error
      return data as PecaManutencao[]
    }
  })

  const availablePecas = pecas.filter(peca => 
    peca.estoque > 0 && 
    !usedPecas.includes(peca.id) &&
    (peca.nome.toLowerCase().includes(search.toLowerCase()) ||
     peca.fabricante?.toLowerCase().includes(search.toLowerCase()) ||
     peca.modelo?.toLowerCase().includes(search.toLowerCase()))
  )

  const handleSelect = () => {
    if (selectedPeca && quantidade > 0 && quantidade <= selectedPeca.estoque) {
      onSelectPeca(selectedPeca, quantidade)
      setOpen(false)
      setSelectedPeca(null)
      setQuantidade(1)
      setSearch('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Package className="h-4 w-4 mr-2" />
          Adicionar do Estoque
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar Peça do Estoque</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar peças..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="text-center py-4">Carregando peças...</div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {availablePecas.map(peca => (
                  <div
                    key={peca.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPeca?.id === peca.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedPeca(peca)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{peca.nome}</p>
                        {peca.fabricante && (
                          <p className="text-xs text-muted-foreground">
                            {peca.fabricante} {peca.modelo && `- ${peca.modelo}`}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={peca.estoque <= 5 ? "destructive" : "secondary"}>
                            {peca.estoque} un
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            R$ {peca.preco_unitario.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {availablePecas.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    {search ? 'Nenhuma peça encontrada' : 'Nenhuma peça disponível no estoque'}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {selectedPeca && (
            <div className="border-t pt-4 space-y-3">
              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="font-medium">{selectedPeca.nome}</p>
                <p className="text-sm text-muted-foreground">
                  Estoque: {selectedPeca.estoque} • Preço: R$ {selectedPeca.preco_unitario.toFixed(2)}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    max={selectedPeca.estoque}
                    value={quantidade}
                    onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                  />
                </div>
                <div>
                  <Label>Total</Label>
                  <div className="text-lg font-semibold mt-2">
                    R$ {(quantidade * selectedPeca.preco_unitario).toFixed(2)}
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleSelect} 
                className="w-full"
                disabled={quantidade <= 0 || quantidade > selectedPeca.estoque}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar à Ordem
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
