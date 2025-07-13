
import React, { useState } from 'react';
import { Settings as SettingsIcon, Users, Lock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '../context/AppContext';
import UserModal from '../components/Modals/UserModal';
import ConfirmDialog from '../components/Modals/ConfirmDialog';
import ProtectedRoute from '../components/ProtectedRoute';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Settings = () => {
  const { currentUser, users, loading, addUser, updateUser, changePassword, deleteUser } = useApp();
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, userId: null });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<{ [key: string]: string }>({});
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = (userId: string) => {
    setDeleteConfirm({ open: true, userId });
  };

  const confirmDeleteUser = async () => {
    if (deleteConfirm.userId) {
      try {
        await deleteUser(deleteConfirm.userId);
        toast.success('Usuário removido com sucesso');
      } catch (error) {
        console.error('Erro ao remover usuário:', error);
        toast.error('Erro ao remover usuário');
      }
      setDeleteConfirm({ open: false, userId: null });
    }
  };

  const openNewUserModal = () => {
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const handleUserSubmit = async (userData: any) => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, userData);
      } else {
        await addUser(userData);
      }
      setIsUserModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
    }
  };

  const validatePasswordForm = () => {
    const errors: { [key: string]: string } = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Senha atual é obrigatória';
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'Nova senha é obrigatória';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Nova senha deve ter pelo menos 6 caracteres';
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Senhas não coincidem';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswordForm()) return;

    setPasswordLoading(true);
    
    try {
      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (error) {
        throw error;
      }

      toast.success('Senha alterada com sucesso');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors({});
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast.error('Erro ao alterar senha: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
      </div>

      <Tabs defaultValue="password" className="space-y-6">
        <TabsList className="bg-muted">
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Alterar Senha
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Altere sua senha de acesso ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium mb-2">Nova Senha</label>
                  <Input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Digite a nova senha"
                    className={passwordErrors.newPassword ? 'border-destructive' : ''}
                  />
                  {passwordErrors.newPassword && (
                    <p className="text-destructive text-sm mt-1">{passwordErrors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Confirmar Nova Senha</label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirme a nova senha"
                    className={passwordErrors.confirmPassword ? 'border-destructive' : ''}
                  />
                  {passwordErrors.confirmPassword && (
                    <p className="text-destructive text-sm mt-1">{passwordErrors.confirmPassword}</p>
                  )}
                </div>

                <Button type="submit" className="w-full sm:w-auto" disabled={passwordLoading}>
                  {passwordLoading ? 'Alterando...' : 'Alterar Senha'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users">
            <ProtectedRoute requiredRole="admin">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Gestão de Usuários
                      </CardTitle>
                      <CardDescription>
                        Gerencie os usuários do sistema
                      </CardDescription>
                    </div>
                    <Button onClick={openNewUserModal} className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Novo Usuário
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Usuário
                          </th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                             Função
                           </th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                             Status
                           </th>
                           <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                             Email
                           </th>
                           <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                             Ações
                           </th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-muted/30">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-foreground">{user.name}</div>
                                <div className="text-sm text-muted-foreground">{user.email}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {user.role === 'admin' ? (
                                  <Shield className="h-4 w-4 text-primary mr-2" />
                                ) : (
                                  <Users className="h-4 w-4 text-muted-foreground mr-2" />
                                )}
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  user.role === 'admin' 
                                    ? 'bg-primary/10 text-primary' 
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
                                </span>
                              </div>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                               <div className="flex flex-col">
                                 <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                   user.isActive 
                                     ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400' 
                                     : 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400'
                                 }`}>
                                   {user.isActive ? 'Ativo' : 'Inativo'}
                                 </span>
                                 {user.emailConfirmed === false && (
                                   <span className="px-2 mt-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400">
                                     Email pendente
                                   </span>
                                 )}
                               </div>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                               <div className="text-sm text-foreground">{user.email}</div>
                               {user.emailConfirmed === false && (
                                 <div className="text-xs text-yellow-600 dark:text-yellow-400">Confirmação pendente</div>
                               )}
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                >
                                  Editar
                                </Button>
                                {user.id !== currentUser?.id && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    Remover
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {users.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                      <h3 className="mt-2 text-sm font-medium text-foreground">Nenhum usuário encontrado</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Comece adicionando o primeiro usuário
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </ProtectedRoute>
          </TabsContent>
        )}
      </Tabs>

      {isAdmin && (
        <>
          <UserModal
            isOpen={isUserModalOpen}
            onClose={() => setIsUserModalOpen(false)}
            onSubmit={handleUserSubmit}
            onChangePassword={changePassword}
            user={editingUser}
          />

          <ConfirmDialog
            isOpen={deleteConfirm.open}
            onClose={() => setDeleteConfirm({ open: false, userId: null })}
            onConfirm={confirmDeleteUser}
            title="Remover Usuário"
            description="Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita."
          />
        </>
      )}
    </div>
  );
};

export default Settings;
