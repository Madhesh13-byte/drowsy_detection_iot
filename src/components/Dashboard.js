import React, { useState, useEffect } from 'react';
import { FaSmile, FaMeh, FaTired, FaQuestion, FaExclamationTriangle, FaExclamationCircle, FaCheckCircle, FaCog, FaTachometerAlt, FaClock, FaShieldAlt, FaBell } from 'react-icons/fa';
import ProfileSetup from './ProfileSetup';
import Charts from './Charts';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const [driverState, setDriverState] = useState('normal');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [analytics, setAnalytics] = useState({
    drowsinessScore: 100,
    sessionDuration: 0,
    alertsToday: 0,
    safetyStreak: 0,
    isActive: false
  });

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/analytics/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5000');
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('Connected to WebSocket server');
      fetchAnalytics(); // Fetch initial analytics
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.state) {
          setDriverState(data.state);
          setLastUpdated(new Date(data.lastUpdated));
          fetchAnalytics(); // Update analytics on state change
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket server');
    };

    // Refresh analytics every 30 seconds
    const analyticsInterval = setInterval(fetchAnalytics, 30000);

    return () => {
      ws.close();
      clearInterval(analyticsInterval);
    };
  }, []);

  const getStateColor = (state) => {
    switch (state) {
      case 'normal': return '#4CAF50';
      case 'drowsy': return '#FF9800';
      case 'yawn': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getStateIcon = (state) => {
    switch (state) {
      case 'normal': return <FaSmile />;
      case 'drowsy': return <FaMeh />;
      case 'yawn': return <FaTired />;
      default: return <FaQuestion />;
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Driver Dashboard</h1>
        <div className="user-info">
          <span>Welcome, {user.name}</span>
          <button onClick={() => setShowProfile(true)} className="profile-btn">
            <FaCog /> Profile
          </button>
          <button onClick={onLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Analytics Cards */}
        <div className="analytics-grid">
          <div className="analytics-card drowsiness-score">
            <div className="card-header">
              <FaTachometerAlt className="card-icon" />
              <h3>Drowsiness Score</h3>
            </div>
            <div className="gauge-container">
              <div className="circular-gauge">
                <div 
                  className="gauge-fill"
                  style={{
                    background: `conic-gradient(${analytics.drowsinessScore >= 80 ? '#4CAF50' : analytics.drowsinessScore >= 60 ? '#FF9800' : '#F44336'} ${analytics.drowsinessScore * 3.6}deg, #e0e0e0 0deg)`
                  }}
                >
                  <div className="gauge-center">
                    <span className="gauge-value">{analytics.drowsinessScore}</span>
                    <span className="gauge-unit">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="analytics-card session-timer">
            <div className="card-header">
              <FaClock className="card-icon" />
              <h3>Session Duration</h3>
            </div>
            <div className="metric-value">
              <span className="value">{Math.floor(analytics.sessionDuration / 60)}</span>
              <span className="unit">h</span>
              <span className="value">{analytics.sessionDuration % 60}</span>
              <span className="unit">m</span>
            </div>
            <div className="metric-status">
              {analytics.isActive ? '● Active Session' : '○ No Active Session'}
            </div>
          </div>

          <div className="analytics-card alerts-counter">
            <div className="card-header">
              <FaBell className="card-icon" />
              <h3>Alerts Today</h3>
            </div>
            <div className="metric-value">
              <span className="value large">{analytics.alertsToday}</span>
            </div>
            <div className="metric-status">
              {analytics.alertsToday === 0 ? 'No Alerts' : `${analytics.alertsToday} Alert${analytics.alertsToday > 1 ? 's' : ''}`}
            </div>
          </div>

        </div>

        {/* Current Status */}
        <div className="status-section">
          <div className="status-card">
            <h2>Current Status</h2>
            <div 
              className="status-indicator"
              style={{ backgroundColor: getStateColor(driverState) }}
            >
              <span className="status-icon">{getStateIcon(driverState)}</span>
              <span className="status-text">{driverState ? driverState.toUpperCase() : 'UNKNOWN'}</span>
            </div>
            
            <div className="status-info">
              <p>Connection: 
                <span className={isConnected ? 'connected' : 'disconnected'}>
                  {isConnected ? ' Connected' : ' Disconnected'}
                </span>
              </p>
              {lastUpdated && (
                <p>Last Updated: {lastUpdated.toLocaleTimeString()}</p>
              )}
            </div>
          </div>

          <div className="alerts-card">
            <h3>Safety Alerts</h3>
            <div className="alert-list">
              {driverState === 'drowsy' && (
                <div className="alert warning">
                  <FaExclamationTriangle /> Driver showing signs of drowsiness
                </div>
              )}
              {driverState === 'yawn' && (
                <div className="alert danger">
                  <FaExclamationCircle /> Driver is yawning - Take a break!
                </div>
              )}
              {(driverState === 'normal' || !driverState) && (
                <div className="alert success">
                  <FaCheckCircle /> Driver is alert and focused
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Charts Section */}
        <Charts user={user} />
      </div>
      
      {showProfile && (
        <ProfileSetup 
          user={user} 
          onClose={() => setShowProfile(false)} 
        />
      )}
    </div>
  );
};

export default Dashboard;