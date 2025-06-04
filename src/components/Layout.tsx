
import { useState } from 'react'
import { TopNavigation } from '@/components/TopNavigation'
import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
  hideNavigation?: boolean
}

export function Layout({ children, hideNavigation = false }: LayoutProps) {
  const [isDark, setIsDark] = useState(false)

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen w-full bg-background">
        {!hideNavigation && (
          <header className="sticky top-0 z-50">
            <TopNavigation />
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex h-12 items-center justify-end px-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="h-8 w-8"
                >
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </header>
        )}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
