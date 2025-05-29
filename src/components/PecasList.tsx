
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
import { Plus, Edit, Trash2, Search } from 'lucide-react'
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
    <div className="container mx-auto p-4 space-y-4 max-w-full">
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Peças de Manutenção</h1>
            <p className="text-sm text-muted-foreground">Gerencie o estoque de peças</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleNew} className="w-full sm:w-auto shrink-0">
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

        <Card className="w-full">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex flex-col space-y-3">
              <div>
                <CardTitle className="text-lg">Lista de Peças</CardTitle>
                <CardDescription className="text-sm">
                  Total de {filteredPecas.length} peça{filteredPecas.length !== 1 ? 's' : ''} cadastrada{filteredPecas.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar peças..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-8 text-sm">Carregando peças...</div>
            ) : filteredPecas.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground px-4">
                {searchTerm ? 'Nenhuma peça encontrada com os filtros aplicados.' : 'Nenhuma peça cadastrada.'}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">Nome</TableHead>
                        <TableHead className="min-w-[100px]">Fabricante</TableHead>
                        <TableHead className="min-w-[100px]">Modelo</TableHead>
                        <TableHead className="min-w-[100px]">Código</TableHead>
                        <TableHead className="min-w-[80px]">Preço</TableHead>
                        <TableHead className="min-w-[70px]">Estoque</TableHead>
                        <TableHead className="min-w-[80px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPecas.map((peca) => (
                        <TableRow key={peca.id}>
                          <TableCell className="font-medium">{peca.nome}</TableCell>
                          <TableCell>{peca.fabricante || '-'}</TableCell>
                          <TableCell>{peca.modelo || '-'}</TableCell>
                          <TableCell>{peca.codigo_fabricante || '-'}</TableCell>
                          <TableCell className="text-sm">R$ {peca.preco_unitario.toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={peca.estoque <= 5 ? 'text-red-600 font-medium' : ''}>
                              {peca.estoque}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(peca)}
                                className="h-7 w-7"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="max-w-md mx-4">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir a peça "{peca.nome}"? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                    <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(peca.id)} className="w-full sm:w-auto">
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

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3 p-4">
                  {filteredPecas.map((peca) => (
                    <Card key={peca.id} className="w-full">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-sm truncate">{peca.nome}</h3>
                            <div className="text-xs text-muted-foreground space-y-1 mt-1">
                              {peca.fabricante && <div>Fabricante: {peca.fabricante}</div>}
                              {peca.modelo && <div>Modelo: {peca.modelo}</div>}
                              {peca.codigo_fabricante && <div>Código: {peca.codigo_fabricante}</div>}
                            </div>
                          </div>
                          <div className="flex items-center space-x-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(peca)}
                              className="h-7 w-7"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="w-[90vw] max-w-md mx-4">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-sm">Confirmar exclusão</AlertDialogTitle>
                                  <AlertDialogDescription className="text-xs">
                                    Tem certeza que deseja excluir a peça "{peca.nome}"? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-col gap-2">
                                  <AlertDialogCancel className="w-full text-sm">Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(peca.id)} className="w-full text-sm">
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium">R$ {peca.preco_unitario.toFixed(2)}</span>
                          <span className={`font-medium ${peca.estoque <= 5 ? 'text-red-600' : ''}`}>
                            Estoque: {peca.estoque}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
