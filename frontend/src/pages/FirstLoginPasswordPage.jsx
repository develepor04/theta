import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import useStore from '../store/useStore';
import { authService } from '../services/api';
import './AuthPages.css';

const FirstLoginPasswordPage = () => {
  const navigate = useNavigate();
  const { user, setUser } = useStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.changePassword(currentPassword, newPassword);
      const updatedUser = response?.user || { ...user, must_change_password: false };
      setUser(updatedUser);
      toast.success('Password updated successfully');
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.error || 'Unable to change password right now.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page auth-split-page">

      {/* ── Left panel: change-password form ── */}
      <div className="auth-left-panel">
        <div className="auth-form-wrapper">

          <div className="auth-logo auth-logo-left">
            <h1>Theta Pulse</h1>
            <img src="/assets/logo.png" alt="Theta Pulse Logo" className="auth-logo-inline" />
          </div>

          <div className="auth-header auth-header-left">
            <h2>Set your password</h2>
            <p>For security, please set a new password before continuing.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="currentPassword">Current password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  id="currentPassword"
                  name="currentPassword"
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setError(''); }}
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowCurrent(!showCurrent)}
                  disabled={isLoading}
                >
                  {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="newPassword">New password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type={showNew ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNew(!showNew)}
                  disabled={isLoading}
                >
                  {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm new password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type={showNew ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary btn-block" disabled={isLoading}>
              {isLoading
                ? <><Loader2 size={20} className="spinning" /> Updating...</>
                : 'Update password'
              }
            </button>
          </form>

        </div>
      </div>

      {/* ── Right panel: decorative (identical to LoginPage) ── */}
      <div className="auth-right-panel">
        <div className="auth-right-grid" aria-hidden="true" />
        <div className="auth-right-content">
          <div className="auth-orbit-container" aria-hidden="true">
            <div className="auth-orbit-ring auth-orbit-ring-sm" />
            <div className="auth-orbit-ring auth-orbit-ring-lg" />
            <div className="auth-security-card">
              <div className="auth-security-icon">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#1f5c38" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className="auth-deco-circle auth-deco-green" aria-hidden="true" />
              <div className="auth-deco-circle auth-deco-purple" aria-hidden="true" />
            </div>
          </div>
          <h3 className="auth-right-title">Secure access for every account</h3>
          <p className="auth-right-desc">
            Enterprise-grade authentication and unified sign-on, built into one trusted platform.
          </p>
        </div>
      </div>

    </div>
  );
};

export default FirstLoginPasswordPage;
