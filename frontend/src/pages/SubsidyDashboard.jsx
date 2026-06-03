import React from 'react';
import Dashboard from '../components/Dashboard';

const SubsidyDashboard = ({ onLogout }) => {
  return <Dashboard onLogout={onLogout} roleBadge="Subsidy" title="Subsidy Command Center" />;
};

export default SubsidyDashboard;
