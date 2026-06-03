import React from 'react';
import Dashboard from '../components/Dashboard';
const CustomerServiceDashboard = ({ onLogout }) => (
  <Dashboard onLogout={onLogout} roleBadge="Customer Service" title="Customer Service Dashboard" />
);
export default CustomerServiceDashboard;
