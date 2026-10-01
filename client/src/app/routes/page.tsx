"use client";

import { useState } from 'react';
import { Map, MapPin, Navigation } from 'lucide-react';

interface RouteResult {
  distance: number;
  eta: string;
  waypoints: string[];
}

export default function RouteOptimizationPage() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [waypoints, setWaypoints] = useState<string[]>(['']);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [calculating, setCalculating] = useState(false);

  const addWaypoint = () => setWaypoints([...waypoints, '']);
  const updateWaypoint = (index: number, value: string) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index] = value;
    setWaypoints(newWaypoints);
  };
  const removeWaypoint = (index: number) => {
    setWaypoints(waypoints.filter((_, i) => i !== index));
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setCalculating(true);
    
    // Simulate API call for route optimization
    setTimeout(() => {
      const validWaypoints = waypoints.filter(w => w.trim() !== '');
      const totalPoints = 2 + validWaypoints.length;
      
      setResult({
        distance: Math.floor(Math.random() * 500) + 50,
        eta: `${Math.floor(Math.random() * 8) + 1} hours ${Math.floor(Math.random() * 60)} mins`,
        waypoints: [origin, ...validWaypoints, destination]
      });
      setCalculating(false);
    }, 1500);
  };

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h3>Route Optimization</h3>
        <p style={{ color: 'var(--text-muted)' }}>Calculate the most efficient routes including waypoints.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={18} /> Route Details
          </h4>
          <form onSubmit={handleCalculate}>
            <div className="input-group">
              <label>Origin</label>
              <input required className="input-control" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="Starting point" />
            </div>

            <div style={{ margin: '16px 0' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)' }}>Waypoints</label>
              {waypoints.map((wp, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input className="input-control" value={wp} onChange={e => updateWaypoint(i, e.target.value)} placeholder={`Waypoint ${i + 1}`} />
                  <button type="button" className="btn btn-secondary" onClick={() => removeWaypoint(i)}>X</button>
                </div>
              ))}
              <button type="button" className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '4px 12px' }} onClick={addWaypoint}>
                + Add Waypoint
              </button>
            </div>

            <div className="input-group">
              <label>Destination</label>
              <input required className="input-control" value={destination} onChange={e => setDestination(e.target.value)} placeholder="Ending point" />
            </div>

            <button type="submit" className="btn" style={{ width: '100%', marginTop: '16px' }} disabled={calculating}>
              {calculating ? 'Calculating...' : 'Optimize Route'}
            </button>
          </form>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Map size={18} /> Optimization Results
          </h4>
          
          {calculating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)' }}>
              <Navigation size={32} className="spinning" style={{ marginBottom: '16px' }} />
              <p>Analyzing optimal paths...</p>
            </div>
          ) : result ? (
            <div>
              <div style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
                <div className="stat-card" style={{ flex: 1, padding: '16px' }}>
                  <div className="stat-label">Total Distance</div>
                  <div className="stat-value">{result.distance} km</div>
                </div>
                <div className="stat-card" style={{ flex: 1, padding: '16px' }}>
                  <div className="stat-label">Estimated ETA</div>
                  <div className="stat-value" style={{ fontSize: '1.25rem' }}>{result.eta}</div>
                </div>
              </div>

              <h5 style={{ marginBottom: '12px', color: 'var(--text-muted)' }}>Optimized Path:</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {result.waypoints.map((wp, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: i === 0 || i === result.waypoints.length - 1 ? 'var(--primary)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {i + 1}
                    </div>
                    <div style={{ padding: '12px', background: 'var(--bg-panel-solid)', borderRadius: '8px', flex: 1, border: '1px solid var(--border)' }}>
                      {wp}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-muted)' }}>
              Enter route details to see optimization results.
            </div>
          )}
        </div>
      </div>
      
      {/* Optional dummy style for spinning if not exists */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spinning { animation: spin 2s linear infinite; }
      `}} />
    </div>
  );
}
