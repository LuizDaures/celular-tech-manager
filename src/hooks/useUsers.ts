import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { toast } from 'sonner';

const mapSupabaseUser = (profile: any, authUser?: any): User => ({
  id: profile.id,
  name: profile.name,
  email: authUser?.email || profile.email || '', // Fix: add fallback to profile.email
  role: profile.role as 'admin' | 'seller',
  isActive: profile.is_active,
  emailConfirmed: authUser?.email_confirmed_at ? true : false,
  createdAt: new Date(profile.created_at),
});

export const useUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch auth users (admin only)
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
      
      let mappedUsers: User[] = [];
      
      if (authError) {
        console.warn('Could not fetch auth users (admin access required):', authError);
        // Map without auth data - assume email confirmed for existing users
        mappedUsers = profiles.map(profile => ({
          ...mapSupabaseUser(profile),
          emailConfirmed: true, // Assume confirmed if we can't check
        }));
      } else {
        // Map with auth data
        mappedUsers = profiles.map(profile => {
          const authUser = authUsers?.find((au: any) => au.id === profile.id);
          return mapSupabaseUser(profile, authUser);
        });
      }

      setUsers(mappedUsers);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const addUser = async (userData: Omit<User, 'id' | 'createdAt' | 'emailConfirmed'>) => {
    try {
      // Create user in auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: '123456', // Default password
        email_confirm: true,
      });

      if (authError) throw authError;

      // Create profile with email stored
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: authData.user.id,
          name: userData.name,
          role: userData.role,
          is_active: userData.isActive,
          email: userData.email, // Store email in profile for fallback
        }]);

      if (profileError) throw profileError;

      toast.success('Usuário criado com sucesso. Senha padrão: 123456');
      fetchUsers();
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      toast.error('Erro ao criar usuário');
    }
  };

  const updateUser = async (id: string, userData: Partial<User>) => {
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          name: userData.name,
          role: userData.role,
          is_active: userData.isActive,
          email: userData.email, // Store email in profile for fallback
        })
        .eq('id', id);

      if (profileError) throw profileError;

      // Update auth user email if provided
      if (userData.email) {
        const { error: authError } = await supabase.auth.admin.updateUserById(id, {
          email: userData.email
        });
        
        if (authError) {
          console.warn('Could not update auth email (admin access required):', authError);
        }
      }

      toast.success('Usuário atualizado com sucesso');
      fetchUsers();
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error('Erro ao atualizar usuário');
    }
  };

  const changePassword = async (userId: string, newPassword: string) => {
    try {
      const { error } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword
      });

      if (error) throw error;

      toast.success('Senha alterada com sucesso');
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast.error('Erro ao alterar senha. Verifique se você tem permissões de administrador.');
    }
  };

  const deleteUser = async (id: string) => {
    try {
      // Delete from auth (this will cascade to profiles due to foreign key)
      const { error: authError } = await supabase.auth.admin.deleteUser(id);

      if (authError) throw authError;

      toast.success('Usuário excluído com sucesso');
      fetchUsers();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast.error('Erro ao excluir usuário');
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    addUser,
    updateUser,
    changePassword,
    deleteUser,
    refetch: fetchUsers,
  };
};
