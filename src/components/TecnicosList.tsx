
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, Tecnico } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
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
      // Primeiro verificar se há ordens vinculadas
      const { data: ordens, error: ordensError } = await supabase
        .from('ordem_servico')
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Técnicos</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedTecnico(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Técnico
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar técnicos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Data Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredTecnicos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Nenhum técnico encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredTecnicos.map((tecnico) => (
                <TableRow key={tecnico.id}>
                  <TableCell className="font-medium">{tecnico.nome}</TableCell>
                  <TableCell>{tecnico.cpf || '-'}</TableCell>
                  <TableCell>{tecnico.telefone || '-'}</TableCell>
                  <TableCell>{tecnico.email || '-'}</TableCell>
                  <TableCell>
                    {new Date(tecnico.criado_em).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(tecnico)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
