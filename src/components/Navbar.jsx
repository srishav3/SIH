import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon } from 'lucide-react';
import { useClerk } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { signOut } = useClerk();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      if (signOut) {
        await signOut();
      }
    } catch (err) {
      console.warn('Clerk sign out notice:', err);
    }
    logout();
    navigate('/login');
  };

  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      background: 'var(--surface)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      transition: 'background-color 0.2s ease, border-color 0.2s ease'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        
        {/* Brand */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '0.95rem'
          }}>
            Q
          </div>
          <div>
            <span style={{ fontSize: '1.05rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text)' }}>
              AuthentiQ
            </span>
          </div>
        </Link>

        {/* Right side controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          {/* Theme Switcher Toggle (Available on every page) */}
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label="Toggle theme">
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

              <Link 
                to="/account"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '6px 12px', 
                  borderRadius: 'var(--radius-sm)', 
                  background: 'var(--surface-subtle)', 
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  color: 'inherit'
                }}>
                <span style={{ fontSize: '0.84rem', fontWeight: '600', color: 'var(--text)' }}>
                  {currentUser.first_name || 'User'}
                </span>
                <span className={`badge ${currentUser.role === 'officer' ? 'badge-officer' : 'badge-traveller'}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                  {currentUser.role}
                </span>
              </Link>

              <button 
                onClick={handleLogout} 
                className="btn-subtle"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                title="Sign out">
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link 
                to="/login" 
                className="btn-secondary"
                style={{ padding: '7px 14px', fontSize: '0.84rem' }}>
                Sign In
              </Link>
              <Link 
                to="/signup" 
                className="btn-primary"
                style={{ padding: '7px 14px', fontSize: '0.84rem' }}>
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
