import React, { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  BarChart3,
  AlertTriangle,
  Radio,
  GitFork,
  ShieldCheck,
  Plus,
  Menu,
  X,
  ChevronDown,
  User,
  LogOut,
  Check,
} from "lucide-react";

const STORAGE_KEY = "dln-lite-role-session";

const ROLE_INFO = {
  shipper: { label: "Shipper", desc: "Warehouse & dispatch", dotClass: "ok" },
  carrier: { label: "Carrier", desc: "Transit & custody", dotClass: "warn" },
  customs: { label: "Customs", desc: "Inspection & clearance", dotClass: "ok" },
};

const NAV_GROUPS = [
  {
    label: "OVERVIEW",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/shipments", label: "Shipments", icon: Package },
      { to: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [
      { to: "/risk-predictor", label: "Risk pred.", icon: AlertTriangle },
      { to: "/disruptions", label: "Disruptions", icon: Radio },
      { to: "/route-optimizer", label: "Route opt.", icon: GitFork },
    ],
  },
  {
    label: "LEDGER",
    items: [
      { to: "/immutability-demo", label: "Immutability", icon: ShieldCheck },
    ],
  },
];

const ROUTE_TITLES = {
  "/dashboard": "Dashboard",
  "/shipments": "Shipments",
  "/shipments/new": "New Shipment",
  "/analytics": "Analytics",
  "/risk-predictor": "Risk Predictor",
  "/disruptions": "Disruptions Feed",
  "/route-optimizer": "Route Optimizer",
  "/immutability-demo": "Ledger Immutability",
};

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeRole, setActiveRole] = useState("shipper");
  const [activeUser, setActiveUser] = useState("Shipper Ops");
  const [authForm, setAuthForm] = useState({ name: "", email: "", role: "shipper" });
  const menuRef = useRef(null);

  // Load saved session on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
      if (saved?.role) {
        setActiveRole(saved.role);
        setActiveUser(saved.user || `${ROLE_INFO[saved.role]?.label || "Demo"} User`);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Close role dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setRoleMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const switchRole = (newRole) => {
    setActiveRole(newRole);
    const userName = `${ROLE_INFO[newRole]?.label} User`;
    setActiveUser(userName);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ role: newRole, user: userName }));
    setRoleMenuOpen(false);
  };

  const handleCustomAuth = (e) => {
    e.preventDefault();
    const name = authForm.name.trim() || `${ROLE_INFO[authForm.role].label} User`;
    setActiveRole(authForm.role);
    setActiveUser(name);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ role: authForm.role, user: name, email: authForm.email }));
    setAuthModalOpen(false);
  };

  // Derive page title
  let currentTitle = ROUTE_TITLES[location.pathname];
  if (!currentTitle && location.pathname.startsWith("/shipments/")) {
    currentTitle = "Shipment Detail";
  }

  return (
    <div className="mn-shell">
      {/* ── Left Sidebar (220px) ── */}
      <aside className={`mn-sidebar${mobileOpen ? " open" : ""}`}>
        <div className="mn-sidebar-brand">
          <Package size={16} strokeWidth={1.75} style={{ color: "var(--accent)" }} />
          <span>DLN Lite</span>
        </div>

        <div className="mn-sidebar-content">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="mn-nav-group">
              <div className="mn-nav-group-label">{group.label}</div>
              <div className="mn-nav-list">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => `mn-nav-item${isActive ? " active" : ""}`}
                    >
                      <Icon size={16} strokeWidth={1.75} />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mn-sidebar-footer">
          <span className="mn-status-dot ok" />
          <span>Fabric network connected</span>
        </div>
      </aside>

      {/* ── Main Area ── */}
      <div className="mn-main-wrap">
        <header className="mn-header">
          <div className="mn-header-left">
            <button
              className="mn-btn ghost"
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{ display: window.innerWidth <= 800 ? "inline-flex" : "none" }}
              aria-label="Toggle Navigation"
            >
              {mobileOpen ? <X size={16} strokeWidth={1.75} /> : <Menu size={16} strokeWidth={1.75} />}
            </button>
            <h1 className="mn-page-title">{currentTitle || "DLN Lite"}</h1>
          </div>

          <div className="mn-header-right">
            {/* Role dropdown */}
            <div style={{ position: "relative" }} ref={menuRef}>
              <button
                className="mn-btn secondary"
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                style={{ height: 28 }}
              >
                <span className={`mn-status-dot ${ROLE_INFO[activeRole]?.dotClass || "ok"}`} />
                <span>{activeUser}</span>
                <span style={{ color: "var(--muted)", fontSize: 12 }}>({ROLE_INFO[activeRole]?.label})</span>
                <ChevronDown size={14} strokeWidth={1.75} style={{ color: "var(--muted)" }} />
              </button>

              {roleMenuOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    marginTop: 4,
                    width: 220,
                    backgroundColor: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: 4,
                    zIndex: 50,
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                  }}
                >
                  <div style={{ padding: "6px 8px", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
                    Switch Active Role
                  </div>
                  {Object.entries(ROLE_INFO).map(([key, info]) => (
                    <button
                      key={key}
                      onClick={() => switchRole(key)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 8px",
                        borderRadius: 4,
                        border: "none",
                        background: activeRole === key ? "var(--hover)" : "transparent",
                        color: "var(--text)",
                        cursor: "pointer",
                        fontSize: 13,
                        textAlign: "left",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className={`mn-status-dot ${info.dotClass}`} />
                        <span>{info.label}</span>
                      </div>
                      {activeRole === key && <Check size={14} strokeWidth={1.75} style={{ color: "var(--accent)" }} />}
                    </button>
                  ))}
                  <div style={{ height: 1, backgroundColor: "var(--border)", margin: "4px 0" }} />
                  <button
                    onClick={() => {
                      setRoleMenuOpen(false);
                      setAuthModalOpen(true);
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 8px",
                      borderRadius: 4,
                      border: "none",
                      background: "transparent",
                      color: "var(--muted)",
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    <User size={14} strokeWidth={1.75} />
                    <span>Custom Login / Sign In</span>
                  </button>
                </div>
              )}
            </div>

            {/* Header Action Button (Role-Gated) */}
            {activeRole === "shipper" ? (
              <button
                className="mn-btn primary"
                onClick={() => navigate("/shipments/new")}
                title="Create a new blockchain shipment"
              >
                <Plus size={16} strokeWidth={1.75} />
                <span>New shipment</span>
              </button>
            ) : activeRole === "carrier" ? (
              <button
                className="mn-btn secondary"
                onClick={() => navigate("/shipments")}
                title="View active fleet in transit"
              >
                <Package size={14} strokeWidth={1.75} />
                <span>Transit Fleet</span>
              </button>
            ) : (
              <button
                className="mn-btn secondary"
                onClick={() => navigate("/shipments")}
                title="View customs inspection queue"
              >
                <ShieldCheck size={14} strokeWidth={1.75} />
                <span>Inspection Queue</span>
              </button>
            )}
          </div>
        </header>

        {/* ── Page Content ── */}
        <main className="mn-main-content" key={`${location.pathname}-${activeRole}`}>
          <Outlet context={{ activeRole, activeUser }} />
        </main>
      </div>

      {/* ── Custom Auth Modal ── */}
      {authModalOpen && (
        <div className="mn-modal-backdrop" onClick={() => setAuthModalOpen(false)}>
          <div className="mn-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="mn-dialog-title">Switch User Session</div>
            <div className="mn-dialog-desc">Set your active user identity and Fabric organization role.</div>
            <form onSubmit={handleCustomAuth} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
              <div className="mn-field">
                <label className="mn-label">Name / Display Name</label>
                <input
                  className="mn-input"
                  value={authForm.name}
                  onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                  placeholder="e.g. Alice Cooper"
                />
              </div>
              <div className="mn-field">
                <label className="mn-label">Email</label>
                <input
                  type="email"
                  className="mn-input"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  placeholder="e.g. alice@org1.dln.com"
                />
              </div>
              <div className="mn-field">
                <label className="mn-label">Assigned Role</label>
                <select
                  className="mn-select"
                  value={authForm.role}
                  onChange={(e) => setAuthForm({ ...authForm, role: e.target.value })}
                >
                  <option value="shipper">Shipper (Warehouse & Creation)</option>
                  <option value="carrier">Carrier (Transit & Custody)</option>
                  <option value="customs">Customs (Inspection & Clearance)</option>
                </select>
              </div>
              <div className="mn-dialog-actions">
                <button type="button" className="mn-btn secondary" onClick={() => setAuthModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="mn-btn primary">
                  Save Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
