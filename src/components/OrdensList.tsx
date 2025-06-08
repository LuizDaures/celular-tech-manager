import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient, OrdemCompleta } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OrdemForm } from '@/components/OrdemForm'
import { Plus, Search, Edit, Eye, Trash, Download, Filter, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useOrdemActions } from '@/hooks/useOrdemActions'

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
  const { deleteOrdem } = useOrdemActions()

  const { data: ordens = [], isLoading } = useQuery({
    queryKey: ['ordens'],
    queryFn: async () => {
      console.log('Fetching ordens...')
      
      const client = await getSupabaseClient()
      if (!client) throw new Error('Cliente Supabase não disponível')
      
      // Buscar diretamente da tabela ordens_servico com joins
      const { data, error } = await client
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

  // Mutation para concluir ordem
  const concluirOrdem = useMutation({
    mutationFn: async (orderId: string) => {
      const client = await getSupabaseClient()
      if (!client) throw new Error('Cliente Supabase não disponível')
      
      const { error } = await client
        .from('ordens_servico')
        .update({ 
          status: 'concluida',
          data_conclusao: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens'] })
      toast({
        title: 'Ordem concluída',
        description: 'A ordem de serviço foi marcada como concluída com sucesso.',
      })
    },
    onError: (error: any) => {
      console.error('Erro ao concluir ordem:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível concluir a ordem de serviço.',
        variant: 'destructive',
      })
    }
  })

  const handleDownload = async (ordem: OrdemCompleta) => {
    try {
      const client = await getSupabaseClient()
      if (!client) throw new Error('Cliente Supabase não disponível')

      // Buscar dados da empresa
      const { data: empresaData } = await client
        .from('dados_empresa')
        .select('*')
        .limit(1)
        .single()

      const empresa = empresaData || { nome: 'Sistema de Gestão', cnpj: '', logo_base64: '' }

      // Template HTML otimizado com layout mais compacto e margens
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
      margin: 2cm 1.5cm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body { 
      font-family: 'Arial', sans-serif;
      font-size: 12px;
      line-height: 1.4;
      color: #333;
      background: #fff;
      margin: 20px;
      padding: 20px;
      min-height: calc(100vh - 40px);
      display: flex;
      flex-direction: column;
    }
    
    .container {
      flex: 1;
      display: flex;
      flex-direction: column;
      max-width: 100%;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 15px;
    }
    
    .header h1 {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 8px;
      color: #2563eb;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .header-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
      flex-wrap: wrap;
      gap: 15px;
    }
    
    .company-info h2 {
      font-size: 16px;
      color: #1f2937;
      margin-bottom: 4px;
    }
    
    .ordem-info {
      text-align: right;
      background: #f3f4f6;
      padding: 10px 15px;
      border-radius: 6px;
      border-left: 4px solid #2563eb;
      min-width: 220px;
    }
    
    .ordem-info .numero {
      font-size: 18px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 4px;
    }
    
    .date-info {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      gap: 10px;
      flex-wrap: wrap;
    }
    
    .content {
      flex: 1;
      display: flex;
      flex-direction: column;
      margin: 10px 0;
    }
    
    .section {
      margin-bottom: 15px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      overflow: hidden;
      background: #fff;
      page-break-inside: avoid;
    }
    
    .section-header {
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: white;
      padding: 8px 12px;
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .section-content {
      padding: 12px;
    }
    
    .compact-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 15px;
    }
    
    .field-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .field {
      display: flex;
      flex-direction: column;
    }
    
    .label {
      font-weight: bold;
      color: #374151;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }
    
    .value {
      border-bottom: 1px solid #d1d5db;
      min-height: 18px;
      padding: 2px 0;
      color: #1f2937;
      font-size: 12px;
      word-wrap: break-word;
    }
    
    .text-area {
      min-height: 50px;
      border: 1px solid #d1d5db;
      padding: 8px;
      border-radius: 4px;
      background: #f9fafb;
      white-space: pre-wrap;
      color: #1f2937;
      font-size: 12px;
      word-wrap: break-word;
      line-height: 1.5;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 10px;
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
      margin-top: 8px;
      font-size: 11px;
    }
    
    .pecas-table th,
    .pecas-table td {
      border: 1px solid #d1d5db;
      padding: 6px 8px;
      text-align: left;
      word-wrap: break-word;
    }
    
    .pecas-table th {
      background: #f3f4f6;
      font-weight: bold;
      color: #374151;
      font-size: 10px;
    }
    
    .pecas-table .text-right {
      text-align: right;
    }
    
    .totals {
      background: #f8fafc;
      border-radius: 6px;
      padding: 12px;
      margin-top: 10px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      padding: 2px 0;
      font-size: 12px;
    }
    
    .totals-row:last-child {
      margin-bottom: 0;
      border-top: 2px solid #2563eb;
      padding-top: 6px;
      font-weight: bold;
      color: #2563eb;
      font-size: 14px;
    }
    
    .signatures {
      margin-top: auto;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      gap: 30px;
    }
    
    .signature-box {
      flex: 1;
      text-align: center;
    }
    
    .signature-line {
      border-bottom: 1px solid #374151;
      height: 40px;
      margin-bottom: 6px;
    }
    
    .signature-label {
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .footer {
      text-align: center;
      font-size: 9px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
      margin-top: 15px;
    }
    
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        margin: 1.5cm;
        padding: 0;
      }
      
      .container {
        margin: 0;
        padding: 0;
      }
    }
    
    @media screen and (max-width: 768px) {
      .compact-grid {
        grid-template-columns: 1fr;
      }
      
      .header-info {
        flex-direction: column;
        text-align: center;
      }
      
      .ordem-info {
        text-align: center;
        min-width: auto;
      }
      
      .signatures {
        flex-direction: column;
        gap: 20px;
      }
      
      .date-info {
        flex-direction: column;
        gap: 4px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Cabeçalho -->
    <div class="header">
      <h1>Ordem de Serviço</h1>
      <div class="header-info">
        <div class="company-info">
          <h2>${empresa.nome}</h2>
          ${empresa.cnpj ? `<div style="font-size: 12px; margin-top: 4px;">CNPJ: ${empresa.cnpj}</div>` : ''}
        </div>
        <div class="ordem-info">
          <div class="numero">Nº ${ordem.id?.slice(-6).toUpperCase() || '000001'}</div>
          <div class="date-info">
            <span><strong>Abertura:</strong> ${new Date(ordem.data_abertura).toLocaleDateString('pt-BR')}</span>
            ${ordem.data_conclusao ? `<span><strong>Conclusão:</strong> ${new Date(ordem.data_conclusao).toLocaleDateString('pt-BR')}</span>` : ''}
          </div>
          <div style="margin-top: 6px;">
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

      // Criar um blob com o conteúdo HTML
      const blob = new Blob([htmlTemplate], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      // Criar um link temporário para download
      const link = document.createElement('a')
      link.href = url
      link.download = `OS-${ordem.id?.slice(-6).toUpperCase() || '000001'}.html`
      
      // Adicionar ao DOM, clicar e remover
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Limpar o URL do blob
      URL.revokeObjectURL(url)

      toast({
        title: "PDF Gerado",
        description: "O arquivo HTML foi baixado com sucesso.",
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
    deleteOrdem.mutate(id)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedOrdem(null)
    setIsViewing(false)
  }

  const handleConcluirOrdem = (orderId: string) => {
    concluirOrdem.mutate(orderId)
  }

  console.log('Filtered ordens:', filteredOrdens)

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Ordens de Serviço</h1>
          <p className="text-muted-foreground">Gerencie as ordens de serviço da assistência</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedOrdem(null)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Nova Ordem
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto mx-4 bg-background border-border">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                {isViewing ? 'Visualizar Ordem' : selectedOrdem ? 'Editar Ordem' : 'Nova Ordem'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
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

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Lista de Ordens</CardTitle>
          <CardDescription className="text-muted-foreground">
            Total de {filteredOrdens.length} ordem{filteredOrdens.length !== 1 ? 's' : ''} {statusFilter !== 'all' ? `com status "${statusLabels[statusFilter as keyof typeof statusLabels]}"` : 'cadastrada' + (filteredOrdens.length !== 1 ? 's' : '')}
          </CardDescription>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ordens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background border-border text-foreground"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-background border-border">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
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
            <div className="text-center py-4 text-muted-foreground">Carregando ordens...</div>
          ) : filteredOrdens.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              {searchTerm || statusFilter !== 'all' ? 'Nenhuma ordem encontrada com os filtros aplicados.' : 'Nenhuma ordem cadastrada.'}
            </div>
          ) : (
            <div className="rounded-md border border-border overflow-x-auto bg-background">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-muted/50">
                    <TableHead className="text-muted-foreground">Cliente</TableHead>
                    <TableHead className="hidden sm:table-cell text-muted-foreground">Dispositivo</TableHead>
                    <TableHead className="hidden md:table-cell text-muted-foreground">Problema</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="hidden lg:table-cell text-muted-foreground">Data Abertura</TableHead>
                    <TableHead className="hidden md:table-cell text-muted-foreground">Valor Manutenção</TableHead>
                    <TableHead className="hidden lg:table-cell text-muted-foreground">Total Itens</TableHead>
                    <TableHead className="text-right text-muted-foreground">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrdens.map((ordem) => (
                    <TableRow key={ordem.id} className="border-border hover:bg-muted/50">
                      <TableCell className="font-medium text-foreground">{ordem.cliente?.nome || 'Cliente não encontrado'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-foreground">{ordem.dispositivo || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs truncate text-foreground">{ordem.descricao_problema}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[ordem.status]}>
                          {statusLabels[ordem.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-foreground">
                        {new Date(ordem.data_abertura).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-foreground">
                        {ordem.valor_manutencao ? `R$ ${ordem.valor_manutencao?.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-foreground">
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
                          {ordem.status !== 'concluida' && ordem.status !== 'cancelada' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  disabled={concluirOrdem.isPending}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="mx-4 bg-background border-border">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-foreground">Concluir ordem</AlertDialogTitle>
                                  <AlertDialogDescription className="text-muted-foreground">
                                    Tem certeza que deseja marcar esta ordem como concluída? Esta ação irá atualizar o status da ordem.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleConcluirOrdem(ordem.id)}
                                    disabled={concluirOrdem.isPending}
                                  >
                                    {concluirOrdem.isPending ? 'Concluindo...' : 'Concluir'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
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
