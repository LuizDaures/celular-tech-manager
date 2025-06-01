
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FileText, Users, Wrench, TrendingUp, Filter, CalendarIcon, Download, DollarSign } from 'lucide-react'
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

export function Dashboard() {
  const [stats, setStats] = useState({
    totalOrdens: 0,
    ordensAbertas: 0,
    ordensAndamento: 0,
    ordensConcluidas: 0,
    totalClientes: 0,
    totalTecnicos: 0,
  })
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [filteredOrders, setFilteredOrders] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<{from?: Date, to?: Date}>({})
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    if (!supabase) {
      console.log('Cliente Supabase não disponível, não carregando dados do dashboard')
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
    
    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter)
    }
    
    // Filtro por data
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

  const calculateTotalValue = () => {
    return filteredOrders.reduce((total, order) => {
      const orderValue = order.valor || 0
      const itensValue = order.itens?.reduce((itemTotal: number, item: any) => 
        itemTotal + (item.quantidade * item.preco_unitario), 0) || 0
      return total + orderValue + itensValue
    }, 0)
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
        .select('status')

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
      const statsData = {
        totalOrdens: ordens?.length || 0,
        ordensAbertas: ordens?.filter(o => o.status === 'aberta').length || 0,
        ordensAndamento: ordens?.filter(o => o.status === 'em_andamento').length || 0,
        ordensConcluidas: ordens?.filter(o => o.status === 'concluida').length || 0,
        totalClientes: clientesCount || 0,
        totalTecnicos: tecnicosCount || 0,
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
    const variants = {
      aberta: 'destructive',
      em_andamento: 'default',
      concluida: 'default',
      cancelada: 'secondary',
    } as const

    const labels = {
      aberta: 'Aberta',
      em_andamento: 'Em Andamento',
      concluida: 'Concluída',
      cancelada: 'Cancelada',
    }

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral da assistência técnica</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ordens</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrdens}</div>
            <p className="text-xs text-muted-foreground">Todas as ordens de serviço</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordens Abertas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ordensAbertas}</div>
            <p className="text-xs text-muted-foreground">Aguardando atendimento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClientes}</div>
            <p className="text-xs text-muted-foreground">Clientes cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Técnicos</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTecnicos}</div>
            <p className="text-xs text-muted-foreground">Técnicos disponíveis</p>
          </CardContent>
        </Card>
      </div>

      {/* Valor Total das Ordens Filtradas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Valor Total das Ordens Filtradas</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">R$ {calculateTotalValue().toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">
            Total de {filteredOrders.length} ordem{filteredOrders.length !== 1 ? 's' : ''} selecionada{filteredOrders.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Ordens de Serviço</CardTitle>
          <CardDescription>
            {statusFilter === 'all' && !dateFilter.from && !dateFilter.to
              ? `Todas as ${recentOrders.length} ordens de serviço` 
              : `Ordens filtradas - Total: ${filteredOrders.length}`
            }
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2">
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
            
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-40 justify-start text-left font-normal",
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
                    <span>Data inicial</span>
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
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {(dateFilter.from || dateFilter.to) && (
              <Button variant="outline" size="sm" onClick={clearDateFilter}>
                Limpar Data
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={downloadExcel}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const itensValue = order.itens?.reduce((total: number, item: any) => 
                total + (item.quantidade * item.preco_unitario), 0) || 0
              const totalValue = (order.valor || 0) + itensValue
              
              return (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{order.clientes?.nome}</p>
                    <p className="text-sm text-muted-foreground">{order.descricao_problema}</p>
                    <p className="text-xs text-muted-foreground">
                      Técnico: {order.tecnicos?.nome || 'Não atribuído'}
                    </p>
                    {totalValue > 0 && (
                      <p className="text-xs text-green-600 font-medium">
                        Valor: R$ {totalValue.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-2">
                    {getStatusBadge(order.status)}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(order.data_abertura), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                </div>
              )
            })}
            {filteredOrders.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                {statusFilter === 'all' && !dateFilter.from && !dateFilter.to
                  ? 'Nenhuma ordem de serviço encontrada' 
                  : 'Nenhuma ordem encontrada com os filtros aplicados'
                }
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
