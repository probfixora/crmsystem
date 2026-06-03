import React from 'react';
import Dashboard from '../components/Dashboard';
const TechnicalDashboard = ({ onLogout }) => (
  <Dashboard onLogout={onLogout} roleBadge="Technical QA" title="Technical QA Dashboard" />
);
export default TechnicalDashboard;
