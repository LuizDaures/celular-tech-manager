
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

      // Template HTML melhorado com layout profissional e assinaturas
      const htmlTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Ordem de Serviço</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 21cm;
      margin: 0 auto;
      padding: 2cm;
      background: #fff;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #e0e0e0;
    }
    
    .logo-section {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .logo-section img {
      max-height: 80px;
      border-radius: 8px;
    }
    
    .logo-placeholder {
      width: 80px;
      height: 80px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 24px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    
    .empresa-info {
      text-align: center;
      font-size: 11px;
      color: #666;
      line-height: 1.4;
    }
    
    .title-section {
      text-align: center;
      flex: 1;
      margin: 0 20px;
    }
    
    .title-section h1 {
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    
    .title-section h2 {
      font-size: 18px;
      font-weight: 400;
      color: #7f8c8d;
      margin-bottom: 10px;
    }
    
    .ordem-info {
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      color: #495057;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .section {
      margin-bottom: 25px;
      overflow: hidden;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    }
    
    .section-header {
      background: linear-gradient(135deg, #495057 0%, #6c757d 100%);
      color: white;
      padding: 12px 20px;
      font-weight: 600;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .section-content {
      background: #fff;
      border: 1px solid #dee2e6;
      border-top: none;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    
    .info-item {
      padding: 15px 20px;
      border-bottom: 1px solid #f8f9fa;
      border-right: 1px solid #f8f9fa;
    }
    
    .info-item:nth-child(even) {
      border-right: none;
      background: #f8f9fa;
    }
    
    .info-item:last-child,
    .info-item:nth-last-child(2) {
      border-bottom: none;
    }
    
    .info-label {
      font-weight: 600;
      color: #495057;
      display: block;
      margin-bottom: 5px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-value {
      color: #2c3e50;
      font-size: 14px;
      word-wrap: break-word;
    }
    
    .full-width {
      grid-column: span 2;
      border-right: none !important;
      background: #fff !important;
    }
    
    .text-content {
      padding: 20px;
      min-height: 80px;
      line-height: 1.8;
    }
    
    .text-content em {
      color: #6c757d;
      font-style: normal;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.5px;
    }
    
    .pecas-list {
      padding: 20px;
    }
    
    .pecas-list ul {
      list-style: none;
      margin-top: 15px;
    }
    
    .pecas-list li {
      padding: 8px 0;
      border-bottom: 1px solid #f1f3f4;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .pecas-list li:last-child {
      border-bottom: none;
    }
    
    .peca-item {
      display: flex;
      justify-content: space-between;
      width: 100%;
    }
    
    .peca-nome {
      font-weight: 500;
      color: #2c3e50;
    }
    
    .peca-detalhes {
      color: #6c757d;
      font-size: 12px;
    }
    
    .footer-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e9ecef;
    }
    
    .footer-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 40px;
      font-size: 13px;
    }
    
    .footer-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f8f9fa;
    }
    
    .footer-item strong {
      color: #495057;
    }
    
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 60px;
    }
    
    .signature-box {
      text-align: center;
      padding: 20px;
      border: 2px solid #e9ecef;
      border-radius: 8px;
      background: #f8f9fa;
    }
    
    .signature-line {
      height: 60px;
      border-bottom: 2px solid #495057;
      margin-bottom: 15px;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 5px;
      color: #adb5bd;
      font-style: italic;
      font-size: 12px;
    }
    
    .signature-label {
      font-weight: 600;
      color: #495057;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 12px;
    }
    
    .total-destaque {
      background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
      color: white;
      font-weight: bold;
      font-size: 16px;
      padding: 15px 20px;
      border-radius: 8px;
      text-align: center;
      margin-top: 20px;
      box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
    }
    
    @media print {
      body {
        padding: 1cm;
      }
      
      .section {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo-section">
      ${empresa.logo_base64 ? 
        `<img src="data:image/png;base64,${empresa.logo_base64}" alt="Logo da Empresa">` : 
        `<div class="logo-placeholder">🔧</div>`
      }
      <div class="empresa-info">
        ${empresa.nome}<br>
        ${empresa.cnpj ? `CNPJ: ${empresa.cnpj}` : 'Dados da empresa'}
      </div>
    </div>
    
    <div class="title-section">
      <h1>Ordem de Serviço</h1>
      <h2>Assistência Técnica Especializada</h2>
      <div class="ordem-info">
        Nº ${ordem.id?.slice(-6).toUpperCase() || '000001'} | ${new Date(ordem.data_abertura).toLocaleDateString('pt-BR')}
      </div>
    </div>
    
    <div class="logo-section">
      <div class="empresa-info">
        Atendimento<br>
        Personalizado
      </div>
      <div class="logo-placeholder">📱</div>
    </div>
  </div>

  <!-- Seção Cliente -->
  <div class="section">
    <div class="section-header">📋 Informações do Cliente</div>
    <div class="section-content">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Nome Completo</span>
          <div class="info-value">${ordem.cliente?.nome || 'Não informado'}</div>
        </div>
        <div class="info-item">
          <span class="info-label">Telefone</span>
          <div class="info-value">${ordem.cliente?.telefone || 'Não informado'}</div>
        </div>
        <div class="info-item">
          <span class="info-label">E-mail</span>
          <div class="info-value">${ordem.cliente?.email || 'Não informado'}</div>
        </div>
        <div class="info-item">
          <span class="info-label">Documento</span>
          <div class="info-value">${ordem.cliente?.cpf || 'Não informado'}</div>
        </div>
        <div class="info-item full-width">
          <span class="info-label">Endereço</span>
          <div class="info-value">${ordem.cliente?.endereco || 'Não informado'}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Seção Equipamento -->
  <div class="section">
    <div class="section-header">📱 Equipamento</div>
    <div class="section-content">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Dispositivo</span>
          <div class="info-value">${ordem.dispositivo || 'Não especificado'}</div>
        </div>
        <div class="info-item">
          <span class="info-label">Status do Serviço</span>
          <div class="info-value">${statusLabels[ordem.status]}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Seção Diagnóstico -->
  <div class="section">
    <div class="section-header">🔍 Diagnóstico e Problema Relatado</div>
    <div class="section-content">
      <div class="text-content">
        <em>Problema Relatado pelo Cliente</em><br><br>
        ${ordem.descricao_problema}
        ${ordem.diagnostico ? `<br><br><em>Diagnóstico Técnico</em><br><br>${ordem.diagnostico}` : ''}
      </div>
    </div>
  </div>

  <!-- Seção Solução -->
  ${ordem.servico_realizado ? `
  <div class="section">
    <div class="section-header">🔧 Serviço Realizado</div>
    <div class="section-content">
      <div class="text-content">
        <em>Solução Aplicada</em><br><br>
        ${ordem.servico_realizado}
      </div>
    </div>
  </div>
  ` : ''}

  <!-- Seção Peças -->
  ${ordem.itens && ordem.itens.length > 0 ? `
  <div class="section">
    <div class="section-header">🔩 Peças e Componentes Utilizados</div>
    <div class="section-content">
      <div class="pecas-list">
        <em>Relação de Peças Substituídas</em>
        <ul>
          ${ordem.itens.map(item => `
            <li>
              <div class="peca-item">
                <div>
                  <div class="peca-nome">${item.nome_item}</div>
                  <div class="peca-detalhes">Qtd: ${item.quantidade} | Valor unit.: R$ ${item.preco_unitario.toFixed(2).replace('.', ',')}</div>
                </div>
                <div style="font-weight: 600; color: #28a745;">
                  R$ ${(item.quantidade * item.preco_unitario).toFixed(2).replace('.', ',')}
                </div>
              </div>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  </div>
  ` : ''}

  <!-- Seção Financeiro -->
  <div class="section">
    <div class="section-header">💰 Resumo Financeiro</div>
    <div class="section-content">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Valor da Mão de Obra</span>
          <div class="info-value">R$ ${(ordem.valor_manutencao || ordem.valor || 0).toFixed(2).replace('.', ',')}</div>
        </div>
        <div class="info-item">
          <span class="info-label">Valor das Peças</span>
          <div class="info-value">R$ ${(ordem.total_ordem || ordem.total || 0).toFixed(2).replace('.', ',')}</div>
        </div>
      </div>
      <div class="total-destaque">
        VALOR TOTAL DO SERVIÇO: R$ ${((ordem.valor_manutencao || ordem.valor || 0) + (ordem.total_ordem || ordem.total || 0)).toFixed(2).replace('.', ',')}
      </div>
    </div>
  </div>

  <!-- Rodapé e Assinaturas -->
  <div class="footer-section">
    <div class="footer-info">
      <div>
        <div class="footer-item">
          <strong>Data de Abertura:</strong>
          <span>${new Date(ordem.data_abertura).toLocaleDateString('pt-BR')} às ${new Date(ordem.data_abertura).toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}h</span>
        </div>
        <div class="footer-item">
          <strong>Previsão de Entrega:</strong>
          <span>${ordem.data_conclusao ? new Date(ordem.data_conclusao).toLocaleDateString('pt-BR') : 'A definir'}</span>
        </div>
      </div>
      <div>
        <div class="footer-item">
          <strong>Técnico Responsável:</strong>
          <span>${ordem.tecnico?.nome || 'A designar'}</span>
        </div>
        <div class="footer-item">
          <strong>Contato para Dúvidas:</strong>
          <span>${ordem.cliente?.telefone || '(xx) xxxx-xxxx'}</span>
        </div>
      </div>
    </div>

    <div class="signatures">
      <div class="signature-box">
        <div class="signature-line">Assinatura do Cliente</div>
        <div class="signature-label">
          ${ordem.cliente?.nome || 'Cliente'}<br>
          Data: ___/___/_____
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-line">Assinatura do Técnico</div>
        <div class="signature-label">
          ${ordem.tecnico?.nome || 'Técnico Responsável'}<br>
          Data: ___/___/_____
        </div>
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
