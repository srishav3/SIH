import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [userId, setUserId] = useState(() => location.state?.prefilledUserId || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanId = userId.trim().toUpperCase();

    if (!cleanId) {
      setError('Please enter your 10-character User ID.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(cleanId, password);

      if (result.success && result.user) {
        navigate('/');
      } else {
        setError(result.error || 'Invalid credentials. Please verify your User ID and password.');
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred during sign-in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 120px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div className="minimal-card" style={{ width: '100%', maxWidth: '420px', padding: '36px 32px' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '1.45rem', fontWeight: '600', color: 'var(--text)', marginBottom: '6px', letterSpacing: '-0.01em' }}>
            Sign In
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Enter your assigned User ID and password
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="alert-box alert-danger" style={{ marginBottom: '20px' }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* User ID field */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="input-label" style={{ margin: 0 }}>User ID</label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>e.g. TAXYZW1234</span>
            </div>
            <input
              type="text"
              placeholder="10-character ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value.toUpperCase())}
              autoFocus
              className="input-field"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}
            />
          </div>

          {/* Password field */}
          <div style={{ marginBottom: '24px' }}>
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
            style={{ width: '100%', padding: '11px', marginBottom: '20px' }}>
            {isSubmitting ? 'Authenticating...' : 'Sign In'}
            <ArrowRight size={16} />
          </button>

          {/* Navigation link */}
          <div style={{ textAlign: 'center', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--text)', textDecoration: 'underline', fontWeight: '500' }}>
              Register
            </Link>
          </div>
        </form>

      </div>
    </div>
  );
}
