import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, role }) => {
  const token = localStorage.getItem('token');
  const currentRole = (localStorage.getItem('role') || '').toLowerCase();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(currentRole) && currentRole !== 'admin') {
      const dashboardPath = currentRole === 'sales' ? '/sales-dashboard' :
                            currentRole === 'registration' ? '/registration-dashboard' :
                            currentRole === 'banking' ? '/banking-dashboard' :
                            currentRole === 'inventory' ? '/inventory-dashboard' :
                            currentRole === 'field_installation' ? '/installation-dashboard' :
                            currentRole === 'electrical' ? '/electrical-dashboard' :
                            currentRole === 'subsidy' ? '/subsidy-dashboard' : '/';
      return <Navigate to={dashboardPath} replace />; 
    }
  }

  return children;
};

export default ProtectedRoute;