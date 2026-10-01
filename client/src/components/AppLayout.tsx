"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, Users, Wrench, LayoutDashboard, LogOut, MapPin, Map, Bell, BarChart, ShieldCheck, User, WifiOff, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import api from '../lib/api';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(true);
  const [checkingHealth, setCheckingHealth] = useState<boolean>(false);

  const checkBackendHealth = async () => {
    setCheckingHealth(true);
    try {
      await api.get('/health');
      setIsBackendOnline(true);
    } catch (err: any) {
      setIsBackendOnline(false);
    } finally {
      setCheckingHealth(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!user) return null;

  const baseNavItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Vehicles', path: '/vehicles', icon: <Truck size={20} /> },
    { name: 'Drivers', path: '/drivers', icon: <Users size={20} /> },
    { name: 'Maintenance', path: '/maintenance', icon: <Wrench size={20} /> },
    { name: 'Trips', path: '/trips', icon: <MapPin size={20} /> },
    { name: 'Route Optimization', path: '/routes', icon: <Map size={20} /> },
    { name: 'Alerts', path: '/alerts', icon: <Bell size={20} /> },
    { name: 'Reports', path: '/reports', icon: <BarChart size={20} /> },
  ];

  if (user.role === 'Admin') {
    baseNavItems.push({ name: 'Admin Management', path: '/admin', icon: <ShieldCheck size={20} /> });
  }

  const allNavItems = [
    ...baseNavItems,
    { name: 'My Profile', path: '/profile', icon: <User size={20} /> }
  ];

  const currentPageTitle = allNavItems.find(item => item.path === pathname)?.name || 'Dashboard';

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <Truck size={24} />
            FleetFlow
          </div>
        </div>
        <nav className="nav-links">
          {baseNavItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`nav-item ${pathname === item.path ? 'active' : ''}`}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>
        <div style={{ padding: '24px 16px', borderTop: '1px solid var(--border)' }}>
          <Link 
            href="/profile" 
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div 
              className={`nav-item ${pathname === '/profile' ? 'active' : ''}`} 
              style={{ marginBottom: '12px', padding: '8px 12px' }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', flexShrink: 0 }}>
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{user.username}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.role}</div>
              </div>
            </div>
          </Link>
          <button className="nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }} onClick={logout}>
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>
      
      <main className="main-content">
        <header className="topbar">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 500 }}>
            {currentPageTitle}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isBackendOnline ? (
              <span className="status-badge status-active">System Online</span>
            ) : (
              <span 
                className="status-badge" 
                style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                onClick={checkBackendHealth}
                title="Click to retry connecting to server"
              >
                <WifiOff size={14} /> Backend Offline (Port 5002)
              </span>
            )}
          </div>
        </header>

        {!isBackendOnline && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            borderBottom: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            fontSize: '0.875rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <WifiOff size={16} />
              <span><strong>Backend server unreachable:</strong> Could not connect to <code>http://localhost:5002</code>. Please start the backend server.</span>
            </div>
            <button 
              onClick={checkBackendHealth}
              disabled={checkingHealth}
              style={{
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#fff',
                padding: '4px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.75rem'
              }}
            >
              <RefreshCw size={12} className={checkingHealth ? 'spinning' : ''} /> Retry Connection
            </button>
          </div>
        )}

        <div className="page-content">
          {children}
        </div>
      </main>
    </div>
  );
}

