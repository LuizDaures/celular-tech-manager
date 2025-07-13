
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StockMovement, SupabaseStockMovement } from '@/types';
import { toast } from 'sonner';

const mapSupabaseStockMovement = (item: SupabaseStockMovement): StockMovement => ({
  id: item.id,
  productId: item.product_id,
  type: item.movement_type as 'in' | 'out',
  quantity: item.quantity,
  reason: item.notes || item.reference_type || 'Movimentação',
  date: new Date(item.created_at),
  userId: '', // Não temos essa informação ainda
});

export const useStockMovements = (refetchProducts?: () => void) => {
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStockMovements = async () => {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          products (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedMovements = data.map(mapSupabaseStockMovement);
      setStockMovements(mappedMovements);
    } catch (error) {
      console.error('Erro ao buscar movimentações:', error);
      toast.error('Erro ao carregar movimentações de estoque');
    } finally {
      setLoading(false);
    }
  };

  const addStockMovement = async (productId: string, quantity: number, reason: string, type: 'in' | 'out') => {
    try {
      console.log('Adicionando movimentação de estoque:', { productId, quantity, reason, type });
      
      // Primeiro, buscar o estoque atual do produto
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('stock_quantity, name')
        .eq('id', productId)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar produto:', fetchError);
        throw fetchError;
      }

      console.log('Produto encontrado:', product);

      // Calcular o novo estoque
      const quantityChange = type === 'in' ? Math.abs(quantity) : -Math.abs(quantity);
      const newStockQuantity = product.stock_quantity + quantityChange;

      console.log('Estoque atual:', product.stock_quantity, 'Mudança:', quantityChange, 'Novo estoque:', newStockQuantity);

      // Verificar se o estoque não ficará negativo
      if (newStockQuantity < 0) {
        toast.error('Estoque insuficiente para esta operação');
        return;
      }

      // Registrar movimentação de estoque
      const { data: movementData, error: movementError } = await supabase
        .from('stock_movements')
        .insert([{
          product_id: productId,
          movement_type: type,
          quantity: Math.abs(quantity),
          reference_type: `manual_${type}`,
          notes: reason,
        }])
        .select()
        .single();

      if (movementError) {
        console.error('Erro ao registrar movimentação:', movementError);
        throw movementError;
      }

      console.log('Movimentação registrada:', movementData);

      // Atualizar estoque do produto
      const { error: updateError } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newStockQuantity
        })
        .eq('id', productId);

      if (updateError) {
        console.error('Erro ao atualizar estoque:', updateError);
        throw updateError;
      }

      console.log('Estoque atualizado com sucesso');
      toast.success(`Movimentação registrada: ${type === 'in' ? 'Entrada' : 'Saída'} de ${Math.abs(quantity)} unidades`);
      
      // Recarregar movimentações e produtos
      fetchStockMovements();
      if (refetchProducts) {
        refetchProducts();
      }
    } catch (error) {
      console.error('Erro ao registrar movimentação:', error);
      toast.error('Erro ao registrar movimentação');
    }
  };

  useEffect(() => {
    fetchStockMovements();
  }, []);

  return {
    stockMovements,
    loading,
    addStockMovement,
    refetch: fetchStockMovements,
  };
};
