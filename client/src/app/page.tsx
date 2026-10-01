"use client";

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api, { handleApiError } from '../lib/api';
import { Truck, CheckCircle, Wrench, XCircle, DollarSign, Navigation } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface Stats {
  totalVehicles: number;
  activeVehicles: number;
  underMaintenance: number;
  inactive: number;
  totalKm: number;
  monthlyMaintenanceCost: number;
}

const mockChartData = [
  { name: 'Jan', km: 24000, cost: 4000 },
  { name: 'Feb', km: 13980, cost: 3000 },
  { name: 'Mar', km: 98000, cost: 2000 },
  { name: 'Apr', km: 39080, cost: 2780 },
  { name: 'May', km: 48000, cost: 1890 },
  { name: 'Jun', km: 38000, cost: 2390 },
  { name: 'Jul', km: 43000, cost: 3490 },
];

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  
  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard');
      setStats(res.data);
    } catch (err: any) {
      if (err.response?.status !== 401) {
        handleApiError(err, 'Failed to fetch dashboard stats');
      }
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      fetchStats();
    }
    const socket = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5002');
    socket.on('dashboard_updated', () => {
      if (typeof window !== 'undefined' && localStorage.getItem('token')) {
        fetchStats();
      }
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  if (!stats) return <div style={{ padding: '24px' }}>Loading...</div>;

  return (
    <div>
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-title">Total Vehicles</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Truck size={32} color="var(--primary)" />
            {stats.totalVehicles}
          </div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-title">Active Vehicles</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle size={32} color="var(--success)" />
            {stats.activeVehicles}
          </div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-title">Under Maintenance</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Wrench size={32} color="var(--warning)" />
            {stats.underMaintenance}
          </div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-title">Inactive</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <XCircle size={32} color="var(--danger)" />
            {stats.inactive}
          </div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-title">Total KM Driven</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Navigation size={32} color="var(--accent)" />
            {stats.totalKm.toLocaleString()} km
          </div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-title">Monthly Maintenance</div>
          <div className="stat-value" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <DollarSign size={32} color="var(--secondary)" />
            ₹{stats.monthlyMaintenanceCost.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="glass-panel chart-card">
          <h3>KM Driven Over Time</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <AreaChart data={mockChartData}>
                <defs>
                  <linearGradient id="colorKm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-panel-solid)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-main)' }}
                />
                <Area type="monotone" dataKey="km" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorKm)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel chart-card">
          <h3>Monthly Expenses</h3>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer>
              <BarChart data={mockChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis stroke="var(--text-muted)" tick={{ fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-panel-solid)', border: '1px solid var(--border)', borderRadius: '8px' }}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                />
                <Bar dataKey="cost" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
