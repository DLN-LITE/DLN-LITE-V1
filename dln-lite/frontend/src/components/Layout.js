import React, { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";

const icons = {
  dashboard:    "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  shipments:    "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  analytics:    "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  risk:         "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  add:          "M12 4v16m8-8H4",
  immutability: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
};

const Icon = ({ path }) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} style={{ width:20, height:20, flexShrink:0 }}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const navItems = [
  { to:"/dashboard",         label:"Dashboard",          icon:"dashboard"    },
  { to:"/shipments",         label:"Shipments",          icon:"shipments"    },
  { to:"/shipments/new",     label:"New Shipment",       icon:"add"          },
  { to:"/analytics",         label:"Analytics",          icon:"analytics"    },
  { to:"/risk-predictor",    label:"Risk Predictor",     icon:"risk"         },
  { to:"/immutability-demo", label:"Immutability Demo",  icon:"immutability" },
];

export default function Layout() {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ display:"flex", height:"100vh", background:"#0f172a", color:"#e2e8f0" }}>
      <aside style={{ width:open?240:64, background:"#1e293b", borderRight:"1px solid #334155", display:"flex", flexDirection:"column", transition:"width 0.2s", overflow:"hidden", flexShrink:0 }}>
        <div style={{ padding:"20px 16px", borderBottom:"1px solid #334155", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, background:"linear-gradient(135deg,#3b82f6,#8b5cf6)", borderRadius:8, flexShrink:0 }} />
          {open && <div><div style={{ fontWeight:700, fontSize:15, color:"#f1f5f9" }}>DLN-Lite</div><div style={{ fontSize:11, color:"#64748b" }}>Logistics Network</div></div>}
        </div>
        <nav style={{ flex:1, padding:"12px 8px", overflowY:"auto" }}>
          {navItems.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              display:"flex", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:8, marginBottom:4,
              textDecoration:"none", color:isActive?"#3b82f6":"#94a3b8",
              background:isActive?"rgba(59,130,246,0.1)":"transparent",
              fontWeight:isActive?600:400, fontSize:14,
            })}>
              <Icon path={icons[icon]} />
              {open && <span style={{ whiteSpace:"nowrap" }}>{label}</span>}
            </NavLink>
          ))}
        </nav>
        <button onClick={() => setOpen(!open)} style={{ margin:12, padding:"8px", background:"#334155", border:"none", borderRadius:8, color:"#94a3b8", cursor:"pointer", fontSize:12 }}>
          {open ? "← Collapse" : "→"}
        </button>
      </aside>
      <main style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column" }}>
        <header style={{ height:56, background:"#1e293b", borderBottom:"1px solid #334155", display:"flex", alignItems:"center", padding:"0 24px", justifyContent:"space-between", flexShrink:0 }}>
          <span style={{ fontSize:13, color:"#64748b" }}>Hyperledger Fabric · 3 Orgs · Channel: dlnchannel · Endorsement: MAJORITY (2-of-3)</span>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ width:8, height:8, background:"#22c55e", borderRadius:"50%", display:"inline-block" }} />
            <span style={{ fontSize:12, color:"#22c55e" }}>Network Online</span>
          </div>
        </header>
        <div style={{ flex:1, padding:24, overflow:"auto" }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
