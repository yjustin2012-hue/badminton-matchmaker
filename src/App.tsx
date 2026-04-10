import { useTranslation } from 'react-i18next'
import Layout from './app/Layout.tsx'
import { SessionProvider } from './context/SessionContext.tsx'
import './styles/globals.css'
import './i18n/config'

function App() {
  useTranslation()

  return (
    <SessionProvider>
      <Layout />
    </SessionProvider>
  )
}

export default App
