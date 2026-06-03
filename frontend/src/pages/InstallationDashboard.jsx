import React from 'react';
import Dashboard from '../components/Dashboard';

const InstallationDashboard = ({ onLogout }) => {
  return <Dashboard onLogout={onLogout} roleBadge="Installation" title="Installation Command Center" />;
};

export default InstallationDashboard;