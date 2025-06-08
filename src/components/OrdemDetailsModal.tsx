
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OrdemForm } from '@/components/OrdemForm'
import { OrdemCompleta } from '@/lib/supabase'

interface OrdemDetailsModalProps {
  ordem: OrdemCompleta | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrdemDetailsModal({ ordem, open, onOpenChange }: OrdemDetailsModalProps) {
  if (!ordem) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto mx-4 bg-background border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Detalhes da Ordem</DialogTitle>
        </DialogHeader>
        <OrdemForm 
          ordem={ordem}
          readOnly={true}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
