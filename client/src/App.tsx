import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { DashboardView } from './views/DashboardView.js';
import { NewLeadView } from './views/NewLeadView.js';
import { AfterSurveyView } from './views/AfterSurveyView.js';
import { LeadsView } from './views/LeadsView.js';
import { QuotesView } from './views/QuotesView.js';
import { ProductsView } from './views/ProductsView.js';
import { PricingView } from './views/PricingView.js';
import { RulesView } from './views/RulesView.js';
import { ReportsView } from './views/ReportsView.js';
import { AdminView } from './views/AdminView.js';
import { api } from './services/api.js';
import { User, Lead } from './types.js';

export function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('prime_energy_theme');
        return saved === 'light' ? 'light' : 'dark';
      }
    } catch (e) {}
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('prime_energy_theme', theme);
  }, [theme]);

  // Ensure page always opens from the very top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentTab]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await api.getUsers();
        if (res.users && res.users.length > 0) {
          setUsers(res.users);
          // Default to Admin or Sales user
          const defaultUser = res.users.find((u: User) => u.role_name === 'ADMIN') || res.users[0];
          setCurrentUser(defaultUser);
        }
      } catch (err) {
        console.error('Failed to load users', err);
      }
    }
    loadUsers();
  }, []);

  const handleSwitchUser = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
    }
  };

  const handleSelectLeadForCalc = (lead: Lead) => {
    setCurrentTab('new-lead');
  };

  const handleQuoteSaved = (quoteId: string) => {
    // Optionally switch to quotes tab or stay
  };

  return (
    <div className="app-container">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        allUsers={users}
        onSwitchUser={handleSwitchUser}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <main key={currentTab} className="main-content page-fade-in">
        {currentTab === 'dashboard' && <DashboardView onNavigate={setCurrentTab} />}
        {currentTab === 'new-lead' && (
          <NewLeadView
            currentUserId={currentUser?.id || 'user_sales'}
            onQuoteSaved={handleQuoteSaved}
          />
        )}
        {currentTab === 'after-survey' && (
          <AfterSurveyView
            currentUserId={currentUser?.id || 'user_surveyor'}
            onQuoteSaved={handleQuoteSaved}
          />
        )}
        {currentTab === 'leads' && (
          <LeadsView onSelectLeadForCalc={handleSelectLeadForCalc} />
        )}
        {currentTab === 'quotes' && (
          <QuotesView currentUser={currentUser} />
        )}
        {currentTab === 'products' && <ProductsView />}
        {currentTab === 'pricing' && <PricingView currentUser={currentUser} />}
        {currentTab === 'rules' && <RulesView />}
        {currentTab === 'reports' && <ReportsView />}
        {currentTab === 'admin' && <AdminView currentUser={currentUser} onNavigate={setCurrentTab} />}
      </main>
    </div>
  );
}

export default App;
