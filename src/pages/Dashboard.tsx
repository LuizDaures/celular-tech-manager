
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, Users, TrendingUp, AlertTriangle, DollarSign, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

const Dashboard = () => {
  const { products, customers, sales, loading } = useApp();
  
  const totalProducts = products.length;
  const totalCustomers = customers.length;
  const totalSales = sales.filter(sale => sale.status === 'completed').length;
  const lowStockProducts = products.filter(product => product.stock <= 5).length;
  
  const totalRevenue = sales
    .filter(sale => sale.status === 'completed')
    .reduce((total, sale) => total + sale.totalAmount, 0);
    
  const todaySales = sales.filter(sale => {
    const today = new Date();
    const saleDate = new Date(sale.date);
    return saleDate.toDateString() === today.toDateString() && sale.status === 'completed';
  }).length;

  const stats = [
    {
      title: 'Total de Produtos',
      value: loading.products ? <Loader2 className="h-5 w-5 animate-spin" /> : totalProducts,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      title: 'Vendas do Dia',
      value: loading.sales ? <Loader2 className="h-5 w-5 animate-spin" /> : todaySales,
      icon: ShoppingCart,
      color: 'bg-green-500',
    },
    {
      title: 'Total de Clientes',
      value: loading.customers ? <Loader2 className="h-5 w-5 animate-spin" /> : totalCustomers,
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      title: 'Receita Total',
      value: loading.sales ? <Loader2 className="h-5 w-5 animate-spin" /> : `R$ ${totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-yellow-500',
    },
    {
      title: 'Total de Vendas',
      value: loading.sales ? <Loader2 className="h-5 w-5 animate-spin" /> : totalSales,
      icon: TrendingUp,
      color: 'bg-indigo-500',
    },
    {
      title: 'Estoque Baixo',
      value: loading.products ? <Loader2 className="h-5 w-5 animate-spin" /> : lowStockProducts,
      icon: AlertTriangle,
      color: 'bg-red-500',
    },
  ];

  const recentSales = sales
    .filter(sale => sale.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const lowStockItems = products
    .filter(product => product.stock <= 5)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('pt-BR', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground flex items-center">
                    {stat.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading.sales ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {recentSales.length > 0 ? recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{sale.customerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(sale.date).toLocaleDateString('pt-BR')} - {sale.sellerName}
                      </p>
                    </div>
                    <p className="font-bold text-green-600">
                      R$ {sale.totalAmount.toFixed(2)}
                    </p>
                  </div>
                )) : (
                  <p className="text-muted-foreground text-center py-4">Nenhuma venda registrada</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos com Estoque Baixo</CardTitle>
          </CardHeader>
          <CardContent>
            {loading.products ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {lowStockItems.length > 0 ? lowStockItems.map((product) => (
                  <div key={product.id} className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.brand} - {product.model}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">{product.stock} unidades</p>
                      <p className="text-xs text-muted-foreground">Estoque baixo</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-muted-foreground text-center py-4">Todos os produtos com estoque adequado</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
