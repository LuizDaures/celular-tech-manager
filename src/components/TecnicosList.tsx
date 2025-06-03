
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, Tecnico } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TecnicoForm } from '@/components/TecnicoForm'
import { Plus, Search, Edit, Trash } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function TecnicosList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTecnico, setSelectedTecnico] = useState<Tecnico | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: tecnicos = [], isLoading } = useQuery({
    queryKey: ['tecnicos'],
    queryFn: async () => {
      console.log('Fetching tecnicos...')
      const { data, error } = await supabase
        .from('tecnicos')
        .select('*')
        .order('criado_em', { ascending: false })

      if (error) {
        console.error('Error fetching tecnicos:', error)
        throw error
      }
      
      console.log('Tecnicos data:', data)
      return data || []
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Primeiro verificar se há ordens vinculadas - usando o nome correto da tabela
      const { data: ordens, error: ordensError } = await supabase
        .from('ordens_servico')
        .select('id')
        .eq('tecnico_id', id)
        .limit(1)

      if (ordensError) throw ordensError

      if (ordens && ordens.length > 0) {
        throw new Error('Não é possível excluir este técnico pois existem ordens de serviço vinculadas a ele.')
      }

      const { error } = await supabase
        .from('tecnicos')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Técnico excluído com sucesso.',
      })
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] })
    },
    onError: (error: Error) => {
      console.error('Error deleting tecnico:', error)
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  const filteredTecnicos = tecnicos.filter(tecnico => {
    if (!tecnico) return false
    
    const nome = tecnico.nome?.toLowerCase() || ''
    const searchLower = searchTerm.toLowerCase()
    
    return nome.includes(searchLower)
  })

  const handleEdit = (tecnico: Tecnico) => {
    setSelectedTecnico(tecnico)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedTecnico(null)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Técnicos</h1>
          <p className="text-muted-foreground">Gerencie os técnicos da assistência</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedTecnico(null)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Técnico
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle>
                {selectedTecnico ? 'Editar Técnico' : 'Novo Técnico'}
              </DialogTitle>
              <DialogDescription>
                {selectedTecnico ? 'Edite os dados do técnico.' : 'Crie um novo técnico.'}
              </DialogDescription>
            </DialogHeader>
            <TecnicoForm 
              tecnico={selectedTecnico}
              onSuccess={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Técnicos</CardTitle>
          <CardDescription>
            Total de {filteredTecnicos.length} técnico{filteredTecnicos.length !== 1 ? 's' : ''} cadastrado{filteredTecnicos.length !== 1 ? 's' : ''}
          </CardDescription>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar técnicos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Carregando técnicos...</div>
          ) : filteredTecnicos.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {searchTerm ? 'Nenhum técnico encontrado com os filtros aplicados.' : 'Nenhum técnico cadastrado.'}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Nome</TableHead>
                    <TableHead className="hidden md:table-cell">CPF</TableHead>
                    <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Data Cadastro</TableHead>
                    <TableHead className="text-right min-w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTecnicos.map((tecnico) => (
                    <TableRow key={tecnico.id}>
                      <TableCell className="font-medium">{tecnico.nome}</TableCell>
                      <TableCell className="hidden md:table-cell">{tecnico.cpf || '-'}</TableCell>
                      <TableCell className="hidden sm:table-cell">{tecnico.telefone || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{tecnico.email || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(tecnico.criado_em).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(tecnico)}
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
                            <AlertDialogContent className="mx-4">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este técnico? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(tecnico.id)}>
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
