import React from 'react';
import { LOGIN_URL } from '../services/api';
import {
  Activity, Building2, Users, ScrollText, Zap,
  Power, Shield, Clock, Settings, Megaphone, FolderOpen,
} from 'lucide-react';
import useStore from '../store/useStore';
import useIsMobile from '../hooks/useIsMobile';

const NAV_ITEMS = [
  { key: 'overview',     label: 'Overview',      icon: Activity,    group: 'Platform'   },
  { key: 'intelligence', label: 'Intelligence',   icon: Zap,         group: 'Platform'   },
  { key: 'companies',    label: 'Companies',      icon: Building2,   group: 'Management' },
  { key: 'users',        label: 'All Users',      icon: Users,       group: 'Management' },
  { key: 'audit',        label: 'Audit Log',      icon: ScrollText,  group: 'Management' },
  { key: 'pending',      label: 'Pending Users',  icon: Clock,       group: 'Management' },
  { key: 'engage',       label: 'Engage',          icon: Megaphone,   group: 'Management' },
  { key: 'kb',           label: 'Knowledge Base', icon: FolderOpen,  group: 'Management' },
  { key: 'settings',        label: 'Settings',        icon: Settings,    group: 'Management' },
];

const GROUP_STYLE = {
  Platform: {
    bg:     'rgba(16, 185, 129, 0.07)',
    border: 'rgba(16, 185, 129, 0.15)',
    color:  '#059669',
  },
  Management: {
    bg:     'rgba(99, 102, 241, 0.07)',
    border: 'rgba(99, 102, 241, 0.15)',
    color:  '#6366f1',
  },
};

const GROUPS = ['Platform', 'Management'];

const SuperAdminSidebar = ({ activeSection, onNavigate, alertCount = 0, pendingCount = 0, isMobileOpen = false, onCloseMobile }) => {
  const { logout } = useStore();
  const isMobile = useIsMobile(1023);

  const handleNavigate = (key) => {
    onNavigate(key);
    if (isMobile) onCloseMobile?.();
  };

  return (
    <>
      {isMobile && (
        <div
          onClick={() => onCloseMobile?.()}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 99,
            opacity: isMobileOpen ? 1 : 0, visibility: isMobileOpen ? 'visible' : 'hidden',
            transition: 'opacity 0.3s ease, visibility 0.3s ease',
          }}
        />
      )}
      <aside style={{
        width: 260,
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        borderRight: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '2px 0 12px rgba(0, 0, 0, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        ...(isMobile
          ? {
              position: 'fixed', top: 0, left: 0, bottom: 0, height: '100vh', zIndex: 100,
              transform: isMobileOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s ease',
            }
          : { flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }),
      }}>

      {/* Logo / header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid rgba(148, 163, 184, 0.15)',
        background: 'rgba(255, 255, 255, 0.9)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: 'linear-gradient(135deg, #059669, #10b981)',
            boxShadow: '0 2px 10px rgba(16, 185, 129, 0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Shield size={17} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>
              Super Admin
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>Platform Control</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{
        flex: 1,
        padding: '10px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        overflowY: 'auto',
      }}>
        {GROUPS.map(group => {
          const gs = GROUP_STYLE[group];
          return (
            <div key={group} style={{ marginBottom: 8 }}>
              {/* Group header — matches pulse-command-header / explore-theta-header style */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '9px 12px', borderRadius: 8,
                background: gs.bg,
                border: `1px solid ${gs.border}`,
                color: '#0f172a',
                fontSize: '0.78rem', fontWeight: 700,
                letterSpacing: '0.01em',
                marginBottom: 4,
                userSelect: 'none',
              }}>
                <span style={{ color: gs.color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {group}
                </span>
              </div>

              {/* Items — indented like pulse-command-children */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 1,
                paddingLeft: 14, marginLeft: 12,
                borderLeft: `2px solid ${gs.border}`,
                marginBottom: 6,
              }}>
                {NAV_ITEMS.filter(i => i.group === group).map(item => {
                  const active     = activeSection === item.key;
                  const Icon       = item.icon;
                  const showBadge  = item.key === 'pending' && pendingCount > 0;
                  const badgeVal   = pendingCount;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleNavigate(item.key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 8,
                        border: 'none', cursor: 'pointer',
                        textAlign: 'left', width: '100%',
                        fontSize: '0.78rem', fontWeight: active ? 600 : 500,
                        letterSpacing: '0.01em',
                        transition: 'color 0.15s ease, background 0.15s ease',
                        ...(active
                          ? {
                            background: 'linear-gradient(135deg, #059669, #10b981, #34d399)',
                            color: '#ffffff',
                            boxShadow: '0 3px 10px rgba(16, 185, 129, 0.3)',
                          }
                          : {
                            background: 'transparent',
                            color: '#64748b',
                          }),
                      }}
                    >
                      <Icon
                        size={16}
                        style={{ flexShrink: 0 }}
                        color={active ? '#ffffff' : '#64748b'}
                      />
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {showBadge && (
                        <span style={{
                          background: '#ef4444', color: '#ffffff',
                          fontSize: '0.65rem', fontWeight: 700,
                          padding: '1px 6px', borderRadius: 999,
                          minWidth: 18, height: 18,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {badgeVal}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{
        padding: 10,
        borderTop: '1px solid rgba(148, 163, 184, 0.15)',
        background: 'rgba(255, 255, 255, 0.8)',
        flexShrink: 0,
      }}>
        <button
          onClick={() => { logout(); window.location.href = LOGIN_URL; }}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8, border: 'none',
            background: 'transparent', color: '#64748b',
            fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer',
            transition: 'color 0.15s ease, background 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#ffffff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
        >
          <Power size={16} style={{ flexShrink: 0 }} />
          Sign Out
        </button>
      </div>
    </aside>
    </>
  );
};

export default SuperAdminSidebar;
