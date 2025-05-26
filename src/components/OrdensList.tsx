import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, OrdemCompleta } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { OrdemForm } from '@/components/OrdemForm'
import { Plus, Search, Edit, Eye, Trash, Download } from 'lucide-react'
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Primeiro excluir os itens da ordem
      const { error: itensError } = await supabase
        .from('item_ordem')
        .delete()
        .eq('ordem_id', id)

      if (itensError) throw itensError

      // Depois excluir a ordem
      const { error } = await supabase
        .from('ordem_servico')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Ordem de serviço excluída com sucesso.',
      })
      queryClient.invalidateQueries({ queryKey: ['ordens'] })
    },
    onError: (error: Error) => {
      console.error('Error deleting ordem:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a ordem de serviço.',
        variant: 'destructive',
      })
    }
  })

  const handleDownload = async (ordem: OrdemCompleta) => {
    try {
      // Buscar dados da empresa
      const { data: empresaData } = await supabase
        .from('dados_empresa')
        .select('*')
        .limit(1)
        .single()

      const empresa = empresaData || { nome: 'TechFix Pro', cnpj: '', logo_base64: '' }

      // Template HTML
      const htmlTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ordem de Serviço</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h2 { text-align: center; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #000; padding: 8px; }
    .section { margin-top: 30px; }
    .empresa-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 30px;
    }
    .empresa-header img {
      max-height: 80px;
    }
  </style>
</head>
<body>

  <div class="empresa-header">
    ${empresa.logo_base64 ? `<img src="data:image/png;base64,${empresa.logo_base64}" alt="Logo da Empresa">` : ''}
    <div>
      <h2>${empresa.nome}</h2>
      ${empresa.cnpj ? `<strong>CNPJ:</strong> ${empresa.cnpj}` : ''}
    </div>
  </div>

  <h2>Ordem de Serviço</h2>

  <div class="section">
    <strong>ID da Ordem:</strong> ${ordem.id}<br>
    <strong>Data de Abertura:</strong> ${new Date(ordem.data_abertura).toLocaleDateString('pt-BR')}<br>
    ${ordem.data_conclusao ? `<strong>Data de Conclusão:</strong> ${new Date(ordem.data_conclusao).toLocaleDateString('pt-BR')}<br>` : ''}
    <strong>Status:</strong> ${statusLabels[ordem.status]}<br>
  </div>

  <div class="section">
    <h3>Cliente</h3>
    <strong>Nome:</strong> ${ordem.cliente?.nome || ''}<br>
    ${ordem.cliente_cpf ? `<strong>CPF:</strong> ${ordem.cliente_cpf}<br>` : ''}
    ${ordem.cliente_telefone ? `<strong>Telefone:</strong> ${ordem.cliente_telefone}<br>` : ''}
    ${ordem.cliente_email ? `<strong>Email:</strong> ${ordem.cliente_email}<br>` : ''}
    ${ordem.cliente_endereco ? `<strong>Endereço:</strong> ${ordem.cliente_endereco}<br>` : ''}
  </div>

  <div class="section">
    <h3>Técnico</h3>
    <strong>Nome:</strong> ${ordem.tecnico?.nome || 'Não atribuído'}<br>
    ${ordem.tecnico_cpf ? `<strong>CPF:</strong> ${ordem.tecnico_cpf}<br>` : ''}
  </div>

  <div class="section">
    <h3>Descrição do Problema</h3>
    <p>${ordem.descricao_problema}</p>

    ${ordem.diagnostico ? `<h3>Diagnóstico</h3><p>${ordem.diagnostico}</p>` : ''}

    ${ordem.servico_realizado ? `<h3>Serviço Realizado</h3><p>${ordem.servico_realizado}</p>` : ''}
  </div>

  ${ordem.itens && ordem.itens.length > 0 ? `
  <div class="section">
    <h3>Itens</h3>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Qtd</th>
          <th>Preço Unitário</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${ordem.itens.map(item => `
        <tr>
          <td>${item.nome_item}</td>
          <td>${item.quantidade}</td>
          <td>R$ ${item.preco_unitario.toFixed(2)}</td>
          <td>R$ ${(item.quantidade * item.preco_unitario).toFixed(2)}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="section">
    <h3>Resumo</h3>
    <strong>Valor da Manutenção:</strong> R$ ${ordem.valor_manutencao?.toFixed(2) || ordem.valor?.toFixed(2) || '0,00'}<br>
    <strong>Total dos Itens:</strong> R$ ${ordem.total_ordem?.toFixed(2) || ordem.total?.toFixed(2) || '0,00'}<br>
    <strong>Total Geral:</strong> R$ ${((ordem.valor_manutencao || ordem.valor || 0) + (ordem.total_ordem || ordem.total || 0)).toFixed(2)}<br>
  </div>

</body>
</html>
      `

      // Criar e baixar o arquivo
      const blob = new Blob([htmlTemplate], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `ordem-servico-${ordem.id}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)

      toast({
        title: "Download concluído",
        description: "A ordem de serviço foi baixada com sucesso.",
      })
    } catch (error) {
      console.error('Erro no download:', error)
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar a ordem de serviço.",
        variant: "destructive",
      })
    }
  }

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

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
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
              <TableHead>Valor Manutenção</TableHead>
              <TableHead>Total Itens</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredOrdens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
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
                    {ordem.valor_manutencao || ordem.valor ? `R$ ${(ordem.valor_manutencao || ordem.valor)?.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    {ordem.total_ordem || ordem.total ? `R$ ${(ordem.total_ordem || ordem.total)?.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDownload(ordem)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
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
                              Tem certeza que deseja excluir esta ordem de serviço? Esta ação não pode ser desfeita e todos os itens relacionados também serão excluídos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(ordem.id)}>
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
