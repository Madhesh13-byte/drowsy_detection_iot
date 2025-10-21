import React, { useState, useEffect } from 'react';
import { FaSmile, FaMeh, FaTired, FaQuestion, FaExclamationTriangle, FaExclamationCircle, FaCheckCircle, FaCog } from 'react-icons/fa';
import ProfileSetup from './ProfileSetup';
import './Dashboard.css';

const Dashboard = ({ user, onLogout }) => {
  const [driverState, setDriverState] = useState('normal');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:5000');
    
    ws.onopen = () => {
      setIsConnected(true);
      console.log('Connected to WebSocket server');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.state) {
          setDriverState(data.state);
          setLastUpdated(new Date(data.lastUpdated));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket server');
    };

    return () => ws.close();
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