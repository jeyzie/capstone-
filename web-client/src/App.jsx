import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Boxes,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  Eye,
  EyeOff,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  PackagePlus,
  Palette,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Download,
  PenLine,
  Save,
  ScanFace,
  UserPlus,
  Users,
  Wand2,
  X,
} from 'lucide-react';
import BracesColorMatcher from './BracesColorMatcher.jsx';
import ProcedureAnnotationLayer from './ProcedureAnnotationLayer.jsx';
import {
  captureAnnotatedFromImage,
  captureConsultationComparison,
  captureTeethScanPair,
} from './procedureAnnotation.js';

const demoUsers = [
  { username: 'admin', password: 'admin123', name: 'Dr.Enriquez', role: 'Clinic Admin' },
  { username: 'staff1', password: 'staff123', name: 'Maomao', role: 'Dental Staff' },
  { username: 'staff2', password: 'staff456', name: 'Extra', role: 'Dental Staff' },
];

const initialPatients = [
  {
    id: 'p1',
    name: 'John Carlo S. Enriquez',
    age: 23,
    contact: '0912-123-4567',
    procedure: 'Teeth Whitening',
    lastVisit: 'Jun 20, 2025',
    nextVisit: 'Jul 18, 2025',
    arSessions: 3,
    color: '#2563eb',
  },
  {
    id: 'p2',
    name: 'Xandra Kisses P. Dela Cruz',
    age: 21,
    contact: '0938-123-4567',
    procedure: 'Braces Consultation',
    lastVisit: 'Jun 18, 2025',
    nextVisit: 'Jul 20, 2025',
    arSessions: 1,
    color: '#059669',
  },
  {
    id: 'p3',
    name: 'Noren B. Morados',
    age: 18,
    contact: '0929-123-4567',
    procedure: 'Dental Cleaning',
    lastVisit: 'Jun 15, 2025',
    nextVisit: 'Jul 15, 2025',
    arSessions: 0,
    color: '#d97706',
  },
  {
    id: 'p4',
    name: 'Sullivan D. Pomer',
    age: 21,
    contact: '0925-123-4567',
    procedure: 'Teeth Whitening',
    lastVisit: 'Jun 22, 2025',
    nextVisit: 'Jul 22, 2025',
    arSessions: 2,
    color: '#7c3aed',
  },
  {
    id: 'p5',
    name: 'Brian Angelo C. Egagamao',
    age: 22,
    contact: '0951-987-6543',
    procedure: 'Veneers',
    lastVisit: 'Jun 25, 2025',
    nextVisit: 'Aug 1, 2025',
    arSessions: 2,
    color: '#be185d',
  },
];

const initialInventory = [
  { id: 'i1', name: 'Lidocaine HCl 2%', category: 'Anesthetic', batch: 'LH2024-08', qty: 4, expiry: '2025-06-01' },
  { id: 'i2', name: 'Composite Resin A2', category: 'Restorative', batch: 'CR-409', qty: 12, expiry: '2025-07-09' },
  { id: 'i3', name: 'Alginate Impression', category: 'Impression', batch: 'AI-221', qty: 6, expiry: '2025-07-17' },
  { id: 'i4', name: 'Epinephrine 1:100k', category: 'Anesthetic', batch: 'EP-512', qty: 8, expiry: '2025-09-20' },
  { id: 'i5', name: 'Zinc Oxide Eugenol', category: 'Restorative', batch: 'ZOE-88', qty: 10, expiry: '2027-01-01' },
  { id: 'i6', name: 'Articulating Paper', category: 'Other', batch: 'AP-002', qty: 50, expiry: '2026-03-10' },
  { id: 'i7', name: 'Sodium Hypochlorite', category: 'Sterilization', batch: 'SH-301', qty: 3, expiry: '2025-08-15' },
  { id: 'i8', name: 'Stainless Brackets', category: 'Orthodontic', batch: 'SB-77', qty: 100, expiry: '2027-01-01' },
];

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'patients', label: 'Patients', icon: Users },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'ar', label: 'AR Studio', icon: Wand2 },
  { id: 'color-matcher', label: 'Color Matcher', icon: Palette },
];

const STAFF_TAB_IDS = ['dashboard', 'inventory', 'alerts'];

function isStaffUser(user) {
  return user?.role === 'Dental Staff';
}

function tabsForUser(user) {
  return isStaffUser(user) ? tabs.filter((tab) => STAFF_TAB_IDS.includes(tab.id)) : tabs;
}

const patientProcedures = [
  'Teeth Whitening',
  'Braces Consultation',
  'Dental Cleaning',
  'Veneers',
  'Extraction',
  'Root Canal',
  'Dental Consultation',
  'Other',
];

const inventoryCategories = [
  'Anesthetic',
  'Restorative',
  'Impression',
  'Sterilization',
  'Orthodontic',
  'Other',
];

const patientColors = ['#2563eb', '#059669', '#d97706', '#7c3aed', '#be185d', '#0891b2'];

function expiryStatus(expiry) {
  const today = new Date('2026-05-16T00:00:00');
  const date = new Date(`${expiry}T00:00:00`);
  const days = Math.ceil((date - today) / 86400000);

  if (days < 0) return { label: 'Expired', tone: 'danger', days };
  if (days <= 60) return { label: 'Expiring', tone: 'warning', days };
  return { label: 'Good', tone: 'success', days };
}

function moveGlow(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 100;
  const y = ((event.clientY - rect.top) / rect.height) * 100;
  event.currentTarget.style.setProperty('--glow-x', `${x}%`);
  event.currentTarget.style.setProperty('--glow-y', `${y}%`);
}

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function defaultReorderExpiry() {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().split('T')[0];
}

function defaultReorderBatch() {
  return `RO-${Date.now().toString().slice(-6)}`;
}

function slugifyFilename(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'consultation';
}

function consultationPhotoFilename(patientName, mode) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `DentaLogic_${slugifyFilename(patientName)}_${slugifyFilename(mode)}_${stamp}.jpg`;
}

async function saveBlobToLocalMachine(blob, filename) {
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'JPEG image',
            accept: { 'image/jpeg': ['.jpg', '.jpeg'] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { method: 'picker', filename };
    } catch (error) {
      if (error?.name === 'AbortError') {
        return { method: 'cancelled' };
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return { method: 'download', filename };
}

function captureConsultationPhoto(video, { patientName, mode, intensity, compare }) {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) {
    throw new Error('Camera frame is not ready yet. Wait a moment and try again.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not create an image from the camera preview.');
  }

  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, width, height);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  if (compare) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
    ctx.lineWidth = Math.max(2, Math.round(width * 0.002));
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.font = `700 ${Math.max(12, Math.round(width * 0.016))}px Inter, sans-serif`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(width * 0.22, 16, 56, 24);
    ctx.fillRect(width * 0.72, 16, 48, 24);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Before', width * 0.24, 34);
    ctx.fillText('After', width * 0.74, 34);
  }

  const pad = Math.round(width * 0.025);
  const boxHeight = Math.round(height * 0.11);
  ctx.fillStyle = 'rgba(7, 17, 29, 0.62)';
  ctx.fillRect(pad, height - boxHeight - pad, Math.min(width * 0.62, 420), boxHeight);
  ctx.fillStyle = '#f7fbff';
  ctx.font = `700 ${Math.max(14, Math.round(width * 0.02))}px Inter, sans-serif`;
  ctx.fillText('DentaLogic AR Consultation', pad + 14, height - boxHeight - pad + 28);
  ctx.font = `500 ${Math.max(12, Math.round(width * 0.015))}px Inter, sans-serif`;
  ctx.fillText(
    `${patientName} · ${mode} · ${intensity}% overlay${compare ? ' · before/after' : ''}`,
    pad + 14,
    height - pad - 16,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to encode the consultation photo.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.92,
    );
  });
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tabLoading, setTabLoading] = useState(false);
  const [patients, setPatients] = useState(initialPatients);
  const [inventory, setInventory] = useState(initialInventory);
  const [resolvedAlerts, setResolvedAlerts] = useState(() => new Set());
  const [toast, setToast] = useState(null);
  const alerts = useMemo(
    () =>
      inventory.filter(
        (item) => !resolvedAlerts.has(item.id) && expiryStatus(item.expiry).tone !== 'success',
      ),
    [inventory, resolvedAlerts],
  );

  function showToast(message, tone = 'success') {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3200);
  }

  function reorderInventoryItem(itemId, { addQty, batch, expiry }) {
    setInventory((items) =>
      items.map((item) =>
        item.id === itemId
          ? {
              ...item,
              qty: item.qty + addQty,
              batch: batch.trim() || item.batch,
              expiry,
            }
          : item,
      ),
    );
    setResolvedAlerts((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }

  function resolveAlert(itemId, itemName) {
    setResolvedAlerts((prev) => new Set([...prev, itemId]));
    showToast(`${itemName} marked as resolved`);
  }

  function resolveAllAlerts() {
    const ids = inventory
      .filter((item) => !resolvedAlerts.has(item.id) && expiryStatus(item.expiry).tone !== 'success')
      .map((item) => item.id);
    if (ids.length === 0) return;
    setResolvedAlerts((prev) => new Set([...prev, ...ids]));
    showToast(`${ids.length} alert${ids.length === 1 ? '' : 's'} marked as resolved`);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => setBooting(false), 1900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    const allowed = tabsForUser(user).map((tab) => tab.id);
    setActiveTab((current) => (allowed.includes(current) ? current : 'dashboard'));
  }, [user]);

  function handleLogin(nextUser) {
    setIsLoggingOut(false);
    setUser(nextUser);
  }

  function handleLogout() {
    setIsLoggingOut(true);
    window.setTimeout(() => {
      setUser(null);
      setIsLoggingOut(false);
    }, 360);
  }

  useEffect(() => {
    if (!user) return undefined;
    setTabLoading(true);
    const timer = window.setTimeout(() => setTabLoading(false), 520);
    return () => window.clearTimeout(timer);
  }, [activeTab, user]);

  if (booting) {
    return <BootScreen />;
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const canEditAdmin = !isStaffUser(user);
  const canManageInventory = true;
  const navTabs = tabsForUser(user);

  return (
    <div className={`app-shell theme-light ${isLoggingOut ? 'auth-leave' : 'auth-enter'}`}>
      <Sidebar user={user} navTabs={navTabs} activeTab={activeTab} setActiveTab={setActiveTab} alertCount={alerts.length} />
      <MobileHeader user={user} navTabs={navTabs} activeTab={activeTab} setActiveTab={setActiveTab} alertCount={alerts.length} />

      <main className="workspace">
        <TopBar user={user} onLogout={handleLogout} />

        {tabLoading ? (
          <TabSkeleton activeTab={activeTab} />
        ) : (
          <>
            {activeTab === 'dashboard' && isStaffUser(user) && (
              <StaffDashboard user={user} inventory={inventory} alerts={alerts} setActiveTab={setActiveTab} />
            )}
            {activeTab === 'dashboard' && !isStaffUser(user) && (
              <Dashboard
                user={user}
                patients={patients}
                inventory={inventory}
                alerts={alerts}
                setActiveTab={setActiveTab}
                canEdit={canEditAdmin}
              />
            )}
            {canEditAdmin && activeTab === 'patients' && <Patients patients={patients} setPatients={setPatients} />}
            {activeTab === 'inventory' && (
              <Inventory inventory={inventory} setInventory={setInventory} canEdit={canManageInventory} />
            )}
            {activeTab === 'alerts' && (
              <Alerts
                alerts={alerts}
                canEdit={canManageInventory}
                onReorder={reorderInventoryItem}
                onResolve={resolveAlert}
                onResolveAll={resolveAllAlerts}
                onToast={showToast}
              />
            )}
            {canEditAdmin && activeTab === 'ar' && (
              <ArStudio
                patients={patients}
                setPatients={setPatients}
                onToast={showToast}
                onOpenColorMatcher={() => setActiveTab('color-matcher')}
              />
            )}
            {canEditAdmin && activeTab === 'color-matcher' && (
              <BracesColorMatcher onToast={showToast} />
            )}
          </>
        )}
      </main>
      {toast && <ToastBanner message={toast.message} tone={toast.tone} />}
    </div>
  );
}

function BootScreen() {
  return (
    <div className="boot-screen">
      <div className="boot-card glass-panel">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Stethoscope size={24} />
          </div>
          <div>
            <h1>DentaLogic</h1>
            <p>Preparing clinic workspace</p>
          </div>
        </div>
        <div className="skeleton skeleton-wide" />
        <div className="boot-row">
          <div className="skeleton skeleton-square" />
          <div className="boot-lines">
            <div className="skeleton skeleton-wide" />
            <div className="skeleton skeleton-short" />
          </div>
        </div>
      </div>
    </div>
  );
}

function TabSkeleton({ activeTab }) {
  const showContentGrid = activeTab === 'dashboard';

  return (
    <div className="page-stack tab-skeleton" aria-label="Loading page">
      <section className="skeleton-hero glass-panel">
        <div>
          <div className="skeleton skeleton-short" />
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-wide" />
          <div className="skeleton skeleton-medium" />
        </div>
        <div className="skeleton skeleton-stat" />
      </section>
      <section className="metric-grid">
        {[0, 1, 2, 3].map((item) => (
          <article className="metric-card glass-panel" key={item}>
            <div className="skeleton skeleton-square" />
            <div className="skeleton skeleton-medium" />
            <div className="skeleton skeleton-short" />
          </article>
        ))}
      </section>
      {showContentGrid && (
        <section className="content-grid">
          <div className="panel glass-panel">
            <div className="skeleton skeleton-wide" />
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
          </div>
          <div className="panel glass-panel">
            <div className="skeleton skeleton-wide" />
            <div className="skeleton skeleton-row" />
            <div className="skeleton skeleton-row" />
          </div>
        </section>
      )}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    window.setTimeout(() => {
      const found = demoUsers.find((item) => item.username === username.trim() && item.password === password);
      if (!found) {
        setLoading(false);
        setError('Invalid clinic credentials.');
        return;
      }
      setSigningIn(true);
      window.setTimeout(() => {
        setLoading(false);
        onLogin(found);
      }, 320);
    }, 520);
  }

  return (
    <div className="login-page theme-light">
      <section className={`login-shell ${signingIn ? 'auth-leave' : 'auth-enter'}`}>
        <div className="login-copy">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden="true">
              <Stethoscope size={24} />
            </div>
            <div>
              <h1>DentaLogic</h1>
              <p>Web-Based clinic management system</p>
            </div>
          </div>
          <h2></h2>
          <p>
           A responsive Dashboard showcasing inventory tracking and AR consultation features.
          </p>
          <div className="trust-grid">
            <TrustItem icon={ShieldCheck} label="Role-based demo access" />
            <TrustItem icon={Activity} label="Live clinic indicators" />
            <TrustItem icon={Stethoscope} label="Dental workflow focused" />
          </div>
        </div>

        <form className="login-card glass-panel" onSubmit={submit}>
          <div className="section-heading compact">
            <span>Secure Sign In</span>
            <small>Enter your clinic username and password</small>
          </div>
          <label>
            Username
            <div className="input-shell">
              <Users size={18} />
              <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
            </div>
          </label>
          <label>
            Password
            <div className="input-shell">
              <ShieldCheck size={18} />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
              />
              <button type="button" className="ghost-icon" onClick={() => setShowPassword(!showPassword)} aria-label="Show password">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" type="submit" disabled={loading || signingIn}>
            {loading ? <span className="button-loader" /> : 'Sign In'}
          </button>
        </form>
      </section>
    </div>
  );
}

function TrustItem({ icon: Icon, label }) {
  return (
    <div className="trust-item">
      <Icon size={18} />
      <span>{label}</span>
    </div>
  );
}

function Sidebar({ user, navTabs, activeTab, setActiveTab, alertCount }) {
  return (
    <aside className="sidebar glass-panel">
      <div className="brand-stack">
        <div className="brand-mark" aria-hidden="true">
          <Stethoscope size={24} />
        </div>
        <span>DentaLogic</span>
      </div>
      {isStaffUser(user) && (
        <p className="nav-role-note">Staff: manage inventory and alerts. Patients and AR require admin access.</p>
      )}
      <nav>
        {navTabs.map((tab) => (
          <NavButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} alertCount={alertCount} />
        ))}
      </nav>
    </aside>
  );
}

function MobileHeader({ user, navTabs, activeTab, setActiveTab, alertCount }) {
  const [open, setOpen] = useState(false);
  const current = navTabs.find((tab) => tab.id === activeTab) ?? navTabs[0];

  return (
    <header className="mobile-header glass-panel">
      <div className="brand-mini">
        <div className="brand-mark small" aria-hidden="true">
          <Stethoscope size={18} />
        </div>
        <span>{current.label}</span>
      </div>
      <button className="icon-button" type="button" onClick={() => setOpen(!open)} aria-label="Open menu">
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <div className="mobile-menu glass-panel">
          {navTabs.map((tab) => (
            <NavButton
              key={tab.id}
              tab={tab}
              active={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setOpen(false);
              }}
              alertCount={alertCount}
            />
          ))}
        </div>
      )}
    </header>
  );
}

function NavButton({ tab, active, onClick, alertCount }) {
  const Icon = tab.icon;
  return (
    <button className={`nav-button ${active ? 'active' : ''}`} type="button" onClick={onClick}>
      <Icon size={19} />
      <span>{tab.label}</span>
      {tab.id === 'alerts' && alertCount > 0 && <b>{alertCount > 9 ? '9+' : alertCount}</b>}
    </button>
  );
}

function TopBar({ user, onLogout }) {
  return (
    <header className="topbar">
      <div>
        <span className="eyebrow">Clinic workspace</span>
        <h2>Good day, {user.name.split(' ')[0]}</h2>
      </div>
      <div className="top-actions">
        <div className="user-chip">
          <span aria-hidden="true">
            <Users size={16} />
          </span>
          <div>
            <strong>{user.name}</strong>
            <small>{user.role}</small>
          </div>
        </div>
        <button className="icon-button danger" type="button" onClick={onLogout} aria-label="Sign out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

function StaffDashboard({ user, inventory, alerts, setActiveTab }) {
  const goodStock = inventory.filter((item) => expiryStatus(item.expiry).tone === 'success').length;
  const expiringCount = alerts.filter((item) => expiryStatus(item.expiry).tone === 'warning').length;
  const expiredCount = alerts.filter((item) => expiryStatus(item.expiry).tone === 'danger').length;
  const lowStock = [...inventory].filter((item) => item.qty <= 15).sort((a, b) => a.qty - b.qty).slice(0, 5);
  const priorityItems = [...alerts]
    .sort((a, b) => {
      const toneRank = { danger: 0, warning: 1, success: 2 };
      return toneRank[expiryStatus(a.expiry).tone] - toneRank[expiryStatus(b.expiry).tone];
    })
    .slice(0, 5);

  return (
    <div className="page-stack">
      <section className="hero-panel glass-panel interactive-glow" onMouseMove={moveGlow}>
        <div>
          <span className="eyebrow">Inventory</span>
          <h1>Inventory Dashboard</h1>
          <p>Monitor stock levels, track expiring materials, and jump straight into inventory tasks.</p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => setActiveTab('inventory')}>
              Manage Inventory <Boxes size={17} />
            </button>
            <button className="secondary-button" type="button" onClick={() => setActiveTab('alerts')}>
              <Bell size={17} /> View Alerts{alerts.length > 0 ? ` (${alerts.length})` : ''}
            </button>
          </div>
        </div>
        <div className="hero-card interactive-glow" onMouseMove={moveGlow}>
          <span>{user.role}</span>
          <strong>{inventory.length}</strong>
          <small>items tracked</small>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard icon={Boxes} label="Total items" value={inventory.length} trend="In inventory" tone="slate" />
        <MetricCard icon={CheckCircle2} label="Healthy stock" value={goodStock} trend="Good expiry" tone="green" />
        <MetricCard icon={CalendarDays} label="Expiring soon" value={expiringCount} trend="Review soon" tone="orange" />
        <MetricCard icon={AlertTriangle} label="Needs action" value={expiredCount + expiringCount} trend="Alerts open" tone="orange" />
      </section>

      <section className="content-grid">
        <Panel
          title="Items needing attention"
          action={alerts.length > 0 ? 'View all alerts' : null}
          onAction={alerts.length > 0 ? () => setActiveTab('alerts') : undefined}
        >
          {priorityItems.length === 0 ? (
            <p className="panel-empty-note">All materials are within healthy expiry windows.</p>
          ) : (
            priorityItems.map((item) => <StaffInventoryAttentionRow key={item.id} item={item} />)
          )}
        </Panel>
        <Panel title="Inventory health" action="Open Inventory" onAction={() => setActiveTab('inventory')}>
          <HealthRow label="Good stock" value={goodStock} total={inventory.length} tone="success" />
          <HealthRow label="Expiring" value={expiringCount} total={inventory.length} tone="warning" />
          <HealthRow label="Expired" value={expiredCount} total={inventory.length} tone="danger" />
        </Panel>
      </section>

      <Panel title="Low quantity items" action="Open Inventory" onAction={() => setActiveTab('inventory')}>
        {lowStock.length === 0 ? (
          <p className="panel-empty-note">No items are below the low-stock threshold.</p>
        ) : (
          lowStock.map((item) => <InventoryRow key={item.id} item={item} />)
        )}
      </Panel>
    </div>
  );
}

function StaffInventoryAttentionRow({ item }) {
  const status = expiryStatus(item.expiry);
  return (
    <div className="list-row">
      <div className="inventory-icon">
        <Boxes size={19} />
      </div>
      <div>
        <strong>{item.name}</strong>
        <span>
          {item.category} · batch {item.batch} · Qty {item.qty}
        </span>
      </div>
      <span className={`status-pill ${status.tone}`}>{status.label}</span>
    </div>
  );
}

function Dashboard({ user, patients, inventory, alerts, setActiveTab, canEdit }) {
  const goodStock = inventory.filter((item) => expiryStatus(item.expiry).tone === 'success').length;

  return (
    <div className="page-stack">
      <section className="hero-panel glass-panel interactive-glow" onMouseMove={moveGlow}>
        <div>
          <span className="eyebrow">DentaLogic</span>
          <h1>Dashboard</h1>
          <p>
            A responsive Dashboard showcasing inventory tracking and AR consultation features, built with React and Lucide icons.
          </p>
          {canEdit && (
            <div className="hero-actions">
              <button className="primary-button" type="button" onClick={() => setActiveTab('patients')}>
                Open Patients <ArrowRight size={17} />
              </button>
              <button className="secondary-button" type="button" onClick={() => setActiveTab('ar')}>
                AR Studio <Camera size={17} />
              </button>
            </div>
          )}
        </div>
        <div className="hero-card interactive-glow" onMouseMove={moveGlow}>
          <span>{user.role}</span>
          <strong>{patients.length}</strong>
          <small>active patient records</small>
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard icon={Users} label="Patients" value={patients.length + 19} trend="This month" tone="blue" />
        <MetricCard icon={Sparkles} label="AR sessions" value="11" trend="Today" tone="green" />
        <MetricCard icon={Boxes} label="Inventory items" value={inventory.length} trend={`${goodStock} healthy`} tone="slate" />
        <MetricCard icon={AlertTriangle} label="Active alerts" value={alerts.length} trend="Needs review" tone="orange" />
      </section>

      <section className="content-grid">
        <Panel
          title="Today's Appointments"
          action={canEdit ? 'View Patients' : null}
          onAction={canEdit ? () => setActiveTab('patients') : undefined}
        >
          {patients.slice(0, 4).map((patient, index) => (
            <AppointmentRow key={patient.id} patient={patient} time={['9:00 AM', '10:30 AM', '2:00 PM', '4:00 PM'][index]} />
          ))}
        </Panel>
        <Panel title="Inventory Health" action="Open Inventory" onAction={() => setActiveTab('inventory')}>
          <HealthRow label="Good stock" value={goodStock} total={inventory.length} tone="success" />
          <HealthRow label="Expiring" value={alerts.filter((item) => expiryStatus(item.expiry).tone === 'warning').length} total={inventory.length} tone="warning" />
          <HealthRow label="Expired" value={alerts.filter((item) => expiryStatus(item.expiry).tone === 'danger').length} total={inventory.length} tone="danger" />
        </Panel>
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, trend, tone }) {
  return (
    <article className={`metric-card glass-panel interactive-glow tone-${tone}`} onMouseMove={moveGlow}>
      <div className="metric-icon">
        <Icon size={21} />
      </div>
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{trend}</small>
    </article>
  );
}

function AppointmentRow({ patient, time }) {
  return (
    <div className="list-row">
      <Avatar patient={patient} />
      <div>
        <strong>{patient.name}</strong>
        <span>{patient.procedure}</span>
      </div>
      <time>{time}</time>
    </div>
  );
}

function HealthRow({ label, value, total, tone }) {
  const percent = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="health-row">
      <div>
        <strong>{label}</strong>
        <span>{value} items</span>
      </div>
      <div className="progress-track">
        <span className={`progress-fill ${tone}`} style={{ width: `${percent}%` }} />
      </div>
      <b>{percent}%</b>
    </div>
  );
}

function Patients({ patients, setPatients }) {
  const [query, setQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const filtered = patients.filter((patient) =>
    `${patient.name} ${patient.procedure}`.toLowerCase().includes(query.toLowerCase()),
  );

  function handleAddPatient(form) {
    const color = patientColors[patients.length % patientColors.length];
    const next = {
      id: `p${Date.now()}`,
      name: form.name.trim(),
      age: Number(form.age) || 0,
      contact: form.contact.trim() || 'N/A',
      procedure: form.procedure,
      lastVisit: 'Today',
      nextVisit: 'TBD',
      arSessions: 0,
      color,
    };
    setPatients([next, ...patients]);
    setShowAddForm(false);
  }

  return (
    <div className="page-stack">
      <PageHeader title="Patients" subtitle="Search records, review consultations, and prepare AR sessions.">
        <button className="primary-button" type="button" onClick={() => setShowAddForm(true)}>
          <UserPlus size={17} /> Add Patient
        </button>
      </PageHeader>
      <SearchBar value={query} onChange={setQuery} placeholder="Search patients or procedures" />
      <section className="record-grid">
        {filtered.map((patient) => (
          <article className="patient-card glass-panel interactive-glow" key={patient.id} onMouseMove={moveGlow}>
            <div className="patient-top">
              <Avatar patient={patient} size="large" />
              <div>
                <h3>{patient.name}</h3>
                <p>{patient.procedure}</p>
              </div>
            </div>
            <div className="detail-grid">
              <span>Age <b>{patient.age}</b></span>
              <span>Last visit <b>{patient.lastVisit}</b></span>
              <span>Next visit <b>{patient.nextVisit}</b></span>
              <span>AR sessions <b>{patient.arSessions}</b></span>
            </div>
            <button className="secondary-button full" type="button">
              Prepare Consultation <ArrowRight size={16} />
            </button>
          </article>
        ))}
      </section>
      {showAddForm && (
        <AddPatientModal onClose={() => setShowAddForm(false)} onSubmit={handleAddPatient} />
      )}
    </div>
  );
}

function Inventory({ inventory, setInventory, canEdit }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const filtered = inventory.filter((item) => {
    const status = expiryStatus(item.expiry).tone;
    const matchesFilter = filter === 'all' || filter === status;
    const matchesQuery = `${item.name} ${item.category} ${item.batch}`.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  });

  function handleAddItem(form) {
    const next = {
      id: `i${Date.now()}`,
      name: form.name.trim(),
      category: form.category,
      batch: form.batch.trim() || 'N/A',
      qty: Number(form.qty) || 0,
      expiry: form.expiry,
    };
    setInventory([next, ...inventory]);
    setShowAddForm(false);
  }

  return (
    <div className="page-stack">
      <PageHeader title="Inventory" subtitle="Monitor material batches, stock levels, and expiry risk.">
        {canEdit && (
          <button className="primary-button" type="button" onClick={() => setShowAddForm(true)}>
            <PackagePlus size={17} /> Add Item
          </button>
        )}
      </PageHeader>
      <div className="toolbar glass-panel">
        <SearchBar value={query} onChange={setQuery} placeholder="Search inventory" embedded />
        <div className="segmented">
          {['all', 'success', 'warning', 'danger'].map((item) => (
            <button className={filter === item ? 'active' : ''} type="button" key={item} onClick={() => setFilter(item)}>
              {item === 'all' ? 'All' : item === 'success' ? 'Good' : item === 'warning' ? 'Expiring' : 'Expired'}
            </button>
          ))}
        </div>
      </div>
      <section className="inventory-list glass-panel">
        {filtered.map((item) => (
          <InventoryRow key={item.id} item={item} />
        ))}
      </section>
      {showAddForm && (
        <AddInventoryModal onClose={() => setShowAddForm(false)} onSubmit={handleAddItem} />
      )}
    </div>
  );
}

function Alerts({ alerts, canEdit, onReorder, onResolve, onResolveAll, onToast }) {
  const [reorderTarget, setReorderTarget] = useState(null);

  function handleReorderSubmit(form) {
    if (!reorderTarget) return;
    onReorder(reorderTarget.id, form);
    onToast(`Reorder recorded: +${form.addQty} ${reorderTarget.name}`);
    setReorderTarget(null);
  }

  return (
    <div className="page-stack">
      <PageHeader title="Expiry Alerts" subtitle="Materials that need reorder, replacement, or review.">
        {canEdit && alerts.length > 0 && (
          <button className="secondary-button" type="button" onClick={onResolveAll}>
            <CheckCircle2 size={17} /> Resolve all
          </button>
        )}
      </PageHeader>
      {alerts.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="No active alerts" text="All materials are inside healthy expiry windows." />
      ) : (
        <section className="alert-list">
          {alerts.map((item) => {
            const status = expiryStatus(item.expiry);
            return (
              <article className={`alert-card glass-panel ${status.tone}`} key={item.id}>
                <div>
                  <span className={`status-pill ${status.tone}`}>{status.label}</span>
                  <h3>{item.name}</h3>
                  <p>
                    {item.category} material, batch {item.batch} · Qty {item.qty}
                    {status.days < 0
                      ? ` · expired ${Math.abs(status.days)} day${Math.abs(status.days) === 1 ? '' : 's'} ago`
                      : ` · ${status.days} day${status.days === 1 ? '' : 's'} left`}
                  </p>
                </div>
                {canEdit ? (
                  <div className="alert-actions">
                    <button className="secondary-button" type="button" onClick={() => setReorderTarget(item)}>
                      <ClipboardList size={16} /> Reorder
                    </button>
                    <button className="primary-button" type="button" onClick={() => onResolve(item.id, item.name)}>
                      Resolve
                    </button>
                  </div>
                ) : (
                  <p className="alert-readonly">View only — contact an admin to reorder or resolve.</p>
                )}
              </article>
            );
          })}
        </section>
      )}
      {reorderTarget && (
        <ReorderAlertModal
          item={reorderTarget}
          onClose={() => setReorderTarget(null)}
          onSubmit={handleReorderSubmit}
        />
      )}
    </div>
  );
}

const AR_PHASE = {
  LIVE: 'live',
  ANNOTATE: 'annotate',
};

function ArStudio({ patients, setPatients, onToast, onOpenColorMatcher }) {
  const [selectedPatient, setSelectedPatient] = useState(patients[0]?.id ?? '');
  const [mode, setMode] = useState('Whitening');
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [intensity, setIntensity] = useState(72);
  const [compare, setCompare] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [arPhase, setArPhase] = useState(AR_PHASE.LIVE);
  const [capturedRawUrl, setCapturedRawUrl] = useState('');
  const [capturedArUrl, setCapturedArUrl] = useState('');
  const [capturedMeta, setCapturedMeta] = useState(null);
  const [annotationCompare, setAnnotationCompare] = useState(false);
  const [annotationSideBySide, setAnnotationSideBySide] = useState(true);
  const [captureAnnotations, setCaptureAnnotations] = useState([]);
  const [annotationSessionKey, setAnnotationSessionKey] = useState(0);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const patient = patients.find((item) => item.id === selectedPatient) ?? patients[0];
  const isAnnotating = arPhase === AR_PHASE.ANNOTATE && !!capturedRawUrl && !!capturedArUrl;
  const activeCompare = capturedMeta?.compare ?? compare;

  async function persistConsultation(blob, suffix) {
    const filename = consultationPhotoFilename(patient?.name ?? 'patient', suffix);
    const result = await saveBlobToLocalMachine(blob, filename);

    if (result.method === 'cancelled') {
      onToast?.('Save cancelled.', 'warning');
      return false;
    }

    if (patient?.id && setPatients) {
      setPatients((items) =>
        items.map((item) =>
          item.id === patient.id ? { ...item, arSessions: item.arSessions + 1 } : item,
        ),
      );
    }

    const savedWhere =
      result.method === 'picker' ? 'Saved to the location you chose' : `Downloaded as ${result.filename}`;
    onToast?.(`Consultation saved. ${savedWhere}.`, 'success');
    return true;
  }

  async function saveConsultation() {
    setSaving(true);
    try {
      const meta = {
        patientName: patient?.name ?? 'Patient',
        mode: capturedMeta?.mode ?? mode,
        intensity: capturedMeta?.intensity ?? intensity,
        compare: activeCompare,
      };

      let blob;
      let suffix = meta.mode;

      if (isAnnotating) {
        blob = await captureConsultationComparison(
          capturedArUrl,
          capturedRawUrl,
          captureAnnotations,
          meta,
        );
        suffix = `${meta.mode}-consultation`;
      } else {
        const video = videoRef.current;
        if (!cameraOn || !video) {
          onToast?.('Start the camera or capture a teeth scan before saving.', 'warning');
          return;
        }
        blob = await captureConsultationPhoto(video, meta);
      }

      await persistConsultation(blob, suffix);
    } catch (error) {
      onToast?.(error?.message ?? 'Could not save the consultation photo.', 'warning');
    } finally {
      setSaving(false);
    }
  }

  async function exportConsultation() {
    if (!isAnnotating) {
      onToast?.('Capture a teeth scan first, then export your annotations.', 'warning');
      return;
    }

    setExporting(true);
    try {
      const meta = {
        patientName: patient?.name ?? 'Patient',
        mode: capturedMeta?.mode ?? mode,
        intensity: capturedMeta?.intensity ?? intensity,
        compare: activeCompare,
        includeFooter: false,
      };
      const blob = await captureConsultationComparison(
        capturedArUrl,
        capturedRawUrl,
        captureAnnotations,
        { ...meta, includeFooter: false },
      );
      const filename = consultationPhotoFilename(patient?.name ?? 'patient', `${meta.mode}-export`);
      const result = await saveBlobToLocalMachine(blob, filename);
      if (result.method !== 'cancelled') {
        onToast?.('Annotated consultation exported.', 'success');
      }
    } catch (error) {
      onToast?.(error?.message ?? 'Could not export the consultation.', 'warning');
    } finally {
      setExporting(false);
    }
  }

  async function handleCaptureScan() {
    const video = videoRef.current;
    if (!cameraOn || !video) {
      onToast?.('Start the camera before capturing a teeth scan.', 'warning');
      return;
    }

    setCapturing(true);
    try {
      const meta = { mode, intensity, compare };
      const { rawUrl, arUrl } = await captureTeethScanPair(video, meta);
      stopCamera();
      setCapturedRawUrl(rawUrl);
      setCapturedArUrl(arUrl);
      setCapturedMeta(meta);
      setCaptureAnnotations([]);
      setAnnotationCompare(false);
      setAnnotationSideBySide(true);
      setAnnotationSessionKey((value) => value + 1);
      setArPhase(AR_PHASE.ANNOTATE);
      onToast?.(
        'AR preview saved on the left. Draw on your real teeth (right) to show the difference.',
        'success',
      );
    } catch (error) {
      onToast?.(error?.message ?? 'Could not capture the teeth scan.', 'warning');
    } finally {
      setCapturing(false);
    }
  }

  function resumeLiveScan() {
    setArPhase(AR_PHASE.LIVE);
    setCapturedRawUrl('');
    setCapturedArUrl('');
    setCapturedMeta(null);
    setCaptureAnnotations([]);
    setAnnotationCompare(false);
    setAnnotationSideBySide(true);
  }

  async function startCamera() {
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (error) {
      setCameraOn(false);
      setCameraError('Camera access was blocked or unavailable. Allow camera permission in the browser and try again.');
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return (
    <div className="page-stack">
      <PageHeader title="AR Studio" subtitle="Web consultation planner for smile preview sessions.">
        {onOpenColorMatcher && (
          <button className="secondary-button" type="button" onClick={onOpenColorMatcher}>
            <Palette size={17} /> AI Color Matcher
          </button>
        )}
      </PageHeader>
      <section className="ar-layout">
        <div
          className={`camera-stage glass-panel mode-${(capturedMeta?.mode ?? mode).toLowerCase().replace(' ', '-')} ${isAnnotating ? 'phase-annotate' : 'phase-live'} ${annotationSideBySide ? 'annotation-compare-mode' : ''}`}
        >
          <video
            ref={videoRef}
            className={`camera-video ${cameraOn && !isAnnotating ? 'active' : ''}`}
            playsInline
            muted
          />
          {!cameraOn && !isAnnotating && (
            <div className="face-frame">
              <Camera size={42} />
              <span>AR teeth scanner</span>
              <small>Start the camera for live AR teeth tracking, then capture to annotate.</small>
              {cameraError && <b className="camera-error">{cameraError}</b>}
            </div>
          )}
          {cameraOn && !isAnnotating && (
            <>
              <div className="mouth-guide" style={{ '--intensity': intensity / 100 }}>
                <span />
              </div>
              {compare && (
                <div className="compare-split">
                  <span>Before</span>
                  <span>After</span>
                </div>
              )}
              <div className="scan-line" />
              <div className="ar-tracking-badge">
                <ScanFace size={14} /> Live AR tracking
              </div>
            </>
          )}
          {isAnnotating && (
            <>
              <div className="ar-phase-badge">
                <PenLine size={14} /> Annotation mode
              </div>
              <ProcedureAnnotationLayer
                key={annotationSessionKey}
                active
                enabled
                frozenImageUrl={capturedRawUrl}
                arPreviewImageUrl={capturedArUrl}
                mirrorPointers={false}
                compareBefore={annotationCompare}
                sideBySide={annotationSideBySide}
                showToolbar
                onAnnotationsChange={setCaptureAnnotations}
                onBeforeSnapshot={() => onToast?.('Before annotations saved for comparison.', 'success')}
                onSave={saveConsultation}
                onExport={exportConsultation}
                saving={saving}
              />
            </>
          )}
          {cameraOn && !isAnnotating && (
            <button
              className="ar-capture-btn"
              type="button"
              onClick={handleCaptureScan}
              disabled={capturing}
            >
              {capturing ? <span className="button-loader" /> : <Camera size={20} />}
              {capturing ? 'Capturing…' : 'Capture'}
            </button>
          )}
        </div>
        <aside className="control-panel glass-panel">
          <div className="section-heading compact">
            <span>Consultation setup</span>
            <small>{patient?.name ?? 'No patient selected'}</small>
          </div>
          <label>
            Patient
            <select
              value={selectedPatient}
              onChange={(event) => setSelectedPatient(event.target.value)}
              disabled={isAnnotating}
            >
              {patients.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            AR mode
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              disabled={isAnnotating}
            >
              <option>Whitening</option>
              <option>Braces</option>
              <option>Veneers</option>
              <option>Implant Preview</option>
            </select>
          </label>
          <div className="range-block">
            <span>Overlay intensity</span>
            <input
              type="range"
              min="0"
              max="100"
              value={intensity}
              onChange={(event) => setIntensity(Number(event.target.value))}
              disabled={isAnnotating}
            />
          </div>
          <label className="toggle-row">
            <input
              type="checkbox"
              checked={compare}
              onChange={(event) => setCompare(event.target.checked)}
              disabled={isAnnotating}
            />
            Before/after split (live AR)
          </label>

          <div className="annotation-panel-block">
            <div className="section-heading compact">
              <span>Live Procedure Annotation</span>
              <small>
                {isAnnotating ? 'AR preview vs your real teeth' : 'Capture → annotate workflow'}
              </small>
            </div>
            {!isAnnotating ? (
              <p className="annotation-panel-hint">
                Press <strong>Capture</strong> to save the <strong>AR treatment preview</strong> and your{' '}
                <strong>real teeth</strong> side by side. You will draw notes on the real teeth only so the patient
                sees the difference.
              </p>
            ) : (
              <>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={annotationSideBySide}
                    onChange={(event) => setAnnotationSideBySide(event.target.checked)}
                  />
                  Side-by-side AR preview vs your teeth
                </label>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={annotationCompare}
                    onChange={(event) => setAnnotationCompare(event.target.checked)}
                  />
                  Compare before/after annotations
                </label>
                <p className="annotation-panel-hint">
                  <strong>Left:</strong> AR overlay (whitening / braces preview).{' '}
                  <strong>Right:</strong> your actual teeth — circle problem areas, arrows, and labels here.
                  Saved consultations include both panels.
                </p>
              </>
            )}
          </div>

          <div className="ar-actions">
            {!isAnnotating && (
              <>
                {!cameraOn ? (
                  <button className="primary-button full" type="button" onClick={startCamera}>
                    <Camera size={17} /> Start Camera
                  </button>
                ) : (
                  <button className="secondary-button full" type="button" onClick={stopCamera}>
                    Stop Camera
                  </button>
                )}
              </>
            )}
            {isAnnotating && (
              <button className="secondary-button full" type="button" onClick={resumeLiveScan}>
                <Camera size={17} /> New live scan
              </button>
            )}
            <button
              className="primary-button full"
              type="button"
              onClick={saveConsultation}
              disabled={saving || (!cameraOn && !isAnnotating)}
            >
              {saving ? <span className="button-loader" /> : <Save size={17} />}
              {saving ? 'Saving…' : 'Save Consultation'}
            </button>
            {isAnnotating && (
              <button
                className="secondary-button full"
                type="button"
                onClick={exportConsultation}
                disabled={exporting}
              >
                {exporting ? <span className="button-loader" /> : <Download size={17} />}
                {exporting ? 'Exporting…' : 'Export Result'}
              </button>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-header">
      <div>
        <span className="eyebrow">DentaLogic</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card glass-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">DentaLogic</span>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children, error }) {
  return (
    <label className="form-field">
      {label}
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

function AddPatientModal({ onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [contact, setContact] = useState('');
  const [procedure, setProcedure] = useState('Dental Consultation');
  const [errors, setErrors] = useState({ name: '', age: '', contact: '' });

  function submit(event) {
    event.preventDefault();
    const nextErrors = { name: '', age: '', contact: '' };

    if (!name.trim()) {
      nextErrors.name = 'Patient name is required.';
    }

    const ageValue = Number(age);
    if (!Number.isInteger(ageValue) || ageValue < 1 || ageValue > 100) {
      nextErrors.age = 'Age must be a whole number between 1 and 100.';
    }

    const digitsOnlyContact = contact.replace(/\D/g, '');
    if (digitsOnlyContact.length !== 10) {
      nextErrors.contact = 'Phone number must be exactly 10 digits (PH format, ex: 9123456789).';
    }

    if (nextErrors.name || nextErrors.age || nextErrors.contact) {
      setErrors(nextErrors);
      return;
    }

    setErrors({ name: '', age: '', contact: '' });
    const fullContact = `+63${digitsOnlyContact}`;
    onSubmit({ name, age, contact: fullContact, procedure });
  }

  return (
    <Modal title="New Patient" subtitle="Add a patient record to the clinic workspace." onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <FormField label="Full name" error={errors.name}>
          <div className="input-shell">
            <Users size={18} />
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="e.g. Maria Santos"
              autoFocus
            />
          </div>
        </FormField>
        <div className="form-row">
          <FormField label="Age" error={errors.age}>
            <div className="input-shell">
              <input
                value={age}
                onChange={(event) => {
                  setAge(event.target.value);
                  if (errors.age) setErrors((prev) => ({ ...prev, age: '' }));
                }}
                placeholder="1-100"
                inputMode="numeric"
                min="1"
                max="100"
              />
            </div>
          </FormField>
          <FormField label="Contact number" error={errors.contact}>
            <div className="input-shell">
              <span>+63</span>
              <input
                value={contact}
                onChange={(event) => {
                  setContact(event.target.value.replace(/\D/g, ''));
                  if (errors.contact) setErrors((prev) => ({ ...prev, contact: '' }));
                }}
                placeholder="9123456789"
                inputMode="numeric"
                maxLength={10}
              />
            </div>
          </FormField>
        </div>
        <FormField label="Procedure">
          <select value={procedure} onChange={(event) => setProcedure(event.target.value)}>
            {patientProcedures.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </FormField>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            <UserPlus size={17} /> Add Patient
          </button>
        </div>
      </form>
    </Modal>
  );
}

function AddInventoryModal({ onClose, onSubmit }) {
  const defaultExpiry = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().split('T')[0];
  }, []);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Restorative');
  const [batch, setBatch] = useState('');
  const [qty, setQty] = useState('1');
  const [expiry, setExpiry] = useState(defaultExpiry);
  const [errors, setErrors] = useState({ name: '', batch: '', qty: '', expiry: '' });

  function submit(event) {
    event.preventDefault();
    const nextErrors = { name: '', batch: '', qty: '', expiry: '' };

    if (!name.trim()) {
      nextErrors.name = 'Material name is required.';
    }

    if (!batch.trim()) {
      nextErrors.batch = 'Batch number is required.';
    }

    if (!qty.trim()) {
      nextErrors.qty = 'Quantity is required.';
    } else {
      const qtyValue = Number(qty);
      if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
        nextErrors.qty = 'Quantity must be greater than 0.';
      }
    }

    if (!expiry) {
      nextErrors.expiry = 'Expiry date is required.';
    }

    if (nextErrors.name || nextErrors.batch || nextErrors.qty || nextErrors.expiry) {
      setErrors(nextErrors);
      return;
    }

    setErrors({ name: '', batch: '', qty: '', expiry: '' });
    onSubmit({ name, category, batch, qty, expiry });
  }

  return (
    <Modal title="Add Inventory Item" subtitle="Register a new material batch in clinic stock." onClose={onClose}>
      <form className="modal-form" onSubmit={submit}>
        <FormField label="Material name" error={errors.name}>
          <div className="input-shell">
            <Boxes size={18} />
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="e.g. Composite Resin A2"
              autoFocus
            />
          </div>
        </FormField>
        <FormField label="Category">
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {inventoryCategories.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </FormField>
        <div className="form-row">
          <FormField label="Batch number" error={errors.batch}>
            <div className="input-shell">
              <input
                value={batch}
                onChange={(event) => {
                  setBatch(event.target.value);
                  if (errors.batch) setErrors((prev) => ({ ...prev, batch: '' }));
                }}
                placeholder="CR-409"
              />
            </div>
          </FormField>
          <FormField label="Quantity" error={errors.qty}>
            <div className="input-shell">
              <input
                value={qty}
                onChange={(event) => {
                  setQty(event.target.value);
                  if (errors.qty) setErrors((prev) => ({ ...prev, qty: '' }));
                }}
                placeholder="12"
                inputMode="numeric"
              />
            </div>
          </FormField>
        </div>
        <FormField label="Expiry date" error={errors.expiry}>
          <div className="input-shell date-field">
            <CalendarDays size={18} />
            <input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} required />
          </div>
        </FormField>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            <PackagePlus size={17} /> Add Item
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ReorderAlertModal({ item, onClose, onSubmit }) {
  const [addQty, setAddQty] = useState('10');
  const [batch, setBatch] = useState(defaultReorderBatch);
  const [expiry, setExpiry] = useState(defaultReorderExpiry);
  const [error, setError] = useState('');

  function submit(event) {
    event.preventDefault();
    const qty = Number(addQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError('Enter a valid quantity to add.');
      return;
    }
    if (!expiry) {
      setError('Expiry date is required.');
      return;
    }
    onSubmit({ addQty: qty, batch, expiry });
  }

  return (
    <Modal
      title={`Reorder ${item.name}`}
      subtitle="Add replacement stock with a new batch and expiry date."
      onClose={onClose}
    >
      <form className="modal-form" onSubmit={submit}>
        <div className="reorder-summary glass-panel">
          <strong>Current stock</strong>
          <span>
            Batch {item.batch} · Qty {item.qty} · Expires {item.expiry}
          </span>
        </div>
        <FormField label="Quantity to add" error={error}>
          <div className="input-shell">
            <input
              value={addQty}
              onChange={(event) => {
                setAddQty(event.target.value);
                if (error) setError('');
              }}
              inputMode="numeric"
              placeholder="10"
              autoFocus
            />
          </div>
        </FormField>
        <FormField label="New batch number">
          <div className="input-shell">
            <input value={batch} onChange={(event) => setBatch(event.target.value)} placeholder="RO-001" />
          </div>
        </FormField>
        <FormField label="New expiry date">
          <div className="input-shell date-field">
            <CalendarDays size={18} />
            <input type="date" value={expiry} onChange={(event) => setExpiry(event.target.value)} required />
          </div>
        </FormField>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary-button" type="submit">
            <ClipboardList size={17} /> Confirm reorder
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ToastBanner({ message, tone = 'success' }) {
  return (
    <div className={`toast-banner ${tone}`} role="status">
      {tone === 'warning' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
      <span>{message}</span>
    </div>
  );
}

function Panel({ title, action, onAction, children }) {
  return (
    <section className="panel glass-panel">
      <div className="panel-header">
        <h3>{title}</h3>
        {action && <button type="button" onClick={onAction}>{action}</button>}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function SearchBar({ value, onChange, placeholder, embedded = false }) {
  return (
    <div className={`search-shell ${embedded ? 'embedded' : 'glass-panel'}`}>
      <Search size={18} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </div>
  );
}

function Avatar({ patient, size = 'normal' }) {
  return (
    <div className={`avatar ${size}`} style={{ '--avatar-color': patient.color }}>
      {initials(patient.name)}
    </div>
  );
}

function InventoryRow({ item }) {
  const status = expiryStatus(item.expiry);
  return (
    <div className="inventory-row">
      <div className="inventory-icon">
        <Boxes size={19} />
      </div>
      <div>
        <strong>{item.name}</strong>
        <span>{item.category} / {item.batch} / Qty {item.qty}</span>
      </div>
      <span className={`status-pill ${status.tone}`}>{status.label}</span>
      <time>{item.expiry}</time>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <section className="empty-state glass-panel">
      <Icon size={38} />
      <h3>{title}</h3>
      <p>{text}</p>
    </section>
  );
}
