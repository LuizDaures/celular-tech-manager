
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { UserRegistration } from '@/components/UserRegistration'
import { Users, Plus } from 'lucide-react'

export function UserManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Gerenciamento de Usuários
        </CardTitle>
        <CardDescription>
          Gerencie os usuários do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-fit">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Usuário</DialogTitle>
                <DialogDescription>
                  Cadastre um novo usuário para acessar o sistema
                </DialogDescription>
              </DialogHeader>
              <UserRegistration />
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
