
import { useState } from 'react'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/components/Dashboard'
import { ClientesList } from '@/components/ClientesList'
import { TecnicosList } from '@/components/TecnicosList'
import { PecasList } from '@/components/PecasList'
import { OrdensList } from '@/components/OrdensList'
import { Configuracoes } from '@/components/Configuracoes'

const Index = () => {
  const [currentView, setCurrentView] = useState('dashboard')

  // Listen to hash changes for navigation
  useState(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      if (hash) {
        setCurrentView(hash)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    handleHashChange() // Initialize on mount

    return () => window.removeEventListener('hashchange', handleHashChange)
  })

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

  return (
    <Layout>
      {renderCurrentView()}
    </Layout>
  )
}

export default Index
