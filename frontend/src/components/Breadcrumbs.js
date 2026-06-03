import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels = {
  '/':                     'Home',
  '/cases':                'Cases',
  '/create-case':          'New Case',
  '/users':                'User Management',
  '/profile':              'My Profile',
  '/support':              'Support',
  '/admin-dashboard':      'Admin Dashboard',
  '/sales-dashboard':      'Sales Dashboard',
  '/banking-dashboard':    'Banking Dashboard',
  '/inventory-dashboard':      'Inventory Dashboard',
  '/installation-dashboard': 'Installation Dashboard',
  '/electrical-dashboard': 'Electrical Dashboard',
  '/subsidy-dashboard':    'Subsidy Dashboard',
};

const Breadcrumbs = () => {
  const { pathname } = useLocation();
  if (pathname === '/' || Object.keys(routeLabels).some(k => k !== '/' && k.includes('dashboard') && pathname === k)) return null;

  const segments = pathname.split('/').filter(Boolean);
  const crumbs   = [{ label: 'Home', path: '/' }];
  let   built    = '';

  segments.forEach(seg => {
    built += `/${seg}`;
    const label = routeLabels[built] || seg.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    crumbs.push({ label, path: built });
  });

  if (crumbs.length <= 1) return null;

  return (
    <nav aria-label="breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <React.Fragment key={crumb.path}>
            {i === 0 ? (
              <Link to={crumb.path} style={{ display: 'flex', alignItems: 'center', color: 'var(--text-4)', textDecoration: 'none' }}>
                <Home style={{ width: '12px', height: '12px' }} />
              </Link>
            ) : isLast ? (
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-2)' }}>{crumb.label}</span>
            ) : (
              <Link to={crumb.path} style={{ fontSize: '12px', color: 'var(--text-4)', textDecoration: 'none', fontWeight: 500 }}
                onMouseEnter={e => e.target.style.color = 'var(--text-2)'}
                onMouseLeave={e => e.target.style.color = 'var(--text-4)'}
              >
                {crumb.label}
              </Link>
            )}
            {!isLast && <ChevronRight style={{ width: '12px', height: '12px', color: 'var(--text-5)' }} />}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
