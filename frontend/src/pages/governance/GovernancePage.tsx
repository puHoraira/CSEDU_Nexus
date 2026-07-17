import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Shield, Scroll, Bell, BookOpen } from 'lucide-react';
import { EcTermsPage } from './EcTermsPage';
import { EcAppointmentsPage } from './EcAppointmentsPage';
import { EcPostsPage } from './EcPostsPage';
import { GovernanceNoticesPage } from './GovernanceNoticesPage';
import { ModeratorConstitutionEditorPage } from './ModeratorConstitutionEditorPage';
import { useAuth } from '../../auth/AuthContext';

type TabValue = 'terms' | 'appointments' | 'posts' | 'notices' | 'constitution';

const TABS: { value: TabValue; label: string; icon: React.ElementType; roles?: string[] }[] = [
  { value: 'terms', label: 'EC Terms', icon: FileText },
  { value: 'appointments', label: 'EC Appointments', icon: Shield },
  { value: 'posts', label: 'EC Posts', icon: Scroll },
  { value: 'notices', label: 'Notices', icon: Bell },
  { value: 'constitution', label: 'Constitution', icon: BookOpen, roles: ['Moderator', 'Chief Patron'] },
];

export function GovernancePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const defaultTab = (searchParams.get('tab') as TabValue) || 'terms';
  const [activeTab, setActiveTab] = useState<TabValue>(defaultTab);

  const visibleTabs = TABS.filter(tab => {
    if (!tab.roles) return true;
    if (!user) return false;
    return tab.roles.some(r => user.roles.includes(r));
  });

  const handleTabChange = (tab: TabValue) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  return (
    <div className="ui-page">
      <div className="ui-page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="ui-page-title">Governance</h1>
          <p className="ui-page-subtitle">Manage EC terms, appointments, posts, and constitution.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="ui-tabs" role="tablist" style={{ marginBottom: 24 }}>
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              role="tab"
              aria-selected={activeTab === tab.value}
              className={`ui-tab ${activeTab === tab.value ? 'ui-tab--active' : ''}`}
              onClick={() => handleTabChange(tab.value)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div role="tabpanel">
        {activeTab === 'terms' && <EcTermsPage />}
        {activeTab === 'appointments' && <EcAppointmentsPage />}
        {activeTab === 'posts' && <EcPostsPage />}
        {activeTab === 'notices' && <GovernanceNoticesPage />}
        {activeTab === 'constitution' && <ModeratorConstitutionEditorPage />}
      </div>
    </div>
  );
}
