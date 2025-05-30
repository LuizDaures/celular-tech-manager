import { useEffect, useState } from 'react'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/components/Dashboard'
import { ClientesList } from '@/components/ClientesList'
import { TecnicosList } from '@/components/TecnicosList'
import { PecasList } from '@/components/PecasList'
import { OrdensList } from '@/components/OrdensList'
import { Configuracoes } from '@/components/Configuracoes'

const Index = () => {
  const [currentView, setCurrentView] = useState('')

  useEffect(() => {
    const config = localStorage.getItem('supabase_config')
    if (!config) {
      window.location.hash = '#configuracoes'
    }

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      setCurrentView(hash || 'dashboard')
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)

    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

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
    <Layout hideNavigation={!isConnected}>
      {renderCurrentView()}
    </Layout>
  )
}

export default Index
