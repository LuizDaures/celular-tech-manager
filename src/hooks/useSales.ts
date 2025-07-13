
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sale, SaleItem, SupabaseSale, SupabaseSaleItem } from '@/types';
import { toast } from 'sonner';

const mapSupabaseSaleItem = (item: SupabaseSaleItem): SaleItem => ({
  id: item.id,
  productId: item.product_id,
  productName: item.products?.name || 'Produto não encontrado',
  quantity: item.quantity,
  unitPrice: item.unit_price,
  totalPrice: item.quantity * item.unit_price,
});

const mapSupabaseSale = (item: SupabaseSale): Sale => ({
  id: item.id,
  customerId: item.client_id || '',
  customerName: item.clients?.name || 'Cliente não informado',
  sellerId: '', // Não temos essa informação ainda
  sellerName: item.salesperson_name,
  items: item.sale_items?.map(mapSupabaseSaleItem) || [],
  totalAmount: item.total_amount,
  date: new Date(item.sale_date),
  status: item.status as 'completed' | 'cancelled',
  paymentMethod: item.payment_method || '',
  notes: item.notes || '',
});

export const useSales = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          id,
          client_id,
          salesperson_name,
          total_amount,
          sale_date,
          status,
          payment_method,
          notes,
          created_at,
          updated_at,
          clients (
            name
          ),
          sale_items (
            id,
            sale_id,
            product_id,
            quantity,
            unit_price,
            warranty_end_date,
            created_at,
            products (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedSales = data.map(mapSupabaseSale);
      setSales(mappedSales);
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      toast.error('Erro ao carregar vendas');
    } finally {
      setLoading(false);
    }
  };

  const addSale = async (saleData: Omit<Sale, 'id' | 'date'>) => {
    try {
      console.log('Adding sale with payment method:', saleData.paymentMethod);
      
      // Inserir venda
      const { data: saleRecord, error: saleError } = await supabase
        .from('sales')
        .insert([{
          client_id: saleData.customerId || null,
          salesperson_name: saleData.sellerName,
          total_amount: saleData.totalAmount,
          status: saleData.status,
          payment_method: saleData.paymentMethod || null,
          notes: saleData.notes,
        }])
        .select()
        .single();

      if (saleError) {
        console.error('Sale insert error:', saleError);
        throw saleError;
      }

      console.log('Sale created successfully:', saleRecord);

      // Inserir itens da venda - não incluir warranty_end_date pois será calculado pelo trigger
      const saleItems = saleData.items.map(item => ({
        sale_id: saleRecord.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) {
        console.error('Sale items insert error:', itemsError);
        throw itemsError;
      }

      toast.success('Venda registrada com sucesso');
      fetchSales();
    } catch (error) {
      console.error('Erro ao registrar venda:', error);
      toast.error('Erro ao registrar venda');
    }
  };

  const updateSale = async (id: string, saleData: Partial<Sale>) => {
    try {
      console.log('Updating sale with payment method:', saleData.paymentMethod);
      
      const { error } = await supabase
        .from('sales')
        .update({
          client_id: saleData.customerId || null,
          salesperson_name: saleData.sellerName,
          total_amount: saleData.totalAmount,
          status: saleData.status,
          payment_method: saleData.paymentMethod || null,
          notes: saleData.notes,
        })
        .eq('id', id);

      if (error) {
        console.error('Sale update error:', error);
        throw error;
      }

      toast.success('Venda atualizada com sucesso');
      fetchSales();
    } catch (error) {
      console.error('Erro ao atualizar venda:', error);
      toast.error('Erro ao atualizar venda');
    }
  };

  const deleteSale = async (id: string) => {
    try {
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Venda excluída com sucesso');
      fetchSales();
    } catch (error) {
      console.error('Erro ao excluir venda:', error);
      toast.error('Erro ao excluir venda');
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  return {
    sales,
    loading,
    addSale,
    updateSale,
    deleteSale,
    refetch: fetchSales,
  };
};
