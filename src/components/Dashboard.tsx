import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { FileText, Users, Wrench, Filter, CalendarIcon, Download, DollarSign, Activity, CheckCircle, Clock, XCircle, Package, Eye, TrendingUp, BarChart3 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'
import { OrdemDetailsModal } from '@/components/OrdemDetailsModal'

const statusLabels = {
  'aberta': 'Aberta',
  'em_andamento': 'Em Andamento',
  'concluida': 'Concluída',
  'cancelada': 'Cancelada'
}

const statusIcons = {
  'aberta': Clock,
  'em_andamento': Activity,
  'concluida': CheckCircle,
  'cancelada': XCircle
}

const statusColors = {
  'aberta': 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800',
  'em_andamento': 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800',
  'concluida': 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800',
  'cancelada': 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800'
}

const ITEMS_PER_PAGE = 10

export function Dashboard() {
  const [stats, setStats] = useState({
    totalOrdens: 0,
    ordensAbertas: 0,
    ordensAndamento: 0,
    ordensConcluidas: 0,
    ordensHoje: 0,
    totalClientes: 0,
    totalTecnicos: 0,
    faturamentoMes: 0
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [filteredOrders, setFilteredOrders] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<{ from?: Date, to?: Date }>({})
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const config = localStorage.getItem('supabase_config')
    if (!config) {
      console.log('Configuração Supabase não encontrada')
      setLoading(false)
      return
    }

    loadDashboardData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [statusFilter, dateFilter, recentOrders])

  useEffect(() => {
    setCurrentPage(1)
  }, [filteredOrders])

  const applyFilters = () => {
    let filtered = [...recentOrders]

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }

    if (dateFilter.from) {
      const fromDate = new Date(dateFilter.from)
      fromDate.setHours(0, 0, 0, 0)

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.data_abertura)
        orderDate.setHours(0, 0, 0, 0)
        return orderDate >= fromDate
      })
    }

    if (dateFilter.to) {
      const toDate = new Date(dateFilter.to)
      toDate.setHours(23, 59, 59, 999)

      filtered = filtered.filter(order => {
        const orderDate = new Date(order.data_abertura)
        return orderDate <= toDate
      })
    }

    setFilteredOrders(filtered)
  }

  const clearDateFilter = () => {
    setDateFilter({})
  }

  const calculateTotals = () => {
    return filteredOrders.reduce(
      (totals, order) => {
        const orderValue = order.valor || 0
        const itensValue = order.itens?.reduce((itemTotal: number, item: any) =>
          itemTotal + (item.quantidade * item.preco_unitario), 0) || 0
        const totalOrder = orderValue + itensValue

        if (order.status === 'cancelada') {
          totals.totalCanceladas += totalOrder
        } else {
          totals.totalValidas += totalOrder
        }

        return totals
      },
      { totalValidas: 0, totalCanceladas: 0 }
    )
  }

  const downloadMetrics = async () => {
    try {
      const client = await getSupabaseClient()
      if (!client) throw new Error('Cliente Supabase não disponível')

      // Buscar todas as métricas do sistema
      const { data: allOrders, error: ordersError } = await client
        .from('ordens_servico')
        .select('*, itens:itens_ordem(*)')

      if (ordersError) throw ordersError

      const { data: allPecas, error: pecasError } = await client
        .from('pecas_manutencao')
        .select('*')

      if (pecasError) throw pecasError

      const { data: allItensOrdem, error: itensError } = await client
        .from('itens_ordem')
        .select('*')

      if (itensError) throw itensError

      // Calcular métricas completas
      const totalFaturamento = allOrders?.reduce((total, ordem) => {
        if (ordem.status === 'concluida') {
          const valorOrdem = ordem.valor || 0
          const valorItens = ordem.itens?.reduce((sum: number, item: any) =>
            sum + (item.quantidade * item.preco_unitario), 0) || 0
          return total + valorOrdem + valorItens
        }
        return total
      }, 0) || 0

      const pecasUtilizadas = allItensOrdem?.reduce((total, item) => total + item.quantidade, 0) || 0
      const pecasEmEstoque = allPecas?.reduce((total, peca) => total + peca.estoque, 0) || 0
      const valorEstoque = allPecas?.reduce((total, peca) => total + (peca.estoque * peca.preco_unitario), 0) || 0

      const metricsData = [
        {
          'Métrica': 'Total de Ordens de Serviço',
          'Valor': stats.totalOrdens,
          'Observação': 'Todas as ordens cadastradas no sistema'
        },
        {
          'Métrica': 'Clientes Cadastrados',
          'Valor': stats.totalClientes,
          'Observação': 'Total de clientes na base'
        },
        {
          'Métrica': 'Técnicos Cadastrados',
          'Valor': stats.totalTecnicos,
          'Observação': 'Total de técnicos disponíveis'
        },
        {
          'Métrica': 'Ordens Abertas',
          'Valor': stats.ordensAbertas,
          'Observação': 'Ordens aguardando atendimento'
        },
        {
          'Métrica': 'Ordens Em Andamento',
          'Valor': stats.ordensAndamento,
          'Observação': 'Ordens sendo executadas'
        },
        {
          'Métrica': 'Ordens Concluídas',
          'Valor': stats.ordensConcluidas,
          'Observação': 'Ordens finalizadas com sucesso'
        },
        {
          'Métrica': 'Peças Utilizadas (Total)',
          'Valor': pecasUtilizadas,
          'Observação': 'Quantidade total de peças utilizadas em ordens'
        },
        {
          'Métrica': 'Peças em Estoque',
          'Valor': pecasEmEstoque,
          'Observação': 'Quantidade total de peças disponíveis'
        },
        {
          'Métrica': 'Valor Total em Estoque',
          'Valor': `R$ ${valorEstoque.toFixed(2)}`,
          'Observação': 'Valor monetário do estoque atual'
        },
        {
          'Métrica': 'Faturamento Total (Ordens Concluídas)',
          'Valor': `R$ ${totalFaturamento.toFixed(2)}`,
          'Observação': 'Receita total de ordens concluídas'
        },
        {
          'Métrica': 'Faturamento do Mês Atual',
          'Valor': `R$ ${stats.faturamentoMes.toFixed(2)}`,
          'Observação': 'Receita do mês atual'
        }
      ]

      const ws = XLSX.utils.json_to_sheet(metricsData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Métricas do Sistema')

      const fileName = `metricas_sistema_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast({
        title: 'Métricas exportadas',
        description: `Arquivo ${fileName} baixado com sucesso`,
      })
    } catch (error) {
      console.error('Erro ao exportar métricas:', error)
      toast({
        title: 'Erro',
        description: 'Erro ao exportar métricas do sistema',
        variant: 'destructive',
      })
    }
  }

  const downloadExcel = () => {
    if (filteredOrders.length === 0) {
      toast({
        title: 'Nenhum dado para exportar',
        description: 'Não há ordens para exportar com os filtros aplicados.',
        variant: 'destructive',
      })
      return
    }

    const excelData = filteredOrders.map(order => {
      const itensValue = order.itens?.reduce((total: number, item: any) =>
        total + (item.quantidade * item.preco_unitario), 0) || 0

      return {
        'ID': order.id,
        'Cliente': order.clientes?.nome || 'N/A',
        'Técnico': order.tecnicos?.nome || 'Não atribuído',
        'Dispositivo': order.dispositivo,
        'Problema': order.descricao_problema,
        'Status': statusLabels[order.status as keyof typeof statusLabels],
        'Data Abertura': format(new Date(order.data_abertura), 'dd/MM/yyyy', { locale: ptBR }),
        'Valor Manutenção': order.valor || 0,
        'Valor Peças': itensValue,
        'Total': (order.valor || 0) + itensValue,
        'Data Conclusão': order.data_conclusao ?
          format(new Date(order.data_conclusao), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'
      }
    })

    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Ordens de Serviço')

    const fileName = `ordens_servico_${format(new Date(), 'yyyy-MM-dd')}.xlsx`
    XLSX.writeFile(wb, fileName)

    toast({
      title: 'Arquivo baixado',
      description: `${filteredOrders.length} ordens exportadas para ${fileName}`,
    })
  }

  const loadDashboardData = async () => {
    const client = await getSupabaseClient()
    if (!client) {
      toast({
        title: 'Erro',
        description: 'Conexão com banco de dados não estabelecida.',
        variant: 'destructive',
      })
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log('Carregando dados do dashboard...')

      // Get orders statistics
      const { data: ordens, error: ordensError } = await client
        .from('ordens_servico')
        .select('status, data_abertura, valor, itens:itens_ordem(quantidade, preco_unitario)')

      if (ordensError) throw ordensError

      // Get clients count
      const { count: clientesCount, error: clientesError } = await client
        .from('clientes')
        .select('*', { count: 'exact', head: true })

      if (clientesError) throw clientesError

      // Get technicians count
      const { count: tecnicosCount, error: tecnicosError } = await client
        .from('tecnicos')
        .select('*', { count: 'exact', head: true })

      if (tecnicosError) throw tecnicosError

      // Get recent orders with client info and items
      const { data: recentOrdersData, error: recentError } = await client
        .from('ordens_servico')
        .select(`
          *,
          clientes:cliente_id (nome),
          tecnicos:tecnico_id (nome),
          itens:itens_ordem (quantidade, preco_unitario, nome_item)
        `)
        .order('data_abertura', { ascending: false })

      if (recentError) throw recentError

      // Calculate statistics
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const ordensHoje = ordens?.filter(o => {
        const dataOrdem = new Date(o.data_abertura)
        dataOrdem.setHours(0, 0, 0, 0)
        return dataOrdem.getTime() === hoje.getTime()
      }).length || 0

      const mesAtual = new Date().getMonth()
      const anoAtual = new Date().getFullYear()

      const faturamentoMes = ordens?.filter(o => {
        const dataOrdem = new Date(o.data_abertura)
        return dataOrdem.getMonth() === mesAtual &&
          dataOrdem.getFullYear() === anoAtual &&
          o.status === 'concluida'
      }).reduce((total, ordem) => {
        const valorOrdem = ordem.valor || 0
        const valorItens = ordem.itens?.reduce((sum: number, item: any) =>
          sum + (item.quantidade * item.preco_unitario), 0) || 0
        return total + valorOrdem + valorItens
      }, 0) || 0

      const statsData = {
        totalOrdens: ordens?.length || 0,
        ordensAbertas: ordens?.filter(o => o.status === 'aberta').length || 0,
        ordensAndamento: ordens?.filter(o => o.status === 'em_andamento').length || 0,
        ordensConcluidas: ordens?.filter(o => o.status === 'concluida').length || 0,
        ordensHoje,
        totalClientes: clientesCount || 0,
        totalTecnicos: tecnicosCount || 0,
        faturamentoMes
      }

      setStats(statsData)
      setRecentOrders(recentOrdersData || [])
      setFilteredOrders(recentOrdersData || [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os dados do dashboard.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const StatusIcon = statusIcons[status as keyof typeof statusIcons] || Activity

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusColors[status as keyof typeof statusColors] || 'text-muted-foreground bg-muted border-border'}`}>
        <StatusIcon className="h-3 w-3" />
        {statusLabels[status as keyof typeof statusLabels] || status}
      </div>
    )
  }

  const viewOrderDetails = (order: any) => {
    setSelectedOrder(order)
    setIsDetailsModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8 bg-background">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 border border-border">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-2 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Visão geral completa da assistência técnica
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={loadDashboardData} disabled={loading}>
              {loading ? 'Carregando...' : 'Atualizar'}
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden shadow-sm border-l-4 border-l-blue-500 hover:shadow-md transition-shadow bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Ordens</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalOrdens}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <TrendingUp className="h-3 w-3" />
              {stats.ordensHoje} abertas hoje
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden shadow-sm border-l-4 border-l-yellow-500 hover:shadow-md transition-shadow bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Andamento</CardTitle>
            <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
              <Activity className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.ordensAbertas + stats.ordensAndamento}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.ordensAbertas} abertas • {stats.ordensAndamento} em progresso
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden shadow-sm border-l-4 border-l-green-500 hover:shadow-md transition-shadow bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídas</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.ordensConcluidas}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {((stats.ordensConcluidas / stats.totalOrdens) * 100 || 0).toFixed(1)}% do total
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden shadow-sm border-l-4 border-l-emerald-500 hover:shadow-md transition-shadow bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Faturamento Mensal</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R$ {stats.faturamentoMes.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Apenas ordens concluídas
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recursos Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2">
        <Card className="shadow-sm hover:shadow-md transition-shadow bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Clientes Cadastrados</CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalClientes}</div>
            <p className="text-xs text-muted-foreground mt-1">Base de clientes ativa</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Técnicos Disponíveis</CardTitle>
            <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
              <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalTecnicos}</div>
            <p className="text-xs text-muted-foreground mt-1">Equipe técnica cadastrada</p>
          </CardContent>
        </Card>
      </div>

      {/* Ordens de Serviço Card */}
      <Card className="shadow-sm bg-card border-border">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-muted/25 border-b border-border">
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="text-xl font-semibold text-foreground">Ordens de Serviço</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {statusFilter === 'all' && !dateFilter.from && !dateFilter.to
                  ? `Todas as ${recentOrders.length} ordens de serviço`
                  : `Ordens filtradas - Total: ${filteredOrders.length}`
                }
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40 bg-background border-border">
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

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-48 justify-start text-left font-normal bg-background border-border",
                      !dateFilter.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFilter.from ? (
                      dateFilter.to ? (
                        <>
                          {format(dateFilter.from, "dd/MM", { locale: ptBR })} -{" "}
                          {format(dateFilter.to, "dd/MM", { locale: ptBR })}
                        </>
                      ) : (
                        format(dateFilter.from, "dd/MM/yyyy", { locale: ptBR })
                      )
                    ) : (
                      <span>Filtrar por data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background border-border" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateFilter.from}
                    selected={{ from: dateFilter.from, to: dateFilter.to }}
                    onSelect={(range) => setDateFilter({ from: range?.from, to: range?.to })}
                    numberOfMonths={1}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <div className="flex gap-2 flex-wrap">
                {(dateFilter.from || dateFilter.to) && (
                  <Button variant="outline" size="sm" onClick={clearDateFilter}>
                    Limpar Data
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={downloadExcel}>
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </Button>

                <Button variant="outline" size="sm" onClick={downloadMetrics}>
                  <Package className="h-4 w-4 mr-2" />
                  Métricas
                </Button>
              </div>
            </div>

            {/* Summary totals */}
            {filteredOrders.length > 0 && (
              (() => {
                const { totalValidas, totalCanceladas } = calculateTotals()
                return (
                  <div className="bg-background rounded-lg border border-border p-4">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-sm">
                          <span className="font-medium text-green-700 dark:text-green-400">Válidas:</span>
                          <span className="font-bold text-green-700 dark:text-green-400 ml-2">R$ {totalValidas.toFixed(2)}</span>
                        </div>
                        {statusFilter === 'all' && (
                          <div className="text-sm">
                            <span className="font-medium text-red-600 dark:text-red-400">Canceladas:</span>
                            <span className="font-bold text-red-600 dark:text-red-400 ml-2">R$ {totalCanceladas.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Exibindo {paginatedOrders.length} de {filteredOrders.length} ordens
                      </div>
                    </div>
                  </div>
                )
              })()
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
        <div className="divide-y divide-border">
            {paginatedOrders.map((order) => {
              const itensValue = order.itens?.reduce((total: number, item: any) =>
                total + (item.quantidade * item.preco_unitario), 0) || 0
              const totalValue = (order.valor || 0) + itensValue

              return (
                <div key={order.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <p className="font-semibold text-base text-foreground">{order.clientes?.nome || 'Cliente não encontrado'}</p>
                        {getStatusBadge(order.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewOrderDetails(order)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Ver Detalhes
                        </Button>
                      </div>
                      <p className="text-sm font-medium text-foreground">{order.dispositivo}</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">{order.descricao_problema}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          📅 {format(new Date(order.data_abertura), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                        <span className="flex items-center gap-1">
                          👨‍🔧 {order.tecnicos?.nome || 'Não atribuído'}
                        </span>
                        {order.data_conclusao && (
                          <span className="flex items-center gap-1">
                            ✅ Concluída em {format(new Date(order.data_conclusao), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">

                      {totalValue > 0 && (
                        <div className="text-right">
                          <div className="text-base font-bold text-green-600 dark:text-green-400">
                            R$ {totalValue.toFixed(2)}
                          </div>
                          {(order.valor || 0) > 0 && itensValue > 0 && (
                            <div className="text-xs text-muted-foreground">
                              Serviço: R$ {(order.valor || 0).toFixed(2)} + Peças: R$ {itensValue.toFixed(2)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-border bg-muted/25">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber = Math.max(1, Math.min(currentPage - 2 + i, totalPages - 4 + i))
                    if (pageNumber > totalPages) return null

                    return (
                      <PaginationItem key={pageNumber}>
                        <PaginationLink
                          onClick={() => setCurrentPage(pageNumber)}
                          isActive={currentPage === pageNumber}
                          className="cursor-pointer"
                        >
                          {pageNumber}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                {statusFilter === 'all' && !dateFilter.from && !dateFilter.to
                  ? 'Nenhuma ordem de serviço encontrada'
                  : 'Nenhuma ordem encontrada com os filtros aplicados'
                }
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {statusFilter !== 'all' || dateFilter.from || dateFilter.to
                  ? 'Tente ajustar os filtros para ver mais resultados'
                  : 'Crie sua primeira ordem de serviço para começar'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <OrdemDetailsModal
        ordem={selectedOrder}
        open={isDetailsModalOpen}
        onOpenChange={setIsDetailsModalOpen}
      />
    </div>
  )
}
