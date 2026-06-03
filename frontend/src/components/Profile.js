import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { edgeFetch, EDGE } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import { User, Mail, Shield, Key, Save, ArrowLeft, Lock, CheckCircle2, LogOut, ChevronDown, ChevronUp } from 'lucide-react';

const Profile = ({ onLogout }) => {
  const navigate     = useNavigate();
  const [userName, setUserName] = useState(localStorage.getItem('name')  || 'User');
  const userEmail    = localStorage.getItem('email') || '—';
  const userRole     = localStorage.getItem('role')  || 'user';
  const initials     = userName.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel    = userRole.charAt(0).toUpperCase() + userRole.slice(1);

  const [currentPw,  setCurrentPw]  = useState('');
  const [newPw,      setNewPw]      = useState('');
  const [confirmPw,  setConfirmPw]  = useState('');
  const [saving,     setSaving]     = useState(false);
  const [newName,    setNewName]    = useState(userName);
  const [savingName, setSavingName] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const roleMeta = {
    admin:        { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' },
    sales:        { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    banking:      { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    inventory:    { bg: '#fff1f2', text: '#9f1239', border: '#fecdd3' },
    installation: { bg: '#f0f9ff', text: '#075985', border: '#bae6fd' },
    electrical:   { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
    subsidy:      { bg: '#fff7ed', text: '#9a3412', border: '#fed7aa' },
  };
  const rm = roleMeta[userRole] || { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };

  const handleUpdateName = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return toast.error('Name cannot be empty');
    setSavingName(true);
    try {
      // Route through edge function (service role bypasses RLS)
      await edgeFetch(EDGE.admin, { action: 'update_own_name', name: newName.trim() });

      localStorage.setItem('name', newName.trim());
      setUserName(newName.trim());
      // Notify Header to update name display instantly
      window.dispatchEvent(new StorageEvent('storage', { key: 'name', newValue: newName.trim() }));
      toast.success('Name updated successfully');
    } catch (err) {
      console.error('[Profile] Name update error:', err);
      toast.error(err.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPw !== confirmPw) { toast.error('New passwords do not match'); return; }
    if (newPw.length < 6)    { toast.error('Password must be at least 6 characters'); return; }
    setSaving(true);
    try {
      // Re-authenticate with current password first
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPw,
      });
      if (authError) throw new Error('Current password is incorrect');

      // Now update to new password
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      toast.success('Password changed successfully');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, marginLeft: 'var(--main-offset)', padding: '28px 32px' }}>
        <Header title="My Profile" subtitle="View and manage your account details" onLogout={onLogout} />

        {/* Back button */}
        <button
          onClick={() => navigate('/')}
          className="btn btn-ghost btn-sm"
          style={{ marginBottom: '24px' }}
        >
          <ArrowLeft style={{ width: '14px', height: '14px' }} />
          Go back
        </button>

        <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px', alignItems: 'start' }}>

          {/* ── Left: Identity card ── */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Dark header */}
            <div style={{
              padding: '32px 24px 28px', textAlign: 'center',
              background: 'linear-gradient(145deg, #0f1724 0%, #0f2a1a 100%)',
            }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '18px', margin: '0 auto 16px',
                background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '26px', fontWeight: 800, color: '#fff',
                boxShadow: '0 8px 24px rgba(37,99,235,0.35)',
              }}>
                {initials}
              </div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{userName}</p>
              <span style={{
                display: 'inline-block', padding: '3px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                background: 'rgba(37,99,235,0.12)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.2)',
                textTransform: 'capitalize',
              }}>
                {roleLabel}
              </span>
            </div>

            {/* Detail rows */}
            <div style={{ padding: '20px 22px' }}>
              <p style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--text-5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
                Account details
              </p>
              {[
                { icon: User,   label: 'Full name', value: userName },
                { icon: Mail,   label: 'Email',     value: userEmail },
                { icon: Shield, label: 'Role',      value: roleLabel },
                { icon: CheckCircle2, label: 'Status', value: 'Active' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                    background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon style={{ width: '15px', height: '15px', color: 'var(--brand)' }} />
                  </div>
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--text-4)', marginBottom: '2px' }}>{label}</p>
                    <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-1)' }}>{value}</p>
                  </div>
                </div>
              ))}

              {/* Role badge */}
              <div style={{ marginTop: '4px', padding: '12px', borderRadius: '10px', background: rm.bg, border: `1px solid ${rm.border}` }}>
                <p style={{ fontSize: '12px', color: rm.text, fontWeight: 600 }}>
                  🔐 Access level: <span style={{ textTransform: 'capitalize' }}>{roleLabel}</span>
                </p>
                <p style={{ fontSize: '11.5px', color: rm.text, opacity: 0.75, marginTop: '3px' }}>
                  Your permissions are managed by the admin
                </p>
              </div>

              {/* Support Button (for mobile access) */}
              <button
                onClick={() => navigate('/support')}
                className="btn"
                style={{
                  width: '100%', marginTop: '20px', padding: '12px',
                  background: 'var(--surface-2)', color: 'var(--text-2)', border: '1px solid var(--border)',
                  fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-dim)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
              >
                <span style={{ fontSize: '15px' }}>🎧</span>
                Contact Support
              </button>

              {/* Sign Out Button */}
              <button
                onClick={() => onLogout && onLogout()}
                className="btn"
                style={{
                  width: '100%', marginTop: '20px', padding: '12px',
                  background: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3',
                  fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                }}
              >
                <LogOut style={{ width: '15px', height: '15px' }} />
                Sign Out
              </button>
            </div>
          </div>

          {/* ── Right: Forms ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* ── Update Profile ── */}
            <div className="card" style={{ padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User style={{ width: '16px', height: '16px', color: '#4f46e5' }} />
                </div>
                <div>
                  <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Update Profile</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-4)' }}>Change your personal details</p>
                </div>
              </div>

              <form onSubmit={handleUpdateName} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '420px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '6px' }}>Full name</label>
                  <div style={{ position: 'relative' }}>
                    <User style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--text-4)', pointerEvents: 'none' }} />
                    <input
                      type="text" required className="input" style={{ paddingLeft: '36px' }}
                      placeholder="Enter full name"
                      value={newName} onChange={e => setNewName(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ paddingTop: '4px' }}>
                  <button
                    type="submit" disabled={savingName}
                    className="btn btn-primary"
                    style={{ opacity: savingName ? 0.65 : 1 }}
                  >
                    {savingName
                      ? <div className="animate-spin" style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                      : <><Save style={{ width: '14px', height: '14px' }} /> Update Name</>
                    }
                  </button>
                </div>
              </form>
            </div>

            {/* ── Change password ── */}
            <div className="card" style={{ padding: '28px' }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: showPasswordForm ? '24px' : '0', cursor: 'pointer' }}
                onClick={() => setShowPasswordForm(!showPasswordForm)}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Lock style={{ width: '16px', height: '16px', color: '#4f46e5' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Change password</h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-4)' }}>Update your account password</p>
                </div>
                <div>
                  {showPasswordForm ? <ChevronUp style={{ width: '20px', height: '20px', color: 'var(--text-4)' }} /> : <ChevronDown style={{ width: '20px', height: '20px', color: 'var(--text-4)' }} />}
                </div>
              </div>

            {showPasswordForm && (
              <>
                {/* Warning */}
            <div style={{ display: 'flex', gap: '10px', padding: '12px 14px', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a', marginBottom: '24px' }}>
              <Key style={{ width: '14px', height: '14px', color: '#b45309', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '12.5px', color: '#92400e', lineHeight: 1.6 }}>
                Changing your password will require you to sign in again on other devices.
              </p>
            </div>

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '420px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '6px' }}>Current password</label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--text-4)', pointerEvents: 'none' }} />
                  <input
                    type="password" required className="input" style={{ paddingLeft: '36px' }}
                    placeholder="Enter current password"
                    value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '6px' }}>New password</label>
                <div style={{ position: 'relative' }}>
                  <Key style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--text-4)', pointerEvents: 'none' }} />
                  <input
                    type="password" required className="input" style={{ paddingLeft: '36px' }}
                    placeholder="Enter new password"
                    value={newPw} onChange={e => setNewPw(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '6px' }}>Confirm new password</label>
                <div style={{ position: 'relative' }}>
                  <Key style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--text-4)', pointerEvents: 'none' }} />
                  <input
                    type="password" required className="input" style={{ paddingLeft: '36px' }}
                    placeholder="Re-enter new password"
                    value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ paddingTop: '4px' }}>
                <button
                  type="submit" disabled={saving}
                  className="btn btn-primary"
                  style={{ opacity: saving ? 0.65 : 1 }}
                >
                  {saving
                    ? <div className="animate-spin" style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
                    : <><Save style={{ width: '14px', height: '14px' }} /> Save changes</>
                  }
                </button>
              </div>
            </form>
            </>
            )}
          </div>
          </div>
        </div>

        <Footer />
      </main>
    </div>
  );
};

export default Profile;
