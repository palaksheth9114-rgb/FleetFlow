"use client";

import { useState, useEffect } from 'react';
import api, { handleApiError } from '../../lib/api';
import { BarChart, Download, FileText, Activity, Droplet, DollarSign, Map } from 'lucide-react';

interface ReportSummary {
  total_mileage: number;
  maintenance_expenses: number;
  active_drivers: number;
  estimated_fuel_usage_liters: number;
  estimated_fuel_cost: number;
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.get('/reports/summary');
        setSummary(res.data);
      } catch (err) {
        handleApiError(err, 'Failed to fetch summary report');
      }
    };
    fetchSummary();
  }, []);

  const exportCSV = () => {
    if (!summary) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Metric,Value\n"
      + `Total Mileage (km),${summary.total_mileage}\n`
      + `Maintenance Expenses,${summary.maintenance_expenses}\n`
      + `Active Drivers,${summary.active_drivers}\n`
      + `Est. Fuel Usage (L),${summary.estimated_fuel_usage_liters.toFixed(2)}\n`
      + `Est. Fuel Cost,${summary.estimated_fuel_cost.toFixed(2)}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "fleetflow_report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportPDF = () => {
    // A simple approach is to trigger the browser print dialog
    // In a full app, a library like jspdf would be used.
    window.print();
  };

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="hide-on-print">
        <div>
          <h3>Analytics & Reports</h3>
          <p style={{ color: 'var(--text-muted)' }}>View and export fleet performance logs.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn" onClick={exportPDF}>
            <FileText size={16} /> Export PDF
          </button>
        </div>
      </div>

      {summary ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
          
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-panel-solid)', borderRadius: '50%' }}>
                <Map size={24} color="var(--primary)" />
              </div>
              <h4 style={{ margin: 0 }}>Total Mileage</h4>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 600, margin: 0 }}>{summary.total_mileage} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>km</span></p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-panel-solid)', borderRadius: '50%' }}>
                <DollarSign size={24} color="#ff9f43" />
              </div>
              <h4 style={{ margin: 0 }}>Maintenance</h4>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 600, margin: 0 }}><span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>₹</span> {summary.maintenance_expenses}</p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-panel-solid)', borderRadius: '50%' }}>
                <Activity size={24} color="#2ed573" />
              </div>
              <h4 style={{ margin: 0 }}>Active Drivers</h4>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 600, margin: 0 }}>{summary.active_drivers}</p>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', background: 'var(--bg-panel-solid)', borderRadius: '50%' }}>
                <Droplet size={24} color="#70a1ff" />
              </div>
              <h4 style={{ margin: 0 }}>Fuel Usage</h4>
            </div>
            <p style={{ fontSize: '2rem', fontWeight: 600, margin: 0 }}>{summary.estimated_fuel_usage_liters.toFixed(1)} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Liters</span></p>
            <p style={{ color: 'var(--text-muted)', margin: '8px 0 0' }}>Est. Cost: ₹{summary.estimated_fuel_cost.toFixed(2)}</p>
          </div>

        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          Loading reports...
        </div>
      )}

      {/* Basic style for printing */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .hide-on-print { display: none !important; }
          .sidebar { display: none !important; }
          .topbar { display: none !important; }
          .app-container { display: block !important; }
          body { background: white; color: black; }
          .glass-panel { background: none; border: 1px solid #ccc; box-shadow: none; break-inside: avoid; }
        }
      `}} />
    </div>
  );
}
