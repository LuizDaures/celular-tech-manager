
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface OrdemStatusSectionProps {
  status: 'aberta' | 'em_andamento' | 'concluida' | 'cancelada'
  setStatus: (status: 'aberta' | 'em_andamento' | 'concluida' | 'cancelada') => void
  valor: string
  setValor: (valor: string) => void
  valorManutencao: string
  setValorManutencao: (valor: string) => void
  totalItens: number
  readOnly?: boolean
}

export function OrdemStatusSection({
  status,
  setStatus,
  valor,
  setValor,
  valorManutencao,
  setValorManutencao,
  totalItens,
  readOnly = false
}: OrdemStatusSectionProps) {
  const statusOptions = [
    { value: 'aberta', label: 'Aberta', variant: 'secondary' as const },
    { value: 'em_andamento', label: 'Em Andamento', variant: 'default' as const },
    { value: 'concluida', label: 'Concluída', variant: 'default' as const },
    { value: 'cancelada', label: 'Cancelada', variant: 'destructive' as const }
  ]

  const currentStatus = statusOptions.find(opt => opt.value === status)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Status */}
      <div className="space-y-2 md:col-span-2">
        <Label>Status da Ordem</Label>
        {readOnly ? (
          <div className="py-2">
            <Badge variant={currentStatus?.variant}>
              {currentStatus?.label}
            </Badge>
          </div>
        ) : (
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Valor Manutenção e Valor Total na mesma linha */}
      <div className="space-y-2">
        <Label>Valor Manutenção</Label>
        {readOnly ? (
          <div className="py-2 text-lg font-semibold">
            {valorManutencao ? `R$ ${parseFloat(valorManutencao).toFixed(2)}` : 'Não informado'}
          </div>
        ) : (
          <Input
            type="number"
            step="0.01"
            value={valorManutencao}
            onChange={(e) => setValorManutencao(e.target.value)}
            placeholder="0.00"
          />
        )}
      </div>

      <div className="space-y-2">
        <Label>Valor Total</Label>
        {readOnly ? (
          <div className="py-2 text-lg font-semibold">
            {valor ? `R$ ${parseFloat(valor).toFixed(2)}` : 'Não informado'}
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0.00"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
              {totalItens > 0 && (
                <div>Total das peças: R$ {totalItens.toFixed(2)}</div>
              )}
              {valorManutencao && (
                <div>Valor manutenção: R$ {parseFloat(valorManutencao).toFixed(2)}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
