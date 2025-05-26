
import { useState } from 'react'
import { Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [isDark, setIsDark] = useState(false)

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

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar />
          <main className="flex-1 flex flex-col">
            <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-14 items-center px-4 gap-4">
                <SidebarTrigger />
                
                {/* Informações da empresa */}
                {dadosEmpresa && (
                  <div className="flex items-center gap-3">
                    {dadosEmpresa.logo_base64 && (
                      <img 
                        src={`data:image/png;base64,${dadosEmpresa.logo_base64}`} 
                        alt="Logo da empresa"
                        className="h-8 w-8 object-contain rounded"
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{dadosEmpresa.nome}</span>
                      {dadosEmpresa.cnpj && (
                        <span className="text-xs text-muted-foreground">{dadosEmpresa.cnpj}</span>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="flex-1" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="h-9 w-9"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </header>
            <div className="flex-1 p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  )
}
