"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api, { getErrorMessage, handleApiError } from '../../lib/api';
import { UserPlus, ShieldCheck, KeyRound, Edit2, Trash2, UserCheck, UserX, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface UserRecord {
  id: number;
  username: string;
  role: 'Admin' | 'Manager' | 'Operator' | 'Viewer';
  is_active: number | boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
}

export default function AdminManagementPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Form States
  const [createUsername, setCreateUsername] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'Admin' | 'Manager' | 'Operator' | 'Viewer'>('Operator');

  const [editUsername, setEditUsername] = useState('');
  const [editRole, setEditRole] = useState<'Admin' | 'Manager' | 'Operator' | 'Viewer'>('Operator');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);

  const [resetPasswordInput, setResetPasswordInput] = useState('');

  useEffect(() => {
    if (user?.role === 'Admin') {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err: any) {
      showFeedback('error', getErrorMessage(err, 'Failed to fetch users list.'));
    } finally {
      setLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => {
      setFeedback(null);
    }, 5000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', {
        username: createUsername,
        password: createPassword,
        role: createRole,
        is_active: 1
      });
      showFeedback('success', `User '${createUsername}' created successfully.`);
      setShowCreateModal(false);
      setCreateUsername('');
      setCreatePassword('');
      setCreateRole('Operator');
      fetchUsers();
    } catch (err: any) {
      showFeedback('error', getErrorMessage(err, 'Failed to create user.'));
    }
  };

  const openEditModal = (targetUser: UserRecord) => {
    setSelectedUser(targetUser);
    setEditUsername(targetUser.username);
    setEditRole(targetUser.role);
    setEditIsActive(Boolean(targetUser.is_active));
    setShowEditModal(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await api.put(`/admin/users/${selectedUser.id}`, {
        username: editUsername,
        role: editRole,
        is_active: editIsActive ? 1 : 0
      });
      showFeedback('success', `User '${editUsername}' updated successfully.`);
      setShowEditModal(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      showFeedback('error', getErrorMessage(err, 'Failed to update user.'));
    }
  };

  const handleToggleActive = async (targetUser: UserRecord) => {
    const newStatus = !Boolean(targetUser.is_active);
    try {
      await api.put(`/admin/users/${targetUser.id}`, {
        username: targetUser.username,
        role: targetUser.role,
        is_active: newStatus ? 1 : 0
      });
      showFeedback('success', `User '${targetUser.username}' status set to ${newStatus ? 'Active' : 'Inactive'}.`);
      fetchUsers();
    } catch (err: any) {
      showFeedback('error', getErrorMessage(err, 'Failed to toggle account status.'));
    }
  };

  const openResetModal = (targetUser: UserRecord) => {
    setSelectedUser(targetUser);
    setResetPasswordInput('');
    setShowResetModal(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await api.post(`/admin/users/${selectedUser.id}/reset-password`, {
        newPassword: resetPasswordInput
      });
      showFeedback('success', `Password for user '${selectedUser.username}' reset successfully.`);
      setShowResetModal(false);
      setSelectedUser(null);
      setResetPasswordInput('');
    } catch (err: any) {
      showFeedback('error', getErrorMessage(err, 'Failed to reset password.'));
    }
  };

  const handleDeleteUser = async (targetUser: UserRecord) => {
    if (!confirm(`Are you sure you want to permanently delete user '${targetUser.username}'?`)) return;

    try {
      await api.delete(`/admin/users/${targetUser.id}`);
      showFeedback('success', `User '${targetUser.username}' deleted successfully.`);
      fetchUsers();
    } catch (err: any) {
      showFeedback('error', getErrorMessage(err, 'Failed to delete user.'));
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  if (user?.role !== 'Admin') {
    return (
      <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', maxWidth: '600px', margin: '40px auto' }}>
        <AlertTriangle size={48} color="var(--warning)" style={{ marginBottom: '16px' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          You must have Administrator privileges to access the Admin Management section.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header & Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={28} color="var(--primary)" /> Administrator Management
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '4px' }}>
              Manage users, assign roles, enforce security policies, and monitor system access.
            </p>
          </div>
          <button className="btn" onClick={() => setShowCreateModal(true)}>
            <UserPlus size={18} /> Add New User
          </button>
        </div>

        {/* Global Feedback Banner */}
        {feedback && (
          <div style={{
            padding: '14px 20px',
            borderRadius: '10px',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: feedback.type === 'success' ? 'var(--success)' : 'var(--danger)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
          }}>
            {feedback.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            {feedback.message}
          </div>
        )}

        {/* Users Table Panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Account Status</th>
                  <th>Created Date</th>
                  <th>Last Login</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      Loading user accounts...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                      No user accounts found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>#{u.id}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: u.role === 'Admin' ? 'var(--primary)' : 'var(--bg-panel-hover)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: 'white'
                          }}>
                            {u.username.charAt(0).toUpperCase()}
                          </div>
                          <span>{u.username}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: u.role === 'Admin' ? 'rgba(59, 130, 246, 0.15)' :
                                      u.role === 'Manager' ? 'rgba(139, 92, 246, 0.15)' :
                                      u.role === 'Operator' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                          color: u.role === 'Admin' ? 'var(--primary)' :
                                 u.role === 'Manager' ? 'var(--secondary)' :
                                 u.role === 'Operator' ? 'var(--accent)' : 'var(--text-muted)',
                          border: '1px solid rgba(255, 255, 255, 0.05)'
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${Boolean(u.is_active) ? 'status-active' : 'status-inactive'}`}>
                          {Boolean(u.is_active) ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatDate(u.created_at)}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{formatDate(u.last_login)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            title="Edit User Details & Role"
                            onClick={() => openEditModal(u)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                            title="Reset User Password"
                            onClick={() => openResetModal(u)}
                          >
                            <KeyRound size={14} />
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ 
                              padding: '6px 10px', 
                              fontSize: '0.75rem',
                              color: Boolean(u.is_active) ? 'var(--warning)' : 'var(--success)'
                            }}
                            title={Boolean(u.is_active) ? 'Deactivate User' : 'Activate User'}
                            onClick={() => handleToggleActive(u)}
                          >
                            {Boolean(u.is_active) ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '6px 10px', fontSize: '0.75rem', color: 'var(--danger)' }}
                            title="Delete User"
                            onClick={() => handleDeleteUser(u)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CREATE USER MODAL */}
        {showCreateModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px' }}>Create New User</h3>
              <form onSubmit={handleCreateUser}>
                <div className="input-group">
                  <label>Username</label>
                  <input
                    type="text"
                    className="input-control"
                    value={createUsername}
                    onChange={(e) => setCreateUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Initial Password</label>
                  <input
                    type="password"
                    className="input-control"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Requires min 8 chars, uppercase, lowercase, number & special char.
                  </span>
                </div>
                <div className="input-group">
                  <label>Role</label>
                  <select
                    className="input-control"
                    value={createRole}
                    onChange={(e: any) => setCreateRole(e.target.value)}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Operator">Operator</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* EDIT USER MODAL */}
        {showEditModal && selectedUser && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px' }}>Edit User (#{selectedUser.id})</h3>
              <form onSubmit={handleEditUser}>
                <div className="input-group">
                  <label>Username</label>
                  <input
                    type="text"
                    className="input-control"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>Role</label>
                  <select
                    className="input-control"
                    value={editRole}
                    onChange={(e: any) => setEditRole(e.target.value)}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Operator">Operator</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
                <div className="input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <input
                    type="checkbox"
                    id="editIsActiveCheck"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <label htmlFor="editIsActiveCheck" style={{ cursor: 'pointer', margin: 0, fontSize: '0.9rem' }}>
                    Account Active Status
                  </label>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* RESET PASSWORD MODAL */}
        {showResetModal && selectedUser && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>Reset Password</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '20px' }}>
                Resetting password for user <strong>{selectedUser.username}</strong>.
              </p>
              <form onSubmit={handleResetPassword}>
                <div className="input-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    className="input-control"
                    value={resetPasswordInput}
                    onChange={(e) => setResetPasswordInput(e.target.value)}
                    required
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Must satisfy password policy (8+ chars, upper, lower, number, special).
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowResetModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn">
                    Reset Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
  );
}
