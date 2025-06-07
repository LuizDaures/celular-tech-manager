import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, Cliente } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ClienteForm } from '@/components/ClienteForm'
import { Plus, Search, Edit, Trash } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function ClientesList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      console.log('Fetching clientes...')
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('criado_em', { ascending: false })
        .execute()

      if (error) {
        console.error('Error fetching clientes:', error)
        throw error
      }
      
      console.log('Clientes data:', data)
      return data || []
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Primeiro verificar se há ordens vinculadas - usando o nome correto da tabela
      const { data: ordens, error: ordensError } = await supabase
        .from('ordens_servico')
        .select('id')
        .eq('cliente_id', id)
        .limit(1)
        .execute()

      if (ordensError) throw ordensError

      if (ordens && ordens.length > 0) {
        throw new Error('Não é possível excluir este cliente pois existem ordens de serviço vinculadas a ele.')
      }

      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)
        .execute()

      if (error) throw error
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Cliente excluído com sucesso.',
      })
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
    },
    onError: (error: Error) => {
      console.error('Error deleting cliente:', error)
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    }
  })

  const filteredClientes = clientes.filter(cliente => {
    if (!cliente) return false
    
    const nome = cliente.nome?.toLowerCase() || ''
    const email = cliente.email?.toLowerCase() || ''
    const telefone = cliente.telefone || ''
    const searchLower = searchTerm.toLowerCase()
    
    return nome.includes(searchLower) || 
           email.includes(searchLower) || 
           telefone.includes(searchLower)
  })

  const handleEdit = (cliente: Cliente) => {
    setSelectedCliente(cliente)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedCliente(null)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">Gerencie os clientes da assistência</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedCliente(null)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle>
                {selectedCliente ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {selectedCliente ? 'Edite os dados do cliente.' : 'Crie um novo cliente.'}
              </DialogDescription>
            </DialogHeader>
            <ClienteForm 
              cliente={selectedCliente}
              onSuccess={handleCloseDialog}
              onCancel={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>
            Total de {filteredClientes.length} cliente{filteredClientes.length !== 1 ? 's' : ''} cadastrado{filteredClientes.length !== 1 ? 's' : ''}
          </CardDescription>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Carregando clientes...</div>
          ) : filteredClientes.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {searchTerm ? 'Nenhum cliente encontrado com os filtros aplicados.' : 'Nenhum cliente cadastrado.'}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Nome</TableHead>
                    <TableHead className="hidden md:table-cell">CPF</TableHead>
                    <TableHead className="hidden lg:table-cell">Email</TableHead>
                    <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                    <TableHead className="hidden md:table-cell">Data Cadastro</TableHead>
                    <TableHead className="text-right min-w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell className="hidden md:table-cell">{cliente.cpf || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell">{cliente.email || '-'}</TableCell>
                      <TableCell className="hidden sm:table-cell">{cliente.telefone || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(cliente.criado_em).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(cliente)}
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
                                  Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(cliente.id)}>
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
