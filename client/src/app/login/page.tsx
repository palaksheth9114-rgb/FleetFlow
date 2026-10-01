"use client";

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { getErrorMessage } from '../../lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/auth/login', { username, password });
      login(response.data.token, response.data.user);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Login failed. Please check credentials.'));
    }
  };

  return (
    <div className="login-container">
      <div className="glass-panel login-card">
        <div className="login-header">
          <h1>FleetFlow</h1>
          <p>Enterprise Fleet Management</p>
        </div>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', textAlign: 'center', fontSize: '0.875rem', background: 'rgba(239, 68, 68, 0.1)', padding: '8px', borderRadius: '4px' }}>{error}</div>}
        
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Username</label>
            <input 
              type="text" 
              className="input-control" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              className="input-control" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
            />
          </div>
          <button type="submit" className="btn" style={{ width: '100%', marginTop: '16px', padding: '12px' }}>
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
}
