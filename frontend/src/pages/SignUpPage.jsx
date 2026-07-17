import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Eye, EyeOff, Loader2, Building2, CheckCircle2 } from 'lucide-react';
import useStore from '../store/useStore';
import { authService, companyService } from '../services/api';
import { getMsalInstance, loginRequest } from '../services/msalConfig';
import { googleSignInPopup } from '../services/googleConfig';
import './AuthPages.css';

const SignUpPage = () => {
  const navigate = useNavigate();
  const { login } = useStore();

  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '', company_id: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState([]);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    companyService.listPublic().then(setCompanies).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (!formData.company_id) {
      setError('Please select your company');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setIsLoading(true);
    try {
      await authService.signup(formData.name, formData.email, formData.password, formData.company_id);
      setRegistered(true);
    } catch (err) {
      const message = err.response?.data?.error || 'Sign up failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const accessToken = await googleSignInPopup();
      const response = await authService.googleLogin(accessToken);
      login(response.user, response.token);
      toast.success(`Welcome, ${response.user.name}!`);
      navigate(response?.user?.must_change_password ? '/first-login-password' : '/dashboard');
    } catch (err) {
      if (err?.type === 'popup_closed') return;
      const message = err.response?.data?.error || err.message || 'Google sign-up failed.';
      setError(message);
      toast.error(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleMicrosoftRegister = async () => {
    setError('');
    setMsLoading(true);
    try {
      const msalInstance = getMsalInstance();
      await msalInstance.initialize();
      const result = await msalInstance.loginPopup(loginRequest);
      const response = await authService.microsoftLogin(result.accessToken);
      login(response.user, response.token);
      toast.success(`Welcome, ${response.user.name}!`);
      navigate(response?.user?.must_change_password ? '/first-login-password' : '/dashboard');
    } catch (err) {
      const silentCodes = ['user_cancelled', 'access_denied'];
      if (silentCodes.includes(err?.errorCode)) return;
      const message = err.response?.data?.error || err.errorMessage || err.message || 'Microsoft sign-up failed.';
      setError(message);
      toast.error(message);
    } finally {
      setMsLoading(false);
    }
  };

  const busy = isLoading || msLoading || googleLoading;

  // ── Post-registration pending screen ──
  if (registered) {
    return (
      <div className="auth-page auth-split-page">
        <div className="auth-left-panel">
          <div className="auth-form-wrapper" style={{ textAlign: 'center', paddingTop: 60 }}>
            <div style={{ marginBottom: 20 }}>
              <CheckCircle2 size={56} color="#00ca72" />
            </div>
            <h2 style={{ marginBottom: 10 }}>Registration submitted</h2>
            <p style={{ color: '#6b7280', fontSize: 15, maxWidth: 380, margin: '0 auto 24px' }}>
              Your account is pending approval by your company admin. You will be able to log in once they approve your request.
            </p>
            <Link to="/login" className="btn-primary" style={{ display: 'inline-block', padding: '10px 28px', borderRadius: 8 }}>
              Back to login
            </Link>
          </div>
        </div>
        <div className="auth-right-panel auth-right-panel--signup">
          <div className="auth-right-grid" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page auth-split-page">

      {/* ── Left panel: registration form ── */}
      <div className="auth-left-panel">
        <div className="auth-form-wrapper">

          <div className="auth-logo auth-logo-left">
            <img src="/assets/logo.png" alt="Theta Pulse Logo" className="auth-logo-icon-sm" />
          </div>

          <div className="auth-header auth-header-left" style={{ marginBottom: 14 }}>
            <h2>Create account</h2>
            <p>Join the Theta Dynamics Platform</p>
          </div>

          {/* Social register buttons */}
          <div className="auth-social-buttons" style={{ marginBottom: 14 }}>
            <button className="btn-social btn-google" onClick={handleGoogleRegister} disabled={busy}>
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

            <button className="btn-social btn-microsoft" onClick={handleMicrosoftRegister} disabled={busy}>
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

          <div className="auth-divider"><span>OR</span></div>

          <form onSubmit={handleSubmit} className="auth-form signup-form">
            {error && <div className="error-message">{error}</div>}

            {/* Name + Email row */}
            <div className="signup-row">
              <div className="form-group">
                <label htmlFor="name">Full name</label>
                <div className="input-wrapper">
                  <User size={16} className="input-icon" />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={handleChange}
                    autoComplete="name"
                    disabled={busy}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <div className="input-wrapper">
                  <Mail size={16} className="input-icon" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    disabled={busy}
                  />
                </div>
              </div>
            </div>

            {/* Company */}
            <div className="form-group">
              <label htmlFor="company_id">Company</label>
              <div className="input-wrapper">
                <Building2 size={16} className="input-icon" />
                <select
                  id="company_id"
                  name="company_id"
                  value={formData.company_id}
                  onChange={handleChange}
                  disabled={busy}
                  style={{ paddingLeft: 36, width: '100%', height: 40, border: '1px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: 14, color: formData.company_id ? '#111827' : '#9ca3af', appearance: 'auto' }}
                >
                  <option value="">Select your company</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password + Confirm row */}
            <div className="signup-row">
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    placeholder="Min. 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    disabled={busy}
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} disabled={busy}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm password</label>
                <div className="input-wrapper">
                  <Lock size={16} className="input-icon" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    placeholder="Repeat password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    disabled={busy}
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={busy}>
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="terms">
              <label className="checkbox-label">
                <input type="checkbox" required disabled={busy} />
                <span>
                  I agree to the{' '}
                  <button type="button" className="link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
                    Terms of Service
                  </button>
                  {' '}and{' '}
                  <button type="button" className="link" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
                    Privacy Policy
                  </button>
                </span>
              </label>
            </div>

            <button type="submit" className="btn-primary btn-block" disabled={busy}>
              {isLoading
                ? <><Loader2 size={20} className="spinning" /> Creating account...</>
                : 'Create account'
              }
            </button>
          </form>

          <div className="auth-links-row" style={{ justifyContent: 'center', marginTop: 12 }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Already have an account?</span>
            <Link to="/login" className="forgot-link" style={{ marginLeft: 6 }}>Sign in</Link>
          </div>

        </div>
      </div>

      {/* ── Right panel: decorative ── */}
      <div className="auth-right-panel auth-right-panel--signup">
        <div className="auth-right-grid" aria-hidden="true" />
        <div className="auth-right-content">
          <div className="auth-security-card">
            <div className="auth-security-icon">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#2d7a4f" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div className="auth-deco-circle auth-deco-green" aria-hidden="true" />
            <div className="auth-deco-circle auth-deco-purple" aria-hidden="true" />
          </div>
          <h3 className="auth-right-title">Built for project teams of every size</h3>
          <p className="auth-right-desc">
            Manage schedules, track deviations, and collaborate — all in one unified platform trusted by EPC teams.
          </p>
        </div>
      </div>

    </div>
  );
};

export default SignUpPage;
