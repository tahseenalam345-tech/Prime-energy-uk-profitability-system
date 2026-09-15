import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { LoginView } from './views/LoginView.js';
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
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

  // Ensure page always opens from the very top on tab change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentTab]);

  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Restore Authentication Session on Mount
  useEffect(() => {
    async function restoreSession() {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('prime_energy_token') : null;
      if (token) {
        try {
          const res = await api.me();
          if (res && res.user) {
            setCurrentUser(res.user);
          } else {
            if (typeof localStorage !== 'undefined') localStorage.removeItem('prime_energy_token');
            setCurrentUser(null);
          }
        } catch (err) {
          if (typeof localStorage !== 'undefined') localStorage.removeItem('prime_energy_token');
          setCurrentUser(null);
        }
      }
      setAuthChecking(false);
    }
    restoreSession();
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setCurrentTab('dashboard');
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setCurrentTab('dashboard');
  };

  const handleSelectLeadForCalc = (lead: Lead) => {
    setCurrentTab('new-lead');
  };

  const handleQuoteSaved = (quoteId: string) => {
    // Optionally switch tab
  };

  // Loading spinner during initial auth restoration check
  if (authChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme === 'dark' ? '#030712' : '#f8fafc',
        color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(5, 150, 105, 0.2)',
          borderTop: '3px solid #10b981',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        <p style={{ marginTop: '16px', fontSize: '14px', fontWeight: 500, color: '#10b981' }}>
          Verifying Prime Energy Session...
        </p>
      </div>
    );
  }

  // Unauthenticated User -> Render Login Page
  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  // Authenticated User -> Render Main Application
  return (
    <div className="app-container">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      <main key={currentTab} className="main-content page-fade-in">
        {currentTab === 'dashboard' && <DashboardView onNavigate={setCurrentTab} />}
        {currentTab === 'new-lead' && (
          <NewLeadView
            currentUserId={currentUser.id}
            onQuoteSaved={handleQuoteSaved}
          />
        )}
        {currentTab === 'after-survey' && (
          <AfterSurveyView
            currentUserId={currentUser.id}
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
