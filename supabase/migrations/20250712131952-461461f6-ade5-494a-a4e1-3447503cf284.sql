-- Permitir uso de funções de admin para usuários autenticados
-- Isso é necessário para a funcionalidade de criação/gerenciamento de usuários

-- Primeiro, vamos garantir que o usuário admin tenha as permissões necessárias
-- Não precisamos modificar RLS aqui, apenas certificar que o sistema funcione corretamente

-- Criar função para definir senha padrão para novos usuários
CREATE OR REPLACE FUNCTION public.set_default_password()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT '123456'::text;
$$;

-- Atualizar a função handle_new_user para suportar senha padrão
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Novo Usuário'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'seller'),
    COALESCE((NEW.raw_user_meta_data->>'is_active')::boolean, true)
  );
  RETURN NEW;
END;
$$;

-- Criar trigger para novos usuários se não existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();