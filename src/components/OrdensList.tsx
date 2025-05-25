
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, OrdemCompleta } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { OrdemForm } from '@/components/OrdemForm'
import { Plus, Search, Edit, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const statusColors = {
  'aberta': 'bg-blue-500',
  'em_andamento': 'bg-yellow-500',
  'concluida': 'bg-green-500',
  'cancelada': 'bg-red-500'
}

const statusLabels = {
  'aberta': 'Aberta',
  'em_andamento': 'Em Andamento',
  'concluida': 'Concluída',
  'cancelada': 'Cancelada'
}

export function OrdensList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemCompleta | null>(null)
  const [isViewing, setIsViewing] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ['ordens'],
    queryFn: async () => {
      console.log('Fetching ordens...')
      const { data, error } = await supabase
        .from('view_ordem_servico_completa')
        .select('*')
        .order('data_abertura', { ascending: false })
      
      if (error) {
        console.error('Error fetching ordens:', error)
        throw error
      }
      
      console.log('Raw data from Supabase:', data)
      
      // Transform the data to match our interface
      const transformedData = data?.map(item => ({
        id: item.ordem_id || item.id,
        ordem_id: item.ordem_id,
        cliente_id: item.cliente_id,
        tecnico_id: item.tecnico_id,
        descricao_problema: item.descricao_problema,
        diagnostico: item.diagnostico,
        servico_realizado: item.servico_realizado,
        status: item.status,
        data_abertura: item.data_abertura,
        data_conclusao: item.data_conclusao,
        cliente: {
          id: item.cliente_id || '',
          nome: item.cliente_nome || '',
          telefone: item.cliente_telefone || '',
          email: item.cliente_email || '',
          endereco: item.cliente_endereco || '',
          criado_em: ''
        },
        tecnico: item.tecnico_nome ? {
          id: item.tecnico_id || '',
          nome: item.tecnico_nome,
          criado_em: ''
        } : undefined,
        itens: item.itens || [],
        total: item.total_ordem || 0
      })) || []
      
      console.log('Transformed data:', transformedData)
      return transformedData as OrdemCompleta[]
    }
  })

  const filteredOrdens = ordens.filter(ordem => {
    if (!ordem) return false
    
    const clienteNome = ordem.cliente?.nome?.toLowerCase() || ''
    const descricaoProblema = ordem.descricao_problema?.toLowerCase() || ''
    const searchLower = searchTerm.toLowerCase()
    
    return clienteNome.includes(searchLower) || descricaoProblema.includes(searchLower)
  })

  const handleEdit = (ordem: OrdemCompleta) => {
    setSelectedOrdem(ordem)
    setIsViewing(false)
    setIsDialogOpen(true)
  }

  const handleView = (ordem: OrdemCompleta) => {
    setSelectedOrdem(ordem)
    setIsViewing(true)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedOrdem(null)
    setIsViewing(false)
  }

  console.log('Filtered ordens:', filteredOrdens)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold">Ordens de Serviço</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedOrdem(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Ordem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {isViewing ? 'Visualizar Ordem' : selectedOrdem ? 'Editar Ordem' : 'Nova Ordem'}
              </DialogTitle>
              <DialogDescription>
                {isViewing ? 'Visualize os detalhes da ordem de serviço.' : selectedOrdem ? 'Edite os dados da ordem de serviço.' : 'Crie uma nova ordem de serviço.'}
              </DialogDescription>
            </DialogHeader>
            <OrdemForm 
              ordem={selectedOrdem}
              readOnly={isViewing}
              onSuccess={handleCloseDialog}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar ordens..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Problema</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data Abertura</TableHead>
              <TableHead>Total</TableHead>
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
            ) : filteredOrdens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Nenhuma ordem encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrdens.map((ordem) => (
                <TableRow key={ordem.id}>
                  <TableCell className="font-medium">{ordem.cliente?.nome || 'Cliente não encontrado'}</TableCell>
                  <TableCell className="max-w-xs truncate">{ordem.descricao_problema}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[ordem.status]}>
                      {statusLabels[ordem.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(ordem.data_abertura).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {ordem.total ? `R$ ${ordem.total.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleView(ordem)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(ordem)}
                      >
                        <Edit className="h-4 w-4" />
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
