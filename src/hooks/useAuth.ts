
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { toast } from 'sonner';

export const useAuth = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setCurrentUser({
            id: profile.id,
            name: profile.name,
            email: user.email || '',
            role: profile.role as 'admin' | 'seller',
            isActive: profile.is_active,
          });
        }
      }
    } catch (error) {
      console.error('Erro ao verificar usuário:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile && profile.is_active) {
          setCurrentUser({
            id: profile.id,
            name: profile.name,
            email: data.user.email || '',
            role: profile.role as 'admin' | 'seller',
            isActive: profile.is_active,
          });
          toast.success('Login realizado com sucesso!');
          return true;
        } else {
          await supabase.auth.signOut();
          toast.error('Usuário inativo ou não encontrado');
          return false;
        }
      }
      return false;
    } catch (error: any) {
      console.error('Erro no login:', error);
      toast.error('Erro ao fazer login: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      toast.success('Logout realizado com sucesso');
    } catch (error) {
      console.error('Erro no logout:', error);
      toast.error('Erro ao fazer logout');
    }
  };

  useEffect(() => {
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      } else if (event === 'SIGNED_IN' && session) {
        checkUser();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    currentUser,
    loading,
    login,
    logout,
  };
};
