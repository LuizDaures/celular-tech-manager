
import { useEffect, useState } from 'react'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/components/Dashboard'
import { ClientesList } from '@/components/ClientesList'
import { TecnicosList } from '@/components/TecnicosList'
import { PecasList } from '@/components/PecasList'
import { OrdensList } from '@/components/OrdensList'
import { Configuracoes } from '@/components/Configuracoes'
import { EnhancedDatabaseSetupModal } from '@/components/EnhancedDatabaseSetupModal'

const Index = () => {
  const [currentView, setCurrentView] = useState('')
  const [showDatabaseSetup, setShowDatabaseSetup] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const config = localStorage.getItem('supabase_config')
    
    if (!config) {
      setShowDatabaseSetup(true)
      setIsConnected(false)
      // Limpar qualquer hash da URL quando não conectado
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname)
      }
      return
    }

    setIsConnected(true)
    setShowDatabaseSetup(false)

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
    setCurrentView('dashboard')
    window.location.hash = '#dashboard'
    window.location.reload()
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
        return <Dashboard />
    }
  }

  return (
    <>
      <EnhancedDatabaseSetupModal 
        isOpen={showDatabaseSetup} 
        onConnectionSuccess={handleConnectionSuccess}
      />
      {isConnected && (
        <Layout hideNavigation={false}>
          {renderCurrentView()}
        </Layout>
      )}
      {!isConnected && !showDatabaseSetup && (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Configurando conexão...</h1>
            <p className="text-muted-foreground">Por favor, aguarde.</p>
          </div>
        </div>
      )}
    </>
  )
}

export default Index
