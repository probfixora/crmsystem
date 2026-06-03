import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';
import { BRANDING } from '../config/branding';
import { Mail, Phone, Globe, ArrowLeft, MessageSquare, Send, ExternalLink, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const Support = ({ onLogout }) => {
  const navigate = useNavigate();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const userName  = localStorage.getItem('name')  || 'User';
    const userEmail = localStorage.getItem('email') || 'unknown';
    const userRole  = localStorage.getItem('role')  || 'user';
    const body = encodeURIComponent(
      `Hello Nikhil,\n\nFrom: ${userName} (${userRole})\nEmail: ${userEmail}\n\nSubject: ${subject}\n\n${message}\n\nSent from ${BRANDING.name} CRM`
    );
    const mailtoLink = `mailto:nikhiltiwaridotin@gmail.com?subject=${encodeURIComponent(`[CRM Support] ${subject}`)}&body=${body}`;
    window.open(mailtoLink, '_blank');
    setSent(true);
    toast.success('Opening your email client…');
    setSubject(''); setMessage('');
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, marginLeft: 'var(--main-offset)', padding: '28px 32px' }}>
        <Header title="Support" subtitle="Get help from the developer" onLogout={onLogout} />

        <button onClick={() => navigate(-1)} className="btn btn-ghost btn-sm" style={{ marginBottom: '24px' }}>
          <ArrowLeft style={{ width: '14px', height: '14px' }} /> Go back
        </button>

        <div className="grid-stack-mobile" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>

          {/* ── Left: Developer contact card ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Dev card */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Dark header */}
              <div style={{
                padding: '28px 24px',
                background: 'linear-gradient(145deg, #0F172A 0%, #1E3A5F 100%)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '54px', height: '54px', borderRadius: '14px', flexShrink: 0,
                    background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', fontWeight: 800, color: '#fff',
                    boxShadow: '0 6px 20px rgba(37,99,235,0.35)',
                  }}>N</div>
                  <div>
                    <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '17px', fontWeight: 700, color: '#fff' }}>Nikhil Tiwari</p>
                    <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', marginTop: '3px' }}>Full-Stack Developer · {BRANDING.name} CRM</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#60A5FA' }} />
                      <span style={{ fontSize: '11.5px', color: '#60A5FA', fontWeight: 600 }}>Available for support</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact rows */}
              <div style={{ padding: '6px 0' }}>
                {[
                  {
                    icon: Mail,
                    label: 'Email',
                    value: 'nikhiltiwaridotin@gmail.com',
                    href: 'mailto:nikhiltiwaridotin@gmail.com',
                    note: 'Replies within 24 hours',
                  },
                  {
                    icon: Phone,
                    label: 'Phone / WhatsApp',
                    value: '+91 7394035581',
                    href: 'tel:+917394035581',
                    note: 'Mon – Sat, 9 AM – 7 PM IST',
                  },
                  {
                    icon: Globe,
                    label: 'Website / Portfolio',
                    value: 'nikhiltiwari.in',
                    href: 'https://nikhiltiwari.in',
                    note: 'Projects & contact form',
                    external: true,
                  },
                ].map(({ icon: Icon, label, value, href, note, external }) => (
                  <a
                    key={label}
                    href={href}
                    target={external ? '_blank' : undefined}
                    rel="noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '14px 20px', textDecoration: 'none',
                      borderBottom: '1px solid var(--border-2)',
                      transition: 'background 0.15s', cursor: 'pointer',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon style={{ width: '16px', height: '16px', color: 'var(--brand)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-4)', marginBottom: '2px' }}>{label}</p>
                      <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-5)', marginTop: '1px' }}>{note}</p>
                    </div>
                    <ExternalLink style={{ width: '13px', height: '13px', color: 'var(--text-5)', flexShrink: 0 }} />
                  </a>
                ))}
              </div>
            </div>

            {/* Response time card */}
            <div className="card" style={{ padding: '18px 20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: '#fffbeb', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock style={{ width: '15px', height: '15px', color: '#b45309' }} />
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '4px' }}>Response times</p>
                <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {[
                    { channel: 'Email', time: '≤ 24 hours' },
                    { channel: 'Phone / WhatsApp', time: '≤ 2 hours (working hours)' },
                    { channel: 'Website form', time: '≤ 48 hours' },
                  ].map(({ channel, time }) => (
                    <li key={channel} style={{ fontSize: '12.5px', color: 'var(--text-3)', display: 'flex', gap: '6px' }}>
                      <CheckCircle2 style={{ width: '13px', height: '13px', color: 'var(--brand)', flexShrink: 0, marginTop: '1px' }} />
                      <span><strong>{channel}</strong> — {time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ── Right: Quick message form ── */}
          <div className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--brand-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare style={{ width: '16px', height: '16px', color: 'var(--brand)' }} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Send a message</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-4)' }}>Opens your email client with a pre-filled message</p>
              </div>
            </div>

            {sent && (
              <div style={{ display: 'flex', gap: '10px', padding: '12px 14px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', marginBottom: '18px' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px', color: '#15803d', flexShrink: 0 }} />
                <p style={{ fontSize: '13px', color: '#15803d', fontWeight: 500 }}>Email client opened! Your message is ready to send.</p>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '6px' }}>
                  Your name &amp; department
                </label>
                <input
                  type="text" className="input" disabled
                  value={`${localStorage.getItem('name') || 'User'} · ${localStorage.getItem('role') || 'user'}`}
                  style={{ background: 'var(--surface-2)', color: 'var(--text-3)', cursor: 'not-allowed' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '6px' }}>Subject</label>
                <input
                  type="text" required className="input"
                  placeholder="e.g. Login issue, data not loading…"
                  value={subject} onChange={e => setSubject(e.target.value)}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-2)', marginBottom: '6px' }}>Describe the issue</label>
                <textarea
                  required
                  placeholder="Please describe the issue in as much detail as possible — what you were doing, what went wrong, and any error messages you saw."
                  value={message} onChange={e => setMessage(e.target.value)}
                  style={{
                    width: '100%', minHeight: '140px', resize: 'vertical',
                    padding: '12px 14px', fontSize: '13px', fontFamily: 'inherit',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: '9px', outline: 'none', color: 'var(--text-1)',
                    lineHeight: 1.6, boxSizing: 'border-box',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                <Send style={{ width: '14px', height: '14px' }} />
                Open email client
              </button>
            </form>

            <p style={{ fontSize: '11.5px', color: 'var(--text-5)', marginTop: '16px', lineHeight: 1.6 }}>
              Clicking "Open email client" will open your default mail app with the message pre-filled. You can review and send it from there.
            </p>
          </div>
        </div>

        <Footer />
      </main>
    </div>
  );
};

export default Support;
