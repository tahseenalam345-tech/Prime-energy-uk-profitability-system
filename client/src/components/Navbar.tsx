import React, { useRef, useEffect } from 'react';
import { Flame, Calculator, ClipboardCheck, Users, FileText, Package, Tag, BookOpen, BarChart3, Settings, Shield, Sun, Moon } from 'lucide-react';
import { User } from '../types.js';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  currentUser: User | null;
  allUsers: User[];
  onSwitchUser: (userId: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  allUsers,
  onSwitchUser,
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'new-lead', label: 'New Lead (Mode A)', icon: Calculator },
    { id: 'after-survey', label: 'After Survey (Mode B)', icon: ClipboardCheck },
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'quotes', label: 'Quotes & Snapshots', icon: FileText },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'pricing', label: 'Pricing & Sources', icon: Tag },
    { id: 'rules', label: 'Rules & BUS', icon: BookOpen },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'admin', label: 'Admin & Audit', icon: Settings }
  ];

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

          <div className="role-pill">
            <Shield size={15} color="#34d399" />
            <span>Role:</span>
            <select
              className="role-select"
              value={currentUser?.id || ''}
              onChange={(e) => onSwitchUser(e.target.value)}
            >
              {allUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role_name})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <nav className="navbar-nav">
        {navItems.map((item) => {
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
