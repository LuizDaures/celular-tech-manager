
import { Home, Users, Wrench, FileText, Settings, Package } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getSupabaseClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const menuItems = [
  {
    title: 'Dashboard',
    url: '#dashboard',
    icon: Home,
  },
  {
    title: 'Clientes',
    url: '#clientes',
    icon: Users,
  },
  {
    title: 'Técnicos',
    url: '#tecnicos',
    icon: Wrench,
  },
  {
    title: 'Peças',
    url: '#pecas',
    icon: Package,
  },
  {
    title: 'Ordens de Serviço',
    url: '#ordens',
    icon: FileText,
  },
  {
    title: 'Configurações',
    url: '#configuracoes',
    icon: Settings,
  },
]

export function TopNavigation() {
  // Buscar dados da empresa para mostrar no header
  const { data: dadosEmpresa } = useQuery({
    queryKey: ['dados-empresa'],
    queryFn: async () => {
      const client = await getSupabaseClient()
      if (!client) {
        return null
      }
      
      const { data, error } = await client
        .from('dados_empresa')
        .select('*')
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching empresa data:', error)
        throw error
      }
      
      return data
    }
  })

  const currentHash = window.location.hash

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-4">
        {/* Logo e nome da empresa */}
        <div className="flex items-center gap-3 mr-8">
          {dadosEmpresa?.logo_base64 ? (
            <img 
              src={`data:image/png;base64,${dadosEmpresa.logo_base64}`} 
              alt="Logo da empresa"
              className="h-8 w-8 object-contain rounded"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wrench className="h-4 w-4" />
            </div>
          )}
          <div className="hidden sm:block">
            <div className="font-semibold text-sm">
              {dadosEmpresa?.nome || 'TechFix Pro'}
            </div>
            <div className="text-xs text-muted-foreground">
              {dadosEmpresa?.cnpj || 'Assistência Técnica'}
            </div>
          </div>
        </div>

        {/* Menu de navegação */}
        <div className="flex-1 flex items-center space-x-1 overflow-x-auto">
          {menuItems.map((item) => {
            const isActive = currentHash === item.url
            return (
              <Button
                key={item.title}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                asChild
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap",
                  isActive && "bg-primary text-primary-foreground"
                )}
              >
                <a href={item.url}>
                  <item.icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.title}</span>
                </a>
              </Button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
