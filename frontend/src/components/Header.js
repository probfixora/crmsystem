import React, { useState, useEffect, useRef } from 'react';
// eslint-disable-next-line no-unused-vars
import { PlusCircle, Bell, Search, X, Activity, CheckCheck, Moon, Sun, LogOut, Bot, Grid, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { edgeFetch, EDGE, supabase } from '../lib/supabaseClient';
import { BRANDING } from '../config/branding';

const roleStageMap = {
  admin: [],
  sales: [],
  registration: ['Registration Done', 'Phone Verification Done'],
  banking: ['Bank & Finance'],
  inventory: ['Sent to Store'],
  field_installation: ['Installation Done', 'Plant Activated'],
  electrical: [],
  subsidy: ['Sent to Subsidy', 'Subsidy Registration Completed'],
};

const Header = ({ title, subtitle, roleBadge, onLogout }) => {
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState('');
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifLoading, setNotifLoading] = useState(false);

  // Persist read notifications locally per user so it survives refresh
  const currentUserId = localStorage.getItem('userId');
  const storageKey = currentUserId ? `readNotifs_${currentUserId}` : 'readNotifs';
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify([...readIds]));
  }, [readIds, storageKey]);

  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [liveProfile, setLiveProfile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const profileRef = useRef(null);
  const channelRef = useRef(null); // Supabase Realtime channel reference

  const toggleDark = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', next ? 'dark' : '');
  };

  const unreadCount = Math.min(notifications.filter(n => !readIds.has(n.id)).length, 9);
  const notifRef = useRef(null);

  const userRole = localStorage.getItem('role') || 'user';
  const [userName, setUserName] = useState(localStorage.getItem('name') || 'User');
  const roleLabel = roleBadge || (userRole.charAt(0).toUpperCase() + userRole.slice(1));
  const canCreate = userRole === 'registration';
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const data = await edgeFetch(EDGE.analytics, { action: 'activity' });
      setNotifications((data || []).slice(0, 10));
    } catch {
      setNotifications([]);
    } finally {
      setNotifLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => { fetchNotifications(); }, []);

  // ── Supabase Realtime: subscribe to case_history INSERT events ───────────────────
  // When a new history entry is inserted (any stage update), prepend it
  // to the notifications list so the bell reflects live activity.
  useEffect(() => {
    // Clean up any existing channel before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel('case-history-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'case_history' },
        (payload) => {
          const newEntry = payload.new;

          // Department-wise notification masking
          if (userRole !== 'admin') {
            const allowedStages = roleStageMap[userRole] || [];
            const isMyStage = allowedStages.includes(newEntry.stage);
            const isMyUpdate = newEntry.updated_by === userName;
            if (!isMyStage && !isMyUpdate) {
              return; // Ignore notification if it's not for my department
            }
          }

          setNotifications(prev => {
            // Avoid duplicates (edge case: rapid inserts)
            const exists = prev.some(n => n.id === newEntry.id);
            if (exists) return prev;
            // Prepend newest entry, keep max 20
            return [newEntry, ...prev].slice(0, 20);
          });
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // Cleanup: unsubscribe when header unmounts
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for name changes from the Profile page
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'name' && e.newValue) {
        setUserName(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Fetch live profile from DB whenever dropdown opens
  useEffect(() => {
    if (!showProfile) return;
    const userId = localStorage.getItem('userId');
    if (!userId) return;
    supabase
      .from('profiles')
      .select('name, role, email, employee_id')
      .eq('id', userId)
      .single()
      .then(({ data }) => { if (data) setLiveProfile(data); })
      .catch(() => { });
  }, [showProfile]);

  useEffect(() => {
    const handle = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotif(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/cases?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchVal('');
    }
  };

  const markAllRead = () => setReadIds(new Set(notifications.map(n => n.id)));

  const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const popoverJSX = showNotif && (
    <div style={{
      position: 'absolute', top: 'calc(100% + 10px)', right: 0,
      width: '360px', maxWidth: 'calc(100vw - 32px)', background: 'var(--surface)',
      borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-elevation)', zIndex: 200, overflow: 'hidden',
      animation: 'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1) both',
      transformOrigin: 'top right',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '16px 20px', borderBottom: '1px solid var(--border-2)',
        background: 'var(--surface-2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity style={{ width: '15px', height: '15px', color: 'var(--brand)' }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
            Recent Activity
          </span>
          {notifications.length > 0 && (
            <div style={{ padding: '1px 8px', borderRadius: 'var(--radius-full)', background: 'var(--brand-dim)', fontSize: '11px', fontWeight: 700, color: 'var(--brand)' }}>
              {notifications.length}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              title="Mark all read"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 'var(--radius-xs)', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <CheckCheck style={{ width: '14px', height: '14px' }} /> Read
            </button>
          )}
          <button
            onClick={() => setShowNotif(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', borderRadius: 'var(--radius-xs)', color: 'var(--text-4)', display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      </div>

      {/* List Track */}
      <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
        {notifLoading ? (
          <div style={{ padding: '36px', textAlign: 'center' }}>
            <div className="animate-spin" style={{ width: '22px', height: '22px', border: '2px solid var(--border)', borderTopColor: 'var(--brand)', borderRadius: '50%', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-4)' }}>Loading timeline events…</p>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1px solid var(--border)' }}>
              <Bell style={{ width: '20px', height: '20px', color: 'var(--text-4)' }} />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '2px' }}>All caught up!</p>
            <p style={{ fontSize: '12.5px', color: 'var(--text-4)' }}>Zero new unread stage events</p>
          </div>
        ) : (
          notifications.map((n, i) => (
            <div
              key={i}
              onClick={() => {
                if (!readIds.has(n.id)) setReadIds(prev => new Set([...prev, n.id]));
                navigate(`/cases?q=${encodeURIComponent(n.id || n.case_id || n.caseId)}`);
                setShowNotif(false);
              }}
              style={{
                display: 'flex', gap: '12px', padding: '12px 20px',
                borderBottom: i < notifications.length - 1 ? '1px solid var(--border-2)' : 'none',
                cursor: 'pointer', transition: 'background-color 0.2s ease',
                background: readIds.has(n.id) ? 'var(--surface)' : 'var(--brand-soft)',
                opacity: readIds.has(n.id) ? 0.75 : 1,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = readIds.has(n.id) ? 'var(--surface)' : 'var(--brand-soft)'}
            >
              <div style={{
                width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
                background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11.5px', fontWeight: 800, color: 'var(--brand)',
                boxShadow: 'var(--shadow-xs)'
              }}>
                {(n.updated_by || n.updatedBy)?.[0]?.toUpperCase() || 'S'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                    {n.cases?.customer_name || n.customer_name || n.cases?.tracking_id || n.tracking_id || n.case_id || 'Case Update'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-4)', flexShrink: 0, marginLeft: '8px' }}>{timeAgo(n.timestamp)}</span>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--brand)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                  → {n.stage}
                </p>
                <p style={{ fontSize: '11.5px', color: 'var(--text-4)' }}>
                  Updated by <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>{n.updated_by || n.updatedBy || 'Unknown'}</span>
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom Quicklink */}
      {notifications.length > 0 && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', textAlign: 'center', background: 'var(--surface-2)' }}>
          <button
            onClick={() => { navigate('/cases'); setShowNotif(false); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: 'var(--brand)', letterSpacing: '-0.01em' }}
          >
            View All Case History →
          </button>
        </div>
      )}
    </div>
  );


  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handle = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // PREMIUM HEADER — All Roles
  // ══════════════════════════════════════════════════════════════════
  return (
    <header className="admin-header">

      {/* ── Top row: Brand + Desktop Search + Controls (all in one row on both desktop and mobile) ── */}
      <div className="admin-header-top">

        {/* Left: Branding */}
        <div className="admin-brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Mobile: Larger Logo */}
          <img className="mobile-only" src="/logo.png" alt={BRANDING.name} style={{ height: '44px', width: 'auto', objectFit: 'contain', marginLeft: '-4px' }} />
          
          {/* Desktop: Brand Text (like before) */}
          <span className="hide-on-mobile" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '-0.02em', fontFamily: 'Inter, sans-serif' }}>
            {BRANDING.name}
          </span>
        </div>

        {/* Center: Global Search Bar — hidden on mobile via CSS, shown on desktop */}
        <form onSubmit={handleSearch} className="admin-search-form">
          <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--text-4)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            placeholder="Search accounts, documents, or IDs..."
            className="admin-search-input"
            onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
            onBlur={e => e.target.style.borderColor = ''}
          />
        </form>

        {/* Right: Controls Panel */}
        <div className="admin-controls">

          <button title="AI Assistant" className="admin-icon-btn">
            <Bot style={{ width: '22px', height: '22px', color: 'var(--text-3)' }} />
          </button>

          {/* Notification Button & Popover */}
          <div ref={notifRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button
              onClick={() => setShowNotif(v => !v)}
              title="Notifications"
              className="admin-icon-btn"
              style={{ position: 'relative' }}
            >
              <Bell style={{ width: '22px', height: '22px', color: 'var(--text-3)' }} />
              {unreadCount > 0 && (
                <div style={{
                  position: 'absolute', top: '6px', right: '8px', width: '9px', height: '9px',
                  borderRadius: '50%', background: 'var(--color-danger)', border: '2px solid var(--surface)'
                }} />
              )}
              {/* Live indicator dot removed per request */}
            </button>

            {/* Notification Popover — renders the same popoverJSX defined above */}
            {popoverJSX}
          </div>

          {userRole === 'admin' && (
            <button
              title="Department Portal"
              className="admin-icon-btn hide-on-mobile"
              onClick={() => navigate('/department-portal')}
            >
              <Grid style={{ width: '22px', height: '22px', color: 'var(--text-3)' }} />
            </button>
          )}

          <div className="admin-divider hide-on-mobile" />

          {/* Profile Toggle Dropdown */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <div
              className="admin-profile"
              onClick={() => setShowProfile(v => !v)}
            >
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: 'var(--color-primary-muted)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-primary)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px'
              }}>
                {initials}
              </div>
              <span className="admin-profile-label" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-2)' }}>{roleLabel}</span>
              <ChevronDown style={{ width: '16px', height: '16px', color: 'var(--text-4)', flexShrink: 0, transition: 'transform 0.2s', transform: showProfile ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </div>

            {/* Profile Dropdown Menu */}
            {showProfile && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                width: '230px', background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)', boxShadow: 'var(--shadow-dropdown)',
                zIndex: 9999, overflow: 'hidden',
                animation: 'scaleIn 0.18s cubic-bezier(0.16,1,0.3,1) both',
                transformOrigin: 'top right',
              }}>
                {/* User info block */}
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-2)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: 'var(--color-primary-muted)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-primary)', fontSize: '14px', fontWeight: 700, flexShrink: 0
                  }}>
                    {(liveProfile?.name || userName).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)', margin: 0, letterSpacing: '-0.01em' }}>{liveProfile?.name || userName}</p>
                    <p style={{ fontSize: '11.5px', color: 'var(--text-4)', margin: 0, textTransform: 'capitalize', marginTop: '1px' }}>{roleLabel}</p>
                  </div>
                </div>

                {/* Menu Items */}
                <div style={{ padding: '6px' }}>
                  <button onClick={() => { setShowProfile(false); navigate('/profile'); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13.5px', fontWeight: 500, color: 'var(--text-2)', textAlign: 'left', fontFamily: 'inherit' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-xs)', background: 'var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    </div>
                    View Profile
                  </button>
                  <button onClick={toggleDark}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13.5px', fontWeight: 500, color: 'var(--text-2)', textAlign: 'left', fontFamily: 'inherit' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-xs)', background: 'var(--color-warning-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {darkMode ? <Sun width="14" height="14" color="var(--color-warning)" /> : <Moon width="14" height="14" color="var(--color-warning)" />}
                    </div>
                    {darkMode ? 'Light Mode' : 'Dark Mode'}
                  </button>
                </div>

                <div style={{ padding: '6px', borderTop: '1px solid var(--border-2)' }}>
                  <button onClick={() => { setShowProfile(false); if (onLogout) onLogout(); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'none', cursor: 'pointer', fontSize: '13.5px', fontWeight: 500, color: 'var(--color-danger)', textAlign: 'left', fontFamily: 'inherit' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-danger-muted)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-xs)', background: 'var(--color-danger-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LogOut width="14" height="14" color="var(--color-danger)" />
                    </div>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>{/* end profileRef */}

        </div>{/* end admin-controls */}

      </div>{/* end admin-header-top */}

      {/* ── Mobile Search Row (shown only on mobile below brand+controls row) ── */}
      <form onSubmit={handleSearch} className="admin-search-form-mobile">
        <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '17px', height: '17px', color: 'var(--text-4)', pointerEvents: 'none' }} />
        <input
          type="text"
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          placeholder="Search..."
          className="admin-search-input"
          onFocus={e => e.target.style.borderColor = 'var(--color-primary)'}
          onBlur={e => e.target.style.borderColor = ''}
        />
      </form>

    </header>
  );
};

export default Header;
