import React from 'react';
import Dashboard from '../components/Dashboard';

const AdminDashboard = ({ onLogout }) => {
  return <Dashboard onLogout={onLogout} roleBadge="Admin" title="Admin Command Center" />;
};

export default AdminDashboard;