import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Footer from '../components/Footer';
import AdminWattageMapping from '../components/AdminWattageMapping';

export default function WattageSettings({ onLogout }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Sidebar onLogout={onLogout} />
      <main style={{ flex: 1, marginLeft: 'var(--main-offset)', padding: '28px 32px' }}>
        <Header
          title="Solar System Capacity Mapping"
          subtitle="Define how many Watts each kW system size equals — used automatically in Quotation & Case forms"
          onLogout={onLogout}
        />
        <div style={{ maxWidth: 760 }}>
          <AdminWattageMapping />
        </div>
        <Footer />
      </main>
    </div>
  );
}
