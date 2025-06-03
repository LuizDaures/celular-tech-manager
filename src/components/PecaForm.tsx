
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient, PecaManutencao } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface PecaFormProps {
  peca?: PecaManutencao | null
  onSuccess: () => void
}

export function PecaForm({ peca, onSuccess }: PecaFormProps) {
  const [nome, setNome] = useState(peca?.nome || '')
  const [fabricante, setFabricante] = useState(peca?.fabricante || '')
  const [modelo, setModelo] = useState(peca?.modelo || '')
  const [codigoFabricante, setCodigoFabricante] = useState(peca?.codigo_fabricante || '')
  const [precoUnitario, setPrecoUnitario] = useState(peca?.preco_unitario?.toString() || '')
  const [estoque, setEstoque] = useState(peca?.estoque?.toString() || '0')
  
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const savePeca = useMutation({
    mutationFn: async (data: any) => {
      console.log('Saving peca with data:', data)
      
      const supabase = await getSupabaseClient()
      if (!supabase) {
        throw new Error('Conexão com banco não disponível')
      }
      
      if (peca) {
        const { error } = await supabase
          .from('pecas_manutencao')
          .update({ ...data, atualizado_em: new Date().toISOString() })
          .eq('id', peca.id)
        
        if (error) {
          console.error('Error updating peca:', error)
          throw error
        }
      } else {
        const { error } = await supabase
          .from('pecas_manutencao')
          .insert([{ 
            ...data, 
            criado_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
          }])
        
        if (error) {
          console.error('Error creating peca:', error)
          throw error
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pecas'] })
      queryClient.invalidateQueries({ queryKey: ['pecas_manutencao'] })
      toast({
        title: peca ? "Peça atualizada" : "Peça criada",
        description: peca ? 
          "A peça foi atualizada com sucesso." :
          "A peça foi criada com sucesso.",
      })
      onSuccess()
    },
    onError: (error: any) => {
      console.error('Error saving peca:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar peça: " + error.message,
        variant: "destructive",
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome da peça é obrigatório.",
        variant: "destructive",
      })
      return
    }

    const precoNumerico = parseFloat(precoUnitario) || 0
    const estoqueNumerico = parseInt(estoque) || 0

    if (precoNumerico < 0) {
      toast({
        title: "Erro",
        description: "Preço unitário não pode ser negativo.",
        variant: "destructive",
      })
      return
    }

    if (estoqueNumerico < 0) {
      toast({
        title: "Erro",
        description: "Estoque não pode ser negativo.",
        variant: "destructive",
      })
      return
    }

    const pecaData = {
      nome: nome.trim(),
      fabricante: fabricante.trim() || null,
      modelo: modelo.trim() || null,
      codigo_fabricante: codigoFabricante.trim() || null,
      preco_unitario: precoNumerico,
      estoque: estoqueNumerico
    }

    savePeca.mutate(pecaData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome da Peça *</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Tela LCD"
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="fabricante">Fabricante</Label>
          <Input
            id="fabricante"
            value={fabricante}
            onChange={(e) => setFabricante(e.target.value)}
            placeholder="Ex: Samsung"
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="modelo">Modelo</Label>
          <Input
            id="modelo"
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            placeholder="Ex: Galaxy S21"
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="codigo">Código do Fabricante</Label>
          <Input
            id="codigo"
            value={codigoFabricante}
            onChange={(e) => setCodigoFabricante(e.target.value)}
            placeholder="Ex: LCD-GS21-001"
            className="w-full"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="preco">Preço Unitário *</Label>
          <Input
            id="preco"
            type="number"
            step="0.01"
            min="0"
            value={precoUnitario}
            onChange={(e) => setPrecoUnitario(e.target.value)}
            placeholder="0.00"
            required
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estoque">Estoque *</Label>
          <Input
            id="estoque"
            type="number"
            min="0"
            value={estoque}
            onChange={(e) => setEstoque(e.target.value)}
            placeholder="0"
            required
            className="w-full"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="submit" disabled={savePeca.isPending} className="w-full sm:w-auto">
          {savePeca.isPending ? 'Salvando...' : (peca ? 'Atualizar' : 'Criar Peça')}
        </Button>
      </div>
    </form>
  )
}
