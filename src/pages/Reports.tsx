
import React, { useState, useMemo } from 'react';
import { CalendarDays, TrendingUp, DollarSign, Package, Users, FileSpreadsheet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '../context/AppContext';
import ProtectedRoute from '../components/ProtectedRoute';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

const Reports = () => {
  const { sales, products, customers } = useApp();
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
  });
  const [periodFilter, setPeriodFilter] = useState('all');

  // Filtrar vendas por período
  const filteredSales = useMemo(() => {
    let filtered = [...sales];

    if (periodFilter !== 'all') {
      const now = new Date();
      const startDate = new Date();

      switch (periodFilter) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(sale => new Date(sale.date) >= startDate);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(sale => new Date(sale.date) >= startDate);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(sale => new Date(sale.date) >= startDate);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          filtered = filtered.filter(sale => new Date(sale.date) >= startDate);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          filtered = filtered.filter(sale => new Date(sale.date) >= startDate);
          break;
      }
    }

    if (dateFilter.startDate && dateFilter.endDate) {
      const start = new Date(dateFilter.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateFilter.endDate);
      end.setHours(23, 59, 59, 999);

      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= start && saleDate <= end;
      });
    }

    return filtered.filter(sale => sale.status === 'completed');
  }, [sales, periodFilter, dateFilter]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalSales = filteredSales.length;
    const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Calcular lucro aproximado (baseado nos produtos vendidos)
    let totalProfit = 0;
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const profit = (item.unitPrice - product.costPrice) * item.quantity;
          totalProfit += profit;
        }
      });
    });

    return {
      totalRevenue,
      totalSales,
      averageTicket,
      totalProfit,
    };
  }, [filteredSales, products]);

  const exportToExcel = () => {
    try {
      // Preparar dados para exportação
      const exportData = filteredSales.map(sale => {
        const customer = customers.find(c => c.id === sale.customerId);
        return {
          'Data': new Date(sale.date).toLocaleDateString('pt-BR'),
          'Cliente': customer?.name || 'Cliente não identificado',
          'Vendedor': sale.sellerName,
          'Total': `R$ ${sale.totalAmount.toFixed(2)}`,
          'Método de Pagamento': sale.paymentMethod,
          'Status': sale.status === 'completed' ? 'Concluída' : 'Cancelada',
          'Observações': sale.notes || '',
        };
      });

      // Criar workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Ajustar largura das colunas
      const colWidths = [
        { wch: 12 }, // Data
        { wch: 25 }, // Cliente
        { wch: 20 }, // Vendedor
        { wch: 12 }, // Total
        { wch: 20 }, // Método de Pagamento
        { wch: 12 }, // Status
        { wch: 30 }, // Observações
      ];
      ws['!cols'] = colWidths;

      // Adicionar planilha ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Vendas');

      // Gerar nome do arquivo
      const fileName = `vendas_${periodFilter}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Baixar arquivo
      XLSX.writeFile(wb, fileName);
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar relatório:', error);
      toast.error('Erro ao exportar relatório');
    }
  };

  return (
    <ProtectedRoute requiredRole="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <Button onClick={exportToExcel} className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Período</label>
                <Select value={periodFilter} onValueChange={setPeriodFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os períodos</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Último mês</SelectItem>
                    <SelectItem value="quarter">Último trimestre</SelectItem>
                    <SelectItem value="year">Último ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Data Início</label>
                <Input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Data Fim</label>
                <Input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {stats.totalRevenue.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Lucro Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                R$ {stats.totalProfit.toFixed(2)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalSales}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                R$ {stats.averageTicket.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de vendas */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas do Período</CardTitle>
            <CardDescription>
              {filteredSales.length} vendas encontradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Vendedor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {filteredSales.map((sale) => {
                    const customer = customers.find(c => c.id === sale.customerId);
                    return (
                      <tr key={sale.id} className="hover:bg-muted/30">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {new Date(sale.date).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {customer?.name || 'Cliente não identificado'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                          {sale.sellerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          R$ {sale.totalAmount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400">
                            Concluída
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredSales.length === 0 && (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-medium text-foreground">Nenhuma venda encontrada</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajuste os filtros para ver mais resultados
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
};

export default Reports;
