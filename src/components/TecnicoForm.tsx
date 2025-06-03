
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, Tecnico } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

interface TecnicoFormProps {
  tecnico?: Tecnico | null
  onSuccess: () => void
}

export function TecnicoForm({ tecnico, onSuccess }: TecnicoFormProps) {
  const [formData, setFormData] = useState({
    nome: tecnico?.nome || '',
    telefone: tecnico?.telefone || '',
    email: tecnico?.email || '',
    endereco: tecnico?.endereco || '',
    cpf: tecnico?.cpf || '',
  })
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const saveTecnico = useMutation({
    mutationFn: async (data: { nome: string; telefone?: string; email?: string; endereco?: string; cpf?: string }) => {
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
    
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do técnico é obrigatório.",
        variant: "destructive",
      })
      return
    }

    saveTecnico.mutate({
      nome: formData.nome.trim(),
      telefone: formData.telefone.trim() || null,
      email: formData.email.trim() || null,
      endereco: formData.endereco.trim() || null,
      cpf: formData.cpf.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="nome">Nome *</Label>
        <Input
          id="nome"
          value={formData.nome}
          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
          placeholder="Nome do técnico"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cpf">CPF</Label>
          <Input
            id="cpf"
            value={formData.cpf}
            onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
            placeholder="000.000.000-00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            value={formData.telefone}
            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
            placeholder="(11) 99999-9999"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="tecnico@email.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="endereco">Endereço</Label>
        <Textarea
          id="endereco"
          value={formData.endereco}
          onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
          placeholder="Endereço completo do técnico"
          rows={3}
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
