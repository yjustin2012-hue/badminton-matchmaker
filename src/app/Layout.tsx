import { useState, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import clsx from 'clsx'
import CourtPage from '../pages/CourtPage.tsx'
import RankingsPage from '../pages/RankingsPage.tsx'
import HistoryPage from '../pages/HistoryPage.tsx'
import RostersPage from '../pages/RostersPage.tsx'
import SettingsPage from '../pages/SettingsPage.tsx'

export type TabId = 'court' | 'rankings' | 'history' | 'rosters' | 'settings'

interface TabButtonProps {
  label: string
  active: boolean
  onClick: () => void
}

function TabButton({ label, active, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'flex-1 py-3 px-4 text-sm font-semibold transition-all duration-200',
        active
          ? 'bg-blue-50 border-b-4 border-blue-600 text-blue-700 shadow-sm'
          : 'bg-white text-gray-700 hover:bg-gray-50 border-b-4 border-transparent'
      )}
    >
      {label}
    </button>
  )
}

export default function Layout() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<TabId>('court')

  return (
    <div className="flex flex-col h-screen w-screen">
      {/* Main content area */}
      <div className="flex-1 overflow-auto bg-white">
        {activeTab === 'court' && <CourtPage />}
        {activeTab === 'rankings' && <RankingsPage />}
        {activeTab === 'history' && <HistoryPage />}
        {activeTab === 'rosters' && <RostersPage />}
        {activeTab === 'settings' && <SettingsPage />}
      </div>

      {/* Bottom tab navigation */}
      <nav className="flex border-t border-gray-200 bg-white shadow-lg">
        <TabButton
          label={t('nav.court')}
          active={activeTab === 'court'}
          onClick={() => setActiveTab('court')}
        />
        <TabButton
          label={t('nav.rankings')}
          active={activeTab === 'rankings'}
          onClick={() => setActiveTab('rankings')}
        />
        <TabButton
          label={t('nav.history')}
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        />
        <TabButton
          label={t('nav.rosters')}
          active={activeTab === 'rosters'}
          onClick={() => setActiveTab('rosters')}
        />
        <TabButton
          label={t('nav.settings')}
          active={activeTab === 'settings'}
          onClick={() => setActiveTab('settings')}
        />
      </nav>
    </div>
  )
}
