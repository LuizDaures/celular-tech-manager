
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Product, SupabaseProduct } from '@/types';
import { toast } from 'sonner';

const mapSupabaseProduct = (item: SupabaseProduct): Product => ({
  id: item.id,
  name: item.name,
  category: item.product_categories?.name || 'Sem categoria',
  categoryId: item.category_id || undefined,
  brand: item.brand || '',
  model: item.sku || '',
  costPrice: item.cost_price || 0,
  price: item.price,
  stock: item.stock_quantity,
  warrantyMonths: item.warranty_months,
  description: item.description || '',
  createdAt: new Date(item.created_at),
  updatedAt: new Date(item.updated_at),
});

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          product_categories (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedProducts = data.map(mapSupabaseProduct);
      setProducts(mappedProducts);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          name: productData.name,
          brand: productData.brand,
          price: productData.price,
          cost_price: productData.costPrice,
          stock_quantity: productData.stock,
          warranty_months: productData.warrantyMonths,
          description: productData.description,
          sku: productData.model,
          category_id: productData.categoryId || null,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Produto adicionado com sucesso');
      fetchProducts();
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      toast.error('Erro ao adicionar produto');
    }
  };

  const updateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: productData.name,
          brand: productData.brand,
          price: productData.price,
          cost_price: productData.costPrice,
          stock_quantity: productData.stock,
          warranty_months: productData.warrantyMonths,
          description: productData.description,
          sku: productData.model,
          category_id: productData.categoryId || null,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Produto atualizado com sucesso');
      fetchProducts();
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast.error('Erro ao atualizar produto');
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Produto excluído com sucesso');
      fetchProducts();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast.error('Erro ao excluir produto');
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return {
    products,
    loading,
    addProduct,
    updateProduct,
    deleteProduct,
    refetch: fetchProducts,
  };
};
