import React, { useState, useEffect } from 'react';
import { FaUser, FaPhone, FaPlus, FaTrash, FaSave } from 'react-icons/fa';
import './ProfileSetup.css';

const ProfileSetup = ({ user, onClose }) => {
  const [profile, setProfile] = useState({
    age: '',
    emergencyContacts: [{ name: '', phone: '', relationship: 'spouse', isPrimary: true }],
    medicalInfo: {
      conditions: [],
      medications: [],
      allergies: []
    },
    alertSettings: {
      drowsyThreshold: 30,
      criticalThreshold: 120,
      enableSMS: true,
      enableCall: false
    }
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/driver/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.age) setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const saveProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Saving profile:', profile);
      
      const response = await fetch('http://localhost:5000/api/driver/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profile)
      });
      
      const data = await response.json();
      console.log('Response:', data);
      
      if (response.ok) {
        alert('Profile saved successfully!');
        onClose();
      } else {
        alert(`Failed to save profile: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert(`Error saving profile: ${error.message}`);
    }
  };

  const addContact = () => {
    setProfile({
      ...profile,
      emergencyContacts: [...profile.emergencyContacts, { name: '', phone: '', relationship: 'other', isPrimary: false }]
    });
  };

  const removeContact = (index) => {
    const contacts = profile.emergencyContacts.filter((_, i) => i !== index);
    setProfile({ ...profile, emergencyContacts: contacts });
  };

  const updateContact = (index, field, value) => {
    const contacts = [...profile.emergencyContacts];
    contacts[index][field] = value;
    setProfile({ ...profile, emergencyContacts: contacts });
  };

  return (
    <div className="profile-overlay">
      <div className="profile-modal">
        <div className="profile-header">
          <h2><FaUser /> Driver Profile Setup</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="profile-content">
          <div className="profile-section">
            <h3>Personal Information</h3>
            <div className="form-group">
              <label>Age</label>
              <input
                type="number"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                placeholder="Enter your age"
                min="16"
                max="100"
              />
            </div>
          </div>

          <div className="profile-section">
            <h3><FaPhone /> Emergency Contacts</h3>
            {profile.emergencyContacts.map((contact, index) => (
              <div key={index} className="contact-group">
                <input
                  type="text"
                  placeholder="Contact Name"
                  value={contact.name}
                  onChange={(e) => updateContact(index, 'name', e.target.value)}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={contact.phone}
                  onChange={(e) => updateContact(index, 'phone', e.target.value)}
                />
                <select
                  value={contact.relationship}
                  onChange={(e) => updateContact(index, 'relationship', e.target.value)}
                >
                  <option value="spouse">Spouse</option>
                  <option value="parent">Parent</option>
                  <option value="sibling">Sibling</option>
                  <option value="friend">Friend</option>
                  <option value="colleague">Colleague</option>
                  <option value="other">Other</option>
                </select>
                {profile.emergencyContacts.length > 1 && (
                  <button onClick={() => removeContact(index)} className="remove-btn">
                    <FaTrash />
                  </button>
                )}
              </div>
            ))}
            <button onClick={addContact} className="add-btn">
              <FaPlus /> Add Contact
            </button>
          </div>

          <div className="profile-section">
            <h3>Alert Settings</h3>
            <div className="form-group">
              <label>Drowsy Alert Threshold (seconds)</label>
              <input
                type="number"
                value={profile.alertSettings.drowsyThreshold}
                onChange={(e) => setProfile({
                  ...profile,
                  alertSettings: { ...profile.alertSettings, drowsyThreshold: parseInt(e.target.value) }
                })}
                min="10"
                max="300"
              />
            </div>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={profile.alertSettings.enableSMS}
                  onChange={(e) => setProfile({
                    ...profile,
                    alertSettings: { ...profile.alertSettings, enableSMS: e.target.checked }
                  })}
                />
                Enable SMS Alerts
              </label>
            </div>
          </div>
        </div>

        <div className="profile-footer">
          <button onClick={saveProfile} className="save-btn">
            <FaSave /> Save Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;