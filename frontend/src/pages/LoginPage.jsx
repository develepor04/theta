import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import useStore from '../store/useStore';
import { authService } from '../services/api';
import { getMsalInstance, loginRequest, TEAMS_DOMAIN } from '../services/msalConfig';
import { googleSignInPopup } from '../services/googleConfig';
import './AuthPages.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useStore();
  const formRef = useRef(null);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isTeamsDomain = formData.email.toLowerCase().endsWith(`@${TEAMS_DOMAIN}`);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const isAccountDomain = window.location.hostname === 'account.thetapulse.ai';

  const redirectAfterLogin = (token, mustChangePassword, role, companyName) => {
    const isDescon = companyName?.toLowerCase() === 'descon';
    if (isAccountDomain && !mustChangePassword) {
      window.location.href = `https://pulse.thetadynamics.io/auth-transfer?token=${encodeURIComponent(token)}`;
    } else if (mustChangePassword) {
      navigate('/first-login-password');
    } else if (role === 'user' || role === 'manager') {
      navigate('/reports');
    } else if (!isDescon) {
      navigate('/overview');
    } else {
      navigate('/dashboard');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }
    setIsLoading(true);
    try {
      const response = await authService.login(formData.email, formData.password);
      login(response.user, response.token);
      toast.success(`Welcome back, ${response.user.name}!`);
      redirectAfterLogin(response.token, response?.user?.must_change_password, response?.user?.role, response?.user?.company_name);
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setError('');
    setMsLoading(true);
    try {
      const msalInstance = getMsalInstance();
      await msalInstance.initialize();
      const result = await msalInstance.loginPopup(loginRequest);
      const accessToken = result.accessToken;

      const response = await authService.microsoftLogin(accessToken);
      login(response.user, response.token);
      toast.success(`Welcome, ${response.user.name}!`);
      redirectAfterLogin(response.token, response?.user?.must_change_password, response?.user?.role, response?.user?.company_name);
    } catch (err) {
      const silentCodes = ['user_cancelled', 'access_denied'];
      if (silentCodes.includes(err?.errorCode)) return;
      const message = err.response?.data?.error || err.errorMessage || err.message || 'Microsoft sign-in failed.';
      setError(message);
      toast.error(message);
    } finally {
      setMsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const accessToken = await googleSignInPopup();
      const response = await authService.googleLogin(accessToken);
      login(response.user, response.token);
      toast.success(`Welcome, ${response.user.name}!`);
      redirectAfterLogin(response.token, response?.user?.must_change_password, response?.user?.role, response?.user?.company_name);
    } catch (err) {
      if (err?.type === 'popup_closed') return;
      const message = err.response?.data?.error || err.message || 'Google sign-in failed.';
      setError(message);
      toast.error(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page auth-split-page">

      {/* ── Left panel: login form ── */}
      <div className="auth-left-panel">
        <div className="auth-form-wrapper" ref={formRef}>

          <div className="auth-logo auth-logo-left">
            <img src="/assets/thete_ai_logo.png" alt="Theta Pulse Logo" className="auth-logo-inline" />
          </div>

          <div className="auth-header auth-header-left">
            <h2>Log in</h2>
            <p>Access the Theta Dynamics Platform</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="email">Phone number, user name, or email address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  disabled={isLoading || msLoading}
                />
              </div>
            </div>

            {isTeamsDomain ? (
              <div className="teams-sso-block">
                <p className="teams-sso-hint">Your organisation uses Microsoft Teams for sign-in.</p>
                <button
                  type="button"
                  className="btn-ms-teams"
                  onClick={handleMicrosoftLogin}
                  disabled={msLoading}
                >
                  {msLoading ? (
                    <><Loader2 size={18} className="spinning" /> Signing in…</>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
                        <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                        <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                        <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                        <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                      </svg>
                      Sign in with Microsoft Teams
                    </>
                  )}
                </button>
                <Link to="/forgot-password" className="forgot-link" style={{ marginTop: 4 }}>Forgot password?</Link>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label htmlFor="password">Your password</label>
                  <div className="input-wrapper">
                    <Lock size={18} className="input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <label className="checkbox-label" style={{ marginTop: -4 }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    disabled={isLoading}
                  />
                  <span>Keep me logged in</span>
                </label>

                <button type="submit" className="btn-primary btn-block" disabled={isLoading}>
                  {isLoading
                    ? <><Loader2 size={20} className="spinning" /> Signing in...</>
                    : 'Log in'
                  }
                </button>
              </>
            )}
          </form>

          <div className="auth-links-row">
            <Link to="/forgot-password" className="forgot-link">Forgot your password?</Link>
            <Link to="/signup" className="forgot-link">New? Register</Link>
          </div>

          <div className="auth-divider"><span>OR</span></div>

          <div className="auth-social-buttons">
            <button
              className="btn-social btn-google"
              onClick={handleGoogleLogin}
              disabled={googleLoading || isLoading || msLoading}
            >
              {googleLoading ? <Loader2 size={18} className="spinning" /> : (
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              )}
              Continue with Google
            </button>

            <button
              className="btn-social btn-microsoft"
              onClick={handleMicrosoftLogin}
              disabled={msLoading || isLoading || googleLoading}
            >
              {msLoading ? <Loader2 size={18} className="spinning" /> : (
                <svg width="18" height="18" viewBox="0 0 21 21" fill="none" aria-hidden="true">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
              )}
              Continue with Microsoft
            </button>
          </div>

        </div>
      </div>

      {/* ── Right panel: decorative ── */}
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

export default LoginPage;
