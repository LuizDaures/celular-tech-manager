
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, Tecnico } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { TecnicoForm } from '@/components/TecnicoForm'
import { Plus, Search, Edit, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function TecnicosList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTecnico, setEditingTecnico] = useState<Tecnico | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: tecnicos = [], isLoading } = useQuery({
    queryKey: ['tecnicos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tecnicos')
        .select('*')
        .order('criado_em', { ascending: false })
      
      if (error) throw error
      return data as Tecnico[]
    }
  })

  const deleteTecnico = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tecnicos')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] })
      toast({
        title: "Técnico removido",
        description: "O técnico foi removido com sucesso.",
      })
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao remover técnico.",
        variant: "destructive",
      })
    }
  })

  const filteredTecnicos = tecnicos.filter(tecnico =>
    tecnico.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleEdit = (tecnico: Tecnico) => {
    setEditingTecnico(tecnico)
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja remover este técnico?')) {
      deleteTecnico.mutate(id)
    }
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingTecnico(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Técnicos</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingTecnico(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Técnico
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTecnico ? 'Editar Técnico' : 'Novo Técnico'}
              </DialogTitle>
              <DialogDescription>
                {editingTecnico ? 
                  'Atualize as informações do técnico aqui.' : 
                  'Cadastre um novo técnico no sistema.'
                }
              </DialogDescription>
            </DialogHeader>
            <TecnicoForm 
              tecnico={editingTecnico}
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
              <TableHead>Data de Cadastro</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredTecnicos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  Nenhum técnico encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredTecnicos.map((tecnico) => (
                <TableRow key={tecnico.id}>
                  <TableCell className="font-medium">{tecnico.nome}</TableCell>
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
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(tecnico.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
