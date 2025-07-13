
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useApp } from '../../context/AppContext';
import { Sale, SaleItem, ValidationErrors } from '../../types';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

const SaleModal: React.FC<SaleModalProps> = ({ isOpen, onClose, sale }) => {
  const { products, customers, users, currentUser, addSale, updateSale } = useApp();
  const isEditing = !!sale;

  const [formData, setFormData] = useState({
    customerId: '',
    sellerId: currentUser?.id || '',
    paymentMethod: '',
    notes: '',
    status: 'completed' as 'completed' | 'cancelled',
  });

  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [errors, setErrors] = useState<ValidationErrors>({});

  useEffect(() => {
    if (sale) {
      setFormData({
        customerId: sale.customerId || '',
        sellerId: sale.sellerId || currentUser?.id || '',
        paymentMethod: sale.paymentMethod || '',
        notes: sale.notes || '',
        status: sale.status || 'completed',
      });
      setSaleItems(sale.items || []);
    } else {
      setFormData({
        customerId: '',
        sellerId: currentUser?.id || '',
        paymentMethod: '',
        notes: '',
        status: 'completed',
      });
      setSaleItems([]);
    }
    setErrors({});
  }, [sale, isOpen, currentUser]);

  const addItem = () => {
    setSaleItems(prev => [...prev, {
      id: Date.now().toString(),
      productId: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
    }]);
  };

  const removeItem = (index: number) => {
    setSaleItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setSaleItems(prev => prev.map((item, i) => {
      if (i === index) {
        const updatedItem = { ...item, [field]: value };
        
        if (field === 'productId') {
          const product = products.find(p => p.id === value);
          if (product) {
            updatedItem.productName = product.name;
            updatedItem.unitPrice = product.price;
            updatedItem.totalPrice = product.price * updatedItem.quantity;
          }
        } else if (field === 'quantity') {
          updatedItem.totalPrice = updatedItem.unitPrice * value;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const getTotalAmount = () => {
    return saleItems.reduce((total, item) => total + item.totalPrice, 0);
  };

  const validateForm = () => {
    const newErrors: ValidationErrors = {};

    if (!formData.customerId) newErrors.customerId = 'Cliente é obrigatório';
    if (!formData.sellerId) newErrors.sellerId = 'Vendedor é obrigatório';
    if (!formData.paymentMethod) newErrors.paymentMethod = 'Forma de pagamento é obrigatória';
    if (saleItems.length === 0) newErrors.items = 'Adicione pelo menos um item';
    
    // Validate items
    saleItems.forEach((item, index) => {
      if (!item.productId) newErrors[`item_${index}_product`] = 'Produto é obrigatório';
      if (!item.quantity || item.quantity <= 0) newErrors[`item_${index}_quantity`] = 'Quantidade deve ser maior que zero';
      
      const product = products.find(p => p.id === item.productId);
      if (product && item.quantity > product.stock) {
        newErrors[`item_${index}_stock`] = `Estoque insuficiente (disponível: ${product.stock})`;
      }
    });

    // Check for duplicate products
    const productIds = saleItems.map(item => item.productId).filter(Boolean);
    const duplicates = productIds.filter((id, index) => productIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      newErrors.duplicates = 'Não é possível adicionar o mesmo produto duas vezes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const customer = customers.find(c => c.id === formData.customerId);
    const seller = users.find(u => u.id === formData.sellerId);

    const saleData = {
      ...formData,
      customerName: customer?.name || '',
      sellerName: seller?.name || '',
      items: saleItems,
      totalAmount: getTotalAmount(),
    };

    if (isEditing && sale) {
      updateSale(sale.id, saleData);
    } else {
      addSale(saleData);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border">
        <div className="flex items-center justify-between p-4 md:p-6 border-b">
          <h2 className="text-lg md:text-xl font-semibold text-card-foreground">
            {isEditing ? 'Editar Venda' : 'Nova Venda'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-card-foreground">Cliente *</label>
              <Select value={formData.customerId} onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: value }))}>
                <SelectTrigger className={errors.customerId ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.customerId && <p className="text-destructive text-sm mt-1">{errors.customerId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-card-foreground">Vendedor *</label>
              <Select value={formData.sellerId} onValueChange={(value) => setFormData(prev => ({ ...prev, sellerId: value }))}>
                <SelectTrigger className={errors.sellerId ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione um vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {users.filter(u => u.role === 'seller' || u.role === 'admin').map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.sellerId && <p className="text-destructive text-sm mt-1">{errors.sellerId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-card-foreground">Forma de Pagamento *</label>
              <Select value={formData.paymentMethod} onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}>
                <SelectTrigger className={errors.paymentMethod ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione a forma de pagamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Dinheiro</SelectItem>
                  <SelectItem value="card">Cartão</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="bank_transfer">Transferência</SelectItem>
                </SelectContent>
              </Select>
              {errors.paymentMethod && <p className="text-destructive text-sm mt-1">{errors.paymentMethod}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-card-foreground">Status</label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="completed">Concluída</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
              <h3 className="text-base md:text-lg font-medium text-card-foreground">Itens da Venda</h3>
              <Button type="button" onClick={addItem} variant="outline" size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            </div>

            {errors.items && <p className="text-destructive text-sm mb-4">{errors.items}</p>}
            {errors.duplicates && <p className="text-destructive text-sm mb-4">{errors.duplicates}</p>}

            <div className="space-y-4">
              {saleItems.map((item, index) => (
                <div key={index} className="p-3 md:p-4 border rounded-lg bg-muted/5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-2">Produto *</label>
                      <Select value={item.productId} onValueChange={(value) => updateItem(index, 'productId', value)}>
                        <SelectTrigger className={errors[`item_${index}_product`] ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Selecione um produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.filter(p => p.stock > 0).map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              <div className="text-left">
                                <div className="font-medium">{product.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  R$ {product.price.toFixed(2)} - Estoque: {product.stock}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors[`item_${index}_product`] && <p className="text-destructive text-sm mt-1">{errors[`item_${index}_product`]}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Quantidade *</label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className={errors[`item_${index}_quantity`] || errors[`item_${index}_stock`] ? 'border-destructive' : ''}
                      />
                      {errors[`item_${index}_quantity`] && <p className="text-destructive text-sm mt-1">{errors[`item_${index}_quantity`]}</p>}
                      {errors[`item_${index}_stock`] && <p className="text-destructive text-sm mt-1">{errors[`item_${index}_stock`]}</p>}
                    </div>

                    <div className="flex items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium mb-2">Total</label>
                        <p className="text-base md:text-lg font-semibold text-foreground">R$ {item.totalPrice.toFixed(2)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="ml-2 text-destructive hover:text-destructive p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {saleItems.length > 0 && (
              <div className="text-right border-t pt-4 mt-4">
                <p className="text-lg md:text-xl font-bold text-foreground">
                  Total da Venda: R$ {getTotalAmount().toFixed(2)}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-card-foreground">Observações</label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              {isEditing ? 'Atualizar' : 'Criar'} Venda
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SaleModal;
