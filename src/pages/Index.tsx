
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

  useEffect(() => {
    const config = localStorage.getItem('supabase_config')
    
    if (!config) {
      setShowDatabaseSetup(true)
      return
    }

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      setCurrentView(hash || 'dashboard')
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleConnectionSuccess = () => {
    setShowDatabaseSetup(false)
    setCurrentView('dashboard')
    window.location.reload()
  }

  const renderCurrentView = () => {
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

  const isConnected = !!localStorage.getItem('supabase_config')

  return (
    <>
      <DatabaseSetupModal 
        isOpen={showDatabaseSetup} 
        onConnectionSuccess={handleConnectionSuccess}
      />
      <Layout hideNavigation={!isConnected}>
        {renderCurrentView()}
      </Layout>
    </>
  )
}

export default Index
