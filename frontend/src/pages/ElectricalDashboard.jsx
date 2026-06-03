import React from 'react';
import Dashboard from '../components/Dashboard';

const ElectricalDashboard = ({ onLogout }) => {
  return <Dashboard onLogout={onLogout} roleBadge="Electrical" title="Electrical Command Center" />;
};

export default ElectricalDashboard;