import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, OrdemCompleta } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OrdemForm } from '@/components/OrdemForm'
import { Plus, Search, Edit, Eye, Trash, Download, Filter } from 'lucide-react'
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
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedOrdem, setSelectedOrdem] = useState<OrdemCompleta | null>(null)
  const [isViewing, setIsViewing] = useState(false)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ['ordens'],
    queryFn: async () => {
      console.log('Fetching ordens...')
      
      // Buscar diretamente da tabela ordens_servico com joins
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          clientes!ordens_servico_cliente_id_fkey (
            id,
            nome,
            telefone,
            email,
            endereco,
            cpf
          ),
          tecnicos!ordens_servico_tecnico_id_fkey (
            id,
            nome,
            cpf
          ),
          itens_ordem (
            id,
            nome_item,
            quantidade,
            preco_unitario
          )
        `)
        .order('data_abertura', { ascending: false })
      
      if (error) {
        console.error('Error fetching ordens:', error)
        throw error
      }
      
      console.log('Raw data from Supabase:', data)
      
      // Transform the data to match our interface
      const transformedData = data?.map(item => {
        const itensTotal = item.itens_ordem?.reduce((sum: number, itm: any) => 
          sum + (itm.quantidade * itm.preco_unitario), 0) || 0
        
        return {
          id: item.id,
          ordem_id: item.id,
          cliente_id: item.cliente_id,
          tecnico_id: item.tecnico_id,
          dispositivo: item.dispositivo,
          descricao_problema: item.descricao_problema,
          diagnostico: item.diagnostico,
          servico_realizado: item.servico_realizado,
          status: item.status,
          data_abertura: item.data_abertura,
          data_conclusao: item.data_conclusao,
          valor: item.valor,
          valor_manutencao: item.valor,
          cliente: item.clientes ? {
            id: item.clientes.id,
            nome: item.clientes.nome || '',
            telefone: item.clientes.telefone || '',
            email: item.clientes.email || '',
            endereco: item.clientes.endereco || '',
            cpf: item.clientes.cpf || '',
            criado_em: ''
          } : {
            id: '',
            nome: 'Cliente não encontrado',
            telefone: '',
            email: '',
            endereco: '',
            cpf: '',
            criado_em: ''
          },
          tecnico: item.tecnicos ? {
            id: item.tecnicos.id,
            nome: item.tecnicos.nome,
            cpf: item.tecnicos.cpf || '',
            criado_em: ''
          } : undefined,
          itens: item.itens_ordem || [],
          total: itensTotal
        }
      }) || []
      
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

      // Template HTML otimizado com layout mais compacto
      const htmlTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ordem de Serviço - ${ordem.id?.slice(-6).toUpperCase()}</title>
  <style>
    @page {
      size: A4;
      margin: 1.2cm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body { 
      font-family: 'Arial', sans-serif;
      font-size: 12px;
      line-height: 1.3;
      color: #333;
      background: #fff;
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .container {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .header {
      text-align: center;
      margin-bottom: 16px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 10px;
    }
    
    .header h1 {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 6px;
      color: #2563eb;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .header-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
    }
    
    .company-info h2 {
      font-size: 14px;
      color: #1f2937;
      margin-bottom: 2px;
    }
    
    .ordem-info {
      text-align: right;
      background: #f3f4f6;
      padding: 6px 10px;
      border-radius: 4px;
      border-left: 3px solid #2563eb;
      min-width: 200px;
    }
    
    .ordem-info .numero {
      font-size: 16px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 2px;
    }
    
    .date-info {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      gap: 8px;
    }
    
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .section {
      margin-bottom: 12px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      overflow: hidden;
      background: #fff;
    }
    
    .section-header {
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: white;
      padding: 6px 10px;
      font-weight: bold;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .section-content {
      padding: 8px;
    }
    
    .compact-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .field {
      display: flex;
      flex-direction: column;
    }
    
    .label {
      font-weight: bold;
      color: #374151;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .value {
      border-bottom: 1px solid #d1d5db;
      min-height: 16px;
      padding: 1px 0;
      color: #1f2937;
      font-size: 11px;
      word-wrap: break-word;
    }
    
    .text-area {
      min-height: 40px;
      border: 1px solid #d1d5db;
      padding: 6px;
      border-radius: 3px;
      background: #f9fafb;
      white-space: pre-wrap;
      color: #1f2937;
      font-size: 11px;
      word-wrap: break-word;
    }
    
    .status-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
    
    .status-aberta { background: #dbeafe; color: #1d4ed8; }
    .status-em_andamento { background: #fef3c7; color: #d97706; }
    .status-concluida { background: #d1fae5; color: #059669; }
    .status-cancelada { background: #fee2e2; color: #dc2626; }
    
    .pecas-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 10px;
    }
    
    .pecas-table th,
    .pecas-table td {
      border: 1px solid #d1d5db;
      padding: 4px 6px;
      text-align: left;
      word-wrap: break-word;
    }
    
    .pecas-table th {
      background: #f3f4f6;
      font-weight: bold;
      color: #374151;
      font-size: 9px;
    }
    
    .pecas-table .text-right {
      text-align: right;
    }
    
    .totals {
      background: #f8fafc;
      border-radius: 4px;
      padding: 8px;
      margin-top: 8px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      padding: 1px 0;
      font-size: 11px;
    }
    
    .totals-row:last-child {
      margin-bottom: 0;
      border-top: 1px solid #2563eb;
      padding-top: 4px;
      font-weight: bold;
      color: #2563eb;
    }
    
    .signatures {
      margin-top: auto;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      gap: 20px;
    }
    
    .signature-box {
      flex: 1;
      text-align: center;
    }
    
    .signature-line {
      border-bottom: 1px solid #374151;
      height: 30px;
      margin-bottom: 4px;
    }
    
    .signature-label {
      font-size: 9px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .footer {
      text-align: center;
      font-size: 8px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
      margin-top: 8px;
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
  <div class="container">
    <!-- Cabeçalho Refatorado -->
    <div class="header">
      <h1>Ordem de Serviço</h1>
      <div class="header-info">
        <div class="company-info">
          <h2>${empresa.nome}</h2>
          ${empresa.cnpj ? `<div style="font-size: 11px;">CNPJ: ${empresa.cnpj}</div>` : ''}
        </div>
        <div class="ordem-info">
          <div class="numero">Nº ${ordem.id?.slice(-6).toUpperCase() || '000001'}</div>
          <div class="date-info">
            <span><strong>Abertura:</strong> ${new Date(ordem.data_abertura).toLocaleDateString('pt-BR')}</span>
            ${ordem.data_conclusao ? `<span><strong>Conclusão:</strong> ${new Date(ordem.data_conclusao).toLocaleDateString('pt-BR')}</span>` : ''}
          </div>
          <div style="margin-top: 4px;">
            <span class="status-badge status-${ordem.status}">${statusLabels[ordem.status]}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="content">
      <!-- Grid Compacto para informações principais -->
      <div class="compact-grid">
        <div class="section">
          <div class="section-header">Dados do Cliente</div>
          <div class="section-content">
            <div class="field-group">
              <div class="field">
                <div class="label">Nome</div>
                <div class="value">${ordem.cliente?.nome || ''}</div>
              </div>
              <div class="field">
                <div class="label">CPF/CNPJ</div>
                <div class="value">${ordem.cliente?.cpf || ''}</div>
              </div>
              <div class="field">
                <div class="label">Telefone</div>
                <div class="value">${ordem.cliente?.telefone || ''}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-header">Equipamento</div>
          <div class="section-content">
            <div class="field-group">
              <div class="field">
                <div class="label">Dispositivo</div>
                <div class="value">${ordem.dispositivo || ''}</div>
              </div>
              ${ordem.tecnico ? `
              <div class="field">
                <div class="label">Técnico</div>
                <div class="value">${ordem.tecnico.nome}</div>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>

      <!-- Problema -->
      <div class="section">
        <div class="section-header">Problema Relatado</div>
        <div class="section-content">
          <div class="text-area">${ordem.descricao_problema || ''}</div>
        </div>
      </div>

      ${ordem.diagnostico || ordem.servico_realizado ? `
      <!-- Diagnóstico e Serviços -->
      <div class="compact-grid">
        ${ordem.diagnostico ? `
        <div class="section">
          <div class="section-header">Diagnóstico</div>
          <div class="section-content">
            <div class="text-area">${ordem.diagnostico}</div>
          </div>
        </div>
        ` : ''}
        
        ${ordem.servico_realizado ? `
        <div class="section">
          <div class="section-header">Serviços</div>
          <div class="section-content">
            <div class="text-area">${ordem.servico_realizado}</div>
          </div>
        </div>
        ` : ''}
      </div>
      ` : ''}

      ${ordem.itens && ordem.itens.length > 0 ? `
      <!-- Peças -->
      <div class="section">
        <div class="section-header">Peças e Componentes</div>
        <div class="section-content">
          <table class="pecas-table">
            <thead>
              <tr>
                <th style="width: 50%;">Descrição</th>
                <th style="width: 15%;">Qtd</th>
                <th style="width: 17.5%;">Unit.</th>
                <th style="width: 17.5%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${ordem.itens.map(item => `
              <tr>
                <td>${item.nome_item}</td>
                <td class="text-right">${item.quantidade}</td>
                <td class="text-right">R$ ${item.preco_unitario.toFixed(2).replace('.', ',')}</td>
                <td class="text-right">R$ ${(item.quantidade * item.preco_unitario).toFixed(2).replace('.', ',')}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      ` : ''}

      <!-- Resumo Financeiro -->
      <div class="section">
        <div class="section-header">Resumo Financeiro</div>
        <div class="section-content">
          <div class="totals">
            <div class="totals-row">
              <span>Valor dos Serviços:</span>
              <span>R$ ${(ordem.valor_manutencao || 0).toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="totals-row">
              <span>Valor das Peças:</span>
              <span>R$ ${(ordem.total || 0).toFixed(2).replace('.', ',')}</span>
            </div>
            <div class="totals-row">
              <span>Valor Total:</span>
              <span>R$ ${((ordem.valor_manutencao || 0) + (ordem.total || 0)).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Assinaturas -->
    <div class="signatures">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Assinatura do Cliente</div>
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Assinatura do Técnico</div>
      </div>
    </div>

    <!-- Rodapé -->
    <div class="footer">
      <p>Documento gerado em ${new Date().toLocaleString('pt-BR')} - ${empresa.nome}</p>
    </div>
  </div>
</body>
</html>
      `

      // Abrir em nova janela para evitar duplicação
      const newWindow = window.open('', '_blank')
      if (newWindow) {
        newWindow.document.open()
        newWindow.document.write(htmlTemplate)
        newWindow.document.close()
        
        // Aguardar carregamento e imprimir
        setTimeout(() => {
          newWindow.print()
        }, 500)
      }

      toast({
        title: "PDF Gerado",
        description: "O PDF foi aberto em uma nova janela.",
      })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o PDF da ordem de serviço.",
        variant: "destructive",
      })
    }
  }

  const filteredOrdens = ordens.filter(ordem => {
    if (!ordem) return false
    
    const clienteNome = ordem.cliente?.nome?.toLowerCase() || ''
    const descricaoProblema = ordem.descricao_problema?.toLowerCase() || ''
    const searchLower = searchTerm.toLowerCase()
    
    const matchesSearch = clienteNome.includes(searchLower) || descricaoProblema.includes(searchLower)
    const matchesStatus = statusFilter === 'all' || ordem.status === statusFilter
    
    return matchesSearch && matchesStatus
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Ordens de Serviço</h1>
          <p className="text-muted-foreground">Gerencie as ordens de serviço da assistência</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedOrdem(null)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nova Ordem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4">
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

      <Card>
        <CardHeader>
          <CardTitle>Lista de Ordens</CardTitle>
          <CardDescription>
            Total de {filteredOrdens.length} ordem{filteredOrdens.length !== 1 ? 's' : ''} {statusFilter !== 'all' ? `com status "${statusLabels[statusFilter as keyof typeof statusLabels]}"` : 'cadastrada' + (filteredOrdens.length !== 1 ? 's' : '')}
          </CardDescription>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ordens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Carregando ordens...</div>
          ) : filteredOrdens.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {searchTerm || statusFilter !== 'all' ? 'Nenhuma ordem encontrada com os filtros aplicados.' : 'Nenhuma ordem cadastrada.'}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">Cliente</TableHead>
                    <TableHead className="hidden sm:table-cell">Dispositivo</TableHead>
                    <TableHead className="hidden md:table-cell">Problema</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Data Abertura</TableHead>
                    <TableHead className="hidden md:table-cell">Valor Manutenção</TableHead>
                    <TableHead className="hidden lg:table-cell">Total Itens</TableHead>
                    <TableHead className="text-right min-w-[120px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrdens.map((ordem) => (
                    <TableRow key={ordem.id}>
                      <TableCell className="font-medium">{ordem.cliente?.nome || 'Cliente não encontrado'}</TableCell>
                      <TableCell className="hidden sm:table-cell">{ordem.dispositivo || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs truncate">{ordem.descricao_problema}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[ordem.status]}>
                          {statusLabels[ordem.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {new Date(ordem.data_abertura).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {ordem.valor_manutencao ? `R$ ${ordem.valor_manutencao?.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {ordem.total ? `R$ ${ordem.total?.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDownload(ordem)}
                            className="h-8 w-8"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleView(ordem)}
                            className="h-8 w-8"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(ordem)}
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
