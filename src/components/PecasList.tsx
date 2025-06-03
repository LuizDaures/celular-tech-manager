
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, PecaManutencao } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, Search, Package } from 'lucide-react'
import { PecaForm } from '@/components/PecaForm'

export function PecasList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedPeca, setSelectedPeca] = useState<PecaManutencao | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: pecas = [], isLoading } = useQuery({
    queryKey: ['pecas'],
    queryFn: async () => {
      console.log('Fetching pecas...')
      if (!supabase) {
        console.log('Supabase not configured')
        return []
      }
      
      const { data, error } = await supabase
        .from('pecas_manutencao')
        .select('*')
        .order('nome')
      
      if (error) {
        console.error('Error fetching pecas:', error)
        throw error
      }
      
      console.log('Pecas data:', data)
      return data as PecaManutencao[]
    }
  })

  const deletePeca = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) {
        throw new Error('Banco não configurado')
      }
      
      const { error } = await supabase
        .from('pecas_manutencao')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pecas'] })
      toast({
        title: "Peça excluída",
        description: "A peça foi excluída com sucesso.",
      })
    },
    onError: (error: any) => {
      console.error('Error deleting peca:', error)
      toast({
        title: "Erro",
        description: "Erro ao excluir peça.",
        variant: "destructive",
      })
    }
  })

  const filteredPecas = pecas.filter(peca =>
    peca.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    peca.fabricante?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    peca.modelo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    peca.codigo_fabricante?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Calcular valor total do estoque
  const valorTotalEstoque = filteredPecas.reduce((total, peca) => {
    return total + (peca.estoque * peca.preco_unitario)
  }, 0)

  const handleEdit = (peca: PecaManutencao) => {
    setSelectedPeca(peca)
    setIsDialogOpen(true)
  }

  const handleNew = () => {
    setSelectedPeca(null)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedPeca(null)
  }

  const handleDelete = (id: string) => {
    deletePeca.mutate(id)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Peças de Manutenção</h1>
          <p className="text-muted-foreground">Gerencie o estoque de peças</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNew} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nova Peça
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-2xl mx-2 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedPeca ? 'Editar Peça' : 'Nova Peça'}
              </DialogTitle>
            </DialogHeader>
            <PecaForm
              peca={selectedPeca}
              onSuccess={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Card com valor total do estoque */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Total em Estoque</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">R$ {valorTotalEstoque.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            Valor total das {filteredPecas.reduce((total, peca) => total + peca.estoque, 0)} peças em estoque
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Peças</CardTitle>
          <CardDescription>
            Total de {filteredPecas.length} peça{filteredPecas.length !== 1 ? 's' : ''} cadastrada{filteredPecas.length !== 1 ? 's' : ''}
          </CardDescription>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar peças..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Carregando peças...</div>
          ) : filteredPecas.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {searchTerm ? 'Nenhuma peça encontrada com os filtros aplicados.' : 'Nenhuma peça cadastrada.'}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Fabricante</TableHead>
                    <TableHead className="hidden md:table-cell">Modelo</TableHead>
                    <TableHead className="hidden lg:table-cell">Código</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead className="hidden md:table-cell">Valor Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPecas.map((peca) => (
                    <TableRow key={peca.id}>
                      <TableCell className="font-medium">{peca.nome}</TableCell>
                      <TableCell className="hidden sm:table-cell">{peca.fabricante || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell">{peca.modelo || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{peca.codigo_fabricante || '-'}</TableCell>
                      <TableCell>R$ {peca.preco_unitario.toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={peca.estoque <= 5 ? 'text-red-600 font-medium' : ''}>
                          {peca.estoque}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="font-medium">
                          R$ {(peca.estoque * peca.preco_unitario).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(peca)}
                            className="h-8 w-8"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="mx-4">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir a peça "{peca.nome}"? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(peca.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
