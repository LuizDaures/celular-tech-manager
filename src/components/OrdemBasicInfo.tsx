
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Cliente, Tecnico } from '@/lib/supabase'

interface OrdemBasicInfoProps {
  clienteId: string
  setClienteId: (value: string) => void
  tecnicoId: string
  setTecnicoId: (value: string) => void
  dispositivo: string
  setDispositivo: (value: string) => void
  descricaoProblema: string
  setDescricaoProblema: (value: string) => void
  diagnostico: string
  setDiagnostico: (value: string) => void
  servicoRealizado: string
  setServicoRealizado: (value: string) => void
  clientes: Cliente[]
  tecnicos: Tecnico[]
  readOnly?: boolean
}

export function OrdemBasicInfo({
  clienteId,
  setClienteId,
  tecnicoId,
  setTecnicoId,
  dispositivo,
  setDispositivo,
  descricaoProblema,
  setDescricaoProblema,
  diagnostico,
  setDiagnostico,
  servicoRealizado,
  setServicoRealizado,
  clientes,
  tecnicos,
  readOnly = false
}: OrdemBasicInfoProps) {
  if (readOnly) {
    const cliente = clientes.find(c => c.id === clienteId)
    const tecnico = tecnicos.find(t => t.id === tecnicoId)
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <Label>Cliente</Label>
            <p className="mt-1 p-3 bg-muted rounded-md text-sm">{cliente?.nome || 'Cliente não encontrado'}</p>
          </div>
          <div>
            <Label>Técnico</Label>
            <p className="mt-1 p-3 bg-muted rounded-md text-sm">{tecnico?.nome || 'Não atribuído'}</p>
          </div>
        </div>
        
        <div>
          <Label>Dispositivo</Label>
          <p className="mt-1 p-3 bg-muted rounded-md text-sm">{dispositivo || 'Não informado'}</p>
        </div>
        
        <div>
          <Label>Descrição do Problema</Label>
          <p className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">{descricaoProblema}</p>
        </div>
        
        {diagnostico && (
          <div>
            <Label>Diagnóstico</Label>
            <p className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">{diagnostico}</p>
          </div>
        )}
        
        {servicoRealizado && (
          <div>
            <Label>Serviço Realizado</Label>
            <p className="mt-1 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">{servicoRealizado}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cliente">Cliente *</Label>
          <Select value={clienteId} onValueChange={setClienteId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((cliente) => (
                <SelectItem key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tecnico">Técnico</Label>
          <Select value={tecnicoId || 'none'} onValueChange={(value) => setTecnicoId(value === 'none' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um técnico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              {tecnicos.map((tecnico) => (
                <SelectItem key={tecnico.id} value={tecnico.id}>
                  {tecnico.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dispositivo">Dispositivo *</Label>
        <Input
          id="dispositivo"
          value={dispositivo}
          onChange={(e) => setDispositivo(e.target.value)}
          placeholder="Ex: iPhone 12, Samsung Galaxy S21, Notebook Dell"
          required
          className="w-full"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição do Problema *</Label>
        <Textarea
          id="descricao"
          value={descricaoProblema}
          onChange={(e) => setDescricaoProblema(e.target.value)}
          placeholder="Descreva o problema reportado pelo cliente"
          rows={3}
          required
          className="w-full resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="diagnostico">Diagnóstico</Label>
        <Textarea
          id="diagnostico"
          value={diagnostico}
          onChange={(e) => setDiagnostico(e.target.value)}
          placeholder="Diagnóstico técnico do problema"
          rows={3}
          className="w-full resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="servico">Serviço Realizado</Label>
        <Textarea
          id="servico"
          value={servicoRealizado}
          onChange={(e) => setServicoRealizado(e.target.value)}
          placeholder="Descrição do serviço realizado"
          rows={3}
          className="w-full resize-none"
        />
      </div>
    </div>
  )
}
