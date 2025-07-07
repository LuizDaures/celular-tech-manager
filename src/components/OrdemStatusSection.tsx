
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'

interface OrdemStatusSectionProps {
  status: 'aberta' | 'em_andamento' | 'concluida' | 'cancelada'
  setStatus: (status: 'aberta' | 'em_andamento' | 'concluida' | 'cancelada') => void
  valor: string
  setValor: (valor: string) => void
  totalItens: number
  readOnly?: boolean
}

export function OrdemStatusSection({
  status,
  setStatus,
  valor,
  setValor,
  totalItens,
  readOnly = false
}: OrdemStatusSectionProps) {
  const valorManutencao = parseFloat(valor) || 0
  const totalGeral = totalItens + valorManutencao

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberta':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'em_andamento':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'concluida':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'cancelada':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aberta':
        return 'Aberta'
      case 'em_andamento':
        return 'Em Andamento'
      case 'concluida':
        return 'Concluída'
      case 'cancelada':
        return 'Cancelada'
      default:
        return status
    }
  }

  if (readOnly) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-sm font-medium">Status</Label>
          <div className={`mt-1 p-3 rounded-md border text-sm font-medium ${getStatusColor(status)}`}>
            {getStatusLabel(status)}
          </div>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Valor da Manutenção</Label>
          <p className="mt-1 p-3 bg-muted rounded-md text-sm font-medium">
            R$ {valorManutencao.toFixed(2)}
          </p>
        </div>
        
        <div>
          <Label className="text-sm font-medium">Total Geral</Label>
          <Card className="mt-2">
             <CardContent className="p-2 items-center">
              <p className="text-sm font-bold text-center text-primary">R$ {totalGeral.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status" className="text-sm font-medium">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aberta">Aberta</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="valor" className="text-sm font-medium">Valor da Manutenção</Label>
          <Input
            id="valor"
            type="number"
            step="0.01"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="0.00"
            className="h-10"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">Total Geral</Label>
          <Card className="mt-2">
            <CardContent className="p-2 items-center">
              <p className="text-sm font-bold text-center text-primary">R$ {totalGeral.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
