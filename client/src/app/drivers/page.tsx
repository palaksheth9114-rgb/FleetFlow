"use client";

import { useState, useEffect } from 'react';
import api, { handleApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { getVehicleCategory, vehicleCategories } from '../../lib/vehicleCategories';

interface Driver {
  id: number;
  name: string;
  license_number: string;
  assigned_vehicle_id: number | null;
  vehicle_reg: string | null;
  status: 'Active' | 'On Leave' | 'Inactive';
}

interface Vehicle {
  id: number;
  registration_number: string;
  vehicle_type: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Driver>>({});
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = async () => {
    try {
      const [dRes, vRes] = await Promise.all([
        api.get('/drivers'),
        api.get('/vehicles')
      ]);
      setDrivers(dRes.data);
      setVehicles(vRes.data);
    } catch (err) {
      handleApiError(err, 'Failed to fetch drivers list');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && formData.id) {
        await api.put(`/drivers/${formData.id}`, formData);
      } else {
        await api.post('/drivers', formData);
      }
      setShowModal(false);
      setFormData({});
      fetchData();
    } catch (err) {
      const msg = handleApiError(err, 'Failed to save driver');
      alert(`Action failed: ${msg}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure?')) {
      try {
        await api.delete(`/drivers/${id}`);
        fetchData();
      } catch (err) {
        const msg = handleApiError(err, 'Failed to delete driver');
        alert(`Action failed: ${msg}`);
      }
    }
  };

  const openEdit = (d: Driver) => {
    setFormData(d);
    setIsEditing(true);
    setShowModal(true);
  };

  const openAdd = () => {
    setFormData({ status: 'Active' });
    setIsEditing(false);
    setShowModal(true);
  };

  const canEdit = user?.role === 'Admin' || user?.role === 'Manager';
  const canDelete = user?.role === 'Admin';

  const getStatusClass = (status: string) => {
    if (status === 'Active') return 'status-active';
    if (status === 'On Leave') return 'status-leave';
    return 'status-inactive';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3>Driver Management</h3>
        {canEdit && (
          <button className="btn" onClick={openAdd}>
            <Plus size={16} /> Add Driver
          </button>
        )}
      </div>

      <div className="glass-panel table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>License No.</th>
              <th>Assigned Vehicle</th>
              <th>Status</th>
              {(canEdit || canDelete) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => (
              <tr key={d.id}>
                <td style={{ fontWeight: 500 }}>{d.name}</td>
                <td>{d.license_number}</td>
                <td>{d.vehicle_reg || 'Unassigned'}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(d.status)}`}>{d.status}</span>
                </td>
                {(canEdit || canDelete) && (
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {canEdit && (
                        <button className="btn-secondary" style={{ padding: '6px', borderRadius: '4px' }} onClick={() => openEdit(d)}>
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn-secondary" style={{ padding: '6px', borderRadius: '4px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDelete(d.id)}>
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
            <h3 style={{ marginBottom: '24px' }}>{isEditing ? 'Edit Driver' : 'Add Driver'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Full Name</label>
                <input required className="input-control" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="input-group">
                <label>License Number</label>
                <input required className="input-control" value={formData.license_number || ''} onChange={e => setFormData({...formData, license_number: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Assigned Vehicle</label>
                <select className="input-control" value={formData.assigned_vehicle_id || ''} onChange={e => setFormData({...formData, assigned_vehicle_id: e.target.value ? parseInt(e.target.value) : null})}>
                  <option value="">None</option>
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
                <label>Status</label>
                <select className="input-control" value={formData.status || 'Active'} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
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
