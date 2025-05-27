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
        dispositivo: item.dispositivo,
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
          cpf: item.cliente_cpf || '',
          criado_em: ''
        },
        tecnico: item.tecnico_nome ? {
          id: '',
          nome: item.tecnico_nome,
          cpf: item.tecnico_cpf || '',
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

      // Template HTML conforme a imagem fornecida
      const htmlTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Registro de Ordem de Serviço</title>
  <style>
    @page {
      size: A4;
      margin: 1cm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body { 
      font-family: Arial, sans-serif;
      font-size: 10px;
      line-height: 1.3;
      color: #000;
      max-width: 21cm;
      margin: 0 auto;
      background: #fff;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 10px;
    }
    
    .header h1 {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    
    .company-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }
    
    .company-left {
      text-align: left;
    }
    
    .company-right {
      text-align: right;
      background: #f0f0f0;
      padding: 8px 12px;
      border: 1px solid #ccc;
    }
    
    .section {
      margin-bottom: 15px;
      border: 1px solid #ccc;
      overflow: hidden;
    }
    
    .section-header {
      background: #f8f8f8;
      padding: 8px 12px;
      font-weight: bold;
      text-align: center;
      border-bottom: 1px solid #ccc;
      text-transform: uppercase;
      font-size: 10px;
    }
    
    .section-content {
      padding: 12px;
    }
    
    .row {
      display: flex;
      margin-bottom: 8px;
    }
    
    .row:last-child {
      margin-bottom: 0;
    }
    
    .col {
      flex: 1;
      margin-right: 20px;
    }
    
    .col:last-child {
      margin-right: 0;
    }
    
    .label {
      font-weight: bold;
      margin-bottom: 2px;
    }
    
    .value {
      border-bottom: 1px solid #000;
      min-height: 16px;
      padding-bottom: 2px;
    }
    
    .full-width {
      width: 100%;
    }
    
    .text-area {
      min-height: 60px;
      border: 1px solid #ccc;
      padding: 8px;
      white-space: pre-wrap;
    }
    
    .orcamento {
      margin-top: 20px;
    }
    
    .orcamento-content {
      display: flex;
      justify-content: space-between;
      padding: 12px;
    }
    
    .orcamento-left {
      flex: 1;
    }
    
    .orcamento-item {
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
    }
    
    .signatures {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
    }
    
    .signature-box {
      width: 45%;
      text-align: center;
    }
    
    .signature-line {
      border-bottom: 1px solid #000;
      height: 40px;
      margin-bottom: 5px;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>REGISTRO DE ORDEM DE SERVIÇO</h1>
  </div>

  <div class="company-info">
    <div class="company-left">
      <strong>${empresa.nome}</strong><br>
      ${empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : ''}
    </div>
    <div class="company-right">
      <strong>O.S. Nº: ${ordem.id?.slice(-6).toUpperCase() || '000001'}</strong><br>
      <strong>Data de abertura:</strong> ${new Date(ordem.data_abertura).toLocaleDateString('pt-BR')}
    </div>
  </div>

  <!-- Dados do Cliente -->
  <div class="section">
    <div class="section-header">DADOS DO CLIENTE</div>
    <div class="section-content">
      <div class="row">
        <div class="col">
          <div class="label">Nome:</div>
          <div class="value">${ordem.cliente?.nome || ''}</div>
        </div>
        <div class="col">
          <div class="label">CPF/CNPJ:</div>
          <div class="value">${ordem.cliente?.cpf || ''}</div>
        </div>
      </div>
      <div class="row">
        <div class="col">
          <div class="label">Endereço:</div>
          <div class="value">${ordem.cliente?.endereco || ''}</div>
        </div>
        <div class="col">
          <div class="label">Bairro:</div>
          <div class="value"></div>
        </div>
      </div>
      <div class="row">
        <div class="col">
          <div class="label">Cidade:</div>
          <div class="value"></div>
        </div>
        <div class="col">
          <div class="label">CEP:</div>
          <div class="value"></div>
        </div>
      </div>
      <div class="row">
        <div class="col">
          <div class="label">Telefone:</div>
          <div class="value">${ordem.cliente?.telefone || ''}</div>
        </div>
        <div class="col">
          <div class="label">E-mail:</div>
          <div class="value">${ordem.cliente?.email || ''}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Informações do Produto -->
  <div class="section">
    <div class="section-header">INFORMAÇÕES DO PRODUTO</div>
    <div class="section-content">
      <div class="row">
        <div class="col">
          <div class="label">Modelo:</div>
          <div class="value">${ordem.dispositivo || ''}</div>
        </div>
      </div>
      <div class="row">
        <div class="col full-width">
          <div class="label">Detalhes:</div>
          <div class="value"></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Relato do Cliente -->
  <div class="section">
    <div class="section-header">RELATO DO CLIENTE</div>
    <div class="section-content">
      <div class="text-area">${ordem.descricao_problema || ''}</div>
    </div>
  </div>

  <!-- Diagnóstico e Serviço -->
  <div class="section">
    <div class="section-header">DIAGNÓSTICO E SERVIÇO A SER PRESTADO</div>
    <div class="section-content">
      <div class="text-area">${ordem.diagnostico || ''}</div>
    </div>
  </div>

  <!-- Garantia e Observações -->
  <div class="section">
    <div class="section-header">GARANTIA E OBSERVAÇÕES</div>
    <div class="section-content">
      <div class="text-area">${ordem.servico_realizado || ''}</div>
    </div>
  </div>

  <!-- Orçamento -->
  <div class="section orcamento">
    <div class="section-header">ORÇAMENTO</div>
    <div class="orcamento-content">
      <div class="orcamento-left">
        <div class="orcamento-item">
          <span>Valor dos serviços:</span>
          <span>R$ ${(ordem.valor_manutencao || 0).toFixed(2).replace('.', ',')}</span>
        </div>
        <div class="orcamento-item">
          <span>Valor de peças/produtos:</span>
          <span>R$ ${(ordem.total || 0).toFixed(2).replace('.', ',')}</span>
        </div>
        <div class="orcamento-item" style="font-weight: bold; border-top: 1px solid #000; padding-top: 8px;">
          <span>Valor total:</span>
          <span>R$ ${((ordem.valor_manutencao || 0) + (ordem.total || 0)).toFixed(2).replace('.', ',')}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Assinaturas -->
  <div class="signatures">
    <div class="signature-box">
      <div class="signature-line"></div>
      <div>Assinatura Cliente</div>
    </div>
    <div class="signature-box">
      <div class="signature-line"></div>
      <div>Assinatura Responsável Técnico</div>
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
              <TableHead>Dispositivo</TableHead>
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
                <TableCell colSpan={8} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredOrdens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Nenhuma ordem encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrdens.map((ordem) => (
                <TableRow key={ordem.id}>
                  <TableCell className="font-medium">{ordem.cliente?.nome || 'Cliente não encontrado'}</TableCell>
                  <TableCell>{ordem.dispositivo || '-'}</TableCell>
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
                    {ordem.valor_manutencao ? `R$ ${ordem.valor_manutencao?.toFixed(2)}` : '-'}
                  </TableCell>
                  <TableCell>
                    {ordem.total ? `R$ ${ordem.total?.toFixed(2)}` : '-'}
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
