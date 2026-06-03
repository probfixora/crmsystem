import React from 'react';
import Dashboard from '../components/Dashboard';

const InventoryDashboard = ({ onLogout }) => {
  return <Dashboard onLogout={onLogout} roleBadge="Inventory" title="Inventory Command Center" />;
};

export default InventoryDashboard;