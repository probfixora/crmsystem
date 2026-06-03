import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BRANDING } from '../config/branding';

const WORKFLOW_URL = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/workflow`;
const ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

const STAGES = [
  { key: 'Under Review', label: 'Under Review', icon: 'pending_actions' },
  { key: 'Registered', label: 'Registered', icon: 'how_to_reg' },
  { key: 'Financial Approval', label: 'Financial Approval', icon: 'account_balance' },
  { key: 'Material Ready', label: 'Material Ready', icon: 'inventory_2' },
  { key: 'Installation', label: 'Installation', icon: 'construction' },
  { key: 'Approval Process', label: 'Approval Process', icon: 'gavel' },
  { key: 'Activated', label: 'Activated', icon: 'bolt' },
  { key: 'Subsidy', label: 'Subsidy', icon: 'request_quote' },
  { key: 'Completed', label: 'Completed', icon: 'task_alt' }
];

const stageIndex = (stage) => {
  const mapLegacyStage = (s) => {
    if (s === 'Sent to Registration') return 'Sent to Sales';
    if (s === 'Inventory Processed' || s === 'Dispatch to Customer') return 'Installation Started';
    if (s === 'Installation Done') return 'Plant Activated';
    if (s === 'Completed') return 'Post-Installation Service';
    return s;
  };
  const mapped = mapLegacyStage(stage);

  const map = {
    'Sent to Sales': 0,
    'Registration Done': 1,
    'Phone Verification Done': 1,
    'Bank & Finance': 2,
    'Sent to Store': 3,
    'Installation Started': 4,
    'Govt Approvals Pending': 5,
    'Plant Activated': 6,
    'QA Verified': 6,
    'Accounts Verified': 6,
    'Sent to Subsidy': 7,
    'Subsidy Registration Completed': 7,
    'Post-Installation Service': 8,
  };
  return map[mapped] ?? -1;
};

const FEATURES = [
  { icon: 'sync', title: 'Live Updates', desc: 'Real-time status updates as your project moves through each stage of installation.' },
  { icon: 'shield', title: 'Secure Access', desc: 'Your personal data stays private. We only show progress — nothing sensitive.' },
  { icon: 'bar_chart', title: 'Full Visibility', desc: 'View every milestone from registration to plant activation in one place.' },
];

export default function TrackingPage() {
  const [searchParams] = useSearchParams();
  const [inputId, setInputId] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = useCallback(async (idToSearch) => {
    const id = (idToSearch || inputId).trim().toUpperCase();
    if (!id) { setError('Please enter your Tracking ID.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(WORKFLOW_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ action: 'track_status', trackingId: id }),
      });
      const data = await res.json();
      if (!res.ok) setError('no_record');
      else setResult(data);
    } catch {
      setError('network');
    } finally {
      setLoading(false);
    }
  }, [inputId]);

  useEffect(() => {
    const urlId = searchParams.get('id');
    if (urlId) { const c = urlId.trim().toUpperCase(); setInputId(c); handleTrack(c); }
    // eslint-disable-next-line
  }, []);

  const currentIdx = result ? stageIndex(result.current_stage) : -1;
  const isDelayed = result?.status === 'Delayed';
  const isCompleted = currentIdx >= 12;
  const pct = isCompleted ? 100 : currentIdx < 0 ? 0 : Math.round(((currentIdx + 1) / STAGES.length) * 100);

  const completedStages = STAGES.slice(0, Math.max(0, currentIdx + 1)).reverse();

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0&display=swap" rel="stylesheet" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { font-family: 'Inter', sans-serif; background: #f5f7fa; color: #1a1a2e; }
        .mat { font-family: 'Material Symbols Outlined'; font-size: 20px; line-height: 1; font-style: normal; user-select: none; display: inline-block; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes barIn { from { width: 0; } }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.5;} }
        .tp-btn:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
        .tp-btn { transition: all .15s; }
        .tp-input:focus { outline: none; box-shadow: 0 0 0 3px rgba(26,26,94,.12); border-color: #1a1a5e; }
        .chip:hover { background: #e8eaf6; border-color: #1a1a5e; cursor: pointer; }
        .chip { transition: all .15s; }
        .feat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(26,26,94,.10); }
        .feat-card { transition: all .2s; }
        
        /* Mobile Responsive Classes */
        .hero-split { display: grid; grid-template-columns: 1fr 1fr; min-height: calc(100vh - 60px); }
        .results-grid { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 20px; align-items: start; }
        .timeline-wrapper { display: flex; min-width: 520px; align-items: flex-start; }
        .timeline-item { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
        .timeline-item-text { margin-top: 8px; font-size: 10px; text-align: center; line-height: 1.3; max-width: 64px; }
        .meta-top { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 28px; }
        .nav-px { padding: 0 32px; }
        
        .footer-card { background: #fff; border: 1px solid #e8eaf0; border-radius: 12px; margin: 32px 24px; padding: 48px; margin-top: auto; display: flex; flex-direction: column; gap: 36px; box-shadow: 0 4px 20px rgba(0,0,0,.03); }
        .footer-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 40px; }
        .footer-heading { font-size: 12px; font-weight: 700; color: #94a3b8; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 20px; }
        .footer-text { font-size: 13px; color: #64748b; line-height: 1.7; }
        .footer-link { display: flex; align-items: center; gap: 12px; color: #64748b; text-decoration: none; font-size: 14px; font-weight: 500; transition: color 0.2s; }
        .footer-link:hover { color: #1a1a5e; }
        .footer-link .mat { color: #94a3b8; font-size: 18px; font-variation-settings: 'FILL' 0; }
        .footer-bottom { border-top: 1px solid #f1f5f9; padding-top: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; font-size: 13px; font-weight: 500; }
        .header-title { font-weight: 800; font-size: 16px; color: #1a1a5e; letter-spacing: -.3px; }
        .track-btn-icon { display: none; }
        
        @media (max-width: 768px) {
          .hero-split { grid-template-columns: 1fr; min-height: auto; }
          .hero-left { padding: 40px 24px !important; }
          .results-grid { grid-template-columns: 1fr; }
          .timeline-wrapper { min-width: auto; flex-direction: column; align-items: flex-start; gap: 16px; }
          .timeline-item { flex-direction: row; align-items: center; width: 100%; gap: 16px; }
          .timeline-item-text { margin-top: 0; text-align: left; max-width: none; font-size: 13px; }
          .timeline-line { display: none !important; }
          .timeline-badge { margin-top: 0 !important; margin-left: auto; }
          .meta-top { flex-direction: column; align-items: stretch; }
          .nav-px { padding: 0 16px !important; }
          .footer-card { margin: 24px 16px; padding: 32px 24px; }
          .footer-bottom { flex-direction: column; text-align: center; justify-content: center; }
          .header-title { display: none; }
          .track-btn-text { display: none; }
          .track-btn-icon { display: inline-block; font-size: 20px; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f5f7fa' }}>

        {/* ── Navbar ── */}
        <nav className="nav-px" style={{
          background: '#fff',
          borderBottom: '1px solid #e8eaf0',
          height: 60,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 50,
          boxShadow: '0 1px 8px rgba(0,0,0,.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.png" alt={BRANDING.name} style={{ height: 32, width: 'auto' }} />
            <span className="header-title">{BRANDING.name}</span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {result && (
              <button onClick={() => { setResult(null); setError(''); setInputId(''); }}
                style={{ background: 'none', border: 'none', color: '#1a1a5e', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="mat" style={{ fontSize: 18 }}>arrow_back</span>
                <span className="track-btn-text">New Search</span>
              </button>
            )}
            <div style={{
              background: '#1a1a5e', color: '#fff',
              borderRadius: 8, padding: '7px 16px',
              fontSize: 13, fontWeight: 700, letterSpacing: .3, display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <span className="track-btn-text">Track Order</span>
              <span className="mat track-btn-icon">search</span>
            </div>
          </div>
        </nav>

        {/* ══════════════════════════════════════════════════════════════
            STATE 1 — LANDING (no result yet)
        ══════════════════════════════════════════════════════════════ */}
        {!result && (
          <>
            {/* ── Split Hero ── */}
            <section className="hero-split">

              {/* LEFT — Navy */}
              <div className="hero-left" style={{
                background: 'linear-gradient(145deg, #0f0f2d 0%, #1a1a5e 100%)',
                padding: 'clamp(40px,6vw,80px) clamp(24px,5vw,64px)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
              }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: '5px 14px', marginBottom: 28, width: 'fit-content' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                  <span style={{ color: '#86efac', fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Live Tracking</span>
                </div>
                <h1 style={{ color: '#fff', fontSize: 'clamp(26px,3.2vw,42px)', fontWeight: 800, lineHeight: 1.22, letterSpacing: -.5, marginBottom: 20 }}>
                  Track your solar<br />project's progress<br /><span style={{ color: '#4ade80' }}>in real-time.</span>
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15, lineHeight: 1.75, marginBottom: 36, maxWidth: 380 }}>
                  Get instant visibility into every stage of your {BRANDING.name} installation — from registration to plant activation.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { icon: 'how_to_reg', text: 'Registration & verification status' },
                    { icon: 'construction', text: 'Installation progress & scheduling' },
                    { icon: 'bolt', text: 'Plant activation & completion' },
                  ].map(item => (
                    <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="mat" style={{ fontSize: 17, color: '#86efac' }}>{item.icon}</span>
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: 500 }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT — White search panel */}
              <div style={{ background: '#f7f9fc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(32px,4vw,64px) clamp(24px,4vw,56px)' }}>
                <div style={{ width: '100%', maxWidth: 400 }}>
                  <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f0f23', marginBottom: 6 }}>Find your case</h2>
                  <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginBottom: 28 }}>Enter the Tracking ID from your registration confirmation email.</p>

                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Tracking ID</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.06)', marginBottom: 12 }}>
                    <span className="mat" style={{ paddingLeft: 14, color: '#94a3b8', fontSize: 20 }}>search</span>
                    <input
                      className="tp-input"
                      type="text"
                      value={inputId}
                      onChange={e => { setInputId(e.target.value.toUpperCase()); setError(''); }}
                      onKeyDown={e => e.key === 'Enter' && handleTrack()}
                      placeholder={`e.g. ${BRANDING.caseIdPrefix}-RAME-94721`}
                      style={{ flex: 1, border: 'none', outline: 'none', padding: '14px 12px', fontSize: 14, fontFamily: 'monospace', fontWeight: 600, color: '#1a1a2e', background: 'transparent', letterSpacing: .5 }}
                    />
                  </div>

                  <button className="tp-btn" onClick={() => handleTrack()} disabled={loading}
                    style={{ width: '100%', padding: '14px', background: '#1a1a5e', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? .75 : 1, boxShadow: '0 4px 16px rgba(26,26,94,.25)' }}
                  >
                    {loading ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite' }} /> : <span className="mat" style={{ fontSize: 20 }}>search</span>}
                    {loading ? 'Searching…' : 'Track Project'}
                  </button>

                  {error && (
                    <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12, fontWeight: 500, textAlign: 'center' }}>
                      {error === 'no_record' ? 'No record found. Please check your Tracking ID.' : 'Network error. Please try again.'}
                    </p>
                  )}

                  <p style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 20, lineHeight: 1.7 }}>
                    Your Tracking ID was sent to your registered email.<br />
                    Format: <strong style={{ fontFamily: 'monospace', color: '#1a1a5e' }}>{BRANDING.caseIdPrefix}-NAME-00000</strong>
                  </p>
                </div>
              </div>
            </section>

            {/* Feature cards */}
            <section style={{ padding: '56px 24px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 20 }}>
                {FEATURES.map(f => (
                  <div key={f.title} className="feat-card" style={{
                    background: '#fff', borderRadius: 14, border: '1px solid #e8eaf0',
                    padding: '24px 22px', boxShadow: '0 2px 12px rgba(0,0,0,.05)',
                  }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10,
                      background: '#eef0ff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 16, color: '#1a1a5e',
                    }}>
                      <span className="mat" style={{ fontSize: 22 }}>{f.icon}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#0f0f23', marginBottom: 6 }}>{f.title}</div>
                    <div style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{f.desc}</div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════
            STATE 2 — RESULTS PAGE
        ══════════════════════════════════════════════════════════════ */}
        {result && (
          <div style={{ flex: 1, padding: '32px 24px', maxWidth: 1080, margin: '0 auto', width: '100%', animation: 'fadeUp .4s ease both' }}>

            {/* Top meta row */}
            <div className="meta-top">
              <div>
                {/* Status badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{
                    background: isCompleted ? '#dcfce7' : isDelayed ? '#fee2e2' : '#eef0ff',
                    color: isCompleted ? '#15803d' : isDelayed ? '#dc2626' : '#1a1a5e',
                    border: `1px solid ${isCompleted ? '#86efac' : isDelayed ? '#fca5a5' : '#c7d2fe'}`,
                    borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', display: 'inline-block', animation: isDelayed ? 'pulse 1.5s infinite' : 'none' }} />
                    {isCompleted ? 'Installation Complete' : isDelayed ? 'Delayed' : 'In Progress'}
                  </span>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace', fontWeight: 600 }}>
                    {result.tracking_id || result.id || result.case_id}
                  </span>
                </div>
                <h2 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 800, color: '#0f0f23', letterSpacing: -.4, marginBottom: 4 }}>
                  {BRANDING.name} Installation
                </h2>
                <p style={{ color: '#64748b', fontSize: 14 }}>
                  Current Stage: <strong style={{ color: '#1a1a5e' }}>{result.current_stage}</strong>
                </p>
              </div>

              {/* ETA / Progress card */}
              <div style={{
                background: '#fff', border: '1px solid #e8eaf0', borderRadius: 12,
                padding: '16px 20px', minWidth: 180, textAlign: 'center',
                boxShadow: '0 2px 12px rgba(0,0,0,.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 6 }}>
                  <span className="mat" style={{ fontSize: 18, color: '#1a1a5e' }}>calendar_month</span>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .8 }}>Progress</span>
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#1a1a5e' }}>{pct}%</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Overall Complete</div>
              </div>
            </div>

            {/* Two-column layout */}
            <div className="results-grid">

              {/* LEFT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Milestones card */}
                <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 14, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f0f23', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="mat" style={{ color: '#1a1a5e', fontSize: 20 }}>route</span>
                    Project Milestones
                  </h3>

                  {/* Progress bar */}
                  <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', marginBottom: 28 }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: isDelayed ? 'linear-gradient(90deg,#dc2626,#ef4444)' : 'linear-gradient(90deg,#1a1a5e,#16a34a)',
                      borderRadius: 99, animation: 'barIn .9s ease both',
                    }} />
                  </div>

                  {/* Timeline dots */}
                  <div style={{ overflowX: 'hidden' }}>
                    <div className="timeline-wrapper">
                      {STAGES.map((s, idx) => {
                        const done = idx < currentIdx;
                        const current = idx === currentIdx;
                        const future = idx > currentIdx;
                        const bg = done ? '#16a34a' : current && isDelayed ? '#dc2626' : current ? '#1a1a5e' : '#e8eaf0';

                        return (
                          <div key={s.key} className="timeline-item">
                            {idx > 0 && <div className="timeline-line" style={{ position: 'absolute', top: 18, right: '50%', left: 0, height: 2, background: idx <= currentIdx ? '#16a34a' : '#e8eaf0', zIndex: 0 }} />}
                            {idx < STAGES.length - 1 && <div className="timeline-line" style={{ position: 'absolute', top: 18, left: '50%', right: 0, height: 2, background: idx < currentIdx ? '#16a34a' : '#e8eaf0', zIndex: 0 }} />}

                            <div style={{
                              width: 38, height: 38, borderRadius: '50%', background: bg,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              position: 'relative', zIndex: 1, flexShrink: 0,
                              border: future ? '2px solid #e8eaf0' : 'none',
                              boxShadow: current ? `0 0 0 4px ${isDelayed ? 'rgba(220,38,38,.15)' : 'rgba(26,26,94,.12)'}` : 'none',
                            }}>
                              <span className="mat" style={{ fontSize: 16, color: future ? '#cbd5e1' : '#fff' }}>
                                {done ? 'check' : s.icon}
                              </span>
                            </div>
                            <div className="timeline-item-text" style={{ fontWeight: current ? 700 : 500, color: future ? '#94a3b8' : done ? '#16a34a' : '#1a1a5e' }}>
                              {s.label}
                            </div>
                            {current && (
                              <div className="timeline-badge" style={{ marginTop: 3, background: isDelayed ? '#dc2626' : '#1a1a5e', color: '#fff', fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: .5 }}>
                                {isDelayed ? 'Delayed' : 'Active'}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Recent Activity card */}
                <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 14, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f0f23', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="mat" style={{ color: '#1a1a5e', fontSize: 20 }}>history</span>
                      Stage Activity
                    </h3>
                  </div>

                  {completedStages.length === 0 ? (
                    <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No activity yet.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {completedStages.map((s, i) => (
                        <div key={s.key} style={{ display: 'flex', gap: 16, paddingBottom: i < completedStages.length - 1 ? 20 : 0, position: 'relative' }}>
                          {/* vertical line */}
                          {i < completedStages.length - 1 && (
                            <div style={{ position: 'absolute', left: 19, top: 36, bottom: 0, width: 2, background: '#e8eaf0' }} />
                          )}
                          <div style={{
                            width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                            background: i === 0 ? '#1a1a5e' : '#f1f5f9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `2px solid ${i === 0 ? '#1a1a5e' : '#e8eaf0'}`,
                          }}>
                            <span className="mat" style={{ fontSize: 16, color: i === 0 ? '#fff' : '#16a34a' }}>
                              {i === 0 ? s.icon : 'check'}
                            </span>
                          </div>
                          <div style={{ paddingTop: 4 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f0f23' }}>{s.label}</div>
                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                              {i === 0 ? <span style={{ color: '#16a34a', fontWeight: 600 }}>● Current Stage</span> : 'Completed'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT sidebar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Need Help card */}
                <div style={{
                  background: '#1a1a5e',
                  borderRadius: 14, padding: '22px 18px',
                  color: '#fff',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Need help?</div>
                  <p style={{ fontSize: 12, color: '#c7d2fe', lineHeight: 1.6, marginBottom: 16 }}>
                    Our support team is available to assist you with your installation.
                  </p>
                  <a href={`mailto:${BRANDING.supportEmail}`} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    background: '#fff', color: '#1a1a5e',
                    borderRadius: 8, padding: '10px 14px',
                    fontWeight: 700, fontSize: 13, textDecoration: 'none',
                  }}>
                    <span className="mat" style={{ fontSize: 18, color: '#1a1a5e' }}>mail</span>
                    Email Support
                  </a>
                </div>

                {/* Case Info card */}
                <div style={{ background: '#fff', border: '1px solid #e8eaf0', borderRadius: 14, padding: '20px 18px', boxShadow: '0 2px 12px rgba(0,0,0,.04)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 14 }}>Case Info</div>
                  {[
                    { label: 'Tracking ID', value: result.tracking_id || result.id || result.case_id, mono: true },
                    { label: 'Status', value: result.status || 'Active' },
                    { label: 'Stage', value: result.current_stage },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{row.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#0f0f23', fontFamily: row.mono ? 'monospace' : 'inherit', maxWidth: 130, textAlign: 'right', wordBreak: 'break-all' }}>
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Track another */}
                <div style={{ background: '#f8faff', border: '1px solid #e8eaf0', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 10 }}>Track another ID</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder={`${BRANDING.caseIdPrefix}-XXXX-00000`}
                      value={inputId}
                      onChange={e => setInputId(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && handleTrack()}
                      style={{
                        flex: 1, padding: '8px 10px', border: '1.5px solid #e2e8f0',
                        borderRadius: 7, fontSize: 12, fontFamily: 'monospace', color: '#1a1a2e',
                        background: '#fff', outline: 'none',
                      }}
                    />
                    <button className="tp-btn" onClick={() => handleTrack()}
                      style={{ background: '#1a1a5e', color: '#fff', border: 'none', borderRadius: 7, padding: '8px 12px', cursor: 'pointer' }}>
                      <span className="mat" style={{ fontSize: 18 }}>search</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <footer className="footer-card">
          <div className="footer-cols">
            {/* Column 1: Brand */}
            <div>
              <img src="/logo.png" alt={BRANDING.name} style={{ height: 36, marginBottom: 20 }} />
              <p className="footer-text" style={{ maxWidth: 280 }}>
                Building sustainable energy<br />
                infrastructure across India with smart<br />
                solar solutions.
              </p>
            </div>

            {/* Column 2: Contact */}
            <div>
              <div className="footer-heading">Contact</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <a href={`mailto:${BRANDING.email}`} className="footer-link">
                  <span className="mat">mail</span> {BRANDING.email}
                </a>
                <a href="https://wa.me/919278142266" className="footer-link">
                  <span className="mat">chat_bubble</span> +91 92781 42266
                </a>
                <a href="tel:+919278142266" className="footer-link">
                  <span className="mat">call</span> +91 92781 42266
                </a>
              </div>
            </div>

            {/* Column 3: Office */}
            <div>
              <div className="footer-heading">Office</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span className="mat" style={{ color: '#94a3b8', fontSize: 18, marginTop: 2, fontVariationSettings: "'FILL' 0" }}>location_on</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <strong style={{ color: '#1a1a5e', fontSize: 14, fontWeight: 700 }}>New Delhi Headquarters</strong>
                  <span className="footer-text">
                    Probfixora<br />
                    New Delhi, India<br />
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <div style={{ color: '#94a3b8' }}>
              &copy; {BRANDING.year} {BRANDING.name}. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
