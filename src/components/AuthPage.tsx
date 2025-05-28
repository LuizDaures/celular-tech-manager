
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { LoginForm } from '@/components/LoginForm'

export function AuthPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(null)

  useEffect(() => {
    // Verificar se já há uma sessão ativa
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        navigate('/')
      }
    })

    // Escutar mudanças na autenticação
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        navigate('/')
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleAuthSuccess = () => {
    navigate('/')
  }

  if (session) {
    return null // ou um loading spinner
  }

  return <LoginForm onSuccess={handleAuthSuccess} />
}
