import React, { useRef, useEffect } from 'react';
import { Flame, Calculator, ClipboardCheck, Users, FileText, Package, Tag, BookOpen, BarChart3, Settings, Shield, Sun, Moon, LogOut, LogIn, Eye } from 'lucide-react';
import { User } from '../types.js';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onLogout,
  theme,
  onToggleTheme
}) => {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateNavHeight = () => {
      if (navRef.current) {
        const height = navRef.current.offsetHeight;
        document.documentElement.style.setProperty('--navbar-height', `${height}px`);
      }
    };
    updateNavHeight();
    window.addEventListener('resize', updateNavHeight);
    return () => window.removeEventListener('resize', updateNavHeight);
  }, []);

  const role = currentUser?.role_name || currentUser?.role || 'READ_ONLY';

  // Navigation Items with explicit role permissions
  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, roles: ['ADMIN', 'ESTIMATOR', 'SALES', 'SURVEYOR', 'READ_ONLY'] },
    { id: 'new-lead', label: 'New Lead (Mode A)', icon: Calculator, roles: ['ADMIN', 'ESTIMATOR', 'SALES'] },
    { id: 'after-survey', label: 'After Survey (Mode B)', icon: ClipboardCheck, roles: ['ADMIN', 'ESTIMATOR', 'SURVEYOR'] },
    { id: 'leads', label: 'Leads / Jobs', icon: Users, roles: ['ADMIN', 'ESTIMATOR', 'SALES', 'SURVEYOR', 'READ_ONLY'] },
    { id: 'quotes', label: 'Quotes & Snapshots', icon: FileText, roles: ['ADMIN', 'ESTIMATOR', 'SALES', 'SURVEYOR', 'READ_ONLY'] },
    { id: 'products', label: 'Products', icon: Package, roles: ['ADMIN', 'ESTIMATOR', 'SALES', 'SURVEYOR', 'READ_ONLY'] },
    { id: 'pricing', label: 'Pricing & Sources', icon: Tag, roles: ['ADMIN', 'ESTIMATOR', 'SALES', 'SURVEYOR', 'READ_ONLY'] },
    { id: 'rules', label: 'Rules & BUS', icon: BookOpen, roles: ['ADMIN', 'ESTIMATOR', 'SALES', 'SURVEYOR', 'READ_ONLY'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'ESTIMATOR', 'SALES', 'SURVEYOR', 'READ_ONLY'] },
    { id: 'admin', label: 'Admin & Users', icon: Settings, roles: ['ADMIN'] }
  ];

  const allowedItems = allNavItems.filter(item => {
    // If not logged in, allow default READ_ONLY tabs
    if (!currentUser) {
      return ['dashboard', 'leads', 'quotes', 'products', 'pricing', 'rules', 'reports'].includes(item.id);
    }
    return item.roles.includes(role);
  });

  return (
    <header className="navbar" ref={navRef}>
      <div className="navbar-top">
        <a href="#dashboard" onClick={() => setCurrentTab('dashboard')} className="brand-logo">
          <div style={{ background: '#059669', padding: '6px', borderRadius: '8px', display: 'flex' }}>
            <Flame size={20} color="#ffffff" />
          </div>
          <span>PRIME ENERGY <span style={{ color: '#34d399' }}>UK</span></span>
          <span className="brand-badge">Profitability System</span>
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={onToggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="#cbd5e1" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="role-pill" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(5, 150, 105, 0.15)', border: '1px solid rgba(52, 211, 153, 0.3)', color: '#34d399', fontSize: '13px', fontWeight: 600 }}>
                <Shield size={14} color="#34d399" />
                <span>{currentUser.name} ({role})</span>
              </div>

              <button
                type="button"
                onClick={onLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Log out of system"
              >
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', fontSize: '13px', fontWeight: 600 }}>
                <Eye size={14} color="#60a5fa" />
                <span>READ-ONLY MODE</span>
              </div>

              <button
                type="button"
                onClick={() => setCurrentTab('login')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
                }}
                title="Sign in to unlock write access"
              >
                <LogIn size={14} />
                <span>Login</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <nav className="navbar-nav">
        {allowedItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`nav-link nav-tab-${item.id} ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} className="nav-tab-icon" />
              <span>{item.label}</span>
            </button>
          );
        })}

      </nav>
    </header>
  );
};

