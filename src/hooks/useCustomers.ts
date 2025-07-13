
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer, SupabaseClient } from '@/types';
import { toast } from 'sonner';

const mapSupabaseClient = (item: SupabaseClient): Customer => ({
  id: item.id,
  name: item.name,
  email: item.email || '',
  phone: item.phone || '',
  cpf: item.cpf || '', // Agora vai mapear o CPF corretamente
  address: item.address || '',
  createdAt: new Date(item.created_at),
  updatedAt: new Date(item.updated_at),
});

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedCustomers = data.map(mapSupabaseClient);
      setCustomers(mappedCustomers);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const addCustomer = async (customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([{
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          cpf: customerData.cpf, // Incluir CPF na inserção
          address: customerData.address,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success('Cliente adicionado com sucesso');
      fetchCustomers();
    } catch (error) {
      console.error('Erro ao adicionar cliente:', error);
      toast.error('Erro ao adicionar cliente');
    }
  };

  const updateCustomer = async (id: string, customerData: Partial<Customer>) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: customerData.name,
          email: customerData.email,
          phone: customerData.phone,
          cpf: customerData.cpf, // Incluir CPF na atualização
          address: customerData.address,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Cliente atualizado com sucesso');
      fetchCustomers();
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      toast.error('Erro ao atualizar cliente');
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === '23503') {
          toast.error('Não é possível excluir este cliente pois há vendas vinculadas a ele');
        } else {
          toast.error('Erro ao excluir cliente');
        }
        throw error;
      }

      toast.success('Cliente excluído com sucesso');
      fetchCustomers();
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return {
    customers,
    loading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    refetch: fetchCustomers,
  };
};
