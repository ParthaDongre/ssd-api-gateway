import { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Code2,
  Cpu,
  Database,
  ExternalLink,
  GitBranch,
  KeyRound,
  LockKeyhole,
  LogOut,
  Network,
  PackagePlus,
  Play,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Square,
  Terminal,
  UserCheck,
  UserRound,
  XCircle,
  Zap
} from 'lucide-react';

const SERVICES = [
  { key: 'auth', name: 'Auth Service', port: 5001, path: '/api/v1/auth/health', testPath: '/api/v1/auth/health', desc: 'Authentication & JWT issuance' },
  { key: 'users', name: 'User Service', port: 5002, path: '/api/v1/users/health', testPath: '/api/v1/users/profile', desc: 'Profile storage & identity enforcement' },
  { key: 'orders', name: 'Order Service', port: 5003, path: '/api/v1/orders/health', testPath: '/api/v1/orders/history', desc: 'Order persistence & per-user isolation' }
];

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('gateway_token');
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  if (token && !options.skipAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
  const rawText = await res.text();
  let data;
  try {
    data = rawText ? JSON.parse(rawText) : {};
  } catch {
    data = { message: rawText || res.statusText };
  }

  if (!res.ok) {
    const error = new Error(data.error || data.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.code = data.code;
    error.data = data;
    throw error;
  }

  return { data, status: res.status };
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('gateway_token') || '');
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('gateway_user') || 'null');
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace(/^#\/?/, '');
    const validTabs = ['overview', 'servers', 'profile', 'orders', 'playground', 'routes'];
    return validTabs.includes(hash) ? hash : 'overview';
  });

  const [authMode, setAuthMode] = useState('login');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Sync with browser back/forward history
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (['overview', 'servers', 'profile', 'orders', 'playground', 'routes'].includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (tab) => {
    setActiveTab(tab);
    window.location.hash = `#/${tab}`;
  };

  const handleLoginSuccess = (receivedToken, userObj) => {
    localStorage.setItem('gateway_token', receivedToken);
    localStorage.setItem('gateway_user', JSON.stringify(userObj));
    setToken(receivedToken);
    setCurrentUser(userObj);
    navigateTo('overview');
  };

  const handleLogout = () => {
    localStorage.removeItem('gateway_token');
    localStorage.removeItem('gateway_user');
    setToken('');
    setCurrentUser(null);
    setAuthMode('login');
    setAuthError('');
    setAuthSuccess('');
  };

  if (!token || !currentUser) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <Network size={24} />
            </div>
            <h2>{authMode === 'signup' ? 'Create an Account' : 'Sign In to Gateway Console'}</h2>
            <p>Dynamic Layer 7 Reverse Proxy & Microservices Platform</p>
          </div>

          {authError && (
            <div className="alert alert-danger">
              <XCircle size={16} />
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="alert alert-success">
              <CheckCircle2 size={16} />
              <span>{authSuccess}</span>
            </div>
          )}

          {authMode === 'login' ? (
            <LoginForm
              onLogin={handleLoginSuccess}
              busy={authBusy}
              setBusy={setAuthBusy}
              setError={setAuthError}
            />
          ) : (
            <SignupForm
              onSuccess={() => {
                setAuthSuccess('Account created successfully! You can now sign in.');
                setAuthMode('login');
              }}
              busy={authBusy}
              setBusy={setAuthBusy}
              setError={setAuthError}
            />
          )}

          <div style={{ marginTop: 18, textAlign: 'center', fontSize: 13 }}>
            {authMode === 'login' ? (
              <span>
                Need an account?{' '}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthError('');
                    setAuthSuccess('');
                  }}
                >
                  Register here
                </button>
              </span>
            ) : (
              <span>
                Already registered?{' '}
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', fontWeight: 600, cursor: 'pointer' }}
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                    setAuthSuccess('');
                  }}
                >
                  Back to Sign In
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand-icon">
            <Network size={20} />
          </div>
          <div className="brand-details">
            <h1>L7 API Gateway</h1>
            <span>Control Console</span>
          </div>
        </div>

        <nav className="nav-section">
          <div className="nav-label">Core Gateway</div>
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => navigateTo('overview')}
          >
            <div className="nav-item-left">
              <Activity size={16} />
              <span>System Overview</span>
            </div>
          </button>

          <button
            className={`nav-item ${activeTab === 'servers' ? 'active' : ''}`}
            onClick={() => navigateTo('servers')}
          >
            <div className="nav-item-left">
              <Server size={16} />
              <span>Server Controls</span>
            </div>
            <span className="badge badge-amber" style={{ fontSize: 9 }}>1-Click</span>
          </button>

          <button
            className={`nav-item ${activeTab === 'routes' ? 'active' : ''}`}
            onClick={() => navigateTo('routes')}
          >
            <div className="nav-item-left">
              <GitBranch size={16} />
              <span>Routing Rules</span>
            </div>
          </button>

          <div className="nav-label" style={{ marginTop: 14 }}>Microservice Data</div>
          <button
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => navigateTo('profile')}
          >
            <div className="nav-item-left">
              <UserRound size={16} />
              <span>User Profile</span>
            </div>
          </button>

          <button
            className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => navigateTo('orders')}
          >
            <div className="nav-item-left">
              <Boxes size={16} />
              <span>Order Isolation</span>
            </div>
          </button>

          <div className="nav-label" style={{ marginTop: 14 }}>Developer Tools</div>
          <button
            className={`nav-item ${activeTab === 'playground' ? 'active' : ''}`}
            onClick={() => navigateTo('playground')}
          >
            <div className="nav-item-left">
              <Terminal size={16} />
              <span>API Playground</span>
            </div>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="gateway-chip">
            <div className="gateway-chip-status">
              <div className="status-dot"></div>
              <span>Gateway :8000</span>
            </div>
            <span className="badge badge-blue">L7 Ready</span>
          </div>

          <div className="user-profile-strip">
            <div className="user-avatar">
              {(currentUser.username || 'U')[0].toUpperCase()}
            </div>
            <div className="user-meta">
              <b>{currentUser.name || currentUser.username}</b>
              <span>@{currentUser.username}</span>
            </div>
            <button className="btn-icon" title="Sign Out" onClick={handleLogout}>
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-wrapper">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Gateway Console</span>
            <ChevronRight size={14} />
            <b>
              {activeTab === 'overview' && 'System Overview & Real-Time Monitor'}
              {activeTab === 'servers' && '1-Click Microservice Controller & Fault Injector'}
              {activeTab === 'profile' && 'User Identity & Verified Claims'}
              {activeTab === 'orders' && 'Order Persistence & Per-Tenant Isolation'}
              {activeTab === 'playground' && 'Interactive L7 Gateway Playground'}
              {activeTab === 'routes' && 'Dynamic Routing Table & Path Rewriting'}
            </b>
          </div>
        </header>

        <div className="content-container">
          {activeTab === 'overview' && <OverviewTab navigateTo={navigateTo} />}
          {activeTab === 'servers' && <ServersTab />}
          {activeTab === 'profile' && <ProfileTab currentUser={currentUser} onLogout={handleLogout} />}
          {activeTab === 'orders' && <OrdersTab currentUser={currentUser} onLogout={handleLogout} />}
          {activeTab === 'playground' && <PlaygroundTab token={token} onLogout={handleLogout} />}
          {activeTab === 'routes' && <RoutesTab />}
        </div>
      </main>
    </div>
  );
}

/* =========================================================================
   LOGIN & SIGNUP FORMS
   ========================================================================= */
function LoginForm({ onLogin, busy, setBusy, setError }) {
  const [username, setUsername] = useState('student');
  const [password, setPassword] = useState('password123');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const res = await apiRequest('/api/v1/auth/login', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ username, password })
      });

      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label className="form-label">Username or Email</label>
        <input
          type="text"
          className="form-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Password</label>
        <input
          type="password"
          className="form-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={busy}>
        {busy ? 'Authenticating...' : 'Sign In through Gateway'}
      </button>

      <div className="demo-credentials-box">
        <b>Pre-seeded Demo Accounts:</b>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="demo-pill-btn"
            onClick={() => { setUsername('student'); setPassword('password123'); }}
          >
            student / password123 (3 orders)
          </button>
          <button
            type="button"
            className="demo-pill-btn"
            onClick={() => { setUsername('demo_user'); setPassword('password123'); }}
          >
            demo_user / password123 (2 orders)
          </button>
        </div>
      </div>
    </form>
  );
}

function SignupForm({ onSuccess, busy, setBusy, setError }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Computer Engineering');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      await apiRequest('/api/v1/auth/register', {
        method: 'POST',
        skipAuth: true,
        body: JSON.stringify({ username, email, password, name, department })
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            type="text"
            className="form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. johndoe"
            required
            minLength={3}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. John Doe"
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Email Address</label>
        <input
          type="email"
          className="form-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="e.g. john@example.com"
          required
        />
      </div>

      <div className="form-group">
        <label className="form-label">Department / Branch</label>
        <input
          type="text"
          className="form-input"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="e.g. Computer Science"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Password (Min 8 chars)</label>
        <input
          type="password"
          className="form-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          minLength={8}
        />
      </div>

      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={busy}>
        {busy ? 'Creating Account...' : 'Register Account'}
      </button>
    </form>
  );
}

/* =========================================================================
   OVERVIEW TAB COMPONENT (FULL WIDTH, DENSE, CLEAN)
   ========================================================================= */
function OverviewTab({ navigateTo }) {
  const [health, setHealth] = useState({});
  const [checking, setChecking] = useState(false);

  const checkHealth = async () => {
    setChecking(true);
    const results = {};

    await Promise.all(
      SERVICES.map(async (svc) => {
        const start = performance.now();
        try {
          const res = await apiRequest(svc.path, { skipAuth: true });
          const latency = Math.round(performance.now() - start);
          results[svc.key] = {
            ok: true,
            status: res.data.status || 'healthy',
            db: res.data.database || 'connected',
            latency: `${latency}ms`
          };
        } catch (err) {
          results[svc.key] = {
            ok: false,
            status: 'stopped / offline',
            code: err.code || 'ECONNREFUSED',
            error: err.message
          };
        }
      })
    );

    setHealth(results);
    setChecking(false);
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const activeCount = Object.values(health).filter((h) => h.ok).length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>System Overview & Command Center</h2>
          <p>Real-time gateway routing, persistent storage, and downstream health status.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => navigateTo('servers')}>
            <Server size={14} />
            <span>Manage Server States</span>
          </button>
          <button className="btn btn-primary" onClick={checkHealth} disabled={checking}>
            <RefreshCw size={14} className={checking ? 'spin' : ''} />
            <span>{checking ? 'Checking...' : 'Refresh Status'}</span>
          </button>
        </div>
      </div>

      {/* 3 Metric KPI Cards - Full Width */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-info">
            <span>Gateway Status</span>
            <h3>Port 8000</h3>
            <small>Dynamic L7 Reverse Proxy</small>
          </div>
          <div className="kpi-icon blue">
            <Network size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span>Database Service</span>
            <h3>Connected</h3>
            <small>Document Data Store</small>
          </div>
          <div className="kpi-icon green">
            <Database size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span>Downstream Services</span>
            <h3>{activeCount} / {SERVICES.length} Online</h3>
            <small>{activeCount === SERVICES.length ? 'All Microservices Running' : `${SERVICES.length - activeCount} Stopped / In Fault State`}</small>
          </div>
          <div className={`kpi-icon ${activeCount === SERVICES.length ? 'green' : 'purple'}`}>
            <Cpu size={22} />
          </div>
        </div>
      </div>

      {/* Interactive Server Controller Summary */}
      <div className="card">
        <div className="card-title">
          <span>Downstream Microservice Health & Instant Controls</span>
          <button className="btn btn-secondary btn-sm" onClick={() => navigateTo('servers')}>
            <span>Open Server Controller</span>
            <ArrowRight size={13} />
          </button>
        </div>
        <div className="card-subtitle">
          Test downstream server crashes and verify how the Layer 7 Gateway gracefully handles errors.
        </div>

        <div className="grid-3" style={{ marginBottom: 0 }}>
          {SERVICES.map((svc) => {
            const st = health[svc.key];
            const isOnline = st && st.ok;
            return (
              <div className={`server-control-card ${isOnline === false ? 'stopped' : ''}`} key={svc.key}>
                <div className="server-card-top">
                  <span className="server-card-title">
                    <div className={`status-dot ${isOnline === false ? 'offline' : ''}`}></div>
                    {svc.name}
                  </span>
                  <span className="server-port">:{svc.port}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{svc.desc}</p>
                <div className="server-meta-row">
                  <span>State:</span>
                  <b>
                    {st ? (
                      isOnline ? (
                        <span className="badge badge-green">Listening / Online</span>
                      ) : (
                        <span className="badge badge-red">STOPPED / OFFLINE</span>
                      )
                    ) : (
                      'Checking...'
                    )}
                  </b>
                </div>
                <div className="server-meta-row">
                  <span>Database:</span>
                  <b>{st && st.db ? st.db : 'connected'}</b>
                </div>
                <div className="server-meta-row">
                  <span>Ping Latency:</span>
                  <b>{st && st.latency ? st.latency : '—'}</b>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Architecture Flow - Full Width */}
      <div className="card">
        <div className="card-title">
          <span>L7 Gateway Request Pipeline</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigateTo('playground')}>
              <Terminal size={13} />
              <span>Open Playground</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigateTo('routes')}>
              <GitBranch size={13} />
              <span>Inspect Routes</span>
            </button>
          </div>
        </div>
        <div className="card-subtitle">
          How incoming client requests are authorized, rewritten, and routed to downstream microservices.
        </div>

        <div className="flow-diagram">
          <div className="flow-node">
            <b>1. Client</b>
            <small>Bearer JWT</small>
          </div>
          <ArrowRight size={15} className="flow-arrow" />
          <div className="flow-node highlight">
            <b>2. Gateway</b>
            <small>:8000 / L7</small>
          </div>
          <ArrowRight size={15} className="flow-arrow" />
          <div className="flow-node">
            <b>3. Auth Verify</b>
            <small>HS256 Check</small>
          </div>
          <ArrowRight size={15} className="flow-arrow" />
          <div className="flow-node">
            <b>4. Rewrite</b>
            <small>Strip Prefix</small>
          </div>
          <ArrowRight size={15} className="flow-arrow" />
          <div className="flow-node highlight">
            <b>5. Target</b>
            <small>:5001-5003</small>
          </div>
          <ArrowRight size={15} className="flow-arrow" />
          <div className="flow-node">
            <b>6. Database</b>
            <small>Persistent Store</small>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
          <div style={{ background: 'var(--bg-surface-secondary)', padding: 12, borderRadius: 6, border: '1px solid var(--border-light)' }}>
            <b style={{ fontSize: 12.5, color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>
              1-Click Server Fault Simulation
            </b>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              Click "Server Controls" in the sidebar to stop any server with 1 click. The gateway will intercept connection refusal and report HTTP 503.
            </p>
          </div>
          <div style={{ background: 'var(--bg-surface-secondary)', padding: 12, borderRadius: 6, border: '1px solid var(--border-light)' }}>
            <b style={{ fontSize: 12.5, color: 'var(--text-main)', display: 'block', marginBottom: 4 }}>
              Dynamic Hot-Reloading
            </b>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
              Route definitions in <code>config/routes.json</code> are watched and hot-reloaded automatically without restarting the gateway process.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   SERVER CONTROLS TAB (1-CLICK STOP/START & TEST ERROR)
   ========================================================================= */
function ServersTab() {
  const [servicesStatus, setServicesStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState({});
  const [testResults, setTestResults] = useState({});

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await apiRequest('/api/v1/gateway/services/status', { skipAuth: true });
      setServicesStatus(res.data.services || {});
    } catch {
      setServicesStatus({
        auth: { key: 'auth', name: 'Auth Service', port: 5001, running: true },
        users: { key: 'users', name: 'User Service', port: 5002, running: true },
        orders: { key: 'orders', name: 'Order Service', port: 5003, running: true }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleToggleServer = async (key) => {
    setActionBusy((prev) => ({ ...prev, [key]: true }));
    const current = servicesStatus[key];
    const action = current && current.running ? 'stop' : 'start';

    try {
      const res = await apiRequest(`/api/v1/gateway/services/${key}/${action}`, {
        method: 'POST',
        skipAuth: true
      });

      setServicesStatus((prev) => ({
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          running: res.data.running
        }
      }));

      // Clear previous test result
      setTestResults((prev) => ({ ...prev, [key]: null }));
    } catch (err) {
      alert(`Failed to ${action} server: ${err.message}`);
    } finally {
      setActionBusy((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleTestServer = async (svc) => {
    setActionBusy((prev) => ({ ...prev, [`test_${svc.key}`]: true }));
    setTestResults((prev) => ({ ...prev, [svc.key]: null }));

    const start = performance.now();
    try {
      const res = await apiRequest(svc.testPath);
      const latency = Math.round(performance.now() - start);

      setTestResults((prev) => ({
        ...prev,
        [svc.key]: {
          ok: true,
          status: res.status,
          latency: `${latency}ms`,
          message: `Server is active and responded successfully with HTTP ${res.status}!`,
          data: res.data
        }
      }));
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      setTestResults((prev) => ({
        ...prev,
        [svc.key]: {
          ok: false,
          status: err.status || 503,
          code: err.code || 'ECONNREFUSED',
          latency: `${latency}ms`,
          message: `Gateway Error: HTTP ${err.status || 503} Service Unavailable (TCP Port ${svc.port} Connection Refused). The server is genuinely stopped!`,
          data: err.data || { error: err.message }
        }
      }));
    } finally {
      setActionBusy((prev) => ({ ...prev, [`test_${svc.key}`]: false }));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>1-Click Microservice Controller & Fault Injector</h2>
          <p>Stop any server with a single click, dispatch a request through the Gateway, and observe the live error.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchStatus} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh States</span>
        </button>
      </div>

      <div className="grid-3">
        {SERVICES.map((svc) => {
          const info = servicesStatus[svc.key] || {};
          const isRunning = info.running ?? true;
          const isToggling = actionBusy[svc.key];
          const isTesting = actionBusy[`test_${svc.key}`];
          const testRes = testResults[svc.key];

          return (
            <div className={`server-control-card ${!isRunning ? 'stopped' : ''}`} key={svc.key}>
              <div className="server-card-top">
                <span className="server-card-title">
                  <div className={`status-dot ${!isRunning ? 'offline' : ''}`}></div>
                  {svc.name}
                </span>
                <span className="server-port">:{svc.port}</span>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                {svc.desc}
              </p>

              <div className="server-meta-row">
                <span>Listening Port:</span>
                <b>:{svc.port}</b>
              </div>
              <div className="server-meta-row">
                <span>Current Status:</span>
                <b>
                  {isRunning ? (
                    <span className="badge badge-green">RUNNING (Port Open)</span>
                  ) : (
                    <span className="badge badge-red">STOPPED (Port Closed)</span>
                  )}
                </b>
              </div>
              <div className="server-meta-row">
                <span>Gateway Route:</span>
                <code>/api/v1/{svc.key}/*</code>
              </div>

              {/* Action Buttons: 1-Click Stop/Start + Test Button */}
              <div className="server-action-bar">
                <button
                  type="button"
                  className={`btn ${isRunning ? 'btn-danger' : 'btn-success'} btn-sm`}
                  style={{ flex: 1 }}
                  onClick={() => handleToggleServer(svc.key)}
                  disabled={isToggling}
                >
                  {isRunning ? <Square size={13} /> : <Play size={13} />}
                  <span>{isToggling ? 'Processing...' : isRunning ? 'Stop Server' : 'Start Server'}</span>
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ flex: 1.2 }}
                  onClick={() => handleTestServer(svc)}
                  disabled={isTesting}
                >
                  <Activity size={13} className={isTesting ? 'spin' : ''} />
                  <span>{isTesting ? 'Calling Gateway...' : 'Test & Inspect Error'}</span>
                </button>
              </div>

              {/* Test Result Display Box */}
              {testRes && (
                <div className={`server-test-result-box ${testRes.ok ? 'success' : 'error'}`}>
                  <h4>
                    {testRes.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>HTTP {testRes.status} {testRes.code ? `(${testRes.code})` : ''} — {testRes.latency}</span>
                  </h4>
                  <p style={{ fontSize: 11.5, marginTop: 4 }}>{testRes.message}</p>
                  <pre>
                    {typeof testRes.data === 'object' ? JSON.stringify(testRes.data, null, 2) : String(testRes.data)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   MY PROFILE TAB (FULL WIDTH DUAL-COLUMN LAYOUT)
   ========================================================================= */
function ProfileTab({ currentUser, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/api/v1/users/profile');
      setProfile(res.data);
    } catch (err) {
      if (err.status === 401 && err.message.includes('expired')) {
        alert('Your JWT has expired. Redirecting to login.');
        onLogout();
        return;
      }
      setError(err.message || 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>User Profile & Identity Claims</h2>
          <p>Database-backed profile retrieved via verified JWT identity forwarded by the Gateway.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchProfile} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="alert alert-info">
        <CheckCircle2 size={16} />
        <div>
          <b>Data Isolation Enforced:</b> This record is retrieved directly from the database using the verified{' '}
          <code>sub</code> claim in your JWT. Switching accounts immediately loads that user's isolated record.
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <XCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 50 }}>
          <p style={{ color: 'var(--text-muted)' }}>Querying database through User Service...</p>
        </div>
      ) : profile && profile.data ? (
        <div className="card">
          <div className="card-title">User Account Attributes</div>
          <div className="card-subtitle">Stored user attributes retrieved via verified identity</div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Profile Attribute</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>Record ID</b></td>
                  <td><code>{profile.data.id}</code></td>
                </tr>
                <tr>
                  <td><b>Username</b></td>
                  <td><b>{profile.data.username}</b></td>
                </tr>
                <tr>
                  <td><b>Email Address</b></td>
                  <td>{profile.data.email || '—'}</td>
                </tr>
                <tr>
                  <td><b>Display Name</b></td>
                  <td>{profile.data.name || profile.data.username}</td>
                </tr>
                <tr>
                  <td><b>Department / School</b></td>
                  <td>{profile.data.department || 'Computer Engineering'}</td>
                </tr>
                <tr>
                  <td><b>Role / Permissions</b></td>
                  <td><span className="badge badge-slate">{profile.data.role || 'user'}</span></td>
                </tr>
                <tr>
                  <td><b>Created Timestamp</b></td>
                  <td>{profile.data.createdAt ? new Date(profile.data.createdAt).toLocaleString() : '—'}</td>
                </tr>
                <tr>
                  <td><b>Gateway Forwarded Header</b></td>
                  <td><code>X-Authenticated-User: {profile.gateway?.authenticatedUser}</code></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* =========================================================================
   MY ORDERS TAB (FULL WIDTH WITH TOP METRICS & SIDE-BY-SIDE PANELS)
   ========================================================================= */
function OrdersTab({ currentUser, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('Processing');
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiRequest('/api/v1/orders/history');
      setOrders(res.data.orders || []);
    } catch (err) {
      if (err.status === 401 && err.message.includes('expired')) {
        alert('Your JWT has expired. Redirecting to login.');
        onLogout();
        return;
      }
      setError(err.message || 'Failed to load order history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateMsg('');
    setError('');

    try {
      await apiRequest('/api/v1/orders', {
        method: 'POST',
        body: JSON.stringify({
          item,
          amount: Number(amount),
          status
        })
      });

      setCreateMsg('Order created and saved successfully!');
      setItem('');
      setAmount('');
      fetchOrders();
    } catch (err) {
      setError(err.message || 'Failed to create order.');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (s) => {
    switch (s) {
      case 'Delivered':
        return <span className="badge badge-green">Delivered</span>;
      case 'Shipped':
        return <span className="badge badge-blue">Shipped</span>;
      case 'Processing':
        return <span className="badge badge-amber">Processing</span>;
      default:
        return <span className="badge badge-slate">{s || 'Pending'}</span>;
    }
  };

  const totalSpent = orders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
  const deliveredCount = orders.filter((o) => o.status === 'Delivered').length;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Order History & Multi-Tenant Data Isolation</h2>
          <p>Orders queried strictly by authenticated user ID from the database service.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchOrders} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Top Summary Metrics */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-info">
            <span>Total Orders</span>
            <h3>{orders.length}</h3>
            <small>Isolated to @{currentUser.username}</small>
          </div>
          <div className="kpi-icon blue">
            <Boxes size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span>Total Value</span>
            <h3>₹{totalSpent.toLocaleString('en-IN')}</h3>
            <small>Active Portfolio Value</small>
          </div>
          <div className="kpi-icon green">
            <Activity size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span>Delivered Items</span>
            <h3>{deliveredCount}</h3>
            <small>Fulfilled Orders</small>
          </div>
          <div className="kpi-icon green">
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-info">
            <span>Storage Status</span>
            <h3>Active</h3>
            <small>Tenant Partitioned</small>
          </div>
          <div className="kpi-icon purple">
            <Database size={22} />
          </div>
        </div>
      </div>

      <div className="alert alert-info">
        <CheckCircle2 size={16} />
        <div>
          <b>Per-User Data Isolation:</b> The Order Service queries only orders belonging to your verified user ID. You will ONLY see records owned by <b>@{currentUser.username}</b>.
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <XCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {createMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} />
          <span>{createMsg}</span>
        </div>
      )}

      {/* Split Row: Orders Table & Create Order Panel */}
      <div className="grid-split-60-40">
        {/* Left: Orders Table */}
        <div className="card">
          <div className="card-title">Order Records ({orders.length})</div>
          <div className="card-subtitle">Retrieved from Order Service (Port 5003) via Gateway</div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', padding: 20 }}>Loading orders from database...</p>
          ) : orders.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              <Boxes size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <p>No orders found for this user account.</p>
              <small>Create an order using the form on the right.</small>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Item Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((ord) => (
                    <tr key={ord.orderId || ord.id}>
                      <td><code>{ord.orderId || ord.id}</code></td>
                      <td><b>{ord.item}</b></td>
                      <td>₹{Number(ord.amount).toLocaleString('en-IN')}</td>
                      <td>{getStatusBadge(ord.status)}</td>
                      <td>{ord.createdAt ? new Date(ord.createdAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Create Order Form */}
        <div className="card">
          <div className="card-title">Create New Order</div>
          <div className="card-subtitle">
            Dispatches <code>POST /api/v1/orders</code>. Ownership is derived from JWT subject.
          </div>

          <form onSubmit={handleCreateOrder}>
            <div className="form-group">
              <label className="form-label">Item / Description</label>
              <input
                type="text"
                className="form-input"
                value={item}
                onChange={(e) => setItem(e.target.value)}
                placeholder="e.g. Mechanical Keyboard"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Amount (₹)</label>
              <input
                type="number"
                className="form-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 2999"
                required
                min={0}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="Processing">Processing</option>
                <option value="Pending">Pending</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 6 }} disabled={creating}>
              <PackagePlus size={15} />
              <span>{creating ? 'Saving...' : 'Create Order'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   API PLAYGROUND TAB (FULL WIDTH DUAL-PANE)
   ========================================================================= */
function PlaygroundTab({ token, onLogout }) {
  const [method, setMethod] = useState('GET');
  const [endpoint, setEndpoint] = useState('/api/v1/users/profile');
  const [body, setBody] = useState('{\n  "item": "Test Order",\n  "amount": 2500\n}');
  const [attachToken, setAttachToken] = useState(true);
  const [result, setResult] = useState(null);
  const [sending, setSending] = useState(false);

  const presets = [
    { label: 'User Profile (Protected)', method: 'GET', path: '/api/v1/users/profile', body: '' },
    { label: 'Order History (Protected)', method: 'GET', path: '/api/v1/orders/history', body: '' },
    { label: 'Create Order (Protected)', method: 'POST', path: '/api/v1/orders', body: '{\n  "item": "Wireless Noise Cancelling Headphones",\n  "amount": 4999,\n  "status": "Processing"\n}' },
    { label: 'Gateway Routes (Public)', method: 'GET', path: '/api/v1/gateway/routes', body: '' },
    { label: 'Service Statuses (Public)', method: 'GET', path: '/api/v1/gateway/services/status', body: '' },
    { label: 'Gateway Health (Public)', method: 'GET', path: '/health', body: '' }
  ];

  const applyPreset = (preset) => {
    setMethod(preset.method);
    setEndpoint(preset.path);
    if (preset.body) setBody(preset.body);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setResult(null);

    const start = performance.now();

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (attachToken && token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const options = {
        method,
        headers,
        ...(method !== 'GET' && method !== 'HEAD' && body ? { body } : {})
      };

      const res = await fetch(endpoint, options);
      const latency = Math.round(performance.now() - start);
      const rawText = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = rawText;
      }

      setResult({
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        duration: latency,
        data: parsed
      });
    } catch (err) {
      const latency = Math.round(performance.now() - start);
      setResult({
        ok: false,
        status: 'ERR',
        statusText: 'Network / Connection Error',
        duration: latency,
        data: { error: err.message }
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Interactive L7 Gateway API Playground</h2>
          <p>Dispatch HTTP requests through the gateway on port 8000 and test JWT protection, routing, and error responses.</p>
        </div>
      </div>

      <div className="grid-playground">
        {/* Request Builder Panel */}
        <div className="card">
          <div className="card-title">Request Builder</div>
          <div className="card-subtitle">Select a preset or enter custom path</div>

          <div style={{ marginBottom: 14 }}>
            <label className="form-label">Example Presets</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="demo-pill-btn"
                  onClick={() => applyPreset(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSend}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8, marginBottom: 14 }}>
              <div>
                <label className="form-label">Method</label>
                <select className="form-select" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option>GET</option>
                  <option>POST</option>
                  <option>PUT</option>
                  <option>DELETE</option>
                </select>
              </div>

              <div>
                <label className="form-label">Gateway Endpoint Path</label>
                <input
                  type="text"
                  className="form-input"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="/api/v1/..."
                  required
                />
              </div>
            </div>

            {method !== 'GET' && method !== 'HEAD' && (
              <div className="form-group">
                <label className="form-label">JSON Request Body</label>
                <textarea
                  className="form-textarea"
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={attachToken}
                  onChange={(e) => setAttachToken(e.target.checked)}
                />
                <span>Attach Authenticated JWT (Bearer Header)</span>
              </label>
              {!attachToken && (
                <small style={{ color: 'var(--warning-text)', display: 'block', marginTop: 4 }}>
                  ⚠️ Sending request without token will test 401 Unauthorized gateway rejection.
                </small>
              )}
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={sending}>
              <ArrowRight size={15} />
              <span>{sending ? 'Sending...' : 'Send Request Through Gateway'}</span>
            </button>
          </form>
        </div>

        {/* Response Inspector Panel */}
        <div className="card">
          <div className="card-title">Gateway Response Inspector</div>
          <div className="card-subtitle">Status, timing, and JSON payload</div>

          {result ? (
            <div className="response-container">
              <div className="response-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`badge ${result.ok ? 'badge-green' : 'badge-red'}`}>
                    HTTP {result.status} {result.statusText}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{result.duration} ms</span>
                </div>
                <small style={{ color: 'var(--text-muted)' }}>Response Received</small>
              </div>
              <pre className="response-pre">
                {typeof result.data === 'object'
                  ? JSON.stringify(result.data, null, 2)
                  : String(result.data)}
              </pre>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--text-muted)' }}>
              <Terminal size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <p style={{ fontWeight: 600 }}>Ready to dispatch request</p>
              <small>Click "Send Request" to inspect the downstream response.</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   DYNAMIC ROUTING RULES TAB
   ========================================================================= */
function RoutesTab() {
  const [routesData, setRoutesData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const res = await apiRequest('/api/v1/gateway/routes', { skipAuth: true });
        setRoutesData(res.data.routes);
      } catch {
        setRoutesData({
          '/api/v1/auth': { target: 'http://localhost:5001', stripPrefix: true, publicPaths: ['/login', '/register', '/health'] },
          '/api/v1/users': { target: 'http://localhost:5002', stripPrefix: true, publicPaths: ['/health'] },
          '/api/v1/orders': { target: 'http://localhost:5003', stripPrefix: true, publicPaths: ['/health'] }
        });
      } finally {
        setLoading(false);
      }
    };
    fetchRoutes();
  }, []);

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Dynamic Routing Configuration</h2>
          <p>Active route table and path rewriting rules configured in <code>config/routes.json</code>.</p>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Active Gateway Routes</div>
        <div className="card-subtitle">
          Managed by <code>src/config/configLoader.js</code> with hot file reload capability.
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Loading routing configuration...</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Gateway Prefix</th>
                  <th>Backend Target</th>
                  <th>Prefix Stripping</th>
                  <th>Public Paths</th>
                  <th>Default Protection</th>
                </tr>
              </thead>
              <tbody>
                {routesData &&
                  Object.entries(routesData).map(([prefix, cfg]) => (
                    <tr key={prefix}>
                      <td><code>{prefix}</code></td>
                      <td><b>{cfg.target}</b></td>
                      <td>
                        <span className="badge badge-green">
                          <CheckCircle2 size={12} />
                          <span>{cfg.stripPrefix ? 'Yes' : 'No'}</span>
                        </span>
                      </td>
                      <td>
                        {cfg.publicPaths && cfg.publicPaths.length > 0 ? (
                          cfg.publicPaths.map((p, i) => (
                            <code key={i} style={{ marginRight: 4 }}>{p}</code>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>None</span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-blue">
                          <ShieldCheck size={12} />
                          <span>JWT Protected</span>
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Reverse Proxy Path Rewriting Matrix</div>
        <div className="card-subtitle">How incoming gateway requests are mapped to downstream endpoints</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <div style={{ background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: 6, padding: 14 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Auth Service
            </span>
            <div style={{ marginTop: 8, fontSize: 12 }}>
              <div>Client: <code>POST /api/v1/auth/login</code></div>
              <div style={{ marginTop: 4 }}>Strips: <code>/api/v1/auth</code></div>
              <div style={{ marginTop: 4, color: 'var(--success-text)', fontWeight: 600 }}>
                Target: <code>http://localhost:5001/login</code>
              </div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: 6, padding: 14 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              User Service
            </span>
            <div style={{ marginTop: 8, fontSize: 12 }}>
              <div>Client: <code>GET /api/v1/users/profile</code></div>
              <div style={{ marginTop: 4 }}>Strips: <code>/api/v1/users</code></div>
              <div style={{ marginTop: 4, color: 'var(--success-text)', fontWeight: 600 }}>
                Target: <code>http://localhost:5002/profile</code>
              </div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: 6, padding: 14 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Order Service
            </span>
            <div style={{ marginTop: 8, fontSize: 12 }}>
              <div>Client: <code>GET /api/v1/orders/history</code></div>
              <div style={{ marginTop: 4 }}>Strips: <code>/api/v1/orders</code></div>
              <div style={{ marginTop: 4, color: 'var(--success-text)', fontWeight: 600 }}>
                Target: <code>http://localhost:5003/history</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
