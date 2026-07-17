import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Building2, Plus, RefreshCw, Users, Clock, Trash2,
  Edit2, Check, X, Search, ChevronDown, ChevronUp,
  AlertTriangle, UserCheck, Eye, EyeOff,
  ArrowRight, Filter, Ban, RotateCcw, TrendingUp,
  ScrollText, Copy, Download, Settings, ToggleLeft, ToggleRight,
  Mail, Power, FolderOpen, Upload, File, Menu,
} from 'lucide-react';
import SuperAdminSidebar from '../components/SuperAdminSidebar';
import useStore from '../store/useStore';
import { companyService, superAdminService, kbService } from '../services/api';
import { ThetaEngageContent } from './ThetaEngage';
import useIsMobile from '../hooks/useIsMobile';

// ── Shared styles ─────────────────────────────────────────────────────────────
const CARD       = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 };
const BTN_PRI    = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#111827', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const BTN_OUT    = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13 };
const BTN_DANGER = { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer', fontSize: 12 };
const INP        = { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box', outline: 'none' };
const SEL        = { padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, background: '#fff', color: '#374151', cursor: 'pointer' };
const TH         = { padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' };
const TD         = { padding: '11px 16px' };

const STATUS_COLORS = {
  pending:  { bg: '#fef3c7', text: '#92400e' },
  approved: { bg: '#d1fae5', text: '#065f46' },
  rejected: { bg: '#fee2e2', text: '#991b1b' },
  inactive: { bg: '#f3f4f6', text: '#6b7280' },
};
const ROLE_COLORS = {
  super_admin:   { bg: '#ede9fe', text: '#5b21b6' },
  admin:         { bg: '#dbeafe', text: '#1e40af' },
  company_admin: { bg: '#e0f2fe', text: '#0369a1' },
  manager:       { bg: '#f0fdf4', text: '#15803d' },
  user:          { bg: '#f3f4f6', text: '#374151' },
};
const ALL_ROLES = ['user', 'manager', 'company_admin', 'admin', 'super_admin'];

const ACTION_BADGE = {
  login:          { bg: '#dbeafe', text: '#1e40af' },
  logout:         { bg: '#f3f4f6', text: '#6b7280' },
  user_approved:  { bg: '#d1fae5', text: '#065f46' },
  user_rejected:  { bg: '#fee2e2', text: '#991b1b' },
  file_upload:    { bg: '#ede9fe', text: '#5b21b6' },
  file_processed: { bg: '#e0f2fe', text: '#0369a1' },
  ai_chat:        { bg: '#fef3c7', text: '#92400e' },
  deviation_approve: { bg: '#d1fae5', text: '#065f46' },
  deviation_reject:  { bg: '#fee2e2', text: '#991b1b' },
};

// ── CSV export utility ────────────────────────────────────────────────────────
const exportCSV = (filename, headers, rows) => {
  const esc = (v) => { const s = v == null ? '' : String(v); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = [headers, ...rows].map(r => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click(); URL.revokeObjectURL(url);
};

// ── Atom components ───────────────────────────────────────────────────────────
const StatusPill = ({ status }) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: s.bg, color: s.text }}>
      {status}
    </span>
  );
};

const RolePill = ({ role }) => {
  const s = ROLE_COLORS[role] || ROLE_COLORS.user;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg, color: s.text }}>
      {(role || '').replace(/_/g, ' ')}
    </span>
  );
};

const StatCard = ({ label, value, icon: Icon, accent = '#111827', sub, warn }) => (
  <div style={{ ...CARD, flex: 1, borderColor: warn ? '#fca5a5' : '#e5e7eb', background: warn ? '#fef2f2' : '#fff' }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <p style={{ margin: '0 0 6px', fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 600 }}>{label}</p>
        <p style={{ margin: 0, fontSize: 30, fontWeight: 700, color: accent }}>{value}</p>
        {sub && <p style={{ margin: '4px 0 0', fontSize: 12, color: warn ? '#dc2626' : '#9ca3af' }}>{sub}</p>}
      </div>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: warn ? '#fee2e2' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={warn ? '#dc2626' : '#6b7280'} />
      </div>
    </div>
  </div>
);

const SectionHeader = ({ title, description, action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
    <div>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>{title}</h1>
      {description && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>{description}</p>}
    </div>
    {action}
  </div>
);

// ── Overview Section ──────────────────────────────────────────────────────────
const OverviewSection = ({ companies, users, platformStats, onViewCompany }) => {
  const now = new Date();

  const noAdminCos = useMemo(() =>
    companies.filter(c =>
      !users.some(u => u.company_id === c.id && u.role === 'company_admin' && u.status === 'approved')
    ),
    [companies, users]
  );

  const agingPending = useMemo(() =>
    users.filter(u => u.status === 'pending' && (now - new Date(u.created_at)) > 7 * 86400000),
    [users]
  );

  const recent = useMemo(() =>
    [...users].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8),
    [users]
  );

  const companyRows = useMemo(() => companies.map(c => {
    const cu      = users.filter(u => u.company_id === c.id);
    const stats   = platformStats[c.id];
    const lastAct = stats?.last_activity ? new Date(stats.last_activity) : null;
    return {
      ...c,
      total:    cu.length,
      approved: cu.filter(u => u.status === 'approved').length,
      pending:  cu.filter(u => u.status === 'pending').length,
      lastActivity: lastAct,
      daysAgo:  lastAct ? Math.floor((now - lastAct) / 86400000) : null,
    };
  }), [companies, users, platformStats]);

  const pending = users.filter(u => u.status === 'pending').length;
  const active  = users.filter(u => u.status === 'approved').length;

  return (
    <>
      {/* KPI row */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="Companies"   value={companies.length} icon={Building2} />
        <StatCard label="Total Users" value={users.length}     icon={Users} />
        <StatCard
          label="Pending"
          value={pending}
          icon={Clock}
          accent={pending > 0 ? '#d97706' : '#111827'}
          warn={agingPending.length > 0}
          sub={agingPending.length > 0 ? `${agingPending.length} waiting >7 days` : undefined}
        />
        <StatCard label="Active Users" value={active} icon={UserCheck} accent="#065f46" />
        <StatCard
          label="No Admin"
          value={noAdminCos.length}
          icon={AlertTriangle}
          accent={noAdminCos.length > 0 ? '#dc2626' : '#111827'}
          warn={noAdminCos.length > 0}
          sub={noAdminCos.length > 0 ? 'companies without admin' : 'all managed'}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
        {/* Company breakdown */}
        <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '13px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Company Breakdown</span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{companies.length} tenants</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Company', 'Total', 'Approved', 'Pending', 'Last Active', ''].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companyRows.map(c => {
                const dormant = c.daysAgo !== null && c.daysAgo > 30;
                return (
                  <tr key={c.id} style={{ borderTop: '1px solid #f3f4f6', background: c.is_suspended ? '#f9fafb' : '#fff' }}>
                    <td style={TD}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.is_suspended ? '#9ca3af' : '#111827' }}>{c.name}</div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{c.slug}</span>
                        {c.is_suspended && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '1px 6px', borderRadius: 5 }}>SUSPENDED</span>
                        )}
                      </div>
                    </td>
                    <td style={{ ...TD, fontSize: 14, fontWeight: 700, color: '#111827' }}>{c.total}</td>
                    <td style={{ ...TD, fontSize: 13, color: '#059669', fontWeight: 600 }}>{c.approved}</td>
                    <td style={TD}>
                      {c.pending > 0
                        ? <span style={{ fontSize: 13, fontWeight: 700, color: '#d97706' }}>{c.pending}</span>
                        : <span style={{ fontSize: 12, color: '#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ ...TD, fontSize: 12, color: dormant ? '#dc2626' : '#6b7280' }}>
                      {c.daysAgo === null
                        ? <span style={{ color: '#d1d5db' }}>No activity</span>
                        : c.daysAgo === 0 ? 'Today'
                        : c.daysAgo === 1 ? 'Yesterday'
                        : `${c.daysAgo}d ago`}
                      {dormant && <span style={{ marginLeft: 4, fontSize: 10, color: '#dc2626' }}>●</span>}
                    </td>
                    <td style={TD}>
                      <button
                        onClick={() => onViewCompany(c.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}
                      >
                        Users <ArrowRight size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right column: alerts + recent signups */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {agingPending.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <Clock size={14} color="#d97706" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>{agingPending.length} aging pending users</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#b45309' }}>Waiting more than 7 days — go to All Users to approve.</p>
            </div>
          )}
          {noAdminCos.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <AlertTriangle size={14} color="#dc2626" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>{noAdminCos.length} companies without admin</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#b91c1c' }}>{noAdminCos.map(c => c.name).join(', ')}</p>
            </div>
          )}

          {/* Recent signups */}
          <div style={{ ...CARD, padding: 0, overflow: 'hidden', flex: 1 }}>
            <div style={{ padding: '13px 20px', borderBottom: '1px solid #e5e7eb' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Recent Signups</span>
            </div>
            {recent.length === 0
              ? <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No users yet</div>
              : recent.map((u, i) => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderTop: i > 0 ? '1px solid #f3f4f6' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{u.company_name || '— no company'}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                    <StatusPill status={u.status} />
                    <span style={{ fontSize: 11, color: '#d1d5db' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );
};

// ── Companies Section ─────────────────────────────────────────────────────────
const CompaniesSection = ({ companies, users, platformStats, reload, onDrillDown }) => {
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState({ name: '', slug: '', admin_email: '', admin_name: '' });
  const [creating,     setCreating]     = useState(false);
  const [createdResult, setCreatedResult] = useState(null);
  const [editingId,  setEditingId]  = useState(null);
  const [editForm,   setEditForm]   = useState({});
  const [saving,     setSaving]     = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [suspendingId, setSuspendingId] = useState(null);

  const now = new Date();

  const companyStats = useMemo(() => companies.map(c => {
    const cu    = users.filter(u => u.company_id === c.id);
    const stats = platformStats[c.id];
    const lastAct = stats?.last_activity ? new Date(stats.last_activity) : null;
    const daysAgo = lastAct ? Math.floor((now - lastAct) / 86400000) : null;
    const hasAdmin = users.some(u => u.company_id === c.id && u.role === 'company_admin' && u.status === 'approved');
    return {
      ...c,
      total:    cu.length,
      approved: cu.filter(u => u.status === 'approved').length,
      pending:  cu.filter(u => u.status === 'pending').length,
      daysAgo,
      hasAdmin,
    };
  }), [companies, users, platformStats]);

  const handleNameChange = e => {
    const name = e.target.value;
    setForm(f => ({ ...f, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) { toast.error('Name and slug required'); return; }
    setCreating(true);
    try {
      const res = await companyService.create(
        form.name.trim(), form.slug.trim(),
        form.admin_email.trim() || null,
        form.admin_name.trim()  || null,
      );
      toast.success(`"${form.name}" created`);
      if (res.admin_created) {
        setCreatedResult({ companyName: form.name.trim(), adminEmail: res.admin_email, adminName: res.admin_name, tempPw: res.admin_temp_password });
      } else if (res.admin_warning) {
        toast.error(res.admin_warning);
      }
      setForm({ name: '', slug: '', admin_email: '', admin_name: '' });
      setShowForm(false); reload();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create'); }
    finally { setCreating(false); }
  };

  const handleSave = async (id) => {
    if (!editForm.name?.trim() || !editForm.slug?.trim()) { toast.error('Name and slug required'); return; }
    setSaving(true);
    try {
      await companyService.updateCompany(id, { name: editForm.name.trim(), slug: editForm.slug.trim() });
      toast.success('Company updated'); setEditingId(null); reload();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete "${c.name}"?\n\nAll users will be unassigned.`)) return;
    setDeletingId(c.id);
    try {
      await companyService.deleteCompany(c.id);
      toast.success(`"${c.name}" deleted`); reload();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete'); }
    finally { setDeletingId(null); }
  };

  const handleSuspend = async (c) => {
    const willSuspend = !c.is_suspended;
    const verb = willSuspend ? 'Suspend' : 'Reactivate';
    const detail = willSuspend
      ? 'All users in this company will be unable to log in.'
      : 'Users in this company will regain access.';
    if (!window.confirm(`${verb} "${c.name}"?\n\n${detail}`)) return;
    setSuspendingId(c.id);
    try {
      await superAdminService.suspendCompany(c.id, willSuspend);
      toast.success(`"${c.name}" ${willSuspend ? 'suspended' : 'reactivated'}`); reload();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSuspendingId(null); }
  };

  const handleExportCompanies = () => {
    exportCSV('companies.csv',
      ['Name', 'Slug', 'Status', 'Total Users', 'Approved', 'Pending', 'Has Admin', 'Created'],
      companyStats.map(c => [
        c.name, c.slug,
        c.is_suspended ? 'suspended' : 'active',
        c.total, c.approved, c.pending,
        c.hasAdmin ? 'yes' : 'no',
        c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
      ])
    );
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 20 }}>
        <button onClick={handleExportCompanies} style={BTN_OUT}><Download size={14} /> Export CSV</button>
        <button onClick={() => setShowForm(v => !v)} style={BTN_PRI}><Plus size={14} /> New Company</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ ...CARD, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#111827' }}>Create company</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Company name</label>
              <input value={form.name} onChange={handleNameChange} placeholder="e.g. Borouge" required style={INP} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Slug <span style={{ color: '#9ca3af', fontWeight: 400 }}>(auto-generated)</span></label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} placeholder="e.g. borouge" required style={{ ...INP, fontFamily: 'monospace' }} />
            </div>
          </div>
          {/* Optional admin auto-create */}
          <div style={{ borderTop: '1px solid #e5e7eb', marginTop: 4, paddingTop: 14, marginBottom: 16 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#6b7280' }}>
              Optionally auto-create a company admin — they will be prompted to set a new password on first login:
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Admin email <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                <input type="email" value={form.admin_email} onChange={e => setForm(f => ({ ...f, admin_email: e.target.value }))} placeholder="admin@company.com" style={INP} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Admin name <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span></label>
                <input value={form.admin_name} onChange={e => setForm(f => ({ ...f, admin_name: e.target.value }))} placeholder="Jane Smith" style={INP} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={creating} style={{ ...BTN_PRI, opacity: creating ? .7 : 1 }}>{creating ? 'Creating…' : 'Create'}</button>
            <button type="button" onClick={() => { setShowForm(false); setForm({ name: '', slug: '', admin_email: '', admin_name: '' }); }} style={BTN_OUT}>Cancel</button>
          </div>
        </form>
      )}

      {/* Temp-password result banner */}
      {createdResult && (
        <div style={{ ...CARD, marginBottom: 20, background: '#f0fdf4', border: '1px solid #86efac' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Check size={16} color="#16a34a" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#15803d' }}>
                  "{createdResult.companyName}" created with company admin
                </span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#166534' }}>
                <strong>{createdResult.adminName}</strong> ({createdResult.adminEmail}) has been created as company_admin.
                Share the temporary password below — they must set a new password on first login.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <code style={{ background: '#dcfce7', border: '1px solid #86efac', padding: '6px 14px', borderRadius: 8, fontSize: 15, fontWeight: 700, color: '#15803d', letterSpacing: '0.05em', fontFamily: 'monospace' }}>
                  {createdResult.tempPw}
                </code>
                <button
                  onClick={() => { navigator.clipboard.writeText(createdResult.tempPw); toast.success('Copied to clipboard'); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 7, border: '1px solid #86efac', background: '#fff', color: '#15803d', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                >
                  <Copy size={12} /> Copy
                </button>
              </div>
            </div>
            <button onClick={() => setCreatedResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4, flexShrink: 0 }}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {companyStats.length === 0
        ? <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}><Building2 size={40} style={{ marginBottom: 12, opacity: .3 }} /><p style={{ margin: 0 }}>No companies yet</p></div>
        : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {companyStats.map(c => {
              const editing    = editingId === c.id;
              const deleting   = deletingId === c.id;
              const suspending = suspendingId === c.id;
              const approvalPct = c.total > 0 ? Math.round((c.approved / c.total) * 100) : 0;
              const dormant    = c.daysAgo !== null && c.daysAgo > 30;

              return (
                <div key={c.id} style={{ ...CARD, opacity: c.is_suspended ? .75 : 1, borderColor: c.is_suspended ? '#fca5a5' : '#e5e7eb' }}>
                  {editing ? (
                    <div>
                      <div style={{ marginBottom: 10 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Name</label>
                        <input value={editForm.name || ''} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} style={INP} />
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Slug</label>
                        <input value={editForm.slug || ''} onChange={e => setEditForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} style={{ ...INP, fontFamily: 'monospace' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleSave(c.id)} disabled={saving} style={{ ...BTN_PRI, padding: '7px 14px', opacity: saving ? .7 : 1 }}><Check size={13} />{saving ? 'Saving…' : 'Save'}</button>
                        <button onClick={() => setEditingId(null)} style={{ ...BTN_OUT, padding: '7px 12px' }}><X size={13} />Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Card header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                        <div style={{ width: 42, height: 42, borderRadius: 10, background: c.is_suspended ? '#fee2e2' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Building2 size={20} color={c.is_suspended ? '#dc2626' : '#6b7280'} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace' }}>{c.slug}</div>
                        </div>
                        {c.is_suspended && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 6, flexShrink: 0 }}>SUSPENDED</span>
                        )}
                        {!c.hasAdmin && !c.is_suspended && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: 6, flexShrink: 0 }}>NO ADMIN</span>
                        )}
                      </div>

                      {/* Stats grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                        {[
                          { label: 'Total',    val: c.total,    color: '#111827' },
                          { label: 'Approved', val: c.approved, color: '#059669' },
                          { label: 'Pending',  val: c.pending,  color: c.pending > 0 ? '#d97706' : '#9ca3af' },
                        ].map(s => (
                          <div key={s.label} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* Approval progress */}
                      {c.total > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
                            <span>Approval rate</span><span>{approvalPct}%</span>
                          </div>
                          <div style={{ height: 4, background: '#f3f4f6', borderRadius: 3 }}>
                            <div style={{ height: 4, background: '#059669', borderRadius: 3, width: `${approvalPct}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Last active */}
                      <div style={{ fontSize: 12, color: dormant ? '#dc2626' : '#9ca3af', marginBottom: 14 }}>
                        {c.daysAgo === null ? 'No platform activity yet'
                          : c.daysAgo === 0 ? 'Last active: today'
                          : c.daysAgo === 1 ? 'Last active: yesterday'
                          : `Last active: ${c.daysAgo} days ago${dormant ? ' — dormant' : ''}`}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => onDrillDown(c.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 12 }}
                        >
                          <Eye size={12} /> View
                        </button>
                        <button
                          onClick={() => handleSuspend(c)} disabled={suspending}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 4,
                            padding: '6px 12px', borderRadius: 8, border: '1px solid',
                            borderColor: c.is_suspended ? '#86efac' : '#fca5a5',
                            background: '#fff',
                            color: c.is_suspended ? '#15803d' : '#dc2626',
                            cursor: 'pointer', fontSize: 12, opacity: suspending ? .6 : 1,
                          }}
                        >
                          {c.is_suspended ? <><RotateCcw size={12} /> Reactivate</> : <><Ban size={12} /> Suspend</>}
                        </button>
                        <button onClick={() => { setEditingId(c.id); setEditForm({ name: c.name, slug: c.slug }); }} style={{ ...BTN_OUT, padding: '6px 12px', fontSize: 12 }}>
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => handleDelete(c)} disabled={deleting} style={{ ...BTN_DANGER, opacity: deleting ? .6 : 1 }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
    </>
  );
};

// ── Users Section ─────────────────────────────────────────────────────────────
const UsersSection = ({ users, companies, reload, currentUserId, initialCompanyId }) => {
  const [search,        setSearch]        = useState('');
  const [roleFilter,    setRoleFilter]    = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [collapsed,     setCollapsed]     = useState({});
  const [assignTarget,  setAssignTarget]  = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [showCreate,    setShowCreate]    = useState(false);
  const [createForm,    setCreateForm]    = useState({ name: '', email: '', password: '', role: 'user', company_id: '', status: 'approved' });
  const [creating,      setCreating]      = useState(false);
  const [showPw,        setShowPw]        = useState(false);
  const [editingUser,   setEditingUser]   = useState(null);
  const [editForm,      setEditForm]      = useState({ name: '', email: '' });
  const [editSaving,    setEditSaving]    = useState(false);
  const [resetLoading,  setResetLoading]  = useState({});

  useEffect(() => {
    if (!initialCompanyId) return;
    setCollapsed(s => ({ ...s, [initialCompanyId]: false }));
    setTimeout(() => {
      document.getElementById(`csec-${initialCompanyId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
  }, [initialCompanyId]);

  const setAct = (key, val) => setActionLoading(p => ({ ...p, [key]: val }));

  const handleRoleChange = async (u, newRole) => {
    setAct(`role-${u.id}`, true);
    try { await superAdminService.updateUser(u.id, { role: newRole }); toast.success(`${u.name} → ${newRole}`); reload(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setAct(`role-${u.id}`, false); }
  };
  const handleStatusChange = async (u, newStatus) => {
    setAct(`st-${u.id}`, newStatus);
    try { await superAdminService.updateUser(u.id, { status: newStatus }); toast.success(`${u.name} → ${newStatus}`); reload(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setAct(`st-${u.id}`, null); }
  };
  const handleDelete = async (u) => {
    if (!window.confirm(`Permanently delete ${u.name}?`)) return;
    setAct(`del-${u.id}`, true);
    try { await superAdminService.deleteUser(u.id); toast.success(`${u.name} deleted`); reload(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setAct(`del-${u.id}`, false); }
  };
  const handleAssign = async (u) => {
    const cid = assignTarget[u.id];
    if (!cid) { toast.error('Select a company first'); return; }
    setAct(`assign-${u.id}`, true);
    try {
      await superAdminService.updateUser(u.id, { company_id: cid });
      toast.success(`${u.name} assigned to ${companies.find(c => c.id === cid)?.name || cid}`);
      setAssignTarget(s => { const n = { ...s }; delete n[u.id]; return n; });
      reload();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setAct(`assign-${u.id}`, false); }
  };
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.password) { toast.error('Name, email and password required'); return; }
    setCreating(true);
    try {
      await superAdminService.createUser({ ...createForm, company_id: createForm.company_id || null });
      toast.success(`"${createForm.name}" created`);
      setCreateForm({ name: '', email: '', password: '', role: 'user', company_id: '', status: 'approved' });
      setShowCreate(false); reload();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to create'); }
    finally { setCreating(false); }
  };
  const handleSaveEdit = async () => {
    if (!editForm.name.trim() || !editForm.email.trim()) { toast.error('Name and email are required'); return; }
    setEditSaving(true);
    try {
      await superAdminService.updateUser(editingUser.id, { name: editForm.name.trim(), email: editForm.email.trim() });
      toast.success('User updated');
      setEditingUser(null);
      reload();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to update'); }
    finally { setEditSaving(false); }
  };
  const handleSendReset = async (u) => {
    setResetLoading(r => ({ ...r, [u.id]: true }));
    try {
      await superAdminService.sendResetLink(u.id);
      toast.success(`Reset link sent to ${u.email}`);
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to send reset link'); }
    finally { setResetLoading(r => ({ ...r, [u.id]: false })); }
  };

  const matchesFilters = useCallback(u => {
    const sl = search.toLowerCase();
    if (search && !u.name?.toLowerCase().includes(sl) && !u.email?.toLowerCase().includes(sl)) return false;
    if (roleFilter   && u.role   !== roleFilter)   return false;
    if (statusFilter && u.status !== statusFilter) return false;
    return true;
  }, [search, roleFilter, statusFilter]);

  const { groups, unassigned } = useMemo(() => {
    const allGroups = companies.map(c => ({
      id: c.id, company: c,
      users: users.filter(u => u.company_id === c.id && matchesFilters(u)),
    }));
    const filtered = companyFilter ? allGroups.filter(g => g.id === companyFilter) : allGroups;
    const unassigned = companyFilter ? [] : users.filter(u => !u.company_id && matchesFilters(u));
    return { groups: filtered, unassigned };
  }, [users, companies, matchesFilters, companyFilter]);

  const renderActions = (u) => {
    if (u.id === currentUserId) return <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span>;
    const stBusy    = actionLoading[`st-${u.id}`];
    const delBusy   = actionLoading[`del-${u.id}`];
    const resetBusy = resetLoading[u.id];
    const isInactive = u.status === 'inactive';
    return (
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
        {u.status === 'pending'  && <button onClick={() => handleStatusChange(u, 'approved')} disabled={!!stBusy} style={{ padding: '4px 9px', borderRadius: 6, border: 'none', background: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: stBusy ? .6 : 1 }}>Approve</button>}
        {u.status === 'pending'  && <button onClick={() => handleStatusChange(u, 'rejected')} disabled={!!stBusy} style={{ padding: '4px 9px', borderRadius: 6, border: 'none', background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 600, cursor: 'pointer', opacity: stBusy ? .6 : 1 }}>Reject</button>}
        {u.status === 'rejected' && <button onClick={() => handleStatusChange(u, 'approved')} disabled={!!stBusy} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 11, cursor: 'pointer', opacity: stBusy ? .6 : 1 }}>Re-approve</button>}
        {u.status === 'approved' && (
          <button onClick={() => handleStatusChange(u, 'inactive')} disabled={!!stBusy} title="Deactivate — blocks login without deleting"
            style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#6b7280', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: stBusy ? .6 : 1 }}>
            <Power size={11} /> Deactivate
          </button>
        )}
        {isInactive && (
          <button onClick={() => handleStatusChange(u, 'approved')} disabled={!!stBusy}
            style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid #86efac', background: '#f0fdf4', color: '#15803d', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, opacity: stBusy ? .6 : 1 }}>
            <RotateCcw size={11} /> Reactivate
          </button>
        )}
        <button onClick={() => { setEditingUser(u); setEditForm({ name: u.name || '', email: u.email || '' }); }} title="Edit name / email"
          style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>
          <Edit2 size={11} />
        </button>
        <button onClick={() => handleSendReset(u)} disabled={!!resetBusy} title="Send password reset link"
          style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#6366f1', cursor: 'pointer', opacity: resetBusy ? .6 : 1 }}>
          <Mail size={11} />
        </button>
        <button onClick={() => handleDelete(u)} disabled={!!delBusy} title="Delete permanently"
          style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer', opacity: delBusy ? .6 : 1 }}>
          <Trash2 size={11} />
        </button>
      </div>
    );
  };

  const renderRoleCell = (u) => {
    if (u.id === currentUserId) return <RolePill role={u.role} />;
    const busy = actionLoading[`role-${u.id}`];
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <select value={u.role} disabled={!!busy} onChange={e => handleRoleChange(u, e.target.value)}
          style={{ padding: '4px 26px 4px 9px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12, background: '#fff', cursor: 'pointer', appearance: 'none' }}>
          {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <ChevronDown size={11} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6b7280' }} />
      </div>
    );
  };

  const UserTable = ({ sectionUsers }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ background: '#fafafa', borderBottom: '1px solid #f3f4f6' }}>
          {['Name / Email', 'Role', 'Status', 'Registered', 'Actions'].map(h => <th key={h} style={TH}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {sectionUsers.map((u, idx) => {
          const isEditing = editingUser?.id === u.id;
          return (
            <tr key={u.id} style={{ borderTop: idx > 0 ? '1px solid #f3f4f6' : 'none', background: isEditing ? '#fafff8' : u.status === 'pending' ? '#fffdf5' : u.status === 'inactive' ? '#fafafa' : '#fff' }}>
              <td style={TD}>
                {isEditing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" style={{ ...INP, padding: '5px 9px', fontSize: 12 }} />
                    <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" style={{ ...INP, padding: '5px 9px', fontSize: 12 }} />
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 500, color: u.status === 'inactive' ? '#9ca3af' : '#111827' }}>
                      {u.name} {u.id === currentUserId && <span style={{ fontSize: 11, color: '#9ca3af' }}>(you)</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{u.email}</div>
                  </>
                )}
              </td>
              <td style={TD}>{isEditing ? <RolePill role={u.role} /> : renderRoleCell(u)}</td>
              <td style={TD}><StatusPill status={u.status} /></td>
              <td style={{ ...TD, fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
              </td>
              <td style={{ ...TD, minWidth: 170 }}>
                {isEditing ? (
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={handleSaveEdit} disabled={editSaving} style={{ ...BTN_PRI, padding: '5px 11px', fontSize: 12, opacity: editSaving ? .7 : 1 }}><Check size={12} />{editSaving ? '…' : 'Save'}</button>
                    <button onClick={() => setEditingUser(null)} style={{ ...BTN_OUT, padding: '5px 9px', fontSize: 12 }}><X size={12} /></button>
                  </div>
                ) : renderActions(u)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const GroupHeader = ({ id, icon: Icon, title, sub, badge, badgeColor = '#6b7280', badgeBg = '#f3f4f6' }) => {
    const open = !collapsed[id];
    return (
      <button onClick={() => setCollapsed(s => ({ ...s, [id]: !s[id] }))}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: open ? '10px 10px 0 0' : 10, cursor: 'pointer', textAlign: 'left' }}>
        {Icon && <Icon size={16} color="#6b7280" />}
        <span style={{ fontWeight: 700, fontSize: 14, color: '#111827', flex: 1 }}>{title}</span>
        {sub && <span style={{ fontSize: 12, color: '#9ca3af' }}>{sub}</span>}
        <span style={{ fontSize: 12, fontWeight: 600, background: badgeBg, color: badgeColor, padding: '2px 9px', borderRadius: 10 }}>{badge}</span>
        {open ? <ChevronUp size={15} color="#9ca3af" /> : <ChevronDown size={15} color="#9ca3af" />}
      </button>
    );
  };

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or email…" style={{ ...INP, paddingLeft: 32 }} />
        </div>
        <select value={companyFilter} onChange={e => { setCompanyFilter(e.target.value); setEditingUser(null); }} style={SEL}>
          <option value="">All companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={SEL}>
          <option value="">All roles</option>{ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={SEL}>
          <option value="">All status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={() => {
          const rows = [];
          groups.forEach(g => g.users.forEach(u => rows.push([u.name, u.email, u.role, u.status, g.company?.name || '', u.created_at ? new Date(u.created_at).toLocaleDateString() : ''])));
          unassigned.forEach(u => rows.push([u.name, u.email, u.role, u.status, 'Unassigned', u.created_at ? new Date(u.created_at).toLocaleDateString() : '']));
          exportCSV('users.csv', ['Name', 'Email', 'Role', 'Status', 'Company', 'Registered'], rows);
        }} style={BTN_OUT}><Download size={14} /> Export CSV</button>
        <button onClick={() => setShowCreate(v => !v)} style={BTN_PRI}><Plus size={14} /> Create User</button>
      </div>

      {/* Action legend */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { icon: <Edit2 size={11} />, label: 'Edit name/email', color: '#374151' },
          { icon: <Power size={11} />, label: 'Deactivate (blocks login, keeps data)', color: '#6b7280' },
          { icon: <Mail size={11} />, label: 'Send password reset link', color: '#6366f1' },
          { icon: <Trash2 size={11} />, label: 'Delete permanently', color: '#dc2626' },
        ].map(({ icon, label, color }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#9ca3af' }}>
            <span style={{ color }}>{icon}</span>{label}
          </span>
        ))}
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} style={{ ...CARD, marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, color: '#111827' }}>Create user</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Full name</label>
              <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="Jane Smith" required style={INP} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Email</label>
              <input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} placeholder="jane@co.com" required style={INP} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} placeholder="Temp password" required style={{ ...INP, paddingRight: 34 }} />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}>
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Company</label>
              <select value={createForm.company_id} onChange={e => setCreateForm(f => ({ ...f, company_id: e.target.value }))} style={INP}>
                <option value="">— No company —</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Role</label>
              <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))} style={INP}>
                {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 4 }}>Status</label>
              <select value={createForm.status} onChange={e => setCreateForm(f => ({ ...f, status: e.target.value }))} style={INP}>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={creating} style={{ ...BTN_PRI, opacity: creating ? .7 : 1 }}>{creating ? 'Creating…' : 'Create user'}</button>
            <button type="button" onClick={() => setShowCreate(false)} style={BTN_OUT}>Cancel</button>
          </div>
        </form>
      )}

      {/* Company groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {groups.map(({ id, company, users: su }) => (
          <div key={id} id={`csec-${id}`}>
            <GroupHeader id={id} icon={Building2} title={company.name} sub={company.slug}
              badge={`${su.length} user${su.length !== 1 ? 's' : ''}`}
              badgeColor={su.some(u => u.status === 'pending') ? '#92400e' : '#6b7280'}
              badgeBg={su.some(u => u.status === 'pending') ? '#fef3c7' : '#f3f4f6'}
            />
            {!collapsed[id] && (
              <div style={{ border: '1px solid #e5e7eb', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                {su.length === 0
                  ? <div style={{ padding: '18px 24px', color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>No users in this company{search || roleFilter || statusFilter ? ' matching filters' : ' yet'}</div>
                  : <div style={{ overflowX: 'auto' }}><UserTable sectionUsers={su} /></div>}
              </div>
            )}
          </div>
        ))}

        {unassigned.length > 0 && (
          <div id="csec-__unassigned__">
            <GroupHeader id="__unassigned__" icon={AlertTriangle} title="Unassigned" sub="users without a company"
              badge={`${unassigned.length} user${unassigned.length !== 1 ? 's' : ''}`}
              badgeColor="#991b1b" badgeBg="#fee2e2"
            />
            {!collapsed['__unassigned__'] && (
              <div style={{ border: '1px solid #fca5a5', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#fff5f5', borderBottom: '1px solid #fecaca' }}>
                      {['Name / Email', 'Role', 'Status', 'Registered', 'Assign to Company', 'Actions'].map(h => <th key={h} style={{ ...TH, color: '#991b1b' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {unassigned.map((u, idx) => {
                      const isSelf     = u.id === currentUserId;
                      const isGlobal   = u.role === 'super_admin';
                      const assignBusy = actionLoading[`assign-${u.id}`];
                      const delBusy    = actionLoading[`del-${u.id}`];
                      const stBusy     = actionLoading[`st-${u.id}`];
                      const resetBusy  = resetLoading[u.id];
                      const isEditing  = editingUser?.id === u.id;
                      return (
                        <tr key={u.id} style={{ borderTop: idx > 0 ? '1px solid #fef2f2' : 'none', background: isEditing ? '#fafff8' : '#fff' }}>
                          <td style={TD}>
                            {isEditing ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" style={{ ...INP, padding: '5px 9px', fontSize: 12 }} />
                                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" style={{ ...INP, padding: '5px 9px', fontSize: 12 }} />
                              </div>
                            ) : (
                              <>
                                <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{u.name}{isSelf && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>(you)</span>}</div>
                                <div style={{ fontSize: 12, color: '#9ca3af' }}>{u.email}</div>
                              </>
                            )}
                          </td>
                          <td style={TD}><RolePill role={u.role} /></td>
                          <td style={TD}><StatusPill status={u.status} /></td>
                          <td style={{ ...TD, fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                          <td style={TD}>
                            {isGlobal
                              ? <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>Global — no company needed</span>
                              : (
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                  <select value={assignTarget[u.id] || ''} onChange={e => setAssignTarget(s => ({ ...s, [u.id]: e.target.value }))} style={{ ...SEL, fontSize: 12 }}>
                                    <option value="">Select company…</option>
                                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                  </select>
                                  <button onClick={() => handleAssign(u)} disabled={!assignTarget[u.id] || !!assignBusy}
                                    style={{ ...BTN_PRI, padding: '6px 12px', fontSize: 12, opacity: (!assignTarget[u.id] || assignBusy) ? .5 : 1 }}>
                                    {assignBusy ? '…' : <><Check size={12} /> Assign</>}
                                  </button>
                                </div>
                              )}
                          </td>
                          <td style={{ ...TD, minWidth: 170 }}>
                            {isEditing ? (
                              <div style={{ display: 'flex', gap: 5 }}>
                                <button onClick={handleSaveEdit} disabled={editSaving} style={{ ...BTN_PRI, padding: '5px 11px', fontSize: 12, opacity: editSaving ? .7 : 1 }}><Check size={12} />{editSaving ? '…' : 'Save'}</button>
                                <button onClick={() => setEditingUser(null)} style={{ ...BTN_OUT, padding: '5px 9px', fontSize: 12 }}><X size={12} /></button>
                              </div>
                            ) : !isSelf && (
                              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                {u.status === 'pending'  && <button onClick={() => handleStatusChange(u, 'approved')} disabled={!!stBusy} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Approve</button>}
                                {u.status === 'approved' && <button onClick={() => handleStatusChange(u, 'rejected')} disabled={!!stBusy} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 11, cursor: 'pointer' }}>Revoke</button>}
                                <button onClick={() => { setEditingUser(u); setEditForm({ name: u.name || '', email: u.email || '' }); }} style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}><Edit2 size={11} /></button>
                                <button onClick={() => handleSendReset(u)} disabled={!!resetBusy} style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#6366f1', cursor: 'pointer', opacity: resetBusy ? .6 : 1 }}><Mail size={11} /></button>
                                <button onClick={() => handleDelete(u)} disabled={!!delBusy} style={{ padding: '4px 7px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', cursor: 'pointer' }}><Trash2 size={11} /></button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// ── Audit Log Section ─────────────────────────────────────────────────────────
const AuditLogSection = ({ companies }) => {
  const [entries,  setEntries]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [filters,  setFilters]  = useState({ company_id: '', action_type: '', date_from: '', date_to: '' });
  const [pickerOpen, setPickerOpen]     = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const pickerRef                       = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  const load = useCallback(async (f = filters) => {
    setLoading(true);
    try {
      const data = await superAdminService.getAuditLog({ limit: 200, ...f });
      setEntries(data.activities || []);
    } catch { toast.error('Failed to load audit log'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, []);

  const handleApply  = () => load(filters);
  const handleReset  = () => {
    const f = { company_id: '', action_type: '', date_from: '', date_to: '' };
    setFilters(f);
    setPickerSearch('');
    load(f);
  };

  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c.name])), [companies]);
  const selectedCompany = companies.find(c => c.id === filters.company_id);
  const filteredCompanies = companies.filter(c =>
    !pickerSearch ||
    c.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    c.slug.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <>
      {/* Filters */}
      <div style={{ ...CARD, marginBottom: 16, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 180, position: 'relative' }} ref={pickerRef}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>Company</label>
            <button
              type="button"
              onClick={() => { setPickerOpen(o => !o); setPickerSearch(''); }}
              style={{ ...INP, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: '#fff', textAlign: 'left', width: '100%' }}
            >
              {selectedCompany ? (
                <>
                  <span style={{ width: 22, height: 22, borderRadius: 5, background: '#e8f5ee', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#059669', flexShrink: 0 }}>
                    {selectedCompany.name.charAt(0).toUpperCase()}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827', flex: 1 }}>{selectedCompany.name}</span>
                </>
              ) : (
                <span style={{ color: '#9ca3af', fontSize: 13, flex: 1 }}>All companies</span>
              )}
              <ChevronDown size={13} style={{ color: '#9ca3af', flexShrink: 0, transform: pickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {pickerOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: '100%', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 200, overflow: 'hidden' }}>
                <div style={{ padding: '7px 10px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Search size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                  <input
                    autoFocus
                    value={pickerSearch}
                    onChange={e => setPickerSearch(e.target.value)}
                    placeholder="Search companies…"
                    style={{ border: 'none', outline: 'none', fontSize: 13, width: '100%', color: '#111827', background: 'transparent' }}
                  />
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {/* All companies option */}
                  <button
                    type="button"
                    onClick={() => { setFilters(f => ({ ...f, company_id: '' })); setPickerOpen(false); setPickerSearch(''); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: 'none', background: !filters.company_id ? '#f0fdf4' : 'transparent', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => { if (filters.company_id) e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = !filters.company_id ? '#f0fdf4' : 'transparent'; }}
                  >
                    <span style={{ fontSize: 13, color: '#374151' }}>All companies</span>
                    {!filters.company_id && <Check size={13} color="#059669" style={{ marginLeft: 'auto' }} />}
                  </button>
                  {filteredCompanies.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => { setFilters(f => ({ ...f, company_id: c.id })); setPickerOpen(false); setPickerSearch(''); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', border: 'none', background: c.id === filters.company_id ? '#f0fdf4' : 'transparent', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => { if (c.id !== filters.company_id) e.currentTarget.style.background = '#f9fafb'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = c.id === filters.company_id ? '#f0fdf4' : 'transparent'; }}
                    >
                      <span style={{ width: 22, height: 22, borderRadius: 5, background: c.id === filters.company_id ? '#d1fae5' : '#f3f4f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: c.id === filters.company_id ? '#059669' : '#6b7280', flexShrink: 0 }}>
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                      <span style={{ flex: 1 }}>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827' }}>{c.name}</span>
                        <span style={{ display: 'block', fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{c.slug}</span>
                      </span>
                      {c.id === filters.company_id && <Check size={13} color="#059669" />}
                    </button>
                  ))}
                  {filteredCompanies.length === 0 && (
                    <div style={{ padding: '14px 12px', textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>No match for "{pickerSearch}"</div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>Action type</label>
            <input value={filters.action_type} onChange={e => setFilters(f => ({ ...f, action_type: e.target.value }))} placeholder="e.g. login, file_upload…" style={INP} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>From</label>
            <input type="date" value={filters.date_from} onChange={e => setFilters(f => ({ ...f, date_from: e.target.value }))} style={{ ...INP, width: 'auto' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>To</label>
            <input type="date" value={filters.date_to} onChange={e => setFilters(f => ({ ...f, date_to: e.target.value }))} style={{ ...INP, width: 'auto' }} />
          </div>
          <button onClick={handleApply} style={BTN_PRI}><Filter size={13} /> Apply</button>
          <button onClick={handleReset} style={BTN_OUT}>Reset</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Activity Log</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              {loading ? 'Loading…' : `${entries.length} entries (last 200)`}
            </span>
            {entries.length > 0 && (
              <button onClick={() => {
                exportCSV('audit_log.csv',
                  ['User', 'Email', 'Company', 'Action', 'Details', 'Timestamp'],
                  entries.map(e => [
                    e.user_name || '', e.user_email || '',
                    companyMap[e.company_id] || '',
                    e.action_type || '',
                    typeof e.details === 'object' ? JSON.stringify(e.details) : (e.details || ''),
                    e.created_at ? new Date(e.created_at).toLocaleString() : '',
                  ])
                );
              }} style={{ ...BTN_OUT, padding: '5px 10px', fontSize: 12 }}>
                <Download size={12} /> Export CSV
              </button>
            )}
          </div>
        </div>

        {loading
          ? <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>Loading…</div>
          : entries.length === 0
          ? <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af' }}>No entries found for the selected filters.</div>
          : (
            <div style={{ maxHeight: 580, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Time', 'User', 'Company', 'Action', 'Description'].map(h => <th key={h} style={TH}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => {
                    const badge = ACTION_BADGE[e.action_type] || { bg: '#f3f4f6', text: '#374151' };
                    return (
                      <tr key={e.id ?? i} style={{ borderTop: '1px solid #f3f4f6', background: '#fff' }}>
                        <td style={{ ...TD, fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                          {e.timestamp ? new Date(e.timestamp).toLocaleString() : '—'}
                        </td>
                        <td style={TD}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{e.user_name || '—'}</div>
                          {e.user_role && <RolePill role={e.user_role} />}
                        </td>
                        <td style={{ ...TD, fontSize: 13, color: '#374151' }}>
                          {companyMap[e.company_id] || (e.company_id ? <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{e.company_id.slice(0, 8)}…</span> : <span style={{ color: '#d1d5db' }}>—</span>)}
                        </td>
                        <td style={TD}>
                          <span style={{ fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.text, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                            {(e.action_type || '').replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ ...TD, fontSize: 12, color: '#6b7280', maxWidth: 300 }}>
                          <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {e.description || '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </>
  );
};

// ── Intelligence Section ──────────────────────────────────────────────────────
const IntelligenceSection = ({ companies, users, platformStats }) => {
  const now = new Date();

  const companyHealth = useMemo(() => companies.map(c => {
    const cu      = users.filter(u => u.company_id === c.id);
    const approved = cu.filter(u => u.status === 'approved').length;
    const pending  = cu.filter(u => u.status === 'pending').length;
    const stats    = platformStats[c.id];
    const lastAct  = stats?.last_activity ? new Date(stats.last_activity) : null;
    const daysAgo  = lastAct ? Math.floor((now - lastAct) / 86400000) : null;
    const rate     = cu.length > 0 ? Math.round((approved / cu.length) * 100) : 0;
    const hasAdmin = cu.some(u => u.role === 'company_admin' && u.status === 'approved');

    let health = 'empty';
    if (cu.length > 0 && (pending > 0 || !hasAdmin || daysAgo > 30)) health = 'attention';
    else if (cu.length > 0) health = 'healthy';

    return { ...c, total: cu.length, approved, pending, rate, daysAgo, hasAdmin, health };
  }), [companies, users, platformStats]);

  // Enhanced alerts
  const orphans       = users.filter(u => !u.company_id && u.role !== 'super_admin');
  const agingPending  = users.filter(u => u.status === 'pending' && (now - new Date(u.created_at)) > 7 * 86400000);
  const noAdminCos    = companyHealth.filter(c => c.total > 0 && !c.hasAdmin);
  const dormantCos    = companyHealth.filter(c => c.daysAgo !== null && c.daysAgo > 30);
  const emptyCos      = companyHealth.filter(c => c.total === 0);
  const suspendedCos  = companies.filter(c => c.is_suspended);
  const newLast7      = users.filter(u => (now - new Date(u.created_at)) < 7 * 86400000).length;
  const newLast30     = users.filter(u => (now - new Date(u.created_at)) < 30 * 86400000).length;
  const pendingRate   = users.length ? Math.round(users.filter(u => u.status === 'pending').length / users.length * 100) : 0;

  const roleCounts = {};
  users.forEach(u => { roleCounts[u.role] = (roleCounts[u.role] || 0) + 1; });
  const roleRows = Object.entries(roleCounts).sort((a, b) => b[1] - a[1]);
  const maxRole  = Math.max(...roleRows.map(r => r[1]), 1);

  const HEALTH = {
    healthy:   { bg: '#f0fdf4', border: '#bbf7d0', badge: { bg: '#d1fae5', text: '#065f46', label: 'Healthy'   } },
    attention: { bg: '#fffbeb', border: '#fcd34d', badge: { bg: '#fef3c7', text: '#92400e', label: 'Attention' } },
    empty:     { bg: '#f9fafb', border: '#e5e7eb', badge: { bg: '#f3f4f6', text: '#6b7280', label: 'Empty'     } },
  };

  const allClear = agingPending.length === 0 && orphans.length === 0 && noAdminCos.length === 0 && dormantCos.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Company health cards */}
      <div>
        <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#111827' }}>Company Health</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {companyHealth.map(c => {
            const hs = HEALTH[c.health];
            return (
              <div key={c.id} style={{ background: hs.bg, border: `1px solid ${hs.border}`, borderRadius: 12, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{c.slug}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, background: hs.badge.bg, color: hs.badge.text, padding: '3px 10px', borderRadius: 10 }}>{hs.badge.label}</span>
                    {c.is_suspended && <span style={{ fontSize: 10, fontWeight: 700, background: '#fee2e2', color: '#dc2626', padding: '2px 7px', borderRadius: 8 }}>Suspended</span>}
                  </div>
                </div>

                {c.total === 0 ? (
                  <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>No users registered yet.</p>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                      {[
                        { label: 'Total',    val: c.total,    color: '#111827' },
                        { label: 'Approved', val: c.approved, color: '#059669' },
                        { label: 'Pending',  val: c.pending,  color: c.pending > 0 ? '#d97706' : '#9ca3af' },
                      ].map(s => (
                        <div key={s.label} style={{ background: 'rgba(255,255,255,.6)', borderRadius: 8, padding: '6px 10px', textAlign: 'center' }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: s.color }}>{s.val}</div>
                          <div style={{ fontSize: 10, color: '#9ca3af' }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280', marginBottom: 3 }}>
                        <span>Approval rate</span><span>{c.rate}%</span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(0,0,0,.08)', borderRadius: 3 }}>
                        <div style={{ height: 4, background: '#059669', borderRadius: 3, width: `${c.rate}%` }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span>
                        {c.daysAgo === null ? 'No activity'
                          : c.daysAgo === 0 ? 'Active today'
                          : `Last active ${c.daysAgo}d ago`}
                      </span>
                      {!c.hasAdmin && <span style={{ color: '#d97706', fontWeight: 600 }}>· No company admin</span>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Alerts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Alerts & Actions</h3>

          {allClear && orphans.length === 0 && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: 18, display: 'flex', gap: 10 }}>
              <UserCheck size={18} color="#16a34a" />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#15803d' }}>All clear — no pending actions</p>
            </div>
          )}

          {agingPending.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <Clock size={16} color="#d97706" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>{agingPending.length} users waiting more than 7 days</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#b45309' }}>Go to All Users → filter by pending to review.</p>
            </div>
          )}

          {noAdminCos.length > 0 && (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <AlertTriangle size={16} color="#d97706" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>{noAdminCos.length} companies without a company admin</span>
              </div>
              {noAdminCos.map(c => <div key={c.id} style={{ fontSize: 12, color: '#b45309' }}>• {c.name}</div>)}
            </div>
          )}

          {dormantCos.length > 0 && (
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <TrendingUp size={16} color="#6b7280" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{dormantCos.length} dormant companies</span>
              </div>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: '#6b7280' }}>No platform activity in the last 30 days:</p>
              {dormantCos.map(c => <div key={c.id} style={{ fontSize: 12, color: '#6b7280' }}>• {c.name} ({c.daysAgo}d ago)</div>)}
            </div>
          )}

          {suspendedCos.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <Ban size={16} color="#dc2626" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>{suspendedCos.length} company{suspendedCos.length > 1 ? 'ies' : 'y'} suspended</span>
              </div>
              {suspendedCos.map(c => <div key={c.id} style={{ fontSize: 12, color: '#b91c1c' }}>• {c.name}</div>)}
            </div>
          )}

          {orphans.length > 0 && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <AlertTriangle size={16} color="#dc2626" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>{orphans.length} unassigned user{orphans.length > 1 ? 's' : ''}</span>
              </div>
              {orphans.slice(0, 4).map(u => <div key={u.id} style={{ fontSize: 12, color: '#991b1b' }}>• {u.name} ({u.email})</div>)}
              {orphans.length > 4 && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>+{orphans.length - 4} more</div>}
            </div>
          )}

          {emptyCos.length > 0 && (
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <Building2 size={16} color="#6b7280" />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{emptyCos.length} company{emptyCos.length > 1 ? 'ies' : 'y'} with no users yet</span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>{emptyCos.map(c => c.name).join(', ')}</p>
            </div>
          )}

          {/* Growth summary */}
          <div style={CARD}>
            <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#111827' }}>Growth Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {[
                { label: 'Last 7 days',   val: newLast7 },
                { label: 'Last 30 days',  val: newLast30 },
                { label: 'Pending rate',  val: `${pendingRate}%` },
              ].map(m => (
                <div key={m.label} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>{m.val}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827' }}>Distributions</h3>

          <div style={CARD}>
            <h4 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#111827' }}>Role Breakdown</h4>
            {roleRows.map(([role, count]) => {
              const rc = ROLE_COLORS[role] || ROLE_COLORS.user;
              return (
                <div key={role} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: rc.text }} />{role}
                    </span>
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{count} ({users.length ? Math.round(count / users.length * 100) : 0}%)</span>
                  </div>
                  <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3 }}>
                    <div style={{ height: 6, background: rc.text, borderRadius: 3, width: `${(count / maxRole) * 100}%`, opacity: .7 }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={CARD}>
            <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: '#111827' }}>Platform Summary</h4>
            {[
              { label: 'Avg users / company',     val: companies.length ? (Math.round(users.filter(u => u.company_id).length / companies.length * 10) / 10) : '—' },
              { label: 'Overall approval rate',   val: users.length ? `${Math.round(users.filter(u => u.status === 'approved').length / users.length * 100)}%` : '—' },
              { label: 'Companies with users',    val: `${companyHealth.filter(c => c.total > 0).length} / ${companies.length}` },
              { label: 'Suspended companies',     val: suspendedCos.length },
              { label: 'Dormant (>30d inactive)', val: dormantCos.length },
              { label: 'Unassigned users',        val: orphans.length },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #f3f4f6', fontSize: 13 }}>
                <span style={{ color: '#6b7280' }}>{row.label}</span>
                <span style={{ fontWeight: 700, color: '#111827' }}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Settings Section ──────────────────────────────────────────────────────────
const PLATFORM_FEATURES = [
  { key: 'ai_chat',             label: 'Theta Project Advisor', desc: 'AI chat assistant for project queries' },
  { key: 'knowledge_base',      label: 'Knowledge Base',        desc: 'Document library and search' },
  { key: 'theta_engage',        label: 'Theta Engage',          desc: 'Engagement and communication tools' },
  { key: 'predictive_analysis', label: 'Recovery Scenarios',    desc: 'What-if predictive analysis' },
  { key: 'oms',                 label: 'OMS',                   desc: 'Operations Management System' },
  { key: 'report_builder',      label: 'Report Builder',        desc: 'Dynamic custom report builder for company admins' },
];

const isEnabled = (company, key) => company.features?.[key] !== false;

const SettingsSection = ({ companies, reload }) => {
  const [saving, setSaving]           = useState({});
  const [selectedCid, setSelectedCid] = useState('');
  const [pickerOpen, setPickerOpen]   = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const pickerRef                     = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  const selectedCompany = companies.find(c => c.id === selectedCid);

  const handleToggle = async (company, key) => {
    const current = isEnabled(company, key);
    const newFeatures = { ...(company.features || {}), [key]: !current };
    const saveKey = `${company.id}-${key}`;
    setSaving(s => ({ ...s, [saveKey]: true }));
    try {
      await companyService.setFeatures(company.id, newFeatures);
      toast.success(`${company.name}: ${key.replace(/_/g, ' ')} ${!current ? 'enabled' : 'disabled'}`);
      reload();
    } catch { toast.error('Failed to update'); }
    finally { setSaving(s => ({ ...s, [saveKey]: false })); }
  };

  if (companies.length === 0) {
    return <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>No companies yet.</div>;
  }

  const filtered = companies.filter(c =>
    !pickerSearch ||
    c.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
    c.slug.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div>
      {/* Company picker */}
      <div style={{ ...CARD, marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ position: 'relative' }} ref={pickerRef}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Select company to manage</label>
          <button
            type="button"
            onClick={() => { setPickerOpen(o => !o); setPickerSearch(''); }}
            style={{ ...INP, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: '#fff', textAlign: 'left', width: '100%' }}
          >
            {selectedCompany ? (
              <>
                <span style={{ width: 28, height: 28, borderRadius: 6, background: '#e8f5ee', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#059669', flexShrink: 0 }}>
                  {selectedCompany.name.charAt(0).toUpperCase()}
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedCompany.name}</span>
                  <span style={{ display: 'block', fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{selectedCompany.slug}</span>
                </span>
              </>
            ) : (
              <span style={{ color: '#9ca3af', fontSize: 13 }}>— Choose a company —</span>
            )}
            <ChevronDown size={14} style={{ color: '#9ca3af', flexShrink: 0, transform: pickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          {pickerOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 200, overflow: 'hidden' }}>
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Search size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                <input
                  autoFocus
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  placeholder="Search companies…"
                  style={{ border: 'none', outline: 'none', fontSize: 13, width: '100%', color: '#111827', background: 'transparent' }}
                />
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                {filtered.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setSelectedCid(c.id); setPickerOpen(false); setPickerSearch(''); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: 'none', background: c.id === selectedCid ? '#f0fdf4' : 'transparent', cursor: 'pointer', textAlign: 'left' }}
                    onMouseEnter={e => { if (c.id !== selectedCid) e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = c.id === selectedCid ? '#f0fdf4' : 'transparent'; }}
                  >
                    <span style={{ width: 28, height: 28, borderRadius: 6, background: c.id === selectedCid ? '#d1fae5' : '#f3f4f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: c.id === selectedCid ? '#059669' : '#6b7280', flexShrink: 0 }}>
                      {c.name.charAt(0).toUpperCase()}
                    </span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827' }}>{c.name}</span>
                      <span style={{ display: 'block', fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{c.slug}</span>
                    </span>
                    {c.id === selectedCid && <Check size={13} color="#059669" />}
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>No companies match "{pickerSearch}"</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feature toggles for selected company */}
      {!selectedCompany ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
          <Settings size={32} style={{ marginBottom: 10, opacity: .3 }} />
          <p style={{ margin: 0, fontSize: 14 }}>Select a company above to manage their feature toggles.</p>
        </div>
      ) : (
        <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#e8f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: '#059669' }}>
              {selectedCompany.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{selectedCompany.name}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{selectedCompany.slug}</div>
            </div>
          </div>
          {PLATFORM_FEATURES.map((f, idx) => {
            const on   = isEnabled(selectedCompany, f.key);
            const busy = saving[`${selectedCompany.id}-${f.key}`];
            return (
              <div
                key={f.key}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 20px',
                  borderBottom: idx < PLATFORM_FEATURES.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{f.desc}</div>
                </div>
                <button
                  onClick={() => handleToggle(selectedCompany, f.key)}
                  disabled={!!busy}
                  title={on ? 'Click to disable' : 'Click to enable'}
                  style={{ background: 'none', border: 'none', cursor: busy ? 'default' : 'pointer', padding: 4, opacity: busy ? .5 : 1, display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
                >
                  {on
                    ? <ToggleRight size={32} color="#059669" />
                    : <ToggleLeft  size={32} color="#d1d5db" />
                  }
                </button>
              </div>
            );
          })}
        </div>
      )}
      <p style={{ margin: '12px 0 0', fontSize: 12, color: '#9ca3af' }}>
        Toggles take effect immediately. Features default to enabled when not explicitly set.
      </p>
    </div>
  );
};

// ── Pending Users Section ─────────────────────────────────────────────────────
const AGE_STYLE = (days) => {
  if (days >= 14) return { bg: '#fee2e2', text: '#991b1b', label: `${days}d` };
  if (days >= 7)  return { bg: '#fef3c7', text: '#92400e', label: `${days}d` };
  if (days >= 1)  return { bg: '#f3f4f6', text: '#374151', label: `${days}d` };
  return { bg: '#f3f4f6', text: '#9ca3af', label: '<1d' };
};

const PendingUsersSection = ({ users, companies, reload }) => {
  const [selected,   setSelected]   = useState(new Set());
  const [acting,     setActing]     = useState({});
  const [bulkBusy,   setBulkBusy]   = useState(null);
  const [compFilter, setCompFilter] = useState('');

  const companyMap = useMemo(() => Object.fromEntries(companies.map(c => [c.id, c.name])), [companies]);

  const now = new Date();
  const rows = useMemo(() => {
    const pending = users
      .filter(u => u.status === 'pending')
      .filter(u => !compFilter || u.company_id === compFilter)
      .map(u => ({ ...u, daysWaiting: Math.floor((now - new Date(u.created_at)) / 86400000) }))
      .sort((a, b) => b.daysWaiting - a.daysWaiting);
    return pending;
  }, [users, compFilter]);

  const allSelected = rows.length > 0 && rows.every(u => selected.has(u.id));
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(rows.map(u => u.id)));
  const toggle      = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const act = async (userId, newStatus, key) => {
    setActing(a => ({ ...a, [key]: true }));
    try {
      await superAdminService.updateUser(userId, { status: newStatus });
      reload();
    } catch { toast.error('Failed'); }
    finally { setActing(a => ({ ...a, [key]: false })); }
  };

  const bulkAct = async (newStatus) => {
    if (selected.size === 0) { toast.error('Select at least one user'); return; }
    if (newStatus === 'rejected' && !window.confirm(`Reject ${selected.size} user${selected.size > 1 ? 's' : ''}?\n\nThey will not be able to log in. This can be reversed individually from All Users.`)) return;
    setBulkBusy(newStatus);
    let ok = 0, fail = 0;
    await Promise.all([...selected].map(id =>
      superAdminService.updateUser(id, { status: newStatus })
        .then(() => ok++)
        .catch(() => fail++)
    ));
    if (ok > 0)   toast.success(`${ok} user${ok > 1 ? 's' : ''} ${newStatus}`);
    if (fail > 0) toast.error(`${fail} failed`);
    setSelected(new Set());
    setBulkBusy(null);
    reload();
  };

  const agingCritical = rows.filter(u => u.daysWaiting >= 7).length;

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ ...CARD, flex: 1, minWidth: 140, padding: '14px 18px' }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Total Pending</p>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111827' }}>{rows.length}</p>
        </div>
        <div style={{ ...CARD, flex: 1, minWidth: 140, padding: '14px 18px', borderColor: agingCritical > 0 ? '#fca5a5' : '#e5e7eb', background: agingCritical > 0 ? '#fef2f2' : '#fff' }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: agingCritical > 0 ? '#dc2626' : '#6b7280', textTransform: 'uppercase' }}>Waiting &gt;7 days</p>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: agingCritical > 0 ? '#dc2626' : '#9ca3af' }}>{agingCritical}</p>
        </div>
        <div style={{ ...CARD, flex: 1, minWidth: 140, padding: '14px 18px' }}>
          <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Selected</p>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#6366f1' }}>{selected.size}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={compFilter} onChange={e => { setCompFilter(e.target.value); setSelected(new Set()); }} style={SEL}>
          <option value="">All companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => bulkAct('approved')}
          disabled={!!bulkBusy || selected.size === 0}
          style={{ ...BTN_PRI, background: selected.size === 0 ? '#d1fae5' : '#059669', opacity: bulkBusy === 'approved' ? .7 : 1 }}
        >
          <Check size={14} /> Approve Selected ({selected.size})
        </button>
        <button
          onClick={() => bulkAct('rejected')}
          disabled={!!bulkBusy || selected.size === 0}
          style={{ ...BTN_DANGER, opacity: bulkBusy === 'rejected' ? .7 : 1 }}
        >
          <X size={14} /> Reject Selected
        </button>
      </div>

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af' }}>
          <Check size={40} style={{ marginBottom: 12, opacity: .3 }} />
          <p style={{ margin: 0, fontSize: 14 }}>No pending users{compFilter ? ' for this company' : ''}.</p>
        </div>
      ) : (
        <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ ...TH, width: 36 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                </th>
                <th style={TH}>User</th>
                <th style={TH}>Company</th>
                <th style={TH}>Registered</th>
                <th style={TH}>Waiting</th>
                <th style={TH}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u, i) => {
                const age  = AGE_STYLE(u.daysWaiting);
                const busy = acting[`approve-${u.id}`] || acting[`reject-${u.id}`];
                return (
                  <tr key={u.id} style={{ borderBottom: i < rows.length - 1 ? '1px solid #f3f4f6' : 'none', background: selected.has(u.id) ? '#f5f3ff' : '#fff' }}>
                    <td style={{ ...TD, width: 36 }}>
                      <input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={TD}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: '#9ca3af' }}>{u.email}</div>
                    </td>
                    <td style={TD}>
                      <span style={{ fontSize: 13, color: '#374151' }}>{companyMap[u.company_id] || <span style={{ color: '#9ca3af' }}>Unassigned</span>}</span>
                    </td>
                    <td style={{ ...TD, fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td style={TD}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: age.bg, color: age.text }}>
                        {age.label}
                      </span>
                    </td>
                    <td style={TD}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          disabled={!!busy}
                          onClick={() => act(u.id, 'approved', `approve-${u.id}`)}
                          style={{ padding: '5px 12px', borderRadius: 6, border: 'none', background: '#d1fae5', color: '#065f46', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: busy ? .6 : 1 }}
                        >Approve</button>
                        <button
                          disabled={!!busy}
                          onClick={() => act(u.id, 'rejected', `reject-${u.id}`)}
                          style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 12, cursor: 'pointer', opacity: busy ? .6 : 1 }}
                        >Reject</button>
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
  );
};


// ── Company Drill-Down Modal ──────────────────────────────────────────────────
const CompanyDrillDownModal = ({ company, users, platformStats, onClose, reload, currentUserId }) => {
  const [auditEntries,  setAuditEntries]  = useState([]);
  const [auditLoading,  setAuditLoading]  = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [tab,           setTab]           = useState('users');

  useEffect(() => {
    if (!company) return;
    setAuditLoading(true);
    setAuditEntries([]);
    superAdminService.getAuditLog({ company_id: company.id, limit: 50 })
      .then(d => setAuditEntries(d.activities || []))
      .catch(() => {})
      .finally(() => setAuditLoading(false));
  }, [company?.id]);

  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  if (!company) return null;

  const stats        = platformStats[company.id] || {};
  const cu           = users.filter(u => u.company_id === company.id);
  const approved     = cu.filter(u => u.status === 'approved').length;
  const pending      = cu.filter(u => u.status === 'pending').length;
  const rejected     = cu.filter(u => u.status === 'rejected').length;
  const hasAdmin     = cu.some(u => u.role === 'company_admin' && u.status === 'approved');
  const lastAct      = stats.last_activity ? new Date(stats.last_activity) : null;
  const daysAgo      = lastAct ? Math.floor((Date.now() - lastAct) / 86400000) : null;
  const approvalRate = cu.length > 0 ? Math.round((approved / cu.length) * 100) : 0;

  const setAct = (key, val) => setActionLoading(p => ({ ...p, [key]: val }));

  const handleStatusChange = async (u, newStatus) => {
    setAct(`st-${u.id}`, newStatus);
    try { await superAdminService.updateUser(u.id, { status: newStatus }); toast.success(`${u.name} → ${newStatus}`); reload(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setAct(`st-${u.id}`, null); }
  };

  const handleRoleChange = async (u, newRole) => {
    setAct(`role-${u.id}`, true);
    try { await superAdminService.updateUser(u.id, { role: newRole }); toast.success(`${u.name} → ${newRole}`); reload(); }
    catch (e) { toast.error(e.response?.data?.error || 'Failed'); }
    finally { setAct(`role-${u.id}`, false); }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'flex-end' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ width: 700, maxWidth: '95vw', height: '100vh', background: '#f8fafc', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 32px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div style={{ background: '#fff', padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'flex-start', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: company.is_suspended ? '#fee2e2' : '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={22} color={company.is_suspended ? '#dc2626' : '#94a3b8'} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>{company.name}</h2>
              {company.is_suspended && <span style={{ fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 6 }}>SUSPENDED</span>}
              {!hasAdmin && !company.is_suspended && <span style={{ fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 6 }}>NO ADMIN</span>}
            </div>
            <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: 'monospace', marginTop: 2 }}>{company.slug}</div>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 6, borderRadius: 8, display: 'flex', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Metrics strip */}
        <div style={{ background: '#fff', padding: '14px 24px 16px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 10 }}>
            {[
              { label: 'Total',    val: cu.length,               color: '#111827' },
              { label: 'Approved', val: approved,                 color: '#059669' },
              { label: 'Pending',  val: pending,                  color: pending  > 0 ? '#d97706' : '#9ca3af' },
              { label: 'Rejected', val: rejected,                 color: rejected > 0 ? '#dc2626' : '#9ca3af' },
              { label: 'Events',   val: stats.total_events ?? '—', color: '#6366f1' },
            ].map(s => (
              <div key={s.label} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span>Last active: <strong>{daysAgo === null ? 'No activity' : daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`}</strong></span>
            <span>Approval rate: <strong>{approvalRate}%</strong></span>
            {stats.unique_users != null && <span>Unique active users: <strong>{stats.unique_users}</strong></span>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '0 24px', background: '#fff', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          {[['users', 'Users'], ['activity', 'Activity Log']].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding: '10px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === key ? 600 : 400,
              background: 'transparent', color: tab === key ? '#059669' : '#6b7280',
              borderBottom: tab === key ? '2px solid #059669' : '2px solid transparent', marginBottom: -1,
            }}>{label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: 20 }}>
          {tab === 'users' && (
            <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
              {cu.length === 0
                ? <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No users in this company yet.</div>
                : (
                  <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {['Name / Email', 'Role', 'Status', 'Joined', 'Actions'].map(h => <th key={h} style={TH}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {cu.map((u, i) => {
                        const stBusy   = actionLoading[`st-${u.id}`];
                        const roleBusy = actionLoading[`role-${u.id}`];
                        return (
                          <tr key={u.id} style={{ borderTop: i > 0 ? '1px solid #f3f4f6' : 'none', background: u.status === 'pending' ? '#fffdf5' : '#fff' }}>
                            <td style={TD}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                {u.name}{u.id === currentUserId && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>(you)</span>}
                              </div>
                              <div style={{ fontSize: 12, color: '#9ca3af' }}>{u.email}</div>
                            </td>
                            <td style={TD}>
                              {u.id === currentUserId ? <RolePill role={u.role} /> : (
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                  <select value={u.role} disabled={!!roleBusy} onChange={e => handleRoleChange(u, e.target.value)}
                                    style={{ padding: '4px 22px 4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12, background: '#fff', cursor: 'pointer', appearance: 'none' }}>
                                    {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                  </select>
                                  <ChevronDown size={10} style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#6b7280' }} />
                                </div>
                              )}
                            </td>
                            <td style={TD}><StatusPill status={u.status} /></td>
                            <td style={{ ...TD, fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                            </td>
                            <td style={{ ...TD, minWidth: 140 }}>
                              {u.id === currentUserId ? <span style={{ fontSize: 12, color: '#9ca3af' }}>—</span> : (
                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                  {u.status === 'pending'  && <button onClick={() => handleStatusChange(u, 'approved')} disabled={!!stBusy} style={{ padding: '4px 8px', borderRadius: 5, border: 'none', background: '#d1fae5', color: '#065f46', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Approve</button>}
                                  {u.status === 'pending'  && <button onClick={() => handleStatusChange(u, 'rejected')} disabled={!!stBusy} style={{ padding: '4px 8px', borderRadius: 5, border: 'none', background: '#fee2e2', color: '#991b1b', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Reject</button>}
                                  {u.status === 'rejected' && <button onClick={() => handleStatusChange(u, 'approved')} disabled={!!stBusy} style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontSize: 11, cursor: 'pointer' }}>Re-approve</button>}
                                  {u.status === 'approved' && <button onClick={() => handleStatusChange(u, 'rejected')} disabled={!!stBusy} style={{ padding: '4px 8px', borderRadius: 5, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontSize: 11, cursor: 'pointer' }}>Revoke</button>}
                                </div>
                              )}
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

          {tab === 'activity' && (
            <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Recent Activity</span>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>{auditLoading ? 'Loading…' : `${auditEntries.length} entries`}</span>
              </div>
              {auditLoading
                ? <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading…</div>
                : auditEntries.length === 0
                ? <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No activity recorded for this company yet.</div>
                : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {['Time', 'User', 'Action', 'Description'].map(h => <th key={h} style={TH}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {auditEntries.map((e, i) => {
                        const badge = ACTION_BADGE[e.action_type] || { bg: '#f3f4f6', text: '#374151' };
                        return (
                          <tr key={e.id ?? i} style={{ borderTop: '1px solid #f3f4f6', background: '#fff' }}>
                            <td style={{ ...TD, fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                              {e.timestamp ? new Date(e.timestamp).toLocaleString() : '—'}
                            </td>
                            <td style={{ ...TD, fontSize: 13, fontWeight: 500, color: '#111827' }}>{e.user_name || '—'}</td>
                            <td style={TD}>
                              <span style={{ fontSize: 11, fontWeight: 600, background: badge.bg, color: badge.text, padding: '2px 7px', borderRadius: 5, whiteSpace: 'nowrap' }}>
                                {(e.action_type || '').replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td style={{ ...TD, fontSize: 12, color: '#6b7280', maxWidth: 220 }}>
                              <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {e.description || '—'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── KB Section ───────────────────────────────────────────────────────────────
const KBSection = ({ companies }) => {
  const [selectedCid, setSelectedCid] = useState('');
  const [files, setFiles]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [deleting, setDeleting]       = useState({});
  const [pickerOpen, setPickerOpen]   = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const fileInputRef                  = useRef(null);
  const pickerRef                     = useRef(null);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerOpen]);

  const load = useCallback(async (cid) => {
    if (!cid) { setFiles([]); return; }
    setLoading(true);
    try {
      const data = await kbService.listFiles(cid);
      setFiles(data.files || []);
    } catch {
      toast.error('Failed to load KB files');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCompanyChange = (cid) => {
    setSelectedCid(cid);
    setPickerOpen(false);
    setPickerSearch('');
    load(cid);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCid) return;
    setUploading(true);
    try {
      await kbService.uploadFile(file, selectedCid);
      toast.success(`${file.name} uploaded`);
      load(selectedCid);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete "${name}" from this company's Knowledge Base?`)) return;
    setDeleting(d => ({ ...d, [name]: true }));
    try {
      await kbService.deleteFile(name, selectedCid);
      toast.success(`${name} deleted`);
      load(selectedCid);
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

  const selectedCompany = companies.find(c => c.id === selectedCid);

  return (
    <div>
      {/* Company picker */}
      <div style={{ ...CARD, marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }} ref={pickerRef}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6 }}>Select company to manage</label>
            {/* Trigger */}
            <button
              type="button"
              onClick={() => { setPickerOpen(o => !o); setPickerSearch(''); }}
              style={{ ...INP, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: '#fff', textAlign: 'left', width: '100%' }}
            >
              {selectedCompany ? (
                <>
                  <span style={{ width: 28, height: 28, borderRadius: 6, background: '#e8f5ee', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#059669', flexShrink: 0 }}>
                    {selectedCompany.name.charAt(0).toUpperCase()}
                  </span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedCompany.name}</span>
                    <span style={{ display: 'block', fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{selectedCompany.slug}</span>
                  </span>
                </>
              ) : (
                <span style={{ color: '#9ca3af', fontSize: 13 }}>— Choose a company —</span>
              )}
              <ChevronDown size={14} style={{ color: '#9ca3af', flexShrink: 0, transform: pickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {/* Dropdown */}
            {pickerOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 200, overflow: 'hidden' }}>
                {/* Search */}
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Search size={13} style={{ color: '#9ca3af', flexShrink: 0 }} />
                  <input
                    autoFocus
                    value={pickerSearch}
                    onChange={e => setPickerSearch(e.target.value)}
                    placeholder="Search companies…"
                    style={{ border: 'none', outline: 'none', fontSize: 13, width: '100%', color: '#111827', background: 'transparent' }}
                  />
                </div>
                {/* List */}
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {companies
                    .filter(c => !pickerSearch || c.name.toLowerCase().includes(pickerSearch.toLowerCase()) || c.slug.toLowerCase().includes(pickerSearch.toLowerCase()))
                    .map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleCompanyChange(c.id)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: 'none', background: c.id === selectedCid ? '#f0fdf4' : 'transparent', cursor: 'pointer', textAlign: 'left' }}
                        onMouseEnter={e => { if (c.id !== selectedCid) e.currentTarget.style.background = '#f9fafb'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = c.id === selectedCid ? '#f0fdf4' : 'transparent'; }}
                      >
                        <span style={{ width: 28, height: 28, borderRadius: 6, background: c.id === selectedCid ? '#d1fae5' : '#f3f4f6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: c.id === selectedCid ? '#059669' : '#6b7280', flexShrink: 0 }}>
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                        <span style={{ flex: 1 }}>
                          <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#111827' }}>{c.name}</span>
                          <span style={{ display: 'block', fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>{c.slug}</span>
                        </span>
                        {c.id === selectedCid && <Check size={13} color="#059669" />}
                      </button>
                    ))
                  }
                  {companies.filter(c => !pickerSearch || c.name.toLowerCase().includes(pickerSearch.toLowerCase()) || c.slug.toLowerCase().includes(pickerSearch.toLowerCase())).length === 0 && (
                    <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>No companies match "{pickerSearch}"</div>
                  )}
                </div>
              </div>
            )}
          </div>
          {selectedCid && (
            <>
              <button onClick={() => load(selectedCid)} style={{ ...BTN_OUT, marginTop: 18 }}><RefreshCw size={13} /> Refresh</button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ ...BTN_PRI, marginTop: 18, opacity: uploading ? .7 : 1 }}
              >
                <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload File'}
              </button>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} />
            </>
          )}
        </div>
        {selectedCompany && (
          <p style={{ margin: '10px 0 0', fontSize: 12, color: '#6b7280' }}>
            Files uploaded here are stored in <code style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: 4 }}>Knowledgebase/{selectedCid}/</code> and used exclusively by <strong>{selectedCompany.name}</strong>.
          </p>
        )}
      </div>

      {/* File list */}
      {!selectedCid ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af' }}>
          <FolderOpen size={36} style={{ marginBottom: 10, opacity: .3 }} />
          <p style={{ margin: 0, fontSize: 14 }}>Select a company above to manage their Knowledge Base files.</p>
        </div>
      ) : loading ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Loading…</div>
      ) : files.length === 0 ? (
        <div style={{ ...CARD, padding: 48, textAlign: 'center', color: '#9ca3af' }}>
          <FolderOpen size={32} style={{ marginBottom: 10, opacity: .35 }} />
          <p style={{ margin: 0, fontSize: 14 }}>No files yet for <strong style={{ color: '#374151' }}>{selectedCompany?.name}</strong>.</p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#d1d5db' }}>Upload .xlsx, .json, .docx, .pptx and more</p>
        </div>
      ) : (
        <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selectedCompany?.name} — Knowledge Base</span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{files.length} file{files.length !== 1 ? 's' : ''}</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['File Name', 'Size', 'Last Modified', ''].map(h => <th key={h} style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {files.map((f, i) => (
                <tr key={f.name} style={{ borderTop: i > 0 ? '1px solid #f3f4f6' : 'none' }}>
                  <td style={TD}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <File size={14} color="#9ca3af" />
                      <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', fontFamily: 'monospace' }}>{f.name}</span>
                    </div>
                  </td>
                  <td style={{ ...TD, fontSize: 13, color: '#6b7280' }}>{fmt(f.size_bytes)}</td>
                  <td style={{ ...TD, fontSize: 12, color: '#9ca3af' }}>{new Date(f.modified_at).toLocaleString()}</td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <button
                      onClick={() => handleDelete(f.name)}
                      disabled={deleting[f.name]}
                      style={{ ...BTN_DANGER, opacity: deleting[f.name] ? .6 : 1 }}
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


// ── Main Component ────────────────────────────────────────────────────────────
const SuperAdminPage = () => {
  const { user: currentUser } = useStore();
  const isMobile = useIsMobile(1023);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [section,       setSection]       = useState('overview');
  const [focusCompanyId, setFocusCompanyId] = useState('');
  const [drillDownId,   setDrillDownId]   = useState(null);
  const [companies,     setCompanies]     = useState([]);
  const [allUsers,      setAllUsers]      = useState([]);
  const [platformStats, setPlatformStats] = useState({});
  const [loading,       setLoading]       = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [comps, usrs, stats] = await Promise.all([
        companyService.listAll(),
        superAdminService.getAllUsers(),
        superAdminService.getPlatformStats().catch(() => ({})),
      ]);
      setCompanies(comps);
      setAllUsers(usrs);
      setPlatformStats(stats.company_activity || {});
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const viewCompanyUsers = useCallback((companyId) => {
    setDrillDownId(companyId);
  }, []);

  // Count actionable alerts for sidebar badge
  const alertCount = useMemo(() => {
    const now = new Date();
    const aging = allUsers.filter(u => u.status === 'pending' && (now - new Date(u.created_at)) > 7 * 86400000).length;
    const noAdmin = companies.filter(c =>
      !allUsers.some(u => u.company_id === c.id && u.role === 'company_admin' && u.status === 'approved')
    ).length;
    return aging + noAdmin;
  }, [allUsers, companies]);

  const sectionTitles = {
    overview:     { title: 'Overview',        description: 'Platform-wide summary across all companies and users' },
    companies:    { title: 'Companies',       description: 'Create, edit, suspend and manage all tenant companies' },
    users:        { title: 'All Users',       description: 'Manage users across all companies — roles, approvals, assignments' },
    audit:        { title: 'Audit Log',       description: 'Full activity history across all companies and users' },
    intelligence: { title: 'Intelligence',    description: 'Health scores, alerts, and growth metrics for the platform' },
    pending:      { title: 'Pending Users',   description: 'Users waiting for approval — sorted by how long they\'ve been waiting' },
    settings:        { title: 'Settings',        description: 'Toggle features on or off per company' },
    engage:          { title: 'Engage',          description: 'Team social feed — posts, groups, likes, and collaboration across the platform' },
    kb:              { title: 'Knowledge Base',  description: 'Manage data files (Excel, JSON, DOCX) for each company — powers AI, dashboards, and deviations' },
  };

  const current = sectionTitles[section] || sectionTitles.overview;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      <button
        className="mobile-menu-button"
        onClick={() => setIsMobileMenuOpen(o => !o)}
        aria-label="Toggle menu"
        type="button"
      >
        {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <SuperAdminSidebar
        activeSection={section}
        onNavigate={setSection}
        alertCount={alertCount}
        pendingCount={allUsers.filter(u => u.status === 'pending').length}
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <main style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '72px 16px 20px' : '28px 32px', minWidth: 0 }}>
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>{current.title}</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{current.description}</p>
          </div>
          <button onClick={loadAll} style={BTN_OUT}><RefreshCw size={14} /> Refresh</button>
        </div>

        {loading
          ? <div style={{ textAlign: 'center', padding: 80, color: '#9ca3af', fontSize: 14 }}>Loading…</div>
          : (
            <>
              {section === 'overview'     && <OverviewSection     companies={companies} users={allUsers} platformStats={platformStats} onViewCompany={viewCompanyUsers} />}
              {section === 'companies'    && <CompaniesSection    companies={companies} users={allUsers} platformStats={platformStats} reload={loadAll} onDrillDown={setDrillDownId} />}
              {section === 'users'        && <UsersSection        users={allUsers} companies={companies} reload={loadAll} currentUserId={currentUser?.id} initialCompanyId={focusCompanyId} />}
              {section === 'audit'        && <AuditLogSection     companies={companies} />}
              {section === 'intelligence' && <IntelligenceSection companies={companies} users={allUsers} platformStats={platformStats} />}
              {section === 'pending'      && <PendingUsersSection users={allUsers} companies={companies} reload={loadAll} />}
              {section === 'settings'        && <SettingsSection     companies={companies} reload={loadAll} />}
              {section === 'engage'          && <ThetaEngageContent embedded />}
              {section === 'kb'              && <KBSection           companies={companies} />}
            </>
          )}
      </main>
      {drillDownId && (
        <CompanyDrillDownModal
          company={companies.find(c => c.id === drillDownId)}
          users={allUsers}
          platformStats={platformStats}
          onClose={() => setDrillDownId(null)}
          reload={loadAll}
          currentUserId={currentUser?.id}
        />
      )}
    </div>
  );
};

export default SuperAdminPage;
