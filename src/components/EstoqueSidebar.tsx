
import { useQuery } from '@tanstack/react-query'
import { supabase, PecaManutencao } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Package, Search } from 'lucide-react'
import { useState } from 'react'

export function EstoqueSidebar() {
  const [searchTerm, setSearchTerm] = useState('')

  const { data: pecas = [], isLoading } = useQuery({
    queryKey: ['pecas_manutencao'],
    queryFn: async () => {
      if (!supabase) return []
      
      const { data, error } = await supabase
        .from('pecas_manutencao')
        .select('*')
        .order('nome')
      
      if (error) throw error
      return data as PecaManutencao[]
    }
  })

  const filteredPecas = pecas.filter(peca =>
    peca.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    peca.fabricante?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    peca.modelo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const pecasComEstoque = filteredPecas.filter(peca => peca.estoque > 0)
  const pecasSemEstoque = filteredPecas.filter(peca => peca.estoque === 0)
  const pecasEstoqueBaixo = filteredPecas.filter(peca => peca.estoque > 0 && peca.estoque <= 5)

  const valorTotalEstoque = pecasComEstoque.reduce((total, peca) => 
    total + (peca.estoque * peca.preco_unitario), 0
  )

  if (isLoading) {
    return (
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Estoque
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            Carregando estoque...
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-fit max-h-[600px] overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          Estoque de Peças
        </CardTitle>
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Buscar peças..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            <div>Total em estoque: R$ {valorTotalEstoque.toFixed(2)}</div>
            <div className="flex gap-2 flex-wrap mt-1">
              <Badge variant="outline" className="text-xs h-5">
                {pecasComEstoque.length} disponíveis
              </Badge>
              {pecasEstoqueBaixo.length > 0 && (
                <Badge variant="destructive" className="text-xs h-5">
                  {pecasEstoqueBaixo.length} estoque baixo
                </Badge>
              )}
              {pecasSemEstoque.length > 0 && (
                <Badge variant="secondary" className="text-xs h-5">
                  {pecasSemEstoque.length} sem estoque
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {/* Peças com estoque */}
            {pecasComEstoque.map((peca) => (
              <div
                key={peca.id}
                className="p-2 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{peca.nome}</p>
                    {peca.fabricante && (
                      <p className="text-xs text-muted-foreground truncate">
                        {peca.fabricante} {peca.modelo && `- ${peca.modelo}`}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={peca.estoque <= 5 ? "destructive" : "secondary"}
                        className="text-xs h-4"
                      >
                        {peca.estoque} un
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        R$ {peca.preco_unitario.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Peças sem estoque */}
            {pecasSemEstoque.length > 0 && (
              <div className="pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground mb-2">Sem Estoque</p>
                {pecasSemEstoque.map((peca) => (
                  <div
                    key={peca.id}
                    className="p-2 border rounded-lg bg-muted/30 opacity-60"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{peca.nome}</p>
                        {peca.fabricante && (
                          <p className="text-xs text-muted-foreground truncate">
                            {peca.fabricante} {peca.modelo && `- ${peca.modelo}`}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs h-4">
                            0 un
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            R$ {peca.preco_unitario.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredPecas.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-xs">
                {searchTerm ? 'Nenhuma peça encontrada' : 'Nenhuma peça cadastrada'}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
