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

      // Template HTML completamente novo e melhorado
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
      margin: 1.5cm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body { 
      font-family: 'Arial', sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #333;
      background: #fff;
    }
    
    .container {
      max-width: 100%;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      margin-bottom: 25px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 15px;
    }
    
    .header h1 {
      font-size: 18px;
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
      margin-top: 15px;
    }
    
    .company-info {
      text-align: left;
    }
    
    .company-info h2 {
      font-size: 14px;
      color: #1f2937;
      margin-bottom: 4px;
    }
    
    .ordem-info {
      text-align: right;
      background: #f3f4f6;
      padding: 10px 15px;
      border-radius: 8px;
      border-left: 4px solid #2563eb;
    }
    
    .ordem-info .numero {
      font-size: 16px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 4px;
    }
    
    .section {
      margin-bottom: 20px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
    }
    
    .section-header {
      background: linear-gradient(135deg, #2563eb, #3b82f6);
      color: white;
      padding: 10px 15px;
      font-weight: bold;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .section-content {
      padding: 15px;
    }
    
    .row {
      display: flex;
      margin-bottom: 12px;
      gap: 20px;
    }
    
    .row:last-child {
      margin-bottom: 0;
    }
    
    .col {
      flex: 1;
    }
    
    .col-2 {
      flex: 2;
    }
    
    .col-3 {
      flex: 3;
    }
    
    .field {
      margin-bottom: 8px;
    }
    
    .label {
      font-weight: bold;
      color: #374151;
      margin-bottom: 3px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    
    .value {
      border-bottom: 1px solid #d1d5db;
      min-height: 18px;
      padding: 3px 0;
      color: #1f2937;
      font-size: 11px;
    }
    
    .text-area {
      min-height: 80px;
      border: 1px solid #d1d5db;
      padding: 10px;
      border-radius: 4px;
      background: #f9fafb;
      white-space: pre-wrap;
      color: #1f2937;
    }
    
    .status-badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-aberta { background: #dbeafe; color: #1d4ed8; }
    .status-em_andamento { background: #fef3c7; color: #d97706; }
    .status-concluida { background: #d1fae5; color: #059669; }
    .status-cancelada { background: #fee2e2; color: #dc2626; }
    
    .pecas-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    .pecas-table th,
    .pecas-table td {
      border: 1px solid #d1d5db;
      padding: 8px;
      text-align: left;
      font-size: 10px;
    }
    
    .pecas-table th {
      background: #f3f4f6;
      font-weight: bold;
      color: #374151;
    }
    
    .pecas-table .text-right {
      text-align: right;
    }
    
    .totals {
      background: #f8fafc;
      border-radius: 8px;
      padding: 15px;
      margin-top: 15px;
    }
    
    .totals-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      padding: 4px 0;
    }
    
    .totals-row:last-child {
      margin-bottom: 0;
      border-top: 2px solid #2563eb;
      padding-top: 8px;
      font-weight: bold;
      font-size: 12px;
      color: #2563eb;
    }
    
    .signatures {
      margin-top: 40px;
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
      height: 50px;
      margin-bottom: 8px;
    }
    
    .signature-label {
      font-size: 10px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 9px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      padding-top: 15px;
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
    <!-- Cabeçalho -->
    <div class="header">
      <h1>Ordem de Serviço</h1>
      <div class="header-info">
        <div class="company-info">
          <h2>${empresa.nome}</h2>
          ${empresa.cnpj ? `<div>CNPJ: ${empresa.cnpj}</div>` : ''}
        </div>
        <div class="ordem-info">
          <div class="numero">Nº ${ordem.id?.slice(-6).toUpperCase() || '000001'}</div>
          <div>Data: ${new Date(ordem.data_abertura).toLocaleDateString('pt-BR')}</div>
          <div class="status-badge status-${ordem.status}">${statusLabels[ordem.status]}</div>
        </div>
      </div>
    </div>

    <!-- Dados do Cliente -->
    <div class="section">
      <div class="section-header">Dados do Cliente</div>
      <div class="section-content">
        <div class="row">
          <div class="col-2">
            <div class="field">
              <div class="label">Nome Completo</div>
              <div class="value">${ordem.cliente?.nome || ''}</div>
            </div>
          </div>
          <div class="col">
            <div class="field">
              <div class="label">CPF/CNPJ</div>
              <div class="value">${ordem.cliente?.cpf || ''}</div>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <div class="field">
              <div class="label">Telefone</div>
              <div class="value">${ordem.cliente?.telefone || ''}</div>
            </div>
          </div>
          <div class="col-2">
            <div class="field">
              <div class="label">E-mail</div>
              <div class="value">${ordem.cliente?.email || ''}</div>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col">
            <div class="field">
              <div class="label">Endereço Completo</div>
              <div class="value">${ordem.cliente?.endereco || ''}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Informações do Equipamento -->
    <div class="section">
      <div class="section-header">Informações do Equipamento</div>
      <div class="section-content">
        <div class="row">
          <div class="col">
            <div class="field">
              <div class="label">Dispositivo/Modelo</div>
              <div class="value">${ordem.dispositivo || ''}</div>
            </div>
          </div>
          ${ordem.tecnico ? `
          <div class="col">
            <div class="field">
              <div class="label">Técnico Responsável</div>
              <div class="value">${ordem.tecnico.nome}</div>
            </div>
          </div>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Descrição do Problema -->
    <div class="section">
      <div class="section-header">Descrição do Problema Relatado</div>
      <div class="section-content">
        <div class="text-area">${ordem.descricao_problema || ''}</div>
      </div>
    </div>

    <!-- Diagnóstico Técnico -->
    ${ordem.diagnostico ? `
    <div class="section">
      <div class="section-header">Diagnóstico Técnico</div>
      <div class="section-content">
        <div class="text-area">${ordem.diagnostico}</div>
      </div>
    </div>
    ` : ''}

    <!-- Serviços Realizados -->
    ${ordem.servico_realizado ? `
    <div class="section">
      <div class="section-header">Serviços Realizados</div>
      <div class="section-content">
        <div class="text-area">${ordem.servico_realizado}</div>
      </div>
    </div>
    ` : ''}

    <!-- Peças Utilizadas -->
    ${ordem.itens && ordem.itens.length > 0 ? `
    <div class="section">
      <div class="section-header">Peças e Componentes Utilizados</div>
      <div class="section-content">
        <table class="pecas-table">
          <thead>
            <tr>
              <th>Descrição</th>
              <th class="text-right">Qtd</th>
              <th class="text-right">Valor Unit.</th>
              <th class="text-right">Total</th>
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

    <!-- Informações Adicionais -->
    <div class="section">
      <div class="section-header">Informações Adicionais</div>
      <div class="section-content">
        <div class="row">
          <div class="col">
            <div class="field">
              <div class="label">Data de Abertura</div>
              <div class="value">${new Date(ordem.data_abertura).toLocaleDateString('pt-BR')}</div>
            </div>
          </div>
          ${ordem.data_conclusao ? `
          <div class="col">
            <div class="field">
              <div class="label">Data de Conclusão</div>
              <div class="value">${new Date(ordem.data_conclusao).toLocaleDateString('pt-BR')}</div>
            </div>
          </div>
          ` : ''}
          <div class="col">
            <div class="field">
              <div class="label">Status</div>
              <div class="value">
                <span class="status-badge status-${ordem.status}">${statusLabels[ordem.status]}</span>
              </div>
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
      <p>Este documento foi gerado automaticamente pelo sistema ${empresa.nome} em ${new Date().toLocaleString('pt-BR')}</p>
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
      link.download = `ordem-servico-${ordem.id?.slice(-6).toUpperCase()}-${new Date().toISOString().slice(0, 10)}.html`
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
