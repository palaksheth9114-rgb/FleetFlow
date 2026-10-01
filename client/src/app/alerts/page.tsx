"use client";

import { useState, useEffect } from 'react';
import api, { handleApiError } from '../../lib/api';
import { Bell, AlertTriangle, Info, ShieldAlert, Zap, Plus, Trash2 } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { getVehicleCategory, vehicleCategories } from '../../lib/vehicleCategories';

interface Alert {
  id: number;
  vehicle_id: number;
  type: string;
  message: string;
  status: 'Unread' | 'Read';
  timestamp: string;
  registration_number: string;
}

interface Vehicle {
  id: number;
  registration_number: string;
  vehicle_type: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Alert>>({ type: 'Maintenance', status: 'Unread' });
  const { user } = useAuth();

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/alerts');
      setAlerts(res.data);
    } catch (err) {
      handleApiError(err, 'Failed to fetch alerts list');
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles');
      setVehicles(res.data);
    } catch (err) {
      handleApiError(err, 'Failed to fetch vehicles for alerts');
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchVehicles();

    const socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5002');
    socket.on('alert_new', (newAlert: Alert) => {
      setAlerts(prev => {
        if (prev.find(a => a.id === newAlert.id)) return prev;
        return [newAlert, ...prev];
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const markAsRead = async (id: number) => {
    try {
      await api.put(`/alerts/${id}/read`);
      setAlerts(alerts.map(a => a.id === id ? { ...a, status: 'Read' } : a));
    } catch (err) {
      handleApiError(err, 'Failed to mark alert as read');
    }
  };

  const deleteAlert = async (id: number) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;
    try {
      await api.delete(`/alerts/${id}`);
      setAlerts(alerts.filter(a => a.id !== id));
    } catch (err) {
      const msg = handleApiError(err, 'Failed to delete alert');
      alert(`Failed to delete alert: ${msg}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/alerts', formData);
      setAlerts(prev => {
        if (prev.find(a => a.id === res.data.id)) return prev;
        return [res.data, ...prev];
      });
      setShowModal(false);
      setFormData({ type: 'Maintenance', status: 'Unread' });
    } catch (err) {
      const msg = handleApiError(err, 'Failed to create alert');
      alert(`Failed to create alert: ${msg}`);
    }
  };

  const getAlertIcon = (type: string) => {
    switch(type) {
      case 'Maintenance': return <AlertTriangle size={20} color="var(--primary)" />;
      case 'Speeding': return <Zap size={20} color="#ff4d4d" />;
      case 'Geofence': return <ShieldAlert size={20} color="#ff9f43" />;
      default: return <Info size={20} color="var(--text-muted)" />;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>Real-Time Alerts</h3>
          <p style={{ color: 'var(--text-muted)' }}>Critical vehicle events and notifications.</p>
        </div>
        {user?.role !== 'Viewer' && (
          <button className="btn" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Simulate Alert
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {alerts.length === 0 ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Bell size={32} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p>No alerts at this time.</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className="glass-panel" style={{ padding: '20px', display: 'flex', alignItems: 'flex-start', gap: '16px', borderLeft: alert.status === 'Unread' ? '4px solid var(--primary)' : '4px solid transparent' }}>
              <div style={{ padding: '12px', background: 'var(--bg-panel-solid)', borderRadius: '50%' }}>
                {getAlertIcon(alert.type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h5 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {alert.type} Alert
                    <span className="status-badge" style={{ background: 'var(--bg-panel-solid)' }}>
                      Vehicle: {alert.registration_number || 'N/A'}
                    </span>
                  </h5>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {new Date(alert.timestamp).toLocaleString()}
                  </span>
                </div>
                <p style={{ color: 'var(--text-normal)', margin: 0 }}>{alert.message}</p>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {alert.status === 'Unread' && (
                  <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }} onClick={() => markAsRead(alert.id)}>
                    Mark Read
                  </button>
                )}
                {user?.role !== 'Viewer' && (
                  <button className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '6px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => deleteAlert(alert.id)}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '400px', padding: '24px', background: 'var(--bg-panel-solid)' }}>
            <h3 style={{ marginBottom: '24px' }}>Simulate Alert</h3>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Vehicle</label>
                <select required className="input-control" value={formData.vehicle_id || ''} onChange={e => setFormData({...formData, vehicle_id: parseInt(e.target.value)})}>
                  <option value="">Select Vehicle</option>
                  {Object.keys(vehicleCategories).concat(['Other']).map(cat => {
                    const groupVehicles = vehicles.filter(v => getVehicleCategory(v.vehicle_type) === cat);
                    if (groupVehicles.length === 0) return null;
                    return (
                      <optgroup key={cat} label={cat}>
                        {groupVehicles.map(v => (
                          <option key={v.id} value={v.id}>{v.vehicle_type}</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
              <div className="input-group">
                <label>Alert Type</label>
                <select required className="input-control" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Speeding">Speeding</option>
                  <option value="Geofence">Geofence</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="input-group">
                <label>Message</label>
                <input required className="input-control" value={formData.message || ''} onChange={e => setFormData({...formData, message: e.target.value})} placeholder="E.g., Vehicle exceeded speed limit" />
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn" style={{ flex: 1 }}>Trigger Alert</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
