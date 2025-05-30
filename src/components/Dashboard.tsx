
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Users, Wrench, TrendingUp, Filter } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

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
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadDashboardData()
  }, [])

  useEffect(() => {
    if (statusFilter === 'all') {
      setFilteredOrders(recentOrders)
    } else {
      setFilteredOrders(recentOrders.filter(order => order.status === statusFilter))
    }
  }, [statusFilter, recentOrders])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

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

      // Get recent orders with client info
      const { data: recentOrdersData, error: recentError } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          clientes:cliente_id (nome),
          tecnicos:tecnico_id (nome)
        `)
        .order('data_abertura', { ascending: false })
        .limit(10)

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

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Ordens Recentes</CardTitle>
          <CardDescription>
            {statusFilter === 'all' 
              ? `Últimas ${recentOrders.length} ordens de serviço criadas` 
              : `Ordens com status "${statusLabels[statusFilter as keyof typeof statusLabels]}" - Total: ${filteredOrders.length}`
            }
          </CardDescription>
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
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">{order.clientes?.nome}</p>
                  <p className="text-sm text-muted-foreground">{order.descricao_problema}</p>
                  <p className="text-xs text-muted-foreground">
                    Técnico: {order.tecnicos?.nome || 'Não atribuído'}
                  </p>
                </div>
                <div className="text-right space-y-2">
                  {getStatusBadge(order.status)}
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.data_abertura).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            ))}
            {filteredOrders.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                {statusFilter === 'all' 
                  ? 'Nenhuma ordem de serviço encontrada' 
                  : `Nenhuma ordem com status "${statusLabels[statusFilter as keyof typeof statusLabels]}" encontrada`
                }
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
