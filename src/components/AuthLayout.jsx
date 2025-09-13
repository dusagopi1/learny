import React from 'react';
import { Link } from 'react-router-dom';
import { FaUserCircle, FaSignInAlt } from 'react-icons/fa';
import logo from '../assets/logo.png'; // Assuming you have a logo.png in src/assets

export default function AuthLayout({ children }) {
  return (
    <div className="auth-layout-container">
      <header className="auth-header">
        <div className="logo-section">
          <img src={logo} alt="Aptitude Logo" className="app-logo" />
          <span className="app-name">Learny</span>
        </div>
        <nav className="auth-nav">
          <Link to="/login" className="nav-link"><FaUserCircle /> Login</Link>
          <Link to="/register" className="signup-btn"><FaSignInAlt /> Sign up</Link>
        </nav>
      </header>
      <main className="auth-main-content">
        <div className="auth-background-image-overlay"></div> {/* New div for background image and overlay */}
        <div className="hero-section">
          <div className="hero-text-content">
            <h1>A Place Every Student Should Be.</h1>
            <h2>Education is smart enough to change the human mind positively!</h2>
            <div className="auth-action-buttons">
              {/* This section will be replaced by Login/Register buttons in the respective pages */}
            </div>
          </div>
          <div className="hero-image-content">
            {/* The actual hero image from the original design is not used as a background for the form, but rather as a main visual element. Keeping it here for now if needed elsewhere or could remove it. */}
          </div>
        </div>
        <div className="auth-form-container">
          {children}
        </div>
      </main>
    </div>
  );
}
