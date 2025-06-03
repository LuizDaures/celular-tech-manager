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
import { Plus, Search, Edit, Eye, Trash, Download, Filter, Check } from 'lucide-react'
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
      
      const supabase = await getSupabaseClient()
      if (!supabase) {
        console.error('Supabase client not available')
        throw new Error('Database connection not available')
      }
      
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
      
      return transformedData as OrdemCompleta[]
    }
  })

  // Mutation para concluir ordem
  const concluirOrdemMutation = useMutation({
    mutationFn: async (ordemId: string) => {
      const supabase = await getSupabaseClient()
      if (!supabase) throw new Error('Database connection not available')

      const { error } = await supabase
        .from('ordens_servico')
        .update({ 
          status: 'concluida',
          data_conclusao: new Date().toISOString()
        })
        .eq('id', ordemId)

      if (error) throw error
    },
    onSuccess: () => {
      toast({
        title: 'Ordem Concluída',
        description: 'A ordem foi marcada como concluída com sucesso.',
      })
      queryClient.invalidateQueries({ queryKey: ['ordens'] })
    },
    onError: (error: Error) => {
      console.error('Error concluding ordem:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível concluir a ordem de serviço.',
        variant: 'destructive',
      })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = await getSupabaseClient()
      if (!supabase) throw new Error('Database connection not available')

      const { error: itensError } = await supabase
        .from('itens_ordem')
        .delete()
        .eq('ordem_id', id)

      if (itensError) throw itensError

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
      const supabase = await getSupabaseClient()
      if (!supabase) {
        toast({
          title: 'Erro',
          description: 'Conexão com banco de dados não disponível.',
          variant: 'destructive',
        })
        return
      }

      // Buscar dados da empresa
      const { data: empresaData } = await supabase
        .from('dados_empresa')
        .select('*')
        .limit(1)
        .single()

      const empresa = empresaData || { nome: 'Sistema de Gestão', cnpj: '', logo_base64: '' }

      // Template HTML com logo circular centralizada
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
      color: #000;
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
      margin-bottom: 25px;
      border-bottom: 2px solid #000;
      padding-bottom: 20px;
    }

    .logo-container {
      margin-bottom: 15px;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .logo {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      border: 3px solid #000;
      object-fit: cover;
      object-position: center;
      display: block;
    }
    
    .company-info {
      margin-bottom: 15px;
    }

    .company-info h2 {
      font-size: 18px;
      color: #000;
      margin-bottom: 6px;
      font-weight: bold;
    }

    .company-info .cnpj {
      font-size: 14px;
      color: #000;
      margin-bottom: 10px;
    }
    
    .ordem-info {
      background: #f8f8f8;
      padding: 12px 20px;
      border-radius: 8px;
      border: 2px solid #000;
      display: inline-block;
      margin: 0 auto;
    }
    
    .ordem-info .numero {
      font-size: 20px;
      font-weight: bold;
      color: #000;
      margin-bottom: 6px;
    }
    
    .date-info {
      display: flex;
      justify-content: center;
      gap: 20px;
      font-size: 12px;
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
      border: 1px solid #ccc;
      border-radius: 6px;
      overflow: hidden;
      background: #fff;
      page-break-inside: avoid;
    }
    
    .section-header {
      background: #000;
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
      color: #000;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }
    
    .value {
      border-bottom: 1px solid #ccc;
      min-height: 18px;
      padding: 2px 0;
      color: #000;
      font-size: 12px;
      word-wrap: break-word;
    }
    
    .text-area {
      min-height: 50px;
      border: 1px solid #ccc;
      padding: 8px;
      border-radius: 4px;
      background: #f9f9f9;
      white-space: pre-wrap;
      color: #000;
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
    
    .status-aberta { background: #e6e6e6; color: #000; }
    .status-em_andamento { background: #fff3cd; color: #856404; }
    .status-concluida { background: #d4edda; color: #155724; }
    .status-cancelada { background: #f8d7da; color: #721c24; }
    
    .pecas-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 11px;
    }
    
    .pecas-table th,
    .pecas-table td {
      border: 1px solid #ccc;
      padding: 6px 8px;
      text-align: left;
      word-wrap: break-word;
    }
    
    .pecas-table th {
      background: #f0f0f0;
      font-weight: bold;
      color: #000;
      font-size: 10px;
    }
    
    .pecas-table .text-right {
      text-align: right;
    }
    
    .totals {
      background: #f5f5f5;
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
      border-top: 2px solid #000;
      padding-top: 6px;
      font-weight: bold;
      color: #000;
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
      border-bottom: 1px solid #000;
      height: 40px;
      margin-bottom: 6px;
    }
    
    .signature-label {
      font-size: 10px;
      color: #000;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .footer {
      text-align: center;
      font-size: 9px;
      color: #666;
      border-top: 1px solid #ccc;
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
    <div class="header">
      ${empresa.logo_base64 ? `
      <div class="logo-container">
        <img src="data:image/png;base64,${empresa.logo_base64}" alt="Logo da empresa" class="logo" />
      </div>
      ` : ''}
      
      <div class="company-info">
        <h2>${empresa.nome}</h2>
        ${empresa.cnpj ? `<div class="cnpj">CNPJ: ${empresa.cnpj}</div>` : ''}
      </div>
      
      <div class="ordem-info">
        <div class="numero">Nº ${ordem.id?.slice(-6).toUpperCase() || '000001'}</div>
        <div class="status-badge status-${ordem.status}">${statusLabels[ordem.status]}</div>
      </div>
      
      <div class="date-info">
        <span><strong>Abertura:</strong> ${new Date(ordem.data_abertura).toLocaleDateString('pt-BR')}</span>
        ${ordem.data_conclusao ? `<span><strong>Conclusão:</strong> ${new Date(ordem.data_conclusao).toLocaleDateString('pt-BR')}</span>` : ''}
      </div>
    </div>

    <div class="content">
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

      <div class="section">
        <div class="section-header">Problema Relatado</div>
        <div class="section-content">
          <div class="text-area">${ordem.descricao_problema || ''}</div>
        </div>
      </div>

      ${ordem.diagnostico || ordem.servico_realizado ? `
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

    <div class="footer">
      <p>Documento gerado em ${new Date().toLocaleString('pt-BR')} - ${empresa.nome}</p>
    </div>
  </div>
</body>
</html>
      `

      const blob = new Blob([htmlTemplate], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `OS-${ordem.id?.slice(-6).toUpperCase() || '000001'}.html`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
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
    deleteMutation.mutate(id)
  }

  const handleConcluirOrdem = (id: string) => {
    concluirOrdemMutation.mutate(id)
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
          <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto p-0">
            <DialogHeader className="p-6 pb-2">
              <DialogTitle>
                {isViewing ? 'Visualizar Ordem' : selectedOrdem ? 'Editar Ordem' : 'Nova Ordem'}
              </DialogTitle>
              <DialogDescription>
                {isViewing ? 'Visualize os detalhes da ordem de serviço.' : selectedOrdem ? 'Edite os dados da ordem de serviço.' : 'Crie uma nova ordem de serviço.'}
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 pb-6">
              <OrdemForm 
                ordem={selectedOrdem}
                readOnly={isViewing}
                onSuccess={handleCloseDialog}
              />
            </div>
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
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden sm:table-cell">Dispositivo</TableHead>
                    <TableHead className="hidden md:table-cell">Problema</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Data Abertura</TableHead>
                    <TableHead className="hidden md:table-cell">Valor Total</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
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
                        {((ordem.valor_manutencao || 0) + (ordem.total || 0)) > 0 ? 
                          `R$ ${((ordem.valor_manutencao || 0) + (ordem.total || 0)).toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          {(ordem.status === 'aberta' || ordem.status === 'em_andamento') && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  title="Concluir ordem"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="mx-4">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Concluir Ordem</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja marcar esta ordem como concluída? A data de conclusão será registrada automaticamente.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleConcluirOrdem(ordem.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Concluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDownload(ordem)}
                            className="h-8 w-8"
                            title="Download PDF"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleView(ordem)}
                            className="h-8 w-8"
                            title="Visualizar"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEdit(ordem)}
                            className="h-8 w-8"
                            title="Editar"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                title="Excluir"
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
