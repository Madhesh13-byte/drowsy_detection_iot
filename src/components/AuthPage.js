import React, { useState } from 'react';
import { FaCar, FaEye, FaSearch, FaBolt, FaChartBar, FaUser, FaEnvelope, FaLock, FaArrowRight, FaWifi, FaCheckCircle } from 'react-icons/fa';
import './AuthPage.css';

const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.email && formData.password) {
      try {
        const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
        const payload = isLogin 
          ? { email: formData.email, password: formData.password }
          : { name: formData.name, email: formData.email, password: formData.password };

        const response = await fetch(`http://localhost:5000${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
          localStorage.setItem('token', data.token);
          onLogin(data.user);
        } else {
          alert(data.error || 'Authentication failed');
        }
      } catch (error) {
        alert('Connection error. Please try again.');
        console.error('Auth error:', error);
      }
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const switchToLogin = () => {
    setIsLogin(true);
    setFormData({ email: '', password: '', name: '' });
  };

  const switchToRegister = () => {
    setIsLogin(false);
    setFormData({ email: '', password: '', name: '' });
  };

  return (
    <div className="split-container">
      {/* Left Panel - Branding */}
      <div className={`brand-panel ${isLogin ? 'login-active' : 'register-active'}`}>
        <div className="brand-content">
          <div className="dashboard-container">
            <div className="speedometer">
              <div className="speedometer-inner">
                <div className="speed-text">DROWSY</div>
                <div className="speed-subtext">SAFE</div>
                <div className="needle"></div>
              </div>
              <div className="speed-marks">
                <div className="mark mark-1"></div>
                <div className="mark mark-2"></div>
                <div className="mark mark-3"></div>
                <div className="mark mark-4"></div>
                <div className="mark mark-5"></div>
                <div className="mark mark-6"></div>
                <div className="mark mark-7"></div>
                <div className="mark mark-8"></div>
              </div>
            </div>
          </div>
          
          <div className="dashboard-stats">
            <div className="stat-item">
              <FaBolt className="stat-icon" />
              <span className="stat-label">Battery:</span>
              <span className="stat-value">100%</span>
            </div>
            <div className="stat-item">
              <FaWifi className="stat-icon" />
              <span className="stat-label">Signal:</span>
              <span className="stat-value">Strong</span>
            </div>
            <div className="stat-item">
              <FaCheckCircle className="stat-icon" />
              <span className="stat-label">Status:</span>
              <span className="stat-value">Active</span>
            </div>
          </div>
        </div>
        <div className="dashboard-glow"></div>
      </div>

      {/* Right Panel - Forms */}
      <div className="form-panel">
        <div className="form-container">
          <div className="form-header">
            <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p>{isLogin ? 'Sign in to your dashboard' : 'Join our safety network'}</p>
          </div>

          <div className="toggle-buttons">
            <button 
              className={`toggle-btn ${isLogin ? 'active' : ''}`}
              onClick={switchToLogin}
            >
              Login
            </button>
            <button 
              className={`toggle-btn ${!isLogin ? 'active' : ''}`}
              onClick={switchToRegister}
            >
              Register
            </button>
            <div className={`slider ${isLogin ? 'left' : 'right'}`}></div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-fields">
              {!isLogin && (
                <div className="field-group show">
                  <input
                    type="text"
                    name="name"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={handleChange}
                    required={!isLogin}
                  />
                  <span className="field-icon"><FaUser /></span>
                </div>
              )}
              
              <div className="field-group">
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <span className="field-icon"><FaEnvelope /></span>
              </div>
              
              <div className="field-group">
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <span className="field-icon"><FaLock /></span>
              </div>
            </div>
            
            <button type="submit" className="submit-btn">
              <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
              <div className="btn-arrow"><FaArrowRight /></div>
            </button>
          </form>

          <div className="form-footer">
            <p>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button 
                type="button" 
                className="link-btn"
                onClick={isLogin ? switchToRegister : switchToLogin}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;