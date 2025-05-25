
import { useState } from 'react'
import { Layout } from '@/components/Layout'
import { Dashboard } from '@/components/Dashboard'
import { ClientesList } from '@/components/ClientesList'

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
        return <div className="text-center py-8">Gestão de Técnicos (Em desenvolvimento)</div>
      case 'ordens':
        return <div className="text-center py-8">Ordens de Serviço (Em desenvolvimento)</div>
      case 'configuracoes':
        return <div className="text-center py-8">Configurações (Em desenvolvimento)</div>
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
