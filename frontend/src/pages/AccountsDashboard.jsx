import React from 'react';
import Dashboard from '../components/Dashboard';
const AccountsDashboard = ({ onLogout }) => (
  <Dashboard onLogout={onLogout} roleBadge="Accounts" title="Accounts Dashboard" />
);
export default AccountsDashboard;
