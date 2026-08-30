import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './theme.css'
import App from './App.tsx'
import { SettingsProvider } from './context/SettingsContext.tsx'
import { BudgetDataProvider } from './context/BudgetDataContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <BudgetDataProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <App />
        </BrowserRouter>
      </BudgetDataProvider>
    </SettingsProvider>
  </StrictMode>,
)
