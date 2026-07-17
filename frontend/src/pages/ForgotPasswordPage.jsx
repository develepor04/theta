import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { authService } from '../services/api';
import './AuthPages.css';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const token = useMemo(() => (searchParams.get('token') || '').trim(), [searchParams]);
  const isResetMode = token.length > 0;

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [generatedResetLink, setGeneratedResetLink] = useState('');

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setGeneratedResetLink('');

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.forgotPassword(email.trim());
      setSuccessMessage(response?.message || 'If the account exists, a reset link has been sent.');
      if (response?.reset_link) {
        setGeneratedResetLink(response.reset_link);
        toast.success('Reset link generated below');
      } else {
        toast.success('Request processed successfully');
      }
    } catch (err) {
      const message = err.response?.data?.error || 'Unable to process request right now.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!newPassword || !confirmPassword) {
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
      const response = await authService.resetPassword(token, newPassword);
      const msg = response?.message || 'Password reset successful. You can now sign in.';
      setSuccessMessage(msg);
      toast.success('Password reset successful');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      const message = err.response?.data?.error || 'Reset link is invalid or expired.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo">
            <img src="/assets/logo.png" alt="Theta Pulse Logo" className="auth-logo-icon" />
          </div>

          <div className="auth-header">
            <h2>{isResetMode ? 'Set New Password' : 'Reset Password'}</h2>
            <p>
              {isResetMode
                ? 'Enter your new password below.'
                : 'Enter your account email and we will send a reset link.'}
            </p>
          </div>

          <form onSubmit={isResetMode ? handleResetSubmit : handleForgotSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}
            {/* {successMessage && <div className="success-message">{successMessage}</div>} */}
            {generatedResetLink && (
              <div className="success-message" style={{ display: 'block' }}>
                <div style={{ marginBottom: '6px' }}>Use this link to reset your password now:</div>
                <a href={generatedResetLink} className="forgot-link">Open reset password link</a>
              </div>
            )}

            {!isResetMode ? (
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrapper">
                  <Mail size={20} className="input-icon" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    disabled={isLoading}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="input-wrapper">
                    <Lock size={20} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="newPassword"
                      name="newPassword"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <div className="input-wrapper">
                    <Lock size={20} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn-primary btn-block" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={20} className="spinning" />
                  Processing...
                </>
              ) : isResetMode ? (
                'Set New Password'
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <div className="auth-footer">
            <Link to="/login" className="back-link">← Back to Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
