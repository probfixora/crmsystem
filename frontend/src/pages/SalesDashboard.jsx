import React from 'react';
import Dashboard from '../components/Dashboard';

const SalesDashboard = ({ onLogout }) => {
  return <Dashboard onLogout={onLogout} roleBadge="Sales" title="Sales Command Center" />;
};

export default SalesDashboard;