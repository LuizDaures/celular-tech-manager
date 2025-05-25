
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, Tecnico } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface TecnicoFormProps {
  tecnico?: Tecnico | null
  onSuccess: () => void
}

export function TecnicoForm({ tecnico, onSuccess }: TecnicoFormProps) {
  const [nome, setNome] = useState(tecnico?.nome || '')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const saveTecnico = useMutation({
    mutationFn: async (data: { nome: string }) => {
      if (tecnico) {
        const { error } = await supabase
          .from('tecnicos')
          .update(data)
          .eq('id', tecnico.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('tecnicos')
          .insert([data])
        
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tecnicos'] })
      toast({
        title: tecnico ? "Técnico atualizado" : "Técnico cadastrado",
        description: tecnico ? 
          "Os dados do técnico foram atualizados com sucesso." :
          "O técnico foi cadastrado com sucesso.",
      })
      onSuccess()
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar técnico.",
        variant: "destructive",
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do técnico é obrigatório.",
        variant: "destructive",
      })
      return
    }

    saveTecnico.mutate({ nome: nome.trim() })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input
          id="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Nome do técnico"
          required
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={saveTecnico.isPending}>
          {saveTecnico.isPending ? 'Salvando...' : (tecnico ? 'Atualizar' : 'Cadastrar')}
        </Button>
      </div>
    </form>
  )
}
