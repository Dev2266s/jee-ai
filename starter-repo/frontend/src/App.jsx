import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import Dashboard from './pages/Dashboard'
import Practice from './pages/Practice'
import Tutor from './pages/Tutor'
import Analytics from './pages/Analytics'
import Layout from './components/Layout'
import Loading from './components/Loading'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/tutor" element={<Tutor />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

export default App