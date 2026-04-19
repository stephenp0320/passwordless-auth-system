import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.tsx'
import Admin from './Admin_dashboard.tsx'
import PasskeyManager from './PasskeyManager.tsx'
import Recovery from './Recovery.tsx'
import { ThemeProvider } from './ThemeContext.tsx'
// admin screen route
createRoot(document.getElementById('root')!).render(
  // <StrictMode>
    <ThemeProvider>
    <Toaster position="top-center" />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/passkeys/:username" element={<PasskeyManager />} />
        <Route path="/recover" element={<Recovery />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  // </StrictMode>,
)
