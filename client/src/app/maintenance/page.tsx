"use client";

import { useState, useEffect } from 'react';
import api, { handleApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { getVehicleCategory, vehicleCategories } from '../../lib/vehicleCategories';

interface Maintenance {
  id: number;
  vehicle_id: number;
  registration_number: string;
  service_date: string;
  details: string;
  cost: number;
  status: 'Scheduled' | 'In Progress' | 'Completed';
}

interface Vehicle {
  id: number;
  registration_number: string;
  vehicle_type: string;
}

export default function MaintenancePage() {
  const [records, setRecords] = useState<Maintenance[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Maintenance>>({});
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = async () => {
    try {
      const [mRes, vRes] = await Promise.all([
        api.get('/maintenance'),
        api.get('/vehicles')
      ]);
      setRecords(mRes.data);
      setVehicles(vRes.data);
    } catch (err) {
      handleApiError(err, 'Failed to fetch maintenance records');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && formData.id) {
        await api.put(`/maintenance/${formData.id}`, formData);
      } else {
        await api.post('/maintenance', formData);
      }
      setShowModal(false);
      setFormData({});
      fetchData();
    } catch (err) {
      const msg = handleApiError(err, 'Failed to save maintenance record');
      alert(`Action failed: ${msg}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this maintenance record?')) {
      try {
        await api.delete(`/maintenance/${id}`);
        fetchData();
      } catch (err) {
        const msg = handleApiError(err, 'Failed to delete maintenance record');
        alert(`Action failed: ${msg}`);
      }
    }
  };

  const openEdit = (r: Maintenance) => {
    const formattedDate = r.service_date ? new Date(r.service_date).toISOString().split('T')[0] : '';
    setFormData({ ...r, service_date: formattedDate });
    setIsEditing(true);
    setShowModal(true);
  };

  const openAdd = () => {
    setFormData({ status: 'Scheduled' });
    setIsEditing(false);
    setShowModal(true);
  };

  const canEdit = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Operator';
  const canDelete = user?.role === 'Admin' || user?.role === 'Manager';

  const getStatusClass = (status: string) => {
    if (status === 'Completed') return 'status-completed';
    if (status === 'In Progress') return 'status-progress';
    return 'status-maintenance';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3>Maintenance Records</h3>
        {canEdit && (
          <button className="btn" onClick={openAdd}>
            <Plus size={16} /> Log Maintenance
          </button>
        )}
      </div>

      <div className="glass-panel table-container" style={{ marginTop: '24px' }}>
        <table>
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Service Date</th>
              <th>Details</th>
              <th>Cost (₹)</th>
              <th>Status</th>
              {(canEdit || canDelete) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 500 }}>{r.registration_number}</td>
                <td>{new Date(r.service_date).toLocaleDateString()}</td>
                <td>{r.details}</td>
                <td>₹{r.cost.toLocaleString()}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(r.status)}`}>{r.status}</span>
                </td>
                {(canEdit || canDelete) && (
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {canEdit && (
                        <button className="btn-secondary" style={{ padding: '6px', borderRadius: '4px' }} onClick={() => openEdit(r)}>
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn-secondary" style={{ padding: '6px', borderRadius: '4px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDelete(r.id)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '400px', padding: '24px', background: 'var(--bg-panel-solid)' }}>
            <h3 style={{ marginBottom: '24px' }}>{isEditing ? 'Edit Maintenance Record' : 'Log Maintenance'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Vehicle</label>
                <select required className="input-control" value={formData.vehicle_id || ''} onChange={e => setFormData({ ...formData, vehicle_id: parseInt(e.target.value) })}>
                  <option value="">Select Vehicle</option>
                  {Object.keys(vehicleCategories).concat(['Other']).map(cat => {
                    const groupVehicles = vehicles.filter(v => getVehicleCategory(v.vehicle_type) === cat);
                    if (groupVehicles.length === 0) return null;
                    return (
                      <optgroup key={cat} label={cat}>
                        {groupVehicles.map(v => (
                          <option key={v.id} value={v.id}>{v.registration_number} ({v.vehicle_type})</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
              <div className="input-group">
                <label>Service Date</label>
                <input required type="date" className="input-control" value={formData.service_date || ''} onChange={e => setFormData({ ...formData, service_date: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Details</label>
                <input required className="input-control" value={formData.details || ''} onChange={e => setFormData({ ...formData, details: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Cost</label>
                <input required type="number" className="input-control" value={formData.cost ?? ''} onChange={e => setFormData({ ...formData, cost: parseInt(e.target.value) })} />
              </div>
              <div className="input-group">
                <label>Status</label>
                <select className="input-control" value={formData.status || 'Scheduled'} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn" style={{ flex: 1 }}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
