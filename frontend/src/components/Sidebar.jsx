import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LOGIN_URL } from '../services/api';
import {
  LayoutDashboard,
  FolderKanban,
  BrainCircuit,
  TrendingUp,
  BookOpen,
  Globe,
  Power,
  Activity,
  Sparkles,
  Wrench,
  ShoppingCart,
  ExternalLink,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import useStore from '../store/useStore';

const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useStore();

  const handleLogout = () => {
    logout();
    window.location.href = LOGIN_URL;
  };

  const navItems = [
    {
      path: '/dashboard',
      label: 'Data Ingestion',
      icon: LayoutDashboard,
      showIf: () => ['admin', 'company_admin', 'super_admin'].includes(user?.role),
    },
    { path: '/reports', label: 'Reports & Analytics', icon: FolderKanban },
    { path: '/chat', label: 'AI Project Advisor', icon: BrainCircuit },
    { path: '/predictive-whatif', label: 'AI Recovery Scenarios', icon: TrendingUp },
    {
      path: '/knowledge-base',
      label: 'Knowledge Base',
      icon: BookOpen,
      showIf: () => ['admin', 'company_admin', 'super_admin'].includes(user?.role),
    },
    { path: '/theta-engage', label: 'Theta Engage', icon: Globe },
    {
      path: '/company-admin',
      label: 'Company Admin',
      icon: Building2,
      showIf: () => user && ['company_admin', 'admin', 'super_admin'].includes(user.role),
    },
    {
      path: '/super-admin',
      label: 'Manage Companies',
      icon: ShieldCheck,
      showIf: () => user?.role === 'super_admin',
    },
  ];

  return (
    <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>

      {/* Logo at top of sidebar */}
      <div className="sidebar-logo-area" onClick={() => navigate('/dashboard')}>
        <img src="/assets/logo.png" alt="Theta Pulse Logo" className="sidebar-logo-img" />
      </div>

      <nav className="sidebar-nav">
        {/* Pulse Command Center — click navigates to overview dashboard */}
        <div
          className="pulse-command-header"
          onClick={() => { if (user?.company_name?.toLowerCase() !== 'descon') { navigate('/overview'); } setIsMobileMenuOpen(false); }}
          style={{ cursor: user?.company_name?.toLowerCase() !== 'descon' ? 'pointer' : 'default' }}
        >
          <Activity size={16} />
          <span>PMO Command Center</span>
        </div>

        {/* Tree children under Pulse Command Center */}
        <div className="pulse-command-children">
          {navItems.map((item) => {
            if (item.showIf && !item.showIf()) return null;

            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                className={`nav-item nav-child-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (!isActive) navigate(item.path);
                  setIsMobileMenuOpen(false);
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Explore Theta AI section */}
        <div className="explore-theta-header">
          <Sparkles size={16} />
          <span>Explore Theta AI</span>
        </div>

        <div className="pulse-command-children">
          <button
            className="nav-item nav-child-item nav-external-item"
            onClick={() => { window.open('https://thetadynamics.io/ai-maintenance-assistant/', '_blank'); setIsMobileMenuOpen(false); }}
          >
            <Wrench size={18} />
            <span>Maintenance Assistant</span>
            <ExternalLink size={12} className="nav-external-icon" />
          </button>
          <button
            className="nav-item nav-child-item nav-external-item"
            onClick={() => { window.open('https://thetadynamics.io/ai-procurement-warranty-assistant/', '_blank'); setIsMobileMenuOpen(false); }}
          >
            <ShoppingCart size={18} />
            <span>Procurement and Warranty analysis</span>
            <ExternalLink size={12} className="nav-external-icon" />
          </button>
        </div>
      </nav>

      <div className="sidebar-footer">
        <button className="nav-item" onClick={handleLogout}>
          <Power size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;