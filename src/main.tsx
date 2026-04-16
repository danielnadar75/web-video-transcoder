import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { LoginPage } from './features/auth/LoginPage'
import { useAuth } from './hooks/useAuth'

pendo.initialize({
  visitor: {
    id: ''
  }
});

function Root() {
  const { user, login, logout } = useAuth()

  if (!user) {
    return <LoginPage onLogin={login} />
  }

  return <App user={user} onLogout={logout} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
