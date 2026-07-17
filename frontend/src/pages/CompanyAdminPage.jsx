import React, { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Users, CheckCircle, XCircle, Clock, RefreshCw, Building2, ChevronDown, Menu, FolderOpen, Upload, Trash2, File } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import useStore from '../store/useStore';
import { companyService, kbService } from '../services/api';

const STATUS_LABELS = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };
const STATUS_COLORS = {
  pending:  { bg: '#fef3c7', text: '#92400e' },
  approved: { bg: '#d1fae5', text: '#065f46' },
  rejected: { bg: '#fee2e2', text: '#991b1b' },
};
const ROLE_OPTIONS = ['user', 'manager', 'company_admin'];
const ROLE_LABELS  = { user: 'User', manager: 'Manager', company_admin: 'Company Admin' };

// ── KB File Manager (shared between CompanyAdmin and SuperAdmin) ──────────────
const KBFilesManager = ({ companyId }) => {
  const [files, setFiles]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState({});
  const fileInputRef            = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await kbService.listFiles(companyId || undefined);
      setFiles(data.files || []);
    } catch {
      toast.error('Failed to load KB files');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await kbService.uploadFile(file, companyId || undefined);
      toast.success(`${file.name} uploaded`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete "${name}" from the Knowledge Base?`)) return;
    setDeleting(d => ({ ...d, [name]: true }));
    try {
      await kbService.deleteFile(name, companyId || undefined);
      toast.success(`${name} deleted`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(d => ({ ...d, [name]: false }));
    }
  };

  const fmt = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>
          Files uploaded here are used by the AI, dashboards, and deviation engine for this company.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}>
            <RefreshCw size={13} /> Refresh
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', cursor: uploading ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, opacity: uploading ? .7 : 1 }}
          >
            <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload File'}
          </button>
          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading…</div>
      ) : files.length === 0 ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
          <FolderOpen size={36} style={{ marginBottom: 10, opacity: .35 }} />
          <p style={{ margin: 0, fontSize: 14 }}>No files yet — upload your company's data files above.</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#d1d5db' }}>
            Supported: .xlsx, .json, .docx, .pptx and more
          </p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['File Name', 'Size', 'Last Modified', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {files.map((f, i) => (
                <tr key={f.name} style={{ borderTop: i > 0 ? '1px solid #f3f4f6' : 'none' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <File size={14} color="#9ca3af" />
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', fontFamily: 'monospace' }}>{f.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#6b7280' }}>{fmt(f.size_bytes)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: '#9ca3af' }}>
                    {new Date(f.modified_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(f.name)}
                      disabled={deleting[f.name]}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: deleting[f.name] ? 'not-allowed' : 'pointer', fontSize: 12, opacity: deleting[f.name] ? .6 : 1 }}
                    >
                      <Trash2 size={12} /> {deleting[f.name] ? '…' : 'Delete'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const CompanyAdminPage = () => {
  const { user } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await companyService.getCompanyUsers(filter || null);
      setUsers(data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (userId, name) => {
    setActionLoading(p => ({ ...p, [userId]: 'approve' }));
    try {
      await companyService.approveUser(userId);
      toast.success(`${name} approved`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to approve');
    } finally {
      setActionLoading(p => ({ ...p, [userId]: null }));
    }
  };

  const handleReject = async (userId, name) => {
    if (!window.confirm(`Reject registration for ${name}?`)) return;
    setActionLoading(p => ({ ...p, [userId]: 'reject' }));
    try {
      await companyService.rejectUser(userId);
      toast.success(`${name} rejected`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to reject');
    } finally {
      setActionLoading(p => ({ ...p, [userId]: null }));
    }
  };

  const handleRoleChange = async (userId, name, newRole) => {
    setActionLoading(p => ({ ...p, [`role-${userId}`]: true }));
    try {
      await companyService.updateUserRole(userId, newRole);
      toast.success(`${name}'s role updated to ${newRole}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update role');
    } finally {
      setActionLoading(p => ({ ...p, [`role-${userId}`]: false }));
    }
  };

  // Count pending across all loaded results (when filter = '')
  const pendingBadge = filter === '' ? users.filter(u => u.status === 'pending').length : null;

  const TABS = [
    { key: 'pending',  label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: '',         label: 'All' },
  ];

  return (
    <div className="profile-page">

      {/* Mobile hamburger */}
      <button
        className="mobile-menu-button"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle menu"
        type="button"
      >
        <Menu size={22} />
      </button>

      <div
        className={`mobile-sidebar-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />

      <main className="profile-main" style={{ maxWidth: '100%' }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Building2 size={24} color="#374151" />
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111827', margin: 0 }}>Company Admin</h1>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>Manage users and knowledge base files</p>
            </div>
          </div>
        </div>

        {/* ── Top-level tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f3f4f6', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {[{ key: 'users', label: 'User Management', icon: Users }, { key: 'kb', label: 'Knowledge Base', icon: FolderOpen }].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, transition: 'all .15s',
                background: activeTab === key ? '#fff' : 'transparent',
                color:      activeTab === key ? '#111827' : '#6b7280',
                boxShadow:  activeTab === key ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {activeTab === 'kb' && (
          <KBFilesManager companyId={user?.company_id} />
        )}

        {activeTab === 'users' && (
        <div>
        {/* ── Filter tabs ── */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f3f4f6', borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                padding: '7px 18px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 500, transition: 'all .15s',
                background: filter === tab.key ? '#fff' : 'transparent',
                color:      filter === tab.key ? '#111827' : '#6b7280',
                boxShadow:  filter === tab.key ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
              }}
            >
              {tab.label}
              {tab.key === 'pending' && pendingBadge > 0 && (
                <span style={{ marginLeft: 6, background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
                  {pendingBadge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af', fontSize: 14 }}>Loading...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>
            <Users size={40} style={{ marginBottom: 12, opacity: .35 }} />
            <p style={{ margin: 0, fontSize: 14 }}>
              {filter === 'pending' ? 'No pending registrations' : 'No users in this category'}
            </p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  {['Name', 'Email', 'Registered', 'Status', 'Role', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => {
                  const statusStyle = STATUS_COLORS[u.status] || STATUS_COLORS.pending;
                  const busy = actionLoading[u.id];
                  const roleBusy = actionLoading[`role-${u.id}`];
                  const isSelf = u.id === user?.id;
                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: idx < users.length - 1 ? '1px solid #f3f4f6' : 'none',
                        background: u.status === 'pending' ? '#fffbeb' : '#fff',
                      }}
                    >
                      <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 500, color: '#111827', whiteSpace: 'nowrap' }}>
                        {u.name}
                        {isSelf && <span style={{ marginLeft: 6, fontSize: 11, color: '#9ca3af' }}>(you)</span>}
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: '#6b7280' }}>{u.email}</td>
                      <td style={{ padding: '13px 16px', fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: statusStyle.bg, color: statusStyle.text }}>
                          {u.status === 'pending'  && <Clock size={11} />}
                          {u.status === 'approved' && <CheckCircle size={11} />}
                          {u.status === 'rejected' && <XCircle size={11} />}
                          {STATUS_LABELS[u.status] || u.status}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        {u.status === 'approved' && !isSelf ? (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <select
                              value={u.role}
                              disabled={!!roleBusy}
                              onChange={e => handleRoleChange(u.id, u.name, e.target.value)}
                              style={{ padding: '4px 28px 4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 13, background: '#fff', cursor: 'pointer', appearance: 'none' }}
                            >
                              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
                            </select>
                            <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6b7280' }} />
                          </div>
                        ) : (
                          <span style={{ fontSize: 13, color: '#9ca3af' }}>{ROLE_LABELS[u.role] || u.role}</span>
                        )}
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {u.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(u.id, u.name)}
                                disabled={!!busy}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, border: 'none', background: '#d1fae5', color: '#065f46', fontWeight: 600, fontSize: 13, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .6 : 1 }}
                              >
                                <CheckCircle size={13} /> {busy === 'approve' ? 'Approving…' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleReject(u.id, u.name)}
                                disabled={!!busy}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, border: 'none', background: '#fee2e2', color: '#991b1b', fontWeight: 600, fontSize: 13, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? .6 : 1 }}
                              >
                                <XCircle size={13} /> {busy === 'reject' ? 'Rejecting…' : 'Reject'}
                              </button>
                            </>
                          )}
                          {u.status === 'rejected' && (
                            <button
                              onClick={() => handleApprove(u.id, u.name)}
                              disabled={!!busy}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 7, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 13, cursor: busy ? 'not-allowed' : 'pointer' }}
                            >
                              <CheckCircle size={13} /> Re-approve
                            </button>
                          )}
                          {u.status === 'approved' && !isSelf && (
                            <button
                              onClick={() => handleReject(u.id, u.name)}
                              disabled={!!busy}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 7, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 13, cursor: busy ? 'not-allowed' : 'pointer' }}
                            >
                              <XCircle size={13} /> Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </div>
        )}
      </main>
    </div>
  );
};

export default CompanyAdminPage;
