import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Layout from './app/Layout.tsx'
import { SessionProvider } from './context/SessionContext.tsx'
import './styles/globals.css'
import './i18n/config'

function App() {
  const { i18n } = useTranslation()

  useEffect(() => {
    // Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('ServiceWorker registration failed: ', err)
      })
    }
  }, [])

  return (
    <SessionProvider>
      <Layout />
    </SessionProvider>
  )
}

export default App
