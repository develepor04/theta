import React from 'react';
import { useNavigate } from 'react-router-dom';
import useStore from '../store/useStore';
import './Navbar.css';

const Navbar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const navigate = useNavigate();
  const { user } = useStore();

  return (
    <header className="app-navbar">
      <div className="navbar-left">
        {setIsMobileMenuOpen && (
          <button
            className="navbar-hamburger"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            type="button"
          >
            {isMobileMenuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        )}
        <div className="navbar-logo" onClick={() => navigate('/dashboard')}>
          <img src="/assets/logo.png" alt="Theta Pulse Logo" className="navbar-logo-img" />
        </div>
      </div>

      <div className="navbar-right">
        <button
          className="navbar-profile-btn"
          onClick={() => navigate('/profile')}
          title="View profile"
        >
          <span className="navbar-avatar">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </span>
          <span className="navbar-username">{user?.name}</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
