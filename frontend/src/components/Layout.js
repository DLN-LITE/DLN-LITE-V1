import React, { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6", color: "#60a5fa" },
  { to: "/shipments", label: "Shipments", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", color: "#a78bfa" },
  { to: "/shipments/new", label: "New Shipment", icon: "M12 4v16m8-8H4", color: "#34d399" },
  { to: "/analytics", label: "Analytics", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z", color: "#f59e0b" },
  { to: "/risk-predictor", label: "Risk Predictor", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z", color: "#fb7185" },
  { to: "/immutability-demo", label: "Immutability Demo", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", color: "#38bdf8" },
];

export default function Layout() {
  const [open, setOpen] = useState(true);
  const location = useLocation();

  return (
    <div style={{ display: "flex", height: "100vh", background: "#060b18", color: "#e2e8f0", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <aside style={{ width: open ? 252 : 68, background: "linear-gradient(180deg,#0d1526 0%,#0a1020 100%)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", transition: "width 0.25s cubic-bezier(.4,0,.2,1)", overflow: "hidden", flexShrink: 0, position: "relative" }}>
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 20px rgba(59,130,246,0.4)" }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          {open && <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#f8fafc", letterSpacing: "-0.3px" }}>DLN-Lite</div>
            <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.5px", textTransform: "uppercase" }}>Logistics Network</div>
          </div>}
        </div>

        {open && <div style={{ margin: "16px 12px 8px", padding: "10px 12px", background: "rgba(59,130,246,0.08)", borderRadius: 10, border: "1px solid rgba(59,130,246,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
            <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600, letterSpacing: "0.5px" }}>NETWORK ONLINE</span>
          </div>
          <div style={{ fontSize: 11, color: "#64748b" }}>3 Orgs · MAJORITY (2-of-3)</div>
        </div>}

        <nav style={{ flex: 1, padding: "8px 8px", overflowY: "auto" }}>
          {NAV.map(({ to, label, icon, color }) => {
            const active = location.pathname === to || (to !== "/dashboard" && location.pathname.startsWith(to) && to !== "/shipments/new");
            return (
              <NavLink key={to} to={to} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, marginBottom: 2, textDecoration: "none", color: active ? "#fff" : "#94a3b8", background: active ? `rgba(${color === "#60a5fa" ? "96,165,250" : color === "#a78bfa" ? "167,139,250" : color === "#34d399" ? "52,211,153" : color === "#f59e0b" ? "245,158,11" : color === "#fb7185" ? "251,113,133" : "56,189,248"},0.12)` : "transparent", fontWeight: active ? 600 : 400, fontSize: 14, transition: "all 0.15s", borderLeft: active ? `3px solid ${color}` : "3px solid transparent" }}>
                <svg width="18" height="18" fill="none" stroke={active ? color : "currentColor"} viewBox="0 0 24 24" strokeWidth={1.8} style={{ flexShrink: 0 }}><path strokeLinecap="round" strokeLinejoin="round" d={icon} /></svg>
                {open && <span style={{ whiteSpace: "nowrap" }}>{label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button onClick={() => setOpen(!open)} style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: "#64748b", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: open ? "space-between" : "center", gap: 8 }}>
            {open && <span>Collapse</span>}
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" style={{ transform: open ? "none" : "rotate(180deg)", transition: "transform 0.25s" }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", background: "#060b18" }}>
        <header style={{ height: 58, background: "rgba(13,21,38,0.95)", backdropFilter: "blur(10px)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", padding: "0 28px", justifyContent: "space-between", flexShrink: 0, position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 13, color: "#475569" }}>Hyperledger Fabric</div>
            <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ fontSize: 13, color: "#475569" }}>Channel: <span style={{ color: "#60a5fa" }}>dlnchannel</span></div>
            <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.1)" }} />
            <div style={{ fontSize: 13, color: "#475569" }}>Endorsement: <span style={{ color: "#a78bfa" }}>MAJORITY (2-of-3)</span></div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ fontSize: 12, color: "#64748b" }}>Mock Ledger Mode</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 20, padding: "5px 12px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
              <span style={{ fontSize: 12, color: "#22c55e", fontWeight: 600 }}>All Systems Operational</span>
            </div>
          </div>
        </header>
        <div style={{ flex: 1, padding: "28px", overflow: "auto" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}