import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Mail, Shield, Key, Save, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import useStore from '../store/useStore';
import Sidebar from '../components/Sidebar';
import { authService } from '../services/api';
import './Profile.css';

const ROLE_LABELS = {
  user: 'User',
  manager: 'Manager',
  company_admin: 'Company Admin',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('account');

  const [name, setName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name cannot be empty'); return; }
    setIsSavingProfile(true);
    try {
      await updateUserProfile({ name: name.trim() });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('All password fields are required'); return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match'); return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters'); return;
    }
    setIsSavingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to change password');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const tabs = [
    { key: 'account',  label: 'Account',  icon: User },
    { key: 'security', label: 'Security', icon: Key  },
  ];

  return (
    <div className="profile-page">
      <button
        className="mobile-menu-button"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
        type="button"
      >
        {isMobileMenuOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      <div className={`mobile-sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`} onClick={() => setIsMobileMenuOpen(false)} />
      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="profile-main">
        <div className="profile-content" style={{ maxWidth: 560 }}>
          {/* Header */}
          <div className="profile-header-row">
            <button className="profile-back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <h1 className="profile-title">My Profile</h1>
              <p className="profile-subtitle">Manage your account details and security</p>
            </div>
          </div>

          {/* Avatar strip */}
          <div className="profile-avatar-row" style={{ marginBottom: 24 }}>
            <div className="profile-avatar-large">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="profile-avatar-name">{user?.name}</div>
              <div className="profile-avatar-role">{ROLE_LABELS[user?.role] || user?.role || 'User'}</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', borderRadius: 10, padding: 4 }}>
            {tabs.map(({ key, label, icon: Icon }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '8px 0', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    background: active ? '#fff' : 'transparent',
                    color: active ? '#0f172a' : '#64748b',
                    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.09)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <Icon size={14} /> {label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="profile-card">
            {activeTab === 'account' && (
              <>
                <div className="profile-card-header">
                  <div className="profile-card-icon"><User size={18} /></div>
                  <div>
                    <h2 className="profile-card-title">Account Information</h2>
                    <p className="profile-card-subtitle">Update your display name</p>
                  </div>
                </div>
                <form onSubmit={handleSaveProfile} className="profile-form">
                  <div className="profile-field">
                    <label className="profile-label"><User size={13} /> Display Name</label>
                    <input
                      type="text" className="profile-input" value={name}
                      onChange={(e) => setName(e.target.value)} placeholder="Your name"
                    />
                  </div>
                  <div className="profile-field">
                    <label className="profile-label"><Mail size={13} /> Email Address</label>
                    <input
                      type="email" className="profile-input profile-input--readonly"
                      value={user?.email || ''} readOnly tabIndex={-1}
                    />
                    <span className="profile-field-hint">Email cannot be changed</span>
                  </div>
                  <div className="profile-field">
                    <label className="profile-label"><Shield size={13} /> Role</label>
                    <input
                      type="text" className="profile-input profile-input--readonly"
                      value={ROLE_LABELS[user?.role] || user?.role || 'User'} readOnly tabIndex={-1}
                    />
                  </div>
                  <button type="submit" className="profile-save-btn" disabled={isSavingProfile}>
                    <Save size={15} /> {isSavingProfile ? 'Saving…' : 'Save Changes'}
                  </button>
                </form>
              </>
            )}

            {activeTab === 'security' && (
              <>
                <div className="profile-card-header">
                  <div className="profile-card-icon profile-card-icon--key"><Key size={18} /></div>
                  <div>
                    <h2 className="profile-card-title">Change Password</h2>
                    <p className="profile-card-subtitle">Update your account password</p>
                  </div>
                </div>
                <form onSubmit={handleChangePassword} className="profile-form">
                  <div className="profile-field">
                    <label className="profile-label">Current Password</label>
                    <div className="profile-input-wrap">
                      <input
                        type={showCurrent ? 'text' : 'password'} className="profile-input"
                        value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password" autoComplete="current-password"
                      />
                      <button type="button" className="profile-eye-btn" onClick={() => setShowCurrent(v => !v)} tabIndex={-1}>
                        {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="profile-field">
                    <label className="profile-label">New Password</label>
                    <div className="profile-input-wrap">
                      <input
                        type={showNew ? 'text' : 'password'} className="profile-input"
                        value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters" autoComplete="new-password"
                      />
                      <button type="button" className="profile-eye-btn" onClick={() => setShowNew(v => !v)} tabIndex={-1}>
                        {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="profile-field">
                    <label className="profile-label">Confirm New Password</label>
                    <div className="profile-input-wrap">
                      <input
                        type={showConfirm ? 'text' : 'password'} className="profile-input"
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password" autoComplete="new-password"
                      />
                      <button type="button" className="profile-eye-btn" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                        {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="profile-save-btn profile-save-btn--key" disabled={isSavingPassword}>
                    <Key size={15} /> {isSavingPassword ? 'Updating…' : 'Update Password'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
