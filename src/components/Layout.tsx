
import { useState, useEffect } from 'react'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  hideNavigation?: boolean
}

export function Layout({ children, hideNavigation = false }: LayoutProps) {
  const [isDark, setIsDark] = useState(() => {
    // Verificar se há preferência salva no localStorage
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      return savedTheme === 'dark'
    }
    // Se não há preferência salva, verificar se o sistema está em dark mode
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Aplicar tema quando o componente monta
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    
    // Salvar preferência no localStorage
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
    
    // Aplicar tema imediatamente
    if (newTheme) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          {!hideNavigation && <AppSidebar />}
          <main className="flex-1 flex flex-col">
            {!hideNavigation && (
              <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex h-14 items-center px-4">
                  <SidebarTrigger />
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
            )}
            <div className="flex-1 p-4 md:p-6">
              {children}
            </div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  )
}
