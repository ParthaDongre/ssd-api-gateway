import { useState, useEffect } from 'react';
import {
  Activity,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  Code2,
  Database,
  ExternalLink,
  GitBranch,
  KeyRound,
  LockKeyhole,
  LogOut,
  Network,
  PackagePlus,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  UserCheck,
  UserRound,
  XCircle
} from 'lucide-react';

const SERVICES = [
  { key: 'auth', name: 'Auth Service', port: 5001, path: '/api/v1/auth/health', desc: 'Authentication & JWT issuance' },
  { key: 'users', name: 'User Service', port: 5002, path: '/api/v1/users/health', desc: 'Profile storage & identity enforcement' },
  { key: 'orders', name: 'Order Service', port: 5003, path: '/api/v1/orders/health', desc: 'Order persistence & per-user isolation' }
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
    const validTabs = ['overview', 'profile', 'orders', 'playground', 'routes'];
    return validTabs.includes(hash) ? hash : 'overview';
  });

  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Sync with browser back/forward history
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (['overview', 'profile', 'orders', 'playground', 'routes'].includes(hash)) {
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

  // If token is missing, render Auth screens
  if (!token || !currentUser) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <Network size={22} />
            </div>
            <h2>{authMode === 'signup' ? 'Create an Account' : 'Sign In to Gateway Console'}</h2>
            <p>Dynamic Layer 7 Reverse Proxy & MongoDB Platform</p>
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
                setAuthSuccess('Account created successfully! Please sign in with your credentials.');
                setAuthMode('login');
                setAuthError('');
              }}
              busy={authBusy}
              setBusy={setAuthBusy}
              setError={setAuthError}
            />
          )}

          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12 }}>
            {authMode === 'login' ? (
              <span>
                Don't have an account?{' '}
                <button
                  type="button"
                  className="btn-link"
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthError('');
                    setAuthSuccess('');
                  }}
                >
                  Create account
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  className="btn-link"
                  style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                    setAuthSuccess('');
                  }}
                >
                  Sign in
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
            <h1>GateFlow</h1>
            <span>L7 REVERSE PROXY</span>
          </div>
        </div>

        <nav className="nav-section">
          <div className="nav-label">Navigation</div>
          <button
            className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => navigateTo('overview')}
          >
            <Activity size={16} />
            <span>Overview</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => navigateTo('profile')}
          >
            <UserRound size={16} />
            <span>My Profile</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => navigateTo('orders')}
          >
            <Boxes size={16} />
            <span>My Orders</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'playground' ? 'active' : ''}`}
            onClick={() => navigateTo('playground')}
          >
            <Terminal size={16} />
            <span>API Playground</span>
          </button>
          <button
            className={`nav-item ${activeTab === 'routes' ? 'active' : ''}`}
            onClick={() => navigateTo('routes')}
          >
            <GitBranch size={16} />
            <span>Routing Table</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div className="gateway-chip">
            <span style={{ color: 'var(--text-muted)' }}>Gateway :8000</span>
            <div className="gateway-chip-status">
              <span className="status-dot"></span>
              <span>Active</span>
            </div>
          </div>
          <div className="user-profile-strip">
            <div className="user-avatar">
              {currentUser.username ? currentUser.username[0].toUpperCase() : 'U'}
            </div>
            <div className="user-meta">
              <b>{currentUser.username}</b>
              <span>{currentUser.role || 'user'}</span>
            </div>
            <button className="btn-icon" onClick={handleLogout} title="Log Out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <b>
              {activeTab === 'overview' && 'Overview'}
              {activeTab === 'profile' && 'My Profile'}
              {activeTab === 'orders' && 'My Orders'}
              {activeTab === 'playground' && 'API Playground'}
              {activeTab === 'routes' && 'Routing Table'}
            </b>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="badge badge-green">
              <ShieldCheck size={13} />
              <span>JWT Verified</span>
            </span>
          </div>
        </header>

        <main className="content-container">
          {activeTab === 'overview' && <OverviewTab navigateTo={navigateTo} />}
          {activeTab === 'profile' && <ProfileTab currentUser={currentUser} onLogout={handleLogout} />}
          {activeTab === 'orders' && <OrdersTab currentUser={currentUser} onLogout={handleLogout} />}
          {activeTab === 'playground' && <PlaygroundTab token={token} onLogout={handleLogout} />}
          {activeTab === 'routes' && <RoutesTab />}
        </main>
      </div>
    </div>
  );
}

/* =========================================================================
   LOGIN FORM COMPONENT
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
        body: JSON.stringify({ username, password })
      });

      if (!res.data.token) {
        throw new Error('Login failed: Token not found in server response.');
      }

      onLogin(res.data.token, res.data.user || { username });
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = (u, p) => {
    setUsername(u);
    setPassword(p);
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
          placeholder="e.g. student"
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
          placeholder="••••••••"
          required
        />
      </div>

      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={busy}>
        {busy ? 'Authenticating...' : 'Sign In'}
      </button>

      <div className="demo-credentials-box">
        <b>Quick Demo Accounts:</b>
        <div>
          <button type="button" className="demo-pill-btn" onClick={() => fillDemo('student', 'password123')}>
            student (3 orders)
          </button>
          <button type="button" className="demo-pill-btn" onClick={() => fillDemo('demo_user', 'password123')}>
            demo_user (2 orders)
          </button>
        </div>
      </div>
    </form>
  );
}

/* =========================================================================
   SIGNUP FORM COMPONENT
   ========================================================================= */
function SignupForm({ onSuccess, busy, setBusy, setError }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('Computer Engineering');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);

    try {
      await apiRequest('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username,
          email: email.trim() || undefined,
          password,
          department
        })
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
      <div className="form-group">
        <label className="form-label">Username *</label>
        <input
          type="text"
          className="form-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. jdoe"
          required
          minLength={3}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Email (Optional)</label>
        <input
          type="email"
          className="form-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jdoe@example.com"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Department</label>
        <input
          type="text"
          className="form-input"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="e.g. Computer Science"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Password * (min. 8 characters)</label>
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

      <div className="form-group">
        <label className="form-label">Confirm Password *</label>
        <input
          type="password"
          className="form-input"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>

      <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={busy}>
        {busy ? 'Creating Account...' : 'Register Account'}
      </button>
    </form>
  );
}

/* =========================================================================
   OVERVIEW TAB COMPONENT
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
            status: 'unreachable',
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>System Overview</h2>
          <p>Real-time gateway status and downstream service health monitoring.</p>
        </div>
        <button className="btn btn-secondary" onClick={checkHealth} disabled={checking}>
          <RefreshCw size={14} className={checking ? 'spin' : ''} />
          <span>{checking ? 'Checking...' : 'Refresh Status'}</span>
        </button>
      </div>

      {/* 3 Service Health Cards */}
      <div className="grid-3">
        {SERVICES.map((svc) => {
          const st = health[svc.key];
          return (
            <div className="service-card" key={svc.key}>
              <div className="service-card-top">
                <span className="service-card-title">{svc.name}</span>
                <span className="service-port">:{svc.port}</span>
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                {svc.desc}
              </p>
              <div className="service-meta-row">
                <span>Health Check:</span>
                <b>
                  {st ? (
                    st.ok ? (
                      <span className="badge badge-green">Healthy</span>
                    ) : (
                      <span className="badge badge-red">Unavailable</span>
                    )
                  ) : (
                    'Checking...'
                  )}
                </b>
              </div>
              <div className="service-meta-row">
                <span>MongoDB:</span>
                <b>{st && st.db ? st.db : '—'}</b>
              </div>
              <div className="service-meta-row">
                <span>Ping Latency:</span>
                <b>{st && st.latency ? st.latency : '—'}</b>
              </div>
            </div>
          );
        })}
      </div>

      {/* Architecture Flow Section */}
      <div className="card">
        <div className="card-title">L7 Gateway Request Lifecycle</div>
        <div className="card-subtitle">
          How client requests are authorized, rewritten, and routed to downstream MongoDB microservices
        </div>

        <div className="flow-diagram">
          <div className="flow-node">
            <b>1. Browser Client</b>
            <small>HTTP + Bearer JWT</small>
          </div>
          <ArrowRight size={16} className="flow-arrow" />
          <div className="flow-node highlight">
            <b>2. API Gateway</b>
            <small>:8000 / Dynamic L7</small>
          </div>
          <ArrowRight size={16} className="flow-arrow" />
          <div className="flow-node">
            <b>3. Auth Verification</b>
            <small>HMAC-SHA256 Token</small>
          </div>
          <ArrowRight size={16} className="flow-arrow" />
          <div className="flow-node">
            <b>4. Reverse Proxy</b>
            <small>Path Rewriting</small>
          </div>
          <ArrowRight size={16} className="flow-arrow" />
          <div className="flow-node highlight">
            <b>5. Target Service</b>
            <small>5001 / 5002 / 5003</small>
          </div>
          <ArrowRight size={16} className="flow-arrow" />
          <div className="flow-node">
            <b>6. MongoDB</b>
            <small>Per-User Documents</small>
          </div>
        </div>
      </div>

      {/* Quick Links Section */}
      <div className="grid-2">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">Genuine User Data Isolation</div>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
            Test tenant isolation by inspecting your profile and orders, or logging in as another seeded account to verify distinct database records.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigateTo('profile')}>
              <UserRound size={14} />
              <span>View Profile</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigateTo('orders')}>
              <Boxes size={14} />
              <span>View Orders</span>
            </button>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title">Interactive Developer Tools</div>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
            Explore endpoints directly through the gateway, inspect rewritten URLs, and observe HTTP response codes and headers.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => navigateTo('playground')}>
              <Terminal size={14} />
              <span>Open Playground</span>
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => navigateTo('routes')}>
              <GitBranch size={14} />
              <span>View Routes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   MY PROFILE TAB COMPONENT
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
          <h2>My Profile</h2>
          <p>Database-backed profile retrieved via verified JWT identity.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchProfile} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="alert alert-info">
        <CheckCircle2 size={16} />
        <div>
          <b>Database Data Isolation Enforced:</b> This record is retrieved directly from MongoDB using the verified{' '}
          <code>sub</code> claim in your JWT. Switching user accounts immediately displays that user's unique MongoDB document.
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          <XCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-muted)' }}>Querying MongoDB through User Service...</p>
        </div>
      ) : profile && profile.data ? (
        <div className="card">
          <div className="card-title">User Account Details</div>
          <div className="card-subtitle">Stored in MongoDB collection: <code>users</code></div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>Attribute</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><b>MongoDB Document ID</b></td>
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
                  <td><b>Department</b></td>
                  <td>{profile.data.department || 'Computer Engineering'}</td>
                </tr>
                <tr>
                  <td><b>Account Role</b></td>
                  <td><span className="badge badge-slate">{profile.data.role || 'user'}</span></td>
                </tr>
                <tr>
                  <td><b>Created Timestamp</b></td>
                  <td>{profile.data.createdAt ? new Date(profile.data.createdAt).toLocaleString() : '—'}</td>
                </tr>
                <tr>
                  <td><b>Gateway Forwarded Identity</b></td>
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
   MY ORDERS TAB COMPONENT
   ========================================================================= */
function OrdersTab({ currentUser, onLogout }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New order form state
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

      setCreateMsg('Order created successfully and saved to MongoDB!');
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

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>My Orders</h2>
          <p>Orders strictly isolated and queried by authenticated user ID in MongoDB.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchOrders} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="alert alert-info">
        <CheckCircle2 size={16} />
        <div>
          <b>Per-User Data Isolation:</b> The Order Service queries MongoDB with{' '}
          <code>Order.find(&#123; user: authenticatedUserId &#125;)</code>. You will only see orders created by or seeded for{' '}
          <b>{currentUser.username}</b>.
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

      {/* Orders List Table */}
      <div className="card">
        <div className="card-title">Order Records ({orders.length})</div>
        <div className="card-subtitle">Retrieved from Order Service (Port 5003) via Gateway</div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', padding: 20 }}>Loading orders from database...</p>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
            <Boxes size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <p>No orders found for this user account.</p>
            <small>Create an order below to verify MongoDB persistence.</small>
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
                  <th>Date Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => (
                  <tr key={ord.orderId || ord.id || ord._id}>
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

      {/* Create Order Form */}
      <div className="card">
        <div className="card-title">Create New Order</div>
        <div className="card-subtitle">
          Dispatches <code>POST /api/v1/orders</code>. Ownership is securely derived from your JWT subject.
        </div>

        <form onSubmit={handleCreateOrder} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
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

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              className="form-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 4500"
              required
              min={0}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Status</label>
            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="Processing">Processing</option>
              <option value="Pending">Pending</option>
              <option value="Shipped">Shipped</option>
              <option value="Delivered">Delivered</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" disabled={creating}>
            <PackagePlus size={15} />
            <span>{creating ? 'Saving...' : 'Create Order'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

/* =========================================================================
   API PLAYGROUND TAB COMPONENT
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
    { label: 'Create Order (Protected)', method: 'POST', path: '/api/v1/orders', body: '{\n  "item": "External Monitor Arm",\n  "amount": 3499,\n  "status": "Processing"\n}' },
    { label: 'Gateway Routes (Public)', method: 'GET', path: '/api/v1/gateway/routes', body: '' },
    { label: 'Auth Service Health (Public)', method: 'GET', path: '/api/v1/auth/health', body: '' },
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
          <h2>API Playground</h2>
          <p>Dispatch HTTP requests through the L7 Gateway on port 8000.</p>
        </div>
      </div>

      <div className="grid-playground">
        {/* Request Builder Panel */}
        <div className="card">
          <div className="card-title">Request Builder</div>
          <div className="card-subtitle">Quick preset or custom endpoint</div>

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
          <div className="card-title">Gateway Response</div>
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
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <Terminal size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
              <p>Ready to dispatch request.</p>
              <small>Click "Send Request" to inspect the downstream response.</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   ROUTING TABLE TAB COMPONENT
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
        // Fallback default if gateway routes introspection is unavailable
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
        <div className="card-title">Reverse Proxy Path Rewriting Explained</div>
        <div className="card-subtitle">How incoming gateway requests are mapped to downstream endpoints</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: 6, padding: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              User Service Example
            </span>
            <div style={{ marginTop: 8, fontSize: 12 }}>
              <div>Client Request: <code>GET /api/v1/users/profile</code></div>
              <div style={{ marginTop: 4 }}>Gateway Strips: <code>/api/v1/users</code></div>
              <div style={{ marginTop: 4, color: 'var(--success-text)', fontWeight: 500 }}>
                Target Receives: <code>http://localhost:5002/profile</code>
              </div>
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid var(--border-light)', borderRadius: 6, padding: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Order Service Example
            </span>
            <div style={{ marginTop: 8, fontSize: 12 }}>
              <div>Client Request: <code>GET /api/v1/orders/history</code></div>
              <div style={{ marginTop: 4 }}>Gateway Strips: <code>/api/v1/orders</code></div>
              <div style={{ marginTop: 4, color: 'var(--success-text)', fontWeight: 500 }}>
                Target Receives: <code>http://localhost:5003/history</code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
