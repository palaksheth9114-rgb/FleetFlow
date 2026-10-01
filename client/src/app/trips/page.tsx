"use client";

import { useState, useEffect } from 'react';
import api, { handleApiError, getErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { getVehicleCategory, vehicleCategories } from '../../lib/vehicleCategories';

interface Trip {
  id: number;
  vehicle_id: number;
  driver_id: number;
  origin: string;
  destination: string;
  status: 'Scheduled' | 'Active' | 'Completed';
  distance: number;
  eta: string;
  registration_number: string;
  driver_name: string;
}

interface Vehicle {
  id: number;
  registration_number: string;
  vehicle_type: string;
}

interface Driver {
  id: number;
  name: string;
}

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<Partial<Trip>>({});
  const [isEditing, setIsEditing] = useState(false);

  const fetchData = async () => {
    try {
      const [tRes, vRes, dRes] = await Promise.all([
        api.get('/trips'),
        api.get('/vehicles'),
        api.get('/drivers')
      ]);
      setTrips(tRes.data);
      setVehicles(vRes.data);
      setDrivers(dRes.data);
    } catch (err) {
      handleApiError(err, 'Failed to fetch trips data');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditing && formData.id) {
        await api.put(`/trips/${formData.id}`, formData);
      } else {
        await api.post('/trips', formData);
      }
      setShowModal(false);
      setFormData({});
      fetchData();
    } catch (err) {
      const msg = handleApiError(err, 'Failed to save trip');
      alert(`Action failed: ${msg}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this trip log?')) {
      try {
        await api.delete(`/trips/${id}`);
        fetchData();
      } catch (err) {
        const msg = handleApiError(err, 'Failed to delete trip');
        alert(`Action failed: ${msg}`);
      }
    }
  };

  const openEdit = (t: Trip) => {
    setFormData(t);
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
    if (status === 'Active') return 'status-progress';
    return 'status-maintenance';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h3>Trip Logs</h3>
        {canEdit && (
          <button className="btn" onClick={openAdd}>
            <Plus size={16} /> Log Trip
          </button>
        )}
      </div>

      <div className="glass-panel table-container" style={{ marginTop: '24px' }}>
        <table>
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Driver</th>
              <th>Origin</th>
              <th>Destination</th>
              <th>Distance (km)</th>
              <th>ETA</th>
              <th>Status</th>
              {(canEdit || canDelete) && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {trips.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 500 }}>{t.registration_number || 'N/A'}</td>
                <td>{t.driver_name || 'Unassigned'}</td>
                <td>{t.origin}</td>
                <td>{t.destination}</td>
                <td>{t.distance}</td>
                <td>{t.eta}</td>
                <td>
                  <span className={`status-badge ${getStatusClass(t.status)}`}>{t.status}</span>
                </td>
                {(canEdit || canDelete) && (
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {canEdit && (
                        <button className="btn-secondary" style={{ padding: '6px', borderRadius: '4px' }} onClick={() => openEdit(t)}>
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn-secondary" style={{ padding: '6px', borderRadius: '4px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDelete(t.id)}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {trips.length === 0 && (
              <tr>
                <td colSpan={canEdit || canDelete ? 8 : 7} style={{ textAlign: 'center', padding: '24px' }}>No trips found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="glass-panel" style={{ width: '400px', padding: '24px', background: 'var(--bg-panel-solid)' }}>
            <h3 style={{ marginBottom: '24px' }}>{isEditing ? 'Edit Trip' : 'Log Trip'}</h3>
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
                          <option key={v.id} value={v.id}>{v.registration_number} ({v.vehicle_type})</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>
              <div className="input-group">
                <label>Driver</label>
                <select required className="input-control" value={formData.driver_id || ''} onChange={e => setFormData({...formData, driver_id: parseInt(e.target.value)})}>
                  <option value="">Select Driver</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Origin</label>
                <input required className="input-control" value={formData.origin || ''} onChange={e => setFormData({...formData, origin: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Destination</label>
                <input required className="input-control" value={formData.destination || ''} onChange={e => setFormData({...formData, destination: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Distance (km)</label>
                <input required type="number" className="input-control" value={formData.distance ?? ''} onChange={e => setFormData({...formData, distance: parseInt(e.target.value)})} />
              </div>
              <div className="input-group">
                <label>ETA</label>
                <input required className="input-control" value={formData.eta || ''} onChange={e => setFormData({...formData, eta: e.target.value})} />
              </div>
              <div className="input-group">
                <label>Status</label>
                <select className="input-control" value={formData.status || 'Scheduled'} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Active">Active</option>
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
