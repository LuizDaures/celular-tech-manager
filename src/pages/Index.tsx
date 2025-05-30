
import { useEffect, useState } from 'react'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/components/Dashboard'
import { ClientesList } from '@/components/ClientesList'
import { TecnicosList } from '@/components/TecnicosList'
import { PecasList } from '@/components/PecasList'
import { OrdensList } from '@/components/OrdensList'
import { Configuracoes } from '@/components/Configuracoes'
import { DatabaseSetupModal } from '@/components/DatabaseSetupModal'

const Index = () => {
  const [currentView, setCurrentView] = useState('')
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const config = localStorage.getItem('supabase_config')
    
    if (!config) {
      setShowDatabaseSetup(true)
      setIsConnected(false)
      setIsLoading(false)
      // Limpar qualquer hash da URL quando não conectado
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname)
      }
      return
    }

    // Se há configuração, definir como conectado mas manter loading
    setIsConnected(true)
    setShowDatabaseSetup(false)
    // O loading será removido quando o Dashboard carregar os dados

    const handleHashChange = () => {
      // Só permitir navegação se estiver conectado
      if (config) {
        const hash = window.location.hash.replace('#', '')
        setCurrentView(hash || 'dashboard')
      } else {
        // Se não estiver conectado, bloquear navegação e redirecionar para home
        window.history.replaceState(null, '', window.location.pathname)
        setCurrentView('')
      }
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Interceptar tentativas de navegação direta quando não conectado
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!isConnected && window.location.hash) {
        event.preventDefault()
        window.history.replaceState(null, '', window.location.pathname)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isConnected])

  const handleConnectionSuccess = () => {
    setShowDatabaseSetup(false)
    setIsConnected(true)
    setIsLoading(true) // Manter loading até os dados carregarem
    setCurrentView('dashboard')
    window.location.hash = '#dashboard'
    window.location.reload()
  }

  // Função para ser chamada quando o Dashboard terminar de carregar
  const handleDashboardLoaded = () => {
    setIsLoading(false)
  }

  const renderCurrentView = () => {
    // Só renderizar views se estiver conectado
    if (!isConnected) {
      return null
    }

    switch (currentView) {
      case 'clientes':
        return <ClientesList />
      case 'tecnicos':
        return <TecnicosList />
      case 'pecas':
        return <PecasList />
      case 'ordens':
        return <OrdensList />
      case 'configuracoes':
        return <Configuracoes />
      default:
        return <Dashboard onLoadingComplete={handleDashboardLoaded} />
    }
  }

  return (
    <>
      <DatabaseSetupModal 
        isOpen={showDatabaseSetup} 
        onConnectionSuccess={handleConnectionSuccess}
      />
      {isConnected && !isLoading && (
        <Layout hideNavigation={false}>
          {renderCurrentView()}
        </Layout>
      )}
      {((!isConnected && !showDatabaseSetup) || (isConnected && isLoading)) && (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <div>
              <h1 className="text-2xl font-bold mb-2">
                {!isConnected ? 'Configurando conexão...' : 'Carregando dados...'}
              </h1>
              <p className="text-muted-foreground">
                {!isConnected ? 'Por favor, aguarde.' : 'Buscando informações do sistema...'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Index
