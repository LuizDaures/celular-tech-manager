
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FileText, Users, Wrench, Filter, CalendarIcon, Download, DollarSign, Activity, CheckCircle, Clock, XCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

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
  'aberta': 'text-yellow-600 bg-yellow-50 border-yellow-200',
  'em_andamento': 'text-blue-600 bg-blue-50 border-blue-200',
  'concluida': 'text-green-600 bg-green-50 border-green-200',
  'cancelada': 'text-red-600 bg-red-50 border-red-200'
}

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
  const [dateFilter, setDateFilter] = useState<{from?: Date, to?: Date}>({})
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (!supabase) {
      console.log('Cliente Supabase não disponível')
      setLoading(false)
      return
    }
    
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

// Agrupador único para totais
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
    if (!supabase) {
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
      const { data: ordens, error: ordensError } = await supabase
        .from('ordens_servico')
        .select('status, data_abertura, valor, itens:itens_ordem(quantidade, preco_unitario)')

      if (ordensError) throw ordensError

      // Get clients count
      const { count: clientesCount, error: clientesError } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true })

      if (clientesError) throw clientesError

      // Get technicians count
      const { count: tecnicosCount, error: tecnicosError } = await supabase
        .from('tecnicos')
        .select('*', { count: 'exact', head: true })

      if (tecnicosError) throw tecnicosError

      // Get recent orders with client info and items
      const { data: recentOrdersData, error: recentError } = await supabase
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
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${statusColors[status as keyof typeof statusColors] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
        <StatusIcon className="h-3 w-3" />
        {statusLabels[status as keyof typeof statusLabels] || status}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Visão geral da assistência técnica</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadDashboardData} disabled={loading}>
            {loading ? 'Carregando...' : 'Atualizar'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards - Responsivo */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total de Ordens</CardTitle>
            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalOrdens}</div>
            <p className="text-xs text-muted-foreground">
              {stats.ordensHoje} abertas hoje
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Em Andamento</CardTitle>
            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-yellow-100 flex items-center justify-center">
              <Activity className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.ordensAbertas + stats.ordensAndamento}</div>
            <p className="text-xs text-muted-foreground">
              {stats.ordensAbertas} abertas, {stats.ordensAndamento} em progresso
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Concluídas</CardTitle>
            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.ordensConcluidas}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.ordensConcluidas / stats.totalOrdens) * 100 || 0).toFixed(1)}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Faturamento do Mês</CardTitle>
            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-green-100 flex items-center justify-center">
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">R$ {stats.faturamentoMes.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Apenas ordens concluídas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recursos - Grid responsivo */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Cadastrados</CardTitle>
            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalClientes}</div>
            <p className="text-xs text-muted-foreground">Base de clientes ativa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Técnicos Disponíveis</CardTitle>
            <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-orange-100 flex items-center justify-center">
              <Wrench className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.totalTecnicos}</div>
            <p className="text-xs text-muted-foreground">Equipe técnica cadastrada</p>
          </CardContent>
        </Card>
      </div>

     {filteredOrders.length > 0 && (
  (() => {
    const { totalValidas, totalCanceladas } = calculateTotals()

    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              {statusFilter === 'all' ? (
                <>
                  <div className="text-sm font-semibold text-green-700">
                    Ordens Válidas: R$ {totalValidas.toFixed(2)}
                  </div>
                  <div className="text-sm font-semibold text-red-600">
                    Ordens Canceladas: R$ {totalCanceladas.toFixed(2)}
                  </div>
                </>
              ) : (
                <div className="text-sm font-semibold text-primary">
                  Ordens '{statusLabels[statusFilter as keyof typeof statusLabels] || statusFilter}': R$ {(totalValidas + totalCanceladas).toFixed(2)}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {filteredOrders.length} ordem{filteredOrders.length !== 1 ? 's' : ''} filtrada{filteredOrders.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  })()
)}


      {/* Ordens de Serviço - Layout responsivo */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div>
              <CardTitle className="text-lg sm:text-xl">Ordens de Serviço</CardTitle>
              <CardDescription className="text-sm">
                {statusFilter === 'all' && !dateFilter.from && !dateFilter.to
                  ? `Todas as ${recentOrders.length} ordens de serviço` 
                  : `Ordens filtradas - Total: ${filteredOrders.length}`
                }
              </CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
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
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full sm:w-48 justify-start text-left font-normal",
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
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateFilter.from}
                    selected={{from: dateFilter.from, to: dateFilter.to}}
                    onSelect={(range) => setDateFilter({from: range?.from, to: range?.to})}
                    numberOfMonths={1}
                  />
                </PopoverContent>
              </Popover>

              <div className="flex gap-2">
                {(dateFilter.from || dateFilter.to) && (
                  <Button variant="outline" size="sm" onClick={clearDateFilter}>
                    Limpar Data
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={downloadExcel}>
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const itensValue = order.itens?.reduce((total: number, item: any) => 
                total + (item.quantidade * item.preco_unitario), 0) || 0
              const totalValue = (order.valor || 0) + itensValue
              
              return (
                <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3 sm:gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <p className="font-semibold text-sm sm:text-base">{order.clientes?.nome || 'Cliente não encontrado'}</p>
                      {getStatusBadge(order.status)}
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">{order.dispositivo}</p>
                    <p className="text-sm text-muted-foreground">{order.descricao_problema}</p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                      <span>📅 {format(new Date(order.data_abertura), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      <span>👨‍🔧 {order.tecnicos?.nome || 'Não atribuído'}</span>
                      {order.data_conclusao && (
                        <span>✅ Concluída em {format(new Date(order.data_conclusao), 'dd/MM/yyyy', { locale: ptBR })}</span>
                      )}
                    </div>
                  </div>
                  {totalValue > 0 && (
                    <div className="text-right space-y-1">
                      <div className="text-lg font-bold text-green-600">
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
              )
            })}
            {filteredOrders.length === 0 && (
              <div className="text-center py-8 sm:py-12">
                <FileText className="h-8 w-8 sm:h-12 sm:w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-base sm:text-lg font-medium text-muted-foreground">
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
