
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

interface OrderCloseConfirmProps {
  orderId: string
  onOrderClosed?: () => void
  disabled?: boolean
}

export function OrderCloseConfirm({ orderId, onOrderClosed, disabled }: OrderCloseConfirmProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleCloseOrder = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('ordens_servico')
        .update({ 
          status: 'concluida',
          data_conclusao: new Date().toISOString()
        })
        .eq('id', orderId)

      if (error) throw error

      toast({
        title: 'Ordem concluída',
        description: 'A ordem de serviço foi fechada com sucesso.',
      })

      onOrderClosed?.()
    } catch (error) {
      console.error('Erro ao fechar ordem:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível fechar a ordem de serviço.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || isLoading}
          className="flex items-center gap-1"
        >
          <CheckCircle className="h-4 w-4" />
          Fechar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar fechamento</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja fechar esta ordem de serviço? Esta ação irá marcar a ordem como concluída.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleCloseOrder} disabled={isLoading}>
            {isLoading ? 'Fechando...' : 'Confirmar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
