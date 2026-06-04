import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { edgeFetch, EDGE } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import Sidebar from './Sidebar';
import Header from './Header';
import DashboardCards from './DashboardCards';
import Footer from './Footer';
import PipelineFunnel from './PipelineFunnel';
import LeadTracker from './LeadTracker';
import { ArrowRight, Activity, FolderOpen, Zap, Clock, CheckCircle2, AlertTriangle, TrendingUp, Users, Calendar, GitBranch } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

const Dashboard = ({ onLogout, title = 'Dashboard', roleBadge, viewAsUserId, viewAsUserName, viewAsRole }) => {
  const [stats, setStats]             = useState(null);
  const [activities, setActivities]   = useState([]);
  const [cases, setCases]             = useState([]);
  const [quotations, setQuotations]   = useState([]);
  const [pipeline, setPipeline]       = useState([]);
  const [overdue, setOverdue]         = useState([]);
  const [perf, setPerf]               = useState([]);
  const [summary, setSummary]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [activeTab, setActiveTab]     = useState('overview');
  // ── Analytics tab state (lazy-loaded when tab is opened) ──────────────────
  const [analyticsData, setAnalyticsData]     = useState({ trendData: null, revenuePipeline: null });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [chartTimeframe, setChartTimeframe]   = useState('daily');
  const [customStart, setCustomStart]         = useState('');
  const [customEnd, setCustomEnd]             = useState('');
  const navigate   = useNavigate();

  // ── Simulation identity ──────────────────────────────────────────────────
  // Props (legacy) take precedence, then localStorage.simulating (set by EmployeeDrillDown)
  const lsSimulating = localStorage.getItem('simulating') === 'true';
  const isSimulating = !!(viewAsUserId || viewAsUserName || viewAsRole) || lsSimulating;
  const userRole = (viewAsRole || localStorage.getItem('role') || 'user').toLowerCase();
  const userName = viewAsUserName || localStorage.getItem('name') || '';
  const userId   = viewAsUserId   || localStorage.getItem('userId') || '';
  const isAdmin  = !isSimulating && (localStorage.getItem('realRole') || localStorage.getItem('role') || '').toLowerCase() === 'admin';

  useEffect(() => {
    const load = async () => {
      try {
        if (isSimulating) {
          // ── SIMULATION MODE: fetch data scoped to the specific employee ──
          const [empStats, empCases, empActivity, empQuotes] = await Promise.allSettled([
            edgeFetch(EDGE.analytics, { action: 'employee_stats', userId, userName, userRole }),
            edgeFetch(EDGE.workflow,  { action: 'get_all', viewAsRole: userRole }),
            edgeFetch(EDGE.analytics, { action: 'activity', viewAsUserName: userName }),
            userRole === 'sales'
              ? edgeFetch(EDGE.quotation, { action: 'list', salesPerson: userName })
              : Promise.resolve([]),
          ]);

          const get = (r) => r.status === 'fulfilled' ? r.value : null;

          // Map employee_stats → DashboardCards format
          const es = get(empStats);
          if (es) {
            if (userRole === 'sales') {
              const quotes = get(empQuotes) || [];
              setQuotations(quotes);
              setStats({
                totalCases:      es.total?.registered ?? quotes.length,
                inProgressCases: es.total?.processing ?? 0,
                completedCases:  es.total?.completed  ?? 0,
                delayedCases:    es.total?.rejected   ?? 0,
              });
            } else {
              // For non-sales roles, count from the actual cases list
              // so that Dashboard numbers match the Customers list exactly
              const rawCases = get(empCases) || [];
              const myStages = {
                registration:       ['Registration Done', 'Phone Verification Done', 'Govt Approvals Pending'],
                banking:            ['Bank & Finance'],
                inventory:          ['Sent to Store'],
                field_installation: ['Installation Started', 'Plant Activated'],
                electrical:         ['Govt Approvals Pending'],
                technical:          ['QA Verified'],
                accounts:           ['Accounts Verified'],
                subsidy:            ['Sent to Subsidy', 'Subsidy Registration Completed'],
                customer_service:   ['Post-Installation Service'],
              }[userRole] || [];
              const fullPipeline = [
                'Registration Done','Phone Verification Done','Bank & Finance',
                'Sent to Store','Installation Started','Govt Approvals Pending','Plant Activated',
                'QA Verified','Accounts Verified','Sent to Subsidy','Subsidy Registration Completed','Post-Installation Service','Completed',
              ];
              const myLastIdx = Math.max(...myStages.map(s => fullPipeline.indexOf(s)));
              const active    = rawCases.filter(c => myStages.includes(c.current_stage ?? c.currentStage));
              const completed = rawCases.filter(c => {
                const idx = fullPipeline.indexOf(c.current_stage ?? c.currentStage);
                return idx > myLastIdx;
              });
              setStats({
                totalCases:      active.length + completed.length,
                inProgressCases: active.filter(c => c.status === 'In Progress').length,
                completedCases:  completed.length,
                delayedCases:    active.filter(c => c.status === 'Delayed').length,
              });
            }
          }

          // Cases filtered by employee's role stages
          const rawCases = get(empCases) || [];
          setCases(rawCases.map(c => ({
            ...c,
            caseId:       c.case_id       ?? c.caseId,
            customerName: c.customer_name ?? c.customerName,
            currentStage: c.current_stage ?? c.currentStage,
            siteVisitDate: c.site_visit_date ?? c.siteVisitDate,
            createdAt:    c.created_at    ?? c.createdAt,
          })));

          setActivities(get(empActivity) || []);
          setLoading(false);
          return;
        }

        // ── NORMAL MODE: original data fetching ──
        const reqs = [
          edgeFetch(EDGE.analytics, { action: 'stats' }),
          edgeFetch(EDGE.analytics, { action: 'activity' }),
          edgeFetch(EDGE.workflow,  { action: 'get_all' }),
          edgeFetch(EDGE.analytics, { action: 'pipeline' }),
          edgeFetch(EDGE.analytics, { action: 'monthly_summary' }),
        ];
        if (isAdmin) {
          reqs.push(edgeFetch(EDGE.analytics, { action: 'overdue' }));
          reqs.push(edgeFetch(EDGE.analytics, { action: 'performance' }));
        }
        if (userRole === 'sales') {
          reqs.push(edgeFetch(EDGE.quotation, { action: 'list' }));
        }

        const results = await Promise.allSettled(reqs);
        const getData = (idx) => results[idx]?.status === 'fulfilled' ? results[idx].value : null;
        const failures = results.filter(r => r.status === 'rejected');

        setActivities(getData(1) || []);

        // Normalize snake_case → camelCase for cases array
        const rawCases = getData(2) || [];
        setCases(rawCases.map(c => ({
          ...c,
          caseId: c.id ?? c.case_id ?? c.caseId,
          customerName: c.customer_name ?? c.customerName,
          currentStage: c.current_stage ?? c.currentStage,
          siteVisitDate: c.site_visit_date ?? c.siteVisitDate,
          createdAt: c.created_at ?? c.createdAt,
        })));

        setPipeline(getData(3) || []);
        setSummary(getData(4));
        if (isAdmin) {
          // Normalize overdue cases too
          const rawOverdue = getData(5) || [];
          setOverdue(rawOverdue.map(c => ({
            ...c,
            caseId: c.id ?? c.case_id ?? c.caseId,
            customerName: c.customer_name ?? c.customerName,
            currentStage: c.current_stage ?? c.currentStage,
          })));
          setPerf(getData(6) || []);
        }

        if (userRole === 'sales') {
          const rawQuotes = getData(reqs.length - 1) || [];
          setQuotations(rawQuotes);
          setStats({
            totalCases: rawQuotes.length,
            inProgressCases: rawQuotes.filter(q => q.status === 'Processing' || q.status === 'In Process').length,
            completedCases: rawQuotes.filter(q => q.current_department === 'Registration' || q.status === 'Registration Completed' || q.status === 'Sent to Registration').length,
            delayedCases: rawQuotes.filter(q => q.status === 'Rejected').length,
          });
        } else {
          setStats(getData(0));
        }

        if (failures.length > 0) {
          console.error('Some dashboard requests failed:', failures);
          toast.error(`Partial load: ${failures.length} widgets failed.`);
        }

      } catch (err) {
        console.error('Dashboard Critical Error:', err);
        toast.error('Could not load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin, userRole]);

  // ── Lazy-load analytics data when admin opens the Analytics tab ────────────
  useEffect(() => {
    if (activeTab !== 'analytics' || !isAdmin) return;
    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        const payload = { action: 'trend_data', timeframe: chartTimeframe };
        if (chartTimeframe === 'custom') {
          payload.startDate = customStart;
          payload.endDate = customEnd;
        }
        const [trend, revenue] = await Promise.allSettled([
          edgeFetch(EDGE.analytics, payload),
          edgeFetch(EDGE.analytics, { action: 'revenue_pipeline' }),
        ]);
        setAnalyticsData({
          trendData:       trend.status === 'fulfilled'   ? trend.value   : [],
          revenuePipeline: revenue.status === 'fulfilled' ? revenue.value : null,
        });
      } catch {
        // silently fail — analytics tab shows empty state
      } finally {
        setAnalyticsLoading(false);
      }
    };
    fetchAnalytics();
  }, [activeTab, chartTimeframe, customStart, customEnd, isAdmin]); // eslint-disable-line

  if (loading) return (
    <div className="main-loading">
      <div style={{ textAlign:'center' }}>
        <div style={{ display:'flex', gap:'12px', marginBottom:'20px' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ width:'160px', height:'110px', borderRadius:'14px' }} />)}
        </div>
        <p style={{ fontSize:'13px', color:'var(--text-4)' }}>Loading dashboard…</p>
      </div>
    </div>
  );

  const total      = stats?.totalCases     || 0;
  const inProgress = stats?.inProgressCases || 0;
  const completed  = stats?.completedCases  || 0;
  const delayed    = stats?.delayedCases    || 0;

  // Dept-specific widget data
  const deptWidgets = {
    banking: [
      { label: 'Pending loan cases',  val: cases.filter(c => c.currentStage === 'Bank & Finance').length,             color: '#f59e0b', icon: Clock },
      { label: 'Delayed in banking',  val: cases.filter(c => c.currentStage === 'Bank & Finance' && c.status === 'Delayed').length, color: '#f43f5e', icon: AlertTriangle },
    ],
    field_installation: [
      { label: 'Sites to install',    val: cases.filter(c => c.currentStage === 'Installation Started').length,  color: '#10b981', icon: Zap },
      { label: 'With site visit date', val: cases.filter(c => c.siteVisitDate).length,                         color: '#6366f1', icon: Calendar },
      { label: 'Overdue installs',    val: cases.filter(c => c.currentStage === 'Installation Started' && c.status === 'Delayed').length, color: '#f43f5e', icon: AlertTriangle },
    ],
    electrical: [
      { label: 'Awaiting inspection', val: cases.filter(c => c.currentStage === 'Govt Approvals Pending').length, color: '#0ea5e9', icon: Zap },
      { label: 'Delayed checks',      val: cases.filter(c => c.currentStage === 'Govt Approvals Pending' && c.status === 'Delayed').length, color: '#f43f5e', icon: AlertTriangle },
    ],
    subsidy: [
      { label: 'Subsidy Pending',    val: cases.filter(c => c.currentStage === 'Subsidy Registration Completed').length, color: '#ec4899', icon: Clock },
      { label: 'Subsidy Delayed',    val: cases.filter(c => c.currentStage === 'Subsidy Registration Completed' && c.status === 'Delayed').length, color: '#f43f5e', icon: AlertTriangle },
    ],
    sales: [
      { label: 'Registered today',   val: quotations.filter(q => { const d = new Date(q.created_at || q.createdAt); const n = new Date(); return d.toDateString() === n.toDateString(); }).length, color: '#10b981', icon: Zap },
      { label: 'Registered this month', val: quotations.filter(q => { const d = new Date(q.created_at || q.createdAt); const n = new Date(); return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear(); }).length, color: '#6366f1', icon: TrendingUp },
    ],
    inventory: [
      { label: 'Pending dispatch',   val: cases.filter(c => c.currentStage === 'Sent to Store').length,              color: '#8b5cf6', icon: FolderOpen },
      { label: 'Delayed in inventory',   val: cases.filter(c => c.currentStage === 'Sent to Store' && c.status === 'Delayed').length, color: '#f43f5e', icon: AlertTriangle },
    ],
    registration: [
      { label: 'Pending Registration', val: cases.filter(c => c.currentStage === 'Registration Done').length, color: '#6366f1', icon: Clock },
      { label: 'Pending Verification', val: cases.filter(c => c.currentStage === 'Phone Verification Done').length, color: '#10b981', icon: Clock },
      { label: 'Registration Delayed', val: cases.filter(c => (c.currentStage === 'Registration Done' || c.currentStage === 'Phone Verification Done') && c.status === 'Delayed').length, color: '#f43f5e', icon: AlertTriangle },
    ],
    technical: [
      { label: 'Pending QA', val: cases.filter(c => c.currentStage === 'QA Verified').length, color: '#3b82f6', icon: CheckCircle2 },
      { label: 'Delayed QA', val: cases.filter(c => c.currentStage === 'QA Verified' && c.status === 'Delayed').length, color: '#f43f5e', icon: AlertTriangle },
    ],
    accounts: [
      { label: 'Pending Payments', val: cases.filter(c => c.currentStage === 'Accounts Verified').length, color: '#10b981', icon: Zap },
      { label: 'Delayed Payments', val: cases.filter(c => c.currentStage === 'Accounts Verified' && c.status === 'Delayed').length, color: '#f43f5e', icon: AlertTriangle },
    ],
    customer_service: [
      { label: 'Pending Service', val: cases.filter(c => c.currentStage === 'Post-Installation Service').length, color: '#8b5cf6', icon: Clock },
    ],
  };
  const myWidgets = deptWidgets[userRole] || [];

  const card = (style = {}) => ({ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', padding: '20px', ...style });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--page-bg)' }}>
      <Sidebar onLogout={onLogout} />

      <main style={{ flex: 1, marginLeft: 'var(--main-offset)', padding: isSimulating ? '0 32px 28px' : '28px 32px', maxWidth: '1400px', boxSizing: 'border-box' }}>

        {/* Simulation banner is handled globally by App.js — no duplicate here */}

        <Header title={title} subtitle={isSimulating ? `Viewing ${userName}'s data` : 'Overview of your projects today'} roleBadge={roleBadge} onLogout={onLogout} />

        {/* ── Tab Switcher — Lead Tracking for Sales, Analytics for Admin ── */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {[
            { key: 'overview',   label: 'Overview',      icon: Activity,    show: true },
            { key: 'leads',      label: 'Lead Tracking', icon: GitBranch,   show: userRole === 'sales' },
            { key: 'analytics',  label: 'Analytics',     icon: TrendingUp,  show: isAdmin && !isSimulating },
          ].filter(t => t.show).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 16px', borderRadius: '999px', border: '1.5px solid',
              borderColor: activeTab === key ? 'var(--color-primary)' : 'var(--color-border)',
              background: activeTab === key ? 'var(--color-primary)' : 'transparent',
              color: activeTab === key ? '#fff' : 'var(--text-3)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}>
              <Icon style={{ width: '14px', height: '14px' }} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Lead Tracking Tab (Sales only) ── */}
        {userRole === 'sales' && activeTab === 'leads' && (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <GitBranch style={{ width: '18px', height: '18px', color: 'var(--color-primary)' }} />
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-1)' }}>Lead Tracking</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-4)', marginTop: '2px' }}>Real-time pipeline view of every lead you've worked on</p>
              </div>
            </div>
            <LeadTracker userId={userId} userName={userName} userRole={userRole} />
          </div>
        )}


        {/* ── Overview Tab ── */}
        {activeTab === 'overview' && (
        <>
        <DashboardCards stats={stats} role={userRole} />

        {/* ── Dept-specific widgets (non-admin) ── */}
        {!isAdmin && myWidgets.length > 0 && (
          <div className="grid-stack-mobile" style={{ display:'grid', gridTemplateColumns:`repeat(${myWidgets.length}, 1fr)`, gap:'12px', marginBottom:'20px' }}>
            {myWidgets.map(({ label, val, color, icon: Icon }) => (
              <div key={label} style={{ ...card(), display:'flex', alignItems:'center', gap:'14px' }}>
                <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <Icon style={{ width:'20px', height:'20px', color }} />
                </div>
                <div>
                  <p style={{ fontSize:'22px', fontWeight:800, color:'var(--text-1)', lineHeight:1 }}>{val}</p>
                  <p style={{ fontSize:'12px', color:'var(--text-4)', marginTop:'3px' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Main 2-column layout ── */}
        {/* LEFT: Hero card + Pipeline Funnel  |  RIGHT: Activity + Workflow status */}
        <div className="grid-stack-mobile" style={{ display:'grid', gridTemplateColumns: '1fr 340px', gap:'16px', marginBottom:'16px', alignItems:'start' }}>

          {/* LEFT COLUMN */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

            {/* Hero card */}
            <div onClick={() => navigate(userRole === 'sales' ? '/approved-quotations' : '/cases')} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-2xl)',
              padding: '36px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              transition: 'all 0.2s ease'
            }}>
              <div style={{ display:'flex', gap:'12px', marginBottom:'24px', flexWrap:'wrap', position: 'relative', zIndex: 1 }}>
                {[
                  {icon:FolderOpen, label:`${total} total`,       bg:'var(--color-primary-dim)', color: 'var(--color-primary-hover)'},
                  {icon:Clock,      label:`${inProgress} active`, bg:'var(--color-info-light)',  color: 'var(--color-info)'},
                  {icon:CheckCircle2,label:`${completed} done`,   bg:'var(--color-accent-light)',color: 'var(--color-accent)'},
                ].map(({icon:Icon,label,bg,color}) => (
                  <div key={label} style={{ background:bg, color:color, padding: '6px 14px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}>
                    <Icon style={{ width:'14px', height:'14px' }} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: 800, color: 'var(--text-1)', marginBottom: '8px', lineHeight: 1.2, letterSpacing: '-0.02em', position: 'relative', zIndex: 1 }}>Manage your solar<br />installations</h2>
              <p style={{ fontSize: '15px', color: 'var(--text-3)', marginBottom: '24px', position: 'relative', zIndex: 1 }}>Track every project from registration to plant activation.</p>
              <button style={{
                background: 'var(--color-primary)', color: 'var(--text-2)', border: 'none', padding: '10px 20px', borderRadius: 'var(--radius-full)',
                fontWeight: 700, fontSize: '13.5px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)', position: 'relative', zIndex: 1
              }}>
                Open {userRole === 'sales' ? 'quotations' : 'cases'} <ArrowRight style={{ width:'14px', height:'14px' }} />
              </button>
            </div>

            {/* Pipeline Funnel card — Admin and Sales only */}
            {(isAdmin || userRole === 'sales') && (
              <div style={{ ...card(), display:'flex', flexDirection:'column', maxHeight:'320px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'12px', flexShrink:0 }}>
                  <div>
                    <h3 style={{ fontFamily:'DM Sans,sans-serif', fontSize:'14px', fontWeight:700, color:'var(--text-1)' }}>Pipeline funnel</h3>
                    <p style={{ fontSize:'12px', color:'var(--text-4)', marginTop:'2px' }}>Cases at each workflow stage</p>
                  </div>
                  <button onClick={() => navigate('/cases')} className="btn btn-ghost btn-sm" style={{ fontSize:'12.5px' }}>View all <ArrowRight style={{ width:'12px', height:'12px' }} /></button>
                </div>
                <div style={{ overflowY:'auto', flex:1, paddingRight:'4px' }}>
                  <PipelineFunnel data={pipeline} />
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>

            {userRole === 'sales' ? (
              <>
                {/* Recent Quotations Feed */}
                <div style={card({ display:'flex', flexDirection:'column', maxHeight: '340px' })}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'18px' }}>
                    <Clock style={{ width:'15px', height:'15px', color:'var(--brand)' }} />
                    <h3 style={{ fontFamily:'DM Sans,sans-serif', fontSize:'14px', fontWeight:700, color:'var(--text-1)' }}>Recent Quotations</h3>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px', overflowY:'auto' }}>
                    {[...quotations].sort((a,b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt)).slice(0, 5).map(q => (
                      <div key={q.id || q._id} style={{ display:'flex', justifyContent:'space-between', padding:'10px', background:'var(--surface-2)', borderRadius:'8px' }}>
                        <div>
                          <p style={{ fontSize:'13px', fontWeight:700, color:'var(--text-1)' }}>{q.customer_name || q.customer?.name}</p>
                          <p style={{ fontSize:'11px', color:'var(--text-4)' }}>{new Date(q.created_at || q.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <p style={{ fontSize:'13px', fontWeight:700, color:'var(--text-1)' }}>₹{Number(q.product_price || q.otherDetails?.productPrice || 0).toLocaleString()}</p>
                          <p style={{ fontSize:'11px', color: (q.status === 'Approved' || q.status === 'Registration Completed') ? '#059669' : q.status === 'Rejected' ? '#f43f5e' : '#f59e0b' }}>{q.status === 'Registration Completed' ? 'Approved' : q.status}</p>
                        </div>
                      </div>
                    ))}
                    {quotations.length === 0 && <p style={{ fontSize:'12px', color:'var(--text-4)', textAlign:'center', padding:'20px 0' }}>No recent quotations</p>}
                  </div>
                </div>

                {/* Conversion Rate */}
                {(() => {
                  const resolved = quotations.filter(q => q.status === 'Approved' || q.status === 'Registration Completed' || q.status === 'Rejected');
                  const approved = resolved.filter(q => q.status === 'Approved' || q.status === 'Registration Completed');
                  const rate = resolved.length > 0 ? Math.round((approved.length / resolved.length) * 100) : 0;
                  return (
                    <div style={card()}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'18px' }}>
                        <TrendingUp style={{ width:'15px', height:'15px', color:'var(--color-primary)' }} />
                        <h3 style={{ fontFamily:'DM Sans,sans-serif', fontSize:'14px', fontWeight:700, color:'var(--text-1)' }}>Conversion Rate</h3>
                      </div>
                      <div style={{ display:'flex', alignItems:'flex-end', gap:'12px' }}>
                        <p style={{ fontSize:'36px', fontWeight:800, color:'var(--text-1)', lineHeight:1 }}>{rate}%</p>
                        <p style={{ fontSize:'13px', color:'var(--text-4)', paddingBottom:'4px' }}>Win Rate</p>
                      </div>
                      <div style={{ height:'6px', background:'var(--surface-2)', borderRadius:'3px', marginTop:'16px', overflow:'hidden' }}>
                        <div style={{ width:`${rate}%`, height:'100%', background:'var(--color-primary)', borderRadius:'3px' }} />
                      </div>
                    </div>
                  );
                })()}

                {/* High-Value Prospects */}
                <div style={card({ display:'flex', flexDirection:'column' })}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'18px' }}>
                    <Zap style={{ width:'15px', height:'15px', color:'#f59e0b' }} />
                    <h3 style={{ fontFamily:'DM Sans,sans-serif', fontSize:'14px', fontWeight:700, color:'var(--text-1)' }}>Top Prospects</h3>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    {[...quotations].filter(q => q.status === 'Processing' || q.status === 'Submitted')
                      .sort((a,b) => Number(b.product_price || b.otherDetails?.productPrice || 0) - Number(a.product_price || a.otherDetails?.productPrice || 0))
                      .slice(0,3)
                      .map(q => (
                        <div key={q.id || q._id} style={{ display:'flex', justifyContent:'space-between', padding:'10px', background:'rgba(245,158,11,0.05)', borderRadius:'8px', border:'1px solid rgba(245,158,11,0.1)' }}>
                          <div>
                            <p style={{ fontSize:'13px', fontWeight:700, color:'var(--text-1)' }}>{q.customer_name || q.customer?.name}</p>
                            <p style={{ fontSize:'11px', color:'var(--text-4)' }}>{q.quotation_id || q.quotationId}</p>
                          </div>
                          <p style={{ fontSize:'14px', fontWeight:800, color:'#d97706' }}>₹{Number(q.product_price || q.otherDetails?.productPrice || 0).toLocaleString()}</p>
                        </div>
                      ))}
                      {quotations.filter(q => q.status === 'Processing' || q.status === 'Submitted').length === 0 && <p style={{ fontSize:'12px', color:'var(--text-4)', textAlign:'center', padding:'20px 0' }}>No active prospects</p>}
                  </div>
                </div>
              </>
            ) : (
              <>

            {/* Activity Feed */}
            <div style={card({ display:'flex', flexDirection:'column' })}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'18px' }}>
                <Activity style={{ width:'15px', height:'15px', color:'var(--color-primary)' }} />
                <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--text-1)' }}>Activity</h3>
                {activities.length > 0 && <div style={{ marginLeft:'auto', padding:'2px 8px', borderRadius:'var(--radius-pill)', background:'var(--color-primary-light)', fontSize:'11px', fontWeight:700, color:'var(--color-primary)' }}>{activities.length}</div>}
              </div>
              <div style={{ display:'flex', flexDirection:'column', overflowY:'auto', maxHeight:'340px' }}>
                {activities.length > 0 ? activities.slice(0,10).map((a,i) => (
                  <div key={i} className="activity-item">
                    <div className="activity-avatar">{(a.updated_by || a.updatedBy)?.[0]?.toUpperCase()||'U'}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:'6px', marginBottom:'3px' }}>
                        <span className="activity-case">
                          {a.cases?.tracking_id ? `${a.cases.tracking_id} (${a.cases.customer_name})` : (a.caseId || a.id || a.case_id)}
                        </span>
                        <span className="activity-time">{new Date(a.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                      <p className="activity-action">{a.stage}</p>
                      <p style={{ fontSize:'11px', color:'var(--color-text-muted)' }}>by <span style={{ color:'var(--color-text-secondary)', fontWeight:600 }}>{a.updated_by || a.updatedBy ||'Unknown'}</span></p>
                    </div>
                  </div>
                )) : (
                  <div className="empty-state">
                    <div className="empty-icon"><i className="ti ti-activity" /></div>
                    <p className="empty-title">No activity yet</p>
                    <p className="empty-desc">Stage updates will appear here.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Workflow status */}
            <div style={card()}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'18px' }}>
                <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--text-1)' }}>Workflow status</h3>
                <span className="live-badge"><span className="live-dot" />Live</span>
              </div>
              {[
                'Registration Done','Bank & Finance',
                'Sent to Store','Installation Started','Govt Approvals Pending',
                'Plant Activated','Subsidy Registration Completed',
              ].map(stage => {
                const count = cases.filter(c => c.currentStage === stage).length;
                if (count === 0) return null;
                return (
                  <div key={stage} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'0.5px solid var(--color-border)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'var(--color-primary)' }} />
                      <span style={{ fontSize:'12.5px', color:'var(--color-text-secondary)' }}>{stage}</span>
                    </div>
                    <span style={{ fontSize:'13px', fontWeight:700, color:'var(--text-1)', background:'var(--color-primary-light)', padding:'1px 9px', borderRadius:'var(--radius-pill)' }}>{count}</span>
                  </div>
                );
              }).filter(Boolean)}
            </div>
              </>
            )}
          </div>
        </div>

        {/* ── Admin-only blocks ── */}
        {isAdmin && (
          <>
            {/* Monthly Report Card + Overdue */}
            <div className="grid-stack-mobile" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
              {/* Monthly summary */}
              <div style={card()}>
              <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--text-1)', marginBottom:'16px' }}>Monthly report — {new Date().toLocaleString('en-IN',{month:'long',year:'numeric'})}</h3>
                {summary ? (
                  <div className="stats-grid-mobile" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px' }}>
                    {[
                      { label:'Registered',  val:summary.created,       colorCls:'blue',  navTo: '/cases' },
                      { label:'Completed',   val:summary.completed,     colorCls:'green', navTo: '/cases?tab=completed' },
                      { label:'Delayed now', val:summary.delayed,       colorCls:'red',   navTo: '/cases?tab=delayed' },
                      { label:'Avg days',    val:`${summary.avgCycleDays}d`, colorCls:'amber', navTo: '/cases' },
                      { label:'Active',      val:summary.totalActive,   colorCls:'blue',  navTo: '/cases?tab=active' },
                      { label:'Top delay',   val:summary.topDelayedStage?.split(' ')[0]||'None', colorCls:'red', navTo: '/cases?tab=delayed' },
                    ].map(({ label, val, colorCls, navTo }) => (
                      <div key={label} className="report-card" onClick={() => navigate(navTo)}>
                        <p className={`report-number ${colorCls}`}>{val}</p>
                        <p className="report-label">{label}</p>
                      </div>
                    ))}
                  </div>
                ) : <p style={{ color:'var(--color-text-muted)', fontSize:'13px' }}>No data yet.</p>}
              </div>

              {/* Overdue panel */}
              <div style={card()}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
                  <AlertTriangle style={{ width:'15px', height:'15px', color:'var(--color-danger)' }} />
                  <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--text-1)' }}>Overdue cases</h3>
                  {overdue.length > 0 && <span style={{ marginLeft:'auto', padding:'2px 8px', borderRadius:'var(--radius-pill)', background:'var(--color-danger-light)', fontSize:'11px', fontWeight:700, color:'var(--color-danger)' }}>{overdue.length}</span>}
                </div>
                {overdue.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><i className="ti ti-circle-check" /></div>
                    <p className="empty-title">All clear!</p>
                    <p className="empty-desc">No cases stuck for more than 3 days.</p>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px', maxHeight:'220px', overflowY:'auto' }}>
                    {overdue.slice(0,6).map(c => (
                      <div key={c.caseId} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', borderRadius:'var(--radius-md)', background:'var(--surface-2)', border:'0.5px solid var(--color-border)' }}>
                        <div>
                          <p style={{ fontSize:'11.5px', fontWeight:700, color:'var(--text-1)', fontFamily:'monospace' }}>{c.caseId}</p>
                          <p style={{ fontSize:'11px', color:'var(--color-text-muted)' }}>{c.customerName} &middot; {c.currentStage}</p>
                        </div>
                        <span style={{ fontSize:'11px', fontWeight:700, color:'var(--color-danger)', background:'var(--color-danger-light)', padding:'2px 8px', borderRadius:'var(--radius-pill)', flexShrink:0 }}>
                          {c.daysStuck}d
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Dept performance leaderboard */}
            <div style={{ ...card(), marginBottom:'16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'16px' }}>
                <TrendingUp style={{ width:'15px', height:'15px', color:'var(--color-primary)' }} />
                <h3 style={{ fontSize:'14px', fontWeight:700, color:'var(--text-1)' }}>Department performance</h3>
              </div>
              {perf.length === 0 ? (
                <p style={{ color:'var(--color-text-muted)', fontSize:'13px', textAlign:'center', padding:'24px' }}>Not enough history data yet.</p>
              ) : (
                <div style={{ overflowX:'auto' }}>
                  <table className="dept-table">
                    <thead>
                      <tr>
                        {['Department','Cases','Avg Days','Delayed'].map(h => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...perf].sort((a,b) => a.avgDays - b.avgDays).map((d, i) => {
                        const maxCases = Math.max(...perf.map(p => p.casesProcessed), 1);
                        const barW = Math.round((d.casesProcessed / maxCases) * 100);
                        const dayCls = d.avgDays <= 1 ? 'days-fast' : d.avgDays <= 3 ? 'days-mid' : 'days-slow';
                        return (
                          <tr key={d.team}>
                            <td style={{ fontWeight:600, color:'var(--text-1)' }}>
                              {i === 0 && <span style={{ marginRight:'6px' }}>&#x1F947;</span>}{d.team}
                            </td>
                            <td>
                              <div className="mini-bar">
                                <span>{d.casesProcessed}</span>
                                <div className="mini-bar-track"><div className="mini-bar-fill" style={{ width:`${barW}%` }} /></div>
                              </div>
                            </td>
                            <td><span className={dayCls}>{d.avgDays} days</span></td>
                            <td style={{ color: d.delayCount > 0 ? 'var(--color-danger)' : 'var(--color-text-muted)', fontWeight: d.delayCount > 0 ? 700 : 400 }}>
                              {d.delayCount}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        </>
        )}

        {/* ── Analytics Tab (Admin only) ────────────────────────────────── */}
        {isAdmin && !isSimulating && activeTab === 'analytics' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '28px' }}>

            {analyticsLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ width: '36px', height: '36px', border: '3px solid var(--surface-3)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-3)' }}>Analyzing data…</p>
              </div>
            ) : (
              <>
                {/* ── Revenue Pipeline Metrics ── */}
                {analyticsData.revenuePipeline && (() => {
                  const rp = analyticsData.revenuePipeline;
                  const fmt = (n) => n >= 10000000 ? `₹${(n/10000000).toFixed(2)}Cr` : n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : `₹${(n/1000).toFixed(0)}K`;
                  return (
                    <div className="card" style={{ padding: '28px', background: 'var(--color-surface)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--color-primary-muted)' }}>
                          <Zap style={{ width: '20px', height: '20px', color: 'var(--color-primary)' }} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em', margin: 0 }}>Revenue Pipeline</h3>
                          <p style={{ fontSize: '13px', color: 'var(--text-4)', marginTop: '2px' }}>Aggregated financial metrics for all active projects</p>
                        </div>
                      </div>
                      <div className="dash-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                        {[
                          { label: 'Total Pipeline', val: fmt(rp.totalPipelineValue || 0), icon: TrendingUp, color: 'var(--color-primary)', bg: 'var(--color-primary-light)' },
                          { label: 'Loan Cases',           val: `${rp.loanCases || 0}`, sub: 'cases',  icon: GitBranch, color: 'var(--color-purple)', bg: 'var(--color-purple-light)' },
                          { label: 'Cash Cases',           val: `${rp.cashCases || 0}`, sub: 'cases',  icon: CheckCircle2, color: 'var(--color-accent)', bg: 'var(--color-accent-light)' },
                          { label: 'Avg Loan Amount',      val: fmt(rp.avgLoan || 0),   icon: Activity, color: 'var(--color-warning)', bg: 'var(--color-warning-light)' },
                          { label: 'Down Payments',  val: fmt(rp.totalDown || 0),          icon: FolderOpen, color: 'var(--color-info)', bg: 'var(--color-info-light)' },
                          { label: 'Active Cases',         val: `${rp.activeCases || 0}`,        icon: Users, color: 'var(--text-3)', bg: 'var(--surface-2)' },
                        ].map(({ label, val, sub, icon: Icon, color, bg }, i) => (
                          <div key={label} className="card-lift" style={{ background: bg, border: `1px solid ${color}22`, borderRadius: '16px', padding: '20px', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                              <p style={{ fontSize: '12px', color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                              <Icon style={{ width: '16px', height: '16px', color, opacity: 0.7 }} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                              <p style={{ fontSize: '28px', fontWeight: 800, color, letterSpacing: '-0.03em', lineHeight: 1 }}>{val}</p>
                              {sub && <span style={{ fontSize: '13px', color, fontWeight: 600, opacity: 0.8 }}>{sub}</span>}
                            </div>
                            <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05, transform: 'scale(2.5)' }}>
                               <Icon style={{ width: '40px', height: '40px', color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="analytics-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'stretch' }}>
                  {/* ── Trend Chart ── */}
                  <div className="card" style={{ padding: '28px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--surface-2)' }}>
                          <Activity style={{ width: '20px', height: '20px', color: 'var(--text-1)' }} />
                        </div>
                        <div>
                          <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em', margin: 0 }}>Registration Trends</h3>
                          <p style={{ fontSize: '13px', color: 'var(--text-4)', marginTop: '2px' }}>Case volume over time</p>
                        </div>
                      </div>
                      
                      {/* Timeframe Filters */}
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {['daily', 'weekly', 'monthly', 'yearly', 'custom'].map(tf => (
                          <button 
                            key={tf}
                            onClick={() => setChartTimeframe(tf)}
                            style={{
                              background: chartTimeframe === tf ? 'var(--color-primary)' : 'var(--surface-2)',
                              color: chartTimeframe === tf ? '#fff' : 'var(--text-2)',
                              border: 'none', padding: '6px 12px', borderRadius: '8px',
                              fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                              textTransform: 'capitalize', transition: 'all 0.2s'
                            }}
                          >
                            {tf}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {chartTimeframe === 'custom' && (
                      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', background: 'var(--surface-2)', padding: '12px', borderRadius: '12px' }}>
                        <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-1)' }} />
                        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>to</span>
                        <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} style={{ padding: '6px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-1)' }} />
                      </div>
                    )}

                    {(() => {
                      const trend = analyticsData.trendData || [];
                      if (trend.length === 0 && !analyticsLoading) return <p style={{ fontSize: '14px', color: 'var(--text-4)', textAlign: 'center', padding: '40px', flex: 1 }}>No registration data available for this period.</p>;
                      
                      return (
                        <div style={{ flex: 1, minHeight: '300px', position: 'relative' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-3)' }} dy={10} />
                              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--text-3)' }} />
                              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" opacity={0.5} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-card)', padding: '12px' }}
                                itemStyle={{ color: 'var(--text-1)', fontWeight: 700 }}
                                labelStyle={{ color: 'var(--text-3)', fontSize: '13px', marginBottom: '4px' }}
                              />
                              <Area type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" animationDuration={800} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}
                  </div>

                  {/* ── Escalation Breakdown ── */}
                  {(() => {
                    const escalated = cases.filter(c => (c.escalation_level || 0) > 0);
                    const byCritical = cases.filter(c => c.escalation_level === 3).length;
                    const byUrgent   = cases.filter(c => c.escalation_level === 2).length;
                    const byWatch    = cases.filter(c => c.escalation_level === 1).length;
                    return (
                      <div className="card" style={{ padding: '28px', background: 'var(--color-surface)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                          <div style={{ padding: '8px', borderRadius: '10px', background: 'var(--color-danger-muted)' }}>
                            <AlertTriangle style={{ width: '20px', height: '20px', color: 'var(--color-danger)' }} />
                          </div>
                          <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em', margin: 0 }}>Escalations</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-4)', marginTop: '2px' }}>{escalated.length} active alerts</p>
                          </div>
                        </div>
                        
                        {escalated.length === 0 ? (
                           <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', borderRadius: '16px', padding: '20px' }}>
                             <CheckCircle2 style={{ width: '32px', height: '32px', color: 'var(--color-accent)', marginBottom: '12px' }} />
                             <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-2)' }}>All Clear</p>
                             <p style={{ fontSize: '12px', color: 'var(--text-4)', textAlign: 'center' }}>No cases require immediate attention.</p>
                           </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
                            {[
                              { label: 'Critical (7+ days)',  count: byCritical, color: 'var(--color-danger)', bg: 'var(--color-danger-muted)' },
                              { label: 'Urgent (4-6 days)',   count: byUrgent,   color: 'var(--color-warning)', bg: 'var(--color-warning-muted)' },
                              { label: 'Watch (2-3 days)',    count: byWatch,    color: 'var(--color-info)', bg: 'var(--color-info-light)' },
                            ].map(({ label, count, color, bg }) => (
                              <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--surface-2)', borderRadius: '12px', borderLeft: `4px solid ${color}` }}>
                                <div>
                                  <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-1)' }}>{label.split(' ')[0]}</p>
                                  <p style={{ fontSize: '12px', color: 'var(--text-4)' }}>{label.substring(label.indexOf(' ') + 1)}</p>
                                </div>
                                <div style={{ background: bg, color, width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800 }}>
                                  {count}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        )}

        <Footer />
      </main>
    </div>
  );
};

export default Dashboard;
