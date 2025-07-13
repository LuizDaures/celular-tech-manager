
import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, ShoppingCart, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '../context/AppContext';
import SaleModal from '../components/Modals/SaleModal';
import SaleDetailsModal from '../components/Modals/SaleDetailsModal';
import ConfirmDialog from '../components/Modals/ConfirmDialog';

const Sales = () => {
  const { sales, deleteSale, users } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [viewingSale, setViewingSale] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, saleId: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sellerFilter, setSellerFilter] = useState('all');

  const filteredSales = sales.filter(sale => {
    const matchesSearch = sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sale.sellerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sale.status === statusFilter;
    const matchesSeller = sellerFilter === 'all' || sale.sellerId === sellerFilter;
    return matchesSearch && matchesStatus && matchesSeller;
  });

  const handleEdit = (sale) => {
    setEditingSale(sale);
    setIsModalOpen(true);
  };

  const handleView = (sale) => {
    setViewingSale(sale);
  };

  const handleDelete = (saleId) => {
    setDeleteConfirm({ open: true, saleId });
  };

  const confirmDelete = () => {
    if (deleteConfirm.saleId) {
      deleteSale(deleteConfirm.saleId);
      setDeleteConfirm({ open: false, saleId: null });
    }
  };

  const openNewModal = () => {
    setEditingSale(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Vendas</h1>
        <Button onClick={openNewModal} className="w-full sm:w-auto flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Venda
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar vendas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="completed">Concluída</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sellerFilter} onValueChange={setSellerFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os vendedores</SelectItem>
              {users.filter(u => u.role === 'seller' || u.role === 'admin').map(user => (
                <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Venda
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Cliente
                </th>
                <th className="hidden sm:table-cell px-3 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="hidden md:table-cell px-3 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Data
                </th>
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total
                </th>
                <th className="hidden sm:table-cell px-3 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 md:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-muted/30">
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                        <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="ml-2 md:ml-4">
                        <div className="text-xs md:text-sm font-medium text-foreground">#{sale.id.slice(0, 8)}</div>
                        <div className="text-xs text-muted-foreground">{sale.items.length} itens</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 md:px-6 py-4">
                    <div className="text-xs md:text-sm text-foreground truncate max-w-[120px] md:max-w-none">
                      {sale.customerName}
                    </div>
                    <div className="sm:hidden text-xs text-muted-foreground">
                      {sale.sellerName}
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-foreground">
                    {sale.sellerName}
                  </td>
                  <td className="hidden md:table-cell px-3 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-foreground">
                    {new Date(sale.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                    <div className="text-xs md:text-sm font-medium text-foreground">
                      R$ {sale.totalAmount.toFixed(2)}
                    </div>
                    <div className="sm:hidden">
                      <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                        sale.status === 'completed' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {sale.status === 'completed' ? 'Concluída' : 'Cancelada'}
                      </span>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-3 md:px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 text-xs font-semibold rounded-full ${
                      sale.status === 'completed' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {sale.status === 'completed' ? 'Concluída' : 'Cancelada'}
                    </span>
                  </td>
                  <td className="px-3 md:px-6 py-4 whitespace-nowrap text-right text-xs md:text-sm font-medium">
                    <div className="flex justify-end gap-1 md:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(sale)}
                        className="p-1 md:p-2"
                      >
                        <Eye className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(sale)}
                        className="p-1 md:p-2"
                      >
                        <Edit className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(sale.id)}
                        className="text-destructive hover:text-destructive p-1 md:p-2"
                      >
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredSales.length === 0 && (
          <div className="text-center py-8 md:py-12">
            <ShoppingCart className="mx-auto h-8 w-8 md:h-12 md:w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-medium text-foreground">Nenhuma venda encontrada</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchTerm || statusFilter !== 'all' || sellerFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece criando sua primeira venda'
              }
            </p>
          </div>
        )}
      </div>

      <SaleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        sale={editingSale}
      />

      <SaleDetailsModal
        isOpen={!!viewingSale}
        onClose={() => setViewingSale(null)}
        sale={viewingSale}
      />

      <ConfirmDialog
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, saleId: null })}
        onConfirm={confirmDelete}
        title="Excluir Venda"
        description="Tem certeza que deseja excluir esta venda? O estoque dos produtos será restaurado."
      />
    </div>
  );
};

export default Sales;
