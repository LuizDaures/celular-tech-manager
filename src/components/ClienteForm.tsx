import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getSupabaseClient, Cliente } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'

interface ClienteFormProps {
  cliente?: Cliente | null
  onSuccess: () => void
  onCancel?: () => void
}

export function ClienteForm({ cliente, onSuccess, onCancel }: ClienteFormProps) {
  const [formData, setFormData] = useState({
    nome: cliente?.nome || '',
    telefone: cliente?.telefone || '',
    email: cliente?.email || '',
    endereco: cliente?.endereco || '',
    cpf: cliente?.cpf || '',
  })
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const saveCliente = useMutation({
    mutationFn: async (data: { nome: string; telefone?: string; email?: string; endereco?: string; cpf?: string }) => {
      const client = await getSupabaseClient()
      if (!client) throw new Error('Cliente Supabase não disponível')
      
      if (cliente) {
        const { error } = await client
          .from('clientes')
          .update(data)
          .eq('id', cliente.id)
        
        if (error) throw error
      } else {
        const { error } = await client
          .from('clientes')
          .insert([data])
        
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      toast({
        title: cliente ? "Cliente atualizado" : "Cliente cadastrado",
        description: cliente ? 
          "Os dados do cliente foram atualizados com sucesso." :
          "O cliente foi cadastrado com sucesso.",
      })
      onSuccess()
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Erro ao salvar cliente.",
        variant: "destructive",
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome do cliente é obrigatório.",
        variant: "destructive",
      })
      return
    }

    saveCliente.mutate({
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
          placeholder="Nome do cliente"
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
          placeholder="cliente@email.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="endereco">Endereço</Label>
        <Textarea
          id="endereco"
          value={formData.endereco}
          onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
          placeholder="Endereço completo do cliente"
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={saveCliente.isPending}>
          {saveCliente.isPending ? 'Salvando...' : (cliente ? 'Atualizar' : 'Cadastrar')}
        </Button>
      </div>
    </form>
  )
}
