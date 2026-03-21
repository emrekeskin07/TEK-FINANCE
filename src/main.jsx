import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { PrivacyProvider } from './context/PrivacyContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <PrivacyProvider>
        <App />
      </PrivacyProvider>
    </BrowserRouter>
  </StrictMode>,
)
