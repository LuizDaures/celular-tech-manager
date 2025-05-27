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
        cliente_id: '',
        tecnico_id: '',
        descricao_problema: item.descricao_problema,
        diagnostico: item.diagnostico,
        servico_realizado: item.servico_realizado,
        status: item.status,
        data_abertura: item.data_abertura,
        data_conclusao: item.data_conclusao,
        cliente: {
          id: '',
          nome: item.cliente_nome || '',
          telefone: item.cliente_telefone || '',
          email: item.cliente_email || '',
          endereco: item.cliente_endereco || '',
          criado_em: ''
        },
        tecnico: item.tecnico_nome ? {
          id: '',
          nome: item.tecnico_nome,
          criado_em: ''
        } : undefined,
        itens: item.itens || [],
        total: item.total_ordem || 0,
        valor_manutencao: item.valor_manutencao || 0
      })) || []
      
      console.log('Transformed data:', transformedData)
      return transformedData as OrdemCompleta[]
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Primeiro excluir os itens da ordem
      const { error: itensError } = await supabase
        .from('itens_ordem')
        .delete()
        .eq('ordem_id', id)

      if (itensError) throw itensError

      // Depois excluir a ordem
      const { error } = await supabase
        .from('ordens_servico')
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

      // Template HTML melhorado para ficar similar à imagem
      const htmlTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ordem de Serviço</title>
  <style>
    body { 
      font-family: Arial, sans-serif; 
      padding: 20px; 
      margin: 0;
      font-size: 12px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .logo-section {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .logo-section img {
      max-height: 60px;
    }
    .logo-placeholder {
      width: 60px;
      height: 60px;
      background: #28a745;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
    }
    .empresa-info {
      text-align: center;
      font-size: 10px;
      color: #666;
    }
    .title {
      text-align: center;
      margin: 20px 0;
    }
    .title h1 {
      margin: 0;
      font-size: 18px;
      font-weight: bold;
    }
    .title h2 {
      margin: 5px 0 0 0;
      font-size: 16px;
      font-weight: normal;
    }
    .section {
      margin-bottom: 15px;
    }
    .section-header {
      background: #666;
      color: white;
      padding: 5px 10px;
      font-weight: bold;
      margin: 0;
    }
    .section-content {
      border: 1px solid #666;
      border-top: none;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    .info-item {
      padding: 8px;
      border-bottom: 1px solid #ccc;
      border-right: 1px solid #ccc;
    }
    .info-item:nth-child(even) {
      border-right: none;
    }
    .info-item:last-child,
    .info-item:nth-last-child(2) {
      border-bottom: none;
    }
    .info-label {
      font-weight: bold;
      display: block;
      margin-bottom: 2px;
    }
    .full-width {
      grid-column: span 2;
      border-right: none !important;
    }
    .text-content {
      padding: 10px;
      min-height: 60px;
    }
    .list-content {
      padding: 10px;
    }
    .list-content ul {
      margin: 0;
      padding-left: 20px;
    }
    .list-content li {
      margin-bottom: 3px;
    }
    .footer-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 20px;
      font-size: 11px;
    }
    .footer-item {
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      ${empresa.logo_base64 ? 
        `<img src="data:image/png;base64,${empresa.logo_base64}" alt="Logo">` : 
        `<div class="logo-placeholder">🔧</div>`
      }
      <div class="empresa-info">
        coloque aqui a marca<br>
        da sua empresa
      </div>
    </div>
    
    <div class="title">
      <h1>Ordem de Serviço ${ordem.id?.slice(-4) || '0001'}</h1>
      <h2>Manutenção Corretiva</h2>
    </div>
    
    <div class="logo-section">
      <div class="empresa-info">
        coloque aqui a marca<br>
        do seu cliente
      </div>
      <div class="logo-placeholder">🔧</div>
    </div>
  </div>

  <!-- Seção Cliente -->
  <div class="section">
    <div class="section-header">Cliente</div>
    <div class="section-content">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Nome</span>
          ${ordem.cliente?.nome || 'Não informado'}
        </div>
        <div class="info-item">
          <span class="info-label">Endereço</span>
          ${ordem.cliente?.endereco || 'Não informado'}
        </div>
        <div class="info-item">
          <span class="info-label">Telefone</span>
          ${ordem.cliente?.telefone || 'Não informado'}
        </div>
        <div class="info-item">
          <span class="info-label">CNPJ</span>
          ${ordem.cliente?.cpf || 'Não informado'}
        </div>
      </div>
    </div>
  </div>

  <!-- Seção Equipamento -->
  <div class="section">
    <div class="section-header">Equipamento ou Ativo</div>
    <div class="section-content">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Nome</span>
          Equipamento
        </div>
        <div class="info-item">
          <span class="info-label">Modelo</span>
          ${ordem.descricao_problema?.split(' ')[0] || 'Não especificado'}
        </div>
        <div class="info-item full-width">
          <span class="info-label">Marca</span>
          Não especificado
        </div>
      </div>
    </div>
  </div>

  <!-- Seção Diagnóstico -->
  <div class="section">
    <div class="section-header">Diagnóstico</div>
    <div class="section-content">
      <div class="text-content">
        <em>Diagnóstico atual</em><br><br>
        ${ordem.diagnostico ? 
          ordem.diagnostico.split('.').map(item => item.trim()).filter(item => item).map(item => `• ${item}`).join('<br>') :
          `• ${ordem.descricao_problema}<br>• Necessário análise técnica`
        }
      </div>
    </div>
  </div>

  <!-- Seção Solução -->
  ${ordem.servico_realizado ? `
  <div class="section">
    <div class="section-header">Solução</div>
    <div class="section-content">
      <div class="text-content">
        <em>Solução aplicada</em><br><br>
        ${ordem.servico_realizado.split('.').map(item => item.trim()).filter(item => item).map(item => `• ${item}`).join('<br>')}
      </div>
    </div>
  </div>
  ` : ''}

  <!-- Seção Peças -->
  ${ordem.itens && ordem.itens.length > 0 ? `
  <div class="section">
    <div class="section-header">Peças trocadas</div>
    <div class="section-content">
      <div class="list-content">
        <em>Peças trocadas</em><br><br>
        <ul>
          ${ordem.itens.map(item => `<li>${item.nome_item}</li>`).join('')}
        </ul>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- Rodapé -->
  <div class="footer-info">
    <div>
      <div class="footer-item">
        <strong>Data do Serviço:</strong>
        <span>${new Date(ordem.data_abertura).toLocaleDateString('pt-BR')} às ${new Date(ordem.data_abertura).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}h</span>
      </div>
      <div class="footer-item">
        <strong>Contatos:</strong>
        <span>${ordem.cliente?.telefone || '(xx) xxxx-xxxx'}</span>
      </div>
    </div>
    <div>
      <div class="footer-item">
        <strong>Técnico responsável:</strong>
        <span>${ordem.tecnico?.nome || 'Não atribuído'}</span>
      </div>
      <div class="footer-item">
        <strong>Total do Serviço:</strong>
        <span>R$ ${((ordem.valor_manutencao || 0) + (ordem.total || 0)).toFixed(2).replace('.', ',')}</span>
      </div>
    </div>
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
