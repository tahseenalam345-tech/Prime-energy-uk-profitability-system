import React, { useState } from 'react';
import { Flame, Lock, Mail, AlertCircle, LogIn, Sun, Moon, Shield } from 'lucide-react';
import { api } from '../services/api.js';
import { User } from '../types.js';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  onCancel?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onCancel,
  theme,
  onToggleTheme
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email address and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.login(email.trim(), password);
      if (res.error) {
        setError(res.error || 'Authentication failed. Please check your credentials.');
      } else if (res.user && res.token) {
        onLoginSuccess(res.user);
      } else {
        setError('Login failed: Invalid server response.');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to connect to authentication service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '24px',
      background: theme === 'dark' ? 'radial-gradient(circle at top, #111827 0%, #030712 100%)' : 'radial-gradient(circle at top, #f8fafc 0%, #e2e8f0 100%)',
      color: theme === 'dark' ? '#f3f4f6' : '#1f2937'
    }}>
      {/* Top Header Controls */}
      <div style={{ position: 'absolute', top: '24px', right: '24px', display: 'flex', gap: '12px' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: theme === 'dark' ? '1px solid #374151' : '1px solid #cbd5e1',
              background: theme === 'dark' ? '#1f2937' : '#ffffff',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            ← Return to App (Read-Only Mode)
          </button>
        )}
        <button
          type="button"
          onClick={onToggleTheme}
          className="theme-toggle-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '8px',
            border: theme === 'dark' ? '1px solid #374151' : '1px solid #cbd5e1',
            background: theme === 'dark' ? '#1f2937' : '#ffffff',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500
          }}
        >
          {theme === 'dark' ? <Sun size={15} color="#fbbf24" /> : <Moon size={15} color="#475569" />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>

      <div style={{
        width: '100%',
        maxWidth: '440px',
        borderRadius: '16px',
        padding: '36px 32px',
        background: theme === 'dark' ? 'rgba(17, 24, 39, 0.85)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(16px)',
        boxShadow: theme === 'dark' ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.08)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)'
      }}>
        {/* Logo and Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 10px 15px -3px rgba(5, 150, 105, 0.4)'
          }}>
            <Flame size={28} color="#ffffff" />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            PRIME ENERGY <span style={{ color: '#10b981' }}>UK</span>
          </h1>
          <p style={{ fontSize: '13px', color: theme === 'dark' ? '#9ca3af' : '#6b7280', margin: 0 }}>
            Heat Pump Profitability & Commercial System
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '13px',
            marginBottom: '20px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: theme === 'dark' ? '#d1d5db' : '#374151', marginBottom: '6px' }}>
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  borderRadius: '10px',
                  border: theme === 'dark' ? '1px solid #374151' : '1px solid #d1d5db',
                  background: theme === 'dark' ? '#1f2937' : '#ffffff',
                  color: 'inherit',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: theme === 'dark' ? '#d1d5db' : '#374151', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                style={{
                  width: '100%',
                  padding: '11px 12px 11px 38px',
                  borderRadius: '10px',
                  border: theme === 'dark' ? '1px solid #374151' : '1px solid #d1d5db',
                  background: theme === 'dark' ? '#1f2937' : '#ffffff',
                  color: 'inherit',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)',
              marginTop: '6px'
            }}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <LogIn size={16} />
                <span>Sign In to System</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

