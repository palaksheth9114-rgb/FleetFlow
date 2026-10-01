"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { handleApiError, getErrorMessage } from '../../lib/api';
import { User, KeyRound, Shield, Calendar, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  
  // Profile Form State
  const [profileData, setProfileData] = useState<any>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadingPassword, setLoadingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/me');
      setProfileData(res.data);
      setUsernameInput(res.data.username || '');
    } catch (err: any) {
      if (err.response?.status !== 401) {
        handleApiError(err, 'Failed to fetch user profile');
      }
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setLoadingProfile(true);

    try {
      const res = await api.put('/auth/profile', { username: usernameInput });
      setProfileData(res.data);
      updateUser({ username: res.data.username });
      setProfileMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      setProfileMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update profile.'
      });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New password and confirmation password do not match.' });
      return;
    }

    setLoadingPassword(true);

    try {
      const res = await api.put('/auth/change-password', {
        currentPassword,
        newPassword,
        confirmPassword
      });
      setPasswordMessage({ type: 'success', text: res.data.message || 'Password changed successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to change password.'
      });
    } finally {
      setLoadingPassword(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Profile Overview & Account Status */}
        <div className="glass-panel" style={{ padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'white',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
            }}>
              {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{user?.username}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                <span className="status-badge status-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Shield size={14} /> {user?.role}
                </span>
                <span className="status-badge status-active">Account Active</span>
              </div>
            </div>
          </div>

          <div className="stats-grid" style={{ marginBottom: 0, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <div className="stat-card glass-panel" style={{ padding: '16px 20px' }}>
              <div className="stat-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <User size={16} /> Username
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{profileData?.username || user?.username}</div>
            </div>

            <div className="stat-card glass-panel" style={{ padding: '16px 20px' }}>
              <div className="stat-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Shield size={16} /> System Role
              </div>
              <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{profileData?.role || user?.role}</div>
            </div>

            <div className="stat-card glass-panel" style={{ padding: '16px 20px' }}>
              <div className="stat-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={16} /> Created At
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '4px' }}>{formatDate(profileData?.created_at)}</div>
            </div>

            <div className="stat-card glass-panel" style={{ padding: '16px 20px' }}>
              <div className="stat-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} /> Last Login
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 500, marginTop: '4px' }}>{formatDate(profileData?.last_login)}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
          
          {/* Update Account Profile */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <User size={20} color="var(--primary)" /> Profile Settings
            </h3>

            {profileMessage && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: profileMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: profileMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${profileMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}>
                {profileMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {profileMessage.text}
              </div>
            )}

            <form onSubmit={handleUpdateProfile}>
              <div className="input-group">
                <label>Username</label>
                <input
                  type="text"
                  className="input-control"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Role (Read Only)</label>
                <input
                  type="text"
                  className="input-control"
                  value={profileData?.role || user?.role || ''}
                  disabled
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Role changes can only be performed by an Administrator.
                </span>
              </div>

              <button type="submit" className="btn" style={{ marginTop: '16px' }} disabled={loadingProfile}>
                {loadingProfile ? 'Updating...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>

          {/* Change Password Panel */}
          <div className="glass-panel" style={{ padding: '28px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <KeyRound size={20} color="var(--accent)" /> Security & Password
            </h3>

            {passwordMessage && (
              <div style={{
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: passwordMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: passwordMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${passwordMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
              }}>
                {passwordMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                {passwordMessage.text}
              </div>
            )}

            <form onSubmit={handleChangePassword}>
              <div className="input-group">
                <label>Current Password</label>
                <input
                  type="password"
                  className="input-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>New Password</label>
                <input
                  type="password"
                  className="input-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Must be 8+ chars with uppercase, lowercase, number & special character.
                </span>
              </div>

              <div className="input-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  className="input-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn" style={{ marginTop: '16px', background: 'var(--accent)' }} disabled={loadingPassword}>
                {loadingPassword ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>

        </div>

      </div>
  );
}
