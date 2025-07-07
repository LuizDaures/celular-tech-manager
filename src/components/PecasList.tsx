
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient, PecaManutencao } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PecaForm } from '@/components/PecaForm'
import { Plus, Search, Edit, Trash, Package } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function PecasList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedPeca, setSelectedPeca] = useState<PecaManutencao | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: pecas = [], isLoading } = useQuery({
    queryKey: ['pecas_manutencao'],
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

  const deletePeca = useMutation({
    mutationFn: async (id: string) => {
      const client = await getSupabaseClient()
      if (!client) throw new Error('Cliente Supabase não disponível')
      
      const { error } = await client
        .from('pecas_manutencao')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pecas_manutencao'] })
      toast({
        title: "Peça excluída",
        description: "A peça foi excluída com sucesso.",
      })
    },
    onError: (error: any) => {
      console.error('Error deleting peca:', error)
      toast({
        title: "Erro",
        description: "Erro ao excluir peça: " + error.message,
        variant: "destructive",
      })
    }
  })

  const filteredPecas = pecas.filter(peca => 
    peca.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (peca.fabricante && peca.fabricante.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (peca.modelo && peca.modelo.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (peca.codigo_fabricante && peca.codigo_fabricante.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const valorEmEstoque = useMemo(() => {
    return pecas.reduce((total, peca) => {
      return total + (peca.estoque * peca.preco_unitario)
    }, 0)
  }, [pecas])

  const handleEdit = (peca: PecaManutencao) => {
    setSelectedPeca(peca)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    deletePeca.mutate(id)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedPeca(null)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Peças e Materiais</h1>
          <p className="text-muted-foreground">Gerencie o estoque de peças para manutenção</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setSelectedPeca(null)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Nova Peça
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl mx-4 bg-background border-border">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {selectedPeca ? 'Editar Peça' : 'Nova Peça'}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  {selectedPeca ? 'Edite os dados da peça.' : 'Cadastre uma nova peça no estoque.'}
                </DialogDescription>
              </DialogHeader>
              <PecaForm 
                peca={selectedPeca}
                onSuccess={handleCloseDialog}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Lista de Peças</CardTitle>
          <CardDescription className="text-muted-foreground">
            Total de {filteredPecas.length} peça{filteredPecas.length !== 1 ? 's' : ''} cadastrada{filteredPecas.length !== 1 ? 's' : ''}
          </CardDescription>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar peças..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border text-foreground"
              />
            </div>
               <div className="text-sm text-muted-foreground ml-auto flex items-center gap-2">
            <Package className="h-4 w-4" />
            Valor em estoque: R$ {valorEmEstoque.toFixed(2)}
          </div>
          </div>
          
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4 text-muted-foreground">Carregando peças...</div>
          ) : filteredPecas.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {searchTerm ? 'Nenhuma peça encontrada com os filtros aplicados.' : 'Nenhuma peça cadastrada.'}
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-x-auto bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-muted/50">
                    <TableHead className="text-muted-foreground">Nome</TableHead>
                    <TableHead className="hidden sm:table-cell text-muted-foreground">Fabricante</TableHead>
                    <TableHead className="hidden md:table-cell text-muted-foreground">Modelo</TableHead>
                    <TableHead className="hidden lg:table-cell text-muted-foreground">Código</TableHead>
                    <TableHead className="text-muted-foreground">Estoque</TableHead>
                    <TableHead className="hidden sm:table-cell text-muted-foreground">Preço Unit.</TableHead>
                    <TableHead className="hidden md:table-cell text-muted-foreground">Total</TableHead>
                    <TableHead className="text-right text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPecas.map((peca) => (
                    <TableRow key={peca.id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">{peca.nome}</TableCell>
                      <TableCell className="hidden sm:table-cell text-foreground">{peca.fabricante || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell text-foreground">{peca.modelo || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-foreground">{peca.codigo_fabricante || '-'}</TableCell>
                      <TableCell className="text-foreground">
                        <Badge variant={peca.estoque > 10 ? "default" : peca.estoque > 0 ? "secondary" : "destructive"}>
                          {peca.estoque}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-foreground">R$ {peca.preco_unitario.toFixed(2)}</TableCell>
                      <TableCell className="hidden md:table-cell text-foreground">R$ {(peca.estoque * peca.preco_unitario).toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
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
                                <Trash className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="mx-4 bg-background border-border">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-foreground">Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription className="text-muted-foreground">
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
