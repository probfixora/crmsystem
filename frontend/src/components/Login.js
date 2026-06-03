import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, ArrowRight, BarChart3, Users, Zap, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { BRANDING } from '../config/branding';

const stats = [
  { label: 'Projects Delivered', value: '500+' },
  { label: 'Expert Specialists', value: '50+' },
  { label: 'Client Satisfaction',value: '4.9★' },
];

const features = [
  { icon: BarChart3, text: 'Real-time multi-tier pipeline analytics' },
  { icon: Users,     text: 'Granular department role routing' },
  { icon: Zap,       text: 'Instant reactive stage task assignments' },
];

const Login = ({ setToken }) => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Please enter your email and password');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) throw new Error(error.message);

      const { session, user } = data;
      const token = session.access_token;

      // Try to fetch existing profile
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('name, role, status, employee_id')
        .eq('id', user.id)
        .single();

      // If profile doesn't exist, auto-create it (first-time login)
      if (profileError || !profile) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            name: user.email.split('@')[0],
            employee_id: 'EMP-' + Date.now().toString().slice(-4),
            role: 'admin',
            status: 'active',
          })
          .select('name, role, status, employee_id')
          .single();

        if (createError) {
          console.warn('Profile table issue:', createError.message);
          profile = { name: user.email.split('@')[0], role: 'admin', status: 'active', employee_id: 'ADMIN' };
        } else {
          profile = newProfile;
        }
      }

      if (profile.status === 'inactive') throw new Error('Account is deactivated. Please contact support.');

      const name = profile.name || user.email.split('@')[0];
      const { role, employee_id } = profile;

      localStorage.setItem('token', token);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('role', role);
      localStorage.setItem('name', name);
      localStorage.setItem('email', user.email);
      localStorage.setItem('employeeId', employee_id || 'N/A');
      setToken(token);

      toast.success(`Welcome back, ${name}!`);
      const routes = {
        admin: '/admin-dashboard', sales: '/sales-dashboard',
        registration: '/registration-dashboard', banking: '/banking-dashboard',
        inventory: '/inventory-dashboard', installation: '/installation-dashboard',
        electrical: '/electrical-dashboard', subsidy: '/subsidy-dashboard',
      };
      navigate(routes[role] || '/');
    } catch (err) {
      const msg = err.message || 'Invalid credentials. Please verify your login details.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container animate-fade-in" style={{ minHeight: '100vh', display: 'flex', background: 'var(--page-bg)' }}>
      
      {/* ── Immersive Left Value-Prop Presentation ── */}
      <div className="login-left" style={{
        width: '54%', background: 'linear-gradient(145deg, var(--surface) 0%, var(--color-bg) 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '56px 64px', position: 'relative', overflow: 'hidden',
        borderRight: '1px solid var(--border)'
      }}>
        {/* Subtle high-fidelity spatial mesh layer */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.25, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(to right, var(--color-primary-dim) 1px, transparent 1px), linear-gradient(to bottom, var(--color-primary-dim) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        {/* Dynamic mesh gradient backdrops */}
        <div style={{
          position: 'absolute', top: '-10%', left: '-10%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(250, 204, 21, 0.1) 0%, transparent 70%)',
          animation: 'meshGlow 12s ease-in-out infinite alternate',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-15%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(250, 204, 21, 0.05) 0%, transparent 70%)',
          animation: 'meshGlow 10s ease-in-out infinite alternate-reverse',
          pointerEvents: 'none',
        }} />

        {/* Brand Core */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center' }}>
          <img src="/logo.png" alt={BRANDING.name} style={{ width: '280px', height: 'auto', objectFit: 'contain' }} />
        </div>

        {/* Center Main Statement */}
        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '40px 0' }}>
          
          <div className="animate-fade-up" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '6px 16px', borderRadius: 'var(--radius-full)', marginBottom: '32px',
            background: 'var(--surface)', backdropFilter: 'blur(12px)',
            border: '1px solid var(--border)', width: 'fit-content',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              Enterprise Resource Platform
            </span>
          </div>

          <h1 className="animate-fade-up" style={{
            fontSize: '44px', fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.12, 
            letterSpacing: '-0.035em', marginBottom: '24px', animationDelay: '0.1s'
          }}>
            Accelerate every<br />
            <span style={{ color: 'var(--color-primary-hover)' }}>operational pipeline</span><br />
            delivery stage.
          </h1>

          <p className="hide-on-mobile animate-fade-up" style={{ 
            fontSize: '15.5px', color: 'var(--text-3)', lineHeight: 1.65, 
            maxWidth: '420px', marginBottom: '44px', animationDelay: '0.2s', fontWeight: 400 
          }}>
            Coordinate cross-functional teams, manage resources, and streamline workflow delivery in complete synchronization.
          </p>

          <div className="hide-on-mobile animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '48px', animationDelay: '0.3s' }}>
            {features.map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', 
                  background: 'var(--surface)', backdropFilter: 'blur(8px)',
                  border: '1px solid var(--border)', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0 
                }}>
                  <Icon style={{ width: '15px', height: '15px', color: 'var(--color-primary-hover)' }} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-2)' }}>{text}</span>
              </div>
            ))}
          </div>

          {/* Premium Ambient Stats Container */}
          <div className="hide-on-mobile animate-fade-up" style={{ 
            display: 'flex', gap: '32px', borderTop: '1px solid var(--border)', 
            paddingTop: '36px', animationDelay: '0.4s' 
          }}>
            {stats.map((s, i) => (
              <div key={s.label} style={{ flex: 1 }}>
                <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-4)', marginTop: '6px' }}>{s.label}</p>
              </div>
            ))}
          </div>

        </div>

        {/* Footer Guarantee watermark */}
        <div className="hide-on-mobile" style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-4)', fontSize: '12px' }}>
          <span>© {BRANDING.year} {BRANDING.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} />
            <span>Secure TLS Encryption</span>
          </div>
        </div>

      </div>

      {/* ── Right Panel Workspace Authentication ── */}
      <div className="login-right" style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '56px 48px', background: 'var(--page-bg)', position: 'relative'
      }}>
        <div className="card" style={{ 
          width: '100%', maxWidth: '420px', padding: '40px 36px', 
          borderRadius: 'var(--radius-xl)', border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-elevation)', background: 'var(--surface)'
        }}>
          
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.03em', marginBottom: '6px' }}>
              Portal Access
            </h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-3)' }}>Secure credentials portal for staff operational tracking</p>
          </div>

          <form onSubmit={handleLogin}>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '8px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                Corporate Email
              </label>
              <div className="input-group">
                <Mail className="icon" />
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  required 
                  className="input" 
                  placeholder={`name@${BRANDING.email.split('@')[1] || 'company.com'}`} 
                  style={{ borderRadius: 'var(--radius-md)', padding: '13px 16px 13px 40px' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-2)', marginBottom: '8px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                Secure Password
              </label>
              <div className="input-group">
                <Lock className="icon" />
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                  className="input" 
                  placeholder="••••••••••••" 
                  style={{ borderRadius: 'var(--radius-md)', padding: '13px 16px 13px 40px', letterSpacing: '0.1em' }}
                />
              </div>
            </div>

            <button
              type="submit" 
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ 
                width: '100%', padding: '15px 24px', borderRadius: 'var(--radius-md)',
                opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'
              }}
            >
              {loading ? (
                <div className="animate-spin" style={{ width: '18px', height: '18px', border: '2px solid hsla(0, 0%, 100%, 0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
              ) : (
                <>
                  <span style={{ fontSize: '14.5px', fontWeight: 700, letterSpacing: '0.01em' }}>Authenticate Session</span>
                  <ArrowRight style={{ width: '16px', height: '16px' }} />
                </>
              )}
            </button>

          </form>

          {/* Trust Banner Notification Wrapper */}
          <div style={{ marginTop: '28px', padding: '14px 16px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)', border: '1px solid var(--border-2)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', flexShrink: 0, boxShadow: '0 0 0 2px hsla(160, 84%, 39%, 0.2)' }} />
              <p style={{ fontSize: '11.5px', color: 'var(--text-3)', lineHeight: 1.4, margin: 0, fontWeight: 500 }}>
                Protected system resources intended exclusively for cleared {BRANDING.name} associates.
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default Login;
