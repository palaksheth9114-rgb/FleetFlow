"use client";

import { useState, useEffect } from 'react';
import api, { handleApiError } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { vehicleCategories } from '../../lib/vehicleCategories';

interface Vehicle {
  id: number;
  registration_number: string;
  vehicle_type: string;
  owner: string;
  contract_type: string;
  current_km: number;
  status: 'Active' | 'Under Maintenance' | 'Inactive';
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Vehicle>>({});
  const [isEditing, setIsEditing] = useState(false);

  const fetchVehicles = async () => {
    try {
      const res = await api.get('/vehicles');
      setVehicles(res.data);
    } catch (err) {
      handleApiError(err, 'Failed to fetch vehicles list');
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && formData.id) {
        await api.put(`/vehicles/${formData.id}`, formData);
      } else {
        await api.post('/vehicles', formData);
      }
      setShowModal(false);
      setFormData({});
      fetchVehicles();
    } catch (err) {
      const msg = handleApiError(err, 'Failed to save vehicle');
      alert(`Action failed: ${msg}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure?')) {
      try {
        await api.delete(`/vehicles/${id}`);
        fetchVehicles();
      } catch (err) {
        const msg = handleApiError(err, 'Failed to delete vehicle');
        alert(`Action failed: ${msg}`);
      }
    }
  };

  const openEdit = (v: Vehicle) => {
    setFormData(v);
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
    if (status === 'Under Maintenance') return 'status-maintenance';
    return 'status-inactive';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3>Vehicle Management</h3>
        {canEdit && (
          <button className="btn" onClick={openAdd}>
            <Plus size={16} /> Add Vehicle
          </button>
        )}
      </div>

      <div className="glass-panel table-container">
        <table>
          <thead>
            <tr>
              <th>Registration No.</th>
              <th>Vehicle Type</th>
              <th>Owner</th>
              <th>Contract</th>
              <th>Current KM</th>
              <th>Status</th>
              {(canEdit || canDelete) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => (
              <tr key={v.id}>
                <td style={{ fontWeight: 500 }}>{v.registration_number}</td>
                <td>{v.vehicle_type}</td>
                <td>{v.owner}</td>
                <td>{v.contract_type}</td>
                <td>{v.current_km.toLocaleString()} km</td>
                <td>
                  <span className={`status-badge ${getStatusClass(v.status)}`}>{v.status}</span>
                </td>
                {(canEdit || canDelete) && (
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {canEdit && (
                        <button className="btn-secondary" style={{ padding: '6px', borderRadius: '4px' }} onClick={() => openEdit(v)}>
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn-secondary" style={{ padding: '6px', borderRadius: '4px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDelete(v.id)}>
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
            <h3 style={{ marginBottom: '24px' }}>{isEditing ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Registration Number</label>
                <input required className="input-control" value={formData.registration_number || ''} onChange={e => setFormData({...formData, registration_number: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Vehicle Type</label>
                <select required className="input-control" value={formData.vehicle_type || ''} onChange={e => setFormData({...formData, vehicle_type: e.target.value})}>
                  <option value="">Select Type</option>
                  {Object.entries(vehicleCategories).map(([category, types]) => (
                    <optgroup key={category} label={category}>
                      {types.map(t => <option key={t} value={t}>{t}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Owner</label>
                <input required className="input-control" value={formData.owner || ''} onChange={e => setFormData({...formData, owner: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Contract Type</label>
                <input required className="input-control" value={formData.contract_type || ''} onChange={e => setFormData({...formData, contract_type: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Current KM</label>
                <input required type="number" className="input-control" value={formData.current_km || ''} onChange={e => setFormData({...formData, current_km: parseInt(e.target.value)})} />
              </div>
              <div className="input-group">
                <label>Status</label>
                <select className="input-control" value={formData.status || 'Active'} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                  <option value="Active">Active</option>
                  <option value="Under Maintenance">Under Maintenance</option>
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
