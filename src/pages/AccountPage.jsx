import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useClerk } from '@clerk/clerk-react';
import { useAuth } from '../context/AuthContext';
import { Copy, Check, LogOut, CheckCircle2, Shield, User as UserIcon } from 'lucide-react';

export default function AccountPage() {
  const { currentUser, logout } = useAuth();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const handleCopyId = () => {
    if (currentUser?.user_id) {
      navigator.clipboard.writeText(currentUser.user_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  const isOfficer = currentUser.role === 'officer';
  const fullName = `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || 'User';

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div className="minimal-card" style={{ width: '100%', maxWidth: '440px', padding: '36px 32px' }}>
        
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }}></span>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '500' }}>
              Active Session
            </span>
          </div>
          <span className={`badge ${isOfficer ? 'badge-officer' : 'badge-traveller'}`}>
            {isOfficer ? 'Officer' : 'Traveller'}
          </span>
        </div>

        {/* User Identity Info */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--surface-subtle)',
            border: '1px solid var(--border)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: 'var(--text)'
          }}>
            {isOfficer ? <Shield size={24} /> : <UserIcon size={24} />}
          </div>

          <h1 style={{ fontSize: '1.45rem', fontWeight: '600', color: 'var(--text)', marginBottom: '4px', letterSpacing: '-0.01em' }}>
            {fullName}
          </h1>
          <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
            Role: <strong style={{ color: 'var(--text)' }}>{currentUser.role}</strong>
          </p>
        </div>

        {/* Allocated User ID Card */}
        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Allocated User ID
            </span>
            <button
              onClick={handleCopyId}
              type="button"
              style={{
                background: 'none',
                border: 'none',
                color: copied ? 'var(--success)' : 'var(--text-muted)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.74rem'
              }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '1.25rem',
            fontWeight: '600',
            letterSpacing: '0.06em',
            color: 'var(--text)'
          }}>
            {currentUser.user_id}
          </div>
        </div>

        {/* Account Details List */}
        <div style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '16px 0', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.84rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>Email</span>
            <span style={{ color: 'var(--text)', fontWeight: '500' }}>{currentUser.email || '—'}</span>
          </div>
          {currentUser.phone && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.84rem' }}>
              <span style={{ color: 'var(--text-dim)' }}>Phone</span>
              <span style={{ color: 'var(--text)', fontWeight: '500' }}>{currentUser.phone}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.84rem' }}>
            <span style={{ color: 'var(--text-dim)' }}>Status</span>
            <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
              <CheckCircle2 size={14} /> Verified
            </span>
          </div>
        </div>

        {/* Actions */}
        <button
          onClick={handleLogout}
          className="btn-secondary"
          style={{ width: '100%', padding: '10px' }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>

      </div>
    </div>
  );
}
