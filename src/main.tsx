import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { NegocioProvider } from './context/NegocioContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <NegocioProvider>
          <App />
        </NegocioProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
