import { StrictMode, useEffect } from 'react'
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

  useEffect(() => {
    if (user) {
      pendo.identify({
        visitor: {
          id: user.email,
          email: user.email,
          full_name: user.name
        }
      });
    }
  }, [user]);

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
