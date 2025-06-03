
import { Home, Users, Wrench, FileText, Settings, Package } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar'

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

export function AppSidebar() {
  // Buscar dados da empresa para mostrar no header
  const { data: dadosEmpresa } = useQuery({
    queryKey: ['dados-empresa'],
    queryFn: async () => {
      const { data, error } = await supabase
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

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
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
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">
              {dadosEmpresa?.nome || 'TechFix Pro'}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {dadosEmpresa?.cnpj || 'Assistência Técnica'}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
